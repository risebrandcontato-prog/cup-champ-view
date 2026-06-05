import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from './admin';
import { AnalysisForm } from '@/components/admin/AnalysisForm';
import { db } from '@/hooks/use-auth';
import type { Analysis, AnalysisMatch } from '@/types';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/admin/analyses/$id/edit')({ component: EditAnalysis });

function EditAnalysis() {
  const { id } = Route.useParams();
  const [a, setA] = useState<(Analysis & { matches: AnalysisMatch[] }) | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await db.from('analyses').select('*').eq('id', id).maybeSingle();
      const { data: m } = await db.from('analysis_matches').select('*').eq('analysis_id', id);
      setA({ ...(data as Analysis), matches: (m as AnalysisMatch[]) ?? [] });
    })();
  }, [id]);
  if (!a) return <Loader2 className="w-6 h-6 animate-spin text-arena-green" />;
  return <><AdminPageHeader title="Editar Análise" /><AnalysisForm initial={a} /></>;
}
