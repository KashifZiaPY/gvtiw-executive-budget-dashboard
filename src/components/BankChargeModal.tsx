import React, { useState, useEffect, useMemo } from 'react';
import { Landmark, X, BookOpen, Check, PlusCircle, Calendar, FileText, AlertCircle } from 'lucide-react';
import { MasterVoucher, INSTITUTIONAL_BANK_ACCOUNTS, BankAccountKey } from '../data/cashBookData';
import { MASTER_ACCOUNT_HEADS } from '../data/voucherMasterLists';
import { formatPKR } from '../lib/formatters';

// -----------------------------------------------------------------------------
// 1. LOGICAL OFFICER IDENTIFIERS & RESOLVERS
// -----------------------------------------------------------------------------

/**
 * Robustly inspects any voucher object to determine if it is a Bank Charge entry.
 * Checks Payee ('Bank Charges'), Voucher # (starts with 'BC-'), Bill No ('BC'),
 * Cheque No ('Direct Debit'), or Account Head ('A03101-BANK CHARGES').
 */
export const isBankChargeVoucher = (v: MasterVoucher | null | undefined): boolean => {
  if (!v) return false;
  const payee = (v.payeeName || '').trim().toLowerCase();
  const billNo = (v.billNo || '').trim().toUpperCase();
  const chequeNo = (v.chequeNoNet || '').trim().toLowerCase();
  const voucherNo = (v.voucherNo || '').trim().toUpperCase();
  const accountHead = (v.accountHead || '').trim().toUpperCase();
  const desc = (v.description || '').trim().toLowerCase();

  if (payee === 'bank charges' || payee.startsWith('bank charge') || payee.includes('bank charge')) {
    return true;
  }
  if (voucherNo.startsWith('BC-') || voucherNo.includes('BC-') || voucherNo.startsWith('BC/')) {
    return true;
  }
  if (billNo === 'BC') {
    return true;
  }
  if (chequeNo === 'direct debit' || chequeNo === 'online' || chequeNo === 'bank debit') {
    if (
      desc.includes('bank') ||
      desc.includes('sms') ||
      desc.includes('fed') ||
      accountHead.includes('BANK CHARGES') ||
      payee.includes('bank')
    ) {
      return true;
    }
  }
  if (accountHead === 'A03101-BANK CHARGES') {
    return true;
  }
  return false;
};

/**
 * Resolves a BankAccountKey from a full bank name, account number, or code string.
 */
export const resolveBankKey = (bankAccountStr: string | null | undefined): BankAccountKey => {
  const str = (bankAccountStr || '').toLowerCase();
  if (str.includes('pupil') || str.includes('pf') || str.includes('6580027832200022')) return 'PF';
  if (str.includes('short course') || str.includes('sc') || str.includes('6580006795600047')) return 'SC';
  if (str.includes('security') || str.includes('sec') || str.includes('6580006795600058')) return 'SEC';
  if (str.includes('fee collection') || str.includes('fc') || str.includes('6580006795600036')) return 'FC';
  if (str.includes('aaa') || str.includes('district') || str.includes('aa')) return 'AA';
  return 'NS';
};

// -----------------------------------------------------------------------------
// 2. MODAL PROPS INTERFACE
// -----------------------------------------------------------------------------
export interface BankChargeSavePayload {
  accountKey: BankAccountKey;
  bankFullName: string;
  amount: number;
  date: string;
  memo: string;
  accountHead: string;
  isAmend: boolean;
  srNo?: number;
  voucherNo?: string;
}

interface BankChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherToAmend?: MasterVoucher | null;
  maxExistingSrNo: number;
  onSaveBankCharge: (payload: BankChargeSavePayload) => Promise<void> | void;
  darkMode?: boolean;
}

export const BankChargeModal: React.FC<BankChargeModalProps> = ({
  isOpen,
  onClose,
  voucherToAmend,
  maxExistingSrNo,
  onSaveBankCharge,
  darkMode = false,
}) => {
  const isAmend = Boolean(voucherToAmend);

  // Form states
  const [accountKey, setAccountKey] = useState<BankAccountKey>('NS');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState<string>('Bank Charges / SMS / FED Charges');
  const [selectedHead, setSelectedHead] = useState<string>('A03101-BANK CHARGES');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Exact Google Sheets Script Logic for default heads:
  // If NS (Non-Salary) or AA (AAA) => "A03101-BANK CHARGES"
  // If PF (Pupil Fund) => "A00000PF-PUPIL FUND"
  // If SC (Short Course) => "A00000SC-SHORT COURSE"
  // If SEC (Securities) => "A00000SS-STUDENT SEC."
  // If FC (Fee Collection) => "A00000TFC-TEVTA FEE COL."
  const mappedAccountHead = useMemo(() => {
    if (accountKey === 'PF') return 'A00000PF-PUPIL FUND';
    if (accountKey === 'SC') return 'A00000SC-SHORT COURSE';
    if (accountKey === 'SEC') return 'A00000SS-STUDENT SEC.';
    if (accountKey === 'FC') return 'A00000TFC-TEVTA FEE COL.';
    return 'A03101-BANK CHARGES';
  }, [accountKey]);

  // Synchronize state when modal opens or target voucher changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setIsSubmitting(false);
      return;
    }

    if (voucherToAmend) {
      // AMENDMENT MODE: Pre-fill from existing Bank Charge voucher
      const resolved = resolveBankKey(voucherToAmend.bankAccount);
      setAccountKey(resolved);
      const amt =
        voucherToAmend.billAmtExclTax ||
        voucherToAmend.billAmountGross ||
        voucherToAmend.chequeAmountNet ||
        0;
      setAmount(amt);
      setDate(
        voucherToAmend.billDate ||
          voucherToAmend.chequeDate ||
          new Date().toISOString().split('T')[0]
      );
      setMemo(voucherToAmend.description || 'Bank Charges / SMS / FED Charges');
      setSelectedHead(voucherToAmend.accountHead || mappedAccountHead);
    } else {
      // NEW RECORD MODE: Clean default values
      setAccountKey('NS');
      setAmount(0);
      setDate(new Date().toISOString().split('T')[0]);
      setMemo('Bank Charges / SMS / FED Charges');
      setSelectedHead('A03101-BANK CHARGES');
    }
    setErrorMsg(null);
  }, [isOpen, voucherToAmend, mappedAccountHead]);

  // Handle bank account switch in new mode or when allowed
  const handleAccountChange = (newAcc: BankAccountKey) => {
    setAccountKey(newAcc);
    if (newAcc === 'PF') setSelectedHead('A00000PF-PUPIL FUND');
    else if (newAcc === 'SC') setSelectedHead('A00000SC-SHORT COURSE');
    else if (newAcc === 'SEC') setSelectedHead('A00000SS-STUDENT SEC.');
    else if (newAcc === 'FC') setSelectedHead('A00000TFC-TEVTA FEE COL.');
    else setSelectedHead('A03101-BANK CHARGES');
  };

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const currentYear = new Date(date).getFullYear();
  const nextSr = maxExistingSrNo + 1;
  const displayVoucherNo = isAmend
    ? voucherToAmend?.voucherNo || `BC-${currentYear}/${voucherToAmend?.srNo}`
    : `BC-${currentYear}/${nextSr}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Please enter a valid bank debit amount greater than Rs. 0.');
      return;
    }

    const bankFullName =
      INSTITUTIONAL_BANK_ACCOUNTS[accountKey]?.fullName ||
      'Payment of Non Salary Expenditures For 2026-2027';

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSaveBankCharge({
        accountKey,
        bankFullName,
        amount,
        date,
        memo: memo.trim() || 'Bank Charges / SMS / FED Charges',
        accountHead: selectedHead || mappedAccountHead,
        isAmend,
        srNo: isAmend ? voucherToAmend?.srNo : nextSr,
        voucherNo: displayVoucherNo,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record bank charge.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden my-auto transition-all animate-in zoom-in-95 duration-150 ${
          darkMode ? 'bg-[#0c1322] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* EXECUTIVE CORPORATE HEADER */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-800 text-white px-6 py-4 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-200 shrink-0 shadow-inner">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                    isAmend
                      ? 'bg-amber-300 text-amber-950 shadow-xs'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {isAmend ? 'AMENDMENT MODE' : 'DIRECT BANK DEBIT'}
                </span>
                {isAmend && voucherToAmend && (
                  <span className="text-[11px] font-mono font-bold text-amber-200">
                    Sr. #{voucherToAmend.srNo}
                  </span>
                )}
              </div>
              <h3 className="text-base font-black tracking-tight text-white mt-0.5">
                {isAmend
                  ? `Amend Bank Charge (${voucherToAmend?.voucherNo || `Voucher #${voucherToAmend?.srNo}`})`
                  : 'Record Direct Bank Charge'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl hover:bg-white/15 text-amber-100 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Close dialogue (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR BANNER */}
        {errorMsg && (
          <div className="m-4 mb-0 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans">
          {/* Target Institutional Bank Account */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">
              Target Institutional Bank Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={accountKey}
              onChange={(e) => handleAccountChange(e.target.value as BankAccountKey)}
              disabled={isSubmitting}
              className={`w-full p-2.5 rounded-xl border outline-none font-semibold transition-all ${
                darkMode
                  ? 'bg-slate-800/90 border-slate-700 text-white focus:border-amber-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-600 focus:bg-white'
              }`}
            >
              {Object.entries(INSTITUTIONAL_BANK_ACCOUNTS).map(([k, acc]) => (
                <option key={k} value={k}>
                  {acc.shortName} — {acc.accountNo} ({acc.bankName})
                </option>
              ))}
            </select>
          </div>

          {/* Account Head: Standard Google Sheets Rule */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Account Head / Fund Classification</span>
              </label>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                {accountKey === 'NS' || accountKey === 'AA'
                  ? '🏛️ Standard Bank Head'
                  : `📑 Dedicated ${INSTITUTIONAL_BANK_ACCOUNTS[accountKey]?.shortName || accountKey}`}
              </span>
            </div>

            {accountKey === 'NS' || accountKey === 'AA' ? (
              <div className="space-y-1">
                <select
                  value={selectedHead}
                  onChange={(e) => setSelectedHead(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono font-bold transition-all ${
                    darkMode
                      ? 'bg-slate-800/90 border-slate-700 text-amber-300 focus:border-amber-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-600 focus:bg-white'
                  }`}
                >
                  <option value="A03101-BANK CHARGES">A03101-BANK CHARGES (Standard Head)</option>
                  {MASTER_ACCOUNT_HEADS.filter((h) => h !== 'A03101-BANK CHARGES').map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  ✓ Official rule: Non-Salary (NS) and AAA debit under <strong>A03101-BANK CHARGES</strong>.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 font-mono flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">{selectedHead}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Dedicated institutional head locked as per Google Sheets source rules.
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
                  Rule Locked
                </span>
              </div>
            )}
          </div>

          {/* Amount (PKR) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 dark:text-slate-300 font-bold">
                Debit Amount (PKR) <span className="text-rose-500">*</span>
              </label>
              {amount > 0 && (
                <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Rs. {formatPKR(amount)}
                </span>
              )}
            </div>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="e.g. 147"
              disabled={isSubmitting}
              className={`w-full p-2.5 rounded-xl border font-mono font-black text-sm outline-none transition-all ${
                darkMode
                  ? 'bg-slate-800/90 border-slate-700 text-amber-300 focus:border-amber-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-600 focus:bg-white'
              }`}
            />
          </div>

          {/* Date & Narration */}
          <div className="space-y-2">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">
                Debit / Bank Statement Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono font-semibold transition-all ${
                    darkMode
                      ? 'bg-slate-800/90 border-slate-700 text-white focus:border-amber-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-600 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">
                Particulars / Narration
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Bank Charges / SMS / FED Charges"
                disabled={isSubmitting}
                className={`w-full p-2.5 rounded-xl border outline-none transition-all ${
                  darkMode
                    ? 'bg-slate-800/90 border-slate-700 text-white focus:border-amber-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-600 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* LIVE AUDIT SUMMARY CARD */}
          <div
            className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
              darkMode
                ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-500 dark:text-slate-400">Voucher Reference:</span>
              <span className="font-extrabold text-amber-700 dark:text-amber-300">
                {displayVoucherNo} {isAmend ? `(Sr. #${voucherToAmend?.srNo})` : `(Next: #${nextSr})`}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Target Head:</span>
              <span className="font-bold truncate max-w-[240px]">{selectedHead}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Disbursement Mode:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                Direct Debit (No Cheque / Pure Reconciled)
              </span>
            </div>
            {amount > 0 && (
              <div className="flex justify-between items-center font-black pt-1.5 border-t border-amber-200 dark:border-amber-800/60 text-sm">
                <span>Net Debit:</span>
                <span className="text-amber-700 dark:text-amber-300">Rs. {formatPKR(amount)}</span>
              </div>
            )}
          </div>

          {/* MODAL ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-white font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-[0.98] transition-all flex items-center gap-1.5 ${
                isAmend
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/30'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-600/20'
              } disabled:opacity-50`}
            >
              {isAmend ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              <span>{isAmend ? 'Save Bank Charge Amendment' : 'Post Bank Charge'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
