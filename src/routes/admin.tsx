import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, Users, TrendingUp, Newspaper, Gift, Settings, LogOut, Menu, Shield, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const Route = createFileRoute('/admin')({ component: AdminLayout });

interface NavItem { to: string; icon: typeof LayoutDashboard; label: string; exact?: boolean }
const items: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/users', icon: Users, label: 'Usuários' },
  { to: '/admin/analyses', icon: TrendingUp, label: 'Análises' },
  { to: '/admin/news', icon: Newspaper, label: 'Notícias' },
  { to: '/admin/bonuses', icon: Gift, label: 'Bônus' },
  { to: '/admin/settings', icon: Settings, label: 'Suporte' },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: '/login' }); return; }
    if (profile && profile.role !== 'admin') { navigate({ to: '/' }); }
  }, [user, profile, loading, navigate]);

  if (loading || !profile) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-arena-green" /></div>;
  if (profile.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-arena-dark border-r border-arena-gray flex-col">
        <SidebarContent />
      </aside>
      {/* Mobile drawer */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden glass border-b border-arena-gray h-14 px-4 flex items-center justify-between pt-safe">
          <Sheet>
            <SheetTrigger className="p-2 rounded-lg hover:bg-arena-gray"><Menu className="w-5 h-5" /></SheetTrigger>
            <SheetContent side="left" className="bg-arena-dark border-arena-gray p-0 w-64"><SidebarContent /></SheetContent>
          </Sheet>
          <span className="font-black text-arena-gold text-sm flex items-center gap-1"><Shield className="w-4 h-4" /> ADMIN</span>
          <Link to="/" className="text-xs text-arena-text-secondary">Sair admin</Link>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}

function SidebarContent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const logout = async () => { await supabase.auth.signOut(); navigate({ to: '/login' }); };
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-arena-gray">
        <p className="font-black text-arena-gold tracking-tight">APOSTA RESTRITA</p>
        <p className="text-[10px] uppercase tracking-widest text-arena-text-secondary mt-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Painel Admin</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-arena-green/15 text-arena-green border-l-2 border-arena-green' : 'text-arena-text-secondary hover:text-white hover:bg-arena-gray/40'}`}>
              <Icon className="w-4 h-4" /> {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-arena-gray space-y-2">
        <Link to="/" className="block px-3 py-2 rounded-xl text-xs text-arena-text-secondary hover:text-white">← Voltar ao app</Link>
        <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-arena-red hover:bg-arena-red/10"><LogOut className="w-3 h-3" /> Sair</button>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h1>
      {action}
    </div>
  );
}
