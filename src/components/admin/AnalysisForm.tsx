import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload, Plus, X, Loader2, AlertTriangle, Search, Link2, CalendarDays,
  Shield, Ticket, ExternalLink, Zap, Trash2, ImageIcon, FileText,
  ChevronDown, Globe, CheckCircle2
} from 'lucide-react';
import { SPORTS, BET_TYPES, BOOKMAKERS } from '@/lib/constants';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import type { Analysis, AnalysisMatch, AnalysisBet, AnalysisBetSelection } from '@/types';
import { sendPushNotification } from '@/lib/send-notification';

/* ─── Types ─── */
interface MatchInput {
  home_team: string;
  away_team: string;
  league: string;
  bet_type: string;
  odds: string;
  match_time: string;
}

interface BetSelectionInput {
  home_team: string;
  away_team: string;
  league: string;
  match_time: string;
  market: string;
  selection: string;
  odds: string;
}

interface ApiFixture {
  fixture: { id: number; date: string; timestamp: number };
  league: { name: string; country: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
}

export interface AnalysisFormProps {
  initial?: Analysis & {
    matches?: AnalysisMatch[];
    bet?: AnalysisBet & { selections?: AnalysisBetSelection[] };
  };
}

/* ─── Constants ─── */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

/* ─── Reusable Image Upload Component ─── */
function ImageUploadField({
  imageUrl,
  uploading,
  onFileSelect,
  onRemove,
  label = 'Imagem da Análise',
  helper = 'Clique para enviar ou arraste uma imagem',
  required = false,
}: {
  imageUrl: string | null;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  label?: string;
  helper?: string;
  required?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-arena-gold" />
          {label}
          {required && <span className="text-arena-red">*</span>}
        </Label>
        {imageUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] text-arena-red hover:text-arena-red/80 font-bold flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Remover
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full relative overflow-hidden rounded-2xl border-2 border-dashed border-arena-green/40 bg-arena-gray/10 hover:border-arena-green hover:bg-arena-green/5 transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[160px] sm:min-h-[200px]"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview da análise"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <>
            <Upload className="w-8 h-8 text-arena-green/70" />
            <span className="text-xs text-arena-text-secondary text-center px-4">
              {helper}
            </span>
            <span className="text-[10px] text-arena-text-secondary/60">
              JPG, PNG, WebP • Máx 5MB
            </span>
          </>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-arena-green" />
            <span className="text-xs text-white font-medium">Enviando...</span>
          </div>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        hidden
        onChange={onFileSelect}
      />
    </div>
  );
}

/* ─── Main Form ─── */
export function AnalysisForm({ initial }: AnalysisFormProps) {
  const navigate = useNavigate();

  /* ─── Validation: constants ─── */
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

  /* ─── State ─── */
  const [tab, setTab] = useState<'image' | 'structured'>(initial?.display_type ?? 'image');
  const [betType, setBetType] = useState<'simples' | 'multipla'>(initial?.bet?.bet_type ?? 'simples');

  // Basic fields
  const [title, setTitle] = useState(initial?.title ?? '');
  const [sportType, setSportType] = useState(initial?.sport_type ?? 'futebol');
  const [championship, setChampionship] = useState(initial?.championship ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [isHot, setIsHot] = useState(initial?.is_hot ?? false);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);

  // Bet fields
  const [bookmakerName, setBookmakerName] = useState(initial?.bet?.bookmaker_name ?? initial?.bookmaker_name ?? '');
  const [bookmakerUrl, setBookmakerUrl] = useState(initial?.bet?.bookmaker_url ?? initial?.bookmaker_link ?? '');
  const [stakeValue, setStakeValue] = useState(initial?.bet?.stake_value?.toString() ?? initial?.stake_value?.toString() ?? '');
  const [totalOdds, setTotalOdds] = useState(initial?.bet?.total_odds?.toString() ?? initial?.odds?.toString() ?? '');
  const [betNotes, setBetNotes] = useState(initial?.bet?.notes ?? '');

  // Selections
  const [selections, setSelections] = useState<BetSelectionInput[]>(
    initial?.bet?.selections?.map((s) => ({
      home_team: s.home_team,
      away_team: s.away_team,
      league: s.league ?? '',
      match_time: s.match_time ? s.match_time.slice(0, 16) : '',
      market: s.market,
      selection: s.selection,
      odds: s.odds?.toString() ?? '',
    })) ?? []
  );

  // Legacy matches
  const [matches, setMatches] = useState<<MatchInput[]>(
    initial?.matches?.map((m) => ({
      home_team: m.home_team,
      away_team: m.away_team,
      league: m.league ?? '',
      bet_type: m.bet_type ?? 'Resultado Final',
      odds: m.odds?.toString() ?? '',
      match_time: m.match_time ? m.match_time.slice(0, 16) : '',
    })) ?? []
  );

  const [matchDate, setMatchDate] = useState(initial?.match_date ? initial.match_date.slice(0, 16) : '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // API Fixture
  const [useApiFixture, setUseApiFixture] = useState(!!initial?.fixture_id);
  const [fixtureId, setFixtureId] = useState<number | null>(initial?.fixture_id ?? null);
  const [todayFixtures, setTodayFixtures] = useState<ApiFixture[]>([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [fixtureSearch, setFixtureSearch] = useState('');

  /* ─── Effects ─── */
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
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.functions.invoke('api-football', {
          body: {
            endpoint: 'fixtures',
            params: { date: today, timezone: 'America/Sao_Paulo' },
          },
        });
        if (cancelled) return;
        if (error) throw error;
        const fixtures = (data?.response || []).filter(
          (f: any) => f?.fixture?.id && f?.teams?.home?.name && f?.teams?.away?.name
        );
        setTodayFixtures(fixtures);
      } catch (err) {
        console.error('[AnalysisForm] Erro ao buscar jogos:', err);
        if (!cancelled) toast.error('Erro ao buscar jogos do dia');
      } finally {
        if (!cancelled) setLoadingFixtures(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useApiFixture]);

  /* ─── Handlers ─── */
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

    setSelections([
      {
        home_team: home,
        away_team: away,
        league: league,
        match_time: date ? date.slice(0, 16) : '',
        market: 'Resultado Final',
        selection: 'Casa',
        odds: '',
      },
    ]);

    toast.success(`Jogo selecionado: ${home} vs ${away}`);
  }, []);

  const clearFixture = useCallback(() => {
    setFixtureId(null);
    setTodayFixtures([]);
    setFixtureSearch('');
  }, []);

  const extractFromUrl = useCallback(async () => {
    if (!bookmakerUrl.trim()) {
      toast.error('Cole a URL do bilhete primeiro');
      return;
    }

    setExtracting(true);

    const url = bookmakerUrl.toLowerCase();
    const detected =
      BOOKMAKERS.find((b) => url.includes(b.name.toLowerCase()))?.name ?? '';

    if (detected) {
      setBookmakerName(detected);
    }

    await new Promise((r) => setTimeout(r, 600));
    setExtracting(false);

    toast.success('URL analisada! Verifique os dados e complete as informações.');

    if (selections.length === 0) {
      setSelections([
        {
          home_team: '',
          away_team: '',
          league: '',
          match_time: '',
          market: 'Resultado Final',
          selection: '',
          odds: '',
        },
      ]);
    }
  }, [bookmakerUrl, selections.length]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error('Formato inválido. Use JPG, PNG ou WebP.');
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast.error('Imagem deve ter no máximo 5MB');
        return;
      }

      setUploading(true);
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const path = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      try {
        const { error } = await supabase.storage
          .from('analysis-images')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data } = supabase.storage.from('analysis-images').getPublicUrl(path);
        setImageUrl(data.publicUrl);
        toast.success('Imagem enviada com sucesso');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro no upload';
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const removeImage = useCallback(() => {
    setImageUrl(null);
  }, []);

  const addSelection = useCallback(() => {
    setSelections((s) => [
      ...s,
      {
        home_team: '',
        away_team: '',
        league: '',
        match_time: '',
        market: 'Resultado Final',
        selection: '',
        odds: '',
      },
    ]);
  }, []);

  const updateSelection = useCallback(
    (i: number, k: keyof BetSelectionInput, v: string) => {
      setSelections((arr) => arr.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
    },
    []
  );

  const removeSelection = useCallback((i: number) => {
    setSelections((arr) => arr.filter((_, idx) => idx !== i));
  }, []);

  const addMatch = useCallback(() => {
    setMatches((m) => [
      ...m,
      {
        home_team: '',
        away_team: '',
        league: '',
        bet_type: 'Resultado Final',
        odds: '',
        match_time: '',
      },
    ]);
  }, []);

  const updateMatch = useCallback(
    (i: number, k: keyof MatchInput, v: string) => {
      setMatches((arr) => arr.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));
    },
    []
  );

  const removeMatch = useCallback((i: number) => {
    setMatches((arr) => arr.filter((_, idx) => idx !== i));
  }, []);

  /* ─── Save ─── */
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

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        image_url: imageUrl,
        is_hot: isHot,
        is_featured: isFeatured,
        display_type: tab,
        stake_value: stakeValue ? parseFloat(stakeValue) : null,
        bookmaker_name: bookmakerName.trim() || null,
        bookmaker_link: bookmakerUrl.trim() || null,
        odds: totalOdds ? parseFloat(totalOdds) : null,
        match_date: matchDate || null,
        fixture_id: fixtureId,
        created_by: user.id,
      };

      let analysisId = initial?.id;

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

      // Save structured bet
      if (analysisId && tab === 'structured') {
        await supabase.from('analysis_bets').delete().eq('analysis_id', analysisId);

        const validSelections = selections.filter(
          (s) => s.home_team.trim() && s.away_team.trim() && s.selection.trim()
        );

        if (validSelections.length > 0 || bookmakerUrl.trim()) {
          const { data: betData, error: betError } = await supabase
            .from('analysis_bets')
            .insert({
              analysis_id: analysisId,
              bookmaker_name: bookmakerName.trim() || 'Bet365',
              bookmaker_url: bookmakerUrl.trim(),
              bet_type: betType,
              stake_value: stakeValue ? parseFloat(stakeValue) : null,
              total_odds: totalOdds ? parseFloat(totalOdds) : null,
              notes: betNotes.trim() || null,
              status: 'active',
            })
            .select()
            .single();

          if (betError) throw betError;

          if (betData?.id && validSelections.length > 0) {
            const { error: selError } = await supabase
              .from('analysis_bet_selections')
              .insert(
                validSelections.map((s, idx) => ({
                  bet_id: betData.id,
                  home_team: s.home_team.trim(),
                  away_team: s.away_team.trim(),
                  league: s.league.trim() || null,
                  match_time: s.match_time || null,
                  market: s.market,
                  selection: s.selection.trim(),
                  odds: s.odds ? parseFloat(s.odds) : null,
                  sort_order: idx,
                }))
              );

            if (selError) throw selError;
          }
        }
      }

      // Save legacy matches
      if (tab === 'structured' && analysisId) {
        await supabase.from('analysis_matches').delete().eq('analysis_id', analysisId);

        const validMatches = matches.filter((m) => m.home_team.trim() && m.away_team.trim());

        if (validMatches.length) {
          const { error: matchesError } = await supabase
            .from('analysis_matches')
            .insert(
              validMatches.map((m) => ({
                analysis_id: analysisId,
                home_team: m.home_team.trim(),
                away_team: m.away_team.trim(),
                league: m.league.trim() || null,
                bet_type: m.bet_type,
                odds: m.odds ? parseFloat(m.odds) : null,
                match_time: m.match_time || null,
              }))
            );

          if (matchesError) throw matchesError;
        }
      }

      // Push notification (only on create)
      if (!initial?.id && analysisId) {
        const pushTitle = isHot ? '🔥 ' + title.trim() : '⚽ ' + title.trim();
        const pushBody = description.trim().slice(0, 120) || 'Nova análise esportiva disponível!';

        const pushResult = await sendPushNotification({
          title: pushTitle,
          body: pushBody,
          tag: `analysis-${analysisId}`,
          url: `/analysis/${analysisId}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          requireInteraction: false,
        });

        if (pushResult.success) {
          toast.success(`Notificação enviada para ${pushResult.sent} usuários`);
        } else {
          console.warn('[AnalysisForm] Push failed:', pushResult.error);
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
  }, [
    title,
    sportType,
    championship,
    description,
    imageUrl,
    isHot,
    isFeatured,
    tab,
    stakeValue,
    bookmakerName,
    bookmakerUrl,
    totalOdds,
    betNotes,
    betType,
    selections,
    matches,
    matchDate,
    fixtureId,
    initial,
    navigate,
  ]);

  /* ─── Derived state ─── */
  const filteredFixtures = useMemo(() => {
    if (!fixtureSearch.trim()) return todayFixtures;
    const search = fixtureSearch.toLowerCase();
    return todayFixtures.filter(
      (f) =>
        f.teams.home.name.toLowerCase().includes(search) ||
        f.teams.away.name.toLowerCase().includes(search) ||
        f.league.name.toLowerCase().includes(search)
    );
  }, [todayFixtures, fixtureSearch]);

  const bookmakerColor = useMemo(
    () => BOOKMAKERS.find((b) => b.name === bookmakerName)?.color ?? '#00C853',
    [bookmakerName]
  );

  const potentialReturn = useMemo(() => {
    const stake = parseFloat(stakeValue);
    const odds = parseFloat(totalOdds);
    if (!stake || !odds || stake <= 0 || odds <= 0) return null;
    return (stake * odds).toFixed(2);
  }, [stakeValue, totalOdds]);

  /* ─── Render ─── */
  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
        <div className="flex items-center gap-2 mb-3">
          <Ticket className="w-5 h-5 text-arena-gold" />
          <span className="text-sm font-black uppercase tracking-wider">
            {initial ? 'Editar Análise' : 'Nova Análise'}
          </span>
        </div>

        {/* Bet type */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => setBetType('simples')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              betType === 'simples'
                ? 'bg-arena-green text-black shadow-lg shadow-arena-green/20'
                : 'bg-arena-gray/40 text-arena-text-secondary hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" /> Simples
          </button>
          <button
            type="button"
            onClick={() => setBetType('multipla')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              betType === 'multipla'
                ? 'bg-arena-gold text-black shadow-lg shadow-arena-gold/20'
                : 'bg-arena-gray/40 text-arena-text-secondary hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" /> Múltipla
          </button>
        </div>

        {/* Display type */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'image' | 'structured')}>
          <TabsList className="bg-arena-gray/40 w-full">
            <TabsTrigger value="image" className="flex-1 gap-1">
              <ImageIcon className="w-3.5 h-3.5" /> Imagem
            </TabsTrigger>
            <TabsTrigger value="structured" className="flex-1 gap-1">
              <FileText className="w-3.5 h-3.5" /> Estruturada
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ─── URL DO BILHETE (structured only) ─── */}
      {tab === 'structured' && (
        <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-arena-green" />
            <span className="text-sm font-bold">Link do Bilhete</span>
            <span className="text-[10px] text-arena-text-secondary ml-auto">
              Cole a URL da casa de aposta
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-text-secondary" />
              <Input
                value={bookmakerUrl}
                onChange={(e) => setBookmakerUrl(e.target.value)}
                className="pl-9 bg-arena-gray/40 border-arena-gray rounded-xl"
                placeholder="https://www.bet365.com/#/AC/B1/C1/D8/E..."
              />
            </div>
            <Button
              type="button"
              onClick={extractFromUrl}
              disabled={extracting || !bookmakerUrl.trim()}
              className="bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark disabled:opacity-50 shrink-0"
            >
              {extracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span className="ml-1">Extrair</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-arena-text-secondary">Casa:</Label>
            <Select value={bookmakerName} onValueChange={setBookmakerName}>
              <SelectTrigger className="w-44 bg-arena-gray/40 border-arena-gray rounded-lg text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKMAKERS.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      {b.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {bookmakerName && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold text-black"
                style={{ backgroundColor: bookmakerColor }}
              >
                {bookmakerName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── API FIXTURE ─── */}
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
                <X className="w-3 h-3 mr-1" /> Limpar
              </Button>
            )}
          </div>

          {fixtureId ? (
            <div className="p-3 rounded-xl bg-arena-green/10 border border-arena-green/30 flex items-center gap-3">
              <Shield className="w-5 h-5 text-arena-green shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{title}</p>
                <p className="text-xs text-arena-text-secondary">
                  {championship} • ID: {fixtureId}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-arena-green text-black text-[10px] font-black shrink-0">
                SELECIONADO
              </span>
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
                  {fixtureSearch.trim()
                    ? 'Nenhum jogo encontrado.'
                    : 'Nenhum jogo disponível para hoje.'}
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
                        <span className="text-[10px] text-arena-text-secondary font-bold">
                          {f.league.name}
                        </span>
                        <span className="text-[10px] text-arena-text-secondary">
                          {new Date(f.fixture.date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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

      {/* ─── TABS CONTENT ─── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'image' | 'structured')}>
        {/* ─── IMAGE TAB ─── */}
        <TabsContent value="image" className="space-y-3 mt-0">
          <ImageUploadField
            imageUrl={imageUrl}
            uploading={uploading}
            onFileSelect={handleImageUpload}
            onRemove={removeImage}
            label="Imagem da Análise"
            helper="Clique para enviar a imagem do bilhete"
            required
          />
        </TabsContent>

        {/* ─── STRUCTURED TAB ─── */}
        <TabsContent value="structured" className="space-y-4 mt-0">
          {/* 🆕 UPLOAD DE IMAGEM TAMBÉM NA ESTRUTURADA */}
          <ImageUploadField
            imageUrl={imageUrl}
            uploading={uploading}
            onFileSelect={handleImageUpload}
            onRemove={removeImage}
            label="Imagem do Bilhete (Opcional)"
            helper="Anexe a imagem do bilhete para referência"
          />

          {/* Selections */}
          <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-arena-gold" />
                <span className="text-sm font-bold">
                  {betType === 'simples'
                    ? 'Seleção do Bilhete'
                    : `Seleções do Bilhete (${selections.length})`}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addSelection}
                className="border-arena-green text-arena-green text-xs h-8"
              >
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {selections.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-arena-gray bg-arena-gray/20 p-3 space-y-2 relative"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-arena-gold uppercase tracking-wider">
                      {betType === 'multipla' ? `Jogo ${i + 1}` : 'Jogo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSelection(i)}
                      className="text-arena-red hover:text-arena-red/80 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Time Casa *"
                      value={s.home_team}
                      onChange={(e) => updateSelection(i, 'home_team', e.target.value)}
                      className="bg-arena-gray/40 border-arena-gray rounded-lg text-sm"
                    />
                    <Input
                      placeholder="Time Fora *"
                      value={s.away_team}
                      onChange={(e) => updateSelection(i, 'away_team', e.target.value)}
                      className="bg-arena-gray/40 border-arena-gray rounded-lg text-sm"
                    />
                  </div>

                  <Input
                    placeholder="Liga/Campeonato"
                    value={s.league}
                    onChange={(e) => updateSelection(i, 'league', e.target.value)}
                    className="bg-arena-gray/40 border-arena-gray rounded-lg text-sm"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select
                      value={s.market}
                      onValueChange={(v) => updateSelection(i, 'market', v)}
                    >
                      <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-lg text-xs">
                        <SelectValue placeholder="Mercado" />
                      </SelectTrigger>
                      <SelectContent>
                        {BET_TYPES.map((b) => (
                          <SelectItem key={String(b)} value={String(b)} className="text-xs">
                            {String(b)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Seleção *"
                      value={s.selection}
                      onChange={(e) => updateSelection(i, 'selection', e.target.value)}
                      className="bg-arena-gray/40 border-arena-gray rounded-lg text-sm"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Odds"
                      value={s.odds}
                      onChange={(e) => updateSelection(i, 'odds', e.target.value)}
                      className="bg-arena-gray/40 border-arena-gray rounded-lg text-sm"
                    />
                  </div>

                  <Input
                    type="datetime-local"
                    value={s.match_time}
                    onChange={(e) => updateSelection(i, 'match_time', e.target.value)}
                    className="bg-arena-gray/40 border-arena-gray rounded-lg text-xs"
                  />
                </div>
              ))}

              {selections.length === 0 && (
                <div className="text-center py-6 border border-dashed border-arena-gray rounded-xl">
                  <Ticket className="w-8 h-8 text-arena-gray mx-auto mb-2" />
                  <p className="text-xs text-arena-text-secondary">
                    Nenhuma seleção. Clique em "Adicionar" ou cole a URL do bilhete.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bet values */}
          <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-arena-green" />
              <span className="text-sm font-bold">Valores do Bilhete</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-arena-text-secondary">Stake/Valor (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stakeValue}
                  onChange={(e) => setStakeValue(e.target.value)}
                  className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm"
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-xs text-arena-text-secondary">Odds Total</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalOdds}
                  onChange={(e) => setTotalOdds(e.target.value)}
                  className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1 text-sm"
                  placeholder="@0.00"
                />
              </div>
            </div>

            {potentialReturn && (
              <div className="mt-3 p-3 rounded-xl bg-arena-green/10 border border-arena-green/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-arena-text-secondary">Retorno Potencial:</span>
                  <span className="text-lg font-black text-arena-green">
                    R$ {potentialReturn}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
            <Label className="text-xs text-arena-text-secondary flex items-center gap-1 mb-2">
              <FileText className="w-3 h-3" /> Observações do Admin
            </Label>
            <Textarea
              rows={3}
              value={betNotes}
              onChange={(e) => setBetNotes(e.target.value)}
              className="bg-arena-gray/40 border-arena-gray rounded-xl text-sm"
              placeholder="Notas internas sobre o bilhete..."
            />
          </div>

          {/* Legacy matches */}
          <details className="rounded-2xl border border-arena-gray/50 bg-arena-dark/50">
            <summary className="p-3 text-xs text-arena-text-secondary cursor-pointer flex items-center gap-2 hover:text-white transition-colors list-none select-none">
              <ChevronDown className="w-3 h-3" />
              Dados Legados (matches antigos)
            </summary>
            <div className="p-3 pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-arena-text-secondary">
                  Compatibilidade com versão anterior
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addMatch}
                  className="border-arena-gray text-arena-text-secondary text-xs h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {matches.map((m, i) => (
                <div
                  key={i}
                  className="border border-arena-gray/50 rounded-lg p-2 space-y-1 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeMatch(i)}
                    className="absolute top-1 right-1 text-arena-red"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="grid grid-cols-2 gap-1">
                    <Input
                      placeholder="Casa"
                      value={m.home_team}
                      onChange={(e) => updateMatch(i, 'home_team', e.target.value)}
                      className="bg-arena-gray/40 border-arena-gray rounded text-xs h-7"
                    />
                    <Input
                      placeholder="Fora"
                      value={m.away_team}
                      onChange={(e) => updateMatch(i, 'away_team', e.target.value)}
                      className="bg-arena-gray/40 border-arena-gray rounded text-xs h-7"
                    />
                  </div>
                </div>
              ))}
            </div>
          </details>
        </TabsContent>
      </Tabs>

      {/* ─── COMMON FIELDS ─── */}
      <div className="space-y-3 pt-2 border-t border-arena-gray">
        <div>
          <Label>Título *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"
            placeholder="Ex: Palmeiras vs Flamengo - Brasileirão"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Esporte *</Label>
            <Select value={sportType} onValueChange={setSportType}>
              <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.filter((s) => s.id !== 'all').map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
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

        <div>
          <Label>Data do Jogo</Label>
          <Input
            type="datetime-local"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"
          />
        </div>

        <div>
          <Label>Descrição da Análise</Label>
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"
            placeholder="Descreva a análise, estatísticas, motivação..."
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={isHot} onCheckedChange={setIsHot} />
            <span className="select-none">Análise Quente 🔥</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            <span className="select-none">Destaque ⭐</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={save}
        disabled={saving}
        className="w-full h-12 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : initial ? (
          'Salvar Alterações'
        ) : (
          'Publicar Análise'
        )}
      </Button>
    </div>
  );
}