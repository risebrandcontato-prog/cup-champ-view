import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { AdminPageHeader } from './admin';
import { AnalysisForm } from '@/components/admin/AnalysisForm';
import { supabase } from '@/hooks/use-auth';
import type { Analysis, AnalysisMatch } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/analyses/$id/edit')({ 
  component: EditAnalysis 
});

function EditAnalysis() {
  const { id } = Route.useParams();
  const [analysis, setAnalysis] = useState<(Analysis & { matches: AnalysisMatch[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    
    const { data: analysisData, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (analysisError || !analysisData) {
      toast.error('Análise não encontrada');
      setLoading(false);
      return;
    }

    const { data: matchesData } = await supabase
      .from('analysis_matches')
      .select('*')
      .eq('analysis_id', id);

    setAnalysis({ 
      ...(analysisData as Analysis), 
      matches: (matchesData as AnalysisMatch[]) ?? [] 
    });
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-arena-green" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center text-arena-text-secondary mt-12">
        Análise não encontrada
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title="Editar Análise" />
      <div className="mt-4">
        <AnalysisForm initial={analysis} />
      </div>
    </>
  );
}