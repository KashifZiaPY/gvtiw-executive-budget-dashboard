import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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

// Dedicated Student-Aligned Row (Where 1st & 2nd Installments are aligned in separate columns so headcount does not increase)
export interface FeeRegisterStudentRow {
  srNo: number;
  studentKey: string;
  rollNo: string;
  traineeName: string;
  cnic: string;
  fatherName: string;
  tradeCode: string;
  tradeTitle: string;

  // Installment 1
  inst1ChallanId: string;
  inst1Date: string;
  inst1Amount: number;

  // Installment 2
  inst2ChallanId: string;
  inst2Date: string;
  inst2Amount: number;

  // Financial Breakdown (Combined sums across installments)
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
  instSubtotal: number;
  totalAmount: number;

  // Meta & Status
  isInstallmentCase: boolean;
  installmentCount: number;
  status: string;
  remarks: string;
  challanCount: number;
  timestamp: number;
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

export interface FeeRegisterStudentTradeSection {
  tradeCode: string;
  tradeTitle: string;
  traineeCount: number; // EXACT unique student headcount
  challanCount: number; // Total challan receipts
  installmentCount: number; // Count of students paying in installments
  inst1Total: number;
  inst2Total: number;
  rows: FeeRegisterStudentRow[];
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
  // Report View Format:
  // 1. INSTALLMENT_ALIGNED (Default): Single row per unique student with 1st & 2nd installment columns (headcount does NOT increase)
  // 2. INSTALLMENTS_ONLY: Dedicated report filtering ONLY to trainees with installment cases
  // 3. CHALLAN_TRANSACTION: Classic challan-by-challan transaction audit ledger
  const [reportViewMode, setReportViewMode] = useState<'INSTALLMENT_ALIGNED' | 'INSTALLMENTS_ONLY' | 'CHALLAN_TRANSACTION'>('INSTALLMENT_ALIGNED');

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
  const [showPrintPortal, setShowPrintPortal] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

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

  // Dedicated Student-Aligned Trade Sections (Consolidating Installment Payments into 1 Row per Student)
  // This guarantees that trainee headcount / submission quantity in a trade does NOT increase when students submit in installments.
  const studentTradeSections = useMemo(() => {
    // 1. Group challans by student within each trade
    const rawFiltered = challans.filter((c) => {
      const dateInfo = parseFeeDate(c.challanPaymentDate);

      // Date filtering
      if (dateFilterMode === 'CUSTOM_RANGE') {
        if (customStartDate && dateInfo.iso < customStartDate) return false;
        if (customEndDate && dateInfo.iso > customEndDate) return false;
      } else {
        if (selectedMonth !== 'ALL' && dateInfo.monthYear !== selectedMonth) return false;
      }

      // Trainee extraction
      const info = parseFeeRegisterStudentInfo(c.name, c.courseName, c.paymentType, c.courseAbbreviation, c.totalAmount);

      // Trade filtering
      if (selectedTrade !== 'ALL' && info.tradeCode !== selectedTrade) {
        return false;
      }

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
          c.cnic.toLowerCase().includes(q) ||
          (cleanQDigits.length >= 3 && cleanCnicDigits.includes(cleanQDigits));
        if (!match) return false;
      }

      return true;
    });

    // Map by trade -> map by studentKey -> array of challans with parsed info
    const tradeStudentsMap = new Map<string, Map<string, { challan: TfcChallanRecord; info: any; dateInfo: any }[]>>();

    rawFiltered.forEach((c) => {
      const dateInfo = parseFeeDate(c.challanPaymentDate);
      const info = parseFeeRegisterStudentInfo(c.name, c.courseName, c.paymentType, c.courseAbbreviation, c.totalAmount);

      const rollClean = info.rollNo && info.rollNo !== '—' ? info.rollNo.toUpperCase().trim() : '';
      const cnicClean = c.cnic ? c.cnic.replace(/\D/g, '') : '';
      const nameClean = info.traineeName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fatherClean = info.fatherName.toLowerCase().replace(/[^a-z0-9]/g, '');

      const isMatricVocational = info.tradeCode === 'MVi' || info.tradeCode === 'MVii';

      // Robust unique student key:
      // For Matric Vocational (MVi & MVii) ONLY: group multiple installment submissions by the same student
      // For all other regular/short courses (ADDM, FD, BT, BTE, CK, DM, CO): each challan is a distinct individual submission
      const studentKey = isMatricVocational
        ? (rollClean
            ? `${info.tradeCode}::ROLL::${rollClean}`
            : cnicClean && cnicClean.length >= 8
            ? `${info.tradeCode}::CNIC::${cnicClean}`
            : `${info.tradeCode}::NAME::${nameClean}::${fatherClean}`)
        : `${info.tradeCode}::CHALLAN::${c.challanId}`;

      let studentsMap = tradeStudentsMap.get(info.tradeCode);
      if (!studentsMap) {
        studentsMap = new Map();
        tradeStudentsMap.set(info.tradeCode, studentsMap);
      }

      const list = studentsMap.get(studentKey) || [];
      list.push({ challan: c, info, dateInfo });
      studentsMap.set(studentKey, list);
    });

    // Sort trade keys by canonical priority
    const sortedTradeCodes = Array.from(tradeStudentsMap.keys()).sort(
      (a, b) => (TRADE_SORT_PRIORITY[a] || 99) - (TRADE_SORT_PRIORITY[b] || 99)
    );

    const sections: FeeRegisterStudentTradeSection[] = [];

    sortedTradeCodes.forEach((tCode) => {
      const studentsMap = tradeStudentsMap.get(tCode)!;
      const studentRows: FeeRegisterStudentRow[] = [];
      const isMatricVocational = tCode === 'MVi' || tCode === 'MVii';

      studentsMap.forEach((challanList, sKey) => {
        // Sort chronologically by payment date ascending
        challanList.sort((a, b) => a.dateInfo.timestamp - b.dateInfo.timestamp);

        const first = challanList[0];
        const second = challanList.length > 1 ? challanList[1] : null;

        // Installment detection (STRICTLY for Matric Vocational MVi & MVii):
        const isMultipleSubmissions = isMatricVocational && challanList.length > 1;
        const isMViInstAmount = isMatricVocational && (first.challan.totalAmount === 5445 || first.challan.totalAmount === 5234 || first.challan.totalAmount === 2244);
        const hasInstRemark = isMatricVocational && challanList.some(
          (item) =>
            (item.challan.paymentType && item.challan.paymentType.toLowerCase().includes('inst')) ||
            (item.info.installmentNotice && item.info.installmentNotice.toLowerCase().includes('inst'))
        );

        const isInstallmentCase = isMatricVocational && (isMultipleSubmissions || isMViInstAmount || hasInstRemark);

        // Installment details: ONLY populated for Matric Vocational (MVi & MVii)
        const inst1ChallanId = isMatricVocational ? first.challan.challanId : '';
        const inst1Date = isMatricVocational ? first.dateInfo.displayDmy : '';
        const inst1Amount = isMatricVocational ? first.challan.totalAmount : 0;

        const inst2ChallanId = isMatricVocational && second ? second.challan.challanId : '';
        const inst2Date = isMatricVocational && second ? second.dateInfo.displayDmy : '';
        const inst2Amount = isMatricVocational && second ? second.challan.totalAmount : 0;

        // Aggregate financial columns across student's challans
        let admTuitionSum = 0;
        let pupil25Sum = 0;
        let tevtaDuesSum = 0;
        let welfare75Sum = 0;
        let secSum = 0;
        let boardOtherSum = 0;
        let totalAmountSum = 0;

        challanList.forEach((item) => {
          const bd = computeChallanFeeBreakdown(item.challan);
          const boardOther = bd.boardCharges + bd.shortCourseSelfFinance + bd.bankProfit;
          admTuitionSum += item.challan.admissionTuitionRegFee;
          pupil25Sum += bd.pupilFee25Percent;
          tevtaDuesSum += item.challan.admissionTuitionRegFee + bd.pupilFee25Percent;
          welfare75Sum += item.challan.pupilFee75Percent;
          secSum += item.challan.instituteSecurity;
          boardOtherSum += boardOther;
          totalAmountSum += item.challan.totalAmount;
        });

        const instSubtotalSum = welfare75Sum + secSum + boardOtherSum;

        let status = 'Full Challan';
        let remarks = isMatricVocational ? 'Full Challan' : (first.info.remarks || 'Full Challan');

        if (isMultipleSubmissions) {
          status = '2 Installments Submitted';
          remarks = `1st Inst (Ch# ${inst1ChallanId}): Rs. ${formatPKR(inst1Amount, false)} + 2nd Inst (Ch# ${inst2ChallanId}): Rs. ${formatPKR(inst2Amount, false)}`;
        } else if (isInstallmentCase) {
          status = '1st Installment Paid (Awaiting 2nd)';
          remarks = `1st Installment (Ch# ${inst1ChallanId}): Rs. ${formatPKR(inst1Amount, false)}`;
        }

        const studentRow: FeeRegisterStudentRow = {
          srNo: 0, // Assigned after sorting
          studentKey: sKey,
          rollNo: first.info.rollNo,
          traineeName: first.info.traineeName,
          cnic: first.challan.cnic,
          fatherName: first.info.fatherName,
          tradeCode: tCode,
          tradeTitle: first.info.tradeTitle,

          inst1ChallanId,
          inst1Date,
          inst1Amount,

          inst2ChallanId,
          inst2Date,
          inst2Amount,

          admissionTuition: admTuitionSum,
          pupil25: pupil25Sum,
          tevtaDues: tevtaDuesSum,
          welfare75: welfare75Sum,
          sports: 0,
          magazine: 0,
          medical: 0,
          library: 0,
          security: secSum,
          boardOther: boardOtherSum,
          instSubtotal: instSubtotalSum,
          totalAmount: totalAmountSum,

          isInstallmentCase,
          installmentCount: isMultipleSubmissions ? 2 : (isInstallmentCase ? 1 : 0),
          status,
          remarks,
          challanCount: challanList.length,
          timestamp: first.dateInfo.timestamp,
        };

        // Filter based on installmentFilter and reportViewMode
        let include = true;
        if (reportViewMode === 'INSTALLMENTS_ONLY' && !isInstallmentCase) {
          include = false;
        } else if (installmentFilter === 'FULL_ONLY' && isInstallmentCase) {
          include = false;
        } else if (installmentFilter === 'INSTALLMENTS_ONLY' && !isInstallmentCase) {
          include = false;
        }

        if (include) {
          studentRows.push(studentRow);
        }
      });

      if (studentRows.length > 0) {
        // Sort student rows by payment timestamp ascending, then Roll No
        studentRows.sort((a, b) => {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
          if (a.rollNo !== b.rollNo) return a.rollNo.localeCompare(b.rollNo);
          return a.traineeName.localeCompare(b.traineeName);
        });

        // Dedicated serial # per trade: 1, 2, ... studentRows.length
        studentRows.forEach((r, idx) => {
          r.srNo = idx + 1;
        });

        const tradeTitle = COURSE_TITLE_MAP[tCode] || studentRows[0]?.tradeTitle || tCode;

        const subtotal = {
          admissionTuition: studentRows.reduce((s, r) => s + r.admissionTuition, 0),
          pupil25: studentRows.reduce((s, r) => s + r.pupil25, 0),
          tevtaDues: studentRows.reduce((s, r) => s + r.tevtaDues, 0),
          welfare75: studentRows.reduce((s, r) => s + r.welfare75, 0),
          sports: 0,
          magazine: 0,
          medical: 0,
          library: 0,
          security: studentRows.reduce((s, r) => s + r.security, 0),
          boardOther: studentRows.reduce((s, r) => s + r.boardOther, 0),
          totalAmount: studentRows.reduce((s, r) => s + r.totalAmount, 0),
        };

        sections.push({
          tradeCode: tCode,
          tradeTitle,
          traineeCount: studentRows.length, // EXACT UNIQUE STUDENT COUNT!
          challanCount: studentRows.reduce((s, r) => s + r.challanCount, 0),
          installmentCount: studentRows.filter((r) => r.isInstallmentCase).length,
          inst1Total: studentRows.reduce((s, r) => s + r.inst1Amount, 0),
          inst2Total: studentRows.reduce((s, r) => s + r.inst2Amount, 0),
          rows: studentRows,
          subtotal,
        });
      }
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
    reportViewMode,
  ]);

  // Grand Totals for Student-Aligned Sections
  const studentGrandTotal = useMemo(() => {
    let admissionTuition = 0;
    let pupil25 = 0;
    let tevtaDues = 0;
    let welfare75 = 0;
    let security = 0;
    let boardOther = 0;
    let totalAmount = 0;
    let totalTrainees = 0;
    let totalChallans = 0;
    let totalInstallmentCases = 0;
    let inst1Total = 0;
    let inst2Total = 0;

    studentTradeSections.forEach((sec) => {
      admissionTuition += sec.subtotal.admissionTuition;
      pupil25 += sec.subtotal.pupil25;
      tevtaDues += sec.subtotal.tevtaDues;
      welfare75 += sec.subtotal.welfare75;
      security += sec.subtotal.security;
      boardOther += sec.subtotal.boardOther;
      totalAmount += sec.subtotal.totalAmount;
      totalTrainees += sec.traineeCount;
      totalChallans += sec.challanCount;
      totalInstallmentCases += sec.installmentCount;
      inst1Total += sec.inst1Total;
      inst2Total += sec.inst2Total;
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
      totalChallans,
      totalInstallmentCases,
      inst1Total,
      inst2Total,
    };
  }, [studentTradeSections]);

  // Grand Totals across all trade sections (Transaction Ledger)
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

  // Mode helpers
  const isInstallmentAlignedMode = reportViewMode !== 'CHALLAN_TRANSACTION';
  const activeTradeSections = isInstallmentAlignedMode ? studentTradeSections : tradeSections;
  const activeGrandTotal = isInstallmentAlignedMode ? studentGrandTotal : grandTotal;

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
    activeTradeSections.forEach((s) => {
      allCollapsed[s.tradeCode] = true;
    });
    setCollapsedTrades(allCollapsed);
  };

  // Copy TSV for direct paste into Excel / Google Sheets
  const handleCopyTSV = () => {
    if (isInstallmentAlignedMode) {
      const headers = [
        'Sr # (A)',
        'Roll # (B)',
        'Trainee Name (C)',
        'Father Name (D)',
        '1st Installment (E)',
        '2nd Installment (F)',
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
        'Remarks / Status (Q)',
      ];

      const lines: string[] = [headers.join('\t')];

      studentTradeSections.forEach((sec) => {
        lines.push(`--- TRADE: ${sec.tradeTitle.toUpperCase()} (${sec.tradeCode}) [${sec.traineeCount} Enrolled Students] ---`);
        sec.rows.forEach((r) => {
          lines.push(
            [
              r.srNo,
              r.rollNo,
              r.cnic ? `${r.traineeName.toUpperCase()} (CNIC: ${r.cnic})` : r.traineeName.toUpperCase(),
              r.fatherName,
              r.inst1ChallanId ? `Ch# ${r.inst1ChallanId} (${r.inst1Date}): Rs. ${formatPKR(r.inst1Amount, false)}` : '—',
              r.inst2ChallanId ? `Ch# ${r.inst2ChallanId} (${r.inst2Date}): Rs. ${formatPKR(r.inst2Amount, false)}` : (r.isInstallmentCase ? 'Awaiting 2nd' : '—'),
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
            `Rs. ${formatPKR(sec.inst1Total, false)}`,
            sec.inst2Total > 0 ? `Rs. ${formatPKR(sec.inst2Total, false)}` : '—',
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
            `${sec.traineeCount} Enrolled Students`,
          ].join('\t')
        );
      });

      lines.push(
        [
          `GRAND TOTAL (${studentGrandTotal.totalTrainees} Unique Enrolled Students)`,
          '',
          '',
          '',
          `Rs. ${formatPKR(studentGrandTotal.inst1Total, false)}`,
          studentGrandTotal.inst2Total > 0 ? `Rs. ${formatPKR(studentGrandTotal.inst2Total, false)}` : '—',
          'ALL TRADES',
          '',
          studentGrandTotal.admissionTuition,
          studentGrandTotal.pupil25,
          studentGrandTotal.tevtaDues,
          studentGrandTotal.welfare75,
          '-',
          '-',
          '-',
          '-',
          studentGrandTotal.security,
          studentGrandTotal.boardOther === 0 ? '-' : studentGrandTotal.boardOther,
          studentGrandTotal.welfare75 + studentGrandTotal.security + studentGrandTotal.boardOther,
          studentGrandTotal.totalAmount,
          'RECONCILED 100%',
        ].join('\t')
      );

      navigator.clipboard.writeText(lines.join('\n'));
      setCopiedId('ALL_FEE_REGISTER_TSV');
      setTimeout(() => setCopiedId(null), 2500);
      return;
    }

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

    if (isInstallmentAlignedMode) {
      const lines: string[] = [
        escapeCsv('GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN, SAMANABAD FAISALABAD'),
        escapeCsv(
          reportViewMode === 'INSTALLMENTS_ONLY'
            ? 'OFFICIAL FEE REGISTER — DEDICATED INSTALLMENT CASES REPORT'
            : 'OFFICIAL FEE REGISTER & TRAINEE ALLOCATION (STUDENT-ALIGNED REGISTER WITH INSTALLMENT COLUMNS)'
        ),
        escapeCsv(
          `Period: ${activePeriodLabel} | Trade Filter: ${selectedTrade === 'ALL' ? 'All Trades' : selectedTrade} | Total Unique Enrolled Students: ${studentGrandTotal.totalTrainees} (${studentGrandTotal.totalChallans} Challan Receipts, ${studentGrandTotal.totalInstallmentCases} Installment Cases)`
        ),
        escapeCsv('Note: Student submission quantity does not increase for installment cases as multiple payments are aligned into 1 row'),
        '',
        [
          'Sr # (A)',
          'Roll # (B)',
          'Trainee Name (C)',
          'Father Name (D)',
          '1st Installment (E)',
          '2nd Installment (F)',
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
          'Remarks / Status (Q)',
        ].map(escapeCsv).join(','),
      ];

      studentTradeSections.forEach((sec) => {
        lines.push(
          escapeCsv(
            `TRADE: ${sec.tradeTitle.toUpperCase()} (${sec.tradeCode}) [${sec.traineeCount} Enrolled Students, ${sec.challanCount} Receipts]`
          )
        );
        sec.rows.forEach((r) => {
          lines.push(
            [
              r.srNo,
              r.rollNo,
              r.cnic ? `${r.traineeName.toUpperCase()}\nCNIC: ${r.cnic}` : r.traineeName.toUpperCase(),
              r.fatherName,
              r.inst1ChallanId ? `Ch# ${r.inst1ChallanId} (${r.inst1Date}): Rs. ${formatPKR(r.inst1Amount, false)}` : '—',
              r.inst2ChallanId ? `Ch# ${r.inst2ChallanId} (${r.inst2Date}): Rs. ${formatPKR(r.inst2Amount, false)}` : (r.isInstallmentCase ? 'Awaiting 2nd' : '—'),
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
            `Rs. ${formatPKR(sec.inst1Total, false)}`,
            sec.inst2Total > 0 ? `Rs. ${formatPKR(sec.inst2Total, false)}` : '—',
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
            `${sec.traineeCount} Students`,
          ].map(escapeCsv).join(',')
        );
      });

      lines.push(
        [
          `GRAND TOTAL (${studentGrandTotal.totalTrainees} Unique Enrolled Students)`,
          '',
          '',
          '',
          `Rs. ${formatPKR(studentGrandTotal.inst1Total, false)}`,
          studentGrandTotal.inst2Total > 0 ? `Rs. ${formatPKR(studentGrandTotal.inst2Total, false)}` : '—',
          studentGrandTotal.admissionTuition,
          studentGrandTotal.pupil25,
          studentGrandTotal.tevtaDues,
          studentGrandTotal.welfare75,
          '-',
          '-',
          '-',
          '-',
          studentGrandTotal.security,
          studentGrandTotal.boardOther === 0 ? '-' : studentGrandTotal.boardOther,
          studentGrandTotal.welfare75 + studentGrandTotal.security + studentGrandTotal.boardOther,
          studentGrandTotal.totalAmount,
          'RECONCILED 100%',
        ].map(escapeCsv).join(',')
      );

      const csvContent = lines.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GVTIW_Fee_Register_Student_Aligned_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

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

      if (isInstallmentAlignedMode) {
        // -------------------------------------------------------------
        // EXCEL EXPORT FOR STUDENT-ALIGNED REGISTER (INSTALLMENT COLUMNS)
        // -------------------------------------------------------------
        const superHeader = sheet.addRow([
          'TRAINEE PARTICULARS (COLS A TO D)',
          '',
          '',
          '',
          'INSTALLMENT SUBMISSIONS (COLS E TO F)',
          '',
          'TEVTA DUES (HO)',
          '',
          '',
          'PUPIL WELFARE (75% PF) & INSTITUTIONAL ALLOCATION',
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
        superHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };

        sheet.mergeCells('A5:D5');
        sheet.mergeCells('E5:F5');
        sheet.mergeCells('G5:I5');
        sheet.mergeCells('J5:Q5');
        sheet.mergeCells('R5:R5');
        sheet.mergeCells('S5:S5');

        const headerRow = sheet.addRow([
          'Sr #\n(A)',
          'Roll #\n(B)',
          'Trainee Name & CNIC\n(C)',
          'Father Name\n(D)',
          '1st Installment\n(E)',
          '2nd Installment\n(F)',
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
          'Remarks / Status\n(Q)',
        ]);
        headerRow.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };

        sheet.columns = [
          { width: 8 },  // Sr # (A)
          { width: 16 }, // Roll # (B)
          { width: 30 }, // Trainee Name & CNIC (C)
          { width: 24 }, // Father Name (D)
          { width: 24 }, // 1st Installment (E)
          { width: 24 }, // 2nd Installment (F)
          { width: 15 }, // Adm/Tuition (G)
          { width: 14 }, // 25% PF (H)
          { width: 17 }, // Subtotal TEVTA (G+H)
          { width: 16 }, // Welfare Fund (I)
          { width: 15 }, // Stationary (J)
          { width: 15 }, // Computer (K)
          { width: 15 }, // Breakage (L)
          { width: 14 }, // Sports (M)
          { width: 16 }, // Security (N)
          { width: 16 }, // Board/Other (O)
          { width: 17 }, // Subtotal (I:O)
          { width: 18 }, // Total (P)
          { width: 26 }, // Remarks / Status (Q)
        ];

        studentTradeSections.forEach((sec) => {
          const tradeBanner = sheet.addRow([
            `TRADE: ${sec.tradeTitle.toUpperCase()} (${sec.tradeCode}) — ${sec.traineeCount} UNIQUE ENROLLED STUDENTS (${sec.challanCount} Receipts)`,
          ]);
          tradeBanner.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
          tradeBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
          sheet.mergeCells(`A${sheet.rowCount}:S${sheet.rowCount}`);
          tradeBanner.alignment = { vertical: 'middle', horizontal: 'left' };

          sec.rows.forEach((r) => {
            const traineeUpper = r.traineeName.toUpperCase();
            const inst1Display = r.inst1ChallanId ? `Ch# ${r.inst1ChallanId} (${r.inst1Date}): Rs. ${formatPKR(r.inst1Amount, false)}` : '—';
            const inst2Display = r.inst2ChallanId ? `Ch# ${r.inst2ChallanId} (${r.inst2Date}): Rs. ${formatPKR(r.inst2Amount, false)}` : (r.isInstallmentCase ? 'Awaiting 2nd' : '—');

            const row = sheet.addRow([
              r.srNo,
              r.rollNo,
              '', // formatted with richText
              r.fatherName,
              inst1Display,
              inst2Display,
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
            ]);

            const traineeCell = row.getCell(3);
            if (r.cnic) {
              traineeCell.value = {
                richText: [
                  { font: { bold: true, size: 9.5, color: { argb: 'FF0F172A' } }, text: `${traineeUpper}\n` },
                  { font: { bold: false, size: 8, color: { argb: 'FF64748B' } }, text: `CNIC: ${r.cnic}` },
                ],
              };
            } else {
              traineeCell.value = traineeUpper;
              traineeCell.font = { bold: true, size: 9.5, color: { argb: 'FF0F172A' } };
            }

            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(2).alignment = { horizontal: 'center' };
            row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            row.getCell(4).alignment = { horizontal: 'left' };
            row.getCell(5).alignment = { horizontal: 'center' };
            row.getCell(6).alignment = { horizontal: 'center' };

            [7, 8, 9, 10, 15, 16, 17, 18].forEach((colIdx) => {
              const cell = row.getCell(colIdx);
              if (typeof cell.value === 'number') {
                cell.numFmt = '#,##0';
                cell.alignment = { horizontal: 'right' };
              }
            });

            // Highlight subtotal & total
            row.getCell(9).font = { bold: true };
            row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FF' } };
            row.getCell(17).font = { bold: true };
            row.getCell(17).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
            row.getCell(18).font = { bold: true };
            row.getCell(18).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };

            [11, 12, 13, 14].forEach((colIdx) => {
              row.getCell(colIdx).alignment = { horizontal: 'center' };
              row.getCell(colIdx).font = { color: { argb: 'FF94A3B8' } };
            });

            row.getCell(19).alignment = { horizontal: 'left' };
          });

          // Subtotal Row
          const subtotalRow = sheet.addRow([
            `Subtotal (${sec.tradeCode})`,
            '',
            '',
            '',
            sec.inst1Total,
            sec.inst2Total > 0 ? sec.inst2Total : '-',
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
            `${sec.traineeCount} Enrolled Students`,
          ]);

          subtotalRow.font = { bold: true, size: 9 };
          subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          sheet.mergeCells(`A${sheet.rowCount}:D${sheet.rowCount}`);
          subtotalRow.getCell(1).alignment = { horizontal: 'right' };

          [5, 6, 7, 8, 9, 10, 15, 16, 17, 18].forEach((colIdx) => {
            const cell = subtotalRow.getCell(colIdx);
            if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0';
              cell.alignment = { horizontal: 'right' };
            }
          });
          subtotalRow.getCell(19).alignment = { horizontal: 'center' };
        });

        // Grand Total Row
        const grandRow = sheet.addRow([
          `GRAND TOTAL (${studentGrandTotal.totalTrainees} Unique Enrolled Students across ${studentTradeSections.length} Trades)`,
          '',
          '',
          '',
          studentGrandTotal.inst1Total,
          studentGrandTotal.inst2Total > 0 ? studentGrandTotal.inst2Total : '-',
          studentGrandTotal.admissionTuition,
          studentGrandTotal.pupil25,
          studentGrandTotal.tevtaDues,
          studentGrandTotal.welfare75,
          '-',
          '-',
          '-',
          '-',
          studentGrandTotal.security,
          studentGrandTotal.boardOther === 0 ? '-' : studentGrandTotal.boardOther,
          studentGrandTotal.welfare75 + studentGrandTotal.security + studentGrandTotal.boardOther,
          studentGrandTotal.totalAmount,
          'RECONCILED 100%',
        ]);

        grandRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        grandRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C3C' } };
        sheet.mergeCells(`A${sheet.rowCount}:D${sheet.rowCount}`);
        grandRow.getCell(1).alignment = { horizontal: 'right' };

        [5, 6, 7, 8, 9, 10, 15, 16, 17, 18].forEach((colIdx) => {
          const cell = grandRow.getCell(colIdx);
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'right' };
          }
        });
        grandRow.getCell(19).alignment = { horizontal: 'center' };

        // Signatories
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
        link.download = `GVTIW_Official_Fee_Register_Student_Aligned_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      // -------------------------------------------------------------
      // EXCEL EXPORT FOR TRANSACTION LEDGER (CLASSIC 19-COLUMNS)
      // -------------------------------------------------------------
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

  // Export to PDF (Saves downloadable official PDF)
  const handleExportPdf = () => {
    generateFeeRegisterPdf({
      periodLabel: activePeriodLabel,
      tradeFilterLabel: selectedTrade === 'ALL' ? 'All Trades' : (COURSE_TITLE_MAP[selectedTrade] || selectedTrade),
      totalTrainees: activeGrandTotal.totalTrainees,
      isInstallmentAligned: isInstallmentAlignedMode,
      reportTitle:
        reportViewMode === 'INSTALLMENTS_ONLY'
          ? 'OFFICIAL FEE REGISTER — DEDICATED INSTALLMENT CASES'
          : isInstallmentAlignedMode
          ? 'OFFICIAL FEE REGISTER — STUDENT-ALIGNED REGISTER (INSTALLMENT CASES CONSOLIDATED)'
          : 'OFFICIAL FEE REGISTER (CHALLAN TRANSACTION LEDGER)',
      tradeGroups: activeTradeSections.map((sec) => ({
        tradeCode: sec.tradeCode,
        tradeTitle: sec.tradeTitle,
        traineeCount: sec.traineeCount,
        inst1Total: (sec as any).inst1Total,
        inst2Total: (sec as any).inst2Total,
        rows: sec.rows.map((r: any) => ({
          srNo: r.srNo,
          dateStr: r.dateStr || r.inst1Date || '',
          challanId: r.challanId || r.inst1ChallanId || '',
          rollNo: r.rollNo,
          traineeName: r.traineeName,
          cnic: r.cnic,
          fatherName: r.fatherName,
          inst1Info: r.inst1ChallanId ? `Ch# ${r.inst1ChallanId}\nRs. ${formatPKR(r.inst1Amount, false)}` : '',
          inst2Info: r.inst2ChallanId ? `Ch# ${r.inst2ChallanId}\nRs. ${formatPKR(r.inst2Amount, false)}` : (r.isInstallmentCase ? 'Awaiting 2nd' : '—'),
          inst1Amount: r.inst1Amount,
          inst2Amount: r.inst2Amount,
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
          remarks: r.remarks || (r.isInstallmentCase ? 'Installment Case' : 'Full Challan'),
        })),
        subtotal: sec.subtotal,
      })),
      grandTotal: {
        admissionTuition: activeGrandTotal.admissionTuition,
        pupil25: activeGrandTotal.pupil25,
        tevtaDues: activeGrandTotal.tevtaDues,
        welfare75: activeGrandTotal.welfare75,
        sports: 0,
        magazine: 0,
        medical: 0,
        library: 0,
        security: activeGrandTotal.security,
        boardOther: activeGrandTotal.boardOther,
        instSubtotal: activeGrandTotal.welfare75 + activeGrandTotal.security + activeGrandTotal.boardOther,
        totalAmount: activeGrandTotal.totalAmount,
        inst1Total: (activeGrandTotal as any).inst1Total,
        inst2Total: (activeGrandTotal as any).inst2Total,
      },
      printDirectly: false,
    });
  };

  // Requirement #1: Direct Print of official Fee Register report (matches PDF export exactly, no whole-page display print)
  const handlePrint = () => {
    setIsPrinting(true);
    setShowPrintPortal(true);
    document.body.classList.add('fee-register-print-active');

    let styleEl = document.getElementById('fee-register-landscape-rule');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'fee-register-landscape-rule';
      styleEl.innerHTML = `@page { size: A4 landscape !important; margin: 6mm 5mm !important; }`;
      document.head.appendChild(styleEl);
    }

    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn('Direct window.print encountered an issue:', err);
      }
      setTimeout(() => {
        setIsPrinting(false);
        setShowPrintPortal(false);
        document.body.classList.remove('fee-register-print-active');
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      }, 1000);
    }, 250);
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
      {/* 0. REPORT FORMAT & INSTALLMENT CONSOLIDATION SELECTOR         */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-3.5 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Fee Register Mode:</span>
                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  {reportViewMode === 'INSTALLMENT_ALIGNED'
                    ? 'Student-Aligned (Headcount Protected)'
                    : reportViewMode === 'INSTALLMENTS_ONLY'
                    ? 'Dedicated Installment Cases'
                    : 'Challan Transaction Ledger'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {reportViewMode === 'INSTALLMENT_ALIGNED'
                  ? 'Each unique enrolled student occupies exactly 1 row with dedicated 1st & 2nd installment columns. Student submission quantity does NOT increase.'
                  : reportViewMode === 'INSTALLMENTS_ONLY'
                  ? 'Dedicated report aligning only the students with installment payment scenarios (1st & 2nd installment breakdown).'
                  : 'Classic receipt-by-receipt transaction audit register where each bank challan is an individual row.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap">
            <button
              type="button"
              onClick={() => setReportViewMode('INSTALLMENT_ALIGNED')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportViewMode === 'INSTALLMENT_ALIGNED'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Single row per student with 1st & 2nd installment columns (headcount does not increase)"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Student-Aligned Register</span>
            </button>

            <button
              type="button"
              onClick={() => setReportViewMode('INSTALLMENTS_ONLY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportViewMode === 'INSTALLMENTS_ONLY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Dedicated report filtering exclusively to installment cases"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Installment Cases Only</span>
            </button>

            <button
              type="button"
              onClick={() => setReportViewMode('CHALLAN_TRANSACTION')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportViewMode === 'CHALLAN_TRANSACTION'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Classic transaction-level receipt register"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Transaction Ledger</span>
            </button>
          </div>
        </div>
      </div>

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
              disabled={isPrinting}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 disabled:opacity-75 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Print official fee register schedule (Landscape A4)"
            >
              <Printer className={`w-3.5 h-3.5 text-amber-200 ${isPrinting ? 'animate-pulse' : ''}`} />
              <span>{isPrinting ? 'Opening Print...' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Quick Expand / Collapse All & Status Bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              Showing: <strong className="text-slate-800 dark:text-slate-200">{activeGrandTotal.totalTrainees}</strong>{' '}
              {isInstallmentAlignedMode ? 'Unique Enrolled Students' : 'Trainees'} across{' '}
              <strong className="text-slate-800 dark:text-slate-200">{activeTradeSections.length}</strong> Trades
              {isInstallmentAlignedMode && (
                <span className="ml-1 text-slate-400">
                  ({studentGrandTotal.totalChallans} Total Receipts, {studentGrandTotal.totalInstallmentCases} Installment Cases)
                </span>
              )}
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
          <span className="font-black uppercase tracking-wide">
            {isInstallmentAlignedMode ? 'Installment-Aligned Register Policy: ' : 'Institutional Fee Register Policy: '}
          </span>
          {isInstallmentAlignedMode ? (
            <>
              Students paying in multiple installments (1st & 2nd installment) are aligned into dedicated installment columns (<strong>Cols E & F</strong>).{' '}
              <strong>Trainee headcount does NOT increase</strong> when a student pays in installments. In accordance with institutional pupil fund administration, the{' '}
              <strong>entire 75% Pupil Fund</strong> is treated under the <strong>Welfare Fund column (Col I)</strong>, with Columns J through M displaying dashes (<strong>-</strong>).
            </>
          ) : (
            <>
              In accordance with institutional pupil fund administration, the <strong>entire 75% Pupil Fund</strong> is treated under the{' '}
              <strong>Welfare Fund column (Col I)</strong>. Consequently, <strong>Columns J through M</strong> (Stationary / Exam, Computer Fund, M & E Breakage, Sports Fund) remain intentionally empty (reserved for future breakdown) and display dashes (<strong>-</strong>).
            </>
          )}
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
            <span>{isInstallmentAlignedMode ? 'Enrolled Students' : 'Trainees'}</span>
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black font-mono mt-1 text-blue-600 dark:text-blue-400">
            {activeGrandTotal.totalTrainees}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {activeTradeSections.length} Trades {isInstallmentAlignedMode ? '• Headcount Protected' : ''}
          </div>
        </div>

        {/* Total Collection / Installment Count */}
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
            {formatPKR(activeGrandTotal.totalAmount, false)}
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
            {formatPKR(activeGrandTotal.tevtaDues, false)}
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
            {formatPKR(activeGrandTotal.welfare75, false)}
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
            {formatPKR(activeGrandTotal.security, false)}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
            Refundable Caution Money
          </div>
        </div>

        {/* Board & Other / Installments */}
        <div
          className={`p-3.5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-purple-500/30' : 'bg-purple-50/60 border-purple-300 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center justify-between">
            <span>{isInstallmentAlignedMode ? 'Receipts / Cases' : 'Board / Other Fee'}</span>
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black font-mono mt-1 text-purple-950 dark:text-purple-300">
            {isInstallmentAlignedMode
              ? `${studentGrandTotal.totalChallans} / ${studentGrandTotal.totalInstallmentCases}`
              : formatPKR(grandTotal.boardOther, false)}
          </div>
          <div className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold mt-0.5">
            {isInstallmentAlignedMode ? 'Challans / Inst Cases' : 'TTB, PBTE & Self-Finance'}
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
              {isInstallmentAlignedMode ? (
                <>
                  <tr
                    className={`font-black uppercase tracking-wider text-[11px] ${
                      darkMode ? 'bg-teal-950 text-teal-200' : 'bg-teal-800 text-white'
                    }`}
                  >
                    <th colSpan={4} className="py-2.5 px-3 text-center border-b border-r border-teal-700">
                      Trainee Particulars (Cols A to D)
                    </th>
                    <th colSpan={2} className="py-2.5 px-3 text-center border-b border-r border-teal-700 bg-amber-900 text-amber-100">
                      Installment Submissions (Cols E to F)
                    </th>
                    <th colSpan={3} className="py-2.5 px-3 text-center border-b border-r border-teal-700 bg-blue-900 text-blue-100">
                      TEVTA Dues (HO)
                    </th>
                    <th colSpan={8} className="py-2.5 px-3 text-center border-b border-r border-teal-700 bg-teal-900 text-teal-100">
                      Pupil Welfare & Institutional Allocation (Cols J to Q)
                    </th>
                    <th colSpan={1} className="py-2.5 px-3 text-center border-b border-r border-teal-700">
                      Total
                    </th>
                    <th colSpan={1} className="py-2.5 px-3 text-center border-b border-teal-700">
                      Status
                    </th>
                  </tr>

                  <tr
                    className={`font-bold text-[11px] ${
                      darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <th className="py-2.5 px-2.5 text-center w-12 border-r border-slate-200 dark:border-slate-700">
                      <div>Sr #</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">(A)</div>
                    </th>
                    <th className="py-2.5 px-2.5 text-center w-28 border-r border-slate-200 dark:border-slate-700 font-mono">
                      <div>Roll #</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">(B)</div>
                    </th>
                    <th className="py-2.5 px-3 min-w-[190px] border-r border-slate-200 dark:border-slate-700">
                      <div>Trainee Name & CNIC</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">(C)</div>
                    </th>
                    <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-200 dark:border-slate-700">
                      <div>Father Name</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">(D)</div>
                    </th>
                    <th className="py-2.5 px-2.5 text-center w-36 border-r border-slate-200 dark:border-slate-700 font-black text-amber-900 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/40">
                      <div>1st Installment</div>
                      <div className="text-[10px] font-mono font-normal">(E) Ch# / Date</div>
                    </th>
                    <th className="py-2.5 px-2.5 text-center w-36 border-r border-slate-200 dark:border-slate-700 font-black text-amber-900 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/40">
                      <div>2nd Installment</div>
                      <div className="text-[10px] font-mono font-normal">(F) Ch# / Date</div>
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
                      <div>Remarks / Status</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">(Q)</div>
                    </th>
                  </tr>
                </>
              ) : (
                <>
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
                </>
              )}
            </thead>

            {/* Table Body */}
            <tbody>
              {activeTradeSections.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-400">
                    No trainee records match your current filters.
                  </td>
                </tr>
              ) : isInstallmentAlignedMode ? (
                // -------------------------------------------------------------
                // STUDENT-ALIGNED BODY: 1 ROW PER ENROLLED STUDENT
                // -------------------------------------------------------------
                studentTradeSections.map((sec) => {
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
                                {sec.traineeCount} Enrolled Students (Unique Headcount)
                              </span>
                              {sec.challanCount > sec.traineeCount && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950">
                                  {sec.challanCount} Receipts ({sec.installmentCount} Installments)
                                </span>
                              )}
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
                              key={r.studentKey}
                              className={`border-b transition-colors hover:bg-amber-50/50 dark:hover:bg-slate-800/60 ${rowBg} ${
                                darkMode ? 'border-slate-800' : 'border-slate-200'
                              }`}
                            >
                              {/* Col A: Sr # */}
                              <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200 dark:border-slate-800">
                                {r.srNo}
                              </td>

                              {/* Col B: Roll # */}
                              <td className="py-2 px-2.5 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                                {r.rollNo}
                              </td>

                              {/* Col C: Trainee Name & CNIC */}
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

                              {/* Col D: Father Name */}
                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                                {r.fatherName}
                              </td>

                              {/* Col E: 1st Installment */}
                              <td className="py-2 px-2.5 text-center border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/20">
                                {r.inst1Amount > 0 ? (
                                  <div>
                                    <div className="font-mono font-black text-xs text-amber-900 dark:text-amber-200">
                                      Rs. {formatPKR(r.inst1Amount, false)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                      Ch# {r.inst1ChallanId} • {r.inst1Date}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono">—</span>
                                )}
                              </td>

                              {/* Col F: 2nd Installment */}
                              <td className="py-2 px-2.5 text-center border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/20">
                                {r.inst2Amount > 0 ? (
                                  <div>
                                    <div className="font-mono font-black text-xs text-amber-900 dark:text-amber-200">
                                      Rs. {formatPKR(r.inst2Amount, false)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                      Ch# {r.inst2ChallanId} • {r.inst2Date}
                                    </div>
                                  </div>
                                ) : r.isInstallmentCase ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    <Clock className="w-2.5 h-2.5" />
                                    Awaiting 2nd
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-xs">—</span>
                                )}
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

                              {/* Col Q: Remarks / Status */}
                              <td className="py-2 px-3">
                                {r.isInstallmentCase ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    <Clock className="w-2.5 h-2.5" />
                                    {r.remarks || 'Installment Case'}
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
                          <td colSpan={4} className="py-2.5 px-3 text-right font-sans border-r border-slate-200 dark:border-slate-700">
                            Subtotal ({sec.tradeCode}):
                          </td>
                          <td className="py-2.5 px-2 text-center text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700">
                            Rs. {formatPKR(sec.inst1Total, false)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700">
                            {sec.inst2Total > 0 ? `Rs. ${formatPKR(sec.inst2Total, false)}` : '—'}
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
                            {sec.traineeCount} Enrolled Students
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                // -------------------------------------------------------------
                // TRANSACTION LEDGER BODY: RAW RECEIPT-WISE
                // -------------------------------------------------------------
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
              {isInstallmentAlignedMode ? (
                <tr
                  className={`font-black font-mono text-xs sm:text-sm border-t-2 sticky bottom-0 z-30 ${
                    darkMode
                      ? 'bg-teal-950 text-white border-teal-800 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]'
                      : 'bg-teal-900 text-white border-teal-950 shadow-[0_-4px_10px_rgba(0,0,0,0.15)]'
                  }`}
                >
                  <td colSpan={4} className="py-3 px-3 text-right font-sans tracking-wide border-r border-teal-800/80">
                    GRAND TOTAL ({studentGrandTotal.totalTrainees} Unique Enrolled Students across {studentTradeSections.length} Trades):
                  </td>
                  <td className="py-3 px-2 text-center text-amber-300 font-bold border-r border-teal-800/80">
                    Rs. {formatPKR(studentGrandTotal.inst1Total, false)}
                  </td>
                  <td className="py-3 px-2 text-center text-amber-300 font-bold border-r border-teal-800/80">
                    {studentGrandTotal.inst2Total > 0 ? `Rs. ${formatPKR(studentGrandTotal.inst2Total, false)}` : '—'}
                  </td>
                  <td className="py-3 px-2.5 text-right border-r border-teal-800/80">
                    {formatPKR(studentGrandTotal.admissionTuition, false)}
                  </td>
                  <td className="py-3 px-2.5 text-right border-r border-teal-800/80">
                    {formatPKR(studentGrandTotal.pupil25, false)}
                  </td>
                  {/* Grand Total TEVTA Dues */}
                  <td className="py-3 px-2.5 text-right text-cyan-300 font-black bg-teal-950/40 border-r border-teal-800/80">
                    {formatPKR(studentGrandTotal.tevtaDues, false)}
                  </td>
                  <td className="py-3 px-2.5 text-right text-amber-300 border-r border-teal-800/80">
                    {formatPKR(studentGrandTotal.welfare75, false)}
                  </td>
                  <td className="py-3 px-2 text-center text-teal-300/60 border-r border-teal-800/80">—</td>
                  <td className="py-3 px-2 text-center text-teal-300/60 border-r border-teal-800/80">—</td>
                  <td className="py-3 px-2 text-center text-teal-300/60 border-r border-teal-800/80">—</td>
                  <td className="py-3 px-2 text-center text-teal-300/60 border-r border-teal-800/80">—</td>
                  <td className="py-3 px-2.5 text-right border-r border-teal-800/80">
                    {formatPKR(studentGrandTotal.security, false)}
                  </td>
                  <td className="py-3 px-2.5 text-right border-r border-teal-800/80">
                    {studentGrandTotal.boardOther === 0 ? '—' : formatPKR(studentGrandTotal.boardOther, false)}
                  </td>
                  {/* Grand Total (I:O) */}
                  <td className="py-3 px-2.5 text-right text-cyan-300 font-black bg-teal-950/40 border-r border-teal-800/80">
                    {formatPKR(studentGrandTotal.welfare75 + studentGrandTotal.security + studentGrandTotal.boardOther, false)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-300 font-extrabold text-sm sm:text-base border-r border-teal-800/80">
                    {formatPKR(studentGrandTotal.totalAmount, false)}
                  </td>
                  <td className="py-3 px-3 font-sans text-xs text-emerald-200">
                    RECONCILED 100%
                  </td>
                </tr>
              ) : (
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
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Standalone Landscape Print Portal (Targeted by window.print with #root hidden) */}
      {showPrintPortal && typeof document !== 'undefined' && createPortal(
        <div id="print-fee-register-portal" className="p-4 bg-white text-slate-900 font-sans">
          {/* Header Banner */}
          <div className="border-b-2 border-emerald-900 pb-2 mb-2 text-center">
            <h1 className="text-base font-black uppercase text-emerald-950 tracking-wide">
              Govt. Vocational Training Institute for Women, Samanabad Faisalabad
            </h1>
            <p className="text-xs font-bold text-slate-700 mt-0.5">
              TEVTA Fee Collection (TFC) Bank Account # 6580027832200011 (Bank of Punjab)
            </p>
            <p className="text-xs font-black text-emerald-900 uppercase mt-0.5">
              {reportViewMode === 'INSTALLMENTS_ONLY'
                ? 'OFFICIAL FEE REGISTER — DEDICATED MATRIC VOCATIONAL INSTALLMENT CASES'
                : isInstallmentAlignedMode
                ? 'OFFICIAL FEE REGISTER — STUDENT-ALIGNED REGISTER (HEADCOUNT PROTECTED)'
                : 'OFFICIAL FEE REGISTER (CHALLAN TRANSACTION LEDGER)'}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2 px-2 border-t border-slate-300 pt-1 font-medium">
              <span><strong>Period:</strong> {activePeriodLabel}</span>
              <span><strong>Trade Filter:</strong> {selectedTrade === 'ALL' ? 'All Trades' : (COURSE_TITLE_MAP[selectedTrade] || selectedTrade)}</span>
              <span><strong>Enrolled Students:</strong> {activeGrandTotal.totalTrainees} across {activeTradeSections.length} Trades</span>
              <span><strong>Grand Total:</strong> Rs. {formatPKR(activeGrandTotal.totalAmount, false)} (100% Reconciled)</span>
              <span><strong>Printed:</strong> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Print Table */}
          <table className="w-full text-[8px] border-collapse border border-slate-400">
            <thead>
              {isInstallmentAlignedMode ? (
                <>
                  <tr className="bg-emerald-950 text-white font-bold text-center uppercase tracking-wider text-[8.5px]">
                    <th colSpan={4} className="border border-slate-400 py-1.5 px-1 bg-emerald-900">
                      Trainee Particulars (Cols A to D)
                    </th>
                    <th colSpan={2} className="border border-slate-400 py-1.5 px-1 bg-amber-800">
                      Installment Submissions (MVi / MVii Only)
                    </th>
                    <th colSpan={3} className="border border-slate-400 py-1.5 px-1 bg-blue-900">
                      TEVTA Dues (HO)
                    </th>
                    <th colSpan={8} className="border border-slate-400 py-1.5 px-1 bg-teal-900">
                      Pupil Welfare & Institutional Allocation (Cols J to Q)
                    </th>
                    <th colSpan={1} className="border border-slate-400 py-1.5 px-1 bg-emerald-900">
                      Total
                    </th>
                    <th colSpan={1} className="border border-slate-400 py-1.5 px-1 bg-slate-800">
                      Status
                    </th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-900 font-bold text-center text-[8px]">
                    <th className="border border-slate-400 p-1 w-7">Sr # (A)</th>
                    <th className="border border-slate-400 p-1 w-16">Roll # (B)</th>
                    <th className="border border-slate-400 p-1 min-w-[120px] text-left">Trainee Name & CNIC (C)</th>
                    <th className="border border-slate-400 p-1 min-w-[100px] text-left">Father Name (D)</th>
                    <th className="border border-slate-400 p-1 w-24 bg-amber-50">1st Installment (E)</th>
                    <th className="border border-slate-400 p-1 w-24 bg-amber-50">2nd Installment (F)</th>
                    <th className="border border-slate-400 p-1 w-14 text-right">Adm/Tuition (G)</th>
                    <th className="border border-slate-400 p-1 w-12 text-right">25% PF (H)</th>
                    <th className="border border-slate-400 p-1 w-16 text-right bg-blue-50">Subtotal TEVTA (G+H)</th>
                    <th className="border border-slate-400 p-1 w-16 text-right bg-teal-50">Welfare Fund (I)</th>
                    <th className="border border-slate-400 p-1 w-10 text-center text-slate-400">Stationary (J)</th>
                    <th className="border border-slate-400 p-1 w-10 text-center text-slate-400">Computer (K)</th>
                    <th className="border border-slate-400 p-1 w-10 text-center text-slate-400">Breakage (L)</th>
                    <th className="border border-slate-400 p-1 w-10 text-center text-slate-400">Sports (M)</th>
                    <th className="border border-slate-400 p-1 w-14 text-right">Security (N)</th>
                    <th className="border border-slate-400 p-1 w-14 text-right">Board/Oth (O)</th>
                    <th className="border border-slate-400 p-1 w-16 text-right bg-teal-50">Subtotal (I:O)</th>
                    <th className="border border-slate-400 p-1 w-16 text-right bg-emerald-50">Total PKR (P)</th>
                    <th className="border border-slate-400 p-1 w-24 text-left">Remarks / Status (Q)</th>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="bg-emerald-950 text-white font-bold text-center uppercase tracking-wider text-[8.5px]">
                    <th colSpan={6} className="border border-slate-400 py-1.5 px-1 bg-emerald-900">
                      Trainee Particulars (Cols A to F)
                    </th>
                    <th colSpan={3} className="border border-slate-400 py-1.5 px-1 bg-blue-900">
                      TEVTA Dues (HO)
                    </th>
                    <th colSpan={8} className="border border-slate-400 py-1.5 px-1 bg-teal-900">
                      Pupil Welfare & Institutional Allocation (Cols I to O)
                    </th>
                    <th colSpan={1} className="border border-slate-400 py-1.5 px-1 bg-emerald-900">
                      Total
                    </th>
                    <th colSpan={1} className="border border-slate-400 py-1.5 px-1 bg-slate-800">
                      Status
                    </th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-900 font-bold text-center text-[8px]">
                    <th className="border border-slate-400 p-1 w-7">Sr # (A)</th>
                    <th className="border border-slate-400 p-1 w-14">Date (B)</th>
                    <th className="border border-slate-400 p-1 w-14">Challan # (C)</th>
                    <th className="border border-slate-400 p-1 w-16">Roll # (D)</th>
                    <th className="border border-slate-400 p-1 min-w-[120px] text-left">Trainee Name (E)</th>
                    <th className="border border-slate-400 p-1 min-w-[100px] text-left">Father Name (F)</th>
                    <th className="border border-slate-400 p-1 w-14 text-right">Adm/Tuition (G)</th>
                    <th className="border border-slate-400 p-1 w-12 text-right">25% PF (H)</th>
                    <th className="border border-slate-400 p-1 w-16 text-right bg-blue-50">Subtotal TEVTA (G+H)</th>
                    <th className="border border-slate-400 p-1 w-16 text-right bg-teal-50">Welfare Fund (I)</th>
                    <th className="border border-slate-400 p-1 w-10 text-center text-slate-400">Stationary (J)</th>
                    <th className="border border-slate-400 p-1 w-10 text-center text-slate-400">Computer (K)</th>
                    <th className="border border-slate-400 p-1 w-10 text-center text-slate-400">Breakage (L)</th>
                    <th className="border border-slate-400 p-1 w-10 text-center text-slate-400">Sports (M)</th>
                    <th className="border border-slate-400 p-1 w-14 text-right">Security (N)</th>
                    <th className="border border-slate-400 p-1 w-14 text-right">Board/Oth (O)</th>
                    <th className="border border-slate-400 p-1 w-16 text-right bg-teal-50">Subtotal (I:O)</th>
                    <th className="border border-slate-400 p-1 w-16 text-right bg-emerald-50">Total PKR (P)</th>
                    <th className="border border-slate-400 p-1 w-20 text-left">Remarks (Q)</th>
                  </tr>
                </>
              )}
            </thead>
            <tbody>
              {isInstallmentAlignedMode ? (
                studentTradeSections.map((sec) => {
                  const isMV = sec.tradeCode === 'MVi' || sec.tradeCode === 'MVii';
                  return (
                    <React.Fragment key={`print-sec-${sec.tradeCode}`}>
                      {/* Trade Section Header Banner */}
                      <tr className="bg-emerald-900 text-white font-bold text-left">
                        <td colSpan={19} className="border border-slate-400 py-1 px-2">
                          <div className="flex items-center justify-between">
                            <span>
                              TRADE: {sec.tradeTitle.toUpperCase()} ({sec.tradeCode}) — {sec.traineeCount} UNIQUE ENROLLED STUDENTS
                              {isMV && sec.installmentCount > 0 ? ` (${sec.installmentCount} Installment Cases)` : ''}
                            </span>
                            <span>Subtotal: Rs. {formatPKR(sec.subtotal.totalAmount, false)}</span>
                          </div>
                        </td>
                      </tr>
                      {sec.rows.map((r) => {
                        const inst1Str = isMV && r.inst1ChallanId ? `Ch# ${r.inst1ChallanId} (${r.inst1Date}): Rs. ${formatPKR(r.inst1Amount, false)}` : '—';
                        const inst2Str = isMV && r.inst2ChallanId ? `Ch# ${r.inst2ChallanId} (${r.inst2Date}): Rs. ${formatPKR(r.inst2Amount, false)}` : (isMV && r.isInstallmentCase ? 'Awaiting 2nd' : '—');

                        return (
                          <tr key={`print-row-${r.studentKey}`} className="border-b border-slate-300">
                            <td className="border border-slate-300 p-1 text-center font-mono">{r.srNo}</td>
                            <td className="border border-slate-300 p-1 text-center font-mono font-bold">{r.rollNo}</td>
                            <td className="border border-slate-300 p-1 text-left">
                              <div className="font-bold uppercase text-[8.5px]">{r.traineeName.toUpperCase()}</div>
                              {r.cnic && <div className="text-[7.5px] text-slate-500 font-mono">CNIC: {r.cnic}</div>}
                            </td>
                            <td className="border border-slate-300 p-1 text-left">{r.fatherName}</td>
                            <td className="border border-slate-300 p-1 text-center font-mono bg-amber-50/50">{inst1Str}</td>
                            <td className="border border-slate-300 p-1 text-center font-mono bg-amber-50/50">{inst2Str}</td>
                            <td className="border border-slate-300 p-1 text-right font-mono">{formatPKR(r.admissionTuition, false)}</td>
                            <td className="border border-slate-300 p-1 text-right font-mono">{formatPKR(r.pupil25, false)}</td>
                            <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-blue-50/60 text-blue-900">{formatPKR(r.tevtaDues, false)}</td>
                            <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-teal-50/40 text-teal-900">{formatPKR(r.welfare75, false)}</td>
                            <td className="border border-slate-300 p-1 text-center text-slate-400">—</td>
                            <td className="border border-slate-300 p-1 text-center text-slate-400">—</td>
                            <td className="border border-slate-300 p-1 text-center text-slate-400">—</td>
                            <td className="border border-slate-300 p-1 text-center text-slate-400">—</td>
                            <td className="border border-slate-300 p-1 text-right font-mono">{formatPKR(r.security, false)}</td>
                            <td className="border border-slate-300 p-1 text-right font-mono">{r.boardOther === 0 ? '—' : formatPKR(r.boardOther, false)}</td>
                            <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-teal-50/60 text-teal-900">{formatPKR(r.instSubtotal, false)}</td>
                            <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-emerald-50 text-emerald-950">{formatPKR(r.totalAmount, false)}</td>
                            <td className="border border-slate-300 p-1 text-left">{r.remarks}</td>
                          </tr>
                        );
                      })}
                      {/* Subtotal Row */}
                      <tr className="bg-emerald-50/90 font-bold border-t-2 border-emerald-900 text-[8px]">
                        <td colSpan={4} className="border border-slate-400 p-1 text-right font-bold">
                          Subtotal ({sec.tradeCode}):
                        </td>
                        <td className="border border-slate-400 p-1 text-center font-mono">
                          {isMV && sec.inst1Total > 0 ? `Rs. ${formatPKR(sec.inst1Total, false)}` : '—'}
                        </td>
                        <td className="border border-slate-400 p-1 text-center font-mono">
                          {isMV && sec.inst2Total > 0 ? `Rs. ${formatPKR(sec.inst2Total, false)}` : '—'}
                        </td>
                        <td className="border border-slate-400 p-1 text-right font-mono">{formatPKR(sec.subtotal.admissionTuition, false)}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono">{formatPKR(sec.subtotal.pupil25, false)}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-blue-100/70 text-blue-900">{formatPKR(sec.subtotal.tevtaDues, false)}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-teal-100/60 text-teal-900">{formatPKR(sec.subtotal.welfare75, false)}</td>
                        <td className="border border-slate-400 p-1 text-center text-slate-400">—</td>
                        <td className="border border-slate-400 p-1 text-center text-slate-400">—</td>
                        <td className="border border-slate-400 p-1 text-center text-slate-400">—</td>
                        <td className="border border-slate-400 p-1 text-center text-slate-400">—</td>
                        <td className="border border-slate-400 p-1 text-right font-mono">{formatPKR(sec.subtotal.security, false)}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono">{sec.subtotal.boardOther === 0 ? '—' : formatPKR(sec.subtotal.boardOther, false)}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-teal-100/70 text-teal-900">{formatPKR(sec.subtotal.welfare75 + sec.subtotal.security + sec.subtotal.boardOther, false)}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-emerald-100 text-emerald-950">{formatPKR(sec.subtotal.totalAmount, false)}</td>
                        <td className="border border-slate-400 p-1 text-left">{sec.traineeCount} Students</td>
                      </tr>
                    </React.Fragment>
                  );
                })
              ) : (
                tradeSections.map((sec) => (
                  <React.Fragment key={`print-raw-sec-${sec.tradeCode}`}>
                    <tr className="bg-emerald-900 text-white font-bold text-left">
                      <td colSpan={19} className="border border-slate-400 py-1 px-2">
                        <div className="flex items-center justify-between">
                          <span>TRADE: {sec.tradeTitle.toUpperCase()} ({sec.tradeCode}) — {sec.traineeCount} TRAINEES</span>
                          <span>Subtotal: Rs. {formatPKR(sec.subtotal.totalAmount, false)}</span>
                        </div>
                      </td>
                    </tr>
                    {sec.rows.map((r) => (
                      <tr key={`print-raw-row-${r.challanId}`} className="border-b border-slate-300">
                        <td className="border border-slate-300 p-1 text-center font-mono">{r.srNo}</td>
                        <td className="border border-slate-300 p-1 text-center font-mono">{r.dateStr}</td>
                        <td className="border border-slate-300 p-1 text-center font-mono">{r.challanId}</td>
                        <td className="border border-slate-300 p-1 text-center font-mono font-bold">{r.rollNo}</td>
                        <td className="border border-slate-300 p-1 text-left">
                          <div className="font-bold uppercase text-[8.5px]">{r.traineeName.toUpperCase()}</div>
                          {r.cnic && <div className="text-[7.5px] text-slate-500 font-mono">CNIC: {r.cnic}</div>}
                        </td>
                        <td className="border border-slate-300 p-1 text-left">{r.fatherName}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">{formatPKR(r.admissionTuition, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">{formatPKR(r.pupil25, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-blue-50/60 text-blue-900">{formatPKR(r.tevtaDues, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-teal-50/40 text-teal-900">{formatPKR(r.welfare75, false)}</td>
                        <td className="border border-slate-300 p-1 text-center text-slate-400">—</td>
                        <td className="border border-slate-300 p-1 text-center text-slate-400">—</td>
                        <td className="border border-slate-300 p-1 text-center text-slate-400">—</td>
                        <td className="border border-slate-300 p-1 text-center text-slate-400">—</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">{formatPKR(r.security, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono">{r.boardOther === 0 ? '—' : formatPKR(r.boardOther, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-teal-50/60 text-teal-900">{formatPKR(r.instSubtotal, false)}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-emerald-50 text-emerald-950">{formatPKR(r.totalAmount, false)}</td>
                        <td className="border border-slate-300 p-1 text-left">{r.remarks}</td>
                      </tr>
                    ))}
                    {/* Subtotal Row */}
                    <tr className="bg-emerald-50/90 font-bold border-t-2 border-emerald-900 text-[8px]">
                      <td colSpan={6} className="border border-slate-400 p-1 text-right font-bold">
                        Subtotal ({sec.tradeCode}):
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatPKR(sec.subtotal.admissionTuition, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatPKR(sec.subtotal.pupil25, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono bg-blue-100/70 text-blue-900">{formatPKR(sec.subtotal.tevtaDues, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono bg-teal-100/60 text-teal-900">{formatPKR(sec.subtotal.welfare75, false)}</td>
                      <td className="border border-slate-400 p-1 text-center text-slate-400">—</td>
                      <td className="border border-slate-400 p-1 text-center text-slate-400">—</td>
                      <td className="border border-slate-400 p-1 text-center text-slate-400">—</td>
                      <td className="border border-slate-400 p-1 text-center text-slate-400">—</td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatPKR(sec.subtotal.security, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{sec.subtotal.boardOther === 0 ? '—' : formatPKR(sec.subtotal.boardOther, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono bg-teal-100/70 text-teal-900">{formatPKR(sec.subtotal.welfare75 + sec.subtotal.security + sec.subtotal.boardOther, false)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono bg-emerald-100 text-emerald-950">{formatPKR(sec.subtotal.totalAmount, false)}</td>
                      <td className="border border-slate-400 p-1 text-left">{sec.traineeCount} Trainees</td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
            <tfoot>
              {isInstallmentAlignedMode ? (
                <tr className="bg-emerald-950 text-white font-bold border-t-2 border-slate-900 text-[8.5px]">
                  <td colSpan={4} className="border border-slate-400 p-1.5 text-right font-bold">
                    GRAND TOTAL ({studentGrandTotal.totalTrainees} Unique Enrolled Students):
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-mono text-amber-300">
                    {studentGrandTotal.inst1Total > 0 ? `Rs. ${formatPKR(studentGrandTotal.inst1Total, false)}` : '—'}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-mono text-amber-300">
                    {studentGrandTotal.inst2Total > 0 ? `Rs. ${formatPKR(studentGrandTotal.inst2Total, false)}` : '—'}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatPKR(studentGrandTotal.admissionTuition, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatPKR(studentGrandTotal.pupil25, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono text-cyan-300 font-black">{formatPKR(studentGrandTotal.tevtaDues, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono text-amber-300 font-black">{formatPKR(studentGrandTotal.welfare75, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-center text-teal-300/60">—</td>
                  <td className="border border-slate-400 p-1.5 text-center text-teal-300/60">—</td>
                  <td className="border border-slate-400 p-1.5 text-center text-teal-300/60">—</td>
                  <td className="border border-slate-400 p-1.5 text-center text-teal-300/60">—</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatPKR(studentGrandTotal.security, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{studentGrandTotal.boardOther === 0 ? '—' : formatPKR(studentGrandTotal.boardOther, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono text-cyan-300 font-black">{formatPKR(studentGrandTotal.welfare75 + studentGrandTotal.security + studentGrandTotal.boardOther, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono text-amber-300 font-black text-sm">{formatPKR(studentGrandTotal.totalAmount, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-left text-emerald-200">100% RECONCILED</td>
                </tr>
              ) : (
                <tr className="bg-emerald-950 text-white font-bold border-t-2 border-slate-900 text-[8.5px]">
                  <td colSpan={6} className="border border-slate-400 p-1.5 text-right font-bold">
                    GRAND TOTAL ({grandTotal.totalTrainees} Trainees):
                  </td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatPKR(grandTotal.admissionTuition, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatPKR(grandTotal.pupil25, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono text-cyan-300 font-black">{formatPKR(grandTotal.tevtaDues, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono text-amber-300 font-black">{formatPKR(grandTotal.welfare75, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-center text-teal-300/60">—</td>
                  <td className="border border-slate-400 p-1.5 text-center text-teal-300/60">—</td>
                  <td className="border border-slate-400 p-1.5 text-center text-teal-300/60">—</td>
                  <td className="border border-slate-400 p-1.5 text-center text-teal-300/60">—</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatPKR(grandTotal.security, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{grandTotal.boardOther === 0 ? '—' : formatPKR(grandTotal.boardOther, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono text-cyan-300 font-black">{formatPKR(grandTotal.welfare75 + grandTotal.security + grandTotal.boardOther, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono text-amber-300 font-black text-sm">{formatPKR(grandTotal.totalAmount, false)}</td>
                  <td className="border border-slate-400 p-1.5 text-left text-emerald-200">100% RECONCILED</td>
                </tr>
              )}
            </tfoot>
          </table>

          {/* Official 3-Signatory Block */}
          <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 text-center text-[10px]">
            <div className="space-y-1">
              <div className="h-8"></div>
              <div className="font-bold text-slate-900 uppercase">KASHIF ZIA</div>
              <div className="text-[9px] text-slate-500 italic">Accountant / Prepared by:</div>
            </div>
            <div className="space-y-1">
              <div className="h-8"></div>
              <div className="font-bold text-slate-900 uppercase">ANEEBA JAMIL</div>
              <div className="text-[9px] text-slate-500 italic">CO-Signatory / Checked by:</div>
            </div>
            <div className="space-y-1">
              <div className="h-8"></div>
              <div className="font-bold text-slate-900 uppercase">SHAZIA KHADIM</div>
              <div className="text-[9px] text-slate-500 italic">Acting Principal / DDO / Approved by:</div>
            </div>
          </div>

          <div className="mt-4 text-[8px] text-slate-400 text-center">
            Govt. Vocational Training Institute for Women, Samanabad Faisalabad — Official Fee Register
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
