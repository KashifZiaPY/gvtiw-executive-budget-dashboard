import React, { useEffect } from 'react';
import { MasterVoucher } from '../data/cashBookData';
import { formatPKR } from '../lib/formatters';
import {
  CheckCircle2,
  Printer,
  PlusCircle,
  X,
  FileCheck,
  Building2,
  Landmark,
  CreditCard,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface CorporateVoucherSuccessModalProps {
  isOpen: boolean;
  voucher: MasterVoucher | null;
  isAmend?: boolean;
  isBankCharge?: boolean;
  cloudSyncSuccess?: boolean;
  cloudMessage?: string;
  onClose: () => void;
  onPrintPAF: (voucher: MasterVoucher) => void;
  onNewEntry?: () => void;
  customGvtiwLogo?: string | null;
  darkMode?: boolean;
}

// Convert numbers into formal words for official financial instruments
function amountInWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let groupStr = '';
    if (n >= 100) {
      groupStr += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      groupStr += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      groupStr += units[n] + ' ';
    }
    return groupStr;
  }

  let num = Math.floor(Math.abs(amount));
  let words = '';

  if (num >= 10000000) {
    words += convertGroup(Math.floor(num / 10000000)) + 'Crore ';
    num %= 10000000;
  }
  if (num >= 100000) {
    words += convertGroup(Math.floor(num / 100000)) + 'Lakh ';
    num %= 100000;
  }
  if (num >= 1000) {
    words += convertGroup(Math.floor(num / 1000)) + 'Thousand ';
    num %= 1000;
  }
  if (num > 0) {
    words += convertGroup(num);
  }

  return 'Rupees ' + words.trim() + ' Only';
}

export const CorporateVoucherSuccessModal: React.FC<CorporateVoucherSuccessModalProps> = ({
  isOpen,
  voucher,
  isAmend = false,
  isBankCharge = false,
  cloudSyncSuccess = true,
  cloudMessage,
  onClose,
  onPrintPAF,
  onNewEntry,
  customGvtiwLogo,
  darkMode = false,
}) => {
  // ESC key listener to cancel/clear dialogue
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !voucher) return null;

  const grossBill = voucher.billAmountGross || voucher.chequeAmountNet || 0;
  const netCheque = voucher.chequeAmountNet || 0;
  const gstAmount = voucher.gstAmount || 0;
  const praAmount = voucher.praAmount || 0;
  const incomeTax = voucher.incomeTaxAmount || 0;
  const hasTaxDeductions = gstAmount > 0 || praAmount > 0 || incomeTax > 0;

  return (
    <div
      id="corporate-voucher-success-dialog"
      className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200 transition-all ${
          darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* ========================================================= */}
        {/* TOP INSTITUTIONAL AUDIT HEADER BAR                        */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 sm:px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Institution / Seal Emblem */}
            <div className="w-11 h-11 rounded-2xl bg-white/10 p-1 border border-white/20 shadow-inner flex items-center justify-center shrink-0">
              <img
                src={customGvtiwLogo || '/gvtiw-logo.jpg'}
                alt="GVTIW Logo"
                className="w-full h-full object-cover rounded-xl bg-white"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {isAmend
                    ? 'Audit Certified • Amendment'
                    : isBankCharge
                    ? 'Bank Debit Posted'
                    : 'Certified & Posted In CashBook'}
                </span>
                <span className="text-[10px] font-mono text-slate-300">Cost Center: 33028</span>
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white mt-1">
                Government Vocational Training Institute for Women
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                Samanabad, Faisalabad • Official Financial Transaction Confirmation
              </p>
            </div>
          </div>

          {/* Cancel / Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Cancel & Close Dialogue (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* MODAL BODY                                                */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 space-y-5 text-xs font-sans overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Main Success Announcement Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
              isAmend
                ? darkMode
                  ? 'bg-blue-950/40 border-blue-800/80 text-blue-200'
                  : 'bg-blue-50/90 border-blue-200 text-blue-950'
                : isBankCharge
                ? darkMode
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                  : 'bg-amber-50/90 border-amber-200 text-amber-950'
                : darkMode
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
                  isAmend
                    ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30'
                    : isBankCharge
                    ? 'bg-amber-600 text-white border-amber-400 shadow-amber-500/30'
                    : 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/30'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  {isAmend
                    ? `Voucher #${voucher.srNo} Successfully Amended & Re-Computed`
                    : isBankCharge
                    ? `Bank Charge Transaction Recorded in CashBook`
                    : `Voucher #${voucher.srNo} Successfully Generated & Dispatched`}
                </h3>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {cloudSyncSuccess
                    ? cloudMessage || 'Transaction recorded in local ledger & synchronized to Google Sheets CashBook.'
                    : 'Entry committed to local ledger. Background synchronization queued.'}
                </p>
              </div>
            </div>

            {/* Quick Identifier Pills */}
            <div className="flex sm:flex-col items-end gap-1 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-current/10">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-70">
                Official Identifier
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-black/10 dark:bg-white/10 font-mono font-black text-sm tracking-tight border border-current/20">
                {voucher.voucherNo}
              </span>
            </div>
          </div>

          {/* Core Transaction Highlight Grid */}
          <div
            className={`p-4 rounded-2xl border divide-y ${
              darkMode ? 'bg-slate-900/60 border-slate-800 divide-slate-800/80' : 'bg-slate-50 border-slate-200 divide-slate-200/80'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3">
              {/* Sr Number & Voucher */}
              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Ledger Serial & Voucher #
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-black text-xs">
                    Sr. #{voucher.srNo}
                  </span>
                  <span className="font-mono font-bold text-xs">{voucher.voucherNo}</span>
                </div>
              </div>

              {/* Bank Account */}
              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Bank Account / Cashbook
                </span>
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Landmark className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{voucher.bankAccount}</span>
                </div>
              </div>
            </div>

            {/* Payee & Head */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Beneficiary / Payee
                </span>
                <span className="font-bold text-xs block">{voucher.payeeName}</span>
                {voucher.ntnCnic && voucher.ntnCnic !== 'N/A' && (
                  <span className="text-[10px] font-mono text-slate-500 block">NTN/CNIC: {voucher.ntnCnic}</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Assigned Account Head
                </span>
                <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-300 block truncate">
                  {voucher.accountHead}
                </span>
              </div>
            </div>

            {/* Cheque & Bill Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Cheque Number
                </span>
                <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                  {voucher.chequeNoNet || 'Direct Debit'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Cheque Date
                </span>
                <span className="font-mono text-xs">{voucher.chequeDate || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Bill / Invoice #
                </span>
                <span className="font-mono text-xs">{voucher.billNo || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Bill Date
                </span>
                <span className="font-mono text-xs">{voucher.billDate || '—'}</span>
              </div>
            </div>

            {/* Narration */}
            {voucher.description && (
              <div className="pt-3">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Particulars / Narration
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                  "{voucher.description}"
                </p>
              </div>
            )}
          </div>

          {/* Financial Amounts Breakdown Box */}
          <div
            className={`p-4 rounded-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            } shadow-xs`}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Gross & Taxes Summary */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Gross Invoiced Bill:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    Rs. {formatPKR(grossBill)}
                  </span>
                </div>

                {hasTaxDeductions && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    {gstAmount > 0 && (
                      <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                        <span>GST Sales Tax:</span>
                        <span className="font-mono">- Rs. {formatPKR(gstAmount)}</span>
                      </div>
                    )}
                    {praAmount > 0 && (
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span>PRA Punjab Tax:</span>
                        <span className="font-mono">- Rs. {formatPKR(praAmount)}</span>
                      </div>
                    )}
                    {incomeTax > 0 && (
                      <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                        <span>FBR Income Tax:</span>
                        <span className="font-mono">- Rs. {formatPKR(incomeTax)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prominent Net Cheque Amount Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white sm:min-w-[240px] text-right shadow-md shadow-emerald-600/20 border border-emerald-400/30">
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-100 font-extrabold block">
                  Net Cheque Disbursed
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black tracking-tight block mt-0.5">
                  Rs. {formatPKR(netCheque)}
                </span>
                <span className="text-[10px] text-emerald-100/90 italic block mt-1 line-clamp-1">
                  {amountInWords(netCheque)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono text-center flex items-center justify-center gap-1">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
              ESC
            </kbd>
            <span>key at any time to clear this dialogue.</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* EXECUTIVE ACTION TOOLBAR                                  */}
        {/* ========================================================= */}
        <div
          className={`px-5 sm:px-6 py-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
            darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Left Action: Print PAF (Primary Corporate Function) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrintPAF(voucher)}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/25 border border-indigo-400/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap"
              title="Generate and Print Institutional Payment Approval Form (PAF)"
            >
              <Printer className="w-4 h-4 text-white shrink-0" />
              <span>Print PAF (Payment Approval Form)</span>
            </button>
          </div>

          {/* Right Actions: Enter Another Voucher / Cancel & Close */}
          <div className="flex items-center gap-2 justify-end">
            {onNewEntry && (
              <button
                type="button"
                onClick={onNewEntry}
                className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-sm border border-emerald-400/30 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4 text-white shrink-0" />
                <span>+ Enter Another Voucher</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs border cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <X className="w-3.5 h-3.5 shrink-0" />
              <span>Cancel / Clear Dialogue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
