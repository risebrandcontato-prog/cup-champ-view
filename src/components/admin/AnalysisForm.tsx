import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Plus, X, Loader2, AlertTriangle, Search, Link2, RefreshCw, Shield, CalendarDays } from 'lucide-react';
import { SPORTS, BET_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import type { Analysis, AnalysisMatch } from '@/types';

interface MatchInput { 
  home_team: string; 
  away_team: string; 
  league: string; 
  bet_type: string; 
  odds: string; 
  match_time: string; 
}

interface ApiFixture {
  fixture: { id: number; date: string; timestamp: number };
  league: { name: string; country: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
}

export interface AnalysisFormProps { 
  initial?: Analysis & { matches?: AnalysisMatch[] }; 
}

export function AnalysisForm({ initial }: AnalysisFormProps) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!Array.isArray(SPORTS)) {
    return (
      <div className="p-6 rounded-2xl border border-arena-red/30 bg-arena-red/10 text-arena-red">
        <AlertTriangle className="w-5 h-5 mb-2" />
        <p className="font-bold">Erro de configuração</p>
        <p className="text-sm">SPORTS não está definido corretamente em <code>@/lib/constants</code></p>
      </div>
    );
  }
  if (!Array.isArray(BET_TYPES)) {
    return (
      <div className="p-6 rounded-2xl border border-arena-red/30 bg-arena-red/10 text-arena-red">
        <AlertTriangle className="w-5 h-5 mb-2" />
        <p className="font-bold">Erro de configuração</p>
        <p className="text-sm">BET_TYPES não está definido corretamente em <code>@/lib/constants</code></p>
      </div>
    );
  }

  const [tab, setTab] = useState<'image' | 'structured'>(initial?.display_type ?? 'image');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [sportType, setSportType] = useState(initial?.sport_type ?? 'futebol');
  const [championship, setChampionship] = useState(initial?.championship ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [isHot, setIsHot] = useState(initial?.is_hot ?? false);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [stakeValue, setStakeValue] = useState(initial?.stake_value?.toString() ?? '');
  const [bookmakerName, setBookmakerName] = useState(initial?.bookmaker_name ?? '');
  const [bookmakerLink, setBookmakerLink] = useState(initial?.bookmaker_link ?? '');
  const [odds, setOdds] = useState(initial?.odds?.toString() ?? '');
  const [matchDate, setMatchDate] = useState(initial?.match_date ? initial.match_date.slice(0, 16) : '');
  const [matches, setMatches] = useState<MatchInput[]>(
    initial?.matches?.map((m) => ({ 
      home_team: m.home_team, 
      away_team: m.away_team, 
      league: m.league ?? '', 
      bet_type: m.bet_type ?? 'Resultado Final', 
      odds: m.odds?.toString() ?? '', 
      match_time: m.match_time ? m.match_time.slice(0, 16) : '' 
    })) ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── API FIXTURE STATES ───
  const [useApiFixture, setUseApiFixture] = useState(!!initial?.fixture_id);
  const [fixtureId, setFixtureId] = useState<number | null>(initial?.fixture_id ?? null);
  const [todayFixtures, setTodayFixtures] = useState<ApiFixture[]>([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [fixtureSearch, setFixtureSearch] = useState('');

  // Buscar jogos do dia quando toggle API está ativo
  useEffect(() => {
    if (!useApiFixture) {
      setTodayFixtures([]);
      setFixtureId(null);
      return;
    }

    let cancelled = false;
    setLoadingFixtures(true);

    (async () => {
      try {
        // Buscar jogos ao vivo + próximos 3 dias
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        // Tentar buscar ao vivo primeiro
        const { data: liveData, error: liveError } = await supabase.functions.invoke('api-football', {
          body: {
            endpoint: 'fixtures',
            params: { live: 'all' },
          },
        });

        // Buscar jogos do dia
        const { data: todayData, error: todayError } = await supabase.functions.invoke('api-football', {
          body: {
            endpoint: 'fixtures',
            params: { date: today },
          },
        });

        // Buscar jogos de amanhã
        const { data: tomorrowData, error: tomorrowError } = await supabase.functions.invoke('api-football', {
          body: {
            endpoint: 'fixtures',
            params: { date: tomorrow },
          },
        });

        if (cancelled) return;

        // Combinar todos os resultados
        const allFixtures = [
          ...(liveData?.response || []),
          ...(todayData?.response || []),
          ...(tomorrowData?.response || []),
        ];

        // Remover duplicados por fixture.id
        const uniqueFixtures = allFixtures.filter((f: any, index: number, self: any[]) => 
          index === self.findIndex((t: any) => t?.fixture?.id === f?.fixture?.id)
        );

        const fixtures = uniqueFixtures.filter((f: any) => 
          f?.fixture?.id && f?.teams?.home?.name && f?.teams?.away?.name
        );

        setTodayFixtures(fixtures);

        if (fixtures.length === 0) {
          toast.info('Nenhum jogo encontrado para hoje/amanhã. Tente criar análise manual.');
        }
      } catch (err) {
        console.error('[AnalysisForm] Erro ao buscar jogos:', err);
        if (!cancelled) toast.error('Erro ao buscar jogos da API');
      } finally {
        if (!cancelled) setLoadingFixtures(false);
      }
    })();

    return () => { cancelled = true; };
  }, [useApiFixture]);

  const selectFixture = useCallback((fixture: ApiFixture) => {
    const home = fixture.teams.home.name;
    const away = fixture.teams.away.name;
    const league = fixture.league.name;
    const date = fixture.fixture.date;

    setFixtureId(fixture.fixture.id);
    setTitle(`${home} vs ${away}`);
    setChampionship(league);
    setMatchDate(date ? date.slice(0, 16) : '');
    setSportType('futebol');
    setTab('structured');

    // Preenche automaticamente um match
    setMatches([{
      home_team: home,
      away_team: away,
      league: league,
      bet_type: 'Resultado Final',
      odds: '',
      match_time: date ? date.slice(0, 16) : '',
    }]);

    toast.success(`Jogo selecionado: ${home} vs ${away}`);
  }, []);

  const clearFixture = useCallback(() => {
    setFixtureId(null);
    setTodayFixtures([]);
    setFixtureSearch('');
  }, []);

  const upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const path = `${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('analysis-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

    setUploading(false);

    if (error) { 
      toast.error('Erro no upload: ' + error.message); 
      return; 
    }

    const { data } = supabase.storage.from('analysis-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    toast.success('Imagem enviada');
  }, []);

  const addMatch = useCallback(() => {
    setMatches((m) => [...m, { 
      home_team: '', 
      away_team: '', 
      league: '', 
      bet_type: 'Resultado Final', 
      odds: '', 
      match_time: '' 
    }]);
  }, []);

  const updateMatch = useCallback((i: number, k: keyof MatchInput, v: string) => {
    setMatches((arr) => arr.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  }, []);

  const removeMatch = useCallback((i: number) => {
    setMatches((arr) => arr.filter((_, idx) => idx !== i));
  }, []);

  const save = useCallback(async () => {
    if (!title.trim()) { 
      toast.error('Preencha o título'); 
      return; 
    }
    if (!sportType) { 
      toast.error('Selecione o esporte'); 
      return; 
    }
    if (tab === 'image' && !imageUrl && !initial?.image_url) {
      toast.error('Envie uma imagem para análise por imagem');
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Usuário não autenticado');
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(), 
      sport_type: sportType, 
      championship: championship.trim() || null, 
      description: description.trim() || null,
      image_url: tab === 'image' ? imageUrl : null,
      is_hot: isHot, 
      is_featured: isFeatured, 
      display_type: tab,
      stake_value: stakeValue ? parseFloat(stakeValue) : null,
      bookmaker_name: bookmakerName.trim() || null, 
      bookmaker_link: bookmakerLink.trim() || null,
      odds: odds ? parseFloat(odds) : null,
      match_date: matchDate || null,
      fixture_id: fixtureId,
      created_by: user.id,
    };

    let analysisId = initial?.id;

    try {
      if (initial?.id) {
        const { error } = await supabase
          .from('analyses')
          .update(payload)
          .eq('id', initial.id);

        if (error) throw error;
        analysisId = initial.id;
      } else {
        const { data, error } = await supabase
          .from('analyses')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (!data?.id) throw new Error('Erro ao criar análise');
        analysisId = data.id;
      }

      if (tab === 'structured' && analysisId) {
        await supabase.from('analysis_matches').delete().eq('analysis_id', analysisId);

        const validMatches = matches.filter(m => m.home_team.trim() && m.away_team.trim());

        if (validMatches.length) {
          const { error: matchesError } = await supabase
            .from('analysis_matches')
            .insert(validMatches.map((m) => ({
              analysis_id: analysisId,
              home_team: m.home_team.trim(), 
              away_team: m.away_team.trim(),
              league: m.league.trim() || null, 
              bet_type: m.bet_type,
              odds: m.odds ? parseFloat(m.odds) : null, 
              match_time: m.match_time || null,
            })));

          if (matchesError) throw matchesError;
        }
      }

      toast.success(initial ? 'Análise atualizada' : 'Análise publicada');
      navigate({ to: '/admin/analyses' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao salvar: ' + message);
    } finally {
      setSaving(false);
    }
  }, [title, sportType, championship, description, imageUrl, isHot, isFeatured, tab, stakeValue, bookmakerName, bookmakerLink, odds, matchDate, fixtureId, matches, initial, navigate]);

  const filteredFixtures = todayFixtures.filter((f) => {
    if (!fixtureSearch.trim()) return true;
    const search = fixtureSearch.toLowerCase();
    return (
      f.teams.home.name.toLowerCase().includes(search) ||
      f.teams.away.name.toLowerCase().includes(search) ||
      f.league.name.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4 max-w-3xl">
      {/* ─── TOGGLE API / MANUAL ─── */}
      <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-arena-green" />
            <span className="text-sm font-bold">Vincular a Jogo da API</span>
          </div>
          <Switch 
            checked={useApiFixture} 
            onCheckedChange={(v) => {
              setUseApiFixture(v);
              if (!v) clearFixture();
            }} 
          />
        </div>
        <p className="text-xs text-arena-text-secondary">
          {useApiFixture 
            ? 'Selecione um jogo do dia para preencher automaticamente os dados da análise.' 
            : 'Crie a análise manualmente sem vinculação à API.'}
        </p>
      </div>

      {/* ─── API FIXTURE SELECTOR ─── */}
      {useApiFixture && (
        <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-arena-text-secondary flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Jogos de Hoje
            </span>
            {fixtureId && (
              <Button 
                type="button" 
                size="sm" 
                variant="ghost" 
                onClick={clearFixture}
                className="text-arena-red text-xs h-7"
              >
                <X className="w-3 h-3 mr-1" /> Limpar seleção
              </Button>
            )}
          </div>

          {fixtureId ? (
            <div className="p-3 rounded-xl bg-arena-green/10 border border-arena-green/30 flex items-center gap-3">
              <Shield className="w-5 h-5 text-arena-green" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{title}</p>
                <p className="text-xs text-arena-text-secondary">{championship} • ID: {fixtureId}</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-arena-green text-black text-[10px] font-black">SELECIONADO</span>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-text-secondary" />
                <Input
                  placeholder="Buscar time ou campeonato..."
                  value={fixtureSearch}
                  onChange={(e) => setFixtureSearch(e.target.value)}
                  className="pl-9 bg-arena-gray/40 border-arena-gray rounded-xl"
                />
              </div>

              {loadingFixtures ? (
                <div className="flex items-center justify-center py-6 gap-2 text-arena-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Buscando jogos...</span>
                </div>
              ) : filteredFixtures.length === 0 ? (
                <p className="text-xs text-arena-text-secondary text-center py-4">
                  {fixtureSearch.trim() ? 'Nenhum jogo encontrado.' : 'Nenhum jogo encontrado. Tente buscar manualmente ou crie análise sem vincular.'}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {filteredFixtures.map((f) => (
                    <button
                      key={f.fixture.id}
                      type="button"
                      onClick={() => selectFixture(f)}
                      className="w-full text-left p-3 rounded-xl bg-arena-gray/20 border border-arena-gray/30 hover:border-arena-green/50 hover:bg-arena-green/5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-arena-text-secondary font-bold">{f.league.name}</span>
                        <span className="text-[10px] text-arena-text-secondary">
                          {new Date(f.fixture.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="truncate">{f.teams.home.name}</span>
                        <span className="text-arena-text-secondary text-xs">vs</span>
                        <span className="truncate">{f.teams.away.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'image' | 'structured')}>
        <TabsList className="bg-arena-gray/40">
          <TabsTrigger value="image">Imagem</TabsTrigger>
          <TabsTrigger value="structured">Estruturada</TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="space-y-3 mt-4">
          <button 
            type="button" 
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-video rounded-2xl border-2 border-dashed border-arena-green/50 bg-arena-gray/20 flex flex-col items-center justify-center gap-2 hover:border-arena-green transition relative overflow-hidden"
          >
            {imageUrl ? (
              <img src={imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <Upload className="w-10 h-10 text-arena-green" />
                <span className="text-sm text-arena-text-secondary">Clique para enviar imagem</span>
              </>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-arena-green" />
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
        </TabsContent>

        <TabsContent value="structured" className="space-y-3 mt-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01"
                value={stakeValue} 
                onChange={(e) => setStakeValue(e.target.value)} 
                className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" 
              />
            </div>
            <div>
              <Label>Odds total</Label>
              <Input 
                type="number" 
                min="0"
                step="0.01" 
                value={odds} 
                onChange={(e) => setOdds(e.target.value)} 
                className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" 
              />
            </div>
            <div>
              <Label>Casa</Label>
              <Input 
                value={bookmakerName} 
                onChange={(e) => setBookmakerName(e.target.value)} 
                className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" 
              />
            </div>
          </div>
          <div>
            <Label>Link da casa</Label>
            <Input 
              type="url" 
              value={bookmakerLink} 
              onChange={(e) => setBookmakerLink(e.target.value)} 
              className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" 
              placeholder="https://..."
            />
          </div>

          <div className="border border-arena-gray rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">Jogos Incluídos</h3>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={addMatch} 
                className="border-arena-green text-arena-green"
              >
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {matches.map((m, i) => (
                <div key={i} className="border border-arena-gray rounded-xl p-3 space-y-2 relative">
                  <button 
                    type="button" 
                    onClick={() => removeMatch(i)} 
                    className="absolute top-2 right-2 text-arena-red hover:text-arena-red/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      placeholder="Time Casa *" 
                      value={m.home_team} 
                      onChange={(e) => updateMatch(i, 'home_team', e.target.value)} 
                      className="bg-arena-gray/40 border-arena-gray rounded-lg" 
                    />
                    <Input 
                      placeholder="Time Fora *" 
                      value={m.away_team} 
                      onChange={(e) => updateMatch(i, 'away_team', e.target.value)} 
                      className="bg-arena-gray/40 border-arena-gray rounded-lg" 
                    />
                  </div>
                  <Input 
                    placeholder="Liga (opcional)" 
                    value={m.league} 
                    onChange={(e) => updateMatch(i, 'league', e.target.value)} 
                    className="bg-arena-gray/40 border-arena-gray rounded-lg" 
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Select 
                      value={m.bet_type} 
                      onValueChange={(v) => updateMatch(i, 'bet_type', v)}
                    >
                      <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-lg col-span-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BET_TYPES.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01" 
                      placeholder="Odds" 
                      value={m.odds} 
                      onChange={(e) => updateMatch(i, 'odds', e.target.value)} 
                      className="bg-arena-gray/40 border-arena-gray rounded-lg" 
                    />
                  </div>
                  <Input 
                    type="datetime-local" 
                    value={m.match_time} 
                    onChange={(e) => updateMatch(i, 'match_time', e.target.value)} 
                    className="bg-arena-gray/40 border-arena-gray rounded-lg" 
                  />
                </div>
              ))}
              {matches.length === 0 && (
                <p className="text-xs text-arena-text-secondary text-center py-3">
                  Nenhum jogo. Clique em "Adicionar".
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 pt-2 border-t border-arena-gray">
        <div>
          <Label>Título *</Label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" 
            placeholder="Ex: Palpite do dia - Brasil vs Argentina"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Esporte *</Label>
            <Select value={sportType} onValueChange={setSportType}>
              <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.filter((s) => s.id !== 'all').map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Campeonato</Label>
            <Input 
              value={championship} 
              onChange={(e) => setChampionship(e.target.value)} 
              className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" 
              placeholder="Ex: Copa do Mundo 2026"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Data do Jogo</Label>
            <Input 
              type="datetime-local"
              value={matchDate} 
              onChange={(e) => setMatchDate(e.target.value)} 
              className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" 
            />
          </div>
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea 
            rows={4} 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" 
            placeholder="Descreva a análise..."
          />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={isHot} onCheckedChange={setIsHot} /> 
            Análise Quente 🔥
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} /> 
            Destaque ⭐
          </label>
        </div>
      </div>

      <Button 
        onClick={save} 
        disabled={saving} 
        className="w-full h-12 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          initial ? 'Salvar Alterações' : 'Publicar Análise'
        )}
      </Button>
    </div>
  );
}