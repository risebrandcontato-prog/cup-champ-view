import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { AdminPageHeader } from './admin';
import { supabase } from '@/integrations/supabase/client';
import type { Analysis } from '@/types';
import { Plus, Pencil, Trash2, Flame, Star, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/analyses')({ component: AnalysesAdmin });

function AnalysesAdmin() {
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar análises: ' + error.message);
    } else {
      setItems((data as Analysis[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm('Excluir análise permanentemente?')) return;
    const { error } = await supabase.from('analyses').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success('Análise excluída');
    load();
  };

  const setResult = async (id: string, status: 'green' | 'red') => {
    const { error } = await supabase
      .from('analyses')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao definir resultado: ' + error.message);
      return;
    }
    toast.success(`Resultado: ${status.toUpperCase()}`);
    load();
  };

  // Verifica se está em uma rota filha (new ou edit)
  const { pathname } = Route.useLocation ? Route.useLocation() : { pathname: '' };
  const isChildRoute = pathname.includes('/new') || pathname.includes('/edit');

  return (
    <>
      {!isChildRoute && (
        <>
          <AdminPageHeader
            title="Análises"
            action={
              <Link
                to="/admin/analyses/new"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-arena-green text-black shadow h-9 px-4 py-2 hover:bg-arena-green-dark"
              >
                <Plus className="w-4 h-4" /> Nova
              </Link>
            }
          />
          {loading ? (
            <div className="flex justify-center mt-12">
              <Loader2 className="w-6 h-6 animate-spin text-arena-green" />
            </div>
          ) : (
            <div className="rounded-2xl border border-arena-gray bg-arena-dark overflow-hidden divide-y divide-arena-gray">
              {items.map((a) => (
                <div key={a.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-arena-gray text-[9px] font-bold uppercase">{a.sport_type}</span>
                      {a.is_hot && <Flame className="w-3 h-3 text-arena-gold" />}
                      {a.is_featured && <Star className="w-3 h-3 text-arena-gold" />}
                      {a.status === 'green' && (
                        <span className="px-1.5 py-0.5 rounded bg-arena-success/20 text-arena-success text-[9px] font-bold">GREEN</span>
                      )}
                      {a.status === 'red' && (
                        <span className="px-1.5 py-0.5 rounded bg-arena-red/20 text-arena-red text-[9px] font-bold">RED</span>
                      )}
                      {a.status === 'pending' && (
                        <span className="text-[9px] text-arena-text-secondary">pendente</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <p className="text-[10px] text-arena-text-secondary">{new Date(a.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {a.status === 'pending' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-arena-gold text-arena-gold text-xs">Resultado</Button>
                      </DialogTrigger>
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
                  <Link to="/admin/analyses/$id/edit" params={{ id: a.id }} className="p-2 rounded-lg hover:bg-arena-gray transition-colors"><Pencil className="w-4 h-4" /></Link>
                  <button onClick={() => remove(a.id)} className="p-2 rounded-lg hover:bg-arena-red/20 text-arena-red transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {items.length === 0 && <p className="p-8 text-center text-arena-text-secondary">Nenhuma análise.</p>}
            </div>
          )}
        </>
      )}
      <Outlet />
    </>
  );
}