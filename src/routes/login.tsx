import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
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
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed,role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!data || !data.onboarding_completed) navigate({ to: '/complete-profile' });
      else navigate({ to: '/' });
    })();
  }, [session, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Preencha email e senha');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error('Acesso negado', { description: error.message });
      return;
    }
    toast.success('Bem-vindo à Arena!');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(0,200,83,0.12),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(255,215,0,0.08),transparent_50%)]" />

      {/* Floating particles effect */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[15%] left-[10%] w-2 h-2 rounded-full bg-arena-gold/30 blur-sm"
        />
        <motion.div
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-[60%] right-[15%] w-3 h-3 rounded-full bg-arena-green/20 blur-sm"
        />
        <motion.div
          animate={{ y: [0, -15, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] left-[20%] w-1.5 h-1.5 rounded-full bg-arena-gold/25 blur-sm"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md glass rounded-3xl border border-arena-gray p-8 shadow-2xl shadow-arena-green/10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          {/* Logo container with layered effects */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative mb-5"
          >
            {/* Outer pulsing glow */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-arena-gold/20 blur-2xl"
            />

            {/* Middle glow ring */}
            <div className="absolute inset-0 rounded-full bg-arena-gold/10 blur-xl scale-110" />

            {/* Animated border ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-1 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,215,0,0.3) 25%, transparent 50%, rgba(0,200,83,0.2) 75%, transparent 100%)',
                mask: 'radial-gradient(circle, transparent 62%, black 63%)',
                WebkitMask: 'radial-gradient(circle, transparent 62%, black 63%)',
              }}
            />

            {/* Solid border ring */}
            <div className="absolute inset-0 rounded-full border-2 border-arena-gold/30 scale-105" />

            {/* Image */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-arena-gold/50 shadow-2xl shadow-arena-gold/20"
            >
              <img
                src="/icons/icon-512x512.png"
                alt="Aposta Restrita"
                className="w-full h-full object-cover"
                width="112"
                height="112"
                loading="eager"
              />
            </motion.div>
          </motion.div>

          {/* Title with staggered animation */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-3xl font-black tracking-tight text-arena-gold"
          >
            APOSTA RESTRITA
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="text-sm text-arena-text-secondary mt-2 text-center"
          >
            Análises esportivas premium · Acesso exclusivo
          </motion.p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-arena-text-secondary uppercase text-xs tracking-widest font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12 bg-arena-gray/40 border-arena-gray text-white rounded-xl focus-visible:border-arena-green focus-visible:ring-arena-green/30 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-arena-text-secondary uppercase text-xs tracking-widest font-semibold">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 bg-arena-gray/40 border-arena-gray text-white rounded-xl focus-visible:border-arena-green focus-visible:ring-arena-green/30 transition-colors"
            />
          </div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl shadow-lg shadow-arena-green/30 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Entrar na Arena
                </>
              )}
            </Button>
          </motion.div>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="text-center text-xs text-arena-text-secondary mt-6"
        >
          Acesso liberado apenas pelo administrador.
        </motion.p>
      </motion.div>
    </main>
  );
}