import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, LogIn, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, db } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !session?.user) return;
    (async () => {
      const { data } = await db.from('profiles').select('onboarding_completed,role').eq('id', session.user.id).maybeSingle();
      if (!data || !data.onboarding_completed) navigate({ to: '/complete-profile' });
      else navigate({ to: '/' });
    })();
  }, [session, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) { toast.error('Acesso negado', { description: error.message }); return; }
    toast.success('Bem-vindo à Arena!');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(0,200,83,0.12),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(255,215,0,0.08),transparent_50%)]" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md glass rounded-3xl border border-arena-gray p-8 shadow-2xl shadow-arena-green/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-arena-green/10 border border-arena-green/30 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-arena-gold" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-arena-gold">APOSTA RESTRITA</h1>
          <p className="text-sm text-arena-text-secondary mt-2 text-center">Análises esportivas premium · Acesso exclusivo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-arena-text-secondary uppercase text-xs tracking-widest font-semibold">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-arena-gray/40 border-arena-gray text-white rounded-xl focus-visible:border-arena-green focus-visible:ring-arena-green/30" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-arena-text-secondary uppercase text-xs tracking-widest font-semibold">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-arena-gray/40 border-arena-gray text-white rounded-xl focus-visible:border-arena-green focus-visible:ring-arena-green/30" />
          </div>

          <Button type="submit" disabled={submitting}
            className="w-full h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl shadow-lg shadow-arena-green/30 transition-transform active:scale-[0.98]">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 mr-2" /> Entrar na Arena</>}
          </Button>
        </form>

        <p className="text-center text-xs text-arena-text-secondary mt-6">
          Acesso liberado apenas pelo administrador.
        </p>
      </motion.div>
    </main>
  );
}
