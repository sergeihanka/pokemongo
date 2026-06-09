import { calculateIVPercentage, getIVStars } from '../../utils/ivCalculator.js';

const QUICK_VALUES = [0, 5, 10, 12, 13, 14, 15];

function ivColorClass(val) {
  const n = Number(val);
  if (n >= 13) return 'text-green-400';
  if (n >= 10) return 'text-yellow-400';
  return 'text-red-400';
}

function StarDisplay({ count }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i <= count ? 'text-yellow-400' : 'text-[#30363D]'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function IVField({ id, label, value, onChange }) {
  const colorClass = ivColorClass(value);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[#8B949E] text-xs font-semibold uppercase tracking-wide">
        {label}
      </label>

      {/* Number input */}
      <input
        id={id}
        type="number"
        min={0}
        max={15}
        value={value}
        onChange={(e) => {
          const v = Math.max(0, Math.min(15, Number(e.target.value)));
          onChange(v);
        }}
        className={`w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2 text-center font-bold font-mono text-lg focus:outline-none focus:border-blue-500 transition-colors ${colorClass}`}
      />

      {/* Quick select */}
      <div className="flex flex-wrap gap-1">
        {QUICK_VALUES.map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={[
              'flex-1 min-w-0 text-[10px] py-0.5 rounded font-mono font-semibold transition-colors',
              value === v
                ? 'bg-blue-600 text-white'
                : 'bg-[#21262D] text-[#8B949E] hover:bg-[#30363D] hover:text-[#C9D1D9]',
            ].join(' ')}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * IVInput — three IV inputs with quick-select buttons, percentage, and star display.
 *
 * @param {number}   ivAtk
 * @param {number}   ivDef
 * @param {number}   ivStam
 * @param {Function} onChange(field, value)  field = 'ivAtk' | 'ivDef' | 'ivStam'
 * @param {boolean}  showLevel
 * @param {number}   level
 * @param {Function} onLevelChange(value)
 */
export default function IVInput({
  ivAtk = 15,
  ivDef = 15,
  ivStam = 15,
  onChange,
  showLevel = false,
  level = 40,
  onLevelChange,
}) {
  const pct = calculateIVPercentage(ivAtk, ivDef, ivStam);
  const stars = getIVStars(ivAtk, ivDef, ivStam);

  let pctColor = 'text-red-400';
  if (pct >= 98) pctColor = 'text-yellow-400';
  else if (pct >= 82) pctColor = 'text-green-400';
  else if (pct >= 66) pctColor = 'text-blue-400';

  return (
    <div className="space-y-4">
      {/* IV fields */}
      <div className="grid grid-cols-3 gap-3">
        <IVField id="iv-atk" label="ATK IV" value={ivAtk} onChange={(v) => onChange('ivAtk', v)} />
        <IVField id="iv-def" label="DEF IV" value={ivDef} onChange={(v) => onChange('ivDef', v)} />
        <IVField id="iv-sta" label="STA IV" value={ivStam} onChange={(v) => onChange('ivStam', v)} />
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between bg-[#21262D] rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <StarDisplay count={stars} />
          <span className="text-[#8B949E] text-xs">{stars === 4 ? '100%' : `${stars}★`}</span>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold font-mono ${pctColor}`}>
            {pct != null ? pct.toFixed(1) : '—'}
          </span>
          <span className="text-[#8B949E] text-sm ml-0.5">%</span>
        </div>
      </div>

      {/* IV combos label */}
      <div className="flex justify-center gap-4 text-xs">
        <span className="text-[#8B949E]">
          IVs:{' '}
          <span className={ivColorClass(ivAtk)}>{ivAtk}</span>
          <span className="text-[#8B949E]"> / </span>
          <span className={ivColorClass(ivDef)}>{ivDef}</span>
          <span className="text-[#8B949E]"> / </span>
          <span className={ivColorClass(ivStam)}>{ivStam}</span>
        </span>
        <span className="text-[#8B949E]">
          Total:{' '}
          <span className="text-[#C9D1D9] font-semibold">{ivAtk + ivDef + ivStam}</span>
          <span className="text-[#8B949E]">/45</span>
        </span>
      </div>

      {/* Level slider */}
      {showLevel && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[#8B949E] text-xs font-semibold uppercase tracking-wide">
              Level
            </label>
            <span className="text-[#C9D1D9] text-sm font-bold font-mono">{level}</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={0.5}
            value={level}
            onChange={(e) => onLevelChange?.(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[#8B949E] text-[10px]">
            <span>1</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
            <span>50</span>
          </div>
        </div>
      )}
    </div>
  );
}
