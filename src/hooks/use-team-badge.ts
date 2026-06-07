import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamBadge {
  id: number;
  name: string;
  logo: string;
  country: string;
  founded: number | null;
}

export function useTeamBadge(teamName: string | null | undefined) {
  const [badge, setBadge] = useState<TeamBadge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBadge = useCallback(async () => {
    if (!teamName || teamName.trim().length < 2) {
      setBadge(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verificar se já tem no banco (team_badges)
      const { data: existing } = await supabase
        .from('team_badges')
        .select('*')
        .ilike('team_name', `%${teamName}%`)
        .maybeSingle();

      if (existing) {
        setBadge({
          id: existing.team_id,
          name: existing.team_name,
          logo: existing.badge_url,
          country: '',
          founded: null,
        });
        setLoading(false);
        return;
      }

      // 2. Buscar na API-Sports via Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'teams',
          params: { search: teamName },
        },
      });

      if (fnError) throw new Error(fnError.message);

      const response = data?.data?.response || [];
      const team = response[0];

      if (team?.team?.id) {
        const badgeData: TeamBadge = {
          id: team.team.id,
          name: team.team.name,
          logo: team.team.logo || '',
          country: team.team.country || '',
          founded: team.team.founded || null,
        };

        // Salvar no banco para cache
        await supabase.from('team_badges').upsert({
          team_id: badgeData.id,
          team_name: badgeData.name,
          badge_url: badgeData.logo,
          source: 'api-sports',
        }, { onConflict: 'team_id' });

        setBadge(badgeData);
      } else {
        setBadge(null);
      }
    } catch (err) {
      console.error('[useTeamBadge] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar escudo');
      setBadge(null);
    } finally {
      setLoading(false);
    }
  }, [teamName]);

  useEffect(() => {
    fetchBadge();
  }, [fetchBadge]);

  return { badge, loading, error, refetch: fetchBadge };
}