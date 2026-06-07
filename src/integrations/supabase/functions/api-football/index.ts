// supabase/functions/api-football/index.ts
// Edge Function: Proxy seguro para API-Sports (API-Football v3)

// @ts-nocheck
// deno-lint-ignore-file

const API_SPORTS_BASE = 'https://v3.football.api-sports.io'
const CACHE_TTL = {
  fixtures: 60 * 60,
  odds: 15 * 60,
  lineups: 30 * 60,
  teams: 24 * 60 * 60,
  default: 60 * 60,
}

// CORS headers - permitir seu domínio Vercel
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    const body = await req.json()
    const { endpoint, params = {} } = body

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('API_SPORTS_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API_SPORTS_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Dynamic import para evitar erro de tipo no Deno
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0')

    const supabase = createClient(supabaseUrl, supabaseKey)

    const paramsString = JSON.stringify(params)
    const cacheKey = `${endpoint}:${paramsString}`

    // Check cache
    const { data: cached, error: cacheError } = await supabase
      .from('api_cache')
      .select('*')
      .eq('endpoint', endpoint)
      .eq('params', paramsString)
      .maybeSingle()

    if (cacheError) {
      console.error('[api-football] Cache error:', cacheError)
    }

    // Return cache if valid
    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log('[api-football] Cache hit:', endpoint, params)
      return new Response(
        JSON.stringify({ 
          data: cached.data, 
          cached: true,
          cached_at: cached.fetched_at 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build API URL
    const url = new URL(`${API_SPORTS_BASE}/${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    console.log('[api-football] Fetching:', url.toString())

    // Call API-Sports
    let response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-apisports-key': apiKey,
        'Accept': 'application/json',
      },
    })

    let apiData = await response.json()

    // FALLBACK: se fixtures com date retornar vazio, tentar live=all
    if (endpoint === 'fixtures' && params.date && (!apiData.response || apiData.response.length === 0)) {
      console.log('[api-football] Date empty, trying live=all fallback')
      const liveUrl = new URL(`${API_SPORTS_BASE}/fixtures`)
      liveUrl.searchParams.append('live', 'all')

      response = await fetch(liveUrl.toString(), {
        method: 'GET',
        headers: {
          'x-apisports-key': apiKey,
          'Accept': 'application/json',
        },
      })

      apiData = await response.json()
      console.log('[api-football] Live fallback results:', apiData.results || 0)
    }

    // FALLBACK: se ainda vazio, tentar sem nenhum filtro (últimos jogos)
    if (endpoint === 'fixtures' && (!apiData.response || apiData.response.length === 0)) {
      console.log('[api-football] Live empty, trying last=10 fallback')
      const lastUrl = new URL(`${API_SPORTS_BASE}/fixtures`)
      lastUrl.searchParams.append('last', '10')

      response = await fetch(lastUrl.toString(), {
        method: 'GET',
        headers: {
          'x-apisports-key': apiKey,
          'Accept': 'application/json',
        },
      })

      apiData = await response.json()
      console.log('[api-football] Last fallback results:', apiData.results || 0)
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[api-football] API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'API request failed', 
          status: response.status,
          details: errorText 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save to cache
    const ttl = CACHE_TTL[endpoint as keyof typeof CACHE_TTL] || CACHE_TTL.default
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttl * 1000)

    const { error: upsertError } = await supabase
      .from('api_cache')
      .upsert({
        endpoint,
        params: paramsString,
        data: apiData,
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'endpoint,params',
      })

    if (upsertError) {
      console.error('[api-football] Cache save error:', upsertError)
    }

    return new Response(
      JSON.stringify({ 
        data: apiData, 
        cached: false,
        fetched_at: now.toISOString() 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[api-football] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})