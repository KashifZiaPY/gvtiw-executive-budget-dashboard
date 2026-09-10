import React, { useRef, useEffect } from 'react';
import { CategorySummary, GrandTotalSummary, CategoryType, AccountHead } from '../types';
import { formatPKR, formatPercent, getBurnRateBadge, format12HourDate } from '../lib/formatters';
import { Layers, Sparkles, Filter, CheckCircle2, X, ArrowDownRight } from 'lucide-react';

interface CategoryDeckProps {
  categories: CategorySummary[];
  grandTotal: GrandTotalSummary;
  selectedCategory: CategoryType | 'ALL';
  onSelectCategory: (category: CategoryType | 'ALL') => void;
  accounts: AccountHead[];
  darkMode: boolean;
}

export const CategoryDeck: React.FC<CategoryDeckProps> = ({
  categories,
  grandTotal,
  selectedCategory,
  onSelectCategory,
  accounts,
  darkMode,
}) => {
  const inspectorRef = useRef<HTMLDivElement>(null);

  // Smooth scroll inspector into view if user clicked a card
  useEffect(() => {
    if (selectedCategory !== 'ALL' && inspectorRef.current) {
      inspectorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedCategory]);

  // Selected category summary and heads
  const selectedCatSummary = categories.find((c) => c.category === selectedCategory);
  const selectedHeads = accounts ? accounts.filter((a) => a.category === selectedCategory) : [];

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
    const isAnySelected = selectedCategory !== 'ALL';
    const isNegative = cat.balance < 0;
    const burnBadge = getBurnRateBadge(cat.burnRate);

    return (
      <div
        key={cat.category}
        onClick={() => onSelectCategory(isSelected ? 'ALL' : cat.category)}
        className={`group cursor-pointer rounded-xl overflow-hidden border transition-all duration-200 shadow-md ${spanClass} ${
          isSelected
            ? 'border-blue-400 ring-4 ring-blue-500/60 shadow-xl shadow-blue-500/25 -translate-y-1 scale-[1.02] z-10'
            : isAnySelected
            ? 'opacity-65 hover:opacity-100 transition-opacity ' +
              (darkMode ? 'bg-[#0B132B] border-slate-700/80 hover:border-slate-500' : 'bg-white border-slate-300 hover:border-slate-400')
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
          <div className="flex items-center gap-1.5 truncate">
            {isSelected && (
              <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
            )}
            <span className="truncate">{cat.shortName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isSelected ? (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-white text-slate-900 font-black rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                ACTIVE
              </span>
            ) : (
              <span className="text-[10px] font-mono opacity-90 px-2 py-0.5 bg-black/40 rounded-full">
                {cat.headCount} {cat.headCount === 1 ? 'Head' : 'Heads'}
              </span>
            )}
          </div>
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
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
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
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Category Filter ({selectedCategory})</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* EXPANDED FILTERED CATEGORY DETAILS INSPECTOR (APPEARS ON TOP)  */}
      {/* ------------------------------------------------------------- */}
      {selectedCategory !== 'ALL' && selectedCatSummary && (
        <div
          ref={inspectorRef}
          className={`rounded-2xl border-2 transition-all duration-300 shadow-2xl p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-3 ${
            darkMode
              ? 'bg-gradient-to-b from-[#0E1E38] via-[#0A162B] to-[#070F1E] border-blue-500/60 ring-2 ring-blue-500/30 shadow-blue-950/60'
              : 'bg-gradient-to-b from-blue-50/90 via-white to-white border-blue-400 ring-2 ring-blue-300/40 shadow-blue-100'
          }`}
        >
          {/* Inspector Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-blue-500/20">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0"
                style={{ backgroundColor: selectedCatSummary.themeColor.header }}
              >
                {selectedCatSummary.shortName.slice(0, 3).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    FILTER APPLIED: {selectedCatSummary.shortName}
                  </span>
                  <span className="text-xs font-mono text-blue-400 font-bold">
                    {selectedHeads.length} {selectedHeads.length === 1 ? 'Institutional Head' : 'Institutional Heads'}
                  </span>
                </div>
                <h3 className={`text-sm sm:text-base font-black tracking-wide uppercase mt-0.5 ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {selectedCatSummary.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
              <button
                onClick={() => {
                  const el = document.getElementById('audit-matrix-table');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
                  darkMode
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Scroll down to the complete audit table"
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-blue-400" />
                <span>Jump to Audit Table ↓</span>
              </button>

              <button
                onClick={() => onSelectCategory('ALL')}
                className="text-xs bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95"
                title="Clear filter and show all categories"
              >
                <X className="w-3.5 h-3.5" />
                <span>✕ Clear Filter (Show All 37 Heads)</span>
              </button>
            </div>
          </div>

          {/* Quick Financial KPI Cards Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* 1. Net Available Balance */}
            <div className={`p-3 rounded-xl border ${
              darkMode ? 'bg-black/30 border-blue-500/20' : 'bg-white border-blue-200'
            }`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                Current Net Balance
              </span>
              <div className={`text-base sm:text-xl font-black font-mono tracking-tight ${
                selectedCatSummary.balance < 0
                  ? 'text-rose-400'
                  : darkMode
                  ? 'text-emerald-300'
                  : 'text-emerald-600'
              }`}>
                {formatPKR(selectedCatSummary.balance, true)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedCatSummary.balance < 0 ? 'Deficit Warning' : 'Available Liquidity'}
              </span>
            </div>

            {/* 2. Opening Sanctioned */}
            <div className={`p-3 rounded-xl border ${
              darkMode ? 'bg-black/30 border-slate-700/50' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                Sanctioned Opening
              </span>
              <div className={`text-base sm:text-xl font-black font-mono tracking-tight ${
                darkMode ? 'text-slate-100' : 'text-slate-800'
              }`}>
                {formatPKR(selectedCatSummary.opening, false)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                FY 2026-27 Allocation
              </span>
            </div>

            {/* 3. Inflow (Receipts) */}
            <div className={`p-3 rounded-xl border ${
              darkMode ? 'bg-black/30 border-emerald-500/20' : 'bg-white border-emerald-200'
            }`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-0.5">
                During Year Inflow
              </span>
              <div className="text-base sm:text-xl font-black font-mono tracking-tight text-emerald-400">
                {selectedCatSummary.receipts > 0 ? formatPKR(selectedCatSummary.receipts, false) : 'Rs. 0'}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Receipts Credited
              </span>
            </div>

            {/* 4. Outflow (Payments) & Burn */}
            <div className={`p-3 rounded-xl border ${
              darkMode ? 'bg-black/30 border-rose-500/20' : 'bg-white border-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                  Total Disbursed
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${getBurnRateBadge(selectedCatSummary.burnRate).badgeClass}`}>
                  {formatPercent(selectedCatSummary.burnRate)}
                </span>
              </div>
              <div className={`text-base sm:text-xl font-black font-mono tracking-tight ${
                darkMode ? 'text-rose-300' : 'text-rose-600'
              }`}>
                {selectedCatSummary.payments > 0 ? formatPKR(selectedCatSummary.payments, false) : 'Rs. 0'}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {getBurnRateBadge(selectedCatSummary.burnRate).label}
              </span>
            </div>
          </div>

          {/* Immediate Head-Wise Account Details Table right in Cards Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Account Heads under {selectedCatSummary.shortName} ({selectedHeads.length})</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Instant Detail View (No Scrolling Required)
              </span>
            </div>

            <div className={`rounded-xl border overflow-x-auto max-h-64 table-scrollbar-always-visible shadow-inner ${
              darkMode ? 'bg-black/40 border-slate-700/80' : 'bg-white border-slate-200'
            }`}>
              <table className="w-full text-left text-xs border-collapse font-sans min-w-[650px]">
                <thead className={`sticky top-0 z-10 text-[10.5px] uppercase font-bold border-b ${
                  darkMode ? 'bg-[#0a1526] text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <tr>
                    <th className="py-2 px-3 w-28 text-center font-mono border-r border-slate-700/40">Head Code</th>
                    <th className="py-2 px-4 border-r border-slate-700/40">Account Description</th>
                    <th className="py-2 px-3 text-right font-mono border-r border-slate-700/40">Opening</th>
                    <th className="py-2 px-3 text-right font-mono border-r border-slate-700/40 text-emerald-400">Inflow</th>
                    <th className="py-2 px-3 text-right font-mono border-r border-slate-700/40 text-rose-400">Payments</th>
                    <th className="py-2 px-3 text-right font-mono border-r border-slate-700/40 text-amber-300">Net Balance</th>
                    <th className="py-2 px-2 text-center font-mono w-20 border-r border-slate-700/40">Burn %</th>
                    <th className="py-2 px-3 text-center text-[10px] w-36">Last Activity</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs font-sans ${
                  darkMode ? 'divide-slate-800/80 text-slate-200' : 'divide-slate-200 text-slate-800'
                }`}>
                  {selectedHeads.map((head, idx) => {
                    const isNeg = head.balance < 0;
                    const bBadge = getBurnRateBadge(head.burnRate);
                    return (
                      <tr
                        key={head.code}
                        className={`transition-colors ${
                          darkMode
                            ? idx % 2 === 0 ? 'bg-slate-900/40 hover:bg-slate-800/60' : 'bg-slate-900/10 hover:bg-slate-800/60'
                            : idx % 2 === 0 ? 'bg-slate-50/60 hover:bg-blue-50/50' : 'bg-white hover:bg-blue-50/50'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-center border-r border-slate-700/30 text-blue-400">
                          {head.code}
                        </td>
                        <td className="py-2 px-4 font-semibold border-r border-slate-700/30">
                          {head.head}
                        </td>
                        <td className="py-2 px-3 font-mono text-right border-r border-slate-700/30">
                          {formatPKR(head.opening, false)}
                        </td>
                        <td className="py-2 px-3 font-mono text-right border-r border-slate-700/30 text-emerald-400">
                          {head.receipts > 0 ? formatPKR(head.receipts, false) : '-'}
                        </td>
                        <td className="py-2 px-3 font-mono text-right border-r border-slate-700/30 text-rose-400">
                          {head.payments > 0 ? formatPKR(head.payments, false) : '-'}
                        </td>
                        <td className={`py-2 px-3 font-mono font-black text-right border-r border-slate-700/30 ${
                          isNeg ? 'text-rose-400' : darkMode ? 'text-amber-300 font-bold' : 'text-blue-900 font-bold'
                        }`}>
                          {formatPKR(head.balance, true)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono border-r border-slate-700/30">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${bBadge.badgeClass}`}>
                            {formatPercent(head.burnRate)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-[10px] font-mono text-slate-400 whitespace-nowrap">
                          {format12HourDate(head.lastActivity, false)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                ? 'border-amber-400 ring-4 ring-amber-500/60 shadow-xl shadow-amber-500/25 -translate-y-1 scale-[1.02] z-10'
                : selectedCategory !== 'ALL'
                ? 'opacity-65 hover:opacity-100 transition-opacity ' +
                  (darkMode ? 'bg-[#0B132B] border-slate-700/80 hover:border-slate-500' : 'bg-white border-slate-300 hover:border-slate-400')
                : darkMode
                ? 'bg-[#0B132B] border-slate-700/80 hover:border-slate-500'
                : 'bg-white border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="py-2 px-3 bg-[#374151] text-white font-extrabold text-xs tracking-wider flex items-center justify-between uppercase">
              <div className="flex items-center gap-1.5 truncate">
                {selectedCategory === 'AAA' && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping shrink-0" />
                )}
                <span>ASSAN ASSIGNMENT ACC. (AAA)</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {selectedCategory === 'AAA' ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-2.5 h-2.5 text-slate-950" />
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-mono">
                    Memo Pass-Through
                  </span>
                )}
              </div>
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

