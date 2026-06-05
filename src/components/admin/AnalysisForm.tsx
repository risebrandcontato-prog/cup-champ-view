import { useState, useRef } from 'react';
import { useAuth, db } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Plus, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { SPORTS, BET_TYPES, CHAMPIONSHIPS } from '@/lib/constants';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import type { Analysis, AnalysisMatch } from '@/types';

interface MatchInput { home_team: string; away_team: string; league: string; bet_type: string; odds: string; match_time: string; }

export interface AnalysisFormProps { initial?: Analysis & { matches?: AnalysisMatch[] }; }

export function AnalysisForm({ initial }: AnalysisFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
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
  const [matches, setMatches] = useState<MatchInput[]>(
    initial?.matches?.map((m) => ({ home_team: m.home_team, away_team: m.away_team, league: m.league ?? '', bet_type: m.bet_type, odds: m.odds?.toString() ?? '', match_time: m.match_time ?? '' })) ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('analysis-images').upload(path, file);
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from('analysis-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    toast.success('Imagem enviada');
  };

  const addMatch = () => setMatches((m) => [...m, { home_team: '', away_team: '', league: '', bet_type: 'Resultado Final', odds: '', match_time: '' }]);
  const updateMatch = (i: number, k: keyof MatchInput, v: string) => setMatches((arr) => arr.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  const removeMatch = (i: number) => setMatches((arr) => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!title.trim() || !sportType) { toast.error('Preencha título e esporte'); return; }
    setSaving(true);
    const payload = {
      title, sport_type: sportType, championship: championship || null, description: description || null,
      image_url: tab === 'image' ? imageUrl : null,
      is_hot: isHot, is_featured: isFeatured, display_type: tab,
      stake_value: stakeValue ? parseFloat(stakeValue) : null,
      bookmaker_name: bookmakerName || null, bookmaker_link: bookmakerLink || null,
      odds: odds ? parseFloat(odds) : null,
      created_by: user?.id,
    };
    let analysisId = initial?.id;
    if (initial) {
      const { error } = await db.from('analyses').update(payload).eq('id', initial.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
    } else {
      const { data, error } = await db.from('analyses').insert(payload).select().single();
      if (error || !data) { setSaving(false); toast.error(error?.message ?? 'Erro'); return; }
      analysisId = data.id;
    }
    if (tab === 'structured' && analysisId) {
      await db.from('analysis_matches').delete().eq('analysis_id', analysisId);
      if (matches.length) {
        await db.from('analysis_matches').insert(matches.map((m) => ({
          analysis_id: analysisId, home_team: m.home_team, away_team: m.away_team,
          league: m.league || null, bet_type: m.bet_type,
          odds: m.odds ? parseFloat(m.odds) : null, match_time: m.match_time || null,
        })));
      }
    }
    setSaving(false);
    toast.success(initial ? 'Atualizada' : 'Publicada');
    navigate({ to: '/admin/analyses' });
  };

  const champs = CHAMPIONSHIPS[sportType] ?? [];

  return (
    <div className="space-y-4 max-w-3xl">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'image' | 'structured')}>
        <TabsList className="bg-arena-gray/40">
          <TabsTrigger value="image">Imagem</TabsTrigger>
          <TabsTrigger value="structured">Estruturada</TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="space-y-3 mt-4">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full aspect-video rounded-2xl border-2 border-dashed border-arena-green/50 bg-arena-gray/20 flex flex-col items-center justify-center gap-2 hover:border-arena-green transition relative overflow-hidden">
            {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : (
              <><Upload className="w-10 h-10 text-arena-green" /><span className="text-sm text-arena-text-secondary">Clique para enviar imagem</span></>
            )}
            {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-arena-green" /></div>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
        </TabsContent>

        <TabsContent value="structured" className="space-y-3 mt-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Valor (R$)</Label><Input type="number" value={stakeValue} onChange={(e) => setStakeValue(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <div><Label>Odds total</Label><Input type="number" step="0.01" value={odds} onChange={(e) => setOdds(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <div><Label>Casa</Label><Input value={bookmakerName} onChange={(e) => setBookmakerName(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
          </div>
          <div><Label>Link da casa</Label><Input type="url" value={bookmakerLink} onChange={(e) => setBookmakerLink(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>

          <div className="border border-arena-gray rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">Jogos Incluídos</h3>
              <Button type="button" size="sm" variant="outline" onClick={addMatch} className="border-arena-green text-arena-green"><Plus className="w-3 h-3 mr-1" /> Adicionar</Button>
            </div>
            <div className="space-y-2">
              {matches.map((m, i) => (
                <div key={i} className="border border-arena-gray rounded-xl p-3 space-y-2 relative">
                  <button type="button" onClick={() => removeMatch(i)} className="absolute top-2 right-2 text-arena-red"><X className="w-4 h-4" /></button>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Time Casa" value={m.home_team} onChange={(e) => updateMatch(i, 'home_team', e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-lg" />
                    <Input placeholder="Time Fora" value={m.away_team} onChange={(e) => updateMatch(i, 'away_team', e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-lg" />
                  </div>
                  <Input placeholder="Liga (opcional)" value={m.league} onChange={(e) => updateMatch(i, 'league', e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-lg" />
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={m.bet_type} onValueChange={(v) => updateMatch(i, 'bet_type', v)}>
                      <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-lg col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>{BET_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" step="0.01" placeholder="Odds" value={m.odds} onChange={(e) => updateMatch(i, 'odds', e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-lg" />
                  </div>
                  <Input type="datetime-local" value={m.match_time} onChange={(e) => updateMatch(i, 'match_time', e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-lg" />
                </div>
              ))}
              {matches.length === 0 && <p className="text-xs text-arena-text-secondary text-center py-3">Nenhum jogo. Clique em "Adicionar".</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 pt-2 border-t border-arena-gray">
        <div><Label>Título *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Esporte *</Label>
            <Select value={sportType} onValueChange={setSportType}>
              <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{SPORTS.filter((s) => s.id !== 'all').map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Campeonato</Label>
            {champs.length ? (
              <Select value={championship} onValueChange={setChampionship}>
                <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{champs.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            ) : <Input value={championship} onChange={(e) => setChampionship(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" />}
          </div>
        </div>
        <div><Label>Descrição</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={isHot} onCheckedChange={setIsHot} /> Análise Quente 🔥</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={isFeatured} onCheckedChange={setIsFeatured} /> Destaque ⭐</label>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark">
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (initial ? 'Salvar Alterações' : 'Publicar Análise')}
      </Button>
    </div>
  );
}
