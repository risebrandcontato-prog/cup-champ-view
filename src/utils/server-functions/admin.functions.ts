// src/utils/server-functions/admin.functions.ts
// Server Functions Admin — CRUD de usuários com controle de acesso
// TanStack Start v1.167.50 — usa .inputValidator() para tipagem correta do handler

import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// ─── Schemas Zod ───────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email:      z.string().email('Email inválido'),
  password:   z.string().min(6, 'Senha mínima 6 caracteres').max(128),
  role:       z.enum(['user', 'admin']),
  accessType: z.enum(['trial', 'weekly', 'monthly', 'yearly', 'lifetime', 'free', 'blocked']).default('trial'),
  accessDays: z.number().int().min(0).max(365).optional(),
});

const deleteUserSchema = z.object({
  userId: z.string().uuid('UUID inválido'),
});

const updateAccessSchema = z.object({
  userId:     z.string().uuid('UUID inválido'),
  accessType: z.enum(['trial', 'weekly', 'monthly', 'yearly', 'lifetime', 'free', 'blocked']),
  accessDays: z.number().int().min(0).max(365).optional(),
});

// ─── Tipos exportados ──────────────────────────────────────────────────────────

export type CreateUserInput   = z.infer<typeof createUserSchema>;
export type DeleteUserInput   = z.infer<typeof deleteUserSchema>;
export type UpdateAccessInput = z.infer<typeof updateAccessSchema>;

// ─── Constantes internas ───────────────────────────────────────────────────────

const TIMELESS = new Set(['lifetime', 'free', 'blocked']);

const DEFAULT_DAYS: Record<string, number> = {
  trial:   2,
  weekly:  7,
  monthly: 30,
  yearly:  365,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function calcExpiresAt(accessType: string, days?: number): string | null {
  if (TIMELESS.has(accessType)) return null;
  const d = days ?? DEFAULT_DAYS[accessType] ?? 2;
  if (d <= 0) return null;
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
}

function resolveAccessDays(accessType: string, days?: number): number | null {
  if (TIMELESS.has(accessType)) return null;
  return days ?? DEFAULT_DAYS[accessType] ?? 2;
}

async function verifyAdmin(): Promise<string> {
  const request = getRequest();
  if (!request?.headers) throw new Error('Unauthorized: No request headers');

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized: Invalid authorization header');

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized: Invalid token');

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') throw new Error('Acesso negado: administrador necessário');

  return user.id;
}

// ─── Server Function: Criar usuário ───────────────────────────────────────────

export const createUserAdmin = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data }) => {
    const adminId = await verifyAdmin();
    void adminId;

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:         data.email,
      password:      data.password,
      email_confirm: true,
    });

    if (authError || !created.user) throw new Error(authError?.message ?? 'Falha ao criar usuário');

    const effectiveDays = resolveAccessDays(data.accessType, data.accessDays);
    const expiresAt     = calcExpiresAt(data.accessType, data.accessDays);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id:                   created.user.id,
        role:                 data.role,
        onboarding_completed: false,
        access_type:          data.accessType,
        access_days:          effectiveDays,
        access_started_at:    new Date().toISOString(),
        access_expires_at:    expiresAt,
        is_active:            data.accessType !== 'blocked',
      } as never);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error('Falha ao criar perfil do usuário');
    }

    return { ok: true as const, id: created.user.id };
  });

// ─── Server Function: Deletar usuário ─────────────────────────────────────────

export const deleteUserAdmin = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => deleteUserSchema.parse(input))
  .handler(async ({ data }) => {
    const adminId = await verifyAdmin();

    if (data.userId === adminId) throw new Error('Não é possível deletar sua própria conta');

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });

// ─── Server Function: Atualizar acesso ────────────────────────────────────────

export const updateUserAccess = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => updateAccessSchema.parse(input))
  .handler(async ({ data }) => {
    const adminId = await verifyAdmin();

    if (data.userId === adminId) throw new Error('Não é possível alterar seu próprio acesso');

    const effectiveDays = resolveAccessDays(data.accessType, data.accessDays);
    const expiresAt     = calcExpiresAt(data.accessType, data.accessDays);

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        access_type:       data.accessType,
        access_days:       effectiveDays,
        access_started_at: new Date().toISOString(),
        access_expires_at: expiresAt,
        is_active:         data.accessType !== 'blocked',
      } as never)
      .eq('id', data.userId);

    if (error) throw new Error(error.message);

    return { ok: true as const };
  });