import React, { useMemo } from 'react';
import {
  Printer,
  Download,
  Building2,
} from 'lucide-react';
import {
  BankStatementData,
  BankReconciliationResult,
  InternalPaymentRecord,
  InternalReceiptRecord,
} from '../types/bankStatement';
import { OFFICIAL_SIGNATORIES } from '../types';
import { formatPKR } from '../utils/bankMatchingEngine';
import {
  INITIAL_DIRECTOR_MONTHLY_GRID,
} from '../data/directorReconData';

export interface InstitutionalBRSStatementProps {
  reconciliation: BankReconciliationResult;
  statement: BankStatementData | null;
  accountShortName: string;
  accountNo: string;
  accountTitle: string;
  branchName: string;
  fromMonth: string;
  toMonth: string;
  asOnDate: string;
  darkMode: boolean;
  receipts?: InternalReceiptRecord[];
  payments?: InternalPaymentRecord[];
  openingBalance?: number;
  onPrintBRS?: () => void;
  onExportExcelBRS?: () => void;
}

export interface MonthReportRow {
  monthKey: string;
  monthLabel: string;
  monthName: string;
  year: string;
  isInPeriod: boolean;

  // Receipts side (Left)
  receiptHeadsDesc: string;
  directReceipts: number;
  bankProfit: number;
  fromOtherAccount: number;
  totalReceipts: number;
  receiptCount: number;

  // Payments side (Right)
  paymentHeadsDesc: string;
  directPayments: number;
  bankCharges: number;
  toOtherAccount: number;
  totalPayments: number;
  paymentCount: number;

  // Net movement
  netMovement: number;
}

// Categorization helper for receipts
function classifyReceipt(r: InternalReceiptRecord): 'PROFIT' | 'OTHER_ACCOUNT' | 'DIRECT' {
  const text = `${r.headOfAccount} ${r.remarks} ${r.paidToBy}`.toLowerCase();
  if (
    text.includes('profit') ||
    text.includes('pls') ||
    text.includes('markup') ||
    text.includes('interest') ||
    text.includes('return')
  ) {
    return 'PROFIT';
  }
  if (
    text.includes('other account') ||
    text.includes('institute') ||
    text.includes('provident') ||
    text.includes('pf') ||
    text.includes('short course') ||
    text.includes('sc ') ||
    text.includes('transfer from') ||
    text.includes('student fund') ||
    text.includes('security')
  ) {
    return 'OTHER_ACCOUNT';
  }
  return 'DIRECT'; // Budget, Non-Salary Grant, TEVTA allocation, fees
}

// Categorization helper for payments
function classifyPayment(p: InternalPaymentRecord): 'BANK_CHARGES' | 'OTHER_ACCOUNT' | 'DIRECT' {
  const text = `${p.headOfAccount} ${p.remarks} ${p.paidTo} ${p.voucherNo} ${p.chequeNo}`.toLowerCase();
  if (
    text.includes('bank charge') ||
    text.includes('service charge') ||
    text.includes('fed') ||
    text.includes('bop charge') ||
    text.includes('a03101') ||
    text.includes('debit card') ||
    text.includes('sms charge') ||
    text.includes('commission')
  ) {
    return 'BANK_CHARGES';
  }
  if (
    text.includes('other account') ||
    text.includes('transfer to') ||
    text.includes('provident') ||
    text.includes('pf') ||
    text.includes('short course') ||
    text.includes('sc ') ||
    text.includes('institute') ||
    text.includes('cmsdi') ||
    text.includes('navttc')
  ) {
    return 'OTHER_ACCOUNT';
  }
  return 'DIRECT'; // Direct expense, vouchers, vendor cheques
}

// Format month label from YYYY-MM
function formatMonthLabel(mKey: string): { label: string; monthName: string; year: string } {
  const parts = mKey.split('-');
  const y = parts[0] || '2026';
  const m = parseInt(parts[1] || '7', 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = Math.max(0, Math.min(11, m - 1));
  const shortM = shortNames[mIdx];
  const fullM = monthNames[mIdx];
  const shortY = y.slice(-2);
  return {
    label: `${shortM}-${shortY}`,
    monthName: fullM,
    year: y,
  };
}

// Summarize head descriptions
function summarizeHeadList(heads: string[], defaultLabel: string): string {
  const unique = Array.from(new Set(heads.map((h) => h.trim()))).filter(Boolean);
  if (unique.length === 0) return defaultLabel;
  // Clean up codes and shorten
  const cleaned = unique.map((h) => {
    // E.g. "A03807-PURCHASE OF OTHER STORES" -> "A03807 Training Material"
    if (h.includes('A03807') || h.toLowerCase().includes('stores') || h.toLowerCase().includes('raw material')) return 'A03807 Raw Material';
    if (h.includes('A03303') || h.toLowerCase().includes('electricity') || h.toLowerCase().includes('utilities')) return 'A03303 Utilities';
    if (h.includes('A03901') || h.toLowerCase().includes('stationery')) return 'A03901 Stationery';
    if (h.includes('A03970') || h.toLowerCase().includes('repair') || h.toLowerCase().includes('machinery')) return 'A03970 Repair';
    if (h.includes('A03101') || h.toLowerCase().includes('bank charge')) return 'A03101 Bank Charges';
    if (h.toLowerCase().includes('non-salary') || h.toLowerCase().includes('grant')) return 'Non-Salary Grant';
    if (h.toLowerCase().includes('daily wages')) return 'Daily Wages Budget';
    if (h.toLowerCase().includes('profit') || h.toLowerCase().includes('pls')) return 'PLS Profit';
    if (h.toLowerCase().includes('short course') || h.toLowerCase().includes('navttc')) return 'Short Course / NAVTTC';
    return h.length > 22 ? h.slice(0, 20) + '…' : h;
  });
  const topUnique = Array.from(new Set(cleaned)).slice(0, 3);
  return topUnique.join(' + ');
}

export const InstitutionalBRSStatement: React.FC<InstitutionalBRSStatementProps> = ({
  reconciliation,
  statement,
  accountShortName,
  accountNo,
  accountTitle,
  branchName,
  fromMonth,
  toMonth,
  asOnDate,
  darkMode,
  receipts = [],
  payments = [],
  openingBalance = 0,
  onPrintBRS,
  onExportExcelBRS,
}) => {
  // 1. Determine all months to report
  const allMonthsList = useMemo<MonthReportRow[]>(() => {
    // Collect all month keys from receipts, payments, and INITIAL_DIRECTOR_MONTHLY_GRID
    const monthKeySet = new Set<string>();

    // Add months from fromMonth to toMonth
    const [fromY, fromM] = fromMonth.split('-').map(Number);
    const [toY, toM] = toMonth.split('-').map(Number);

    if (fromY && fromM && toY && toM) {
      let curY = fromY;
      let curM = fromM;
      while (curY < toY || (curY === toY && curM <= toM)) {
        const mKey = `${curY}-${String(curM).padStart(2, '0')}`;
        monthKeySet.add(mKey);
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
      }
    }

    // Add months from receipts
    receipts.forEach((r) => {
      if (r.monthKey) monthKeySet.add(r.monthKey);
    });

    // Add months from payments
    payments.forEach((p) => {
      if (p.monthKey) monthKeySet.add(p.monthKey);
    });

    // If FY 2025-26 grid matches
    INITIAL_DIRECTOR_MONTHLY_GRID.forEach((g) => {
      const mk = g.monthKey.slice(0, 7);
      monthKeySet.add(mk);
    });

    const sortedMonthKeys = Array.from(monthKeySet).sort();

    return sortedMonthKeys.map((mKey) => {
      const { label, monthName, year } = formatMonthLabel(mKey);
      const isInPeriod = mKey >= fromMonth && mKey <= toMonth;

      // Filter receipts for this month
      const mReceipts = receipts.filter((r) => r.monthKey === mKey);
      let directR = 0;
      let profitR = 0;
      let otherR = 0;
      const receiptHeads: string[] = [];

      mReceipts.forEach((r) => {
        const cat = classifyReceipt(r);
        receiptHeads.push(r.headOfAccount || r.remarks || 'Grant');
        if (cat === 'PROFIT') profitR += r.amount;
        else if (cat === 'OTHER_ACCOUNT') otherR += r.amount;
        else directR += r.amount;
      });

      // Filter payments for this month
      const mPayments = payments.filter((p) => p.monthKey === mKey);
      let directP = 0;
      let chargesP = 0;
      let otherP = 0;
      const paymentHeads: string[] = [];

      mPayments.forEach((p) => {
        const cat = classifyPayment(p);
        paymentHeads.push(p.headOfAccount || p.remarks || 'Expense');
        const amt = p.totalBillAmount || p.netAmountPaid || 0;
        if (cat === 'BANK_CHARGES') chargesP += amt;
        else if (cat === 'OTHER_ACCOUNT') otherP += amt;
        else directP += amt;
      });

      // Check if this month is in INITIAL_DIRECTOR_MONTHLY_GRID and live counts are 0
      if (mReceipts.length === 0 && mPayments.length === 0) {
        const gridMatch = INITIAL_DIRECTOR_MONTHLY_GRID.find((g) => g.monthKey.startsWith(mKey));
        if (gridMatch) {
          directR = gridMatch.directReceipts;
          profitR = gridMatch.otherReceiptsProfit;
          otherR = gridMatch.shortCourseReceipts + gridMatch.fromOtherBankAccount;
          receiptHeads.push(gridMatch.receiptDesc);

          directP = gridMatch.directPayments;
          chargesP = gridMatch.otherPaymentsBankCharges;
          otherP = gridMatch.cmsdiNavttcPayments;
          paymentHeads.push(gridMatch.paymentDesc);
        }
      }

      const totalR = directR + profitR + otherR;
      const totalP = directP + chargesP + otherP;

      const receiptDesc = summarizeHeadList(receiptHeads, 'Nil Receipts');
      const paymentDesc = summarizeHeadList(paymentHeads, 'Nil Payments');

      return {
        monthKey: mKey,
        monthLabel: label,
        monthName,
        year,
        isInPeriod,
        receiptHeadsDesc: receiptDesc,
        directReceipts: Math.round(directR * 100) / 100,
        bankProfit: Math.round(profitR * 100) / 100,
        fromOtherAccount: Math.round(otherR * 100) / 100,
        totalReceipts: Math.round(totalR * 100) / 100,
        receiptCount: mReceipts.length,
        paymentHeadsDesc: paymentDesc,
        directPayments: Math.round(directP * 100) / 100,
        bankCharges: Math.round(chargesP * 100) / 100,
        toOtherAccount: Math.round(otherP * 100) / 100,
        totalPayments: Math.round(totalP * 100) / 100,
        paymentCount: mPayments.length,
        netMovement: Math.round((totalR - totalP) * 100) / 100,
      };
    });
  }, [receipts, payments, fromMonth, toMonth]);

  // Displayed rows based on selected period
  const displayedRows = useMemo(() => {
    const inPeriod = allMonthsList.filter((r) => r.isInPeriod);
    return inPeriod.length > 0 ? inPeriod : allMonthsList;
  }, [allMonthsList]);

  // Totals for displayed rows
  const totals = useMemo(() => {
    let totDirectR = 0;
    let totProfitR = 0;
    let totOtherR = 0;
    let grandTotR = 0;

    let totDirectP = 0;
    let totChargesP = 0;
    let totOtherP = 0;
    let grandTotP = 0;

    displayedRows.forEach((r) => {
      totDirectR += r.directReceipts;
      totProfitR += r.bankProfit;
      totOtherR += r.fromOtherAccount;
      grandTotR += r.totalReceipts;

      totDirectP += r.directPayments;
      totChargesP += r.bankCharges;
      totOtherP += r.toOtherAccount;
      grandTotP += r.totalPayments;
    });

    return {
      totDirectR: Math.round(totDirectR * 100) / 100,
      totProfitR: Math.round(totProfitR * 100) / 100,
      totOtherR: Math.round(totOtherR * 100) / 100,
      grandTotR: Math.round(grandTotR * 100) / 100,

      totDirectP: Math.round(totDirectP * 100) / 100,
      totChargesP: Math.round(totChargesP * 100) / 100,
      totOtherP: Math.round(totOtherP * 100) / 100,
      grandTotP: Math.round(grandTotP * 100) / 100,
    };
  }, [displayedRows]);

  const {
    cashBookClosingBalance,
    bankStatementClosingBalance,
    unpresentedCheques,
    totalUnpresentedCheques,
    inBankNotInCashBookDebits,
    totalBankDebitsNotInCashBook,
    inBankNotInCashBookCredits,
    totalBankCreditsNotInCashBook,
    uncreditedReceipts,
    totalUncreditedReceipts,
    reconciledBankBalance,
    variance,
    isFullyExplained,
  } = reconciliation;

  return (
    <div className="space-y-6">
      {/* Header bar with title and export actions */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300 shadow-xs'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <Building2 className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`} />
            <h3
              className={`text-sm sm:text-base font-black uppercase tracking-wide ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Government Vocational Training Institute (W) Samanabad, Faisalabad
            </h3>
          </div>
          <p
            className={`text-xs mt-0.5 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <strong>Bank Reconciliation Statement</strong> • {accountTitle} • A/C No: <strong>{accountNo}</strong> ({accountShortName}) • Period: <strong>{fromMonth} to {toMonth}</strong> (As on {asOnDate})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Buttons */}
          {onExportExcelBRS && (
            <button
              onClick={onExportExcelBRS}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/30'
                  : 'bg-white hover:bg-slate-50 text-emerald-800 border-emerald-300 shadow-xs'
              }`}
              title="Export Dual-Column BRS to Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          )}

          {onPrintBRS && (
            <button
              onClick={onPrintBRS}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
              }`}
              title="Print Dual-Column BRS"
            >
              <Printer className="w-3.5 h-3.5 text-blue-500" />
              <span>Print BRS</span>
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. DUAL COMPARATIVE TABLE: LEFT = RECEIPTS | RIGHT = PAYMENTS       */}
      {/* =================================================================== */}
      <div
        className={`overflow-x-auto rounded-2xl border print:border-slate-400 ${
          darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
        }`}
      >
        <table className="w-full text-xs border-collapse min-w-[1100px]">
          {/* Top Level Category Super-Header */}
          <thead>
            <tr
              className={`border-b text-center font-black uppercase tracking-wider text-xs ${
                darkMode
                  ? 'border-slate-700'
                  : 'border-slate-300'
              }`}
            >
              <th
                colSpan={6}
                className={`py-2.5 px-3 border-r ${
                  darkMode
                    ? 'bg-emerald-950/40 text-emerald-300 border-slate-700'
                    : 'bg-emerald-100/80 text-emerald-950 border-slate-300 font-black'
                }`}
              >
                RECEIPTS (CREDITS TO CASH BOOK / REVENUE INFLOWS)
              </th>
              <th
                colSpan={6}
                className={`py-2.5 px-3 ${
                  darkMode
                    ? 'bg-indigo-950/40 text-indigo-300'
                    : 'bg-indigo-100/80 text-indigo-950 font-black'
                }`}
              >
                PAYMENTS (DEBITS TO CASH BOOK / EXPENDITURE DISBURSEMENTS)
              </th>
            </tr>

            {/* Column Headers */}
            <tr
              className={`border-b font-bold text-[11px] ${
                darkMode
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              {/* Receipts Side */}
              <th className={`p-2 text-left w-20 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Month
              </th>
              <th className={`p-2 text-left w-48 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Brief Description of Heads
              </th>
              <th className={`p-2 text-right w-28 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Direct Receipts <br />
                <span className="text-[9px] font-normal opacity-75">(Budget / Grant)</span>
              </th>
              <th className={`p-2 text-right w-24 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Bank Profits <br />
                <span className="text-[9px] font-normal opacity-75">(PLS Profit)</span>
              </th>
              <th className={`p-2 text-right w-28 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                From Other A/C <br />
                <span className="text-[9px] font-normal opacity-75">(Institute / PF / SC)</span>
              </th>
              <th
                className={`p-2 text-right w-32 border-r-2 font-black ${
                  darkMode
                    ? 'border-slate-600 bg-emerald-950/20 text-emerald-300'
                    : 'border-slate-400 bg-emerald-50 text-emerald-950'
                }`}
              >
                Total Receipts (Rs.)
              </th>

              {/* Payments Side */}
              <th className={`p-2 text-left w-20 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Month
              </th>
              <th className={`p-2 text-left w-48 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Brief Description of Heads
              </th>
              <th className={`p-2 text-right w-28 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Direct Payment <br />
                <span className="text-[9px] font-normal opacity-75">(Operating / Chq)</span>
              </th>
              <th className={`p-2 text-right w-24 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Bank Charges <br />
                <span className="text-[9px] font-normal opacity-75">(BOP / FED)</span>
              </th>
              <th className={`p-2 text-right w-28 border-r ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                To Other A/C <br />
                <span className="text-[9px] font-normal opacity-75">(PF / Taxes / SC)</span>
              </th>
              <th
                className={`p-2 text-right w-32 font-black ${
                  darkMode
                    ? 'bg-indigo-950/20 text-indigo-300'
                    : 'bg-indigo-50 text-indigo-950'
                }`}
              >
                Total Payment (Rs.)
              </th>
            </tr>
          </thead>

          {/* Month by Month Rows */}
          <tbody>
            {displayedRows.map((r, idx) => {
              const isEven = idx % 2 === 0;
              const isCurrentPeriod = r.isInPeriod;

              return (
                <tr
                  key={r.monthKey}
                  className={`border-b transition-colors font-mono ${
                    darkMode
                      ? isEven
                        ? 'bg-slate-900/60 hover:bg-slate-800/40 border-slate-800'
                        : 'bg-slate-850/60 hover:bg-slate-800/40 border-slate-800'
                      : isEven
                      ? 'bg-white hover:bg-slate-50 border-slate-200'
                      : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200'
                  } ${!isCurrentPeriod ? 'opacity-50 hover:opacity-100' : ''}`}
                >
                  {/* Receipts Month */}
                  <td
                    className={`p-2 font-sans font-bold border-r ${
                      darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isCurrentPeriod && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                      <span>{r.monthLabel}</span>
                    </div>
                  </td>

                  {/* Receipts Heads Description */}
                  <td
                    className={`p-2 font-sans text-[11px] border-r ${
                      darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700 font-medium'
                    }`}
                    title={r.receiptHeadsDesc}
                  >
                    <span className="line-clamp-2">{r.receiptHeadsDesc}</span>
                  </td>

                  {/* Direct Receipts */}
                  <td
                    className={`p-2 text-right border-r ${
                      darkMode ? 'border-slate-700 text-emerald-300' : 'border-slate-300 text-emerald-800 font-semibold'
                    }`}
                  >
                    {r.directReceipts > 0 ? formatPKR(r.directReceipts, false) : '0.00'}
                  </td>

                  {/* Bank Profits */}
                  <td
                    className={`p-2 text-right border-r ${
                      darkMode ? 'border-slate-700 text-cyan-300' : 'border-slate-300 text-cyan-800 font-semibold'
                    }`}
                  >
                    {r.bankProfit > 0 ? formatPKR(r.bankProfit, false) : '0.00'}
                  </td>

                  {/* From Other Accounts */}
                  <td
                    className={`p-2 text-right border-r ${
                      darkMode ? 'border-slate-700 text-amber-300' : 'border-slate-300 text-amber-800 font-semibold'
                    }`}
                  >
                    {r.fromOtherAccount > 0 ? formatPKR(r.fromOtherAccount, false) : '0.00'}
                  </td>

                  {/* Total Receipts */}
                  <td
                    className={`p-2 text-right font-black border-r-2 ${
                      darkMode
                        ? 'border-slate-600 bg-emerald-950/20 text-emerald-300'
                        : 'border-slate-400 bg-emerald-50/60 text-emerald-950 font-black'
                    }`}
                  >
                    {r.totalReceipts > 0 ? formatPKR(r.totalReceipts, false) : '0.00'}
                  </td>

                  {/* Payments Month */}
                  <td
                    className={`p-2 font-sans font-bold border-r ${
                      darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-800'
                    }`}
                  >
                    {r.monthLabel}
                  </td>

                  {/* Payments Heads Description */}
                  <td
                    className={`p-2 font-sans text-[11px] border-r ${
                      darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700 font-medium'
                    }`}
                    title={r.paymentHeadsDesc}
                  >
                    <span className="line-clamp-2">{r.paymentHeadsDesc}</span>
                  </td>

                  {/* Direct Payments */}
                  <td
                    className={`p-2 text-right border-r ${
                      darkMode ? 'border-slate-700 text-indigo-300' : 'border-slate-300 text-indigo-800 font-semibold'
                    }`}
                  >
                    {r.directPayments > 0 ? formatPKR(r.directPayments, false) : '0.00'}
                  </td>

                  {/* Bank Charges */}
                  <td
                    className={`p-2 text-right border-r ${
                      darkMode ? 'border-slate-700 text-rose-300' : 'border-slate-300 text-rose-800 font-semibold'
                    }`}
                  >
                    {r.bankCharges > 0 ? formatPKR(r.bankCharges, false) : '0.00'}
                  </td>

                  {/* To Other Accounts */}
                  <td
                    className={`p-2 text-right border-r ${
                      darkMode ? 'border-slate-700 text-purple-300' : 'border-slate-300 text-purple-800 font-semibold'
                    }`}
                  >
                    {r.toOtherAccount > 0 ? formatPKR(r.toOtherAccount, false) : '0.00'}
                  </td>

                  {/* Total Payments */}
                  <td
                    className={`p-2 text-right font-black ${
                      darkMode
                        ? 'bg-indigo-950/20 text-indigo-300'
                        : 'bg-indigo-50/60 text-indigo-950 font-black'
                    }`}
                  >
                    {r.totalPayments > 0 ? formatPKR(r.totalPayments, false) : '0.00'}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* ================================================================= */}
          {/* TOTALS ROW: DIRECTLY BELOW MONTHS REPORTED                        */}
          {/* ================================================================= */}
          <tfoot>
            <tr
              className={`font-black text-xs border-t-2 border-b-2 font-mono ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 text-white'
                  : 'bg-slate-100 border-slate-400 text-slate-950 font-black'
              }`}
            >
              {/* Receipts Total */}
              <td
                className={`p-3 font-sans uppercase tracking-wide border-r ${
                  darkMode ? 'border-slate-700' : 'border-slate-300'
                }`}
              >
                TOTAL:
              </td>
              <td
                className={`p-3 font-sans text-[11px] border-r ${
                  darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700 font-bold'
                }`}
              >
                All Receipts Heads Summary
              </td>
              <td
                className={`p-3 text-right border-r ${
                  darkMode ? 'border-slate-700 text-emerald-300' : 'border-slate-300 text-emerald-800 font-black'
                }`}
              >
                Rs. {formatPKR(totals.totDirectR, false)}
              </td>
              <td
                className={`p-3 text-right border-r ${
                  darkMode ? 'border-slate-700 text-cyan-300' : 'border-slate-300 text-cyan-800 font-black'
                }`}
              >
                Rs. {formatPKR(totals.totProfitR, false)}
              </td>
              <td
                className={`p-3 text-right border-r ${
                  darkMode ? 'border-slate-700 text-amber-300' : 'border-slate-300 text-amber-800 font-black'
                }`}
              >
                Rs. {formatPKR(totals.totOtherR, false)}
              </td>
              <td
                className={`p-3 text-right font-black border-r-2 text-sm ${
                  darkMode
                    ? 'border-slate-500 bg-emerald-950/40 text-emerald-400'
                    : 'border-slate-400 bg-emerald-100/90 text-emerald-950 font-black'
                }`}
              >
                Rs. {formatPKR(totals.grandTotR, false)}
              </td>

              {/* Payments Total */}
              <td
                className={`p-3 font-sans uppercase tracking-wide border-r ${
                  darkMode ? 'border-slate-700' : 'border-slate-300'
                }`}
              >
                TOTAL:
              </td>
              <td
                className={`p-3 font-sans text-[11px] border-r ${
                  darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700 font-bold'
                }`}
              >
                All Payments Heads Summary
              </td>
              <td
                className={`p-3 text-right border-r ${
                  darkMode ? 'border-slate-700 text-indigo-300' : 'border-slate-300 text-indigo-800 font-black'
                }`}
              >
                Rs. {formatPKR(totals.totDirectP, false)}
              </td>
              <td
                className={`p-3 text-right border-r ${
                  darkMode ? 'border-slate-700 text-rose-300' : 'border-slate-300 text-rose-800 font-black'
                }`}
              >
                Rs. {formatPKR(totals.totChargesP, false)}
              </td>
              <td
                className={`p-3 text-right border-r ${
                  darkMode ? 'border-slate-700 text-purple-300' : 'border-slate-300 text-purple-800 font-black'
                }`}
              >
                Rs. {formatPKR(totals.totOtherP, false)}
              </td>
              <td
                className={`p-3 text-right font-black text-sm ${
                  darkMode
                    ? 'bg-indigo-950/40 text-indigo-400'
                    : 'bg-indigo-100/90 text-indigo-950 font-black'
                }`}
              >
                Rs. {formatPKR(totals.grandTotP, false)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* =================================================================== */}
      {/* 2. RECONCILIATION AS ON DATE (LEFT-RIGHT ALIKE TABLE)                */}
      {/* =================================================================== */}
      <div
        className={`overflow-x-auto rounded-xl border ${
          darkMode ? 'border-slate-700 bg-slate-900/90' : 'border-slate-300 bg-white shadow-xs'
        }`}
      >
        <div
          className={`p-3 border-b flex flex-wrap items-center justify-between gap-2 ${
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`} />
            <span
              className={`text-xs font-black uppercase tracking-wider ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Bank vs. Cash Balance Reconciliation Statement as on {asOnDate}
            </span>
          </div>
          <div
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
              isFullyExplained
                ? darkMode
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : darkMode
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {isFullyExplained
              ? '✓ 100% RECONCILED & BALANCED (Zero Variance)'
              : `Variance: ${formatPKR(variance)}`}
          </div>
        </div>

        <table className="w-full text-xs border-collapse font-mono">
          <thead>
            <tr
              className={`border-b text-center font-black uppercase text-xs ${
                darkMode ? 'border-slate-700' : 'border-slate-300'
              }`}
            >
              <th
                className={`w-1/2 p-2.5 border-r ${
                  darkMode
                    ? 'bg-emerald-950/40 text-emerald-300 border-slate-700'
                    : 'bg-emerald-100/70 text-emerald-950 border-slate-300'
                }`}
              >
                CASH BOOK BALANCE RECONCILIATION
              </th>
              <th
                className={`w-1/2 p-2.5 ${
                  darkMode
                    ? 'bg-indigo-950/40 text-indigo-300'
                    : 'bg-indigo-100/70 text-indigo-950'
                }`}
              >
                BANK OF PUNJAB STATEMENT RECONCILIATION
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              className={`border-b ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <td
                className={`p-2.5 border-r ${
                  darkMode ? 'border-slate-700' : 'border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-sans font-medium text-slate-700 dark:text-slate-300">
                    Opening Balance as per Cash Book Ledger:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatPKR(openingBalance)}
                  </span>
                </div>
              </td>
              <td className="p-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-medium text-slate-700 dark:text-slate-300">
                    Balance as per Physical BOP Statement:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatPKR(bankStatementClosingBalance)}
                  </span>
                </div>
              </td>
            </tr>

            <tr
              className={`border-b ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <td
                className={`p-2.5 border-r ${
                  darkMode ? 'border-slate-700' : 'border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                  <span className="font-sans font-medium">
                    ADD: Total Receipts during Period:
                  </span>
                  <span className="font-bold">+{formatPKR(totals.grandTotR)}</span>
                </div>
              </td>
              <td className="p-2.5">
                <div className="flex justify-between items-center text-rose-700 dark:text-rose-400">
                  <span className="font-sans font-medium">
                    LESS: Cheques Issued but Unpresented ({unpresentedCheques.length} Cheques):
                  </span>
                  <span className="font-bold">-{formatPKR(totalUnpresentedCheques)}</span>
                </div>
              </td>
            </tr>

            <tr
              className={`border-b ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <td
                className={`p-2.5 border-r ${
                  darkMode ? 'border-slate-700' : 'border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center text-rose-700 dark:text-rose-400">
                  <span className="font-sans font-medium">
                    LESS: Total Payments during Period:
                  </span>
                  <span className="font-bold">-{formatPKR(totals.grandTotP)}</span>
                </div>
              </td>
              <td className="p-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-medium text-slate-600 dark:text-slate-400">
                    Direct Bank Adjustments (Profit / Charges / Transit):
                  </span>
                  <span className="font-bold text-slate-600 dark:text-slate-400">
                    {totalBankCreditsNotInCashBook - totalBankDebitsNotInCashBook !== 0
                      ? formatPKR(totalBankCreditsNotInCashBook - totalBankDebitsNotInCashBook)
                      : '0.00'}
                  </span>
                </div>
              </td>
            </tr>

            {/* Closing / Reconciled Row */}
            <tr
              className={`border-b-2 font-bold ${
                darkMode
                  ? 'border-slate-600 bg-slate-800/60'
                  : 'border-slate-400 bg-slate-50'
              }`}
            >
              <td
                className={`p-3 border-r ${
                  darkMode ? 'border-slate-700' : 'border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-sans font-black text-slate-900 dark:text-white uppercase text-xs">
                    Closing Cash Book Balance as on {asOnDate}:
                  </span>
                  <span className="font-black text-sm text-blue-700 dark:text-blue-400">
                    {formatPKR(cashBookClosingBalance)}
                  </span>
                </div>
              </td>
              <td className="p-3">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-black text-slate-900 dark:text-white uppercase text-xs">
                    Adjusted Reconciled Bank Balance:
                  </span>
                  <span className="font-black text-sm text-blue-700 dark:text-blue-400">
                    {formatPKR(reconciledBankBalance)}
                  </span>
                </div>
              </td>
            </tr>

            {/* Reconciled Verification Row */}
            <tr
              className={`font-sans text-xs ${
                darkMode ? 'bg-slate-800' : 'bg-slate-100'
              }`}
            >
              <td colSpan={2} className="p-2.5 text-center">
                <div className="flex flex-wrap items-center justify-center gap-4 font-mono">
                  <span>
                    Cash Book Balance:{' '}
                    <strong className="text-slate-900 dark:text-white font-black">
                      {formatPKR(cashBookClosingBalance)}
                    </strong>
                  </span>
                  <span className="text-slate-400">=</span>
                  <span>
                    Adjusted Bank Balance:{' '}
                    <strong className="text-slate-900 dark:text-white font-black">
                      {formatPKR(reconciledBankBalance)}
                    </strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span
                    className={
                      isFullyExplained
                        ? 'text-emerald-700 dark:text-emerald-400 font-black'
                        : 'text-rose-600 dark:text-rose-400 font-black'
                    }
                  >
                    {isFullyExplained
                      ? 'Difference: Rs. 0.00 (✓ 100% RECONCILED)'
                      : `Difference: ${formatPKR(variance)}`}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* =================================================================== */}
      {/* 3. OFFICIAL SIGNATURES BLOCK (MATCHING CASHBOOK & OTHER REPORTS)     */}
      {/* =================================================================== */}
      <div className="pt-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        {OFFICIAL_SIGNATORIES.map((sig) => (
          <div
            key={sig.name}
            className="border-t border-slate-400 dark:border-slate-600 pt-2"
          >
            <strong className="block text-xs font-black text-slate-900 dark:text-white uppercase">
              {sig.name}
            </strong>
            <span className="block text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              {sig.role}
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider mt-0.5">
              {sig.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
