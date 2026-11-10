import React, { useEffect, useState } from 'react';
import { Check, Filter, Search } from 'lucide-react';

/**
 * Shared Excel-style column header filters.
 *
 * These components only control which already-computed rows are DISPLAYED.
 * They never touch data, balances, or totals — the parents own the filter
 * state and the row predicates.
 */

/* ------------------------------------------------------------------ */
/* Funnel button placed inside a column header cell                    */
/* ------------------------------------------------------------------ */
export const HeaderFilterButton: React.FC<{
  active: boolean;
  open: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, open, onClick, label }) => (
  <button
    type="button"
    title={`Filter by ${label}`}
    aria-label={`Filter by ${label}`}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded transition-colors cursor-pointer align-middle ${
      active || open
        ? 'bg-amber-400 text-slate-900 shadow-sm'
        : 'bg-white/15 text-white/85 hover:bg-white/30 hover:text-white'
    }`}
  >
    <Filter className="w-[11px] h-[11px]" fill={active ? 'currentColor' : 'none'} />
  </button>
);

/* ------------------------------------------------------------------ */
/* Dropdown shell: transparent backdrop (click-away) + anchored panel  */
/* The parent header cell must be a positioned ancestor (sticky th is) */
/* ------------------------------------------------------------------ */
export const HeaderFilterPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  align?: 'left' | 'right';
  width?: number;
  children: React.ReactNode;
}> = ({ open, onClose, darkMode, align = 'left', width = 250, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width }}
        className={`absolute top-full mt-1 z-50 rounded-xl border shadow-2xl p-3 text-left normal-case tracking-normal ${
          align === 'right' ? 'right-0' : 'left-0'
        } ${
          darkMode
            ? 'bg-slate-900 border-slate-600 text-slate-100'
            : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        {children}
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Checkbox list of the distinct values present, with row counts.      */
/* included === null means "no filter" (everything passes).            */
/* included === empty Set means the filter is active and nothing       */
/* passes (user unticked every value).                                 */
/* ------------------------------------------------------------------ */
export const ValuesChecklist: React.FC<{
  options: { value: string; count: number }[];
  included: Set<string> | null;
  onChange: (next: Set<string> | null) => void;
  searchable?: boolean;
  darkMode: boolean;
}> = ({ options, included, onChange, searchable = false, darkMode }) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.value.toLowerCase().includes(q)) : options;

  const isChecked = (v: string) => included === null || included.has(v);
  const toggle = (v: string) => {
    const base =
      included === null ? new Set(options.map((o) => o.value)) : new Set(included);
    if (base.has(v)) base.delete(v);
    else base.add(v);
    onChange(base.size === options.length ? null : base);
  };

  const inputCls = darkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';
  const rowHover = darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50';

  return (
    <div className="font-sans">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold">
          {included === null
            ? `All ${options.length} values shown`
            : `${included.size} of ${options.length} selected`}
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onChange(new Set<string>())}
            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Clear
          </button>
        </span>
      </div>

      {searchable && (
        <div className="relative mb-1.5">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search values..."
            className={`w-full pl-7 pr-2 py-1.5 text-[11px] rounded-md border outline-none ${inputCls}`}
          />
        </div>
      )}

      <div className="max-h-56 overflow-y-auto pr-0.5">
        {shown.length === 0 && (
          <div className="text-[11px] text-slate-400 py-2 text-center">No matching values</div>
        )}
        {shown.map((o) => {
          const checked = isChecked(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`w-full flex items-center gap-2 px-1.5 py-[5px] rounded-md cursor-pointer ${rowHover}`}
              title={o.value}
            >
              <span
                className={`w-3.5 h-3.5 shrink-0 rounded-[4px] border flex items-center justify-center ${
                  checked
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : darkMode
                      ? 'border-slate-500 bg-slate-800'
                      : 'border-slate-400 bg-white'
                }`}
              >
                {checked && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
              </span>
              <span className="flex-1 text-[11px] font-semibold truncate text-left">{o.value}</span>
              <span
                className={`text-[10px] font-mono shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
              >
                {o.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Exact From / To date range block                                    */
/* ------------------------------------------------------------------ */
export const DateRangeFilter: React.FC<{
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  darkMode: boolean;
}> = ({ from, to, onChange, darkMode }) => {
  const inputCls = darkMode
    ? 'bg-slate-800 border-slate-600 text-white'
    : 'bg-slate-50 border-slate-300 text-slate-900';
  return (
    <div className="font-sans space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold">Exact date range</span>
        {(from || to) && (
          <button
            type="button"
            onClick={() => onChange('', '')}
            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className={`flex-1 min-w-0 px-1.5 py-1.5 text-[11px] rounded-md border outline-none ${inputCls}`}
        />
        <span className="text-[11px] text-slate-400">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className={`flex-1 min-w-0 px-1.5 py-1.5 text-[11px] rounded-md border outline-none ${inputCls}`}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* "Contains" text block (e.g. Cheque #)                               */
/* ------------------------------------------------------------------ */
export const TextFilter: React.FC<{
  value: string;
  onChange: (v: string) => void;
  darkMode: boolean;
  placeholder?: string;
}> = ({ value, onChange, darkMode, placeholder = 'Contains...' }) => {
  const inputCls = darkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';
  return (
    <div className="font-sans space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold">Contains</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className={`w-full px-2 py-1.5 text-[11px] rounded-md border outline-none ${inputCls}`}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* One active-filter chip with an x to clear just that filter          */
/* ------------------------------------------------------------------ */
export const FilterChip: React.FC<{
  label: string;
  onClear: () => void;
  darkMode: boolean;
}> = ({ label, onClear, darkMode }) => (
  <span
    className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-bold border ${
      darkMode
        ? 'bg-amber-400/15 border-amber-400/50 text-amber-200'
        : 'bg-amber-50 border-amber-300 text-amber-900'
    }`}
  >
    <span className="max-w-[420px] truncate" title={label}>
      {label}
    </span>
    <button
      type="button"
      onClick={onClear}
      title="Clear this filter"
      className={`w-4 h-4 rounded-full flex items-center justify-center text-[11px] leading-none cursor-pointer ${
        darkMode ? 'hover:bg-amber-400/30' : 'hover:bg-amber-200'
      }`}
    >
      ×
    </button>
  </span>
);

/* ------------------------------------------------------------------ */
/* Entries type segmented control: All · Receipts · Payments           */
/* ------------------------------------------------------------------ */
export type EntryTypeFilter = 'ALL' | 'RECEIPT' | 'PAYMENT';

export const EntryTypeControl: React.FC<{
  value: EntryTypeFilter;
  onChange: (v: EntryTypeFilter) => void;
  darkMode: boolean;
}> = ({ value, onChange, darkMode }) => {
  const opts: { key: EntryTypeFilter; label: string }[] = [
    { key: 'ALL', label: 'All Entries' },
    { key: 'RECEIPT', label: 'Receipts Only' },
    { key: 'PAYMENT', label: 'Payments Only' },
  ];
  return (
    <div
      className={`flex items-center rounded-lg p-0.5 border ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
      }`}
    >
      {opts.map((o, i) => (
        <React.Fragment key={o.key}>
          {i > 0 && (
            <div className={`w-px h-4 mx-0.5 ${darkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
          )}
          <button
            type="button"
            onClick={() => onChange(o.key)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              value === o.key
                ? 'bg-[#065f46] text-white shadow-sm'
                : darkMode
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-slate-600 hover:bg-white'
            }`}
          >
            {o.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
