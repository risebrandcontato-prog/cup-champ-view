import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, ExternalLink, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/hooks/use-auth';
import { useAuth } from '@/hooks/use-auth';
import type { Analysis, AnalysisMatch, UserBet } from '@/types';
import { Button } from '@/components/ui/button';
import { SPORTS } from '@/lib/constants';

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisDetail,
});

function AnalysisDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [a, setA] = useState<(Analysis & { matches: AnalysisMatch[] }) | null>(null);
  const [bet, setBet] = useState<UserBet | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: analysis } = await db.from('analyses').select('*').eq('id', id).maybeSingle();
      const { data: matches } = await db.from('analysis_matches').select('*').eq('analysis_id', id);
      setA({ ...(analysis as Analysis), matches: (matches as AnalysisMatch[]) ?? [] });
      if (user) {
        const { data: ub } = await db.from('user_bets').select('*').eq('analysis_id', id).eq('user_id', user.id).maybeSingle();
        setBet((ub as UserBet) ?? null);
      }
    })();
  }, [id, user]);

  const registerBet = async (didBet: boolean) => {
    if (!user || !a) return;
    setRegistering(true);
    const { data, error } = await db.from('user_bets').upsert({
      user_id: user.id, analysis_id: a.id, did_bet: didBet,
    }, { onConflict: 'user_id,analysis_id' }).select().single();
    setRegistering(false);
    if (error) { toast.error('Erro', { description: error.message }); return; }
    setBet(data as UserBet);
    toast.success(didBet ? 'Aposta registrada!' : 'Marcado como não apostado');
  };

  if (!a) return <AppShell><div className="flex justify-center pt-20"><Loader2 className="w-8 h-8 animate-spin text-arena-green" /></div></AppShell>;

  const meta = SPORTS.find((s) => s.id === a.sport_type) ?? SPORTS[0];

  return (
    <AppShell>
      <button onClick={() => navigate({ to: '/' })} className="flex items-center gap-2 text-arena-text-secondary hover:text-white mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {a.display_type === 'image' && a.image_url && (
          <img src={a.image_url} alt={a.title} className="w-full rounded-2xl border border-arena-gray" />
        )}

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full bg-arena-gray text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>{meta.name}</span>
            {a.championship && <span className="text-xs text-arena-text-secondary">{a.championship}</span>}
            {a.status === 'green' && <span className="px-2 py-0.5 rounded-full bg-arena-success/20 text-arena-success text-[10px] font-black">GREEN ✓</span>}
            {a.status === 'red' && <span className="px-2 py-0.5 rounded-full bg-arena-red/20 text-arena-red text-[10px] font-black">RED ✗</span>}
          </div>
          <h1 className="text-2xl font-black tracking-tight">{a.title}</h1>
          {a.description && <p className="text-arena-text-secondary whitespace-pre-line mt-3 leading-relaxed">{a.description}</p>}
        </div>

        {a.display_type === 'structured' && (
          <>
            {a.bookmaker_name && (
              <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4">
                <p className="text-xs uppercase tracking-widest text-arena-text-secondary mb-1">Casa Recomendada</p>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-lg">{a.bookmaker_name}</p>
                  {a.bookmaker_link && (
                    <a href={a.bookmaker_link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-arena-green text-black text-xs font-bold">
                      Ir Apostar <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {a.stake_value && (
              <div className="rounded-2xl border border-arena-gray bg-arena-dark p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-arena-text-secondary">Valor da Aposta</p>
                <p className="text-3xl font-black text-arena-gold mt-1">R$ {a.stake_value.toFixed(2)}</p>
                {a.odds && <p className="text-arena-green font-bold mt-1">Odds total @{a.odds.toFixed(2)}</p>}
              </div>
            )}
            {a.matches.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-arena-text-secondary">Jogos incluídos</p>
                {a.matches.map((m) => (
                  <div key={m.id} className="rounded-xl border border-arena-gray bg-arena-dark p-3">
                    <p className="font-bold">{m.home_team} <span className="text-arena-text-secondary mx-1">vs</span> {m.away_team}</p>
                    {m.league && <p className="text-xs text-arena-text-secondary">{m.league}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-full bg-arena-gray text-[10px] font-bold uppercase">{m.bet_type}</span>
                      {m.odds && <span className="text-arena-gold font-bold text-sm">@{m.odds.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Action bar */}
      <div className="fixed bottom-16 inset-x-0 z-30 glass border-t border-arena-gray pb-safe">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {bet ? (
            <div className="text-center text-sm text-arena-text-secondary">
              ✓ Você marcou esta aposta como <span className="text-white font-bold">{bet.did_bet ? 'realizada' : 'não realizada'}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={registering} onClick={() => registerBet(true)}
                className="h-12 bg-arena-green hover:bg-arena-green-dark text-black font-bold rounded-xl">
                <Check className="w-4 h-4 mr-1" /> Fiz essa Aposta
              </Button>
              <Button disabled={registering} onClick={() => registerBet(false)} variant="outline"
                className="h-12 border-2 border-arena-red text-arena-red hover:bg-arena-red/10 font-bold rounded-xl">
                <X className="w-4 h-4 mr-1" /> Não Fiz
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
