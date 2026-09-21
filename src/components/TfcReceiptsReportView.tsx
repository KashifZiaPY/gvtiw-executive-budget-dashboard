import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ExcelJS from 'exceljs';
import {
  TfcChallanRecord,
  computeChallanFeeBreakdown,
  ChallanFeeBreakdown,
  COURSE_TITLE_MAP,
} from '../data/tfcChallanData';
import { formatPKR } from '../lib/formatters';
import { generateReceiptsRegisterPdf } from '../lib/tfcPdfGenerator';
import { TfcCourseMultiSelect } from './TfcCourseMultiSelect';
import { TfcReceiptDrilldownTable } from './TfcReceiptDrilldownTable';
import {
  Calendar,
  FileSpreadsheet,
  Printer,
  Download,
  Copy,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronRight,
  Building2,
  Layers,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Info,
  FileText,
  X,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface TfcReceiptsReportViewProps {
  challans: TfcChallanRecord[];
  darkMode: boolean;
  initialMode?: 'DATE_WISE' | 'MONTH_WISE';
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
  selectedCourses?: string[];
  onSelectedCoursesChange?: (courses: string[]) => void;
}

// Date parsing helper
function parseDateDetail(rawDate: string) {
  if (!rawDate) {
    return {
      iso: '2026-08-01',
      displayDmy: '01-Aug-26',
      monthYear: 'August 2026',
      timestamp: 0,
    };
  }

  // Handle format "Aug 03, 26" or "Aug 03, 2026"
  const m1 = rawDate.match(/([A-Za-z]+)\s+(\d+),?\s+(\d+)/);
  if (m1) {
    const monMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const monNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const mon3 = m1[1].slice(0, 3).toLowerCase();
    const day = parseInt(m1[2], 10);
    let yr = parseInt(m1[3], 10);
    if (yr < 100) yr += 2000;
    const mIdx = monMap[mon3] ?? 7;
    const dayStr = String(day).padStart(2, '0');
    const yr2 = String(yr).slice(-2);
    return {
      iso: `${yr}-${String(mIdx + 1).padStart(2, '0')}-${dayStr}`,
      displayDmy: `${dayStr}-${monNames[mIdx]}-${yr2}`,
      monthYear: `${fullMonths[mIdx]} ${yr}`,
      timestamp: new Date(yr, mIdx, day).getTime(),
    };
  }

  // Handle format "03-Aug-2026" or "03-Aug-26"
  const m2 = rawDate.match(/(\d+)-([A-Za-z]+)-(\d+)/);
  if (m2) {
    const monMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const monNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const day = parseInt(m2[1], 10);
    const mon3 = m2[2].slice(0, 3).toLowerCase();
    let yr = parseInt(m2[3], 10);
    if (yr < 100) yr += 2000;
    const mIdx = monMap[mon3] ?? 7;
    const dayStr = String(day).padStart(2, '0');
    const yr2 = String(yr).slice(-2);
    return {
      iso: `${yr}-${String(mIdx + 1).padStart(2, '0')}-${dayStr}`,
      displayDmy: `${dayStr}-${monNames[mIdx]}-${yr2}`,
      monthYear: `${fullMonths[mIdx]} ${yr}`,
      timestamp: new Date(yr, mIdx, day).getTime(),
    };
  }

  return {
    iso: rawDate,
    displayDmy: rawDate,
    monthYear: 'Other',
    timestamp: 0,
  };
}

export interface AggregatedReceiptRow {
  key: string;
  label: string; // Date or Month name
  timestamp: number;
  challans: TfcChallanRecord[];
  breakdown: ChallanFeeBreakdown;
  challanCount: number;
}

export interface TradeReceiptGroup {
  tradeCode: string;
  tradeTitle: string;
  challanCount: number;
  dateRows: AggregatedReceiptRow[];
  subtotal: ChallanFeeBreakdown;
}

export const TfcReceiptsReportView: React.FC<TfcReceiptsReportViewProps> = ({
  challans,
  darkMode,
  initialMode = 'DATE_WISE',
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
  selectedCourses: selectedCoursesProp,
  onSelectedCoursesChange,
}) => {
  const [reportMode, setReportMode] = useState<'DATE_WISE' | 'MONTH_WISE'>(initialMode);
  const [dateFilterMode, setDateFilterMode] = useState<'MONTH' | 'CUSTOM_RANGE'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Multi-Course Filter State
  const [internalCourses, setInternalCourses] = useState<string[]>(selectedCoursesProp || ['ALL']);
  useEffect(() => {
    if (selectedCoursesProp !== undefined) {
      setInternalCourses(selectedCoursesProp);
    }
  }, [selectedCoursesProp]);

  const activeCourses = selectedCoursesProp !== undefined ? selectedCoursesProp : internalCourses;

  const handleCoursesChange = (newSelected: string[]) => {
    setInternalCourses(newSelected);
    onSelectedCoursesChange?.(newSelected);
  };

  const isCourseSelected = useCallback(
    (abbr: string) => {
      if (!activeCourses || activeCourses.length === 0 || activeCourses.includes('ALL')) return true;
      return activeCourses.includes(abbr);
    },
    [activeCourses]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPrintPortal, setShowPrintPortal] = useState(false);

  // Grouping Mode: TRADE_WISE (group by trade & sort by date/month), DATE_COMBINED (plain date/month-wise only), TRADE_ONLY (trade-wise only), or AUTO
  const [dateViewGrouping, setDateViewGrouping] = useState<'TRADE_WISE' | 'DATE_COMBINED' | 'TRADE_ONLY' | 'AUTO'>('TRADE_WISE');
  const [monthViewGrouping, setMonthViewGrouping] = useState<'TRADE_WISE' | 'DATE_COMBINED' | 'TRADE_ONLY' | 'AUTO'>('TRADE_WISE');

  const viewGroupingMode = reportMode === 'DATE_WISE' ? dateViewGrouping : monthViewGrouping;
  const setViewGroupingMode = (mode: 'TRADE_WISE' | 'DATE_COMBINED' | 'TRADE_ONLY' | 'AUTO') => {
    if (reportMode === 'DATE_WISE') {
      setDateViewGrouping(mode);
    } else {
      setMonthViewGrouping(mode);
    }
  };
  const [collapsedTrades, setCollapsedTrades] = useState<Set<string>>(new Set());

  const toggleCollapseTrade = (tradeCode: string) => {
    setCollapsedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(tradeCode)) next.delete(tradeCode);
      else next.add(tradeCode);
      return next;
    });
  };

  // Toggle drilldown
  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Dataset min & max date range
  const datasetDateRange = useMemo(() => {
    let minIso = '';
    let maxIso = '';
    challans.forEach((c) => {
      const d = parseDateDetail(c.challanPaymentDate);
      if (d.iso) {
        if (!minIso || d.iso < minIso) minIso = d.iso;
        if (!maxIso || d.iso > maxIso) maxIso = d.iso;
      }
    });
    return { minIso, maxIso };
  }, [challans]);

  // Available Months
  const availableMonths = useMemo(() => {
    const map = new Map<string, { key: string; label: string; timestamp: number }>();
    challans.forEach((c) => {
      const d = parseDateDetail(c.challanPaymentDate);
      if (d.monthYear && !map.has(d.monthYear)) {
        map.set(d.monthYear, { key: d.monthYear, label: d.monthYear, timestamp: d.timestamp });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [challans]);

  // Available Courses
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    challans.forEach((c) => {
      if (c.courseAbbreviation) set.add(c.courseAbbreviation);
    });
    return Array.from(set).sort();
  }, [challans]);

  // Filtered raw records
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      const d = parseDateDetail(c.challanPaymentDate);

      // Date filtering: By Month or Custom Date Range
      if (dateFilterMode === 'MONTH') {
        if (selectedMonth !== 'ALL') {
          if (d.monthYear !== selectedMonth) return false;
        }
      } else {
        // CUSTOM_RANGE
        if (startDate && d.iso < startDate) return false;
        if (endDate && d.iso > endDate) return false;
      }

      // Course filtering: Multi-Course check
      if (!isCourseSelected(c.courseAbbreviation)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cleanQDigits = searchQuery.replace(/\D/g, '');
        const cleanCnicDigits = c.cnic.replace(/\D/g, '');
        const match =
          c.challanId.toLowerCase().includes(q) ||
          c.traineeName.toLowerCase().includes(q) ||
          c.cnic.toLowerCase().includes(q) ||
          (cleanQDigits.length >= 3 && cleanCnicDigits.includes(cleanQDigits)) ||
          c.rollOrCode.toLowerCase().includes(q) ||
          c.courseName.toLowerCase().includes(q) ||
          c.courseAbbreviation.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [challans, dateFilterMode, selectedMonth, startDate, endDate, isCourseSelected, searchQuery]);

  // Active Period Human Label for exports & titles
  const activePeriodLabel = useMemo(() => {
    if (dateFilterMode === 'MONTH') {
      return selectedMonth === 'ALL' ? 'All Available Months' : selectedMonth;
    }
    if (startDate && endDate) {
      return `${startDate} to ${endDate} (Custom Range)`;
    }
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Up to ${endDate}`;
    return 'All Available Dates (Custom Range)';
  }, [dateFilterMode, selectedMonth, startDate, endDate]);

  // Intelligent Trade-Wise Grouping with Subtotals and Chronological Date Sorting
  const { tradeGroups, flatRows, grandTotal } = useMemo(() => {
    const totalAccumulator: ChallanFeeBreakdown = {
      admissionTuitionRegFee: 0,
      pupilFee25Percent: 0,
      totalTevtaDues: 0,
      pupilFee75Percent: 0,
      collegeSecurity: 0,
      boardCharges: 0,
      shortCourseSelfFinance: 0,
      bankProfit: 0,
      subTotalInstituteShare: 0,
      totalAmountReceived: 0,
      instituteShare: 0,
      isBeauticianSelfFinance: false,
      isTuv: false,
    };

    // Trade Group map
    const tradeMap = new Map<
      string,
      {
        tradeCode: string;
        tradeTitle: string;
        challanCount: number;
        subtotal: ChallanFeeBreakdown;
        dateMap: Map<string, AggregatedReceiptRow>;
      }
    >();

    // Flat date map (for combined mode)
    const flatDateMap = new Map<string, AggregatedReceiptRow>();

    filteredChallans.forEach((c) => {
      const b = computeChallanFeeBreakdown(c);
      const d = parseDateDetail(c.challanPaymentDate);
      const tradeCode = c.courseAbbreviation || 'OTHER';
      const tradeTitle = COURSE_TITLE_MAP[tradeCode] || c.courseName || tradeCode;

      const groupKey = reportMode === 'DATE_WISE' ? d.displayDmy : d.monthYear;
      const groupLabel = reportMode === 'DATE_WISE' ? d.displayDmy : d.monthYear;
      const groupTimestamp = d.timestamp;

      // 1. Accumulate into Trade Group
      let tEntry = tradeMap.get(tradeCode);
      if (!tEntry) {
        tEntry = {
          tradeCode,
          tradeTitle,
          challanCount: 0,
          subtotal: {
            admissionTuitionRegFee: 0,
            pupilFee25Percent: 0,
            totalTevtaDues: 0,
            pupilFee75Percent: 0,
            collegeSecurity: 0,
            boardCharges: 0,
            shortCourseSelfFinance: 0,
            bankProfit: 0,
            subTotalInstituteShare: 0,
            totalAmountReceived: 0,
            instituteShare: 0,
            isBeauticianSelfFinance: b.isBeauticianSelfFinance,
            isTuv: b.isTuv,
          },
          dateMap: new Map<string, AggregatedReceiptRow>(),
        };
        tradeMap.set(tradeCode, tEntry);
      }

      tEntry.challanCount += 1;
      tEntry.subtotal.admissionTuitionRegFee += b.admissionTuitionRegFee;
      tEntry.subtotal.pupilFee25Percent += b.pupilFee25Percent;
      tEntry.subtotal.totalTevtaDues += b.totalTevtaDues;
      tEntry.subtotal.pupilFee75Percent += b.pupilFee75Percent;
      tEntry.subtotal.collegeSecurity += b.collegeSecurity;
      tEntry.subtotal.boardCharges += b.boardCharges;
      tEntry.subtotal.shortCourseSelfFinance += b.shortCourseSelfFinance;
      tEntry.subtotal.bankProfit += b.bankProfit;
      tEntry.subtotal.subTotalInstituteShare += b.subTotalInstituteShare;
      tEntry.subtotal.totalAmountReceived += b.totalAmountReceived;
      tEntry.subtotal.instituteShare += b.instituteShare;

      // Unique row key within this trade
      const tradeRowKey = `${tradeCode}_${groupKey}`;
      let tRow = tEntry.dateMap.get(tradeRowKey);
      if (!tRow) {
        tRow = {
          key: tradeRowKey,
          label: groupLabel,
          timestamp: groupTimestamp,
          challans: [],
          challanCount: 0,
          breakdown: {
            admissionTuitionRegFee: 0,
            pupilFee25Percent: 0,
            totalTevtaDues: 0,
            pupilFee75Percent: 0,
            collegeSecurity: 0,
            boardCharges: 0,
            shortCourseSelfFinance: 0,
            bankProfit: 0,
            subTotalInstituteShare: 0,
            totalAmountReceived: 0,
            instituteShare: 0,
            isBeauticianSelfFinance: b.isBeauticianSelfFinance,
            isTuv: b.isTuv,
          },
        };
        tEntry.dateMap.set(tradeRowKey, tRow);
      }
      tRow.challans.push(c);
      tRow.challanCount += 1;
      tRow.breakdown.admissionTuitionRegFee += b.admissionTuitionRegFee;
      tRow.breakdown.pupilFee25Percent += b.pupilFee25Percent;
      tRow.breakdown.totalTevtaDues += b.totalTevtaDues;
      tRow.breakdown.pupilFee75Percent += b.pupilFee75Percent;
      tRow.breakdown.collegeSecurity += b.collegeSecurity;
      tRow.breakdown.boardCharges += b.boardCharges;
      tRow.breakdown.shortCourseSelfFinance += b.shortCourseSelfFinance;
      tRow.breakdown.bankProfit += b.bankProfit;
      tRow.breakdown.subTotalInstituteShare += b.subTotalInstituteShare;
      tRow.breakdown.totalAmountReceived += b.totalAmountReceived;
      tRow.breakdown.instituteShare += b.instituteShare;

      // 2. Accumulate into Flat Date Map (for combined view)
      let flatRow = flatDateMap.get(groupKey);
      if (!flatRow) {
        flatRow = {
          key: groupKey,
          label: groupLabel,
          timestamp: groupTimestamp,
          challans: [],
          challanCount: 0,
          breakdown: {
            admissionTuitionRegFee: 0,
            pupilFee25Percent: 0,
            totalTevtaDues: 0,
            pupilFee75Percent: 0,
            collegeSecurity: 0,
            boardCharges: 0,
            shortCourseSelfFinance: 0,
            bankProfit: 0,
            subTotalInstituteShare: 0,
            totalAmountReceived: 0,
            instituteShare: 0,
            isBeauticianSelfFinance: false,
            isTuv: false,
          },
        };
        flatDateMap.set(groupKey, flatRow);
      }
      flatRow.challans.push(c);
      flatRow.challanCount += 1;
      flatRow.breakdown.admissionTuitionRegFee += b.admissionTuitionRegFee;
      flatRow.breakdown.pupilFee25Percent += b.pupilFee25Percent;
      flatRow.breakdown.totalTevtaDues += b.totalTevtaDues;
      flatRow.breakdown.pupilFee75Percent += b.pupilFee75Percent;
      flatRow.breakdown.collegeSecurity += b.collegeSecurity;
      flatRow.breakdown.boardCharges += b.boardCharges;
      flatRow.breakdown.shortCourseSelfFinance += b.shortCourseSelfFinance;
      flatRow.breakdown.bankProfit += b.bankProfit;
      flatRow.breakdown.subTotalInstituteShare += b.subTotalInstituteShare;
      flatRow.breakdown.totalAmountReceived += b.totalAmountReceived;
      flatRow.breakdown.instituteShare += b.instituteShare;

      // 3. Accumulate Grand Total
      totalAccumulator.admissionTuitionRegFee += b.admissionTuitionRegFee;
      totalAccumulator.pupilFee25Percent += b.pupilFee25Percent;
      totalAccumulator.totalTevtaDues += b.totalTevtaDues;
      totalAccumulator.pupilFee75Percent += b.pupilFee75Percent;
      totalAccumulator.collegeSecurity += b.collegeSecurity;
      totalAccumulator.boardCharges += b.boardCharges;
      totalAccumulator.shortCourseSelfFinance += b.shortCourseSelfFinance;
      totalAccumulator.bankProfit += b.bankProfit;
      totalAccumulator.subTotalInstituteShare += b.subTotalInstituteShare;
      totalAccumulator.totalAmountReceived += b.totalAmountReceived;
      totalAccumulator.instituteShare += b.instituteShare;
    });

    // Sort Trade Groups alphabetically by code, and dates within each trade chronologically
    const groups: TradeReceiptGroup[] = Array.from(tradeMap.values())
      .map((t) => ({
        tradeCode: t.tradeCode,
        tradeTitle: t.tradeTitle,
        challanCount: t.challanCount,
        // Sort chronologically by date!
        dateRows: Array.from(t.dateMap.values()).sort((a, b) => a.timestamp - b.timestamp),
        subtotal: t.subtotal,
      }))
      .sort((a, b) => a.tradeCode.localeCompare(b.tradeCode));

    const sortedFlatRows = Array.from(flatDateMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return { tradeGroups: groups, flatRows: sortedFlatRows, grandTotal: totalAccumulator };
  }, [filteredChallans, reportMode]);

  // Consolidated Trade Summary Rows (for TRADE_ONLY mode)
  const tradeSummaryRows = useMemo(() => {
    return tradeGroups.map((g) => {
      const allChallans: TfcChallanRecord[] = [];
      g.dateRows.forEach((r) => allChallans.push(...r.challans));
      return {
        key: `trade_summary_${g.tradeCode}`,
        label: `${g.tradeCode} — ${g.tradeTitle}`,
        timestamp: 0,
        challans: allChallans,
        challanCount: g.challanCount,
        breakdown: g.subtotal,
      };
    });
  }, [tradeGroups]);

  // Effective rows alias
  const rows = useMemo(() => {
    if (viewGroupingMode === 'TRADE_ONLY') return tradeSummaryRows;
    return flatRows;
  }, [viewGroupingMode, tradeSummaryRows, flatRows]);

  // Multi-Course determination: is trade-wise grouping active?
  const isMultiSelection = useMemo(() => {
    if (activeCourses.includes('ALL') || activeCourses.length === 0) {
      return availableCourses.length > 1;
    }
    return activeCourses.length > 1;
  }, [activeCourses, availableCourses.length]);

  const isTradeWiseGrouped = useMemo(() => {
    if (viewGroupingMode === 'TRADE_WISE') return true;
    if (viewGroupingMode === 'DATE_COMBINED') return false;
    if (viewGroupingMode === 'TRADE_ONLY') return false;
    // In AUTO mode: group by trade-wise with subtotals when multi selections or all trades with multiple courses exist!
    return isMultiSelection || tradeGroups.length > 1;
  }, [viewGroupingMode, isMultiSelection, tradeGroups.length]);

  // Scroll and Table Dimension Handling
  const [tableHeightMode, setTableHeightMode] = useState<'FIXED' | 'FULL'>('FIXED');
  const mainTableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomScrollTrackRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollThumbLeft, setScrollThumbLeft] = useState<number>(0);
  const [scrollThumbWidth, setScrollThumbWidth] = useState<number>(25);

  // All row keys across current mode (for Expand All)
  const allCurrentRowKeys = useMemo(() => {
    if (viewGroupingMode === 'TRADE_ONLY') {
      return tradeSummaryRows.map((r) => r.key);
    }
    if (isTradeWiseGrouped) {
      const keys: string[] = [];
      tradeGroups.forEach((g) => {
        g.dateRows.forEach((r) => keys.push(r.key));
      });
      return keys;
    }
    return flatRows.map((r) => r.key);
  }, [viewGroupingMode, tradeSummaryRows, isTradeWiseGrouped, tradeGroups, flatRows]);

  // Toggle expand all or collapse all dates
  const toggleExpandAll = () => {
    if (expandedKeys.size === allCurrentRowKeys.length) {
      setExpandedKeys(new Set());
    } else {
      setExpandedKeys(new Set(allCurrentRowKeys));
    }
  };

  // Toggle collapse all trades
  const toggleCollapseAllTrades = () => {
    if (collapsedTrades.size === tradeGroups.length) {
      setCollapsedTrades(new Set());
    } else {
      setCollapsedTrades(new Set(tradeGroups.map((g) => g.tradeCode)));
    }
  };

  const scrollToPosition = (left: number) => {
    if (mainTableContainerRef.current) {
      mainTableContainerRef.current.scrollTo({ left, behavior: 'smooth' });
    }
  };

  const scrollDrilldown = (key: string, delta: number) => {
    const el = document.getElementById(`drilldown-container-${key}`);
    if (el) {
      el.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const handleBottomTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = bottomScrollTrackRef.current;
    const tableEl = mainTableContainerRef.current;
    if (!track || !tableEl) return;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const maxScroll = tableEl.scrollWidth - tableEl.clientWidth;
    tableEl.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
  };

  // Synchronize top and bottom horizontal scroll positions and monitor dimensions
  useEffect(() => {
    const tableEl = mainTableContainerRef.current;
    const topScrollEl = topScrollContainerRef.current;
    if (!tableEl) return;

    const updateScrollMetrics = () => {
      const scrollLeft = tableEl.scrollLeft;
      const scrollWidth = tableEl.scrollWidth;
      const clientWidth = tableEl.clientWidth;
      setTableScrollWidth(scrollWidth);
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);

      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        const thumbW = Math.max(15, (clientWidth / scrollWidth) * 100);
        setScrollThumbWidth(thumbW);
        const thumbL = (scrollLeft / maxScroll) * (100 - thumbW);
        setScrollThumbLeft(thumbL);
      } else {
        setScrollThumbWidth(100);
        setScrollThumbLeft(0);
      }
    };

    updateScrollMetrics();
    const ro = new ResizeObserver(updateScrollMetrics);
    ro.observe(tableEl);

    let isSyncingFromTable = false;
    let isSyncingFromTop = false;

    const handleTableScroll = () => {
      updateScrollMetrics();
      if (!isSyncingFromTop && topScrollEl) {
        isSyncingFromTable = true;
        topScrollEl.scrollLeft = tableEl.scrollLeft;
        requestAnimationFrame(() => {
          isSyncingFromTable = false;
        });
      }
    };

    const handleTopScroll = () => {
      if (!isSyncingFromTable) {
        isSyncingFromTop = true;
        tableEl.scrollLeft = topScrollEl.scrollLeft;
        requestAnimationFrame(() => {
          isSyncingFromTop = false;
        });
      }
    };

    tableEl.addEventListener('scroll', handleTableScroll, { passive: true });
    if (topScrollEl) {
      topScrollEl.addEventListener('scroll', handleTopScroll, { passive: true });
    }

    return () => {
      ro.disconnect();
      tableEl.removeEventListener('scroll', handleTableScroll);
      if (topScrollEl) {
        topScrollEl.removeEventListener('scroll', handleTopScroll);
      }
    };
  }, [rows, expandedKeys, tableHeightMode]);

  // Copy row to clipboard as TSV
  const handleCopyRow = (r: AggregatedReceiptRow, idx: number) => {
    const tsv = [
      idx + 1,
      r.label,
      r.breakdown.admissionTuitionRegFee,
      r.breakdown.pupilFee25Percent,
      r.breakdown.totalTevtaDues,
      r.breakdown.pupilFee75Percent,
      r.breakdown.collegeSecurity,
      r.breakdown.boardCharges,
      r.breakdown.shortCourseSelfFinance,
      r.breakdown.bankProfit,
      r.breakdown.subTotalInstituteShare,
      r.breakdown.totalAmountReceived,
      r.breakdown.instituteShare,
    ].join('\t');

    navigator.clipboard.writeText(tsv);
    setCopiedKey(r.key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Copy entire table
  const handleCopyAllTable = () => {
    const headers = [
      'Sr #',
      reportMode === 'DATE_WISE' ? 'Date of Receipt (dd-mm-yy)' : 'Month of Receipt',
      'Admission Fee/ Readmission Fee',
      '25% Pupil Fund',
      'Total (TEVTA Dues)',
      'Pupil Funds 75%',
      'College Security',
      'Board / University / Certification Charges',
      'Short Course Self Finance',
      'Bank Profit / Any Other Income',
      'Sub Total (H+Y)',
      'Total Amount Received Per Day (Rs.)',
      'Institute Share',
    ].join('\t');

    let lines: string[] = [];

    if (isTradeWiseGrouped) {
      tradeGroups.forEach((group) => {
        lines.push(`\n=== TRADE: ${group.tradeCode} — ${group.tradeTitle} (${group.challanCount} Challans) ===`);
        group.dateRows.forEach((r, i) => {
          lines.push(
            [
              i + 1,
              r.label,
              r.breakdown.admissionTuitionRegFee,
              r.breakdown.pupilFee25Percent,
              r.breakdown.totalTevtaDues,
              r.breakdown.pupilFee75Percent,
              r.breakdown.collegeSecurity,
              r.breakdown.boardCharges,
              r.breakdown.shortCourseSelfFinance,
              r.breakdown.bankProfit,
              r.breakdown.subTotalInstituteShare,
              r.breakdown.totalAmountReceived,
              r.breakdown.instituteShare,
            ].join('\t')
          );
        });
        // Subtotal row for trade
        lines.push(
          [
            'SUBTOTAL',
            `${group.tradeCode} (${group.challanCount} Challans)`,
            group.subtotal.admissionTuitionRegFee,
            group.subtotal.pupilFee25Percent,
            group.subtotal.totalTevtaDues,
            group.subtotal.pupilFee75Percent,
            group.subtotal.collegeSecurity,
            group.subtotal.boardCharges,
            group.subtotal.shortCourseSelfFinance,
            group.subtotal.bankProfit,
            group.subtotal.subTotalInstituteShare,
            group.subtotal.totalAmountReceived,
            group.subtotal.instituteShare,
          ].join('\t')
        );
      });
    } else {
      lines = rows.map((r, i) =>
        [
          i + 1,
          r.label,
          r.breakdown.admissionTuitionRegFee,
          r.breakdown.pupilFee25Percent,
          r.breakdown.totalTevtaDues,
          r.breakdown.pupilFee75Percent,
          r.breakdown.collegeSecurity,
          r.breakdown.boardCharges,
          r.breakdown.shortCourseSelfFinance,
          r.breakdown.bankProfit,
          r.breakdown.subTotalInstituteShare,
          r.breakdown.totalAmountReceived,
          r.breakdown.instituteShare,
        ].join('\t')
      );
    }

    const totalLine = [
      'Grand Total',
      `${rows.length} ${reportMode === 'DATE_WISE' ? 'Days' : 'Months'} (${filteredChallans.length} Challans)`,
      grandTotal.admissionTuitionRegFee,
      grandTotal.pupilFee25Percent,
      grandTotal.totalTevtaDues,
      grandTotal.pupilFee75Percent,
      grandTotal.collegeSecurity,
      grandTotal.boardCharges,
      grandTotal.shortCourseSelfFinance,
      grandTotal.bankProfit,
      grandTotal.subTotalInstituteShare,
      grandTotal.totalAmountReceived,
      grandTotal.instituteShare,
    ].join('\t');

    navigator.clipboard.writeText([headers, ...lines, totalLine].join('\n'));
    setCopiedKey('ALL_TABLE');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Export to Excel (.xlsx) matching exact spreadsheet styling
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GVTIW Samanabad Faisalabad';
      workbook.created = new Date();

      const sheetTitle = reportMode === 'DATE_WISE' ? 'Date Wise Receipts' : 'Month Wise Receipts';
      const sheet = workbook.addWorksheet(sheetTitle, {
        views: [{ showGridLines: true }],
      });

      // Top Header Title (Row 2 in screenshot)
      sheet.addRow([]);
      const titleRow = sheet.addRow([
        'NAME OF INSTITUTE: GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN, SAMANABAD FAISALABAD',
      ]);
      titleRow.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF92D050' }, // Green banner in screenshot
      };
      sheet.mergeCells('A2:M2');

      // Account Banner (Row 3 in screenshot)
      const subtitleRow = sheet.addRow([
        `${reportMode === 'DATE_WISE' ? 'DATE' : 'MONTH'} WISE RECEIPTS IN TEVTA FEE COLLECTION ACCOUNT# 6580027832200011`,
      ]);
      subtitleRow.font = { bold: true, size: 11, color: { argb: 'FF002060' } };
      subtitleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      subtitleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      sheet.mergeCells('A3:M3');

      // Blank spacing row 4
      sheet.addRow([]);

      // Top Grand Total Summary row (Row 5 & 6 in screenshot)
      const startDataRow = 9;
      const endDataRow = startDataRow + rows.length - 1;

      const grandSummaryRow = sheet.addRow([
        'Grand',
        '',
        grandTotal.admissionTuitionRegFee,
        grandTotal.pupilFee25Percent,
        grandTotal.totalTevtaDues,
        grandTotal.pupilFee75Percent,
        grandTotal.collegeSecurity,
        grandTotal.boardCharges,
        grandTotal.shortCourseSelfFinance,
        grandTotal.bankProfit,
        grandTotal.subTotalInstituteShare,
        grandTotal.totalAmountReceived,
        grandTotal.instituteShare,
      ]);
      grandSummaryRow.font = { bold: true, size: 10 };
      grandSummaryRow.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.mergeCells('A5:B5');

      // Blank row 6 & 7
      sheet.addRow([]);

      // Header Row 1 (Category Groups - Row 7 in screenshot)
      const catHeaderRow = sheet.addRow([
        'Sr #',
        reportMode === 'DATE_WISE' ? 'Date of Receipt' : 'Month of Receipt',
        'TEVTA Fee',
        '',
        '',
        'Pupil Funds 75%',
        'College Security',
        'Board / University / Certification Charges',
        'Short Course Self Finance',
        'Bank Profit / Any Other Income',
        'Sub Total (H+Y)',
        'Total Amount Received Per Day (Rs.)',
        'Institute Share',
      ]);
      catHeaderRow.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
      catHeaderRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      sheet.mergeCells('C7:E7');

      // Header Row 2 (Columns Detail - Row 8 in screenshot)
      const colHeaderRow = sheet.addRow([
        '',
        '(dd-mm-yy)',
        'Admission Fee/ Readmission Fee',
        '25% Pupil Fund',
        'Total (TEVTA Dues)',
        '',
        '(Refundable)',
        'on Verification Charges',
        '',
        '',
        '',
        '',
        '',
      ]);
      colHeaderRow.font = { bold: true, size: 9 };
      colHeaderRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // Style header backgrounds
      // Columns C, D, E (TEVTA Fee - Light Orange/Peach)
      [catHeaderRow, colHeaderRow].forEach((r) => {
        ['C', 'D', 'E'].forEach((col) => {
          r.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
        });
        r.getCell('F').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; // Yellow Pupil 75%
        r.getCell('G').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; // Light blue security
        r.getCell('H').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }; // Board
        r.getCell('I').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }; // Short course
        r.getCell('J').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; // Bank profit
        r.getCell('K').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // Sub Total
        r.getCell('L').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } }; // Cyan Total Per Day
        r.getCell('L').font = { bold: true, color: { argb: 'FFFFFFFF' } };
        r.getCell('M').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // Institute share
      });

      // Data Rows
      if (isTradeWiseGrouped) {
        tradeGroups.forEach((group) => {
          // Trade Section Header Row
          const tHeader = sheet.addRow([
            `TRADE: ${group.tradeCode} — ${group.tradeTitle} (${group.challanCount} Challans)`,
          ]);
          tHeader.font = { bold: true, size: 10, color: { argb: 'FF002060' } };
          tHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
          sheet.mergeCells(`A${sheet.rowCount}:M${sheet.rowCount}`);

          group.dateRows.forEach((r, idx) => {
            const row = sheet.addRow([
              idx + 1,
              r.label,
              r.breakdown.admissionTuitionRegFee,
              r.breakdown.pupilFee25Percent,
              r.breakdown.totalTevtaDues,
              r.breakdown.pupilFee75Percent,
              r.breakdown.collegeSecurity,
              r.breakdown.boardCharges,
              r.breakdown.shortCourseSelfFinance,
              r.breakdown.bankProfit || 0,
              r.breakdown.subTotalInstituteShare,
              r.breakdown.totalAmountReceived,
              r.breakdown.instituteShare,
            ]);
            row.alignment = { vertical: 'middle' };
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(2).alignment = { horizontal: 'center' };
            for (let col = 3; col <= 13; col++) {
              row.getCell(col).numFmt = '#,##0';
              row.getCell(col).alignment = { horizontal: 'right' };
            }
            row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            row.getCell(12).font = { bold: true };
          });

          // Trade Subtotal Row
          const subRow = sheet.addRow([
            'SUBTOTAL',
            `${group.tradeCode} (${group.challanCount} Challans)`,
            group.subtotal.admissionTuitionRegFee,
            group.subtotal.pupilFee25Percent,
            group.subtotal.totalTevtaDues,
            group.subtotal.pupilFee75Percent,
            group.subtotal.collegeSecurity,
            group.subtotal.boardCharges,
            group.subtotal.shortCourseSelfFinance,
            group.subtotal.bankProfit || 0,
            group.subtotal.subTotalInstituteShare,
            group.subtotal.totalAmountReceived,
            group.subtotal.instituteShare,
          ]);
          subRow.font = { bold: true, size: 10 };
          subRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; // Light Amber Subtotal
          for (let col = 3; col <= 13; col++) {
            subRow.getCell(col).numFmt = '#,##0';
            subRow.getCell(col).alignment = { horizontal: 'right' };
          }
          subRow.getCell(12).font = { bold: true, color: { argb: 'FF002060' } };
        });
      } else {
        rows.forEach((r, idx) => {
          const row = sheet.addRow([
            idx + 1,
            r.label,
            r.breakdown.admissionTuitionRegFee,
            r.breakdown.pupilFee25Percent,
            r.breakdown.totalTevtaDues,
            r.breakdown.pupilFee75Percent,
            r.breakdown.collegeSecurity,
            r.breakdown.boardCharges,
            r.breakdown.shortCourseSelfFinance,
            r.breakdown.bankProfit || 0,
            r.breakdown.subTotalInstituteShare,
            r.breakdown.totalAmountReceived,
            r.breakdown.instituteShare,
          ]);

          row.alignment = { vertical: 'middle' };
          row.getCell(1).alignment = { horizontal: 'center' };
          row.getCell(2).alignment = { horizontal: 'center' };

          // Number formats
          for (let col = 3; col <= 13; col++) {
            row.getCell(col).numFmt = '#,##0';
            row.getCell(col).alignment = { horizontal: 'right' };
          }

          // Highlight Cyan for Total Day column
          row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
          row.getCell(12).font = { bold: true };
        });
      }

      // Bottom Grand Total row
      const bottomTotalRow = sheet.addRow([
        'Grand Total',
        `${rows.length} ${reportMode === 'DATE_WISE' ? 'Days' : 'Months'} (${filteredChallans.length} Challans)`,
        grandTotal.admissionTuitionRegFee,
        grandTotal.pupilFee25Percent,
        grandTotal.totalTevtaDues,
        grandTotal.pupilFee75Percent,
        grandTotal.collegeSecurity,
        grandTotal.boardCharges,
        grandTotal.shortCourseSelfFinance,
        grandTotal.bankProfit || 0,
        grandTotal.subTotalInstituteShare,
        grandTotal.totalAmountReceived,
        grandTotal.instituteShare,
      ]);
      bottomTotalRow.font = { bold: true, size: 10 };
      bottomTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
      for (let c = 3; c <= 13; c++) {
        bottomTotalRow.getCell(c).numFmt = '#,##0';
        bottomTotalRow.getCell(c).alignment = { horizontal: 'right' };
      }

      // Column widths
      sheet.columns = [
        { width: 6 },  // Sr
        { width: 16 }, // Date/Month
        { width: 14 }, // Admission
        { width: 13 }, // 25% PF
        { width: 14 }, // Total TEVTA
        { width: 13 }, // 75% PF
        { width: 13 }, // Security
        { width: 18 }, // Board Charges
        { width: 16 }, // Short Course
        { width: 14 }, // Bank Profit
        { width: 14 }, // Sub Total
        { width: 18 }, // Total Received
        { width: 15 }, // Institute Share
      ];

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GVTIW_TFC_${reportMode === 'DATE_WISE' ? 'Date_Wise_Receipts' : 'Month_Wise_Receipts'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export receipts Excel file:', err);
      alert('Failed to generate Excel file.');
    }
  };

  // PDF Generation via vector jsPDF
  const handleDownloadPdf = () => {
    const filterLabel =
      activeCourses.length === 0 || activeCourses.includes('ALL')
        ? 'All Courses'
        : activeCourses.length === 1
        ? (COURSE_TITLE_MAP[activeCourses[0]] || activeCourses[0])
        : `${activeCourses.length} Courses Selected`;

    generateReceiptsRegisterPdf({
      mode: reportMode,
      periodLabel: activePeriodLabel,
      courseFilter: filterLabel,
      rows: flatRows,
      grandTotal,
      totalChallans: filteredChallans.length,
    });
  };

  // Print Official Report (Isolated Landscape A4)
  const handlePrintOfficial = () => {
    setShowPrintPortal(true);
    let styleEl = document.getElementById('tfc-landscape-rule');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'tfc-landscape-rule';
      styleEl.innerHTML = `@page { size: A4 landscape !important; margin: 6mm !important; }`;
      document.head.appendChild(styleEl);
    }
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setShowPrintPortal(false);
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      }, 1000);
    }, 200);
  };

  // Unified Row Renderer for both Grouped and Flat Modes
  const renderReceiptRow = (row: AggregatedReceiptRow, idx: number, prefix?: string) => {
    const isExpanded = expandedKeys.has(row.key);
    const isOdd = idx % 2 === 1;
    const rowBaseBg = isExpanded
      ? darkMode ? 'bg-slate-800' : 'bg-emerald-50/60'
      : isOdd
      ? darkMode ? 'bg-slate-950/40' : 'bg-slate-50/70'
      : darkMode ? 'bg-slate-900' : 'bg-white';
    const stickyCellBg = isExpanded
      ? darkMode ? 'bg-slate-800' : 'bg-emerald-50'
      : isOdd
      ? darkMode ? 'bg-slate-950' : 'bg-slate-50'
      : darkMode ? 'bg-slate-900' : 'bg-white';

    return (
      <React.Fragment key={row.key}>
        <tr
          className={`hover:bg-amber-50/60 dark:hover:bg-slate-800/60 transition-colors ${rowBaseBg}`}
        >
          {/* Sr # - Frozen Column */}
          <td
            className={`py-2 px-2 text-center text-slate-500 font-mono text-[11px] border-r border-b border-slate-200 dark:border-slate-800 sticky left-0 z-20 ${stickyCellBg}`}
          >
            {prefix ? `${prefix}.${idx + 1}` : idx + 1}
          </td>

          {/* Date / Month label with Drilldown Button - Frozen Column */}
          <td
            className={`py-2 px-3 font-bold text-slate-800 dark:text-slate-100 border-r border-b border-slate-200 dark:border-slate-800 whitespace-nowrap sticky left-12 z-20 ${stickyCellBg} shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]`}
          >
            <button
              onClick={() => toggleExpand(row.key)}
              className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors cursor-pointer text-left w-full"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="font-mono text-xs">{row.label}</span>
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ml-1">
                {row.challans.length}
              </span>
            </button>
          </td>

          {/* Admission Fee/ Readmission Fee */}
          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.admissionTuitionRegFee > 0
              ? formatPKR(row.breakdown.admissionTuitionRegFee)
              : '-'}
          </td>

          {/* 25% Pupil Fund */}
          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.pupilFee25Percent > 0
              ? formatPKR(row.breakdown.pupilFee25Percent)
              : '-'}
          </td>

          {/* Total (TEVTA Dues) */}
          <td className="py-2 px-2 text-right font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.totalTevtaDues > 0
              ? formatPKR(row.breakdown.totalTevtaDues)
              : '-'}
          </td>

          {/* Pupil Funds 75% */}
          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.pupilFee75Percent > 0
              ? formatPKR(row.breakdown.pupilFee75Percent)
              : '-'}
          </td>

          {/* College Security */}
          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.collegeSecurity > 0
              ? formatPKR(row.breakdown.collegeSecurity)
              : '-'}
          </td>

          {/* Board Charges */}
          <td className="py-2 px-2 text-right font-mono font-bold text-amber-700 dark:text-amber-400 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.boardCharges > 0
              ? formatPKR(row.breakdown.boardCharges)
              : '-'}
          </td>

          {/* Short Course Self Finance */}
          <td className="py-2 px-2 text-right font-mono font-bold text-purple-700 dark:text-purple-400 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.shortCourseSelfFinance > 0
              ? formatPKR(row.breakdown.shortCourseSelfFinance)
              : '-'}
          </td>

          {/* Bank Profit / Any Other */}
          <td className="py-2 px-2 text-right font-mono text-slate-500 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.bankProfit > 0
              ? formatPKR(row.breakdown.bankProfit)
              : 0}
          </td>

          {/* Sub Total (Institute Share) */}
          <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 dark:text-slate-100 bg-[#E2EFDA]/40 dark:bg-emerald-950/20 border-r border-b border-slate-200 dark:border-slate-800">
            {row.breakdown.subTotalInstituteShare > 0
              ? formatPKR(row.breakdown.subTotalInstituteShare)
              : '-'}
          </td>

          {/* Total Amount Received Per Day (Rs.) */}
          <td className="py-2 px-3 text-right font-mono font-black text-[#002060] dark:text-cyan-300 bg-[#D9E1F2] dark:bg-cyan-950/40 border-r border-b border-slate-200 dark:border-slate-800 text-xs">
            {formatPKR(row.breakdown.totalAmountReceived)}
          </td>

          {/* Institute Share */}
          <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 border-r border-b border-slate-200 dark:border-slate-800">
            {formatPKR(row.breakdown.instituteShare)}
          </td>

          {/* Actions (Copy row) */}
          <td className="py-2 px-2 text-center whitespace-nowrap border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleCopyRow(row, idx)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              title="Copy Row TSV for Excel"
            >
              {copiedKey === row.key ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </td>
        </tr>

        {/* Drilldown Sub-table */}
        {isExpanded && (
          <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-300 dark:border-slate-700">
            <td colSpan={14} className="p-3 pl-4 sm:pl-8 border-b border-slate-300 dark:border-slate-700">
              <TfcReceiptDrilldownTable
                rowKey={row.key}
                rowLabel={row.label}
                challans={row.challans}
                breakdown={row.breakdown}
                darkMode={darkMode}
                onScrollDrilldown={scrollDrilldown}
              />
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Title & Mode Navigation Ribbon */}
      <div
        className={`p-4 rounded-2xl border shadow-xs transition-all ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  {reportMode === 'DATE_WISE' ? 'Date Wise Receipts' : 'Month Wise Receipts'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  A/C: 6580027832200011
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official Head-Wise Allocation & Board (TTB / PBTE) Dues Register — {activePeriodLabel}
              </p>
            </div>
          </div>

          {/* Mode Switcher & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`p-1 rounded-xl border flex items-center gap-1 ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
              }`}
            >
              <button
                onClick={() => setReportMode('DATE_WISE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportMode === 'DATE_WISE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Date Wise Receipts</span>
              </button>
              <button
                onClick={() => setReportMode('MONTH_WISE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportMode === 'MONTH_WISE'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Month Wise Receipts</span>
              </button>
            </div>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              title="Download vector PDF report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download PDF (.pdf)</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </button>

            {/* Copy Table TSV */}
            <button
              onClick={handleCopyAllTable}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                copiedKey === 'ALL_TABLE'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {copiedKey === 'ALL_TABLE' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'ALL_TABLE' ? 'Copied Table!' : 'Copy for Excel'}</span>
            </button>

            {/* Print Official Report */}
            <button
              onClick={handlePrintOfficial}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Print Official Report (Landscape A4)"
            >
              <Printer className="w-4 h-4 text-amber-500" />
              <span>Print Official</span>
            </button>
          </div>
        </div>

        {/* Dedicated Presentation & Grouping Mode Ribbon */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Grouping &amp; View Option:
            </span>
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 gap-1 flex-wrap shadow-inner">
              <button
                type="button"
                onClick={() => setViewGroupingMode('TRADE_WISE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGroupingMode === 'TRADE_WISE'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
                title={
                  reportMode === 'DATE_WISE'
                    ? 'Group by Trade & Sort by Date (Trade sections with headers, subtotals, and chronological dates)'
                    : 'Group by Trade & Sort by Month (Trade sections with headers, subtotals, and chronological months)'
                }
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{reportMode === 'DATE_WISE' ? 'Group by Trade (Sort by Date)' : 'Group by Trade (Sort by Month)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewGroupingMode('DATE_COMBINED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGroupingMode === 'DATE_COMBINED'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
                title={
                  reportMode === 'DATE_WISE'
                    ? 'Plain Date-Wise Only (Sorted chronologically by date across all trades in expandable format)'
                    : 'Plain Month-Wise Only (Sorted chronologically by month across all trades in expandable format)'
                }
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {reportMode === 'DATE_WISE'
                    ? 'Plain Date-Wise Only (Sort by Date, Expandable)'
                    : 'Plain Month-Wise Only (Sort by Month, Expandable)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewGroupingMode('TRADE_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGroupingMode === 'TRADE_ONLY'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
                title="Consolidated Trade-Wise Only (One summary row per trade with expandable student drilldown)"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Trade-Wise Only (Sort by Trade)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewGroupingMode('AUTO')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewGroupingMode === 'AUTO'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Auto grouping mode (Trade-wise when multiple courses are present)"
              >
                Auto
              </button>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 italic">
            {viewGroupingMode === 'DATE_COMBINED'
              ? reportMode === 'DATE_WISE'
                ? 'Showing plain chronological dates across all trades with expandable student drilldown.'
                : 'Showing plain chronological months across all trades with expandable student drilldown.'
              : viewGroupingMode === 'TRADE_ONLY'
              ? 'Showing consolidated trade totals with expandable trainee challan drilldowns.'
              : reportMode === 'DATE_WISE'
              ? 'Grouped into separate trade sections with subtotals, sorted by payment date.'
              : 'Grouped into separate trade sections with subtotals, sorted by month.'}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          {/* Date Filtering Mode & Pickers */}
          <div className="md:col-span-6 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Receipt Date Filter
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDateFilterMode('MONTH')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    dateFilterMode === 'MONTH'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  By Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilterMode('CUSTOM_RANGE');
                    if (!startDate && datasetDateRange.minIso) setStartDate(datasetDateRange.minIso);
                    if (!endDate && datasetDateRange.maxIso) setEndDate(datasetDateRange.maxIso);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    dateFilterMode === 'CUSTOM_RANGE'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Custom Date Range
                </button>
              </div>
            </div>

            {dateFilterMode === 'MONTH' ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="ALL">All Available Months (Full Academic Session)</option>
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {selectedMonth !== 'ALL' && (
                  <button
                    onClick={() => setSelectedMonth('ALL')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Clear Month Filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">From Date:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={datasetDateRange.minIso || '2026-08-01'}
                      max={datasetDateRange.maxIso || '2026-09-30'}
                      className={`w-full px-2 py-1 rounded-lg border text-xs font-medium focus:outline-none ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">To Date:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={datasetDateRange.minIso || '2026-08-01'}
                      max={datasetDateRange.maxIso || '2026-09-30'}
                      className={`w-full px-2 py-1 rounded-lg border text-xs font-medium focus:outline-none ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(datasetDateRange.minIso || '2026-08-01');
                      setEndDate(datasetDateRange.maxIso || '2026-09-30');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                  >
                    Full Range
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('2026-08-01');
                      setEndDate('2026-08-31');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                  >
                    August 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('2026-09-01');
                      setEndDate('2026-09-30');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                  >
                    September 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer ml-auto"
                  >
                    Clear Range
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Course Filter (Multi-Select) */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Course / Trade Filter</span>
              {activeCourses.length > 0 && !activeCourses.includes('ALL') && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 normal-case">
                  {activeCourses.length} selected
                </span>
              )}
            </label>
            <TfcCourseMultiSelect
              availableCourses={availableCourses}
              selectedCourses={activeCourses}
              onChange={handleCoursesChange}
              challans={challans}
              darkMode={darkMode}
              size="md"
              className="w-full"
            />
          </div>

          {/* Search box */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search Challan / Trainee / CNIC
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, roll, challan, or CNIC..."
                className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs font-medium focus:outline-none ${
                  darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Business Logic Badge Summary */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-2.5 rounded-xl">
          <Info className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold text-emerald-800 dark:text-emerald-300">
              Active Receipts & Fee Allocation Rule:
            </span>{' '}
            Beautician Self Finance (Rs. 10,012) is separated into Base Course (Rs. 8,500), Board Dues (Rs. 1,500), and TEVTA Share (Rs. 12 = 25% from Rs. 10,000). Regular courses classify other head as Board Charges. TUV Certification fees are allocated 100% to Other Income (Bank Profit / Any Other Income) pending central TEVTA transfer decision.
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total Received
          </div>
          <div className="text-base font-black text-emerald-600 mt-1">
            Rs. {formatPKR(grandTotal.totalAmountReceived)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {filteredChallans.length} Total Challans
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            TEVTA Dues (HO)
          </div>
          <div className="text-base font-black text-rose-600 mt-1">
            Rs. {formatPKR(grandTotal.totalTevtaDues)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Adm + 25% PF
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Institute Share
          </div>
          <div className="text-base font-black text-blue-600 mt-1">
            Rs. {formatPKR(grandTotal.instituteShare)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Sub Total (H+Y)
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Board Charges
          </div>
          <div className="text-base font-black text-amber-600 mt-1">
            Rs. {formatPKR(grandTotal.boardCharges)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            TTB / PBTE Charges
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Self Finance
          </div>
          <div className="text-base font-black text-purple-600 mt-1">
            Rs. {formatPKR(grandTotal.shortCourseSelfFinance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Beautician Short Course
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            College Security
          </div>
          <div className="text-base font-black text-cyan-600 mt-1">
            Rs. {formatPKR(grandTotal.collegeSecurity)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Refundable Deposit
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Other Income (TUV)
          </div>
          <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">
            Rs. {formatPKR(grandTotal.bankProfit)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            100% Retained / Other
          </div>
        </div>
      </div>

      {/* Main Official Spreadsheet Container */}
      <div
        className={`rounded-2xl border shadow-sm overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Spreadsheet Top Banner matching Excel Screenshot */}
        <div className="bg-[#92D050] text-slate-950 font-black text-xs md:text-sm py-2 px-4 text-center tracking-wide border-b border-[#7ebd3d]">
          NAME OF INSTITUTE: GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN, SAMANABAD FAISALABAD
        </div>
        <div className="bg-[#D9E1F2] dark:bg-slate-800 text-[#002060] dark:text-blue-300 font-extrabold text-[11px] md:text-xs py-1.5 px-4 text-center border-b border-slate-300 dark:border-slate-700">
          {reportMode === 'DATE_WISE' ? 'DATE' : 'MONTH'} WISE RECEIPTS IN TEVTA FEE COLLECTION ACCOUNT# 6580027832200011
        </div>

        {/* Grand Total Bar Pinned at Top (Row 5 & 6 in Screenshot) */}
        <div className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-300 dark:border-slate-800 p-2.5 flex items-center justify-between text-xs overflow-x-auto">
          <div className="flex items-center gap-3 font-bold text-slate-700 dark:text-slate-300 shrink-0">
            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-black text-[11px]">
              Grand Total
            </span>
            <span>
              {viewGroupingMode === 'TRADE_ONLY'
                ? `${tradeSummaryRows.length} Trades Consolidated (${filteredChallans.length} Challans)`
                : isTradeWiseGrouped
                ? `${tradeGroups.length} Trades (${filteredChallans.length} Challans)`
                : `${rows.length} ${reportMode === 'DATE_WISE' ? 'Receipt Days' : 'Receipt Months'} (${filteredChallans.length} Challans)`}
            </span>
          </div>

          <div className="flex items-center gap-4 text-right font-black shrink-0">
            <div>
              <span className="text-[10px] font-bold text-slate-500 block uppercase">TEVTA Dues:</span>
              <span className="text-rose-600">Rs. {formatPKR(grandTotal.totalTevtaDues)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Institute Share:</span>
              <span className="text-blue-600">Rs. {formatPKR(grandTotal.instituteShare)}</span>
            </div>
            <div className="bg-[#00B0F0] text-white px-3 py-1 rounded-lg">
              <span className="text-[10px] font-bold block uppercase opacity-90">Total Received:</span>
              <span className="text-sm">Rs. {formatPKR(grandTotal.totalAmountReceived)}</span>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Convenience, Grouping & Control Toolbar */}
        <div className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-300 dark:border-slate-700 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left: Quick Column Jump Buttons & Grouping Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1 shrink-0">
              <Layers className="w-3 h-3" /> Jump:
            </span>
            <button
              type="button"
              onClick={() => scrollToPosition(0)}
              className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs shrink-0"
            >
              Start (Date)
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(180)}
              className="px-2 py-1 rounded-md bg-[#FCE4D6] text-orange-950 hover:brightness-95 border border-orange-300 text-[11px] font-bold cursor-pointer shadow-2xs shrink-0"
            >
              TEVTA Dues
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(520)}
              className="px-2 py-1 rounded-md bg-[#FCE4D6] text-orange-950 hover:brightness-95 border border-orange-300 text-[11px] font-bold cursor-pointer shadow-2xs shrink-0"
            >
              Board &amp; Self Fin.
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(850)}
              className="px-2 py-1 rounded-md bg-[#00B0F0] text-white hover:brightness-95 border border-cyan-500 text-[11px] font-black cursor-pointer shadow-2xs shrink-0"
            >
              Total &amp; Inst. Share
            </button>

            {/* Grouping Mode Switcher */}
            <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-700 pl-2 ml-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-0.5 shrink-0">View:</span>
              <button
                type="button"
                onClick={() => setViewGroupingMode('TRADE_WISE')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  viewGroupingMode === 'TRADE_WISE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
                title={reportMode === 'DATE_WISE' ? 'Group by Trade (Sorted by Date)' : 'Group by Trade (Sorted by Month)'}
              >
                Group by Trade
              </button>
              <button
                type="button"
                onClick={() => setViewGroupingMode('DATE_COMBINED')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  viewGroupingMode === 'DATE_COMBINED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
                title={reportMode === 'DATE_WISE' ? 'Plain Date-Wise Only (Expandable)' : 'Plain Month-Wise Only (Expandable)'}
              >
                {reportMode === 'DATE_WISE' ? 'Plain Dates' : 'Plain Months'}
              </button>
              <button
                type="button"
                onClick={() => setViewGroupingMode('TRADE_ONLY')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  viewGroupingMode === 'TRADE_ONLY'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
                title="Trade-Wise Only (Consolidated Trade Rows)"
              >
                Trade-Wise Only
              </button>
              <button
                type="button"
                onClick={() => setViewGroupingMode('AUTO')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  viewGroupingMode === 'AUTO'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
                title="Auto grouping mode"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Right: Expand/Collapse All, Full/Fixed Height Toggle, and Step Scroll Buttons */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {isTradeWiseGrouped && (
              <button
                type="button"
                onClick={toggleCollapseAllTrades}
                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Collapse or expand all trade sections"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{collapsedTrades.size === tradeGroups.length ? 'Expand Trades' : 'Collapse Trades'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleExpandAll}
              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Expand or collapse all date drilldowns"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{expandedKeys.size === allCurrentRowKeys.length ? 'Collapse All' : 'Expand All'}</span>
            </button>

            <button
              type="button"
              onClick={() => setTableHeightMode((prev) => (prev === 'FIXED' ? 'FULL' : 'FIXED'))}
              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title={tableHeightMode === 'FIXED' ? 'Switch to unconstrained full page height' : 'Switch to constrained sticky viewport with frozen headers'}
            >
              {tableHeightMode === 'FIXED' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Page</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Freeze Viewport</span>
                </>
              )}
            </button>

            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (mainTableContainerRef.current) {
                    mainTableContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                  }
                }}
                className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-30"
                title="Scroll table horizontally to the left"
                disabled={!canScrollLeft}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mainTableContainerRef.current) {
                    mainTableContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                  }
                }}
                className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-30 border-l border-slate-200 dark:border-slate-700"
                title="Scroll table horizontally to the right"
                disabled={!canScrollRight}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Top Synchronized Horizontal Scroll Bar with High Visibility */}
        <div
          ref={topScrollContainerRef}
          className="overflow-x-auto overflow-y-hidden h-3 bg-slate-200 dark:bg-slate-800/90 border-b border-slate-300 dark:border-slate-700 scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-500 hover:h-4 transition-all cursor-ew-resize"
          title="Top Horizontal Scrollbar: Drag sideways to scroll columns across all 13 fee breakdowns"
        >
          <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
        </div>

        {/* Scrollable Data Table Container with Sticky Headers and Frozen Columns */}
        <div
          ref={mainTableContainerRef}
          className={`overflow-auto border-t border-slate-200 dark:border-slate-800 relative scroll-smooth focus:outline-none scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-500 scrollbar-track-slate-100 dark:scrollbar-track-slate-900 ${
            tableHeightMode === 'FIXED' ? 'h-[66vh] min-h-[460px] max-h-[720px]' : 'max-h-none'
          }`}
        >
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-30 shadow-sm bg-slate-200 dark:bg-slate-800">
              {/* Category Group Header (Row 1) */}
              <tr className="text-center font-bold text-[11px] h-10">
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b-2 border-r border-slate-300 dark:border-slate-700 w-12 text-center sticky left-0 top-0 z-50 font-black"
                >
                  Sr #
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-3 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[130px] text-center sticky left-12 top-0 z-50 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)] font-black"
                >
                  {viewGroupingMode === 'TRADE_ONLY'
                    ? 'Trade / Course'
                    : reportMode === 'DATE_WISE'
                    ? 'Date of Receipt'
                    : 'Month of Receipt'}
                  <div className="text-[10px] font-normal text-slate-600 dark:text-slate-400">
                    {viewGroupingMode === 'TRADE_ONLY'
                      ? '(Trade Code & Name)'
                      : reportMode === 'DATE_WISE'
                      ? '(dd-mm-yy)'
                      : '(Month-Year)'}
                  </div>
                </th>
                <th
                  colSpan={3}
                  className="py-1.5 px-2 bg-[#FCE4D6] dark:bg-orange-950 text-orange-950 dark:text-orange-100 border-r border-b border-slate-300 dark:border-slate-700 sticky top-0 z-30 font-black"
                >
                  TEVTA Fee (Central Dues)
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#FFFFF2] dark:bg-yellow-950 text-yellow-950 dark:text-yellow-100 border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[95px] sticky top-0 z-30 font-bold"
                >
                  Pupil Funds 75%
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#DDEBF7] dark:bg-sky-950 text-sky-950 dark:text-sky-100 border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[90px] sticky top-0 z-30 font-bold"
                >
                  College Security
                  <div className="text-[9px] font-normal opacity-80">(Refundable)</div>
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#FCE4D6] dark:bg-orange-950 text-orange-950 dark:text-orange-100 border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[120px] sticky top-0 z-30 font-bold"
                >
                  Board / University / Certification Charges
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#FCE4D6] dark:bg-orange-950 text-orange-950 dark:text-orange-100 border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[110px] sticky top-0 z-30 font-bold"
                >
                  Short Course Self Finance
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[95px] sticky top-0 z-30 font-bold"
                >
                  Bank Profit / Any Other Income
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#E2EFDA] dark:bg-emerald-950 text-emerald-950 dark:text-emerald-100 border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[105px] sticky top-0 z-30 font-bold"
                >
                  Sub Total (H+Y)
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-3 bg-[#00B0F0] text-white border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[130px] font-black sticky top-0 z-30 shadow-xs"
                >
                  Total Amount Received Per Day (Rs.)
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#E2EFDA] dark:bg-emerald-950 text-emerald-950 dark:text-emerald-100 border-b-2 border-r border-slate-300 dark:border-slate-700 min-w-[105px] sticky top-0 z-30 font-bold"
                >
                  Institute Share
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-slate-200 dark:bg-slate-800 text-center w-20 sticky top-0 z-30 border-b-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                >
                  Actions
                </th>
              </tr>

              {/* Sub-Header Row 2 (Columns Detail) */}
              <tr className="text-center font-bold text-[10px] h-8">
                <th className="py-1 px-2 bg-[#FCE4D6] dark:bg-orange-950 text-orange-950 dark:text-orange-100 border-b-2 border-r border-slate-300 dark:border-slate-700 sticky top-10 z-30">
                  Admission Fee/ Readmission Fee
                </th>
                <th className="py-1 px-2 bg-[#FCE4D6] dark:bg-orange-950 text-orange-950 dark:text-orange-100 border-b-2 border-r border-slate-300 dark:border-slate-700 sticky top-10 z-30">
                  25% Pupil Fund
                </th>
                <th className="py-1 px-2 bg-[#F8CBAD] dark:bg-orange-900 text-orange-950 dark:text-orange-100 border-b-2 border-r border-slate-300 dark:border-slate-700 font-black sticky top-10 z-30">
                  Total (TEVTA Dues)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    No receipt records found matching the active filters.
                  </td>
                </tr>
              ) : isTradeWiseGrouped ? (
                tradeGroups.map((group) => {
                  const isCollapsed = collapsedTrades.has(group.tradeCode);
                  return (
                    <React.Fragment key={`trade-section-${group.tradeCode}`}>
                      {/* Trade Section Header Banner */}
                      <tr className="bg-slate-100 dark:bg-slate-800/90 border-t-2 border-b border-slate-300 dark:border-slate-700 select-none">
                        <td colSpan={14} className="py-2.5 px-3">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => toggleCollapseTrade(group.tradeCode)}
                              className="flex items-center gap-2 text-left font-bold text-slate-800 dark:text-slate-100 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-emerald-600" />
                              )}
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold">
                                {group.tradeCode}
                              </span>
                              <span className="text-sm font-black text-slate-900 dark:text-white">
                                {group.tradeTitle}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                                ({group.challanCount} trainees, {group.dateRows.length} collection dates)
                              </span>
                            </button>
                            <div className="flex items-center gap-3 text-xs font-semibold">
                              <span className="text-slate-500">
                                Subtotal: <strong className="text-blue-700 dark:text-cyan-400 font-mono">Rs. {formatPKR(group.subtotal.totalAmountReceived)}</strong>
                              </span>
                              <span className="text-slate-500 hidden sm:inline">
                                TEVTA: <strong className="text-rose-600 font-mono">Rs. {formatPKR(group.subtotal.totalTevtaDues)}</strong>
                              </span>
                              <span className="text-slate-500 hidden sm:inline">
                                Inst: <strong className="text-emerald-600 font-mono">Rs. {formatPKR(group.subtotal.instituteShare)}</strong>
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Trade Date Rows */}
                      {!isCollapsed &&
                        group.dateRows.map((row, rIdx) =>
                          renderReceiptRow(row, rIdx, group.tradeCode)
                        )}

                      {/* Trade Subtotal Row */}
                      {!isCollapsed && (
                        <tr className="bg-slate-200/70 dark:bg-slate-800 font-bold border-t border-b-2 border-slate-300 dark:border-slate-700 text-[11px]">
                          <td className="py-2 px-2 text-center text-slate-400 font-mono border-r border-b border-slate-300 dark:border-slate-700 sticky left-0 z-20 bg-slate-200 dark:bg-slate-800"></td>
                          <td className="py-2 px-3 font-black text-slate-900 dark:text-white border-r border-b border-slate-300 dark:border-slate-700 whitespace-nowrap sticky left-12 z-20 bg-slate-200 dark:bg-slate-800 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
                            SUBTOTAL ({group.tradeCode})
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-300 dark:border-slate-700">
                            {group.subtotal.admissionTuitionRegFee > 0 ? formatPKR(group.subtotal.admissionTuitionRegFee) : '-'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-300 dark:border-slate-700">
                            {group.subtotal.pupilFee25Percent > 0 ? formatPKR(group.subtotal.pupilFee25Percent) : '-'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border-r border-b border-slate-300 dark:border-slate-700">
                            {group.subtotal.totalTevtaDues > 0 ? formatPKR(group.subtotal.totalTevtaDues) : '-'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-300 dark:border-slate-700">
                            {group.subtotal.pupilFee75Percent > 0 ? formatPKR(group.subtotal.pupilFee75Percent) : '-'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-300 dark:border-slate-700">
                            {group.subtotal.collegeSecurity > 0 ? formatPKR(group.subtotal.collegeSecurity) : '-'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-amber-700 dark:text-amber-400 border-r border-b border-slate-300 dark:border-slate-700">
                            {group.subtotal.boardCharges > 0 ? formatPKR(group.subtotal.boardCharges) : '-'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-purple-700 dark:text-purple-400 border-r border-b border-slate-300 dark:border-slate-700">
                            {group.subtotal.shortCourseSelfFinance > 0 ? formatPKR(group.subtotal.shortCourseSelfFinance) : '-'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-500 border-r border-slate-300 dark:border-slate-700">
                            {group.subtotal.bankProfit > 0 ? formatPKR(group.subtotal.bankProfit) : 0}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 dark:text-slate-100 bg-[#E2EFDA]/40 dark:bg-emerald-950/20 border-r border-b border-slate-300 dark:border-slate-700">
                            {group.subtotal.subTotalInstituteShare > 0 ? formatPKR(group.subtotal.subTotalInstituteShare) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-[#002060] dark:text-cyan-300 bg-[#D9E1F2] dark:bg-cyan-950/40 border-r border-b border-slate-300 dark:border-slate-700 text-xs">
                            {formatPKR(group.subtotal.totalAmountReceived)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 border-r border-b border-slate-300 dark:border-slate-700">
                            {formatPKR(group.subtotal.instituteShare)}
                          </td>
                          <td className="border-b border-slate-300 dark:border-slate-700"></td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                rows.map((row, idx) => renderReceiptRow(row, idx))
              )}
            </tbody>

            {/* Bottom Grand Total Footer */}
            {rows.length > 0 && (
              <tfoot className="sticky bottom-0 z-30 border-t-2 border-slate-400 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 font-black text-xs shadow-md">
                <tr>
                  <td className="py-3 px-2 text-center text-slate-500 sticky left-0 bottom-0 z-40 bg-slate-100 dark:bg-slate-950 border-r border-slate-300 dark:border-slate-800"></td>
                  <td className="py-3 px-3 text-slate-900 dark:text-white font-bold sticky left-12 bottom-0 z-40 bg-slate-100 dark:bg-slate-950 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)] border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                    GRAND TOTAL
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                    {formatPKR(grandTotal.admissionTuitionRegFee)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                    {formatPKR(grandTotal.pupilFee25Percent)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-r border-slate-200 dark:border-slate-800 font-black">
                    {formatPKR(grandTotal.totalTevtaDues)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                    {formatPKR(grandTotal.pupilFee75Percent)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                    {formatPKR(grandTotal.collegeSecurity)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800 font-black">
                    {formatPKR(grandTotal.boardCharges)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-purple-700 dark:text-purple-400 border-r border-slate-200 dark:border-slate-800 font-black">
                    {formatPKR(grandTotal.shortCourseSelfFinance)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-500 border-r border-slate-200 dark:border-slate-800">
                    {grandTotal.bankProfit > 0 ? formatPKR(grandTotal.bankProfit) : '-'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-900 dark:text-white bg-[#E2EFDA]/50 dark:bg-emerald-950/30 border-r border-slate-200 dark:border-slate-800 font-bold">
                    {formatPKR(grandTotal.subTotalInstituteShare)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-[#002060] dark:text-cyan-300 bg-[#D9E1F2] dark:bg-cyan-950/50 border-r border-slate-200 dark:border-slate-800 text-xs">
                    Rs. {formatPKR(grandTotal.totalAmountReceived)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 font-black">
                    Rs. {formatPKR(grandTotal.instituteShare)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Convenient Synced Bottom Horizontal Scrollbar & Quick Column Navigator */}
        <div className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
          {/* Left: Quick Jump Chips to Columns */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Jump to Column:
            </span>
            <button
              type="button"
              onClick={() => scrollToPosition(0)}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-2xs cursor-pointer transition-colors"
            >
              Sr / Date
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(180)}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-900 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-900 border border-orange-300 dark:border-orange-800 shadow-2xs cursor-pointer transition-colors"
              title="Jump to TEVTA Fee Columns (Rs. 12 Share)"
            >
              TEVTA Fee (Rs. 12)
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(380)}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 hover:bg-sky-200 dark:hover:bg-sky-900 border border-sky-300 dark:border-sky-800 shadow-2xs cursor-pointer transition-colors"
              title="Jump to 75% Pupil Fund and College Security"
            >
              Pupil &amp; Security
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(580)}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-800 shadow-2xs cursor-pointer transition-colors"
              title="Jump to TTB / PBTE Board Charges (Rs. 1,500)"
            >
              Board Fee (Rs. 1,500)
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(720)}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900 border border-purple-300 dark:border-purple-800 shadow-2xs cursor-pointer transition-colors"
              title="Jump to Short Course Self Finance (Rs. 8,500 net)"
            >
              Self-Finance (Rs. 8,500)
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(920)}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 shadow-2xs cursor-pointer transition-colors"
              title="Jump to Institute Share (Rs. 10,000)"
            >
              Institute Share (Rs. 10,000)
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(1200)}
              className="px-2.5 py-0.5 rounded text-[11px] font-black bg-cyan-600 text-white hover:bg-cyan-700 border border-cyan-700 shadow-2xs cursor-pointer transition-colors"
              title="Jump to Total Amount Received Per Day (Rs. 10,012)"
            >
              Total Received (Rs. 10,012)
            </button>
          </div>

          {/* Right: Interactive Synced Scroll Track + Step Scroll Controls */}
          <div className="flex items-center gap-2 grow sm:grow-0 min-w-[280px] max-w-md ml-auto">
            <button
              type="button"
              onClick={() => {
                if (mainTableContainerRef.current) {
                  mainTableContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                }
              }}
              disabled={!canScrollLeft}
              className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-30 cursor-pointer transition-colors shadow-2xs"
              title="First Column"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (mainTableContainerRef.current) {
                  mainTableContainerRef.current.scrollBy({ left: -250, behavior: 'smooth' });
                }
              }}
              disabled={!canScrollLeft}
              className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-30 cursor-pointer transition-colors shadow-2xs"
              title="Pan Left (250px)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {/* Clickable and Draggable Interactive Track */}
            <div
              ref={bottomScrollTrackRef}
              onClick={handleBottomTrackClick}
              className="relative grow h-4 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer overflow-hidden border border-slate-300 dark:border-slate-600 shadow-inner"
              title="Click anywhere on track to pan horizontally across columns"
            >
              <div
                className="absolute top-0 bottom-0 bg-teal-600 hover:bg-teal-500 rounded-full transition-all duration-75 shadow-xs"
                style={{
                  left: `${scrollThumbLeft}%`,
                  width: `${scrollThumbWidth}%`,
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (mainTableContainerRef.current) {
                  mainTableContainerRef.current.scrollBy({ left: 250, behavior: 'smooth' });
                }
              }}
              disabled={!canScrollRight}
              className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-30 cursor-pointer transition-colors shadow-2xs"
              title="Pan Right (250px)"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (mainTableContainerRef.current) {
                  mainTableContainerRef.current.scrollTo({ left: mainTableContainerRef.current.scrollWidth, behavior: 'smooth' });
                }
              }}
              disabled={!canScrollRight}
              className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-30 cursor-pointer transition-colors shadow-2xs"
              title="Last Column (Institute Share)"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Official TFC Fee Hub Print Isolation Portal (Targeted by window.print in Landscape A4) */}
      {showPrintPortal && typeof document !== 'undefined' && createPortal(
        <div id="print-tfc-portal" className="p-4 bg-white text-slate-900 font-sans">
          {/* Header Banner */}
          <div className="border-b-2 border-emerald-800 pb-3 mb-3 text-center">
            <h1 className="text-base font-black uppercase text-emerald-900 tracking-wide">
              Govt. Vocational Training Institute for Women, Samanabad Faisalabad
            </h1>
            <p className="text-xs font-bold text-slate-700">
              TEVTA Fee Collection (TFC) Bank Account # 6580027832200011 (Bank of Punjab)
            </p>
            <p className="text-xs font-black text-emerald-800 uppercase mt-0.5">
              {reportMode === 'DATE_WISE' ? 'Date Wise Receipts' : 'Month Wise Receipts'} &amp; Head-Wise Allocation Register
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2 px-2 border-t pt-1">
              <span><strong>Period:</strong> {activePeriodLabel}</span>
              <span>
                <strong>Course:</strong>{' '}
                {activeCourses.includes('ALL') || activeCourses.length === 0
                  ? 'All Courses'
                  : activeCourses.map((c) => COURSE_TITLE_MAP[c] || c).join(', ')}
              </span>
              <span><strong>Total Paid Challans:</strong> {filteredChallans.length} ({rows.length} {reportMode === 'DATE_WISE' ? 'Days' : 'Months'})</span>
              <span><strong>Generated:</strong> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-[9px] border-collapse border border-slate-400">
            <thead>
              <tr className="bg-emerald-800 text-white font-bold text-center">
                <th className="border border-slate-400 p-1">Sr #</th>
                <th className="border border-slate-400 p-1">{reportMode === 'DATE_WISE' ? 'Receipt Date' : 'Month'}</th>
                <th className="border border-slate-400 p-1">Adm / Reg</th>
                <th className="border border-slate-400 p-1">25% PF</th>
                <th className="border border-slate-400 p-1">Total TEVTA (HO)</th>
                <th className="border border-slate-400 p-1">75% PF</th>
                <th className="border border-slate-400 p-1">College Security</th>
                <th className="border border-slate-400 p-1">Board Charges</th>
                <th className="border border-slate-400 p-1">Short Course</th>
                <th className="border border-slate-400 p-1">Bank Profit / Other</th>
                <th className="border border-slate-400 p-1">Sub Total</th>
                <th className="border border-slate-400 p-1">Total Per Day</th>
                <th className="border border-slate-400 p-1">Institute Share</th>
              </tr>
            </thead>
            <tbody>
              {isTradeWiseGrouped ? (
                tradeGroups.map((group) => (
                  <React.Fragment key={`print-trade-${group.tradeCode}`}>
                    <tr className="bg-emerald-100/70 font-bold">
                      <td colSpan={13} className="border border-slate-400 p-1 text-left">
                        <strong>{group.tradeCode} - {group.tradeTitle}</strong> ({group.challanCount} trainees, {group.dateRows.length} collection dates)
                      </td>
                    </tr>
                    {group.dateRows.map((r, idx) => (
                      <tr key={r.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-300 p-1 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold">{r.label}</td>
                        <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.admissionTuitionRegFee, false)}</td>
                        <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.pupilFee25Percent, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-bold bg-slate-100">{formatPKR(r.breakdown.totalTevtaDues, false)}</td>
                        <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.pupilFee75Percent, false)}</td>
                        <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.collegeSecurity, false)}</td>
                        <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.boardCharges, false)}</td>
                        <td className="border border-slate-300 p-1 text-right">{r.breakdown.shortCourseSelfFinance > 0 ? formatPKR(r.breakdown.shortCourseSelfFinance, false) : '-'}</td>
                        <td className="border border-slate-300 p-1 text-right">{r.breakdown.bankProfit > 0 ? formatPKR(r.breakdown.bankProfit, false) : '-'}</td>
                        <td className="border border-slate-300 p-1 text-right font-bold bg-slate-100">{formatPKR(r.breakdown.subTotalInstituteShare, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-black bg-cyan-50">{formatPKR(r.breakdown.totalAmountReceived, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-bold bg-indigo-50">{formatPKR(r.breakdown.instituteShare, false)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold text-[8.5px]">
                      <td colSpan={2} className="border border-slate-400 p-1 text-center font-black">
                        Subtotal ({group.tradeCode})
                      </td>
                      <td className="border border-slate-400 p-1 text-right">{formatPKR(group.subtotal.admissionTuitionRegFee, false)}</td>
                      <td className="border border-slate-400 p-1 text-right">{formatPKR(group.subtotal.pupilFee25Percent, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-bold">{formatPKR(group.subtotal.totalTevtaDues, false)}</td>
                      <td className="border border-slate-400 p-1 text-right">{formatPKR(group.subtotal.pupilFee75Percent, false)}</td>
                      <td className="border border-slate-400 p-1 text-right">{formatPKR(group.subtotal.collegeSecurity, false)}</td>
                      <td className="border border-slate-400 p-1 text-right">{formatPKR(group.subtotal.boardCharges, false)}</td>
                      <td className="border border-slate-400 p-1 text-right">{group.subtotal.shortCourseSelfFinance > 0 ? formatPKR(group.subtotal.shortCourseSelfFinance, false) : '-'}</td>
                      <td className="border border-slate-400 p-1 text-right">{group.subtotal.bankProfit > 0 ? formatPKR(group.subtotal.bankProfit, false) : '-'}</td>
                      <td className="border border-slate-400 p-1 text-right font-bold">{formatPKR(group.subtotal.subTotalInstituteShare, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-black">Rs. {formatPKR(group.subtotal.totalAmountReceived, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-bold">Rs. {formatPKR(group.subtotal.instituteShare, false)}</td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 p-1 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-300 p-1 text-center font-bold">{r.label}</td>
                    <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.admissionTuitionRegFee, false)}</td>
                    <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.pupilFee25Percent, false)}</td>
                    <td className="border border-slate-300 p-1 text-right font-bold bg-slate-100">{formatPKR(r.breakdown.totalTevtaDues, false)}</td>
                    <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.pupilFee75Percent, false)}</td>
                    <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.collegeSecurity, false)}</td>
                    <td className="border border-slate-300 p-1 text-right">{formatPKR(r.breakdown.boardCharges, false)}</td>
                    <td className="border border-slate-300 p-1 text-right">{r.breakdown.shortCourseSelfFinance > 0 ? formatPKR(r.breakdown.shortCourseSelfFinance, false) : '-'}</td>
                    <td className="border border-slate-300 p-1 text-right">{r.breakdown.bankProfit > 0 ? formatPKR(r.breakdown.bankProfit, false) : '-'}</td>
                    <td className="border border-slate-300 p-1 text-right font-bold bg-slate-100">{formatPKR(r.breakdown.subTotalInstituteShare, false)}</td>
                    <td className="border border-slate-300 p-1 text-right font-black bg-cyan-50">{formatPKR(r.breakdown.totalAmountReceived, false)}</td>
                    <td className="border border-slate-300 p-1 text-right font-bold bg-indigo-50">{formatPKR(r.breakdown.instituteShare, false)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 font-bold text-slate-950">
                <td className="border border-slate-400 p-1 text-center font-black" colSpan={2}>
                  Grand Total ({rows.length} {reportMode === 'DATE_WISE' ? 'Days' : 'Months'})
                </td>
                <td className="border border-slate-400 p-1 text-right">{formatPKR(grandTotal.admissionTuitionRegFee, false)}</td>
                <td className="border border-slate-400 p-1 text-right">{formatPKR(grandTotal.pupilFee25Percent, false)}</td>
                <td className="border border-slate-400 p-1 text-right font-black bg-slate-300">{formatPKR(grandTotal.totalTevtaDues, false)}</td>
                <td className="border border-slate-400 p-1 text-right">{formatPKR(grandTotal.pupilFee75Percent, false)}</td>
                <td className="border border-slate-400 p-1 text-right">{formatPKR(grandTotal.collegeSecurity, false)}</td>
                <td className="border border-slate-400 p-1 text-right">{formatPKR(grandTotal.boardCharges, false)}</td>
                <td className="border border-slate-400 p-1 text-right">{grandTotal.shortCourseSelfFinance > 0 ? formatPKR(grandTotal.shortCourseSelfFinance, false) : '-'}</td>
                <td className="border border-slate-400 p-1 text-right">{grandTotal.bankProfit > 0 ? formatPKR(grandTotal.bankProfit, false) : '-'}</td>
                <td className="border border-slate-400 p-1 text-right font-black bg-slate-300">{formatPKR(grandTotal.subTotalInstituteShare, false)}</td>
                <td className="border border-slate-400 p-1 text-right font-black bg-cyan-100">Rs. {formatPKR(grandTotal.totalAmountReceived, false)}</td>
                <td className="border border-slate-400 p-1 text-right font-black bg-indigo-100">Rs. {formatPKR(grandTotal.instituteShare, false)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="mt-8 pt-4 grid grid-cols-3 gap-6 text-center text-xs text-slate-800">
            <div>
              <div className="font-bold border-t border-slate-400 pt-1 uppercase">KASHIF ZIA</div>
              <div className="text-[10px] text-slate-600 font-medium">Accountant / Prepared by:</div>
            </div>
            <div>
              <div className="font-bold border-t border-slate-400 pt-1 uppercase">ANEEBA JAMIL</div>
              <div className="text-[10px] text-slate-600 font-medium">CO-Signatory / Checked by:</div>
            </div>
            <div>
              <div className="font-bold border-t border-slate-400 pt-1 uppercase">SHAZIA KHADIM</div>
              <div className="text-[10px] text-slate-600 font-medium">Acting Principal / DDO / Approved by:</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
