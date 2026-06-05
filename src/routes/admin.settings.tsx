import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from './admin';
import { db } from '@/hooks/use-auth';
import type { SupportConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/admin/settings')({ component: SettingsAdmin });

function SettingsAdmin() {
  const [cfg, setCfg] = useState<SupportConfig | null>(null);
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.from('support_config').select('*').limit(1).maybeSingle().then(({ data }: { data: SupportConfig | null }) => {
      if (data) { setCfg(data); setTelegram(data.telegram_link ?? ''); setWhatsapp(data.whatsapp_link ?? ''); setText(data.support_text ?? ''); }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = { telegram_link: telegram || null, whatsapp_link: whatsapp || null, support_text: text, is_active: true };
    const { error } = cfg
      ? await db.from('support_config').update(payload).eq('id', cfg.id)
      : await db.from('support_config').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Configurações salvas');
  };

  return (
    <>
      <AdminPageHeader title="Configurações de Suporte" />
      <div className="max-w-2xl space-y-4">
        <div><Label>Link WhatsApp</Label><Input type="url" placeholder="https://wa.me/..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
        <div><Label>Link Telegram</Label><Input type="url" placeholder="https://t.me/..." value={telegram} onChange={(e) => setTelegram(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
        <div><Label>Texto de suporte</Label><Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
        <Button onClick={save} disabled={saving} className="bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Configurações'}</Button>
      </div>
    </>
  );
}
