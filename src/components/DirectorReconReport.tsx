import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Printer,
  Download,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Calendar,
  Check,
  ChevronDown,
  Info,
  Lock,
  Unlock,
  X,
  Receipt,
  CreditCard,
  Scale,
  FileText,
} from 'lucide-react';
import {
  BankAccountKey,
  BankAccountMetadata,
  INSTITUTIONAL_BANK_ACCOUNTS,
  INITIAL_CASHBOOK_STATES,
  INITIAL_MASTER_VOUCHERS,
  CashBookAccountState,
  MasterVoucher,
} from '../data/cashBookData';
import { MASTER_ACCOUNT_HEADS, filterAccountHeads } from '../data/voucherMasterLists';
import {
  fetchLiveCashBookFromGoogleSheet,
  STORAGE_KEY_LIVE_CASHBOOKS,
  STORAGE_KEY_LIVE_VOUCHERS,
} from '../lib/apiEngine';
import {
  resolveBankKeyFromAccount,
  parseDateToTimestamp,
  formatCurrency2Decimals,
  formatCashBookBillInfo,
} from '../lib/reportingEngine';
import {
  getOpeningBalance,
  normalizeDateToStartTimestamp,
  normalizeDateToEndTimestamp,
} from '../lib/balanceEngine';
import { AccountHead, OFFICIAL_SIGNATORIES } from '../types';
import {
  INITIAL_DIRECTOR_RECEIPTS,
  INITIAL_DIRECTOR_PAYMENTS,
  INITIAL_DIRECTOR_MONTHLY_GRID,
} from '../data/directorReconData';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import { PinLockScreen } from './PinLockScreen';

export interface DirectorReconReportProps {
  initialAccountKey?: BankAccountKey;
  customSpreadsheetId?: string;
  customAccountName?: string;
  districtName?: string;
  instituteName?: string;
  isUnlocked?: boolean;
  darkMode?: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
  onUnlockRequest?: () => void;
  vouchers?: MasterVoucher[];
  cashBookStates?: Record<BankAccountKey, CashBookAccountState>;
  accountsStore?: AccountHead[];
  onOpenPAF?: (voucherNo: string) => void;
}

export type DirectorReportTab = 'RECON' | 'RECEIPTS' | 'PAYMENTS';

export const BANK_ACCOUNT_LABELS: Record<
  BankAccountKey,
  { name: string; short: string; defaultAccountNo: string; bankName: string }
> = {
  NS: {
    name: 'Payment of Non Salary Expenditures',
    short: 'NS (Non-Salary)',
    defaultAccountNo: '6580006795600014',
    bankName: 'The Bank of Punjab',
  },
  PF: {
    name: 'Payment of Pupil Funds',
    short: 'PF (Pupil Fund)',
    defaultAccountNo: '6580027832200022',
    bankName: 'The Bank of Punjab',
  },
  FC: {
    name: 'TEVTA Fee Collection Account',
    short: 'FC (Fee Collection)',
    defaultAccountNo: '6580027832200011',
    bankName: 'The Bank of Punjab',
  },
  SEC: {
    name: 'Security Deposits Account',
    short: 'SEC (Securities)',
    defaultAccountNo: '6580027832200033',
    bankName: 'The Bank of Punjab',
  },
  SC: {
    name: 'Short Course Account',
    short: 'SC (Short Courses)',
    defaultAccountNo: '6580027832200044',
    bankName: 'The Bank of Punjab',
  },
  AA: {
    name: 'AAA Allocation Ceiling Account',
    short: 'AA (AAA Ceiling)',
    defaultAccountNo: 'District Treasury Allocation',
    bankName: 'National Bank of Pakistan (NBP)',
  },
};

// Standard month options for FY 2026-27 and FY 2025-26
export const MONTH_OPTIONS_2627 = [
  { key: '2026-07', label: 'July 2026 (Jul-26)', shortLabel: 'Jul-26', monthName: 'July', year: '2026' },
  { key: '2026-08', label: 'August 2026 (Aug-26)', shortLabel: 'Aug-26', monthName: 'August', year: '2026' },
  { key: '2026-09', label: 'September 2026 (Sep-26)', shortLabel: 'Sep-26', monthName: 'September', year: '2026' },
  { key: '2026-10', label: 'October 2026 (Oct-26)', shortLabel: 'Oct-26', monthName: 'October', year: '2026' },
  { key: '2026-11', label: 'November 2026 (Nov-26)', shortLabel: 'Nov-26', monthName: 'November', year: '2026' },
  { key: '2026-12', label: 'December 2026 (Dec-26)', shortLabel: 'Dec-26', monthName: 'December', year: '2026' },
  { key: '2027-01', label: 'January 2027 (Jan-27)', shortLabel: 'Jan-27', monthName: 'January', year: '2027' },
  { key: '2027-02', label: 'February 2027 (Feb-27)', shortLabel: 'Feb-27', monthName: 'February', year: '2027' },
  { key: '2027-03', label: 'March 2027 (Mar-27)', shortLabel: 'Mar-27', monthName: 'March', year: '2027' },
  { key: '2027-04', label: 'April 2027 (Apr-27)', shortLabel: 'Apr-27', monthName: 'April', year: '2027' },
  { key: '2027-05', label: 'May 2027 (May-27)', shortLabel: 'May-27', monthName: 'May', year: '2027' },
  { key: '2027-06', label: 'June 2027 (Jun-27)', shortLabel: 'Jun-27', monthName: 'June', year: '2027' },
];

export const MONTH_OPTIONS_2526 = [
  { key: '2025-07', label: 'July 2025 (Jul-25)', shortLabel: 'Jul-25', monthName: 'July', year: '2025' },
  { key: '2025-08', label: 'August 2025 (Aug-25)', shortLabel: 'Aug-25', monthName: 'August', year: '2025' },
  { key: '2025-09', label: 'September 2025 (Sep-25)', shortLabel: 'Sep-25', monthName: 'September', year: '2025' },
  { key: '2025-10', label: 'October 2025 (Oct-25)', shortLabel: 'Oct-25', monthName: 'October', year: '2025' },
  { key: '2025-11', label: 'November 2025 (Nov-25)', shortLabel: 'Nov-25', monthName: 'November', year: '2025' },
  { key: '2025-12', label: 'December 2025 (Dec-25)', shortLabel: 'Dec-25', monthName: 'December', year: '2025' },
  { key: '2026-01', label: 'January 2026 (Jan-26)', shortLabel: 'Jan-26', monthName: 'January', year: '2026' },
  { key: '2026-02', label: 'February 2026 (Feb-26)', shortLabel: 'Feb-26', monthName: 'February', year: '2026' },
  { key: '2026-03', label: 'March 2026 (Mar-26)', shortLabel: 'Mar-26', monthName: 'March', year: '2026' },
  { key: '2026-04', label: 'April 2026 (Apr-26)', shortLabel: 'Apr-26', monthName: 'April', year: '2026' },
  { key: '2026-05', label: 'May 2026 (May-26)', shortLabel: 'May-26', monthName: 'May', year: '2026' },
  { key: '2026-06', label: 'June 2026 (Jun-26)', shortLabel: 'Jun-26', monthName: 'June', year: '2026' },
];

// Helper: Format Number with commas
export function formatAmount(
  val: number | null | undefined,
  decimals = 2,
  showDashForZero = false
): string {
  if (val === null || val === undefined || isNaN(val)) return showDashForZero ? '-' : '0.00';
  if (val === 0 && showDashForZero) return '-';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Helper: Format Date string to dd-mm-yy
export function formatDateDDMMYY(dtStr: string): string {
  if (!dtStr) return '-';
  const ts = parseDateToTimestamp(dtStr);
  if (!ts || isNaN(ts)) return dtStr;
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yr = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${yr}`;
}

// Helper: Format Date string to dd-mm
export function formatDateDDMM(dtStr: string): string {
  if (!dtStr) return '-';
  const ts = parseDateToTimestamp(dtStr);
  if (!ts || isNaN(ts)) return dtStr;
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}`;
}

// Helper: Extract YYYY-MM month key from any date format
export function extractMonthKey(dtStr: string): string {
  if (!dtStr) return '';
  const ts = parseDateToTimestamp(dtStr);
  if (!ts || isNaN(ts)) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Helper: Convert dd-mm-yyyy or dd-mm-yy to YYYY-MM-DD for native <input type="date">
export function ddmmyyyyToIso(d: string): string {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return d; // already ISO
    const [day, month, year] = parts;
    const y = year.length === 2 ? `20${year}` : year;
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
}

// Helper: Convert YYYY-MM-DD to dd-mm-yyyy
export function isoToDdmmyyyy(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    if (parts[2].length === 4) return iso; // already dd-mm-yyyy
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }
  return iso;
}

// Internal row representation for Date-Wise Receipts
export interface LiveReceiptRow {
  id: string;
  srNo: number;
  date: string;
  dateTs: number;
  monthKey: string;
  challanChequeNo: string;
  headOfAccount: string;
  amount: number;
  remarks: string;
  paidToBy?: string;
}

// Internal row representation for Date-Wise Payments
export interface LivePaymentRow {
  id: string;
  srNo: number;
  headOfAccount: string;
  chequeDate: string;
  dateTs: number;
  monthKey: string;
  chequeNo: string;
  totalBillAmount: number;
  incomeTax: number;
  praAmount: number;
  security: number;
  netAmountPaid: number;
  remarks: string;
  paidTo: string;
  voucherNo?: string;
  billNo?: string;
  billDate?: string;
  voucherObj?: MasterVoucher;
}

// Monthly Reconciliation Row for Tab 2
export interface TEVTAReconMonthRow {
  monthKey: string;
  monthShortLabel: string;
  monthName: string;
  // Receipts Group
  receiptDesc: string;
  directReceipts: number;
  cmsdiNavttcShortCourse: number;
  otherReceiptsProfit: number;
  fromOtherBankAccount: number;
  totalReceipt: number;
  // Payments Group
  paymentDesc: string;
  directPayments: number;
  otherPaymentsBankCharges: number;
  directPaymentsCMSDI: number;
  totalPayment: number;
  // Period status
  isInSelectedPeriod: boolean;
}

// Manual Unpresented Cheque Entry
export interface ManualUnpresentedCheque {
  id: string;
  chequeNo: string;
  date: string;
  accountHead?: string;
  amount: number;
  description: string;
}

// =========================================================================
// Formatting & Number Utilities for Live Grouped-Digit Inputs & Calculations
// =========================================================================

/**
 * Formats a numeric or partially typed string with thousands digit grouping (e.g. 1,765,919)
 * while maintaining decimal points and live typing continuity.
 */
export function formatNumberLive(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  if (str === '') return '';

  const isNegative = str.startsWith('-');
  // Keep only digits and decimal points
  const cleaned = str.replace(/[^0-9.]/g, '');
  if (cleaned === '') return isNegative ? '-' : '';

  const dotIndex = cleaned.indexOf('.');
  let intPart: string;
  let decPart: string;

  if (dotIndex === -1) {
    intPart = cleaned;
    decPart = '';
  } else {
    intPart = cleaned.slice(0, dotIndex);
    // Keep first dot and decimals, stripping any extra dots
    decPart = '.' + cleaned.slice(dotIndex + 1).replace(/\./g, '');
  }

  let formattedInt = '';
  if (intPart.length > 0) {
    if (intPart.length > 1 && intPart.startsWith('0')) {
      intPart = intPart.replace(/^0+/, '') || '0';
    }
    formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else if (dotIndex === 0) {
    formattedInt = '0';
  }

  return (isNegative ? '-' : '') + formattedInt + decPart;
}

/**
 * Parses any amount string or number to a clean float, stripping commas and whitespace.
 * Safe for all downstream reconciliation and variance arithmetic.
 */
export function parseNumericAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// =========================================================================
// GroupedAmountInput: Live Digit Grouping (e.g. 1,765,919) + Save on Enter
// =========================================================================
interface GroupedAmountInputProps {
  value: number | string;
  onChange: (numVal: number, formattedStr: string) => void;
  onCommit?: (numVal: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  title?: string;
}

export const GroupedAmountInput: React.FC<GroupedAmountInputProps> = ({
  value,
  onChange,
  onCommit,
  disabled,
  className,
  placeholder = '0.00',
  title,
}) => {
  const [displayStr, setDisplayStr] = useState<string>(() => {
    if (value === '' || value === null || value === undefined) return '';
    return formatNumberLive(value);
  });
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      if (value === '' || value === null || value === undefined) {
        setDisplayStr('');
      } else {
        setDisplayStr(formatNumberLive(value));
      }
    } else {
      // If focused, only update if external value changed significantly (e.g. FY/account switch)
      const currentNum = parseNumericAmount(displayStr);
      const incomingNum = parseNumericAmount(value);
      if (Math.abs(currentNum - incomingNum) > 0.0001) {
        setDisplayStr(formatNumberLive(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const originalValue = input.value;
    const originalCursor = input.selectionStart || 0;

    // Count non-comma characters before cursor in original input
    const nonCommasBeforeCursor = originalValue.slice(0, originalCursor).replace(/,/g, '').length;

    const formatted = formatNumberLive(originalValue);
    setDisplayStr(formatted);

    const numVal = parseNumericAmount(formatted);
    onChange(numVal, formatted);

    // Restore cursor position smoothly based on non-comma character count
    requestAnimationFrame(() => {
      if (input) {
        let cursor = 0;
        let counted = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (counted >= nonCommasBeforeCursor) break;
          if (formatted[i] !== ',') counted++;
          cursor = i + 1;
        }
        input.setSelectionRange(cursor, cursor);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const numVal = parseNumericAmount(displayStr);
      onCommit?.(numVal);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const cursor = input.selectionStart || 0;
      if (cursor > 0 && input.selectionStart === input.selectionEnd) {
        if (input.value[cursor - 1] === ',') {
          e.preventDefault();
          const val = input.value;
          // Delete character before comma
          const newVal = val.slice(0, cursor - 2) + val.slice(cursor);
          const formatted = formatNumberLive(newVal);
          setDisplayStr(formatted);
          const numVal = parseNumericAmount(formatted);
          onChange(numVal, formatted);
          requestAnimationFrame(() => {
            input.setSelectionRange(cursor - 2, cursor - 2);
          });
        }
      }
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const numVal = parseNumericAmount(displayStr);
    onCommit?.(numVal);
    // Tidy up trailing period if left hanging
    if (displayStr.endsWith('.')) {
      setDisplayStr(displayStr.slice(0, -1));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={displayStr}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      title={title}
    />
  );
};

// Searchable Account Head Dropdown / Combobox Component for Unpresented Cheques
interface SearchableAccountHeadCellProps {
  value?: string;
  onChange: (newHead: string) => void;
  availableHeads: string[];
  disabled: boolean;
  darkMode?: boolean;
}

const SearchableAccountHeadCell: React.FC<SearchableAccountHeadCellProps> = ({
  value = '',
  onChange,
  availableHeads,
  disabled,
  darkMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch(value);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, value]);

  // FIX 2: Exact same shared fuzzy/partial multi-token search logic from Voucher Entry
  const filteredHeads = useMemo(() => {
    return filterAccountHeads(availableHeads, search);
  }, [search, availableHeads]);

  // Keep highlighted item visible on arrow key navigation
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.head-item');
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (head: string) => {
    onChange(head);
    setSearch(head);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredHeads.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredHeads.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredHeads[highlightedIndex]) {
        handleSelect(filteredHeads[highlightedIndex]);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  if (disabled) {
    return (
      <div
        className={`px-2 py-1 rounded text-[11px] font-mono truncate max-w-[190px] border ${
          darkMode
            ? 'bg-slate-800/80 border-slate-700 text-slate-300'
            : 'bg-slate-100 border-slate-300 text-slate-700'
        }`}
        title={value || 'No Account Head assigned'}
      >
        {value || '—'}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search Head (e.g. water, ch, elect)..."
          className={`w-full px-2 py-1 pr-5 rounded text-xs font-mono border focus:outline-hidden ${
            darkMode
              ? 'bg-slate-800 border-purple-800/60 text-white focus:border-purple-400'
              : 'bg-white border-purple-300 text-slate-900 focus:border-purple-600'
          }`}
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              onChange('');
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            className="absolute right-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] p-0.5 cursor-pointer"
            title="Clear"
          >
            ✕
          </button>
        ) : (
          <ChevronDown className="w-3 h-3 absolute right-1 text-slate-400 pointer-events-none" />
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className={`absolute top-full left-0 mt-1 w-80 max-h-56 overflow-y-auto rounded-lg shadow-2xl z-50 divide-y text-xs border ${
            darkMode
              ? 'bg-slate-900 border-purple-700 divide-slate-800 text-white'
              : 'bg-white border-purple-400 divide-slate-100 text-slate-900'
          }`}
        >
          <div
            className={`p-1.5 text-[10px] font-bold flex items-center justify-between sticky top-0 z-10 border-b ${
              darkMode
                ? 'bg-purple-950 text-purple-200 border-purple-800'
                : 'bg-purple-50 text-purple-900 border-purple-200'
            }`}
          >
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-purple-500" />
              <span>Select Head ({filteredHeads.length} matching • ↑ ↓ Arrows + Enter)</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearch(value);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
          {filteredHeads.length === 0 ? (
            <div className="p-3 text-center text-slate-400 text-[11px] italic">
              No matching account heads found for &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredHeads.map((h, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = h === value;
              return (
                <div
                  key={h}
                  onClick={() => handleSelect(h)}
                  className={`head-item px-2.5 py-1.5 cursor-pointer text-[11px] truncate transition-colors flex items-center justify-between ${
                    isHighlighted
                      ? darkMode
                        ? 'bg-purple-900 text-white font-bold'
                        : 'bg-purple-100 text-purple-950 font-bold'
                      : isSelected
                      ? darkMode
                        ? 'bg-purple-950/70 text-purple-300 font-semibold'
                        : 'bg-purple-50 text-purple-900 font-semibold'
                      : darkMode
                      ? 'hover:bg-slate-800 text-slate-200'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                  title={h}
                >
                  <span className="truncate">{h}</span>
                  {isSelected && (
                    <span className="text-[10px] text-emerald-500 font-bold ml-1 shrink-0">✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export function DirectorReconciliationReport({
  initialAccountKey = 'NS',
  customAccountName,
  districtName = 'FAISALABAD',
  instituteName = 'GVTIW SAMANABAD FAISALABAD',
  darkMode = true,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
  isUnlocked = false,
  onUnlockRequest,
  vouchers: propVouchers,
  cashBookStates: propCashBookStates,
  accountsStore,
  onOpenPAF,
}: DirectorReconReportProps) {
  // Navigation Tabs: 'RECON' | 'RECEIPTS' | 'PAYMENTS'
  const [activeTab, setActiveTab] = useState<DirectorReportTab>('RECON');

  // Manual Edit Unlock State (gated by live Security PIN verification)
  const [internalUnlocked, setInternalUnlocked] = useState(false);
  const [showLocalPinModal, setShowLocalPinModal] = useState(false);

  // Gated manual edit permission: check parent prop or internal unlock
  const isEffectiveUnlocked = useMemo(() => {
    return Boolean(isUnlocked || internalUnlocked);
  }, [isUnlocked, internalUnlocked]);

  const handleRequestUnlock = () => {
    if (onUnlockRequest) {
      onUnlockRequest();
    } else {
      setShowLocalPinModal(true);
    }
  };

  const handleLocalPinSuccess = (_pin: string) => {
    setInternalUnlocked(true);
    setShowLocalPinModal(false);
  };

  // Account selection: NS, PF, FC, SEC, SC, AA
  const [selectedAccountKey, setSelectedAccountKey] = useState<BankAccountKey>(initialAccountKey);

  // Financial Year and Period Controls
  const [selectedFY, setSelectedFY] = useState<'2026-27' | '2025-26' | 'ALL'>('2026-27');
  const [fromDate, setFromDate] = useState<string>('2026-07-01');
  const [toDate, setToDate] = useState<string>('2026-08-31');

  // As on date with persistent local storage
  const [asOnDate, setAsOnDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`gvtiw_recon_as_on_${initialAccountKey}_2026-27`);
      if (saved) return saved;
    } catch {}
    return '31-08-2026';
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`gvtiw_recon_as_on_${selectedAccountKey}_${selectedFY}`);
      if (saved) {
        setAsOnDate(saved);
        return;
      }
    } catch {}
    const def = selectedFY === '2025-26' ? '30-06-2026' : '31-08-2026';
    setAsOnDate(def);
  }, [selectedAccountKey, selectedFY]);

  // Payment Approval Form (PAF) modal state
  const [selectedVoucherForPAF, setSelectedVoucherForPAF] = useState<MasterVoucher | null>(null);

  // Specific single month filter for Tab 1 (Receipts) & Tab 3 (Payments)
  // 'ALL' means follow the range [fromMonth, toMonth]
  const [selectedSingleMonth, setSelectedSingleMonth] = useState<string>('ALL');

  // Search queries for registers
  const [receiptSearch, setReceiptSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');

  // Internal Live Data State
  const [liveVouchers, setLiveVouchers] = useState<MasterVoucher[]>(() => {
    if (propVouchers && propVouchers.length > 0) return propVouchers;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LIVE_VOUCHERS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_MASTER_VOUCHERS;
  });

  const [liveCashBookStates, setLiveCashBookStates] = useState<
    Record<BankAccountKey, CashBookAccountState>
  >(() => {
    if (propCashBookStates && Object.keys(propCashBookStates).length > 0) return propCashBookStates;
    try {
      const stored =
        localStorage.getItem(STORAGE_KEY_LIVE_CASHBOOKS) ||
        localStorage.getItem('gvtiw_live_cashbook_states_v3');
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_CASHBOOK_STATES;
  });

  // Sync state when props update
  useEffect(() => {
    if (propVouchers && propVouchers.length > 0) {
      setLiveVouchers(propVouchers);
    }
  }, [propVouchers]);

  useEffect(() => {
    if (propCashBookStates && Object.keys(propCashBookStates).length > 0) {
      setLiveCashBookStates(propCashBookStates);
    }
  }, [propCashBookStates]);

  // Live Sync Handlers
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  const handleSyncLiveSheet = async () => {
    setIsSyncing(true);
    setSyncFeedback('Reading live sheets...');
    try {
      const result = await fetchLiveCashBookFromGoogleSheet();
      if (result) {
        setLiveVouchers(result.vouchers);
        setLiveCashBookStates(result.cashBookStates);
        setSyncFeedback(`✓ Live data updated (${result.vouchers.length} vouchers)`);
      } else {
        setSyncFeedback('✓ Synced with verified live sheets');
      }
    } catch {
      setSyncFeedback('Using local cached cash book records');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(''), 4000);
    }
  };

  // Active account metadata
  const activeAccountMeta: BankAccountMetadata =
    INSTITUTIONAL_BANK_ACCOUNTS[selectedAccountKey] || INSTITUTIONAL_BANK_ACCOUNTS.NS;
  const activeAccountConfig = BANK_ACCOUNT_LABELS[selectedAccountKey] || BANK_ACCOUNT_LABELS.NS;
  const activeAccountName = customAccountName || activeAccountConfig.name;

  const activeMonthOptions = selectedFY === '2025-26' ? MONTH_OPTIONS_2526 : MONTH_OPTIONS_2627;

  // Handler for As On Date change with automatic period synchronization
  const handleAsOnDateChange = (newVal: string) => {
    if (!newVal) return;
    let displayVal = newVal;
    let isoVal = newVal;
    if (newVal.includes('-') && newVal.split('-')[0].length === 4) {
      displayVal = isoToDdmmyyyy(newVal);
      isoVal = newVal;
    } else if (newVal.includes('-') && (newVal.split('-')[2]?.length === 4 || newVal.split('-')[2]?.length === 2)) {
      isoVal = ddmmyyyyToIso(newVal);
    }

    setAsOnDate(displayVal);
    try {
      localStorage.setItem(`gvtiw_recon_as_on_${selectedAccountKey}_${selectedFY}`, displayVal);
    } catch {}

    // If date contains a valid year-month-day, synchronize toDate
    if (isoVal && isoVal.length === 10) {
      setToDate(isoVal);
    }
  };

  // Switch FY preset
  const handleFYChange = (fy: '2026-27' | '2025-26' | 'ALL') => {
    setSelectedFY(fy);
    setSelectedSingleMonth('ALL');
    let defaultAsOn = '31-08-2026';
    if (fy === '2026-27') {
      setFromDate('2026-07-01');
      setToDate('2026-08-31');
      defaultAsOn = '31-08-2026';
    } else if (fy === '2025-26') {
      setFromDate('2025-07-01');
      setToDate('2026-06-30');
      defaultAsOn = '30-06-2026';
    } else {
      setFromDate('2025-07-01');
      setToDate('2027-06-30');
      defaultAsOn = '31-08-2026';
    }
    const saved = localStorage.getItem(`gvtiw_recon_as_on_${selectedAccountKey}_${fy}`);
    setAsOnDate(saved || defaultAsOn);
  };

  // Handler to open Payment Approval Form (PAF) for a specific payment voucher
  const handleOpenPAF = (p: LivePaymentRow) => {
    if (p.voucherObj) {
      if (onOpenPAF && p.voucherNo) {
        onOpenPAF(p.voucherNo);
      }
      setSelectedVoucherForPAF(p.voucherObj);
      return;
    }

    // Try finding matching voucher from liveVouchers
    const found = liveVouchers.find((v) => {
      if (p.voucherNo && (v.voucherNo?.toLowerCase() === p.voucherNo.toLowerCase() || `V# ${v.srNo}` === p.voucherNo)) {
        return true;
      }
      if (p.chequeNo && p.chequeNo !== '—' && p.chequeNo !== 'DEBIT' && v.chequeNoNet === p.chequeNo) {
        return true;
      }
      return false;
    });

    if (found) {
      if (onOpenPAF && found.voucherNo) {
        onOpenPAF(found.voucherNo);
      }
      setSelectedVoucherForPAF(found);
      return;
    }

    // Synthesize compliant MasterVoucher for clean PAF preview
    const syntheticVoucher: MasterVoucher = {
      srNo: p.srNo,
      voucherNo: p.voucherNo || `V-${p.srNo}`,
      payeeName: p.paidTo,
      ntnCnic: '—',
      billNo: p.billNo || '—',
      billDate: p.billDate || p.chequeDate,
      chequeNoNet: p.chequeNo,
      chequeDate: p.chequeDate,
      chequeAmountNet: p.netAmountPaid,
      accountHead: p.headOfAccount,
      gstAmount: 0,
      praAmount: p.praAmount,
      chequeNoPra: '',
      incomeTaxAmount: p.incomeTax,
      chequeNoIncomeTax: '',
      billAmountGross: p.totalBillAmount,
      description: p.remarks,
      entryStatus: 'POSTED',
      timestamp: new Date().toISOString(),
      bankAccount: activeAccountConfig.name,
      preEntryBalance: 0,
    };
    setSelectedVoucherForPAF(syntheticVoucher);
  };

  // ---------------------------------------------------------------------------
  // 1. DATA SOURCE DERIVATION (LIVE GVIZ / CASHBOOK PATTERN)
  // ---------------------------------------------------------------------------

  // Period timestamps (day-level precision)
  const fromTs = useMemo(() => normalizeDateToStartTimestamp(fromDate), [fromDate]);
  const toTs = useMemo(() => normalizeDateToEndTimestamp(toDate), [toDate]);

  // Live Opening Balance rolled forward to start of selected period (reference implementation from balanceEngine)
  const openingBalance = useMemo(() => {
    if (selectedFY === '2025-26' && fromDate === '2025-07-01') {
      return 2387207.0; // Official baseline 2025-26
    }
    return getOpeningBalance(selectedAccountKey, fromDate, {
      vouchers: liveVouchers,
      cashBookStates: liveCashBookStates,
    });
  }, [selectedAccountKey, fromDate, selectedFY, liveVouchers, liveCashBookStates]);

  const periodOpeningLabel = useMemo(() => {
    if (fromDate === '2026-07-01' || fromDate === '2025-07-01') {
      return `Opening Balance as per Cash Book at the Start of Year ${selectedFY}`;
    }
    return `Opening Balance as per Cash Book (as on ${formatDateDDMMYY(fromDate)})`;
  }, [fromDate, selectedFY]);

  // Master live receipts for selectedAccountKey
  const allAccountReceipts = useMemo<LiveReceiptRow[]>(() => {
    const list: LiveReceiptRow[] = [];
    const state = liveCashBookStates[selectedAccountKey];

    if (state && Array.isArray(state.entries)) {
      state.entries.forEach((e, idx) => {
        const amt = Number(e.receipts) || 0;
        if (amt > 0 || e.entryType === 'RECEIPT') {
          const dt = e.date || '';
          const ts = parseDateToTimestamp(dt);
          const mk = extractMonthKey(dt);
          list.push({
            id: e.id || `REC-${selectedAccountKey}-${idx}`,
            srNo: idx + 1,
            date: dt,
            dateTs: ts,
            monthKey: mk,
            challanChequeNo: e.chequeNo || e.vNo || '—',
            headOfAccount: e.accountHead || 'Non Salary Grant',
            amount: amt,
            remarks: e.particulars || 'Grant Receipt',
            paidToBy: e.paidToBy || 'Govt. of Punjab / TEVTA',
          });
        }
      });
    }

    // Fallback baseline for FY 2025-26 if no 2025 entries in live sheet
    if (list.length === 0 && selectedFY === '2025-26' && selectedAccountKey === 'NS') {
      INITIAL_DIRECTOR_RECEIPTS.forEach((r, idx) => {
        const ts = parseDateToTimestamp(r.date);
        list.push({
          id: `BASE-REC-${idx}`,
          srNo: r.srNo || idx + 1,
          date: r.date,
          dateTs: ts,
          monthKey: extractMonthKey(r.date),
          challanChequeNo: r.challanChequeNo || '—',
          headOfAccount: r.headOfAccount,
          amount: r.amount,
          remarks: r.remarks,
          paidToBy: 'Govt. of Punjab / TEVTA',
        });
      });
    }

    // Sort by Date of Receipt ascending
    list.sort((a, b) => a.dateTs - b.dateTs);
    list.forEach((item, index) => {
      item.srNo = index + 1;
    });

    return list;
  }, [liveCashBookStates, selectedAccountKey, selectedFY]);

  // Master live payments for selectedAccountKey
  const allAccountPayments = useMemo<LivePaymentRow[]>(() => {
    const list: LivePaymentRow[] = [];

    // 1. Filter vouchers belonging to selected bank account
    const matchedVouchers = liveVouchers.filter(
      (v) => resolveBankKeyFromAccount(v.bankAccount) === selectedAccountKey
    );

    matchedVouchers.forEach((v, idx) => {
      const dt = v.chequeDate || v.billDate || '';
      const ts = parseDateToTimestamp(dt);
      const mk = extractMonthKey(dt);

      const gst = Number(v.gstAmount) || 0;
      const it = Number(v.incomeTaxAmount) || 0;
      const praOnBill = Number(v.praTaxOnBill) || 0;
      let praPaid = Number(v.praAmount) || 0;
      if (praPaid === 0 && praOnBill > 0) {
        praPaid = praOnBill + 100;
      }
      const net = Number(v.chequeAmountNet) || 0;
      const gross =
        Number(v.billAmountGross) > 0
          ? Number(v.billAmountGross)
          : Number(v.billAmtExclTax || 0) > 0
          ? Number(v.billAmtExclTax) + gst + praOnBill
          : net + it + praPaid;

      // Combined Income Tax + PRA 16% tax deduction
      const combinedTax = it + praPaid;

      list.push({
        id: `VOUCH-${v.voucherNo || idx}`,
        srNo: idx + 1,
        headOfAccount: v.accountHead || 'Non Salary Expenditure',
        chequeDate: dt,
        dateTs: ts,
        monthKey: mk,
        chequeNo: v.chequeNoNet || '—',
        totalBillAmount: gross,
        incomeTax: it,
        praAmount: praPaid,
        security: 0,
        netAmountPaid: net,
        remarks: v.description || '—',
        paidTo: v.payeeName || '—',
        voucherNo: v.voucherNo || (v.srNo ? `V# ${v.srNo}` : ''),
        billNo: v.billNo || '',
        billDate: v.billDate || '',
        voucherObj: v,
      });
    });

    // 2. Include standalone Bank Charges from cash book sheet not in vouchers
    const state = liveCashBookStates[selectedAccountKey];
    if (state && Array.isArray(state.entries)) {
      state.entries.forEach((e, idx) => {
        if (
          e.entryType === 'PAYMENT' &&
          Number(e.payments) > 0 &&
          (e.particulars?.toLowerCase().includes('bank') || e.id?.includes('BC'))
        ) {
          const alreadyExists = matchedVouchers.some((v) => {
            if (e.voucherSerial && v.voucherNo && e.voucherSerial.trim().toLowerCase() === v.voucherNo.trim().toLowerCase())
              return true;
            if (e.vNo && (String(v.srNo) === String(e.vNo) || v.voucherNo === String(e.vNo))) return true;
            return false;
          });

          if (!alreadyExists) {
            const dt = e.date || '';
            const ts = parseDateToTimestamp(dt);
            const mk = extractMonthKey(dt);
            const amt = Number(e.payments);
            list.push({
              id: `BC-${idx}`,
              srNo: list.length + 1,
              headOfAccount: e.accountHead || 'A03101-BANK CHARGES',
              chequeDate: dt,
              dateTs: ts,
              monthKey: mk,
              chequeNo: e.chequeNo && e.chequeNo !== '0' ? e.chequeNo : 'DEBIT',
              totalBillAmount: amt,
              incomeTax: 0,
              praAmount: 0,
              security: 0,
              netAmountPaid: amt,
              remarks: e.particulars || 'Bank Service Charge',
              paidTo: activeAccountConfig.bankName,
              voucherNo: e.voucherSerial || (e.vNo ? `BC-${e.vNo}` : `BC-${idx + 1}`),
              billNo: '',
              billDate: '',
            });
          }
        }
      });
    }

    // Fallback baseline for FY 2025-26 if no live vouchers
    if (list.length === 0 && selectedFY === '2025-26' && selectedAccountKey === 'NS') {
      INITIAL_DIRECTOR_PAYMENTS.forEach((p, idx) => {
        const ts = parseDateToTimestamp(p.chequeDate);
        list.push({
          id: `BASE-PAY-${idx}`,
          srNo: p.srNo || idx + 1,
          headOfAccount: p.headOfAccount,
          chequeDate: p.chequeDate,
          dateTs: ts,
          monthKey: extractMonthKey(p.chequeDate),
          chequeNo: p.chequeNo,
          totalBillAmount: p.totalBillAmount,
          incomeTax: p.incomeTax,
          praAmount: p.salesTaxPRA,
          security: p.security,
          netAmountPaid: p.netAmountPaid,
          remarks: p.remarks,
          paidTo: p.paidTo,
          voucherNo: `V# ${p.srNo || idx + 1}`,
          billNo: '',
          billDate: '',
        });
      });
    }

    // Sort by Cheque Date ascending
    list.sort((a, b) => a.dateTs - b.dateTs);
    list.forEach((item, index) => {
      item.srNo = index + 1;
    });

    return list;
  }, [liveVouchers, liveCashBookStates, selectedAccountKey, selectedFY, activeAccountConfig.bankName]);

  // ---------------------------------------------------------------------------
  // 2. TAB 1: DATE WISE RECEIPTS FILTERING & TOTALS
  // ---------------------------------------------------------------------------
  const filteredReceipts = useMemo(() => {
    let list = allAccountReceipts.filter((r) => {
      if (!r.monthKey) return false;
      if (selectedSingleMonth !== 'ALL') {
        return r.monthKey === selectedSingleMonth;
      }
      return r.dateTs >= fromTs && r.dateTs <= toTs;
    });

    if (receiptSearch.trim()) {
      const q = receiptSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.headOfAccount.toLowerCase().includes(q) ||
          r.remarks.toLowerCase().includes(q) ||
          r.challanChequeNo.toLowerCase().includes(q) ||
          r.amount.toString().includes(q)
      );
    }
    return list;
  }, [allAccountReceipts, selectedSingleMonth, fromTs, toTs, receiptSearch]);

  const totalReceiptsAmount = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  }, [filteredReceipts]);

  // ---------------------------------------------------------------------------
  // 3. TAB 3: DATE WISE PAYMENTS FILTERING & TOTALS
  // ---------------------------------------------------------------------------
  const filteredPayments = useMemo(() => {
    let list = allAccountPayments.filter((p) => {
      if (!p.monthKey) return false;
      if (selectedSingleMonth !== 'ALL') {
        return p.monthKey === selectedSingleMonth;
      }
      return p.dateTs >= fromTs && p.dateTs <= toTs;
    });

    if (paymentSearch.trim()) {
      const q = paymentSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.headOfAccount.toLowerCase().includes(q) ||
          p.chequeNo.toLowerCase().includes(q) ||
          p.remarks.toLowerCase().includes(q) ||
          p.paidTo.toLowerCase().includes(q) ||
          p.totalBillAmount.toString().includes(q) ||
          p.netAmountPaid.toString().includes(q)
      );
    }
    return list;
  }, [allAccountPayments, selectedSingleMonth, fromTs, toTs, paymentSearch]);

  const paymentsTotals = useMemo(() => {
    return filteredPayments.reduce(
      (acc, p) => {
        acc.totalBill += p.totalBillAmount;
        acc.incomeTax += p.incomeTax;
        acc.praAmount += p.praAmount;
        acc.security += p.security;
        acc.netPaid += p.netAmountPaid;
        return acc;
      },
      { totalBill: 0, incomeTax: 0, praAmount: 0, security: 0, netPaid: 0 }
    );
  }, [filteredPayments]);

  // ---------------------------------------------------------------------------
  // 4. TAB 2: MONTH-WISE RECONCILIATION TABLE DATA & CALCULATIONS
  // ---------------------------------------------------------------------------
  const reconciliationMonthRows = useMemo<TEVTAReconMonthRow[]>(() => {
    const fromMonthKey = fromDate.substring(0, 7);
    const toMonthKey = toDate.substring(0, 7);

    return activeMonthOptions.map((opt) => {
      const mKey = opt.key;
      const isInPeriod = mKey >= fromMonthKey && mKey <= toMonthKey;

      // Receipts in month (filtered by exact timestamp boundary if in period)
      const mReceipts = allAccountReceipts.filter((r) => {
        if (r.monthKey !== mKey) return false;
        if (isInPeriod) {
          return r.dateTs >= fromTs && r.dateTs <= toTs;
        }
        return true;
      });
      let directR = 0;
      let shortCourseR = 0;
      let profitR = 0;
      let otherBankR = 0;
      const rHeads: string[] = [];

      mReceipts.forEach((r) => {
        rHeads.push(r.headOfAccount || r.remarks);
        const txt = `${r.headOfAccount} ${r.remarks}`.toLowerCase();
        if (txt.includes('profit') || txt.includes('pls') || txt.includes('markup') || txt.includes('interest')) {
          profitR += r.amount;
        } else if (txt.includes('navttc') || txt.includes('cmsdi') || txt.includes('short course') || txt.includes('training')) {
          shortCourseR += r.amount;
        } else if (txt.includes('from other') || txt.includes('transfer') || txt.includes('pupil') || txt.includes('fee collection')) {
          otherBankR += r.amount;
        } else {
          directR += r.amount;
        }
      });

      // Payments in month (filtered by exact timestamp boundary if in period)
      const mPayments = allAccountPayments.filter((p) => {
        if (p.monthKey !== mKey) return false;
        if (isInPeriod) {
          return p.dateTs >= fromTs && p.dateTs <= toTs;
        }
        return true;
      });
      let directP = 0;
      let chargesP = 0;
      let cmsdiP = 0;
      const pHeads: string[] = [];

      mPayments.forEach((p) => {
        pHeads.push(p.headOfAccount || p.remarks);
        const amt = p.totalBillAmount || p.netAmountPaid;
        const txt = `${p.headOfAccount} ${p.remarks} ${p.paidTo}`.toLowerCase();
        if (txt.includes('bank charge') || txt.includes('service charge') || txt.includes('fed') || txt.includes('a03101')) {
          chargesP += amt;
        } else if (txt.includes('cmsdi') || txt.includes('navttc') || txt.includes('short course') || txt.includes('stipend')) {
          cmsdiP += amt;
        } else {
          directP += amt;
        }
      });

      // If viewing 2025-26 and no live data exists, fallback to baseline monthly grid
      if (mReceipts.length === 0 && mPayments.length === 0 && selectedFY === '2025-26') {
        const gridMatch = INITIAL_DIRECTOR_MONTHLY_GRID.find((g) => g.monthKey.startsWith(mKey));
        if (gridMatch) {
          directR = gridMatch.directReceipts;
          shortCourseR = gridMatch.shortCourseReceipts;
          profitR = gridMatch.otherReceiptsProfit;
          otherBankR = gridMatch.fromOtherBankAccount;
          rHeads.push(gridMatch.receiptDesc);

          directP = gridMatch.directPayments;
          chargesP = gridMatch.otherPaymentsBankCharges;
          cmsdiP = gridMatch.cmsdiNavttcPayments;
          pHeads.push(gridMatch.paymentDesc);
        }
      }

      const totR = directR + shortCourseR + profitR + otherBankR;
      const totP = directP + chargesP + cmsdiP;

      // Concise auto-generated description
      const rDesc =
        Array.from(new Set(rHeads.filter(Boolean)))
          .slice(0, 2)
          .map((h) => h.replace(/A\d+-/g, ''))
          .join(', ') || '';

      const pDesc =
        Array.from(new Set(pHeads.filter(Boolean)))
          .slice(0, 2)
          .map((h) => h.replace(/A\d+-/g, ''))
          .join(', ') || '';

      return {
        monthKey: mKey,
        monthShortLabel: opt.shortLabel,
        monthName: opt.monthName,
        receiptDesc: rDesc,
        directReceipts: directR,
        cmsdiNavttcShortCourse: shortCourseR,
        otherReceiptsProfit: profitR,
        fromOtherBankAccount: otherBankR,
        totalReceipt: totR,
        paymentDesc: pDesc,
        directPayments: directP,
        otherPaymentsBankCharges: chargesP,
        directPaymentsCMSDI: cmsdiP,
        totalPayment: totP,
        isInSelectedPeriod: isInPeriod,
      };
    });
  }, [activeMonthOptions, allAccountReceipts, allAccountPayments, selectedFY, fromDate, toDate, fromTs, toTs]);

  // Selected period rows & column-wise grand totals
  const periodReconRows = useMemo(() => {
    return reconciliationMonthRows.filter((r) => r.isInSelectedPeriod);
  }, [reconciliationMonthRows]);

  const reconTotals = useMemo(() => {
    return periodReconRows.reduce(
      (acc, r) => {
        acc.directReceipts += r.directReceipts;
        acc.cmsdiNavttcShortCourse += r.cmsdiNavttcShortCourse;
        acc.otherReceiptsProfit += r.otherReceiptsProfit;
        acc.fromOtherBankAccount += r.fromOtherBankAccount;
        acc.totalReceipt += r.totalReceipt;

        acc.directPayments += r.directPayments;
        acc.otherPaymentsBankCharges += r.otherPaymentsBankCharges;
        acc.directPaymentsCMSDI += r.directPaymentsCMSDI;
        acc.totalPayment += r.totalPayment;
        return acc;
      },
      {
        directReceipts: 0,
        cmsdiNavttcShortCourse: 0,
        otherReceiptsProfit: 0,
        fromOtherBankAccount: 0,
        totalReceipt: 0,
        directPayments: 0,
        otherPaymentsBankCharges: 0,
        directPaymentsCMSDI: 0,
        totalPayment: 0,
      }
    );
  }, [periodReconRows]);

  // Auto-calculated Cash Book Balance at end of period:
  // Opening + Total Receipts − Total Payments
  const calculatedCashBookBalance = useMemo(() => {
    return Math.round((openingBalance + reconTotals.totalReceipt - reconTotals.totalPayment) * 100) / 100;
  }, [openingBalance, reconTotals.totalReceipt, reconTotals.totalPayment]);

  // Manual Bank Statement Balance (persisted in localStorage per account + period)
  const bankStmtStorageKey = `gvtiw_tevta_bank_stmt_${selectedAccountKey}_${selectedFY}_${fromDate}_${toDate}`;
  const [bankStatementBalance, setBankStatementBalance] = useState<number>(() => {
    try {
      const saved =
        localStorage.getItem(bankStmtStorageKey) ||
        localStorage.getItem(`gvtiw_tevta_bank_stmt_${selectedAccountKey}_${selectedFY}_${fromDate.substring(0, 7)}_${toDate.substring(0, 7)}`);
      if (saved !== null && saved !== '') {
        const val = parseNumericAmount(saved);
        if (!isNaN(val)) return val;
      }
    } catch {}
    return selectedFY === '2025-26' ? 3044164.95 : 1743235.0;
  });

  const [editingBankBalanceStr, setEditingBankBalanceStr] = useState<string>(() =>
    formatNumberLive(bankStatementBalance)
  );

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(bankStmtStorageKey) ||
        localStorage.getItem(`gvtiw_tevta_bank_stmt_${selectedAccountKey}_${selectedFY}_${fromDate.substring(0, 7)}_${toDate.substring(0, 7)}`);
      if (saved !== null && saved !== '') {
        const val = parseNumericAmount(saved);
        if (!isNaN(val)) {
          setBankStatementBalance(val);
          setEditingBankBalanceStr(formatNumberLive(val));
          return;
        }
      }
    } catch {}
    const def = selectedFY === '2025-26' ? 3044164.95 : 1743235.0;
    setBankStatementBalance(def);
    setEditingBankBalanceStr(formatNumberLive(def));
  }, [bankStmtStorageKey, selectedFY, fromDate, toDate]);

  // Dedicated own-fund heads list (mirroring Voucher Entry rules)
  const DEDICATED_OWN_FUND_HEADS = useMemo(
    () => [
      'A00000PF-PUPIL FUND',
      'A00000SC-SHORT COURSE',
      'A00000SS-STUDENT SEC.',
      'A00000TFC-TEVTA FEE COL.',
    ],
    []
  );

  // Available account heads scoped to active bank account
  const availableHeadsForBank = useMemo(() => {
    if (selectedAccountKey === 'PF') {
      return ['A00000PF-PUPIL FUND'];
    }
    if (selectedAccountKey === 'SC') {
      return ['A00000SC-SHORT COURSE'];
    }
    if (selectedAccountKey === 'SEC') {
      return ['A00000SS-STUDENT SEC.'];
    }
    if (selectedAccountKey === 'FC') {
      return ['A00000TFC-TEVTA FEE COL.'];
    }
    return MASTER_ACCOUNT_HEADS.filter((h) => !DEDICATED_OWN_FUND_HEADS.includes(h));
  }, [selectedAccountKey, DEDICATED_OWN_FUND_HEADS]);

  const commitBankBalance = (valOrNum?: number | string) => {
    if (!isEffectiveUnlocked) return;
    const num = parseNumericAmount(valOrNum !== undefined ? valOrNum : editingBankBalanceStr);
    setBankStatementBalance(num);
    setEditingBankBalanceStr(formatNumberLive(num));
    try {
      localStorage.setItem(bankStmtStorageKey, String(num));
    } catch {}
  };

  const handleBankBalanceBlur = () => {
    commitBankBalance();
  };

  // Difference: Bank Statement Balance − Cash Book Balance
  const differenceAmount = useMemo(() => {
    return Math.round((bankStatementBalance - calculatedCashBookBalance) * 100) / 100;
  }, [bankStatementBalance, calculatedCashBookBalance]);

  // ---------------------------------------------------------------------------
  // 5. DETAILS OF UNPRESENTED / UNCREDITED CHEQUES (MANUAL DATA ENTRY ONLY)
  // ---------------------------------------------------------------------------
  const unpresentedStorageKey = `gvtiw_tevta_unpresented_manual_${selectedAccountKey}_${selectedFY}_${fromDate}_${toDate}`;
  const [manualCheques, setManualCheques] = useState<ManualUnpresentedCheque[]>(() => {
    try {
      const saved =
        localStorage.getItem(unpresentedStorageKey) ||
        localStorage.getItem(`gvtiw_tevta_unpresented_manual_${selectedAccountKey}_${selectedFY}_${fromDate.substring(0, 7)}_${toDate.substring(0, 7)}`) ||
        localStorage.getItem(`gvtiw_tevta_unpresented_manual_${initialAccountKey}_2026-27`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return []; // FIX 5: 100% manual entry - never auto-populate from mock data
  });

  // Sync manual cheques from localStorage when account or period changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(unpresentedStorageKey);
      if (saved) {
        setManualCheques(JSON.parse(saved));
        return;
      }
    } catch {}
    setManualCheques([]);
  }, [unpresentedStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(unpresentedStorageKey, JSON.stringify(manualCheques));
    } catch {}
  }, [manualCheques, unpresentedStorageKey]);

  const totalManualChequesAmount = useMemo(() => {
    return manualCheques.reduce((sum, c) => sum + parseNumericAmount(c.amount), 0);
  }, [manualCheques]);

  const handleAddManualChequeRow = () => {
    if (!isEffectiveUnlocked) {
      handleRequestUnlock();
      return;
    }
    const defaultHead = availableHeadsForBank.length === 1 ? availableHeadsForBank[0] : '';
    const newRow: ManualUnpresentedCheque = {
      id: `UC-${Date.now()}`,
      chequeNo: '',
      date: asOnDate || '31-08-2026',
      accountHead: defaultHead,
      amount: 0,
      description: '',
    };
    setManualCheques((prev) => [...prev, newRow]);
  };

  const handleUpdateManualCheque = (
    id: string,
    field: keyof ManualUnpresentedCheque,
    value: any
  ) => {
    if (!isEffectiveUnlocked) return;
    setManualCheques((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveManualCheque = (id: string) => {
    if (!isEffectiveUnlocked) return;
    setManualCheques((prev) => prev.filter((item) => item.id !== id));
  };

  // Helper to format Remarks with standardized Bill/Invoice # and Date
  const getFullPaymentRemarks = (p: LivePaymentRow) => {
    const billInfo = formatCashBookBillInfo(p.billNo, p.billDate);
    const rem = p.remarks && p.remarks !== '—' && p.remarks !== 'null' && p.remarks !== 'undefined' ? p.remarks : '';
    if (billInfo && rem) {
      return `${rem}\n${billInfo}`;
    }
    return billInfo || rem || '—';
  };

  // ---------------------------------------------------------------------------
  // 6. SCOPED EXCEL / CSV EXPORT HANDLERS
  // ---------------------------------------------------------------------------
  const handleExportCSV = () => {
    if (activeTab === 'RECEIPTS') {
      exportReceiptsCSV();
    } else if (activeTab === 'PAYMENTS') {
      exportPaymentsCSV();
    } else {
      exportReconciliationCSV();
    }
  };

  const exportReceiptsCSV = () => {
    const lines: string[] = [];
    lines.push(`"Source: Reports & Statements → Accounting Data Entry → Date Wise Receipts (${activeAccountConfig.short})"`);
    lines.push(`"${instituteName}"`);
    lines.push(`"ACCOUNTING DATA ENTRY — DATE WISE RECEIPTS IN ${activeAccountName.toUpperCase()} GRANTS"`);
    lines.push(`"Period: ${fromDate} to ${toDate} | Head: ${activeAccountConfig.short}"`);
    lines.push('');
    lines.push('"Sr #","Date of Receipt (dd-mm-yy)","Challan/Cheque No","Head of Account","Amount (Rs.)","Remarks"');

    filteredReceipts.forEach((r, idx) => {
      lines.push(
        `"${idx + 1}","${formatDateDDMMYY(r.date)}","${r.challanChequeNo}","${r.headOfAccount}","${r.amount.toFixed(2)}","${r.remarks.replace(/"/g, '""')}"`
      );
    });

    lines.push(`"","","","Total Amount","${totalReceiptsAmount.toFixed(2)}",""`);
    lines.push('');
    lines.push('"e-CashBook & Voucher System developed by MKZ for institute 33028"');

    downloadCSVBlob(lines.join('\n'), `Accounting_Data_Entry_Receipts_${selectedAccountKey}_${fromDate}_to_${toDate}.csv`);
  };

  const exportPaymentsCSV = () => {
    const lines: string[] = [];
    lines.push(`"Source: Reports & Statements → Accounting Data Entry → Date Wise Payments (${activeAccountConfig.short})"`);
    lines.push(`"${instituteName}"`);
    lines.push(`"ACCOUNTING DATA ENTRY — DATE WISE PAYMENTS FROM ${activeAccountName.toUpperCase()} GRANTS"`);
    lines.push(`"Period: ${fromDate} to ${toDate} | Head: ${activeAccountConfig.short}"`);
    lines.push('');
    lines.push(
      '"Sr #","Non Salary Head of Account","Cheque Date (dd-mm)","Cheque No.","Total Bill Amount","Income Tax","Sales Tax PRA 16%","Security","Net Amount Paid","Remarks","Paid to"'
    );

    filteredPayments.forEach((p, idx) => {
      const formattedRemarks = getFullPaymentRemarks(p);
      lines.push(
        `"${idx + 1}","${p.headOfAccount.replace(/"/g, '""')}","${formatDateDDMM(p.chequeDate)}","${p.chequeNo}","${p.totalBillAmount.toFixed(2)}","${p.incomeTax.toFixed(2)}","${p.praAmount.toFixed(2)}","${p.security.toFixed(2)}","${p.netAmountPaid.toFixed(2)}","${formattedRemarks.replace(/"/g, '""')}","${p.paidTo.replace(/"/g, '""')}"`
      );
    });

    lines.push(
      `"","Grand Total","","","${paymentsTotals.totalBill.toFixed(2)}","${paymentsTotals.incomeTax.toFixed(2)}","${paymentsTotals.praAmount.toFixed(2)}","${paymentsTotals.security.toFixed(2)}","${paymentsTotals.netPaid.toFixed(2)}","",""`
    );
    lines.push('');
    lines.push('"e-CashBook & Voucher System developed by MKZ for institute 33028"');

    downloadCSVBlob(lines.join('\n'), `Accounting_Data_Entry_Payments_${selectedAccountKey}_${fromDate}_to_${toDate}.csv`);
  };

  const exportReconciliationCSV = () => {
    const lines: string[] = [];
    lines.push(`"Source: Reports & Statements → Accounting Data Entry → Bank Reconciliation (${activeAccountConfig.short})"`);
    lines.push(`"ACCOUNTING DATA ENTRY — BANK RECONCILIATION STATEMENT"`);
    lines.push(`"NAME OF DISTRICT: ${districtName}"`);
    lines.push(`"INSTITUTE NAME: ${instituteName}"`);
    lines.push(`"HEAD OF ACCOUNT: ${activeAccountName}"`);
    lines.push(`"BANK NAME & ACCOUNT: ${activeAccountConfig.bankName} - A/C: ${activeAccountConfig.defaultAccountNo}"`);
    lines.push(`"As on: ${asOnDate}"`);
    lines.push(`"${periodOpeningLabel}: Rs. ${openingBalance.toFixed(2)}"`);
    lines.push('');
    lines.push(
      '"RECEIPTS GROUP: Month","Description","Direct Receipts (Budget)","CMSDI/NAVTTC Short Course","Other Receipts & (Bank Profit)","From Other Bank Account","Total Receipt","PAYMENTS GROUP: Description","Direct Payments","Other Payments & (Bank Charges)","Direct Payments CMSDI/NAVTTC","Total Payment"'
    );

    periodReconRows.forEach((r) => {
      lines.push(
        `"${r.monthShortLabel}","${r.receiptDesc.replace(/"/g, '""')}","${r.directReceipts.toFixed(2)}","${r.cmsdiNavttcShortCourse.toFixed(2)}","${r.otherReceiptsProfit.toFixed(2)}","${r.fromOtherBankAccount.toFixed(2)}","${r.totalReceipt.toFixed(2)}","${r.paymentDesc.replace(/"/g, '""')}","${r.directPayments.toFixed(2)}","${r.otherPaymentsBankCharges.toFixed(2)}","${r.directPaymentsCMSDI.toFixed(2)}","${r.totalPayment.toFixed(2)}"`
      );
    });

    lines.push(
      `"Total","","${reconTotals.directReceipts.toFixed(2)}","${reconTotals.cmsdiNavttcShortCourse.toFixed(2)}","${reconTotals.otherReceiptsProfit.toFixed(2)}","${reconTotals.fromOtherBankAccount.toFixed(2)}","${reconTotals.totalReceipt.toFixed(2)}","","${reconTotals.directPayments.toFixed(2)}","${reconTotals.otherPaymentsBankCharges.toFixed(2)}","${reconTotals.directPaymentsCMSDI.toFixed(2)}","${reconTotals.totalPayment.toFixed(2)}"`
    );

    lines.push('');
    lines.push(`"Balance as per Cash Book at the End of Month/Period:","${calculatedCashBookBalance.toFixed(2)}"`);
    lines.push(`"Balance As per Bank Statement at the End of Month/Period:","${bankStatementBalance.toFixed(2)}"`);
    lines.push(`"Difference if Any (Unpresented Cheques / Uncredited Cheques):","${differenceAmount.toFixed(2)}"`);
    lines.push('');
    lines.push('"DETAILS OF UNPRESENTED CHEQUE / UNCREDITED CHEQUES"');
    lines.push('"Cheque No","Date","Account Head","Amount (Rs.)","Description"');
    manualCheques.forEach((c) => {
      lines.push(
        `"${c.chequeNo}","${c.date}","${(c.accountHead || '').replace(/"/g, '""')}","${parseNumericAmount(c.amount).toFixed(2)}","${c.description.replace(/"/g, '""')}"`
      );
    });
    lines.push(`"Total","","","${totalManualChequesAmount.toFixed(2)}",""`);
    lines.push('');
    lines.push('"e-CashBook & Voucher System developed by MKZ for institute 33028"');

    downloadCSVBlob(lines.join('\n'), `Accounting_Data_Entry_Reconciliation_${selectedAccountKey}_${asOnDate}.csv`);
  };

  const downloadCSVBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------------------
  // 7. SCOPED PRINT HANDLERS (CLEAN TEVTA REGISTER PAPER FORMAT)
  // ---------------------------------------------------------------------------
  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const gvtiwLogo = customGvtiwLogo || '/gvtiw-logo.jpg';
    const tevtaLogo = customTevtaLogo || '/tevta-logo.png';

    const sourceLabel =
      activeTab === 'RECON'
        ? `Source: Reports & Statements → Accounting Data Entry → Bank Reconciliation (${activeAccountConfig.short})`
        : activeTab === 'RECEIPTS'
        ? `Source: Reports & Statements → Accounting Data Entry → Date Wise Receipts (${activeAccountConfig.short})`
        : `Source: Reports & Statements → Accounting Data Entry → Date Wise Payments (${activeAccountConfig.short})`;

    let bodyContent: { headerSnippet: string; mainSnippet: string } = {
      headerSnippet: '',
      mainSnippet: '',
    };

    if (activeTab === 'RECEIPTS') {
      bodyContent = generateReceiptsPrintHTML();
    } else if (activeTab === 'PAYMENTS') {
      bodyContent = generatePaymentsPrintHTML();
    } else {
      bodyContent = generateReconciliationPrintHTML();
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeTab === 'RECON' ? 'Accounting Data Entry - Reconciliation' : activeTab === 'RECEIPTS' ? 'Accounting Data Entry - Date Wise Receipts' : 'Accounting Data Entry - Date Wise Payments'} - ${activeAccountConfig.short}</title>
        <style>
          @page {
            size: ${activeTab === 'RECON' ? 'landscape' : 'landscape'};
            margin: 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            color: #000;
            background: #fff;
            padding: 5px;
            margin: 0;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
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
            letter-spacing: 0.5px;
          }
          .source-label {
            font-size: 8pt;
            color: #475569;
            font-family: monospace;
            margin-top: 1px;
            font-weight: bold;
          }
          .report-title {
            font-size: 11pt;
            font-weight: bold;
            margin-top: 3px;
            text-transform: uppercase;
          }
          .sub-info {
            font-size: 9pt;
            margin-top: 2px;
            color: #333;
          }
          table.register-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-top: 8px;
          }
          table.register-table th, table.register-table td {
            border: 1px solid #000;
            padding: 4px 6px;
          }
          table.register-table th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
          }
          table.register-table td.num {
            text-align: right;
            font-family: 'Courier New', Courier, monospace;
            font-size: 9pt;
          }
          table.register-table td.center {
            text-align: center;
          }
          table.register-table tfoot td {
            font-weight: bold;
            background-color: #f8f8f8;
          }
          .balance-card-grid {
            margin-top: 14px;
            display: table;
            width: 100%;
            border-collapse: collapse;
          }
          .balance-row {
            display: table-row;
          }
          .balance-label {
            display: table-cell;
            padding: 4px 8px;
            font-weight: bold;
            font-size: 9pt;
            border-bottom: 1px dotted #888;
          }
          .balance-val {
            display: table-cell;
            padding: 4px 8px;
            text-align: right;
            font-weight: bold;
            font-family: 'Courier New', Courier, monospace;
            font-size: 10pt;
            border-bottom: 1px dotted #888;
            width: 180px;
          }
          .signatory-grid {
            margin-top: 30px;
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
            margin-bottom: 4px;
          }
          .sig-name {
            font-weight: bold;
            font-size: 9pt;
          }
          .sig-title {
            font-size: 8pt;
            color: #444;
          }
          .official-credit-footer {
            margin-top: 25px;
            padding-top: 6px;
            border-top: 1px dotted #94a3b8;
            font-size: 8pt;
            color: #64748b;
            font-family: monospace;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 75px; text-align: left;">
              <img src="${gvtiwLogo}" style="height: 55px; object-fit: contain;" onerror="this.style.display='none'" />
            </td>
            <td class="title-block">
              <div class="inst-name">${instituteName}</div>
              <div class="source-label">${sourceLabel}</div>
              ${bodyContent.headerSnippet}
            </td>
            <td style="width: 75px; text-align: right;">
              <img src="${tevtaLogo}" style="height: 50px; object-fit: contain;" onerror="this.style.display='none'" />
            </td>
          </tr>
        </table>
        ${bodyContent.mainSnippet}
        <div class="official-credit-footer">
          e-CashBook &amp; Voucher System developed by MKZ for institute 33028
        </div>
      </body>
      </html>
    `;

    printWin.document.write(fullHtml);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 500);
  };

  const generateSignatoryBlockHTML = () => `
    <div class="signatory-grid">
      ${OFFICIAL_SIGNATORIES.map(
        (sig) => `
        <div class="signatory-cell">
          <div style="height: 35px;"></div>
          <div class="sig-line"></div>
          <div class="sig-name">${sig.name}</div>
          <div class="sig-title">${sig.role} / ${sig.label}</div>
        </div>
      `
      ).join('')}
    </div>
  `;

  const generateReceiptsPrintHTML = () => {
    let rowsHtml = '';
    filteredReceipts.forEach((r, idx) => {
      rowsHtml += `
        <tr>
          <td class="center">${idx + 1}</td>
          <td class="center">${formatDateDDMMYY(r.date)}</td>
          <td class="center">${r.challanChequeNo}</td>
          <td>${r.headOfAccount}</td>
          <td class="num">${formatAmount(r.amount, 2)}</td>
          <td>${r.remarks}</td>
        </tr>
      `;
    });

    return {
      headerSnippet: `
        <div class="report-title">ACCOUNTING DATA ENTRY &bull; DATE WISE RECEIPTS IN ${activeAccountName.toUpperCase()} GRANTS</div>
        <div class="sub-info">Period: ${formatDateDDMMYY(fromDate)} to ${formatDateDDMMYY(toDate)} &bull; Bank: ${activeAccountConfig.bankName} &bull; A/C: ${activeAccountConfig.defaultAccountNo}</div>
      `,
      mainSnippet: `
        <table class="register-table">
          <thead>
            <tr>
              <th style="width: 40px;">Sr #</th>
              <th style="width: 90px;">Date of Receipt<br><span style="font-size: 7.5pt; font-weight: normal;">(dd-mm-yy)</span></th>
              <th style="width: 120px;">Challan/Cheque No</th>
              <th>Head of Account</th>
              <th style="width: 120px;">Amount (Rs.)</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" class="center">No receipts recorded for the selected period.</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; font-weight: bold;">Total Amount:</td>
              <td class="num" style="font-weight: bold;">Rs. ${formatAmount(totalReceiptsAmount, 2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        ${generateSignatoryBlockHTML()}
      `,
    };
  };

  const generatePaymentsPrintHTML = () => {
    let rowsHtml = '';
    filteredPayments.forEach((p, idx) => {
      const formattedRemarks = getFullPaymentRemarks(p);
      rowsHtml += `
        <tr>
          <td class="center">${idx + 1}</td>
          <td>${p.headOfAccount}</td>
          <td class="center">${formatDateDDMM(p.chequeDate)}</td>
          <td class="center">${p.chequeNo}</td>
          <td class="num">${formatAmount(p.totalBillAmount, 2)}</td>
          <td class="num">${formatAmount(p.incomeTax, 2)}</td>
          <td class="num">${formatAmount(p.praAmount, 2)}</td>
          <td class="num">${formatAmount(p.security, 2, true)}</td>
          <td class="num">${formatAmount(p.netAmountPaid, 2)}</td>
          <td>${formattedRemarks.replace(/\n/g, '<br>')}</td>
          <td>${p.paidTo}</td>
        </tr>
      `;
    });

    return {
      headerSnippet: `
        <div class="report-title">ACCOUNTING DATA ENTRY &bull; DATE WISE PAYMENTS FROM ${activeAccountName.toUpperCase()} GRANTS</div>
        <div class="sub-info">Period: ${formatDateDDMMYY(fromDate)} to ${formatDateDDMMYY(toDate)} &bull; Bank: ${activeAccountConfig.bankName} &bull; A/C: ${activeAccountConfig.defaultAccountNo}</div>
      `,
      mainSnippet: `
        <table class="register-table">
          <thead>
            <tr>
              <th style="width: 35px;">Sr #</th>
              <th>Non Salary Head of Account</th>
              <th style="width: 75px;">Cheque Date<br><span style="font-size: 7.5pt; font-weight: normal;">(dd-mm)</span></th>
              <th style="width: 85px;">Cheque No.</th>
              <th style="width: 90px;">Total Bill Amount</th>
              <th style="width: 80px;">Income Tax</th>
              <th style="width: 85px;">Sales Tax PRA 16%</th>
              <th style="width: 65px;">Security</th>
              <th style="width: 95px;">Net Amount Paid</th>
              <th>Remarks</th>
              <th>Paid to</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="11" class="center">No payments recorded for the selected period.</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; font-weight: bold;">Grand Total:</td>
              <td class="num">Rs. ${formatAmount(paymentsTotals.totalBill, 2)}</td>
              <td class="num">Rs. ${formatAmount(paymentsTotals.incomeTax, 2)}</td>
              <td class="num">Rs. ${formatAmount(paymentsTotals.praAmount, 2)}</td>
              <td class="num">${formatAmount(paymentsTotals.security, 2, true)}</td>
              <td class="num">Rs. ${formatAmount(paymentsTotals.netPaid, 2)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        ${generateSignatoryBlockHTML()}
      `,
    };
  };

  const generateReconciliationPrintHTML = () => {
    let monthRowsHtml = '';
    periodReconRows.forEach((r) => {
      monthRowsHtml += `
        <tr>
          <td class="center" style="font-weight: bold;">${r.monthShortLabel}</td>
          <td style="font-size: 7.5pt;">${r.receiptDesc}</td>
          <td class="num">${formatAmount(r.directReceipts, 2, true)}</td>
          <td class="num">${formatAmount(r.cmsdiNavttcShortCourse, 2, true)}</td>
          <td class="num">${formatAmount(r.otherReceiptsProfit, 2, true)}</td>
          <td class="num">${formatAmount(r.fromOtherBankAccount, 2, true)}</td>
          <td class="num" style="font-weight: bold; background: #fafafa;">${formatAmount(r.totalReceipt, 2)}</td>

          <td style="font-size: 7.5pt;">${r.paymentDesc}</td>
          <td class="num">${formatAmount(r.directPayments, 2, true)}</td>
          <td class="num">${formatAmount(r.otherPaymentsBankCharges, 2, true)}</td>
          <td class="num">${formatAmount(r.directPaymentsCMSDI, 2, true)}</td>
          <td class="num" style="font-weight: bold; background: #fafafa;">${formatAmount(r.totalPayment, 2)}</td>
        </tr>
      `;
    });

    let chequesRowsHtml = '';
    manualCheques.forEach((c) => {
      chequesRowsHtml += `
        <tr>
          <td class="center">${c.chequeNo}</td>
          <td class="center">${c.date}</td>
          <td>${c.accountHead || '—'}</td>
          <td class="num">${formatAmount(parseNumericAmount(c.amount), 2)}</td>
          <td>${c.description}</td>
        </tr>
      `;
    });

    return {
      headerSnippet: `
        <div class="report-title" style="margin-top: 4px; font-size: 11pt;">
          ACCOUNTING DATA ENTRY &bull; BANK RECONCILIATION STATEMENT
        </div>
        <div class="sub-info">
          HEAD OF ACCOUNT: ${activeAccountName} &bull; BANK NAME & ACCOUNT: ${activeAccountConfig.bankName} (${activeAccountConfig.defaultAccountNo}) &bull; Period: ${formatDateDDMMYY(fromDate)} to ${formatDateDDMMYY(toDate)} &bull; As on: ${asOnDate}
        </div>
        <div class="sub-info" style="margin-top: 3px; font-weight: bold;">
          ${periodOpeningLabel}: Rs. ${formatAmount(openingBalance, 2)}
        </div>
      `,
      mainSnippet: `
        <table class="register-table">
          <thead>
            <tr>
              <th colspan="7" style="background: #e8f4fd; border-bottom: 2px solid #000;">RECEIPTS</th>
              <th colspan="5" style="background: #fdf2e9; border-bottom: 2px solid #000;">PAYMENTS</th>
            </tr>
            <tr>
              <th style="width: 50px;">Month</th>
              <th>Description</th>
              <th style="width: 75px;">Direct Receipts (Budget)</th>
              <th style="width: 75px;">CMSDI/NAVTTC Short Course</th>
              <th style="width: 75px;">Other Receipts & (Bank Profit)</th>
              <th style="width: 75px;">From Other Bank Account</th>
              <th style="width: 80px;">Total Receipt</th>

              <th>Description</th>
              <th style="width: 75px;">Direct Payments</th>
              <th style="width: 75px;">Other Payments & (Bank Charges)</th>
              <th style="width: 75px;">Direct Payments CMSDI/NAVTTC</th>
              <th style="width: 80px;">Total Payment</th>
            </tr>
          </thead>
          <tbody>
            ${monthRowsHtml}
          </tbody>
          <tfoot>
            <tr style="font-weight: 900; background: #eef2f7;">
              <td class="center">Total</td>
              <td></td>
              <td class="num">${formatAmount(reconTotals.directReceipts, 2)}</td>
              <td class="num">${formatAmount(reconTotals.cmsdiNavttcShortCourse, 2)}</td>
              <td class="num">${formatAmount(reconTotals.otherReceiptsProfit, 2)}</td>
              <td class="num">${formatAmount(reconTotals.fromOtherBankAccount, 2)}</td>
              <td class="num" style="background: #e2e8f0;">Rs. ${formatAmount(reconTotals.totalReceipt, 2)}</td>

              <td></td>
              <td class="num">${formatAmount(reconTotals.directPayments, 2)}</td>
              <td class="num">${formatAmount(reconTotals.otherPaymentsBankCharges, 2)}</td>
              <td class="num">${formatAmount(reconTotals.directPaymentsCMSDI, 2)}</td>
              <td class="num" style="background: #e2e8f0;">Rs. ${formatAmount(reconTotals.totalPayment, 2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 15px; display: table; width: 100%;">
          <div style="display: table-cell; width: 50%; vertical-align: top; padding-right: 15px;">
            <div style="font-weight: 900; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 2px;">
              Reconciliation Summary
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
              <tr>
                <td style="padding: 3px 0;">Balance as per Cash Book at the End of Month/Period:</td>
                <td style="padding: 3px 0; text-align: right; font-weight: bold; font-family: 'Courier New', Courier, monospace;">
                  Rs. ${formatAmount(calculatedCashBookBalance, 2)}
                </td>
              </tr>
              <tr>
                <td style="padding: 3px 0;">Balance As per Bank Statement at the End of Month/Period:</td>
                <td style="padding: 3px 0; text-align: right; font-weight: bold; font-family: 'Courier New', Courier, monospace;">
                  Rs. ${formatAmount(bankStatementBalance, 2)}
                </td>
              </tr>
              <tr style="border-top: 1px solid #000; font-weight: bold;">
                <td style="padding: 3px 0;">Difference if Any (Unpresented Cheques / Uncredited Cheques):</td>
                <td style="padding: 3px 0; text-align: right; font-family: 'Courier New', Courier, monospace;">
                  Rs. ${formatAmount(differenceAmount, 2)}
                </td>
              </tr>
              <tr>
                <td style="padding: 3px 0; font-size: 8pt; color: #475569;">
                  ${
                    Math.abs(Math.abs(differenceAmount) - totalManualChequesAmount) < 0.05
                      ? '✓ Difference fully explained by unpresented cheques table'
                      : `<strong>Variance to explain:</strong> Rs. ${formatAmount(Math.abs(differenceAmount) - totalManualChequesAmount, 2)}`
                  }
                </td>
                <td style="padding: 3px 0; text-align: right; font-family: 'Courier New', Courier, monospace; font-size: 8pt; font-weight: bold; color: ${
                  Math.abs(Math.abs(differenceAmount) - totalManualChequesAmount) < 0.05 ? '#047857' : '#b45309'
                };">
                  ${
                    Math.abs(Math.abs(differenceAmount) - totalManualChequesAmount) < 0.05
                      ? 'Reconciled'
                      : `Rs. ${formatAmount(Math.abs(differenceAmount) - totalManualChequesAmount, 2)}`
                  }
                </td>
              </tr>
            </table>
          </div>

          <div style="display: table-cell; width: 50%; vertical-align: top;">
            <div style="font-weight: 900; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 2px;">
              DETAILS OF UNPRESENTED CHEQUE / UNCREDITED CHEQUES
            </div>
            <table class="register-table" style="font-size: 8pt; margin-top: 0;">
              <thead>
                <tr>
                  <th style="width: 65px;">Cheque No</th>
                  <th style="width: 60px;">Date</th>
                  <th style="width: 110px;">Account Head</th>
                  <th style="width: 75px;">Amount</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${chequesRowsHtml || '<tr><td colspan="5" class="center">No unpresented cheques recorded</td></tr>'}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align: right;">Total:</td>
                  <td class="num">Rs. ${formatAmount(totalManualChequesAmount, 2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        ${generateSignatoryBlockHTML()}
      `,
    };
  };

  // ---------------------------------------------------------------------------
  // 8. RENDER VIEW
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`rounded-2xl border transition-colors ${
        darkMode ? 'bg-[#0B132B] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } p-4 sm:p-6 space-y-6`}
    >
      {/* --------------------------------------------------------------- */}
      {/* INSTITUTIONAL LETTERHEAD & TITLE BANNER                          */}
      {/* --------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-700 text-cyan-400' : 'bg-slate-100 border-slate-200 text-cyan-700'
            }`}
          >
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold mb-0.5">
              Source: Reports &amp; Statements &rarr; {activeTab === 'RECON' ? 'Bank Reconciliation' : activeTab === 'RECEIPTS' ? `Date Wise Receipts (${activeAccountConfig.short})` : `Date Wise Payments (${activeAccountConfig.short})`}
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-wide uppercase">
              {instituteName}
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Accounting Data Entry &bull; TEVTA Official Cash Book &amp; Bank Reconciliation Register
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <button
            onClick={handleSyncLiveSheet}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title="Fetch live Cash Book data from Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Live Sync'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title="Export active register to Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            title="Print formal register in paper layout"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* CONTROLS BAR: BANK ACCOUNT, FY, PERIOD, AND AS-ON DATE          */}
      {/* --------------------------------------------------------------- */}
      <div
        className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Bank Account Dropdown */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Bank Account
          </label>
          <select
            value={selectedAccountKey}
            onChange={(e) => setSelectedAccountKey(e.target.value as BankAccountKey)}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-hidden ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-white focus:border-cyan-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
            }`}
          >
            {(Object.keys(BANK_ACCOUNT_LABELS) as BankAccountKey[]).map((key) => {
              const info = BANK_ACCOUNT_LABELS[key];
              return (
                <option key={key} value={key}>
                  {info.short} — {info.bankName}
                </option>
              );
            })}
          </select>
        </div>

        {/* Financial Year Selection */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Financial Year
          </label>
          <div className="flex gap-1.5">
            {(['2026-27', '2025-26'] as const).map((fy) => (
              <button
                key={fy}
                onClick={() => handleFYChange(fy)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                  selectedFY === fy
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {fy}
              </button>
            ))}
          </div>
        </div>

        {/* Day-Level Period (From → To) */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Period (From &rarr; To)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                if (e.target.value) setFromDate(e.target.value);
              }}
              className={`w-full px-2 py-1.5 rounded-xl text-xs font-mono font-bold border focus:outline-hidden ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-cyan-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
              }`}
              title="Select From Date"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                if (e.target.value) setToDate(e.target.value);
              }}
              className={`w-full px-2 py-1.5 rounded-xl text-xs font-mono font-bold border focus:outline-hidden ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-cyan-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
              }`}
              title="Select To Date"
            />
          </div>
        </div>

        {/* As On Date */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Reconciliation As On
          </label>
          <div className="relative">
            <input
              type="date"
              value={ddmmyyyyToIso(asOnDate)}
              onChange={(e) => handleAsOnDateChange(e.target.value)}
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono font-bold border focus:outline-hidden ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-cyan-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
              }`}
              title="Select reconciliation cut-off date"
            />
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Active As On: {asOnDate}</div>
        </div>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* 3 CLEAN TABS: RECONCILIATION | DATE WISE RECEIPTS | PAYMENTS    */}
      {/* --------------------------------------------------------------- */}
      <div className="flex border-b border-slate-300 dark:border-slate-700/80 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('RECON')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'RECON'
              ? 'border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/20'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('RECEIPTS')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'RECEIPTS'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Date Wise Receipts</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 font-bold">
            {filteredReceipts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'PAYMENTS'
              ? 'border-blue-700 text-blue-800 dark:border-purple-400 dark:text-purple-400 bg-blue-50 dark:bg-purple-950/20'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Date Wise Payments</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600/20 text-blue-900 dark:text-purple-300 font-bold">
            {filteredPayments.length}
          </span>
        </button>
      </div>

      {/* =============================================================== */}
      {/* TAB 1: DATE WISE RECEIPTS                                       */}
      {/* =============================================================== */}
      {activeTab === 'RECEIPTS' && (
        <div className="space-y-4 bg-white dark:bg-[#0B132B] p-4 sm:p-5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100">
          {/* Header Block matching official register requirements */}
          <div className="text-center py-2 border-b border-slate-200 dark:border-slate-700/60">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 dark:text-white">
              {instituteName}
            </h2>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mt-1">
              DATE WISE RECEIPTS IN {activeAccountName.toUpperCase()} GRANTS
            </h3>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs font-mono text-slate-600 dark:text-slate-400">
              <span>Account: {activeAccountConfig.defaultAccountNo}</span>
              <span>&bull;</span>
              <span>Period: {formatDateDDMMYY(fromDate)} to {formatDateDDMMYY(toDate)}</span>
            </div>
          </div>

          {/* Sub-bar: Single Month filter + Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Month Filter:</span>
              <select
                value={selectedSingleMonth}
                onChange={(e) => setSelectedSingleMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-mono border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-600"
              >
                <option value="ALL">All Months in Selected Period ({formatDateDDMMYY(fromDate)} to {formatDateDDMMYY(toDate)})</option>
                {activeMonthOptions
                  .filter((opt) => opt.key >= fromDate.substring(0, 7) && opt.key <= toDate.substring(0, 7))
                  .map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search receipts..."
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Table: Exact columns: Sr # | Date of Receipt (dd-mm-yy) | Challan/Cheque No | Head of Account | Amount (Rs.) | Remarks */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#0b2545] text-white border-b border-slate-700 font-bold uppercase text-[11px]">
                  <th className="p-2.5 text-center w-12 border-r border-slate-600">Sr #</th>
                  <th className="p-2.5 text-center w-36 border-r border-slate-600">
                    Date of Receipt <br />
                    <span className="text-[10px] font-normal lowercase opacity-90">(dd-mm-yy)</span>
                  </th>
                  <th className="p-2.5 text-center w-40 border-r border-slate-600">Challan/Cheque No</th>
                  <th className="p-2.5 text-left border-r border-slate-600 min-w-[200px]">Head of Account</th>
                  <th className="p-2.5 text-right w-36 border-r border-slate-600">Amount (Rs.)</th>
                  <th className="p-2.5 text-left min-w-[220px]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                      No receipt entries found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 even:bg-slate-50/70 dark:even:bg-slate-900/30 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-900 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {formatDateDDMMYY(r.date)}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                        {r.challanChequeNo}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                        {r.headOfAccount}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {formatAmount(r.amount, 2)}
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300 text-[11px]">{r.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#0b2545] text-white font-black border-t-2 border-slate-700 text-xs">
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider border-r border-slate-600">
                    Total Amount:
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-300 border-r border-slate-600 whitespace-nowrap text-sm">
                    Rs. {formatAmount(totalReceiptsAmount, 2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center border-t border-slate-200 dark:border-slate-800">
            {OFFICIAL_SIGNATORIES.map((sig) => (
              <div key={sig.name} className="border-t border-slate-400 dark:border-slate-600 pt-2">
                <strong className="block text-xs font-black text-slate-900 dark:text-white uppercase">
                  {sig.name}
                </strong>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold block">
                  {sig.role}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                  {sig.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 2: RECONCILIATION                                           */}
      {/* =============================================================== */}
      {activeTab === 'RECON' && (
        <div className="space-y-5 bg-white dark:bg-[#0B132B] p-4 sm:p-5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100">
          {/* Header Block matching physical TEVTA register */}
          <div className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-xs font-mono space-y-1.5 text-slate-800 dark:text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 font-bold uppercase text-slate-900 dark:text-white">
              <span>NAME OF DISTRICT: {districtName}</span>
              <span>&bull;</span>
              <span>INSTITUTE NAME: {instituteName}</span>
              <span>&bull;</span>
              <span>HEAD OF ACCOUNT: {activeAccountName}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-400 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>BANK NAME &amp; ACCOUNT: {activeAccountConfig.bankName} (A/C: {activeAccountConfig.defaultAccountNo})</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">As on:</span>
                <input
                  type="date"
                  value={ddmmyyyyToIso(asOnDate)}
                  onChange={(e) => handleAsOnDateChange(e.target.value)}
                  className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:border-cyan-600"
                  title="Change reconciliation As-On date"
                />
                <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">({asOnDate})</span>
              </div>
            </div>
          </div>

          {/* Title: Opening Balance as per Cash Book */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-cyan-950/30 border border-slate-300 dark:border-cyan-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-cyan-300">
              {periodOpeningLabel}
            </div>
            <div className="text-base font-mono font-black text-amber-700 dark:text-amber-300">
              Rs. {formatAmount(openingBalance, 2)}
            </div>
          </div>

          {/* Main Table: One row per month, two grouped sections */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <table className="w-full text-xs border-collapse">
              <thead>
                {/* Grouped Header row */}
                <tr>
                  <th
                    colSpan={7}
                    className="p-2.5 bg-[#0b2545] text-white uppercase font-black tracking-wider text-center border-r-2 border-b border-slate-600"
                  >
                    RECEIPTS
                  </th>
                  <th
                    colSpan={5}
                    className="p-2.5 bg-[#4a154b] text-white uppercase font-black tracking-wider text-center border-b border-slate-600"
                  >
                    PAYMENTS
                  </th>
                </tr>

                {/* Sub-column Headers */}
                <tr className="bg-[#1e293b] text-slate-100 border-b border-slate-600 font-bold text-[11px]">
                  {/* Receipts Subcolumns */}
                  <th className="p-2 text-center w-20 border-r border-slate-600">Month</th>
                  <th className="p-2 text-left min-w-[140px] border-r border-slate-600">Description</th>
                  <th className="p-2 text-right w-28 border-r border-slate-600 text-emerald-300">
                    Direct Receipts<br /><span className="text-[9px] font-normal opacity-90">(Budget)</span>
                  </th>
                  <th className="p-2 text-right w-28 border-r border-slate-600">
                    CMSDI/NAVTTC<br /><span className="text-[9px] font-normal opacity-90">Short Course</span>
                  </th>
                  <th className="p-2 text-right w-28 border-r border-slate-600">
                    Other Receipts<br /><span className="text-[9px] font-normal opacity-90">&amp; (Bank Profit)</span>
                  </th>
                  <th className="p-2 text-right w-28 border-r border-slate-600">
                    From Other<br /><span className="text-[9px] font-normal opacity-90">Bank Account</span>
                  </th>
                  <th className="p-2 text-right w-32 border-r-2 border-slate-600 bg-[#0f172a] text-emerald-300 font-black">
                    Total Receipt
                  </th>

                  {/* Payments Subcolumns */}
                  <th className="p-2 text-left min-w-[140px] border-r border-slate-600">Description</th>
                  <th className="p-2 text-right w-28 border-r border-slate-600 text-purple-200">
                    Direct Payments
                  </th>
                  <th className="p-2 text-right w-28 border-r border-slate-600">
                    Other Payments<br /><span className="text-[9px] font-normal opacity-90">&amp; (Bank Charges)</span>
                  </th>
                  <th className="p-2 text-right w-28 border-r border-slate-600">
                    Direct Payments<br /><span className="text-[9px] font-normal opacity-90">CMSDI/NAVTTC</span>
                  </th>
                  <th className="p-2 text-right w-32 bg-[#2a0e2b] text-purple-200 font-black">
                    Total Payment
                  </th>
                </tr>
              </thead>

              <tbody>
                {periodReconRows.map((r, idx) => (
                  <tr
                    key={r.monthKey}
                    className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 even:bg-slate-50/70 dark:even:bg-slate-900/30 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Receipts group cells */}
                    <td className="p-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                      {r.monthShortLabel}
                    </td>
                    <td className="p-2 text-slate-700 dark:text-slate-300 text-[11px] border-r border-slate-200 dark:border-slate-800 truncate max-w-[160px]" title={r.receiptDesc}>
                      {r.receiptDesc || '—'}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                      {formatAmount(r.directReceipts, 2, true)}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                      {formatAmount(r.cmsdiNavttcShortCourse, 2, true)}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                      {formatAmount(r.otherReceiptsProfit, 2, true)}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                      {formatAmount(r.fromOtherBankAccount, 2, true)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 border-r-2 border-slate-300 dark:border-slate-600 bg-emerald-50/60 dark:bg-emerald-950/10">
                      {formatAmount(r.totalReceipt, 2)}
                    </td>

                    {/* Payments group cells */}
                    <td className="p-2 text-slate-700 dark:text-slate-300 text-[11px] border-r border-slate-200 dark:border-slate-800 truncate max-w-[160px]" title={r.paymentDesc}>
                      {r.paymentDesc || '—'}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                      {formatAmount(r.directPayments, 2, true)}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                      {formatAmount(r.otherPaymentsBankCharges, 2, true)}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                      {formatAmount(r.directPaymentsCMSDI, 2, true)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-purple-800 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/10">
                      {formatAmount(r.totalPayment, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-[#0b2545] text-white font-black border-t-2 border-slate-700 text-xs">
                  <td className="p-2.5 text-center uppercase tracking-wider border-r border-slate-600">
                    Total
                  </td>
                  <td className="p-2.5 border-r border-slate-600"></td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-600">
                    {formatAmount(reconTotals.directReceipts, 2)}
                  </td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-600">
                    {formatAmount(reconTotals.cmsdiNavttcShortCourse, 2)}
                  </td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-600">
                    {formatAmount(reconTotals.otherReceiptsProfit, 2)}
                  </td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-600">
                    {formatAmount(reconTotals.fromOtherBankAccount, 2)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-300 border-r-2 border-slate-600 bg-slate-900/60">
                    Rs. {formatAmount(reconTotals.totalReceipt, 2)}
                  </td>

                  <td className="p-2.5 border-r border-slate-600"></td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-600">
                    {formatAmount(reconTotals.directPayments, 2)}
                  </td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-600">
                    {formatAmount(reconTotals.otherPaymentsBankCharges, 2)}
                  </td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-600">
                    {formatAmount(reconTotals.directPaymentsCMSDI, 2)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-purple-200 bg-slate-900/60">
                    Rs. {formatAmount(reconTotals.totalPayment, 2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BOTTOM RECONCILIATION SUMMARY & MANUAL ENTRY SECTION          */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Left: Summary Equations */}
            <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 space-y-3.5 shadow-2xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                Period Reconciliation Equations
              </h4>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Balance as per Cash Book at the End of Month/Period:</span>
                <span className="font-mono font-bold text-sm text-cyan-700 dark:text-cyan-300">
                  Rs. {formatAmount(calculatedCashBookBalance, 2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Balance As per Bank Statement at End of Period:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-mono">Rs.</span>
                  {isEffectiveUnlocked ? (
                    <GroupedAmountInput
                      value={editingBankBalanceStr}
                      onChange={(numVal, strVal) => {
                        setEditingBankBalanceStr(strVal);
                        setBankStatementBalance(numVal);
                      }}
                      onCommit={(numVal) => {
                        commitBankBalance(numVal);
                      }}
                      className="w-36 px-2.5 py-1 text-right font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 focus:outline-hidden focus:border-cyan-600"
                      title="Manual entry from physical bank statement with thousands grouping (Press Enter to save)"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestUnlock}
                      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition-colors"
                      title="Locked: Click to enter Admin PIN to edit"
                    >
                      <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300">
                        {formatNumberLive(editingBankBalanceStr) || formatAmount(bankStatementBalance, 2)}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 font-bold">
                <span className="text-slate-800 dark:text-slate-300">Difference if Any (Unpresented / Uncredited Cheques):</span>
                <span
                  className={`font-mono font-black text-sm ${
                    Math.abs(differenceAmount) < 0.01
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  Rs. {formatAmount(differenceAmount, 2)}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                {Math.abs(Math.abs(differenceAmount) - totalManualChequesAmount) < 0.05 ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                    <Check className="w-4 h-4" />
                    <span>✓ Difference fully explained by unpresented cheques table</span>
                  </div>
                ) : (
                  <div className="text-amber-700 dark:text-amber-400 font-bold">
                    Variance to explain: Rs. {formatAmount(Math.abs(differenceAmount) - totalManualChequesAmount, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Right: DETAILS OF UNPRESENTED CHEQUE / UNCREDITED CHEQUES (MANUAL DATA ENTRY) */}
            <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300">
                    DETAILS OF UNPRESENTED CHEQUE / UNCREDITED CHEQUES
                  </h4>
                  {!isEffectiveUnlocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  )}
                </div>
                {isEffectiveUnlocked ? (
                  <button
                    onClick={handleAddManualChequeRow}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Row</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRequestUnlock}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Unlock with Admin PIN to add or edit cheques"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Unlock to Edit</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-700">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0b2545] text-white border-b border-slate-600 font-bold text-[10px] uppercase">
                      <th className="p-1.5 text-center w-20">Cheque No</th>
                      <th className="p-1.5 text-center w-36 min-w-[130px]">Date</th>
                      <th className="p-1.5 text-left min-w-[170px]">Account Head</th>
                      <th className="p-1.5 text-right w-24">Amount</th>
                      <th className="p-1.5 text-left min-w-[140px]">Description</th>
                      <th className="p-1.5 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualCheques.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500 text-[11px] bg-white dark:bg-slate-900/40">
                          No manual unpresented cheques entered. {isEffectiveUnlocked ? 'Click "Add Row" to enter items.' : 'Unlock to enter items.'}
                        </td>
                      </tr>
                    ) : (
                      manualCheques.map((c) => (
                        <tr key={c.id} className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                          <td className="p-1">
                            <input
                              type="text"
                              disabled={!isEffectiveUnlocked}
                              value={c.chequeNo}
                              onChange={(e) => handleUpdateManualCheque(c.id, 'chequeNo', e.target.value)}
                              placeholder="Cheque #"
                              className={`w-full px-1.5 py-0.5 rounded border text-xs font-mono text-slate-900 dark:text-white ${
                                !isEffectiveUnlocked
                                  ? 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-80 cursor-not-allowed'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                              }`}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="date"
                              disabled={!isEffectiveUnlocked}
                              value={c.date ? (c.date.includes('-') && c.date.split('-')[0].length === 4 ? c.date : ddmmyyyyToIso(c.date)) : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const ddmmyyyy = val ? isoToDdmmyyyy(val) : '';
                                handleUpdateManualCheque(c.id, 'date', ddmmyyyy);
                              }}
                              className={`w-full min-w-[125px] px-2 py-0.5 rounded border text-xs font-mono text-center text-slate-900 dark:text-white font-medium ${
                                !isEffectiveUnlocked
                                  ? 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-80 cursor-not-allowed'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:border-cyan-500'
                              }`}
                              title="Select Cheque Date"
                            />
                          </td>
                          <td className="p-1">
                            <SearchableAccountHeadCell
                              value={c.accountHead || ''}
                              disabled={!isEffectiveUnlocked}
                              availableHeads={availableHeadsForBank}
                              darkMode={darkMode}
                              onChange={(val) => handleUpdateManualCheque(c.id, 'accountHead', val)}
                            />
                          </td>
                          <td className="p-1">
                            <GroupedAmountInput
                              disabled={!isEffectiveUnlocked}
                              value={c.amount}
                              onChange={(numVal) => {
                                handleUpdateManualCheque(c.id, 'amount', numVal);
                              }}
                              onCommit={(numVal) => {
                                handleUpdateManualCheque(c.id, 'amount', numVal);
                              }}
                              placeholder="0.00"
                              className={`w-full px-1.5 py-0.5 rounded border text-xs font-mono text-right text-slate-900 dark:text-white font-bold ${
                                !isEffectiveUnlocked
                                  ? 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-80 cursor-not-allowed'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                              }`}
                              title="Enter cheque amount (e.g. 1,765,919) • Press Enter to save"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              disabled={!isEffectiveUnlocked}
                              value={c.description}
                              onChange={(e) => handleUpdateManualCheque(c.id, 'description', e.target.value)}
                              placeholder="Payee / Narration"
                              className={`w-full px-1.5 py-0.5 rounded border text-xs text-slate-900 dark:text-white ${
                                !isEffectiveUnlocked
                                  ? 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-80 cursor-not-allowed'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                              }`}
                            />
                          </td>
                          <td className="p-1 text-center">
                            {isEffectiveUnlocked && (
                              <button
                                onClick={() => handleRemoveManualCheque(c.id)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer p-0.5 transition-colors"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#0b2545] text-white font-bold text-[11px]">
                      <td colSpan={3} className="p-1.5 text-right uppercase">
                        Total Unpresented:
                      </td>
                      <td className="p-1.5 text-right font-mono text-emerald-300">
                        Rs. {formatAmount(totalManualChequesAmount, 2)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center border-t border-slate-200 dark:border-slate-800">
            {OFFICIAL_SIGNATORIES.map((sig) => (
              <div key={sig.name} className="border-t border-slate-400 dark:border-slate-600 pt-2">
                <strong className="block text-xs font-black text-slate-900 dark:text-white uppercase">
                  {sig.name}
                </strong>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold block">
                  {sig.role}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                  {sig.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* TAB 3: DATE WISE PAYMENTS                                       */}
      {/* =============================================================== */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-4 bg-white dark:bg-[#0B132B] p-4 sm:p-5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100">
          {/* Header Block matching physical TEVTA register requirements */}
          <div className="text-center py-2 border-b border-slate-200 dark:border-slate-700/60">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 dark:text-white">
              {instituteName}
            </h2>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-purple-400 mt-1">
              DATE WISE PAYMENTS FROM {activeAccountName.toUpperCase()} GRANTS
            </h3>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs font-mono text-slate-600 dark:text-slate-400">
              <span>Account: {activeAccountConfig.defaultAccountNo}</span>
              <span>&bull;</span>
              <span>Period: {formatDateDDMMYY(fromDate)} to {formatDateDDMMYY(toDate)}</span>
            </div>
          </div>

          {/* Sub-bar: Single Month filter + Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Month Filter:</span>
              <select
                value={selectedSingleMonth}
                onChange={(e) => setSelectedSingleMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-mono border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-600"
              >
                <option value="ALL">All Months in Selected Period ({formatDateDDMMYY(fromDate)} to {formatDateDDMMYY(toDate)})</option>
                {activeMonthOptions
                  .filter((opt) => opt.key >= fromDate.substring(0, 7) && opt.key <= toDate.substring(0, 7))
                  .map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search payments..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-blue-600"
              />
            </div>
          </div>

          {/* Table: 11 exact columns matching paper register:
              Sr # | Non Salary Head of Account | Cheque Date (dd-mm) | Cheque No. (with PAF button) |
              Total Bill Amount | Income Tax | Sales Tax PRA 16% | Security | Net Amount Paid |
              Remarks (with Bill # & Date) | Paid to
          */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#0b2545] text-white border-b border-slate-600 font-bold uppercase text-[11px]">
                  <th className="p-2.5 text-center w-10 border-r border-slate-600">Sr #</th>
                  <th className="p-2.5 text-left border-r border-slate-600 min-w-[180px]">
                    Non Salary Head of Account
                  </th>
                  <th className="p-2.5 text-center w-24 border-r border-slate-600">
                    Cheque Date<br />
                    <span className="text-[10px] font-normal lowercase opacity-90">(dd-mm)</span>
                  </th>
                  <th className="p-2.5 text-center w-36 border-r border-slate-600">Cheque No.</th>
                  <th className="p-2.5 text-right w-28 border-r border-slate-600">Total Bill Amount</th>
                  <th className="p-2.5 text-right w-24 border-r border-slate-600">Income Tax</th>
                  <th className="p-2.5 text-right w-28 border-r border-slate-600">Sales Tax PRA 16%</th>
                  <th className="p-2.5 text-right w-20 border-r border-slate-600">Security</th>
                  <th className="p-2.5 text-right w-28 border-r border-slate-600 text-cyan-200">
                    Net Amount Paid
                  </th>
                  <th className="p-2.5 text-left min-w-[200px] border-r border-slate-600">Remarks</th>
                  <th className="p-2.5 text-left min-w-[140px]">Paid to</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                      No payment entries found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 even:bg-slate-50/70 dark:even:bg-slate-900/30 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                        {p.headOfAccount}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-800 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {formatDateDDMM(p.chequeDate)}
                      </td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{p.chequeNo}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenPAF(p)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-800/80 border border-blue-300 dark:border-blue-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Open Payment Approval Form (PAF)"
                          >
                            <FileText className="w-3 h-3" />
                            <span>PAF</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {formatAmount(p.totalBillAmount, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-800 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {formatAmount(p.incomeTax, 2, true)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-800 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {formatAmount(p.praAmount, 2, true)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        {formatAmount(p.security, 2, true)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-900 dark:text-purple-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {formatAmount(p.netAmountPaid, 2)}
                      </td>
                      <td className="p-2.5 text-slate-800 dark:text-slate-300 text-[11px] border-r border-slate-200 dark:border-slate-800">
                        {getFullPaymentRemarks(p)}
                      </td>
                      <td className="p-2.5 text-slate-800 dark:text-slate-300 text-[11px] font-semibold">{p.paidTo}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#0b2545] text-white font-black border-t-2 border-slate-700 text-xs">
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider border-r border-slate-600">
                    Grand Total:
                  </td>
                  <td className="p-3 text-right font-mono border-r border-slate-600 whitespace-nowrap">
                    Rs. {formatAmount(paymentsTotals.totalBill, 2)}
                  </td>
                  <td className="p-3 text-right font-mono border-r border-slate-600 whitespace-nowrap">
                    Rs. {formatAmount(paymentsTotals.incomeTax, 2)}
                  </td>
                  <td className="p-3 text-right font-mono border-r border-slate-600 whitespace-nowrap">
                    Rs. {formatAmount(paymentsTotals.praAmount, 2)}
                  </td>
                  <td className="p-3 text-right font-mono border-r border-slate-600">
                    {formatAmount(paymentsTotals.security, 2, true)}
                  </td>
                  <td className="p-3 text-right font-mono text-cyan-200 border-r border-slate-600 whitespace-nowrap">
                    Rs. {formatAmount(paymentsTotals.netPaid, 2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center border-t border-slate-200 dark:border-slate-800">
            {OFFICIAL_SIGNATORIES.map((sig) => (
              <div key={sig.name} className="border-t border-slate-400 dark:border-slate-600 pt-2">
                <strong className="block text-xs font-black text-slate-900 dark:text-white uppercase">
                  {sig.name}
                </strong>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold block">
                  {sig.role}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                  {sig.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Approval Form (PAF) Modal */}
      {selectedVoucherForPAF && (
        <PaymentApprovalForm
          voucher={selectedVoucherForPAF}
          isModal={true}
          onClose={() => setSelectedVoucherForPAF(null)}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          customGopLogo={customGopLogo}
        />
      )}

      {/* Admin Security PIN Unlock Modal (Local Fallback) */}
      {showLocalPinModal && !isEffectiveUnlocked && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowLocalPinModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 cursor-pointer font-bold text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
            <PinLockScreen
              darkMode={darkMode}
              customGvtiwLogo={customGvtiwLogo}
              title="Accounting Data Entry Authentication"
              onUnlock={(pin) => {
                handleLocalPinSuccess(pin);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DirectorReconciliationReport;
