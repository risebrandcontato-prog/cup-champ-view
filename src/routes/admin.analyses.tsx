import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from './admin';
import { db } from '@/hooks/use-auth';
import type { Analysis } from '@/types';
import { Plus, Pencil, Trash2, Flame, Star, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/analyses')({ component: AnalysesAdmin });

function AnalysesAdmin() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('analyses').select('*').order('created_at', { ascending: false });
    setItems((data as Analysis[]) ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm('Excluir análise?')) return;
    await db.from('analyses').delete().eq('id', id); toast.success('Excluída'); load();
  };

  const setResult = async (id: string, status: 'green' | 'red') => {
    await db.from('analyses').update({ status, resolved_at: new Date().toISOString() }).eq('id', id);
    toast.success(`Resultado definido: ${status.toUpperCase()}`); load();
  };

  return (
    <>
      <AdminPageHeader title="Análises" action={
        <Button onClick={() => navigate({ to: '/admin/analyses/new' })} className="bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
      } />
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-arena-green mx-auto mt-12" /> : (
        <div className="rounded-2xl border border-arena-gray bg-arena-dark overflow-hidden divide-y divide-arena-gray">
          {items.map((a) => (
            <div key={a.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-arena-gray text-[9px] font-bold uppercase">{a.sport_type}</span>
                  {a.is_hot && <Flame className="w-3 h-3 text-arena-gold" />}
                  {a.is_featured && <Star className="w-3 h-3 text-arena-gold" />}
                  {a.status === 'green' && <span className="px-1.5 py-0.5 rounded bg-arena-success/20 text-arena-success text-[9px] font-bold">GREEN</span>}
                  {a.status === 'red' && <span className="px-1.5 py-0.5 rounded bg-arena-red/20 text-arena-red text-[9px] font-bold">RED</span>}
                  {a.status === 'pending' && <span className="text-[9px] text-arena-text-secondary">pendente</span>}
                </div>
                <p className="text-sm font-semibold truncate">{a.title}</p>
                <p className="text-[10px] text-arena-text-secondary">{new Date(a.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              {a.status === 'pending' && (
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" variant="outline" className="border-arena-gold text-arena-gold text-xs">Resultado</Button></DialogTrigger>
                  <DialogContent className="bg-arena-dark border-arena-gray">
                    <DialogHeader><DialogTitle>Definir Resultado</DialogTitle></DialogHeader>
                    <p className="text-sm text-arena-text-secondary">Esta ação atualizará automaticamente todos os usuários que registraram esta aposta.</p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Button onClick={() => setResult(a.id, 'green')} className="h-16 bg-arena-success text-black font-black text-lg rounded-xl"><CheckCircle className="w-5 h-5 mr-1" /> GREEN</Button>
                      <Button onClick={() => setResult(a.id, 'red')} className="h-16 bg-arena-red text-white font-black text-lg rounded-xl"><XCircle className="w-5 h-5 mr-1" /> RED</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Link to="/admin/analyses/$id/edit" params={{ id: a.id }} className="p-2 rounded-lg hover:bg-arena-gray"><Pencil className="w-4 h-4" /></Link>
              <button onClick={() => remove(a.id)} className="p-2 rounded-lg hover:bg-arena-red/20 text-arena-red"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {items.length === 0 && <p className="p-8 text-center text-arena-text-secondary">Nenhuma análise.</p>}
        </div>
      )}
    </>
  );
}
