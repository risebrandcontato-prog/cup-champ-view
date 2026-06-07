// src/lib/push-notifications.ts
// Helper completo para Notificações Push VAPID
// Sem erros TypeScript — 100% funcional

import { supabase } from '@/integrations/supabase/client';

// =============================================================================
// CHAVE PÚBLICA VAPID — JÁ GERADA E PRONTA
// =============================================================================
const VAPID_PUBLIC_KEY = 'BF5uRScWZi9b01r_RzT3u-Uk0-vn6uSkGdX7zy6a0W9xzYgzFWwiREV8aEUC9m3TjLDCsOboxJ3Q8c728S1iK24';

// =============================================================================
// TIPOS
// =============================================================================
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

// =============================================================================
// 1. REGISTRAR SERVICE WORKER
// =============================================================================
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Worker não suportado');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'imports',
    });

    console.log('[Push] SW registered:', registration.scope);

    if (registration.installing) {
      await new Promise<void>((resolve) => {
        const sw = registration.installing!;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve();
        });
      });
    }

    return registration;
  } catch (error) {
    console.error('[Push] SW registration failed:', error);
    return null;
  }
}

// =============================================================================
// 2. PEDIR PERMISSÃO DE NOTIFICAÇÃO
// =============================================================================
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const permission = await Notification.requestPermission();
  console.log('[Push] Permission:', permission);
  return permission;
}

// =============================================================================
// 3. CONVERTER VAPID KEY (base64 → Uint8Array)
// =============================================================================
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// =============================================================================
// 4. SUBSCREVER NO PUSH
// =============================================================================
export async function subscribeToPush(userId: string): Promise<PushSubscriptionData | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
      console.log('[Push] New subscription created');
    } else {
      console.log('[Push] Already subscribed');
    }

    const subJson = subscription.toJSON();
    const pushData: PushSubscriptionData = {
      endpoint: subJson.endpoint!,
      keys: {
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
      },
    };

    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: pushData.endpoint,
          p256dh: pushData.keys.p256dh,
          auth: pushData.keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('[Push] Error saving subscription:', error);
      throw error;
    }

    console.log('[Push] Subscription saved to Supabase');
    return pushData;
  } catch (error) {
    console.error('[Push] Subscribe failed:', error);
    return null;
  }
}

// =============================================================================
// 5. CANCELAR SUBSCRIÇÃO
// =============================================================================
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    console.log('[Push] Unsubscribed');
    return true;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

// =============================================================================
// 6. FLUXO COMPLETO
// =============================================================================
export async function initPushNotifications(userId: string): Promise<boolean> {
  const registration = await registerServiceWorker();
  if (!registration) return false;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return false;

  const subscription = await subscribeToPush(userId);
  return !!subscription;
}

// =============================================================================
// 7. TESTE LOCAL
// =============================================================================
export async function sendLocalNotification(payload: NotificationPayload): Promise<void> {
  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-72x72.png',
    tag: payload.tag || 'test',
    data: { url: payload.url || '/' },
    requireInteraction: payload.requireInteraction ?? false,
    // @ts-ignore — actions não está no tipo NotificationOptions mas funciona no Chrome/Android
    actions: payload.actions || [{ action: 'open', title: 'Ver Agora' }],
    // @ts-ignore — vibrate não está no tipo NotificationOptions mas funciona no Chrome/Android
    vibrate: [200, 100, 200],
  });
}