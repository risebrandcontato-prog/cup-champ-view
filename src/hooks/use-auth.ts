import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[useAuth] Erro ao buscar profile:', error.message);
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const profile = data as Profile | null;
    setState((s) => ({
      ...s,
      profile,
      isAdmin: profile?.role === 'admin',
      loading: false,
    }));
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const user = session?.user ?? null;
      setState((s) => ({ ...s, session, user }));

      if (user) {
        setTimeout(() => fetchProfile(user.id), 0);
      } else {
        setState({ session: null, user: null, profile: null, loading: false, isAdmin: false });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      const user = session?.user ?? null;
      setState((s) => ({ ...s, session, user }));

      if (user) {
        fetchProfile(user.id);
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return state;
}

// Exporta supabase tipado para queries diretas
export { supabase };

// LEGACY: Mantém compatibilidade com código antigo que usa `db`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;