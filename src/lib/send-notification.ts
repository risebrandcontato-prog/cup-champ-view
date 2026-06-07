// src/lib/send-notification.ts
// Helper para disparar notificação push do frontend (chama Edge Function)
// Com timeout, retry e tratamento de erros robusto

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

export interface SendNotificationResult {
  success: boolean;
  sent?: number;
  failed?: number;
  total?: number;
  error?: string;
}

/**
 * Envia notificação push para todos os usuários inscritos.
 * Timeout de 15s para não travar o fluxo do admin.
 */
export async function sendPushNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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

    clearTimeout(timeoutId);

    if (error) {
      console.error('[SendNotification] Edge Function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[SendNotification] Push result:', data);
    return {
      success: true,
      sent: data?.sent || 0,
      failed: data?.failed || 0,
      total: data?.total || 0,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[SendNotification] Failed:', message);
    return { success: false, error: message };
  }
}