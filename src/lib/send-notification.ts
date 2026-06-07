// src/lib/send-notification.ts
// Helper para disparar notificação push do frontend (chama Edge Function)

import { supabase } from '@/integrations/supabase/client';

export interface SendNotificationParams {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

export async function sendPushNotification(params: SendNotificationParams): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        title: params.title,
        body: params.body,
        icon: params.icon || '/icons/icon-192x192.png',
        badge: params.badge || '/icons/icon-72x72.png',
        tag: params.tag || 'default',
        url: params.url || '/',
        requireInteraction: params.requireInteraction ?? false,
      },
    });

    if (error) {
      console.error('[SendNotification] Edge Function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[SendNotification] Push sent:', data);
    return { success: true, sent: data?.sent || 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[SendNotification] Failed:', message);
    return { success: false, error: message };
  }
}