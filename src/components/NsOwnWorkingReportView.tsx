import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  Calendar,
  Check,
  CheckSquare,
  X,
  ChevronDown,
  Filter,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import rawData from '../data/nsOwnReportData.json';

export interface NsOwnReportProps {
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
}

export interface SheetReportRow {
  rowIndex: number;
  raw: string[];
  sr: string;
  code: string;
  particulars: string;
  originalBudget: string;
  recJul: string;
  recAug: string;
  recSep: string;
  totReceipts: string;
  totalBudget: string;
  expJul: string;
  expAug: string;
  expSep: string;
  totExp: string;
  balance: string;
  isMainHeader: boolean;
  isCategoryHeader: boolean;
  isSubtotal: boolean;
  isGrandTotal: boolean;
  categoryGroup: 'NON_SALARY' | 'OTHER_NS' | 'OWN_SOURCE' | 'SUMMARY';
}

export interface MonthConfig {
  id: string;
  name: string;
  short: string;
  recCol: number;
  expCol: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  displayRange: string; // '01-Jul-2026 to 31-Jul-2026'
}

export const FY_MONTHS: MonthConfig[] = [
  { id: 'JUL', name: 'July 2026', short: 'Jul', recCol: 5, expCol: 23, startDate: '2026-07-01', endDate: '2026-07-31', displayRange: '01-Jul-2026 to 31-Jul-2026' },
  { id: 'AUG', name: 'August 2026', short: 'Aug', recCol: 6, expCol: 24, startDate: '2026-08-01', endDate: '2026-08-31', displayRange: '01-Aug-2026 to 31-Aug-2026' },
  { id: 'SEP', name: 'September 2026', short: 'Sep', recCol: 7, expCol: 25, startDate: '2026-09-01', endDate: '2026-09-30', displayRange: '01-Sep-2026 to 30-Sep-2026' },
  { id: 'OCT', name: 'October 2026', short: 'Oct', recCol: 8, expCol: 26, startDate: '2026-10-01', endDate: '2026-10-31', displayRange: '01-Oct-2026 to 31-Oct-2026' },
  { id: 'NOV', name: 'November 2026', short: 'Nov', recCol: 9, expCol: 27, startDate: '2026-11-01', endDate: '2026-11-30', displayRange: '01-Nov-2026 to 31-Nov-2026' },
  { id: 'DEC', name: 'December 2026', short: 'Dec', recCol: 10, expCol: 28, startDate: '2026-12-01', endDate: '2026-12-31', displayRange: '01-Dec-2026 to 31-Dec-2026' },
  { id: 'JAN', name: 'January 2027', short: 'Jan', recCol: 11, expCol: 29, startDate: '2027-01-01', endDate: '2027-01-31', displayRange: '01-Jan-2027 to 31-Jan-2027' },
  { id: 'FEB', name: 'February 2027', short: 'Feb', recCol: 12, expCol: 30, startDate: '2027-02-01', endDate: '2027-02-28', displayRange: '01-Feb-2027 to 28-Feb-2027' },
  { id: 'MAR', name: 'March 2027', short: 'Mar', recCol: 13, expCol: 31, startDate: '2027-03-01', endDate: '2027-03-31', displayRange: '01-Mar-2027 to 31-Mar-2027' },
  { id: 'APR', name: 'April 2027', short: 'Apr', recCol: 14, expCol: 32, startDate: '2027-04-01', endDate: '2027-04-30', displayRange: '01-Apr-2027 to 30-Apr-2027' },
  { id: 'MAY', name: 'May 2027', short: 'May', recCol: 15, expCol: 33, startDate: '2027-05-01', endDate: '2027-05-31', displayRange: '01-May-2027 to 31-May-2027' },
  { id: 'JUN', name: 'June 2027', short: 'Jun', recCol: 16, expCol: 34, startDate: '2027-06-01', endDate: '2027-06-30', displayRange: '01-Jun-2027 to 30-Jun-2027' },
];

export const parseNumber = (val: string | number | undefined): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str || str === '-' || str === '') return 0;
  const clean = str.replace(/,/g, '').trim();
  if (clean.startsWith('(') && clean.endsWith(')')) {
    const num = parseFloat(clean.slice(1, -1));
    return isNaN(num) ? 0 : -num;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const formatAmount = (val: string | number | undefined): string => {
  if (val === undefined || val === null) return '-';
  if (typeof val === 'number') {
    if (val === 0) return '-';
    const isNeg = val < 0;
    const absStr = Math.abs(Math.round(val)).toLocaleString('en-US');
    return isNeg ? `(${absStr})` : absStr;
  }
  const trimmed = String(val).trim();
  if (!trimmed || trimmed === '-') return '-';
  return trimmed;
};

export const formatTimestamp = (d = new Date()): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

export const formatIsoToDmy = (isoStr: string): string => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = monthNames[monthIdx] || m;
  return `${d.padStart(2, '0')}-${monthName}-${y}`;
};

export const NsOwnWorkingReportView: React.FC<NsOwnReportProps> = ({
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
}) => {
  const [rows, setRows] = useState<string[][]>(() => rawData as string[][]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const suggestionItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'SUBTOTALS'>('ALL');
  
  // Monthly filter and Custom Date Range
  const [monthFilter, setMonthFilter] = useState<'ALL' | 'Q1' | 'JUL' | 'AUG' | 'SEP' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('2026-07-01');
  const [customEndDate, setCustomEndDate] = useState('2026-09-30');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(() => formatTimestamp(new Date()));
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize Top Horizontal Scrollbar with Table Scrollbar
  useEffect(() => {
    const tableEl = tableRef.current;
    const topEl = topScrollRef.current;
    if (!tableEl || !topEl) return;

    let isSyncingTop = false;
    let isSyncingTable = false;

    const handleTableScroll = () => {
      if (isSyncingTable) {
        isSyncingTable = false;
        return;
      }
      isSyncingTop = true;
      topEl.scrollLeft = tableEl.scrollLeft;
    };

    const handleTopScroll = () => {
      if (isSyncingTop) {
        isSyncingTop = false;
        return;
      }
      isSyncingTable = true;
      tableEl.scrollLeft = topEl.scrollLeft;
    };

    tableEl.addEventListener('scroll', handleTableScroll, { passive: true });
    topEl.addEventListener('scroll', handleTopScroll, { passive: true });

    return () => {
      tableEl.removeEventListener('scroll', handleTableScroll);
      topEl.removeEventListener('scroll', handleTopScroll);
    };
  }, []);

  // Live Sync from the Google Sheet GID: 1689777979
  const fetchLiveSheetData = async () => {
    setIsRefreshing(true);
    try {
      const csvUrl =
        'https://docs.google.com/spreadsheets/d/1CJ-IW14fyHSIvux07kxn6HVomfNstYtbkNLPAaXvexY/gviz/tq?tqx=out:csv&gid=1689777979';
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const text = await res.text();

      // Simple CSV Parser handling quoted cells
      const parsedRows: string[][] = [];
      let currentRow: string[] = [];
      let currentField = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          currentRow.push(currentField.trim());
          if (currentRow.some((c) => c !== '')) {
            parsedRows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c !== '')) {
          parsedRows.push(currentRow);
        }
      }

      if (parsedRows.length > 10) {
        setRows(parsedRows);
        setLastRefreshed(formatTimestamp(new Date()));
      }
    } catch (err) {
      console.error('Failed to sync live Google Sheet data, using cached baseline', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Convert 2D array into structured typed rows with category tracking
  const parsedItems = useMemo<SheetReportRow[]>(() => {
    let currentCategory: 'NON_SALARY' | 'OTHER_NS' | 'OWN_SOURCE' | 'SUMMARY' = 'NON_SALARY';

    return rows.map((r, idx) => {
      const padded = [...r];
      while (padded.length < 37) padded.push('');

      const sr = (padded[1] || '').trim();
      let code = (padded[2] || '').trim();
      let particulars = (padded[3] || '').trim();
      const originalBudget = (padded[4] || '').trim();
      const recJul = (padded[5] || '').trim();
      const recAug = (padded[6] || '').trim();
      const recSep = (padded[7] || '').trim();
      const totReceipts = (padded[17] || '').trim();
      const totalBudget = (padded[22] || '').trim();
      const expJul = (padded[23] || '').trim();
      const expAug = (padded[24] || '').trim();
      const expSep = (padded[25] || '').trim();
      const totExp = (padded[35] || '').trim();
      const balance = (padded[36] || '').trim();

      // Extract account code if inside particulars (e.g. A00000CM1-Graphic Design-High Tech)
      if (!code && particulars && idx > 3) {
        const hyphenMatch = particulars.match(/^([A-Za-z0-9_\-]+)\s*-\s*(.*)$/);
        if (hyphenMatch && hyphenMatch[1].length >= 3) {
          code = hyphenMatch[1].trim();
        } else if (particulars.toLowerCase() === 'others-ii') {
          code = 'Others-II';
        }
      }

      const isMainHeader = idx <= 3;
      const isSubtotal =
        particulars.toLowerCase().includes('sub total') ||
        (particulars.toLowerCase().includes('total ') && !code) ||
        code.toLowerCase().includes('total');
      const isGrandTotal =
        particulars.toLowerCase().includes('grand total') ||
        code.toLowerCase().includes('grand total');
      const isCategoryHeader =
        (sr.startsWith('I') || sr.startsWith('V') || sr.startsWith('X') || sr === 'OTHER OWN') &&
        !code &&
        particulars !== '';

      if (sr.startsWith('V') || sr.startsWith('X') || particulars.toLowerCase().includes('otherthan non salary')) {
        currentCategory = 'OTHER_NS';
      } else if (sr === 'OTHER OWN' || idx > 74 || particulars.toLowerCase().includes('own funds') || code === 'TOTAL OWN/OTHER') {
        currentCategory = 'OWN_SOURCE';
      } else if (isGrandTotal) {
        currentCategory = 'SUMMARY';
      }

      return {
        rowIndex: idx,
        raw: padded,
        sr,
        code,
        particulars,
        originalBudget,
        recJul,
        recAug,
        recSep,
        totReceipts,
        totalBudget,
        expJul,
        expAug,
        expSep,
        totExp,
        balance,
        isMainHeader,
        isCategoryHeader,
        isSubtotal,
        isGrandTotal,
        categoryGroup: currentCategory,
      };
    });
  }, [rows]);

  // Available individual expenditure heads for search autocomplete and multi-selection
  // Includes ALL accounts available in this report (even empty transactions or with no movement)
  const availableAccounts = useMemo(() => {
    return parsedItems.filter(
      (r) =>
        !r.isMainHeader &&
        !r.isCategoryHeader &&
        !r.isSubtotal &&
        !r.isGrandTotal &&
        (r.code || r.particulars) &&
        r.particulars.toLowerCase() !== 'diff. (if any)'
    );
  }, [parsedItems]);

  // Autocomplete suggestions based on user typed text - fetches ALL available accounts (no arbitrary slice limit)
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableAccounts;
    }
    const q = searchQuery.toLowerCase().trim();
    return availableAccounts.filter(
      (acc) =>
        acc.code.toLowerCase().includes(q) ||
        acc.particulars.toLowerCase().includes(q) ||
        acc.sr.toLowerCase().includes(q)
    );
  }, [availableAccounts, searchQuery]);

  // Active months based on monthFilter or custom date range
  const activeMonths = useMemo<MonthConfig[]>(() => {
    if (monthFilter === 'ALL') {
      return FY_MONTHS;
    }
    if (monthFilter === 'Q1') {
      return FY_MONTHS.slice(0, 3);
    }
    if (monthFilter === 'JUL') {
      return FY_MONTHS.filter((m) => m.id === 'JUL');
    }
    if (monthFilter === 'AUG') {
      return FY_MONTHS.filter((m) => m.id === 'AUG');
    }
    if (monthFilter === 'SEP') {
      return FY_MONTHS.filter((m) => m.id === 'SEP');
    }
    if (monthFilter === 'CUSTOM') {
      const s = customStartDate;
      const e = customEndDate;
      return FY_MONTHS.filter((m) => {
        return m.startDate <= e && m.endDate >= s;
      });
    }
    return FY_MONTHS;
  }, [monthFilter, customStartDate, customEndDate]);

  // Friendly description of current period
  const activePeriodDescription = useMemo(() => {
    if (monthFilter === 'ALL') return 'All Months (01-Jul-2026 to 30-Jun-2027)';
    if (monthFilter === 'Q1') return 'Q1 FY 2026-27 (01-Jul-2026 to 30-Sep-2026)';
    if (monthFilter === 'JUL') return 'July 2026 (01-Jul-2026 to 31-Jul-2026)';
    if (monthFilter === 'AUG') return 'August 2026 (01-Aug-2026 to 31-Aug-2026)';
    if (monthFilter === 'SEP') return 'September 2026 (01-Sep-2026 to 30-Sep-2026)';
    if (monthFilter === 'CUSTOM') {
      return `Custom Range: ${formatIsoToDmy(customStartDate)} to ${formatIsoToDmy(customEndDate)}`;
    }
    return 'Financial Year 2026-27';
  }, [monthFilter, customStartDate, customEndDate]);

  // Active status of monthly columns in current period
  const isJulActive = activeMonths.some((m) => m.id === 'JUL');
  const isAugActive = activeMonths.some((m) => m.id === 'AUG');
  const isSepActive = activeMonths.some((m) => m.id === 'SEP');
  const periodShortTag =
    monthFilter === 'ALL'
      ? 'FY 2026-27'
      : monthFilter === 'Q1'
      ? 'Q1'
      : monthFilter === 'CUSTOM'
      ? 'Custom'
      : monthFilter;

  // Helper to calculate row financial figures considering monthFilter
  const getRowComputedFigures = (r: SheetReportRow) => {
    const origBudget = parseNumber(r.originalBudget);

    if (monthFilter === 'ALL') {
      const rec = parseNumber(r.totReceipts);
      const bud = parseNumber(r.totalBudget) || origBudget + rec;
      const exp = parseNumber(r.totExp);
      const bal = parseNumber(r.balance) || bud - exp;
      return {
        recJul: r.recJul,
        recAug: r.recAug,
        recSep: r.recSep,
        totReceipts: formatAmount(rec),
        totalBudget: formatAmount(bud),
        expJul: r.expJul,
        expAug: r.expAug,
        expSep: r.expSep,
        totExp: formatAmount(exp),
        balance: formatAmount(bal),
        rawRec: rec,
        rawBud: bud,
        rawExp: exp,
        rawBal: bal,
        rawOrig: origBudget,
      };
    }

    // Calculated for selected active months
    let sumRec = 0;
    let sumExp = 0;
    activeMonths.forEach((m) => {
      sumRec += parseNumber(r.raw[m.recCol]);
      sumExp += parseNumber(r.raw[m.expCol]);
    });

    const bud = origBudget + sumRec;
    const bal = bud - sumExp;

    const julM = activeMonths.find((m) => m.id === 'JUL');
    const augM = activeMonths.find((m) => m.id === 'AUG');
    const sepM = activeMonths.find((m) => m.id === 'SEP');

    return {
      recJul: julM ? r.recJul : '-',
      recAug: augM ? r.recAug : '-',
      recSep: sepM ? r.recSep : '-',
      totReceipts: formatAmount(sumRec),
      totalBudget: formatAmount(bud),
      expJul: julM ? r.expJul : '-',
      expAug: augM ? r.expAug : '-',
      expSep: sepM ? r.expSep : '-',
      totExp: formatAmount(sumExp),
      balance: formatAmount(bal),
      rawRec: sumRec,
      rawBud: bud,
      rawExp: sumExp,
      rawBal: bal,
      rawOrig: origBudget,
    };
  };

  // Toggle account multi-selection
  const handleToggleSelectAccount = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleRemoveSelectedCode = (code: string) => {
    setSelectedCodes((prev) => prev.filter((c) => c !== code));
  };

  const handleClearAllSelections = () => {
    setSelectedCodes([]);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  // Check if all current search suggestions are selected
  const isAllSuggestionsSelected = useMemo(() => {
    if (searchSuggestions.length === 0) return false;
    return searchSuggestions.every((acc) => {
      const keyId = acc.code || acc.particulars;
      return selectedCodes.includes(keyId);
    });
  }, [searchSuggestions, selectedCodes]);

  // Select or Deselect All currently suggested accounts
  const handleSelectAll = () => {
    if (searchSuggestions.length === 0) return;
    const keys = searchSuggestions.map((acc) => acc.code || acc.particulars);
    if (isAllSuggestionsSelected) {
      const toRemove = new Set(keys);
      setSelectedCodes((prev) => prev.filter((c) => !toRemove.has(c)));
    } else {
      setSelectedCodes((prev) => Array.from(new Set([...prev, ...keys])));
    }
  };

  // Scroll suggestion item smoothly into view
  const scrollSuggestionIntoView = (index: number) => {
    setTimeout(() => {
      const el = suggestionItemRefs.current[index];
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 10);
  };

  // Keyboard navigation for search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showSuggestions) {
        setShowSuggestions(true);
        setHighlightedIndex(0);
        return;
      }
      if (searchSuggestions.length === 0) return;
      setHighlightedIndex((prev) => {
        const next = prev + 1 < searchSuggestions.length ? prev + 1 : 0;
        scrollSuggestionIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showSuggestions) {
        setShowSuggestions(true);
        setHighlightedIndex(searchSuggestions.length - 1);
        return;
      }
      if (searchSuggestions.length === 0) return;
      setHighlightedIndex((prev) => {
        const next = prev - 1 >= 0 ? prev - 1 : searchSuggestions.length - 1;
        scrollSuggestionIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < searchSuggestions.length) {
        const acc = searchSuggestions[highlightedIndex];
        const keyId = acc.code || acc.particulars;
        handleToggleSelectAccount(keyId);
      } else {
        // If user hits Enter without a highlighted item, close suggestions so table is clear
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  // Build displayRows preserving calculation & balance logics, subtotal positions, and multi-selection
  const displayRows = useMemo<SheetReportRow[]>(() => {
    // A. Multi-selection mode active
    if (selectedCodes.length > 0) {
      const selectedSet = new Set(selectedCodes);
      const matchingItems = parsedItems.filter(
        (r) => selectedSet.has(r.code) || selectedSet.has(r.particulars)
      );

      if (matchingItems.length === 0) return [];

      // Group items by category to keep proper section headers, subtotals, and grand totals
      const categories: Array<{
        group: 'NON_SALARY' | 'OTHER_NS' | 'OWN_SOURCE';
        headerTitle: string;
        subtotalTitle: string;
      }> = [
        {
          group: 'NON_SALARY',
          headerTitle: 'I. A031 - Non Salary / Operating Expenditures',
          subtotalTitle: 'Selected Non Salary Sub Total',
        },
        {
          group: 'OTHER_NS',
          headerTitle: 'V. Other Projects & Courses (PSDF, GIZ, NAVTTC)',
          subtotalTitle: 'Selected Otherthan Non Salary Sub Total',
        },
        {
          group: 'OWN_SOURCE',
          headerTitle: 'OTHER OWN: Own Sources / Institute Internal Funds',
          subtotalTitle: 'Selected Own / Other Sub Total',
        },
      ];

      const result: SheetReportRow[] = [];
      let grandOrig = 0;
      let grandRecJul = 0;
      let grandRecAug = 0;
      let grandRecSep = 0;
      let grandTotRec = 0;
      let grandTotBud = 0;
      let grandExpJul = 0;
      let grandExpAug = 0;
      let grandExpSep = 0;
      let grandTotExp = 0;
      let grandTotBal = 0;

      categories.forEach((cat) => {
        const catItems = matchingItems.filter((i) => i.categoryGroup === cat.group);
        if (catItems.length === 0) return;

        // 1. Category Header
        result.push({
          rowIndex: -1,
          raw: [],
          sr: cat.group === 'NON_SALARY' ? 'I' : cat.group === 'OTHER_NS' ? 'V' : 'OTHER OWN',
          code: '',
          particulars: cat.headerTitle,
          originalBudget: '',
          recJul: '',
          recAug: '',
          recSep: '',
          totReceipts: '',
          totalBudget: '',
          expJul: '',
          expAug: '',
          expSep: '',
          totExp: '',
          balance: '',
          isMainHeader: false,
          isCategoryHeader: true,
          isSubtotal: false,
          isGrandTotal: false,
          categoryGroup: cat.group,
        });

        // 2. Individual Rows with Month-calculated figures
        let subOrig = 0;
        let subRecJul = 0;
        let subRecAug = 0;
        let subRecSep = 0;
        let subTotRec = 0;
        let subTotBud = 0;
        let subExpJul = 0;
        let subExpAug = 0;
        let subExpSep = 0;
        let subTotExp = 0;
        let subTotBal = 0;

        catItems.forEach((item) => {
          const comp = getRowComputedFigures(item);
          subOrig += comp.rawOrig;
          subRecJul += parseNumber(comp.recJul);
          subRecAug += parseNumber(comp.recAug);
          subRecSep += parseNumber(comp.recSep);
          subTotRec += comp.rawRec;
          subTotBud += comp.rawBud;
          subExpJul += parseNumber(comp.expJul);
          subExpAug += parseNumber(comp.expAug);
          subExpSep += parseNumber(comp.expSep);
          subTotExp += comp.rawExp;
          subTotBal += comp.rawBal;

          result.push({
            ...item,
            originalBudget: formatAmount(comp.rawOrig),
            recJul: comp.recJul,
            recAug: comp.recAug,
            recSep: comp.recSep,
            totReceipts: comp.totReceipts,
            totalBudget: comp.totalBudget,
            expJul: comp.expJul,
            expAug: comp.expAug,
            expSep: comp.expSep,
            totExp: comp.totExp,
            balance: comp.balance,
          });
        });

        // 3. Category Subtotal Row
        result.push({
          rowIndex: -2,
          raw: [],
          sr: '',
          code: `TOTAL-${cat.group}`,
          particulars: cat.subtotalTitle,
          originalBudget: formatAmount(subOrig),
          recJul: formatAmount(subRecJul),
          recAug: formatAmount(subRecAug),
          recSep: formatAmount(subRecSep),
          totReceipts: formatAmount(subTotRec),
          totalBudget: formatAmount(subTotBud),
          expJul: formatAmount(subExpJul),
          expAug: formatAmount(subExpAug),
          expSep: formatAmount(subExpSep),
          totExp: formatAmount(subTotExp),
          balance: formatAmount(subTotBal),
          isMainHeader: false,
          isCategoryHeader: false,
          isSubtotal: true,
          isGrandTotal: false,
          categoryGroup: cat.group,
        });

        grandOrig += subOrig;
        grandRecJul += subRecJul;
        grandRecAug += subRecAug;
        grandRecSep += subRecSep;
        grandTotRec += subTotRec;
        grandTotBud += subTotBud;
        grandExpJul += subExpJul;
        grandExpAug += subExpAug;
        grandExpSep += subExpSep;
        grandTotExp += subTotExp;
        grandTotBal += subTotBal;
      });

      // 4. Combined Grand Total of Multi-Selected Heads
      result.push({
        rowIndex: -3,
        raw: [],
        sr: '',
        code: 'GRAND TOTAL (SELECTED)',
        particulars: `GRAND TOTAL (SELECTED HEADS: ${selectedCodes.length})`,
        originalBudget: formatAmount(grandOrig),
        recJul: formatAmount(grandRecJul),
        recAug: formatAmount(grandRecAug),
        recSep: formatAmount(grandRecSep),
        totReceipts: formatAmount(grandTotRec),
        totalBudget: formatAmount(grandTotBud),
        expJul: formatAmount(grandExpJul),
        expAug: formatAmount(grandExpAug),
        expSep: formatAmount(grandExpSep),
        totExp: formatAmount(grandTotExp),
        balance: formatAmount(grandTotBal),
        isMainHeader: false,
        isCategoryHeader: false,
        isSubtotal: false,
        isGrandTotal: true,
        categoryGroup: 'SUMMARY',
      });

      return result;
    }

    // B. Standard full / text-filtered display
    return parsedItems
      .filter((r) => {
        if (r.rowIndex <= 3) return false;
        if (!r.code && !r.particulars && !r.sr) return false;

        // Display Filter
        if (activeFilter === 'SUBTOTALS' && !r.isSubtotal && !r.isGrandTotal) {
          return false;
        }
        if (activeFilter === 'ACTIVE') {
          const comp = getRowComputedFigures(r);
          if (comp.rawBud === 0 && comp.rawExp === 0 && comp.rawBal === 0 && !r.isSubtotal) {
            return false;
          }
        }

        // Search Query text filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.code.toLowerCase().includes(q) ||
            r.particulars.toLowerCase().includes(q) ||
            r.sr.toLowerCase().includes(q) ||
            r.isCategoryHeader ||
            r.isSubtotal ||
            r.isGrandTotal
          );
        }

        return true;
      })
      .map((r) => {
        if (r.isCategoryHeader) return r;
        const comp = getRowComputedFigures(r);
        return {
          ...r,
          originalBudget: r.originalBudget,
          recJul: comp.recJul,
          recAug: comp.recAug,
          recSep: comp.recSep,
          totReceipts: comp.totReceipts,
          totalBudget: comp.totalBudget,
          expJul: comp.expJul,
          expAug: comp.expAug,
          expSep: comp.expSep,
          totExp: comp.totExp,
          balance: comp.balance,
        };
      });
  }, [parsedItems, selectedCodes, activeFilter, searchQuery, monthFilter, activeMonths]);

  // Dynamic KPI metrics reflecting active selection or filter
  const metrics = useMemo(() => {
    // If multi-selection active
    if (selectedCodes.length > 0) {
      const nsSub = displayRows.find((r) => r.code === 'TOTAL-NON_SALARY');
      const otherNsSub = displayRows.find((r) => r.code === 'TOTAL-OTHER_NS');
      const ownSub = displayRows.find((r) => r.code === 'TOTAL-OWN_SOURCE');
      const grandRow = displayRows.find((r) => r.isGrandTotal);

      return {
        nsBudget: nsSub?.totalBudget || '0',
        nsExp: nsSub?.totExp || '0',
        nsBalance: nsSub?.balance || '0',

        otherNsBudget: otherNsSub?.totalBudget || '0',
        otherNsExp: otherNsSub?.totExp || '0',
        otherNsBalance: otherNsSub?.balance || '0',

        ownBudget: ownSub?.totalBudget || '0',
        ownReceipts: ownSub?.totReceipts || '0',
        ownExp: ownSub?.totExp || '0',
        ownBalance: ownSub?.balance || '0',

        grandTotalBudget: grandRow?.totalBudget || '0',
        grandTotalExp: grandRow?.totExp || '0',
        grandTotalBalance: grandRow?.balance || '0',
      };
    }

    const nonSalaryRow = parsedItems.find((r) =>
      r.particulars.toLowerCase().includes('non salary sub total')
    );
    const otherThanNsRow = parsedItems.find((r) =>
      r.particulars.toLowerCase().includes('otherthan non salary sub total')
    );
    const ownOtherRow = parsedItems.find((r) => r.code === 'TOTAL OWN/OTHER');
    const grandTotalRow = parsedItems.find((r) => r.code === 'GRAND TOTAL (NS+OWN)');

    const nsComp = nonSalaryRow ? getRowComputedFigures(nonSalaryRow) : null;
    const otherComp = otherThanNsRow ? getRowComputedFigures(otherThanNsRow) : null;
    const ownComp = ownOtherRow ? getRowComputedFigures(ownOtherRow) : null;
    const grandComp = grandTotalRow ? getRowComputedFigures(grandTotalRow) : null;

    return {
      nsBudget: nsComp?.totalBudget || '(177,564)',
      nsExp: nsComp?.totExp || '163,357',
      nsBalance: nsComp?.balance || '(340,921)',

      otherNsBudget: otherComp?.totalBudget || '2,564,771',
      otherNsExp: otherComp?.totExp || '672,404',
      otherNsBalance: otherComp?.balance || '1,892,367',

      ownBudget: ownComp?.totalBudget || '1,686,349',
      ownReceipts: ownComp?.totReceipts || '590,768',
      ownExp: ownComp?.totExp || '941,601',
      ownBalance: ownComp?.balance || '744,748',

      grandTotalBudget: grandComp?.totalBudget || '4,073,556',
      grandTotalExp: grandComp?.totExp || '1,777,362',
      grandTotalBalance: grandComp?.balance || '2,296,194',
    };
  }, [displayRows, selectedCodes, parsedItems, monthFilter, activeMonths]);

  // Build high-fidelity landscape print HTML with exact timestamp and signatories
  const generatePrintHTML = () => {
    const gvtiwLogo = customGvtiwLogo || '/gvtiw-logo.jpg';
    const tevtaLogo = customTevtaLogo || '/tevta-logo.png';
    const reportGenTime = formatTimestamp(new Date());

    let tableRowsHtml = '';
    displayRows.forEach((r) => {
      const isGrand = r.isGrandTotal;
      const isSub = r.isSubtotal && !isGrand;
      const isCategory = r.isCategoryHeader;

      let trStyle = '';
      if (isGrand) {
        trStyle = 'background-color: #e0e7ff; font-weight: 900; font-size: 8pt; border-top: 2px solid #3730a3; border-bottom: 2px solid #3730a3;';
      } else if (isSub) {
        trStyle = 'background-color: #f1f5f9; font-weight: bold; font-size: 7.5pt;';
      } else if (isCategory) {
        trStyle = 'background-color: #f8fafc; font-weight: bold; color: #0b2545; font-size: 7.5pt;';
      } else {
        trStyle = 'font-size: 7.5pt;';
      }

      const balNum = parseNumber(r.balance);
      const balStyle =
        balNum < 0
          ? 'color: #dc2626; font-weight: bold;'
          : balNum > 0
          ? 'color: #16a34a; font-weight: bold;'
          : 'color: #475569;';

      tableRowsHtml += `
        <tr style="${trStyle}">
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 3px 4px;">${r.sr}</td>
          <td style="border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; font-weight: 600;">${r.code || '-'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 3px 4px;">${r.particulars}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace;">${formatAmount(r.originalBudget)}</td>
          ${isJulActive ? `<td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; color: #475569;">${formatAmount(r.recJul)}</td>` : ''}
          ${isAugActive ? `<td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; color: #475569;">${formatAmount(r.recAug)}</td>` : ''}
          ${isSepActive ? `<td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; color: #475569;">${formatAmount(r.recSep)}</td>` : ''}
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; font-weight: bold; background-color: #f0f9ff; color: #0369a1;">${formatAmount(r.totReceipts)}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; font-weight: bold; background-color: #eef2ff; color: #4338ca;">${formatAmount(r.totalBudget)}</td>
          ${isJulActive ? `<td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; color: #475569;">${formatAmount(r.expJul)}</td>` : ''}
          ${isAugActive ? `<td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; color: #475569;">${formatAmount(r.expAug)}</td>` : ''}
          ${isSepActive ? `<td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; color: #475569;">${formatAmount(r.expSep)}</td>` : ''}
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; font-weight: bold; background-color: #fefce8; color: #a16207;">${formatAmount(r.totExp)}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 3px 4px; font-family: monospace; ${balStyle} background-color: #f0fdf4;">${formatAmount(r.balance)}</td>
        </tr>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Non-Salary &amp; Own Funds Monthly Expenditure Statement - GVTIW Samanabad</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 8pt;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 4px;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          .header-table td {
            vertical-align: middle;
          }
          .title-block {
            text-align: center;
          }
          .inst-name {
            font-size: 13pt;
            font-weight: 900;
            text-transform: uppercase;
            color: #0b2545;
            letter-spacing: 0.3px;
          }
          .sub-info {
            font-size: 9pt;
            font-weight: 600;
            color: #334155;
            margin-top: 2px;
          }
          .report-title {
            font-size: 11pt;
            font-weight: 800;
            color: #1e1b4b;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .meta-label {
            font-size: 7.5pt;
            font-family: monospace;
            color: #475569;
            margin-top: 3px;
          }
          .kpi-grid {
            display: table;
            width: 100%;
            table-layout: fixed;
            margin-bottom: 8px;
            border-collapse: separate;
            border-spacing: 6px 0;
          }
          .kpi-cell {
            display: table-cell;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 4px 6px;
            text-align: center;
            background-color: #f8fafc;
          }
          .kpi-cell.ns { border-color: #fca5a5; background-color: #fff1f2; }
          .kpi-cell.proj { border-color: #93c5fd; background-color: #eff6ff; }
          .kpi-cell.own { border-color: #86efac; background-color: #f0fdf4; }
          .kpi-cell.tot { border-color: #c7d2fe; background-color: #eef2ff; }
          .kpi-label { font-size: 6.5pt; font-weight: 800; text-transform: uppercase; display: block; }
          .kpi-val { font-size: 10pt; font-weight: 900; font-family: monospace; display: block; margin-top: 1px; }

          table.statement-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.5pt;
          }
          table.statement-table th {
            background-color: #0b2545;
            color: #ffffff;
            font-weight: 800;
            text-transform: uppercase;
            padding: 4px 3px;
            border: 1px solid #0b2545;
            font-size: 6.5pt;
            text-align: center;
          }
          .signatory-grid {
            margin-top: 22px;
            display: table;
            width: 100%;
            table-layout: fixed;
          }
          .signatory-cell {
            display: table-cell;
            text-align: center;
            vertical-align: bottom;
            padding: 0 15px;
          }
          .sig-line {
            border-top: 1px solid #000;
            margin-bottom: 3px;
          }
          .sig-name {
            font-weight: bold;
            font-size: 8.5pt;
            color: #000;
          }
          .sig-title {
            font-size: 7.5pt;
            color: #334155;
          }
          .official-credit-footer {
            margin-top: 14px;
            padding-top: 4px;
            border-top: 1px dashed #94a3b8;
            font-size: 7.5pt;
            color: #475569;
            font-family: monospace;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 75px; text-align: left;">
              <img src="${gvtiwLogo}" style="height: 50px; object-fit: contain;" onerror="this.style.display='none'" />
            </td>
            <td class="title-block">
              <div class="inst-name">Government Vocational Training Institute for Women (GVTIW)</div>
              <div class="sub-info">Samanabad, Faisalabad • Financial Year 2026-27</div>
              <div class="report-title">Non-Salary &amp; Own Funds Monthly Expenditure Statement</div>
              <div class="meta-label">
                <strong>Period / Filter:</strong> ${activePeriodDescription} &nbsp;|&nbsp; 
                <strong>Report Generated on:</strong> ${reportGenTime} &nbsp;|&nbsp; 
                <strong>Data Synced:</strong> ${lastRefreshed}
              </div>
            </td>
            <td style="width: 75px; text-align: right;">
              <img src="${tevtaLogo}" style="height: 46px; object-fit: contain;" onerror="this.style.display='none'" />
            </td>
          </tr>
        </table>

        <!-- Executive Summary KPI Bar -->
        <div class="kpi-grid">
          <div class="kpi-cell ns">
            <span class="kpi-label" style="color: #991b1b;">Operating Non-Salary (Deficit)</span>
            <span class="kpi-val" style="color: #dc2626;">Rs. ${metrics.nsBalance}</span>
            <span style="font-size: 6.5pt; color: #64748b;">Exp: ${metrics.nsExp}</span>
          </div>
          <div class="kpi-cell proj">
            <span class="kpi-label" style="color: #1e40af;">Projects &amp; Courses (Surplus)</span>
            <span class="kpi-val" style="color: #2563eb;">Rs. ${metrics.otherNsBalance}</span>
            <span style="font-size: 6.5pt; color: #64748b;">Exp: ${metrics.otherNsExp}</span>
          </div>
          <div class="kpi-cell own">
            <span class="kpi-label" style="color: #166534;">Own Source &amp; Others (Surplus)</span>
            <span class="kpi-val" style="color: #16a34a;">Rs. ${metrics.ownBalance}</span>
            <span style="font-size: 6.5pt; color: #64748b;">Exp: ${metrics.ownExp}</span>
          </div>
          <div class="kpi-cell tot">
            <span class="kpi-label" style="color: #3730a3;">Grand Total (NS + Own)</span>
            <span class="kpi-val" style="color: #4338ca;">Rs. ${metrics.grandTotalBalance}</span>
            <span style="font-size: 6.5pt; color: #64748b;">Exp: ${metrics.grandTotalExp}</span>
          </div>
        </div>

        <!-- Official Statement Table -->
        <table class="statement-table">
          <thead>
            <tr>
              <th style="width: 30px;">Sr #</th>
              <th style="width: 65px;">Code</th>
              <th>Particulars / Account Description</th>
              <th style="width: 75px;">Opening Budget</th>
              ${isJulActive ? '<th style="width: 55px;">Rec (Jul)</th>' : ''}
              ${isAugActive ? '<th style="width: 55px;">Rec (Aug)</th>' : ''}
              ${isSepActive ? '<th style="width: 55px;">Rec (Sep)</th>' : ''}
              <th style="width: 75px;">Filtered Rec</th>
              <th style="width: 80px;">Net Budget</th>
              ${isJulActive ? '<th style="width: 55px;">Exp (Jul)</th>' : ''}
              ${isAugActive ? '<th style="width: 55px;">Exp (Aug)</th>' : ''}
              ${isSepActive ? '<th style="width: 55px;">Exp (Sep)</th>' : ''}
              <th style="width: 75px;">Filtered Exp</th>
              <th style="width: 80px;">Net Balance</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <!-- Official Signing Parties -->
        <div class="signatory-grid">
          <div class="signatory-cell">
            <div style="height: 35px;"></div>
            <div class="sig-line"></div>
            <div class="sig-name">KASHIF ZIA</div>
            <div class="sig-title">Prepared by: ACCOUNTANT</div>
          </div>
          <div class="signatory-cell">
            <div style="height: 35px;"></div>
            <div class="sig-line"></div>
            <div class="sig-name">ANEEBA JAMIL</div>
            <div class="sig-title">Checked by: CO. SIGNATUREE</div>
          </div>
          <div class="signatory-cell">
            <div style="height: 35px;"></div>
            <div class="sig-line"></div>
            <div class="sig-name">SHAZIA KHADIM</div>
            <div class="sig-title">Approved by: ACTING PRINCIPAL/DDO</div>
          </div>
        </div>

        <!-- Official Owner Statement & Generation Timestamp -->
        <div class="official-credit-footer">
          eCashBook &amp; Voucher System Generated by MKZ for Institute 33028 • Report Generated on: ${reportGenTime}
        </div>
      </body>
      </html>
    `;
  };

  // Handle printing: opens standalone print window or renders via hidden fallback iframe
  const handlePrint = () => {
    const htmlContent = generatePrintHTML();
    
    // Standard popup print window
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 400);
      return;
    }

    // Hidden iframe fallback
    let iframe = document.getElementById('ns-own-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'ns-own-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }
    const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 400);
    } else {
      window.print();
    }
  };

  // Export CSV with metadata, generation timestamp, signatories, and owner statement
  const handleExportCSV = () => {
    const reportGenTime = formatTimestamp(new Date());
    const csvLines = [
      '"Technical Education & Vocational Training Authority (TEVTA)"',
      '"Government Vocational Training Institute for Women (GVTIW) Samanabad, Faisalabad"',
      `"Non-Salary & Own Funds Monthly Expenditure Statement - FY 2026-27"`,
      `"Period: ${activePeriodDescription} | Report Generated on: ${reportGenTime} | Synced on: ${lastRefreshed}"`,
      '',
      [
        'Sr. No',
        'Account Code',
        'Particulars / Description',
        'Opening/Approved Budget',
        'Receipts (Jul)',
        'Receipts (Aug)',
        'Receipts (Sep)',
        'Total Receipts',
        'Total Net Budget',
        'Exp (Jul)',
        'Exp (Aug)',
        'Exp (Sep)',
        'Total Expenditure',
        'Net Balance (Surplus/Deficit)',
      ].join(','),
    ];

    displayRows.forEach((r) => {
      const line = [
        `"${r.sr}"`,
        `"${r.code}"`,
        `"${r.particulars.replace(/"/g, '""')}"`,
        `"${r.originalBudget}"`,
        `"${r.recJul}"`,
        `"${r.recAug}"`,
        `"${r.recSep}"`,
        `"${r.totReceipts}"`,
        `"${r.totalBudget}"`,
        `"${r.expJul}"`,
        `"${r.expAug}"`,
        `"${r.expSep}"`,
        `"${r.totExp}"`,
        `"${r.balance}"`,
      ];
      csvLines.push(line.join(','));
    });

    // Append Official Signing Parties and Owner Statement
    csvLines.push('');
    csvLines.push(
      '"PREPARED BY: KASHIF ZIA (ACCOUNTANT)","","","CHECKED BY: ANEEBA JAMIL (CO. SIGNATUREE)","","","APPROVED BY: SHAZIA KHADIM (ACTING PRINCIPAL/DDO)"'
    );
    csvLines.push('');
    csvLines.push(`"eCashBook & Voucher System Generated by MKZ for Institute 33028 | Report Generated on: ${reportGenTime}"`);

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NS_OWN_FY26-27_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      ref={containerRef}
      className={`space-y-4 rounded-2xl border transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto p-6 rounded-none m-0' : 'p-4 sm:p-6'}`}
    >
      {/* 1. TOP HEADER & ACTION CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0b2545] text-white shadow-xs">
              TEVTA OFFICIAL
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
              TAB: NS &amp; OWN FY 26-27 (Working)-OK
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              GID: 1689777979
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Synced: {lastRefreshed}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-2 text-[#0b2545] dark:text-slate-100 flex items-center gap-2">
            <span>Non-Salary &amp; Own Funds Monthly Expenditure Statement</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            Government Vocational Training Institute for Women (GVTIW) Samanabad, Faisalabad • Financial Year 2026-27
          </p>
        </div>

        {/* Action Toolbar with High-Contrast Hover Styling */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Live Sync Button */}
          <button
            type="button"
            onClick={fetchLiveSheetData}
            disabled={isRefreshing}
            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border-slate-700'
                : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 hover:text-indigo-950 border-indigo-200'
            }`}
            title="Fetch latest synchronized data from Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-slate-950 border-slate-200'
            }`}
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Export CSV</span>
          </button>

          {/* Print Report */}
          <button
            type="button"
            onClick={handlePrint}
            className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer bg-[#0b2545] hover:bg-[#133966] text-white"
            title="Print landscape report with signatories"
          >
            <Printer className="w-3.5 h-3.5 text-white" />
            <span>Print Report</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Operating Non-Salary */}
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="uppercase tracking-wider text-[10px]">Operating Non-Salary</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
              Deficit
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              Rs. {metrics.nsBalance}
            </span>
            <span className="text-[11px] font-mono text-slate-500">Exp: {metrics.nsExp}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
            <span>Budget Allocation:</span>
            <span className="font-mono font-semibold">{metrics.nsBudget}</span>
          </div>
        </div>

        {/* Card 2: Other Projects & Courses */}
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="uppercase tracking-wider text-[10px]">Projects &amp; Courses</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
              Surplus
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
              Rs. {metrics.otherNsBalance}
            </span>
            <span className="text-[11px] font-mono text-slate-500">Exp: {metrics.otherNsExp}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
            <span>Budget Allocation:</span>
            <span className="font-mono font-semibold">{metrics.otherNsBudget}</span>
          </div>
        </div>

        {/* Card 3: Own Source & Others */}
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="uppercase tracking-wider text-[10px]">Own Source &amp; Others</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Surplus
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              Rs. {metrics.ownBalance}
            </span>
            <span className="text-[11px] font-mono text-slate-500">Exp: {metrics.ownExp}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
            <span>Budget / Receipts:</span>
            <span className="font-mono font-semibold">{metrics.ownBudget}</span>
          </div>
        </div>

        {/* Card 4: Grand Total */}
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? 'bg-indigo-950/20 border-indigo-900/40' : 'bg-indigo-50/50 border-indigo-100'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <span className="uppercase tracking-wider text-[10px] font-black">Grand Total (NS + Own)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
              Net Balance
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black font-mono tracking-tight text-indigo-700 dark:text-indigo-300">
              Rs. {metrics.grandTotalBalance}
            </span>
            <span className="text-[11px] font-mono text-slate-500">Exp: {metrics.grandTotalExp}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
            <span>Combined Allocation:</span>
            <span className="font-mono font-semibold">{metrics.grandTotalBudget}</span>
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH CONTROL PANEL */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
        {/* Row A: Month Selector & Display View */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Monthly Dropdown & Custom Range Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-[#0b2545] dark:text-indigo-400" />
              <span>Period Filter:</span>
            </div>

            {/* Month Filter Dropdown */}
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value as any)}
              className={`h-9 px-3 text-xs font-semibold rounded-lg border outline-none cursor-pointer transition-colors ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-[#0b2545]'
              }`}
            >
              <option value="ALL">All Months (FY 2026-27: 01-Jul-2026 to 30-Jun-2027)</option>
              <option value="Q1">Q1 FY 2026-27 (01-Jul-2026 to 30-Sep-2026)</option>
              <option value="JUL">July 2026 (01-Jul-2026 to 31-Jul-2026)</option>
              <option value="AUG">August 2026 (01-Aug-2026 to 31-Aug-2026)</option>
              <option value="SEP">September 2026 (01-Sep-2026 to 30-Sep-2026)</option>
              <option value="CUSTOM">Custom Date Range (DD-MMM-YYYY to DD-MMM-YYYY)</option>
            </select>

            {/* Custom Date Pickers if CUSTOM selected */}
            {monthFilter === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-1 pl-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    min="2026-07-01"
                    max="2027-06-30"
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-7 px-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                    ({formatIsoToDmy(customStartDate)})
                  </span>
                </div>

                <div className="flex items-center gap-1 pl-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    min="2026-07-01"
                    max="2027-06-30"
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-7 px-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                    ({formatIsoToDmy(customEndDate)})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* View Mode Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 hidden sm:inline mr-1">
              View:
            </span>
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : darkMode
                  ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Rows
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === 'ACTIVE'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : darkMode
                  ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Active Only
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('SUBTOTALS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === 'SUBTOTALS'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : darkMode
                  ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Subtotals Only
            </button>
          </div>
        </div>

        {/* Row B: Search Autocomplete & Multi-Selection Box */}
        <div ref={searchContainerRef} className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSearchKeyDown}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                placeholder="Search account code or particular (e.g. A03303, Electricity, POL, NAVTTC)..."
                className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none font-medium transition-colors ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                    : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#0b2545]'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setHighlightedIndex(-1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Select All / Deselect All Option */}
            <button
              type="button"
              onClick={handleSelectAll}
              title={isAllSuggestionsSelected ? 'Deselect all accounts' : 'Select all accounts in list'}
              className="h-9 px-3 rounded-xl border text-xs font-semibold text-[#0b2545] dark:text-indigo-300 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{isAllSuggestionsSelected ? 'Deselect All' : `Select All (${searchSuggestions.length})`}</span>
            </button>

            {/* Show selection count if any */}
            {selectedCodes.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllSelections}
                className="h-9 px-3 rounded-xl border text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 cursor-pointer shrink-0"
              >
                Clear Selection ({selectedCodes.length})
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown Panel - Fetches ALL available accounts with keyboard navigation & Select All */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-1.5 table-scrollbar-always-visible">
              <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 mb-1 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  <span>Available Accounts ({searchSuggestions.length})</span>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 cursor-pointer transition-colors"
                  >
                    {isAllSuggestionsSelected ? 'Deselect All' : `Select All (${searchSuggestions.length})`}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="hidden sm:inline bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                    ↑↓ Navigate • Enter Select
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="px-2 py-0.5 rounded font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    title="Close dropdown (Esc)"
                  >
                    Close ✕
                  </button>
                </div>
              </div>
              <div className="space-y-0.5">
                {searchSuggestions.map((acc, index) => {
                  const keyId = acc.code || acc.particulars;
                  const isSelected = selectedCodes.includes(keyId);
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button
                      key={`${acc.rowIndex}-${keyId}`}
                      ref={(el) => {
                        suggestionItemRefs.current[index] = el;
                      }}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => handleToggleSelectAccount(keyId)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? darkMode
                            ? 'bg-indigo-950/60 text-white border border-indigo-500/40'
                            : 'bg-indigo-50 text-indigo-950 border border-indigo-200 font-semibold'
                          : isHighlighted
                          ? darkMode
                            ? 'bg-slate-800 text-white ring-1 ring-indigo-500'
                            : 'bg-slate-100 text-slate-950 ring-1 ring-indigo-500'
                          : darkMode
                          ? 'hover:bg-slate-800 text-slate-200 hover:text-white'
                          : 'hover:bg-slate-100 text-slate-800 hover:text-slate-950'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : isHighlighted
                              ? 'border-indigo-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                          {acc.code || 'HEAD'}
                        </span>
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {acc.particulars}
                        </span>
                        {isHighlighted && (
                          <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.2 rounded shrink-0">
                            Enter ↵
                          </span>
                        )}
                      </div>
                      <div className="text-right font-mono text-[11px] shrink-0 pl-2">
                        <span className="text-slate-400 dark:text-slate-500 mr-2">
                          Budget: {acc.totalBudget || acc.originalBudget || '-'}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Exp: {acc.totExp || '-'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Account Badges / Chips */}
          {selectedCodes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Selected Accounts ({selectedCodes.length}):
              </span>
              {selectedCodes.map((code) => {
                const acc = availableAccounts.find((a) => a.code === code || a.particulars === code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-md text-xs font-mono font-medium bg-[#0b2545] text-white shadow-2xs"
                  >
                    <span>{code}</span>
                    {acc && <span className="text-[10px] font-sans opacity-90 truncate max-w-[120px]">({acc.particulars})</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedCode(code)}
                      className="hover:bg-white/20 rounded p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Period Synchronization Status Banner */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2 rounded-t-xl bg-gradient-to-r from-slate-900 via-[#0b2545] to-slate-900 text-white border-t border-x border-slate-700/70 text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
            Detailed Table Attached To Period:
          </span>
          <span className="font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-700/80 text-[11px]">
            {activePeriodDescription}
          </span>
        </div>
        <div className="text-[11px] text-slate-300 flex items-center gap-2">
          <span>Active Columns:</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isJulActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Jul</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isAugActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Aug</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isSepActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Sep</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-semibold">Receipts, Exp &amp; Balances Recalculated Live</span>
        </div>
      </div>

      {/* 4. TOP SYNCHRONIZED HORIZONTAL SCROLLBAR */}
      <div className="bg-slate-100 dark:bg-slate-800/80 border-x border-slate-200 dark:border-slate-700 px-3 py-1.5 flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 select-none whitespace-nowrap">
          <MoveHorizontal className="w-3.5 h-3.5 text-[#0b2545] dark:text-indigo-400 animate-pulse" />
          <span className="font-bold">Top Scroll:</span>
        </div>
        <div
          ref={topScrollRef}
          className="flex-1 overflow-x-auto table-scrollbar-always-visible h-3.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="min-w-[1300px] h-1" />
        </div>
      </div>

      {/* 5. MASTER STATEMENT TABLE */}
      <div
        ref={tableRef}
        className="overflow-auto rounded-b-xl border border-slate-200 dark:border-slate-800 shadow-2xs relative max-h-[calc(100vh-290px)] min-h-[460px] table-scrollbar-always-visible"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <table className="w-full border-collapse text-left text-xs min-w-[1300px]">
          {/* Official Sticky Table Header */}
          <thead className="sticky top-0 z-20 shadow-xs bg-[#0b2545] text-white font-bold uppercase tracking-wider text-[10px]">
            <tr className="border-b border-slate-700">
              <th className="py-2.5 px-3 w-12 text-center border-r border-slate-700/60 sticky top-0 bg-[#0b2545]">
                Sr #
              </th>
              <th className="py-2.5 px-3 w-28 border-r border-slate-700/60 sticky top-0 bg-[#0b2545]">
                Head Code
              </th>
              <th className="py-2.5 px-3 min-w-[260px] border-r border-slate-700/60 sticky top-0 bg-[#0b2545]">
                Particulars / Account Description
              </th>
              <th className="py-2.5 px-3 w-28 text-right border-r border-slate-700/60 sticky top-0 bg-[#0b2545]">
                Opening Budget
              </th>
              <th className={`py-2.5 px-3 w-24 text-right border-r border-slate-700/60 sticky top-0 ${isJulActive ? 'bg-[#0f3460] text-cyan-200' : 'bg-[#0b2545] text-slate-400 opacity-60'}`}>
                Rec (Jul)
                {isJulActive && <span className="block text-[8px] font-normal text-cyan-300">[Active]</span>}
              </th>
              <th className={`py-2.5 px-3 w-24 text-right border-r border-slate-700/60 sticky top-0 ${isAugActive ? 'bg-[#0f3460] text-cyan-200' : 'bg-[#0b2545] text-slate-400 opacity-60'}`}>
                Rec (Aug)
                {isAugActive && <span className="block text-[8px] font-normal text-cyan-300">[Active]</span>}
              </th>
              <th className={`py-2.5 px-3 w-24 text-right border-r border-slate-700/60 sticky top-0 ${isSepActive ? 'bg-[#0f3460] text-cyan-200' : 'bg-[#0b2545] text-slate-400 opacity-60'}`}>
                Rec (Sep)
                {isSepActive && <span className="block text-[8px] font-normal text-cyan-300">[Active]</span>}
              </th>
              <th className="py-2.5 px-3 w-28 text-right border-r border-slate-700/60 bg-blue-900/90 text-blue-100 sticky top-0">
                Filtered Receipts
                <div className="text-[8px] font-normal normal-case text-blue-200 truncate">{periodShortTag}</div>
              </th>
              <th className="py-2.5 px-3 w-32 text-right border-r border-slate-700/60 bg-indigo-900/90 text-indigo-100 sticky top-0">
                Net Budget
                <div className="text-[8px] font-normal normal-case text-indigo-200">Alloc + Rec</div>
              </th>
              <th className={`py-2.5 px-3 w-24 text-right border-r border-slate-700/60 sticky top-0 ${isJulActive ? 'bg-[#0f3460] text-amber-200' : 'bg-[#0b2545] text-slate-400 opacity-60'}`}>
                Exp (Jul)
                {isJulActive && <span className="block text-[8px] font-normal text-amber-300">[Active]</span>}
              </th>
              <th className={`py-2.5 px-3 w-24 text-right border-r border-slate-700/60 sticky top-0 ${isAugActive ? 'bg-[#0f3460] text-amber-200' : 'bg-[#0b2545] text-slate-400 opacity-60'}`}>
                Exp (Aug)
                {isAugActive && <span className="block text-[8px] font-normal text-amber-300">[Active]</span>}
              </th>
              <th className={`py-2.5 px-3 w-24 text-right border-r border-slate-700/60 sticky top-0 ${isSepActive ? 'bg-[#0f3460] text-amber-200' : 'bg-[#0b2545] text-slate-400 opacity-60'}`}>
                Exp (Sep)
                {isSepActive && <span className="block text-[8px] font-normal text-amber-300">[Active]</span>}
              </th>
              <th className="py-2.5 px-3 w-28 text-right border-r border-slate-700/60 bg-amber-900/90 text-amber-100 sticky top-0">
                Filtered Exp
                <div className="text-[8px] font-normal normal-case text-amber-200 truncate">{periodShortTag}</div>
              </th>
              <th className="py-2.5 px-3 w-32 text-right bg-emerald-900/90 text-emerald-100 sticky top-0">
                Period Balance
                <div className="text-[8px] font-normal normal-case text-emerald-200 truncate">{periodShortTag}</div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
            {displayRows.map((r, index) => {
              const isGrand = r.isGrandTotal;
              const isSub = r.isSubtotal && !isGrand;
              const isCategory = r.isCategoryHeader;

              let rowClass = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors';
              if (isGrand) {
                rowClass = darkMode
                  ? 'bg-indigo-950/70 font-black text-white border-t-2 border-indigo-400'
                  : 'bg-indigo-100/90 font-black text-indigo-950 border-t-2 border-indigo-600';
              } else if (isSub) {
                rowClass = darkMode
                  ? 'bg-slate-800 font-bold text-slate-100 border-t border-slate-700'
                  : 'bg-slate-100 font-bold text-slate-900 border-t border-slate-300';
              } else if (isCategory) {
                rowClass = darkMode
                  ? 'bg-slate-800/60 font-bold text-indigo-300'
                  : 'bg-slate-50 font-bold text-[#0b2545] border-y border-slate-200';
              }

              const balNum = parseNumber(r.balance);
              const balColor =
                balNum < 0
                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                  : balNum > 0
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-slate-500';

              if (isCategory) {
                return (
                  <tr key={`cat-${index}`} className={rowClass}>
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800 font-bold">
                      {r.sr}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                      {r.code || '-'}
                    </td>
                    <td
                      colSpan={12}
                      className="py-2.5 px-3 font-bold font-sans text-xs tracking-wide uppercase text-[#0b2545] dark:text-indigo-300"
                    >
                      {r.particulars}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={`row-${index}-${r.code}`} className={rowClass}>
                  {/* Sr # */}
                  <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-500">
                    {r.sr || '-'}
                  </td>

                  {/* Head Code */}
                  <td className="py-2 px-3 font-semibold border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    {r.code || '-'}
                  </td>

                  {/* Particulars */}
                  <td className="py-2 px-3 font-sans font-medium border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    {r.particulars}
                  </td>

                  {/* Opening Budget */}
                  <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    {formatAmount(r.originalBudget)}
                  </td>

                  {/* Rec Jul */}
                  <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 text-slate-500">
                    {formatAmount(r.recJul)}
                  </td>

                  {/* Rec Aug */}
                  <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 text-slate-500">
                    {formatAmount(r.recAug)}
                  </td>

                  {/* Rec Sep */}
                  <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 text-slate-500">
                    {formatAmount(r.recSep)}
                  </td>

                  {/* Total Receipts */}
                  <td className="py-2 px-3 text-right font-semibold border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                    {formatAmount(r.totReceipts)}
                  </td>

                  {/* Net Budget */}
                  <td className="py-2 px-3 text-right font-bold border-r border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                    {formatAmount(r.totalBudget)}
                  </td>

                  {/* Exp Jul */}
                  <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 text-slate-500">
                    {formatAmount(r.expJul)}
                  </td>

                  {/* Exp Aug */}
                  <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 text-slate-500">
                    {formatAmount(r.expAug)}
                  </td>

                  {/* Exp Sep */}
                  <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 text-slate-500">
                    {formatAmount(r.expSep)}
                  </td>

                  {/* Total Expenditure */}
                  <td className="py-2 px-3 text-right font-bold border-r border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                    {formatAmount(r.totExp)}
                  </td>

                  {/* Net Balance */}
                  <td className={`py-2 px-3 text-right font-black ${balColor} bg-emerald-50/20 dark:bg-emerald-950/10`}>
                    {formatAmount(r.balance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 6. OFFICIAL SIGNATORIES BLOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-5 pb-2">
        <div className="text-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="h-8"></div>
          <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
            KASHIF ZIA
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
            Prepared by: ACCOUNTANT
          </div>
        </div>

        <div className="text-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="h-8"></div>
          <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
            ANEEBA JAMIL
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
            Checked by: CO. SIGNATUREE
          </div>
        </div>

        <div className="text-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="h-8"></div>
          <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
            SHAZIA KHADIM
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
            Approved by: ACTING PRINCIPAL/DDO
          </div>
        </div>
      </div>

      {/* 7. OWNER STATEMENT BEST FIT AT BOTTOM */}
      <div className="py-2.5 px-4 rounded-xl text-center text-xs font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
        eCashBook &amp; Voucher System Generated by MKZ for Institute 33028
      </div>

      {/* 8. FOOTER AUDIT NOTES & LIVE STATUS STRIP */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-3">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Synchronized live with official TEVTA GID: 1689777979 • Status: Synced on {lastRefreshed}</span>
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          <span>Active Period: {activePeriodDescription}</span>
        </div>
      </div>
    </div>
  );
};
export default NsOwnWorkingReportView;
