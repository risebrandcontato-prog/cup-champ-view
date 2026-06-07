// src/hooks/use-team-logo.ts
// Hook para buscar escudo do time (Storage-first)

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface UseTeamLogoReturn {
  logo: string | null
  loading: boolean
  error: boolean
}

export function useTeamLogo(
  apiSportsLogo: string | null,
  teamId: number,
  teamName: string
): UseTeamLogoReturn {
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const fetchBadge = useCallback(async () => {
    setLoading(true)
    setError(false)

    try {
      // 1. Verificar se já tem no banco (Storage)
      const { data: existing } = await supabase
        .from('team_badges')
        .select('badge_url')
        .eq('team_id', teamId)
        .maybeSingle()

      if (existing?.badge_url) {
        setLogo(existing.badge_url)
        setLoading(false)
        return
      }

      // 2. Chamar Edge Function para baixar e salvar
      const { data, error: fnError } = await supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'team-badge',
          params: {
            teamId,
            teamName,
            apiSportsLogo,
          },
        },
      })

      if (fnError) throw new Error(fnError.message)

      const response = data as { badge: string | null; source: string }
      
      if (response.badge) {
        setLogo(response.badge)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('[useTeamLogo] Failed:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [teamId, teamName, apiSportsLogo])

  useEffect(() => {
    if (teamId && teamName) {
      fetchBadge()
    }
  }, [fetchBadge])

  return { logo, loading, error }
}