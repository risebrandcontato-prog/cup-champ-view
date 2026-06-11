// src/routes/index.tsx
// Home VIP Premium — experiência imersiva, nível agência
// Bem-vindo personalizado, stats, análises, notícias preview, efeitos

import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Star, TrendingUp, Calendar, Trophy, Zap, ChevronRight,
  Crown, Sparkles, Activity, BarChart3, ArrowUpRight, Globe,
  ShieldCheck, Clock, CheckCircle2, Newspaper, Target, Percent, Ticket,
  ChevronLeft, X, Filter, Search, Hash, Award, Footprints,
  AlertTriangle, HeartHandshake, Wallet, History, Timer, Lock,
  type LucideIcon
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth, db } from '@/hooks/use-auth'
import { useAccess } from '@/hooks/use-access'
import { SPORTS, COUNTRIES, BOOKMAKERS } from '@/lib/constants'
import type { Analysis, NewsItem, AnalysisBet } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/')({
  component: HomePage,
})

/* ═══════════════════════════════════════════════════════════════
   HOME VIP — Experiência premium completa
   ═══════════════════════════════════════════════════════════════ */
function HomePage() {
  const { profile } = useAuth()
  const access = useAccess()
  const [items, setItems] = useState<Analysis[] | null>(null)
  const [newsPreview, setNewsPreview] = useState<NewsItem[] | null>(null)
  const [stats, setStats] = useState({ total: 0, hot: 0, green: 0, pending: 0, greenRate: 0 })

  // Detectar país do usuário (fallback Brasil)
  const userCountry = useMemo(() => {
    return COUNTRIES.find(
      c => c.name.toLowerCase() === (profile?.favorite_national_team ?? '').toLowerCase()
    ) ?? COUNTRIES[0]
  }, [profile?.favorite_national_team])

  useEffect(() => {
    setItems(null)
    db
      .from('analyses')
      .select('*')
      .order('is_hot', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(80)
      .then(({ data }: { data: Analysis[] | null }) => {
        const list = data ?? []
        const resolved = list.filter(a => a.status === 'green' || a.status === 'red')
        const greenCount = list.filter(a => a.status === 'green').length
        setItems(list)
        setStats({
          total: list.length,
          hot: list.filter(a => a.is_hot).length,
          green: greenCount,
          pending: list.filter(a => a.status === 'pending').length,
          greenRate: resolved.length > 0 ? Math.round((greenCount / resolved.length) * 100) : 0,
        })
      })
  }, [])

  // Buscar preview de notícias
  useEffect(() => {
    db.from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }: { data: NewsItem[] | null }) => setNewsPreview(data ?? []))
  }, [])

  const hot = (items ?? []).filter((a) => a.is_hot).slice(0, 8)
  const featured = (items ?? []).filter((a) => a.is_featured && !a.is_hot).slice(0, 5)
  const rest = (items ?? []).filter((a) => !a.is_hot && !a.is_featured)

  const firstName = profile?.name?.split(' ')[0] ?? 'Membro'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  // Avatar do usuário (profile.avatar_url ou fallback)
  const avatarUrl = profile?.avatar_url ?? null

  // ─── BLOQUEIO DE ACESSO — Se expirou/bloqueado, mostra tela de bloqueio ───
  if (!access.hasAccess && !access.isTrial) {
    return <HomeAccessDenied access={access} />
  }

  return (
    <AppShell>
      {/* ═══════════════════════════════════════════════════════════════
          🔔 BANNER DE TRIAL — Quando faltam ≤ 2 dias
          ═══════════════════════════════════════════════════════════════ */}
      {access.isTrial && access.daysRemaining <= 2 && access.daysRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-arena-gold/20 via-arena-gold/10 to-arena-gold/20 border-b border-arena-gold/30 backdrop-blur-xl"
        >
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2">
            <Timer className="w-4 h-4 text-arena-gold animate-pulse" />
            <p className="text-xs font-bold text-arena-gold">
              Seu trial expira em <span className="text-white">{access.daysRemaining}</span> {access.daysRemaining === 1 ? 'dia' : 'dias'}. 
              <Link to="/support" className="ml-2 underline hover:text-white transition-colors">Assine agora</Link>
            </p>
          </div>
        </motion.div>
      )}

      <div className={access.isTrial && access.daysRemaining <= 2 ? 'pt-10' : ''}>
        {/* ═══════════════════════════════════════════════════════════════
            HERO VIP — Background de torcedor com overlay cinematográfico
            ═══════════════════════════════════════════════════════════════ */}
        <section className="mb-8 -mx-4 px-4 pt-2 pb-6 relative overflow-hidden">
          {/* Background image de torcedor */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src="/hero-bg.webp"
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="eager"
            />
            {/* Overlay escuro com gradiente — permite ver a imagem mas garante legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-b from-arena-dark/80 via-arena-dark/70 to-arena-dark/90" />
          </div>

          {/* Gradient orbs sutis por cima para manter o efeito visual */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-arena-green/6 blur-3xl" />
            <div className="absolute top-10 -left-20 w-60 h-60 rounded-full bg-arena-gold/4 blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            {/* Top row: greeting + VIP badge */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-[11px] font-medium tracking-wider uppercase text-white/70 mb-1"
                >
                  {greeting}
                </motion.p>
                <div className="flex items-center gap-2.5">
                  {/* Avatar redondo */}
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
                    className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-arena-green/30 shadow-lg shadow-arena-green/10 shrink-0"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={firstName}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-arena-green/25 to-arena-green/5 flex items-center justify-center">
                        <span className="text-lg font-black text-arena-green">
                          {firstName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-arena-green border-2 border-arena-dark" />
                  </motion.div>
                  <div>
                    <h1 className="text-xl font-black text-white tracking-tight leading-none">
                      {firstName}
                    </h1>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-lg leading-none">{userCountry.flag}</span>
                      <span className="text-[10px] text-white/60 font-medium">
                        {userCountry.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                className="flex flex-col items-end gap-1.5"
              >
                {/* BADGE VIP DINÂMICO — Mostra tipo de acesso + dias */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${
                  access.isTrial 
                    ? 'bg-gradient-to-r from-arena-gold/20 to-arena-gold/5 border-arena-gold/30 shadow-arena-gold/10'
                    : access.isLifetime
                    ? 'bg-gradient-to-r from-arena-purple/20 to-arena-purple/5 border-arena-purple/30 shadow-arena-purple/10'
                    : 'bg-gradient-to-r from-arena-green/20 to-arena-green/5 border-arena-green/30 shadow-arena-green/10'
                }`}>
                  {access.isTrial ? (
                    <Timer className="w-3.5 h-3.5 text-arena-gold" />
                  ) : access.isLifetime ? (
                    <Crown className="w-3.5 h-3.5 text-arena-purple" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-arena-green" />
                  )}
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    access.isTrial ? 'text-arena-gold' : access.isLifetime ? 'text-arena-purple' : 'text-arena-green'
                  }`}>
                    {access.isTrial ? `Trial • ${access.daysRemaining}d` : access.isLifetime ? 'Vitalício' : 'VIP Ativo'}
                  </span>
                </div>

                {stats.greenRate > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-arena-gold/10 border border-arena-gold/20">
                    <TrendingUp className="w-3 h-3 text-arena-gold" />
                    <span className="text-[10px] font-bold text-arena-gold">
                      {stats.greenRate}% Assertividade
                    </span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Motivational subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-white/60 font-medium leading-relaxed max-w-sm"
            >
              Acesso exclusivo às análises mais precisas do mercado. 
              Fique à frente da concorrência com dados em tempo real.
            </motion.p>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            STATS RÁPIDAS — Cards glassmorphism com métricas
            ═══════════════════════════════════════════════════════════════ */}
        <section className="mb-7">
          <div className="grid grid-cols-4 gap-2.5">
            <StatCard
              icon={Target}
              value={stats.total}
              label="Análises"
              color="#00C853"
              delay={0.1}
              suffix=""
            />
            <StatCard
              icon={Flame}
              value={stats.hot}
              label="Hot"
              color="#FFD700"
              delay={0.2}
              suffix=""
            />
            <StatCard
              icon={TrendingUp}
              value={stats.green}
              label="Green"
              color="#00C853"
              delay={0.3}
              suffix=""
            />
            <StatCard
              icon={Percent}
              value={stats.greenRate}
              label="Assertividade"
              color="#A0A0A0"
              delay={0.4}
              suffix="%"
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            JOGO RESPONSÁVEL — Banner fixo de avisos (sempre visível)
            ═══════════════════════════════════════════════════════════════ */}
        <ResponsibleGamblingBanner />

        {/* ═══════════════════════════════════════════════════════════════
            AÇÕES RÁPIDAS — Links para histórico e outras seções
            ═══════════════════════════════════════════════════════════════ */}
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/results"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-arena-dark/50 border border-arena-gray/20 hover:border-arena-green/30 hover:bg-arena-dark/70 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-arena-green/10 border border-arena-green/20 flex items-center justify-center shrink-0">
                <History className="w-4 h-4 text-arena-green" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white group-hover:text-arena-green transition-colors">Histórico</p>
                <p className="text-[9px] text-arena-text-secondary/40">Análises finalizadas</p>
              </div>
              <ChevronRight className="w-4 h-4 text-arena-text-secondary/20 ml-auto shrink-0 group-hover:text-arena-green/50 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/news"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-arena-dark/50 border border-arena-gray/20 hover:border-arena-gold/30 hover:bg-arena-dark/70 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-arena-gold/10 border border-arena-gold/20 flex items-center justify-center shrink-0">
                <Newspaper className="w-4 h-4 text-arena-gold" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white group-hover:text-arena-gold transition-colors">Notícias</p>
                <p className="text-[9px] text-arena-text-secondary/40">Últimas do mercado</p>
              </div>
              <ChevronRight className="w-4 h-4 text-arena-text-secondary/20 ml-auto shrink-0 group-hover:text-arena-gold/50 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            TÍTULO ANÁLISES DO DIA — Cinematográfico, sem filtros
            ═══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-7 relative"
        >
          {/* Decorative background glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-arena-green/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center py-6">
            {/* Top accent line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-16 h-0.5 bg-gradient-to-r from-transparent via-arena-green to-transparent mx-auto mb-5"
            />

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-arena-green/20 to-arena-green/5 border border-arena-green/25 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-arena-green/10"
            >
              <BarChart3 className="w-6 h-6 text-arena-green" strokeWidth={1.5} />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2"
            >
              ANÁLISES DO DIA
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-arena-text-secondary/40 font-medium tracking-wider uppercase"
            >
              Oportunidades Selecionadas pela Equipe
            </motion.p>

            {/* Bottom accent line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-24 h-0.5 bg-gradient-to-r from-transparent via-arena-green/50 to-transparent mx-auto mt-5"
            />
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════
            ANÁLISES EM DESTAQUE — Scroll horizontal
            ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {featured.length > 0 && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mb-7"
            >
              <SectionHeader
                icon={Star}
                title="Análises em Destaque"
                subtitle="Selecionadas pela Equipe"
                accentColor="#FFD700"
              />
              <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-3.5 w-max pb-3">
                  {featured.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.92, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <FeaturedCard a={a} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════
            ANÁLISES QUENTES — Carousel premium cinematográfico
            ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {hot.length > 0 && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mb-7"
            >
              <SectionHeader
                icon={Flame}
                title="Análises Quentes"
                subtitle="Maior Confiança do Dia"
                accentColor="#FF6B35"
              />
              <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-3.5 w-max pb-3">
                  {hot.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.92, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
            ANÁLISES DO DIA — Grid premium com todas as infos
            ═══════════════════════════════════════════════════════════════ */}
        <section className="mb-8">
          <SectionHeader
            icon={BarChart3}
            title="Todas as Análises"
            subtitle="Oportunidades Disponíveis"
            accentColor="#00C853"
            action={{ label: 'Ver mais', to: '/results' }}
          />

          {items === null && (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl bg-arena-gray/15" />
              ))}
            </div>
          )}

          {items && items.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-14 text-arena-text-secondary/30"
            >
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-20" strokeWidth={1.5} />
              <p className="text-sm font-medium">
                Nenhuma análise disponível ainda.
              </p>
              <p className="text-xs mt-1 opacity-50">
                Volte em breve para novas oportunidades.
              </p>
            </motion.div>
          )}

          <div className="grid gap-3.5 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {rest.map((a, i) => (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AnalysisCard a={a} index={i} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ─── Botão Ver mais (rodapé da seção) ─── */}
          {items && items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 flex justify-center"
            >
              <Link
                to="/results"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-arena-dark/60 border border-arena-gray/20 hover:border-arena-green/30 hover:bg-arena-dark/80 text-xs font-bold text-white/80 hover:text-arena-green transition-all group"
              >
                Ver mais análises
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            NOTÍCIAS PREVIEW — Cards compactos na home
            ═══════════════════════════════════════════════════════════════ */}
        {newsPreview && newsPreview.length > 0 && (
          <section className="mb-10">
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
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
      </div>
    </AppShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   HOME ACCESS DENIED — Tela quando acesso expirou na home
   ═══════════════════════════════════════════════════════════════ */
function HomeAccessDenied({ access }: { access: ReturnType<typeof useAccess> }) {
  const config = useMemo(() => {
    switch (access.level) {
      case 'expired':
        return {
          icon: Timer,
          title: 'Acesso Expirado',
          subtitle: 'Seu período de teste ou assinatura chegou ao fim. Renove agora para continuar recebendo as melhores análises.',
          color: '#EF4444',
          cta: 'Renovar Acesso VIP',
          ctaColor: 'bg-arena-gold text-black hover:bg-arena-gold/90',
        }
      case 'blocked':
        return {
          icon: Lock,
          title: 'Conta Bloqueada',
          subtitle: 'Sua conta foi suspensa pelo administrador. Entre em contato com o suporte para mais informações.',
          color: '#EF4444',
          cta: 'Falar com Suporte',
          ctaColor: 'bg-arena-gold text-black hover:bg-arena-gold/90',
        }
      case 'free':
      default:
        return {
          icon: Crown,
          title: 'Acesso VIP Necessário',
          subtitle: 'Assine agora para desbloquear todas as análises exclusivas, dicas premium e estatísticas em tempo real.',
          color: '#FFD700',
          cta: 'Assinar Agora',
          ctaColor: 'bg-arena-gold text-black hover:bg-arena-gold/90',
        }
    }
  }, [access.level])

  const Icon = config.icon

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 -mx-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-arena-dark via-arena-dark to-arena-dark/95" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-20" style={{ backgroundColor: config.color }} />
        <div className="absolute top-1/3 -left-20 w-48 h-48 rounded-full bg-arena-green/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center max-w-sm w-full"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br border flex items-center justify-center mx-auto mb-6 shadow-2xl"
            style={{ 
              backgroundColor: `${config.color}15`,
              borderColor: `${config.color}30`,
              boxShadow: `0 0 40px ${config.color}15`
            }}
          >
            <Icon className="w-10 h-10" style={{ color: config.color }} strokeWidth={1.5} />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black tracking-tight text-white mb-3"
          >
            {config.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-arena-text-secondary/50 mb-8 leading-relaxed"
          >
            {config.subtitle}
          </motion.p>

          {/* Access info card */}
          {access.expiresAt && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-arena-gray/20 bg-arena-dark/60 p-4 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-arena-text-secondary/40" />
                <span className="text-xs text-arena-text-secondary/40 font-medium">Expirou em</span>
              </div>
              <p className="text-lg font-bold text-arena-red">
                {access.expiresAt.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </motion.div>
          )}

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <button
              className={`w-full h-14 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98] ${config.ctaColor}`}
              style={{ boxShadow: `0 8px 32px ${config.color}20` }}
            >
              {config.cta}
            </button>
          </motion.div>

          {/* Decorative elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 flex items-center justify-center gap-4"
          >
            <div className="flex items-center gap-1.5 text-[10px] text-arena-text-secondary/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Pagamento Seguro</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-arena-text-secondary/10" />
            <div className="flex items-center gap-1.5 text-[10px] text-arena-text-secondary/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>Acesso Imediato</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   BANNER JOGO RESPONSÁVEL — Avisos automáticos fixos
   ═══════════════════════════════════════════════════════════════ */
function ResponsibleGamblingBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="mb-6"
    >
      <div className="rounded-2xl border border-arena-gold/20 bg-gradient-to-r from-arena-gold/5 via-arena-dark/50 to-arena-gold/5 p-4 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-arena-gold/10 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-arena-gold/15 border border-arena-gold/25 flex items-center justify-center">
                <HeartHandshake className="w-3.5 h-3.5 text-arena-gold" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-arena-gold">Jogo Responsável</h3>
                <p className="text-[9px] text-arena-text-secondary/40">Sua segurança é prioridade</p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-arena-text-secondary/20 hover:text-white transition-colors p-1"
              aria-label="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-arena-dark/40 border border-arena-gray/15">
              <AlertTriangle className="w-3.5 h-3.5 text-arena-gold/60 shrink-0" />
              <span className="text-[10px] text-white/70 font-medium leading-tight">
                Aposte com consciência
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-arena-dark/40 border border-arena-gray/15">
              <Wallet className="w-3.5 h-3.5 text-arena-gold/60 shrink-0" />
              <span className="text-[10px] text-white/70 font-medium leading-tight">
                Siga a gestão de banca
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-arena-dark/40 border border-arena-gray/15">
              <ShieldCheck className="w-3.5 h-3.5 text-arena-gold/60 shrink-0" />
              <span className="text-[10px] text-white/70 font-medium leading-tight">
                Nunca aposte o que não pode perder
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
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
  suffix = '',
}: {
  icon: React.ElementType
  value: number
  label: string
  color: string
  delay: number
  suffix?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
  )
}

function sportMeta(id: string) {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0]
}

function bookmakerMeta(name: string | null | undefined) {
  if (!name) return null
  return BOOKMAKERS.find(b => b.name.toLowerCase() === name.toLowerCase()) ?? null
}

function formatBetType(bet: AnalysisBet | null | undefined): { label: string; color: string; icon: LucideIcon } | null {
  if (!bet) return null
  if (bet.bet_type === 'multipla') {
    return { label: 'Múltipla', color: '#FF6B35', icon: Ticket }
  }
  return { label: 'Simples', color: '#00C853', icon: Target }
}

function formatMatchDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString()

  if (isToday) return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  if (isTomorrow) return `Amanhã, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/* ═══════════════════════════════════════════════════════════════
   FEATURED CARD — Card de destaque
   ═══════════════════════════════════════════════════════════════ */
function FeaturedCard({ a }: { a: Analysis }) {
  const meta = sportMeta(a.sport_type)
  const bm = bookmakerMeta(a.bookmaker_name)
  const betInfo = formatBetType(a.bet)
  const selectionCount = a.bet?.selections?.length ?? a.matches?.length ?? 0
  const isResolved = a.status === 'green' || a.status === 'red'

  return (
    <Link
      to="/analysis/$id"
      params={{ id: a.id }}
      className="block w-[82vw] max-w-[360px] shrink-0"
    >
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative h-48 rounded-2xl overflow-hidden border border-arena-gold/20 bg-arena-dark group cursor-pointer shadow-xl shadow-black/20"
      >
        {a.image_url ? (
          <img
            src={a.image_url}
            alt={a.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-arena-gold/10 via-arena-dark to-arena-green/5" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-arena-gold text-black shadow-lg">
              <Star className="w-3 h-3" strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Destaque</span>
            </div>
            {betInfo && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                style={{ backgroundColor: betInfo.color + '20', color: betInfo.color, borderColor: betInfo.color + '40' }}
              >
                <betInfo.icon className="w-3 h-3" />
                {betInfo.label}
                {selectionCount > 1 && ` (${selectionCount})`}
              </div>
            )}
            {isResolved && (
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${a.status === 'green' ? 'bg-arena-success text-black' : 'bg-arena-red text-white'}`}>
                {a.status === 'green' ? '✓ GREEN' : '✗ RED'}
              </div>
            )}
          </div>
          <div className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold text-white/80 tracking-wider uppercase">
              {meta.name}
            </span>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 mb-2 drop-shadow-lg">
            {a.title}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {a.odds && (
                <div className="flex items-baseline gap-1">
                  <span className="text-arena-gold font-black text-lg leading-none">
                    @{a.odds.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-white/40 font-medium">odds</span>
                </div>
              )}
              {a.stake_value && (
                <div className="flex items-baseline gap-1">
                  <span className="text-white/60 font-bold text-sm leading-none">
                    R$ {a.stake_value.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-white/30 font-medium">stake</span>
                </div>
              )}
            </div>
            {bm && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ backgroundColor: bm.color + '25', color: bm.color }}
              >
                {bm.name}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════
   HOT CARD — Design premium com overlay cinematográfico
   ═══════════════════════════════════════════════════════════════ */
function HotCard({ a }: { a: Analysis }) {
  const meta = sportMeta(a.sport_type)
  const bm = bookmakerMeta(a.bookmaker_name)
  const betInfo = formatBetType(a.bet)
  const selectionCount = a.bet?.selections?.length ?? a.matches?.length ?? 0
  const isResolved = a.status === 'green' || a.status === 'red'

  return (
    <Link
      to="/analysis/$id"
      params={{ id: a.id }}
      className="block w-[82vw] max-w-[360px] shrink-0"
    >
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative h-48 rounded-2xl overflow-hidden border border-arena-gray/30 bg-arena-dark group cursor-pointer shadow-xl shadow-black/20"
      >
        {a.image_url ? (
          <img
            src={a.image_url}
            alt={a.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-arena-green/10 via-arena-dark to-arena-gold/5" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-arena-gold text-black shadow-lg">
              <Flame className="w-3 h-3" strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Hot</span>
            </div>
            {betInfo && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                style={{ backgroundColor: betInfo.color + '20', color: betInfo.color, borderColor: betInfo.color + '40' }}
              >
                <betInfo.icon className="w-3 h-3" />
                {betInfo.label}
                {selectionCount > 1 && ` (${selectionCount})`}
              </div>
            )}
            {isResolved && (
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${a.status === 'green' ? 'bg-arena-success text-black' : 'bg-arena-red text-white'}`}>
                {a.status === 'green' ? '✓ GREEN' : '✗ RED'}
              </div>
            )}
          </div>
          <div className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold text-white/80 tracking-wider uppercase">
              {meta.name}
            </span>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 mb-2 drop-shadow-lg">
            {a.title}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {a.odds && (
                <div className="flex items-baseline gap-1">
                  <span className="text-arena-gold font-black text-lg leading-none">
                    @{a.odds.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-white/40 font-medium">odds</span>
                </div>
              )}
              {a.stake_value && (
                <div className="flex items-baseline gap-1">
                  <span className="text-white/60 font-bold text-sm leading-none">
                    R$ {a.stake_value.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-white/30 font-medium">stake</span>
                </div>
              )}
            </div>
            {bm && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ backgroundColor: bm.color + '25', color: bm.color }}
              >
                {bm.name}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ANALYSIS CARD — Design VIP com todas as informações
   ═══════════════════════════════════════════════════════════════ */
function AnalysisCard({ a, index }: { a: Analysis; index: number }) {
  const meta = sportMeta(a.sport_type)
  const Icon = meta.icon
  const bm = bookmakerMeta(a.bookmaker_name)
  const betInfo = formatBetType(a.bet)
  const selectionCount = a.bet?.selections?.length ?? a.matches?.length ?? 0

  const statusConfig = {
    green: {
      bg: 'bg-arena-success/12',
      text: 'text-arena-success',
      label: 'GREEN',
      border: 'border-arena-success/20',
      dot: '#00C853',
    },
    red: {
      bg: 'bg-arena-red/12',
      text: 'text-arena-red',
      label: 'RED',
      border: 'border-arena-red/20',
      dot: '#EF4444',
    },
    pending: {
      bg: 'bg-arena-text-secondary/8',
      text: 'text-arena-text-secondary/60',
      label: 'PENDENTE',
      border: 'border-arena-gray/25',
      dot: '#A0A0A0',
    },
  }

  const status = a.status && statusConfig[a.status as keyof typeof statusConfig]
    ? statusConfig[a.status as keyof typeof statusConfig]
    : statusConfig.pending

  const isResolved = a.status === 'green' || a.status === 'red'

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <Link
        to="/analysis/$id"
        params={{ id: a.id }}
        className="block rounded-2xl border border-arena-gray/25 bg-arena-dark/60 hover:border-arena-green/30 hover:shadow-lg hover:shadow-arena-green/5 transition-all duration-300 overflow-hidden group"
      >
        {/* Image banner (if has image) */}
        {a.image_url && (
          <div className="aspect-[21/9] bg-arena-gray/15 overflow-hidden relative">
            <img
              src={a.image_url}
              alt={a.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-arena-dark/80 to-transparent" />
            {isResolved && (
              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${a.status === 'green' ? 'bg-arena-success/90 text-black' : 'bg-arena-red/90 text-white'}`}>
                {a.status === 'green' ? '✓ GREEN' : '✗ RED'}
              </div>
            )}
          </div>
        )}

        <div className="p-3.5">
          {/* Top row: sport + badges */}
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
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

            {betInfo && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
                style={{ backgroundColor: betInfo.color + '12', color: betInfo.color, borderColor: betInfo.color + '25' }}
              >
                <betInfo.icon className="w-3 h-3" />
                {betInfo.label}
                {selectionCount > 0 && ` • ${selectionCount} sel.`}
              </span>
            )}

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${status.bg} ${status.text} border ${status.border}`}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: status.dot }} />
              {status.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 group-hover:text-arena-green/90 transition-colors duration-300 mb-1.5">
            {a.title}
          </h3>

          {/* Championship + Date */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {a.championship && (
              <p className="text-[11px] text-arena-text-secondary/40 font-medium truncate">
                <Trophy className="w-3 h-3 inline mr-1 -mt-0.5" />
                {a.championship}
              </p>
            )}
            {a.match_date && (
              <p className="text-[10px] text-arena-text-secondary/30 font-medium">
                <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                {formatMatchDate(a.match_date)}
              </p>
            )}
          </div>

          {/* Bet preview (if structured) */}
          {a.display_type === 'structured' && selectionCount > 0 && (
            <div className="mb-3 p-2.5 rounded-xl bg-arena-dark/80 border border-arena-gray/15">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-arena-text-secondary/40 font-medium uppercase tracking-wider">
                  {a.bet?.bet_type === 'multipla' ? 'Múltipla' : 'Simples'}
                </span>
                {bm && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: bm.color + '18', color: bm.color }}
                  >
                    {bm.name}
                  </span>
                )}
              </div>
              {a.bet?.selections && a.bet.selections[0] ? (
                <p className="text-xs text-white/80 font-medium truncate">
                  {a.bet.selections[0].home_team} <span className="text-arena-text-secondary/30 mx-0.5">vs</span> {a.bet.selections[0].away_team}
                </p>
              ) : a.matches && a.matches[0] ? (
                <p className="text-xs text-white/80 font-medium truncate">
                  {a.matches[0].home_team} <span className="text-arena-text-secondary/30 mx-0.5">vs</span> {a.matches[0].away_team}
                </p>
              ) : null}
              {selectionCount > 1 && (
                <p className="text-[10px] text-arena-text-secondary/30 mt-0.5">
                  +{selectionCount - 1} {selectionCount - 1 === 1 ? 'seleção' : 'seleções'}
                </p>
              )}
            </div>
          )}

          {/* Footer: values + arrow */}
          <div className="flex items-center justify-between pt-2.5 border-t border-arena-gray/15">
            <div className="flex items-center gap-3">
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
              {a.stake_value ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-white/60 font-bold text-sm">
                    R$ {a.stake_value.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-arena-text-secondary/30 font-medium">stake</span>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              {isResolved && (
                <span className={`text-[10px] font-black uppercase ${a.status === 'green' ? 'text-arena-success' : 'text-arena-red'}`}>
                  {a.status === 'green' ? '✓ GREEN' : '✗ RED'}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-arena-text-secondary/20 group-hover:text-arena-green/50 group-hover:translate-x-0.5 transition-all duration-300" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}