import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, CreditCard, Users, Check, ArrowRight } from 'lucide-react';
import { MasterVoucher } from '../data/cashBookData';
import { MASTER_PAYEE_LIST } from '../data/voucherMasterLists';
import { formatPKR } from '../lib/formatters';

export interface ChequeSearchSuggestion {
  id: string;
  type: 'PAYEE' | 'CHEQUE_NET' | 'CHEQUE_PRA' | 'CHEQUE_WHT';
  value: string;
  title: string;
  matchTarget: string; // The specific string being matched against
  subtitle: string;
  badge: string;
  badgeColor: string;
  meta?: {
    payeeName?: string;
    amount?: number;
    date?: string;
    voucherNo?: string;
    srNo?: number;
    bankAccount?: string;
  };
}

interface ChequeSearchInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  vouchers: MasterVoucher[];
  selectedBank?: string;
  darkMode?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChequeSearchInput: React.FC<ChequeSearchInputProps> = ({
  id = 'cheque-payee-search-input',
  value,
  onChange,
  vouchers,
  selectedBank = 'ALL',
  darkMode = false,
  placeholder = 'Enter Cheque # or Payee...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'PAYEE' | 'CHEQUE'>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter relevant vouchers based on bank account if selected
  const bankScopedVouchers = useMemo(() => {
    if (!selectedBank || selectedBank === 'ALL') return vouchers;
    return vouchers.filter((v) => v.bankAccount.includes(selectedBank));
  }, [vouchers, selectedBank]);

  // Build comprehensive suggestions list from real vouchers and payee masters
  const allSuggestions: ChequeSearchSuggestion[] = useMemo(() => {
    const suggestions: ChequeSearchSuggestion[] = [];
    const seenPayees = new Set<string>();
    const seenCheques = new Set<string>();

    // 1. Gather all Payees from current vouchers
    const payeeStats: Record<string, { count: number; totalAmt: number; latestChq?: string }> = {};
    bankScopedVouchers.forEach((v) => {
      const p = (v.payeeName || '').trim();
      if (!p) return;
      if (!payeeStats[p]) {
        payeeStats[p] = { count: 0, totalAmt: 0 };
      }
      payeeStats[p].count += 1;
      payeeStats[p].totalAmt += v.billAmountGross || v.chequeAmountNet || 0;
      if (v.chequeNoNet && !payeeStats[p].latestChq) {
        payeeStats[p].latestChq = v.chequeNoNet;
      }
    });

    // Also include registered payees from MASTER_PAYEE_LIST
    MASTER_PAYEE_LIST.forEach((p) => {
      const name = p.name.trim();
      if (!payeeStats[name]) {
        payeeStats[name] = { count: 0, totalAmt: 0 };
      }
    });

    Object.entries(payeeStats).forEach(([name, stats]) => {
      seenPayees.add(name.toLowerCase());
      const sub = stats.count > 0
        ? `${stats.count} Transaction${stats.count > 1 ? 's' : ''} • Rs. ${formatPKR(stats.totalAmt)}${stats.latestChq ? ` • Last Chq #${stats.latestChq}` : ''}`
        : 'Registered Vendor / Payee';

      suggestions.push({
        id: `payee-${name}`,
        type: 'PAYEE',
        value: name,
        title: name,
        matchTarget: name,
        subtitle: sub,
        badge: 'PAYEE',
        badgeColor: 'bg-purple-700 text-white',
        meta: {
          payeeName: name,
          amount: stats.totalAmt,
        },
      });
    });

    // 2. Gather all Cheques from vouchers
    bankScopedVouchers.forEach((v) => {
      // Net Cheque
      if (v.chequeNoNet && v.chequeNoNet.trim()) {
        const chq = v.chequeNoNet.trim();
        const key = `net-${chq}-${v.srNo}`;
        if (!seenCheques.has(key)) {
          seenCheques.add(key);
          suggestions.push({
            id: key,
            type: 'CHEQUE_NET',
            value: chq,
            title: `Chq #${chq}`,
            matchTarget: `${chq} ${v.payeeName || ''}`,
            subtitle: `Payee: ${v.payeeName} • Rs. ${formatPKR(v.chequeAmountNet || v.billAmountGross)} • Vr #${v.srNo} • ${v.chequeDate || v.billDate}`,
            badge: 'NET CHQ',
            badgeColor: 'bg-amber-600 text-white',
            meta: {
              payeeName: v.payeeName,
              amount: v.chequeAmountNet || v.billAmountGross,
              date: v.chequeDate || v.billDate,
              srNo: v.srNo,
              bankAccount: v.bankAccount,
            },
          });
        }
      }

      // PRA Cheque
      if (v.chequeNoPra && v.chequeNoPra.trim()) {
        const chq = v.chequeNoPra.trim();
        const key = `pra-${chq}-${v.srNo}`;
        if (!seenCheques.has(key)) {
          seenCheques.add(key);
          suggestions.push({
            id: key,
            type: 'CHEQUE_PRA',
            value: chq,
            title: `Chq #${chq} (PRA)`,
            matchTarget: `${chq} ${v.payeeName || ''} PRA`,
            subtitle: `PRA Tax: Rs. ${formatPKR(v.praAmount || 0)} • Payee: ${v.payeeName} • Vr #${v.srNo}`,
            badge: 'PRA CHQ',
            badgeColor: 'bg-blue-600 text-white',
            meta: {
              payeeName: v.payeeName,
              amount: v.praAmount,
              date: v.chequeDate || v.billDate,
              srNo: v.srNo,
            },
          });
        }
      }

      // Income Tax / WHT Cheque
      if (v.chequeNoIncomeTax && v.chequeNoIncomeTax.trim()) {
        const chq = v.chequeNoIncomeTax.trim();
        const key = `wht-${chq}-${v.srNo}`;
        if (!seenCheques.has(key)) {
          seenCheques.add(key);
          suggestions.push({
            id: key,
            type: 'CHEQUE_WHT',
            value: chq,
            title: `Chq #${chq} (WHT)`,
            matchTarget: `${chq} ${v.payeeName || ''} WHT`,
            subtitle: `WHT Tax: Rs. ${formatPKR(v.incomeTaxAmount || 0)} • Payee: ${v.payeeName} • Vr #${v.srNo}`,
            badge: 'WHT CHQ',
            badgeColor: 'bg-emerald-600 text-white',
            meta: {
              payeeName: v.payeeName,
              amount: v.incomeTaxAmount,
              date: v.chequeDate || v.billDate,
              srNo: v.srNo,
            },
          });
        }
      }
    });

    return suggestions;
  }, [bankScopedVouchers]);

  // Filter suggestions by search query and category
  const filteredSuggestions = useMemo(() => {
    const q = value.toLowerCase().trim();

    let list = allSuggestions;

    // Filter by category
    if (activeCategory === 'PAYEE') {
      list = list.filter((s) => s.type === 'PAYEE');
    } else if (activeCategory === 'CHEQUE') {
      list = list.filter((s) => s.type !== 'PAYEE');
    }

    if (!q) {
      // Return top recent cheques & payees when query is empty
      return list.slice(0, 15);
    }

    return list
      .filter((item) => item.matchTarget.toLowerCase().includes(q))
      .slice(0, 25);
  }, [allSuggestions, value, activeCategory]);

  // Category counts for badges
  const categoryCounts = useMemo(() => {
    const q = value.toLowerCase().trim();
    const base = q
      ? allSuggestions.filter((item) => item.matchTarget.toLowerCase().includes(q))
      : allSuggestions;

    const payeeCount = base.filter((s) => s.type === 'PAYEE').length;
    const chequeCount = base.filter((s) => s.type !== 'PAYEE').length;

    return {
      all: base.length,
      payee: payeeCount,
      cheque: chequeCount,
    };
  }, [allSuggestions, value]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredSuggestions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions[highlightedIndex]) {
        handleSelect(filteredSuggestions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.cheque-suggestion-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Helper to highlight matching characters
  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-300 text-slate-950 dark:bg-amber-400 dark:text-slate-950 rounded-xs px-0.5 font-bold"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Label and Count Header */}
      <div className="flex items-center justify-between mb-1">
        <label
          htmlFor={id}
          className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Cheque# / Payee Query
        </label>
        {value.trim() && (
          <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">
            {categoryCounts.all} Matching Suggestions
          </span>
        )}
      </div>

      {/* Main Input Box with Search Icon and Clear Button */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          placeholder={placeholder}
          className={`w-full py-2.5 pl-9 pr-8 rounded-xl border font-bold text-xs outline-none transition-all shadow-xs ${
            darkMode
              ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'
              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
          } ${isOpen ? 'ring-2 ring-blue-500/40 border-blue-500' : ''}`}
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear Search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Interactive Suggestions Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[380px] animate-in fade-in zoom-in-95 duration-100 ${
            darkMode
              ? 'bg-[#0b172a] border-slate-700 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
          style={{ minWidth: '300px' }}
        >
          {/* Category Filter Chips Bar */}
          <div
            className={`p-2 border-b flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold ${
              darkMode ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-100/80 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                activeCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              All ({categoryCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('PAYEE')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                activeCategory === 'PAYEE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              Payees ({categoryCounts.payee})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('CHEQUE')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                activeCategory === 'CHEQUE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              Cheques ({categoryCounts.cheque})
            </button>
          </div>

          {/* Scrollable Suggestions List */}
          <div ref={listRef} className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item, index) => {
                const isSelected = value === item.value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`cheque-suggestion-item p-2.5 flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                      darkMode
                        ? isHighlighted
                          ? 'bg-blue-950/60 text-white'
                          : 'hover:bg-slate-800/60 text-slate-200'
                        : isHighlighted
                        ? 'bg-blue-50 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-800'
                    } ${isSelected ? 'font-bold' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Icon */}
                      <span className="shrink-0 p-1 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.type === 'PAYEE' ? (
                          <Users className="w-3.5 h-3.5 text-purple-500" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </span>

                      {/* Main Title and Subtitle */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate">
                            {highlightMatches(item.title, value)}
                          </span>
                          {item.meta?.payeeName && item.type !== 'PAYEE' && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                              to {highlightMatches(item.meta.payeeName, value)}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Badge and Selection Indicator */}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                <p className="font-bold">No matching cheques or payees found</p>
                <p className="text-[10px] text-slate-500">
                  Try typing part of a cheque number (e.g. 8061) or payee name (e.g. Kashif)
                </p>
              </div>
            )}
          </div>

          {/* Footer Guide */}
          <div
            className={`p-1.5 px-3 border-t text-[9px] text-slate-400 flex items-center justify-between ${
              darkMode ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span>Click any item to search</span>
            <span>ESC to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
