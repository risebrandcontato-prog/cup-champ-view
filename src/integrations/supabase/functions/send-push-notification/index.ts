// @ts-nocheck
// supabase/functions/send-push-notification/index.ts
// Edge Function V7 — VAPID JWT com conversão DER→raw correta
// Solução definitiva para notificações push em todos os dispositivos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// =============================================================================
// CONFIGURAÇÃO VAPID
// =============================================================================
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_SUBJECT = 'mailto:admin@apostarestrita.com';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// =============================================================================
// UTILS: Base64url
// =============================================================================
function base64urlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function base64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// =============================================================================
// CONVERTER ASSINATURA DER ECDSA → RAW R||S (64 bytes)
// Web Crypto retorna DER, mas JWT VAPID precisa de raw concatenado
// =============================================================================
function derToRaw(signature: Uint8Array): Uint8Array {
  if (signature[0] !== 0x30) {
    throw new Error('Invalid DER signature: expected 0x30');
  }

  let idx = 2; // skip 0x30 and total length byte

  // R component
  if (signature[idx] !== 0x02) throw new Error('Invalid DER: expected 0x02 for R');
  idx++;
  const rLen = signature[idx];
  idx++;
  const rBytes = signature.slice(idx, idx + rLen);
  idx += rLen;

  // S component
  if (signature[idx] !== 0x02) throw new Error('Invalid DER: expected 0x02 for S');
  idx++;
  const sLen = signature[idx];
  idx++;
  const sBytes = signature.slice(idx, idx + sLen);

  // Pad to 32 bytes each (P-256 field size)
  const r = new Uint8Array(32);
  const s = new Uint8Array(32);
  const rStart = rBytes.length > 32 ? rBytes.length - 32 : 0;
  const sStart = sBytes.length > 32 ? sBytes.length - 32 : 0;
  r.set(rBytes.slice(rStart), 32 - (rBytes.length - rStart));
  s.set(sBytes.slice(sStart), 32 - (sBytes.length - sStart));

  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

// =============================================================================
// CRIAR VAPID JWT
// =============================================================================
async function createVapidJWT(audience: string): Promise<string> {
  const privateKeyRaw = base64urlDecode(VAPID_PRIVATE_KEY);
  const publicKeyRaw = base64urlDecode(VAPID_PUBLIC_KEY);

  if (publicKeyRaw.length !== 65 || publicKeyRaw[0] !== 0x04) {
    throw new Error('Invalid public key: must be 65 bytes uncompressed P-256');
  }

  const x = publicKeyRaw.slice(1, 33);
  const y = publicKeyRaw.slice(33, 65);
  const d = privateKeyRaw;

  if (d.length !== 32) {
    throw new Error(`Invalid private key: must be 32 bytes, got ${d.length}`);
  }

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64urlEncode(x),
    y: base64urlEncode(y),
    d: base64urlEncode(d),
    ext: true,
  };

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const encodedHeader = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signatureDer = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      new TextEncoder().encode(signingInput)
    )
  );

  const signatureRaw = derToRaw(signatureDer);
  const encodedSignature = base64urlEncode(signatureRaw);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// =============================================================================
// ENVIAR PUSH
// =============================================================================
async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const endpoint = new URL(sub.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.host}`;
    const jwt = await createVapidJWT(audience);

    const pushPayload = JSON.stringify(payload);

    const response = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: pushPayload,
    });

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    if (response.status === 410 || response.status === 404) {
      return { success: false, error: 'expired' };
    }
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body = await req.json();
    const { title, body: messageBody, ...rest } = body;

    if (!title || !messageBody) {
      return new Response(
        JSON.stringify({ error: 'Missing title or body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      title,
      body: messageBody,
      icon: rest.icon || '/icons/icon-192x192.png',
      badge: rest.badge || '/icons/icon-72x72.png',
      tag: rest.tag || 'default',
      url: rest.url || '/',
      requireInteraction: rest.requireInteraction ?? false,
    };

    // Buscar subscriptions
    const subsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!subsRes.ok) {
      throw new Error(`Failed to fetch subscriptions: ${subsRes.status}`);
    }

    const subscriptions = await subsRes.json();
    console.log(`[Push] Found ${subscriptions.length} subscriptions`);

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, total: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const result = await sendPush(sub, payload);
      if (result.success) {
        sent++;
        console.log(`[Push] OK: ${sub.endpoint.substring(0, 40)}...`);
      } else {
        failed++;
        console.error(`[Push] FAIL: ${result.error}`);
        if (result.error === 'expired') {
          await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
            {
              method: 'DELETE',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
            }
          );
        }
      }
    }

    console.log(`[Push] Result: sent=${sent}, failed=${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: subscriptions.length }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('[Push] Fatal:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});