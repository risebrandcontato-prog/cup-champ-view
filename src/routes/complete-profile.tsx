import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, ChevronRight, Loader2, Heart, User as UserIcon, Shield, Search, X } from 'lucide-react';
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
import { useTeamBadge } from '@/hooks/use-team-badge';

export const Route = createFileRoute('/complete-profile')({
  component: CompleteProfilePage,
});

interface ApiTeam {
  team: { id: number; name: string; logo: string; country: string };
}

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

  // Busca de times via API
  const [teamSearch, setTeamSearch] = useState('');
  const [teamResults, setTeamResults] = useState<ApiTeam[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const teamSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { badge: teamBadge } = useTeamBadge(team || null);

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

  // Buscar times da API com debounce
  useEffect(() => {
    if (teamSearchTimeout.current) clearTimeout(teamSearchTimeout.current);

    if (!teamSearch.trim() || teamSearch.length < 2) {
      setTeamResults([]);
      return;
    }

    setTeamLoading(true);
    teamSearchTimeout.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('api-football', {
          body: {
            endpoint: 'teams',
            params: { search: teamSearch },
          },
        });

        if (error) throw error;
        const results = (data?.data?.response || []).slice(0, 5);
        setTeamResults(results);
        setTeamDropdownOpen(results.length > 0);
      } catch (err) {
        console.error('[CompleteProfile] Erro ao buscar times:', err);
      } finally {
        setTeamLoading(false);
      }
    }, 400);

    return () => {
      if (teamSearchTimeout.current) clearTimeout(teamSearchTimeout.current);
    };
  }, [teamSearch]);

  const selectTeam = (teamName: string) => {
    setTeam(teamName);
    setTeamSearch(teamName);
    setTeamResults([]);
    setTeamDropdownOpen(false);
  };

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

  const canProceedStep1 = name.trim().length >= 2;
  const canProceedStep2 = age && parseInt(age) >= 18;
  const canFinish = country && !submitting;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-b from-arena-dark to-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-3xl border border-arena-gray/50 p-8 shadow-2xl shadow-arena-green/5"
      >
        {/* Header com logo/escudo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-arena-green/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-arena-green" />
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8 px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <motion.div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all border-2 ${
                  step >= s 
                    ? 'bg-arena-green text-black border-arena-green' 
                    : 'bg-arena-dark text-arena-text-secondary border-arena-gray'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </motion.div>
              {s < 3 && (
                <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                  step > s ? 'bg-arena-green' : 'bg-arena-gray'
                }`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Dados Pessoais */}
          {step === 1 && (
            <motion.div 
              key="s1" 
              initial={{ opacity: 0, x: 30 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -30 }} 
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Quem é você?</h2>
                <p className="text-sm text-arena-text-secondary">Sua foto e nome aparecerão no seu perfil público.</p>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <motion.button 
                  type="button" 
                  onClick={() => fileRef.current?.click()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative w-28 h-28 rounded-full bg-arena-gray border-2 border-dashed border-arena-green/50 flex items-center justify-center overflow-hidden hover:border-arena-green transition-colors group"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-arena-text-secondary group-hover:text-arena-green transition-colors" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-arena-green" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </motion.button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
                <span className="text-xs text-arena-text-secondary">Toque para enviar foto</span>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label className="text-arena-text-secondary uppercase text-xs tracking-widest font-bold">Nome completo</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Como podemos te chamar?"
                  className="h-12 bg-arena-gray/40 border-arena-gray rounded-xl focus:border-arena-green focus:ring-arena-green/20" 
                />
              </div>

              <Button 
                onClick={() => setStep(2)} 
                disabled={!canProceedStep1}
                className="w-full h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl disabled:opacity-40"
              >
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* STEP 2: Time do Coração */}
          {step === 2 && (
            <motion.div 
              key="s2" 
              initial={{ opacity: 0, x: 30 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -30 }} 
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Seu Time</h2>
                <p className="text-sm text-arena-text-secondary">Escolha o time do coração. Vamos buscar o escudo oficial.</p>
              </div>

              {/* Escudo do time selecionado */}
              {teamBadge && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-arena-green/10 border border-arena-green/30"
                >
                  <div className="w-20 h-20 rounded-full bg-white p-2 shadow-lg">
                    <img 
                      src={teamBadge.logo} 
                      alt={teamBadge.name} 
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <p className="font-bold text-sm">{teamBadge.name}</p>
                  {teamBadge.country && (
                    <p className="text-xs text-arena-text-secondary">{teamBadge.country}</p>
                  )}
                </motion.div>
              )}

              {/* Idade */}
              <div className="space-y-2">
                <Label className="text-arena-text-secondary uppercase text-xs tracking-widest font-bold flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Idade
                </Label>
                <Input 
                  type="number" 
                  min={18} 
                  value={age} 
                  onChange={(e) => setAge(e.target.value)} 
                  placeholder="18+"
                  className="h-12 bg-arena-gray/40 border-arena-gray rounded-xl focus:border-arena-green focus:ring-arena-green/20" 
                />
              </div>

              {/* Busca de time com autocomplete */}
              <div className="space-y-2 relative">
                <Label className="text-arena-text-secondary uppercase text-xs tracking-widest font-bold flex items-center gap-2">
                  <Heart className="w-3 h-3 text-arena-red" /> Time do coração
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-text-secondary" />
                  <Input 
                    value={teamSearch} 
                    onChange={(e) => {
                      setTeamSearch(e.target.value);
                      if (e.target.value !== team) setTeam('');
                    }} 
                    placeholder="Buscar time..."
                    className="h-12 pl-9 bg-arena-gray/40 border-arena-gray rounded-xl focus:border-arena-green focus:ring-arena-green/20" 
                  />
                  {teamSearch && (
                    <button 
                      onClick={() => { setTeamSearch(''); setTeam(''); setTeamResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-arena-text-secondary hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown de resultados */}
                <AnimatePresence>
                  {teamDropdownOpen && teamResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-1 bg-arena-dark border border-arena-gray rounded-xl shadow-xl overflow-hidden"
                    >
                      {teamResults.map((t: ApiTeam) => (
                        <button
                          key={t.team.id}
                          onClick={() => selectTeam(t.team.name)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arena-gray/50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-white p-1 flex-shrink-0">
                            <img 
                              src={t.team.logo} 
                              alt={t.team.name} 
                              className="w-full h-full object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{t.team.name}</p>
                            <p className="text-xs text-arena-text-secondary">{t.team.country}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {teamLoading && (
                  <div className="flex items-center gap-2 text-xs text-arena-text-secondary py-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando times...
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)} 
                  className="flex-1 h-12 rounded-xl border-arena-gray hover:bg-arena-gray/30"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!canProceedStep2}
                  className="flex-1 h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl disabled:opacity-40"
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Seleção Nacional */}
          {step === 3 && (
            <motion.div 
              key="s3" 
              initial={{ opacity: 0, x: 30 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -30 }} 
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Seleção Favorita</h2>
                <p className="text-sm text-arena-text-secondary">Pela qual você torce na Copa do Mundo 2026?</p>
              </div>

              {/* Preview do perfil */}
              <div className="rounded-2xl border border-arena-gray/50 bg-arena-dark/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-arena-gray overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-arena-text-secondary text-xs">
                        {name.slice(0, 2).toUpperCase() || 'AR'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{name || 'Sem nome'}</p>
                    <p className="text-xs text-arena-text-secondary">{age ? `${age} anos` : ''} {team ? `• ${team}` : ''}</p>
                  </div>
                </div>
                {teamBadge && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-arena-green/10">
                    <img src={teamBadge.logo} alt={teamBadge.name} className="w-6 h-6 object-contain" />
                    <span className="text-xs font-bold">{teamBadge.name}</span>
                  </div>
                )}
              </div>

              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    role="combobox"
                    className="w-full h-14 justify-between bg-arena-gray/40 border-arena-gray hover:bg-arena-gray/60 rounded-xl text-base"
                  >
                    {selectedCountry ? (
                      <span className="flex items-center gap-3">
                        <span className="text-2xl">{selectedCountry.flag}</span>
                        <span className="font-semibold">{selectedCountry.name}</span>
                      </span>
                    ) : (
                      <span className="text-arena-text-secondary">Selecione um país...</span>
                    )}
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
                          <CommandItem 
                            key={c.name} 
                            value={c.name} 
                            onSelect={() => { setCountry(c.name); setCountryOpen(false); }}
                            className="cursor-pointer"
                          >
                            <span className="text-xl mr-3">{c.flag}</span>
                            <span className="font-medium">{c.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(2)} 
                  className="flex-1 h-12 rounded-xl border-arena-gray hover:bg-arena-gray/30"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={finish} 
                  disabled={!canFinish}
                  className="flex-1 h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl disabled:opacity-40"
                >
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