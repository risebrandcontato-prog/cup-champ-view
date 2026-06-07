import { Link } from '@tanstack/react-router';
import { Bell, Shield, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppHeader() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0A0A0A]/85 border-b border-white/[0.06]">
      <div className="max-w-2xl mx-auto h-[52px] px-4 flex items-center justify-between">
        {/* Logo refinado */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-arena-green/25 to-arena-green/5 border border-arena-green/30 flex items-center justify-center group-hover:shadow-[0_0_12px_rgba(0,200,83,0.25)] transition-shadow duration-500">
            <Crown className="w-3.5 h-3.5 text-arena-green" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline">
            <span className="text-[13px] font-black tracking-tight text-white">ANÁLISE</span>
            <span className="text-[13px] font-extralight tracking-tight text-arena-green ml-0.5">RESTRITA</span>
          </div>
        </Link>

        {/* Ações direita */}
        <div className="flex items-center gap-2.5">
          {/* Badge VIP */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-arena-green/10 border border-arena-green/20">
            <Sparkles className="w-3 h-3 text-arena-green" strokeWidth={2} />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-arena-green">VIP</span>
          </div>

          {/* Admin badge */}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-arena-gold/10 border border-arena-gold/25 text-arena-gold hover:bg-arena-gold/15 transition-colors"
            >
              <Shield className="w-3 h-3" strokeWidth={2} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Admin</span>
            </Link>
          )}

          {/* Notificações */}
          <button className="relative w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-arena-text-secondary/60 hover:text-white hover:bg-white/[0.08] transition-all duration-300">
            <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
            {/* Dot de notificação — pode ser ativado com estado real */}
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-arena-green animate-pulse" />
          </button>

          {/* Avatar */}
          <Link to="/profile" className="relative group">
            <Avatar className="w-8 h-8 border border-white/[0.08] group-hover:border-arena-green/40 transition-colors duration-300">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-arena-gray/40 text-[10px] font-bold text-arena-text-secondary">
                {profile?.name?.slice(0, 2).toUpperCase() ?? 'AR'}
              </AvatarFallback>
            </Avatar>
            {/* Anel verde quando online */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-arena-green border-2 border-[#0A0A0A]" />
          </Link>
        </div>
      </div>
    </header>
  );
}