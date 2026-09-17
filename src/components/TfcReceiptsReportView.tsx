import React, { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import {
  TfcChallanRecord,
  computeChallanFeeBreakdown,
  ChallanFeeBreakdown,
  COURSE_TITLE_MAP,
} from '../data/tfcChallanData';
import { formatPKR } from '../lib/formatters';
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
} from 'lucide-react';

interface TfcReceiptsReportViewProps {
  challans: TfcChallanRecord[];
  darkMode: boolean;
  initialMode?: 'DATE_WISE' | 'MONTH_WISE';
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
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

interface AggregatedReceiptRow {
  key: string;
  label: string; // Date or Month name
  timestamp: number;
  challans: TfcChallanRecord[];
  breakdown: ChallanFeeBreakdown;
  challanCount: number;
}

export const TfcReceiptsReportView: React.FC<TfcReceiptsReportViewProps> = ({
  challans,
  darkMode,
  initialMode = 'DATE_WISE',
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
}) => {
  const [reportMode, setReportMode] = useState<'DATE_WISE' | 'MONTH_WISE'>(initialMode);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toggle drilldown
  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
      if (selectedMonth !== 'ALL') {
        const d = parseDateDetail(c.challanPaymentDate);
        if (d.monthYear !== selectedMonth) return false;
      }
      if (selectedCourse !== 'ALL' && c.courseAbbreviation !== selectedCourse) {
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
          c.rollOrCode.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [challans, selectedMonth, selectedCourse, searchQuery]);

  // Aggregation by Date or Month
  const { rows, grandTotal } = useMemo(() => {
    const map = new Map<string, AggregatedReceiptRow>();

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

    filteredChallans.forEach((c) => {
      const b = computeChallanFeeBreakdown(c);
      const d = parseDateDetail(c.challanPaymentDate);

      const groupKey = reportMode === 'DATE_WISE' ? d.displayDmy : d.monthYear;
      const groupLabel = reportMode === 'DATE_WISE' ? d.displayDmy : d.monthYear;
      const groupTimestamp = d.timestamp;

      let entry = map.get(groupKey);
      if (!entry) {
        entry = {
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
        map.set(groupKey, entry);
      }

      entry.challans.push(c);
      entry.challanCount += 1;

      // Add to group
      entry.breakdown.admissionTuitionRegFee += b.admissionTuitionRegFee;
      entry.breakdown.pupilFee25Percent += b.pupilFee25Percent;
      entry.breakdown.totalTevtaDues += b.totalTevtaDues;
      entry.breakdown.pupilFee75Percent += b.pupilFee75Percent;
      entry.breakdown.collegeSecurity += b.collegeSecurity;
      entry.breakdown.boardCharges += b.boardCharges;
      entry.breakdown.shortCourseSelfFinance += b.shortCourseSelfFinance;
      entry.breakdown.bankProfit += b.bankProfit;
      entry.breakdown.subTotalInstituteShare += b.subTotalInstituteShare;
      entry.breakdown.totalAmountReceived += b.totalAmountReceived;
      entry.breakdown.instituteShare += b.instituteShare;

      // Add to grand total
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

    const sortedRows = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);

    return { rows: sortedRows, grandTotal: totalAccumulator };
  }, [filteredChallans, reportMode]);

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

    const lines = rows.map((r, i) =>
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
      rows.forEach((r, idx) => {
        const row = sheet.addRow([
          idx + 1,
          r.label,
          r.breakdown.admissionTuitionRegFee,
          r.breakdown.pupilFee25Percent,
          { formula: `=C${sheet.rowCount + 1}+D${sheet.rowCount + 1}` }, // Total TEVTA Dues
          r.breakdown.pupilFee75Percent,
          r.breakdown.collegeSecurity,
          r.breakdown.boardCharges,
          r.breakdown.shortCourseSelfFinance,
          r.breakdown.bankProfit || 0,
          { formula: `=F${sheet.rowCount + 1}+G${sheet.rowCount + 1}+H${sheet.rowCount + 1}+I${sheet.rowCount + 1}+J${sheet.rowCount + 1}` },
          { formula: `=E${sheet.rowCount + 1}+K${sheet.rowCount + 1}` }, // Total Per Day
          { formula: `=K${sheet.rowCount + 1}` }, // Institute Share
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

      // Bottom Grand Total row with Excel Formulas
      const bottomTotalRow = sheet.addRow([
        'Grand Total',
        `${rows.length} ${reportMode === 'DATE_WISE' ? 'Days' : 'Months'}`,
        { formula: `=SUM(C${startDataRow}:C${endDataRow})` },
        { formula: `=SUM(D${startDataRow}:D${endDataRow})` },
        { formula: `=SUM(E${startDataRow}:E${endDataRow})` },
        { formula: `=SUM(F${startDataRow}:F${endDataRow})` },
        { formula: `=SUM(G${startDataRow}:G${endDataRow})` },
        { formula: `=SUM(H${startDataRow}:H${endDataRow})` },
        { formula: `=SUM(I${startDataRow}:I${endDataRow})` },
        { formula: `=SUM(J${startDataRow}:J${endDataRow})` },
        { formula: `=SUM(K${startDataRow}:K${endDataRow})` },
        { formula: `=SUM(L${startDataRow}:L${endDataRow})` },
        { formula: `=SUM(M${startDataRow}:M${endDataRow})` },
      ]);
      bottomTotalRow.font = { bold: true, size: 10 };
      bottomTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      for (let c = 3; c <= 13; c++) {
        bottomTotalRow.getCell(c).numFmt = '#,##0';
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
                Official Head-Wise Allocation & Board (TTB / PBTE) Dues Register
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
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

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Print Official Report"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Month Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter by Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="ALL">All Available Months</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter by Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="ALL">All Courses</option>
              {availableCourses.map((c) => (
                <option key={c} value={c}>
                  {c} — {COURSE_TITLE_MAP[c] || c}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search Challan ID / Trainee / CNIC
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, roll number, challan ID, or CNIC..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none ${
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
            Beautician Self Finance (Rs. 10,012) is separated into Base Course (Rs. 8,512) and Board Dues (excess above 8,512 = Rs. 1,500). Regular courses classify other head as Board Charges. TUV Certification fees are allocated 100% to Other Income (Bank Profit / Any Other Income) pending central TEVTA transfer decision.
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
              {rows.length} {reportMode === 'DATE_WISE' ? 'Receipt Days' : 'Receipt Months'} ({filteredChallans.length} Challans)
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

        {/* Scrollable Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Category Group Header (Row 7 in Screenshot) */}
              <tr className="border-b border-slate-300 dark:border-slate-700 text-center font-bold text-[11px]">
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-slate-200 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 w-12 text-center"
                >
                  Sr #
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-3 bg-slate-200 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 min-w-[110px] text-center"
                >
                  {reportMode === 'DATE_WISE' ? 'Date of Receipt' : 'Month of Receipt'}
                  <div className="text-[10px] font-normal text-slate-500">
                    {reportMode === 'DATE_WISE' ? '(dd-mm-yy)' : '(Month-Year)'}
                  </div>
                </th>
                <th
                  colSpan={3}
                  className="py-1.5 px-2 bg-[#FCE4D6] dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 border-r border-slate-300 dark:border-slate-700"
                >
                  TEVTA Fee
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#FFFFF2] dark:bg-yellow-950/40 text-yellow-950 dark:text-yellow-200 border-r border-slate-300 dark:border-slate-700 min-w-[90px]"
                >
                  Pupil Funds 75%
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#DDEBF7] dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 border-r border-slate-300 dark:border-slate-700 min-w-[85px]"
                >
                  College Security
                  <div className="text-[9px] font-normal opacity-80">(Refundable)</div>
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#FCE4D6] dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 border-r border-slate-300 dark:border-slate-700 min-w-[110px]"
                >
                  Board / University / Certification Charges
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#FCE4D6] dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 border-r border-slate-300 dark:border-slate-700 min-w-[100px]"
                >
                  Short Course Self Finance
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 min-w-[90px]"
                >
                  Bank Profit / Any Other Income
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#E2EFDA] dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-r border-slate-300 dark:border-slate-700 min-w-[100px]"
                >
                  Sub Total (H+Y)
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-3 bg-[#00B0F0] text-white border-r border-slate-300 dark:border-slate-700 min-w-[120px] font-black"
                >
                  Total Amount Received Per Day (Rs.)
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-[#E2EFDA] dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-r border-slate-300 dark:border-slate-700 min-w-[100px]"
                >
                  Institute Share
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-slate-200 dark:bg-slate-800 text-center w-20"
                >
                  Actions
                </th>
              </tr>

              {/* Sub-Header Row 2 (Columns Detail) */}
              <tr className="border-b-2 border-slate-400 dark:border-slate-700 text-center font-bold text-[10px]">
                <th className="py-1 px-2 bg-[#FCE4D6] dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 border-r border-slate-300 dark:border-slate-700">
                  Admission Fee/ Readmission Fee
                </th>
                <th className="py-1 px-2 bg-[#FCE4D6] dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 border-r border-slate-300 dark:border-slate-700">
                  25% Pupil Fund
                </th>
                <th className="py-1 px-2 bg-[#F8CBAD] dark:bg-orange-900/60 text-orange-950 dark:text-orange-200 border-r border-slate-300 dark:border-slate-700 font-black">
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
              ) : (
                rows.map((row, idx) => {
                  const isExpanded = expandedKeys.has(row.key);
                  return (
                    <React.Fragment key={row.key}>
                      <tr
                        className={`hover:bg-amber-50/60 dark:hover:bg-slate-800/60 transition-colors ${
                          idx % 2 === 1
                            ? darkMode
                              ? 'bg-slate-950/40'
                              : 'bg-slate-50/60'
                            : ''
                        }`}
                      >
                        {/* Sr # */}
                        <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px] border-r border-slate-200 dark:border-slate-800">
                          {idx + 1}
                        </td>

                        {/* Date / Month label with Drilldown Button */}
                        <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
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
                            <span className="text-[10px] text-slate-400 font-normal ml-auto">
                              ({row.challanCount})
                            </span>
                          </button>
                        </td>

                        {/* Admission Fee */}
                        <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.admissionTuitionRegFee > 0
                            ? formatPKR(row.breakdown.admissionTuitionRegFee)
                            : '-'}
                        </td>

                        {/* 25% Pupil Fund */}
                        <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.pupilFee25Percent > 0
                            ? formatPKR(row.breakdown.pupilFee25Percent)
                            : '-'}
                        </td>

                        {/* Total (TEVTA Dues) */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.totalTevtaDues > 0
                            ? formatPKR(row.breakdown.totalTevtaDues)
                            : '-'}
                        </td>

                        {/* Pupil Funds 75% */}
                        <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.pupilFee75Percent > 0
                            ? formatPKR(row.breakdown.pupilFee75Percent)
                            : '-'}
                        </td>

                        {/* College Security */}
                        <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.collegeSecurity > 0
                            ? formatPKR(row.breakdown.collegeSecurity)
                            : '-'}
                        </td>

                        {/* Board Charges */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.boardCharges > 0
                            ? formatPKR(row.breakdown.boardCharges)
                            : '-'}
                        </td>

                        {/* Short Course Self Finance */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-purple-700 dark:text-purple-400 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.shortCourseSelfFinance > 0
                            ? formatPKR(row.breakdown.shortCourseSelfFinance)
                            : '-'}
                        </td>

                        {/* Bank Profit / Any Other */}
                        <td className="py-2 px-2 text-right font-mono text-slate-500 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.bankProfit > 0
                            ? formatPKR(row.breakdown.bankProfit)
                            : 0}
                        </td>

                        {/* Sub Total (Institute Share) */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 dark:text-slate-100 bg-[#E2EFDA]/40 dark:bg-emerald-950/20 border-r border-slate-200 dark:border-slate-800">
                          {row.breakdown.subTotalInstituteShare > 0
                            ? formatPKR(row.breakdown.subTotalInstituteShare)
                            : '-'}
                        </td>

                        {/* Total Amount Received Per Day (Rs.) - Cyan highlight */}
                        <td className="py-2 px-3 text-right font-mono font-black text-[#002060] dark:text-cyan-300 bg-[#D9E1F2] dark:bg-cyan-950/40 border-r border-slate-200 dark:border-slate-800 text-xs">
                          {formatPKR(row.breakdown.totalAmountReceived)}
                        </td>

                        {/* Institute Share */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">
                          {formatPKR(row.breakdown.instituteShare)}
                        </td>

                        {/* Actions (Copy row) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
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

                      {/* Expandable Drilldown Row showing individual challans */}
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-300 dark:border-slate-700">
                          <td colSpan={14} className="p-3 pl-8">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300">
                                <span>
                                  Challan Drilldown for {row.label} ({row.challans.length} Students)
                                </span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  Breakdown according to Board / Beautician / Regular Course rules
                                </span>
                              </div>
                              <div className="overflow-x-auto max-h-72">
                                <table className="w-full text-[11px] text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
                                    <tr>
                                      <th className="py-1.5 px-2">Challan ID</th>
                                      <th className="py-1.5 px-2 min-w-[140px]">Roll / Trainee Name</th>
                                      <th className="py-1.5 px-2">Course</th>
                                      <th className="py-1.5 px-2 text-right">Adm Fee</th>
                                      <th className="py-1.5 px-2 text-right">25% PF</th>
                                      <th className="py-1.5 px-2 text-right font-bold text-rose-600">TEVTA Dues</th>
                                      <th className="py-1.5 px-2 text-right">75% PF</th>
                                      <th className="py-1.5 px-2 text-right">Security</th>
                                      <th className="py-1.5 px-2 text-right font-bold text-amber-600">Board Fee</th>
                                      <th className="py-1.5 px-2 text-right font-bold text-purple-600">Self Fin.</th>
                                      <th className="py-1.5 px-2 text-right font-bold text-indigo-600">Other (TUV)</th>
                                      <th className="py-1.5 px-2 text-right font-bold text-emerald-600">Institute Share</th>
                                      <th className="py-1.5 px-2 text-right font-black text-blue-700">Total (Rs.)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                                    {row.challans.map((c) => {
                                      const cb = computeChallanFeeBreakdown(c);
                                      return (
                                        <tr key={c.challanId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                          <td className="py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">
                                            {c.challanId}
                                          </td>
                                          <td className="py-1.5 px-2 font-sans">
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                              {c.traineeName}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                                              {c.rollOrCode && <span>{c.rollOrCode}</span>}
                                              {c.cnic && <span>• CNIC: {c.cnic}</span>}
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-2 font-sans font-semibold">
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                cb.isBeauticianSelfFinance
                                                  ? 'bg-purple-100 text-purple-800'
                                                  : cb.isTuv
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-slate-100 text-slate-800'
                                              }`}
                                            >
                                              {c.courseAbbreviation || 'REG'}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">
                                            {cb.admissionTuitionRegFee > 0 ? formatPKR(cb.admissionTuitionRegFee) : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">
                                            {cb.pupilFee25Percent > 0 ? formatPKR(cb.pupilFee25Percent) : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-rose-600">
                                            {formatPKR(cb.totalTevtaDues)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">
                                            {cb.pupilFee75Percent > 0 ? formatPKR(cb.pupilFee75Percent) : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">
                                            {cb.collegeSecurity > 0 ? formatPKR(cb.collegeSecurity) : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-amber-600">
                                            {cb.boardCharges > 0 ? formatPKR(cb.boardCharges) : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-purple-600">
                                            {cb.shortCourseSelfFinance > 0 ? formatPKR(cb.shortCourseSelfFinance) : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-indigo-600">
                                            {cb.bankProfit > 0 ? formatPKR(cb.bankProfit) : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-emerald-600">
                                            {formatPKR(cb.instituteShare)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-black text-blue-700 dark:text-cyan-400">
                                            {formatPKR(cb.totalAmountReceived)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Bottom Grand Total Footer */}
            {rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-400 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 font-black text-xs">
                <tr>
                  <td className="py-3 px-2 text-center text-slate-500"></td>
                  <td className="py-3 px-3 text-slate-900 dark:text-white font-bold">
                    GRAND TOTAL
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 dark:text-slate-200">
                    {formatPKR(grandTotal.admissionTuitionRegFee)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 dark:text-slate-200">
                    {formatPKR(grandTotal.pupilFee25Percent)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30">
                    {formatPKR(grandTotal.totalTevtaDues)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 dark:text-slate-200">
                    {formatPKR(grandTotal.pupilFee75Percent)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 dark:text-slate-200">
                    {formatPKR(grandTotal.collegeSecurity)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-amber-700 dark:text-amber-400">
                    {formatPKR(grandTotal.boardCharges)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-purple-700 dark:text-purple-400">
                    {formatPKR(grandTotal.shortCourseSelfFinance)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-500">
                    {grandTotal.bankProfit > 0 ? formatPKR(grandTotal.bankProfit) : '-'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-900 dark:text-white bg-[#E2EFDA]/50 dark:bg-emerald-950/30">
                    {formatPKR(grandTotal.subTotalInstituteShare)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-[#002060] dark:text-cyan-300 bg-[#D9E1F2] dark:bg-cyan-950/50">
                    Rs. {formatPKR(grandTotal.totalAmountReceived)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                    Rs. {formatPKR(grandTotal.instituteShare)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
