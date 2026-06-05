import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Camera, LogOut, TrendingUp, History, Headset, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth, db } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/profile')({ component: ProfilePage });

function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [team, setTeam] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, greens: 0, reds: 0, profit: 0 });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setAge(profile.age?.toString() ?? '');
      setTeam(profile.favorite_team ?? '');
      setAvatar(profile.avatar_url);
    }
    if (user) {
      db.from('user_bets').select('result_status,profit_loss').eq('user_id', user.id).then(({ data }: { data: { result_status: string; profit_loss: number }[] | null }) => {
        const arr = data ?? [];
        setStats({
          total: arr.length,
          greens: arr.filter((b) => b.result_status === 'green').length,
          reds: arr.filter((b) => b.result_status === 'red').length,
          profit: arr.reduce((s, b) => s + Number(b.profit_loss ?? 0), 0),
        });
      });
    }
  }, [profile, user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await db.from('profiles').update({ name, age: age ? parseInt(age) : null, favorite_team: team, avatar_url: avatar }).eq('id', user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success('Perfil atualizado');
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatar(data.publicUrl);
    await db.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    toast.success('Foto atualizada');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  };

  const hitRate = stats.total ? Math.round((stats.greens / Math.max(stats.greens + stats.reds, 1)) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="rounded-2xl border border-arena-gray bg-arena-dark p-6 flex flex-col items-center text-center">
          <button onClick={() => fileRef.current?.click()} className="relative group">
            <Avatar className="w-24 h-24 border-2 border-arena-green">
              <AvatarImage src={avatar ?? undefined} />
              <AvatarFallback className="bg-arena-gray text-xl">{name.slice(0, 2).toUpperCase() || 'AR'}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Camera className="w-5 h-5" /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
          <h2 className="font-bold text-lg mt-3">{name || 'Sem nome'}</h2>
          <p className="text-xs text-arena-text-secondary">{user?.email}</p>
          {profile?.role === 'admin' && <span className="mt-2 px-2 py-0.5 rounded-full bg-arena-gold/20 text-arena-gold text-[10px] font-bold uppercase tracking-widest">Admin</span>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Análises" value={stats.total} />
          <Stat label="Acerto" value={`${hitRate}%`} />
          <Stat label="Lucro" value={`R$ ${stats.profit.toFixed(0)}`} positive={stats.profit >= 0} />
        </div>

        <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-arena-text-secondary">Editar perfil</h3>
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2"><Label>Idade</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl" /></div>
            <div className="space-y-2"><Label>Time</Label><Input value={team} onChange={(e) => setTeam(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl" /></div>
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>

        <Link to="/history" className="flex items-center justify-between p-4 rounded-2xl border border-arena-gray bg-arena-dark hover:border-arena-green/50 transition">
          <span className="flex items-center gap-3"><History className="w-5 h-5 text-arena-green" /><span className="font-semibold">Meu Histórico</span></span>
          <TrendingUp className="w-4 h-4 text-arena-text-secondary" />
        </Link>
        <Link to="/support" className="flex items-center justify-between p-4 rounded-2xl border border-arena-gray bg-arena-dark hover:border-arena-green/50 transition">
          <span className="flex items-center gap-3"><Headset className="w-5 h-5 text-arena-gold" /><span className="font-semibold">Suporte 24/7</span></span>
        </Link>

        <Button variant="outline" onClick={logout} className="w-full border-arena-red text-arena-red hover:bg-arena-red/10 rounded-xl">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, positive }: { label: string; value: string | number; positive?: boolean }) {
  return (
    <div className="rounded-2xl border border-arena-gray bg-arena-dark p-3 text-center">
      <p className={`font-black text-lg ${positive === false ? 'text-arena-red' : positive ? 'text-arena-success' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-arena-text-secondary mt-1">{label}</p>
    </div>
  );
}
