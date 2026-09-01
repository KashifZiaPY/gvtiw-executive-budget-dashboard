import React from 'react';
import { CategorySummary, GrandTotalSummary, CategoryType } from '../types';
import { formatPKR, formatPercent, getBurnRateBadge } from '../lib/formatters';
import { Layers, Sparkles, Filter, CheckCircle2, AlertCircle } from 'lucide-react';

interface CategoryDeckProps {
  categories: CategorySummary[];
  grandTotal: GrandTotalSummary;
  selectedCategory: CategoryType | 'ALL';
  onSelectCategory: (category: CategoryType | 'ALL') => void;
  darkMode: boolean;
}

export const CategoryDeck: React.FC<CategoryDeckProps> = ({
  categories,
  grandTotal,
  selectedCategory,
  onSelectCategory,
  darkMode,
}) => {
  // Split categories according to the exact Google Sheet visual hierarchy:
  // Row 1: Salary, Non-Salary, Placement, NAVTTC
  const row1Cats = categories.filter((c) =>
    ['Salary', 'Non Salary', 'Placement', 'NAVTTC'].includes(c.category)
  );

  // Row 2: CMSDI, Own Fund, Interest Income, Other Income
  const row2Cats = categories.filter((c) =>
    ['CMSDI', 'Own Fund', 'Interest Income', 'Other Income'].includes(c.category)
  );

  // Row 3: AAA (Memo)
  const aaaCat = categories.find((c) => c.category === 'AAA');

  const renderCard = (cat: CategorySummary, spanClass = 'col-span-1') => {
    const isSelected = selectedCategory === cat.category;
    const isNegative = cat.balance < 0;
    const burnBadge = getBurnRateBadge(cat.burnRate);

    return (
      <div
        key={cat.category}
        onClick={() => onSelectCategory(isSelected ? 'ALL' : cat.category)}
        className={`group cursor-pointer rounded-xl overflow-hidden border transition-all duration-200 shadow-md ${spanClass} ${
          isSelected
            ? 'border-blue-400 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/20 -translate-y-0.5'
            : darkMode
            ? 'bg-[#0B132B] border-slate-700/80 hover:border-slate-500 hover:shadow-lg'
            : 'bg-white border-slate-300 hover:border-slate-400'
        }`}
      >
        {/* Card Category Header Banner (Matching exact Google Sheet Header styling) */}
        <div
          className="py-2 px-3 flex items-center justify-between text-white font-extrabold text-xs tracking-wider uppercase drop-shadow-xs"
          style={{ backgroundColor: cat.themeColor.header }}
        >
          <span className="truncate">{cat.shortName}</span>
          <span className="text-[10px] font-mono opacity-90 px-2 py-0.5 bg-black/40 rounded-full">
            {cat.headCount} {cat.headCount === 1 ? 'Head' : 'Heads'}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-3.5 space-y-2.5">
          {/* Net Balance Field */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Net Available Balance
              </span>
              <div
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  isNegative
                    ? 'text-rose-400'
                    : darkMode
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                {formatPKR(cat.balance, true)}
              </div>
            </div>

            {/* Burn Rate Badge */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                Burn Rate
              </span>
              <span
                className={`font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full inline-block ${burnBadge.badgeClass}`}
              >
                {formatPercent(cat.burnRate)}
              </span>
            </div>
          </div>

          {/* Burn Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, cat.burnRate * 100))}%`,
                backgroundColor: isNegative ? '#EF4444' : cat.themeColor.accent,
              }}
            />
          </div>

          {/* Sub-Metrics: Opening | Inflow (Receipts) | Outflow (Payments) */}
          <div
            className={`pt-2 border-t grid grid-cols-3 gap-1 text-[10.5px] font-mono ${
              darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}
          >
            <div className="text-left truncate">
              <span className="text-[9px] uppercase tracking-wider block text-slate-500 font-sans font-bold">Opening</span>
              <strong className={darkMode ? 'text-slate-200' : 'text-slate-800'}>{formatPKR(cat.opening, false)}</strong>
            </div>
            <div className="text-center truncate">
              <span className="text-[9px] uppercase tracking-wider block text-emerald-500 font-sans font-bold">Inflow</span>
              <strong className="text-emerald-400">{cat.receipts > 0 ? formatPKR(cat.receipts, false) : '-'}</strong>
            </div>
            <div className="text-right truncate">
              <span className="text-[9px] uppercase tracking-wider block text-rose-500 font-sans font-bold">Outflow</span>
              <strong className={darkMode ? 'text-rose-300' : 'text-rose-600'}>{cat.payments > 0 ? formatPKR(cat.payments, false) : '-'}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Title & Filter bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2
              className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
                darkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              Executive Tier Position Deck (Corporate Display)
            </h2>
            <p className="text-[11px] text-slate-400">
              Official institutional allocations synchronized with Google Sheet Backend
            </p>
          </div>
        </div>

        {selectedCategory !== 'ALL' && (
          <button
            onClick={() => onSelectCategory('ALL')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1 rounded-xl border border-blue-500/30 transition-all flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Reset Category Filter ({selectedCategory})</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 1: SALARY | NON-SALARY | PLACEMENT | NAVTTC                */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {row1Cats.map((cat) => renderCard(cat))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 2: CMSDI | OWN FUND | INTEREST INCOME | OTHER INCOMES      */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {row2Cats.map((cat) => renderCard(cat))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 3: ASSAN ASSIGNMENT ACC. (AAA) & TOTAL AVAILABLE POOL     */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* AAA Memo Account Card (1 Col) */}
        {aaaCat && (
          <div
            onClick={() => onSelectCategory(selectedCategory === 'AAA' ? 'ALL' : 'AAA')}
            className={`group cursor-pointer rounded-xl overflow-hidden border transition-all duration-200 shadow-md ${
              selectedCategory === 'AAA'
                ? 'border-slate-400 ring-2 ring-slate-500/40 shadow-lg'
                : darkMode
                ? 'bg-[#0B132B] border-slate-700/80 hover:border-slate-500'
                : 'bg-white border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="py-2 px-3 bg-[#374151] text-white font-extrabold text-xs tracking-wider flex items-center justify-between uppercase">
              <span>ASSAN ASSIGNMENT ACC. (AAA)</span>
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-mono">
                Memo Pass-Through
              </span>
            </div>
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Segregated Net Balance
                  </span>
                  <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {formatPKR(aaaCat.balance, true)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                    Burn Rate
                  </span>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                    {formatPercent(aaaCat.burnRate)}
                  </span>
                </div>
              </div>

              {/* Sub-Metrics: Opening | Inflow | Outflow */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-1 text-[10.5px] font-mono">
                <div className="text-left">
                  <span className="text-[9px] uppercase tracking-wider block text-slate-500 font-sans font-bold">Opening</span>
                  <strong className="text-slate-200">{formatPKR(aaaCat.opening, false)}</strong>
                </div>
                <div className="text-center">
                  <span className="text-[9px] uppercase tracking-wider block text-emerald-500 font-sans font-bold">Inflow</span>
                  <strong className="text-emerald-400">{formatPKR(aaaCat.receipts, false)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider block text-rose-500 font-sans font-bold">Outflow</span>
                  <strong className="text-rose-400">{formatPKR(aaaCat.payments, false)}</strong>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic pt-1">
                * Dedicated revolving grant account; tracked separately from the main operational pool.
              </p>
            </div>
          </div>
        )}

        {/* TOTAL AVAILABLE POOL (2 Cols - Prominent Executive Banner) */}
        <div
          onClick={() => onSelectCategory('ALL')}
          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-xl lg:col-span-2 ${
            selectedCategory === 'ALL'
              ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-amber-500/10'
              : 'border-amber-600/60 hover:border-amber-500'
          } bg-gradient-to-r from-[#0F2537] via-[#15344F] to-[#0F2537] text-white`}
        >
          {/* Header */}
          <div className="py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black text-xs sm:text-sm tracking-wider flex items-center justify-between uppercase">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>TOTAL AVAILABLE OPERATING POOL (CONSOLIDATED)</span>
            </div>
            <span className="text-[11px] bg-black/40 px-2.5 py-0.5 rounded-full font-mono">
              37 Heads (Excl. AAA)
            </span>
          </div>

          {/* Body */}
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-amber-300 block">
                Net Consolidated Treasury Position
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                {formatPKR(grandTotal.balance, true)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono mt-1.5">
                <span>Opening: <strong className="text-white">{formatPKR(grandTotal.opening, false)}</strong></span>
                <span>•</span>
                <span>Total Inflow: <strong className="text-emerald-300">{formatPKR(grandTotal.receipts, false)}</strong></span>
                <span>•</span>
                <span>Total Outflow: <strong className="text-rose-300">{formatPKR(grandTotal.payments, false)}</strong></span>
              </div>
            </div>

            {/* Burn rate telemetry circle */}
            <div className="text-center sm:text-right shrink-0 bg-black/30 p-3 rounded-xl border border-amber-500/20">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Consolidated Burn Rate
              </span>
              <div className="text-xl font-mono font-black text-amber-300 mt-0.5">
                {formatPercent(grandTotal.burnRate)}
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">
                High Capital Stability
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
