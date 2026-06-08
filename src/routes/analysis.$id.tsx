import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Check, ExternalLink, Loader2, X, Flame, Star, Calendar,
  Clock, Trophy, TrendingUp, Target, Copy, CheckCircle2, Ticket,
  Hash, ChevronRight, ShieldCheck, AlertCircle, Zap, Share2,
  type LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useFixtureData } from '@/hooks/use-fixture-data';
import { FixtureDataPanel } from '@/components/FixtureDataPanel';
import type { Analysis, AnalysisMatch, UserBet, AnalysisBet, AnalysisBetSelection } from '@/types';
import { Button } from '@/components/ui/button';
import { SPORTS, BOOKMAKERS } from '@/lib/constants';

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisDetail,
});

/* ═══════════════════════════════════════════════════════════════
   ANALYSIS DETAIL — Experiência VIP Premium Cinematográfica
   ═══════════════════════════════════════════════════════════════ */
function AnalysisDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<(Analysis & { matches: AnalysisMatch[]; bet: (AnalysisBet & { selections: AnalysisBetSelection[] }) | null }) | null>(null);
  const [bet, setBet] = useState<UserBet | null>(null);
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: fixtureData, loading: fixtureLoading, error: fixtureError } = useFixtureData(analysis?.fixture_id ?? null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [{ data: analysisData, error: analysisError }, { data: matchesData }, { data: betData }] = await Promise.all([
        supabase.from('analyses').select('*').eq('id', id).maybeSingle(),
        supabase.from('analysis_matches').select('*').eq('analysis_id', id),
        supabase.from('analysis_bets').select('*, selections:analysis_bet_selections(*)').eq('analysis_id', id).maybeSingle(),
      ]);

      if (cancelled) return;
      if (analysisError || !analysisData) {
        toast.error('Análise não encontrada');
        return;
      }

      const bet = betData ? (betData as AnalysisBet & { selections: AnalysisBetSelection[] }) : null;

      setAnalysis({
        ...(analysisData as Analysis),
        matches: (matchesData as AnalysisMatch[]) ?? [],
        bet,
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

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar');
    }
  }, []);

  if (!analysis) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center pt-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-arena-green" />
          <p className="text-sm text-arena-text-secondary/50 font-medium">Carregando análise...</p>
        </div>
      </AppShell>
    );
  }

  const sport = SPORTS.find((s) => s.id === analysis.sport_type) ?? SPORTS[0];
  const isResolved = analysis.status === 'green' || analysis.status === 'red';
  const isPending = analysis.status === 'pending';
  const potentialReturn = analysis.stake_value && analysis.odds
    ? analysis.stake_value * analysis.odds
    : null;
  const bookmaker = BOOKMAKERS.find(b => b.name.toLowerCase() === (analysis.bookmaker_name ?? '').toLowerCase());

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-80px)] pb-28">
        {/* ═══════════════════════════════════════════════════════════════
            HERO HEADER — Cinematográfico com imagem/blur
            ═══════════════════════════════════════════════════════════════ */}
        <div className="relative -mx-4 px-4 pt-2 pb-6 overflow-hidden">
          {/* Background image or gradient */}
          <div className="absolute inset-0">
            {analysis.image_url ? (
              <>
                <img
                  src={analysis.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-sm opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-arena-dark/60 via-arena-dark/90 to-arena-dark" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-arena-green/5 via-arena-dark to-arena-dark" />
            )}
          </div>

          {/* Floating back button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate({ to: '/' })}
            className="relative z-10 flex items-center gap-2 text-arena-text-secondary hover:text-white mb-5 text-sm font-medium transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-arena-dark/60 border border-arena-gray/30 flex items-center justify-center group-hover:border-arena-green/40 group-hover:bg-arena-green/10 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Voltar</span>
          </motion.button>

          {/* Badges cluster */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 flex flex-wrap items-center gap-2 mb-4"
          >
            <Badge
              icon={sport.icon}
              label={sport.name}
              color={sport.color}
              bgOpacity="20"
            />

            {analysis.championship && (
              <Badge
                icon={Trophy}
                label={analysis.championship}
                color="#A0A0A0"
                bgOpacity="15"
              />
            )}

            {analysis.is_hot && (
              <Badge
                icon={Flame}
                label="QUENTE"
                color="#FFD700"
                bgOpacity="20"
                border
              />
            )}

            {analysis.is_featured && (
              <Badge
                icon={Star}
                label="DESTAQUE"
                color="#00C853"
                bgOpacity="20"
                border
              />
            )}

            {isResolved && (
              <Badge
                icon={analysis.status === 'green' ? CheckCircle2 : X}
                label={analysis.status === 'green' ? 'GREEN' : 'RED'}
                color={analysis.status === 'green' ? '#00C853' : '#EF4444'}
                bgOpacity={analysis.status === 'green' ? '20' : '15'}
                border
                pulse={analysis.status === 'green'}
              />
            )}

            {isPending && (
              <Badge
                icon={Clock}
                label="PENDENTE"
                color="#A0A0A0"
                bgOpacity="15"
                pulse
              />
            )}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white mb-3"
          >
            {analysis.title}
          </motion.h1>

          {/* Date */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 text-xs text-arena-text-secondary/50 flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
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
          </motion.p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MAIN CONTENT
            ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          {/* Fixture Data */}
          {analysis.fixture_id && (
            <div>
              {fixtureLoading && (
                <div className="rounded-2xl border border-arena-gray/30 bg-arena-dark/60 p-5 flex items-center justify-center gap-2 text-arena-text-secondary/50">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Carregando dados do jogo...</span>
                </div>
              )}
              {fixtureError && (
                <div className="rounded-2xl border border-arena-red/20 bg-arena-red/5 p-4 text-arena-red text-sm">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Erro ao carregar dados do jogo
                  </p>
                  <p className="text-xs mt-1 opacity-70">{fixtureError}</p>
                </div>
              )}
              {fixtureData && <FixtureDataPanel data={fixtureData} />}
            </div>
          )}

          {/* Description */}
          {analysis.description && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-arena-gray/25 bg-arena-dark/60 p-4 backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-widest text-arena-text-secondary/40 font-bold mb-2.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Análise do Especialista
              </p>
              <p className="text-sm text-arena-text-secondary/80 whitespace-pre-line leading-relaxed">
                {analysis.description}
              </p>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              BET TICKET — Card premium do bilhete (novo formato)
              ═══════════════════════════════════════════════════════════════ */}
          {analysis.bet && (
            <BetTicketCard
              bet={analysis.bet}
              bookmaker={bookmaker}
              stake={analysis.stake_value}
              totalOdds={analysis.odds}
              potentialReturn={potentialReturn}
              onCopyLink={() => copyToClipboard(analysis.bet?.bookmaker_url ?? '')}
              copied={copied}
            />
          )}

          {/* ═══════════════════════════════════════════════════════════════
              LEGACY MATCHES — Fallback para dados antigos
              ═══════════════════════════════════════════════════════════════ */}
          {!analysis.bet && analysis.display_type === 'structured' && (
            <div className="space-y-3">
              {/* Bookmaker + Stake/Odds summary */}
              {(analysis.bookmaker_name || analysis.stake_value || analysis.odds) && (
                <div className="grid grid-cols-2 gap-3">
                  {analysis.bookmaker_name && (
                    <div className="col-span-2 rounded-2xl border border-arena-gray/25 bg-arena-dark/60 p-4">
                      <p className="text-[10px] uppercase tracking-widest text-arena-text-secondary/40 font-bold mb-2 flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3" /> Casa Recomendada
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          className="font-bold text-lg"
                          style={{ color: bookmaker?.color ?? '#fff' }}
                        >
                          {analysis.bookmaker_name}
                        </span>
                        {analysis.bookmaker_link && (
                          <a
                            href={analysis.bookmaker_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-arena-green text-black text-xs font-bold hover:bg-arena-green-dark transition-colors shadow-lg shadow-arena-green/20"
                          >
                            Ir Apostar <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {analysis.stake_value && (
                    <div className="rounded-2xl border border-arena-gray/25 bg-arena-dark/60 p-4 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-arena-text-secondary/40 font-bold mb-1 flex items-center justify-center gap-1">
                        <Target className="w-3 h-3" /> Valor
                      </p>
                      <p className="text-2xl font-black text-arena-gold">R$ {analysis.stake_value.toFixed(2)}</p>
                    </div>
                  )}
                  {analysis.odds && (
                    <div className="rounded-2xl border border-arena-gray/25 bg-arena-dark/60 p-4 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-arena-text-secondary/40 font-bold mb-1 flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Odds
                      </p>
                      <p className="text-2xl font-black text-arena-green">@{analysis.odds.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Matches list */}
              {analysis.matches.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-widest text-arena-text-secondary/40 font-bold flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Jogos Incluídos
                  </p>
                  {analysis.matches.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
                      className="rounded-xl border border-arena-gray/25 bg-arena-dark/60 p-4 hover:border-arena-green/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-arena-text-secondary/50">Jogo {i + 1}</span>
                        {m.match_time && (
                          <span className="text-[10px] text-arena-text-secondary/40 flex items-center gap-1">
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
                      <p className="font-bold text-lg text-white">
                        {m.home_team} <span className="text-arena-text-secondary/40 mx-1">vs</span> {m.away_team}
                      </p>
                      {m.league && (
                        <p className="text-xs text-arena-text-secondary/40 mt-1">{m.league}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2.5 py-1 rounded-lg bg-arena-gray/30 text-[10px] font-bold text-white/70">
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

          {/* Image display type */}
          {analysis.display_type === 'image' && analysis.image_url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-arena-gray/25 overflow-hidden shadow-xl"
            >
              <img src={analysis.image_url} alt={analysis.title} className="w-full object-cover" />
            </motion.div>
          )}

          {/* Resolved status banner */}
          {isResolved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
              className={`rounded-2xl border p-5 text-center ${
                analysis.status === 'green'
                  ? 'border-arena-success/30 bg-gradient-to-b from-arena-success/10 to-arena-success/5'
                  : 'border-arena-red/30 bg-gradient-to-b from-arena-red/10 to-arena-red/5'
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
              >
                {analysis.status === 'green' ? (
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-arena-success" />
                ) : (
                  <X className="w-10 h-10 mx-auto mb-2 text-arena-red" />
                )}
              </motion.div>
              <p className={`text-3xl font-black ${analysis.status === 'green' ? 'text-arena-success' : 'text-arena-red'}`}>
                {analysis.status === 'green' ? 'GREEN!' : 'RED'}
              </p>
              {analysis.resolved_at && (
                <p className="text-xs text-arena-text-secondary/40 mt-1">
                  Resultado definido em {new Date(analysis.resolved_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FIXED FOOTER — Ações do usuário
          ═══════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-arena-dark/90 backdrop-blur-xl border-t border-arena-gray/25 pb-safe">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <AnimatePresence mode="wait">
            {bet ? (
              <motion.div
                key="registered"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className={`w-4 h-4 ${bet.did_bet ? 'text-arena-green' : 'text-arena-red'}`} />
                  <span className="text-sm text-arena-text-secondary/70">
                    Você marcou esta aposta como{' '}
                    <span className={`font-bold ${bet.did_bet ? 'text-arena-green' : 'text-arena-red'}`}>
                      {bet.did_bet ? 'realizada' : 'não realizada'}
                    </span>
                  </span>
                </div>
                {bet.result_status !== 'pending' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`text-xs font-bold ${
                      bet.result_status === 'green' ? 'text-arena-success' : 'text-arena-red'
                    }`}
                  >
                    Resultado: {bet.result_status.toUpperCase()}
                    {bet.profit_loss !== 0 && (
                      <span className="ml-1">
                        • {bet.profit_loss > 0 ? '+' : ''}R$ {bet.profit_loss.toFixed(2)}
                      </span>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 gap-2.5"
              >
                <Button
                  disabled={registering}
                  onClick={() => registerBet(true)}
                  className="h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl shadow-lg shadow-arena-green/20 transition-all active:scale-95"
                >
                  {registering ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1.5" />
                  )}
                  Fiz essa Aposta
                </Button>
                <Button
                  disabled={registering}
                  onClick={() => registerBet(false)}
                  variant="outline"
                  className="h-12 border-2 border-arena-red/60 text-arena-red hover:bg-arena-red/10 hover:border-arena-red font-bold rounded-xl transition-all active:scale-95"
                >
                  {registering ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-1.5" />
                  )}
                  Não Fiz
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BET TICKET CARD — Bilhete premium visual
   ═══════════════════════════════════════════════════════════════ */
function BetTicketCard({
  bet,
  bookmaker,
  stake,
  totalOdds,
  potentialReturn,
  onCopyLink,
  copied,
}: {
  bet: AnalysisBet & { selections: AnalysisBetSelection[] };
  bookmaker?: { name: string; color: string };
  stake: number | null;
  totalOdds: number | null;
  potentialReturn: number | null;
  onCopyLink: () => void;
  copied: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-arena-gray/25 bg-arena-dark/60 overflow-hidden backdrop-blur-sm shadow-xl shadow-black/10"
    >
      {/* Ticket Header */}
      <div className="p-4 border-b border-arena-gray/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-arena-green/15 border border-arena-green/25 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-arena-green" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Bilhete da Aposta</p>
              <p className="text-[10px] text-arena-text-secondary/40 uppercase tracking-wider">
                {bet.bet_type === 'multipla' ? 'Múltipla' : 'Simples'}
              </p>
            </div>
          </div>
          {bookmaker && (
            <span
              className="px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider"
              style={{ backgroundColor: bookmaker.color + '20', color: bookmaker.color, border: `1px solid ${bookmaker.color}30` }}
            >
              {bookmaker.name}
            </span>
          )}
        </div>

        {/* Link + Copy */}
        {bet.bookmaker_url && (
          <div className="flex items-center gap-2">
            <a
              href={bet.bookmaker_url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-arena-green/10 border border-arena-green/20 text-arena-green text-xs font-bold hover:bg-arena-green/20 transition-colors truncate"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Abrir na {bookmaker?.name ?? 'casa'}</span>
            </a>
            <button
              onClick={onCopyLink}
              className="w-9 h-9 rounded-lg bg-arena-gray/20 border border-arena-gray/30 flex items-center justify-center text-arena-text-secondary/50 hover:text-white hover:border-arena-green/30 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-arena-green" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Selections */}
      <div className="p-4 space-y-3">
        {bet.selections.map((sel, i) => (
          <motion.div
            key={sel.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.06 }}
            className="relative pl-3 border-l-2 border-arena-green/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {sel.home_team} <span className="text-arena-text-secondary/30 mx-1">vs</span> {sel.away_team}
                </p>
                {sel.league && (
                  <p className="text-[11px] text-arena-text-secondary/40 mt-0.5">{sel.league}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-arena-gray/25 text-[10px] font-bold text-white/70">
                    {sel.market}
                  </span>
                  <span className="text-[11px] text-arena-green font-bold">
                    {sel.selection}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                {sel.odds && (
                  <p className="text-lg font-black text-arena-gold">@{sel.odds.toFixed(2)}</p>
                )}
                {sel.match_time && (
                  <p className="text-[10px] text-arena-text-secondary/30 mt-0.5">
                    <Clock className="w-3 h-3 inline mr-0.5" />
                    {new Date(sel.match_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Ticket Footer — Values */}
      <div className="p-4 border-t border-arena-gray/20 bg-arena-dark/30">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1">Stake</p>
            <p className="text-lg font-black text-white">
              {stake ? `R$ ${stake.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="text-center border-x border-arena-gray/15">
            <p className="text-[10px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1">Odds Total</p>
            <p className="text-lg font-black text-arena-green">
              {totalOdds ? `@${totalOdds.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1">Retorno</p>
            <p className="text-lg font-black text-arena-gold">
              {potentialReturn ? `R$ ${potentialReturn.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>

        {/* CTA Replicate */}
        {bet.bookmaker_url && (
          <a
            href={bet.bookmaker_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-arena-green to-arena-green-dark text-black font-bold text-sm hover:shadow-lg hover:shadow-arena-green/30 transition-all active:scale-[0.98]"
          >
            <Share2 className="w-4 h-4" />
            Replicar Aposta na {bookmaker?.name ?? 'Casa'}
          </a>
        )}
      </div>

      {/* Admin Notes */}
      {bet.notes && (
        <div className="px-4 pb-4">
          <div className="mt-3 p-3 rounded-xl bg-arena-gold/5 border border-arena-gold/10">
            <p className="text-[10px] uppercase tracking-wider text-arena-gold/60 font-bold mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Observações do Especialista
            </p>
            <p className="text-xs text-arena-text-secondary/60 leading-relaxed">{bet.notes}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BADGE — Componente reutilizável de badge
   ═══════════════════════════════════════════════════════════════ */
function Badge({
  icon: Icon,
  label,
  color,
  bgOpacity = '20',
  border = false,
  pulse = false,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  bgOpacity?: string;
  border?: boolean;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${pulse ? 'animate-pulse' : ''}`}
      style={{
        backgroundColor: `${color}${bgOpacity}`,
        color,
        border: border ? `1px solid ${color}40` : 'none',
      }}
    >
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {label}
    </span>
  );
}