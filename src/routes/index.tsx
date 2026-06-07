// src/routes/index.tsx
// Home VIP Premium — experiência imersiva, nível agência
// Bem-vindo personalizado, stats, análises, notícias preview, efeitos

import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Star, TrendingUp, Calendar, Trophy, Zap, ChevronRight,
  Crown, Sparkles, Activity, BarChart3, ArrowUpRight, Globe,
  ShieldCheck, Clock, Newspaper, Target, Percent
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth, db } from '@/hooks/use-auth'
import { SPORTS, COUNTRIES } from '@/lib/constants'
import { useFixtures } from '@/hooks/use-fixtures'
import { MatchCard, MatchCardSkeleton } from '@/components/match/MatchCard'
import type { Analysis, NewsItem } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/')({
  component: HomePage,
})

/* ═══════════════════════════════════════════════════════════════
   HOME VIP — Experiência premium completa
   ═══════════════════════════════════════════════════════════════ */
function HomePage() {
  const { profile, user } = useAuth()
  const [sport, setSport] = useState('all')
  const [items, setItems] = useState<Analysis[] | null>(null)
  const [newsPreview, setNewsPreview] = useState<NewsItem[] | null>(null)
  const [stats, setStats] = useState({ total: 0, hot: 0, green: 0, pending: 0 })

  const { fixtures, loading: fixturesLoading, error: fixturesError } = useFixtures()

  // Detectar país do usuário (fallback Brasil)
  const userCountry = COUNTRIES.find(
    c => c.name.toLowerCase() === (profile?.favorite_national_team ?? '').toLowerCase()
  ) ?? COUNTRIES[0] // Brasil

  useEffect(() => {
    setItems(null)
    let q = db
      .from('analyses')
      .select('*')
      .order('is_hot', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (sport !== 'all') q = q.eq('sport_type', sport)
    q.then(({ data }: { data: Analysis[] | null }) => {
      const list = data ?? []
      setItems(list)
      setStats({
        total: list.length,
        hot: list.filter(a => a.is_hot).length,
        green: list.filter(a => a.status === 'green').length,
        pending: list.filter(a => a.status === 'pending').length,
      })
    })
  }, [sport])

  // Buscar preview de notícias
  useEffect(() => {
    db.from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }: { data: NewsItem[] | null }) => setNewsPreview(data ?? []))
  }, [])

  const hot = (items ?? []).filter((a) => a.is_hot).slice(0, 6)
  const rest = (items ?? []).filter((a) => !a.is_hot)

  const firstName = profile?.name?.split(' ')[0] ?? 'Membro'

  return (
    <AppShell>
      {/* ═══════════════════════════════════════════════════════════════
          WELCOME VIP — Header personalizado com nome, país, badge
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-6 pt-1">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Linha superior: saudação + badge VIP */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-arena-green/20 to-arena-green/5 border border-arena-green/30 flex items-center justify-center"
              >
                <Crown className="w-5 h-5 text-arena-green" strokeWidth={1.5} />
              </motion.div>
              <div>
                <p className="text-[11px] font-medium tracking-wider uppercase text-arena-text-secondary/60">
                  Bem-vindo de volta
                </p>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {firstName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Badge VIP */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-arena-green/20 to-arena-green/5 border border-arena-green/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-arena-green" />
                <span className="text-[10px] font-black uppercase tracking-widest text-arena-green">
                  VIP Ativo
                </span>
              </motion.div>

              {/* País */}
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-arena-gray/30 border border-arena-gray/30">
                <span className="text-sm">{userCountry.flag}</span>
                <span className="text-[10px] font-medium text-arena-text-secondary/70 hidden sm:inline">
                  {userCountry.name}
                </span>
              </div>
            </div>
          </div>

          {/* Subtítulo elegante */}
          <p className="text-xs text-arena-text-secondary/50 font-medium leading-relaxed max-w-md">
            Acesso exclusivo às análises mais precisas do mercado. 
            Fique à frente da concorrência.
          </p>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STATS RÁPIDAS — Cards glassmorphism com métricas
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-6">
        <div className="grid grid-cols-4 gap-2">
          <StatCard
            icon={Target}
            value={stats.total}
            label="Análises"
            color="#00C853"
            delay={0.1}
          />
          <StatCard
            icon={Flame}
            value={stats.hot}
            label="Hot"
            color="#FFD700"
            delay={0.2}
          />
          <StatCard
            icon={TrendingUp}
            value={stats.green}
            label="Green"
            color="#00C853"
            delay={0.3}
          />
          <StatCard
            icon={Clock}
            value={stats.pending}
            label="Pendentes"
            color="#A0A0A0"
            delay={0.4}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          JOGOS DE HOJE — Seção premium com scroll horizontal
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-6">
        <SectionHeader
          icon={Trophy}
          title="Jogos de Hoje"
          subtitle="Ao Vivo & Próximos"
          action={{ label: 'Ver todos', to: '/fixtures' }}
          accentColor="#00C853"
        />

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
          <div className="rounded-2xl border border-arena-gray/40 bg-arena-dark/60 p-5 text-center">
            <Zap className="w-5 h-5 mx-auto mb-2 text-arena-text-secondary/30" />
            <p className="text-sm text-arena-text-secondary/60">
              Não foi possível carregar os jogos.
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
          <div className="rounded-2xl border border-arena-gray/40 bg-arena-dark/60 p-5 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-arena-text-secondary/30" />
            <p className="text-sm text-arena-text-secondary/60">
              Nenhum jogo programado para hoje.
            </p>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SPORT FILTER — Chips premium com ícones coloridos
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => setSport(s.id)}
                  className={`
                    flex items-center gap-2 px-4 h-10 rounded-xl text-[12px] font-semibold
                    border transition-all duration-300 whitespace-nowrap
                    ${active
                      ? 'bg-arena-green text-black border-arena-green shadow-lg shadow-arena-green/20'
                      : 'bg-arena-dark/60 text-arena-text-secondary/70 border-arena-gray/30 hover:border-arena-gray/60 hover:text-white'
                    }
                  `}
                >
                  <Icon
                    className="w-4 h-4"
                    strokeWidth={active ? 2.5 : 1.5}
                    style={{ color: active ? '#000000' : s.color }}
                  />
                  {s.name}
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ANÁLISES QUENTES — Carousel premium
          ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {hot.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <SectionHeader
              icon={Flame}
              title="Análises Quentes"
              subtitle="Maior Confiança do Dia"
              accentColor="#FFD700"
            />
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
          ANÁLISES DO DIA — Grid premium
          ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-6">
        <SectionHeader
          icon={BarChart3}
          title="Análises do Dia"
          subtitle="Todas as Oportunidades"
          accentColor="#00C853"
        />

        {items === null && (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl bg-arena-gray/20" />
            ))}
          </div>
        )}

        {items && rest.length === 0 && hot.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-arena-text-secondary/40"
          >
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
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

      {/* ═══════════════════════════════════════════════════════════════
          NOTÍCIAS PREVIEW — Cards compactos na home
          ═══════════════════════════════════════════════════════════════ */}
      {newsPreview && newsPreview.length > 0 && (
        <section className="mb-8">
          <SectionHeader
            icon={Newspaper}
            title="Últimas Notícias"
            subtitle="Fique por Dentro"
            accentColor="#A0A0A0"
            action={{ label: 'Ver todas', to: '/news' }}
          />
          <div className="space-y-2.5">
            {newsPreview.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to="/news/$id"
                  params={{ id: n.id }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-arena-dark/40 border border-arena-gray/20 hover:border-arena-green/30 hover:bg-arena-dark/60 transition-all duration-300 group"
                >
                  {n.image_url ? (
                    <img
                      src={n.image_url}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-arena-green/10 to-arena-gold/5 flex items-center justify-center shrink-0">
                      <Newspaper className="w-5 h-5 text-arena-green/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate group-hover:text-arena-green/90 transition-colors">
                      {n.title}
                    </p>
                    <p className="text-[10px] text-arena-text-secondary/40 mt-0.5">
                      {n.published_at
                        ? new Date(n.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                        : new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-arena-text-secondary/20 group-hover:text-arena-green/60 transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
   ═══════════════════════════════════════════════════════════════ */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accentColor = '#00C853',
  action,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  accentColor?: string
  action?: { label: string; to: string }
}) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}25` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-wide text-white">{title}</h2>
          <p className="text-[9px] text-arena-text-secondary/50 font-medium tracking-wider uppercase">
            {subtitle}
          </p>
        </div>
      </div>
      {action && (
        <Link
          to={action.to}
          className="flex items-center gap-1 text-[11px] font-semibold text-arena-green/70 hover:text-arena-green transition-colors"
        >
          {action.label} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  delay,
}: {
  icon: React.ElementType
  value: number
  label: string
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-xl bg-arena-dark/40 border border-arena-gray/20 p-3"
    >
      <div
        className="absolute top-0 right-0 w-12 h-12 rounded-full blur-2xl opacity-20"
        style={{ backgroundColor: color }}
      />
      <Icon className="w-4 h-4 mb-2" style={{ color }} strokeWidth={1.5} />
      <p className="text-xl font-black text-white tracking-tight">{value}</p>
      <p className="text-[9px] text-arena-text-secondary/50 font-medium uppercase tracking-wider mt-0.5">
        {label}
      </p>
    </motion.div>
  )
}

function sportMeta(id: string) {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0]
}

/* ═══════════════════════════════════════════════════════════════
   HOT CARD — Design premium com overlay cinematográfico
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
        whileHover={{ y: -5, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative h-44 rounded-2xl overflow-hidden border border-arena-gray/30 bg-arena-dark group cursor-pointer"
      >
        {a.image_url ? (
          <img
            src={a.image_url}
            alt={a.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-arena-green/8 via-arena-dark to-arena-gold/5" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

        {/* Badge Hot */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-arena-gold text-black">
          <Flame className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-wider">Hot</span>
        </div>

        {/* Badge Sport */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/8">
          <span className="text-[10px] font-bold text-white/80 tracking-wider uppercase">
            {meta.name}
          </span>
        </div>

        {/* Conteúdo */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 mb-1.5">
            {a.title}
          </h3>
          {a.odds && (
            <div className="flex items-center gap-1.5">
              <span className="text-arena-gold font-black text-base leading-none">
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
    green: { bg: 'bg-arena-success/12', text: 'text-arena-success', label: 'GREEN', border: 'border-arena-success/15', dot: '#00C853' },
    red: { bg: 'bg-arena-red/12', text: 'text-arena-red', label: 'RED', border: 'border-arena-red/15', dot: '#EF4444' },
    pending: { bg: 'bg-arena-text-secondary/8', text: 'text-arena-text-secondary/60', label: 'PENDENTE', border: 'border-arena-gray/25', dot: '#A0A0A0' },
  }

  const status = a.status && statusConfig[a.status as keyof typeof statusConfig]
    ? statusConfig[a.status as keyof typeof statusConfig]
    : statusConfig.pending

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: 'easeOut' }}
    >
      <Link
        to="/analysis/$id"
        params={{ id: a.id }}
        className="block rounded-2xl border border-arena-gray/25 bg-arena-dark/60 hover:border-arena-green/30 hover:shadow-lg hover:shadow-arena-green/5 transition-all duration-300 overflow-hidden group"
      >
        {a.image_url && a.display_type === 'image' && (
          <div className="aspect-[16/9] bg-arena-gray/15 overflow-hidden">
            <img
              src={a.image_url}
              alt={a.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}

        <div className="p-3.5">
          {/* Tags */}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-arena-gray/25 text-[10px] font-bold uppercase tracking-wider text-white/70">
              <Icon className="w-3 h-3" style={{ color: meta.color }} />
              {meta.name}
            </span>

            {a.is_featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-arena-gold/8 border border-arena-gold/15 text-[10px] font-bold text-arena-gold">
                <Star className="w-3 h-3" strokeWidth={2} />
                Destaque
              </span>
            )}

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${status.bg} ${status.text} border ${status.border}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
              {status.label}
            </span>
          </div>

          {/* Título */}
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 group-hover:text-arena-green/90 transition-colors duration-300">
            {a.title}
          </h3>

          {a.championship && (
            <p className="text-[11px] text-arena-text-secondary/40 mt-1 font-medium">
              {a.championship}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-arena-gray/15">
            {a.odds ? (
              <div className="flex items-baseline gap-1">
                <span className="text-arena-gold font-black text-sm">
                  @{a.odds.toFixed(2)}
                </span>
                <span className="text-[9px] text-arena-text-secondary/30 font-medium">odds</span>
              </div>
            ) : (
              <span />
            )}
            <ChevronRight className="w-4 h-4 text-arena-text-secondary/20 group-hover:text-arena-green/50 group-hover:translate-x-0.5 transition-all duration-300" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}