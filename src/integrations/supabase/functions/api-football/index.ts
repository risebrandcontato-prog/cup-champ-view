// supabase/functions/api-football/index.ts
// Edge Function: Proxy seguro para API-Sports (API-Football v3)
// Chave da API fica no server — nunca exposta no frontend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const API_SPORTS_BASE = 'https://v3.football.api-sports.io'
const CACHE_TTL = {
  fixtures: 60 * 60,      // 1 hora
  odds: 15 * 60,          // 15 minutos
  lineups: 30 * 60,       // 30 minutos
  teams: 24 * 60 * 60,    // 24 horas
  default: 60 * 60,       // 1 hora padrão
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CacheEntry {
  id: string
  endpoint: string
  params: string
  data: unknown
  fetched_at: string
  expires_at: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, params = {} } = await req.json()

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

    // Supabase client for cache
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Build cache key
    const paramsString = JSON.stringify(params)
    const cacheKey = `${endpoint}:${paramsString}`

    // Check cache
    const { data: cached, error: cacheError } = await supabase
      .from('api_cache')
      .select('*')
      .eq('endpoint', endpoint)
      .eq('params', paramsString)
      .maybeSingle<CacheEntry>()

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
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-apisports-key': apiKey,
        'Accept': 'application/json',
      },
    })

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

    const apiData = await response.json()

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