import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

// Untyped supabase to bypass not-yet-generated table types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, user: null, profile: null, loading: true });

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (userId: string) => {
      const { data } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (mounted) setState((s) => ({ ...s, profile: (data as Profile | null) ?? null, loading: false }));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setState({ session: null, user: null, profile: null, loading: false });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) fetchProfile(session.user.id);
      else setState((s) => ({ ...s, loading: false }));
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}
