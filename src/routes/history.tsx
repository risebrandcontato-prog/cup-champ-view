import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db, useAuth } from '@/hooks/use-auth';
import type { Analysis, UserBet } from '@/types';
import { SPORTS } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/history')({ component: HistoryPage });

interface Row { bet: UserBet; analysis: Analysis }

function HistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: bets } = await db.from('user_bets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      const list = (bets as UserBet[]) ?? [];
      if (!list.length) { setRows([]); return; }
      const ids = list.map((b) => b.analysis_id);
      const { data: analyses } = await db.from('analyses').select('*').in('id', ids);
      const map = new Map<string, Analysis>((analyses as Analysis[] ?? []).map((a) => [a.id, a]));
      setRows(list.map((b) => ({ bet: b, analysis: map.get(b.analysis_id)! })).filter((r) => r.analysis));
    })();
  }, [user]);

  if (rows === null) return <AppShell><div className="flex justify-center pt-12"><Loader2 className="w-6 h-6 animate-spin text-arena-green" /></div></AppShell>;

  const greens = rows.filter((r) => r.bet.result_status === 'green').length;
  const reds = rows.filter((r) => r.bet.result_status === 'red').length;
  const profit = rows.reduce((s, r) => s + Number(r.bet.profit_loss), 0);
  const rate = greens + reds ? Math.round((greens / (greens + reds)) * 100) : 0;

  return (
    <AppShell>
      <h1 className="text-2xl font-black mb-4">Meu Histórico</h1>
      <div className="grid grid-cols-4 gap-2 mb-5">
        <Mini label="Greens" value={greens} color="text-arena-success" />
        <Mini label="Reds" value={reds} color="text-arena-red" />
        <Mini label="Acerto" value={`${rate}%`} color="text-arena-gold" />
        <Mini label="Lucro" value={`R$${profit.toFixed(0)}`} color={profit >= 0 ? 'text-arena-success' : 'text-arena-red'} />
      </div>

      <div className="space-y-2">
        {rows.length === 0 && <p className="text-center text-arena-text-secondary py-12">Nenhuma aposta registrada ainda.</p>}
        {rows.map((r) => {
          const meta = SPORTS.find((s) => s.id === r.analysis.sport_type) ?? SPORTS[0];
          return (
            <div key={r.bet.id} className="rounded-xl border border-arena-gray bg-arena-dark p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-arena-text-secondary">{new Date(r.bet.created_at).toLocaleDateString('pt-BR')}</span>
                <span className="px-2 py-0.5 rounded-full bg-arena-gray text-[10px] font-bold uppercase" style={{ color: meta.color }}>{meta.name}</span>
              </div>
              <p className="font-semibold text-sm leading-tight">{r.analysis.title}</p>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className={`font-bold ${r.bet.did_bet ? 'text-arena-green' : 'text-arena-text-secondary'}`}>{r.bet.did_bet ? '✓ Apostei' : '✗ Não apostei'}</span>
                <span className="font-bold">
                  {r.bet.result_status === 'pending' && <span className="text-arena-text-secondary">⏳ Pendente</span>}
                  {r.bet.result_status === 'green' && <span className="text-arena-success">🟢 GREEN +R${Number(r.bet.profit_loss).toFixed(2)}</span>}
                  {r.bet.result_status === 'red' && <span className="text-arena-red">🔴 RED R${Number(r.bet.profit_loss).toFixed(2)}</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function Mini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-arena-gray bg-arena-dark p-2 text-center">
      <p className={`font-black text-sm ${color}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-arena-text-secondary">{label}</p>
    </div>
  );
}
