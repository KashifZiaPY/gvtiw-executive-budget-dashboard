import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  AccountHead,
  CategorySummary,
  GrandTotalSummary,
  CategoryType,
} from '../types';
import {
  formatPKR,
  formatPercent,
  format12HourDate,
  getBurnRateBadge,
} from '../lib/formatters';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  Zap,
  CheckCircle2,
  Table as TableIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoveHorizontal,
} from 'lucide-react';

interface HeadWiseTableProps {
  accounts: AccountHead[];
  categories: CategorySummary[];
  grandTotal: GrandTotalSummary;
  selectedCategory: CategoryType | 'ALL';
  onSelectCategory: (cat: CategoryType | 'ALL') => void;
  latestChangedCode: string | null;
  darkMode: boolean;
}

export const HeadWiseTable: React.FC<HeadWiseTableProps> = ({
  accounts,
  categories,
  grandTotal,
  selectedCategory,
  onSelectCategory,
  latestChangedCode,
  darkMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [burnFilter, setBurnFilter] = useState<'ALL' | 'CRITICAL' | 'MODERATE' | 'SAFE' | 'SPOTLIGHT'>('ALL');
  const [sortBy, setSortBy] = useState<'code' | 'balance' | 'burnRate' | 'payments' | 'activity'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Ref for table horizontal scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const summaryContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update scroll metrics
  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    const progress = Math.min(100, Math.max(0, Math.round((scrollLeft / maxScroll) * 100)));
    setScrollProgress(progress);
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < maxScroll - 5);
  }, []);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [handleScroll]);

  // Smooth scroll helper
  const scrollTo = (amountOrTarget: number | 'start' | 'opening' | 'receipts' | 'payments' | 'balance' | 'end') => {
    if (!tableContainerRef.current) return;
    const el = tableContainerRef.current;
    const maxScroll = el.scrollWidth - el.clientWidth;

    let targetLeft = 0;
    if (typeof amountOrTarget === 'number') {
      targetLeft = Math.min(maxScroll, Math.max(0, el.scrollLeft + amountOrTarget));
    } else if (amountOrTarget === 'start') {
      targetLeft = 0;
    } else if (amountOrTarget === 'opening') {
      targetLeft = Math.round(maxScroll * 0.25);
    } else if (amountOrTarget === 'receipts') {
      targetLeft = Math.round(maxScroll * 0.45);
    } else if (amountOrTarget === 'payments') {
      targetLeft = Math.round(maxScroll * 0.65);
    } else if (amountOrTarget === 'balance') {
      targetLeft = Math.round(maxScroll * 0.85);
    } else if (amountOrTarget === 'end') {
      targetLeft = maxScroll;
    }

    el.scrollTo({ left: targetLeft, behavior: 'smooth' });
    if (summaryContainerRef.current) {
      summaryContainerRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  };

  // Drag scrubber handler
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!tableContainerRef.current) return;
    const el = tableContainerRef.current;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const targetLeft = (val / 100) * maxScroll;
    el.scrollLeft = targetLeft;
    if (summaryContainerRef.current) {
      summaryContainerRef.current.scrollLeft = targetLeft;
    }
    setScrollProgress(val);
  };


  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Category filter
      if (selectedCategory !== 'ALL' && acc.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesCode = acc.code.toLowerCase().includes(term);
        const matchesHead = acc.head.toLowerCase().includes(term);
        const matchesCat = acc.category.toLowerCase().includes(term);
        if (!matchesCode && !matchesHead && !matchesCat) return false;
      }
      // Burn status filter
      if (burnFilter === 'CRITICAL' && acc.burnRate < 0.4) return false;
      if (burnFilter === 'MODERATE' && (acc.burnRate < 0.2 || acc.burnRate >= 0.4)) return false;
      if (burnFilter === 'SAFE' && acc.burnRate >= 0.2) return false;
      if (burnFilter === 'SPOTLIGHT' && acc.code !== latestChangedCode) return false;

      return true;
    });
  }, [accounts, selectedCategory, searchTerm, burnFilter, latestChangedCode]);

  // Group accounts by category and apply active sorting within each tier
  const groupedByCategory = useMemo(() => {
    const map = new Map<CategoryType, AccountHead[]>();
    categories.forEach((c) => map.set(c.category, []));

    filteredAccounts.forEach((acc) => {
      const list = map.get(acc.category) || [];
      list.push(acc);
      map.set(acc.category, list);
    });

    // Sort heads within each category according to active sortBy & sortOrder
    map.forEach((list) => {
      list.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'code') {
          comparison = a.code.localeCompare(b.code);
        } else if (sortBy === 'balance') {
          comparison = a.balance - b.balance;
        } else if (sortBy === 'burnRate') {
          comparison = a.burnRate - b.burnRate;
        } else if (sortBy === 'payments') {
          comparison = a.payments - b.payments;
        } else if (sortBy === 'activity') {
          const timeA = new Date(a.lastActivity).getTime() || 0;
          const timeB = new Date(b.lastActivity).getTime() || 0;
          comparison = timeA - timeB;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    });

    return map;
  }, [filteredAccounts, categories, sortBy, sortOrder]);

  const toggleSort = (field: 'code' | 'balance' | 'burnRate' | 'payments' | 'activity') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 shadow-xl ${
        darkMode ? 'bg-[#0B132B] border-slate-700/90' : 'bg-white border-slate-300'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* TABLE CONTROLS & SEARCH BAR                                    */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-4 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        darkMode ? 'bg-[#0F1D3B] border-slate-700/80' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wide ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Head-Wise Financial Position & Instant Audit Matrix
            </h2>
            <p className="text-[11px] text-slate-400">
              38 Institutional heads grouped by corporate tier with real-time audit spotlight
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick search input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code (A03101) or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-blue-500 font-sans ${
                darkMode
                  ? 'bg-slate-900 text-white placeholder-slate-500 border-slate-700'
                  : 'bg-white text-slate-900 placeholder-slate-400 border-slate-300'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Burn Filter dropdown */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
            darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
          }`}>
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <select
              value={burnFilter}
              onChange={(e) => setBurnFilter(e.target.value as any)}
              aria-label="Filter by utilization"
              className="bg-transparent text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>All Statuses</option>
              <option value="CRITICAL" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>High Burn (&gt;40%)</option>
              <option value="MODERATE" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Moderate (20-40%)</option>
              <option value="SAFE" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Conservative (&lt;20%)</option>
              <option value="SPOTLIGHT" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>⚡ Active Spotlight</option>
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE COLUMN QUICK JUMP & HORIZONTAL NAVIGATION BAR         */}
      {/* ------------------------------------------------------------- */}
      <div className={`px-4 py-2 border-b flex items-center justify-between gap-2 overflow-x-auto text-[11px] ${
        darkMode ? 'bg-[#0a1224] border-slate-700/60' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 font-semibold">
          <MoveHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span>Jump to Column:</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 font-medium">
          <button
            onClick={() => scrollTo('start')}
            className={`px-2 py-0.5 rounded text-[11px] transition-all border ${
              scrollProgress < 15
                ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                : darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            Code & Head
          </button>
          <button
            onClick={() => scrollTo('opening')}
            className={`px-2 py-0.5 rounded text-[11px] transition-all border ${
              scrollProgress >= 15 && scrollProgress < 40
                ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                : darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            Opening
          </button>
          <button
            onClick={() => scrollTo('receipts')}
            className={`px-2 py-0.5 rounded text-[11px] transition-all border ${
              scrollProgress >= 40 && scrollProgress < 60
                ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs'
                : darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            Receipts
          </button>
          <button
            onClick={() => scrollTo('payments')}
            className={`px-2 py-0.5 rounded text-[11px] transition-all border ${
              scrollProgress >= 60 && scrollProgress < 78
                ? 'bg-rose-600 text-white border-rose-500 font-bold shadow-xs'
                : darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => scrollTo('balance')}
            className={`px-2.5 py-0.5 rounded text-[11px] transition-all border ${
              scrollProgress >= 78 && scrollProgress < 95
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                : darkMode ? 'bg-slate-800/80 text-amber-300 border-amber-500/30 hover:bg-slate-700' : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-bold'
            }`}
          >
            💰 Net Balance
          </button>
          <button
            onClick={() => scrollTo('end')}
            className={`px-2 py-0.5 rounded text-[11px] transition-all border ${
              scrollProgress >= 95
                ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                : darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            Burn & Activity
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <button
            onClick={() => scrollTo(-250)}
            disabled={!canScrollLeft}
            title="Scroll Left"
            className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scrollTo(250)}
            disabled={!canScrollRight}
            title="Scroll Right"
            className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN DATA TABLE (Sticky Header, High Performance)             */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={tableContainerRef}
        className="overflow-x-auto max-h-[800px] table-scrollbar-always-visible scroll-smooth relative"
      >
        <table className="w-full text-left text-xs border-collapse font-sans min-w-[1050px]">
          {/* Main Table Column Headers (Matching exact Google Sheet Table Headers) */}
          <thead className="sticky top-0 z-20 bg-[#0F2537] text-white shadow-md select-none border-b-2 border-slate-600">
            <tr>
              <th className="py-2.5 px-2 text-center w-12 font-bold uppercase text-[11px] border-r border-slate-700">
                Sr.#
              </th>
              <th
                onClick={() => toggleSort('code')}
                className="py-2.5 px-3 text-center w-28 font-bold uppercase text-[11px] border-r border-slate-700 cursor-pointer hover:bg-slate-800"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Head Code</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-4 font-bold uppercase text-[11px] border-r border-slate-700 min-w-[260px]">
                Account Head Description
              </th>
              <th className="py-2.5 px-3 text-right font-bold uppercase text-[11px] border-r border-slate-700 min-w-[120px]">
                Opening Budget
                <div className="text-[9px] font-normal text-blue-300">(01-07-2026)</div>
              </th>
              <th className="py-2.5 px-3 text-right font-bold uppercase text-[11px] border-r border-slate-700 min-w-[105px]">
                Reappr. / Other
                <div className="text-[9px] font-normal text-blue-300">Adjustments</div>
              </th>
              <th className="py-2.5 px-3 text-right font-bold uppercase text-[11px] border-r border-slate-700 min-w-[105px]">
                During Year
                <div className="text-[9px] font-normal text-emerald-300">Receipts</div>
              </th>
              <th
                onClick={() => toggleSort('payments')}
                className="py-2.5 px-3 text-right font-bold uppercase text-[11px] border-r border-slate-700 min-w-[110px] cursor-pointer hover:bg-slate-800"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>During Year</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
                <div className="text-[9px] font-normal text-rose-300">Payments</div>
              </th>
              <th
                onClick={() => toggleSort('balance')}
                className="py-2.5 px-3 text-right font-bold uppercase text-[11px] border-r border-slate-700 min-w-[125px] cursor-pointer hover:bg-slate-800 bg-[#1E3A8A]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span className="text-amber-300">Current Net Balance</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('burnRate')}
                className="py-2.5 px-2 text-center font-bold uppercase text-[11px] border-r border-slate-700 min-w-[100px] cursor-pointer hover:bg-slate-800"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Burn Rate</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
                <div className="text-[9px] font-normal text-blue-300">(Util. %)</div>
              </th>
              <th
                onClick={() => toggleSort('activity')}
                className="py-2.5 px-3 text-center font-bold uppercase text-[11px] min-w-[160px] cursor-pointer hover:bg-slate-800"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Last Activity</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
                <div className="text-[9px] font-normal text-blue-300">(Head-wise)</div>
              </th>
            </tr>
          </thead>

          {/* Table Body organized by Categories */}
          <tbody className={`divide-y font-sans ${darkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
            {categories.map((catSummary) => {
              const catHeads = groupedByCategory.get(catSummary.category) || [];
              if (catHeads.length === 0) return null;

              return (
                <React.Fragment key={catSummary.category}>
                  {/* Category Header Banner (Full width colored bar matching Google Sheet) */}
                  <tr
                    className="text-white font-extrabold tracking-wider select-none shadow-xs"
                    style={{ backgroundColor: catSummary.themeColor.header }}
                  >
                    <td colSpan={10} className="py-2.5 px-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs"></span>
                          <span>{catSummary.title}</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 bg-black/40 rounded-full border border-white/20">
                          {catHeads.length} {catHeads.length === 1 ? 'Account Head' : 'Account Heads'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Individual Account Head Detail Rows */}
                  {catHeads.map((item, idx) => {
                    const isSpotlight = item.code === latestChangedCode;
                    const isEven = idx % 2 === 0;
                    const burnBadge = getBurnRateBadge(item.burnRate);

                    return (
                      <tr
                        key={item.code}
                        id={`head-row-${item.code}`}
                        className={`transition-all duration-300 group ${
                          isSpotlight
                            ? 'bg-amber-400/20 hover:bg-amber-400/25 border-y-2 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                            : isEven
                            ? darkMode
                              ? 'bg-[#0B132B] hover:bg-[#132247]'
                              : 'bg-white hover:bg-blue-50/50'
                            : darkMode
                            ? 'bg-[#070E20] hover:bg-[#132247]'
                            : 'bg-slate-50 hover:bg-blue-50/50'
                        }`}
                      >
                        {/* Sr.# */}
                        <td className={`py-2.5 px-2 text-center font-mono text-xs border-r ${
                          darkMode ? 'text-slate-400 border-slate-700/60' : 'text-slate-500 border-slate-200'
                        }`}>
                          {isSpotlight ? (
                            <Zap className="w-3.5 h-3.5 text-amber-400 mx-auto animate-bounce" />
                          ) : (
                            idx + 1
                          )}
                        </td>

                        {/* Head Code */}
                        <td className={`py-2.5 px-3 text-center border-r font-mono font-bold ${
                          darkMode ? 'border-slate-700/60' : 'border-slate-200'
                        }`}>
                          <span
                            className={`px-2 py-0.5 rounded text-xs inline-block ${
                              isSpotlight
                                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                                : darkMode
                                ? 'bg-slate-800 text-blue-300 border border-slate-700'
                                : 'bg-blue-50 text-blue-800 border border-blue-200 font-bold'
                            }`}
                          >
                            {item.code}
                          </span>
                        </td>

                        {/* Account Head Description (Dark in white mode, White in dark mode) */}
                        <td className={`py-2.5 px-4 border-r font-medium ${
                          darkMode ? 'border-slate-700/60' : 'border-slate-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              darkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {item.head}
                            </span>
                            {isSpotlight && (
                              <span className="flex items-center gap-1 text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black whitespace-nowrap shadow-xs animate-pulse">
                                <Sparkles className="w-3 h-3" />
                                Active Spotlight
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Opening Budget */}
                        <td
                          className={`py-2.5 px-3 text-right font-mono border-r font-medium ${
                            darkMode ? 'border-slate-700/60' : 'border-slate-200'
                          } ${
                            item.opening < 0
                              ? darkMode ? 'text-rose-400 font-bold' : 'text-rose-600 font-bold'
                              : darkMode ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          {formatPKR(item.opening, false)}
                        </td>

                        {/* Reappr. / Other Adjustments */}
                        <td className={`py-2.5 px-3 text-right font-mono border-r ${
                          darkMode ? 'border-slate-700/60' : 'border-slate-200'
                        }`}>
                          <span
                            className={
                              item.reappr > 0
                                ? darkMode ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold'
                                : item.reappr < 0
                                ? darkMode ? 'text-rose-400 font-bold' : 'text-rose-600 font-bold'
                                : darkMode ? 'text-slate-500' : 'text-slate-400'
                            }
                          >
                            {item.reappr !== 0 ? formatPKR(item.reappr, false) : '-'}
                          </span>
                        </td>

                        {/* During Year Receipts */}
                        <td className={`py-2.5 px-3 text-right font-mono border-r font-medium ${
                          darkMode ? 'text-emerald-400 border-slate-700/60' : 'text-emerald-700 border-slate-200 font-semibold'
                        }`}>
                          {item.receipts > 0 ? formatPKR(item.receipts, false) : '-'}
                        </td>

                        {/* During Year Payments */}
                        <td className={`py-2.5 px-3 text-right font-mono font-medium border-r ${
                          darkMode ? 'text-rose-300 border-slate-700/60' : 'text-rose-600 border-slate-200 font-semibold'
                        }`}>
                          {item.payments > 0 ? formatPKR(item.payments, false) : '-'}
                        </td>

                        {/* Current Net Balance */}
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold border-r ${
                            darkMode ? 'border-slate-700/60' : 'border-slate-200'
                          } ${
                            item.balance < 0
                              ? darkMode ? 'text-rose-400 bg-rose-950/30' : 'text-rose-700 bg-rose-50 font-black'
                              : darkMode ? 'text-amber-300 bg-blue-950/30 font-black' : 'text-blue-900 bg-blue-50 font-black'
                          }`}
                        >
                          {formatPKR(item.balance, false)}
                        </td>

                        {/* Burn Rate */}
                        <td className={`py-2.5 px-2 text-center border-r ${
                          darkMode ? 'border-slate-700/60' : 'border-slate-200'
                        }`}>
                          <span
                            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${burnBadge.badgeClass}`}
                          >
                            {formatPercent(item.burnRate)}
                          </span>
                        </td>

                        {/* Last Activity (12-Hour format) */}
                        <td className={`py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap ${
                          darkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          {format12HourDate(item.lastActivity, false)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Subtotal Row (Matching Google Sheet Subtotal Row) */}
                  <tr className={`font-bold text-xs border-y-2 shadow-inner ${
                    darkMode ? 'bg-[#1E293B] text-white border-slate-600' : 'bg-slate-800 text-white border-slate-700'
                  }`}>
                    <td className="py-2 px-2 text-center font-mono text-amber-300 text-sm font-black">
                      ∑
                    </td>
                    <td colSpan={2} className="py-2 px-4 text-left tracking-wide uppercase text-amber-300 font-extrabold">
                      SUBTOTAL — {catSummary.title}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${catSummary.opening < 0 ? 'text-rose-300' : 'text-blue-200'}`}>
                      {formatPKR(catSummary.opening, false)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300 font-bold">
                      {catSummary.reappr !== 0 ? formatPKR(catSummary.reappr, false) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-300 font-bold">
                      {catSummary.receipts > 0 ? formatPKR(catSummary.receipts, false) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-rose-300 font-bold">
                      {catSummary.payments > 0 ? formatPKR(catSummary.payments, false) : '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-black text-sm ${catSummary.balance < 0 ? 'text-rose-400 bg-rose-950/60' : 'text-amber-300 bg-blue-950/70'}`}>
                      {formatPKR(catSummary.balance, false)}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-blue-200 font-bold">
                      {formatPercent(catSummary.burnRate)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-300">
                      {format12HourDate(catSummary.latestActivity, false)}
                    </td>
                  </tr>

                  {/* Spacer between categories */}
                  <tr className={`h-2 ${darkMode ? 'bg-[#020617]' : 'bg-slate-200'}`}>
                    <td colSpan={10}></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PERSISTENT MOBILE HORIZONTAL SCROLL & SCRUBBER DOCK           */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-2.5 sm:p-3 border-t flex flex-col gap-2 select-none ${
        darkMode ? 'bg-[#0B1528] border-slate-700/80 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
      }`}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] text-blue-400">
            <MoveHorizontal className="w-3.5 h-3.5" />
            <span>Table Horizontal Scroll & Navigation:</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
              Position: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{scrollProgress}%</strong>
            </span>
            <span>•</span>
            <span className="text-amber-400 font-bold hidden sm:inline">
              {scrollProgress < 20
                ? 'Showing: Code & Head Descriptions'
                : scrollProgress < 50
                ? 'Showing: Opening & Receipts'
                : scrollProgress < 80
                ? 'Showing: Receipts & Outflow Payments'
                : 'Showing: Net Balances & Burn Velocity'}
            </span>
          </div>
        </div>

        {/* Continuous Interactive Scrubber & Directional Controls */}
        <div className="flex items-center gap-2">
          {/* Quick jump to start */}
          <button
            onClick={() => scrollTo('start')}
            disabled={!canScrollLeft}
            title="Jump to Head Code (Start)"
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-30'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30'
            }`}
          >
            <ChevronsLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Start</span>
          </button>

          {/* Step scroll left */}
          <button
            onClick={() => scrollTo(-250)}
            disabled={!canScrollLeft}
            title="Scroll Left"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-30'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[11px]">Scroll Left</span>
          </button>

          {/* Interactive Drag Scrubber */}
          <div className="flex-1 relative flex items-center px-1">
            <input
              type="range"
              min="0"
              max="100"
              value={scrollProgress}
              onChange={handleScrubberChange}
              aria-label="Table horizontal scroll scrubber"
              className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
            />
          </div>

          {/* Step scroll right */}
          <button
            onClick={() => scrollTo(250)}
            disabled={!canScrollRight}
            title="Scroll Right"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              darkMode
                ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 disabled:opacity-30'
                : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 disabled:opacity-30'
            }`}
          >
            <span className="text-[11px]">Scroll Right</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Quick jump to end */}
          <button
            onClick={() => scrollTo('end')}
            disabled={!canScrollRight}
            title="Jump to Balance & Burn (End)"
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-30'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30'
            }`}
          >
            <span className="hidden sm:inline">End</span>
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Column Shortcuts on Mobile View */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-[10px] sm:text-[11px]">
          <span className="text-slate-400 font-bold shrink-0">Quick View:</span>
          <button
            onClick={() => scrollTo('start')}
            className={`px-2 py-0.5 rounded border shrink-0 transition-all ${
              scrollProgress < 20 ? 'bg-blue-600 text-white font-bold' : darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Head Code & Name
          </button>
          <button
            onClick={() => scrollTo('opening')}
            className={`px-2 py-0.5 rounded border shrink-0 transition-all ${
              scrollProgress >= 20 && scrollProgress < 45 ? 'bg-blue-600 text-white font-bold' : darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Opening Budget
          </button>
          <button
            onClick={() => scrollTo('receipts')}
            className={`px-2 py-0.5 rounded border shrink-0 transition-all ${
              scrollProgress >= 45 && scrollProgress < 65 ? 'bg-emerald-600 text-white font-bold' : darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Receipts
          </button>
          <button
            onClick={() => scrollTo('payments')}
            className={`px-2 py-0.5 rounded border shrink-0 transition-all ${
              scrollProgress >= 65 && scrollProgress < 80 ? 'bg-rose-600 text-white font-bold' : darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Disbursed Payments
          </button>
          <button
            onClick={() => scrollTo('balance')}
            className={`px-2.5 py-0.5 rounded border shrink-0 transition-all ${
              scrollProgress >= 80 && scrollProgress < 95 ? 'bg-amber-500 text-slate-950 font-black' : darkMode ? 'bg-slate-800 text-amber-300 border-amber-500/40 font-bold' : 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
            }`}
          >
            💰 Net Balance
          </button>
          <button
            onClick={() => scrollTo('end')}
            className={`px-2 py-0.5 rounded border shrink-0 transition-all ${
              scrollProgress >= 95 ? 'bg-blue-600 text-white font-bold' : darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Burn & Last Activity
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONSOLIDATED FINANCIAL SUMMARY & GRAND TOTAL BAR             */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-4 border-t-2 ${
        darkMode ? 'bg-[#050C1A] border-slate-600' : 'bg-slate-50 border-slate-300'
      }`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
            <h3 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider font-sans ${
              darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              Consolidated Executive Financial Summary — All 9 Institutional Categories
            </h3>
          </div>
          <span className={`text-[11px] font-mono ${
            darkMode ? 'text-amber-300/80' : 'text-amber-800'
          }`}>
            * AAA Memo Account segregated from Grand Total pool to avoid double-counting
          </span>
        </div>

        <div
          ref={summaryContainerRef}
          className={`overflow-x-auto rounded-lg border table-scrollbar-always-visible ${
            darkMode ? 'border-slate-700/80' : 'border-slate-300'
          }`}
        >
          <table className="w-full text-xs text-left font-sans border-collapse">
            <thead>
              <tr className={`text-white font-bold uppercase text-[10px] border-b ${
                darkMode ? 'bg-[#0F2537] border-slate-700' : 'bg-[#1E3A8A] border-slate-600'
              }`}>
                <th className="py-2.5 px-2 text-center w-10">Sr.#</th>
                <th colSpan={2} className="py-2.5 px-3">Corporate Financial Category</th>
                <th className="py-2.5 px-3 text-right">Opening Budget</th>
                <th className="py-2.5 px-3 text-right">Reappr. / Adj.</th>
                <th className="py-2.5 px-3 text-right">Receipts</th>
                <th className="py-2.5 px-3 text-right">Payments</th>
                <th className="py-2.5 px-3 text-right text-amber-300">Current Net Balance</th>
                <th className="py-2.5 px-2 text-center">Burn Rate</th>
                <th className="py-2.5 px-3 text-center">Latest Activity</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {categories.map((cat, idx) => {
                const isAaa = cat.category === 'AAA';
                return (
                  <tr
                    key={cat.category}
                    className={`transition-colors ${
                      isAaa
                        ? darkMode ? 'bg-slate-900/50 text-slate-400 italic' : 'bg-slate-100 text-slate-600 italic'
                        : darkMode ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <td className={`py-2 px-2 text-center font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{idx + 1}</td>
                    <td colSpan={2} className="py-2 px-3 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.themeColor.accent }} />
                        <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{cat.title}</span>
                        {isAaa && (
                          <span className="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.2 rounded not-italic font-mono border border-slate-700">
                            Memo Reconciliation
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${
                      cat.opening < 0 ? (darkMode ? 'text-rose-400' : 'text-rose-600 font-bold') : (darkMode ? 'text-slate-300' : 'text-slate-700')
                    }`}>
                      {formatPKR(cat.opening, false)}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {cat.reappr !== 0 ? formatPKR(cat.reappr, false) : '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {cat.receipts > 0 ? formatPKR(cat.receipts, false) : '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-medium ${darkMode ? 'text-rose-300' : 'text-rose-700'}`}>
                      {cat.payments > 0 ? formatPKR(cat.payments, false) : '-'}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-bold ${
                        cat.balance < 0
                          ? darkMode ? 'text-rose-400' : 'text-rose-600 font-black'
                          : darkMode ? 'text-amber-300 font-black' : 'text-blue-900 font-black'
                      }`}
                    >
                      {formatPKR(cat.balance, false)}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-medium">
                      {formatPercent(cat.burnRate)}
                    </td>
                    <td className={`py-2 px-3 text-center font-mono text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {format12HourDate(cat.latestActivity, false)}
                    </td>
                  </tr>
                );
              })}

              {/* GRAND TOTAL ROW */}
              <tr className="bg-[#0F2537] text-white font-black text-xs sm:text-sm border-t-2 border-b-2 border-amber-500 shadow-xl">
                <td className="py-3 px-2 text-center font-mono text-amber-400 text-base">★</td>
                <td colSpan={2} className="py-3 px-3 uppercase tracking-wider text-amber-300">
                  GRAND TOTAL — CONSOLIDATED OPERATIONAL POOL (Excl. AAA Memo)
                </td>
                <td className="py-3 px-3 text-right font-mono text-blue-200 font-bold">
                  {formatPKR(grandTotal.opening, false)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-300 font-bold">
                  {grandTotal.reappr !== 0 ? formatPKR(grandTotal.reappr, false) : '-'}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-300 font-bold">
                  {formatPKR(grandTotal.receipts, false)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-rose-300 font-bold">
                  {formatPKR(grandTotal.payments, false)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-300 text-base font-black bg-black/50">
                  {formatPKR(grandTotal.balance, true)}
                </td>
                <td className="py-3 px-2 text-center font-mono text-amber-300 text-xs font-black">
                  {formatPercent(grandTotal.burnRate)}
                </td>
                <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-200">
                  {format12HourDate(grandTotal.latestActivity, false)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
