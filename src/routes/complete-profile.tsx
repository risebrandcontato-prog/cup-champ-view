import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, ChevronRight, Loader2, Heart, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, db } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COUNTRIES } from '@/lib/constants';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const Route = createFileRoute('/complete-profile')({
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [team, setTeam] = useState('');
  const [country, setCountry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [countryOpen, setCountryOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: '/login' }); return; }
    if (profile?.onboarding_completed) { navigate({ to: '/' }); return; }
    if (profile) {
      setName(profile.name ?? '');
      setAvatarUrl(profile.avatar_url);
      setAge(profile.age?.toString() ?? '');
      setTeam(profile.favorite_team ?? '');
      setCountry(profile.favorite_national_team ?? '');
    }
  }, [user, profile, loading, navigate]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success('Foto enviada!');
    } catch (err) {
      toast.error('Erro ao enviar foto', { description: (err as Error).message });
    } finally { setUploading(false); }
  };

  const finish = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await db.from('profiles').update({
      name, avatar_url: avatarUrl, age: age ? parseInt(age) : null,
      favorite_team: team, favorite_national_team: country, onboarding_completed: true,
    }).eq('id', user.id);
    setSubmitting(false);
    if (error) { toast.error('Erro', { description: error.message }); return; }
    toast.success('Perfil completo! Bem-vindo à Arena!');
    navigate({ to: '/' });
  };

  const selectedCountry = COUNTRIES.find((c) => c.name === country);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-3xl border border-arena-gray p-8 shadow-2xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'bg-arena-green text-black' : 'bg-arena-gray text-arena-text-secondary'}`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-1 mx-2 rounded-full ${step > s ? 'bg-arena-green' : 'bg-arena-gray'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <h2 className="text-2xl font-bold tracking-tight">Quem é você?</h2>
              <p className="text-sm text-arena-text-secondary">Sua foto e nome aparecerão no seu perfil.</p>

              <div className="flex flex-col items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative w-28 h-28 rounded-full bg-arena-gray border-2 border-dashed border-arena-green/50 flex items-center justify-center overflow-hidden hover:border-arena-green transition">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-arena-text-secondary" />}
                  {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-arena-green" /></div>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
                <span className="text-xs text-arena-text-secondary">Toque para enviar</span>
              </div>

              <div className="space-y-2">
                <Label className="text-arena-text-secondary uppercase text-xs tracking-widest">Nome completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como podemos te chamar?"
                  className="h-12 bg-arena-gray/40 border-arena-gray rounded-xl" />
              </div>

              <Button onClick={() => setStep(2)} disabled={!name.trim()}
                className="w-full h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl">
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <h2 className="text-2xl font-bold tracking-tight">Sobre você</h2>
              <p className="text-sm text-arena-text-secondary">Conte um pouco mais — fica entre nós.</p>

              <div className="space-y-2">
                <Label className="text-arena-text-secondary uppercase text-xs tracking-widest flex items-center gap-2"><UserIcon className="w-3 h-3" /> Idade</Label>
                <Input type="number" min={18} value={age} onChange={(e) => setAge(e.target.value)} placeholder="18+"
                  className="h-12 bg-arena-gray/40 border-arena-gray rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-arena-text-secondary uppercase text-xs tracking-widest flex items-center gap-2"><Heart className="w-3 h-3" /> Time do coração</Label>
                <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Ex: Flamengo, Real Madrid..."
                  className="h-12 bg-arena-gray/40 border-arena-gray rounded-xl" />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl border-arena-gray">Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={!age || parseInt(age) < 18}
                  className="flex-1 h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl">Continuar</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <h2 className="text-2xl font-bold tracking-tight">Seleção favorita</h2>
              <p className="text-sm text-arena-text-secondary">Pela qual você torce na Copa do Mundo 2026?</p>

              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox"
                    className="w-full h-14 justify-between bg-arena-gray/40 border-arena-gray hover:bg-arena-gray rounded-xl text-base">
                    {selectedCountry ? <span className="flex items-center gap-3"><span className="text-2xl">{selectedCountry.flag}</span>{selectedCountry.name}</span> : <span className="text-arena-text-secondary">Selecione um país...</span>}
                    <ChevronRight className="w-4 h-4 rotate-90 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-arena-dark border-arena-gray">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="Buscar país..." />
                    <CommandList>
                      <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                      <CommandGroup>
                        {COUNTRIES.map((c) => (
                          <CommandItem key={c.name} value={c.name} onSelect={() => { setCountry(c.name); setCountryOpen(false); }}>
                            <span className="text-xl mr-3">{c.flag}</span>{c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl border-arena-gray">Voltar</Button>
                <Button onClick={finish} disabled={!country || submitting}
                  className="flex-1 h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
