import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/hooks/use-auth';
import type { Bonus } from '@/types';
import { Gift, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/bonuses')({ component: BonusesPage });

function BonusesPage() {
  const [items, setItems] = useState<Bonus[] | null>(null);
  useEffect(() => { db.from('bonuses').select('*').eq('is_active', true).order('created_at', { ascending: false }).then(({ data }: { data: Bonus[] | null }) => setItems(data ?? [])); }, []);

  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-arena-gold" />
        <h1 className="text-2xl font-black">Bônus Exclusivos</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-arena-gray/40 animate-pulse" />)}
        {items?.map((b) => (
          <Sheet key={b.id}>
            <SheetTrigger asChild>
              <button className="text-left rounded-2xl border border-arena-gray bg-arena-dark overflow-hidden hover:border-arena-gold/60 transition">
                {b.image_url && <div className="aspect-video bg-arena-gray"><img src={b.image_url} alt="" className="w-full h-full object-cover" /></div>}
                <div className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-arena-success/20 text-arena-success text-[10px] font-bold uppercase tracking-widest">Ativo</span>
                  <h3 className="font-bold leading-tight mt-2">{b.title}</h3>
                  {b.description && <p className="text-xs text-arena-text-secondary mt-1 line-clamp-2">{b.description}</p>}
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-arena-dark border-arena-gray rounded-t-3xl">
              <SheetHeader><SheetTitle className="text-xl">{b.title}</SheetTitle></SheetHeader>
              {b.image_url && <img src={b.image_url} alt="" className="w-full rounded-xl my-4" />}
              {b.description && <p className="text-arena-text-secondary whitespace-pre-line">{b.description}</p>}
              {b.how_it_works && (
                <div className="mt-4">
                  <h4 className="font-bold uppercase text-xs tracking-widest text-arena-gold mb-2">Como funciona</h4>
                  <p className="text-sm text-arena-text-secondary whitespace-pre-line">{b.how_it_works}</p>
                </div>
              )}
              {b.website_url && (
                <Button asChild className="w-full mt-6 h-12 bg-arena-green text-black font-bold rounded-xl hover:bg-arena-green-dark">
                  <a href={b.website_url} target="_blank" rel="noreferrer">Acessar Site <ExternalLink className="w-4 h-4 ml-2" /></a>
                </Button>
              )}
            </SheetContent>
          </Sheet>
        ))}
      </div>
      {items && items.length === 0 && <p className="text-center text-arena-text-secondary py-12">Nenhum bônus disponível agora.</p>}
    </AppShell>
  );
}
