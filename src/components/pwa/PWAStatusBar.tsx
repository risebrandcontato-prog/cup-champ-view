import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, WifiOff } from 'lucide-react';

export function PWAStatusBar() {
  const { isOffline, updateAvailable, canInstall, install, update } = usePWA();

  if (isOffline) {
    return (
      <div className="fixed top-0 inset-x-0 z-50 bg-arena-red/90 text-white text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-2">
        <WifiOff className="w-3.5 h-3.5" />
        Você está offline. Algumas funcionalidades podem estar limitadas.
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div className="fixed top-0 inset-x-0 z-50 bg-arena-gold/90 text-black text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-3">
        <RefreshCw className="w-3.5 h-3.5" />
        Nova versão disponível
        <Button size="sm" onClick={update} className="h-6 bg-black text-arena-gold text-[10px] px-3 rounded-lg font-black">
          Atualizar Agora
        </Button>
      </div>
    );
  }

  if (canInstall) {
    return (
      <div className="fixed top-0 inset-x-0 z-50 bg-arena-green/90 text-black text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-3">
        <Download className="w-3.5 h-3.5" />
        Instale o app para acesso rápido
        <Button size="sm" onClick={install} className="h-6 bg-black text-arena-green text-[10px] px-3 rounded-lg font-black">
          Instalar
        </Button>
      </div>
    );
  }

  return null;
}