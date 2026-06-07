// src/routes/index.tsx
// Home com cards "Jogos de Hoje" + análises existentes

import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Star, TrendingUp, Calendar, Trophy } from 'lucide-react'
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
  
  // Buscar jogos do dia via API-Sports
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
      {/* ========== JOGOS DE HOJE ========== */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-arena-green" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-arena-green">
            Jogos de Hoje
          </h2>
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
          <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 text-center">
            <p className="text-sm text-arena-text-secondary">
              Não foi possível carregar os jogos. Tente novamente mais tarde.
            </p>
          </div>
        )}

        {!fixturesLoading && !fixturesError && fixtures.length > 0 && (
          <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
            <div className="flex gap-3 w-max pb-2">
              {fixtures.slice(0, 5).map((fixture) => (
                <MatchCard
                  key={fixture.fixture.id}
                  fixture={fixture}
                  onClick={() => {
                    // TODO: Parte 2 — navegar para análise vinculada ou mostrar detalhes
                    console.log('Clicked fixture:', fixture.fixture.id)
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!fixturesLoading && !fixturesError && fixtures.length === 0 && (
          <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 text-center">
            <p className="text-sm text-arena-text-secondary">
              Nenhum jogo programado para hoje.
            </p>
          </div>
        )}
      </section>

      {/* ========== SPORT FILTER CHIPS ========== */}
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin mb-4">
        <div className="flex gap-2 w-max">
          {SPORTS.map((s) => {
            const Icon = s.icon
            const active = sport === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSport(s.id)}
                className={`flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold border transition-all whitespace-nowrap ${
                  active
                    ? 'bg-arena-green text-black border-arena-green shadow-md shadow-arena-green/30'
                    : 'bg-arena-gray/50 text-arena-text-secondary border-arena-gray hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {s.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* ========== HOT CAROUSEL ========== */}
      {hot.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-arena-gold" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-arena-gold">
              Análises Quentes
            </h2>
          </div>
          <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
            <div className="flex gap-3 w-max pb-2">
              {hot.map((a) => (
                <HotCard key={a.id} a={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== ANÁLISES DO DIA ========== */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-arena-green" />
        <h2 className="text-sm font-bold uppercase tracking-widest">
          Análises do Dia
        </h2>
      </div>

      {items === null && (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-arena-gray/40" />
          ))}
        </div>
      )}

      {items && rest.length === 0 && hot.length === 0 && (
        <div className="text-center py-16 text-arena-text-secondary">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma análise disponível ainda. Volte em breve!</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {rest.map((a, i) => (
          <AnalysisCard key={a.id} a={a} index={i} />
        ))}
      </div>
    </AppShell>
  )
}

function sportMeta(id: string) {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0]
}

function HotCard({ a }: { a: Analysis }) {
  const meta = sportMeta(a.sport_type)
  return (
    <Link to="/analysis/$id" params={{ id: a.id }} className="block w-[80vw] max-w-[360px] shrink-0">
      <motion.div
        whileHover={{ y: -4 }}
        className="relative h-44 rounded-2xl overflow-hidden border border-arena-gray bg-arena-dark group"
      >
        {a.image_url ? (
          <img
            src={a.image_url}
            alt={a.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-arena-green/20 via-arena-dark to-arena-gold/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-arena-gold text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
          <Flame className="w-3 h-3" /> Hot
        </span>
        <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider">
          {meta.name}
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white text-base leading-tight line-clamp-2">
            {a.title}
          </h3>
          {a.odds && (
            <p className="text-arena-gold font-black text-lg mt-1">
              @{a.odds.toFixed(2)}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  )
}

function AnalysisCard({ a, index }: { a: Analysis; index: number }) {
  const meta = sportMeta(a.sport_type)
  const Icon = meta.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to="/analysis/$id"
        params={{ id: a.id }}
        className="block rounded-2xl border border-arena-gray bg-arena-dark hover:border-arena-green/50 hover:shadow-lg hover:shadow-arena-green/10 transition-all overflow-hidden"
      >
        {a.image_url && a.display_type === 'image' && (
          <div className="aspect-video bg-arena-gray overflow-hidden">
            <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-arena-gray text-[10px] font-bold uppercase tracking-wider">
              <Icon className="w-3 h-3" style={{ color: meta.color }} /> {meta.name}
            </span>
            {a.is_featured && <Star className="w-3 h-3 text-arena-gold" />}
            {a.status === 'green' && (
              <span className="px-2 py-0.5 rounded-full bg-arena-success/20 text-arena-success text-[10px] font-bold">
                GREEN
              </span>
            )}
            {a.status === 'red' && (
              <span className="px-2 py-0.5 rounded-full bg-arena-red/20 text-arena-red text-[10px] font-bold">
                RED
              </span>
            )}
          </div>
          <h3 className="font-bold text-white leading-tight line-clamp-2">{a.title}</h3>
          {a.championship && (
            <p className="text-xs text-arena-text-secondary mt-1">{a.championship}</p>
          )}
          {a.odds && (
            <p className="text-arena-gold font-black text-base mt-2">@{a.odds.toFixed(2)}</p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}