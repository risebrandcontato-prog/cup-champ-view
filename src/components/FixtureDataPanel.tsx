import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Shield, Swords, Users, TrendingUp, Activity, Clock, MapPin, UserCheck,
  Goal, Calendar, Trophy, ChevronRight, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { useTeamLogo } from '@/hooks/use-team-logo';
import type { FixtureData } from '@/hooks/use-fixture-data';

interface FixtureDataPanelProps {
  data: FixtureData;
}

function TeamBadge({ name, logo, teamId }: { name: string; logo: string; teamId: number }) {
  const { logo: resolvedLogo } = useTeamLogo(logo, teamId, name);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 flex items-center justify-center p-2">
        {resolvedLogo ? (
          <img src={resolvedLogo} alt={name} className="w-full h-full object-contain" />
        ) : (
          <Shield className="w-8 h-8 text-arena-text-secondary" />
        )}
      </div>
      <span className="text-xs md:text-sm font-bold text-center max-w-[100px] leading-tight">{name}</span>
    </div>
  );
}

function StatusBadge({ status, elapsed }: { status: string; elapsed: number | null }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    NS: { label: 'Não iniciado', color: 'bg-arena-gray text-arena-text-secondary' },
    TBD: { label: 'A definir', color: 'bg-arena-gray text-arena-text-secondary' },
    '1H': { label: '1º Tempo', color: 'bg-arena-green/20 text-arena-green' },
    HT: { label: 'Intervalo', color: 'bg-arena-gold/20 text-arena-gold' },
    '2H': { label: '2º Tempo', color: 'bg-arena-green/20 text-arena-green' },
    ET: { label: 'Prorrogação', color: 'bg-arena-green/20 text-arena-green' },
    P: { label: 'Pênaltis', color: 'bg-arena-green/20 text-arena-green' },
    FT: { label: 'Encerrado', color: 'bg-arena-text-secondary/20 text-arena-text-secondary' },
    AET: { label: 'Encerrado (Prorrog.)', color: 'bg-arena-text-secondary/20 text-arena-text-secondary' },
    PEN: { label: 'Encerrado (Pênaltis)', color: 'bg-arena-text-secondary/20 text-arena-text-secondary' },
    BT: { label: 'Intervalo (Prorrog.)', color: 'bg-arena-gold/20 text-arena-gold' },
    LIVE: { label: 'Ao vivo', color: 'bg-arena-green/20 text-arena-green animate-pulse' },
  };

  const s = statusMap[status] || { label: status, color: 'bg-arena-gray text-arena-text-secondary' };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.color}`}>
      <Activity className="w-3 h-3 inline mr-1" />
      {s.label}
      {elapsed !== null && status !== 'FT' && status !== 'NS' && (
        <span className="ml-1">({elapsed}')</span>
      )}
    </span>
  );
}

export function FixtureDataPanel({ data }: FixtureDataPanelProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const { fixture, league, teams, goals, odds, lineups, h2h, statistics, homeForm, awayForm } = data;

  const isLive = fixture.status === '1H' || fixture.status === '2H' || fixture.status === 'ET' || fixture.status === 'LIVE';
  const isFinished = fixture.status === 'FT' || fixture.status === 'AET' || fixture.status === 'PEN';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-arena-gray bg-arena-dark overflow-hidden"
    >
      {/* ─── HEADER: Placar e Times ─── */}
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[10px] text-arena-text-secondary">
            <Trophy className="w-3 h-3" />
            <span className="font-bold">{league.name}</span>
            <span>•</span>
            <span>{league.country}</span>
            <span>•</span>
            <span>{league.round}</span>
          </div>
          <StatusBadge status={fixture.status} elapsed={fixture.elapsed} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <TeamBadge name={teams.home.name} logo={teams.home.logo} teamId={teams.home.id} />

          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <div className="text-3xl md:text-4xl font-black tabular-nums">
              {isLive || isFinished ? (
                <span className={isLive ? 'text-arena-green' : ''}>
                  {goals.home ?? 0} <span className="text-arena-text-secondary mx-1">x</span> {goals.away ?? 0}
                </span>
              ) : (
                <span className="text-arena-text-secondary">vs</span>
              )}
            </div>
            {fixture.date && (
              <span className="text-[10px] text-arena-text-secondary flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(fixture.date).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {fixture.venue && (
              <span className="text-[10px] text-arena-text-secondary flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {fixture.venue}
              </span>
            )}
            {fixture.referee && (
              <span className="text-[10px] text-arena-text-secondary">
                Árbitro: {fixture.referee}
              </span>
            )}
          </div>

          <TeamBadge name={teams.away.name} logo={teams.away.logo} teamId={teams.away.id} />
        </div>
      </div>

      {/* ─── TABS ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full rounded-none bg-arena-gray/20 border-t border-arena-gray h-10">
          <TabsTrigger value="summary" className="text-[10px] md:text-xs font-bold data-[state=active]:bg-arena-gray/40">
            <Swords className="w-3 h-3 mr-1" /> H2H
          </TabsTrigger>
          <TabsTrigger value="odds" className="text-[10px] md:text-xs font-bold data-[state=active]:bg-arena-gray/40">
            <TrendingUp className="w-3 h-3 mr-1" /> Odds
          </TabsTrigger>
          <TabsTrigger value="lineups" className="text-[10px] md:text-xs font-bold data-[state=active]:bg-arena-gray/40">
            <Users className="w-3 h-3 mr-1" /> Escalações
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-[10px] md:text-xs font-bold data-[state=active]:bg-arena-gray/40">
            <Activity className="w-3 h-3 mr-1" /> Stats
          </TabsTrigger>
          <TabsTrigger value="form" className="text-[10px] md:text-xs font-bold data-[state=active]:bg-arena-gray/40">
            <ChevronRight className="w-3 h-3 mr-1" /> Forma
          </TabsTrigger>
        </TabsList>

        {/* ─── H2H ─── */}
        <TabsContent value="summary" className="p-4 space-y-3">
          <p className="text-xs font-bold text-arena-text-secondary uppercase tracking-wider flex items-center gap-1">
            <Swords className="w-3 h-3" /> Últimos Confrontos
          </p>
          {h2h.length === 0 ? (
            <p className="text-xs text-arena-text-secondary text-center py-4">Nenhum confronto direto encontrado.</p>
          ) : (
            <div className="space-y-2">
              {h2h.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-arena-gray/20 border border-arena-gray/30"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] text-arena-text-secondary w-16">
                      {new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                    <span className="text-xs font-bold truncate">{m.homeTeam}</span>
                  </div>
                  <div className="px-2 py-1 rounded bg-arena-gray/40 text-xs font-black tabular-nums mx-2">
                    {m.homeScore ?? '-'} x {m.awayScore ?? '-'}
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="text-xs font-bold truncate text-right">{m.awayTeam}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ODDS ─── */}
        <TabsContent value="odds" className="p-4 space-y-3">
          <p className="text-xs font-bold text-arena-text-secondary uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Odds Pré-Jogo
          </p>
          {odds.length === 0 ? (
            <p className="text-xs text-arena-text-secondary text-center py-4">Odds não disponíveis.</p>
          ) : (
            <div className="space-y-3">
              {odds.map((o, i) => (
                <div key={i} className="border border-arena-gray rounded-xl p-3">
                  <p className="text-xs font-bold mb-2">{o.bookmaker}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {o.values.map((v, j) => (
                      <div key={j} className="text-center p-2 rounded-lg bg-arena-gray/20">
                        <p className="text-[10px] text-arena-text-secondary">{v.value}</p>
                        <p className="text-sm font-black text-arena-gold">{v.odd}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── LINEUPS ─── */}
        <TabsContent value="lineups" className="p-4 space-y-3">
          <p className="text-xs font-bold text-arena-text-secondary uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3" /> Escalações
          </p>
          {lineups.length === 0 ? (
            <p className="text-xs text-arena-text-secondary text-center py-4">Escalações não disponíveis.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {lineups.map((lu, idx) => (
                <div key={idx} className="border border-arena-gray rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={lu.teamLogo} alt={lu.teamName} className="w-6 h-6 object-contain" />
                    <div>
                      <p className="text-xs font-bold">{lu.teamName}</p>
                      <p className="text-[10px] text-arena-text-secondary">Formação: {lu.formation}</p>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-arena-green mb-1 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Titulares
                  </p>
                  <div className="space-y-1 mb-3">
                    {lu.startXI.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-arena-gray/20 last:border-0">
                        <span className="flex items-center gap-2">
                          <span className="w-5 text-center text-[10px] text-arena-text-secondary font-mono">{p.number ?? '-'}</span>
                          <span>{p.name}</span>
                        </span>
                        <span className="text-[10px] text-arena-text-secondary">{p.pos}</span>
                      </div>
                    ))}
                  </div>

                  {lu.substitutes.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-arena-text-secondary mb-1">Reservas</p>
                      <div className="space-y-1">
                        {lu.substitutes.map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-arena-gray/20 last:border-0">
                            <span className="flex items-center gap-2">
                              <span className="w-5 text-center text-[10px] text-arena-text-secondary font-mono">{p.number ?? '-'}</span>
                              <span className="text-arena-text-secondary">{p.name}</span>
                            </span>
                            <span className="text-[10px] text-arena-text-secondary">{p.pos}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── STATISTICS ─── */}
        <TabsContent value="stats" className="p-4 space-y-3">
          <p className="text-xs font-bold text-arena-text-secondary uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> Estatísticas
          </p>
          {statistics.length === 0 ? (
            <p className="text-xs text-arena-text-secondary text-center py-4">Estatísticas não disponíveis.</p>
          ) : (
            <div className="space-y-3">
              {statistics.map((teamStats, idx) => (
                <div key={idx} className="border border-arena-gray rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={teamStats.logo} alt={teamStats.team} className="w-5 h-5 object-contain" />
                    <p className="text-xs font-bold">{teamStats.team}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {teamStats.stats.map((st, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-arena-gray/20">
                        <span className="text-[10px] text-arena-text-secondary">{st.type}</span>
                        <span className="text-xs font-bold">{st.value ?? '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── FORM ─── */}
        <TabsContent value="form" className="p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Home Form */}
            <div>
              <p className="text-xs font-bold mb-2 flex items-center gap-1">
                <Shield className="w-3 h-3" /> {teams.home.name} — Últimos 5
              </p>
              {homeForm.length === 0 ? (
                <p className="text-xs text-arena-text-secondary text-center py-4">Sem dados.</p>
              ) : (
                <div className="space-y-2">
                  {homeForm.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-arena-gray/20 border border-arena-gray/30">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        f.result === 'W' ? 'bg-arena-success/20 text-arena-success' :
                        f.result === 'L' ? 'bg-arena-red/20 text-arena-red' :
                        'bg-arena-gray text-arena-text-secondary'
                      }`}>
                        {f.result === 'W' ? <ArrowUpRight className="w-3 h-3" /> :
                         f.result === 'L' ? <ArrowDownRight className="w-3 h-3" /> :
                         <Minus className="w-3 h-3" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{f.opponent}</p>
                        <p className="text-[10px] text-arena-text-secondary">{f.venue} • {f.score}</p>
                      </div>
                      <span className="text-[10px] text-arena-text-secondary">
                        {new Date(f.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Away Form */}
            <div>
              <p className="text-xs font-bold mb-2 flex items-center gap-1">
                <Shield className="w-3 h-3" /> {teams.away.name} — Últimos 5
              </p>
              {awayForm.length === 0 ? (
                <p className="text-xs text-arena-text-secondary text-center py-4">Sem dados.</p>
              ) : (
                <div className="space-y-2">
                  {awayForm.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-arena-gray/20 border border-arena-gray/30">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        f.result === 'W' ? 'bg-arena-success/20 text-arena-success' :
                        f.result === 'L' ? 'bg-arena-red/20 text-arena-red' :
                        'bg-arena-gray text-arena-text-secondary'
                      }`}>
                        {f.result === 'W' ? <ArrowUpRight className="w-3 h-3" /> :
                         f.result === 'L' ? <ArrowDownRight className="w-3 h-3" /> :
                         <Minus className="w-3 h-3" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{f.opponent}</p>
                        <p className="text-[10px] text-arena-text-secondary">{f.venue} • {f.score}</p>
                      </div>
                      <span className="text-[10px] text-arena-text-secondary">
                        {new Date(f.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
} 