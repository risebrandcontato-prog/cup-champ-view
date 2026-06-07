// @ts-nocheck
// supabase/functions/send-push-notification/index.ts
// Edge Function que envia notificações push VAPID para todos os usuários
// Usa a Private Key VAPID para assinar e enviar via protocolo Web Push
// RODA NO DENO DO SUPABASE — não no Node.js do projeto

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// =============================================================================
// CONFIGURAÇÃO — SUBSTITUA PELA SUA PRIVATE KEY VAPID
// =============================================================================
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'MHcCAQEEIPiK1st2i5H-vsNa1FdD2IyIe7sNAVo9uRZj2TqlsE2_oAoGCCqGSM49AwEHoUQDQgAEefoWKJWO8TJuyG4Bv2_tCZxdRJ1si6xklxNFTMAi3ikS8FHX3OwOMjgDMa6VV2ew0nRb1gTRx6Dg6gTd9h0kWg';
const VAPID_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEefoWKJWO8TJuyG4Bv2_tCZxdRJ1si6xklxNFTMAi3ikS8FHX3OwOMjgDMa6VV2ew0nRb1gTRx6Dg6gTd9h0kWg';
const VAPID_SUBJECT = 'mailto:admin@apostarestrita.com';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// =============================================================================
// TIPOS
// =============================================================================
interface PushSubscription {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

// =============================================================================
// UTILS: Base64url → base64 padrão
// =============================================================================
function base64urlToBase64(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return base64 + padding;
}

// =============================================================================
// UTILS: JWT para VAPID
// =============================================================================
async function createVapidJWT(): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'https://fcm.googleapis.com',
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKeyDer = Uint8Array.from(
    atob(base64urlToBase64(VAPID_PRIVATE_KEY)),
    (c) => c.charCodeAt(0)
  );

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyDer.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// =============================================================================
// ENVIAR PUSH PARA UM SUBSCRIPTION
// =============================================================================
async function sendPush(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const vapidJWT = await createVapidJWT();
    const pushPayload = JSON.stringify(payload);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${vapidJWT}, k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: pushPayload,
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      if (response.status === 410 || response.status === 404) {
        return { success: false, error: 'expired' };
      }
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// BUSCAR TODAS AS SUBSCRIPTIONS DO SUPABASE
// =============================================================================
async function getAllSubscriptions(): Promise<PushSubscription[]> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=user_id,endpoint,p256dh,auth`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch subscriptions: ${response.status}`);
  }

  return await response.json();
}

// =============================================================================
// REMOVER SUBSCRIPTION EXPIRADA
// =============================================================================
async function removeSubscription(endpoint: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
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
    const { title, body: messageBody, icon, badge, tag, url, requireInteraction } = body;

    if (!title || !messageBody) {
      return new Response(
        JSON.stringify({ error: 'Missing title or body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotificationPayload = {
      title,
      body: messageBody,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      tag: tag || 'default',
      url: url || '/',
      requireInteraction: requireInteraction ?? false,
    };

    const subscriptions = await getAllSubscriptions();
    console.log(`[Push] Sending to ${subscriptions.length} subscriptions`);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const result = await sendPush(sub, payload);
        if (result.error === 'expired') {
          await removeSubscription(sub.endpoint);
          console.log(`[Push] Removed expired subscription for user ${sub.user_id}`);
        }
        return result;
      })
    );

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failCount = results.length - successCount;

    console.log(`[Push] Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});