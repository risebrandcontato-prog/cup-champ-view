import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/hooks/use-auth';
import type { SupportConfig } from '@/types';
import { Headset, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/support')({ component: SupportPage });

function SupportPage() {
  const [cfg, setCfg] = useState<SupportConfig | null>(null);
  useEffect(() => { db.from('support_config').select('*').limit(1).maybeSingle().then(({ data }: { data: SupportConfig | null }) => setCfg(data)); }, []);

  return (
    <AppShell>
      <div className="rounded-3xl border border-arena-gray bg-arena-dark p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-arena-gold/10 border border-arena-gold/30 flex items-center justify-center mb-4">
          <Headset className="w-8 h-8 text-arena-gold" />
        </div>
        <h1 className="text-2xl font-black">Suporte 24/7</h1>
        <p className="text-sm text-arena-text-secondary mt-2">{cfg?.support_text ?? 'Estamos disponíveis 24h por dia.'}</p>

        <div className="space-y-3 mt-6">
          {cfg?.whatsapp_link && (
            <Button asChild className="w-full h-12 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark">
              <a href={cfg.whatsapp_link} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4 mr-2" /> Falar no WhatsApp</a>
            </Button>
          )}
          {cfg?.telegram_link && (
            <Button asChild variant="outline" className="w-full h-12 border-arena-green text-arena-green hover:bg-arena-green/10 rounded-xl">
              <a href={cfg.telegram_link} target="_blank" rel="noreferrer"><Send className="w-4 h-4 mr-2" /> Grupo no Telegram</a>
            </Button>
          )}
        </div>

        <p className="text-xs text-arena-text-secondary mt-6">Atendimento todos os dias, 24h por dia.</p>
      </div>
    </AppShell>
  );
}
