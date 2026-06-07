import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FixtureOdds {
  bookmaker: string;
  values: { value: string; odd: string }[];
}

export interface LineupPlayer {
  name: string;
  number: number | null;
  pos: string | null;
}

export interface Lineup {
  teamName: string;
  teamLogo: string;
  formation: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface H2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  league: string;
}

export interface TeamForm {
  date: string;
  opponent: string;
  result: 'W' | 'D' | 'L';
  score: string;
  venue: string;
}

export interface FixtureStatistic {
  type: string;
  value: string | number | null;
}

export interface TeamStatistics {
  team: string;
  logo: string;
  stats: FixtureStatistic[];
}

export interface FixtureData {
  fixture: {
    id: number;
    status: string;
    statusLong: string;
    elapsed: number | null;
    venue: string;
    referee: string | null;
    timestamp: number;
    timezone: string;
    date: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  odds: FixtureOdds[];
  lineups: Lineup[];
  h2h: H2HMatch[];
  statistics: TeamStatistics[];
  homeForm: TeamForm[];
  awayForm: TeamForm[];
}

export function useFixtureData(fixtureId: number | null | undefined) {
  const [data, setData] = useState<FixtureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!fixtureId) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fixture details
      const { data: fixtureRes, error: fixtureErr } = await supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'fixtures',
          params: { id: fixtureId },
        },
      });

      if (fixtureErr) throw new Error(`Erro ao buscar jogo: ${fixtureErr.message}`);
      const fixtureRaw = fixtureRes?.response?.[0];
      if (!fixtureRaw) throw new Error('Jogo não encontrado na API');

      const homeTeamId = fixtureRaw.teams?.home?.id;
      const awayTeamId = fixtureRaw.teams?.away?.id;
      if (!homeTeamId || !awayTeamId) throw new Error('Dados dos times incompletos');

      // 2. Odds
      const oddsPromise = supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'odds',
          params: { fixture: fixtureId },
        },
      });

      // 3. Lineups
      const lineupsPromise = supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'fixtures/lineups',
          params: { fixture: fixtureId },
        },
      });

      // 4. H2H
      const h2hPromise = supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'fixtures/headtohead',
          params: { h2h: `${homeTeamId}-${awayTeamId}` },
        },
      });

      // 5. Statistics
      const statsPromise = supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'fixtures/statistics',
          params: { fixture: fixtureId },
        },
      });

      // 6. Home form (last 5)
      const homeFormPromise = supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'fixtures',
          params: { team: homeTeamId, last: 5 },
        },
      });

      // 7. Away form (last 5)
      const awayFormPromise = supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'fixtures',
          params: { team: awayTeamId, last: 5 },
        },
      });

      const [
        { data: oddsData },
        { data: lineupsData },
        { data: h2hData },
        { data: statsData },
        { data: homeFormData },
        { data: awayFormData },
      ] = await Promise.all([
        oddsPromise,
        lineupsPromise,
        h2hPromise,
        statsPromise,
        homeFormPromise,
        awayFormPromise,
      ]);

      // Parse odds
      const odds: FixtureOdds[] = [];
      if (oddsData?.response && Array.isArray(oddsData.response)) {
        for (const odd of oddsData.response) {
          const bookmakerName = odd?.bookmaker?.name || 'Desconhecida';
          const bets = odd?.bets || [];
          const mainBet = bets[0];
          if (mainBet?.values) {
            odds.push({
              bookmaker: bookmakerName,
              values: mainBet.values.map((v: any) => ({
                value: String(v.value || ''),
                odd: String(v.odd || ''),
              })),
            });
          }
        }
      }

      // Parse lineups
      const lineups: Lineup[] = [];
      if (lineupsData?.response && Array.isArray(lineupsData.response)) {
        for (const lu of lineupsData.response) {
          const teamName = lu?.team?.name || '';
          const teamLogo = lu?.team?.logo || '';
          const formation = lu?.formation || '-';
          const startXI = (lu?.startXI || []).map((p: any) => ({
            name: p?.player?.name || '',
            number: p?.player?.number ?? null,
            pos: p?.player?.pos || null,
          }));
          const substitutes = (lu?.substitutes || []).map((p: any) => ({
            name: p?.player?.name || '',
            number: p?.player?.number ?? null,
            pos: p?.player?.pos || null,
          }));
          lineups.push({ teamName, teamLogo, formation, startXI, substitutes });
        }
      }

      // Parse H2H
      const h2h: H2HMatch[] = [];
      if (h2hData?.response && Array.isArray(h2hData.response)) {
        for (const m of h2hData.response.slice(0, 5)) {
          h2h.push({
            date: m?.fixture?.date || '',
            homeTeam: m?.teams?.home?.name || '',
            awayTeam: m?.teams?.away?.name || '',
            homeScore: m?.goals?.home ?? null,
            awayScore: m?.goals?.away ?? null,
            league: m?.league?.name || '',
          });
        }
      }

      // Parse statistics
      const statistics: TeamStatistics[] = [];
      if (statsData?.response && Array.isArray(statsData.response)) {
        for (const s of statsData.response) {
          const teamName = s?.team?.name || '';
          const teamLogo = s?.team?.logo || '';
          const stats = (s?.statistics || []).map((st: any) => ({
            type: st?.type || '',
            value: st?.value ?? null,
          }));
          statistics.push({ team: teamName, logo: teamLogo, stats });
        }
      }

      // Parse home form
      const homeForm: TeamForm[] = [];
      if (homeFormData?.response && Array.isArray(homeFormData.response)) {
        for (const m of homeFormData.response) {
          const isHome = m?.teams?.home?.id === homeTeamId;
          const team = isHome ? m?.teams?.home : m?.teams?.away;
          const opponent = isHome ? m?.teams?.away : m?.teams?.home;
          const teamGoals = isHome ? m?.goals?.home : m?.goals?.away;
          const oppGoals = isHome ? m?.goals?.away : m?.goals?.home;
          let result: 'W' | 'D' | 'L' = 'D';
          if (team?.winner === true) result = 'W';
          else if (team?.winner === false) result = 'L';
          homeForm.push({
            date: m?.fixture?.date || '',
            opponent: opponent?.name || '',
            result,
            score: `${teamGoals ?? '-'}x${oppGoals ?? '-'}`,
            venue: isHome ? 'Casa' : 'Fora',
          });
        }
      }

      // Parse away form
      const awayForm: TeamForm[] = [];
      if (awayFormData?.response && Array.isArray(awayFormData.response)) {
        for (const m of awayFormData.response) {
          const isHome = m?.teams?.home?.id === awayTeamId;
          const team = isHome ? m?.teams?.home : m?.teams?.away;
          const opponent = isHome ? m?.teams?.away : m?.teams?.home;
          const teamGoals = isHome ? m?.goals?.home : m?.goals?.away;
          const oppGoals = isHome ? m?.goals?.away : m?.goals?.home;
          let result: 'W' | 'D' | 'L' = 'D';
          if (team?.winner === true) result = 'W';
          else if (team?.winner === false) result = 'L';
          awayForm.push({
            date: m?.fixture?.date || '',
            opponent: opponent?.name || '',
            result,
            score: `${teamGoals ?? '-'}x${oppGoals ?? '-'}`,
            venue: isHome ? 'Casa' : 'Fora',
          });
        }
      }

      setData({
        fixture: {
          id: fixtureRaw.fixture?.id ?? fixtureId,
          status: fixtureRaw.fixture?.status?.short || 'NS',
          statusLong: fixtureRaw.fixture?.status?.long || 'Não iniciado',
          elapsed: fixtureRaw.fixture?.status?.elapsed ?? null,
          venue: fixtureRaw.fixture?.venue?.name || '',
          referee: fixtureRaw.fixture?.referee || null,
          timestamp: fixtureRaw.fixture?.timestamp ?? 0,
          timezone: fixtureRaw.fixture?.timezone || '',
          date: fixtureRaw.fixture?.date || '',
        },
        league: {
          id: fixtureRaw.league?.id ?? 0,
          name: fixtureRaw.league?.name || '',
          country: fixtureRaw.league?.country || '',
          logo: fixtureRaw.league?.logo || '',
          season: fixtureRaw.league?.season ?? 0,
          round: fixtureRaw.league?.round || '',
        },
        teams: {
          home: {
            id: fixtureRaw.teams?.home?.id ?? 0,
            name: fixtureRaw.teams?.home?.name || '',
            logo: fixtureRaw.teams?.home?.logo || '',
            winner: fixtureRaw.teams?.home?.winner ?? null,
          },
          away: {
            id: fixtureRaw.teams?.away?.id ?? 0,
            name: fixtureRaw.teams?.away?.name || '',
            logo: fixtureRaw.teams?.away?.logo || '',
            winner: fixtureRaw.teams?.away?.winner ?? null,
          },
        },
        goals: {
          home: fixtureRaw.goals?.home ?? null,
          away: fixtureRaw.goals?.away ?? null,
        },
        odds,
        lineups,
        h2h,
        statistics,
        homeForm,
        awayForm,
      });
    } catch (err) {
      console.error('[useFixtureData] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do jogo');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}