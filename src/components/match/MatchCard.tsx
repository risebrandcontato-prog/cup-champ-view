// src/components/match/MatchCard.tsx
// Card de jogo com escudos, placar ao vivo, e badge de análise

import { motion } from 'framer-motion'
import { Clock, Trophy, Shield } from 'lucide-react'
import { useState } from 'react'
import type { Fixture } from '@/hooks/use-fixtures'

interface MatchCardProps {
  fixture: Fixture
  hasAnalysis?: boolean
  analysisId?: string
  onClick?: () => void
}

function TeamLogo({ name, logo, size = 40 }: { name: string; logo: string | null; size?: number }) {
  const [error, setError] = useState(false)

  if (!logo || error) {
    return (
      <div
        className="rounded-full bg-arena-gray/60 flex items-center justify-center border border-arena-gray/50"
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-black text-arena-text-secondary">
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-full bg-white/10 flex items-center justify-center overflow-hidden p-1"
      style={{ width: size, height: size }}
    >
      <img
        src={logo}
        alt={name}
        className="w-full h-full object-contain"
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  )
}

export function MatchCard({ fixture, hasAnalysis, onClick }: MatchCardProps) {
  const { teams, goals, fixture: fixtureInfo, league } = fixture
  const isLive = fixtureInfo.status.short === 'LIVE' || fixtureInfo.status.short === '1H' || fixtureInfo.status.short === '2H'
  const isFinished = fixtureInfo.status.short === 'FT' || fixtureInfo.status.short === 'AET' || fixtureInfo.status.short === 'PEN'

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`
        relative shrink-0 w-70 rounded-2xl border overflow-hidden cursor-pointer
        ${hasAnalysis ? 'border-arena-gold/50 bg-arena-gold/5' : 'border-arena-gray bg-arena-dark'}
        ${onClick ? 'hover:border-arena-green/50 hover:shadow-lg hover:shadow-arena-green/10' : ''}
        transition-all
      `}
    >
      {/* Badge de análise */}
      {hasAnalysis && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-arena-gold text-black text-[10px] font-black uppercase tracking-wider">
          <Trophy className="w-3 h-3" /> Análise
        </div>
      )}

      {/* Badge LIVE */}
      {isLive && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-arena-red text-white text-[10px] font-black uppercase animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
        </div>
      )}

      {/* Header: Liga + Horário */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {league.logo && (
            <img 
              src={league.logo} 
              alt={league.name} 
              className="w-4 h-4 object-contain shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className="text-[10px] text-arena-text-secondary truncate uppercase tracking-wider">
            {league.country} — {league.name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-arena-text-secondary shrink-0">
          <Clock className="w-3 h-3" />
          {isLive ? (
            <span className="text-arena-red font-bold">{fixtureInfo.status.elapsed}'</span>
          ) : isFinished ? (
            <span className="text-arena-text-secondary">Encerrado</span>
          ) : (
            <span>{formatTime(fixtureInfo.date)}</span>
          )}
        </div>
      </div>

      {/* Times e Placar */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between">
          {/* Time Casa */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamLogo name={teams.home.name} logo={teams.home.logo} />
            <span className="text-xs font-semibold text-center line-clamp-1 w-full leading-tight">
              {teams.home.name}
            </span>
          </div>

          {/* Placar */}
          <div className="flex flex-col items-center px-3">
            {isLive || isFinished ? (
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black ${teams.home.winner ? 'text-arena-green' : 'text-white'}`}>
                  {goals.home ?? 0}
                </span>
                <span className="text-arena-text-secondary text-lg">x</span>
                <span className={`text-2xl font-black ${teams.away.winner ? 'text-arena-green' : 'text-white'}`}>
                  {goals.away ?? 0}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-lg font-black text-arena-green">VS</span>
                <p className="text-[10px] text-arena-text-secondary mt-0.5">{formatDate(fixtureInfo.date)}</p>
              </div>
            )}
          </div>

          {/* Time Fora */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamLogo name={teams.away.name} logo={teams.away.logo} />
            <span className="text-xs font-semibold text-center line-clamp-1 w-full leading-tight">
              {teams.away.name}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Componente de loading skeleton
export function MatchCardSkeleton() {
  return (
    <div className="shrink-0 w-70 rounded-2xl border border-arena-gray bg-arena-dark p-3 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-20 bg-arena-gray/50 rounded" />
        <div className="h-3 w-12 bg-arena-gray/50 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-10 h-10 rounded-full bg-arena-gray/50" />
          <div className="h-3 w-16 bg-arena-gray/50 rounded" />
        </div>
        <div className="px-3">
          <div className="h-6 w-12 bg-arena-gray/50 rounded" />
        </div>
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-10 h-10 rounded-full bg-arena-gray/50" />
          <div className="h-3 w-16 bg-arena-gray/50 rounded" />
        </div>
      </div>
    </div>
  )
}