import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from './admin';
import { db } from '@/hooks/use-auth';
import { Users, TrendingUp, Target, Wallet } from 'lucide-react';

export const Route = createFileRoute('/admin/')({ component: AdminDashboard });

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, analyses: 0, green: 0, banca: 0 });
  useEffect(() => {
    (async () => {
      const [u, a, g, b] = await Promise.all([
        db.from('profiles').select('id', { count: 'exact', head: true }),
        db.from('analyses').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
        db.from('analyses').select('id', { count: 'exact', head: true }).eq('status', 'green'),
        db.from('bankrolls').select('current_balance').eq('is_active', true),
      ]);
      const totalBanca = (b.data ?? []).reduce((s: number, x: { current_balance: number }) => s + Number(x.current_balance ?? 0), 0);
      setStats({ users: u.count ?? 0, analyses: a.count ?? 0, green: g.count ?? 0, banca: totalBanca });
    })();
  }, []);

  return (
    <>
      <AdminPageHeader title="Dashboard" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total de Usuários" value={stats.users} color="text-arena-green" />
        <StatCard icon={TrendingUp} label="Análises (24h)" value={stats.analyses} color="text-arena-gold" />
        <StatCard icon={Target} label="Greens" value={stats.green} color="text-arena-success" />
        <StatCard icon={Wallet} label="Banca Ativa" value={`R$ ${stats.banca.toFixed(0)}`} color="text-white" />
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
      <Icon className={`w-5 h-5 ${color}`} />
      <p className={`text-2xl font-black mt-3 ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-arena-text-secondary mt-1">{label}</p>
    </div>
  );
}
