import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/hooks/use-auth';
import type { NewsItem } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/news/$id')({ component: NewsDetail });

function NewsDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [n, setN] = useState<NewsItem | null>(null);
  useEffect(() => { db.from('news').select('*').eq('id', id).maybeSingle().then(({ data }: { data: NewsItem | null }) => setN(data)); }, [id]);

  if (!n) return <AppShell><div className="flex justify-center pt-12"><Loader2 className="w-6 h-6 animate-spin text-arena-green" /></div></AppShell>;

  return (
    <AppShell>
      <button onClick={() => navigate({ to: '/news' })} className="flex items-center gap-2 text-arena-text-secondary hover:text-white mb-4 text-sm"><ArrowLeft className="w-4 h-4" /> Voltar</button>
      {n.image_url && <img src={n.image_url} alt="" className="w-full aspect-video object-cover rounded-2xl border border-arena-gray mb-4" />}
      <span className="text-[10px] uppercase tracking-widest text-arena-green font-bold">{n.category}</span>
      <h1 className="text-2xl font-black tracking-tight mt-1">{n.title}</h1>
      <p className="text-xs text-arena-text-secondary mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
      <article className="prose prose-invert mt-4 whitespace-pre-line text-arena-text-secondary leading-relaxed">{n.content}</article>
    </AppShell>
  );
}
