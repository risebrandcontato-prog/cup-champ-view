// src/routes/index.tsx
// Home com cards "Jogos de Hoje" + análises existentes
// Design elevado: tipografia refinada, hierarquia visual, micro-interações

import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Star, TrendingUp, Calendar, Trophy, Zap, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { db } from '@/hooks/use-auth'
import { SPORTS } from '@/lib/constants'
import { useFixtures } from '@/hooks/use-fixtures'
import { MatchCard, MatchCardSkeleton } from '@/components/match/MatchCard'
import type { Analysis } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [sport, setSport] = useState('all')
  const [items, setItems] = useState<Analysis[] | null>(null)

  const { fixtures, loading: fixturesLoading, error: fixturesError } = useFixtures()

  useEffect(() => {
    setItems(null)
    let q = db
      .from('analyses')
      .select('*')
      .order('is_hot', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (sport !== 'all') q = q.eq('sport_type', sport)
    q.then(({ data }: { data: Analysis[] | null }) => setItems(data ?? []))
  }, [sport])

  const hot = (items ?? []).filter((a) => a.is_hot).slice(0, 6)
  const rest = (items ?? []).filter((a) => !a.is_hot)

  return (
    <AppShell>
      {/* ═══════════════════════════════════════════════════════════════
          HEADER ELEGANTE — Tipografia refinada
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-8 pt-2">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="text-[11px] font-medium tracking-[0.35em] uppercase text-arena-text-secondary/70 mb-1">
            Análises Esportivas Premium
          </h1>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black tracking-tight text-white">
              APOSTA
            </span>
            <span className="text-3xl font-extralight tracking-tight text-arena-green">
              RESTRITA
            </span>
          </div>
          <div className="mt-2 h-px w-16 bg-gradient-to-r from-arena-green to-transparent rounded-full" />
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          JOGOS DE HOJE — Ícone refinado + layout premium
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-arena-green/20 to-arena-green/5 border border-arena-green/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-arena-green" strokeWidth={1.5} />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-arena-green animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white">
                Jogos de Hoje
              </h2>
              <p className="text-[10px] text-arena-text-secondary/60 font-medium tracking-wider uppercase">
                Ao Vivo & Próximos
              </p>
            </div>
          </div>
          <button className="flex items-center gap-1 text-[11px] font-semibold text-arena-green/80 hover:text-arena-green transition-colors">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {fixturesLoading && (
          <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
            <div className="flex gap-3 w-max pb-2">
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <MatchCardSkeleton />
            </div>
          </div>
        )}

        {fixturesError && (
          <div className="rounded-2xl border border-arena-gray/60 bg-arena-dark/80 p-5 text-center">
            <Zap className="w-5 h-5 mx-auto mb-2 text-arena-text-secondary/40" />
            <p className="text-sm text-arena-text-secondary/70">
              Não foi possível carregar os jogos. Tente novamente mais tarde.
            </p>
          </div>
        )}

        {!fixturesLoading && !fixturesError && fixtures.length > 0 && (
          <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
            <div className="flex gap-3 w-max pb-2">
              {fixtures.slice(0, 5).map((fixture, i) => (
                <motion.div
                  key={fixture.fixture.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <MatchCard
                    fixture={fixture}
                    onClick={() => {
                      console.log('Clicked fixture:', fixture.fixture.id)
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!fixturesLoading && !fixturesError && fixtures.length === 0 && (
          <div className="rounded-2xl border border-arena-gray/60 bg-arena-dark/80 p-5 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-arena-text-secondary/40" />
            <p className="text-sm text-arena-text-secondary/70">
              Nenhum jogo programado para hoje.
            </p>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SPORT FILTER CHIPS — Design refinado com estado ativo premium
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-6">
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
          <div className="flex gap-2 w-max">
            {SPORTS.map((s, i) => {
              const Icon = s.icon
              const active = sport === s.id
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  onClick={() => setSport(s.id)}
                  className={`
                    flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-semibold
                    border transition-all duration-300 whitespace-nowrap
                    ${active
                      ? 'bg-arena-green text-black border-arena-green shadow-lg shadow-arena-green/25'
                      : 'bg-arena-dark/60 text-arena-text-secondary/80 border-arena-gray/40 hover:border-arena-gray/70 hover:text-white hover:bg-arena-gray/20'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.5 : 1.5} />
                  {s.name}
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOT CAROUSEL — Seção premium com animação refinada
          ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {hot.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-arena-gold/20 to-arena-gold/5 border border-arena-gold/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-arena-gold" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wide text-white">
                  Análises Quentes
                </h2>
                <p className="text-[10px] text-arena-gold/60 font-medium tracking-wider uppercase">
                  Maior Confiança
                </p>
              </div>
            </div>
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
              <div className="flex gap-3 w-max pb-2">
                {hot.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                  >
                    <HotCard a={a} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          ANÁLISES DO DIA — Header refinado
          ═══════════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-arena-green/20 to-arena-green/5 border border-arena-green/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-arena-green" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white">
              Análises do Dia
            </h2>
            <p className="text-[10px] text-arena-text-secondary/60 font-medium tracking-wider uppercase">
              Todas as Oportunidades
            </p>
          </div>
        </div>

        {items === null && (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl bg-arena-gray/30" />
            ))}
          </div>
        )}

        {items && rest.length === 0 && hot.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-arena-text-secondary/50"
          >
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
            <p className="text-sm font-medium">Nenhuma análise disponível ainda.</p>
            <p className="text-xs mt-1 opacity-60">Volte em breve para novas oportunidades.</p>
          </motion.div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {rest.map((a, i) => (
            <AnalysisCard key={a.id} a={a} index={i} />
          ))}
        </div>
      </section>
    </AppShell>
  )
}

function sportMeta(id: string) {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0]
}

/* ═══════════════════════════════════════════════════════════════
   HOT CARD — Design premium com overlay refinado
   ═══════════════════════════════════════════════════════════════ */
function HotCard({ a }: { a: Analysis }) {
  const meta = sportMeta(a.sport_type)
  return (
    <Link
      to="/analysis/$id"
      params={{ id: a.id }}
      className="block w-[78vw] max-w-[340px] shrink-0"
    >
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative h-48 rounded-2xl overflow-hidden border border-arena-gray/40 bg-arena-dark group cursor-pointer"
      >
        {a.image_url ? (
          <img
            src={a.image_url}
            alt={a.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-arena-green/10 via-arena-dark to-arena-gold/5" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-arena-gold text-black">
          <Flame className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-wider">Hot</span>
        </div>

        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
          <span className="text-[10px] font-bold text-white/90 tracking-wider uppercase">
            {meta.name}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 mb-1.5">
            {a.title}
          </h3>
          {a.odds && (
            <div className="flex items-center gap-1.5">
              <span className="text-arena-gold font-black text-lg leading-none">
                @{a.odds.toFixed(2)}
              </span>
              <span className="text-[10px] text-white/40 font-medium">odds</span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ANALYSIS CARD — Design clean com estados visuais refinados
   ═══════════════════════════════════════════════════════════════ */
function AnalysisCard({ a, index }: { a: Analysis; index: number }) {
  const meta = sportMeta(a.sport_type)
  const Icon = meta.icon

  const statusConfig = {
    green: { bg: 'bg-arena-success/15', text: 'text-arena-success', label: 'GREEN', border: 'border-arena-success/20' },
    red: { bg: 'bg-arena-red/15', text: 'text-arena-red', label: 'RED', border: 'border-arena-red/20' },
    pending: { bg: 'bg-arena-text-secondary/10', text: 'text-arena-text-secondary/70', label: 'PENDENTE', border: 'border-arena-gray/30' },
  }

  const status = a.status && statusConfig[a.status as keyof typeof statusConfig]
    ? statusConfig[a.status as keyof typeof statusConfig]
    : statusConfig.pending

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
    >
      <Link
        to="/analysis/$id"
        params={{ id: a.id }}
        className="block rounded-2xl border border-arena-gray/30 bg-arena-dark/80 hover:border-arena-green/40 hover:shadow-xl hover:shadow-arena-green/5 transition-all duration-300 overflow-hidden group"
      >
        {a.image_url && a.display_type === 'image' && (
          <div className="aspect-[16/9] bg-arena-gray/20 overflow-hidden">
            <img
              src={a.image_url}
              alt={a.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-arena-gray/30 text-[10px] font-bold uppercase tracking-wider text-white/80">
              <Icon className="w-3 h-3" style={{ color: meta.color }} />
              {meta.name}
            </span>

            {a.is_featured && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-arena-gold/10 border border-arena-gold/20 text-[10px] font-bold text-arena-gold">
                <Star className="w-3 h-3" strokeWidth={2} />
                Destaque
              </span>
            )}

            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${status.bg} ${status.text} border ${status.border}`}>
              {status.label}
            </span>
          </div>

          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 group-hover:text-arena-green/90 transition-colors duration-300">
            {a.title}
          </h3>

          {a.championship && (
            <p className="text-xs text-arena-text-secondary/50 mt-1.5 font-medium">
              {a.championship}
            </p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-arena-gray/20">
            {a.odds ? (
              <div className="flex items-baseline gap-1">
                <span className="text-arena-gold font-black text-base">
                  @{a.odds.toFixed(2)}
                </span>
                <span className="text-[10px] text-arena-text-secondary/40 font-medium">odds</span>
              </div>
            ) : (
              <span />
            )}
            <ChevronRight className="w-4 h-4 text-arena-text-secondary/30 group-hover:text-arena-green/60 group-hover:translate-x-0.5 transition-all duration-300" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}