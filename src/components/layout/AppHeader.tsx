import { Link } from '@tanstack/react-router';
import { Bell, Shield, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppHeader() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  return (
    <header className="sticky top-0 z-30 glass border-b border-arena-gray pt-safe">
      <div className="max-w-2xl mx-auto h-14 px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-arena-gold" />
          <span className="font-black tracking-tight text-arena-gold text-sm">APOSTA RESTRITA</span>
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/admin" className="px-2.5 py-1 rounded-full bg-arena-gold/15 border border-arena-gold/30 text-arena-gold text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </Link>
          )}
          <button className="relative w-9 h-9 rounded-full bg-arena-gray/60 flex items-center justify-center text-arena-text-secondary hover:text-white transition">
            <Bell className="w-4 h-4" />
          </button>
          <Link to="/profile">
            <Avatar className="w-9 h-9 border border-arena-gray">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-arena-gray text-xs">{profile?.name?.slice(0, 2).toUpperCase() ?? 'AR'}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
