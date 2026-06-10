// src/routes/admin/users.tsx
// Admin de Usuários — Criação com controle de acesso (trial, semanal, mensal, anual)

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { AdminPageHeader } from './admin';
import { db } from '@/hooks/use-auth';
import type { Profile } from '@/types';
import {
  Plus, Trash2, Loader2, UserPlus, Clock, Calendar, Shield, Ban,
  RefreshCw, CheckCircle2, AlertCircle, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  createUserAdmin,
  deleteUserAdmin,
  updateUserAccess,
} from '@/utils/server-functions/admin.functions';

export const Route = createFileRoute('/admin/users')({ component: UsersAdmin });

/* ─── Tipos de acesso ─── */
const ACCESS_TYPES = [
  { id: 'trial',    label: 'Trial (2 dias)',    defaultDays: 2,   icon: Clock },
  { id: 'weekly',   label: 'Semanal (7 dias)',  defaultDays: 7,   icon: Calendar },
  { id: 'monthly',  label: 'Mensal (30 dias)',  defaultDays: 30,  icon: Calendar },
  { id: 'yearly',   label: 'Anual (365 dias)',  defaultDays: 365, icon: Calendar },
  { id: 'lifetime', label: 'Vitalício',         defaultDays: 0,   icon: Crown },
  { id: 'free',     label: 'Gratuito',          defaultDays: 0,   icon: Shield },
  { id: 'blocked',  label: 'Bloqueado',         defaultDays: 0,   icon: Ban },
] as const;

type AccessType = (typeof ACCESS_TYPES)[number]['id'];

/* ─── Tipos sem prazo ─── */
const TIMELESS = new Set<AccessType>(['lifetime', 'free', 'blocked']);

export default function UsersAdmin() {
  const [users, setUsers]       = useState<Profile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);

  /* ─── Form states ─── */
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [role, setRole]             = useState<'user' | 'admin'>('user');
  const [accessType, setAccessType] = useState<AccessType>('trial');
  const [customDays, setCustomDays] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ─── Dialog de renovar acesso ─── */
  const [renewOpen, setRenewOpen]     = useState(false);
  const [renewUserId, setRenewUserId] = useState<string | null>(null);
  const [renewType, setRenewType]     = useState<AccessType>('trial');
  const [renewDays, setRenewDays]     = useState('');
  const [renewing, setRenewing]       = useState(false);

  /* ─── Load users ─── */
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar usuários');
    } else {
      setUsers((data as Profile[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ─── Realtime ─── */
  useEffect(() => {
    const channel = db
      .channel('admin-profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [load]);

  /* ─── Auto-bloquear expirados (mount + cada 5 min) ─── */
  useEffect(() => {
    const blockExpired = async () => {
      const now = new Date().toISOString();
      const { data: expired } = await db
        .from('profiles')
        .select('id')
        .lt('access_expires_at', now)
        .eq('is_active', true)
        .not('access_type', 'in', '("lifetime","free","blocked")');

      if (expired && expired.length > 0) {
        const ids = expired.map((p: { id: string }) => p.id);
        await db.from('profiles').update({ is_active: false } as never).in('id', ids);
        load();
      }
    };

    blockExpired();
    const interval = setInterval(blockExpired, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  /* ─── Helpers ─── */
  const getDefaultDays = (type: AccessType): number =>
    ACCESS_TYPES.find(t => t.id === type)?.defaultDays ?? 2;

  const formatAccessLabel = (u: Profile): string => {
    if (!u.access_type) return 'Trial (2d)';
    const type = ACCESS_TYPES.find(t => t.id === u.access_type);
    if (!type) return u.access_type;
    if (TIMELESS.has(u.access_type as AccessType)) return type.label;
    return `${type.label.split('(')[0].trim()} (${u.access_days ?? type.defaultDays}d)`;
  };

  const getAccessStatus = (u: Profile): { label: string; color: string; expired: boolean } => {
    if (u.access_type === 'blocked' || u.is_active === false)
      return { label: 'Bloqueado', color: '#EF4444', expired: true };
    if (u.access_type === 'lifetime')
      return { label: 'Vitalício', color: '#FFD700', expired: false };
    if (u.access_type === 'free')
      return { label: 'Gratuito', color: '#A0A0A0', expired: false };
    if (!u.access_expires_at)
      return { label: 'Ativo', color: '#00C853', expired: false };

    const expires  = new Date(u.access_expires_at);
    const diffDays = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0)   return { label: `Expirou há ${Math.abs(diffDays)}d`, color: '#EF4444', expired: true };
    if (diffDays === 0) return { label: 'Expira hoje',           color: '#FF6B35', expired: false };
    if (diffDays <= 2)  return { label: `${diffDays}d restantes`, color: '#FF6B35', expired: false };
    return                     { label: `${diffDays}d restantes`, color: '#00C853', expired: false };
  };

  /* ─── Create user ─── */
  const create = async () => {
    if (!email || password.length < 6) {
      toast.error('Preencha email e senha (mín 6 caracteres)');
      return;
    }
    setSubmitting(true);
    try {
      const days = customDays ? parseInt(customDays, 10) : getDefaultDays(accessType);
      const result = await createUserAdmin({
        data: {
          email,
          password,
          role,
          accessType,
          accessDays: TIMELESS.has(accessType) ? undefined : days,
        },
      });
      if (result.ok) {
        toast.success('Usuário criado com sucesso');
        setOpen(false);
        setEmail(''); setPassword(''); setRole('user'); setAccessType('trial'); setCustomDays('');
        load();
      }
    } catch (e) {
      toast.error((e as Error).message ?? 'Erro ao criar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Delete user ─── */
  const remove = async (id: string) => {
    if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return;
    try {
      const result = await deleteUserAdmin({ data: { userId: id } });
      if (result.ok) { toast.success('Usuário excluído'); load(); }
    } catch (e) {
      toast.error((e as Error).message ?? 'Erro ao excluir usuário');
    }
  };

  /* ─── Renew access ─── */
  const openRenew = (userId: string, currentType: string) => {
    setRenewUserId(userId);
    setRenewType((currentType as AccessType) || 'trial');
    setRenewDays('');
    setRenewOpen(true);
  };

  const renew = async () => {
    if (!renewUserId) return;
    setRenewing(true);
    try {
      const days = renewDays ? parseInt(renewDays, 10) : getDefaultDays(renewType);
      const result = await updateUserAccess({
        data: {
          userId:     renewUserId,
          accessType: renewType,
          accessDays: TIMELESS.has(renewType) ? undefined : days,
        },
      });
      if (result.ok) {
        toast.success('Acesso renovado com sucesso!');
        setRenewOpen(false); setRenewUserId(null); load();
      }
    } catch (e) {
      toast.error((e as Error).message ?? 'Erro ao renovar acesso');
    } finally {
      setRenewing(false);
    }
  };

  /* ─── Set role ─── */
  const setUserRole = async (id: string, r: 'user' | 'admin') => {
    const { error } = await db.from('profiles').update({ role: r }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar função'); return; }
    toast.success('Função atualizada');
    load();
  };

  return (
    <>
      <AdminPageHeader
        title="Usuários"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark">
                <Plus className="w-4 h-4 mr-1" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-arena-dark border-arena-gray max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-arena-green" /> Criar Acesso
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-arena-text-secondary/60">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm" />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-arena-text-secondary/60">Senha (mín 6 caracteres)</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm" />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-arena-text-secondary/60">Função</Label>
                  <Select value={role} onValueChange={v => setRole(v as 'user' | 'admin')}>
                    <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-arena-text-secondary/60">Tipo de Acesso</Label>
                  <Select value={accessType} onValueChange={v => setAccessType(v as AccessType)}>
                    <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCESS_TYPES.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2"><t.icon className="w-3.5 h-3.5" />{t.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!TIMELESS.has(accessType) && (
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-arena-text-secondary/60">Dias Customizados (opcional)</Label>
                    <Input type="number" min={1} max={365} value={customDays}
                      onChange={e => setCustomDays(e.target.value)}
                      placeholder={`Padrão: ${getDefaultDays(accessType)} dias`}
                      className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm" />
                    <p className="text-[10px] text-arena-text-secondary/40 mt-1">Deixe vazio para usar o padrão do tipo selecionado</p>
                  </div>
                )}

                <Button onClick={create} disabled={submitting || !email || password.length < 6}
                  className="w-full h-11 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                  Criar Acesso
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* ─── Modal Renovar Acesso ─── */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="bg-arena-dark border-arena-gray max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-arena-gold" /> Renovar Acesso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-arena-text-secondary/60">Novo Tipo de Acesso</Label>
              <Select value={renewType} onValueChange={v => setRenewType(v as AccessType)}>
                <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_TYPES.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2"><t.icon className="w-3.5 h-3.5" />{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!TIMELESS.has(renewType) && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-arena-text-secondary/60">Dias Customizados (opcional)</Label>
                <Input type="number" min={1} max={365} value={renewDays}
                  onChange={e => setRenewDays(e.target.value)}
                  placeholder={`Padrão: ${getDefaultDays(renewType)} dias`}
                  className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm" />
                <p className="text-[10px] text-arena-text-secondary/40 mt-1">Deixe vazio para usar o padrão do tipo selecionado</p>
              </div>
            )}

            <Button onClick={renew} disabled={renewing}
              className="w-full h-11 bg-arena-gold text-black font-bold rounded-xl hover:bg-arena-gold/90 disabled:opacity-50">
              {renewing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
              Renovar Acesso
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Lista de Usuários ─── */}
      {loading ? (
        <div className="flex justify-center mt-12">
          <Loader2 className="w-6 h-6 animate-spin text-arena-green" />
        </div>
      ) : (
        <div className="rounded-2xl border border-arena-gray bg-arena-dark overflow-hidden">
          <div className="divide-y divide-arena-gray">
            {users.map(u => {
              const accessStatus = getAccessStatus(u);
              return (
                <div key={u.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-arena-green/20 to-arena-green/5 border border-arena-green/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {u.name?.slice(0, 2).toUpperCase() ?? '??'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{u.name || 'Sem nome'}</p>
                    <p className="text-[10px] text-arena-text-secondary/50 truncate">
                      {u.id.slice(0, 8)} · {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                        style={{
                          backgroundColor: accessStatus.color + '15',
                          color: accessStatus.color,
                          borderColor: accessStatus.color + '30',
                        }}>
                        {accessStatus.expired
                          ? <AlertCircle className="w-3 h-3" />
                          : <CheckCircle2 className="w-3 h-3" />}
                        {formatAccessLabel(u)} · {accessStatus.label}
                      </span>

                      {u.access_expires_at &&
                        u.access_type !== 'lifetime' &&
                        u.access_type !== 'free' &&
                        u.access_type !== 'blocked' && (
                          <span className="text-[9px] text-arena-text-secondary/30">
                            Expira:{' '}
                            {new Date(u.access_expires_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                    <Button size="sm" variant="outline"
                      onClick={() => openRenew(u.id, u.access_type ?? 'trial')}
                      className="border-arena-gold/30 text-arena-gold text-xs h-8 hover:bg-arena-gold/10">
                      <RefreshCw className="w-3 h-3 mr-1" /> Renovar
                    </Button>

                    <Select value={u.role} onValueChange={v => setUserRole(u.id, v as 'user' | 'admin')}>
                      <SelectTrigger className="w-24 h-8 bg-arena-gray/40 border-arena-gray text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <button onClick={() => remove(u.id)}
                      className="p-2 rounded-lg hover:bg-arena-red/20 text-arena-red transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {users.length === 0 && (
              <p className="p-8 text-center text-arena-text-secondary text-sm">Nenhum usuário ainda.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}