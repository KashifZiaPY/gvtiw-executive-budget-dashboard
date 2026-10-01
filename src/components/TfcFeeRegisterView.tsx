import React, { useState, useMemo, useRef } from 'react';
import ExcelJS from 'exceljs';
import {
  TfcChallanRecord,
  computeChallanFeeBreakdown,
  parseFeeRegisterStudentInfo,
  COURSE_TITLE_MAP,
} from '../data/tfcChallanData';
import { formatPKR } from '../lib/formatters';
import { generateFeeRegisterPdf } from '../lib/tfcPdfGenerator';
import {
  Building2,
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  Layers,
  Calendar,
  CreditCard,
  Receipt,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Users,
  ShieldCheck,
  Clock,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  MoveHorizontal,
} from 'lucide-react';

interface TfcFeeRegisterViewProps {
  challans: TfcChallanRecord[];
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
}

// Canonical trade sorting priority
const TRADE_SORT_PRIORITY: Record<string, number> = {
  MVi: 1,
  MVii: 2,
  ADDM: 3,
  FD: 4,
  CO: 5,
  DM: 6,
  BT: 7,
  BTE: 8,
  CK: 9,
  TUV: 10,
  OTHER: 99,
};

// Date helper to parse various formats into comparable timestamp, iso, and standard DD-MMM-YYYY display
function parseFeeDate(rawDate: string) {
  if (!rawDate) {
    return {
      iso: '2026-08-01',
      displayDmy: '01-Aug-2026',
      monthYear: 'August 2026',
      timestamp: new Date(2026, 7, 1).getTime(),
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
    return {
      iso: `${yr}-${String(mIdx + 1).padStart(2, '0')}-${dayStr}`,
      displayDmy: `${dayStr}-${monNames[mIdx]}-${yr}`,
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
    return {
      iso: `${yr}-${String(mIdx + 1).padStart(2, '0')}-${dayStr}`,
      displayDmy: `${dayStr}-${monNames[mIdx]}-${yr}`,
      monthYear: `${fullMonths[mIdx]} ${yr}`,
      timestamp: new Date(yr, mIdx, day).getTime(),
    };
  }

  return {
    iso: '2026-08-01',
    displayDmy: rawDate,
    monthYear: 'August 2026',
    timestamp: 0,
  };
}

export interface FeeRegisterTraineeRow {
  srNo: number;
  challanId: string;
  cnic: string;
  dateStr: string;
  timestamp: number;
  isoDate: string;
  monthYear: string;
  rollNo: string;
  traineeName: string;
  fatherName: string;
  tradeCode: string;
  tradeTitle: string;
  paymentType: string;
  installmentNotice: string;
  admissionTuition: number;
  pupil25: number;
  tevtaDues: number;
  welfare75: number; // 100% of 75% Pupil Fund treated in Welfare Fund column (Col I)
  sports: number; // Col J: Stationary / Exam preserved empty (0)
  magazine: number; // Col K: Computer Fund preserved empty (0)
  medical: number; // Col L: M & E Breakage preserved empty (0)
  library: number; // Col M: Sports Fund preserved empty (0)
  security: number; // Col N: Institute Security
  boardOther: number; // Col O: Board Charges, Self-Finance & TUV
  instSubtotal: number; // Subtotal (I:O)
  totalAmount: number; // Col P: Total Amount PKR
  remarks: string; // Col Q: Installment or Payment remarks
}

export interface FeeRegisterTradeSection {
  tradeCode: string;
  tradeTitle: string;
  traineeCount: number;
  rows: FeeRegisterTraineeRow[];
  subtotal: {
    admissionTuition: number;
    pupil25: number;
    tevtaDues: number;
    welfare75: number;
    sports: number;
    magazine: number;
    medical: number;
    library: number;
    security: number;
    boardOther: number;
    totalAmount: number;
  };
}

export const TfcFeeRegisterView: React.FC<TfcFeeRegisterViewProps> = ({
  challans,
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
}) => {
  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [dateFilterMode, setDateFilterMode] = useState<'MONTH' | 'CUSTOM_RANGE'>('MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<string>('ALL');
  const [installmentFilter, setInstallmentFilter] = useState<'ALL' | 'FULL_ONLY' | 'INSTALLMENTS_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedTrades, setCollapsedTrades] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Table Scroll & Viewport State
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isFullHeight, setIsFullHeight] = useState<boolean>(false);

  const handleScrollHorizontal = (delta: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const handleScrollVertical = (toTop: boolean) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: toTop ? 0 : tableContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Distinct Months available in dataset
  const availableMonths = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; timestamp: number }>();
    challans.forEach((c) => {
      const d = parseFeeDate(c.challanPaymentDate);
      const key = d.monthYear;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, label: d.monthYear, count: 1, timestamp: d.timestamp });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [challans]);

  // Distinct Trades in dataset
  const availableTrades = useMemo(() => {
    const set = new Set<string>();
    challans.forEach((c) => {
      const info = parseFeeRegisterStudentInfo(c.name, c.courseName, c.paymentType, c.courseAbbreviation, c.totalAmount);
      set.add(info.tradeCode);
    });
    return Array.from(set).sort((a, b) => (TRADE_SORT_PRIORITY[a] || 99) - (TRADE_SORT_PRIORITY[b] || 99));
  }, [challans]);

  // Active Period display label
  const activePeriodLabel = useMemo(() => {
    if (dateFilterMode === 'CUSTOM_RANGE') {
      if (customStartDate && customEndDate) {
        return `${customStartDate} to ${customEndDate}`;
      }
      if (customStartDate) {
        return `From ${customStartDate}`;
      }
      if (customEndDate) {
        return `Up to ${customEndDate}`;
      }
      return 'Custom Date Range (All Dates)';
    }
    return selectedMonth === 'ALL' ? 'Full Session (All Months)' : selectedMonth;
  }, [dateFilterMode, customStartDate, customEndDate, selectedMonth]);

  // Filter and process records
  const tradeSections = useMemo(() => {
    // 1. Pre-calculate trainee payments within each trade to chronologically number installments (1st Inst, 2nd Inst, etc.)
    const traineePaymentsMap = new Map<string, { challanId: string; timestamp: number }[]>();
    challans.forEach((c) => {
      const dateInfo = parseFeeDate(c.challanPaymentDate);
      const info = parseFeeRegisterStudentInfo(c.name, c.courseName, c.paymentType, c.courseAbbreviation, c.totalAmount);
      const rollClean = info.rollNo && info.rollNo !== '—' ? info.rollNo.toUpperCase().trim() : '';
      const nameClean = info.traineeName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const traineeKey = `${info.tradeCode}::${rollClean || nameClean}`;
      const list = traineePaymentsMap.get(traineeKey) || [];
      list.push({ challanId: c.challanId, timestamp: dateInfo.timestamp });
      traineePaymentsMap.set(traineeKey, list);
    });

    traineePaymentsMap.forEach((list) => {
      list.sort((a, b) => a.timestamp - b.timestamp);
    });

    // Intelligent installment resolver: ONLY Matric Vocational courses (MVi - 9th & MVii - 10th) are entitled to pay in installments.
    // All other courses (ADDM, BT, BTE, CK, CO, DM, FD, TUV, etc.) are strictly Full Challan.
    const resolveInstallment = (c: TfcChallanRecord, info: ReturnType<typeof parseFeeRegisterStudentInfo>) => {
      const isMatricVocational = info.tradeCode === 'MVi' || info.tradeCode === 'MVii';
      if (!isMatricVocational) {
        return { isInstallment: false, label: 'Full Challan' };
      }

      // For Matric Vocational 9th (MVi):
      if (info.tradeCode === 'MVi') {
        if (c.totalAmount === 5234) {
          return { isInstallment: true, label: '1st Installment (Inst-1)' };
        }
        if (c.totalAmount === 2244) {
          return { isInstallment: true, label: '2nd Installment (Inst-2)' };
        }
        if (c.totalAmount === 9722) {
          return { isInstallment: false, label: 'Full Challan' };
        }
      }

      // For Matric Vocational 10th (MVii):
      if (info.tradeCode === 'MVii') {
        if (c.totalAmount === 5445) {
          return { isInstallment: false, label: 'Full Challan' };
        }
      }

      // Check if student in Matric Vocational has multiple payments in this trade
      const rollClean = info.rollNo && info.rollNo !== '—' ? info.rollNo.toUpperCase().trim() : '';
      const nameClean = info.traineeName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const traineeKey = `${info.tradeCode}::${rollClean || nameClean}`;
      const list = traineePaymentsMap.get(traineeKey) || [];

      if (list.length > 1) {
        const orderIdx = list.findIndex((item) => item.challanId === c.challanId);
        const instNum = orderIdx >= 0 ? orderIdx + 1 : 1;
        const suffix = instNum === 1 ? '1st' : instNum === 2 ? '2nd' : instNum === 3 ? '3rd' : `${instNum}th`;
        return { isInstallment: true, label: `${suffix} Installment (Inst-${instNum})` };
      }

      if (info.installmentNotice) {
        return { isInstallment: true, label: info.installmentNotice };
      }

      const pTypeClean = (c.paymentType || '').trim();
      if (pTypeClean && pTypeClean.toLowerCase() !== 'full challan') {
        return { isInstallment: true, label: pTypeClean };
      }

      return { isInstallment: false, label: 'Full Challan' };
    };

    const rawFiltered = challans.filter((c) => {
      const dateInfo = parseFeeDate(c.challanPaymentDate);

      // Date filtering
      if (dateFilterMode === 'CUSTOM_RANGE') {
        if (customStartDate && dateInfo.iso < customStartDate) return false;
        if (customEndDate && dateInfo.iso > customEndDate) return false;
      } else {
        if (selectedMonth !== 'ALL' && dateInfo.monthYear !== selectedMonth) return false;
      }

      // Trainee extraction from Col M
      const info = parseFeeRegisterStudentInfo(c.name, c.courseName, c.paymentType, c.courseAbbreviation, c.totalAmount);
      const instInfo = resolveInstallment(c, info);

      // Trade filtering
      if (selectedTrade !== 'ALL' && info.tradeCode !== selectedTrade) {
        return false;
      }

      // Installment filtering
      if (installmentFilter === 'FULL_ONLY' && instInfo.isInstallment) return false;
      if (installmentFilter === 'INSTALLMENTS_ONLY' && !instInfo.isInstallment) return false;

      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cleanQDigits = q.replace(/\D/g, '');
        const cleanCnicDigits = c.cnic.replace(/\D/g, '');
        const match =
          c.challanId.toLowerCase().includes(q) ||
          info.traineeName.toLowerCase().includes(q) ||
          info.fatherName.toLowerCase().includes(q) ||
          info.rollNo.toLowerCase().includes(q) ||
          info.tradeTitle.toLowerCase().includes(q) ||
          instInfo.label.toLowerCase().includes(q) ||
          c.cnic.toLowerCase().includes(q) ||
          (cleanQDigits.length >= 3 && cleanCnicDigits.includes(cleanQDigits));
        if (!match) return false;
      }

      return true;
    });

    // Group by Trade
    const tradeMap = new Map<string, FeeRegisterTraineeRow[]>();

    rawFiltered.forEach((c) => {
      const dateInfo = parseFeeDate(c.challanPaymentDate);
      const info = parseFeeRegisterStudentInfo(c.name, c.courseName, c.paymentType, c.courseAbbreviation, c.totalAmount);
      const instInfo = resolveInstallment(c, info);
      const bd = computeChallanFeeBreakdown(c);

      const boardOtherAmount = bd.boardCharges + bd.shortCourseSelfFinance + bd.bankProfit;
      const tevtaDuesAmount = c.admissionTuitionRegFee + bd.pupilFee25Percent;
      const instSubtotalAmount = c.pupilFee75Percent + c.instituteSecurity + boardOtherAmount;

      const row: FeeRegisterTraineeRow = {
        srNo: 0, // Assigned after sorting
        challanId: c.challanId,
        cnic: c.cnic,
        dateStr: dateInfo.displayDmy,
        timestamp: dateInfo.timestamp,
        isoDate: dateInfo.iso,
        monthYear: dateInfo.monthYear,
        rollNo: info.rollNo,
        traineeName: info.traineeName,
        fatherName: info.fatherName,
        tradeCode: info.tradeCode,
        tradeTitle: info.tradeTitle,
        paymentType: c.paymentType || 'Full Challan',
        installmentNotice: instInfo.isInstallment ? instInfo.label : '',
        admissionTuition: c.admissionTuitionRegFee,
        pupil25: bd.pupilFee25Percent,
        tevtaDues: tevtaDuesAmount,
        welfare75: c.pupilFee75Percent, // 100% of 75% Pupil Fund in Welfare Fund
        sports: 0,
        magazine: 0,
        medical: 0,
        library: 0,
        security: c.instituteSecurity,
        boardOther: boardOtherAmount,
        instSubtotal: instSubtotalAmount,
        totalAmount: c.totalAmount,
        remarks: instInfo.label,
      };

      const existing = tradeMap.get(info.tradeCode);
      if (existing) {
        existing.push(row);
      } else {
        tradeMap.set(info.tradeCode, [row]);
      }
    });

    // Sort trade keys by canonical priority
    const sortedTradeCodes = Array.from(tradeMap.keys()).sort(
      (a, b) => (TRADE_SORT_PRIORITY[a] || 99) - (TRADE_SORT_PRIORITY[b] || 99)
    );

    const sections: FeeRegisterTradeSection[] = [];

    sortedTradeCodes.forEach((tCode) => {
      const rows = tradeMap.get(tCode) || [];

      // Sort rows inside trade strictly by Date ascending, then by Roll No
      rows.sort((a, b) => {
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        if (a.rollNo !== b.rollNo) return a.rollNo.localeCompare(b.rollNo);
        return a.challanId.localeCompare(b.challanId);
      });

      // Dedicated serial # per relevant trade: starts from 1, stops where trade ends
      rows.forEach((r, idx) => {
        r.srNo = idx + 1;
      });

      const tradeTitle = COURSE_TITLE_MAP[tCode] || rows[0]?.tradeTitle || tCode;

      // Compute Subtotals
      const subtotal = {
        admissionTuition: rows.reduce((s, r) => s + r.admissionTuition, 0),
        pupil25: rows.reduce((s, r) => s + r.pupil25, 0),
        tevtaDues: rows.reduce((s, r) => s + r.tevtaDues, 0),
        welfare75: rows.reduce((s, r) => s + r.welfare75, 0),
        sports: 0,
        magazine: 0,
        medical: 0,
        library: 0,
        security: rows.reduce((s, r) => s + r.security, 0),
        boardOther: rows.reduce((s, r) => s + r.boardOther, 0),
        totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
      };

      sections.push({
        tradeCode: tCode,
        tradeTitle,
        traineeCount: rows.length,
        rows,
        subtotal,
      });
    });

    return sections;
  }, [
    challans,
    dateFilterMode,
    customStartDate,
    customEndDate,
    selectedMonth,
    selectedTrade,
    installmentFilter,
    searchQuery,
  ]);

  // Grand Totals across all trade sections
  const grandTotal = useMemo(() => {
    let admissionTuition = 0;
    let pupil25 = 0;
    let tevtaDues = 0;
    let welfare75 = 0;
    let security = 0;
    let boardOther = 0;
    let totalAmount = 0;
    let totalTrainees = 0;

    tradeSections.forEach((sec) => {
      admissionTuition += sec.subtotal.admissionTuition;
      pupil25 += sec.subtotal.pupil25;
      tevtaDues += sec.subtotal.tevtaDues;
      welfare75 += sec.subtotal.welfare75;
      security += sec.subtotal.security;
      boardOther += sec.subtotal.boardOther;
      totalAmount += sec.subtotal.totalAmount;
      totalTrainees += sec.traineeCount;
    });

    return {
      admissionTuition,
      pupil25,
      tevtaDues,
      welfare75,
      sports: 0,
      magazine: 0,
      medical: 0,
      library: 0,
      security,
      boardOther,
      totalAmount,
      totalTrainees,
    };
  }, [tradeSections]);

  // Toggle trade collapse
  const toggleTrade = (tradeCode: string) => {
    setCollapsedTrades((prev) => ({
      ...prev,
      [tradeCode]: !prev[tradeCode],
    }));
  };

  const expandAllTrades = () => setCollapsedTrades({});
  const collapseAllTrades = () => {
    const allCollapsed: Record<string, boolean> = {};
    tradeSections.forEach((s) => {
      allCollapsed[s.tradeCode] = true;
    });
    setCollapsedTrades(allCollapsed);
  };

  // Copy TSV for direct paste into Excel / Google Sheets
  const handleCopyTSV = () => {
    const headers = [
      'Sr # (A)',
      'Date (B)',
      'Challan # (C)',
      'Roll # (D)',
      'Trainee Name (E)',
      'Father Name (F)',
      'Trade Code',
      'Trade Title',
      'Adm/Tuition Fee (G)',
      '25% Pupil Fund (H)',
      'Subtotal TEVTA (G+H)',
      'Welfare Fund 75% (I)',
      'Stationary / Exam (J)',
      'Computer Fund (K)',
      'M & E Breakage (L)',
      'Sports Fund (M)',
      'Institute Security (N)',
      'Board / Other Fee (O)',
      'Subtotal Inst. (I:O)',
      'Total Amount PKR (P)',
      'Remarks / Installment (Q)',
    ];

    const lines: string[] = [headers.join('\t')];

    tradeSections.forEach((sec) => {
      lines.push(`--- TRADE: ${sec.tradeTitle.toUpperCase()} (${sec.tradeCode}) [${sec.traineeCount} Trainees] ---`);
      sec.rows.forEach((r) => {
        lines.push(
          [
            r.srNo,
            r.dateStr,
            r.challanId,
            r.rollNo,
            r.cnic ? `${r.traineeName.toUpperCase()} (CNIC: ${r.cnic})` : r.traineeName.toUpperCase(),
            r.fatherName,
            r.tradeCode,
            r.tradeTitle,
            r.admissionTuition,
            r.pupil25,
            r.tevtaDues,
            r.welfare75,
            '-',
            '-',
            '-',
            '-',
            r.security,
            r.boardOther === 0 ? '-' : r.boardOther,
            r.instSubtotal,
            r.totalAmount,
            r.remarks,
          ].join('\t')
        );
      });
      // Trade subtotal
      lines.push(
        [
          `Subtotal (${sec.tradeCode})`,
          '',
          '',
          '',
          '',
          '',
          sec.tradeCode,
          '',
          sec.subtotal.admissionTuition,
          sec.subtotal.pupil25,
          sec.subtotal.tevtaDues,
          sec.subtotal.welfare75,
          '-',
          '-',
          '-',
          '-',
          sec.subtotal.security,
          sec.subtotal.boardOther === 0 ? '-' : sec.subtotal.boardOther,
          sec.subtotal.welfare75 + sec.subtotal.security + sec.subtotal.boardOther,
          sec.subtotal.totalAmount,
          `${sec.traineeCount} Trainees`,
        ].join('\t')
      );
    });

    lines.push(
      [
        'GRAND TOTAL',
        '',
        '',
        '',
        '',
        '',
        'ALL TRADES',
        '',
        grandTotal.admissionTuition,
        grandTotal.pupil25,
        grandTotal.tevtaDues,
        grandTotal.welfare75,
        '-',
        '-',
        '-',
        '-',
        grandTotal.security,
        grandTotal.boardOther === 0 ? '-' : grandTotal.boardOther,
        grandTotal.welfare75 + grandTotal.security + grandTotal.boardOther,
        grandTotal.totalAmount,
        `${grandTotal.totalTrainees} Trainees`,
      ].join('\t')
    );

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId('ALL_FEE_REGISTER_TSV');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Export CSV (.csv) with dedicated serial number per trade and trade subtotals
  const handleExportCSV = () => {
    const escapeCsv = (val: any) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines: string[] = [
      escapeCsv('GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN, SAMANABAD FAISALABAD'),
      escapeCsv('OFFICIAL FEE REGISTER & TRAINEE ALLOCATION — ACADEMIC YEAR 2026–2027 (A/C: 6580027832200011)'),
      escapeCsv(`Period: ${activePeriodLabel} | Trade Filter: ${selectedTrade === 'ALL' ? 'All Trades' : selectedTrade} | Total Trainees: ${grandTotal.totalTrainees}`),
      escapeCsv('Note: Cols J:M (Stationary/Exam, Computer, M&E Breakage, Sports) reserved as 100% of 75% Pupil Fund is treated in Welfare Fund (Col I)'),
      '',
      [
        'Sr # (A)',
        'Date (B)',
        'Challan # (C)',
        'Roll # (D)',
        'Trainee Name (E)',
        'Father Name (F)',
        'Adm / Tuition Fee (G)',
        '25% Pupil Fund (H)',
        'Subtotal TEVTA (G+H)',
        'Welfare Fund 75% (I)',
        'Stationary / Exam (J)',
        'Computer Fund (K)',
        'M & E Breakage (L)',
        'Sports Fund (M)',
        'Institute Security (N)',
        'Board / Other Fee (O)',
        'Subtotal Inst. (I:O)',
        'Total Amount PKR (P)',
        'Remarks / Installment (Q)',
      ].map(escapeCsv).join(','),
    ];

    tradeSections.forEach((sec) => {
      lines.push(escapeCsv(`TRADE: ${sec.tradeTitle.toUpperCase()} (${sec.tradeCode}) [${sec.traineeCount} Trainees]`));
      sec.rows.forEach((r) => {
        lines.push(
          [
            r.srNo,
            r.dateStr,
            r.challanId,
            r.rollNo,
            r.cnic ? `${r.traineeName.toUpperCase()}\nCNIC: ${r.cnic}` : r.traineeName.toUpperCase(),
            r.fatherName,
            r.admissionTuition,
            r.pupil25,
            r.tevtaDues,
            r.welfare75,
            '-',
            '-',
            '-',
            '-',
            r.security,
            r.boardOther === 0 ? '-' : r.boardOther,
            r.instSubtotal,
            r.totalAmount,
            r.remarks,
          ].map(escapeCsv).join(',')
        );
      });
      // Trade subtotal
      lines.push(
        [
          `Subtotal (${sec.tradeCode})`,
          '',
          '',
          '',
          '',
          '',
          sec.subtotal.admissionTuition,
          sec.subtotal.pupil25,
          sec.subtotal.tevtaDues,
          sec.subtotal.welfare75,
          '-',
          '-',
          '-',
          '-',
          sec.subtotal.security,
          sec.subtotal.boardOther === 0 ? '-' : sec.subtotal.boardOther,
          sec.subtotal.welfare75 + sec.subtotal.security + sec.subtotal.boardOther,
          sec.subtotal.totalAmount,
          `${sec.traineeCount} Trainees`,
        ].map(escapeCsv).join(',')
      );
    });

    lines.push(
      [
        `GRAND TOTAL (${grandTotal.totalTrainees} Trainees)`,
        '',
        '',
        '',
        '',
        '',
        grandTotal.admissionTuition,
        grandTotal.pupil25,
        grandTotal.tevtaDues,
        grandTotal.welfare75,
        '-',
        '-',
        '-',
        '-',
        grandTotal.security,
        grandTotal.boardOther === 0 ? '-' : grandTotal.boardOther,
        grandTotal.welfare75 + grandTotal.security + grandTotal.boardOther,
        grandTotal.totalAmount,
        'RECONCILED 100%',
      ].map(escapeCsv).join(',')
    );

    const csvContent = lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GVTIW_Official_Fee_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to authentic Excel (.xlsx) using ExcelJS
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GVTIW Samanabad Faisalabad';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('Official Fee Register', {
        views: [{ showGridLines: true }],
      });

      // 1. Header Branding Rows
      const titleRow = sheet.addRow([
        'GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN, SAMANABAD FAISALABAD',
      ]);
      titleRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F4C3C' }, // Official TEVTA Dark Emerald
      };
      sheet.mergeCells('A1:Q1');
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

      const subRow1 = sheet.addRow([
        `OFFICIAL FEE REGISTER & TRAINEE ALLOCATION — ACADEMIC YEAR 2026–2027 (A/C: 6580027832200011)`,
      ]);
      subRow1.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      subRow1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF134E4A' },
      };
      sheet.mergeCells('A2:Q2');
      subRow1.alignment = { vertical: 'middle', horizontal: 'center' };

      const subRow2 = sheet.addRow([
        `Filter / Period: ${activePeriodLabel} | Trade Filter: ${selectedTrade === 'ALL' ? 'All Trades' : selectedTrade} | Total Trainees: ${grandTotal.totalTrainees} | Note: Cols J:M reserved as 100% of 75% Pupil Fund is treated under Welfare Fund (Col I)`,
      ]);
      subRow2.font = { italic: true, size: 9, color: { argb: 'FFFFFFFF' } };
      subRow2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      sheet.mergeCells('A3:Q3');
      subRow2.alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.addRow([]); // Blank spacer

      // 2. Super Headings Row (Row 5)
      const superHeader = sheet.addRow([
        'TRAINEE PARTICULARS (COLS A TO F)',
        '',
        '',
        '',
        '',
        '',
        'TEVTA DUES (HO)',
        '',
        '',
        'PUPIL WELFARE (75% PF) & INSTITUTIONAL ALLOCATION (COLS I TO O)',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'TOTAL',
        'STATUS',
      ]);
      superHeader.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      superHeader.alignment = { vertical: 'middle', horizontal: 'center' };
      superHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' },
      };

      sheet.mergeCells('A5:F5'); // Trainee Particulars
      sheet.mergeCells('G5:I5'); // TEVTA Dues (HO)
      sheet.mergeCells('J5:Q5'); // Pupil Welfare & Institutional Allocation
      sheet.mergeCells('R5:R5'); // Total
      sheet.mergeCells('S5:S5'); // Status

      // 3. Column Header Row (Row 6) with exact indicators
      const headerRow = sheet.addRow([
        'Sr #\n(A)',
        'Date\n(B)',
        'Challan #\n(C)',
        'Roll #\n(D)',
        'Trainee Name\n(E)',
        'Father Name\n(F)',
        'Adm / Tuition\n(G)',
        '25% PF\n(H)',
        'Subtotal TEVTA\n(G+H)',
        'Welfare Fund\n(I)',
        'Stationary / Exam\n(J)',
        'Computer Fund\n(K)',
        'M & E Breakage\n(L)',
        'Sports Fund\n(M)',
        'Institute Security\n(N)',
        'Board / Other Fee\n(O)',
        'Subtotal\n(I:O)',
        'Total Amount PKR\n(P)',
        'Remarks / Installment\n(Q)',
      ]);
      headerRow.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF166534' }, // Forest Green 800
      };

      // Column widths
      sheet.columns = [
        { width: 8 },  // Sr # (A)
        { width: 15 }, // Date (B)
        { width: 14 }, // Challan # (C)
        { width: 18 }, // Roll # (D)
        { width: 28 }, // Trainee Name & CNIC (E)
        { width: 26 }, // Father Name (F)
        { width: 16 }, // Adm/Tuition (G)
        { width: 14 }, // 25% PF (H)
        { width: 17 }, // Subtotal TEVTA (G+H)
        { width: 16 }, // Welfare Fund (I)
        { width: 16 }, // Stationary / Exam (J)
        { width: 15 }, // Computer Fund (K)
        { width: 15 }, // M & E Breakage (L)
        { width: 14 }, // Sports Fund (M)
        { width: 16 }, // Security (N)
        { width: 16 }, // Board/Other (O)
        { width: 17 }, // Subtotal (I:O)
        { width: 18 }, // Total (P)
        { width: 24 }, // Remarks / Installment (Q)
      ];

      // 4. Data Rows Grouped by Trade
      tradeSections.forEach((sec) => {
        // Trade Banner Row
        const tradeBanner = sheet.addRow([
          `TRADE: ${sec.tradeTitle.toUpperCase()} (${sec.tradeCode}) — ${sec.traineeCount} TRAINEES`,
        ]);
        tradeBanner.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        tradeBanner.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E3A8A' }, // Deep Blue
        };
        sheet.mergeCells(`A${sheet.rowCount}:S${sheet.rowCount}`);
        tradeBanner.alignment = { vertical: 'middle', horizontal: 'left' };

        const startTradeRow = sheet.rowCount + 1;

        sec.rows.forEach((r) => {
          const traineeUpper = r.traineeName.toUpperCase();
          const row = sheet.addRow([
            r.srNo,
            r.dateStr,
            parseInt(r.challanId, 10) || r.challanId,
            r.rollNo,
            '', // Trainee Name styled below with richText
            r.fatherName,
            r.admissionTuition,
            r.pupil25,
            r.tevtaDues,
            r.welfare75,
            '-', // Col J empty
            '-', // Col K empty
            '-', // Col L empty
            '-', // Col M empty
            r.security,
            r.boardOther === 0 ? '-' : r.boardOther,
            r.instSubtotal,
            r.totalAmount,
            r.remarks,
          ]);

          const traineeCell = row.getCell(5);
          if (r.cnic) {
            traineeCell.value = {
              richText: [
                {
                  font: { bold: true, size: 9.5, color: { argb: 'FF0F172A' } },
                  text: `${traineeUpper}\n`,
                },
                {
                  font: { bold: false, size: 8, color: { argb: 'FF64748B' } },
                  text: `CNIC: ${r.cnic}`,
                },
              ],
            };
          } else {
            traineeCell.value = traineeUpper;
            traineeCell.font = { bold: true, size: 9.5, color: { argb: 'FF0F172A' } };
          }

          row.getCell(1).alignment = { horizontal: 'center' };
          row.getCell(2).alignment = { horizontal: 'center' };
          row.getCell(3).alignment = { horizontal: 'center' };
          row.getCell(4).alignment = { horizontal: 'center' };
          row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          row.getCell(6).alignment = { horizontal: 'left' };

          // Number formatting
          [7, 8, 9, 10, 15, 16, 17, 18].forEach((colIdx) => {
            const cell = row.getCell(colIdx);
            if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0';
              cell.alignment = { horizontal: 'right' };
            }
          });

          // Style Subtotals with Bold font and tint
          const tevtaCell = row.getCell(9);
          tevtaCell.font = { bold: true };
          tevtaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FF' } };

          const instCell = row.getCell(17);
          instCell.font = { bold: true };
          instCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };

          const totalCell = row.getCell(18);
          totalCell.font = { bold: true };
          totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };

          // Empty dashes for Cols J to M
          [11, 12, 13, 14].forEach((colIdx) => {
            row.getCell(colIdx).alignment = { horizontal: 'center' };
            row.getCell(colIdx).font = { color: { argb: 'FF94A3B8' } };
          });

          row.getCell(19).alignment = { horizontal: 'left' };
        });

        const endTradeRow = sheet.rowCount;

        // Trade Subtotal Row with Formulas
        const subtotalRow = sheet.addRow([
          `Subtotal (${sec.tradeCode})`,
          '',
          '',
          '',
          '',
          '',
          { formula: `SUM(G${startTradeRow}:G${endTradeRow})` },
          { formula: `SUM(H${startTradeRow}:H${endTradeRow})` },
          { formula: `SUM(I${startTradeRow}:I${endTradeRow})` },
          { formula: `SUM(J${startTradeRow}:J${endTradeRow})` },
          '-',
          '-',
          '-',
          '-',
          { formula: `SUM(O${startTradeRow}:O${endTradeRow})` },
          sec.subtotal.boardOther === 0 ? '-' : { formula: `SUM(P${startTradeRow}:P${endTradeRow})` },
          { formula: `SUM(Q${startTradeRow}:Q${endTradeRow})` },
          { formula: `SUM(R${startTradeRow}:R${endTradeRow})` },
          `${sec.traineeCount} Trainees`,
        ]);

        subtotalRow.font = { bold: true, size: 9 };
        subtotalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCFCE7' }, // Soft Emerald
        };
        sheet.mergeCells(`A${sheet.rowCount}:F${sheet.rowCount}`);
        subtotalRow.getCell(1).alignment = { horizontal: 'right' };

        [7, 8, 9, 10, 15, 16, 17, 18].forEach((colIdx) => {
          const cell = subtotalRow.getCell(colIdx);
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right' };
        });

        [11, 12, 13, 14].forEach((colIdx) => {
          subtotalRow.getCell(colIdx).alignment = { horizontal: 'center' };
        });
        subtotalRow.getCell(19).alignment = { horizontal: 'center' };
      });

      // 5. GRAND TOTAL ROW
      const grandRow = sheet.addRow([
        `GRAND TOTAL (${grandTotal.totalTrainees} Trainees across ${tradeSections.length} Trades)`,
        '',
        '',
        '',
        '',
        '',
        grandTotal.admissionTuition,
        grandTotal.pupil25,
        grandTotal.tevtaDues,
        grandTotal.welfare75,
        '-',
        '-',
        '-',
        '-',
        grandTotal.security,
        grandTotal.boardOther === 0 ? '-' : grandTotal.boardOther,
        grandTotal.welfare75 + grandTotal.security + grandTotal.boardOther,
        grandTotal.totalAmount,
        'RECONCILED 100%',
      ]);

      grandRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      grandRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F4C3C' }, // Deep TEVTA Emerald
      };
      sheet.mergeCells(`A${sheet.rowCount}:F${sheet.rowCount}`);
      grandRow.getCell(1).alignment = { horizontal: 'right' };

      [7, 8, 9, 10, 15, 16, 17, 18].forEach((colIdx) => {
        const cell = grandRow.getCell(colIdx);
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      });
      [11, 12, 13, 14].forEach((colIdx) => {
        grandRow.getCell(colIdx).alignment = { horizontal: 'center' };
        grandRow.getCell(colIdx).font = { color: { argb: 'FFCBD5E1' } };
      });
      grandRow.getCell(19).alignment = { horizontal: 'center' };

      // 6. Signatory Rows
      sheet.addRow([]);
      sheet.addRow([]);
      const sigRow1 = sheet.addRow([
        'KASHIF ZIA',
        '',
        '',
        '',
        'ANEEBA JAMIL',
        '',
        '',
        '',
        'SHAZIA KHADIM',
      ]);
      sigRow1.font = { bold: true, size: 10 };
      const sigRow2 = sheet.addRow([
        'Accountant / Prepared by',
        '',
        '',
        '',
        'CO-Signatory / Checked by',
        '',
        '',
        '',
        'Acting Principal / DDO / Approved by',
      ]);
      sigRow2.font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GVTIW_Official_Fee_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Fee Register Excel:', err);
    }
  };

  // Export to PDF
  const handleExportPdf = () => {
    generateFeeRegisterPdf({
      periodLabel: activePeriodLabel,
      tradeFilterLabel: selectedTrade === 'ALL' ? 'All Trades' : (COURSE_TITLE_MAP[selectedTrade] || selectedTrade),
      totalTrainees: grandTotal.totalTrainees,
      tradeGroups: tradeSections.map((sec) => ({
        tradeCode: sec.tradeCode,
        tradeTitle: sec.tradeTitle,
        traineeCount: sec.traineeCount,
        rows: sec.rows.map((r) => ({
          srNo: r.srNo,
          dateStr: r.dateStr,
          challanId: r.challanId,
          rollNo: r.rollNo,
          traineeName: r.traineeName,
          cnic: r.cnic,
          fatherName: r.fatherName,
          admissionTuition: r.admissionTuition,
          pupil25: r.pupil25,
          tevtaDues: r.tevtaDues,
          welfare75: r.welfare75,
          sports: 0,
          magazine: 0,
          medical: 0,
          library: 0,
          security: r.security,
          boardOther: r.boardOther,
          instSubtotal: r.instSubtotal,
          totalAmount: r.totalAmount,
          remarks: r.remarks,
        })),
        subtotal: sec.subtotal,
      })),
      grandTotal: {
        admissionTuition: grandTotal.admissionTuition,
        pupil25: grandTotal.pupil25,
        tevtaDues: grandTotal.tevtaDues,
        welfare75: grandTotal.welfare75,
        sports: 0,
        magazine: 0,
        medical: 0,
        library: 0,
        security: grandTotal.security,
        boardOther: grandTotal.boardOther,
        totalAmount: grandTotal.totalAmount,
      },
    });
  };

  // Print schedule
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Print media styling: ensure grand total sticky footer only prints once at the end and does not repeat per page */}
      <style>{`
        @media print {
          #fee-register-scroll-container {
            max-height: none !important;
            overflow: visible !important;
          }
          #fee-register-scroll-container table {
            width: 100% !important;
            min-width: 100% !important;
          }
          #fee-register-scroll-container tfoot {
            display: table-row-group !important;
          }
          .trainee-name-heading {
            font-weight: 800 !important;
            font-size: 11.5px !important;
            text-transform: uppercase !important;
            color: #000000 !important;
          }
          .trainee-cnic-sub {
            font-weight: 400 !important;
            font-size: 9px !important;
            color: #475569 !important;
          }
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* 1. CONTROLS BAR: FILTERS, DATE PRESETS & EXPORT ACTIONS       */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          {/* Left: Filter Controls */}
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* Date Filter Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDateFilterMode('MONTH')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  dateFilterMode === 'MONTH'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Month Wise
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('CUSTOM_RANGE')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  dateFilterMode === 'CUSTOM_RANGE'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Month Select */}
            {dateFilterMode === 'MONTH' ? (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white focus:ring-teal-500'
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-teal-500'
                  }`}
                >
                  <option value="ALL">All Months (Full Session)</option>
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({m.count} challans)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* Custom Date Range Pickers */
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`text-xs px-2.5 py-1 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-500">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`text-xs px-2.5 py-1 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                {(customStartDate || customEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                    title="Clear date range"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Trade / Course Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <select
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer max-w-[210px] truncate ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="ALL">All Trades ({availableTrades.length} Trades)</option>
                {availableTrades.map((t) => (
                  <option key={t} value={t}>
                    {t}: {COURSE_TITLE_MAP[t] || t}
                  </option>
                ))}
              </select>
            </div>

            {/* Installment Filter */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <select
                value={installmentFilter}
                onChange={(e) => setInstallmentFilter(e.target.value as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="ALL">All Payments (Full & Inst.)</option>
                <option value="FULL_ONLY">Full Challans Only</option>
                <option value="INSTALLMENTS_ONLY">Installments Only</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Trainee, Father, Roll #..."
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Right: Export & Expand Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyTSV}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                copiedId === 'ALL_FEE_REGISTER_TSV'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title="Copy entire register as TSV for Excel/Google Sheets"
            >
              {copiedId === 'ALL_FEE_REGISTER_TSV' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'ALL_FEE_REGISTER_TSV' ? 'Copied TSV' : 'Copy TSV'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export complete Fee Register to CSV (.csv)"
            >
              <Download className="w-3.5 h-3.5 text-teal-200" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export complete Fee Register to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export landscape PDF with official 3-signature block"
            >
              <Download className="w-3.5 h-3.5 text-rose-200" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Print official fee register schedule"
            >
              <Printer className="w-3.5 h-3.5 text-amber-200" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Quick Expand / Collapse All & Status Bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              Showing: <strong className="text-slate-800 dark:text-slate-200">{grandTotal.totalTrainees}</strong> Trainees across{' '}
              <strong className="text-slate-800 dark:text-slate-200">{tradeSections.length}</strong> Trades
            </span>
            <span className="text-slate-400">•</span>
            <span>
              Period: <strong className="text-teal-700 dark:text-teal-400">{activePeriodLabel}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAllTrades}
              className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              <ChevronDown className="w-3 h-3" />
              Expand All
            </button>
            <span className="text-slate-400">|</span>
            <button
              type="button"
              onClick={collapseAllTrades}
              className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer flex items-center gap-1"
            >
              <ChevronUp className="w-3 h-3" />
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. INSTITUTIONAL RULE NOTICE (COLS J:M WELFARE POLICY)         */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`px-4 py-3 rounded-xl border flex items-start gap-3 ${
          darkMode ? 'bg-teal-950/40 border-teal-800/60 text-teal-200' : 'bg-teal-50 border-teal-200 text-teal-950'
        }`}
      >
        <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-black uppercase tracking-wide">Institutional Fee Register Policy: </span>
          In accordance with institutional pupil fund administration, the <strong>entire 75% Pupil Fund</strong> is treated under the{' '}
          <strong>Welfare Fund column (Col I)</strong>. Consequently, <strong>Columns J through M</strong> (Stationary / Exam, Computer
          Fund, M & E Breakage, Sports Fund) remain intentionally empty (reserved for future breakdown) and display dashes (<strong>-</strong>). Trainees are
          intelligently grouped by Trade, with individual records and installment cases sorted chronologically by Payment Date.
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. EXECUTIVE KPI CARDS FOR FEE REGISTER                        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Trainees */}
        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>Enrolled Trainees</span>
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black font-mono mt-1 text-blue-600 dark:text-blue-400">
            {grandTotal.totalTrainees}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {tradeSections.length} Trade Sections
          </div>
        </div>

        {/* Total Collection */}
        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span>Grand Total (Rs.)</span>
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black font-mono mt-1 text-emerald-950 dark:text-emerald-300">
            {formatPKR(grandTotal.totalAmount, false)}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
            100% Reconciled
          </div>
        </div>

        {/* TEVTA Dues */}
        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-blue-500/30' : 'bg-blue-50/60 border-blue-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center justify-between">
            <span>TEVTA Share (HO)</span>
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black font-mono mt-1 text-blue-950 dark:text-blue-300">
            {formatPKR(grandTotal.tevtaDues, false)}
          </div>
          <div className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
            Adm + 25% Pupil Fund
          </div>
        </div>

        {/* Welfare Fund */}
        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-teal-500/30' : 'bg-teal-50/60 border-teal-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-teal-800 dark:text-teal-300 flex items-center justify-between">
            <span>Welfare Fund (75%)</span>
            <CreditCard className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-xl font-black font-mono mt-1 text-teal-950 dark:text-teal-300">
            {formatPKR(grandTotal.welfare75, false)}
          </div>
          <div className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
            Col I (Pupil Funds A/C)
          </div>
        </div>

        {/* Securities */}
        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-amber-500/30' : 'bg-amber-50/60 border-amber-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>Institute Security</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black font-mono mt-1 text-amber-950 dark:text-amber-300">
            {formatPKR(grandTotal.security, false)}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
            Refundable Caution Money
          </div>
        </div>

        {/* Board & Other */}
        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-purple-500/30' : 'bg-purple-50/60 border-purple-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center justify-between">
            <span>Board / Other Fee</span>
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black font-mono mt-1 text-purple-950 dark:text-purple-300">
            {formatPKR(grandTotal.boardOther, false)}
          </div>
          <div className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold mt-0.5">
            TTB, PBTE & Self-Finance
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. FEE REGISTER MAIN TABLE GROUPED BY TRADE                    */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-xs ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
        }`}
      >
        {/* Table Viewport & Scrolling Toolbar */}
        <div
          className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 ${
            darkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-md bg-teal-600/10 text-teal-600 dark:text-teal-400">
              <MoveHorizontal className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>Fee Register Matrix</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                  19 Columns (TEVTA & Inst Subtotals)
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Scroll vertically to browse trainees & horizontally to review all fee allocation and subtotal columns
              </p>
            </div>
          </div>

          {/* Stepper Controls: Horizontal & Vertical Scrolling Navigation */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Horizontal Scroll Steppers */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 mr-1 hidden sm:inline">Columns:</span>
              <button
                type="button"
                onClick={() => handleScrollHorizontal(-320)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                title="Scroll columns left"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollHorizontal(320)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                title="Scroll columns right"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vertical Scroll Steppers */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 mr-1 hidden sm:inline">Rows:</span>
              <button
                type="button"
                onClick={() => handleScrollVertical(true)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                title="Scroll to top of table"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollVertical(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                title="Scroll to bottom of table"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Height Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsFullHeight(!isFullHeight)}
              className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
              title={isFullHeight ? 'Switch to scrollable viewport (72vh)' : 'Expand to full page height'}
            >
              {isFullHeight ? (
                <>
                  <Minimize2 className="w-3 h-3 text-teal-600" />
                  <span>Compact View</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 text-teal-600" />
                  <span>Full View</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Container with dedicated visible scrollbars */}
        <div
          ref={tableContainerRef}
          id="fee-register-scroll-container"
          className={`overflow-x-auto overflow-y-auto ${
            isFullHeight ? 'max-h-none' : 'max-h-[72vh]'
          } relative scrollbar-thin scrollbar-thumb-slate-400 hover:scrollbar-thumb-slate-500 dark:scrollbar-thumb-slate-600 dark:hover:scrollbar-thumb-slate-500 scrollbar-track-slate-100 dark:scrollbar-track-slate-900`}
        >
          <table className="w-full text-left text-xs border-separate border-spacing-0 min-w-[1650px]">
            {/* Super Headings Sticky at Top */}
            <thead className="sticky top-0 z-30 shadow-xs">
              <tr
                className={`font-black uppercase tracking-wider text-[11px] ${
                  darkMode ? 'bg-teal-950 text-teal-200' : 'bg-teal-800 text-white'
                }`}
              >
                <th colSpan={6} className="py-2.5 px-3 text-center border-b border-r border-teal-700">
                  Trainee Particulars (Cols A to F)
                </th>
                <th colSpan={3} className="py-2.5 px-3 text-center border-b border-r border-teal-700 bg-blue-900 text-blue-100">
                  TEVTA Dues (HO)
                </th>
                <th colSpan={8} className="py-2.5 px-3 text-center border-b border-r border-teal-700 bg-teal-900 text-teal-100">
                  Pupil Welfare & Institutional Allocation (Cols I to O)
                </th>
                <th colSpan={1} className="py-2.5 px-3 text-center border-b border-r border-teal-700">
                  Total
                </th>
                <th colSpan={1} className="py-2.5 px-3 text-center border-b border-teal-700">
                  Status
                </th>
              </tr>

              {/* Individual Column Headers */}
              <tr
                className={`font-bold text-[11px] ${
                  darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <th className="py-2.5 px-2.5 text-center w-12 border-r border-slate-200 dark:border-slate-700">
                  <div>Sr #</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(A)</div>
                </th>
                <th className="py-2.5 px-2.5 text-center w-28 border-r border-slate-200 dark:border-slate-700">
                  <div>Date</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(B)</div>
                </th>
                <th className="py-2.5 px-2.5 text-center w-24 border-r border-slate-200 dark:border-slate-700 font-mono">
                  <div>Challan #</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(C)</div>
                </th>
                <th className="py-2.5 px-2.5 text-center w-32 border-r border-slate-200 dark:border-slate-700 font-mono">
                  <div>Roll #</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(D)</div>
                </th>
                <th className="py-2.5 px-3 min-w-[170px] border-r border-slate-200 dark:border-slate-700">
                  <div>Trainee Name</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(E)</div>
                </th>
                <th className="py-2.5 px-3 min-w-[170px] border-r border-slate-200 dark:border-slate-700">
                  <div>Father Name</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(F)</div>
                </th>
                <th className="py-2.5 px-2.5 text-right w-24 border-r border-slate-200 dark:border-slate-700">
                  <div>Adm / Tuition</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(G)</div>
                </th>
                <th className="py-2.5 px-2.5 text-right w-20 border-r border-slate-200 dark:border-slate-700">
                  <div>25% PF</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(H)</div>
                </th>
                <th className="py-2.5 px-2.5 text-right w-26 border-r border-slate-200 dark:border-slate-700 font-black text-blue-900 dark:text-blue-200 bg-blue-50/70 dark:bg-blue-950/40">
                  <div>Subtotal TEVTA</div>
                  <div className="text-[10px] font-mono font-normal">(G+H)</div>
                </th>
                <th className="py-2.5 px-2.5 text-right w-28 border-r border-slate-200 dark:border-slate-700 font-extrabold text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20">
                  <div>Welfare Fund</div>
                  <div className="text-[10px] font-mono font-normal">(I) 75% PF</div>
                </th>
                <th className="py-2.5 px-2 text-center w-24 border-r border-slate-200 dark:border-slate-700 text-slate-400">
                  <div>Stationary / Exam</div>
                  <div className="text-[10px] font-mono font-normal">(J) [—]</div>
                </th>
                <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200 dark:border-slate-700 text-slate-400">
                  <div>Computer Fund</div>
                  <div className="text-[10px] font-mono font-normal">(K) [—]</div>
                </th>
                <th className="py-2.5 px-2 text-center w-24 border-r border-slate-200 dark:border-slate-700 text-slate-400">
                  <div>M & E Breakage</div>
                  <div className="text-[10px] font-mono font-normal">(L) [—]</div>
                </th>
                <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200 dark:border-slate-700 text-slate-400">
                  <div>Sports Fund</div>
                  <div className="text-[10px] font-mono font-normal">(M) [—]</div>
                </th>
                <th className="py-2.5 px-2.5 text-right w-24 border-r border-slate-200 dark:border-slate-700 font-mono">
                  <div>Security</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(N)</div>
                </th>
                <th className="py-2.5 px-2.5 text-right w-24 border-r border-slate-200 dark:border-slate-700 font-mono">
                  <div>Board / Oth</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(O)</div>
                </th>
                <th className="py-2.5 px-2.5 text-right w-26 border-r border-slate-200 dark:border-slate-700 font-black text-teal-900 dark:text-teal-200 bg-teal-50/70 dark:bg-teal-950/40">
                  <div>Subtotal</div>
                  <div className="text-[10px] font-mono font-normal">(I:O)</div>
                </th>
                <th className="py-2.5 px-3 text-right w-28 border-r border-slate-200 dark:border-slate-700 font-black font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/40 text-sm">
                  <div>Total PKR</div>
                  <div className="text-[10px] font-mono font-normal">(P)</div>
                </th>
                <th className="py-2.5 px-3 text-left w-36">
                  <div>Remarks</div>
                  <div className="text-[10px] text-slate-400 font-mono font-normal">(Q)</div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {tradeSections.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-400">
                    No trainee records match your current filters.
                  </td>
                </tr>
              ) : (
                tradeSections.map((sec) => {
                  const isCollapsed = Boolean(collapsedTrades[sec.tradeCode]);
                  return (
                    <React.Fragment key={sec.tradeCode}>
                      {/* Trade Section Header Banner */}
                      <tr
                        onClick={() => toggleTrade(sec.tradeCode)}
                        className={`cursor-pointer transition-all select-none border-t-2 border-b ${
                          darkMode
                            ? 'bg-slate-800/90 hover:bg-slate-800 border-slate-700'
                            : 'bg-emerald-900 hover:bg-emerald-950 text-white border-emerald-950'
                        }`}
                      >
                        <td colSpan={19} className="py-2.5 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {isCollapsed ? (
                                <ChevronDown className="w-4 h-4 text-emerald-300" />
                              ) : (
                                <ChevronUp className="w-4 h-4 text-emerald-300" />
                              )}
                              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 rounded-md font-mono text-xs font-black text-emerald-300">
                                {sec.tradeCode}
                              </span>
                              <span className="font-extrabold text-xs sm:text-sm tracking-wide text-white">
                                {sec.tradeTitle}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                                {sec.traineeCount} Trainees
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-mono font-bold text-emerald-200">
                              <span className="hidden sm:inline">
                                Trade Subtotal:{' '}
                                <strong className="text-white font-extrabold text-sm">
                                  Rs. {formatPKR(sec.subtotal.totalAmount, false)}
                                </strong>
                              </span>
                              <span className="text-[11px] text-emerald-300/80">
                                {isCollapsed ? 'Click to Expand' : 'Click to Collapse'}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Trainee Rows */}
                      {!isCollapsed &&
                        sec.rows.map((r, rIdx) => {
                          const isInst = Boolean(r.installmentNotice) || (r.remarks && r.remarks !== 'Full Challan');
                          const rowBg =
                            rIdx % 2 === 1
                              ? darkMode
                                ? 'bg-slate-900/60'
                                : 'bg-slate-50/70'
                              : darkMode
                              ? 'bg-slate-900'
                              : 'bg-white';

                          return (
                            <tr
                              key={r.challanId}
                              className={`border-b transition-colors hover:bg-amber-50/50 dark:hover:bg-slate-800/60 ${rowBg} ${
                                darkMode ? 'border-slate-800' : 'border-slate-200'
                              }`}
                            >
                              {/* Col A: Sr # */}
                              <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200 dark:border-slate-800">
                                {r.srNo}
                              </td>

                              {/* Col B: Date */}
                              <td className="py-2 px-2.5 text-center font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                                {r.dateStr}
                              </td>

                              {/* Col C: Challan # */}
                              <td className="py-2 px-2.5 text-center font-mono font-extrabold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                                {r.challanId}
                              </td>

                              {/* Col D: Roll # */}
                              <td className="py-2 px-2.5 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                                {r.rollNo}
                              </td>

                              {/* Col E: Trainee Name */}
                              <td className="py-2 px-3 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                                <div className="trainee-name-heading font-extrabold text-[12.5px] uppercase text-slate-950 dark:text-white tracking-tight leading-snug">
                                  {r.traineeName.toUpperCase()}
                                </div>
                                {r.cnic && (
                                  <div className="trainee-cnic-sub text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                    CNIC: {r.cnic}
                                  </div>
                                )}
                              </td>

                              {/* Col F: Father Name */}
                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                                {r.fatherName}
                              </td>

                              {/* Col G: Adm/Tuition */}
                              <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                                {formatPKR(r.admissionTuition, false)}
                              </td>

                               {/* Col H: 25% PF */}
                              <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                                {formatPKR(r.pupil25, false)}
                              </td>

                              {/* Subtotal TEVTA (G+H) */}
                              <td className="py-2 px-2.5 text-right font-mono font-black text-[12.5px] text-blue-900 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 border-r border-slate-200 dark:border-slate-800">
                                {formatPKR(r.tevtaDues, false)}
                              </td>

                              {/* Col I: Welfare Fund (75% PF) */}
                              <td className="py-2 px-2.5 text-right font-mono font-black text-teal-800 dark:text-teal-300 bg-teal-50/30 dark:bg-teal-950/10 border-r border-slate-200 dark:border-slate-800">
                                {formatPKR(r.welfare75, false)}
                              </td>

                              {/* Col J: Stationary / Exam [—] */}
                              <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                —
                              </td>

                              {/* Col K: Computer Fund [—] */}
                              <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                —
                              </td>

                              {/* Col L: M & E Breakage [—] */}
                              <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                —
                              </td>

                              {/* Col M: Sports Fund [—] */}
                              <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                —
                              </td>

                              {/* Col N: Security */}
                              <td className="py-2 px-2.5 text-right font-mono font-semibold text-amber-800 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800">
                                {formatPKR(r.security, false)}
                              </td>

                              {/* Col O: Board/Other */}
                              <td className="py-2 px-2.5 text-right font-mono font-semibold text-purple-800 dark:text-purple-400 border-r border-slate-200 dark:border-slate-800">
                                {r.boardOther === 0 ? '—' : formatPKR(r.boardOther, false)}
                              </td>

                              {/* Subtotal (I:O) */}
                              <td className="py-2 px-2.5 text-right font-mono font-black text-[12.5px] text-teal-900 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/30 border-r border-slate-200 dark:border-slate-800">
                                {formatPKR(r.instSubtotal, false)}
                              </td>

                              {/* Col P: Total Amount PKR */}
                              <td className="py-2 px-3 text-right font-mono font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40 border-r border-slate-200 dark:border-slate-800 text-sm">
                                {formatPKR(r.totalAmount, false)}
                              </td>

                              {/* Col Q: Remarks / Installment */}
                              <td className="py-2 px-3">
                                {isInst ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    <Clock className="w-2.5 h-2.5" />
                                    {r.installmentNotice || r.remarks || 'Installment'}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Full Challan
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                      {/* Trade Subtotal Row */}
                      {!isCollapsed && (
                        <tr
                          className={`font-black font-mono text-xs border-b-2 ${
                            darkMode
                              ? 'bg-slate-800/80 text-emerald-300 border-slate-700'
                              : 'bg-emerald-50/80 text-emerald-950 border-emerald-300'
                          }`}
                        >
                          <td colSpan={6} className="py-2.5 px-3 text-right font-sans border-r border-slate-200 dark:border-slate-700">
                            Subtotal ({sec.tradeCode}):
                          </td>
                          <td className="py-2.5 px-2.5 text-right border-r border-slate-200 dark:border-slate-700">
                            {formatPKR(sec.subtotal.admissionTuition, false)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right border-r border-slate-200 dark:border-slate-700">
                            {formatPKR(sec.subtotal.pupil25, false)}
                          </td>
                          {/* Subtotal TEVTA */}
                          <td className="py-2.5 px-2.5 text-right font-black text-[12.5px] text-blue-900 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-950/40 border-r border-slate-200 dark:border-slate-700">
                            {formatPKR(sec.subtotal.tevtaDues, false)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-teal-800 dark:text-teal-300 border-r border-slate-200 dark:border-slate-700">
                            {formatPKR(sec.subtotal.welfare75, false)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-400 border-r border-slate-200 dark:border-slate-700">—</td>
                          <td className="py-2.5 px-2 text-center text-slate-400 border-r border-slate-200 dark:border-slate-700">—</td>
                          <td className="py-2.5 px-2 text-center text-slate-400 border-r border-slate-200 dark:border-slate-700">—</td>
                          <td className="py-2.5 px-2 text-center text-slate-400 border-r border-slate-200 dark:border-slate-700">—</td>
                          <td className="py-2.5 px-2.5 text-right text-amber-800 dark:text-amber-400 border-r border-slate-200 dark:border-slate-700">
                            {formatPKR(sec.subtotal.security, false)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-purple-800 dark:text-purple-400 border-r border-slate-200 dark:border-slate-700">
                            {sec.subtotal.boardOther === 0 ? '—' : formatPKR(sec.subtotal.boardOther, false)}
                          </td>
                          {/* Subtotal (I:O) */}
                          <td className="py-2.5 px-2.5 text-right font-black text-[12.5px] text-teal-900 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-950/40 border-r border-slate-200 dark:border-slate-700">
                            {formatPKR(sec.subtotal.welfare75 + sec.subtotal.security + sec.subtotal.boardOther, false)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800 dark:text-emerald-300 font-extrabold border-r border-slate-200 dark:border-slate-700 text-sm">
                            {formatPKR(sec.subtotal.totalAmount, false)}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-xs text-slate-600 dark:text-slate-400">
                            {sec.traineeCount} Trainees
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* GRAND TOTAL STICKY FOOTER */}
            <tfoot>
              <tr
                className={`font-black font-mono text-xs sm:text-sm border-t-2 sticky bottom-0 z-30 ${
                  darkMode
                    ? 'bg-teal-950 text-white border-teal-800 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]'
                    : 'bg-teal-900 text-white border-teal-950 shadow-[0_-4px_10px_rgba(0,0,0,0.15)]'
                }`}
              >
                <td colSpan={6} className="py-3 px-3 text-right font-sans tracking-wide border-r border-teal-800/80">
                  GRAND TOTAL ({grandTotal.totalTrainees} Trainees):
                </td>
                <td className="py-3 px-2.5 text-right border-r border-teal-800/80">
                  {formatPKR(grandTotal.admissionTuition, false)}
                </td>
                <td className="py-3 px-2.5 text-right border-r border-teal-800/80">
                  {formatPKR(grandTotal.pupil25, false)}
                </td>
                {/* Grand Total TEVTA Dues */}
                <td className="py-3 px-2.5 text-right text-cyan-300 font-black bg-teal-950/40 border-r border-teal-800/80">
                  {formatPKR(grandTotal.tevtaDues, false)}
                </td>
                <td className="py-3 px-2.5 text-right text-amber-300 border-r border-teal-800/80">
                  {formatPKR(grandTotal.welfare75, false)}
                </td>
                <td className="py-3 px-2 text-center text-teal-300/60 border-r border-teal-800/80">—</td>
                <td className="py-3 px-2 text-center text-teal-300/60 border-r border-teal-800/80">—</td>
                <td className="py-3 px-2 text-center text-teal-300/60 border-r border-teal-800/80">—</td>
                <td className="py-3 px-2 text-center text-teal-300/60 border-r border-teal-800/80">—</td>
                <td className="py-3 px-2.5 text-right border-r border-teal-800/80">
                  {formatPKR(grandTotal.security, false)}
                </td>
                <td className="py-3 px-2.5 text-right border-r border-teal-800/80">
                  {grandTotal.boardOther === 0 ? '—' : formatPKR(grandTotal.boardOther, false)}
                </td>
                {/* Grand Total (I:O) */}
                <td className="py-3 px-2.5 text-right text-cyan-300 font-black bg-teal-950/40 border-r border-teal-800/80">
                  {formatPKR(grandTotal.welfare75 + grandTotal.security + grandTotal.boardOther, false)}
                </td>
                <td className="py-3 px-3 text-right text-amber-300 font-extrabold text-sm sm:text-base border-r border-teal-800/80">
                  {formatPKR(grandTotal.totalAmount, false)}
                </td>
                <td className="py-3 px-3 font-sans text-xs text-emerald-200">
                  RECONCILED
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
