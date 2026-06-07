import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { AdminPageHeader } from './admin';
import { db, useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import type { NewsItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Upload, Star, Loader2, Bot, RefreshCw, ExternalLink } from 'lucide-react';
import { NEWS_CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/news')({ component: NewsAdmin });

function NewsAdmin() {
  const { user } = useAuth();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Geral');
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ═══════════════════════════════════════════════════════════════
  // NOTÍCIAS AUTOMÁTICAS — Estado
  // ═══════════════════════════════════════════════════════════════
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoKeywords, setAutoKeywords] = useState('');
  const [autoInterval, setAutoInterval] = useState(30);
  const [configLoading, setConfigLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const load = async () => { 
    const { data } = await db.from('news').select('*').order('created_at', { ascending: false }); 
    setItems((data as NewsItem[]) ?? []); 
  };

  // Carregar config de notícias automáticas
  const loadConfig = async () => {
    try {
      const { data, error } = await db.from('news_config').select('*').limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        setAutoEnabled(data.auto_news_enabled ?? false);
        setAutoKeywords(data.auto_news_keywords ?? '');
        setAutoInterval(data.auto_news_interval_minutes ?? 30);
        setLastFetch(data.last_fetch_at);
      }
    } catch (err) {
      console.error('[NewsAdmin] Error loading config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    loadConfig();
  }, []);

  const openNew = () => { 
    setEditing(null); 
    setTitle(''); 
    setContent(''); 
    setCategory('Geral'); 
    setFeatured(false); 
    setImageUrl(null); 
    setOpen(true); 
  };

  const openEdit = (n: NewsItem) => { 
    setEditing(n); 
    setTitle(n.title); 
    setContent(n.content); 
    setCategory(n.category); 
    setFeatured(n.is_featured); 
    setImageUrl(n.image_url); 
    setOpen(true); 
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file || !user) return;
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('news-images').upload(path, file);
    if (error) { 
      toast.error(error.message); 
      return; 
    }
    setImageUrl(supabase.storage.from('news-images').getPublicUrl(path).data.publicUrl);
  };

  const save = async () => {
    if (!title || !content) { 
      toast.error('Título e conteúdo obrigatórios'); 
      return; 
    }
    setSaving(true);
    const payload = { 
      title, 
      content, 
      category, 
      is_featured: featured, 
      image_url: imageUrl, 
      created_by: user?.id 
    };
    const { error } = editing
      ? await db.from('news').update(payload).eq('id', editing.id)
      : await db.from('news').insert(payload);
    setSaving(false);
    if (error) { 
      toast.error(error.message); 
      return; 
    }
    toast.success('Salvo'); 
    setOpen(false); 
    load();
  };

  const remove = async (id: string) => { 
    if (!confirm('Excluir?')) return; 
    await db.from('news').delete().eq('id', id); 
    load(); 
  };

  // ═══════════════════════════════════════════════════════════════
  // SALVAR CONFIGURAÇÃO DE NOTÍCIAS AUTOMÁTICAS
  // ═══════════════════════════════════════════════════════════════
  const saveAutoConfig = async () => {
    try {
      const { data: existing } = await db.from('news_config').select('id').limit(1).maybeSingle();

      const payload = {
        auto_news_enabled: autoEnabled,
        auto_news_keywords: autoKeywords || null,
        auto_news_interval_minutes: autoInterval,
      };

      if (existing?.id) {
        await db.from('news_config').update(payload).eq('id', existing.id);
      } else {
        await db.from('news_config').insert(payload);
      }

      toast.success(autoEnabled ? 'Notícias automáticas ativadas' : 'Notícias automáticas desativadas');
    } catch (err) {
      toast.error('Erro ao salvar configuração');
      console.error(err);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // DISPARAR BUSCA MANUAL
  // ═══════════════════════════════════════════════════════════════
  const triggerFetch = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        body: {},
      });
      if (error) throw error;
      toast.success(`${data?.fetched || 0} notícias importadas`);
      load(); // Recarregar lista
      loadConfig(); // Atualizar last_fetch
    } catch (err) {
      toast.error('Erro ao buscar notícias');
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  return (
    <>
      <AdminPageHeader 
        title="Notícias" 
        action={
          <Button onClick={openNew} className="bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark">
            <Plus className="w-4 h-4 mr-1" /> Nova
          </Button>
        } 
      />

      {/* ═══════════════════════════════════════════════════════════════
          PAINEL DE NOTÍCIAS AUTOMÁTICAS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-arena-gray/60 bg-arena-dark/80 p-5 mb-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-arena-green/20 to-arena-green/5 border border-arena-green/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-arena-green" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white">
              Notícias Automáticas
            </h2>
            <p className="text-[10px] text-arena-text-secondary/60 font-medium tracking-wider uppercase">
              NewsAPI — Futebol Mundial
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Toggle ativar/desativar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-arena-gray/20 border border-arena-gray/30">
            <div>
              <p className="text-sm font-semibold text-white">Ativar notícias automáticas</p>
              <p className="text-xs text-arena-text-secondary/60 mt-0.5">
                Busca notícias de futebol a cada {autoInterval} minutos
              </p>
            </div>
            <Switch 
              checked={autoEnabled} 
              onCheckedChange={(v) => { setAutoEnabled(v); }}
            />
          </div>

          {/* Keywords */}
          <div>
            <Label className="text-xs text-arena-text-secondary/70">Palavras-chave (opcional)</Label>
            <Input 
              value={autoKeywords} 
              onChange={(e) => setAutoKeywords(e.target.value)}
              placeholder='futebol, brasileirão, premier league...'
              className="bg-arena-gray/30 border-arena-gray/40 rounded-xl mt-1.5 text-sm"
            />
            <p className="text-[10px] text-arena-text-secondary/40 mt-1">
              Deixe vazio para usar o padrão: futebol, brasileirão, premier league, la liga, copa do mundo
            </p>
          </div>

          {/* Intervalo */}
          <div>
            <Label className="text-xs text-arena-text-secondary/70">Intervalo (minutos)</Label>
            <Select value={String(autoInterval)} onValueChange={(v) => setAutoInterval(Number(v))}>
              <SelectTrigger className="bg-arena-gray/30 border-arena-gray/40 rounded-xl mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Última busca */}
          {lastFetch && (
            <p className="text-[11px] text-arena-text-secondary/50">
              Última busca: {new Date(lastFetch).toLocaleString('pt-BR')}
            </p>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={saveAutoConfig}
              className="flex-1 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark"
            >
              Salvar Configuração
            </Button>
            <Button 
              onClick={triggerFetch}
              disabled={fetching}
              variant="outline"
              className="border-arena-green/40 text-arena-green hover:bg-arena-green/10 rounded-xl"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-arena-dark border-arena-gray max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} Notícia</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <button onClick={() => fileRef.current?.click()} className="w-full aspect-video rounded-xl border-2 border-dashed border-arena-green/50 flex items-center justify-center relative overflow-hidden">
              {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-arena-green" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
            <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <div><Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{NEWS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Conteúdo</Label><Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={featured} onCheckedChange={setFeatured} /> Destaque</label>
            <Button onClick={save} disabled={saving} className="w-full bg-arena-green text-black font-bold rounded-xl">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-arena-gray bg-arena-dark divide-y divide-arena-gray">
        {items.map((n) => (
          <div key={n.id} className="p-3 flex items-center gap-3">
            {n.image_url && <img src={n.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${n.is_auto ? 'bg-arena-green/20 text-arena-green' : 'bg-arena-gray text-arena-text-secondary'}`}>
                  {n.is_auto ? 'Auto' : n.category}
                </span>
                {n.is_featured && <Star className="w-3 h-3 text-arena-gold" />}
                {n.source_name && (
                  <span className="text-[9px] text-arena-text-secondary/50 truncate">
                    {n.source_name}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold truncate mt-1">{n.title}</p>
            </div>
            {n.source_url && (
              <a 
                href={n.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-arena-gray text-arena-text-secondary/50"
                title="Ver original"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button onClick={() => openEdit(n)} className="p-2 rounded-lg hover:bg-arena-gray"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => remove(n.id)} className="p-2 rounded-lg hover:bg-arena-red/20 text-arena-red"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="p-8 text-center text-arena-text-secondary">Nenhuma notícia.</p>}
      </div>
    </>
  );
}