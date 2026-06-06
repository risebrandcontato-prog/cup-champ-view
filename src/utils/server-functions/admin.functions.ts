import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// ─── Schemas de validação Zod (produção: nunca confie no client) ───
const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha mínima 6 caracteres').max(128),
  role: z.enum(['user', 'admin']),
});

const deleteUserSchema = z.object({
  userId: z.string().uuid('UUID inválido'),
});

// ─── Helper tipado para verificar admin ───
interface ProfileRow {
  role: 'admin' | 'user';
}

async function verifyAdmin(userId: string): Promise<void> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error('Erro ao verificar permissões');
  }

  if (profile?.role !== 'admin') {
    throw new Error('Acesso negado: administrador necessário');
  }
}

// ─── Server Function: Criar usuário ───
export const createUserAdmin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    // Validação manual com Zod
    const parsed = createUserSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.errors.map(e => e.message).join(', '));
    }

    const validData = parsed.data;
    await verifyAdmin(context.userId);

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validData.email,
      password: validData.password,
      email_confirm: true,
    });

    if (authError || !created.user) {
      throw new Error(authError?.message ?? 'Falha ao criar usuário');
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: created.user.id,
        role: validData.role,
        onboarding_completed: false,
      });

    if (profileError) {
      // Rollback: deleta o auth.user se o profile falhou
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error('Falha ao criar perfil do usuário');
    }

    return { ok: true as const, id: created.user.id };
  });

// ─── Server Function: Deletar usuário ───
export const deleteUserAdmin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    // Validação manual com Zod
    const parsed = deleteUserSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.errors.map(e => e.message).join(', '));
    }

    const validData = parsed.data;
    await verifyAdmin(context.userId);

    // Impede auto-deleção
    if (validData.userId === context.userId) {
      throw new Error('Não é possível deletar sua própria conta');
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(validData.userId);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true as const };
  });