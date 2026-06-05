import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/hooks/use-auth';
import type { NewsItem } from '@/types';
import { Newspaper } from 'lucide-react';

export const Route = createFileRoute('/news')({ component: NewsPage });

function NewsPage() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  useEffect(() => { db.from('news').select('*').order('created_at', { ascending: false }).then(({ data }: { data: NewsItem[] | null }) => setItems(data ?? [])); }, []);

  const featured = (items ?? []).filter((n) => n.is_featured)[0];
  const rest = (items ?? []).filter((n) => !featured || n.id !== featured.id);

  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-arena-green" />
        <h1 className="text-2xl font-black">Notícias</h1>
      </div>

      {featured && (
        <Link to="/news/$id" params={{ id: featured.id }} className="block mb-5">
          <div className="relative h-56 rounded-2xl overflow-hidden border border-arena-gray">
            {featured.image_url ? <img src={featured.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-arena-green/30 to-arena-gold/10" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-arena-gold text-black text-[10px] font-black uppercase tracking-widest">Destaque</span>
            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-[10px] uppercase tracking-widest text-arena-gold">{featured.category}</span>
              <h2 className="font-bold text-white text-lg leading-tight mt-1">{featured.title}</h2>
            </div>
          </div>
        </Link>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {(items === null) && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-arena-gray/40 animate-pulse" />)}
        {rest.map((n) => (
          <Link key={n.id} to="/news/$id" params={{ id: n.id }} className="rounded-2xl border border-arena-gray bg-arena-dark overflow-hidden hover:border-arena-green/50 transition">
            {n.image_url && <div className="aspect-video bg-arena-gray"><img src={n.image_url} alt="" className="w-full h-full object-cover" /></div>}
            <div className="p-3">
              <span className="text-[10px] uppercase tracking-widest text-arena-green font-bold">{n.category}</span>
              <h3 className="font-bold leading-tight mt-1 line-clamp-2">{n.title}</h3>
              <p className="text-[10px] text-arena-text-secondary mt-1">{new Date(n.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </Link>
        ))}
      </div>
      {items && items.length === 0 && <p className="text-center text-arena-text-secondary py-12">Nenhuma notícia ainda.</p>}
    </AppShell>
  );
}
