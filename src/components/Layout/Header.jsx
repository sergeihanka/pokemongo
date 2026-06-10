import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="w-full bg-[#161B22] border-b border-[#30363D] sticky top-0 z-50"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14">
          <Link to="/" className="flex items-center gap-2 group">
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
              PokeGosh
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
