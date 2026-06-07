import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/hooks/use-auth';
import type { NewsItem } from '@/types';
import { Newspaper, ExternalLink, Bot, Clock } from 'lucide-react';

export const Route = createFileRoute('/news')({ component: NewsPage });

function NewsPage() {
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => { 
    db.from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }: { data: NewsItem[] | null }) => setItems(data ?? [])); 
  }, []);

  const featured = (items ?? []).filter((n) => n.is_featured)[0];
  const rest = (items ?? []).filter((n) => !featured || n.id !== featured.id);

  return (
    <AppShell>
      {/* Header refinado */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-arena-green/20 to-arena-green/5 border border-arena-green/20 flex items-center justify-center">
          <Newspaper className="w-5 h-5 text-arena-green" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">Notícias</h1>
          <p className="text-[10px] text-arena-text-secondary/50 font-medium tracking-wider uppercase">
            Fique por dentro do mundo do futebol
          </p>
        </div>
      </div>

      {/* Notícia em destaque */}
      {featured && (
        <Link to="/news/$id" params={{ id: featured.id }} className="block mb-5">
          <div className="relative h-56 rounded-2xl overflow-hidden border border-arena-gray/40 group">
            {featured.image_url ? (
              <img 
                src={featured.image_url} 
                alt="" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-arena-green/20 to-arena-gold/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-arena-gold text-black text-[10px] font-black uppercase tracking-widest">
                Destaque
              </span>
              {featured.is_auto && (
                <span className="px-2 py-1 rounded-full bg-arena-green/80 text-black text-[10px] font-bold flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Auto
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-[10px] uppercase tracking-widest text-arena-gold font-bold">
                {featured.category}
              </span>
              <h2 className="font-bold text-white text-lg leading-tight mt-1">
                {featured.title}
              </h2>
              {featured.source_name && (
                <p className="text-[11px] text-white/50 mt-1.5 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> {featured.source_name}
                </p>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Lista de notícias */}
      <div className="grid gap-3 md:grid-cols-2">
        {(items === null) && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-arena-gray/30 animate-pulse" />
        ))}

        {rest.map((n) => (
          <div key={n.id} className="rounded-2xl border border-arena-gray/30 bg-arena-dark/80 overflow-hidden hover:border-arena-green/40 transition-all duration-300 group">
            {n.image_url && (
              <div className="aspect-[16/9] bg-arena-gray/20 overflow-hidden">
                <img 
                  src={n.image_url} 
                  alt="" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-4">
              {/* Tags */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-lg ${
                  n.is_auto 
                    ? 'bg-arena-green/15 text-arena-green border border-arena-green/20' 
                    : 'bg-arena-gray/40 text-arena-text-secondary/70'
                }`}>
                  {n.is_auto ? (
                    <span className="flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Automático
                    </span>
                  ) : n.category}
                </span>
                {n.source_name && (
                  <span className="text-[10px] text-arena-text-secondary/40 font-medium">
                    {n.source_name}
                  </span>
                )}
              </div>

              {/* Título */}
              <h3 className="font-bold text-white text-[15px] leading-snug line-clamp-2 group-hover:text-arena-green/90 transition-colors duration-300">
                {n.title}
              </h3>

              {/* Data */}
              <div className="flex items-center gap-1 mt-2">
                <Clock className="w-3 h-3 text-arena-text-secondary/30" />
                <p className="text-[11px] text-arena-text-secondary/40">
                  {n.published_at 
                    ? new Date(n.published_at).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : new Date(n.created_at).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                  }
                </p>
              </div>

              {/* Link externo para notícias automáticas */}
              {n.is_auto && n.source_url && (
                <a 
                  href={n.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-arena-green/70 hover:text-arena-green transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ler notícia completa <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {items && items.length === 0 && (
        <div className="text-center py-16 text-arena-text-secondary/50">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm font-medium">Nenhuma notícia disponível.</p>
          <p className="text-xs mt-1 opacity-60">Volte em breve para novas atualizações.</p>
        </div>
      )}
    </AppShell>
  );
}