import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'My Collection', to: '/collection' },
  { label: 'Compare', to: '/compare' },
];

export default function Header() {
  const location = useLocation();

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <header className="w-full bg-[#161B22] border-b border-[#30363D] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Title */}
          <Link to="/" className="flex items-center gap-2 group">
            {/* Pokeball SVG placeholder */}
            <div className="relative w-8 h-8 flex-shrink-0">
              <svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true">
                <circle cx="16" cy="16" r="15" fill="#EF4444" stroke="#30363D" strokeWidth="1.5" />
                <path d="M1 16 Q1 16 31 16" stroke="#1C1C1E" strokeWidth="2.5" />
                <path d="M1 16 A15 15 0 0 1 31 16" fill="#C9D1D9" />
                <circle cx="16" cy="16" r="4.5" fill="#1C1C1E" stroke="#30363D" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="2.5" fill="#C9D1D9" />
              </svg>
            </div>
            <span className="text-[#C9D1D9] font-bold text-lg tracking-tight group-hover:text-white transition-colors">
              PoGo IV Tracker
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive(to)
                    ? 'bg-blue-600 text-white'
                    : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]',
                ].join(' ')}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
