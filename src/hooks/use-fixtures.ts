// src/hooks/use-fixtures.ts
// Hook para buscar jogos do dia via Edge Function com cache

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface FixtureTeam {
  id: number
  name: string
  logo: string
  winner: boolean | null
}

export interface Fixture {
  fixture: {
    id: number
    date: string
    timestamp: number
    timezone: string
    status: {
      short: string
      long: string
      elapsed: number | null
    }
    venue: {
      name: string | null
      city: string | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    season: number
    round: string | null
  }
  teams: {
    home: FixtureTeam
    away: FixtureTeam
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
  }
}

export interface FixturesResponse {
  data: {
    response: Fixture[]
    results: number
    errors: unknown[]
  }
  cached: boolean
  cached_at?: string
  fetched_at?: string
}

interface UseFixturesReturn {
  fixtures: Fixture[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFixtures(date?: string): UseFixturesReturn {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFixtures = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Se não passar data, usa hoje
      const targetDate = date || new Date().toISOString().split('T')[0]

      const { data, error: fnError } = await supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'fixtures',
          params: {
            date: targetDate,
            timezone: 'America/Sao_Paulo',
          },
        },
      })

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao buscar jogos')
      }

      const response = data as FixturesResponse

      if (response.data?.errors?.length > 0) {
        console.warn('[useFixtures] API errors:', response.data.errors)
      }

      const items = response.data?.response || []
      setFixtures(items)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useFixtures]', message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchFixtures()
  }, [fetchFixtures])

  return {
    fixtures,
    loading,
    error,
    refetch: fetchFixtures,
  }
}

// Hook para buscar detalhes de um jogo específico
export function useFixtureDetails(fixtureId: number | null) {
  const [fixture, setFixture] = useState<Fixture | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetails = useCallback(async () => {
    if (!fixtureId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('api-football', {
        body: {
          endpoint: 'fixtures',
          params: { id: fixtureId },
        },
      })

      if (fnError) throw new Error(fnError.message)

      const response = data as FixturesResponse
      const items = response.data?.response || []
      setFixture(items[0] || null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [fixtureId])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  return { fixture, loading, error, refetch: fetchDetails }
}