import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ExcelJS from 'exceljs';
import {
  TfcChallanRecord,
  COURSE_TITLE_MAP,
  getStoredTfcChallans,
  saveStoredTfcChallans,
  parseGoogleSheetRawToTfcChallans,
  classifyOtherFee,
  getNetCashBookReceiptAmount,
  getCleanTradeAbbreviation,
  computeChallanFeeBreakdown,
  ChallanFeeBreakdown,
} from '../data/tfcChallanData';
import { TfcReceiptsReportView } from './TfcReceiptsReportView';
import { formatPKR, formatCNIC } from '../lib/formatters';
import { generateReceiptsRegisterPdf, generateHardCashBookPdf } from '../lib/tfcPdfGenerator';
import {
  Building2,
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Copy,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
  Info,
  Calendar,
  CreditCard,
  Receipt,
  UserCheck,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  FileText,
  X,
} from 'lucide-react';

export const BOP_TFC_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbw-Nfgfs9FnoQtbpS8o_NmlJoJRCNjAYB6kDehbJY1mqi5HNMek3cc_OHFNj_bdcS5tQg/exec';

interface TfcChallanHubProps {
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
  onClose?: () => void;
}

// Helper to parse dates into ISO, comparable timestamp, and standard DD-MMMM-YYYY CashBook format
function parseChallanDate(rawDate: string) {
  if (!rawDate) {
    return {
      iso: '2026-08-01',
      formattedDate: '01-August-2026',
      monthName: 'August',
      timestamp: new Date(2026, 7, 1).getTime(),
      day: 1,
      year: 2026,
    };
  }

  // Handle format "Aug 03, 26" or "Aug 03, 2026"
  const m1 = rawDate.match(/([A-Za-z]+)\s+(\d+),?\s+(\d+)/);
  if (m1) {
    const monMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
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
    const fullMon = fullMonths[mIdx];
    return {
      iso: `${yr}-${String(mIdx + 1).padStart(2, '0')}-${dayStr}`,
      formattedDate: `${dayStr}-${fullMon}-${yr}`,
      monthName: fullMon,
      timestamp: new Date(yr, mIdx, day).getTime(),
      day,
      year: yr,
    };
  }

  // Handle format "03-Aug-2026" or "03-August-2026"
  const m2 = rawDate.match(/(\d+)-([A-Za-z]+)-(\d+)/);
  if (m2) {
    const monMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
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
    const fullMon = fullMonths[mIdx];
    return {
      iso: `${yr}-${String(mIdx + 1).padStart(2, '0')}-${dayStr}`,
      formattedDate: `${dayStr}-${fullMon}-${yr}`,
      monthName: fullMon,
      timestamp: new Date(yr, mIdx, day).getTime(),
      day,
      year: yr,
    };
  }

  return {
    iso: '2026-08-01',
    formattedDate: '01-August-2026',
    monthName: 'August',
    timestamp: new Date(2026, 7, 1).getTime(),
    day: 1,
    year: 2026,
  };
}

const COURSE_SORT_PRIORITY: Record<string, number> = {
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

export const TfcChallanHub: React.FC<TfcChallanHubProps> = ({
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
  onClose,
}) => {
  const [challans, setChallans] = useState<TfcChallanRecord[]>(() => getStoredTfcChallans());
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(false);
  const [backendSyncStatus, setBackendSyncStatus] = useState<{
    lastSyncTime: string | null;
    success: boolean | null;
    message: string | null;
  }>({
    lastSyncTime: null,
    success: null,
    message: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<
    'DATE_WISE_RECEIPTS' | 'MONTH_WISE_RECEIPTS' | 'OVERVIEW' | 'CASHBOOK_GEN' | 'HARD_CASHBOOK' | 'COURSE_MATRIX' | 'DIRECTORY'
  >('DATE_WISE_RECEIPTS');
  const [postingGrouping, setPostingGrouping] = useState<'DATE_WISE' | 'DATE_COURSE_WISE'>('DATE_COURSE_WISE');
  const [startRow, setStartRow] = useState<number>(6);
  const [monthDisplayMode, setMonthDisplayMode] = useState<'FORMULA' | 'TEXT'>('FORMULA');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHardCashBookPrintPortal, setShowHardCashBookPrintPortal] = useState<boolean>(false);

  // Live fetch from Google Sheet backend (tab: BOP_TFC_RAW)
  const fetchGoogleSheetData = useCallback(async (isManualRefresh = false) => {
    setIsLoadingBackend(true);
    try {
      const response = await fetch(BOP_TFC_WEB_APP_URL, {
        method: 'GET',
        redirect: 'follow',
      });
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Invalid data format received from Web App');
      }

      const parsedRecords = parseGoogleSheetRawToTfcChallans(result.data);
      if (parsedRecords.length > 0) {
        setChallans(parsedRecords);
        saveStoredTfcChallans(parsedRecords);
        setBackendSyncStatus({
          lastSyncTime: new Date().toLocaleTimeString(),
          success: true,
          message: `Synced ${parsedRecords.length} challans from BOP_TFC_RAW Google Sheet`,
        });
      } else {
        setBackendSyncStatus({
          lastSyncTime: new Date().toLocaleTimeString(),
          success: false,
          message: 'Google Sheet returned 0 trainee rows',
        });
      }
    } catch (err: any) {
      console.error('Error syncing from BOP_TFC_RAW Web App:', err);
      setBackendSyncStatus({
        lastSyncTime: new Date().toLocaleTimeString(),
        success: false,
        message: err.message || 'Failed to connect to Google Sheet Web App',
      });
    } finally {
      setIsLoadingBackend(false);
    }
  }, []);

  // Fetch immediately on mount
  useEffect(() => {
    fetchGoogleSheetData(false);
  }, [fetchGoogleSheetData]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Distinct Months available in dataset
  const availableMonths = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; timestamp: number }>();
    challans.forEach((c) => {
      const d = parseChallanDate(c.challanPaymentDate);
      const key = `${d.monthName} ${d.year}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, label: `${d.monthName} ${d.year}`, count: 1, timestamp: d.timestamp });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [challans]);

  // Distinct Dates for filtering (sorted chronologically)
  const distinctDates = useMemo(() => {
    const map = new Map<string, number>();
    challans.forEach((c) => {
      if (c.challanPaymentDate) {
        const p = parseChallanDate(c.challanPaymentDate);
        map.set(c.challanPaymentDate, p.timestamp);
      }
    });
    return Array.from(map.keys()).sort((a, b) => (map.get(a) || 0) - (map.get(b) || 0));
  }, [challans]);

  // Distinct Courses for filtering
  const distinctCourses = useMemo(() => {
    const set = new Set<string>();
    challans.forEach((c) => {
      if (c.courseAbbreviation) set.add(c.courseAbbreviation);
    });
    return Array.from(set).sort();
  }, [challans]);

  // Filtered Challans
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      if (selectedMonth !== 'ALL') {
        const d = parseChallanDate(c.challanPaymentDate);
        if (`${d.monthName} ${d.year}` !== selectedMonth) return false;
      }
      if (selectedCourse !== 'ALL' && c.courseAbbreviation !== selectedCourse) return false;
      if (selectedDate !== 'ALL' && c.challanPaymentDate !== selectedDate) return false;
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
  }, [challans, selectedMonth, selectedCourse, selectedDate, searchQuery]);

  // Financial Totals with exact head breakdown
  const totals = useMemo(() => {
    let grossTotal = 0;
    let tevtaShare = 0; // Admission/Tuition 100% + 25% Pupil Fee (Auto diverted by portal to HQ Lahore)
    let netPostingReceipts = 0; // Net Cash Book receipts amount: Gross less TEVTA share
    let pupil75Share = 0; // 75% Pupil Fee (For reference)
    let securityShare = 0; // Institute Security (For reference)
    let bteSelfFinanceShare = 0; // BTE Self-Finance Fee
    let boardChargesShare = 0; // Board Registration & Exam Fee
    let tuvCertificationShare = 0; // TUV Rheinland Certification Fee
    let otherFeeShare = 0;
    let portalHoTotal = 0;
    let portalInstTotal = 0;

    for (const c of filteredChallans) {
      const tShare = c.admissionTuitionRegFee + c.pupilFee25Percent;
      grossTotal += c.totalAmount;
      tevtaShare += tShare;
      netPostingReceipts += Math.max(0, c.totalAmount - tShare);
      pupil75Share += c.pupilFee75Percent;
      securityShare += c.instituteSecurity;
      otherFeeShare += c.otherFee;
      portalHoTotal += c.headOfficeTotal;
      portalInstTotal += c.instituteTotal;

      if (c.courseAbbreviation === 'BTE') {
        bteSelfFinanceShare += c.otherFee;
      } else if (c.courseAbbreviation === 'TUV') {
        tuvCertificationShare += c.otherFee;
      } else {
        boardChargesShare += c.otherFee;
      }
    }

    return {
      grossTotal,
      tevtaShare,
      netPostingReceipts,
      pupil75Share,
      securityShare,
      bteSelfFinanceShare,
      boardChargesShare,
      tuvCertificationShare,
      otherFeeShare,
      portalHoTotal,
      portalInstTotal,
      count: filteredChallans.length,
    };
  }, [filteredChallans]);

  // CashBook Posting Batches Generator matching the exact Google Sheet format (Columns B to I)
  // Posting amount = Gross Amount less Central TEVTA Share (100% admission/tuition + 25% Pupil Fund)
  const cashBookRows = useMemo(() => {
    interface CashBookReceiptEntry {
      key: string;
      date: string;
      month: string;
      monthFormula: string;
      vNo: string;
      particular: string;
      paidToBy: string;
      accountHead: string;
      chequeNo: string;
      receipts: number; // Net amount posted to cashbook
      grossAmount: number;
      tevtaShareAmount: number;
      traineeCount: number;
      courseCode: string;
    }

    const receiptEntries: CashBookReceiptEntry[] = [];

    if (postingGrouping === 'DATE_WISE') {
      interface DayGroup {
        dateInfo: ReturnType<typeof parseChallanDate>;
        challanIds: string[];
        traineeCount: number;
        grossTotal: number;
        tevtaShare: number;
        netReceiptTotal: number;
        courses: Set<string>;
      }

      const dayWiseMap: Record<string, DayGroup> = {};
      for (const c of filteredChallans) {
        const dateInfo = parseChallanDate(c.challanPaymentDate);
        const dKey = dateInfo.iso;
        if (!dayWiseMap[dKey]) {
          dayWiseMap[dKey] = {
            dateInfo,
            challanIds: [],
            traineeCount: 0,
            grossTotal: 0,
            tevtaShare: 0,
            netReceiptTotal: 0,
            courses: new Set(),
          };
        }
        const tShare = (c.admissionTuitionRegFee || 0) + (c.pupilFee25Percent || 0);
        const netReceipt = Math.max(0, c.totalAmount - tShare);

        dayWiseMap[dKey].challanIds.push(c.challanId);
        dayWiseMap[dKey].traineeCount += 1;
        dayWiseMap[dKey].grossTotal += c.totalAmount;
        dayWiseMap[dKey].tevtaShare += tShare;
        dayWiseMap[dKey].netReceiptTotal += netReceipt;
        dayWiseMap[dKey].courses.add(c.courseAbbreviation);
      }

      const sortedDateKeys = Object.keys(dayWiseMap).sort();
      let seq = 1;
      for (const dKey of sortedDateKeys) {
        const item = dayWiseMap[dKey];
        const vNum = `${seq}`;
        const rowOffset = startRow + (seq - 1);
        const monthFormula = `=TEXT(B${rowOffset},"mmmm")`;

        const courseList = Array.from(item.courses)
          .sort((a, b) => (COURSE_SORT_PRIORITY[a] ?? 50) - (COURSE_SORT_PRIORITY[b] ?? 50))
          .join(', ');

        const briefExplanation = `(Gross: ${formatPKR(item.grossTotal, false)} − TEVTA: ${formatPKR(item.tevtaShare, false)})`;

        receiptEntries.push({
          key: `rec-date-${dKey}`,
          date: item.dateInfo.formattedDate,
          month: item.dateInfo.monthName,
          monthFormula,
          vNo: vNum,
          particular: `${courseList} ${item.traineeCount} challans ${briefExplanation}`,
          paidToBy: courseList,
          accountHead: 'A00000TFC-TEVTA FEE COL.',
          chequeNo: `${item.traineeCount}-Challans`,
          receipts: item.netReceiptTotal,
          grossAmount: item.grossTotal,
          tevtaShareAmount: item.tevtaShare,
          traineeCount: item.traineeCount,
          courseCode: courseList,
        });
        seq++;
      }
    } else {
      // DATE & COURSE WISE (Strictly separate MVi & MVii, sorted by Date, then Course)
      interface DayCourseGroup {
        dateInfo: ReturnType<typeof parseChallanDate>;
        courses: Record<
          string,
          {
            course: string;
            courseTitle: string;
            challanIds: string[];
            traineeCount: number;
            grossTotal: number;
            tevtaShare: number;
            netReceiptTotal: number;
          }
        >;
      }

      const dayMap: Record<string, DayCourseGroup> = {};

      for (const c of filteredChallans) {
        const dateInfo = parseChallanDate(c.challanPaymentDate);
        const dateKey = dateInfo.iso;
        if (!dayMap[dateKey]) {
          dayMap[dateKey] = {
            dateInfo,
            courses: {},
          };
        }
        const course = c.courseAbbreviation || 'OTHER';
        if (!dayMap[dateKey].courses[course]) {
          dayMap[dateKey].courses[course] = {
            course,
            courseTitle: COURSE_TITLE_MAP[course] || c.courseName,
            challanIds: [],
            traineeCount: 0,
            grossTotal: 0,
            tevtaShare: 0,
            netReceiptTotal: 0,
          };
        }
        const tShare = (c.admissionTuitionRegFee || 0) + (c.pupilFee25Percent || 0);
        const netReceipt = Math.max(0, c.totalAmount - tShare);

        dayMap[dateKey].courses[course].challanIds.push(c.challanId);
        dayMap[dateKey].courses[course].traineeCount += 1;
        dayMap[dateKey].courses[course].grossTotal += c.totalAmount;
        dayMap[dateKey].courses[course].tevtaShare += tShare;
        dayMap[dateKey].courses[course].netReceiptTotal += netReceipt;
      }

      // 1. Sort dates chronologically
      const sortedDateKeys = Object.keys(dayMap).sort();

      let seq = 1;
      for (const dKey of sortedDateKeys) {
        const dayGroup = dayMap[dKey];
        // 2. Sort courses for that date according to COURSE_SORT_PRIORITY (MVi, MVii, ADDM, FD, CO, DM, BT, BTE, CK, TUV)
        const sortedCourses = Object.keys(dayGroup.courses).sort((a, b) => {
          const pA = COURSE_SORT_PRIORITY[a] ?? 50;
          const pB = COURSE_SORT_PRIORITY[b] ?? 50;
          if (pA !== pB) return pA - pB;
          return a.localeCompare(b);
        });

        for (const courseKey of sortedCourses) {
          const item = dayGroup.courses[courseKey];
          const vNum = `${seq}`;
          const rowOffset = startRow + (seq - 1);
          const monthFormula = `=TEXT(B${rowOffset},"mmmm")`;

          const briefExplanation = `(Gross: ${formatPKR(item.grossTotal, false)} − TEVTA: ${formatPKR(item.tevtaShare, false)})`;

          receiptEntries.push({
            key: `rec-course-${dKey}-${item.course}`,
            date: dayGroup.dateInfo.formattedDate,
            month: dayGroup.dateInfo.monthName,
            monthFormula,
            vNo: vNum,
            particular: `${item.course} ${item.traineeCount} challans ${briefExplanation}`,
            paidToBy: item.course,
            accountHead: 'A00000TFC-TEVTA FEE COL.',
            chequeNo: `${item.traineeCount}-Challans`,
            receipts: item.netReceiptTotal,
            grossAmount: item.grossTotal,
            tevtaShareAmount: item.tevtaShare,
            traineeCount: item.traineeCount,
            courseCode: item.course,
          });
          seq++;
        }
      }
    }

    return {
      receiptEntries,
    };
  }, [filteredChallans, postingGrouping, startRow]);

  // Copy TSV directly formatted for Google Sheets (Cell B6 paste)
  // Copies 8 Columns corresponding to Cols B to I:
  // Date (B) | Month (C) | V# (D) | Particular (E) | Paid to/by (F) | Account Head (G) | Cheque# (H) | Receipts (I)
  const handleCopyGoogleSheetTSV = () => {
    const lines = cashBookRows.receiptEntries.map((e, idx) => {
      const currentRow = startRow + idx;
      const monthVal = monthDisplayMode === 'FORMULA' ? `=TEXT(B${currentRow},"mmmm")` : e.month;
      return [
        e.date,
        monthVal,
        e.vNo,
        e.particular,
        e.paidToBy,
        e.accountHead,
        e.chequeNo,
        e.receipts,
      ].join('\t');
    });
    const tsv = lines.join('\n');
    handleCopy(tsv, 'COPY_ALL_SHEET_TSV');
  };

  // Copy Single Row TSV (8 columns: B to I)
  const handleCopySingleRowTSV = (e: (typeof cashBookRows.receiptEntries)[0], idx: number) => {
    const currentRow = startRow + idx;
    const monthVal = monthDisplayMode === 'FORMULA' ? `=TEXT(B${currentRow},"mmmm")` : e.month;
    const rowTsv = [
      e.date,
      monthVal,
      e.vNo,
      e.particular,
      e.paidToBy,
      e.accountHead,
      e.chequeNo,
      e.receipts,
    ].join('\t');
    handleCopy(rowTsv, e.key);
  };

  // Export to authentic Excel (.xlsx) file using exceljs
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GVTIW Samanabad Faisalabad';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('TFC CashBook Receipts', {
        views: [{ showGridLines: true }],
      });

      // Header Branding Row
      const titleRow = sheet.addRow(['GVTIW SAMANABAD FAISALABAD — TEVTA FEE COLLECTION (A/C: 6580027832200011)']);
      titleRow.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' }, // Teal 700
      };
      sheet.mergeCells('A1:I1');

      const subtitleRow = sheet.addRow([
        `CASH BOOK RECEIPTS PROFORMA — ${selectedMonth === 'ALL' ? 'FY 2026-27' : selectedMonth} (COLS B TO I)`,
      ]);
      subtitleRow.font = { italic: true, size: 10, color: { argb: 'FFFFFFFF' } };
      subtitleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF134E4A' }, // Teal 900
      };
      sheet.mergeCells('A2:I2');

      sheet.addRow([]);

      // Table Header row (Cols B through I)
      const headerRow = sheet.addRow([
        'Date (B)',
        'Month (C)',
        'V# (D)',
        'Particular / Narration (E)',
        'Paid to / by (F)',
        'Account Head (G)',
        'Cheque / Challan # (H)',
        'Receipts Amount PKR (I)',
        'Gross Collection',
      ]);

      headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF166534' }, // Green 800 matching cash book
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      // Set column widths
      sheet.columns = [
        { width: 18 }, // Date (B)
        { width: 14 }, // Month (C)
        { width: 8 },  // V# (D)
        { width: 28 }, // Particular (E)
        { width: 12 }, // Paid to/by (F)
        { width: 28 }, // Account Head (G)
        { width: 16 }, // Cheque / Challan # (H)
        { width: 22 }, // Receipts (I)
        { width: 18 }, // Gross Collection
      ];

      const startDataRow = 5;
      cashBookRows.receiptEntries.forEach((e, idx) => {
        const actualRow = startRow + idx;
        const row = sheet.addRow([
          e.date,
          monthDisplayMode === 'FORMULA' ? { formula: `=TEXT(A${sheet.rowCount + 1},"mmmm")` } : e.month,
          parseInt(e.vNo, 10) || e.vNo,
          e.particular,
          e.paidToBy,
          e.accountHead,
          e.chequeNo,
          e.receipts,
          e.grossAmount,
        ]);

        row.alignment = { vertical: 'middle' };
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'center' };
        row.getCell(8).numFmt = '#,##0';
        row.getCell(8).font = { bold: true };
        row.getCell(9).numFmt = '#,##0';
      });

      const endDataRow = sheet.rowCount;

      // Total Row
      const totalRow = sheet.addRow([
        'TOTAL',
        '',
        '',
        `${cashBookRows.receiptEntries.length} Course Batches (${filteredChallans.length} Challans)`,
        '',
        '',
        '',
        { formula: `=SUM(H${startDataRow}:H${endDataRow})` },
        { formula: `=SUM(I${startDataRow}:I${endDataRow})` },
      ]);
      totalRow.font = { bold: true, size: 11 };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDF4' }, // Light green
      };
      totalRow.getCell(8).numFmt = '#,##0';
      totalRow.getCell(9).numFmt = '#,##0';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GVTIW_TFC_CashBook_Receipts_${selectedMonth.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel file:', err);
      alert('Failed to generate Excel file. Exporting CSV as fallback.');
      handleExportCSV();
    }
  };

  // -------------------------------------------------------------
  // Hard CashBook Register Data (Matching Official Ledger Sketch)
  // Grouped by ChallanPaymentDate with subtotal rows (<Date> Total)
  // Columns: ChallanID, CNIC, Name, Trade, PaymentType,
  // Admission_Tuition_Reg_Fee, 25PercentPupilFee, 75PercentPupilFee,
  // InstituteSecurity, OtherFee, TFC Credited, TotalAmount,
  // HeadOfficeTotal, InstituteTotal, ChallanPaymentDate
  // -------------------------------------------------------------
  const hardCashBookData = useMemo(() => {
    interface HardCashBookRow {
      challanId: string;
      cnic: string;
      name: string;
      trade: string;
      paymentType: string;
      admissionTuition: number;
      pupil25: number;
      pupil75: number;
      security: number;
      otherFee: number;
      tfcCredited: number; // otherFee + security + pupil75 (Formula =+N+M+L)
      totalAmount: number;
      headOfficeTotal: number;
      instituteTotal: number;
      paymentDate: string;
    }

    interface DateGroup {
      dateKey: string;
      paymentDate: string;
      rows: HardCashBookRow[];
      subtotal: {
        admissionTuition: number;
        pupil25: number;
        pupil75: number;
        security: number;
        otherFee: number;
        tfcCredited: number;
        totalAmount: number;
        headOfficeTotal: number;
        instituteTotal: number;
        count: number;
      };
    }

    const groupMap: Record<string, DateGroup> = {};

    for (const c of filteredChallans) {
      const dateInfo = parseChallanDate(c.challanPaymentDate);
      const dKey = dateInfo.iso;
      const paymentDate = dateInfo.formattedDate;

      if (!groupMap[dKey]) {
        groupMap[dKey] = {
          dateKey: dKey,
          paymentDate,
          rows: [],
          subtotal: {
            admissionTuition: 0,
            pupil25: 0,
            pupil75: 0,
            security: 0,
            otherFee: 0,
            tfcCredited: 0,
            totalAmount: 0,
            headOfficeTotal: 0,
            instituteTotal: 0,
            count: 0,
          },
        };
      }

      const admissionTuition = c.admissionTuitionRegFee || 0;
      const pupil25 = c.pupilFee25Percent || 0;
      const pupil75 = c.pupilFee75Percent || 0;
      const security = c.instituteSecurity || 0;
      const otherFee = c.otherFee || 0;
      const tfcCredited = otherFee + security + pupil75; // Matches Excel formula =+N2+M2+L2
      const totalAmount = c.totalAmount || 0;
      const headOfficeTotal = c.headOfficeTotal || 0;
      const instituteTotal = c.instituteTotal || 0;

      groupMap[dKey].rows.push({
        challanId: c.challanId,
        cnic: c.cnic,
        name: c.name,
        trade: getCleanTradeAbbreviation(c),
        paymentType: c.paymentType || 'Challa',
        admissionTuition,
        pupil25,
        pupil75,
        security,
        otherFee,
        tfcCredited,
        totalAmount,
        headOfficeTotal,
        instituteTotal,
        paymentDate,
      });

      groupMap[dKey].subtotal.admissionTuition += admissionTuition;
      groupMap[dKey].subtotal.pupil25 += pupil25;
      groupMap[dKey].subtotal.pupil75 += pupil75;
      groupMap[dKey].subtotal.security += security;
      groupMap[dKey].subtotal.otherFee += otherFee;
      groupMap[dKey].subtotal.tfcCredited += tfcCredited;
      groupMap[dKey].subtotal.totalAmount += totalAmount;
      groupMap[dKey].subtotal.headOfficeTotal += headOfficeTotal;
      groupMap[dKey].subtotal.instituteTotal += instituteTotal;
      groupMap[dKey].subtotal.count += 1;
    }

    const sortedDateKeys = Object.keys(groupMap).sort();
    const dateGroups = sortedDateKeys.map((k) => {
      const group = groupMap[k];
      // Intelligently group by date & sort rows by trade within each date group
      group.rows.sort((a, b) => {
        // 1. Primary: Sort by trade alphabetically (e.g. ADDM, CK, MVi, MVii, etc.)
        const tradeDiff = a.trade.localeCompare(b.trade);
        if (tradeDiff !== 0) return tradeDiff;
        // 2. Secondary: Sort by trainee name
        const nameDiff = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        if (nameDiff !== 0) return nameDiff;
        // 3. Tertiary: Sort by Challan ID
        return a.challanId.localeCompare(b.challanId, undefined, { numeric: true });
      });
      return group;
    });

    const grandTotal = dateGroups.reduce(
      (acc, g) => {
        acc.admissionTuition += g.subtotal.admissionTuition;
        acc.pupil25 += g.subtotal.pupil25;
        acc.pupil75 += g.subtotal.pupil75;
        acc.security += g.subtotal.security;
        acc.otherFee += g.subtotal.otherFee;
        acc.tfcCredited += g.subtotal.tfcCredited;
        acc.totalAmount += g.subtotal.totalAmount;
        acc.headOfficeTotal += g.subtotal.headOfficeTotal;
        acc.instituteTotal += g.subtotal.instituteTotal;
        acc.count += g.subtotal.count;
        return acc;
      },
      {
        admissionTuition: 0,
        pupil25: 0,
        pupil75: 0,
        security: 0,
        otherFee: 0,
        tfcCredited: 0,
        totalAmount: 0,
        headOfficeTotal: 0,
        instituteTotal: 0,
        count: 0,
      }
    );

    return { dateGroups, grandTotal };
  }, [filteredChallans]);

  // Export Hard CashBook Register to PDF (.pdf)
  const handleExportHardCashBookPdf = () => {
    generateHardCashBookPdf({
      periodLabel: selectedMonth === 'ALL' ? 'All Months' : selectedMonth,
      dateGroups: hardCashBookData.dateGroups,
      grandTotal: hardCashBookData.grandTotal,
      totalChallans: filteredChallans.length,
    });
  };

  // Print Isolated Hard CashBook in Landscape A4
  const handlePrintHardCashBook = () => {
    setShowHardCashBookPrintPortal(true);
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
        setShowHardCashBookPrintPortal(false);
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      }, 1000);
    }, 200);
  };

  // Human-readable title for active report
  const getActiveReportLabel = () => {
    switch (activeSubTab) {
      case 'HARD_CASHBOOK':
        return 'Hard CashBook';
      case 'DATE_WISE_RECEIPTS':
        return 'Date Wise Receipts';
      case 'MONTH_WISE_RECEIPTS':
        return 'Month Wise Receipts';
      case 'CASHBOOK_GEN':
        return 'CashBook Posting';
      case 'COURSE_MATRIX':
        return 'Course Matrix';
      case 'DIRECTORY':
        return 'Challan Directory';
      default:
        return 'Active Report';
    }
  };

  // Universal PDF export for whichever report is active in Fee Hub
  const handleExportActivePdf = () => {
    if (activeSubTab === 'HARD_CASHBOOK') {
      handleExportHardCashBookPdf();
      return;
    }

    const isMonthWise = activeSubTab === 'MONTH_WISE_RECEIPTS';
    const mode = isMonthWise ? ('MONTH_WISE' as const) : ('DATE_WISE' as const);

    const map = new Map<string, {
      key: string;
      label: string;
      breakdown: ChallanFeeBreakdown;
      challanCount: number;
    }>();

    const grandTotal: ChallanFeeBreakdown = {
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

    filteredChallans.forEach((c) => {
      const d = parseChallanDate(c.challanPaymentDate);
      const groupKey = isMonthWise ? `${d.monthName} ${d.year}` : (d.iso || c.challanPaymentDate);
      const groupLabel = isMonthWise ? `${d.monthName} ${d.year}` : (d.formattedDate || c.challanPaymentDate);

      const bd = computeChallanFeeBreakdown(c);

      grandTotal.admissionTuitionRegFee += bd.admissionTuitionRegFee;
      grandTotal.pupilFee25Percent += bd.pupilFee25Percent;
      grandTotal.totalTevtaDues += bd.totalTevtaDues;
      grandTotal.pupilFee75Percent += bd.pupilFee75Percent;
      grandTotal.collegeSecurity += bd.collegeSecurity;
      grandTotal.boardCharges += bd.boardCharges;
      grandTotal.shortCourseSelfFinance += bd.shortCourseSelfFinance;
      grandTotal.bankProfit += bd.bankProfit;
      grandTotal.subTotalInstituteShare += bd.subTotalInstituteShare;
      grandTotal.totalAmountReceived += bd.totalAmountReceived;
      grandTotal.instituteShare += bd.instituteShare;

      const existing = map.get(groupKey);
      if (existing) {
        existing.breakdown.admissionTuitionRegFee += bd.admissionTuitionRegFee;
        existing.breakdown.pupilFee25Percent += bd.pupilFee25Percent;
        existing.breakdown.totalTevtaDues += bd.totalTevtaDues;
        existing.breakdown.pupilFee75Percent += bd.pupilFee75Percent;
        existing.breakdown.collegeSecurity += bd.collegeSecurity;
        existing.breakdown.boardCharges += bd.boardCharges;
        existing.breakdown.shortCourseSelfFinance += bd.shortCourseSelfFinance;
        existing.breakdown.bankProfit += bd.bankProfit;
        existing.breakdown.subTotalInstituteShare += bd.subTotalInstituteShare;
        existing.breakdown.totalAmountReceived += bd.totalAmountReceived;
        existing.breakdown.instituteShare += bd.instituteShare;
        existing.challanCount += 1;
      } else {
        map.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          breakdown: { ...bd },
          challanCount: 1,
        });
      }
    });

    const rows = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));

    generateReceiptsRegisterPdf({
      mode,
      periodLabel: selectedMonth === 'ALL' ? 'All Months' : selectedMonth,
      courseFilter: selectedCourse === 'ALL' ? 'All Courses' : (COURSE_TITLE_MAP[selectedCourse] || selectedCourse),
      rows,
      grandTotal,
      totalChallans: filteredChallans.length,
    });
  };

  // Export Hard CashBook Register to Excel (.xlsx) exactly matching Image 1
  const handleExportHardCashBookExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GVTIW Samanabad Faisalabad';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('Hard CashBook Register', {
        views: [{ showGridLines: true }],
      });

      // Orange Header Row matching Image 1: ChallanPaymentDate shifted to the start (left side)
      const headerRow = sheet.addRow([
        'ChallanPaymentDate',
        'ChallanID',
        'CNIC',
        'Name',
        'Trade',
        'PaymentType',
        'Admission_Tuition_Reg_Fee',
        '25PercentPupilFee',
        '75PercentPupilFee',
        'InstituteSecurity',
        'OtherFee',
        'TFC Credited',
        'TotalAmount',
        'HeadOfficeTotal',
        'InstituteTotal',
      ]);

      headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFED7D31' }, // Orange matching Image 1
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      sheet.columns = [
        { width: 20 }, // ChallanPaymentDate
        { width: 14 }, // ChallanID
        { width: 18 }, // CNIC
        { width: 34 }, // Name
        { width: 12 }, // Trade
        { width: 14 }, // PaymentType
        { width: 16 }, // Admission_Tuition_Reg_Fee
        { width: 14 }, // 25PercentPupilFee
        { width: 14 }, // 75PercentPupilFee
        { width: 14 }, // InstituteSecurity
        { width: 12 }, // OtherFee
        { width: 16 }, // TFC Credited
        { width: 16 }, // TotalAmount
        { width: 16 }, // HeadOfficeTotal
        { width: 14 }, // InstituteTotal
      ];

      hardCashBookData.dateGroups.forEach((group) => {
        group.rows.forEach((r) => {
          const row = sheet.addRow([
            r.paymentDate,
            r.challanId,
            r.cnic,
            r.name,
            r.trade,
            r.paymentType,
            r.admissionTuition,
            r.pupil25,
            r.pupil75,
            r.security,
            r.otherFee === 0 ? '-' : r.otherFee,
            r.tfcCredited,
            r.totalAmount,
            r.headOfficeTotal,
            r.instituteTotal,
          ]);

          row.alignment = { vertical: 'middle' };
          row.getCell(1).alignment = { horizontal: 'center' };
          row.getCell(2).alignment = { horizontal: 'center' };
          row.getCell(3).alignment = { horizontal: 'center' };
          row.getCell(5).alignment = { horizontal: 'center' };
          row.getCell(6).alignment = { horizontal: 'center' };
          row.getCell(7).numFmt = '#,##0';
          row.getCell(8).numFmt = '#,##0';
          row.getCell(9).numFmt = '#,##0';
          row.getCell(10).numFmt = '#,##0';
          row.getCell(11).numFmt = '#,##0';
          row.getCell(12).numFmt = '#,##0';
          row.getCell(12).font = { bold: true };
          row.getCell(12).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2CC' }, // Gold highlight for TFC Credited
          };
          row.getCell(13).numFmt = '#,##0';
          row.getCell(14).numFmt = '#,##0';
          row.getCell(15).numFmt = '#,##0';
        });

        // Subtotal row matching Image 1
        const subRow = sheet.addRow([
          `${group.paymentDate} Total`,
          '',
          '',
          '',
          '',
          '',
          group.subtotal.admissionTuition,
          group.subtotal.pupil25,
          group.subtotal.pupil75,
          group.subtotal.security,
          group.subtotal.otherFee === 0 ? '-' : group.subtotal.otherFee,
          group.subtotal.tfcCredited,
          group.subtotal.totalAmount,
          group.subtotal.headOfficeTotal,
          group.subtotal.instituteTotal,
        ]);

        subRow.font = { bold: true, size: 10 };
        subRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }, // Light Grey matching Image 1
        };
        subRow.getCell(1).font = { bold: true };
        subRow.getCell(1).alignment = { horizontal: 'left' };
        for (let c = 7; c <= 15; c++) {
          subRow.getCell(c).numFmt = '#,##0';
        }
      });

      // Grand total row at bottom
      const grandRow = sheet.addRow([
        'GRAND TOTAL',
        `All (${filteredChallans.length} Challans)`,
        '',
        '',
        '',
        '',
        hardCashBookData.grandTotal.admissionTuition,
        hardCashBookData.grandTotal.pupil25,
        hardCashBookData.grandTotal.pupil75,
        hardCashBookData.grandTotal.security,
        hardCashBookData.grandTotal.otherFee === 0 ? '-' : hardCashBookData.grandTotal.otherFee,
        hardCashBookData.grandTotal.tfcCredited,
        hardCashBookData.grandTotal.totalAmount,
        hardCashBookData.grandTotal.headOfficeTotal,
        hardCashBookData.grandTotal.instituteTotal,
      ]);
      grandRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      grandRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC65911' }, // Deep orange
      };
      grandRow.getCell(1).alignment = { horizontal: 'left' };
      for (let c = 7; c <= 15; c++) {
        grandRow.getCell(c).numFmt = '#,##0';
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GVTIW_Hard_CashBook_Register_${selectedMonth.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Hard CashBook Excel file:', err);
    }
  };

  // Copy Hard CashBook TSV for direct paste into Excel / Sheets
  const handleCopyHardCashBookTSV = () => {
    const headers = [
      'ChallanPaymentDate',
      'ChallanID',
      'CNIC',
      'Name',
      'Trade',
      'PaymentType',
      'Admission_Tuition_Reg_Fee',
      '25PercentPupilFee',
      '75PercentPupilFee',
      'InstituteSecurity',
      'OtherFee',
      'TFC Credited',
      'TotalAmount',
      'HeadOfficeTotal',
      'InstituteTotal',
    ];

    const lines: string[] = [headers.join('\t')];

    hardCashBookData.dateGroups.forEach((group) => {
      group.rows.forEach((r) => {
        lines.push(
          [
            r.paymentDate,
            r.challanId,
            r.cnic,
            r.name,
            r.trade,
            r.paymentType,
            r.admissionTuition,
            r.pupil25,
            r.pupil75,
            r.security,
            r.otherFee === 0 ? '-' : r.otherFee,
            r.tfcCredited,
            r.totalAmount,
            r.headOfficeTotal,
            r.instituteTotal,
          ].join('\t')
        );
      });
      lines.push(
        [
          `${group.paymentDate} Total`,
          '',
          '',
          '',
          '',
          '',
          group.subtotal.admissionTuition,
          group.subtotal.pupil25,
          group.subtotal.pupil75,
          group.subtotal.security,
          group.subtotal.otherFee === 0 ? '-' : group.subtotal.otherFee,
          group.subtotal.tfcCredited,
          group.subtotal.totalAmount,
          group.subtotal.headOfficeTotal,
          group.subtotal.instituteTotal,
        ].join('\t')
      );
    });

    lines.push(
      [
        'GRAND TOTAL',
        `All (${filteredChallans.length} Challans)`,
        '',
        '',
        '',
        '',
        hardCashBookData.grandTotal.admissionTuition,
        hardCashBookData.grandTotal.pupil25,
        hardCashBookData.grandTotal.pupil75,
        hardCashBookData.grandTotal.security,
        hardCashBookData.grandTotal.otherFee === 0 ? '-' : hardCashBookData.grandTotal.otherFee,
        hardCashBookData.grandTotal.tfcCredited,
        hardCashBookData.grandTotal.totalAmount,
        hardCashBookData.grandTotal.headOfficeTotal,
        hardCashBookData.grandTotal.instituteTotal,
      ].join('\t')
    );

    handleCopy(lines.join('\n'), 'HARD_CASHBOOK_TSV');
  };

  // Course Matrix Summary with breakdown
  const courseMatrix = useMemo(() => {
    const map: Record<
      string,
      {
        code: string;
        title: string;
        count: number;
        admission: number;
        pupil25: number;
        pupil75: number;
        security: number;
        bteSelfFinance: number;
        boardCharges: number;
        tuvFee: number;
        total: number;
      }
    > = {};

    for (const c of filteredChallans) {
      const code = c.courseAbbreviation;
      if (!map[code]) {
        map[code] = {
          code,
          title: COURSE_TITLE_MAP[code] || c.courseName,
          count: 0,
          admission: 0,
          pupil25: 0,
          pupil75: 0,
          security: 0,
          bteSelfFinance: 0,
          boardCharges: 0,
          tuvFee: 0,
          total: 0,
        };
      }
      map[code].count += 1;
      map[code].admission += c.admissionTuitionRegFee;
      map[code].pupil25 += c.pupilFee25Percent;
      map[code].pupil75 += c.pupilFee75Percent;
      map[code].security += c.instituteSecurity;
      map[code].total += c.totalAmount;

      if (code === 'BTE') {
        map[code].bteSelfFinance += c.otherFee;
      } else if (code === 'TUV') {
        map[code].tuvFee += c.otherFee;
      } else {
        map[code].boardCharges += c.otherFee;
      }
    }

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredChallans]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'SrNo',
      'ChallanID',
      'PaymentDate',
      'CourseCode',
      'RollOrCode',
      'TraineeName',
      'GuardianName',
      'CNIC',
      'CourseTitle',
      'Admission_Tuition',
      '25PercentPupilFee',
      '75PercentPupilFee',
      'SecurityDeposit',
      'OtherFee',
      'OtherFeeClassification',
      'TargetDisbursementAccount',
      'TotalAmount',
      'AutoTevtaShare',
      'Status',
    ];

    const rows = filteredChallans.map((c) => {
      const cls = classifyOtherFee(c.courseAbbreviation);
      return [
        c.srNo,
        c.challanId,
        `"${c.challanPaymentDate}"`,
        `"${c.courseAbbreviation}"`,
        `"${c.rollOrCode}"`,
        `"${c.traineeName}"`,
        `"${c.guardianName}"`,
        `"${c.cnic}"`,
        `"${COURSE_TITLE_MAP[c.courseAbbreviation] || c.courseName}"`,
        c.admissionTuitionRegFee,
        c.pupilFee25Percent,
        c.pupilFee75Percent,
        c.instituteSecurity,
        c.otherFee,
        `"${cls.label}"`,
        `"${cls.targetAccountName} (${cls.targetAccountNo})"`,
        c.totalAmount,
        c.admissionTuitionRegFee + c.pupilFee25Percent,
        `"${c.challanStatus}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GVTIW_TFC_Portal_Challans_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={`rounded-2xl border shadow-xl overflow-hidden ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & BRANDING BAR                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="p-6 bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white border-b border-teal-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center p-2.5 shadow-inner">
              <Building2 className="w-8 h-8 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/40">
                  TEVTA Fee Collection (TFC) Portal Hub
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                  BOP TFC A/C: 6580027832200011
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  College ID: 33028
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                BOP Trainee Fee Challan & Multi-Head Inter-Account Distribution Hub
              </h2>
              <p className="text-xs text-teal-200/90 mt-0.5">
                Exact disbursement routing: Auto-transferred TEVTA share vs. manual cheques to Pupil Funds (6580027832200022), Securities (6580027832200044) & Short Course (6580027832200033).
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchGoogleSheetData(true)}
              disabled={isLoadingBackend}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Fetch live records from Google Sheet tab: BOP_TFC_RAW"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-200 ${isLoadingBackend ? 'animate-spin' : ''}`} />
              <span>{isLoadingBackend ? 'Syncing Backend...' : 'Sync Google Sheet'}</span>
            </button>

            {/* Download PDF for Active Report in Fee Hub */}
            <button
              onClick={handleExportActivePdf}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title={`Download official vector PDF report for active tab: ${getActiveReportLabel()}`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-200" />
              <span>Download PDF ({getActiveReportLabel()})</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-white/20 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-300" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print Schedule</span>
            </button>
          </div>
        </div>

        {/* Backend Sync Live Banner / Indicator */}
        {backendSyncStatus.lastSyncTime && (
          <div className="mt-3 pt-2.5 border-t border-teal-800/40 flex items-center justify-between text-[11px] text-teal-200/90 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${backendSyncStatus.success ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>
                Backend Status: <strong className="text-white">{backendSyncStatus.message}</strong>
              </span>
            </div>
            <span className="text-teal-300/80 font-mono text-[10px]">
              Last Synced: {backendSyncStatus.lastSyncTime}
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. EXECUTIVE RECONCILIATION KPI DECK (HIGH CONTRAST)           */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-6 border-b ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Gross Deposited */}
          <div
            className={`p-4 rounded-xl border-2 ${
              darkMode ? 'bg-slate-900 border-teal-500/40' : 'bg-white border-teal-600 shadow-sm'
            } relative overflow-hidden`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-teal-300' : 'text-teal-900'}`}>
                Gross BOP Deposit
              </span>
              <Building2 className="w-4 h-4 text-teal-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-teal-400' : 'text-teal-950'}`}>
              {formatPKR(totals.grossTotal, false)}
            </div>
            <div className="text-[11px] font-bold mt-1 flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>{totals.count} Paid Challans</span>
              <span className="font-extrabold text-teal-700 dark:text-teal-300">100% Inflow</span>
            </div>
          </div>

          {/* Card 2: Auto TEVTA Share */}
          <div
            className={`p-4 rounded-xl border-2 ${
              darkMode ? 'bg-slate-900 border-blue-500/40' : 'bg-white border-blue-600 shadow-sm'
            } relative overflow-hidden`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                Auto TEVTA Share
              </span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-blue-400' : 'text-blue-950'}`}>
              {formatPKR(totals.tevtaShare, false)}
            </div>
            <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 mt-1">
              Admission + 25% PF (Auto-Transferred)
            </div>
          </div>

          {/* Card 3: Net Cash Book Receipts (Gross - TEVTA Share) */}
          <div
            className={`p-4 rounded-xl border-2 ${
              darkMode ? 'bg-slate-900 border-emerald-500/80' : 'bg-emerald-50/90 border-emerald-600 shadow-sm'
            } relative overflow-hidden`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-emerald-300' : 'text-emerald-950'}`}>
                Net Cash Book Posting
              </span>
              <Receipt className="w-4 h-4 text-emerald-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-emerald-400' : 'text-emerald-950'}`}>
              {formatPKR(totals.netPostingReceipts, false)}
            </div>
            <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mt-1">
              Gross less TEVTA Share (Posted to TFC)
            </div>
          </div>

          {/* Card 4: Cheque to Pupil Funds (75%) */}
          <div
            className={`p-4 rounded-xl border-2 ${
              darkMode ? 'bg-slate-900 border-teal-500/40' : 'bg-teal-50/60 border-teal-600 shadow-sm'
            } relative overflow-hidden`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-teal-300' : 'text-teal-950'}`}>
                Manual: Pupil Funds
              </span>
              <CreditCard className="w-4 h-4 text-teal-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-teal-400' : 'text-teal-950'}`}>
              {formatPKR(totals.pupil75Share, false)}
            </div>
            <div className="text-[11px] font-bold text-teal-800 dark:text-teal-300 mt-1">
              75% PF → A/C: 6580027832200022
            </div>
          </div>

          {/* Card 5: Cheque to Student Securities */}
          <div
            className={`p-4 rounded-xl border-2 ${
              darkMode ? 'bg-slate-900 border-amber-500/60' : 'bg-amber-50/80 border-amber-600 shadow-sm'
            } relative overflow-hidden`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-amber-300' : 'text-amber-950'}`}>
                Manual: Securities
              </span>
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-amber-400' : 'text-amber-950'}`}>
              {formatPKR(totals.securityShare, false)}
            </div>
            <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-1">
              Caution Money → A/C: 6580027832200044
            </div>
          </div>

          {/* Card 6: Short Course (BTE) & Board Fees */}
          <div
            className={`p-4 rounded-xl border-2 ${
              darkMode ? 'bg-slate-900 border-indigo-500/60' : 'bg-indigo-50/80 border-indigo-600 shadow-sm'
            } relative overflow-hidden`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-black uppercase tracking-wider ${darkMode ? 'text-indigo-300' : 'text-indigo-950'}`}>
                Short Course & Board
              </span>
              <Send className="w-4 h-4 text-indigo-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-indigo-400' : 'text-indigo-950'}`}>
              {formatPKR(totals.bteSelfFinanceShare + totals.boardChargesShare, false)}
            </div>
            <div className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 mt-1">
              BTE: {formatPKR(totals.bteSelfFinanceShare, false)} | PBTE: {formatPKR(totals.boardChargesShare, false)}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. NAVIGATION SUB-TABS & FILTERS BAR                           */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`px-6 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-300'
        }`}
      >
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveSubTab('DATE_WISE_RECEIPTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'DATE_WISE_RECEIPTS'
                ? 'bg-emerald-700 text-white shadow-md'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-white hover:text-slate-950 border border-transparent hover:border-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Date Wise Receipts</span>
          </button>
          <button
            onClick={() => setActiveSubTab('MONTH_WISE_RECEIPTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'MONTH_WISE_RECEIPTS'
                ? 'bg-rose-700 text-white shadow-md'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-white hover:text-slate-950 border border-transparent hover:border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Month Wise Receipts</span>
          </button>
          <button
            onClick={() => setActiveSubTab('OVERVIEW')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'OVERVIEW'
                ? 'bg-teal-700 text-white shadow-md'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-white hover:text-slate-950 border border-transparent hover:border-slate-300'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Distribution Overview</span>
          </button>
          <button
            onClick={() => setActiveSubTab('CASHBOOK_GEN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CASHBOOK_GEN'
                ? 'bg-emerald-700 text-white shadow-md'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-white hover:text-slate-950 border border-transparent hover:border-slate-300'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Soft CashBook Entry</span>
          </button>
          <button
            onClick={() => setActiveSubTab('HARD_CASHBOOK')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'HARD_CASHBOOK'
                ? 'bg-amber-600 text-white shadow-md'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-white hover:text-slate-950 border border-transparent hover:border-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hard CashBook Entry</span>
          </button>
          <button
            onClick={() => setActiveSubTab('COURSE_MATRIX')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'COURSE_MATRIX'
                ? 'bg-purple-700 text-white shadow-md'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-white hover:text-slate-950 border border-transparent hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Course-Wise Matrix</span>
          </button>
          <button
            onClick={() => setActiveSubTab('DIRECTORY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'DIRECTORY'
                ? 'bg-emerald-700 text-white shadow-md'
                : darkMode
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-white hover:text-slate-950 border border-transparent hover:border-slate-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Trainee Challan Directory ({filteredChallans.length})</span>
          </button>
        </div>

        {/* Global Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Challan / Trainee / CNIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-8 pr-3 py-1.5 text-xs rounded-xl border font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
                darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Course Filter */}
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-bold ${
              darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">All Courses ({challans.length})</option>
            {distinctCourses.map((c) => (
              <option key={c} value={c}>
                {c} - {COURSE_TITLE_MAP[c] || c}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-bold ${
              darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">All Payment Dates</option>
            {distinctDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB CONTENTS                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="p-6">
        {/* ============================================================= */}
        {/* SUB-TAB: DATE WISE RECEIPTS (OFFICIAL TEVTA EXCEL LAYOUT)      */}
        {/* ============================================================= */}
        {activeSubTab === 'DATE_WISE_RECEIPTS' && (
          <TfcReceiptsReportView
            challans={challans}
            darkMode={darkMode}
            initialMode="DATE_WISE"
            customGvtiwLogo={customGvtiwLogo}
            customTevtaLogo={customTevtaLogo}
            customGopLogo={customGopLogo}
          />
        )}

        {/* ============================================================= */}
        {/* SUB-TAB: MONTH WISE RECEIPTS (OFFICIAL TEVTA EXCEL LAYOUT)     */}
        {/* ============================================================= */}
        {activeSubTab === 'MONTH_WISE_RECEIPTS' && (
          <TfcReceiptsReportView
            challans={challans}
            darkMode={darkMode}
            initialMode="MONTH_WISE"
            customGvtiwLogo={customGvtiwLogo}
            customTevtaLogo={customTevtaLogo}
            customGopLogo={customGopLogo}
          />
        )}

        {/* ============================================================= */}
        {/* SUB-TAB 1: DISTRIBUTION OVERVIEW                               */}
        {/* ============================================================= */}
        {activeSubTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                darkMode
                  ? 'bg-teal-950/30 border-teal-500/40 text-teal-200'
                  : 'bg-teal-50 border-teal-400 text-teal-950'
              }`}
            >
              <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-black block mb-0.5">
                  Institutional Banking & Multi-Head Allocation Rules (BOP Samanabad)
                </strong>
                Trainee fees are deposited into the <strong>Bank of Punjab (BOP) Fee Collection A/C (6580027832200011)</strong>.
                The BOP portal automatically diverts the <strong>TEVTA Centralized Share</strong> to Head Office Lahore.
                The remaining retainable balances must be transferred by the institute via manual cross cheques to their
                respective official bank accounts:
                <ul className="list-disc pl-5 mt-1.5 space-y-1 font-medium">
                  <li>
                    <strong>Pupil Funds Share (75%)</strong> → Transfer via Cheque to{' '}
                    <span className="font-mono font-bold underline">BOP Pupil Funds A/C (6580027832200022)</span>
                  </li>
                  <li>
                    <strong>Student Caution Money / Securities</strong> → Transfer via Cheque to{' '}
                    <span className="font-mono font-bold underline">BOP Student Securities A/C (6580027832200044)</span>
                  </li>
                  <li>
                    <strong>Self-Finance Beautician Course Fees (BTE)</strong> → Transfer in full (Rs. 10,012/trainee) via Cheque to{' '}
                    <span className="font-mono font-bold underline">BOP Short Course A/C (6580027832200033)</span>
                  </li>
                  <li>
                    <strong>Board Charges (MVi, MVii, ADDM, FD, CO, CK, BT, DM)</strong> → Retained in TFC to pay the Punjab Board of Technical Education (PBTE) / Trade Testing Board
                  </li>
                  <li>
                    <strong>TUV Rheinland Certification Fees</strong> → Retained in TFC pending transfer directive from TEVTA HQ
                  </li>
                </ul>
              </div>
            </div>

            {/* Reconciliation Comparison Table (High Contrast) */}
            <div
              className={`rounded-xl border overflow-hidden shadow-sm ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              <div
                className={`p-4 border-b font-black text-xs flex items-center justify-between ${
                  darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-100 text-slate-900 border-slate-300'
                }`}
              >
                <span className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <span>Institutional Multi-Account Transfer Breakdown</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  Total Challans: {totals.count}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={`font-black border-b text-[11px] uppercase tracking-wider ${
                        darkMode ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <th className="py-3 px-4">Financial Component</th>
                      <th className="py-3 px-4">Portal Breakdown</th>
                      <th className="py-3 px-4">Institutional Action</th>
                      <th className="py-3 px-4">Target Bank Account & Number</th>
                      <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {/* Row 1: TEVTA Centralized */}
                    <tr className={darkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4 font-black text-blue-800 dark:text-blue-300">
                        1. TEVTA Centralized Share
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        Admission Fee (100%) + 25% Pupil Fund
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40">
                          Automated by BOP Portal
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-200">
                        TEVTA Centralized Account (HQ Lahore)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-blue-800 dark:text-blue-400 text-sm">
                        {formatPKR(totals.tevtaShare, false)}
                      </td>
                    </tr>

                    {/* Row 2: Pupil Funds Share */}
                    <tr className={darkMode ? 'bg-emerald-950/20 hover:bg-emerald-950/30' : 'bg-emerald-50/50 hover:bg-emerald-50'}>
                      <td className="py-3.5 px-4 font-black text-emerald-800 dark:text-emerald-300">
                        2. Pupil Funds Share (75%)
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        75% of Pupil Fund Fee Collected
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/40">
                          Issue Cheque from TFC
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-900 dark:text-emerald-300">
                        BOP Pupil Funds A/C (6580027832200022)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-800 dark:text-emerald-400 text-sm">
                        {formatPKR(totals.pupil75Share, false)}
                      </td>
                    </tr>

                    {/* Row 3: Student Caution Deposits */}
                    <tr className={darkMode ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'bg-amber-50/50 hover:bg-amber-50'}>
                      <td className="py-3.5 px-4 font-black text-amber-900 dark:text-amber-300">
                        3. Student Caution Deposits
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        Refundable Trainee Institute Security
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/40">
                          Issue Cheque from TFC
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-amber-900 dark:text-amber-300">
                        BOP Student Securities A/C (6580027832200044)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-amber-900 dark:text-amber-400 text-sm">
                        {formatPKR(totals.securityShare, false)}
                      </td>
                    </tr>

                    {/* Row 4: Self-Finance Beautician Course Fees (BTE) */}
                    <tr className={darkMode ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'bg-indigo-50/50 hover:bg-indigo-50'}>
                      <td className="py-3.5 px-4 font-black text-indigo-900 dark:text-indigo-300">
                        4. Self-Finance Fees (BTE)
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        Full Fee in Other (Rs. 10,012/trainee for BTE)
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-950 border border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-400/40">
                          Issue Cheque from TFC
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-indigo-900 dark:text-indigo-300">
                        BOP Short Course A/C (6580027832200033)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-indigo-800 dark:text-indigo-400 text-sm">
                        {formatPKR(totals.bteSelfFinanceShare, false)}
                      </td>
                    </tr>

                    {/* Row 5: Board Registration & Examination Charges */}
                    <tr className={darkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4 font-black text-cyan-900 dark:text-cyan-300">
                        5. Board Registration & Exam Fee
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        Other Fee part of MV, FD, CO, CK, BT & DM
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-950 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400/40">
                          Retained in TFC for PBTE
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-200">
                        Punjab Board of Technical Education (PBTE) / Board
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-cyan-800 dark:text-cyan-400 text-sm">
                        {formatPKR(totals.boardChargesShare, false)}
                      </td>
                    </tr>

                    {/* Row 6: TUV Rheinland Fee */}
                    <tr className={darkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4 font-black text-purple-900 dark:text-purple-300">
                        6. TUV Rheinland Certification
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        One-time certification fee from trainees
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-950 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/40">
                          Earmarked in TFC
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-200">
                        Pending TEVTA Directive (Likely Centralized Share)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-purple-800 dark:text-purple-400 text-sm">
                        {formatPKR(totals.tuvCertificationShare, false)}
                      </td>
                    </tr>

                    {/* Summary Row */}
                    <tr
                      className={`font-black text-xs border-t-2 ${
                        darkMode
                          ? 'bg-slate-900 text-white border-slate-700'
                          : 'bg-slate-200 text-slate-900 border-slate-400'
                      }`}
                    >
                      <td colSpan={4} className="py-3.5 px-4 text-right uppercase tracking-wider text-teal-900 dark:text-teal-300 font-black">
                        Total Gross Inflow Deposited in BOP TFC Account (A/C: 6580027832200011):
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-base font-black text-teal-950 dark:text-teal-400">
                        {formatPKR(totals.grossTotal, false)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SUB-TAB 2: CASHBOOK POSTING GENERATOR (SIMPLE GOOGLE SHEET)    */}
        {/* ============================================================= */}
        {activeSubTab === 'CASHBOOK_GEN' && (
          <div className="space-y-4">
            {/* Top Clean Control Toolbar */}
            <div
              className={`p-4 rounded-xl border space-y-3 shadow-xs ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      Soft CashBook Receipts Proforma (Cols B to I)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Formula: <strong className="text-slate-900 dark:text-slate-200">Gross Amount less TEVTA Share</strong> (100% Tuition + 25% PF auto-deduction). Particular / Narration contains the full breakdown.
                  </p>
                </div>

                {/* Filters & Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Month Filter */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Month:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="ALL" className="text-slate-900 dark:bg-slate-800 dark:text-white">
                        All Months ({challans.length} Challans)
                      </option>
                      {availableMonths.map((m) => (
                        <option key={m.key} value={m.key} className="text-slate-900 dark:bg-slate-800 dark:text-white">
                          {m.label} ({m.count} Challans)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Excel Export Button (.xlsx) */}
                  <button
                    onClick={handleExportExcel}
                    title="Export formatted Microsoft Excel (.xlsx) file with formulas and column widths"
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  {/* Sync Google Sheet Backend Button */}
                  <button
                    onClick={() => fetchGoogleSheetData(true)}
                    disabled={isLoadingBackend}
                    title="Sync latest live records from Google Sheet tab: BOP_TFC_RAW"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ${isLoadingBackend ? 'animate-spin' : ''}`} />
                    <span>{isLoadingBackend ? 'Syncing...' : 'Sync Sheet'}</span>
                  </button>
                </div>
              </div>

              {/* Status Summary Row */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {cashBookRows.receiptEntries.length} Posting Batches
                  </span>
                  <span>•</span>
                  <span>{filteredChallans.length} Paid Challans</span>
                  {selectedMonth !== 'ALL' && (
                    <>
                      <span>•</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{selectedMonth}</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 italic">
                  Sorted Date-wise with MVi and MVii separated
                </div>
              </div>
            </div>

            {/* Reconciliation Strip */}
            <div
              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-emerald-50/70 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold uppercase tracking-wide text-[11px] text-emerald-900 dark:text-emerald-300">
                  CashBook Receipts Reconciliation:
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Gross Deposited ({formatPKR(totals.grossTotal, false)}) − Auto TEVTA Share ({formatPKR(totals.tevtaShare, false)}) =
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Net CashBook Receipts:
                </span>
                <span className="text-base font-black font-mono text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700">
                  {formatPKR(totals.netPostingReceipts, false)}
                </span>
              </div>
            </div>

            {/* Google Sheets Sketch Frame (Columns B through I) */}
            <div
              className={`rounded-2xl border-2 overflow-hidden shadow-sm ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              {/* Table Header Banner */}
              <div className="bg-emerald-800 text-white p-3 text-center border-b border-emerald-900 flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-emerald-200">
                  A/C: 6580027832200011
                </div>
                <div className="text-sm font-black tracking-wider uppercase">
                  TFC CASH BOOK RECEIPTS PROFORMA — GVTIW SAMANABAD FAISALABAD
                </div>
                <div className="text-xs font-mono font-bold text-emerald-200">
                  {selectedMonth === 'ALL' ? 'FY 2026–27' : selectedMonth}
                </div>
              </div>

              {/* Exact Google Sheet Columns Table (Cols B through I) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr
                      className={`border-b-2 text-[11px] font-black uppercase tracking-wider ${
                        darkMode
                          ? 'bg-slate-900 text-slate-200 border-slate-700'
                          : 'bg-emerald-900 text-white border-emerald-950'
                      }`}
                    >
                      <th className="py-2.5 px-3 whitespace-nowrap text-center">Date (B)</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap text-center">Month (C)</th>
                      <th className="py-2.5 px-2 text-center whitespace-nowrap">V# (D)</th>
                      <th className="py-2.5 px-3 min-w-[260px]">Particular / Narration (E)</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-center">Paid to / by (F)</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Account Head (G)</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap text-center">Challan # (H)</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Receipts Amount (I)</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-medium ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {cashBookRows.receiptEntries.map((row, idx) => {
                      return (
                        <tr
                          key={row.key}
                          className={`transition-colors ${
                            darkMode ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Col B: Date */}
                          <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap text-center text-slate-900 dark:text-slate-200">
                            {row.date}
                          </td>

                          {/* Col C: Month */}
                          <td className="py-2.5 px-2.5 font-semibold whitespace-nowrap text-center text-slate-800 dark:text-slate-300">
                            {row.month}
                          </td>

                          {/* Col D: V# */}
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-400">
                            {row.vNo}
                          </td>

                          {/* Col E: Particular */}
                          <td className="py-2.5 px-3 max-w-md text-slate-900 dark:text-slate-100 font-semibold">
                            {row.particular}
                          </td>

                          {/* Col F: Paid to / by */}
                          <td className="py-2.5 px-3 font-bold whitespace-nowrap text-center text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              {row.paidToBy}
                            </span>
                          </td>

                          {/* Col G: Account Head */}
                          <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-teal-800 dark:text-teal-300 whitespace-nowrap">
                            {row.accountHead}
                          </td>

                          {/* Col H: Cheque / Challan # */}
                          <td className="py-2.5 px-2.5 font-mono font-bold text-center text-amber-800 dark:text-amber-300 whitespace-nowrap">
                            {row.chequeNo}
                          </td>

                          {/* Col I: Receipts Amount (PKR) */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 dark:text-emerald-400 text-xs whitespace-nowrap">
                            {formatPKR(row.receipts, false)}
                          </td>

                          {/* Action: Copy Single Row */}
                          <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleCopySingleRowTSV(row, idx)}
                              title="Copy 8 Columns (B:I) for this row"
                              className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                            >
                              {copiedId === row.key ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-300" />
                                  <span className="text-emerald-200">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-emerald-200" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Total Footer */}
                  <tfoot>
                    <tr
                      className={`border-t-2 font-black text-xs ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-emerald-50 border-emerald-300 text-slate-950'
                      }`}
                    >
                      <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-center">
                        Total ({cashBookRows.receiptEntries.length} Batches / {filteredChallans.length} Challans)
                      </td>
                      <td colSpan={4} className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">
                        Total Net Receipts Posted to TFC Cash Book:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-emerald-800 dark:text-emerald-400">
                        {formatPKR(totals.netPostingReceipts, false)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={handleCopyGoogleSheetTSV}
                          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                        >
                          Copy All
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SUB-TAB: HARD CASHBOOK ENTRY REGISTER (OFFICIAL SKETCH)        */}
        {/* ============================================================= */}
        {activeSubTab === 'HARD_CASHBOOK' && (
          <div className="space-y-4">
            {/* Top Control Toolbar */}
            <div
              className={`p-4 rounded-xl border space-y-3 shadow-xs ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      Hard CashBook Entry Register (Challan Ledger Sketch)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Official ledger sketch matching physical cashbook register (Columns E to S). Date-wise subtotal rows (<strong className="text-slate-900 dark:text-slate-200">&lt;Date&gt; Total</strong>) with highlighted <strong className="text-amber-700 dark:text-amber-400">TFC Credited</strong> (=+N+M+L).
                  </p>
                </div>

                {/* Filters & Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Month Filter */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Month:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="ALL" className="text-slate-900 dark:bg-slate-800 dark:text-white">
                        All Months ({challans.length} Challans)
                      </option>
                      {availableMonths.map((m) => (
                        <option key={m.key} value={m.key} className="text-slate-900 dark:bg-slate-800 dark:text-white">
                          {m.label} ({m.count} Challans)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Download PDF Button */}
                  <button
                    onClick={handleExportHardCashBookPdf}
                    title="Download vector PDF for Hard CashBook Register (Landscape A4)"
                    className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <FileText className="w-4 h-4 text-rose-200" />
                    <span>Download PDF (.pdf)</span>
                  </button>

                  {/* Excel Export Button (.xlsx) */}
                  <button
                    onClick={handleExportHardCashBookExcel}
                    title="Export formatted Microsoft Excel (.xlsx) file with orange headers and date subtotal rows"
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4 text-amber-200" />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  {/* Copy TSV Button */}
                  <button
                    onClick={handleCopyHardCashBookTSV}
                    title="Copy full Hard CashBook Register (all columns & subtotal rows) to clipboard"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {copiedId === 'HARD_CASHBOOK_TSV' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-400">Copied TSV!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copy TSV</span>
                      </>
                    )}
                  </button>

                  {/* Print Button */}
                  <button
                    onClick={handlePrintHardCashBook}
                    title="Print Isolated Hard CashBook Register (Landscape A4)"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4 text-amber-500" />
                    <span>Print Official</span>
                  </button>
                </div>
              </div>

              {/* Hard CashBook KPI Summary Bar */}
              <div
                className={`p-3 rounded-xl border grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs ${
                  darkMode ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Paid Challans</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {filteredChallans.length} Challans ({hardCashBookData.dateGroups.length} Dates)
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Total Gross (Col P)</div>
                  <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                    {formatPKR(hardCashBookData.grandTotal.totalAmount, false)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Head Office Total (Col Q)</div>
                  <div className="text-sm font-black font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                    {formatPKR(hardCashBookData.grandTotal.headOfficeTotal, false)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Institute Total (Col R)</div>
                  <div className="text-sm font-black font-mono text-purple-700 dark:text-purple-400 mt-0.5">
                    {formatPKR(hardCashBookData.grandTotal.instituteTotal, false)}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800">
                  <div className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300">
                    TFC Credited (=+N+M+L)
                  </div>
                  <div className="text-base font-black font-mono text-amber-900 dark:text-amber-300 mt-0.5">
                    {formatPKR(hardCashBookData.grandTotal.tfcCredited, false)}
                  </div>
                </div>
              </div>
            </div>

            {/* Hard CashBook Register Sketch Table Container */}
            <div
              className={`rounded-2xl border-2 overflow-hidden shadow-sm ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              {/* Institutional Header Banner */}
              <div className="bg-[#ED7D31] text-white p-3 text-center border-b border-amber-800 flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-amber-100">
                  A/C: 6580027832200011
                </div>
                <div className="text-sm font-black tracking-wider uppercase">
                  TFC HARD CASHBOOK ENTRY REGISTER — GVTIW SAMANABAD FAISALABAD
                </div>
                <div className="text-xs font-mono font-bold text-amber-100">
                  {selectedMonth === 'ALL' ? 'FY 2026–27' : selectedMonth}
                </div>
              </div>

              {/* Exact Physical Ledger Register Table (Columns E to S) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#ED7D31] text-white text-[11px] font-black uppercase tracking-wider border-b border-amber-800">
                      <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[130px]">ChallanPaymentDate</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-center">ChallanID</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-center">CNIC</th>
                      <th className="py-2.5 px-3 whitespace-nowrap min-w-[180px]">Name</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap text-center">Trade</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap text-center">PaymentType</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">Admission_Tuition_Reg_Fee</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">25PercentPupilFee</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">75PercentPupilFee</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">InstituteSecurity</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap text-right">OtherFee</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right bg-amber-600 text-yellow-100 font-extrabold">
                        TFC Credited (=+N+M+L)
                      </th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">TotalAmount</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">HeadOfficeTotal</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">InstituteTotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                    {hardCashBookData.dateGroups.map((group) => {
                      return (
                        <React.Fragment key={group.dateKey}>
                          {/* Individual Challans for this Date */}
                          {group.rows.map((row) => (
                            <tr
                              key={row.challanId}
                              className={`transition-colors ${
                                darkMode ? 'hover:bg-slate-900/60' : 'hover:bg-amber-50/40'
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {row.paymentDate}
                              </td>
                              <td className="py-2 px-3 font-mono text-center font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                                {row.challanId}
                              </td>
                              <td className="py-2 px-3 font-mono text-center text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {formatCNIC(row.cnic)}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                {row.name}
                              </td>
                              <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                                  {row.trade}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {row.paymentType}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-slate-300 whitespace-nowrap">
                                {formatPKR(row.admissionTuition, false)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-slate-300 whitespace-nowrap">
                                {formatPKR(row.pupil25, false)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-slate-300 whitespace-nowrap">
                                {formatPKR(row.pupil75, false)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-slate-300 whitespace-nowrap">
                                {formatPKR(row.security, false)}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {row.otherFee === 0 ? '-' : formatPKR(row.otherFee, false)}
                              </td>
                              {/* TFC Credited Column (Highlighted Gold) */}
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 whitespace-nowrap">
                                {formatPKR(row.tfcCredited, false)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {formatPKR(row.totalAmount, false)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                {formatPKR(row.headOfficeTotal, false)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-purple-700 dark:text-purple-400 whitespace-nowrap">
                                {formatPKR(row.instituteTotal, false)}
                              </td>
                            </tr>
                          ))}

                          {/* Date Subtotal Row matching Image 1 */}
                          <tr
                            className={`border-y-2 font-black text-[11px] ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-200 border-slate-300 text-slate-950'
                            }`}
                          >
                            <td colSpan={6} className="py-2 px-3 font-bold text-amber-900 dark:text-amber-300 whitespace-nowrap">
                              {group.paymentDate} Total ({group.subtotal.count} Challan{group.subtotal.count > 1 ? 's' : ''}):
                            </td>
                            <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                              {formatPKR(group.subtotal.admissionTuition, false)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                              {formatPKR(group.subtotal.pupil25, false)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                              {formatPKR(group.subtotal.pupil75, false)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                              {formatPKR(group.subtotal.security, false)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                              {group.subtotal.otherFee === 0 ? '-' : formatPKR(group.subtotal.otherFee, false)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 whitespace-nowrap">
                              {formatPKR(group.subtotal.tfcCredited, false)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black whitespace-nowrap">
                              {formatPKR(group.subtotal.totalAmount, false)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-blue-800 dark:text-blue-300 whitespace-nowrap">
                              {formatPKR(group.subtotal.headOfficeTotal, false)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-purple-800 dark:text-purple-300 whitespace-nowrap">
                              {formatPKR(group.subtotal.instituteTotal, false)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* Grand Total Footer matching Image 1 */}
                  <tfoot>
                    <tr className="bg-[#C65911] text-white font-black text-xs border-t-2 border-amber-900">
                      <td colSpan={6} className="py-3 px-3 uppercase tracking-wider text-left font-black">
                        Grand Total ({filteredChallans.length} Challans)
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {formatPKR(hardCashBookData.grandTotal.admissionTuition, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {formatPKR(hardCashBookData.grandTotal.pupil25, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {formatPKR(hardCashBookData.grandTotal.pupil75, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {formatPKR(hardCashBookData.grandTotal.security, false)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono whitespace-nowrap">
                        {hardCashBookData.grandTotal.otherFee === 0 ? '-' : formatPKR(hardCashBookData.grandTotal.otherFee, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-yellow-200 bg-amber-800 whitespace-nowrap">
                        {formatPKR(hardCashBookData.grandTotal.tfcCredited, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm whitespace-nowrap">
                        {formatPKR(hardCashBookData.grandTotal.totalAmount, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-200 whitespace-nowrap">
                        {formatPKR(hardCashBookData.grandTotal.headOfficeTotal, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-200 whitespace-nowrap">
                        {formatPKR(hardCashBookData.grandTotal.instituteTotal, false)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SUB-TAB 3: COURSE-WISE MATRIX                                  */}
        {/* ============================================================= */}
        {activeSubTab === 'COURSE_MATRIX' && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
                darkMode
                  ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
                  : 'bg-purple-50 border-purple-300 text-purple-950'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                <span>
                  <strong>Course-Wise Financial Breakdown:</strong> Aggregates collections across Matric Vocational,
                  Diploma, CBT&A, BTE Self-Finance, and TUV Rheinland programs.
                </span>
              </span>
            </div>

            <div
              className={`rounded-xl border overflow-hidden shadow-sm ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-[11px] font-black uppercase tracking-wider ${
                        darkMode ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <th className="py-3 px-3">Code</th>
                      <th className="py-3 px-3">Course Title</th>
                      <th className="py-3 px-3 text-center">Trainees</th>
                      <th className="py-3 px-3 text-right">Tuition / Reg</th>
                      <th className="py-3 px-3 text-right">25% Pupil</th>
                      <th className="py-3 px-3 text-right">75% Pupil (PF Cheque)</th>
                      <th className="py-3 px-3 text-right">Security (SEC Cheque)</th>
                      <th className="py-3 px-3 text-right">BTE Self-Finance</th>
                      <th className="py-3 px-3 text-right">Board Charges</th>
                      <th className="py-3 px-3 text-right">TUV Fee</th>
                      <th className="py-3 px-3 text-right font-black text-teal-900 dark:text-teal-300">Total Deposited</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-medium ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {courseMatrix.map((cm) => (
                      <tr key={cm.code} className={darkMode ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 font-mono font-black text-teal-800 dark:text-teal-400">{cm.code}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{cm.title}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-300">{cm.count}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800 dark:text-slate-300">{formatPKR(cm.admission, false)}</td>
                        <td className="py-3 px-3 text-right font-mono text-blue-800 dark:text-blue-300">{formatPKR(cm.pupil25, false)}</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                          {formatPKR(cm.pupil75, false)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-amber-900 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                          {formatPKR(cm.security, false)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-indigo-900 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20">
                          {cm.bteSelfFinance > 0 ? formatPKR(cm.bteSelfFinance, false) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-cyan-900 dark:text-cyan-400">
                          {cm.boardCharges > 0 ? formatPKR(cm.boardCharges, false) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-purple-900 dark:text-purple-400">
                          {cm.tuvFee > 0 ? formatPKR(cm.tuvFee, false) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-teal-950 dark:text-teal-300 text-sm">
                          {formatPKR(cm.total, false)}
                        </td>
                      </tr>
                    ))}
                    <tr
                      className={`font-black text-xs border-t-2 ${
                        darkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-200 text-slate-900 border-slate-400'
                      }`}
                    >
                      <td colSpan={2} className="py-3.5 px-3 text-right uppercase tracking-wider text-teal-900 dark:text-teal-300">
                        Consolidated Course Matrix Total:
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold">{totals.count}</td>
                      <td className="py-3.5 px-3 text-right font-mono">
                        {formatPKR(totals.tevtaShare, false)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono">—</td>
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-800 dark:text-emerald-400">
                        {formatPKR(totals.pupil75Share, false)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-900 dark:text-amber-400">
                        {formatPKR(totals.securityShare, false)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-indigo-900 dark:text-indigo-400">
                        {formatPKR(totals.bteSelfFinanceShare, false)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-cyan-900 dark:text-cyan-400">
                        {formatPKR(totals.boardChargesShare, false)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-purple-900 dark:text-purple-400">
                        {formatPKR(totals.tuvCertificationShare, false)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-black text-teal-950 dark:text-teal-400 text-sm">
                        {formatPKR(totals.grossTotal, false)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SUB-TAB 4: TRAINEE CHALLAN DIRECTORY                          */}
        {/* ============================================================= */}
        {activeSubTab === 'DIRECTORY' && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border overflow-hidden shadow-sm ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}
            >
              <div
                className={`p-3 border-b text-xs flex items-center justify-between ${
                  darkMode ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-slate-100 text-slate-900 border-slate-300'
                }`}
              >
                <span className="font-bold">Showing {filteredChallans.length} Paid Challan Records</span>
                <span className="text-xs font-mono font-black text-teal-800 dark:text-teal-300">
                  Total Amount: {formatPKR(totals.grossTotal, false)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-[11px] font-black uppercase tracking-wider ${
                        darkMode ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Challan ID</th>
                      <th className="py-2.5 px-3">Payment Date</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Trainee Name</th>
                      <th className="py-2.5 px-3">Guardian Name</th>
                      <th className="py-2.5 px-3">CNIC</th>
                      <th className="py-2.5 px-3 text-right">Auto TEVTA</th>
                      <th className="py-2.5 px-3 text-right text-emerald-800 dark:text-emerald-400">75% Pupil</th>
                      <th className="py-2.5 px-3 text-right text-amber-900 dark:text-amber-400">Security</th>
                      <th className="py-2.5 px-3 text-right text-indigo-900 dark:text-indigo-400">Other Fee Head</th>
                      <th className="py-2.5 px-3 text-right font-black text-teal-900 dark:text-teal-300">Total (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-medium ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {filteredChallans.map((c) => {
                      const cls = classifyOtherFee(c.courseAbbreviation);
                      return (
                        <tr key={c.challanId} className={darkMode ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{c.srNo}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-800 dark:text-amber-300">{c.challanId}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-300 whitespace-nowrap">
                            {c.challanPaymentDate}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-teal-100 text-teal-950 border border-teal-300 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-400/40">
                              {c.courseAbbreviation}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-950 dark:text-white whitespace-nowrap">
                            {c.traineeName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {c.guardianName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatCNIC(c.cnic)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-800 dark:text-blue-300">
                            {formatPKR(c.admissionTuitionRegFee + c.pupilFee25Percent, false)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 dark:text-emerald-400">
                            {formatPKR(c.pupilFee75Percent, false)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900 dark:text-amber-400">
                            {formatPKR(c.instituteSecurity, false)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs">
                            {c.otherFee > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-indigo-900 dark:text-indigo-300">
                                  {formatPKR(c.otherFee, false)}
                                </span>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                  {cls.classification === 'SELF_FINANCE_BTE'
                                    ? '→ SC (6580027832200033)'
                                    : cls.classification === 'BOARD_CHARGES'
                                    ? 'PBTE Charges'
                                    : 'TUV Fee'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-teal-950 dark:text-teal-300 text-xs">
                            {formatPKR(c.totalAmount, false)}
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
      </div>

      {/* Official Hard CashBook Print Portal (Targeted by window.print in Landscape A4) */}
      {showHardCashBookPrintPortal && typeof document !== 'undefined' && createPortal(
        <div id="print-tfc-portal" className="p-4 bg-white text-slate-900 font-sans">
          {/* Header Banner */}
          <div className="border-b-2 border-amber-800 pb-3 mb-3 text-center">
            <h1 className="text-base font-black uppercase text-amber-950 tracking-wide">
              Govt. Vocational Training Institute for Women, Samanabad Faisalabad
            </h1>
            <p className="text-xs font-bold text-slate-700">
              Hard Form CashBook Entry Register (Challan Ledger Sketch — Columns E to S)
            </p>
            <p className="text-xs font-black text-amber-900 uppercase mt-0.5">
              TEVTA Fee Collection (TFC) Bank Account # 6580027832200011 (Bank of Punjab)
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2 px-2 border-t pt-1">
              <span><strong>Period:</strong> {selectedMonth === 'ALL' ? 'All Available Months' : selectedMonth}</span>
              <span><strong>Total Paid Challans:</strong> {filteredChallans.length} ({hardCashBookData.dateGroups.length} Dates)</span>
              <span><strong>TFC Credited:</strong> Rs. {formatPKR(hardCashBookData.grandTotal.tfcCredited, false)}</span>
              <span><strong>Generated:</strong> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-[8.5px] border-collapse border border-slate-400">
            <thead>
              <tr className="bg-[#ED7D31] text-white font-bold text-center">
                <th className="border border-slate-400 p-1">Payment Date</th>
                <th className="border border-slate-400 p-1">Challan ID</th>
                <th className="border border-slate-400 p-1">CNIC</th>
                <th className="border border-slate-400 p-1">Student Name</th>
                <th className="border border-slate-400 p-1">Trade</th>
                <th className="border border-slate-400 p-1">Adm / Reg</th>
                <th className="border border-slate-400 p-1">25% PF</th>
                <th className="border border-slate-400 p-1">75% PF</th>
                <th className="border border-slate-400 p-1">Security</th>
                <th className="border border-slate-400 p-1">Other Fee</th>
                <th className="border border-slate-400 p-1 bg-[#C65911]">TFC Credited</th>
                <th className="border border-slate-400 p-1">Total (Col P)</th>
                <th className="border border-slate-400 p-1">HO (Col Q)</th>
                <th className="border border-slate-400 p-1">Inst (Col R)</th>
              </tr>
            </thead>
            <tbody>
              {hardCashBookData.dateGroups.map((g) => (
                <React.Fragment key={g.dateKey}>
                  {g.rows.map((r, rIdx) => (
                    <tr key={r.challanId} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-300 p-0.5 text-center font-mono">{r.paymentDate}</td>
                      <td className="border border-slate-300 p-0.5 text-center font-mono font-bold">{r.challanId}</td>
                      <td className="border border-slate-300 p-0.5 text-center font-mono">{r.cnic}</td>
                      <td className="border border-slate-300 p-0.5 text-left font-semibold">{r.name}</td>
                      <td className="border border-slate-300 p-0.5 text-center font-bold">{r.trade}</td>
                      <td className="border border-slate-300 p-0.5 text-right">{r.admissionTuition > 0 ? formatPKR(r.admissionTuition, false) : '-'}</td>
                      <td className="border border-slate-300 p-0.5 text-right">{r.pupil25 > 0 ? formatPKR(r.pupil25, false) : '-'}</td>
                      <td className="border border-slate-300 p-0.5 text-right">{r.pupil75 > 0 ? formatPKR(r.pupil75, false) : '-'}</td>
                      <td className="border border-slate-300 p-0.5 text-right">{r.security > 0 ? formatPKR(r.security, false) : '-'}</td>
                      <td className="border border-slate-300 p-0.5 text-right">{r.otherFee > 0 ? formatPKR(r.otherFee, false) : '-'}</td>
                      <td className="border border-slate-300 p-0.5 text-right font-bold bg-amber-50">{formatPKR(r.tfcCredited, false)}</td>
                      <td className="border border-slate-300 p-0.5 text-right font-bold">{formatPKR(r.totalAmount, false)}</td>
                      <td className="border border-slate-300 p-0.5 text-right font-semibold text-blue-900">{formatPKR(r.headOfficeTotal, false)}</td>
                      <td className="border border-slate-300 p-0.5 text-right font-semibold text-purple-900">{formatPKR(r.instituteTotal, false)}</td>
                    </tr>
                  ))}
                  {/* Subtotal Row */}
                  <tr className="bg-[#FFF2CC] font-bold text-slate-900">
                    <td colSpan={5} className="border border-slate-400 p-1 text-center font-black">
                      {g.dateKey} Total ({g.subtotal.count} Challans)
                    </td>
                    <td className="border border-slate-400 p-1 text-right">{formatPKR(g.subtotal.admissionTuition, false)}</td>
                    <td className="border border-slate-400 p-1 text-right">{formatPKR(g.subtotal.pupil25, false)}</td>
                    <td className="border border-slate-400 p-1 text-right">{formatPKR(g.subtotal.pupil75, false)}</td>
                    <td className="border border-slate-400 p-1 text-right">{formatPKR(g.subtotal.security, false)}</td>
                    <td className="border border-slate-400 p-1 text-right">{g.subtotal.otherFee > 0 ? formatPKR(g.subtotal.otherFee, false) : '-'}</td>
                    <td className="border border-slate-400 p-1 text-right font-black bg-[#FFE599] text-amber-950">{formatPKR(g.subtotal.tfcCredited, false)}</td>
                    <td className="border border-slate-400 p-1 text-right font-black">{formatPKR(g.subtotal.totalAmount, false)}</td>
                    <td className="border border-slate-400 p-1 text-right font-bold text-blue-950">{formatPKR(g.subtotal.headOfficeTotal, false)}</td>
                    <td className="border border-slate-400 p-1 text-right font-bold text-purple-950">{formatPKR(g.subtotal.instituteTotal, false)}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#ED7D31] text-white font-black">
                <td colSpan={5} className="border border-slate-400 p-1.5 text-center uppercase tracking-wider text-[10px]">
                  Grand Total ({filteredChallans.length} Challans)
                </td>
                <td className="border border-slate-400 p-1.5 text-right">{formatPKR(hardCashBookData.grandTotal.admissionTuition, false)}</td>
                <td className="border border-slate-400 p-1.5 text-right">{formatPKR(hardCashBookData.grandTotal.pupil25, false)}</td>
                <td className="border border-slate-400 p-1.5 text-right">{formatPKR(hardCashBookData.grandTotal.pupil75, false)}</td>
                <td className="border border-slate-400 p-1.5 text-right">{formatPKR(hardCashBookData.grandTotal.security, false)}</td>
                <td className="border border-slate-400 p-1.5 text-right">{hardCashBookData.grandTotal.otherFee > 0 ? formatPKR(hardCashBookData.grandTotal.otherFee, false) : '-'}</td>
                <td className="border border-slate-400 p-1.5 text-right bg-[#C65911]">{formatPKR(hardCashBookData.grandTotal.tfcCredited, false)}</td>
                <td className="border border-slate-400 p-1.5 text-right">{formatPKR(hardCashBookData.grandTotal.totalAmount, false)}</td>
                <td className="border border-slate-400 p-1.5 text-right">{formatPKR(hardCashBookData.grandTotal.headOfficeTotal, false)}</td>
                <td className="border border-slate-400 p-1.5 text-right">{formatPKR(hardCashBookData.grandTotal.instituteTotal, false)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="mt-8 pt-4 grid grid-cols-3 gap-4 text-center text-xs text-slate-800">
            <div>
              <div className="font-bold border-t border-slate-400 pt-1">Cashier / Dealing Assistant</div>
              <div className="text-[10px] text-slate-500">GVTIW Samanabad Faisalabad</div>
            </div>
            <div>
              <div className="font-bold border-t border-slate-400 pt-1">Accountant / Senior Clerk</div>
              <div className="text-[10px] text-slate-500">GVTIW Samanabad Faisalabad</div>
            </div>
            <div>
              <div className="font-bold border-t border-slate-400 pt-1">Principal / Incharge</div>
              <div className="text-[10px] text-slate-500">GVTIW Samanabad Faisalabad</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
