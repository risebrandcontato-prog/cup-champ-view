// src/hooks/use-access.ts
// Controle de acesso — Verifica se usuário tem acesso VIP ativo
// Anti-flicker: loading=true até auth resolver completamente

import { useMemo } from 'react';
import { useAuth } from './use-auth';

export type AccessLevel = 'vip' | 'free' | 'expired' | 'blocked';

export interface AccessResult {
  level: AccessLevel;
  hasAccess: boolean;
  reason: string;
  expiresAt: Date | null;
  daysRemaining: number;
  isTrial: boolean;
  isLifetime: boolean;
  loading: boolean;
}

export function useAccess(): AccessResult {
  const { profile, loading: authLoading } = useAuth();

  return useMemo(() => {
    // ─── Loading: aguarda auth resolver para evitar flicker ───
    if (authLoading) {
      return {
        level: 'free' as AccessLevel,
        hasAccess: false,
        reason: 'Carregando...',
        expiresAt: null,
        daysRemaining: 0,
        isTrial: false,
        isLifetime: false,
        loading: true,
      };
    }

    // ─── Sem perfil: não autenticado ───
    if (!profile) {
      return {
        level: 'free' as AccessLevel,
        hasAccess: false,
        reason: 'Não autenticado',
        expiresAt: null,
        daysRemaining: 0,
        isTrial: false,
        isLifetime: false,
        loading: false,
      };
    }

    // ─── Admin sempre tem acesso total ───
    if (profile.role === 'admin') {
      return {
        level: 'vip' as AccessLevel,
        hasAccess: true,
        reason: 'Acesso admin',
        expiresAt: null,
        daysRemaining: Infinity,
        isTrial: false,
        isLifetime: true,
        loading: false,
      };
    }

    // ─── Bloqueado manualmente ───
    if (profile.is_active === false || profile.access_type === 'blocked') {
      return {
        level: 'blocked' as AccessLevel,
        hasAccess: false,
        reason: 'Conta bloqueada',
        expiresAt: null,
        daysRemaining: 0,
        isTrial: false,
        isLifetime: false,
        loading: false,
      };
    }

    // ─── Vitalício: acesso eterno ───
    if (profile.access_type === 'lifetime') {
      return {
        level: 'vip' as AccessLevel,
        hasAccess: true,
        reason: 'Acesso vitalício',
        expiresAt: null,
        daysRemaining: Infinity,
        isTrial: false,
        isLifetime: true,
        loading: false,
      };
    }

    // ─── Gratuito: sem acesso VIP ───
    if (profile.access_type === 'free' || !profile.access_type) {
      return {
        level: 'free' as AccessLevel,
        hasAccess: false,
        reason: 'Conta gratuita — assine para acesso VIP',
        expiresAt: null,
        daysRemaining: 0,
        isTrial: false,
        isLifetime: false,
        loading: false,
      };
    }

    // ─── Tipos com prazo: trial, weekly, monthly, yearly ───
    // Prioriza access_expires_at (calculado pelo server) sobre access_days
    const expiresAt = profile.access_expires_at
      ? new Date(profile.access_expires_at)
      : profile.access_started_at && profile.access_days
      ? new Date(
          new Date(profile.access_started_at).getTime() +
          profile.access_days * 24 * 60 * 60 * 1000
        )
      : null;

    // Sem data de expiração definida: concede acesso (configuração incompleta)
    if (!expiresAt) {
      return {
        level: 'vip' as AccessLevel,
        hasAccess: true,
        reason: 'Acesso ativo',
        expiresAt: null,
        daysRemaining: Infinity,
        isTrial: profile.access_type === 'trial',
        isLifetime: false,
        loading: false,
      };
    }

    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // ─── Expirado ───
    if (daysRemaining < 0) {
      return {
        level: 'expired' as AccessLevel,
        hasAccess: false,
        reason: `Acesso expirado há ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}`,
        expiresAt,
        daysRemaining: 0,
        isTrial: profile.access_type === 'trial',
        isLifetime: false,
        loading: false,
      };
    }

    // ─── Ativo com prazo ───
    const accessLabel =
      profile.access_type === 'trial' ? 'Trial' :
      profile.access_type === 'weekly' ? 'Semanal' :
      profile.access_type === 'monthly' ? 'Mensal' :
      profile.access_type === 'yearly' ? 'Anual' : 'Acesso';

    return {
      level: 'vip' as AccessLevel,
      hasAccess: true,
      reason: `${accessLabel} — ${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`,
      expiresAt,
      daysRemaining,
      isTrial: profile.access_type === 'trial',
      isLifetime: false,
      loading: false,
    };
  }, [profile, authLoading]);
}

// Helper para componentes que precisam só de boolean
export function useHasAccess(): boolean {
  const { hasAccess, loading } = useAccess();
  return hasAccess && !loading;
}