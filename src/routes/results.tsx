// src/routes/analysis-history.tsx
// Histórico de Análises — Todas as análises finalizadas (Green/Red)
// Público, visível para todos os usuários, atualiza automaticamente

import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, TrendingDown, CheckCircle2, XCircle, Calendar,
  Trophy, Target, Percent, Filter, Search, X, Flame, Star, Clock,
  ChevronRight, BarChart3, Zap, type LucideIcon
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { SPORTS, BOOKMAKERS } from '@/lib/constants';
import type { Analysis } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/results')({
  component: AnalysisHistoryPage,
});

/* ═══════════════════════════════════════════════════════════════
   ANALYSIS HISTORY — Todas as análises finalizadas
   ═══════════════════════════════════════════════════════════════ */
function AnalysisHistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterResult, setFilterResult] = useState<'all' | 'green' | 'red'>('all');
  const [filterSport, setFilterSport] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAnalyses = useCallback(async () => {
    setLoading(true);
    
    let q = supabase
      .from('analyses')
      .select('*')
      .in('status', ['green', 'red'])
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false });

    if (filterResult !== 'all') {
      q = q.eq('status', filterResult);
    }
    
    if (filterSport !== 'all') {
      q = q.eq('sport_type', filterSport);
    }

    const { data, error } = await q;

    if (error) {
      console.error('[AnalysisHistory] Error:', error);
    } else {
      setAnalyses((data as Analysis[]) ?? []);
    }
    
    setLoading(false);
  }, [filterResult, filterSport]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  // Real-time subscription for updates
  useEffect(() => {
    const channel = supabase
      .channel('analysis-history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analyses',
          filter: 'status=in.(green,red)',
        },
        () => {
          loadAnalyses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAnalyses]);

  const filteredAnalyses = useMemo(() => {
    if (!searchQuery.trim()) return analyses;
    const q = searchQuery.toLowerCase();
    return analyses.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.championship?.toLowerCase() ?? '').includes(q) ||
      (a.description?.toLowerCase() ?? '').includes(q)
    );
  }, [analyses, searchQuery]);

  const stats = useMemo(() => {
    const total = analyses.length;
    const greens = analyses.filter(a => a.status === 'green').length;
    const reds = analyses.filter(a => a.status === 'red').length;
    const rate = total > 0 ? Math.round((greens / total) * 100) : 0;
    return { total, greens, reds, rate };
  }, [analyses]);

  const availableSports = useMemo(() => {
    const sportIds = new Set(analyses.map(a => a.sport_type));
    return SPORTS.filter(s => s.id === 'all' || sportIds.has(s.id));
  }, [analyses]);

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-80px)] pb-8">
        {/* ═══════════════════════════════════════════════════════════════
            HERO HEADER
            ═══════════════════════════════════════════════════════════════ */}
        <div className="relative -mx-4 px-4 pt-2 pb-8 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-arena-green/8 blur-3xl" />
            <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-arena-gold/5 blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-arena-text-secondary hover:text-white mb-6 text-sm font-medium transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-arena-dark/60 border border-arena-gray/30 flex items-center justify-center group-hover:border-arena-green/40 group-hover:bg-arena-green/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span>Voltar</span>
            </Link>

            <div className="flex items-start justify-between mb-3">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl sm:text-3xl font-black tracking-tight text-white"
                >
                  Histórico de Análises
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs text-arena-text-secondary/40 mt-1.5"
                >
                  Todas as análises finalizadas pela equipe
                </motion.p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            STATS BAR
            ═══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="grid grid-cols-4 gap-2.5">
            <StatCard
              icon={BarChart3}
              value={stats.total}
              label="Total"
              color="#A0A0A0"
              delay={0}
            />
            <StatCard
              icon={TrendingUp}
              value={stats.greens}
              label="Green"
              color="#00C853"
              delay={0.1}
            />
            <StatCard
              icon={TrendingDown}
              value={stats.reds}
              label="Red"
              color="#EF4444"
              delay={0.2}
            />
            <StatCard
              icon={Percent}
              value={stats.rate}
              label="Assertividade"
              color="#FFD700"
              delay={0.3}
              suffix="%"
            />
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════
            FILTERS + SEARCH
            ═══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 space-y-3"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-arena-text-secondary/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar análise, time, campeonato..."
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-arena-dark/60 border border-arena-gray/25 text-xs text-white placeholder:text-arena-text-secondary/30 focus:outline-none focus:border-arena-green/40 focus:ring-1 focus:ring-arena-green/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-arena-text-secondary/30 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Result filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-arena-text-secondary/30 shrink-0" />
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <FilterChip
                active={filterResult === 'all'}
                onClick={() => setFilterResult('all')}
                label="Todas"
                icon={BarChart3}
                color="#A0A0A0"
              />
              <FilterChip
                active={filterResult === 'green'}
                onClick={() => setFilterResult('green')}
                label="Green"
                icon={TrendingUp}
                color="#00C853"
              />
              <FilterChip
                active={filterResult === 'red'}
                onClick={() => setFilterResult('red')}
                label="Red"
                icon={TrendingDown}
                color="#EF4444"
              />
            </div>
          </div>

          {/* Sport filter */}
          {availableSports.length > 1 && (
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-arena-text-secondary/30 shrink-0" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                <FilterChip
                  active={filterSport === 'all'}
                  onClick={() => setFilterSport('all')}
                  label="Todos"
                  icon={Target}
                  color="#A0A0A0"
                />
                {availableSports.filter(s => s.id !== 'all').map(s => {
                  const Icon = s.icon;
                  return (
                    <FilterChip
                      key={s.id}
                      active={filterSport === s.id}
                      onClick={() => setFilterSport(s.id)}
                      label={s.name}
                      icon={Icon}
                      color={s.color}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════
            ANALYSES LIST
            ═══════════════════════════════════════════════════════════════ */}
        <section>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl bg-arena-gray/15" />
              ))}
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-arena-gray/20" strokeWidth={1.5} />
              <p className="text-sm text-arena-text-secondary/40 font-medium">
                {searchQuery ? 'Nenhuma análise encontrada para esta busca.' : 'Nenhuma análise finalizada ainda.'}
              </p>
              <p className="text-xs text-arena-text-secondary/20 mt-1">
                {searchQuery ? 'Tente outro termo.' : 'As análises aparecerão aqui quando forem resolvidas.'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredAnalyses.map((a, i) => (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <HistoryCard analysis={a} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY CARD — Card premium para análise finalizada
   ═══════════════════════════════════════════════════════════════ */
function HistoryCard({ analysis }: { analysis: Analysis }) {
  const isGreen = analysis.status === 'green';
  const sport = SPORTS.find(s => s.id === analysis.sport_type) ?? SPORTS[0];
  const SportIcon = sport.icon;
  const bookmaker = BOOKMAKERS.find(b => 
    b.name.toLowerCase() === (analysis.bookmaker_name ?? '').toLowerCase()
  );

  const resolvedDate = analysis.resolved_at 
    ? new Date(analysis.resolved_at) 
    : null;

  return (
    <Link
      to="/analysis/$id"
      params={{ id: analysis.id }}
      className="block"
    >
      <motion.div
        whileHover={{ y: -2, scale: 1.005 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="rounded-2xl border border-arena-gray/20 bg-arena-dark/50 hover:border-arena-green/20 hover:shadow-lg hover:shadow-arena-green/5 transition-all duration-300 overflow-hidden group relative"
      >
        {/* Result accent bar */}
        <div className={`h-1 w-full ${isGreen ? 'bg-gradient-to-r from-arena-success/60 to-arena-success/20' : 'bg-gradient-to-r from-arena-red/60 to-arena-red/20'}`} />

        <div className="p-4">
          {/* Top row: result badge + date */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Result badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isGreen ? 'bg-arena-success/15 border border-arena-success/25' : 'bg-arena-red/15 border border-arena-red/25'}`}>
                {isGreen ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-arena-success" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-arena-red" />
                )}
                <span className={`text-[10px] font-black uppercase tracking-wider ${isGreen ? 'text-arena-success' : 'text-arena-red'}`}>
                  {isGreen ? 'GREEN' : 'RED'}
                </span>
              </div>

              {/* Sport badge */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-arena-gray/15 border border-arena-gray/20">
                <SportIcon className="w-3 h-3" style={{ color: sport.color }} />
                <span className="text-[10px] font-bold text-white/60">{sport.name}</span>
              </div>
            </div>

            {resolvedDate && (
              <span className="text-[10px] text-arena-text-secondary/30 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {resolvedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 group-hover:text-arena-green/90 transition-colors duration-300 mb-2">
            {analysis.title}
          </h3>

          {/* Championship + meta */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {analysis.championship && (
              <span className="text-[11px] text-arena-text-secondary/40 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {analysis.championship}
              </span>
            )}
            {analysis.match_date && (
              <span className="text-[10px] text-arena-text-secondary/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(analysis.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>

          {/* Values row */}
          <div className="flex items-center justify-between pt-3 border-t border-arena-gray/10">
            <div className="flex items-center gap-3">
              {analysis.odds && (
                <div className="flex items-baseline gap-1">
                  <span className="text-arena-gold font-black text-sm">@{analysis.odds.toFixed(2)}</span>
                  <span className="text-[9px] text-arena-text-secondary/30">odds</span>
                </div>
              )}
              {analysis.stake_value && (
                <div className="flex items-baseline gap-1">
                  <span className="text-white/60 font-bold text-sm">R$ {analysis.stake_value.toFixed(2)}</span>
                  <span className="text-[9px] text-arena-text-secondary/30">stake</span>
                </div>
              )}
              {bookmaker && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: bookmaker.color + '18', color: bookmaker.color }}
                >
                  {bookmaker.name}
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-arena-text-secondary/15 group-hover:text-arena-green/40 group-hover:translate-x-0.5 transition-all duration-300" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FILTER CHIP — Chip de filtro reutilizável
   ═══════════════════════════════════════════════════════════════ */
function FilterChip({
  active,
  onClick,
  label,
  icon: Icon,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-bold
        border transition-all duration-200 whitespace-nowrap select-none
        ${active
          ? 'text-black shadow-md'
          : 'bg-arena-dark/40 text-arena-text-secondary/60 border-arena-gray/20 hover:border-arena-gray/40 hover:text-white'
        }
      `}
      style={active ? {
        backgroundColor: color,
        borderColor: color,
        boxShadow: `0 2px 12px ${color}30`,
      } : undefined}
    >
      <Icon className="w-3 h-3" strokeWidth={active ? 2.5 : 1.5} />
      {label}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STAT CARD — Card de estatística
   ═══════════════════════════════════════════════════════════════ */
function StatCard({
  icon: Icon,
  value,
  label,
  color,
  delay,
  suffix = '',
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  color: string;
  delay: number;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-xl bg-arena-dark/50 border border-arena-gray/20 p-3 backdrop-blur-sm"
    >
      <div
        className="absolute -top-3 -right-3 w-14 h-14 rounded-full blur-2xl opacity-15"
        style={{ backgroundColor: color }}
      />
      <Icon className="w-4 h-4 mb-2 relative z-10" style={{ color }} strokeWidth={1.5} />
      <p className="text-xl font-black text-white tracking-tight relative z-10">
        {value}{suffix}
      </p>
      <p className="text-[9px] text-arena-text-secondary/50 font-medium uppercase tracking-wider mt-0.5 relative z-10">
        {label}
      </p>
    </motion.div>
  );
}