import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronRight, Clock, Trophy, Users } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Team {
  name: string;
  shortName: string;
  crest: string;
}

interface Score {
  home: number | null;
  away: number | null;
}

interface Match {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    fullTime: Score;
    halfTime: Score;
  };
}

interface StandingRow {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface StandingGroup {
  stage: string;
  type: string;
  group: string;
  table: StandingRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  IN_PLAY: "AO VIVO",
  PAUSED: "INTERVALO",
  FINISHED: "Encerrado",
  SCHEDULED: "Agendado",
  TIMED: "Agendado",
  POSTPONED: "Adiado",
  CANCELLED: "Cancelado",
};

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  LAST_32: "Oitavas",
  LAST_16: "Oitavas de Final",
  QUARTER_FINALS: "Quartas de Final",
  SEMI_FINALS: "Semifinais",
  THIRD_PLACE: "3º Lugar",
  FINAL: "Final",
};

function toBrasilia(utcDate: string) {
  const date = new Date(utcDate);
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toTimeOnly(utcDate: string) {
  const date = new Date(utcDate);
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateOnly(utcDate: string) {
  const date = new Date(utcDate);
  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function isLive(status: string) {
  return status === "IN_PLAY" || status === "PAUSED";
}

function isFinished(status: string) {
  return status === "FINISHED";
}

// ─── Chamada à Edge Function ──────────────────────────────────────────────────

async function fetchCopa(endpoint: "live" | "today" | "standings" | "upcoming") {
  const { data, error } = await supabase.functions.invoke("copa-proxy", {
    body: { endpoint },
  });
  if (error) throw error;
  return data?.data;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function MatchCard({ match, highlight = false }: { match: Match; highlight?: boolean }) {
  const live = isLive(match.status);
  const finished = isFinished(match.status);
  const scoreHome = match.score.fullTime.home;
  const scoreAway = match.score.fullTime.away;

  return (
    <div
      className={`rounded-xl p-3 mb-2 transition-all ${
        highlight
          ? "bg-arena-green/10 border border-arena-green/40 shadow-[0_0_12px_rgba(0,200,83,0.15)]"
          : "bg-arena-gray/50 border border-white/5"
      }`}
    >
      {/* Badge status + grupo */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-arena-text-secondary uppercase tracking-wider">
          {match.group
            ? `Grupo ${match.group.replace("GROUP_", "")}`
            : STAGE_LABELS[match.stage] || match.stage}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            live
              ? "bg-arena-green text-black animate-pulse"
              : finished
              ? "bg-white/10 text-arena-text-secondary"
              : "bg-arena-gold/20 text-arena-gold"
          }`}
        >
          {STATUS_LABELS[match.status] || match.status}
        </span>
      </div>

      {/* Times + placar */}
      <div className="flex items-center gap-2">
        {/* Time casa */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <img
            src={match.homeTeam.crest}
            alt={match.homeTeam.shortName}
            className="w-6 h-6 object-contain flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="text-sm font-semibold text-white truncate">
            {match.homeTeam.shortName}
          </span>
        </div>

        {/* Placar */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {finished || live ? (
            <>
              <span className={`text-xl font-black tabular-nums ${live ? "text-arena-green" : "text-white"}`}>
                {scoreHome ?? 0}
              </span>
              <span className="text-arena-text-secondary font-bold mx-0.5">–</span>
              <span className={`text-xl font-black tabular-nums ${live ? "text-arena-green" : "text-white"}`}>
                {scoreAway ?? 0}
              </span>
            </>
          ) : (
            <span className="text-sm text-arena-gold font-semibold">
              {toTimeOnly(match.utcDate)}
            </span>
          )}
        </div>

        {/* Time fora */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-sm font-semibold text-white truncate text-right">
            {match.awayTeam.shortName}
          </span>
          <img
            src={match.awayTeam.crest}
            alt={match.awayTeam.shortName}
            className="w-6 h-6 object-contain flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      </div>

      {/* Data/hora se agendado */}
      {!finished && !live && (
        <p className="text-[10px] text-arena-text-secondary text-center mt-1.5">
          {toBrasilia(match.utcDate)} (Brasília)
        </p>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-arena-text-secondary">
      <Trophy className="w-8 h-8 mb-3 opacity-30" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2 mt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 bg-arena-gray/40 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

// ─── Abas ─────────────────────────────────────────────────────────────────────

function TabLive({ isOpen }: { isOpen: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["copa-live"],
    queryFn: () => fetchCopa("live"),
    enabled: isOpen,
    refetchInterval: isOpen ? 60_000 : false,
    staleTime: 30_000,
  });

  const matches: Match[] = data?.matches ?? [];
  const liveMatches = matches.filter((m) => isLive(m.status));

  if (isLoading) return <LoadingState />;
  if (error) return <EmptyState message="Não foi possível carregar os jogos." />;
  if (liveMatches.length === 0) {
    return <EmptyState message={"Nenhum jogo ao vivo agora.\nVerifique a aba Hoje para os próximos jogos."} />;
  }

  return (
    <div>
      <p className="text-xs text-arena-text-secondary mb-3">
        Atualiza automaticamente a cada 60s
      </p>
      {liveMatches.map((m) => (
        <MatchCard key={m.id} match={m} highlight />
      ))}
    </div>
  );
}

function TabToday() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["copa-today"],
    queryFn: () => fetchCopa("today"),
    staleTime: 5 * 60_000,
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ["copa-upcoming"],
    queryFn: () => fetchCopa("upcoming"),
    staleTime: 10 * 60_000,
  });

  if (isLoading || upcomingLoading) return <LoadingState />;
  if (error) return <EmptyState message="Não foi possível carregar os jogos." />;

  const todayMatches: Match[] = data?.matches ?? [];
  const upcomingMatches: Match[] = upcomingData?.matches ?? [];

  // Agrupar por data
  const groupByDate = (matches: Match[]) => {
    const groups: Record<string, Match[]> = {};
    matches.forEach((m) => {
      const date = toDateOnly(m.utcDate);
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    });
    return groups;
  };

  const todayGroups = groupByDate(todayMatches);
  const upcomingGroups = groupByDate(upcomingMatches);
  const allGroups = { ...todayGroups, ...upcomingGroups };

  if (Object.keys(allGroups).length === 0) {
    return <EmptyState message="Nenhum jogo nos próximos dias." />;
  }

  return (
    <div>
      {Object.entries(allGroups).map(([date, matches]) => (
        <div key={date} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3 h-3 text-arena-gold" />
            <span className="text-xs font-semibold text-arena-gold uppercase tracking-wider">
              {date}
            </span>
          </div>
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} highlight={isLive(m.status)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TabStandings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["copa-standings"],
    queryFn: () => fetchCopa("standings"),
    staleTime: 10 * 60_000,
  });

  const [selectedGroup, setSelectedGroup] = useState(0);

  if (isLoading) return <LoadingState />;
  if (error) return <EmptyState message="Não foi possível carregar a tabela." />;

  const standings: StandingGroup[] = data?.standings ?? [];
  const groups = standings.filter((s) => s.type === "TOTAL");

  if (groups.length === 0) {
    return <EmptyState message="Tabela de grupos não disponível ainda." />;
  }

  const current = groups[selectedGroup];
  const groupLetter = current?.group?.replace("GROUP_", "") ?? String.fromCharCode(65 + selectedGroup);

  return (
    <div>
      {/* Seletor de grupos */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {groups.map((g, i) => {
          const letter = g.group?.replace("GROUP_", "") ?? String.fromCharCode(65 + i);
          return (
            <button
              key={i}
              onClick={() => setSelectedGroup(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                selectedGroup === i
                  ? "bg-arena-green text-black"
                  : "bg-arena-gray/50 text-arena-text-secondary hover:bg-arena-gray"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden border border-white/5">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-2 items-center px-3 py-2 bg-arena-gray/60 text-[10px] font-semibold text-arena-text-secondary uppercase tracking-wider">
          <span>#</span>
          <span>Seleção</span>
          <span className="text-center">J</span>
          <span className="text-center">V</span>
          <span className="text-center">SG</span>
          <span className="text-center">PTS</span>
          <span></span>
        </div>

        {current?.table?.map((row, idx) => {
          const qualified = idx < 2; // top 2 classificam direto
          return (
            <div
              key={row.team.name}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-2 items-center px-3 py-2.5 border-t border-white/5 ${
                qualified ? "bg-arena-green/5" : ""
              }`}
            >
              <span className={`text-xs font-bold w-4 ${qualified ? "text-arena-green" : "text-arena-text-secondary"}`}>
                {row.position}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <img
                  src={row.team.crest}
                  alt={row.team.shortName}
                  className="w-4 h-4 object-contain flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="text-xs font-medium text-white truncate">
                  {row.team.shortName}
                </span>
              </div>
              <span className="text-xs text-arena-text-secondary text-center">{row.playedGames}</span>
              <span className="text-xs text-arena-text-secondary text-center">{row.won}</span>
              <span className={`text-xs text-center ${row.goalDifference > 0 ? "text-arena-green" : row.goalDifference < 0 ? "text-arena-red" : "text-arena-text-secondary"}`}>
                {row.goalDifference > 0 ? "+" : ""}{row.goalDifference}
              </span>
              <span className="text-xs font-bold text-white text-center">{row.points}</span>
              {qualified && (
                <ChevronRight className="w-3 h-3 text-arena-green" />
              )}
              {!qualified && <span />}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-arena-text-secondary mt-2 text-center">
        Verde = classificado para as oitavas
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Tab = "live" | "today" | "standings";

export function CopaDrawer() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("today");

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Bloquear scroll do body quando drawer aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "Ao Vivo" },
    { id: "today", label: "Jogos" },
    { id: "standings", label: "Grupos" },
  ];

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Copa do Mundo 2026"
        className="fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full
          bg-arena-dark border border-arena-gold/40
          shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_16px_rgba(212,175,55,0.15)]
          flex items-center justify-center
          hover:scale-110 hover:border-arena-gold/70 hover:shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(212,175,55,0.3)]
          active:scale-95 transition-all duration-200
          pb-safe"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <img
          src="/fifa26.png"
          alt="Copa 2026"
          className="w-10 h-10 object-contain"
        />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-full max-w-[420px]
          bg-arena-black border-l border-white/10
          shadow-[-8px_0_40px_rgba(0,0,0,0.6)]
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-safe pb-3 pt-4 border-b border-white/10 flex-shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
        >
          <img src="/fifa26.png" alt="Copa 2026" className="w-8 h-8 object-contain" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white leading-tight">Copa do Mundo 2026</h2>
            <p className="text-[10px] text-arena-text-secondary">11 Jun – 19 Jul • EUA, México, Canadá</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-arena-gray/50 hover:bg-arena-gray transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-arena-text-secondary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 flex-shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.id
                  ? "bg-arena-green text-black"
                  : "bg-arena-gray/50 text-arena-text-secondary hover:text-white"
              }`}
            >
              {t.label}
              {t.id === "live" && (
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
          {tab === "live" && <TabLive isOpen={open} />}
          {tab === "today" && <TabToday />}
          {tab === "standings" && <TabStandings />}
        </div>
      </div>
    </>
  );
}