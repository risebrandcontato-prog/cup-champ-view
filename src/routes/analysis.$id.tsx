// src/routes/analysis.$id.tsx
// Analysis Detail — Experiência VIP Premium Cinematográfica Imersiva
// Futebol • Análise • Imersão • Jogo Responsável

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Check, ExternalLink, Loader2, X, Flame, Star, Calendar,
  Clock, Trophy, TrendingUp, Target, Copy, CheckCircle2, Ticket,
  Hash, ChevronRight, ShieldCheck, AlertCircle, Zap, Share2,
  AlertTriangle, HeartHandshake, Wallet, TrendingDown, Percent,
  BarChart3, Users, Activity, type LucideIcon
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
  const [showAllSelections, setShowAllSelections] = useState(false);

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

  const shareAnalysis = useCallback(async () => {
    const shareData = {
      title: analysis?.title ?? 'Análise VIP',
      text: `Confira esta análise: ${analysis?.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyToClipboard(window.location.href);
      }
    } catch {
      // User cancelled share
    }
  }, [analysis, copyToClipboard]);

  if (!analysis) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center pt-24 gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-8 h-8 text-arena-green" />
          </motion.div>
          <p className="text-sm text-arena-text-secondary/50 font-medium">Carregando análise...</p>
        </div>
      </AppShell>
    );
  }

  const sport = SPORTS.find((s) => s.id === analysis.sport_type) ?? SPORTS[0];
  const isResolved = analysis.status === 'green' || analysis.status === 'red';
  const isPending = analysis.status === 'pending';
  const isGreen = analysis.status === 'green';
  const isRed = analysis.status === 'red';
  const potentialReturn = analysis.stake_value && analysis.odds
    ? analysis.stake_value * analysis.odds
    : null;
  const bookmaker = BOOKMAKERS.find(b => b.name.toLowerCase() === (analysis.bookmaker_name ?? '').toLowerCase());
  const selectionCount = analysis.bet?.selections?.length ?? analysis.matches?.length ?? 0;

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-80px)] pb-32">
        {/* ═══════════════════════════════════════════════════════════════
            HERO HEADER — Cinematográfico com parallax e glow
            ═══════════════════════════════════════════════════════════════ */}
        <div className="relative -mx-4 px-4 pt-2 pb-8 overflow-hidden">
          {/* Dynamic background */}
          <div className="absolute inset-0">
            {analysis.image_url ? (
              <>
                <motion.img
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                  src={analysis.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-md opacity-25"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-arena-dark/40 via-arena-dark/80 to-arena-dark" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-arena-green/8 via-arena-dark to-arena-dark" />
            )}
            {/* Animated glow orbs */}
            <div className="absolute -top-10 -right-20 w-64 h-64 rounded-full bg-arena-green/10 blur-3xl animate-pulse" />
            <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-arena-gold/5 blur-3xl" />
          </div>

          {/* Floating back button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            onClick={() => navigate({ to: '/' })}
            className="relative z-10 flex items-center gap-2 text-arena-text-secondary hover:text-white mb-6 text-sm font-medium transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-arena-dark/60 border border-arena-gray/30 flex items-center justify-center group-hover:border-arena-green/40 group-hover:bg-arena-green/10 transition-all shadow-lg shadow-black/10">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline">Voltar</span>
          </motion.button>

          {/* Share button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={shareAnalysis}
            className="absolute top-2 right-4 z-10 w-9 h-9 rounded-xl bg-arena-dark/60 border border-arena-gray/30 flex items-center justify-center text-arena-text-secondary hover:text-white hover:border-arena-green/40 transition-all shadow-lg shadow-black/10"
          >
            <Share2 className="w-4 h-4" />
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
                glow
              />
            )}

            {analysis.is_featured && (
              <Badge
                icon={Star}
                label="DESTAQUE"
                color="#00C853"
                bgOpacity="20"
                border
                glow
              />
            )}

            {isResolved && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
              >
                <Badge
                  icon={isGreen ? CheckCircle2 : X}
                  label={isGreen ? 'GREEN' : 'RED'}
                  color={isGreen ? '#00C853' : '#EF4444'}
                  bgOpacity={isGreen ? '20' : '15'}
                  border
                  pulse={isGreen}
                />
              </motion.div>
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

            {bet?.did_bet && (
              <Badge
                icon={Check}
                label="VOCÊ APOSTOU"
                color="#00C853"
                bgOpacity="15"
                border
              />
            )}
          </motion.div>

          {/* Title with cinematic reveal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="relative z-10 text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white mb-3">
              {analysis.title}
            </h1>
          </motion.div>

          {/* Meta info bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 flex flex-wrap items-center gap-3 text-xs text-arena-text-secondary/50"
          >
            <span className="flex items-center gap-1.5">
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
            </span>
            {selectionCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" />
                {selectionCount} {selectionCount === 1 ? 'seleção' : 'seleções'}
              </span>
            )}
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MAIN CONTENT
            ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          {/* ═══════════════════════════════════════════════════════════════
              JOGO RESPONSÁVEL — Banner fixo no topo do conteúdo
              ═══════════════════════════════════════════════════════════════ */}
          <ResponsibleGamblingBanner compact />

          {/* Resolved status — cinematic reveal */}
          <AnimatePresence>
            {isResolved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className={`rounded-2xl border p-6 text-center relative overflow-hidden ${
                  isGreen
                    ? 'border-arena-success/30 bg-gradient-to-b from-arena-success/15 via-arena-success/5 to-transparent'
                    : 'border-arena-red/30 bg-gradient-to-b from-arena-red/15 via-arena-red/5 to-transparent'
                }`}
              >
                {/* Glow effect */}
                <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl ${isGreen ? 'bg-arena-success/20' : 'bg-arena-red/20'}`} />
                
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                  className="relative z-10"
                >
                  {isGreen ? (
                    <div className="w-16 h-16 rounded-full bg-arena-success/20 border-2 border-arena-success/40 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-8 h-8 text-arena-success" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-arena-red/20 border-2 border-arena-red/40 flex items-center justify-center mx-auto mb-3">
                      <X className="w-8 h-8 text-arena-red" />
                    </div>
                  )}
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className={`relative z-10 text-4xl font-black tracking-tight ${isGreen ? 'text-arena-success' : 'text-arena-red'}`}
                >
                  {isGreen ? 'GREEN!' : 'RED'}
                </motion.p>
                
                {analysis.resolved_at && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="relative z-10 text-xs text-arena-text-secondary/40 mt-2"
                  >
                    Resultado definido em {new Date(analysis.resolved_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </motion.p>
                )}

                {/* User bet result */}
                {bet?.did_bet && bet.result_status !== 'pending' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="relative z-10 mt-4 pt-4 border-t border-white/5"
                  >
                    <p className={`text-sm font-bold ${bet.result_status === 'green' ? 'text-arena-success' : 'text-arena-red'}`}>
                      Sua aposta: {bet.result_status.toUpperCase()}
                      {bet.profit_loss !== 0 && (
                        <span className="ml-2 text-lg">
                          {bet.profit_loss > 0 ? '+' : ''}R$ {bet.profit_loss?.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Quick stats bar */}
          <QuickStatsBar
            stake={analysis.stake_value}
            odds={analysis.odds}
            potentialReturn={potentialReturn}
            bookmaker={bookmaker}
            status={analysis.status}
          />

          {/* Description */}
          {analysis.description && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-arena-gray/25 bg-arena-dark/60 p-5 backdrop-blur-sm relative overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-arena-green/5 blur-2xl" />
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-widest text-arena-text-secondary/40 font-bold mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-arena-green/10 border border-arena-green/20 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-arena-green" />
                  </div>
                  Análise do Especialista
                </p>
                <p className="text-sm text-arena-text-secondary/80 whitespace-pre-line leading-relaxed">
                  {analysis.description}
                </p>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              BET TICKET — Card premium do bilhete
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
              showAll={showAllSelections}
              onToggleShowAll={() => setShowAllSelections(!showAllSelections)}
            />
          )}

          {/* ═══════════════════════════════════════════════════════════════
              JOGO RESPONSÁVEL — Banner completo antes das ações
              ═══════════════════════════════════════════════════════════════ */}
          <ResponsibleGamblingBanner />

          {/* Image display type */}
          {analysis.display_type === 'image' && analysis.image_url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-arena-gray/25 overflow-hidden shadow-2xl shadow-black/20"
            >
              <img src={analysis.image_url} alt={analysis.title} className="w-full object-cover" />
            </motion.div>
          )}

          {/* Legacy matches */}
          {!analysis.bet && analysis.display_type === 'structured' && analysis.matches.length > 0 && (
            <LegacyMatches matches={analysis.matches} />
          )}
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FIXED FOOTER — Ações do usuário com glassmorphism
          ═══════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-arena-dark/85 backdrop-blur-2xl border-t border-arena-gray/20 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.3)]">
        <div className="max-w-2xl mx-auto px-4 py-3.5">
          <AnimatePresence mode="wait">
            {bet ? (
              <motion.div
                key="registered"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${bet.did_bet ? 'bg-arena-success/20' : 'bg-arena-red/20'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${bet.did_bet ? 'text-arena-success' : 'text-arena-red'}`} />
                  </div>
                  <span className="text-sm text-arena-text-secondary/70">
                    Você marcou esta aposta como{' '}
                    <span className={`font-bold ${bet.did_bet ? 'text-arena-success' : 'text-arena-red'}`}>
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
                      <span className="ml-1.5">
                        • {bet.profit_loss > 0 ? '+' : ''}R$ {bet.profit_loss?.toFixed(2)}
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
                className="grid grid-cols-2 gap-3"
              >
                <Button
                  disabled={registering}
                  onClick={() => registerBet(true)}
                  className="h-13 bg-gradient-to-r from-arena-green to-arena-green-dark text-black font-bold rounded-xl shadow-lg shadow-arena-green/20 transition-all active:scale-95 hover:shadow-arena-green/30 text-sm"
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
                  className="h-13 border-2 border-arena-red/50 text-arena-red hover:bg-arena-red/10 hover:border-arena-red font-bold rounded-xl transition-all active:scale-95 text-sm"
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
   RESPONSIBLE GAMBLING BANNER — Componente reutilizável
   ═══════════════════════════════════════════════════════════════ */
function ResponsibleGamblingBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-arena-gold/15 bg-gradient-to-r from-arena-gold/5 to-transparent p-3 flex items-center gap-2.5"
      >
        <div className="w-7 h-7 rounded-lg bg-arena-gold/10 border border-arena-gold/20 flex items-center justify-center shrink-0">
          <HeartHandshake className="w-3.5 h-3.5 text-arena-gold" />
        </div>
        <p className="text-[10px] text-arena-text-secondary/60 leading-tight">
          <span className="text-arena-gold font-bold">Jogo Responsável:</span> Aposte com consciência. Siga sua gestão de banca.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-arena-gold/15 bg-gradient-to-br from-arena-gold/5 via-arena-dark/50 to-arena-gold/5 p-5 relative overflow-hidden"
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-arena-gold/8 blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-arena-gold/10 border border-arena-gold/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-arena-gold" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-arena-gold">Jogo Responsável</h3>
            <p className="text-[9px] text-arena-text-secondary/40">Sua segurança é nossa prioridade</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-arena-dark/40 border border-arena-gray/10 hover:border-arena-gold/20 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-arena-gold/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-arena-gold/70" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/80">Aposte com Consciência</p>
              <p className="text-[9px] text-arena-text-secondary/40 leading-tight">Apenas o que você pode perder</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-arena-dark/40 border border-arena-gray/10 hover:border-arena-gold/20 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-arena-gold/10 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-arena-gold/70" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/80">Gestão de Banca</p>
              <p className="text-[9px] text-arena-text-secondary/40 leading-tight">Nunca arrisque mais que 5% por aposta</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-arena-dark/40 border border-arena-gray/10 hover:border-arena-gold/20 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-arena-gold/10 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-arena-gold/70" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/80">Controle Emocional</p>
              <p className="text-[9px] text-arena-text-secondary/40 leading-tight">Não tente recuperar perdas</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUICK STATS BAR — Barra rápida de estatísticas
   ═══════════════════════════════════════════════════════════════ */
function QuickStatsBar({
  stake,
  odds,
  potentialReturn,
  bookmaker,
  status,
}: {
  stake: number | null;
  odds: number | null;
  potentialReturn: number | null;
  bookmaker?: { name: string; color: string };
  status: string;
}) {
  const isResolved = status === 'green' || status === 'red';
  const isGreen = status === 'green';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="grid grid-cols-3 gap-2"
    >
      <div className="rounded-2xl border border-arena-gray/20 bg-arena-dark/50 p-4 text-center relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-arena-gold/5 blur-2xl" />
        <p className="text-[9px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1.5 relative z-10">Stake</p>
        <p className="text-xl font-black text-white relative z-10">
          {stake ? `R$ ${stake.toFixed(2)}` : '—'}
        </p>
      </div>
      
      <div className="rounded-2xl border border-arena-gray/20 bg-arena-dark/50 p-4 text-center relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-arena-green/5 blur-2xl" />
        <p className="text-[9px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1.5 relative z-10">Odds</p>
        <p className="text-xl font-black text-arena-green relative z-10">
          {odds ? `@${odds.toFixed(2)}` : '—'}
        </p>
      </div>
      
      <div className={`rounded-2xl border p-4 text-center relative overflow-hidden ${
        isResolved
          ? isGreen
            ? 'border-arena-success/30 bg-arena-success/5'
            : 'border-arena-red/30 bg-arena-red/5'
          : 'border-arena-gray/20 bg-arena-dark/50'
      }`}>
        <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl ${
          isResolved ? (isGreen ? 'bg-arena-success/10' : 'bg-arena-red/10') : 'bg-arena-gold/5'
        }`} />
        <p className="text-[9px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1.5 relative z-10">
          {isResolved ? 'Resultado' : 'Retorno'}
        </p>
        <p className={`text-xl font-black relative z-10 ${
          isResolved ? (isGreen ? 'text-arena-success' : 'text-arena-red') : 'text-arena-gold'
        }`}>
          {isResolved
            ? isGreen ? 'GREEN' : 'RED'
            : potentialReturn
            ? `R$ ${potentialReturn.toFixed(2)}`
            : '—'}
        </p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BET TICKET CARD — Bilhete premium cinematográfico
   ═══════════════════════════════════════════════════════════════ */
function BetTicketCard({
  bet,
  bookmaker,
  stake,
  totalOdds,
  potentialReturn,
  onCopyLink,
  copied,
  showAll,
  onToggleShowAll,
}: {
  bet: AnalysisBet & { selections: AnalysisBetSelection[] };
  bookmaker?: { name: string; color: string };
  stake: number | null;
  totalOdds: number | null;
  potentialReturn: number | null;
  onCopyLink: () => void;
  copied: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const visibleSelections = showAll ? bet.selections : bet.selections.slice(0, 3);
  const hasMore = bet.selections.length > 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-arena-gray/20 bg-arena-dark/60 overflow-hidden backdrop-blur-sm shadow-2xl shadow-black/15 relative"
    >
      {/* Decorative top line */}
      <div className="h-1 bg-gradient-to-r from-arena-green via-arena-gold to-arena-green" />

      {/* Ticket Header */}
      <div className="p-5 border-b border-arena-gray/15">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-arena-green/20 to-arena-green/5 border border-arena-green/25 flex items-center justify-center shadow-lg shadow-arena-green/10">
              <Ticket className="w-5 h-5 text-arena-green" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Bilhete da Aposta</p>
              <p className="text-[10px] text-arena-text-secondary/40 uppercase tracking-wider font-medium">
                {bet.bet_type === 'multipla' ? 'Múltipla' : 'Simples'} • {bet.selections.length} {bet.selections.length === 1 ? 'seleção' : 'seleções'}
              </p>
            </div>
          </div>
          {bookmaker && (
            <span
              className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border"
              style={{ 
                backgroundColor: `${bookmaker.color}15`, 
                color: bookmaker.color, 
                borderColor: `${bookmaker.color}30` 
              }}
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
              className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-arena-green/15 to-arena-green/5 border border-arena-green/20 text-arena-green text-xs font-bold hover:from-arena-green/25 hover:to-arena-green/10 transition-all truncate"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Abrir na {bookmaker?.name ?? 'casa de aposta'}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />
            </a>
            <button
              onClick={onCopyLink}
              className="w-10 h-10 rounded-xl bg-arena-gray/15 border border-arena-gray/25 flex items-center justify-center text-arena-text-secondary/50 hover:text-white hover:border-arena-green/30 hover:bg-arena-green/10 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-arena-green" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Selections */}
      <div className="p-5 space-y-4">
        <AnimatePresence>
          {visibleSelections.map((sel, i) => (
            <motion.div
              key={sel.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
              className="relative pl-4"
            >
              {/* Connector line */}
              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-arena-green/40 via-arena-green/20 to-transparent rounded-full" />
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-arena-green/60 uppercase tracking-wider">
                      Jogo {i + 1}
                    </span>
                    {sel.league && (
                      <span className="text-[9px] text-arena-text-secondary/30 truncate">
                        • {sel.league}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white truncate">
                    {sel.home_team} <span className="text-arena-text-secondary/30 mx-1">vs</span> {sel.away_team}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-arena-gray/20 text-[10px] font-bold text-white/70 border border-arena-gray/15">
                      {sel.market}
                    </span>
                    <span className="text-[11px] text-arena-green font-bold">
                      {sel.selection}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {sel.odds && (
                    <p className="text-xl font-black text-arena-gold">@{sel.odds.toFixed(2)}</p>
                  )}
                  {sel.match_time && (
                    <p className="text-[10px] text-arena-text-secondary/30 mt-1 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(sel.match_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Show more/less */}
        {hasMore && (
          <button
            onClick={onToggleShowAll}
            className="w-full py-2.5 rounded-xl bg-arena-gray/10 border border-arena-gray/15 text-xs font-bold text-arena-text-secondary/50 hover:text-white hover:border-arena-green/20 hover:bg-arena-green/5 transition-all flex items-center justify-center gap-1.5"
          >
            {showAll ? (
              <>Mostrar menos <ChevronRight className="w-3 h-3 rotate-[-90deg]" /></>
            ) : (
              <>Ver mais {bet.selections.length - 3} seleções <ChevronRight className="w-3 h-3 rotate-90" /></>
            )}
          </button>
        )}
      </div>

      {/* Ticket Footer — Values */}
      <div className="p-5 border-t border-arena-gray/15 bg-arena-dark/30">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-xl bg-arena-dark/40">
            <p className="text-[9px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1">Stake</p>
            <p className="text-lg font-black text-white">
              {stake ? `R$ ${stake.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="text-center p-2 rounded-xl bg-arena-dark/40 border-x border-arena-gray/10">
            <p className="text-[9px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1">Odds Total</p>
            <p className="text-lg font-black text-arena-green">
              {totalOdds ? `@${totalOdds.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="text-center p-2 rounded-xl bg-arena-dark/40">
            <p className="text-[9px] uppercase tracking-wider text-arena-text-secondary/40 font-bold mb-1">Retorno</p>
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
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-arena-green to-arena-green-dark text-black font-bold text-sm hover:shadow-xl hover:shadow-arena-green/25 transition-all active:scale-[0.98] shadow-lg shadow-arena-green/15"
          >
            <Share2 className="w-4 h-4" />
            Replicar Aposta na {bookmaker?.name ?? 'Casa'}
          </a>
        )}
      </div>

      {/* Admin Notes */}
      {bet.notes && (
        <div className="px-5 pb-5">
          <div className="mt-3 p-4 rounded-xl bg-arena-gold/5 border border-arena-gold/10 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-arena-gold/5 blur-2xl" />
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-wider text-arena-gold/60 font-bold mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Observações do Especialista
              </p>
              <p className="text-xs text-arena-text-secondary/60 leading-relaxed">{bet.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Jogo Responsável no bilhete */}
      <div className="px-5 pb-5">
        <div className="p-3 rounded-xl bg-arena-gold/5 border border-arena-gold/10 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-arena-gold/60 shrink-0" />
          <p className="text-[10px] text-arena-text-secondary/50 leading-tight">
            <span className="text-arena-gold/70 font-bold">Lembre-se:</span> Aposte apenas o que pode perder. Siga sua gestão de banca.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEGACY MATCHES — Fallback para dados antigos
   ═══════════════════════════════════════════════════════════════ */
function LegacyMatches({ matches }: { matches: AnalysisMatch[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-arena-text-secondary/40 font-bold flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-arena-gray/15 flex items-center justify-center">
          <Trophy className="w-3.5 h-3.5" />
        </div>
        Jogos Incluídos
      </p>
      {matches.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
          className="rounded-xl border border-arena-gray/20 bg-arena-dark/50 p-4 hover:border-arena-green/15 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-arena-text-secondary/40">Jogo {i + 1}</span>
            {m.match_time && (
              <span className="text-[10px] text-arena-text-secondary/30 flex items-center gap-1">
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
            {m.home_team} <span className="text-arena-text-secondary/30 mx-1">vs</span> {m.away_team}
          </p>
          {m.league && (
            <p className="text-xs text-arena-text-secondary/30 mt-1">{m.league}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-lg bg-arena-gray/25 text-[10px] font-bold text-white/70">
              {m.bet_type}
            </span>
            {m.odds && (
              <span className="text-arena-gold font-bold text-sm">@{m.odds.toFixed(2)}</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BADGE — Componente reutilizável premium
   ═══════════════════════════════════════════════════════════════ */
function Badge({
  icon: Icon,
  label,
  color,
  bgOpacity = '20',
  border = false,
  pulse = false,
  glow = false,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  bgOpacity?: string;
  border?: boolean;
  pulse?: boolean;
  glow?: boolean;
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${pulse ? 'animate-pulse' : ''}`}
      style={{
        backgroundColor: `${color}${bgOpacity}`,
        color,
        border: border ? `1px solid ${color}40` : 'none',
        boxShadow: glow ? `0 0 12px ${color}20` : 'none',
      }}
    >
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {label}
    </motion.span>
  );
}