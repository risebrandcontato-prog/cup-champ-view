import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, ExternalLink, Loader2, X, Flame, Star, Calendar, Clock, Trophy, TrendingUp, Target } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useFixtureData } from '@/hooks/use-fixture-data';
import { FixtureDataPanel } from '@/components/FixtureDataPanel';
import type { Analysis, AnalysisMatch, UserBet } from '@/types';
import { Button } from '@/components/ui/button';
import { SPORTS } from '@/lib/constants';

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisDetail,
});

function AnalysisDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<(Analysis & { matches: AnalysisMatch[] }) | null>(null);
  const [bet, setBet] = useState<UserBet | null>(null);
  const [registering, setRegistering] = useState(false);

  const { data: fixtureData, loading: fixtureLoading, error: fixtureError } = useFixtureData(analysis?.fixture_id ?? null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [{ data: analysisData, error: analysisError }, { data: matchesData }] = await Promise.all([
        supabase.from('analyses').select('*').eq('id', id).maybeSingle(),
        supabase.from('analysis_matches').select('*').eq('analysis_id', id),
      ]);

      if (cancelled) return;
      if (analysisError) {
        toast.error('Erro ao carregar análise');
        return;
      }

      setAnalysis({
        ...(analysisData as Analysis),
        matches: (matchesData as AnalysisMatch[]) ?? [],
      });

      if (user) {
        const { data: ub } = await supabase
          .from('user_bets')
          .select('*')
          .eq('analysis_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled) setBet((ub as UserBet) ?? null);
      }
    })();

    return () => { cancelled = true; };
  }, [id, user]);

  const registerBet = async (didBet: boolean) => {
    if (!user || !analysis) return;
    setRegistering(true);
    const { data, error } = await supabase
      .from('user_bets')
      .upsert(
        { user_id: user.id, analysis_id: analysis.id, did_bet: didBet },
        { onConflict: 'user_id,analysis_id' }
      )
      .select()
      .single();
    setRegistering(false);
    if (error) {
      toast.error('Erro', { description: error.message });
      return;
    }
    setBet(data as UserBet);
    toast.success(didBet ? 'Aposta registrada!' : 'Marcado como não apostado');
  };

  if (!analysis) {
    return (
      <AppShell>
        <div className="flex justify-center pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-arena-green" />
        </div>
      </AppShell>
    );
  }

  const sport = SPORTS.find((s) => s.id === analysis.sport_type) ?? SPORTS[0];
  const isResolved = analysis.status === 'green' || analysis.status === 'red';
  const isPending = analysis.status === 'pending';

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: '/' })}
        className="flex items-center gap-2 text-arena-text-secondary hover:text-white mb-4 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

        {analysis.fixture_id && (
          <div>
            {fixtureLoading && (
              <div className="rounded-2xl border border-arena-gray bg-arena-dark p-6 flex items-center justify-center gap-2 text-arena-text-secondary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Carregando dados do jogo...</span>
              </div>
            )}
            {fixtureError && (
              <div className="rounded-2xl border border-arena-red/30 bg-arena-red/10 p-4 text-arena-red text-sm">
                <p className="font-bold">Erro ao carregar dados do jogo</p>
                <p className="text-xs">{fixtureError}</p>
              </div>
            )}
            {fixtureData && <FixtureDataPanel data={fixtureData} />}
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{ backgroundColor: sport.color + '20', color: sport.color, border: `1px solid ${sport.color}40` }}
            >
              {sport.name}
            </span>

            {analysis.championship && (
              <span className="px-2.5 py-1 rounded-full bg-arena-gray text-[10px] font-bold text-arena-text-secondary">
                <Trophy className="w-3 h-3 inline mr-1" />
                {analysis.championship}
              </span>
            )}

            {analysis.is_hot && (
              <span className="px-2.5 py-1 rounded-full bg-arena-gold/20 text-arena-gold text-[10px] font-black border border-arena-gold/30">
                <Flame className="w-3 h-3 inline mr-1" /> QUENTE
              </span>
            )}

            {analysis.is_featured && (
              <span className="px-2.5 py-1 rounded-full bg-arena-green/20 text-arena-green text-[10px] font-black border border-arena-green/30">
                <Star className="w-3 h-3 inline mr-1" /> DESTAQUE
              </span>
            )}

            {analysis.status === 'green' && (
              <span className="px-2.5 py-1 rounded-full bg-arena-success/20 text-arena-success text-[10px] font-black border border-arena-success/30">
                <Check className="w-3 h-3 inline mr-1" /> GREEN
              </span>
            )}
            {analysis.status === 'red' && (
              <span className="px-2.5 py-1 rounded-full bg-arena-red/20 text-arena-red text-[10px] font-black border border-arena-red/30">
                <X className="w-3 h-3 inline mr-1" /> RED
              </span>
            )}
            {isPending && (
              <span className="px-2.5 py-1 rounded-full bg-arena-gray text-[10px] font-bold text-arena-text-secondary">
                <Clock className="w-3 h-3 inline mr-1" /> PENDENTE
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black tracking-tight leading-tight">{analysis.title}</h1>

          <p className="text-xs text-arena-text-secondary mt-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {analysis.match_date
              ? new Date(analysis.match_date).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : new Date(analysis.created_at).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
          </p>
        </div>

        {analysis.display_type === 'image' && analysis.image_url && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-arena-gray overflow-hidden"
          >
            <img src={analysis.image_url} alt={analysis.title} className="w-full object-cover" />
          </motion.div>
        )}

        {analysis.description && (
          <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
            <p className="text-arena-text-secondary whitespace-pre-line leading-relaxed text-sm">
              {analysis.description}
            </p>
          </div>
        )}

        {analysis.display_type === 'structured' && (
          <div className="space-y-3">
            {analysis.bookmaker_name && (
              <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
                <p className="text-xs uppercase tracking-widest text-arena-text-secondary mb-2 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Casa Recomendada
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-lg">{analysis.bookmaker_name}</p>
                  {analysis.bookmaker_link ? (
                    <a
                      href={analysis.bookmaker_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-arena-green text-black text-xs font-bold hover:bg-arena-green-dark transition-colors"
                    >
                      Ir Apostar <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                </div>
              </div>
            )}

            {(analysis.stake_value || analysis.odds) && (
              <div className="grid grid-cols-2 gap-3">
                {analysis.stake_value && (
                  <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 text-center">
                    <p className="text-xs uppercase tracking-widest text-arena-text-secondary mb-1 flex items-center justify-center gap-1">
                      <Target className="w-3 h-3" /> Valor
                    </p>
                    <p className="text-2xl font-black text-arena-gold">R$ {analysis.stake_value.toFixed(2)}</p>
                  </div>
                )}
                {analysis.odds && (
                  <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 text-center">
                    <p className="text-xs uppercase tracking-widest text-arena-text-secondary mb-1 flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Odds
                    </p>
                    <p className="text-2xl font-black text-arena-green">@{analysis.odds.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            {analysis.matches.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-arena-text-secondary flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Jogos Incluídos
                </p>
                {analysis.matches.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border border-arena-gray bg-arena-dark p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-arena-text-secondary">Jogo {i + 1}</span>
                      {m.match_time && (
                        <span className="text-[10px] text-arena-text-secondary flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(m.match_time).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-lg">
                      {m.home_team} <span className="text-arena-text-secondary mx-1">vs</span> {m.away_team}
                    </p>
                    {m.league && (
                      <p className="text-xs text-arena-text-secondary mt-1">{m.league}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="px-2.5 py-1 rounded-full bg-arena-gray text-[10px] font-bold">
                        {m.bet_type}
                      </span>
                      {m.odds && (
                        <span className="text-arena-gold font-bold text-sm">@{m.odds.toFixed(2)}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {isResolved && (
          <div className={`rounded-2xl border p-4 text-center ${analysis.status === 'green' ? 'border-arena-success/30 bg-arena-success/10' : 'border-arena-red/30 bg-arena-red/10'}`}>
            <p className={`text-3xl font-black ${analysis.status === 'green' ? 'text-arena-success' : 'text-arena-red'}`}>
              {analysis.status === 'green' ? '✓ GREEN' : '✗ RED'}
            </p>
            {analysis.resolved_at && (
              <p className="text-xs text-arena-text-secondary mt-1">
                Resultado definido em {new Date(analysis.resolved_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}
      </motion.div>

      <div className="fixed bottom-16 inset-x-0 z-30 glass border-t border-arena-gray pb-safe">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {bet ? (
            <div className="text-center text-sm">
              <span className="text-arena-text-secondary">
                ✓ Você marcou esta aposta como{' '}
                <span className={`font-bold ${bet.did_bet ? 'text-arena-green' : 'text-arena-red'}`}>
                  {bet.did_bet ? 'realizada' : 'não realizada'}
                </span>
              </span>
              {bet.result_status !== 'pending' && (
                <span className={`block mt-1 text-xs font-bold ${bet.result_status === 'green' ? 'text-arena-success' : 'text-arena-red'}`}>
                  Resultado: {bet.result_status.toUpperCase()}
                  {bet.profit_loss !== 0 && ` • ${bet.profit_loss > 0 ? '+' : ''}R$ ${bet.profit_loss.toFixed(2)}`}
                </span>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                disabled={registering}
                onClick={() => registerBet(true)}
                className="h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl"
              >
                <Check className="w-4 h-4 mr-1" /> Fiz essa Aposta
              </Button>
              <Button
                disabled={registering}
                onClick={() => registerBet(false)}
                variant="outline"
                className="h-12 border-2 border-arena-red text-arena-red hover:bg-arena-red/10 font-bold rounded-xl"
              >
                <X className="w-4 h-4 mr-1" /> Não Fiz
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}