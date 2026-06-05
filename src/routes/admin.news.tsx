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
import { Plus, Trash2, Pencil, Upload, Star, Loader2 } from 'lucide-react';
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

  const load = async () => { const { data } = await db.from('news').select('*').order('created_at', { ascending: false }); setItems((data as NewsItem[]) ?? []); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setTitle(''); setContent(''); setCategory('Geral'); setFeatured(false); setImageUrl(null); setOpen(true); };
  const openEdit = (n: NewsItem) => { setEditing(n); setTitle(n.title); setContent(n.content); setCategory(n.category); setFeatured(n.is_featured); setImageUrl(n.image_url); setOpen(true); };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('news-images').upload(path, file);
    if (error) { toast.error(error.message); return; }
    setImageUrl(supabase.storage.from('news-images').getPublicUrl(path).data.publicUrl);
  };

  const save = async () => {
    if (!title || !content) { toast.error('Título e conteúdo obrigatórios'); return; }
    setSaving(true);
    const payload = { title, content, category, is_featured: featured, image_url: imageUrl, created_by: user?.id };
    const { error } = editing
      ? await db.from('news').update(payload).eq('id', editing.id)
      : await db.from('news').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Salvo'); setOpen(false); load();
  };

  const remove = async (id: string) => { if (!confirm('Excluir?')) return; await db.from('news').delete().eq('id', id); load(); };

  return (
    <>
      <AdminPageHeader title="Notícias" action={<Button onClick={openNew} className="bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark"><Plus className="w-4 h-4 mr-1" /> Nova</Button>} />
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
                <span className="px-1.5 py-0.5 rounded bg-arena-gray text-[9px] uppercase font-bold">{n.category}</span>
                {n.is_featured && <Star className="w-3 h-3 text-arena-gold" />}
              </div>
              <p className="text-sm font-semibold truncate mt-1">{n.title}</p>
            </div>
            <button onClick={() => openEdit(n)} className="p-2 rounded-lg hover:bg-arena-gray"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => remove(n.id)} className="p-2 rounded-lg hover:bg-arena-red/20 text-arena-red"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="p-8 text-center text-arena-text-secondary">Nenhuma notícia.</p>}
      </div>
    </>
  );
}
