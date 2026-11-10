import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Filter, Minus, Search, X } from 'lucide-react';

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
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The panel is rendered through a portal at the document root with
  // fixed positioning measured from the header cell. Rendered inside
  // the table it was trapped by the scroll container's stacking and
  // clipping: any part of the panel extending past the container's box
  // was painted under the click-away backdrop, so visible rows could
  // not be clicked. At root level every pixel of the panel is on top
  // and clickable, it flips up when there is no room below (Excel
  // behaviour), and its height is capped to the space on that side.
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxH: number;
  } | null>(null);

  const computeCoords = () => {
    const anchorEl = anchorRef.current;
    if (!anchorEl) return;
    const cell = (anchorEl.closest('th') as HTMLElement | null) ?? anchorEl.parentElement;
    if (!cell) return;
    const r = cell.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const below = vh - r.bottom;
    const above = r.top;
    const up = below < 360 && above > below;
    const maxH = Math.max(200, Math.min(560, (up ? above : below) - 14));
    let left = align === 'right' ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, vw - width - 8));
    setCoords(
      up ? { bottom: vh - r.top + 4, left, maxH } : { top: r.bottom + 4, left, maxH }
    );
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // The panel FOLLOWS its header cell when anything scrolls (the
    // header is sticky, and filtering itself can shift scroll offsets);
    // it never closes or detaches mid-selection. Scrolling the panel's
    // own list needs no repositioning.
    let raf = 0;
    const onScroll = (e: Event) => {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target))
        return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(computeCoords);
    };
    const onResize = () => computeCoords();
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    computeCoords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, width]);

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {open &&
        coords &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
            <div
              ref={panelRef}
              data-header-filter-panel="true"
              onClick={(e) => e.stopPropagation()}
              style={{
                width,
                maxHeight: coords.maxH,
                top: coords.top,
                bottom: coords.bottom,
                left: coords.left,
              }}
              className={`fixed z-50 rounded-xl border shadow-2xl p-3 text-left normal-case tracking-normal flex flex-col overflow-hidden ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 text-slate-100'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {children}
            </div>
          </>,
          document.body
        )}
    </>
  );
};

/* Human-readable summary of a checklist selection, for filter chips:
   names the ticked values when there are only a few, else a count. */
export const describeSelection = (
  options: { value: string }[],
  included: Set<string> | null
): string => {
  if (included === null) return 'All';
  const incl = options.filter((o) => included.has(o.value)).map((o) => o.value);
  if (incl.length <= 3) return incl.join(', ');
  return `${incl.length} of ${options.length} selected`;
};

/* ------------------------------------------------------------------ */
/* Checkbox list of the distinct values present, with row counts.      */
/* POSITIVE selection model: a tick means "this value is in my         */
/* filter". Nothing ticked (included === null) = no filter, everything */
/* shown. The selection is normalised by the toggle logic: an empty    */
/* set or a full set both collapse back to null, so a tick always      */
/* means exactly one thing and can never read as its own opposite.     */
/* ------------------------------------------------------------------ */
export const ValuesChecklist: React.FC<{
  options: { value: string; count: number }[];
  included: Set<string> | null;
  onChange: (next: Set<string> | null) => void;
  searchable?: boolean;
  /* Controlled search text: when the caller owns the query it survives
     the panel closing and reopening — the panel unmounts on close, so
     panel-local state would wipe text the user typed to find a value. */
  query?: string;
  onQueryChange?: (q: string) => void;
  darkMode: boolean;
}> = ({
  options,
  included,
  onChange,
  searchable = false,
  query: queryProp,
  onQueryChange,
  darkMode,
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  const query = queryProp !== undefined ? queryProp : internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.value.toLowerCase().includes(q)) : options;

  const isChecked = (v: string) => included !== null && included.has(v);
  const commit = (next: Set<string>) =>
    onChange(next.size === 0 || next.size === options.length ? null : next);
  const toggle = (v: string) => {
    const base = new Set(included ?? []);
    if (base.has(v)) base.delete(v);
    else base.add(v);
    commit(base);
  };

  /* "Select all search results": acts on exactly the values the
     current search is showing — ticks them all, or unticks them all
     when every shown value is already ticked. Selections built this
     way accumulate across successive searches. */
  const shownAllIn = shown.length > 0 && shown.every((o) => isChecked(o.value));
  const shownSomeIn = shown.some((o) => isChecked(o.value));
  const toggleShown = () => {
    const base = new Set(included ?? []);
    if (shownAllIn) shown.forEach((o) => base.delete(o.value));
    else shown.forEach((o) => base.add(o.value));
    commit(base);
  };

  const inputCls = darkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';
  const rowHover = darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50';

  return (
    <div className="font-sans flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <span className="text-[11px] font-bold">
          {included === null
            ? `All ${options.length} values shown`
            : `${included.size} of ${options.length} selected`}
        </span>
        <span className="flex items-center gap-2">
          {included === null ? (
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              Tick values to filter
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Show all
            </button>
          )}
        </span>
      </div>

      {searchable && (
        <div className="relative mb-1.5 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search values..."
            className={`w-full pl-7 pr-6 py-1.5 text-[11px] rounded-md border outline-none ${inputCls}`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="Clear search — show all values"
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-4.5 h-4.5 p-0.5 rounded-full flex items-center justify-center cursor-pointer ${
                darkMode
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              <X className="w-3 h-3" strokeWidth={3} />
            </button>
          )}
        </div>
      )}

      <div className="overflow-y-auto pr-0.5 min-h-0 overscroll-contain">
        {q && shown.length > 0 && (
          <button
            type="button"
            onClick={toggleShown}
            className={`w-full flex items-center gap-2 px-1.5 py-[5px] rounded-md cursor-pointer border-b mb-0.5 ${
              darkMode ? 'border-slate-700' : 'border-slate-200'
            } ${rowHover}`}
            title="Add or remove all values matching the search"
          >
            <span
              className={`w-3.5 h-3.5 shrink-0 rounded-[4px] border flex items-center justify-center ${
                shownSomeIn
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : darkMode
                    ? 'border-slate-500 bg-slate-800'
                    : 'border-slate-400 bg-white'
              }`}
            >
              {shownAllIn ? (
                <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
              ) : shownSomeIn ? (
                <Minus className="w-2.5 h-2.5" strokeWidth={3.5} />
              ) : null}
            </span>
            <span className="flex-1 text-[11px] font-bold truncate text-left">
              Select all search results
            </span>
            <span
              className={`text-[10px] font-mono shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {shown.length}
            </span>
          </button>
        )}
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
/* Min / Max amount range block (Receipts / Payments / Balance).       */
/* Values are kept as strings in the parent; '' means "no limit".      */
/* Setting Min = Max finds one exact amount.                           */
/* ------------------------------------------------------------------ */
export const AmountRangeFilter: React.FC<{
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
  darkMode: boolean;
}> = ({ min, max, onChange, darkMode }) => {
  const inputCls = darkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';
  return (
    <div className="font-sans space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold">Amount range (Rs.)</span>
        {(min !== '' || max !== '') && (
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
          type="number"
          min="0"
          value={min}
          onChange={(e) => onChange(e.target.value, max)}
          placeholder="Min"
          className={`flex-1 min-w-0 px-2 py-1.5 text-[11px] rounded-md border outline-none ${inputCls}`}
        />
        <span className="text-[11px] text-slate-400">to</span>
        <input
          type="number"
          min="0"
          value={max}
          onChange={(e) => onChange(min, e.target.value)}
          placeholder="Max"
          className={`flex-1 min-w-0 px-2 py-1.5 text-[11px] rounded-md border outline-none ${inputCls}`}
        />
      </div>
      <div className={`text-[10px] leading-snug ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Blank = no limit. Set Min = Max to find one exact amount.
      </div>
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
