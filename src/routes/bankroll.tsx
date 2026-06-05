import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db, useAuth } from '@/hooks/use-auth';
import type { Bankroll, DailyPlanItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Loader2, TrendingUp, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart } from 'recharts';

export const Route = createFileRoute('/bankroll')({ component: BankrollPage });

function BankrollPage() {
  const { user } = useAuth();
  const [bk, setBk] = useState<Bankroll | null>(null);
  const [loading, setLoading] = useState(true);

  // create form
  const [total, setTotal] = useState('');
  const [days, setDays] = useState('30');
  const [targetType, setTargetType] = useState<'fixed' | 'percentage'>('percentage');
  const [targetValue, setTargetValue] = useState('5');

  useEffect(() => {
    if (!user) return;
    db.from('bankrolls').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle().then(({ data }: { data: Bankroll | null }) => {
      setBk(data); setLoading(false);
    });
  }, [user]);

  const create = async () => {
    if (!user) return;
    const totalNum = parseFloat(total);
    const daysNum = parseInt(days);
    const tv = parseFloat(targetValue);
    if (!totalNum || !daysNum || !tv) { toast.error('Preencha todos os campos'); return; }
    const daily = totalNum / daysNum;
    const plan: DailyPlanItem[] = Array.from({ length: daysNum }, (_, i) => ({
      day: i + 1,
      date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
      planned_amount: Number(daily.toFixed(2)),
      planned_profit: targetType === 'fixed' ? tv : Number((daily * (tv / 100)).toFixed(2)),
      result_amount: null,
      status: 'pending',
    }));
    const { data, error } = await db.from('bankrolls').insert({
      user_id: user.id, total_amount: totalNum, days: daysNum,
      target_type: targetType, target_value: tv, daily_plan: plan,
      current_balance: totalNum,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setBk(data as Bankroll);
    toast.success('Plano criado!');
  };

  const registerDay = async (day: number, amount: number) => {
    if (!bk || !user) return;
    const plan = [...bk.daily_plan];
    const idx = plan.findIndex((p) => p.day === day);
    if (idx < 0) return;
    plan[idx] = { ...plan[idx], result_amount: amount, status: 'done' };
    const totalProfit = plan.reduce((s, p) => s + Number(p.result_amount ?? 0), 0);
    const done = plan.filter((p) => p.status === 'done');
    const greens = done.filter((p) => (p.result_amount ?? 0) > 0).length;
    const hit = done.length ? Number(((greens / done.length) * 100).toFixed(2)) : 0;
    const current = bk.total_amount + totalProfit;
    const roi = Number(((totalProfit / bk.total_amount) * 100).toFixed(2));
    const { data, error } = await db.from('bankrolls').update({
      daily_plan: plan, total_profit: totalProfit, current_balance: current, roi, hit_rate: hit,
    }).eq('id', bk.id).select().single();
    if (error) { toast.error(error.message); return; }
    await db.from('daily_results').insert({ user_id: user.id, bankroll_id: bk.id, day, date: plan[idx].date, result_amount: amount });
    setBk(data as Bankroll);
    toast.success('Resultado registrado');
  };

  const archive = async () => {
    if (!bk) return;
    await db.from('bankrolls').update({ is_active: false }).eq('id', bk.id);
    setBk(null);
    toast.success('Plano arquivado');
  };

  if (loading) return <AppShell><div className="flex justify-center pt-12"><Loader2 className="w-6 h-6 animate-spin text-arena-green" /></div></AppShell>;

  if (!bk) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-arena-gray bg-arena-dark p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-arena-gold/10 border border-arena-gold/30 flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-arena-gold" />
          </div>
          <h1 className="text-2xl font-black">Criar Plano de Banca</h1>
          <p className="text-sm text-arena-text-secondary mt-1">Estruture suas metas diárias e acompanhe seu crescimento.</p>

          <div className="text-left space-y-4 mt-6">
            <div><Label>Valor total (R$)</Label><Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <div><Label>Quantidade de dias</Label><Input type="number" value={days} onChange={(e) => setDays(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <div><Label>Tipo de meta</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as 'fixed' | 'percentage')}>
                <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentual do saldo (%)</SelectItem><SelectItem value="fixed">Valor fixo (R$)</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Valor da meta {targetType === 'percentage' ? '(%)' : '(R$)'}</Label><Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
          </div>

          <Button onClick={create} className="w-full h-12 mt-6 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark">
            <Plus className="w-4 h-4 mr-1" /> Gerar Meu Plano
          </Button>
        </div>
      </AppShell>
    );
  }

  const chartData = bk.daily_plan.map((p, i) => ({
    day: p.day,
    balance: bk.total_amount + bk.daily_plan.slice(0, i + 1).reduce((s, x) => s + Number(x.result_amount ?? 0), 0),
  }));

  return (
    <AppShell>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card label="Saldo Atual" value={`R$ ${bk.current_balance.toFixed(2)}`} />
        <Card label="Lucro Total" value={`R$ ${bk.total_profit.toFixed(2)}`} positive={bk.total_profit >= 0} />
        <Card label="ROI" value={`${bk.roi}%`} positive={bk.roi >= 0} />
        <Card label="Acerto" value={`${bk.hit_rate}%`} />
      </div>

      <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 mb-4">
        <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-arena-green" /><span className="text-xs uppercase tracking-widest text-arena-text-secondary">Evolução</span></div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00C853" stopOpacity={0.4} /><stop offset="100%" stopColor="#00C853" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="day" stroke="#A0A0A0" fontSize={10} />
            <YAxis stroke="#A0A0A0" fontSize={10} width={40} />
            <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12 }} />
            <Area type="monotone" dataKey="balance" stroke="#00C853" fill="url(#g)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <h3 className="text-xs uppercase tracking-widest text-arena-text-secondary mb-2">Dias</h3>
      <div className="space-y-2">
        {bk.daily_plan.map((p) => <DayRow key={p.day} p={p} onSave={(amt) => registerDay(p.day, amt)} />)}
      </div>

      <Button variant="outline" onClick={archive} className="w-full mt-4 border-arena-red text-arena-red hover:bg-arena-red/10 rounded-xl">Arquivar Plano</Button>
    </AppShell>
  );
}

function Card({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-2xl border border-arena-gray bg-arena-dark p-3">
      <p className="text-[10px] uppercase tracking-widest text-arena-text-secondary">{label}</p>
      <p className={`text-lg font-black mt-1 ${positive === false ? 'text-arena-red' : positive ? 'text-arena-success' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function DayRow({ p, onSave }: { p: DailyPlanItem; onSave: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(p.result_amount?.toString() ?? '');
  return (
    <div className="rounded-xl border border-arena-gray bg-arena-dark p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">Dia {p.day}</p>
          <p className="text-[10px] text-arena-text-secondary">Meta: R$ {p.planned_profit.toFixed(2)}</p>
        </div>
        {p.status === 'done' ? (
          <span className={`text-sm font-bold ${(p.result_amount ?? 0) >= 0 ? 'text-arena-success' : 'text-arena-red'}`}>R$ {Number(p.result_amount).toFixed(2)}</span>
        ) : <span className="text-[10px] uppercase tracking-widest text-arena-text-secondary">Pendente</span>}
      </div>
      {editing || p.status === 'pending' ? (
        <div className="flex gap-2 mt-2">
          <Input type="number" placeholder="Resultado R$" value={val} onChange={(e) => setVal(e.target.value)} className="h-9 bg-arena-gray/40 border-arena-gray rounded-lg text-sm" />
          <Button size="sm" onClick={() => { if (val) { onSave(parseFloat(val)); setEditing(false); } }} className="h-9 bg-arena-green text-black rounded-lg">Salvar</Button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-arena-green mt-1">Editar</button>
      )}
    </div>
  );
}
