import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ArrowLeftRight, Trophy } from 'lucide-react';

const TABS = [
  { label: 'Collection', to: '/collection', icon: BookOpen },
  { label: 'Compare',    to: '/compare',    icon: ArrowLeftRight },
  { label: 'Tiers',      to: '/tiers',      icon: Trophy },
];

export default function BottomNav() {
  const location = useLocation();
  const isActive = (to) => location.pathname.startsWith(to);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-[#161B22]/95 backdrop-blur-xl border-t border-[#30363D]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around max-w-7xl mx-auto">
        {TABS.map(({ label, to, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 flex-1
                         min-h-[56px] transition-colors active:scale-95
                         ${active ? 'text-[#58A6FF]' : 'text-[#484F58] hover:text-[#8B949E]'}`}
            >
              <Icon
                className="w-6 h-6"
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span className={`text-[10px] font-semibold tracking-wide leading-none
                               ${active ? 'text-[#58A6FF]' : 'text-[#484F58]'}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#58A6FF] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
