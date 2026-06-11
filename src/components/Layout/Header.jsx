import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTrainerLevel } from '../../context/TrainerLevelContext.jsx';

// ---- scroll-snap drum roller ------------------------------------------------

const ITEM_H = 44; // px per level row
const VISIBLE = 5; // number of rows shown
const ROLLER_H = ITEM_H * VISIBLE;
const LEVELS = Array.from({ length: 50 }, (_, i) => i + 1);

function LevelRoller({ value, onChange }) {
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const ignoreScrollRef = useRef(false);

  // Scroll to current value (called on open and when value changes programmatically)
  const scrollToValue = useCallback((v, smooth = false) => {
    if (!listRef.current) return;
    ignoreScrollRef.current = true;
    listRef.current.scrollTo({
      top: (v - 1) * ITEM_H,
      behavior: smooth ? 'smooth' : 'instant',
    });
    setTimeout(() => { ignoreScrollRef.current = false; }, 50);
  }, []);

  // Scroll to value when roller first mounts
  useEffect(() => {
    scrollToValue(value);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScroll() {
    if (ignoreScrollRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!listRef.current) return;
      const idx = Math.round(listRef.current.scrollTop / ITEM_H);
      const next = Math.min(50, Math.max(1, idx + 1));
      onChange(next);
    }, 120);
  }

  return (
    <div
      className="relative select-none"
      style={{ height: ROLLER_H }}
    >
      {/* Fade mask at top and bottom */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `linear-gradient(to bottom,
            #161B22 0%,
            transparent 28%,
            transparent 72%,
            #161B22 100%)`,
        }}
      />

      {/* Center selection strip */}
      <div
        className="absolute inset-x-6 pointer-events-none z-10 border-t border-b border-[#58A6FF]/50 bg-[#58A6FF]/8 rounded"
        style={{ top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H }}
      />

      {/* Scrollable number list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* top padding — centers item 1 */}
        <div style={{ height: ITEM_H * Math.floor(VISIBLE / 2) }} />

        {LEVELS.map(lv => (
          <div
            key={lv}
            className="snap-center flex items-center justify-center font-bold text-2xl text-[#E6EDF3]"
            style={{ height: ITEM_H }}
          >
            {lv}
          </div>
        ))}

        {/* bottom padding — centers item 50 */}
        <div style={{ height: ITEM_H * Math.floor(VISIBLE / 2) }} />
      </div>
    </div>
  );
}

// ---- level picker modal (bottom sheet) --------------------------------------

function LevelPickerSheet({ current, onDone, onClose }) {
  const [draft, setDraft] = useState(current);

  function commit() {
    onDone(draft);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-[#161B22] border-t border-[#30363D] rounded-t-2xl shadow-2xl w-full max-w-sm mx-auto"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#30363D] rounded-full" />
        </div>

        {/* Title */}
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={onClose}
            className="text-sm text-[#8B949E] hover:text-[#C9D1D9] transition"
          >
            Cancel
          </button>
          <p className="text-sm font-semibold text-[#E6EDF3]">Trainer Level</p>
          <button
            onClick={commit}
            className="text-sm font-semibold text-[#58A6FF] hover:text-[#79C0FF] transition"
          >
            Done
          </button>
        </div>

        {/* Roller */}
        <div className="px-6 pb-2">
          <LevelRoller value={draft} onChange={setDraft} />
        </div>

        {/* Helper text */}
        <p className="text-center text-[11px] text-[#484F58] pb-2">
          Max power-up: Level {Math.min(50, draft + 10)}
        </p>
      </div>
    </div>
  );
}

// ---- header -----------------------------------------------------------------

export default function Header() {
  const [trainerLevel, setTrainerLevel] = useTrainerLevel();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <header
        className="w-full bg-[#161B22] border-b border-[#30363D] sticky top-0 z-50"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 group">
              <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" aria-hidden="true">
                <circle cx="16" cy="16" r="15" fill="#EF4444" stroke="#30363D" strokeWidth="1.5" />
                <path d="M1 16 Q1 16 31 16" stroke="#1C1C1E" strokeWidth="2.5" />
                <path d="M1 16 A15 15 0 0 1 31 16" fill="#C9D1D9" />
                <circle cx="16" cy="16" r="4.5" fill="#1C1C1E" stroke="#30363D" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="2.5" fill="#C9D1D9" />
              </svg>
              <span className="text-[#C9D1D9] font-bold text-lg tracking-tight group-hover:text-white transition-colors">
                PokeGosh
              </span>
            </Link>

            {/* Trainer level chip — tap to open roller */}
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D1117] border border-[#30363D]
                         hover:border-[#58A6FF]/60 hover:bg-[#21262D] transition-colors group"
            >
              <span className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider group-hover:text-[#58A6FF] transition-colors">
                Trainer Lv
              </span>
              <span className="text-sm font-bold text-[#C9D1D9] font-mono group-hover:text-white transition-colors">
                {trainerLevel}
              </span>
              <svg className="w-3 h-3 text-[#484F58]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {showPicker && (
        <LevelPickerSheet
          current={trainerLevel}
          onDone={setTrainerLevel}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
