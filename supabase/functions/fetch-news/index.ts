// @ts-nocheck
// supabase/functions/fetch-news/index.ts
// Edge Function que busca notícias do NewsAPI e salva no banco
// Roda via cron job a cada 30 minutos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY') || '7e8018a4ca2943d29355ef5b1566e03f';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Keywords para buscar notícias relevantes para apostadores
const DEFAULT_KEYWORDS = 'futebol OR football OR "brasileirão" OR "premier league" OR "la liga" OR "copa do mundo" OR "champions league"';

// =============================================================================
// BUSCAR NOTÍCIAS DO NEWSAPI
// =============================================================================
async function fetchFromNewsAPI(keywords: string, pageSize: number = 10): Promise<Array<{
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string };
}>> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 1); // últimas 24 horas

  const params = new URLSearchParams({
    q: keywords,
    language: 'pt',
    sortBy: 'publishedAt',
    pageSize: String(pageSize),
    from: fromDate.toISOString().split('T')[0],
    apiKey: NEWS_API_KEY,
  });

  const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NewsAPI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.status !== 'ok') {
    throw new Error(`NewsAPI error: ${data.message || 'Unknown error'}`);
  }

  console.log(`[FetchNews] NewsAPI returned ${data.articles?.length || 0} articles`);
  return data.articles || [];
}

// =============================================================================
// BUSCAR CONFIGURAÇÃO DO ADMIN
// =============================================================================
async function getNewsConfig(): Promise<{
  auto_news_enabled: boolean;
  auto_news_keywords: string | null;
  auto_news_interval_minutes: number | null;
} | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/news_config?select=*&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data[0] || null;
}

// =============================================================================
// VERIFICAR SE NOTÍCIA JÁ EXISTE (por URL)
// =============================================================================
async function newsExists(url: string): Promise<boolean> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/news?source_url=eq.${encodeURIComponent(url)}&select=id&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!response.ok) return false;
  const data = await response.json();
  return data.length > 0;
}

// =============================================================================
// SALVAR NOTÍCIA NO BANCO
// =============================================================================
async function saveNews(article: {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string };
}): Promise<boolean> {
  const payload = {
    title: article.title,
    content: article.description || article.title,
    category: 'Automático',
    image_url: article.urlToImage,
    is_auto: true,
    is_featured: false,
    source_url: article.url,
    source_name: article.source.name,
    published_at: article.publishedAt,
    created_by: null,
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/news`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  return response.ok;
}

// =============================================================================
// ATUALIZAR last_fetch_at
// =============================================================================
async function updateLastFetch(configId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/news_config?id=eq.${configId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ last_fetch_at: new Date().toISOString() }),
  });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Verificar configuração
    const config = await getNewsConfig();

    if (!config) {
      console.log('[FetchNews] No config found, creating default...');
      // Criar config padrão se não existir
      await fetch(`${SUPABASE_URL}/rest/v1/news_config`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          auto_news_enabled: false,
          auto_news_keywords: DEFAULT_KEYWORDS,
          auto_news_interval_minutes: 30,
        }),
      });
      return new Response(
        JSON.stringify({ success: true, message: 'Default config created', fetched: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (!config.auto_news_enabled) {
      console.log('[FetchNews] Auto news is disabled');
      return new Response(
        JSON.stringify({ success: true, message: 'Auto news disabled', fetched: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Buscar notícias
    const keywords = config.auto_news_keywords || DEFAULT_KEYWORDS;
    const articles = await fetchFromNewsAPI(keywords, 10);

    let saved = 0;
    let skipped = 0;

    for (const article of articles) {
      // Verificar se já existe
      const exists = await newsExists(article.url);
      if (exists) {
        skipped++;
        continue;
      }

      // Salvar no banco
      const success = await saveNews(article);
      if (success) {
        saved++;
        console.log(`[FetchNews] Saved: ${article.title.substring(0, 50)}...`);
      }
    }

    // Atualizar last_fetch_at
    if (config.id) {
      await updateLastFetch(config.id);
    }

    console.log(`[FetchNews] Done: ${saved} saved, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, fetched: saved, skipped, total: articles.length }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('[FetchNews] Fatal:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});