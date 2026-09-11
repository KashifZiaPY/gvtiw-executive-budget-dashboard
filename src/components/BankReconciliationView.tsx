import React, { useState } from 'react';
import {
  Landmark,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Download,
  Plus,
  Trash2,
  Sparkles,
  Search,
  FileText,
  Copy,
  Check,
  Building2,
  Layers,
} from 'lucide-react';
import {
  BankStatementData,
  BankReconciliationResult,
  UnmatchedBankItem,
  InternalPaymentRecord,
  InternalReceiptRecord,
} from '../types/bankStatement';
import { formatPKR } from '../utils/bankMatchingEngine';
import { ReceiptsPaymentsMajorHeads } from './ReceiptsPaymentsMajorHeads';
import { InstitutionalBRSStatement } from './InstitutionalBRSStatement';

interface BankReconciliationViewProps {
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
  onOpenUploadModal: () => void;
  onOpenReviewModal: () => void;
  onLoadSampleStatement: () => void;
  onToggleManualOverride: (txId: string) => void;
  onAddUnpresentedCheque: () => void;
  onRemoveUnpresentedCheque: (id: string) => void;
  onRecordVoucherForBankItem?: (item: UnmatchedBankItem) => void;
  onPrintBRS: () => void;
  onExportExcelBRS: () => void;
}

type BRSSubTab =
  | 'SCHEDULE'
  | 'MATCHED'
  | 'MISMATCHES'
  | 'IN_BANK_NOT_IN_CASHBOOK'
  | 'UNPRESENTED'
  | 'STATEMENT_ROWS';

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
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
  onOpenUploadModal,
  onOpenReviewModal,
  onLoadSampleStatement,
  onToggleManualOverride,
  onAddUnpresentedCheque,
  onRemoveUnpresentedCheque,
  onPrintBRS,
  onExportExcelBRS,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<BRSSubTab>('SCHEDULE');
  const [scheduleViewMode, setScheduleViewMode] = useState<'DUAL_TABLE' | 'CLASSIC_STEPS'>('DUAL_TABLE');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const {
    cashBookClosingBalance,
    bankStatementClosingBalance,
    unpresentedCheques,
    totalUnpresentedCheques,
    uncreditedReceipts,
    totalUncreditedReceipts,
    inBankNotInCashBookDebits,
    totalBankDebitsNotInCashBook,
    inBankNotInCashBookCredits,
    totalBankCreditsNotInCashBook,
    matchedTransactions,
    amountMismatches,
    reconciledBankBalance,
    directDifference,
    variance,
    isFullyExplained,
  } = reconciliation;

  const handleCopyVoucherDetails = (item: UnmatchedBankItem) => {
    const text = `Voucher Draft for Bank Entry:\nType: ${
      item.type === 'DEBIT' ? 'Bank Charges / Debit' : 'Direct Credit / Profit'
    }\nAmount: Rs. ${item.amount}\nDate: ${item.bankTx.transactionDate}\nParticulars: ${
      item.bankTx.natureOfTransaction
    }\nBank: The Bank of Punjab (A/C ${accountNo})`;
    navigator.clipboard.writeText(text);
    setCopiedItemId(item.id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. TOP RECONCILIATION SUMMARY CARDS (LIGHT & DARK HIGH CONTRAST) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cash Book Closing Balance */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
            darkMode
              ? 'bg-slate-900/90 border-blue-500/40'
              : 'bg-blue-50/80 border-blue-200 shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  darkMode ? 'text-blue-400' : 'text-blue-900'
                }`}
              >
                Cash Book Balance
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  darkMode
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}
              >
                Live Auto
              </span>
            </div>
            <div
              className={`mt-2 text-2xl sm:text-3xl font-mono font-black ${
                darkMode ? 'text-white' : 'text-blue-950'
              } print:text-black`}
            >
              {formatPKR(cashBookClosingBalance)}
            </div>
            <p
              className={`text-[11px] mt-2 font-mono ${
                darkMode ? 'text-slate-400' : 'text-slate-700 font-medium'
              }`}
            >
              Net balance as per Cash Book Ledger as on {asOnDate}
            </p>
          </div>
          <div
            className={`mt-3 pt-2 border-t text-[11px] flex items-center justify-between font-mono ${
              darkMode ? 'border-slate-700/60 text-slate-400' : 'border-blue-200 text-slate-700'
            }`}
          >
            <span>Period:</span>
            <strong className={darkMode ? 'text-slate-200' : 'text-slate-950'}>
              {fromMonth} to {toMonth}
            </strong>
          </div>
        </div>

        {/* Card 2: Bank Statement Closing Balance */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
            darkMode
              ? 'bg-slate-900/90 border-indigo-500/40'
              : 'bg-indigo-50/80 border-indigo-200 shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  darkMode ? 'text-indigo-400' : 'text-indigo-900'
                }`}
              >
                Bank Statement Balance
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  darkMode
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                }`}
              >
                {statement?.sourceType === 'UPLOAD_AI' ? 'Gemini AI Verified' : 'BOP Statement'}
              </span>
            </div>
            <div
              className={`mt-2 text-2xl sm:text-3xl font-mono font-black ${
                darkMode ? 'text-amber-300' : 'text-indigo-950'
              } print:text-black`}
            >
              {formatPKR(bankStatementClosingBalance)}
            </div>
            <p
              className={`text-[11px] mt-2 font-mono ${
                darkMode ? 'text-slate-400' : 'text-slate-700 font-medium'
              }`}
            >
              BOP A/C {accountNo} closing balance as on period end
            </p>
          </div>
          <div
            className={`mt-3 pt-2 border-t text-[11px] flex items-center justify-between ${
              darkMode ? 'border-slate-700/60 text-slate-400' : 'border-indigo-200 text-slate-700'
            }`}
          >
            <span>Statement Source:</span>
            <span className={darkMode ? 'text-indigo-300 font-bold' : 'text-indigo-900 font-black'}>
              {statement ? `${statement.transactions.length} rows loaded` : 'Manual input'}
            </span>
          </div>
        </div>

        {/* Card 3: Outstanding Adjustments */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
            darkMode
              ? 'bg-slate-900/90 border-amber-500/40'
              : 'bg-amber-50/80 border-amber-200 shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  darkMode ? 'text-amber-400' : 'text-amber-900'
                }`}
              >
                Outstanding Cheques &amp; Items
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  darkMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                Schedule
              </span>
            </div>
            <div
              className={`mt-2 text-xl sm:text-2xl font-mono font-black ${
                darkMode ? 'text-white' : 'text-amber-950'
              } print:text-black`}
            >
              {formatPKR(totalUnpresentedCheques)}
            </div>
            <p
              className={`text-[11px] mt-2 leading-tight ${
                darkMode ? 'text-slate-400' : 'text-slate-700 font-medium'
              }`}
            >
              {unpresentedCheques.length} unpresented cheques +{' '}
              {inBankNotInCashBookDebits.length + inBankNotInCashBookCredits.length} bank-only items
            </p>
          </div>
          <div
            className={`mt-3 pt-2 border-t text-[11px] flex items-center justify-between font-mono ${
              darkMode ? 'border-slate-700/60 text-slate-400' : 'border-amber-200 text-slate-700'
            }`}
          >
            <span>Variance Explained:</span>
            <span className={darkMode ? 'text-emerald-400 font-bold' : 'text-emerald-800 font-black'}>
              {isFullyExplained ? '100% Explained' : `${formatPKR(variance)} pending`}
            </span>
          </div>
        </div>

        {/* Card 4: Reconciliation Status */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
            isFullyExplained
              ? darkMode
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
              : darkMode
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isFullyExplained
                    ? darkMode
                      ? 'text-emerald-300'
                      : 'text-emerald-900'
                    : darkMode
                    ? 'text-amber-300'
                    : 'text-amber-900'
                }`}
              >
                Status: BRS Audit Result
              </span>
              {isFullyExplained ? (
                <CheckCircle2
                  className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}
                />
              ) : (
                <AlertTriangle
                  className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}
                />
              )}
            </div>
            <div className="mt-2 text-lg sm:text-xl font-black uppercase tracking-tight">
              {isFullyExplained ? '✓ FULLY RECONCILED' : '⚠ VARIANCE DETECTED'}
            </div>
            <p
              className={`text-[11px] mt-2 font-mono ${
                isFullyExplained
                  ? darkMode
                    ? 'text-emerald-400/90'
                    : 'text-emerald-800 font-medium'
                  : darkMode
                  ? 'text-amber-400/90'
                  : 'text-amber-800 font-medium'
              }`}
            >
              {isFullyExplained
                ? 'Reconciliation equation holds 100% (Zero unexplained difference)'
                : `Unexplained variance of ${formatPKR(Math.abs(variance))}`}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-current/20 text-[11px] flex items-center justify-between font-mono">
            <span>Direct Cash-Bank Diff:</span>
            <strong>{formatPKR(directDifference)}</strong>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. RECONCILIATION EQUATION BANNER (AUDIT BREAKDOWN)            */}
      {/* ============================================================== */}
      <div
        className={`p-4 rounded-2xl border font-mono text-xs ${
          darkMode
            ? 'bg-slate-900/80 border-slate-700'
            : 'bg-slate-100/90 border-slate-300 shadow-xs text-slate-900'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <span
              className={`text-[11px] font-black uppercase tracking-wider font-sans block ${
                darkMode ? 'text-blue-400' : 'text-blue-900 font-bold'
              }`}
            >
              Standard Bank Reconciliation Statement Equation:
            </span>
            <div
              className={`flex flex-wrap items-center gap-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-800 font-semibold'
              } print:text-black`}
            >
              <span>Cash Book ({formatPKR(cashBookClosingBalance)})</span>
              <span
                className={`font-bold ${
                  darkMode ? 'text-emerald-400' : 'text-emerald-700 font-black'
                }`}
              >
                + Unpresented Cheques ({formatPKR(totalUnpresentedCheques)})
              </span>
              {totalUncreditedReceipts > 0 && (
                <span
                  className={`font-bold ${
                    darkMode ? 'text-rose-400' : 'text-rose-700 font-black'
                  }`}
                >
                  − Uncredited Receipts ({formatPKR(totalUncreditedReceipts)})
                </span>
              )}
              {totalBankCreditsNotInCashBook > 0 && (
                <span
                  className={`font-bold ${
                    darkMode ? 'text-emerald-400' : 'text-emerald-700 font-black'
                  }`}
                >
                  + Bank Direct Credits ({formatPKR(totalBankCreditsNotInCashBook)})
                </span>
              )}
              {totalBankDebitsNotInCashBook > 0 && (
                <span
                  className={`font-bold ${
                    darkMode ? 'text-rose-400' : 'text-rose-700 font-black'
                  }`}
                >
                  − Bank Charges/Debits ({formatPKR(totalBankDebitsNotInCashBook)})
                </span>
              )}
              <span
                className={`font-black ${
                  darkMode ? 'text-white' : 'text-slate-950 font-black'
                } print:text-black`}
              >
                = Reconciled Balance ({formatPKR(reconciledBankBalance)})
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span
              className={`text-[10px] uppercase tracking-wider block ${
                darkMode ? 'text-slate-400' : 'text-slate-600 font-bold'
              }`}
            >
              Comparison vs Bank Statement
            </span>
            <span
              className={`text-sm font-black ${
                isFullyExplained
                  ? darkMode
                    ? 'text-emerald-400'
                    : 'text-emerald-800'
                  : darkMode
                  ? 'text-amber-400'
                  : 'text-amber-800'
              }`}
            >
              Variance: {formatPKR(variance)}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2.5. CASH BOOK RECEIPTS & PAYMENTS MAJOR HEADS ANALYSIS        */}
      {/* (Receipts Left Side, Payments Right Side with short description) */}
      {/* ============================================================== */}
      <ReceiptsPaymentsMajorHeads
        receipts={receipts}
        payments={payments}
        darkMode={darkMode}
        accountShortName={accountShortName}
        fromMonth={fromMonth}
        toMonth={toMonth}
      />

      {/* ============================================================== */}
      {/* 3. ACTION TOOLBAR                                              */}
      {/* ============================================================== */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border print:hidden ${
          darkMode
            ? 'bg-slate-800/40 border-slate-700/60'
            : 'bg-slate-100 border-slate-300 shadow-xs'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Button */}
          <button
            onClick={onOpenUploadModal}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload BOP Statement</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-800 text-[10px] text-blue-200 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          </button>

          {/* Review / Staging Table Button */}
          <button
            onClick={onOpenReviewModal}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
            }`}
          >
            <FileSpreadsheet
              className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}
            />
            <span>Review Extracted Rows ({statement?.transactions.length || 0})</span>
          </button>

          {/* Sample BOP Statement */}
          <button
            onClick={onLoadSampleStatement}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
            }`}
          >
            <Landmark
              className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}
            />
            <span>Load Sample BOP Statement</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Excel Export */}
          <button
            onClick={onExportExcelBRS}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/30'
                : 'bg-white hover:bg-slate-50 text-emerald-800 border-emerald-300 shadow-xs'
            }`}
            title="Export BRS to Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export BRS Excel</span>
          </button>

          {/* Print Button */}
          <button
            onClick={onPrintBRS}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
            }`}
            title="Print Official Bank Reconciliation Statement"
          >
            <Printer
              className={`w-3.5 h-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
            />
            <span>Print BRS</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. SUB-TABS: SCHEDULE / MATCHED / IN BANK / UNPRESENTED        */}
      {/* ============================================================== */}
      <div
        className={`flex flex-wrap items-center justify-between border-b gap-2 pt-2 ${
          darkMode ? 'border-slate-700/60' : 'border-slate-300'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveSubTab('SCHEDULE')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'SCHEDULE'
                ? darkMode
                  ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-blue-600 text-blue-900 bg-blue-50 font-black'
                : darkMode
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Official BRS Schedule</span>
          </button>

          <button
            onClick={() => setActiveSubTab('MATCHED')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'MATCHED'
                ? darkMode
                  ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-blue-600 text-blue-900 bg-blue-50 font-black'
                : darkMode
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}
            />
            <span>2. Matched Cheques ({matchedTransactions.length})</span>
          </button>

          {amountMismatches.length > 0 && (
            <button
              onClick={() => setActiveSubTab('MISMATCHES')}
              className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'MISMATCHES'
                  ? darkMode
                    ? 'border-amber-500 text-amber-400 bg-slate-800/60'
                    : 'border-amber-600 text-amber-900 bg-amber-50 font-black'
                  : darkMode
                  ? 'border-transparent text-amber-400/70 hover:text-amber-300'
                  : 'border-transparent text-amber-700 hover:text-amber-950'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Amount Mismatches ({amountMismatches.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('IN_BANK_NOT_IN_CASHBOOK')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'IN_BANK_NOT_IN_CASHBOOK'
                ? darkMode
                  ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-blue-600 text-blue-900 bg-blue-50 font-black'
                : darkMode
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark
              className={`w-3.5 h-3.5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}
            />
            <span>
              3. In Bank, Not in Cash Book (
              {inBankNotInCashBookDebits.length + inBankNotInCashBookCredits.length})
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('UNPRESENTED')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'UNPRESENTED'
                ? darkMode
                  ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-blue-600 text-blue-900 bg-blue-50 font-black'
                : darkMode
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2
              className={`w-3.5 h-3.5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}
            />
            <span>4. Unpresented Cheques ({unpresentedCheques.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('STATEMENT_ROWS')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'STATEMENT_ROWS'
                ? darkMode
                  ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-blue-600 text-blue-900 bg-blue-50 font-black'
                : darkMode
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>5. Raw BOP Statement ({statement?.transactions.length || 0})</span>
          </button>
        </div>

        <div className="relative pb-2 w-full sm:w-64 print:hidden">
          <Search
            className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          />
          <input
            type="text"
            placeholder="Search cheque #, amount, payee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-hidden focus:border-blue-500 ${
              darkMode
                ? 'bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-xs'
            }`}
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. TAB CONTENT PANELS                                          */}
      {/* ============================================================== */}

      {/* SUB-TAB 1: OFFICIAL BRS SCHEDULE                               */}
      {activeSubTab === 'SCHEDULE' && (
        <div className="space-y-4">
          {/* Format Selector Bar */}
          <div
            className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                Statement Format:
              </span>
              <div
                className={`p-0.5 rounded-lg border flex items-center ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
                }`}
              >
                <button
                  onClick={() => setScheduleViewMode('DUAL_TABLE')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    scheduleViewMode === 'DUAL_TABLE'
                      ? darkMode
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-blue-900 shadow-xs font-black'
                      : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dual Receipts &amp; Payments Table (Left: Receipts | Right: Payments)
                </button>
                <button
                  onClick={() => setScheduleViewMode('CLASSIC_STEPS')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    scheduleViewMode === 'CLASSIC_STEPS'
                      ? darkMode
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-blue-900 shadow-xs font-black'
                      : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Classic Single-Column Steps
                </button>
              </div>
            </div>

            <div className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Institutional BRS format with monthly receipts &amp; payments columns and balance reconciliation
            </div>
          </div>

          {scheduleViewMode === 'DUAL_TABLE' ? (
            <InstitutionalBRSStatement
              reconciliation={reconciliation}
              statement={statement}
              accountShortName={accountShortName}
              accountNo={accountNo}
              accountTitle={accountTitle}
              branchName={branchName}
              fromMonth={fromMonth}
              toMonth={toMonth}
              asOnDate={asOnDate}
              darkMode={darkMode}
              receipts={receipts}
              payments={payments}
              openingBalance={openingBalance}
              onPrintBRS={onPrintBRS}
              onExportExcelBRS={onExportExcelBRS}
            />
          ) : (
            <div
              className={`overflow-x-auto rounded-2xl border print:border-slate-400 ${
                darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
              }`}
            >
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b font-bold print:bg-slate-200 print:text-black ${
                    darkMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <th
                    className={`p-3 text-left w-12 border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Sr #
                  </th>
                  <th
                    className={`p-3 text-left border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Particulars
                  </th>
                  <th
                    className={`p-3 text-center w-36 border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Instrument / Cheque #
                  </th>
                  <th
                    className={`p-3 text-right w-40 border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Amount (Rs.)
                  </th>
                  <th className="p-3 text-right w-44">Net Balance (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Cash Book Closing Balance */}
                <tr
                  className={`font-bold border-b print:text-black ${
                    darkMode
                      ? 'bg-slate-850/80 border-slate-700 text-white'
                      : 'bg-blue-50/70 border-slate-200 text-slate-900'
                  }`}
                >
                  <td
                    className={`p-3 text-center font-mono border-r print:border-slate-400 ${
                      darkMode
                        ? 'border-slate-700 text-slate-300'
                        : 'border-slate-300 text-slate-700 font-bold'
                    }`}
                  >
                    1
                  </td>
                  <td
                    className={`p-3 border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    <span
                      className={`uppercase tracking-wide font-black ${
                        darkMode ? 'text-blue-300' : 'text-blue-950 font-black'
                      } print:text-black`}
                    >
                      Closing Balance as per Cash Book Ledger:
                    </span>
                    <span
                      className={`block text-[11px] font-normal mt-0.5 ${
                        darkMode ? 'text-slate-400' : 'text-slate-700 font-medium'
                      }`}
                    >
                      (As on {asOnDate}, for {accountShortName} A/C: {accountNo})
                    </span>
                  </td>
                  <td
                    className={`p-3 text-center font-mono border-r print:border-slate-400 ${
                      darkMode
                        ? 'border-slate-700 text-slate-400'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    —
                  </td>
                  <td
                    className={`p-3 text-right font-mono border-r print:border-slate-400 ${
                      darkMode
                        ? 'border-slate-700 text-slate-400'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    —
                  </td>
                  <td
                    className={`p-3 text-right font-mono font-black print:text-black text-sm ${
                      darkMode ? 'text-blue-300' : 'text-blue-900 font-black'
                    }`}
                  >
                    {formatPKR(cashBookClosingBalance)}
                  </td>
                </tr>

                {/* 2. Add: Unpresented Cheques Section */}
                <tr
                  className={`font-bold border-b print:text-black ${
                    darkMode
                      ? 'bg-slate-900/90 border-slate-800 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950 font-black'
                  }`}
                >
                  <td
                    className={`p-2 text-center font-mono border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-emerald-200'
                    }`}
                  >
                    2
                  </td>
                  <td colSpan={4} className="p-2 uppercase tracking-wide font-black">
                    ADD: CHEQUES ISSUED BUT NOT YET PRESENTED / DEBITED BY BANK OF PUNJAB:
                  </td>
                </tr>
                {unpresentedCheques.length === 0 ? (
                  <tr
                    className={`border-b ${
                      darkMode
                        ? 'border-slate-800 text-slate-500'
                        : 'border-slate-200 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    <td
                      className={`p-2 text-center border-r ${
                        darkMode ? 'border-slate-800' : 'border-slate-200'
                      }`}
                    ></td>
                    <td colSpan={4} className="p-2 italic">
                      Nil. All cheques issued have cleared in the bank statement.
                    </td>
                  </tr>
                ) : (
                  unpresentedCheques.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`border-b transition-colors ${
                        darkMode
                          ? 'border-slate-800 hover:bg-slate-800/30'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className={`p-2 text-center font-mono border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-500'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        2.{idx + 1}
                      </td>
                      <td
                        className={`p-2 border-r ${
                          darkMode ? 'border-slate-800' : 'border-slate-200'
                        }`}
                      >
                        <span
                          className={`font-semibold ${
                            darkMode ? 'text-slate-200' : 'text-slate-900 font-bold'
                          } print:text-black`}
                        >
                          {c.payee}
                        </span>
                        <span
                          className={`block text-[10px] font-mono ${
                            darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                          }`}
                        >
                          Dated {c.chequeDate} • {c.headOfAccount}{' '}
                          {c.remarks ? `• ${c.remarks}` : ''}
                        </span>
                      </td>
                      <td
                        className={`p-2 text-center font-mono font-bold border-r print:text-black ${
                          darkMode
                            ? 'border-slate-800 text-amber-300'
                            : 'border-slate-200 text-amber-800 font-black'
                        }`}
                      >
                        {c.chequeNo}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-semibold border-r print:text-black ${
                          darkMode
                            ? 'border-slate-800 text-emerald-300'
                            : 'border-slate-200 text-emerald-700 font-bold'
                        }`}
                      >
                        +{formatPKR(c.netAmount, false)}
                      </td>
                      <td
                        className={`p-2 text-right font-mono ${
                          darkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      ></td>
                    </tr>
                  ))
                )}
                <tr
                  className={`font-bold border-b print:text-black ${
                    darkMode
                      ? 'bg-emerald-950/20 border-slate-700 text-emerald-300'
                      : 'bg-emerald-50 border-slate-300 text-emerald-950 font-black'
                  }`}
                >
                  <td
                    className={`p-2 text-center border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  ></td>
                  <td
                    colSpan={2}
                    className={`p-2 uppercase tracking-wider text-right border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300 font-bold'
                    }`}
                  >
                    Total Unpresented Cheques:
                  </td>
                  <td
                    className={`p-2 text-right font-mono font-black border-r print:border-slate-400 ${
                      darkMode
                        ? 'border-slate-700 text-emerald-300'
                        : 'border-slate-300 text-emerald-800 font-black'
                    }`}
                  >
                    +{formatPKR(totalUnpresentedCheques, false)}
                  </td>
                  <td
                    className={`p-2 text-right font-mono font-bold print:text-black ${
                      darkMode ? 'text-emerald-300' : 'text-emerald-800 font-black'
                    }`}
                  >
                    +{formatPKR(totalUnpresentedCheques)}
                  </td>
                </tr>

                {/* 3. Add: Direct Bank Credits (e.g. profit, grant credit not yet in cash book) */}
                {totalBankCreditsNotInCashBook > 0 && (
                  <>
                    <tr
                      className={`font-bold border-b print:text-black ${
                        darkMode
                          ? 'bg-slate-900/90 border-slate-800 text-emerald-400'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-950 font-black'
                      }`}
                    >
                      <td
                        className={`p-2 text-center font-mono border-r print:border-slate-400 ${
                          darkMode ? 'border-slate-700' : 'border-emerald-200'
                        }`}
                      >
                        3
                      </td>
                      <td colSpan={4} className="p-2 uppercase tracking-wide font-black">
                        ADD: DIRECT CREDITS BY BANK OF PUNJAB NOT YET RECORDED IN CASH BOOK:
                      </td>
                    </tr>
                    {inBankNotInCashBookCredits.map((b, idx) => (
                      <tr
                        key={b.id}
                        className={`border-b transition-colors ${
                          darkMode
                            ? 'border-slate-800 hover:bg-slate-800/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-500'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          3.{idx + 1}
                        </td>
                        <td
                          className={`p-2 border-r ${
                            darkMode ? 'border-slate-800' : 'border-slate-200'
                          }`}
                        >
                          <span
                            className={`font-semibold ${
                              darkMode ? 'text-slate-200' : 'text-slate-900 font-bold'
                            } print:text-black`}
                          >
                            {b.nature}
                          </span>
                          <span
                            className={`block text-[10px] font-mono ${
                              darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                            }`}
                          >
                            Dated {b.bankTx.transactionDate} (Direct Bank Deposit / Profit)
                          </span>
                        </td>
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-400'
                              : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          {b.bankTx.instrumentNumber || 'Direct'}
                        </td>
                        <td
                          className={`p-2 text-right font-mono font-semibold border-r print:text-black ${
                            darkMode
                              ? 'border-slate-800 text-emerald-300'
                              : 'border-slate-200 text-emerald-700 font-bold'
                          }`}
                        >
                          +{formatPKR(b.amount, false)}
                        </td>
                        <td
                          className={`p-2 text-right font-mono ${
                            darkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        ></td>
                      </tr>
                    ))}
                  </>
                )}

                {/* 4. Less: Bank Charges & Debits not yet in Cash Book */}
                {totalBankDebitsNotInCashBook > 0 && (
                  <>
                    <tr
                      className={`font-bold border-b print:text-black ${
                        darkMode
                          ? 'bg-slate-900/90 border-slate-800 text-rose-400'
                          : 'bg-rose-50 border-rose-200 text-rose-950 font-black'
                      }`}
                    >
                      <td
                        className={`p-2 text-center font-mono border-r print:border-slate-400 ${
                          darkMode ? 'border-slate-700' : 'border-rose-200'
                        }`}
                      >
                        4
                      </td>
                      <td colSpan={4} className="p-2 uppercase tracking-wide font-black">
                        LESS: BANK CHARGES / DEBITS NOT YET RECORDED IN CASH BOOK:
                      </td>
                    </tr>
                    {inBankNotInCashBookDebits.map((d, idx) => (
                      <tr
                        key={d.id}
                        className={`border-b transition-colors ${
                          darkMode
                            ? 'border-slate-800 hover:bg-slate-800/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-500'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          4.{idx + 1}
                        </td>
                        <td
                          className={`p-2 border-r ${
                            darkMode ? 'border-slate-800' : 'border-slate-200'
                          }`}
                        >
                          <span
                            className={`font-semibold ${
                              darkMode ? 'text-slate-200' : 'text-slate-900 font-bold'
                            } print:text-black`}
                          >
                            {d.nature}
                          </span>
                          <span
                            className={`block text-[10px] font-mono ${
                              darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                            }`}
                          >
                            Dated {d.bankTx.transactionDate} (Direct Bank Debit)
                          </span>
                        </td>
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-400'
                              : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          {d.bankTx.instrumentNumber || 'Direct'}
                        </td>
                        <td
                          className={`p-2 text-right font-mono font-semibold border-r print:text-black ${
                            darkMode
                              ? 'border-slate-800 text-rose-300'
                              : 'border-slate-200 text-rose-700 font-bold'
                          }`}
                        >
                          -{formatPKR(d.amount, false)}
                        </td>
                        <td
                          className={`p-2 text-right font-mono ${
                            darkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        ></td>
                      </tr>
                    ))}
                  </>
                )}

                {/* 5. Less: Uncredited Receipts (if any) */}
                {totalUncreditedReceipts > 0 && (
                  <>
                    <tr
                      className={`font-bold border-b print:text-black ${
                        darkMode
                          ? 'bg-slate-900/90 border-slate-800 text-rose-400'
                          : 'bg-rose-50 border-rose-200 text-rose-950 font-black'
                      }`}
                    >
                      <td
                        className={`p-2 text-center font-mono border-r print:border-slate-400 ${
                          darkMode ? 'border-slate-700' : 'border-rose-200'
                        }`}
                      >
                        5
                      </td>
                      <td colSpan={4} className="p-2 uppercase tracking-wide font-black">
                        LESS: RECEIPTS RECORDED IN CASH BOOK NOT YET CREDITED BY BANK:
                      </td>
                    </tr>
                    {uncreditedReceipts.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={`border-b transition-colors ${
                          darkMode
                            ? 'border-slate-800 hover:bg-slate-800/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-500'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          5.{idx + 1}
                        </td>
                        <td
                          className={`p-2 border-r ${
                            darkMode ? 'border-slate-800' : 'border-slate-200'
                          }`}
                        >
                          <span
                            className={`font-semibold ${
                              darkMode ? 'text-slate-200' : 'text-slate-900 font-bold'
                            } print:text-black`}
                          >
                            {u.receivedFrom}
                          </span>
                          <span
                            className={`block text-[10px] font-mono ${
                              darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                            }`}
                          >
                            Challan #{u.challanChequeNo} • Dated {u.date}
                          </span>
                        </td>
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-amber-300'
                              : 'border-slate-200 text-amber-800 font-black'
                          }`}
                        >
                          {u.challanChequeNo}
                        </td>
                        <td
                          className={`p-2 text-right font-mono font-semibold border-r print:text-black ${
                            darkMode
                              ? 'border-slate-800 text-rose-300'
                              : 'border-slate-200 text-rose-700 font-bold'
                          }`}
                        >
                          -{formatPKR(u.amount, false)}
                        </td>
                        <td
                          className={`p-2 text-right font-mono ${
                            darkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        ></td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Final Reconciled Row */}
                <tr
                  className={`font-black border-t-2 print:bg-slate-200 print:text-black ${
                    darkMode
                      ? 'bg-slate-950 text-white border-slate-600'
                      : 'bg-slate-100 text-slate-950 border-slate-400 font-black'
                  }`}
                >
                  <td
                    className={`p-3 text-center font-mono border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    ✓
                  </td>
                  <td
                    colSpan={3}
                    className={`p-3 uppercase tracking-wider text-left border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    ADJUSTED RECONCILED BALANCE:
                  </td>
                  <td
                    className={`p-3 text-right font-mono print:text-black text-sm font-black ${
                      darkMode ? 'text-emerald-400' : 'text-emerald-800'
                    }`}
                  >
                    {formatPKR(reconciledBankBalance)}
                  </td>
                </tr>

                {/* Bank Statement Row for Comparison */}
                <tr
                  className={`font-black border-t print:bg-slate-100 print:text-black ${
                    darkMode
                      ? 'bg-slate-900 text-amber-300 border-slate-700'
                      : 'bg-amber-50 text-amber-950 border-slate-300'
                  }`}
                >
                  <td
                    className={`p-3 text-center font-mono border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    =
                  </td>
                  <td
                    colSpan={3}
                    className={`p-3 uppercase tracking-wider text-left border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    BALANCE AS PER PHYSICAL BANK OF PUNJAB STATEMENT:
                  </td>
                  <td
                    className={`p-3 text-right font-mono print:text-black text-sm font-black ${
                      darkMode ? 'text-amber-300' : 'text-amber-900'
                    }`}
                  >
                    {formatPKR(bankStatementClosingBalance)}
                  </td>
                </tr>

                {/* Net Discrepancy Row */}
                <tr
                  className={`font-black border-t-2 ${
                    darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <td
                    className={`p-3 text-center border-r print:border-slate-400 ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  ></td>
                  <td
                    colSpan={3}
                    className={`p-3 uppercase tracking-wider text-left border-r print:border-slate-400 ${
                      darkMode
                        ? 'text-slate-400 border-slate-700'
                        : 'text-slate-700 border-slate-300 font-bold'
                    }`}
                  >
                    NET UNEXPLAINED VARIANCE / DISCREPANCY:
                  </td>
                  <td
                    className={`p-3 text-right font-mono text-sm font-black ${
                      isFullyExplained
                        ? darkMode
                          ? 'text-emerald-400'
                          : 'text-emerald-800'
                        : darkMode
                        ? 'text-rose-400'
                        : 'text-rose-800'
                    }`}
                  >
                    {isFullyExplained ? 'Rs. 0.00 (✓ Reconciled)' : formatPKR(variance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: MATCHED CHEQUES TABLE                               */}
      {activeSubTab === 'MATCHED' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4
              className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                darkMode ? 'text-emerald-400' : 'text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Exact Instrument Number Matches ({matchedTransactions.length} Cleared Transactions)
              </span>
            </h4>
            <span
              className={`text-[11px] font-mono ${
                darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
              }`}
            >
              Primary Match: Bank Instrument # == Cash Book Cheque #
            </span>
          </div>

          <div
            className={`overflow-x-auto rounded-2xl border print:border-slate-400 ${
              darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
            }`}
          >
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b font-bold ${
                    darkMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <th
                    className={`p-2.5 text-center w-12 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    #
                  </th>
                  <th
                    className={`p-2.5 text-center w-32 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Instrument / Cheque #
                  </th>
                  <th
                    className={`p-2.5 text-center w-28 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Bank Post Date
                  </th>
                  <th
                    className={`p-2.5 text-left min-w-[200px] border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Cash Book Payee &amp; Voucher
                  </th>
                  <th
                    className={`p-2.5 text-left border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Head of Account
                  </th>
                  <th
                    className={`p-2.5 text-right w-32 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Cash Book Net (Rs.)
                  </th>
                  <th
                    className={`p-2.5 text-right w-32 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Bank Dr/Cr (Rs.)
                  </th>
                  <th className="p-2.5 text-center w-36">Match Status</th>
                </tr>
              </thead>
              <tbody>
                {matchedTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className={`p-8 text-center ${
                        darkMode ? 'text-slate-500' : 'text-slate-600'
                      }`}
                    >
                      No matched transactions found yet. Upload or load statement to trigger matching.
                    </td>
                  </tr>
                ) : (
                  matchedTransactions.map((m, idx) => (
                    <tr
                      key={m.id}
                      className={`border-b transition-colors ${
                        darkMode
                          ? 'border-slate-800 hover:bg-slate-800/30'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className={`p-2 text-center font-mono border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-500'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </td>
                      <td
                        className={`p-2 text-center font-mono font-bold border-r ${
                          darkMode
                            ? 'border-slate-800 text-amber-300'
                            : 'border-slate-200 text-amber-800 font-black'
                        }`}
                      >
                        {m.cashBookInstrumentNo}
                      </td>
                      <td
                        className={`p-2 text-center font-mono border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-300'
                            : 'border-slate-200 text-slate-700 font-medium'
                        }`}
                      >
                        {m.bankTx.transactionDate}
                      </td>
                      <td
                        className={`p-2 border-r ${
                          darkMode ? 'border-slate-800' : 'border-slate-200'
                        }`}
                      >
                        <span
                          className={`font-semibold ${
                            darkMode ? 'text-slate-200' : 'text-slate-900 font-bold'
                          }`}
                        >
                          {m.cashBookPayeeOrSource}
                        </span>
                        <span
                          className={`block text-[10px] font-mono ${
                            darkMode ? 'text-blue-400' : 'text-blue-700 font-medium'
                          }`}
                        >
                          Voucher #{m.cashBookVoucherNo || 'N/A'} • Cash Book Date{' '}
                          {m.cashBookDate}
                        </span>
                      </td>
                      <td
                        className={`p-2 border-r text-[11px] ${
                          darkMode
                            ? 'border-slate-800 text-slate-300'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {m.cashBookHead}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-bold border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-200'
                            : 'border-slate-200 text-slate-900'
                        }`}
                      >
                        {formatPKR(m.cashBookAmount, false)}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-bold border-r ${
                          darkMode
                            ? 'border-slate-800 text-emerald-400'
                            : 'border-slate-200 text-emerald-700'
                        }`}
                      >
                        {formatPKR(m.bankAmount, false)}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                            darkMode
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          <Check className="w-3 h-3" /> Exact Match
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AMOUNT MISMATCHES (FLAGGED FOR REVIEW)             */}
      {activeSubTab === 'MISMATCHES' && (
        <div className="space-y-3">
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-3 ${
              darkMode
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}
            />
            <div>
              <span className="font-bold block">
                Instrument Number Matched, but Amount Differs:
              </span>
              <span>
                These transactions have the same cheque number in both Cash Book and Bank Statement,
                but the debited/credited amount differs. Review each row below.
              </span>
            </div>
          </div>

          <div
            className={`overflow-x-auto rounded-2xl border print:border-slate-400 ${
              darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
            }`}
          >
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b font-bold ${
                    darkMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <th
                    className={`p-2.5 text-center w-12 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    #
                  </th>
                  <th
                    className={`p-2.5 text-center w-32 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Cheque #
                  </th>
                  <th
                    className={`p-2.5 text-left border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Cash Book Payee
                  </th>
                  <th
                    className={`p-2.5 text-right w-36 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Cash Book Net (Rs.)
                  </th>
                  <th
                    className={`p-2.5 text-right w-36 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Bank Statement Dr. (Rs.)
                  </th>
                  <th
                    className={`p-2.5 text-right w-32 border-r ${
                      darkMode
                        ? 'border-slate-700 text-amber-400'
                        : 'border-slate-300 text-amber-900 font-bold'
                    }`}
                  >
                    Difference (Rs.)
                  </th>
                  <th
                    className={`p-2.5 text-left min-w-[200px] border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Audit Finding
                  </th>
                  <th className="p-2.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {amountMismatches.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={`border-b transition-colors ${
                      darkMode
                        ? 'border-slate-800 hover:bg-slate-800/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <td
                      className={`p-2 text-center font-mono border-r ${
                        darkMode
                          ? 'border-slate-800 text-slate-500'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </td>
                    <td
                      className={`p-2 text-center font-mono font-bold border-r ${
                        darkMode
                          ? 'border-slate-800 text-amber-300'
                          : 'border-slate-200 text-amber-800 font-black'
                      }`}
                    >
                      {m.cashBookInstrumentNo}
                    </td>
                    <td
                      className={`p-2 border-r font-semibold ${
                        darkMode
                          ? 'border-slate-800 text-slate-200'
                          : 'border-slate-200 text-slate-900 font-bold'
                      }`}
                    >
                      {m.cashBookPayeeOrSource}
                    </td>
                    <td
                      className={`p-2 text-right font-mono font-bold border-r ${
                        darkMode
                          ? 'border-slate-800 text-slate-200'
                          : 'border-slate-200 text-slate-900'
                      }`}
                    >
                      {formatPKR(m.cashBookAmount, false)}
                    </td>
                    <td
                      className={`p-2 text-right font-mono font-bold border-r ${
                        darkMode
                          ? 'border-slate-800 text-rose-300'
                          : 'border-slate-200 text-rose-700'
                      }`}
                    >
                      {formatPKR(m.bankAmount, false)}
                    </td>
                    <td
                      className={`p-2 text-right font-mono font-black border-r ${
                        darkMode
                          ? 'border-slate-800 text-amber-400'
                          : 'border-slate-200 text-amber-800'
                      }`}
                    >
                      {formatPKR(m.amountDifference, false)}
                    </td>
                    <td
                      className={`p-2 border-r text-[11px] ${
                        darkMode
                          ? 'border-slate-800 text-slate-300'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {m.statusNote}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onToggleManualOverride(m.bankTx.id)}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer border ${
                          darkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-blue-900 border-slate-300'
                        }`}
                      >
                        {m.manualOverride ? 'Revert' : 'Force Tick'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: IN BANK, NOT IN CASH BOOK                           */}
      {activeSubTab === 'IN_BANK_NOT_IN_CASHBOOK' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4
                className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                  darkMode ? 'text-purple-400' : 'text-purple-900 font-black'
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>
                  Items in Bank Statement with No Cash Book Match (
                  {inBankNotInCashBookDebits.length + inBankNotInCashBookCredits.length})
                </span>
              </h4>
              <p
                className={`text-[11px] ${
                  darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                }`}
              >
                Direct bank transactions (e.g. SMS/statement charges, FED tax, PLS profit).
                Accountant can record vouchers for these.
              </p>
            </div>

            <div className="text-xs font-mono">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Net Bank-Only: </span>
              <strong
                className={darkMode ? 'text-purple-300 font-bold' : 'text-purple-900 font-black'}
              >
                {formatPKR(totalBankCreditsNotInCashBook - totalBankDebitsNotInCashBook)}
              </strong>
            </div>
          </div>

          <div
            className={`overflow-x-auto rounded-2xl border print:border-slate-400 ${
              darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
            }`}
          >
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b font-bold ${
                    darkMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <th
                    className={`p-2.5 text-center w-12 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    #
                  </th>
                  <th
                    className={`p-2.5 text-center w-28 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Bank Date
                  </th>
                  <th
                    className={`p-2.5 text-left min-w-[200px] border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Transaction Nature / Particulars
                  </th>
                  <th
                    className={`p-2.5 text-center w-24 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Type
                  </th>
                  <th
                    className={`p-2.5 text-right w-36 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Amount (Rs.)
                  </th>
                  <th
                    className={`p-2.5 text-left border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Recommended Action
                  </th>
                  <th className="p-2.5 text-center w-36">Action</th>
                </tr>
              </thead>
              <tbody>
                {inBankNotInCashBookDebits.length === 0 &&
                inBankNotInCashBookCredits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className={`p-8 text-center ${
                        darkMode ? 'text-slate-500' : 'text-slate-600'
                      }`}
                    >
                      No unrecorded bank items found. Every transaction has been matched in cash
                      book.
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Debits */}
                    {inBankNotInCashBookDebits.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-b transition-colors ${
                          darkMode
                            ? 'border-slate-800 hover:bg-slate-800/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-500'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          D-{idx + 1}
                        </td>
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-300'
                              : 'border-slate-200 text-slate-700 font-medium'
                          }`}
                        >
                          {item.bankTx.transactionDate}
                        </td>
                        <td
                          className={`p-2 border-r font-semibold ${
                            darkMode
                              ? 'border-slate-800 text-slate-200'
                              : 'border-slate-200 text-slate-900 font-bold'
                          }`}
                        >
                          {item.nature}
                        </td>
                        <td
                          className={`p-2 text-center border-r ${
                            darkMode ? 'border-slate-800' : 'border-slate-200'
                          }`}
                        >
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              darkMode
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            DEBIT
                          </span>
                        </td>
                        <td
                          className={`p-2 text-right font-mono font-bold border-r ${
                            darkMode
                              ? 'border-slate-800 text-rose-300'
                              : 'border-slate-200 text-rose-700'
                          }`}
                        >
                          {formatPKR(item.amount, false)}
                        </td>
                        <td
                          className={`p-2 border-r text-[11px] ${
                            darkMode
                              ? 'border-slate-800 text-slate-300'
                              : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          {item.suggestedAction === 'BANK_CHARGES'
                            ? 'Book Bank Charges Voucher (A03901/A03902)'
                            : item.suggestedAction === 'TAX_DEDUCTION'
                            ? 'Book Withholding / FED Tax Debit'
                            : 'Enter Payment Voucher in Cash Book'}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleCopyVoucherDetails(item)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 w-full cursor-pointer border ${
                              darkMode
                                ? 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-blue-900 border-slate-300'
                            }`}
                          >
                            {copiedItemId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Draft Voucher</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Credits */}
                    {inBankNotInCashBookCredits.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-b transition-colors ${
                          darkMode
                            ? 'border-slate-800 hover:bg-slate-800/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-500'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          C-{idx + 1}
                        </td>
                        <td
                          className={`p-2 text-center font-mono border-r ${
                            darkMode
                              ? 'border-slate-800 text-slate-300'
                              : 'border-slate-200 text-slate-700 font-medium'
                          }`}
                        >
                          {item.bankTx.transactionDate}
                        </td>
                        <td
                          className={`p-2 border-r font-semibold ${
                            darkMode
                              ? 'border-slate-800 text-slate-200'
                              : 'border-slate-200 text-slate-900 font-bold'
                          }`}
                        >
                          {item.nature}
                        </td>
                        <td
                          className={`p-2 text-center border-r ${
                            darkMode ? 'border-slate-800' : 'border-slate-200'
                          }`}
                        >
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              darkMode
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            CREDIT
                          </span>
                        </td>
                        <td
                          className={`p-2 text-right font-mono font-bold border-r ${
                            darkMode
                              ? 'border-slate-800 text-emerald-300'
                              : 'border-slate-200 text-emerald-700'
                          }`}
                        >
                          +{formatPKR(item.amount, false)}
                        </td>
                        <td
                          className={`p-2 border-r text-[11px] ${
                            darkMode
                              ? 'border-slate-800 text-slate-300'
                              : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          {item.suggestedAction === 'PROFIT'
                            ? 'Book PLS Profit / Return in Receipts Register'
                            : 'Enter Receipt Voucher in Cash Book'}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleCopyVoucherDetails(item)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 w-full cursor-pointer border ${
                              darkMode
                                ? 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-blue-900 border-slate-300'
                            }`}
                          >
                            {copiedItemId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Draft Voucher</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: UNPRESENTED CHEQUES SCHEDULE                         */}
      {activeSubTab === 'UNPRESENTED' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4
                className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                  darkMode ? 'text-amber-400' : 'text-amber-900 font-black'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>
                  Unpresented Cheques Schedule ({unpresentedCheques.length} Outstanding Cheques)
                </span>
              </h4>
              <p
                className={`text-[11px] font-mono ${
                  darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                }`}
              >
                Cheques issued on or before period-end but not yet presented/debited by Bank of
                Punjab
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-mono text-right">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'}>
                  Total Unpresented:{' '}
                </span>
                <strong
                  className={
                    darkMode ? 'text-amber-300 font-bold' : 'text-amber-900 font-black'
                  }
                >
                  {formatPKR(totalUnpresentedCheques)}
                </strong>
              </div>

              <button
                onClick={onAddUnpresentedCheque}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cheque</span>
              </button>
            </div>
          </div>

          <div
            className={`overflow-x-auto rounded-2xl border print:border-slate-400 ${
              darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
            }`}
          >
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b font-bold ${
                    darkMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <th
                    className={`p-2.5 text-center w-12 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    #
                  </th>
                  <th
                    className={`p-2.5 text-center w-32 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Cheque No
                  </th>
                  <th
                    className={`p-2.5 text-center w-28 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Date
                  </th>
                  <th
                    className={`p-2.5 text-left border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Payee Name
                  </th>
                  <th
                    className={`p-2.5 text-left border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Head of Account
                  </th>
                  <th
                    className={`p-2.5 text-right w-36 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Net Amount (Rs.)
                  </th>
                  <th
                    className={`p-2.5 text-left border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Remarks
                  </th>
                  <th className="p-2.5 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {unpresentedCheques.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className={`p-8 text-center ${
                        darkMode ? 'text-slate-500' : 'text-slate-600'
                      }`}
                    >
                      No unpresented cheques recorded.
                    </td>
                  </tr>
                ) : (
                  unpresentedCheques.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`border-b transition-colors ${
                        darkMode
                          ? 'border-slate-800 hover:bg-slate-800/30'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className={`p-2 text-center font-mono border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-500'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </td>
                      <td
                        className={`p-2 text-center font-mono font-bold border-r ${
                          darkMode
                            ? 'border-slate-800 text-amber-300'
                            : 'border-slate-200 text-amber-800 font-black'
                        }`}
                      >
                        {c.chequeNo}
                      </td>
                      <td
                        className={`p-2 text-center font-mono border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-300'
                            : 'border-slate-200 text-slate-700 font-medium'
                        }`}
                      >
                        {c.chequeDate}
                      </td>
                      <td
                        className={`p-2 border-r font-semibold ${
                          darkMode
                            ? 'border-slate-800 text-slate-200'
                            : 'border-slate-200 text-slate-900 font-bold'
                        }`}
                      >
                        {c.payee}
                      </td>
                      <td
                        className={`p-2 border-r text-[11px] ${
                          darkMode
                            ? 'border-slate-800 text-slate-300'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {c.headOfAccount}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-bold border-r ${
                          darkMode
                            ? 'border-slate-800 text-amber-300'
                            : 'border-slate-200 text-amber-800'
                        }`}
                      >
                        {formatPKR(c.netAmount, false)}
                      </td>
                      <td
                        className={`p-2 border-r text-[11px] ${
                          darkMode
                            ? 'border-slate-800 text-slate-400'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {c.remarks || '—'}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => onRemoveUnpresentedCheque(c.id)}
                          className={`p-1 cursor-pointer transition-colors ${
                            darkMode
                              ? 'text-slate-500 hover:text-rose-400'
                              : 'text-slate-400 hover:text-rose-600'
                          }`}
                          title="Delete cheque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: RAW STATEMENT ROWS                                  */}
      {activeSubTab === 'STATEMENT_ROWS' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4
              className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-900 font-black'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>
                Full Bank of Punjab Statement Ledger ({statement?.transactions.length || 0} rows)
              </span>
            </h4>
            <span
              className={`text-[11px] font-mono ${
                darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
              }`}
            >
              Account: {accountNo} • Branch: {branchName}
            </span>
          </div>

          <div
            className={`overflow-x-auto rounded-2xl border max-h-[500px] print:border-slate-400 ${
              darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-300 bg-white shadow-xs'
            }`}
          >
            <table className="w-full text-xs border-collapse">
              <thead
                className={`sticky top-0 font-bold shadow-xs border-b ${
                  darkMode
                    ? 'bg-slate-800 text-slate-200 border-slate-700'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                <tr>
                  <th
                    className={`p-2.5 text-center w-12 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    #
                  </th>
                  <th
                    className={`p-2.5 text-center w-28 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Date
                  </th>
                  <th
                    className={`p-2.5 text-center w-28 border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Value Date
                  </th>
                  <th
                    className={`p-2.5 text-left border-r ${
                      darkMode ? 'border-slate-700' : 'border-slate-300'
                    }`}
                  >
                    Nature of Transaction
                  </th>
                  <th
                    className={`p-2.5 text-center w-36 border-r ${
                      darkMode
                        ? 'border-slate-700 text-amber-300'
                        : 'border-slate-300 text-amber-900 font-bold'
                    }`}
                  >
                    Instrument Number
                  </th>
                  <th
                    className={`p-2.5 text-right w-32 border-r ${
                      darkMode
                        ? 'border-slate-700 text-rose-400'
                        : 'border-slate-300 text-rose-700 font-bold'
                    }`}
                  >
                    Dr. Amount (Rs.)
                  </th>
                  <th
                    className={`p-2.5 text-right w-32 border-r ${
                      darkMode
                        ? 'border-slate-700 text-emerald-400'
                        : 'border-slate-300 text-emerald-700 font-bold'
                    }`}
                  >
                    Cr. Amount (Rs.)
                  </th>
                  <th className="p-2.5 text-right w-36">Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                {!statement || statement.transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className={`p-8 text-center ${
                        darkMode ? 'text-slate-500' : 'text-slate-600'
                      }`}
                    >
                      No statement transactions loaded. Click "Upload BOP Statement" or "Load Sample
                      BOP Statement".
                    </td>
                  </tr>
                ) : (
                  statement.transactions.map((tx, idx) => (
                    <tr
                      key={tx.id}
                      className={`border-b transition-colors ${
                        darkMode
                          ? 'border-slate-800 hover:bg-slate-800/30'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className={`p-2 text-center font-mono border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-500'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </td>
                      <td
                        className={`p-2 text-center font-mono border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-200'
                            : 'border-slate-200 text-slate-800 font-medium'
                        }`}
                      >
                        {tx.transactionDate}
                      </td>
                      <td
                        className={`p-2 text-center font-mono border-r ${
                          darkMode
                            ? 'border-slate-800 text-slate-400'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {tx.valueDate || '—'}
                      </td>
                      <td
                        className={`p-2 border-r font-medium ${
                          darkMode
                            ? 'border-slate-800 text-slate-200'
                            : 'border-slate-200 text-slate-900'
                        }`}
                      >
                        {tx.natureOfTransaction}
                      </td>
                      <td
                        className={`p-2 text-center font-mono font-bold border-r ${
                          darkMode
                            ? 'border-slate-800 text-amber-300'
                            : 'border-slate-200 text-amber-800 font-black'
                        }`}
                      >
                        {tx.instrumentNumber || '—'}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-semibold border-r ${
                          darkMode
                            ? 'border-slate-800 text-rose-300'
                            : 'border-slate-200 text-rose-700 font-bold'
                        }`}
                      >
                        {tx.drAmount > 0 ? formatPKR(tx.drAmount, false) : '—'}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-semibold border-r ${
                          darkMode
                            ? 'border-slate-800 text-emerald-300'
                            : 'border-slate-200 text-emerald-700 font-bold'
                        }`}
                      >
                        {tx.crAmount > 0 ? formatPKR(tx.crAmount, false) : '—'}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-bold ${
                          darkMode ? 'text-slate-200' : 'text-slate-950 font-black'
                        }`}
                      >
                        {formatPKR(tx.remainingBalance, false)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
