import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, LogOut, TrendingUp, History, Headset, Loader2, Calendar, Trophy, Shield, Star, Target, Percent, DollarSign, User } from 'lucide-react'
import { COUNTRIES } from '@/lib/constants'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth, db } from '@/hooks/use-auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useFixtures } from '@/hooks/use-fixtures'
import { useTeamBadge } from '@/hooks/use-team-badge'
import { MatchCard } from '@/components/match/MatchCard'

export const Route = createFileRoute('/profile')({ component: ProfilePage })

interface BetStats {
  total: number
  greens: number
  reds: number
  pending: number
  profit: number
  avgOdds: number
  hitRate: number
}

function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [team, setTeam] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [stats, setStats] = useState<BetStats>({
    total: 0, greens: 0, reds: 0, pending: 0, profit: 0, avgOdds: 0, hitRate: 0
  })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Buscar escudo do time
  const { badge: teamBadge, loading: badgeLoading } = useTeamBadge(profile?.favorite_team || null)

  // Buscar jogos do time
  const { fixtures, loading: fixturesLoading } = useFixtures()

  // Filtrar jogos do time favorito
  const teamFixtures = fixtures.filter((f) => {
    if (!profile?.favorite_team) return false
    const teamName = profile.favorite_team.toLowerCase()
    return (
      f.teams.home.name.toLowerCase().includes(teamName) ||
      f.teams.away.name.toLowerCase().includes(teamName)
    )
  })

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setAge(profile.age?.toString() ?? '')
      setTeam(profile.favorite_team ?? '')
      setAvatar(profile.avatar_url)
    }
  }, [profile])

  // Buscar estatísticas reais de apostas
  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      const { data: bets } = await db
        .from('user_bets')
        .select('result_status, profit_loss, did_bet')
        .eq('user_id', user.id)

      const arr = bets ?? []
      const greens = arr.filter((b: { result_status: string }) => b.result_status === 'green').length
      const reds = arr.filter((b: { result_status: string }) => b.result_status === 'red').length
      const pending = arr.filter((b: { result_status: string }) => b.result_status === 'pending').length
      const decided = greens + reds

      setStats({
        total: arr.length,
        greens,
        reds,
        pending,
        profit: arr.reduce((s: number, b: { profit_loss: number | null }) => s + Number(b.profit_loss ?? 0), 0),
        avgOdds: 0,
        hitRate: decided > 0 ? Math.round((greens / decided) * 100) : 0,
      })
    }

    fetchStats()
  }, [user])

  const save = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await db
      .from('profiles')
      .update({
        name,
        age: age ? parseInt(age) : null,
        favorite_team: team,
        avatar_url: avatar,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Perfil atualizado')
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      toast.error(error.message)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatar(data.publicUrl)
    await db.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
    toast.success('Foto atualizada')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

  return (
    <AppShell>
      <div className="space-y-5 max-w-2xl mx-auto">

        {/* ========== HEADER DO PERFIL ========== */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-arena-gray/50 bg-gradient-to-br from-arena-dark to-arena-dark/80 p-6 relative overflow-hidden"
        >
          {/* Background decorativo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-arena-green/5 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="flex items-start gap-4 relative z-10">
            {/* Avatar */}
            <button onClick={() => fileRef.current?.click()} className="relative group flex-shrink-0">
              <Avatar className="w-20 h-20 border-2 border-arena-green/50 shadow-lg">
                <AvatarImage src={avatar ?? undefined} />
                <AvatarFallback className="bg-arena-gray text-2xl font-black">
                  {name.slice(0, 2).toUpperCase() || 'AR'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-xl tracking-tight">{name || 'Sem nome'}</h2>
                {profile?.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full bg-arena-gold/20 text-arena-gold text-[10px] font-black uppercase tracking-widest border border-arena-gold/30">
                    <Star className="w-3 h-3 inline mr-1" /> Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-arena-text-secondary mt-0.5">{user?.email}</p>

              <div className="flex items-center gap-3 mt-3">
                {profile?.age && (
                  <span className="text-xs text-arena-text-secondary flex items-center gap-1">
                    <User className="w-3 h-3" /> {profile.age} anos
                  </span>
                )}
                {profile?.favorite_national_team && (
                  <span className="text-xs text-arena-text-secondary">
                    {(COUNTRIES as { name: string; flag: string }[]).find((c: { name: string }) => c.name === profile.favorite_national_team)?.flag || '🏳️'} {profile.favorite_national_team}
                  </span>
                )}
              </div>

              {/* Time do coração com escudo */}
              {profile?.favorite_team && (
                <div className="flex items-center gap-2 mt-3 p-2 rounded-xl bg-arena-gray/30 border border-arena-gray/30 w-fit">
                  {badgeLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-arena-green" />
                  ) : teamBadge ? (
                    <img 
                      src={teamBadge.logo} 
                      alt={teamBadge.name} 
                      className="w-6 h-6 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Shield className="w-5 h-5 text-arena-text-secondary" />
                  )}
                  <span className="text-sm font-bold">{profile.favorite_team}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ========== ESTATÍSTICAS ========== */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-arena-text-secondary mb-3 flex items-center gap-2">
            <Target className="w-3 h-3" /> Minhas Apostas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard 
              label="Total" 
              value={stats.total} 
              icon={<TrendingUp className="w-4 h-4" />}
              color="text-white"
            />
            <StatCard 
              label="Greens" 
              value={stats.greens} 
              icon={<Percent className="w-4 h-4" />}
              color="text-arena-success"
              subValue={stats.total > 0 ? `${Math.round((stats.greens / stats.total) * 100)}%` : undefined}
            />
            <StatCard 
              label="Reds" 
              value={stats.reds} 
              icon={<Target className="w-4 h-4" />}
              color="text-arena-red"
            />
            <StatCard 
              label="Lucro/Prejuízo" 
              value={`R$ ${stats.profit.toFixed(0)}`} 
              icon={<DollarSign className="w-4 h-4" />}
              color={stats.profit >= 0 ? 'text-arena-success' : 'text-arena-red'}
              isCurrency
            />
          </div>

          {/* Barra de progresso hit rate */}
          {stats.total > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-arena-dark border border-arena-gray/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-arena-text-secondary">Taxa de Acerto</span>
                <span className="text-sm font-black text-arena-green">{stats.hitRate}%</span>
              </div>
              <div className="w-full h-2 bg-arena-gray rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.hitRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-arena-green to-arena-gold rounded-full"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* ========== PRÓXIMO JOGO DO MEU TIME ========== */}
        {profile?.favorite_team && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-arena-gray/50 bg-arena-dark p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {teamBadge && !badgeLoading && (
                  <img 
                    src={teamBadge.logo} 
                    alt={teamBadge.name} 
                    className="w-6 h-6 object-contain"
                  />
                )}
                <h3 className="text-sm font-bold uppercase tracking-widest text-arena-gold">
                  {profile.favorite_team}
                </h3>
              </div>
              <span className="text-[10px] text-arena-text-secondary font-bold bg-arena-gray/30 px-2 py-1 rounded-full">
                JOGOS
              </span>
            </div>

            {fixturesLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-arena-green" />
              </div>
            )}

            {!fixturesLoading && teamFixtures.length > 0 && (
              <div className="overflow-x-auto scrollbar-thin -mx-4 px-4">
                <div className="flex gap-3 w-max pb-2">
                  {teamFixtures.slice(0, 5).map((fixture) => (
                    <MatchCard key={fixture.fixture.id} fixture={fixture} />
                  ))}
                </div>
              </div>
            )}

            {!fixturesLoading && teamFixtures.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-arena-text-secondary/40" />
                <p className="text-sm text-arena-text-secondary">Nenhum jogo encontrado para {profile.favorite_team} hoje.</p>
                <p className="text-xs text-arena-text-secondary/60 mt-1">Tente novamente mais tarde.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ========== EDITAR PERFIL ========== */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-arena-gray/50 bg-arena-dark p-5 space-y-4"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-arena-text-secondary flex items-center gap-2">
            <User className="w-4 h-4" /> Editar Perfil
          </h3>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-arena-text-secondary font-bold">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-arena-gray/40 border-arena-gray rounded-xl focus:border-arena-green"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-arena-text-secondary font-bold">Idade</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="h-12 bg-arena-gray/40 border-arena-gray rounded-xl focus:border-arena-green"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-arena-text-secondary font-bold">Time</Label>
                <Input
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="h-12 bg-arena-gray/40 border-arena-gray rounded-xl focus:border-arena-green"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={save}
            disabled={saving}
            className="w-full h-12 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </motion.div>

        {/* ========== LINKS ========== */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <Link
            to="/history"
            className="flex items-center justify-between p-4 rounded-2xl border border-arena-gray/50 bg-arena-dark hover:border-arena-green/50 hover:bg-arena-green/5 transition-all group"
          >
            <span className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-arena-green/10 flex items-center justify-center group-hover:bg-arena-green/20 transition-colors">
                <History className="w-5 h-5 text-arena-green" />
              </div>
              <div>
                <span className="font-bold text-sm block">Meu Histórico</span>
                <span className="text-xs text-arena-text-secondary">{stats.total} apostas registradas</span>
              </div>
            </span>
            <TrendingUp className="w-4 h-4 text-arena-text-secondary group-hover:text-arena-green transition-colors" />
          </Link>

          <Link
            to="/support"
            className="flex items-center justify-between p-4 rounded-2xl border border-arena-gray/50 bg-arena-dark hover:border-arena-gold/50 hover:bg-arena-gold/5 transition-all group"
          >
            <span className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-arena-gold/10 flex items-center justify-center group-hover:bg-arena-gold/20 transition-colors">
                <Headset className="w-5 h-5 text-arena-gold" />
              </div>
              <div>
                <span className="font-bold text-sm block">Suporte 24/7</span>
                <span className="text-xs text-arena-text-secondary">Precisa de ajuda?</span>
              </div>
            </span>
          </Link>
        </motion.div>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={logout}
          className="w-full h-12 border-arena-red/50 text-arena-red hover:bg-arena-red/10 hover:border-arena-red rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
        </Button>
      </div>
    </AppShell>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
  subValue,
  isCurrency,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  subValue?: string
  isCurrency?: boolean
}) {
  return (
    <div className="rounded-2xl border border-arena-gray/50 bg-arena-dark p-4 hover:border-arena-gray transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-arena-text-secondary">{icon}</span>
        <span className="text-[10px] uppercase tracking-widest text-arena-text-secondary font-bold">{label}</span>
      </div>
      <p className={`font-black text-xl ${color}`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-arena-text-secondary mt-1">{subValue}</p>
      )}
    </div>
  )
}