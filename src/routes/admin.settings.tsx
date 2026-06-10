// src/routes/admin.settings.tsx
// Admin Settings — Configurações de Suporte + Controle Global de Acesso
// Suporte (WhatsApp/Telegram) + Liberação de acesso grátis para todos

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Unlock, Lock, Clock, AlertTriangle, RefreshCw,
  Loader2, ChevronRight, Globe, ShieldCheck, Zap, HeartHandshake,
  Timer, Users, TrendingUp
} from 'lucide-react';
import { AdminPageHeader } from './admin';
import { db } from '@/hooks/use-auth';
import type { SupportConfig, AppSetting } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/settings')({
  component: SettingsAdmin,
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN SETTINGS — Suporte + Controle Global de Acesso
   ═══════════════════════════════════════════════════════════════ */
function SettingsAdmin() {
  // ─── Support Config States ───
  const [cfg, setCfg] = useState<SupportConfig | null>(null);
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [supportText, setSupportText] = useState('');
  const [savingSupport, setSavingSupport] = useState(false);

  // ─── Free Access Global States ───
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [freeAccessEnabled, setFreeAccessEnabled] = useState(false);
  const [freeAccessDays, setFreeAccessDays] = useState('3');
  const [freeAccessUntil, setFreeAccessUntil] = useState('');
  const [savingAccess, setSavingAccess] = useState(false);

  // ─── Load Support Config ───
  useEffect(() => {
    db.from('support_config').select('*').limit(1).maybeSingle().then(({ data }: { data: SupportConfig | null }) => {
      if (data) {
        setCfg(data);
        setTelegram(data.telegram_link ?? '');
        setWhatsapp(data.whatsapp_link ?? '');
        setSupportText(data.support_text ?? '');
      }
    });
  }, []);

  // ─── Load App Settings ───
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    const { data, error } = await db.from('app_settings').select('*');

    if (error) {
      toast.error('Erro ao carregar configurações de acesso');
      setLoadingSettings(false);
      return;
    }

    const settingsMap: Record<string, string> = {};
    (data as AppSetting[]).forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    setSettings(settingsMap);

    const freeUntil = settingsMap['free_access_until'];
    if (freeUntil && new Date(freeUntil) > new Date()) {
      setFreeAccessEnabled(true);
      setFreeAccessUntil(freeUntil);
      const diffMs = new Date(freeUntil).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      setFreeAccessDays(diffDays.toString());
    } else {
      setFreeAccessEnabled(false);
      setFreeAccessDays('3');
      setFreeAccessUntil('');
    }

    setLoadingSettings(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ─── Save Support Config ───
  const saveSupport = async () => {
    setSavingSupport(true);
    const payload = {
      telegram_link: telegram || null,
      whatsapp_link: whatsapp || null,
      support_text: supportText,
      is_active: true,
    };
    const { error } = cfg
      ? await db.from('support_config').update(payload).eq('id', cfg.id)
      : await db.from('support_config').insert(payload);
    setSavingSupport(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Configurações de suporte salvas');
  };

  // ─── Toggle Free Access Global ───
  const toggleFreeAccess = async () => {
    if (!freeAccessEnabled) {
      const days = parseInt(freeAccessDays, 10) || 3;
      const until = new Date();
      until.setDate(until.getDate() + days);
      const isoString = until.toISOString();

      setSavingAccess(true);
      const { error } = await db
        .from('app_settings')
        .upsert({ key: 'free_access_until', value: isoString }, { onConflict: 'key' });

      if (error) {
        toast.error('Erro ao liberar acesso');
        setSavingAccess(false);
        return;
      }

      setFreeAccessEnabled(true);
      setFreeAccessUntil(isoString);
      toast.success(`🎉 Acesso grátis liberado por ${days} dias!`);
      setSettings((prev) => ({ ...prev, free_access_until: isoString }));
    } else {
      const pastDate = new Date('2000-01-01').toISOString();
      setSavingAccess(true);
      const { error } = await db
        .from('app_settings')
        .upsert({ key: 'free_access_until', value: pastDate }, { onConflict: 'key' });

      if (error) {
        toast.error('Erro ao desativar acesso');
        setSavingAccess(false);
        return;
      }

      setFreeAccessEnabled(false);
      setFreeAccessUntil('');
      toast.success('Acesso grátis desativado');
      setSettings((prev) => ({ ...prev, free_access_until: pastDate }));
    }
    setSavingAccess(false);
  };

  // ─── Update Free Access Days ───
  const updateFreeAccessDays = async () => {
    if (!freeAccessEnabled) return;
    const days = parseInt(freeAccessDays, 10) || 3;
    const until = new Date();
    until.setDate(until.getDate() + days);
    const isoString = until.toISOString();

    setSavingAccess(true);
    const { error } = await db
      .from('app_settings')
      .upsert({ key: 'free_access_until', value: isoString }, { onConflict: 'key' });

    if (error) {
      toast.error('Erro ao atualizar');
      setSavingAccess(false);
      return;
    }

    setFreeAccessUntil(isoString);
    toast.success(`Acesso grátis estendido por ${days} dias`);
    setSettings((prev) => ({ ...prev, free_access_until: isoString }));
    setSavingAccess(false);
  };

  // ─── Format Date ───
  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <AdminPageHeader
        title="Configurações"
        subtitle="Suporte e controle global de acesso"
      />

      <div className="space-y-6 max-w-2xl">
        {/* ═══════════════════════════════════════════════════════════════
            🎁 ACESSO GRÁTIS GLOBAL — Evento para todos os usuários
            ═══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-arena-gold/20 bg-gradient-to-br from-arena-gold/5 via-arena-dark/60 to-arena-dark p-5 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-arena-gold/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-arena-gold/20 to-arena-gold/5 border border-arena-gold/25 flex items-center justify-center shadow-lg shadow-arena-gold/10">
                  <Unlock className="w-5 h-5 text-arena-gold" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Acesso Grátis Global</h2>
                  <p className="text-[10px] text-arena-text-secondary/40">
                    Libere acesso VIP para TODOS os usuários
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                freeAccessEnabled
                  ? 'bg-arena-success/15 text-arena-success border border-arena-success/25'
                  : 'bg-arena-gray/15 text-arena-text-secondary/40 border border-arena-gray/20'
              }`}>
                {freeAccessEnabled ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {freeAccessEnabled && freeAccessUntil && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-4 rounded-xl bg-arena-dark/60 border border-arena-gold/20 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-arena-gold" />
                  <span className="text-xs font-bold text-arena-gold">Evento em andamento</span>
                </div>
                <p className="text-sm text-white font-medium">
                  Acesso grátis ativo até{' '}
                  <span className="text-arena-gold">{formatDate(freeAccessUntil)}</span>
                </p>
                <p className="text-[10px] text-arena-text-secondary/40 mt-1">
                  Todos os usuários têm acesso VIP completo
                </p>
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-arena-text-secondary/50 mb-2 block">
                  Duração (dias)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={freeAccessDays}
                    onChange={(e) => setFreeAccessDays(e.target.value)}
                    disabled={freeAccessEnabled || savingAccess}
                    className="w-24 bg-arena-gray/40 border-arena-gray rounded-xl text-sm text-center"
                  />
                  <span className="text-xs text-arena-text-secondary/40">
                    dias de acesso VIP grátis
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={toggleFreeAccess}
                  disabled={savingAccess}
                  className={`h-11 px-6 rounded-xl font-bold text-sm transition-all ${
                    freeAccessEnabled
                      ? 'bg-arena-red/20 text-arena-red border border-arena-red/30 hover:bg-arena-red/30'
                      : 'bg-gradient-to-r from-arena-gold to-arena-gold-dark text-black hover:shadow-xl hover:shadow-arena-gold/20'
                  }`}
                >
                  {savingAccess ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : freeAccessEnabled ? (
                    <>
                      <Lock className="w-4 h-4 mr-1.5" />
                      Desativar Acesso Grátis
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-1.5" />
                      Liberar Acesso Grátis
                    </>
                  )}
                </Button>

                {freeAccessEnabled && (
                  <Button
                    onClick={updateFreeAccessDays}
                    disabled={savingAccess}
                    variant="outline"
                    className="h-11 rounded-xl border-arena-gold/30 text-arena-gold hover:bg-arena-gold/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Atualizar Duração
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-arena-gold/5 border border-arena-gold/10 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-arena-gold/60 shrink-0 mt-0.5" />
              <p className="text-[10px] text-arena-text-secondary/50 leading-relaxed">
                <span className="text-arena-gold/70 font-bold">Atenção:</span> Ao ativar, todos os usuários — incluindo os bloqueados — terão acesso VIP completo. O acesso grátis global tem prioridade sobre qualquer outro tipo de acesso.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════
            📊 STATUS DO SISTEMA — Overview rápido
            ═══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-arena-green/10 border border-arena-green/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-arena-green" />
            </div>
            Status do Sistema
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-arena-gray/15 bg-arena-dark/50 p-4">
              <Users className="w-5 h-5 mb-2 text-arena-green" strokeWidth={1.5} />
              <p className="text-[10px] text-arena-text-secondary/40 uppercase tracking-wider font-bold mb-1">
                Gerenciar Usuários
              </p>
              <p className="text-sm font-bold text-white">Ver em Usuários</p>
            </div>
            <div className="rounded-xl border border-arena-gray/15 bg-arena-dark/50 p-4">
              <Zap className="w-5 h-5 mb-2 text-arena-gold" strokeWidth={1.5} />
              <p className="text-[10px] text-arena-text-secondary/40 uppercase tracking-wider font-bold mb-1">
                Análises
              </p>
              <p className="text-sm font-bold text-white">Ver em Análises</p>
            </div>
            <div className="rounded-xl border border-arena-gray/15 bg-arena-dark/50 p-4">
              <ShieldCheck className="w-5 h-5 mb-2 text-arena-purple" strokeWidth={1.5} />
              <p className="text-[10px] text-arena-text-secondary/40 uppercase tracking-wider font-bold mb-1">
                Modo de Acesso
              </p>
              <p className="text-sm font-bold text-white">
                {freeAccessEnabled ? 'Grátis Global' : 'Por Usuário'}
              </p>
            </div>
            <div className="rounded-xl border border-arena-gray/15 bg-arena-dark/50 p-4">
              <HeartHandshake className="w-5 h-5 mb-2 text-arena-text-secondary/40" strokeWidth={1.5} />
              <p className="text-[10px] text-arena-text-secondary/40 uppercase tracking-wider font-bold mb-1">
                Jogo Responsável
              </p>
              <p className="text-sm font-bold text-white">Sempre Ativo</p>
            </div>
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════
            💬 CONFIGURAÇÕES DE SUPORTE — WhatsApp + Telegram
            ═══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-2xl border border-arena-gray/20 bg-arena-dark/40 p-5"
        >
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-arena-green/10 border border-arena-green/20 flex items-center justify-center">
              <HeartHandshake className="w-3.5 h-3.5 text-arena-green" />
            </div>
            Configurações de Suporte
          </h2>

          <div className="space-y-4">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-arena-text-secondary/50 mb-2 block">
                Link WhatsApp
              </Label>
              <Input
                type="url"
                placeholder="https://wa.me/5511999999999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="bg-arena-gray/40 border-arena-gray rounded-xl text-sm"
              />
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-arena-text-secondary/50 mb-2 block">
                Link Telegram
              </Label>
              <Input
                type="url"
                placeholder="https://t.me/seu_canal"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="bg-arena-gray/40 border-arena-gray rounded-xl text-sm"
              />
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-arena-text-secondary/50 mb-2 block">
                Texto de Suporte
              </Label>
              <Textarea
                rows={4}
                placeholder="Digite o texto de suporte que aparecerá para os usuários..."
                value={supportText}
                onChange={(e) => setSupportText(e.target.value)}
                className="bg-arena-gray/40 border-arena-gray rounded-xl text-sm resize-none"
              />
            </div>

            <Button
              onClick={saveSupport}
              disabled={savingSupport}
              className="h-11 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark transition-all"
            >
              {savingSupport ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                'Salvar Configurações de Suporte'
              )}
            </Button>
          </div>
        </motion.section>
      </div>
    </>
  );
}