import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from './admin';
import { db } from '@/hooks/use-auth';
import type { Profile } from '@/types';
import { Plus, Trash2, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createUserAdmin, deleteUserAdmin } from '@/utils/server-functions/admin.functions';
import { useServerFn } from '@tanstack/react-start';

export const Route = createFileRoute('/admin/users')({ component: UsersAdmin });

function UsersAdmin() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [submitting, setSubmitting] = useState(false);
  const createFn = useServerFn(createUserAdmin);
  const deleteFn = useServerFn(deleteUserAdmin);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setSubmitting(true);
    try {
      await createFn({ data: { email, password, role } });
      toast.success('Usuário criado');
      setOpen(false); setEmail(''); setPassword(''); setRole('user');
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir permanentemente?')) return;
    try { await deleteFn({ data: { userId: id } }); toast.success('Usuário excluído'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const setUserRole = async (id: string, r: 'user' | 'admin') => {
    await db.from('profiles').update({ role: r }).eq('id', id); toast.success('Função atualizada'); load();
  };

  return (
    <>
      <AdminPageHeader title="Usuários" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark"><Plus className="w-4 h-4 mr-1" /> Novo</Button></DialogTrigger>
          <DialogContent className="bg-arena-dark border-arena-gray">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-arena-green" /> Criar Acesso</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
              <div><Label>Senha (mín 6)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
              <div><Label>Função</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'user' | 'admin')}>
                  <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="user">Usuário</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={create} disabled={submitting || !email || password.length < 6} className="w-full bg-arena-green text-black font-bold rounded-xl">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Acesso'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      {loading ? <Loader2 className="w-6 h-6 animate-spin text-arena-green mx-auto mt-12" /> : (
        <div className="rounded-2xl border border-arena-gray bg-arena-dark overflow-hidden">
          <div className="divide-y divide-arena-gray">
            {users.map((u) => (
              <div key={u.id} className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-arena-gray flex items-center justify-center text-xs font-bold">{u.name?.slice(0, 2).toUpperCase() ?? '??'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.name || 'Sem nome'}</p>
                  <p className="text-[10px] text-arena-text-secondary truncate">{u.id.slice(0, 8)} · {new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <Select value={u.role} onValueChange={(v) => setUserRole(u.id, v as 'user' | 'admin')}>
                  <SelectTrigger className="w-28 h-8 bg-arena-gray/40 border-arena-gray text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="user">Usuário</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                </Select>
                <button onClick={() => remove(u.id)} className="p-2 rounded-lg hover:bg-arena-red/20 text-arena-red"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {users.length === 0 && <p className="p-8 text-center text-arena-text-secondary">Nenhum usuário ainda.</p>}
          </div>
        </div>
      )}
    </>
  );
}
