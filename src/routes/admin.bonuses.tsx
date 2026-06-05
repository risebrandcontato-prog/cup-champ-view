import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { AdminPageHeader } from './admin';
import { db, useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import type { Bonus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/bonuses')({ component: BonusesAdmin });

function BonusesAdmin() {
  const { user } = useAuth();
  const [items, setItems] = useState<Bonus[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bonus | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [howItWorks, setHowItWorks] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => { const { data } = await db.from('bonuses').select('*').order('created_at', { ascending: false }); setItems((data as Bonus[]) ?? []); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setTitle(''); setDescription(''); setHowItWorks(''); setWebsiteUrl(''); setImageUrl(null); setActive(true); setOpen(true); };
  const openEdit = (b: Bonus) => { setEditing(b); setTitle(b.title); setDescription(b.description ?? ''); setHowItWorks(b.how_it_works ?? ''); setWebsiteUrl(b.website_url ?? ''); setImageUrl(b.image_url); setActive(b.is_active); setOpen(true); };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('bonus-images').upload(path, file);
    if (error) { toast.error(error.message); return; }
    setImageUrl(supabase.storage.from('bonus-images').getPublicUrl(path).data.publicUrl);
  };

  const save = async () => {
    if (!title) { toast.error('Título obrigatório'); return; }
    setSaving(true);
    const payload = { title, description: description || null, how_it_works: howItWorks || null, website_url: websiteUrl || null, image_url: imageUrl, is_active: active, created_by: user?.id };
    const { error } = editing ? await db.from('bonuses').update(payload).eq('id', editing.id) : await db.from('bonuses').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Salvo'); setOpen(false); load();
  };

  const remove = async (id: string) => { if (!confirm('Excluir?')) return; await db.from('bonuses').delete().eq('id', id); load(); };

  return (
    <>
      <AdminPageHeader title="Bônus" action={<Button onClick={openNew} className="bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark"><Plus className="w-4 h-4 mr-1" /> Novo</Button>} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-arena-dark border-arena-gray max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Bônus</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <button onClick={() => fileRef.current?.click()} className="w-full aspect-video rounded-xl border-2 border-dashed border-arena-green/50 flex items-center justify-center relative overflow-hidden">
              {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-arena-green" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
            <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <div><Label>Como funciona (passo a passo)</Label><Textarea rows={5} value={howItWorks} onChange={(e) => setHowItWorks(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <div><Label>Site URL</Label><Input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="bg-arena-gray/40 border-arena-gray rounded-xl mt-1" /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} /> Ativo</label>
            <Button onClick={save} disabled={saving} className="w-full bg-arena-green text-black font-bold rounded-xl">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-arena-gray bg-arena-dark divide-y divide-arena-gray">
        {items.map((b) => (
          <div key={b.id} className="p-3 flex items-center gap-3">
            {b.image_url && <img src={b.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${b.is_active ? 'bg-arena-success/20 text-arena-success' : 'bg-arena-gray text-arena-text-secondary'}`}>{b.is_active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <p className="text-sm font-semibold truncate mt-1">{b.title}</p>
            </div>
            <button onClick={() => openEdit(b)} className="p-2 rounded-lg hover:bg-arena-gray"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => remove(b.id)} className="p-2 rounded-lg hover:bg-arena-red/20 text-arena-red"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="p-8 text-center text-arena-text-secondary">Nenhum bônus.</p>}
      </div>
    </>
  );
}
