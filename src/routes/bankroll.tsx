import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { Bankroll, DailyPlanItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Loader2, TrendingUp, Plus, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const Route = createFileRoute('/bankroll')({ component: BankrollPage });

function BankrollPage() {
  const { user } = useAuth();
  const [bk, setBk] = useState<Bankroll | null>(null);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [total, setTotal] = useState('');
  const [days, setDays] = useState('30');
  const [targetType, setTargetType] = useState<'fixed' | 'percentage'>('percentage');
  const [targetValue, setTargetValue] = useState('5');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('bankroll_management')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[Bankroll] Erro ao carregar:', error.message);
          toast.error('Erro ao carregar plano de banca');
        }
        setBk(data as Bankroll | null);
        setLoading(false);
      });
  }, [user]);

  const create = async () => {
    if (!user) return;
    const totalNum = parseFloat(total);
    const daysNum = parseInt(days);
    const tv = parseFloat(targetValue);

    if (!totalNum || totalNum <= 0) { toast.error('Informe um valor total válido'); return; }
    if (!daysNum || daysNum <= 0) { toast.error('Informe uma quantidade de dias válida'); return; }
    if (!tv || tv <= 0) { toast.error('Informe um valor de meta válido'); return; }

    const dailyStake = totalNum / daysNum;

    const plan: DailyPlanItem[] = Array.from({ length: daysNum }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const plannedProfit = targetType === 'fixed'
        ? tv
        : Number((dailyStake * (tv / 100)).toFixed(2));

      return {
        day: i + 1,
        date: date.toISOString().slice(0, 10),
        planned_amount: Number(dailyStake.toFixed(2)),
        planned_profit: plannedProfit,
        result_amount: null,
        status: 'pending',
      };
    });

    const { data, error } = await supabase
      .from('bankroll_management')
      .insert({
        user_id: user.id,
        total_amount: totalNum,
        days: daysNum,
        target_type: targetType,
        target_value: tv,
        daily_plan: plan,
        current_balance: totalNum,
        total_profit: 0,
        roi: 0,
        hit_rate: 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar plano: ' + error.message);
      return;
    }

    setBk(data as Bankroll);
    toast.success('Plano de banca criado com sucesso!');
  };

  const registerDay = async (day: number, amount: number) => {
    if (!bk || !user) return;

    const plan = [...(bk.daily_plan ?? [])];
    const idx = plan.findIndex((p) => p.day === day);
    if (idx < 0) return;

    plan[idx] = { ...plan[idx], result_amount: amount, status: 'done' };

    const totalProfit = plan.reduce((s, p) => s + Number(p.result_amount ?? 0), 0);
    const doneDays = plan.filter((p) => p.status === 'done');
    const greenDays = doneDays.filter((p) => (p.result_amount ?? 0) > 0).length;
    const hitRate = doneDays.length ? Number(((greenDays / doneDays.length) * 100).toFixed(2)) : 0;
    const currentBalance = Number((bk.total_amount + totalProfit).toFixed(2));
    const roi = Number(((totalProfit / bk.total_amount) * 100).toFixed(2));

    const { data, error } = await supabase
      .from('bankroll_management')
      .update({
        daily_plan: plan,
        total_profit: totalProfit,
        current_balance: currentBalance,
        roi,
        hit_rate: hitRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bk.id)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao registrar resultado: ' + error.message);
      return;
    }

    setBk(data as Bankroll);
    toast.success(`Dia ${day} registrado: ${amount >= 0 ? '+' : ''}R$ ${amount.toFixed(2)}`);
  };

  const archive = async () => {
    if (!bk) return;
    const { error } = await supabase
      .from('bankroll_management')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', bk.id);

    if (error) {
      toast.error('Erro ao arquivar: ' + error.message);
      return;
    }

    setBk(null);
    toast.success('Plano arquivado com sucesso');
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center pt-12">
          <Loader2 className="w-6 h-6 animate-spin text-arena-green" />
        </div>
      </AppShell>
    );
  }

  if (!bk) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-arena-gray bg-arena-dark p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-arena-gold/10 border border-arena-gold/30 flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-arena-gold" />
          </div>
          <h1 className="text-2xl font-black">Criar Plano de Banca</h1>
          <p className="text-sm text-arena-text-secondary mt-1">
            Estruture suas metas diárias e acompanhe seu crescimento.
          </p>

          <div className="text-left space-y-4 mt-6">
            <div>
              <Label>Valor total (R$)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Ex: 1000"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Quantidade de dias</Label>
              <Input
                type="number"
                min="1"
                max="365"
                placeholder="Ex: 30"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Tipo de meta</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as 'fixed' | 'percentage')}>
                <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual do saldo (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor da meta {targetType === 'percentage' ? '(%)' : '(R$)'}</Label>
              <Input
                type="number"
                min="0.01"
                step={targetType === 'percentage' ? '0.1' : '0.01'}
                placeholder={targetType === 'percentage' ? 'Ex: 5' : 'Ex: 50'}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"
              />
              <p className="text-[10px] text-arena-text-secondary mt-1">
                {targetType === 'percentage'
                  ? 'Lucro esperado como percentual do valor apostado no dia.'
                  : 'Lucro esperado em valor fixo por dia.'}
              </p>
            </div>
          </div>

          <Button
            onClick={create}
            className="w-full h-12 mt-6 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark"
          >
            <Plus className="w-4 h-4 mr-1" /> Gerar Meu Plano
          </Button>
        </div>
      </AppShell>
    );
  }

  // Chart data
  const chartData = bk.daily_plan.map((p, i) => ({
    day: `D${p.day}`,
    balance: Number((bk.total_amount + bk.daily_plan.slice(0, i + 1).reduce((s, x) => s + Number(x.result_amount ?? 0), 0)).toFixed(2)),
    target: Number((bk.total_amount + bk.daily_plan.slice(0, i + 1).reduce((s, x) => s + Number(x.planned_profit ?? 0), 0)).toFixed(2)),
  }));

  const isPlanExpired = bk.daily_plan.every((p) => p.status === 'done');
  const daysRemaining = bk.daily_plan.filter((p) => p.status === 'pending').length;

  return (
    <AppShell>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard label="Saldo Atual" value={`R$ ${(bk.current_balance ?? 0).toFixed(2)}`} />
        <StatCard
          label="Lucro Total"
          value={`${(bk.total_profit ?? 0) >= 0 ? '+' : ''}R$ ${(bk.total_profit ?? 0).toFixed(2)}`}
          color={(bk.total_profit ?? 0) >= 0 ? 'text-arena-success' : 'text-arena-red'}
        />
        <StatCard label="ROI" value={`${bk.roi ?? 0}%`} color={(bk.roi ?? 0) >= 0 ? 'text-arena-success' : 'text-arena-red'} />
        <StatCard label="Acerto" value={`${bk.hit_rate ?? 0}%`} />
      </div>

      {/* Status banner */}
      {isPlanExpired && (
        <div className="rounded-xl border border-arena-gold/30 bg-arena-gold/10 p-3 mb-4 text-center">
          <p className="text-sm font-bold text-arena-gold">✓ Plano concluído</p>
          <p className="text-xs text-arena-text-secondary mt-1">
            ROI final: {bk.roi}% • Lucro: R$ {bk.total_profit?.toFixed(2)}
          </p>
        </div>
      )}
      {!isPlanExpired && daysRemaining > 0 && (
        <div className="rounded-xl border border-arena-gray bg-arena-dark p-3 mb-4 text-center">
          <p className="text-xs text-arena-text-secondary">
            {daysRemaining} dia{daysRemaining > 1 ? 's' : ''} restante{daysRemaining > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Chart */}
      <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-arena-green" />
          <span className="text-xs uppercase tracking-widest text-arena-text-secondary">Evolução da Banca</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00C853" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#00C853" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFD700" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#FFD700" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="#A0A0A0" fontSize={10} tickLine={false} />
            <YAxis stroke="#A0A0A0" fontSize={10} width={50} tickFormatter={(v: number) => `R$${v}`} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, fontSize: 12 }}
              formatter={(value: number, name: string) => [`R$ ${Number(value).toFixed(2)}`, name === 'balance' ? 'Real' : 'Meta']}
            />
            <Area type="monotone" dataKey="target" stroke="#FFD700" strokeDasharray="4 4" fill="url(#targetGrad)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="balance" stroke="#00C853" fill="url(#balanceGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Days list */}
      <h3 className="text-xs uppercase tracking-widest text-arena-text-secondary mb-2 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> Dias do Plano
      </h3>
      <div className="space-y-2 mb-4">
        {bk.daily_plan.map((p) => (
          <DayRow key={p.day} p={p} onSave={(amt) => registerDay(p.day, amt)} />
        ))}
      </div>

      {/* Archive */}
      <Button
        variant="outline"
        onClick={archive}
        className="w-full border-arena-red text-arena-red hover:bg-arena-red/10 rounded-xl h-11"
      >
        <Archive className="w-4 h-4 mr-1" /> Arquivar Plano
      </Button>
    </AppShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-arena-gray bg-arena-dark p-3">
      <p className="text-[10px] uppercase tracking-widest text-arena-text-secondary">{label}</p>
      <p className={`text-lg font-black mt-1 ${color ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function DayRow({ p, onSave }: { p: DailyPlanItem; onSave: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(p.result_amount?.toString() ?? '');

  const handleSave = () => {
    const num = parseFloat(val);
    if (isNaN(num)) { toast.error('Informe um valor válido'); return; }
    onSave(num);
    setEditing(false);
  };

  const isGreen = (p.result_amount ?? 0) > 0;
  const isRed = (p.result_amount ?? 0) < 0;

  return (
    <div className={`rounded-xl border p-3 transition-colors ${p.status === 'done' ? (isGreen ? 'border-arena-success/30 bg-arena-success/5' : isRed ? 'border-arena-red/30 bg-arena-red/5' : 'border-arena-gray bg-arena-dark') : 'border-arena-gray bg-arena-dark'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${p.status === 'done' ? (isGreen ? 'bg-arena-success/20 text-arena-success' : isRed ? 'bg-arena-red/20 text-arena-red' : 'bg-arena-gray text-arena-text-secondary') : 'bg-arena-gray/50 text-arena-text-secondary'}`}>
            {p.day}
          </div>
          <div>
            <p className="font-bold text-sm">{new Date(p.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
            <p className="text-[10px] text-arena-text-secondary">Meta: R$ {p.planned_profit.toFixed(2)}</p>
          </div>
        </div>
        {p.status === 'done' ? (
          <div className="text-right">
            <p className={`text-sm font-bold ${isGreen ? 'text-arena-success' : isRed ? 'text-arena-red' : 'text-arena-text-secondary'}`}>
              {isGreen ? '+' : ''}R$ {Number(p.result_amount).toFixed(2)}
            </p>
            <button onClick={() => setEditing(true)} className="text-[10px] text-arena-green hover:underline mt-0.5">Editar</button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg bg-arena-green/10 text-arena-green text-xs font-bold hover:bg-arena-green/20 transition-colors"
          >
            Registrar
          </button>
        )}
      </div>

      {editing && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-arena-gray/30">
          <Input
            type="number"
            step="0.01"
            placeholder="Resultado em R$"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="h-9 bg-arena-gray/40 border-arena-gray rounded-lg text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleSave} className="h-9 bg-arena-green text-black rounded-lg font-bold px-4">
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}