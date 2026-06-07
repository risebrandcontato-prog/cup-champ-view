import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { Loader2 } from 'lucide-react';
import { initPushNotifications } from '@/lib/push-notifications';

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: '/login' }); return; }
    if (profile && !profile.onboarding_completed) { navigate({ to: '/complete-profile' }); }
  }, [user, profile, loading, navigate]);

  // =============================================================================
  // REGISTRA NOTIFICAÇÕES PUSH AO ABRIR O APP
  // Só se logado, onboarding completo, e com delay para não travar
  // =============================================================================
  useEffect(() => {
    if (!user || !profile?.onboarding_completed) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;

      try {
        const success = await initPushNotifications(user.id);
        if (success) {
          console.log('[AppShell] Push notifications initialized');
        } else {
          console.warn('[AppShell] Push init returned false (permission denied or unsupported)');
        }
      } catch (err) {
        console.warn('[AppShell] Push init failed (non-critical):', err);
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, profile?.onboarding_completed]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-arena-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}