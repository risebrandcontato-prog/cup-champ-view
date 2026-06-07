import { Link, useRouterState } from '@tanstack/react-router';
import { Home, Wallet, Gift, Newspaper, User } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <nav className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-[#0A0A0A]/90 border-t border-white/[0.06] pb-safe">
      <ul className="grid grid-cols-5 h-[60px] max-w-2xl mx-auto">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== '/' && pathname.startsWith(it.to));
          const Icon = it.icon;

          return (
            <li key={it.to} className="relative">
              <Link
                to={it.to}
                className={`flex flex-col items-center justify-center h-full gap-1 transition-colors duration-300 ${
                  active ? 'text-arena-green' : 'text-arena-text-secondary/40 hover:text-white/70'
                }`}
              >
                <div className="relative">
                  {active && (
                    <motion.div
                      layoutId="bottomNavActive"
                      className="absolute -inset-2 rounded-xl bg-arena-green/15 border border-arena-green/25"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon
                    className="w-[18px] h-[18px] relative z-10"
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] relative z-10">
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}