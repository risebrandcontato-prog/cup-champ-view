import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { AdminPageHeader } from './admin';
import { AnalysisForm } from '@/components/admin/AnalysisForm';
import { supabase } from '@/integrations/supabase/client';
import type { Analysis, AnalysisMatch, AnalysisBet, AnalysisBetSelection } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/analyses/$id/edit')({ 
  component: EditAnalysis 
});

interface AnalysisWithRelations extends Analysis {
  matches: AnalysisMatch[];
  bet?: (AnalysisBet & { selections: AnalysisBetSelection[] });
}

function EditAnalysis() { 
  const { id } = Route.useParams(); 
  const [analysis, setAnalysis] = useState<AnalysisWithRelations | null>(null); 
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

    const [{ data: matchesData }, { data: betData }] = await Promise.all([
      supabase.from('analysis_matches').select('*').eq('analysis_id', id),
      supabase.from('analysis_bets').select('*, selections:analysis_bet_selections(*)').eq('analysis_id', id).maybeSingle(),
    ]);

    const bet = betData ? (betData as AnalysisBet & { selections: AnalysisBetSelection[] }) : undefined;

    setAnalysis({ 
      ...(analysisData as Analysis), 
      matches: (matchesData as AnalysisMatch[]) ?? [],
      bet: bet,
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