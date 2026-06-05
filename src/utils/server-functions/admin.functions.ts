import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const createUserAdmin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; role: 'user' | 'admin' }) => d)
  .handler(async ({ data, context }) => {
    // verify caller is admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: me } = await sb.from('profiles').select('role').eq('id', context.userId).maybeSingle();
    if (me?.role !== 'admin') throw new Error('Acesso negado');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
    });
    if (error) throw new Error(error.message);
    await admin.from('profiles').upsert({ id: created.user.id, role: data.role, onboarding_completed: false });
    return { ok: true, id: created.user.id };
  });

export const deleteUserAdmin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: me } = await sb.from('profiles').select('role').eq('id', context.userId).maybeSingle();
    if (me?.role !== 'admin') throw new Error('Acesso negado');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
