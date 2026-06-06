import { useEffect, useState, useCallback, useRef } from 'react';

interface PWAStatus {
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  canInstall: boolean;
  install: () => Promise<void>;
  update: () => void;
}

/**
 * Verifica conectividade real fazendo um fetch leve.
 * navigator.onLine é unreliable — pode reportar false positivo.
 */
async function checkRealConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    // Ping no próprio domínio (ou em um endpoint leve confiável)
    const response = await fetch('/manifest.json', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok || response.status === 0; // status 0 = no-cors success
  } catch {
    return false;
  }
}

export function usePWA(): PWAStatus {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCheckingRef = useRef(false);

  // ─── Verificação robusta de conectividade ───
  const verifyConnectivity = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const isReallyOnline = await checkRealConnectivity();
    setIsOffline(!isReallyOnline);

    isCheckingRef.current = false;
  }, []);

  useEffect(() => {
    // Verificação inicial (com delay para evitar false negative no load)
    const initialTimer = setTimeout(() => {
      verifyConnectivity();
    }, 2000);

    // Verificação periódica a cada 30s (para detectar reconexão silenciosa)
    checkIntervalRef.current = setInterval(() => {
      verifyConnectivity();
    }, 30000);

    // Eventos do browser (usados como hint, não como fonte única)
    const handleOffline = () => {
      // Não confiar cegamente — verificar com fetch
      setTimeout(() => verifyConnectivity(), 500);
    };

    const handleOnline = () => {
      // Verificar se realmente voltou
      setTimeout(() => verifyConnectivity(), 500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Também verificar quando a página volta a ter foco
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifyConnectivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialTimer);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [verifyConnectivity]);

  // ─── Register Service Worker ───
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] SW registrado:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                  console.log('[PWA] Nova versão disponível');
                }
              });
            }
          });
        })
        .catch((err) => console.error('[PWA] Erro ao registrar SW:', err));
    }
  }, []);

  // ─── Detectar install prompt ───
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] Install prompt capturado');
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      console.log('[PWA] App instalado');
    }
  }, [deferredPrompt]);

  const update = useCallback(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('SKIP_WAITING');
      window.location.reload();
    }
  }, []);

  return {
    isInstalled,
    isOffline,
    updateAvailable,
    canInstall: !!deferredPrompt && !isInstalled,
    install,
    update,
  };
}