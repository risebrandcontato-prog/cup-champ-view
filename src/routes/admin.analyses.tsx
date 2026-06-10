// src/routes/admin/analyses.tsx
import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { AdminPageHeader } from './admin';
import { supabase } from '@/integrations/supabase/client';
import type { Analysis } from '@/types';
import {
  Plus, Pencil, Trash2, Flame, Star, CheckCircle, XCircle, Loader2,
  Ticket, ExternalLink, TrendingUp, TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/analyses')({ component: AnalysesAdmin });

function AnalysesAdmin() {
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

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

  /**
   * Define o resultado da análise e sincroniza com TODAS as apostas dos usuários.
   * Ajuste os nomes das colunas em 'user_bets' conforme seu schema real no Supabase.
   */
  const setResult = async (id: string, status: 'green' | 'red') => {
    setResolvingId(id);

    try {
      // 1. Atualiza a análise principal
      const { error: analysisError } = await supabase
        .from('analyses')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', id);

      if (analysisError) throw analysisError;

      // 2. Sincroniza apostas dos usuários (cast as any para evitar conflito de tipos gerados)
      // IMPORTANTE: ajuste os nomes das colunas abaixo conforme seu schema real:
      //  - 'result_status'  → status da aposta ('won' | 'lost')
      //  - 'result'         → resultado da análise ('green' | 'red')
      //  - 'resolved_at'    → data de resolução (remova se não existir na tabela)
      const syncPayload: Record<string, unknown> = {
        result_status: status === 'green' ? 'won' : 'lost',
        result: status,
        updated_at: new Date().toISOString(),
      };

      const { data: affectedBets, error: betsError } = await supabase
        .from('user_bets')
        .update(syncPayload as never)
        .eq('analysis_id', id)
        .select('id');

      if (betsError && betsError.code !== 'PGRST116') {
        console.warn('[setResult] user_bets sync warning:', betsError.message);
      }

      const affectedCount = affectedBets?.length ?? 0;

      toast.success(
        `Resultado: ${status.toUpperCase()}${
          affectedCount > 0 ? ` • ${affectedCount} aposta(s) atualizada(s)` : ''
        }`
      );

      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao definir resultado: ' + msg);
    } finally {
      setResolvingId(null);
    }
  };

  const location = useLocation();
  const pathname = location.pathname;
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
                <div
                  key={a.id}
                  className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-arena-gray text-[9px] font-bold uppercase">
                        {a.sport_type}
                      </span>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          a.display_type === 'structured'
                            ? 'bg-arena-green/20 text-arena-green border-arena-green/30'
                            : 'bg-arena-gold/20 text-arena-gold border-arena-gold/30'
                        }`}
                      >
                        {a.display_type === 'structured' ? (
                          <span className="flex items-center gap-0.5">
                            <Ticket className="w-2.5 h-2.5" /> Estruturada
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> Imagem
                          </span>
                        )}
                      </span>

                      {a.is_hot && <Flame className="w-3 h-3 text-arena-gold" />}
                      {a.is_featured && <Star className="w-3 h-3 text-arena-gold" />}

                      {a.status === 'green' && (
                        <span className="px-1.5 py-0.5 rounded bg-arena-success/20 text-arena-success text-[9px] font-bold flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" /> GREEN
                        </span>
                      )}
                      {a.status === 'red' && (
                        <span className="px-1.5 py-0.5 rounded bg-arena-red/20 text-arena-red text-[9px] font-bold flex items-center gap-0.5">
                          <TrendingDown className="w-2.5 h-2.5" /> RED
                        </span>
                      )}
                      {a.status === 'pending' && (
                        <span className="text-[9px] text-arena-text-secondary">pendente</span>
                      )}
                    </div>

                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <p className="text-[10px] text-arena-text-secondary">
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end">
                    {a.status === 'pending' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-arena-gold text-arena-gold text-xs h-8"
                            disabled={resolvingId === a.id}
                          >
                            {resolvingId === a.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            Resultado
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-arena-dark border-arena-gray max-w-sm">
                          <DialogHeader>
                            <DialogTitle className="text-base">Definir Resultado</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm text-arena-text-secondary">
                            Esta ação atualizará automaticamente todas as apostas dos usuários
                            vinculadas a esta análise.
                          </p>

                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <Button
                              onClick={() => setResult(a.id, 'green')}
                              disabled={resolvingId === a.id}
                              className="h-14 bg-arena-success text-black font-black text-lg rounded-xl hover:bg-arena-success/90"
                            >
                              <TrendingUp className="w-5 h-5 mr-1" /> GREEN
                            </Button>
                            <Button
                              onClick={() => setResult(a.id, 'red')}
                              disabled={resolvingId === a.id}
                              className="h-14 bg-arena-red text-white font-black text-lg rounded-xl hover:bg-arena-red/90"
                            >
                              <TrendingDown className="w-5 h-5 mr-1" /> RED
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Link
                      to="/admin/analyses/$id/edit"
                      params={{ id: a.id }}
                      className="p-2 rounded-lg hover:bg-arena-gray transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => remove(a.id)}
                      className="p-2 rounded-lg hover:bg-arena-red/20 text-arena-red transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="p-8 text-center">
                  <Ticket className="w-8 h-8 text-arena-gray mx-auto mb-2" />
                  <p className="text-sm text-arena-text-secondary">Nenhuma análise cadastrada.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <Outlet />
    </>
  );
}