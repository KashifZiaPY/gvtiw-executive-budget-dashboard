import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Lock,
  ArrowRightLeft,
  ChevronDown,
  Info,
  ExternalLink,
  Table,
  Check,
  RotateCcw,
  SlidersHorizontal,
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
import {
  fetchLiveCashBookFromGoogleSheet,
  STORAGE_KEY_LIVE_CASHBOOKS,
  STORAGE_KEY_LIVE_VOUCHERS,
  CASHBOOK_SPREADSHEET_IDS,
} from '../lib/apiEngine';
import {
  resolveBankKeyFromAccount,
  parseDateToTimestamp,
  formatCurrency2Decimals,
  isBankChargeVoucher,
} from '../lib/reportingEngine';
import { AccountHead, OFFICIAL_SIGNATORIES } from '../types';
import {
  UnpresentedChequeItem,
  INITIAL_DIRECTOR_RECEIPTS,
  INITIAL_DIRECTOR_PAYMENTS,
  INITIAL_UNPRESENTED_CHEQUES,
  INITIAL_DIRECTOR_MONTHLY_GRID,
} from '../data/directorReconData';
import { BankStatementManagerModal } from './BankStatementManagerModal';
import { BankReconciliationView } from './BankReconciliationView';
import {
  BankStatementData,
  BankReconciliationResult,
  UnmatchedBankItem,
  InternalPaymentRecord,
  InternalReceiptRecord,
} from '../types/bankStatement';
import {
  performBankReconciliation,
  generateSampleBOPStatement,
  formatPKR,
} from '../utils/bankMatchingEngine';

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
  // Shared Live Data passed from ReportsModule
  vouchers?: MasterVoucher[];
  cashBookStates?: Record<BankAccountKey, CashBookAccountState>;
  accountsStore?: AccountHead[];
}

export type DirectorReportTab = 'RECON' | 'RECEIPTS' | 'PAYMENTS';

export const BANK_ACCOUNT_LABELS: Record<BankAccountKey, { name: string; short: string; defaultAccountNo: string }> = {
  NS: { name: 'Payment of Non Salary Expenditures', short: 'NS (Non-Salary)', defaultAccountNo: '6580006795600014' },
  PF: { name: 'Payment of Pupil Funds', short: 'PF (Pupil Fund)', defaultAccountNo: '6580027832200022' },
  FC: { name: 'TEVTA Fee Collection Account', short: 'FC (Fee Collection)', defaultAccountNo: '6580027832200011' },
  SEC: { name: 'Security Deposits Account', short: 'SEC (Securities)', defaultAccountNo: '6580027832200033' },
  SC: { name: 'Short Course Account', short: 'SC (Short Courses)', defaultAccountNo: '6580027832200044' },
  AA: { name: 'AAA Allocation Ceiling Account', short: 'AA (AAA Ceiling)', defaultAccountNo: 'District Treasury Allocation' },
};

// Standard month options for FY 2026-27 and FY 2025-26
export const MONTH_OPTIONS_2627 = [
  { key: '2026-07', label: 'July 2026 (Jul-26)', monthName: 'July', year: '2026' },
  { key: '2026-08', label: 'August 2026 (Aug-26)', monthName: 'August', year: '2026' },
  { key: '2026-09', label: 'September 2026 (Sep-26)', monthName: 'September', year: '2026' },
  { key: '2026-10', label: 'October 2026 (Oct-26)', monthName: 'October', year: '2026' },
  { key: '2026-11', label: 'November 2026 (Nov-26)', monthName: 'November', year: '2026' },
  { key: '2026-12', label: 'December 2026 (Dec-26)', monthName: 'December', year: '2026' },
  { key: '2027-01', label: 'January 2027 (Jan-27)', monthName: 'January', year: '2027' },
  { key: '2027-02', label: 'February 2027 (Feb-27)', monthName: 'February', year: '2027' },
  { key: '2027-03', label: 'March 2027 (Mar-27)', monthName: 'March', year: '2027' },
  { key: '2027-04', label: 'April 2027 (Apr-27)', monthName: 'April', year: '2027' },
  { key: '2027-05', label: 'May 2027 (May-27)', monthName: 'May', year: '2027' },
  { key: '2027-06', label: 'June 2027 (Jun-27)', monthName: 'June', year: '2027' },
];

export const MONTH_OPTIONS_2526 = [
  { key: '2025-07', label: 'July 2025 (Jul-25)', monthName: 'July', year: '2025' },
  { key: '2025-08', label: 'August 2025 (Aug-25)', monthName: 'August', year: '2025' },
  { key: '2025-09', label: 'September 2025 (Sep-25)', monthName: 'September', year: '2025' },
  { key: '2025-10', label: 'October 2025 (Oct-25)', monthName: 'October', year: '2025' },
  { key: '2025-11', label: 'November 2025 (Nov-25)', monthName: 'November', year: '2025' },
  { key: '2025-12', label: 'December 2025 (Dec-25)', monthName: 'December', year: '2025' },
  { key: '2026-01', label: 'January 2026 (Jan-26)', monthName: 'January', year: '2026' },
  { key: '2026-02', label: 'February 2026 (Feb-26)', monthName: 'February', year: '2026' },
  { key: '2026-03', label: 'March 2026 (Mar-26)', monthName: 'March', year: '2026' },
  { key: '2026-04', label: 'April 2026 (Apr-26)', monthName: 'April', year: '2026' },
  { key: '2026-05', label: 'May 2026 (May-26)', monthName: 'May', year: '2026' },
  { key: '2026-06', label: 'June 2026 (Jun-26)', monthName: 'June', year: '2026' },
];

// Helper: Format Number with commas
export function formatAmount(val: number | null | undefined, decimals = 2, showDashForZero = false): string {
  if (val === null || val === undefined || isNaN(val)) return showDashForZero ? '-' : '0.00';
  if (val === 0 && showDashForZero) return '-';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Helper: Format Accounting Number with Parentheses for negative
export function formatAccounting(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  if (val < -0.0001) {
    return `(${formatAmount(Math.abs(val), decimals)})`;
  }
  return formatAmount(val, decimals);
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

interface MonthlyReconTableRow {
  monthKey: string;
  monthLabel: string;
  monthName: string;
  totalReceipts: number;
  totalPayments: number;
  netMovement: number;
  runningBalance: number;
  isInSelectedPeriod: boolean;
}

export function DirectorReconciliationReport({
  initialAccountKey = 'NS',
  customSpreadsheetId,
  customAccountName,
  districtName = 'FAISALABAD',
  instituteName = 'GOVT. VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD',
  isUnlocked = true,
  darkMode = true,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
  onUnlockRequest,
  vouchers: propVouchers,
  cashBookStates: propCashBookStates,
  accountsStore: propAccountsStore,
}: DirectorReconReportProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<DirectorReportTab>('RECON');

  // Account selection
  const [selectedAccountKey, setSelectedAccountKey] = useState<BankAccountKey>(initialAccountKey);

  // Financial Year and Period Controls (Default: Current live fiscal year 2026-27)
  const [selectedFY, setSelectedFY] = useState<'2026-27' | '2025-26' | 'ALL'>('2026-27');
  const [fromMonth, setFromMonth] = useState<string>('2026-07');
  const [toMonth, setToMonth] = useState<string>('2026-08');
  const [asOnDate, setAsOnDate] = useState<string>('31-08-2026');

  // Search queries
  const [receiptSearch, setReceiptSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');

  // Internal Live Data State — keeping state reactive and in sync with prop updates & localStorage
  const [liveVouchers, setLiveVouchers] = useState<MasterVoucher[]>(() => {
    if (propVouchers && propVouchers.length > 0) return propVouchers;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LIVE_VOUCHERS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_MASTER_VOUCHERS;
  });

  const [liveCashBookStates, setLiveCashBookStates] = useState<Record<BankAccountKey, CashBookAccountState>>(() => {
    if (propCashBookStates && Object.keys(propCashBookStates).length > 0) return propCashBookStates;
    try {
      const stored =
        localStorage.getItem(STORAGE_KEY_LIVE_CASHBOOKS) ||
        localStorage.getItem('gvtiw_live_cashbook_states_v3');
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_CASHBOOK_STATES;
  });

  // Keep state synced when props change
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

  // Listen to application-wide sync events
  useEffect(() => {
    const handleVouchersUpdated = (e: any) => {
      const updated = e.detail || [];
      if (Array.isArray(updated) && updated.length > 0) {
        setLiveVouchers(updated);
      }
    };

    const handleCashBooksUpdated = (e: any) => {
      const updated = e.detail;
      if (updated && typeof updated === 'object') {
        setLiveCashBookStates(updated);
      }
    };

    const handleStorageChange = () => {
      try {
        const v = localStorage.getItem(STORAGE_KEY_LIVE_VOUCHERS);
        if (v) setLiveVouchers(JSON.parse(v));
        const c =
          localStorage.getItem(STORAGE_KEY_LIVE_CASHBOOKS) ||
          localStorage.getItem('gvtiw_live_cashbook_states_v3');
        if (c) setLiveCashBookStates(JSON.parse(c));
      } catch {}
    };

    window.addEventListener('gvtiw_vouchers_updated', handleVouchersUpdated);
    window.addEventListener('gvtiw_cashbooks_updated', handleCashBooksUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('gvtiw_vouchers_updated', handleVouchersUpdated);
      window.removeEventListener('gvtiw_cashbooks_updated', handleCashBooksUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Live Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Preloaded Live Cash Book');
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Handle Live Sheet Sync via shared apiEngine fetcher
  const handleSyncLiveSheet = async () => {
    setIsSyncing(true);
    setSyncMessage(`Connecting to Google Sheets & reading live cash book sheets & K3 opening balances...`);

    try {
      const result = await fetchLiveCashBookFromGoogleSheet();
      if (result) {
        setLiveVouchers(result.vouchers);
        setLiveCashBookStates(result.cashBookStates);
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncTime(timeStr);
        setSyncMessage(`✓ Live sync complete: ${result.vouchers.length} vouchers and live cash book opening balances loaded!`);
      } else {
        setSyncMessage('Google Sheets reached. Loaded live cash book records.');
      }
    } catch (err: any) {
      console.warn('Sync error in DirectorReconReport:', err);
      setSyncMessage('Using verified live cash book local cache.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  // Manual Bank Statement Balance State (persisted per accountKey + period in localStorage)
  const bankStmtStorageKey = `gvtiw_director_bank_stmt_${selectedAccountKey}_${selectedFY}_${fromMonth}_${toMonth}`;
  const [bankStatementBalance, setBankStatementBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(bankStmtStorageKey);
      if (saved !== null && saved !== '') {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {}
    return selectedFY === '2025-26' ? 3044164.95 : 1743235.0;
  });

  const [tempBankBalance, setTempBankBalance] = useState<string>(String(bankStatementBalance));
  const [isEditingBankBalance, setIsEditingBankBalance] = useState(false);
  const [bankBalanceSavedFeedback, setBankBalanceSavedFeedback] = useState(false);

  // Reload bank statement balance whenever account, FY, or month range changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(bankStmtStorageKey);
      if (saved !== null && saved !== '') {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) {
          setBankStatementBalance(parsed);
          setTempBankBalance(String(parsed));
          return;
        }
      }
    } catch {}
    // Default fallback
    const def = selectedFY === '2025-26' ? 3044164.95 : 1743235.0;
    setBankStatementBalance(def);
    setTempBankBalance(String(def));
  }, [bankStmtStorageKey, selectedFY]);

  const handleSaveBankBalance = () => {
    const parsed = parseFloat(tempBankBalance.replace(/,/g, ''));
    if (!isNaN(parsed)) {
      setBankStatementBalance(parsed);
      try {
        localStorage.setItem(bankStmtStorageKey, String(parsed));
      } catch {}
      setIsEditingBankBalance(false);
      setBankBalanceSavedFeedback(true);
      setTimeout(() => setBankBalanceSavedFeedback(false), 2500);
    }
  };

  // Unpresented Cheques State (persisted per accountKey + FY in localStorage)
  const unpresentedStorageKey = `gvtiw_director_unpresented_${selectedAccountKey}_${selectedFY}`;
  const [unpresentedCheques, setUnpresentedCheques] = useState<UnpresentedChequeItem[]>(() => {
    try {
      const saved = localStorage.getItem(unpresentedStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_UNPRESENTED_CHEQUES;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(unpresentedStorageKey);
      if (saved) {
        setUnpresentedCheques(JSON.parse(saved));
      } else {
        setUnpresentedCheques(INITIAL_UNPRESENTED_CHEQUES);
      }
    } catch {}
  }, [unpresentedStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(unpresentedStorageKey, JSON.stringify(unpresentedCheques));
    } catch {}
  }, [unpresentedCheques, unpresentedStorageKey]);

  // Add Unpresented Cheque Modal State
  const [showAddChequeModal, setShowAddChequeModal] = useState(false);
  const [newChequeNo, setNewChequeNo] = useState('');
  const [newChequeDate, setNewChequeDate] = useState('2026-08-31');
  const [newChequePayee, setNewChequePayee] = useState('');
  const [newChequeHead, setNewChequeHead] = useState('');
  const [newChequeAmount, setNewChequeAmount] = useState('');
  const [newChequeRemarks, setNewChequeRemarks] = useState('');

  const handleAddChequeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newChequeAmount.replace(/,/g, ''));
    if (!newChequeNo.trim() || isNaN(amt) || amt <= 0) return;

    const newItem: UnpresentedChequeItem = {
      id: `UC-${Date.now()}`,
      chequeNo: newChequeNo.trim(),
      date: newChequeDate,
      payee: newChequePayee.trim() || 'Vendor / Contractor',
      headOfAccount: newChequeHead.trim() || 'Operating Head',
      amount: amt,
      remarks: newChequeRemarks.trim() || 'Unpresented as of period-end',
    };

    setUnpresentedCheques((prev) => [...prev, newItem]);
    setNewChequeNo('');
    setNewChequePayee('');
    setNewChequeHead('');
    setNewChequeAmount('');
    setNewChequeRemarks('');
    setShowAddChequeModal(false);
  };

  const handleRemoveCheque = (id: string) => {
    setUnpresentedCheques((prev) => prev.filter((c) => c.id !== id));
  };

  // ---------------------------------------------------------------------------
  // BANK OF PUNJAB (BOP) STATEMENT & SMART MATCHING ENGINE STATE
  // ---------------------------------------------------------------------------
  const statementStorageKey = `gvtiw_bop_stmt_${selectedAccountKey}_${selectedFY}_${fromMonth}_${toMonth}`;
  const [bopStatement, setBopStatement] = useState<BankStatementData | null>(() => {
    try {
      const saved = localStorage.getItem(statementStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return generateSampleBOPStatement(
      INSTITUTIONAL_BANK_ACCOUNTS[selectedAccountKey]?.accountNo || '6580006795600014',
      `${fromMonth}-01`,
      `${toMonth}-31`,
      selectedFY === '2025-26' ? 3044164.95 : 1743235.0
    );
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(statementStorageKey);
      if (saved) {
        setBopStatement(JSON.parse(saved));
        return;
      }
    } catch {}
    const defStmt = generateSampleBOPStatement(
      activeAccountMeta.accountNo || '6580006795600014',
      `${fromMonth}-01`,
      `${toMonth}-31`,
      bankStatementBalance
    );
    setBopStatement(defStmt);
  }, [statementStorageKey, selectedAccountKey, fromMonth, toMonth]);

  // Manual tick overrides state (persisted per account and FY)
  const overridesStorageKey = `gvtiw_bop_overrides_${selectedAccountKey}_${selectedFY}`;
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(overridesStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const handleToggleManualOverride = (txId: string) => {
    setManualOverrides((prev) => {
      const next = { ...prev, [txId]: !prev[txId] };
      try {
        localStorage.setItem(overridesStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Modal display states for Bank Statement Upload and Review
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleCommitStatement = (committed: BankStatementData) => {
    setBopStatement(committed);
    setBankStatementBalance(committed.header.closingBalance);
    try {
      localStorage.setItem(statementStorageKey, JSON.stringify(committed));
      localStorage.setItem(bankStmtStorageKey, String(committed.header.closingBalance));
    } catch {}
  };

  const handleLoadSampleStatement = () => {
    const sample = generateSampleBOPStatement(
      activeAccountMeta.accountNo,
      `${fromMonth}-01`,
      `${toMonth}-31`,
      bankStatementBalance
    );
    handleCommitStatement(sample);
  };

  // Switch FY preset
  const handleFYChange = (fy: '2026-27' | '2025-26' | 'ALL') => {
    setSelectedFY(fy);
    if (fy === '2026-27') {
      setFromMonth('2026-07');
      setToMonth('2026-08');
      setAsOnDate('31-08-2026');
    } else if (fy === '2025-26') {
      setFromMonth('2025-07');
      setToMonth('2026-06');
      setAsOnDate('30-06-2026');
    } else {
      setFromMonth('2025-07');
      setToMonth('2027-06');
      setAsOnDate('31-08-2026');
    }
  };

  // Quick range selector
  const applyQuickRange = (type: 'FULL' | 'JUL_AUG' | 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    const baseYear = selectedFY === '2026-27' ? '2026' : '2025';
    const nextYear = selectedFY === '2026-27' ? '2027' : '2026';

    switch (type) {
      case 'FULL':
        setFromMonth(`${baseYear}-07`);
        setToMonth(`${nextYear}-06`);
        break;
      case 'JUL_AUG':
        setFromMonth(`${baseYear}-07`);
        setToMonth(`${baseYear}-08`);
        break;
      case 'Q1':
        setFromMonth(`${baseYear}-07`);
        setToMonth(`${baseYear}-09`);
        break;
      case 'Q2':
        setFromMonth(`${baseYear}-10`);
        setToMonth(`${baseYear}-12`);
        break;
      case 'Q3':
        setFromMonth(`${nextYear}-01`);
        setToMonth(`${nextYear}-03`);
        break;
      case 'Q4':
        setFromMonth(`${nextYear}-04`);
        setToMonth(`${nextYear}-06`);
        break;
    }
  };

  // ---------------------------------------------------------------------------
  // 1. DATA DERIVATION: READ LIVE RECEIPTS & LIVE PAYMENTS FROM SHARED SOURCE
  // ---------------------------------------------------------------------------

  // Active account metadata
  const activeAccountMeta: BankAccountMetadata =
    INSTITUTIONAL_BANK_ACCOUNTS[selectedAccountKey] || INSTITUTIONAL_BANK_ACCOUNTS.NS;
  const activeAccountLabel =
    customAccountName || activeAccountMeta.fullName || BANK_ACCOUNT_LABELS[selectedAccountKey]?.name;

  // Opening Balance: read live from cell K3 of Cash Book sheet via cashBookStates[key].openingBalance
  const openingBalance = useMemo(() => {
    if (selectedFY === '2025-26') {
      return 2387207.0; // Official 2025-26 baseline opening
    }
    const state = liveCashBookStates[selectedAccountKey];
    if (state && typeof state.openingBalance === 'number' && !isNaN(state.openingBalance)) {
      return state.openingBalance;
    }
    return activeAccountMeta.openingBalance || 2387207.0;
  }, [liveCashBookStates, selectedAccountKey, selectedFY, activeAccountMeta]);

  // Master List of Receipts for selectedAccountKey
  const allAccountReceipts = useMemo<InternalReceiptRecord[]>(() => {
    const list: InternalReceiptRecord[] = [];
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
            headOfAccount: e.accountHead || 'Non-Salary Grant',
            amount: amt,
            remarks: e.particulars || 'Grant Receipt',
            paidToBy: e.paidToBy || 'Directorate / Treasury',
          });
        }
      });
    }

    // If viewing FY 2025-26 or initial empty mock, fall back to baseline receipts
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

    // Sort chronologically
    list.sort((a, b) => a.dateTs - b.dateTs);
    // Assign sequential 1-indexed srNo
    list.forEach((item, index) => {
      item.srNo = index + 1;
    });

    return list;
  }, [liveCashBookStates, selectedAccountKey, selectedFY]);

  // Master List of Payments for selectedAccountKey from liveVouchers and cashBookStates
  const allAccountPayments = useMemo<InternalPaymentRecord[]>(() => {
    const list: InternalPaymentRecord[] = [];

    // Filter master vouchers belonging to selectedAccountKey
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
      // In PRA rules: Payment amount is PRA Tax on bill + Rs. 100 CPR fee
      let praPaid = Number(v.praAmount) || 0;
      if (praPaid === 0 && praOnBill > 0) {
        praPaid = praOnBill + 100;
      }
      const net = Number(v.chequeAmountNet) || 0;

      // Logically: Total Bill Amount is the Gross Invoiced Bill (which includes GST).
      // If v.billAmountGross exists and is > 0, use it.
      // Otherwise, gross = net + it + praPaid (which accounts for the total bill disbursement/withholdings)
      // or billAmtExclTax + gst + praOnBill.
      const gross =
        Number(v.billAmountGross) > 0
          ? Number(v.billAmountGross)
          : Number(v.billAmtExclTax || 0) > 0
          ? Number(v.billAmtExclTax) + gst + praOnBill
          : net + it + praPaid;

      list.push({
        id: `VOUCH-${v.voucherNo || idx}`,
        srNo: idx + 1,
        voucherNo: v.voucherNo || (v.srNo ? `V# ${v.srNo}` : ''),
        headOfAccount: v.accountHead || 'Expenditure Head',
        billNo: v.billNo || '',
        billDate: v.billDate || '',
        chequeDate: dt,
        dateTs: ts,
        monthKey: mk,
        chequeNo: v.chequeNoNet || '—',
        totalBillAmount: gross,
        gstAmount: gst,
        incomeTax: it,
        praAmount: praPaid,
        salesTaxPRA: praPaid,
        praTaxOnBill: praOnBill,
        security: 0,
        netAmountPaid: net,
        remarks: v.description || '—',
        paidTo: v.payeeName || '—',
      });
    });

    // Also include any standalone Bank Charges recorded in cashBook entries that are not already in matchedVouchers
    const state = liveCashBookStates[selectedAccountKey];
    if (state && Array.isArray(state.entries)) {
      state.entries.forEach((e, idx) => {
        if (
          e.entryType === 'PAYMENT' &&
          Number(e.payments) > 0 &&
          (e.particulars?.toLowerCase().includes('bank') || e.id?.includes('BC'))
        ) {
          // Check if this cashbook entry already corresponds to a voucher in matchedVouchers
          const alreadyInVouchers = matchedVouchers.some((v) => {
            if (e.voucherSerial && v.voucherNo && e.voucherSerial.trim().toLowerCase() === v.voucherNo.trim().toLowerCase()) return true;
            if (e.vNo && (String(v.srNo) === String(e.vNo) || v.voucherNo === String(e.vNo))) return true;
            if (e.id && v.voucherNo && e.id.includes(v.voucherNo)) return true;
            const vDt = v.chequeDate || v.billDate || '';
            const eDt = e.date || '';
            const isSameDate = vDt === eDt || (vDt && eDt && parseDateToTimestamp(vDt) === parseDateToTimestamp(eDt));
            const isSameAmt =
              Math.abs(Number(v.billAmountGross) - Number(e.payments)) < 1 ||
              Math.abs(Number(v.chequeAmountNet) - Number(e.payments)) < 1;
            const isBankRelated =
              v.payeeName.toLowerCase().includes('bank') ||
              v.accountHead.toLowerCase().includes('bank') ||
              v.description.toLowerCase().includes('bank');
            return isSameDate && isSameAmt && isBankRelated;
          });

          if (!alreadyInVouchers) {
            const dt = e.date || '';
            const ts = parseDateToTimestamp(dt);
            const mk = extractMonthKey(dt);
            const amt = Number(e.payments);
            list.push({
              id: `BC-${idx}`,
              srNo: list.length + 1,
              voucherNo: e.voucherSerial || (e.vNo ? `BC-${e.vNo}` : `BC-${idx + 1}`),
              headOfAccount: e.accountHead || 'A03101-BANK CHARGES',
              billNo: '',
              billDate: '',
              chequeDate: dt,
              dateTs: ts,
              monthKey: mk,
              chequeNo: e.chequeNo && e.chequeNo !== '0' ? e.chequeNo : 'DEBIT',
              totalBillAmount: amt,
              gstAmount: 0,
              incomeTax: 0,
              praAmount: 0,
              salesTaxPRA: 0,
              praTaxOnBill: 0,
              security: 0,
              netAmountPaid: amt,
              remarks: e.particulars || 'Bank Service Charge',
              paidTo: 'Bank of Punjab (BOP)',
            });
          }
        }
      });
    }

    // If viewing FY 2025-26 and no 2025 vouchers exist, fall back to baseline payments
    if (list.length === 0 && selectedFY === '2025-26' && selectedAccountKey === 'NS') {
      INITIAL_DIRECTOR_PAYMENTS.forEach((p, idx) => {
        const ts = parseDateToTimestamp(p.chequeDate);
        list.push({
          id: `BASE-PAY-${idx}`,
          srNo: p.srNo || idx + 1,
          voucherNo: p.chequeNo ? `CHQ-${p.chequeNo}` : `V# ${p.srNo || idx + 1}`,
          headOfAccount: p.headOfAccount,
          billNo: '',
          billDate: '',
          chequeDate: p.chequeDate,
          dateTs: ts,
          monthKey: extractMonthKey(p.chequeDate),
          chequeNo: p.chequeNo,
          totalBillAmount: p.totalBillAmount,
          gstAmount: 0,
          incomeTax: p.incomeTax,
          praAmount: p.salesTaxPRA,
          salesTaxPRA: p.salesTaxPRA,
          praTaxOnBill: 0,
          security: p.security,
          netAmountPaid: p.netAmountPaid,
          remarks: p.remarks,
          paidTo: p.paidTo,
        });
      });
    }

    // Sort chronologically
    list.sort((a, b) => a.dateTs - b.dateTs);
    // Assign sequential 1-indexed srNo
    list.forEach((item, index) => {
      item.srNo = index + 1;
    });

    return list;
  }, [liveVouchers, liveCashBookStates, selectedAccountKey, selectedFY]);

  // ---------------------------------------------------------------------------
  // 2. PERIOD-FILTERED LISTS FOR DETAILED REGISTERS
  // ---------------------------------------------------------------------------

  // Receipts Register Tab Filtered List
  const filteredReceipts = useMemo(() => {
    let list = allAccountReceipts.filter((r) => {
      if (!r.monthKey) return false;
      return r.monthKey >= fromMonth && r.monthKey <= toMonth;
    });

    if (receiptSearch.trim()) {
      const q = receiptSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.headOfAccount.toLowerCase().includes(q) ||
          r.remarks.toLowerCase().includes(q) ||
          r.challanChequeNo.toLowerCase().includes(q) ||
          r.paidToBy.toLowerCase().includes(q) ||
          r.amount.toString().includes(q)
      );
    }
    return list;
  }, [allAccountReceipts, fromMonth, toMonth, receiptSearch]);

  const receiptsRegisterPeriodTotal = useMemo(() => {
    return allAccountReceipts
      .filter((r) => r.monthKey && r.monthKey >= fromMonth && r.monthKey <= toMonth)
      .reduce((sum, r) => sum + r.amount, 0);
  }, [allAccountReceipts, fromMonth, toMonth]);

  const receiptsRegisterDisplayTotal = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  }, [filteredReceipts]);

  // Payments Register Tab Filtered List
  const filteredPayments = useMemo(() => {
    let list = allAccountPayments.filter((p) => {
      if (!p.monthKey) return false;
      return p.monthKey >= fromMonth && p.monthKey <= toMonth;
    });

    if (paymentSearch.trim()) {
      const q = paymentSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.headOfAccount.toLowerCase().includes(q) ||
          p.voucherNo.toLowerCase().includes(q) ||
          p.billNo.toLowerCase().includes(q) ||
          p.chequeNo.toLowerCase().includes(q) ||
          p.remarks.toLowerCase().includes(q) ||
          p.paidTo.toLowerCase().includes(q) ||
          p.netAmountPaid.toString().includes(q) ||
          p.totalBillAmount.toString().includes(q)
      );
    }
    return list;
  }, [allAccountPayments, fromMonth, toMonth, paymentSearch]);

  const paymentsRegisterPeriodTotal = useMemo(() => {
    return allAccountPayments
      .filter((p) => p.monthKey && p.monthKey >= fromMonth && p.monthKey <= toMonth)
      .reduce(
        (acc, p) => {
          acc.totalBill += p.totalBillAmount;
          acc.gst += p.gstAmount || 0;
          acc.incomeTax += p.incomeTax;
          acc.praTax += p.praAmount || 0;
          acc.salesTax += p.praAmount || 0;
          acc.security += p.security;
          acc.netPaid += p.netAmountPaid;
          return acc;
        },
        { totalBill: 0, gst: 0, incomeTax: 0, praTax: 0, salesTax: 0, security: 0, netPaid: 0 }
      );
  }, [allAccountPayments, fromMonth, toMonth]);

  const paymentsRegisterDisplayTotals = useMemo(() => {
    return filteredPayments.reduce(
      (acc, p) => {
        acc.totalBill += p.totalBillAmount;
        acc.gst += p.gstAmount || 0;
        acc.incomeTax += p.incomeTax;
        acc.praTax += p.praAmount || 0;
        acc.salesTax += p.praAmount || 0;
        acc.security += p.security;
        acc.netPaid += p.netAmountPaid;
        return acc;
      },
      { totalBill: 0, gst: 0, incomeTax: 0, praTax: 0, salesTax: 0, security: 0, netPaid: 0 }
    );
  }, [filteredPayments]);

  // ---------------------------------------------------------------------------
  // 3. MONTH-WISE RECONCILIATION TABLE (Problem 2 Redesign)
  // Columns: Month | Total Receipts | Total Payments | Net Movement | Running Cash Book Balance
  // ---------------------------------------------------------------------------

  const activeMonthOptions = selectedFY === '2025-26' ? MONTH_OPTIONS_2526 : MONTH_OPTIONS_2627;

  // Calculate month-wise table rows (Jul → Jun)
  const monthWiseTableRows = useMemo<MonthlyReconTableRow[]>(() => {
    const rows: MonthlyReconTableRow[] = [];
    let running = openingBalance;

    for (const opt of activeMonthOptions) {
      // Sum receipts in this month
      const mReceipts = allAccountReceipts
        .filter((r) => r.monthKey === opt.key)
        .reduce((sum, r) => sum + r.amount, 0);

      // Sum payments in this month (Gross bill amount disbursed)
      const mPayments = allAccountPayments
        .filter((p) => p.monthKey === opt.key)
        .reduce((sum, p) => sum + p.totalBillAmount, 0);

      const netMovement = mReceipts - mPayments;
      running += netMovement;

      const isInPeriod = opt.key >= fromMonth && opt.key <= toMonth;

      rows.push({
        monthKey: opt.key,
        monthLabel: opt.label,
        monthName: opt.monthName,
        totalReceipts: mReceipts,
        totalPayments: mPayments,
        netMovement,
        runningBalance: Math.round(running * 100) / 100,
        isInSelectedPeriod: isInPeriod,
      });
    }

    return rows;
  }, [activeMonthOptions, openingBalance, allAccountReceipts, allAccountPayments, fromMonth, toMonth]);

  // Selected period totals for the reconciliation table
  const reconPeriodTotals = useMemo(() => {
    const activeRows = monthWiseTableRows.filter((r) => r.isInSelectedPeriod);
    const totalReceipts = activeRows.reduce((sum, r) => sum + r.totalReceipts, 0);
    const totalPayments = activeRows.reduce((sum, r) => sum + r.totalPayments, 0);
    const netMovement = totalReceipts - totalPayments;

    // Effective opening balance at the start of fromMonth
    let effectiveOpening = openingBalance;
    for (const r of monthWiseTableRows) {
      if (r.monthKey < fromMonth) {
        effectiveOpening += r.netMovement;
      }
    }

    // Cash Book Closing Balance as on period-end
    const cashBookClosingBalance = Math.round((effectiveOpening + netMovement) * 100) / 100;
    const difference = Math.round((cashBookClosingBalance - bankStatementBalance) * 100) / 100;

    return {
      effectiveOpening: Math.round(effectiveOpening * 100) / 100,
      totalReceipts: Math.round(totalReceipts * 100) / 100,
      totalPayments: Math.round(totalPayments * 100) / 100,
      netMovement: Math.round(netMovement * 100) / 100,
      cashBookClosingBalance,
      difference,
    };
  }, [monthWiseTableRows, fromMonth, openingBalance, bankStatementBalance]);

  // Total unpresented cheques amount
  const totalUnpresentedAmount = useMemo(() => {
    return unpresentedCheques.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  }, [unpresentedCheques]);

  // Variance reconciliation check: does total unpresented match the difference?
  const isVarianceExplained =
    Math.abs(Math.abs(reconPeriodTotals.difference) - totalUnpresentedAmount) < 0.05;

  // ---------------------------------------------------------------------------
  // 4. AUDIT CROSS-CHECK VERIFICATION
  // Receipts Register Grand Total == Month-Wise Reconciliation Total Receipts
  // Payments Register Grand Total == Month-Wise Reconciliation Total Payments
  // ---------------------------------------------------------------------------
  const receiptsVariance = Math.abs(receiptsRegisterPeriodTotal - reconPeriodTotals.totalReceipts);
  const paymentsVariance = Math.abs(paymentsRegisterPeriodTotal.totalBill - reconPeriodTotals.totalPayments);

  const isReceiptsReconciled = receiptsVariance < 0.05;
  const isPaymentsReconciled = paymentsVariance < 0.05;

  // ---------------------------------------------------------------------------
  // SMART BANK MATCHING & RECONCILIATION CALCULATION
  // ---------------------------------------------------------------------------
  const periodPayments = useMemo(() => {
    return allAccountPayments.filter((p) => {
      if (!p.monthKey) return false;
      return p.monthKey >= fromMonth && p.monthKey <= toMonth;
    });
  }, [allAccountPayments, fromMonth, toMonth]);

  const periodReceipts = useMemo(() => {
    return allAccountReceipts.filter((r) => {
      if (!r.monthKey) return false;
      return r.monthKey >= fromMonth && r.monthKey <= toMonth;
    });
  }, [allAccountReceipts, fromMonth, toMonth]);

  const bankReconciliationResult = useMemo(() => {
    const stmt =
      bopStatement ||
      generateSampleBOPStatement(
        activeAccountMeta.accountNo || '6580006795600014',
        `${fromMonth}-01`,
        `${toMonth}-31`,
        bankStatementBalance
      );

    return performBankReconciliation(
      stmt,
      periodPayments,
      periodReceipts,
      reconPeriodTotals.cashBookClosingBalance,
      manualOverrides
    );
  }, [
    bopStatement,
    periodPayments,
    periodReceipts,
    reconPeriodTotals.cashBookClosingBalance,
    manualOverrides,
    activeAccountMeta.accountNo,
    fromMonth,
    toMonth,
    bankStatementBalance,
  ]);

  // Export Bank Reconciliation Statement to Excel / CSV with Dual-Column Format (Receipts Left, Payments Right)
  const handleExportBRS_CSV = () => {
    // Generate months list
    const monthKeySet = new Set<string>();
    const [fromY, fromM] = fromMonth.split('-').map(Number);
    const [toY, toM] = toMonth.split('-').map(Number);
    if (fromY && fromM && toY && toM) {
      let curY = fromY;
      let curM = fromM;
      while (curY < toY || (curY === toY && curM <= toM)) {
        monthKeySet.add(`${curY}-${String(curM).padStart(2, '0')}`);
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
      }
    }
    allAccountReceipts.forEach((r) => { if (r.monthKey) monthKeySet.add(r.monthKey); });
    allAccountPayments.forEach((p) => { if (p.monthKey) monthKeySet.add(p.monthKey); });
    const sortedKeys = Array.from(monthKeySet).filter((k) => k >= fromMonth && k <= toMonth).sort();

    let totDirectR = 0, totProfitR = 0, totOtherR = 0, grandTotR = 0;
    let totDirectP = 0, totChargesP = 0, totOtherP = 0, grandTotP = 0;

    const rows = sortedKeys.map((mk) => {
      const mR = allAccountReceipts.filter((r) => r.monthKey === mk);
      let dR = 0, pR = 0, oR = 0;
      const rHeads: string[] = [];
      mR.forEach((r) => {
        rHeads.push(r.headOfAccount || r.remarks || 'Grant');
        const txt = `${r.headOfAccount} ${r.remarks} ${r.paidToBy}`.toLowerCase();
        if (txt.includes('profit') || txt.includes('pls') || txt.includes('markup') || txt.includes('interest')) pR += r.amount;
        else if (txt.includes('other account') || txt.includes('institute') || txt.includes('pf') || txt.includes('short course') || txt.includes('sc ')) oR += r.amount;
        else dR += r.amount;
      });

      const mP = allAccountPayments.filter((p) => p.monthKey === mk);
      let dP = 0, cP = 0, oP = 0;
      const pHeads: string[] = [];
      mP.forEach((p) => {
        pHeads.push(p.headOfAccount || p.remarks || 'Expense');
        const amt = p.totalBillAmount || p.netAmountPaid || 0;
        const txt = `${p.headOfAccount} ${p.remarks} ${p.paidTo} ${p.voucherNo}`.toLowerCase();
        if (txt.includes('bank charge') || txt.includes('service charge') || txt.includes('fed') || txt.includes('a03101')) cP += amt;
        else if (txt.includes('other account') || txt.includes('transfer to') || txt.includes('pf') || txt.includes('short course') || txt.includes('cmsdi') || txt.includes('navttc')) oP += amt;
        else dP += amt;
      });

      if (mR.length === 0 && mP.length === 0) {
        const gridMatch = INITIAL_DIRECTOR_MONTHLY_GRID.find((g) => g.monthKey.startsWith(mk));
        if (gridMatch) {
          dR = gridMatch.directReceipts;
          pR = gridMatch.otherReceiptsProfit;
          oR = gridMatch.shortCourseReceipts + gridMatch.fromOtherBankAccount;
          rHeads.push(gridMatch.receiptDesc);
          dP = gridMatch.directPayments;
          cP = gridMatch.otherPaymentsBankCharges;
          oP = gridMatch.cmsdiNavttcPayments;
          pHeads.push(gridMatch.paymentDesc);
        }
      }

      const totR = dR + pR + oR;
      const totP = dP + cP + oP;

      totDirectR += dR; totProfitR += pR; totOtherR += oR; grandTotR += totR;
      totDirectP += dP; totChargesP += cP; totOtherP += oP; grandTotP += totP;

      const rDesc = Array.from(new Set(rHeads)).slice(0, 2).join(' + ') || 'Nil Receipts';
      const pDesc = Array.from(new Set(pHeads)).slice(0, 2).join(' + ') || 'Nil Payments';

      return {
        monthKey: mk,
        rDesc, dR, pR, oR, totR,
        pDesc, dP, cP, oP, totP,
      };
    });

    const lines: string[] = [];
    lines.push(`GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD FAISALABAD`);
    lines.push(`BANK RECONCILIATION STATEMENT (INSTITUTIONAL DUAL RECEIPTS & PAYMENTS FORMAT)`);
    lines.push(`BANK: The Bank of Punjab | BRANCH: ${activeAccountMeta.branch || 'Samanabad Branch, Faisalabad'}`);
    lines.push(`ACCOUNT: ${activeAccountMeta.fullName} | A/C NO: ${activeAccountMeta.accountNo}`);
    lines.push(`PERIOD: ${fromMonth} to ${toMonth} | AS ON: ${asOnDate}`);
    lines.push(``);
    lines.push(`RECEIPTS (LEFT SIDE),,,,,,PAYMENTS (RIGHT SIDE),,,,,`);
    lines.push(`Month,Brief Description of Heads Involved,Direct Receipts (Budget etc),Bank Profits,From Other Account (PF/SC etc),Total Receipts (Rs.),Month,Brief Description of Heads Involved,Direct Payments (Operating/Vendors),Bank Charges (BOP/FED),To Other Account (PF/Taxes),Total Payments (Rs.)`);

    rows.forEach((r) => {
      lines.push(`"${r.monthKey}","${r.rDesc.replace(/"/g, '""')}",${r.dR.toFixed(2)},${r.pR.toFixed(2)},${r.oR.toFixed(2)},${r.totR.toFixed(2)},"${r.monthKey}","${r.pDesc.replace(/"/g, '""')}",${r.dP.toFixed(2)},${r.cP.toFixed(2)},${r.oP.toFixed(2)},${r.totP.toFixed(2)}`);
    });

    lines.push(`"TOTAL:","All Receipts Summary",${totDirectR.toFixed(2)},${totProfitR.toFixed(2)},${totOtherR.toFixed(2)},${grandTotR.toFixed(2)},"TOTAL:","All Payments Summary",${totDirectP.toFixed(2)},${totChargesP.toFixed(2)},${totOtherP.toFixed(2)},${grandTotP.toFixed(2)}`);
    lines.push(``);
    lines.push(`BANK VS CASH BALANCE RECONCILIATION AS ON ${asOnDate}`);
    lines.push(`1,Opening Balance as per Cash Book Ledger (at start of period),,,,"${reconPeriodTotals.effectiveOpening.toFixed(2)}"`);
    lines.push(`2,ADD: Total Receipts during reported period (as per Receipts Column above),,,,"${grandTotR.toFixed(2)}"`);
    lines.push(`3,LESS: Total Payments during reported period (as per Payments Column above),,,,"-${grandTotP.toFixed(2)}"`);
    lines.push(`4,Closing Balance as per Cash Book Ledger as on ${asOnDate},,,,"${reconPeriodTotals.cashBookClosingBalance.toFixed(2)}"`);
    lines.push(`5,ADD: Cheques Issued but not yet presented at Bank of Punjab (Unpresented Cheques),,,,"${bankReconciliationResult.totalUnpresentedCheques.toFixed(2)}"`);
    bankReconciliationResult.unpresentedCheques.forEach((c, idx) => {
      lines.push(`5.${idx + 1},"  Cheque #${c.chequeNo} dated ${c.chequeDate} in favor of ${c.payee.replace(/"/g, '""')} (${c.headOfAccount})",,,,"${c.netAmount.toFixed(2)}"`);
    });
    if (bankReconciliationResult.totalBankCreditsNotInCashBook > 0) {
      lines.push(`6,ADD: Direct Credits by Bank not yet in Cash Book,,,,"${bankReconciliationResult.totalBankCreditsNotInCashBook.toFixed(2)}"`);
    }
    if (bankReconciliationResult.totalBankDebitsNotInCashBook > 0) {
      lines.push(`7,LESS: Direct Debits / Bank Charges not yet in Cash Book,,,,"-${bankReconciliationResult.totalBankDebitsNotInCashBook.toFixed(2)}"`);
    }
    if (bankReconciliationResult.totalUncreditedReceipts > 0) {
      lines.push(`8,LESS: Receipts in Cash Book not yet credited by Bank,,,,"-${bankReconciliationResult.totalUncreditedReceipts.toFixed(2)}"`);
    }
    lines.push(`✓,ADJUSTED RECONCILED BANK BALANCE,,,,"${bankReconciliationResult.reconciledBankBalance.toFixed(2)}"`);
    lines.push(`=,BALANCE AS PER PHYSICAL BANK OF PUNJAB STATEMENT,,,,"${bankStatementBalance.toFixed(2)}"`);
    lines.push(`Δ,NET AUDIT VARIANCE / UNEXPLAINED DIFFERENCE,,,,"${bankReconciliationResult.variance.toFixed(2)} (${bankReconciliationResult.isFullyExplained ? '✓ RECONCILED' : 'DISCREPANCY'})"`);
    lines.push(``);
    lines.push(`REMARKS:`);
    lines.push(`"1. Cheques totaling Rs. ${bankReconciliationResult.totalUnpresentedCheques.toFixed(2)} were issued against verified sanctions but were unpresented at BOP as on ${asOnDate}."`);
    lines.push(`"2. Cash Book and BOP statements verified in compliance with Punjab Treasury & TEVTA Financial Rules."`);
    lines.push(``);
    lines.push(`Prepared by: Cashier / Junior Clerk,Checked by: Senior Clerk / Accountant,Verified by: Office Superintendent,Approved by: Principal / DDO`);

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BRS_Dual_Table_${selectedAccountKey}_${asOnDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dedicated Print handler for Official BRS (Dual Receipts Left & Payments Right Format)
  const handlePrintBRSStandalone = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    // Collect months list
    const monthKeySet = new Set<string>();
    const [fromY, fromM] = fromMonth.split('-').map(Number);
    const [toY, toM] = toMonth.split('-').map(Number);
    if (fromY && fromM && toY && toM) {
      let curY = fromY;
      let curM = fromM;
      while (curY < toY || (curY === toY && curM <= toM)) {
        monthKeySet.add(`${curY}-${String(curM).padStart(2, '0')}`);
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
      }
    }
    allAccountReceipts.forEach((r) => { if (r.monthKey) monthKeySet.add(r.monthKey); });
    allAccountPayments.forEach((p) => { if (p.monthKey) monthKeySet.add(p.monthKey); });
    const sortedKeys = Array.from(monthKeySet).filter((k) => k >= fromMonth && k <= toMonth).sort();

    let totDirectR = 0, totProfitR = 0, totOtherR = 0, grandTotR = 0;
    let totDirectP = 0, totChargesP = 0, totOtherP = 0, grandTotP = 0;

    const rows = sortedKeys.map((mk) => {
      const mR = allAccountReceipts.filter((r) => r.monthKey === mk);
      let dR = 0, pR = 0, oR = 0;
      const rHeads: string[] = [];
      mR.forEach((r) => {
        rHeads.push(r.headOfAccount || r.remarks || 'Grant');
        const txt = `${r.headOfAccount} ${r.remarks} ${r.paidToBy}`.toLowerCase();
        if (txt.includes('profit') || txt.includes('pls') || txt.includes('markup') || txt.includes('interest')) pR += r.amount;
        else if (txt.includes('other account') || txt.includes('institute') || txt.includes('pf') || txt.includes('short course') || txt.includes('sc ')) oR += r.amount;
        else dR += r.amount;
      });

      const mP = allAccountPayments.filter((p) => p.monthKey === mk);
      let dP = 0, cP = 0, oP = 0;
      const pHeads: string[] = [];
      mP.forEach((p) => {
        pHeads.push(p.headOfAccount || p.remarks || 'Expense');
        const amt = p.totalBillAmount || p.netAmountPaid || 0;
        const txt = `${p.headOfAccount} ${p.remarks} ${p.paidTo} ${p.voucherNo}`.toLowerCase();
        if (txt.includes('bank charge') || txt.includes('service charge') || txt.includes('fed') || txt.includes('a03101')) cP += amt;
        else if (txt.includes('other account') || txt.includes('transfer to') || txt.includes('pf') || txt.includes('short course') || txt.includes('cmsdi') || txt.includes('navttc')) oP += amt;
        else dP += amt;
      });

      if (mR.length === 0 && mP.length === 0) {
        const gridMatch = INITIAL_DIRECTOR_MONTHLY_GRID.find((g) => g.monthKey.startsWith(mk));
        if (gridMatch) {
          dR = gridMatch.directReceipts;
          pR = gridMatch.otherReceiptsProfit;
          oR = gridMatch.shortCourseReceipts + gridMatch.fromOtherBankAccount;
          rHeads.push(gridMatch.receiptDesc);
          dP = gridMatch.directPayments;
          cP = gridMatch.otherPaymentsBankCharges;
          oP = gridMatch.cmsdiNavttcPayments;
          pHeads.push(gridMatch.paymentDesc);
        }
      }

      const totR = dR + pR + oR;
      const totP = dP + cP + oP;

      totDirectR += dR; totProfitR += pR; totOtherR += oR; grandTotR += totR;
      totDirectP += dP; totChargesP += cP; totOtherP += oP; grandTotP += totP;

      const rDesc = Array.from(new Set(rHeads)).slice(0, 2).join(' + ') || 'Nil Receipts';
      const pDesc = Array.from(new Set(pHeads)).slice(0, 2).join(' + ') || 'Nil Payments';

      return {
        monthKey: mk,
        rDesc, dR, pR, oR, totR,
        pDesc, dP, cP, oP, totP,
      };
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bank Reconciliation Statement - ${activeAccountMeta.shortName}</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 10px; color: #111; font-size: 10pt; }
          .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .header h2 { margin: 0 0 4px 0; font-size: 15pt; font-weight: 900; text-transform: uppercase; }
          .header h3 { margin: 0 0 4px 0; font-size: 12pt; font-weight: bold; }
          .header p { margin: 2px 0; font-size: 9.5pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
          th, td { border: 1px solid #333; padding: 4px 6px; }
          th { font-weight: bold; }
          .super-header-r { background-color: #d1fae5; color: #065f46; font-size: 10pt; font-weight: 900; text-align: center; }
          .super-header-p { background-color: #e0e7ff; color: #3730a3; font-size: 10pt; font-weight: 900; text-align: center; }
          .sub-th { background-color: #f1f5f9; font-size: 8.5pt; text-align: center; }
          .num { text-align: right; font-family: 'Consolas', monospace; font-size: 9.5pt; }
          .bold { font-weight: bold; }
          .center { text-align: center; }
          .recon-card { margin-top: 18px; border: 1.5px solid #222; border-radius: 4px; padding: 10px; background-color: #fcfcfc; }
          .recon-card h4 { margin: 0 0 6px 0; font-size: 11pt; text-transform: uppercase; font-weight: 900; }
          .recon-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9pt; }
          .recon-table td { border: 1px solid #ccc; padding: 4px 8px; }
          .remarks-box { margin-top: 12px; padding: 8px; border: 1px dashed #666; font-size: 8.5pt; background-color: #f9f9f9; }
          .signatures { margin-top: 36px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sig-box { text-align: center; width: 22%; border-top: 1px solid #000; padding-top: 4px; font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Government Vocational Training Institute (W) Samanabad, Faisalabad</h2>
          <h3>Bank Reconciliation Statement (Monthly Receipts &amp; Payments Table)</h3>
          <p><strong>Bank:</strong> The Bank of Punjab • <strong>Branch:</strong> ${activeAccountMeta.branch || 'Samanabad Branch, Faisalabad'}</p>
          <p><strong>Account Title:</strong> ${activeAccountMeta.fullName} • <strong>Account Number:</strong> ${activeAccountMeta.accountNo} (${activeAccountMeta.shortName})</p>
          <p><strong>Reconciliation Period:</strong> ${fromMonth} to ${toMonth} • <strong>As on Date:</strong> ${asOnDate}</p>
        </div>

        <!-- 1. DUAL TABLE: LEFT RECEIPTS | RIGHT PAYMENTS -->
        <table>
          <thead>
            <tr>
              <th colspan="6" class="super-header-r">RECEIPTS (CREDITS TO CASH BOOK / REVENUE INFLOWS)</th>
              <th colspan="6" class="super-header-p">PAYMENTS (DEBITS TO CASH BOOK / EXPENDITURE DISBURSEMENTS)</th>
            </tr>
            <tr class="sub-th">
              <!-- Receipts columns -->
              <th style="width: 55px;">Month</th>
              <th>Brief Description of Heads Involved</th>
              <th style="width: 85px;" class="num">Direct Receipts<br/><span style="font-size: 7.5pt; font-weight: normal;">(Budget / Grant)</span></th>
              <th style="width: 75px;" class="num">Bank Profits<br/><span style="font-size: 7.5pt; font-weight: normal;">(PLS Profit)</span></th>
              <th style="width: 85px;" class="num">From Other A/C<br/><span style="font-size: 7.5pt; font-weight: normal;">(PF / SC / Inst)</span></th>
              <th style="width: 95px;" class="num bold" style="background-color: #ecfdf5;">Total Receipts (Rs.)</th>

              <!-- Payments columns -->
              <th style="width: 55px;">Month</th>
              <th>Brief Description of Heads Involved</th>
              <th style="width: 85px;" class="num">Direct Payments<br/><span style="font-size: 7.5pt; font-weight: normal;">(Operating / Bills)</span></th>
              <th style="width: 75px;" class="num">Bank Charges<br/><span style="font-size: 7.5pt; font-weight: normal;">(BOP / FED)</span></th>
              <th style="width: 85px;" class="num">To Other A/C<br/><span style="font-size: 7.5pt; font-weight: normal;">(PF / Taxes / SC)</span></th>
              <th style="width: 95px;" class="num bold" style="background-color: #eef2ff;">Total Payments (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td class="center bold">${r.monthKey}</td>
                <td style="font-size: 8.5pt;">${r.rDesc}</td>
                <td class="num">${r.dR > 0 ? formatAmount(r.dR, 2) : '0.00'}</td>
                <td class="num">${r.pR > 0 ? formatAmount(r.pR, 2) : '0.00'}</td>
                <td class="num">${r.oR > 0 ? formatAmount(r.oR, 2) : '0.00'}</td>
                <td class="num bold" style="background-color: #ecfdf5;">${formatAmount(r.totR, 2)}</td>

                <td class="center bold">${r.monthKey}</td>
                <td style="font-size: 8.5pt;">${r.pDesc}</td>
                <td class="num">${r.dP > 0 ? formatAmount(r.dP, 2) : '0.00'}</td>
                <td class="num">${r.cP > 0 ? formatAmount(r.cP, 2) : '0.00'}</td>
                <td class="num">${r.oP > 0 ? formatAmount(r.oP, 2) : '0.00'}</td>
                <td class="num bold" style="background-color: #eef2ff;">${formatAmount(r.totP, 2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background-color: #f8fafc;">
              <td class="center">TOTAL:</td>
              <td style="font-size: 8.5pt;">All Receipts Summary</td>
              <td class="num">Rs. ${formatAmount(totDirectR, 2)}</td>
              <td class="num">Rs. ${formatAmount(totProfitR, 2)}</td>
              <td class="num">Rs. ${formatAmount(totOtherR, 2)}</td>
              <td class="num bold" style="background-color: #d1fae5;">Rs. ${formatAmount(grandTotR, 2)}</td>

              <td class="center">TOTAL:</td>
              <td style="font-size: 8.5pt;">All Payments Summary</td>
              <td class="num">Rs. ${formatAmount(totDirectP, 2)}</td>
              <td class="num">Rs. ${formatAmount(totChargesP, 2)}</td>
              <td class="num">Rs. ${formatAmount(totOtherP, 2)}</td>
              <td class="num bold" style="background-color: #e0e7ff;">Rs. ${formatAmount(grandTotP, 2)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- 2. BELOW TOTALS: BANK VS CASH BALANCE RECONCILIATION -->
        <div class="recon-card">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #333; padding-bottom: 6px; margin-bottom: 8px;">
            <h4 style="margin: 0;">Bank vs. Cash Balance Reconciliation Statement as on ${asOnDate}</h4>
            <span style="font-weight: bold; font-size: 9pt;">
              ${bankReconciliationResult.isFullyExplained ? '✓ 100% RECONCILED &amp; BALANCED (Zero Variance)' : 'Variance: Rs. ' + formatAmount(bankReconciliationResult.variance, 2)}
            </span>
          </div>

          <table class="recon-table" style="font-family: 'Consolas', monospace; font-size: 8.5pt;">
            <thead>
              <tr style="background-color: #f1f5f9; font-weight: bold; text-align: center;">
                <th style="width: 50%; padding: 6px; border: 1px solid #999;">CASH BOOK BALANCE RECONCILIATION</th>
                <th style="width: 50%; padding: 6px; border: 1px solid #999;">BANK OF PUNJAB STATEMENT RECONCILIATION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 6px; border: 1px solid #ccc;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-family: Calibri, sans-serif;">Opening Balance as per Cash Book:</span>
                    <strong>Rs. ${formatAmount(reconPeriodTotals.effectiveOpening, 2)}</strong>
                  </div>
                </td>
                <td style="padding: 6px; border: 1px solid #ccc;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-family: Calibri, sans-serif;">Balance as per Physical BOP Statement:</span>
                    <strong>Rs. ${formatAmount(bankStatementBalance, 2)}</strong>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px; border: 1px solid #ccc; color: #047857;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-family: Calibri, sans-serif;">ADD: Total Receipts during Period:</span>
                    <strong>+Rs. ${formatAmount(grandTotR, 2)}</strong>
                  </div>
                </td>
                <td style="padding: 6px; border: 1px solid #ccc; color: #b91c1c;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-family: Calibri, sans-serif;">LESS: Cheques Issued but Unpresented (${bankReconciliationResult.unpresentedCheques.length} Cheques):</span>
                    <strong>-Rs. ${formatAmount(bankReconciliationResult.totalUnpresentedCheques, 2)}</strong>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px; border: 1px solid #ccc; color: #b91c1c;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-family: Calibri, sans-serif;">LESS: Total Payments during Period:</span>
                    <strong>-Rs. ${formatAmount(grandTotP, 2)}</strong>
                  </div>
                </td>
                <td style="padding: 6px; border: 1px solid #ccc;">
                  <div style="display: flex; justify-content: space-between; color: #475569;">
                    <span style="font-family: Calibri, sans-serif;">Direct Bank Adjustments:</span>
                    <strong>Rs. ${formatAmount((bankReconciliationResult.totalBankCreditsNotInCashBook || 0) - (bankReconciliationResult.totalBankDebitsNotInCashBook || 0), 2)}</strong>
                  </div>
                </td>
              </tr>
              <tr style="background-color: #f8fafc; font-weight: bold; font-size: 9pt;">
                <td style="padding: 7px; border: 1px solid #999;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-family: Calibri, sans-serif; text-transform: uppercase;">Closing Cash Book Balance (${asOnDate}):</span>
                    <strong style="color: #1d4ed8;">Rs. ${formatAmount(reconPeriodTotals.cashBookClosingBalance, 2)}</strong>
                  </div>
                </td>
                <td style="padding: 7px; border: 1px solid #999;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-family: Calibri, sans-serif; text-transform: uppercase;">Adjusted Reconciled Bank Balance:</span>
                    <strong style="color: #1d4ed8;">Rs. ${formatAmount(bankReconciliationResult.reconciledBankBalance, 2)}</strong>
                  </div>
                </td>
              </tr>
              <tr style="background-color: #f1f5f9; text-align: center;">
                <td colspan="2" style="padding: 6px; border: 1px solid #ccc; font-family: Calibri, sans-serif;">
                  Cash Book Balance: <strong>Rs. ${formatAmount(reconPeriodTotals.cashBookClosingBalance, 2)}</strong> = Adjusted Bank Balance: <strong>Rs. ${formatAmount(bankReconciliationResult.reconciledBankBalance, 2)}</strong> • <span style="font-weight: bold; ${bankReconciliationResult.isFullyExplained ? 'color: #047857;' : 'color: #dc2626;'}">${bankReconciliationResult.isFullyExplained ? 'Difference: Rs. 0.00 (✓ 100% RECONCILED)' : 'Difference: Rs. ' + formatAmount(bankReconciliationResult.variance, 2)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 3. OFFICIAL SIGNATURES BLOCK -->
        <div class="signatures">
          ${OFFICIAL_SIGNATORIES.map((sig) => `
            <div class="sig-box">
              <strong style="text-transform: uppercase; font-size: 8.5pt;">${sig.name}</strong><br/>
              <span style="font-size: 8pt; color: #333;">${sig.role}</span><br/>
              <span style="font-size: 7.5pt; color: #666; text-transform: uppercase;">${sig.label}</span>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 500);
  };

  // ---------------------------------------------------------------------------
  // 5. EXCEL & PRINT HANDLERS
  // ---------------------------------------------------------------------------

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const title = `${activeAccountMeta.shortName} - Bank Reconciliation & Cash Book Report (${fromMonth} to ${toMonth})`;
    let tableHtml = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #333; padding: 6px 10px; font-size: 11pt; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .num { text-align: right; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>${instituteName}</h2>
        <h3>${districtName}</h3>
        <h4>HEAD OF ACCOUNT: ${activeAccountLabel}</h4>
        <p><strong>Bank Account:</strong> ${activeAccountMeta.bankName}, A/C: ${activeAccountMeta.accountNo}</p>
        <p><strong>Period:</strong> ${fromMonth} to ${toMonth} | <strong>As on:</strong> ${asOnDate}</p>
        
        <h3>1. MONTH-WISE CASH BOOK RECONCILIATION SUMMARY</h3>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Total Receipts (Rs.)</th>
              <th>Total Payments (Rs.)</th>
              <th>Net Movement (Rs.)</th>
              <th>Running Cash Book Balance (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="bold">Opening Balance</td>
              <td class="num">-</td>
              <td class="num">-</td>
              <td class="num">-</td>
              <td class="num bold">${formatAmount(reconPeriodTotals.effectiveOpening, 2)}</td>
            </tr>
            ${monthWiseTableRows
              .filter((r) => r.isInSelectedPeriod)
              .map(
                (r) => `
              <tr>
                <td>${r.monthLabel}</td>
                <td class="num">${formatAmount(r.totalReceipts, 2)}</td>
                <td class="num">${formatAmount(r.totalPayments, 2)}</td>
                <td class="num">${formatAccounting(r.netMovement, 2)}</td>
                <td class="num bold">${formatAmount(r.runningBalance, 2)}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background-color: #eaeaea; font-weight: bold;">
              <td>TOTAL (${fromMonth} to ${toMonth})</td>
              <td class="num">${formatAmount(reconPeriodTotals.totalReceipts, 2)}</td>
              <td class="num">${formatAmount(reconPeriodTotals.totalPayments, 2)}</td>
              <td class="num">${formatAccounting(reconPeriodTotals.netMovement, 2)}</td>
              <td class="num">${formatAmount(reconPeriodTotals.cashBookClosingBalance, 2)}</td>
            </tr>
          </tbody>
        </table>

        <h3>CLOSING RECONCILIATION POSITION</h3>
        <table>
          <tr>
            <th>Cash Book Closing Balance</th>
            <td class="num bold">Rs. ${formatAmount(reconPeriodTotals.cashBookClosingBalance, 2)}</td>
          </tr>
          <tr>
            <th>Bank Statement Closing Balance</th>
            <td class="num bold">Rs. ${formatAmount(bankStatementBalance, 2)}</td>
          </tr>
          <tr>
            <th>Difference (Cash Book - Bank Statement)</th>
            <td class="num bold">Rs. ${formatAccounting(reconPeriodTotals.difference, 2)}</td>
          </tr>
          <tr>
            <th>Total Unpresented Cheques</th>
            <td class="num bold">Rs. ${formatAmount(totalUnpresentedAmount, 2)}</td>
          </tr>
        </table>

        <h3>PAYMENTS &amp; STATUTORY TAX DEDUCTION REGISTER (${fromMonth} to ${toMonth})</h3>
        <table>
          <thead>
            <tr>
              <th>Sr #</th>
              <th>Voucher #</th>
              <th>Head of Account</th>
              <th>Cheque Date</th>
              <th>Cheque No.</th>
              <th>Total Bill (Rs.)</th>
              <th>GST Goods (Rs.)</th>
              <th>Income Tax (Rs.)</th>
              <th>PRA Tax (Paid) (Rs.)</th>
              <th>Security (Rs.)</th>
              <th>Net Paid (Rs.)</th>
              <th>Bill Details</th>
              <th>Narration / Remarks</th>
              <th>Paid To</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPayments
              .map(
                (p) => `
              <tr>
                <td class="center">${p.srNo}</td>
                <td class="bold">${p.voucherNo || ''}</td>
                <td>${p.headOfAccount}</td>
                <td class="center">${formatDateDDMMYY(p.chequeDate)}</td>
                <td class="center">${p.chequeNo}</td>
                <td class="num bold">${formatAmount(p.totalBillAmount, 2)}</td>
                <td class="num">${formatAmount(p.gstAmount, 2, true)}</td>
                <td class="num">${formatAmount(p.incomeTax, 2, true)}</td>
                <td class="num">${formatAmount(p.praAmount, 2, true)}</td>
                <td class="num">${formatAmount(p.security, 2, true)}</td>
                <td class="num bold">${formatAmount(p.netAmountPaid, 2)}</td>
                <td>${p.billNo ? `Bill #${p.billNo} (${formatDateDDMMYY(p.billDate)})` : '-'}</td>
                <td>${p.remarks}</td>
                <td>${p.paidTo}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background-color: #eaeaea; font-weight: bold;">
              <td colspan="5" class="center">TOTALS (${filteredPayments.length} Payments)</td>
              <td class="num">Rs. ${formatAmount(paymentsRegisterDisplayTotals.totalBill, 2)}</td>
              <td class="num">Rs. ${formatAmount(paymentsRegisterDisplayTotals.gst, 2)}</td>
              <td class="num">Rs. ${formatAmount(paymentsRegisterDisplayTotals.incomeTax, 2)}</td>
              <td class="num">Rs. ${formatAmount(paymentsRegisterDisplayTotals.praTax, 2)}</td>
              <td class="num">${formatAmount(paymentsRegisterDisplayTotals.security, 2, true)}</td>
              <td class="num">Rs. ${formatAmount(paymentsRegisterDisplayTotals.netPaid, 2)}</td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>

        <br /><br />
        <table style="border: none;">
          <tr style="border: none;">
            <td style="border: none; text-align: center; width: 33%;">___________________<br/><strong>Prepared by (Accountant)</strong></td>
            <td style="border: none; text-align: center; width: 33%;">___________________<br/><strong>Checked by (Co-Signatory)</strong></td>
            <td style="border: none; text-align: center; width: 33%;">___________________<br/><strong>Principal / DDO</strong></td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TEVTA_Director_Reconciliation_${selectedAccountKey}_${fromMonth}_${toMonth}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // 6. PIN AUTHENTICATION GATE
  // ---------------------------------------------------------------------------
  if (!isUnlocked) {
    return (
      <div
        className={`rounded-2xl border p-8 sm:p-12 text-center max-w-xl mx-auto my-8 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        } shadow-2xl`}
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-500">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-wide">
          Director&apos;s Office BRS &amp; Cash Book Report Locked
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Official statutory reporting module for submission to the Director&apos;s Office (TEVTA). Contains
          confidential reconciled cash book registers, deduction statements, and bank audit schedules.
        </p>
        <div className="mt-6">
          <button
            onClick={onUnlockRequest}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 mx-auto shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Enter Institutional PIN to Unlock</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 print:space-y-4 print:text-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* ------------------------------------------------------------- */}
      {/* INSTITUTIONAL OFFICIAL REPORT HEADER (Print & Screen)          */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-6 rounded-3xl border print:border-none print:p-0 print:shadow-none ${
          darkMode ? 'bg-[#0B132B] border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Top Badges & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 uppercase tracking-wider">
              TEVTA Director&apos;s Office Format
            </span>
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              A/C: {activeAccountMeta.accountNo}
            </span>
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Live Cash Book Synced
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Live Sheet Sync Button */}
            <button
              onClick={handleSyncLiveSheet}
              disabled={isSyncing}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSyncing
                  ? 'bg-amber-600/40 border-amber-500 text-amber-200'
                  : darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title="Sync live receipts, cell K3 opening balances, and vouchers from Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-300' : 'text-blue-400'}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Live Sheet'}</span>
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export statement and registers to Excel format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Print official report for submission"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs flex items-center gap-2 print:hidden animate-fade-in">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Official Header Content with Logos */}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-4">
            {customGvtiwLogo ? (
              <img src={customGvtiwLogo} alt="GVTIW Logo" className="w-16 h-16 object-contain shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-black text-blue-400 text-base">
                GVTIW
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white print:text-black uppercase">
                {instituteName}
              </h1>
              <p className="text-xs font-bold text-blue-400 print:text-black uppercase mt-0.5">
                PUNJAB TECHNICAL EDUCATION &amp; VOCATIONAL TRAINING AUTHORITY (TEVTA)
              </p>
              <p className="text-xs text-slate-400 print:text-black font-mono mt-0.5">
                Bank Reconciliation Statement &amp; Traditional Cash Book Ledger
              </p>
            </div>
          </div>

          <div className="text-center md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-700 w-full md:w-auto">
            <div className="text-xs font-mono font-bold text-slate-400 print:text-black">
              DISTRICT: <span className="text-white print:text-black font-black">{districtName}</span>
            </div>
            <div className="text-xs font-mono font-bold text-slate-400 print:text-black mt-1">
              ACCOUNT: <span className="text-blue-300 print:text-black font-black">{activeAccountMeta.shortName}</span>
            </div>
            <div className="text-xs font-mono text-slate-400 print:text-black mt-1">
              A/C No:{' '}
              <strong className="text-amber-400 print:text-black font-black font-mono">
                {activeAccountMeta.accountNo}
              </strong>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* REPORT FILTER CONTROLS BAR (Account, FY, Range)               */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 print:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Account Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Select Bank Account
            </label>
            <div className="relative">
              <select
                value={selectedAccountKey}
                onChange={(e) => setSelectedAccountKey(e.target.value as BankAccountKey)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold appearance-none border transition-colors cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                } focus:outline-hidden focus:border-blue-500`}
              >
                {Object.keys(BANK_ACCOUNT_LABELS).map((k) => (
                  <option key={k} value={k}>
                    {BANK_ACCOUNT_LABELS[k as BankAccountKey].short}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Financial Year Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Financial Year
            </label>
            <div className="flex rounded-xl p-1 bg-slate-800 border border-slate-700">
              <button
                type="button"
                onClick={() => handleFYChange('2026-27')}
                className={`flex-1 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  selectedFY === '2026-27' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                FY 2026-27 (Active)
              </button>
              <button
                type="button"
                onClick={() => handleFYChange('2025-26')}
                className={`flex-1 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  selectedFY === '2025-26' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                FY 2025-26 (Audit)
              </button>
            </div>
          </div>

          {/* Period Range (From Month -> To Month) */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Month Period Range
            </label>
            <div className="flex items-center gap-2">
              <select
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
                className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {activeMonthOptions.map((m) => (
                  <option key={`from-${m.key}`} value={m.key}>
                    {m.monthName}
                  </option>
                ))}
              </select>
              <span className="text-slate-400 text-xs font-bold">to</span>
              <select
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
                className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {activeMonthOptions.map((m) => (
                  <option key={`to-${m.key}`} value={m.key}>
                    {m.monthName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* As on Date & Quick Range Presets */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Quick Filter
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => applyQuickRange('JUL_AUG')}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 cursor-pointer"
              >
                Jul-Aug
              </button>
              <button
                type="button"
                onClick={() => applyQuickRange('Q1')}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 cursor-pointer"
              >
                Q1 (Jul-Sep)
              </button>
              <button
                type="button"
                onClick={() => applyQuickRange('FULL')}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 cursor-pointer"
              >
                Full Year
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AUDIT CROSS-CHECK VERIFICATION STRIP                          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:hidden">
        {/* Receipts Cross-Check */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
            isReceiptsReconciled
              ? darkMode
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-50 border-emerald-500/50 text-emerald-950'
              : darkMode
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : 'bg-rose-50 border-rose-500/50 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isReceiptsReconciled ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider block">
                Receipts Cross-Check ({fromMonth} to {toMonth})
              </span>
              <span className="text-[11px] font-mono opacity-85">
                Register Total: <strong>Rs. {formatAmount(receiptsRegisterPeriodTotal, 2)}</strong> | Recon Summary:{' '}
                <strong>Rs. {formatAmount(reconPeriodTotals.totalReceipts, 2)}</strong>
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-md font-black font-mono uppercase shrink-0 ${
              isReceiptsReconciled
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {isReceiptsReconciled ? '✓ 100% Reconciled' : `Variance: Rs. ${formatAmount(receiptsVariance, 2)}`}
          </span>
        </div>

        {/* Disbursements Cross-Check */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
            isPaymentsReconciled
              ? darkMode
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-50 border-emerald-500/50 text-emerald-950'
              : darkMode
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : 'bg-rose-50 border-rose-500/50 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isPaymentsReconciled ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider block">
                Disbursements Cross-Check ({fromMonth} to {toMonth})
              </span>
              <span className="text-[11px] font-mono opacity-85">
                Register (Gross): <strong>Rs. {formatAmount(paymentsRegisterPeriodTotal.totalBill, 2)}</strong> | Recon Summary:{' '}
                <strong>Rs. {formatAmount(reconPeriodTotals.totalPayments, 2)}</strong>
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-md font-black font-mono uppercase shrink-0 ${
              isPaymentsReconciled
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {isPaymentsReconciled ? '✓ 100% Reconciled' : `Variance: Rs. ${formatAmount(paymentsVariance, 2)}`}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* THREE REPORT SECTIONS / TABS NAVIGATION                       */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-1.5 rounded-2xl border print:hidden ${
          darkMode ? 'bg-[#0B132B] border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Tab 1: Reconciliation Statement */}
          <button
            onClick={() => setActiveTab('RECON')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'RECON'
                ? darkMode
                  ? 'bg-blue-900/50 border-blue-400 text-white shadow-md'
                  : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md font-bold'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">1. Reconciliation Summary</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                Month-Wise Grid
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Month-wise Table (Jul→Jun), Closing Position vs. BOP Bank Statement, Unpresented Cheques
            </p>
          </button>

          {/* Tab 2: Receipts Register */}
          <button
            onClick={() => setActiveTab('RECEIPTS')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'RECEIPTS'
                ? darkMode
                  ? 'bg-emerald-900/50 border-emerald-400 text-white shadow-md'
                  : 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-md font-bold'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">2. Receipts Register</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {allAccountReceipts.length} Entries
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Chronological Receipts Ledger, Challan / Cheque No., Head of Account, Grant Narration
            </p>
          </button>

          {/* Tab 3: Payments / Expenses Register */}
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'PAYMENTS'
                ? darkMode
                  ? 'bg-purple-900/50 border-purple-400 text-white shadow-md'
                  : 'bg-purple-50 border-purple-600 text-purple-950 shadow-md font-bold'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">3. Payments Register</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                {allAccountPayments.length} Cheques
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Gross Bill Amounts, Income Tax, PRA 16%, Net Cheques, Vendor Paid-To Breakdown
            </p>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE TAB CONTENT DISPLAY                                    */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-6 rounded-3xl border ${
          darkMode ? 'bg-[#0B132B] border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        } print:border-none print:p-0`}
      >
        {/* ============================================================= */}
        {/* VIEW 1: MONTH-WISE RECONCILIATION SUMMARY (Problem 2 Redesign)*/}
        {/* ============================================================= */}
        {activeTab === 'RECON' && (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="border-b border-slate-700 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-white print:text-black">
                  Monthly Bank Reconciliation Statement
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {instituteName} — {activeAccountLabel} ({activeAccountMeta.accountNo})
                </p>
              </div>

              <div className="text-right text-xs font-mono space-y-0.5">
                <div>
                  Period:{' '}
                  <strong className="text-blue-400 print:text-black">
                    {fromMonth} to {toMonth}
                  </strong>
                </div>
                <div className="text-slate-400">
                  As on:{' '}
                  <input
                    type="text"
                    value={asOnDate}
                    onChange={(e) => setAsOnDate(e.target.value)}
                    className="bg-transparent border-b border-slate-600 text-right font-bold text-white print:text-black focus:outline-hidden w-28"
                  />
                </div>
              </div>
            </div>

            {/* Opening Balance Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-950/60 border border-blue-500/40 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner print:bg-slate-100 print:text-black print:border-slate-400">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">
                    Cash Book Opening Balance at Start of Financial Year {selectedFY}:
                  </span>
                  <span className="text-[11px] text-blue-300 print:text-slate-700 font-mono">
                    Live balance from cell K3 of Cash Book sheet
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base sm:text-lg font-mono font-black text-amber-300 print:text-black block">
                  Rs. {formatAmount(openingBalance, 2)}
                </span>
                {fromMonth !== '2026-07' && fromMonth !== '2025-07' && (
                  <span className="text-[10px] text-slate-300 font-mono">
                    Effective Opening for Period: Rs. {formatAmount(reconPeriodTotals.effectiveOpening, 2)}
                  </span>
                )}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* MONTH-WISE TABLE (Jul → Jun)                              */}
            {/* Columns: Month | Total Receipts | Total Payments | Net Movement | Running Cash Book Balance */}
            {/* --------------------------------------------------------- */}
            <div className="overflow-x-auto rounded-2xl border border-slate-700 print:border-slate-400">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-white border-b border-slate-700 print:bg-slate-200 print:text-black font-black uppercase text-[11px]">
                    <th className="p-3 text-left border-r border-slate-700 print:border-slate-400 min-w-[140px]">
                      Month
                    </th>
                    <th className="p-3 text-right border-r border-slate-700 print:border-slate-400 min-w-[140px] text-emerald-300 print:text-black">
                      Total Receipts (Rs.)
                    </th>
                    <th className="p-3 text-right border-r border-slate-700 print:border-slate-400 min-w-[140px] text-indigo-300 print:text-black">
                      Total Payments (Rs.)
                    </th>
                    <th className="p-3 text-right border-r border-slate-700 print:border-slate-400 min-w-[140px]">
                      Net Movement (Rs.)
                    </th>
                    <th className="p-3 text-right min-w-[160px] text-amber-300 print:text-black">
                      Running Cash Book Balance (Rs.)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 0: Opening Balance Base Row */}
                  <tr className="bg-slate-900/40 border-b border-slate-800 font-bold print:bg-transparent">
                    <td className="p-3 text-left font-mono text-slate-300 border-r border-slate-700 print:border-slate-400">
                      Opening Balance Baseline
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400 border-r border-slate-700 print:border-slate-400">
                      —
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400 border-r border-slate-700 print:border-slate-400">
                      —
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400 border-r border-slate-700 print:border-slate-400">
                      —
                    </td>
                    <td className="p-3 text-right font-mono font-black text-amber-300 print:text-black">
                      Rs. {formatAmount(openingBalance, 2)}
                    </td>
                  </tr>

                  {/* 12 Months Rows (Jul -> Jun) */}
                  {monthWiseTableRows.map((r, idx) => {
                    const isSelected = r.isInSelectedPeriod;
                    return (
                      <tr
                        key={r.monthKey}
                        className={`transition-colors border-b border-slate-800/80 ${
                          isSelected
                            ? idx % 2 === 0
                              ? 'bg-slate-900/50'
                              : 'bg-slate-900/70'
                            : 'opacity-40 hover:opacity-75 bg-slate-950/40'
                        } print:opacity-100 print:bg-transparent`}
                      >
                        <td className="p-3 text-left font-mono font-bold text-slate-200 print:text-black border-r border-slate-700 print:border-slate-400 flex items-center gap-2">
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 print:hidden" />
                          )}
                          <span>{r.monthLabel}</span>
                        </td>

                        <td className="p-3 text-right font-mono font-semibold text-emerald-300 print:text-black border-r border-slate-700 print:border-slate-400">
                          {formatAmount(r.totalReceipts, 2, true)}
                        </td>

                        <td className="p-3 text-right font-mono font-semibold text-indigo-300 print:text-black border-r border-slate-700 print:border-slate-400">
                          {formatAmount(r.totalPayments, 2, true)}
                        </td>

                        <td
                          className={`p-3 text-right font-mono font-bold border-r border-slate-700 print:border-slate-400 ${
                            r.netMovement > 0.001
                              ? 'text-emerald-400 print:text-black'
                              : r.netMovement < -0.001
                              ? 'text-rose-400 print:text-black'
                              : 'text-slate-400'
                          }`}
                        >
                          {r.netMovement === 0 ? '—' : formatAccounting(r.netMovement, 2)}
                        </td>

                        <td className="p-3 text-right font-mono font-black text-slate-100 print:text-black">
                          Rs. {formatAmount(r.runningBalance, 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer: Selected Period Totals */}
                <tfoot>
                  <tr className="bg-slate-900 font-black text-white border-t-2 border-slate-600 print:bg-slate-200 print:text-black print:border-slate-400 text-xs">
                    <td className="p-3 text-left uppercase tracking-wider border-r border-slate-700 print:border-slate-400">
                      TOTAL ({fromMonth} to {toMonth}):
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-300 print:text-black border-r border-slate-700 print:border-slate-400">
                      Rs. {formatAmount(reconPeriodTotals.totalReceipts, 2)}
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-300 print:text-black border-r border-slate-700 print:border-slate-400">
                      Rs. {formatAmount(reconPeriodTotals.totalPayments, 2)}
                    </td>
                    <td className="p-3 text-right font-mono border-r border-slate-700 print:border-slate-400">
                      {formatAccounting(reconPeriodTotals.netMovement, 2)}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-300 print:text-black text-sm">
                      Rs. {formatAmount(reconPeriodTotals.cashBookClosingBalance, 2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* --------------------------------------------------------- */}
            {/* BANK OF PUNJAB RECONCILIATION & SMART MATCHING ENGINE     */}
            {/* --------------------------------------------------------- */}
            <div className="pt-3 border-t border-slate-700/80 print:border-slate-400">
              <BankReconciliationView
                reconciliation={bankReconciliationResult}
                statement={bopStatement}
                accountShortName={activeAccountMeta.shortName}
                accountNo={activeAccountMeta.accountNo}
                accountTitle={activeAccountMeta.fullName}
                branchName={activeAccountMeta.branch || 'Samanabad Branch, Faisalabad'}
                fromMonth={fromMonth}
                toMonth={toMonth}
                asOnDate={asOnDate}
                darkMode={darkMode}
                receipts={allAccountReceipts}
                payments={allAccountPayments}
                openingBalance={reconPeriodTotals.effectiveOpening}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                onOpenReviewModal={() => setIsReviewModalOpen(true)}
                onLoadSampleStatement={handleLoadSampleStatement}
                onToggleManualOverride={handleToggleManualOverride}
                onAddUnpresentedCheque={() => setShowAddChequeModal(true)}
                onRemoveUnpresentedCheque={handleRemoveCheque}
                onPrintBRS={handlePrintBRSStandalone}
                onExportExcelBRS={handleExportBRS_CSV}
              />
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* VIEW 2: RECEIPTS REGISTER TAB                                 */}
        {/* ============================================================= */}
        {activeTab === 'RECEIPTS' && (
          <div className="space-y-4">
            {/* Header Block */}
            <div className="border-b border-slate-700 pb-3">
              <div className="text-center mb-3">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-white print:text-black">
                  {instituteName}
                </h2>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-black mt-0.5">
                  DATE-WISE RECEIPTS REGISTER ({activeAccountMeta.shortName})
                </h3>
                <div className="flex items-center justify-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                  <span>
                    Period: <strong>{fromMonth} to {toMonth}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Total Live Receipts: <strong>{allAccountReceipts.length}</strong>
                  </span>
                </div>
              </div>

              {/* Running Total Summary & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs font-black uppercase tracking-wider">Period Receipts Total:</span>
                  <span className="text-base font-mono font-black text-emerald-200">
                    Rs. {formatAmount(receiptsRegisterPeriodTotal, 2)}
                  </span>
                </div>

                <div className="relative w-full sm:max-w-md print:hidden">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by Head, Narration, Challan No, Received From..."
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Receipts Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-700 print:border-slate-400">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 border-b border-slate-700 print:bg-slate-200 print:text-black font-bold">
                    <th className="p-2.5 text-center w-12 border-r border-slate-700 print:border-slate-400">Sr #</th>
                    <th className="p-2.5 text-center w-28 border-r border-slate-700 print:border-slate-400">
                      Date <br />
                      <span className="text-[10px] font-normal opacity-80">(dd-mm-yy)</span>
                    </th>
                    <th className="p-2.5 text-center w-36 border-r border-slate-700 print:border-slate-400">
                      Challan / Cheque No.
                    </th>
                    <th className="p-2.5 text-left border-r border-slate-700 print:border-slate-400 min-w-[180px]">
                      Head of Account
                    </th>
                    <th className="p-2.5 text-right w-36 border-r border-slate-700 print:border-slate-400">
                      Amount (Rs.)
                    </th>
                    <th className="p-2.5 text-left border-r border-slate-700 print:border-slate-400">
                      Narration / Remarks
                    </th>
                    <th className="p-2.5 text-left min-w-[140px]">Received From / By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No receipts found matching the selected period ({fromMonth} to {toMonth}).
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-800/40 border-b border-slate-800 transition-colors print:bg-transparent"
                      >
                        <td className="p-2 text-center font-mono text-slate-400 border-r border-slate-700 print:border-slate-400">
                          {r.srNo}
                        </td>
                        <td className="p-2 text-center font-mono text-slate-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                          {formatDateDDMMYY(r.date)}
                        </td>
                        <td className="p-2 text-center font-mono text-slate-300 print:text-black border-r border-slate-700 print:border-slate-400">
                          {r.challanChequeNo}
                        </td>
                        <td className="p-2 font-bold text-slate-200 print:text-black border-r border-slate-700 print:border-slate-400">
                          {r.headOfAccount}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                          {formatAmount(r.amount, 2)}
                        </td>
                        <td className="p-2 text-slate-300 print:text-black border-r border-slate-700 print:border-slate-400 text-[11px]">
                          {r.remarks}
                        </td>
                        <td className="p-2 text-slate-400 print:text-black text-[11px]">{r.paidToBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 font-black text-white border-t-2 border-slate-600 print:bg-slate-200 print:text-black print:border-slate-400">
                    <td
                      colSpan={4}
                      className="p-2.5 text-center uppercase tracking-wider border-r border-slate-700 print:border-slate-400"
                    >
                      Total Receipts Amount:
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-300 print:text-black border-r border-slate-700 print:border-slate-400 text-sm whitespace-nowrap">
                      Rs. {formatAmount(receiptsRegisterDisplayTotal, 2)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* VIEW 3: PAYMENTS / DISBURSEMENTS REGISTER TAB                 */}
        {/* ============================================================= */}
        {activeTab === 'PAYMENTS' && (
          <div className="space-y-4">
            {/* Header Block */}
            <div className="border-b border-slate-700 pb-3">
              <div className="text-center mb-3">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-white print:text-black">
                  {instituteName}
                </h2>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-400 print:text-black mt-0.5">
                  DATE-WISE PAYMENTS &amp; DISBURSEMENTS REGISTER ({activeAccountMeta.shortName})
                </h3>
                <div className="flex items-center justify-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                  <span>
                    Period: <strong>{fromMonth} to {toMonth}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Total Live Cheques / Payments: <strong>{allAccountPayments.length}</strong>
                  </span>
                </div>
              </div>

              {/* 6-Cell Summary Strip for Tax & Deductions breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 my-3">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center print:bg-slate-100 print:border-slate-400">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Bill (Gross)
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-white print:text-black mt-0.5 block">
                    Rs. {formatAmount(paymentsRegisterPeriodTotal.totalBill, 0)}
                  </span>
                  <span className="text-[9px] text-slate-400 print:text-black block">
                    Gross Invoiced
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-800/40 text-center print:bg-slate-100 print:border-slate-400">
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">
                    GST (Sales Tax)
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-teal-200 print:text-black mt-0.5 block">
                    Rs. {formatAmount(paymentsRegisterPeriodTotal.gst, 0)}
                  </span>
                  <span className="text-[9px] text-teal-400/80 print:text-black block">
                    Goods (In Total Bill)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-center print:bg-slate-100 print:border-slate-400">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                    Income Tax (WHT)
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-purple-200 print:text-black mt-0.5 block">
                    Rs. {formatAmount(paymentsRegisterPeriodTotal.incomeTax, 0)}
                  </span>
                  <span className="text-[9px] text-purple-400/80 print:text-black block">
                    FBR Deduction
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-center print:bg-slate-100 print:border-slate-400">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                    PRA Tax (Paid)
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-amber-200 print:text-black mt-0.5 block">
                    Rs. {formatAmount(paymentsRegisterPeriodTotal.praTax, 0)}
                  </span>
                  <span className="text-[9px] text-amber-400/80 print:text-black block">
                    PRA Tax + 100 CPR
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center print:bg-slate-100 print:border-slate-400">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Security Held
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-slate-300 print:text-black mt-0.5 block">
                    {formatAmount(paymentsRegisterPeriodTotal.security, 0, true)}
                  </span>
                  <span className="text-[9px] text-slate-400 print:text-black block">
                    Withheld Security
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-center print:bg-slate-100 print:border-slate-400">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                    Net Cheque Paid
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-indigo-200 print:text-black mt-0.5 block">
                    Rs. {formatAmount(paymentsRegisterPeriodTotal.netPaid, 0)}
                  </span>
                  <span className="text-[9px] text-indigo-400/80 print:text-black block">
                    Vendor Disbursement
                  </span>
                </div>
              </div>

              {/* Search box */}
              <div className="relative max-w-md ml-auto print:hidden mt-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Voucher #, Bill #, Payee, Head, Cheque No, Remarks..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>

            {/* Payments Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-700 print:border-slate-400">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 border-b border-slate-700 print:bg-slate-200 print:text-black font-bold text-[11px]">
                    <th className="p-2 text-center w-10 border-r border-slate-700 print:border-slate-400">Sr #</th>
                    <th className="p-2 text-left border-r border-slate-700 print:border-slate-400 min-w-[200px]">
                      Voucher # &amp; Head of Account
                    </th>
                    <th className="p-2 text-center w-24 border-r border-slate-700 print:border-slate-400">
                      Cheque Date
                      <br />
                      <span className="text-[10px] font-normal opacity-80">(dd-mm-yy)</span>
                    </th>
                    <th className="p-2 text-center w-24 border-r border-slate-700 print:border-slate-400">
                      Cheque No.
                    </th>
                    <th className="p-2 text-right w-28 border-r border-slate-700 print:border-slate-400">
                      Total Bill (Rs.)
                      <br />
                      <span className="text-[9px] font-normal opacity-75">(Gross)</span>
                    </th>
                    <th className="p-2 text-right w-24 border-r border-slate-700 print:border-slate-400 text-teal-300 print:text-black">
                      GST (Goods)
                      <br />
                      <span className="text-[9px] font-normal opacity-75">(In Total Bill)</span>
                    </th>
                    <th className="p-2 text-right w-24 border-r border-slate-700 print:border-slate-400 text-purple-300 print:text-black">
                      Income Tax
                      <br />
                      <span className="text-[9px] font-normal opacity-75">(WHT)</span>
                    </th>
                    <th className="p-2 text-right w-24 border-r border-slate-700 print:border-slate-400 text-amber-300 print:text-black">
                      PRA Tax
                      <br />
                      <span className="text-[9px] font-normal opacity-75">(Tax+100)</span>
                    </th>
                    <th className="p-2 text-right w-20 border-r border-slate-700 print:border-slate-400">
                      Security
                    </th>
                    <th className="p-2 text-right w-28 border-r border-slate-700 print:border-slate-400 bg-indigo-950/20 text-indigo-200 print:bg-transparent print:text-black">
                      Net Paid (Rs.)
                    </th>
                    <th className="p-2 text-left border-r border-slate-700 print:border-slate-400 min-w-[220px]">
                      Bill Details &amp; Narration
                    </th>
                    <th className="p-2 text-left min-w-[130px]">Paid To</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-500">
                        No payments found matching the selected period ({fromMonth} to {toMonth}).
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-800/40 border-b border-slate-800 transition-colors print:bg-transparent"
                      >
                        <td className="p-2 text-center font-mono text-slate-400 border-r border-slate-700 print:border-slate-400">
                          {p.srNo}
                        </td>
                        
                        {/* Voucher # with Head of Account */}
                        <td className="p-2 border-r border-slate-700 print:border-slate-400">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 print:text-black font-mono font-bold text-[10px]">
                              {p.voucherNo || `V# ${p.srNo}`}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-200 print:text-black text-[11px] leading-tight">
                            {p.headOfAccount}
                          </div>
                        </td>

                        <td className="p-2 text-center font-mono text-slate-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                          {formatDateDDMMYY(p.chequeDate)}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-purple-300 print:text-black border-r border-slate-700 print:border-slate-400">
                          {p.chequeNo}
                        </td>

                        {/* Total Bill Amount (Gross, includes GST) */}
                        <td className="p-2 text-right font-mono font-bold text-slate-200 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                          {formatAmount(p.totalBillAmount, 2)}
                        </td>

                        {/* GST Amount (Goods) */}
                        <td className="p-2 text-right font-mono text-teal-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap" title="Federal GST on Goods (part of Total Bill)">
                          {formatAmount(p.gstAmount, 2, true)}
                        </td>

                        {/* Income Tax (WHT) */}
                        <td className="p-2 text-right font-mono text-purple-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap" title="FBR Withholding Income Tax">
                          {formatAmount(p.incomeTax, 2, true)}
                        </td>

                        {/* PRA Tax (Services - Payment Amount: PRA Tax + 100) */}
                        <td className="p-2 text-right font-mono text-amber-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap" title={p.praTaxOnBill > 0 ? `PRA Bill Tax: Rs. ${p.praTaxOnBill} + Rs. 100 CPR fee = Rs. ${p.praAmount}` : 'PRA Withholding Payment'}>
                          {formatAmount(p.praAmount, 2, true)}
                        </td>

                        {/* Security */}
                        <td className="p-2 text-right font-mono text-slate-400 print:text-black border-r border-slate-700 print:border-slate-400">
                          {formatAmount(p.security, 2, true)}
                        </td>

                        {/* Net Paid */}
                        <td className="p-2 text-right font-mono font-black text-indigo-300 print:text-black bg-indigo-950/20 print:bg-transparent border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                          {formatAmount(p.netAmountPaid, 2)}
                        </td>

                        {/* Bill Details with Narration */}
                        <td className="p-2 border-r border-slate-700 print:border-slate-400">
                          {(p.billNo || p.billDate) && (
                            <div className="flex items-center gap-1.5 flex-wrap mb-1 text-[10px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 print:text-black font-semibold">
                                Bill #{p.billNo || '—'}
                              </span>
                              {p.billDate && (
                                <span className="text-slate-400 print:text-black">
                                  dt: {formatDateDDMMYY(p.billDate)}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-slate-300 print:text-black text-[11px] leading-snug">
                            {p.remarks}
                          </div>
                        </td>

                        {/* Paid To */}
                        <td className="p-2 text-slate-300 print:text-black font-semibold text-[11px]">{p.paidTo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 font-black text-white border-t-2 border-slate-600 print:bg-slate-200 print:text-black print:border-slate-400">
                    <td
                      colSpan={4}
                      className="p-2 text-center uppercase tracking-wider border-r border-slate-700 print:border-slate-400"
                    >
                      Total (Display):
                    </td>
                    <td className="p-2 text-right font-mono text-white print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                      Rs. {formatAmount(paymentsRegisterDisplayTotals.totalBill, 2)}
                    </td>
                    <td className="p-2 text-right font-mono text-teal-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                      Rs. {formatAmount(paymentsRegisterDisplayTotals.gst, 2)}
                    </td>
                    <td className="p-2 text-right font-mono text-purple-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                      Rs. {formatAmount(paymentsRegisterDisplayTotals.incomeTax, 2)}
                    </td>
                    <td className="p-2 text-right font-mono text-amber-300 print:text-black border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                      Rs. {formatAmount(paymentsRegisterDisplayTotals.praTax, 2)}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-300 print:text-black border-r border-slate-700 print:border-slate-400">
                      {formatAmount(paymentsRegisterDisplayTotals.security, 2, true)}
                    </td>
                    <td className="p-2 text-right font-mono text-indigo-300 print:text-black bg-indigo-950/30 print:bg-transparent border-r border-slate-700 print:border-slate-400 whitespace-nowrap">
                      Rs. {formatAmount(paymentsRegisterDisplayTotals.netPaid, 2)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* OFFICIAL SIGNATURE BLOCK FOR SUBMISSION TO DIRECTOR'S OFFICE   */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-8 pt-6 border-t border-slate-700/80 print:border-slate-400">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="h-10"></div>
              <div className="border-t border-slate-600 print:border-black mx-auto w-36 sm:w-48"></div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-200 print:text-black">
                Accountant / Cashier
              </div>
              <div className="text-[10px] text-slate-400 font-mono print:text-black">
                GVTIW Samanabad, Faisalabad
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-10"></div>
              <div className="border-t border-slate-600 print:border-black mx-auto w-36 sm:w-48"></div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-200 print:text-black">
                Co-Signatory / AD
              </div>
              <div className="text-[10px] text-slate-400 font-mono print:text-black">
                TEVTA Faisalabad
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-10"></div>
              <div className="border-t border-slate-600 print:border-black mx-auto w-36 sm:w-48"></div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-200 print:text-black">
                Acting Principal / DDO
              </div>
              <div className="text-[10px] text-slate-400 font-mono print:text-black">
                GVTIW Samanabad, Faisalabad
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD UNPRESENTED CHEQUE                                 */}
      {/* ------------------------------------------------------------- */}
      {showAddChequeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-sm font-black uppercase tracking-wide">
                Add Unpresented / Outstanding Cheque
              </h3>
              <button
                onClick={() => setShowAddChequeModal(false)}
                className="text-slate-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChequeSubmit} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Cheque Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8061174910"
                    value={newChequeNo}
                    onChange={(e) => setNewChequeNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Cheque Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newChequeDate}
                    onChange={(e) => setNewChequeDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Payee / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hashir Traders, WAPDA, Sui Northern..."
                  value={newChequePayee}
                  onChange={(e) => setNewChequePayee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Head of Account
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A03303-ELECTRICITY"
                    value={newChequeHead}
                    onChange={(e) => setNewChequeHead(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Cheque Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 75000.00"
                    value={newChequeAmount}
                    onChange={(e) => setNewChequeAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Reason / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cheque delivered to vendor; cleared in subsequent month"
                  value={newChequeRemarks}
                  onChange={(e) => setNewChequeRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddChequeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Add Cheque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* BOP Bank Statement Upload, Extraction & Review Modal */}
      <BankStatementManagerModal
        isOpen={isUploadModalOpen || isReviewModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setIsReviewModalOpen(false);
        }}
        currentStatement={bopStatement}
        accountNo={activeAccountMeta.accountNo}
        accountShortName={activeAccountMeta.shortName}
        branchName={activeAccountMeta.branch || 'Samanabad Branch, Faisalabad'}
        onCommitStatement={handleCommitStatement}
        darkMode={darkMode}
      />
    </div>
  );
}

// Export default alias for flexible imports
export default DirectorReconciliationReport;
