import { Link, useRouterState } from '@tanstack/react-router';
import { Home, Wallet, Gift, Newspaper, User } from 'lucide-react';

const items = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/bankroll', icon: Wallet, label: 'Banca' },
  { to: '/bonuses', icon: Gift, label: 'Bônus' },
  { to: '/news', icon: Newspaper, label: 'Notícias' },
  { to: '/profile', icon: User, label: 'Perfil' },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass border-t border-arena-gray pb-safe">
      <ul className="grid grid-cols-5 h-16 max-w-2xl mx-auto">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== '/' && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link to={it.to} className={`flex flex-col items-center justify-center h-full gap-1 transition-colors ${active ? 'text-arena-green' : 'text-arena-text-secondary hover:text-white'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
