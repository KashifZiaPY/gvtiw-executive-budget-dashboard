import React, { useState, useEffect, useMemo } from 'react';
import {
  INITIAL_MASTER_VOUCHERS,
  INITIAL_CASHBOOK_STATES,
  INSTITUTIONAL_BANK_ACCOUNTS,
  BankAccountKey,
  MasterVoucher,
  CashBookAccountState,
} from '../data/cashBookData';
import { MASTER_PAYEE_LIST, MASTER_ACCOUNT_HEADS } from '../data/voucherMasterLists';
import { AccountHead, OFFICIAL_SIGNATORIES } from '../types';
import { INITIAL_ACCOUNTS } from '../data/initialData';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import { formatPKR, formatPakistaniDate } from '../lib/formatters';
import {
  CashBookStatementView,
} from './CashBookStatementView';
import {
  HeadExpenditureStatementView,
} from './HeadExpenditureStatementView';
import { NsOwnWorkingReportView } from './NsOwnWorkingReportView';
import {
  SearchableCombobox,
  ComboboxOption,
} from './SearchableCombobox';
import { ChequeSearchInput } from './ChequeSearchInput';
import {
  generateCashBookStatementData,
  generateHeadExpenditureStatementData,
  generateMultiHeadExpenditureStatementData,
  generateMultiHeadStatementPrintHtml,
  generateOfficialStatementPrintHtml,
  formatCurrency2Decimals,
  formatCashBookBillInfo,
  CashBookStatementData,
  HeadExpenditureStatementData,
  MultiHeadReportResult,
  CashBookStatementRow,
  resolveBankKeyFromAccount,
  formatGeneratedTimestamp,
  buildPeriodLabel,
} from '../lib/reportingEngine';
import {
  sanitizeCashBookStates,
} from '../lib/apiEngine';
import {
  FileSpreadsheet,
  Building,
  History,
  Printer,
  FileCheck,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  Filter,
  X,
  Sparkles,
  Landmark,
  Receipt,
  Building2,
} from 'lucide-react';
import { AccountHeadDisplay, parseAccountHead } from './AccountHeadTag';
import { DirectorReconciliationReport } from './DirectorReconReport';
import { PinLockScreen } from './PinLockScreen';

interface ReportsModuleProps {
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
  isUnlocked?: boolean;
  onUnlock?: (typedPin: string) => void;
}

type ReportTab =
  | 'DIRECTOR_RECON'
  | 'CASHBOOK'
  | 'HEAD'
  | 'NS_OWN_FY26_27'
  | 'PAYEE'
  | 'CHEQUE'
  | 'AMOUNT'
  | 'BRS'
  | 'AUDIT'
  | 'PRINT_CENTER'
  | 'FBR'
  | 'PRA';

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
  isUnlocked = false,
  onUnlock,
}) => {
  const [internalUnlocked, setInternalUnlocked] = useState(false);
  const isAuthUnlocked = Boolean(isUnlocked || internalUnlocked);
  const [showPinModal, setShowPinModal] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('DIRECTOR_RECON');
  const [vouchers, setVouchers] = useState<MasterVoucher[]>(() => {
    try {
      const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_MASTER_VOUCHERS;
  });

  const [cashBookStates, setCashBookStates] = useState<Record<BankAccountKey, CashBookAccountState>>(() => {
    try {
      const cached = localStorage.getItem('gvtiw_live_cashbooks_v3') || localStorage.getItem('gvtiw_live_cashbook_states_v3');
      if (cached) return sanitizeCashBookStates(JSON.parse(cached));
    } catch {}
    return sanitizeCashBookStates(INITIAL_CASHBOOK_STATES);
  });

  const [accountsStore, setAccountsStore] = useState<AccountHead[]>(() => {
    try {
      const cached = localStorage.getItem('gvtiw_live_accounts_v3');
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_ACCOUNTS;
  });

  useEffect(() => {
    const handleUpdates = () => {
      try {
        const cachedV = localStorage.getItem('gvtiw_live_vouchers_v3');
        if (cachedV) setVouchers(JSON.parse(cachedV));
      } catch {}
      try {
        const cachedCb = localStorage.getItem('gvtiw_live_cashbooks_v3') || localStorage.getItem('gvtiw_live_cashbook_states_v3');
        if (cachedCb) setCashBookStates(sanitizeCashBookStates(JSON.parse(cachedCb)));
      } catch {}
      try {
        const cachedAcc = localStorage.getItem('gvtiw_live_accounts_v3');
        if (cachedAcc) setAccountsStore(JSON.parse(cachedAcc));
      } catch {}
    };

    window.addEventListener('gvtiw_vouchers_updated', handleUpdates);
    window.addEventListener('gvtiw_cashbooks_updated', handleUpdates);
    window.addEventListener('gvtiw_accounts_updated', handleUpdates);
    window.addEventListener('storage', handleUpdates);
    return () => {
      window.removeEventListener('gvtiw_vouchers_updated', handleUpdates);
      window.removeEventListener('gvtiw_cashbooks_updated', handleUpdates);
      window.removeEventListener('gvtiw_accounts_updated', handleUpdates);
      window.removeEventListener('storage', handleUpdates);
    };
  }, []);

  // Common Filters
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Tab-Specific Filters
  const [selectedHead, setSelectedHead] = useState<string>('ALL');
  const [selectedHeads, setSelectedHeads] = useState<string[]>(['ALL']);
  const [headSearchQuery, setHeadSearchQuery] = useState<string>('');
  const [selectedHeadCategory, setSelectedHeadCategory] = useState<string>('ALL');
  const [selectedPayee, setSelectedPayee] = useState<string>('ALL');
  const [chequeQuery, setChequeQuery] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Print Center
  const [voucherSrInput, setVoucherSrInput] = useState('1');
  const [selectedVoucherForPAF, setSelectedVoucherForPAF] = useState<MasterVoucher | null>(null);

  // Date Preset Handlers
  const applyPreset = (type: 'thisMonth' | 'lastMonth' | 'fy' | 'all') => {
    const now = new Date();
    if (type === 'thisMonth') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      setFromDate(`${y}-${m}-01`);
      setToDate(new Date(y, now.getMonth() + 1, 0).toISOString().slice(0, 10));
    } else if (type === 'lastMonth') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevMonthDate.getFullYear();
      const m = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      setFromDate(`${y}-${m}-01`);
      setToDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10));
    } else if (type === 'fy') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0 = Jan, 6 = Jul
      const fyStartYear = currentMonth >= 6 ? currentYear : currentYear - 1;
      const fyEndYear = fyStartYear + 1;
      setFromDate(`${fyStartYear}-07-01`);
      setToDate(`${fyEndYear}-06-30`);
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  const handleOpenPAFByVoucherNo = (voucherNo: string) => {
    if (!voucherNo || voucherNo === '—' || !voucherNo.trim()) return;
    const clean = voucherNo.trim().toUpperCase();
    const v =
      vouchers.find((item) => item.voucherNo?.trim().toUpperCase() === clean) ||
      INITIAL_MASTER_VOUCHERS.find((item) => item.voucherNo?.trim().toUpperCase() === clean);
    if (v) {
      setSelectedVoucherForPAF(v);
    } else {
      const num = parseInt(clean.replace(/\D/g, ''));
      if (!isNaN(num)) {
        const bySr =
          vouchers.find((item) => item.srNo === num) ||
          INITIAL_MASTER_VOUCHERS.find((item) => item.srNo === num);
        if (bySr) setSelectedVoucherForPAF(bySr);
      }
    }
  };

  // Authoritative Cash Book Statement Data
  const cashBookStatementData = useMemo(() => {
    return generateCashBookStatementData(
      vouchers,
      cashBookStates,
      selectedBank,
      fromDate,
      toDate
    );
  }, [vouchers, cashBookStates, selectedBank, fromDate, toDate]);

  // Authoritative Multi-Head Statement Data
  const multiHeadExpenditureData = useMemo(() => {
    return generateMultiHeadExpenditureStatementData(
      vouchers,
      accountsStore,
      selectedHeads,
      selectedBank,
      fromDate,
      toDate,
      headSearchQuery,
      cashBookStates
    );
  }, [vouchers, accountsStore, selectedHeads, selectedBank, fromDate, toDate, headSearchQuery, cashBookStates]);

  // Authoritative Head Expenditure Statement Data (Single Head fallback or first head if multi)
  const headExpenditureStatementData = useMemo(() => {
    if (multiHeadExpenditureData.isMultiHead && multiHeadExpenditureData.headReports.length > 0) {
      return multiHeadExpenditureData.headReports[0];
    }
    return generateHeadExpenditureStatementData(
      vouchers,
      accountsStore,
      selectedHeads.length === 1 ? selectedHeads[0] : selectedHead,
      selectedBank,
      fromDate,
      toDate,
      headSearchQuery,
      cashBookStates
    );
  }, [multiHeadExpenditureData, vouchers, accountsStore, selectedHeads, selectedHead, selectedBank, fromDate, toDate, headSearchQuery, cashBookStates]);

  // Bank Combobox Options & Categories
  const bankCategories = [
    { label: 'All', value: 'ALL', count: 7 },
    { label: 'BOP Accounts', value: 'BOP', count: 5 },
    { label: 'NBP / Treasury', value: 'NBP', count: 1 },
  ];

  const bankComboboxOptions: ComboboxOption[] = useMemo(() => [
    {
      value: 'ALL',
      label: 'All Cashbooks (Consolidated Grouped)',
      code: 'ALL',
      subtitle: 'Consolidated report across all 6 institutional bank accounts',
      icon: '🌐',
      badge: 'ALL',
      badgeColor: 'bg-blue-600 text-white',
      category: 'ALL',
    },
    {
      value: 'Non Salary',
      label: 'Non-Salary (NS) — BOP',
      code: 'NS',
      subtitle: 'BOP A/C: 6580006795600014 (Samanabad)',
      icon: '🏛️',
      badge: 'BOP',
      badgeColor: 'bg-emerald-600 text-white',
      category: 'BOP',
    },
    {
      value: 'Pupil Funds',
      label: 'Pupil Funds (PF) — BOP',
      code: 'PF',
      subtitle: 'BOP A/C: 6580027832200022 (Samanabad)',
      icon: '👥',
      badge: 'BOP',
      badgeColor: 'bg-purple-600 text-white',
      category: 'BOP',
    },
    {
      value: 'Fee Collection',
      label: 'Fee Collection (FC) — BOP',
      code: 'FC',
      subtitle: 'BOP A/C: 6580027832200011 (Samanabad)',
      icon: '💳',
      badge: 'BOP',
      badgeColor: 'bg-indigo-600 text-white',
      category: 'BOP',
    },
    {
      value: 'Securities',
      label: 'Securities (SEC) — BOP',
      code: 'SEC',
      subtitle: 'BOP A/C: 6580027832200044 (Samanabad)',
      icon: '🛡️',
      badge: 'BOP',
      badgeColor: 'bg-amber-600 text-white',
      category: 'BOP',
    },
    {
      value: 'Short Course',
      label: 'Short Course (SC) — BOP',
      code: 'SC',
      subtitle: 'BOP A/C: 6580027832200033 (Samanabad)',
      icon: '🎓',
      badge: 'BOP',
      badgeColor: 'bg-teal-600 text-white',
      category: 'BOP',
    },
    {
      value: 'AAA',
      label: 'AAA Account (AA) — NBP Treasury',
      code: 'AA',
      subtitle: 'NBP A/C: AAA0000000000000 (District Treasury)',
      icon: '⚡',
      badge: 'NBP',
      badgeColor: 'bg-rose-600 text-white',
      category: 'NBP',
    },
  ], []);

  // Head Combobox Options & Categories
  const headCategories = useMemo(() => {
    const counts: Record<string, number> = { ALL: accountsStore.length + 1 };
    accountsStore.forEach((h) => {
      const cat = h.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return [
      { label: 'All Heads', value: 'ALL', count: counts['ALL'] },
      { label: 'Non-Salary (A03)', value: 'Non Salary', count: counts['Non Salary'] || 14 },
      { label: 'Assan Assignment (AAA)', value: 'AAA', count: counts['AAA'] || 20 },
      { label: 'NAVTTC', value: 'NAVTTC', count: counts['NAVTTC'] || 13 },
      { label: 'Own Fund', value: 'Own Fund', count: counts['Own Fund'] || 4 },
      { label: 'Placement', value: 'Placement', count: counts['Placement'] || 4 },
      { label: 'Salary', value: 'Salary', count: counts['Salary'] || 1 },
    ];
  }, [accountsStore]);

  const headComboboxOptions: ComboboxOption[] = useMemo(() => {
    const allOpt: ComboboxOption = {
      value: 'ALL',
      label: 'All Budget Heads (Grouped by Head)',
      code: 'ALL',
      subtitle: 'Comprehensive statement across all sanctioned budget heads',
      icon: '📋',
      badge: 'ALL',
      badgeColor: 'bg-blue-600 text-white',
      category: 'ALL',
    };

    const headOpts: ComboboxOption[] = accountsStore.map((h) => {
      const parsed = parseAccountHead(h.head, h.category, h.code);
      let badgeColor = 'bg-slate-700 text-white font-mono font-black';
      if (parsed.tagType === 'NS') {
        badgeColor = 'bg-sky-600 text-white font-mono font-black';
      } else if (parsed.tagType === 'AAA') {
        badgeColor = 'bg-amber-600 text-white font-mono font-black';
      } else if (parsed.tagType === 'PLACEMENT') {
        badgeColor = 'bg-indigo-700 text-white font-mono font-black';
      } else if (parsed.tagType === 'NAVTTC') {
        badgeColor = 'bg-purple-700 text-white font-mono font-black';
      } else if (parsed.tagType === 'SALARY') {
        badgeColor = 'bg-emerald-700 text-white font-mono font-black';
      } else if (parsed.tagType === 'OWN_FUND') {
        badgeColor = 'bg-rose-700 text-white font-mono font-black';
      }

      return {
        value: h.head,
        label: parsed.baseTitle,
        code: h.code,
        subtitle: `Category: ${h.category || 'Standard'} • Sanctioned Opening: Rs. ${formatCurrency2Decimals(h.opening || 0)}`,
        category: h.category || 'Other',
        badge: parsed.tag || h.category || 'HEAD',
        badgeColor,
        icon: '📑',
      };
    });

    return [allOpt, ...headOpts];
  }, [accountsStore]);

  // Payee Combobox Options
  const payeeComboboxOptions: ComboboxOption[] = useMemo(() => {
    const allOpt: ComboboxOption = {
      value: 'ALL',
      label: 'All Payees & Vendors',
      code: 'ALL',
      subtitle: 'Display transactions for all registered suppliers & payees',
      icon: '👥',
      badge: 'ALL',
      badgeColor: 'bg-blue-600 text-white',
    };

    const opts: ComboboxOption[] = MASTER_PAYEE_LIST.map((p, idx) => ({
      value: p.name,
      label: p.name,
      code: `V-${String(idx + 1).padStart(3, '0')}`,
      subtitle: `NTN: ${p.ntn || '—'} • CNIC: ${p.cnic || '—'}`,
      badge: 'VENDOR',
      badgeColor: 'bg-slate-700 text-white',
      icon: '🏢',
    }));

    return [allOpt, ...opts];
  }, []);

  // Base Date & Bank Filter for General Vouchers (PAYEE, CHEQUE, AMOUNT)
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      // Bank filter
      if (selectedBank !== 'ALL' && !v.bankAccount.includes(selectedBank)) return false;

      // Date filter
      const vDateStr = v.chequeDate || v.billDate;
      if (fromDate || toDate) {
        const vTime = new Date(vDateStr).getTime();
        if (fromDate && vTime < new Date(fromDate).getTime()) return false;
        if (toDate && vTime > new Date(toDate).getTime()) return false;
      }

      // Tab-specific filters
      if (activeReportTab === 'HEAD') {
        const isAll = selectedHeads.length === 0 || selectedHeads.includes('ALL');
        if (!isAll && !selectedHeads.includes(v.accountHead)) {
          return false;
        }
      }

      if (activeReportTab === 'PAYEE' && selectedPayee !== 'ALL' && v.payeeName.toLowerCase() !== selectedPayee.toLowerCase()) {
        return false;
      }

      if (activeReportTab === 'CHEQUE' && chequeQuery.trim()) {
        const q = chequeQuery.toLowerCase();
        const matchesNet = (v.chequeNoNet || '').toLowerCase().includes(q);
        const matchesPra = (v.chequeNoPra || '').toLowerCase().includes(q);
        const matchesWht = (v.chequeNoIncomeTax || '').toLowerCase().includes(q);
        const matchesPayee = (v.payeeName || '').toLowerCase().includes(q);
        if (!matchesNet && !matchesPra && !matchesWht && !matchesPayee) return false;
      }

      if (activeReportTab === 'AMOUNT') {
        const min = parseFloat(minAmount);
        const max = parseFloat(maxAmount);
        if (!isNaN(min) && v.billAmountGross < min) return false;
        if (!isNaN(max) && v.billAmountGross > max) return false;
      }

      if (activeReportTab === 'FBR') {
        const gst = Number(v.gstAmount) || 0;
        if (gst <= 0) return false;
      }

      if (activeReportTab === 'PRA') {
        const praWithheld = Number(v.praAmount) || 0;
        const praBill = Number(v.praTaxOnBill) || 0;
        if (praWithheld <= 0 && praBill <= 0) return false;
      }

      return true;
    });
  }, [
    vouchers,
    selectedBank,
    fromDate,
    toDate,
    activeReportTab,
    selectedHead,
    selectedPayee,
    chequeQuery,
    minAmount,
    maxAmount,
  ]);

  // Aggregates for Filtered Data
  const totalBillExclTax = useMemo(
    () => filteredVouchers.reduce((s, v) => s + (Number(v.billAmtExclTax || v.billAmountGross) || 0), 0),
    [filteredVouchers]
  );
  const totalPraOnBill = useMemo(
    () => filteredVouchers.reduce((s, v) => s + (Number(v.praTaxOnBill) || 0), 0),
    [filteredVouchers]
  );
  const totalGross = useMemo(() => filteredVouchers.reduce((s, v) => s + (v.billAmountGross || 0), 0), [filteredVouchers]);
  const totalGst = useMemo(() => filteredVouchers.reduce((s, v) => s + (v.gstAmount || 0), 0), [filteredVouchers]);
  const totalNet = useMemo(() => filteredVouchers.reduce((s, v) => s + (v.chequeAmountNet || 0), 0), [filteredVouchers]);
  const totalWht = useMemo(() => filteredVouchers.reduce((s, v) => s + (v.incomeTaxAmount || 0), 0), [filteredVouchers]);
  const totalPra = useMemo(() => filteredVouchers.reduce((s, v) => s + (v.praAmount || 0), 0), [filteredVouchers]);

  // OFFICIAL PRINT: CASH BOOK STATEMENT
  const handlePrintCashBook = (data: CashBookStatementData) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const kpiCards = [
      {
        label: data.isConsolidated ? 'CONSOLIDATED OPENING (B/D)' : 'OPENING BALANCE (B/D)',
        amount: data.openingBalance,
        color: '#003399',
        bgColor: '#eff6ff',
        borderColor: '#93c5fd',
      },
      {
        label: 'TOTAL RECEIPTS (+)',
        amount: data.totalReceipts,
        color: '#15803d',
        bgColor: '#f0fdf4',
        borderColor: '#86efac',
      },
      {
        label: 'TOTAL PAYMENTS (-)',
        amount: data.totalPayments,
        color: '#dc2626',
        bgColor: '#fef2f2',
        borderColor: '#fca5a5',
      },
      {
        label: data.isConsolidated ? 'CONSOLIDATED CLOSING (C/D)' : 'NET CLOSING BALANCE (C/D)',
        amount: data.closingBalance,
        color: '#0b2545',
        bgColor: '#f8fafc',
        borderColor: '#cbd5e1',
      },
    ];

    const tableHeaders = [
      'SR#',
      'DATE',
      'ACCT',
      'VOUCHER #',
      'PAID TO / BY',
      'ACCOUNT HEAD',
      'PARTICULAR / NARRATION',
      'CHEQUE #',
      'RECEIPTS (RS.)',
      'PAYMENTS (RS.)',
      'BALANCE (RS.)',
    ];

    const html = generateOfficialStatementPrintHtml({
      reportType: 'CASHBOOK',
      title: data.title,
      subtitle: data.subtitle,
      accountOrHeadInfo: data.accountNoText,
      generatedTimestamp: data.generatedTimestamp,
      periodLabel: data.periodLabel,
      totalTransactionsCount: data.totalTransactionsCount,
      kpiCards,
      tableHeaders,
      isGrouped: data.isConsolidated,
      openingRow: {
        date: data.fromDate ? formatPakistaniDate(data.fromDate) : '01-Jul-2026',
        acct: data.isConsolidated ? 'ALL' : data.groups[0]?.accountKey || 'NS',
        description: data.isConsolidated
          ? 'CONSOLIDATED OPENING BALANCE BROUGHT FORWARD (b/d)'
          : 'OPENING BALANCE BROUGHT FORWARD (b/d)',
        balance: data.openingBalance,
      },
      groups: data.groups.map((g) => ({
        headerTitle: `${g.accountKey === 'NS' ? '🏛️' : g.accountKey === 'PF' ? '👥' : '📋'} ${g.meta.shortName} (${g.accountKey}) CASH BOOK — Account No: ${g.meta.accountNo} • Opening: Rs. ${formatCurrency2Decimals(g.openingBalance)}`,
        rows: g.rows,
        subtotalReceipts: g.totalReceipts,
        subtotalPayments: g.totalPayments,
        subtotalBalance: g.closingBalance,
      })),
      grandTotals: {
        receipts: data.totalReceipts,
        payments: data.totalPayments,
      },
      closingRow: {
        label: 'CLOSING BALANCE CARRIED FORWARD (c/d):',
        formulaText: '[Opening + Receipts - Payments]',
        balance: data.closingBalance,
      },
      customGvtiwLogo,
      customTevtaLogo,
    });

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 400);
  };

  // OFFICIAL PRINT: HEAD EXPENDITURE STATEMENT
  const handlePrintHeadExpenditure = (data: HeadExpenditureStatementData) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    if (multiHeadExpenditureData && multiHeadExpenditureData.isMultiHead) {
      const html = generateMultiHeadStatementPrintHtml({
        multiHeadData: multiHeadExpenditureData,
        periodLabel: buildPeriodLabel(fromDate, toDate),
        generatedTimestamp: formatGeneratedTimestamp(),
        customGvtiwLogo,
        customTevtaLogo,
      });
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 400);
      return;
    }

    const kpiCards = [
      {
        label: 'BUDGET ALLOCATION (OPENING B/D)',
        amount: data.budgetAllocationOpening,
        color: '#003399',
        bgColor: '#eff6ff',
        borderColor: '#93c5fd',
      },
      {
        label: 'TOTAL RECEIPTS / REAPPR (+)',
        amount: data.receiptsReappr,
        color: '#15803d',
        bgColor: '#f0fdf4',
        borderColor: '#86efac',
      },
      {
        label: 'TOTAL EXPENDITURE (-)',
        amount: data.totalExpenditure,
        color: '#dc2626',
        bgColor: '#fef2f2',
        borderColor: '#fca5a5',
      },
      {
        label: 'NET UNSPENT CLOSING (C/D)',
        amount: data.closingUnspentBalance,
        color: '#0b2545',
        bgColor: '#f8fafc',
        borderColor: '#cbd5e1',
      },
    ];

    const tableHeaders = [
      'SR#',
      'DATE',
      'ACCT',
      'VOUCHER #',
      'PAID TO / BY',
      'ACCOUNT HEAD',
      'PARTICULAR / NARRATION',
      'CHEQUE #',
      'RECEIPTS (RS.)',
      'EXPENDITURE (RS.)',
      'UNSPENT BUDGET (RS.)',
    ];

    const html = generateOfficialStatementPrintHtml({
      reportType: 'HEAD',
      title: data.title,
      subtitle: data.subtitle,
      accountOrHeadInfo: data.headCodeText,
      generatedTimestamp: data.generatedTimestamp,
      periodLabel: data.periodLabel,
      totalTransactionsCount: data.totalTransactionsCount,
      kpiCards,
      tableHeaders,
      isGrouped: data.isGroupedAllHeads,
      openingRow: {
        date: data.fromDate ? formatPakistaniDate(data.fromDate) : '01-Jul-2026',
        acct: data.isGroupedAllHeads ? 'ALL' : 'HEAD',
        description: data.isGroupedAllHeads
          ? 'CONSOLIDATED BUDGET ALLOCATION BROUGHT FORWARD (b/d)'
          : 'SANCTIONED BUDGET ALLOCATION BROUGHT FORWARD (b/d)',
        balance: data.budgetAllocationOpening,
      },
      groups: data.groups.map((g) => ({
        headerTitle: `📋 ${g.headCode} — ${g.headName} • Sanctioned Allocation: Rs. ${formatCurrency2Decimals(g.allocationOpening)}`,
        rows: g.rows,
        subtotalReceipts: g.receiptsReappr,
        subtotalPayments: g.totalExpenditure,
        subtotalBalance: g.closingUnspentBalance,
      })),
      grandTotals: {
        receipts: data.receiptsReappr,
        payments: data.totalExpenditure,
      },
      closingRow: {
        label: 'CLOSING UNSPENT BUDGET CARRIED FORWARD (c/d):',
        formulaText: '[Allocation + Receipts - Expenditure]',
        balance: data.closingUnspentBalance,
      },
      customGvtiwLogo,
      customTevtaLogo,
    });

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 400);
  };

  // OFFICIAL PRINT: GENERAL REPORTS (PAYEE, CHEQUE, AMOUNT)
  const handlePrintGeneralReport = (reportTitle: string) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const gvtiwLogoSrc = customGvtiwLogo || '/gvtiw-logo.png';
    const tevtaLogoSrc = customTevtaLogo || '/tevta-logo.png';

    const isPayeeTab = activeReportTab === 'PAYEE';
    const isFbrTab = activeReportTab === 'FBR' || reportTitle === 'FBR';
    const isPraTab = activeReportTab === 'PRA' || reportTitle === 'PRA';
    const hasSpecificPayee = isPayeeTab && selectedPayee && selectedPayee !== 'ALL';
    
    // Main Title: includes payee name if specific payee filtered
    const mainReportTitle = isFbrTab
      ? 'FBR MONTHLY WITHHOLDING STATEMENT'
      : isPraTab
      ? 'PRA MONTHLY SALES TAX STATEMENT'
      : hasSpecificPayee
      ? `PAYEE TRANSACTION STATEMENT — ${selectedPayee.toUpperCase()}`
      : isPayeeTab
      ? 'PAYEE TRANSACTION STATEMENT'
      : `${reportTitle.toUpperCase()}`;
    
    // Subtitle line underneath
    const subTitle = isFbrTab
      ? 'Statement of Tax Deducted at Source under the Income Tax Ordinance, 2001 / Sales Tax Act, 1990'
      : isPraTab
      ? 'Statement of Punjab Sales Tax on Services Withheld under the Punjab Revenue Authority Act.'
      : 'TAX & DISBURSEMENT RECORD';

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${mainReportTitle} — GVTI(W) Samanabad</title>
        <style>
          @page { size: A4 landscape; margin: 6mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 8px;
            font-size: 8.5px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-header-wrap {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5px solid #0b2545;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .logo-container {
            width: 55px;
            height: 55px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo-container img {
            max-width: 52px;
            max-height: 52px;
            object-fit: contain;
          }
          .header-text-block {
            text-align: center;
            flex: 1;
            padding: 0 10px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(${isFbrTab ? 3 : isPraTab ? 4 : 5}, 1fr);
            gap: 6px;
            margin-bottom: 8px;
          }
          .kpi-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 5px 8px;
            text-align: center;
            background-color: #f8fafc;
          }
          .kpi-card span {
            display: block;
            font-size: 8px;
            text-transform: uppercase;
            font-weight: 800;
            color: #475569;
          }
          .kpi-card strong {
            display: block;
            font-size: 11.5px;
            font-family: monospace;
            font-weight: 900;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
            table-layout: fixed;
          }
          th {
            background-color: #0b2545;
            color: #ffffff;
            padding: 5.5px 4px;
            font-weight: 800;
            text-transform: uppercase;
            border: 1px solid #0b2545;
            font-size: 8px;
            letter-spacing: 0.2px;
            line-height: 1.15;
          }
          td {
            padding: 4px 4px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
            line-height: 1.25;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-mono { font-family: monospace; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="report-header-wrap">
          <div class="logo-container">
            <img src="${gvtiwLogoSrc}" alt="GVTIW Logo" onerror="this.style.display='none'" />
          </div>
          <div class="header-text-block">
            <div style="font-size: 7.5px; font-family: monospace; color: #475569; font-weight: bold; margin-bottom: 2px;">Source: Reports &amp; Statements → ${mainReportTitle}</div>
            <h1 style="font-size: 13px; font-weight: 900; color: #0b2545; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
              GOVT. VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD
            </h1>
            <h2 style="font-size: 11px; font-weight: 900; color: #002b66; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.3px;">
              ${mainReportTitle}
            </h2>
            <div style="font-size: 8px; font-weight: 800; color: #475569; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px;">
              ${subTitle}
            </div>
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 3px; font-size: 8px; color: #475569; flex-wrap: wrap;">
              <span><strong>Institute:</strong> GVTI(W) Samanabad (Code: 33028)</span>
              ${isFbrTab ? `<span><strong>NTN:</strong> 9020301 (Withholding Agent)</span>` : ''}
              ${isPraTab ? `<span><strong>PNTN:</strong> 9020301-1 (Withholding Agent)</span>` : ''}
              <span><strong>Bank Account:</strong> ${selectedBank}</span>
              <span><strong>Period:</strong> ${buildPeriodLabel(fromDate, toDate)}</span>
              <span><strong>Generated:</strong> ${formatGeneratedTimestamp()}</span>
              <span><strong>Total Records:</strong> ${filteredVouchers.length}</span>
            </div>
          </div>
          <div class="logo-container">
            <img src="${tevtaLogoSrc}" alt="TEVTA Logo" onerror="this.style.display='none'" />
          </div>
        </div>

        ${isFbrTab ? `
        <div class="kpi-grid">
          <div class="kpi-card" style="border-color: #cbd5e1; background-color: #f8fafc;">
            <span>Gross Bill Amount</span>
            <strong style="color: #0f172a;">Rs. ${formatCurrency2Decimals(totalGross)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #ddd6fe; background-color: #f5f3ff;">
            <span>GST / Sales Tax Withheld</span>
            <strong style="color: #6b21a8;">Rs. ${formatCurrency2Decimals(totalGst)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #a7f3d0; background-color: #ecfdf5;">
            <span>Net Paid (Cheques)</span>
            <strong style="color: #047857;">Rs. ${formatCurrency2Decimals(totalNet)}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 3%;" class="text-center">SR#</th>
              <th style="width: 7%;">DATE</th>
              <th style="width: 7%;" class="text-center">CHEQUE#</th>
              <th style="width: 20%;">PAYEE / VENDOR</th>
              <th style="width: 8%;">NTN / CNIC</th>
              <th style="width: 9%;">BILL/INV # & DATE</th>
              <th style="width: 9.5%;" class="text-right">GROSS BILL (RS.)</th>
              <th style="width: 9.5%;" class="text-right">AMOUNT EXCL. TAX (RS.)</th>
              <th style="width: 9%;" class="text-right">GST / SALES TAX (RS.)</th>
              <th style="width: 10%;" class="text-right">NET PAID (RS.)</th>
              <th style="width: 7%;" class="text-center">VOUCHER#</th>
            </tr>
          </thead>
          <tbody>
            ${filteredVouchers.map((v, i) => `
              <tr style="border-bottom: 1px solid #cbd5e1;">
                <td class="text-center font-mono" style="color: #475569;">${i + 1}</td>
                <td class="font-mono" style="white-space: nowrap;">${formatPakistaniDate(v.chequeDate || v.billDate)}</td>
                <td class="text-center font-mono" style="color: #0f172a;">${v.chequeNoNet || '—'}</td>
                <td style="word-break: break-word;">
                  <div class="font-bold" style="color: #0f172a; line-height: 1.2;">${v.payeeName}</div>
                  ${v.description ? `<div style="font-size: 8px; color: #334155; font-weight: normal; line-height: 1.2; margin-top: 1.5px;">${v.description}</div>` : ''}
                </td>
                <td class="font-mono" style="color: #1e293b; word-break: break-all;">${v.ntnCnic || '—'}</td>
                <td>
                  <div class="font-bold font-mono" style="color: #0f172a; line-height: 1.2;">${v.billNo || '—'}</div>
                  ${v.billDate ? `<div class="font-mono" style="font-size: 8px; color: #334155; font-weight: normal; line-height: 1.2; margin-top: 1.5px; white-space: nowrap;">${formatPakistaniDate(v.billDate)}</div>` : ''}
                </td>
                <td class="text-right font-mono font-bold" style="color: #0f172a; white-space: nowrap;">${formatCurrency2Decimals(v.billAmountGross)}</td>
                <td class="text-right font-mono font-bold" style="color: #0f172a; white-space: nowrap;">${formatCurrency2Decimals(Number(v.billAmtExclTax || v.billAmountGross))}</td>
                <td class="text-right font-mono font-bold" style="color: #6b21a8; white-space: nowrap;">${v.gstAmount > 0 ? formatCurrency2Decimals(v.gstAmount) : '—'}</td>
                <td class="text-right font-mono font-black" style="color: #047857; white-space: nowrap;">${formatCurrency2Decimals(v.chequeAmountNet)}</td>
                <td class="font-mono font-bold text-center" style="color: #1d4ed8; white-space: nowrap;">${v.voucherNo}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #0b2545;">
              <td colspan="6" class="text-right font-black" style="padding: 6px; text-transform: uppercase; color: #0f172a;">
                GRAND TOTALS (${filteredVouchers.length} RECORDS):
              </td>
              <td class="text-right font-mono font-black" style="color: #0f172a; font-size: 9.5px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalGross)}
              </td>
              <td class="text-right font-mono font-black" style="color: #0f172a; font-size: 9.5px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalBillExclTax)}
              </td>
              <td class="text-right font-mono font-black" style="color: #6b21a8; font-size: 9.5px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalGst)}
              </td>
              <td class="text-right font-mono font-black" style="color: #047857; font-size: 10px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalNet)}
              </td>
              <td class="text-center font-mono" style="color: #475569;">—</td>
            </tr>
          </tfoot>
        </table>
        ` : isPraTab ? `
        <div class="kpi-grid">
          <div class="kpi-card" style="border-color: #cbd5e1; background-color: #f8fafc;">
            <span>Total Bill Amount</span>
            <strong style="color: #0f172a;">Rs. ${formatCurrency2Decimals(totalGross)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #fde68a; background-color: #fffbeb;">
            <span>PRA (Bill)</span>
            <strong style="color: #92400e;">Rs. ${formatCurrency2Decimals(totalPraOnBill)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #fde68a; background-color: #fffbeb;">
            <span>PRA Withheld</span>
            <strong style="color: #92400e;">Rs. ${formatCurrency2Decimals(totalPra)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #a7f3d0; background-color: #ecfdf5;">
            <span>Net Paid (Cheques)</span>
            <strong style="color: #047857;">Rs. ${formatCurrency2Decimals(totalNet)}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 3%;" class="text-center">SR#</th>
              <th style="width: 7%;">DATE</th>
              <th style="width: 7%;" class="text-center">PRA CHEQUE#</th>
              <th style="width: 19%;">PAYEE / VENDOR</th>
              <th style="width: 7.5%;">NTN / CNIC</th>
              <th style="width: 8.5%;">BILL/INV # & DATE</th>
              <th style="width: 8.5%;" class="text-right">BILL AMOUNT (RS.)</th>
              <th style="width: 8.5%;" class="text-right">AMOUNT EXCL. TAX (RS.)</th>
              <th style="width: 7.5%;" class="text-right">PRA (BILL) (RS.)</th>
              <th style="width: 8%;" class="text-right">PRA WITHHELD (RS.)</th>
              <th style="width: 9.5%;" class="text-right">NET PAID (RS.)</th>
              <th style="width: 6.5%;" class="text-center">VOUCHER#</th>
            </tr>
          </thead>
          <tbody>
            ${filteredVouchers.map((v, i) => `
              <tr style="border-bottom: 1px solid #cbd5e1;">
                <td class="text-center font-mono" style="color: #475569;">${i + 1}</td>
                <td class="font-mono" style="white-space: nowrap;">${formatPakistaniDate(v.chequeDate || v.billDate)}</td>
                <td class="text-center font-mono" style="color: #0f172a;">${v.chequeNoPra || '—'}</td>
                <td style="word-break: break-word;">
                  <div class="font-bold" style="color: #0f172a; line-height: 1.2;">${v.payeeName}</div>
                  ${v.description ? `<div style="font-size: 8px; color: #334155; font-weight: normal; line-height: 1.2; margin-top: 1.5px;">${v.description}</div>` : ''}
                </td>
                <td class="font-mono" style="color: #1e293b; word-break: break-all;">${v.ntnCnic || '—'}</td>
                <td>
                  <div class="font-bold font-mono" style="color: #0f172a; line-height: 1.2;">${v.billNo || '—'}</div>
                  ${v.billDate ? `<div class="font-mono" style="font-size: 8px; color: #334155; font-weight: normal; line-height: 1.2; margin-top: 1.5px; white-space: nowrap;">${formatPakistaniDate(v.billDate)}</div>` : ''}
                </td>
                <td class="text-right font-mono font-bold" style="color: #0f172a; white-space: nowrap;">${formatCurrency2Decimals(v.billAmountGross)}</td>
                <td class="text-right font-mono font-bold" style="color: #0f172a; white-space: nowrap;">${formatCurrency2Decimals(Number(v.billAmtExclTax || v.billAmountGross))}</td>
                <td class="text-right font-mono font-bold" style="color: #92400e; white-space: nowrap;">${Number(v.praTaxOnBill) > 0 ? formatCurrency2Decimals(v.praTaxOnBill) : '—'}</td>
                <td class="text-right font-mono font-bold" style="color: #92400e; white-space: nowrap;">${v.praAmount > 0 ? formatCurrency2Decimals(v.praAmount) : '—'}</td>
                <td class="text-right font-mono font-black" style="color: #047857; white-space: nowrap;">${formatCurrency2Decimals(v.chequeAmountNet)}</td>
                <td class="font-mono font-bold text-center" style="color: #1d4ed8; white-space: nowrap;">${v.voucherNo}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #0b2545;">
              <td colspan="6" class="text-right font-black" style="padding: 6px; text-transform: uppercase; color: #0f172a;">
                GRAND TOTALS (${filteredVouchers.length} RECORDS):
              </td>
              <td class="text-right font-mono font-black" style="color: #0f172a; font-size: 9.5px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalGross)}
              </td>
              <td class="text-right font-mono font-black" style="color: #0f172a; font-size: 9.5px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalBillExclTax)}
              </td>
              <td class="text-right font-mono font-black" style="color: #92400e; font-size: 9.5px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalPraOnBill)}
              </td>
              <td class="text-right font-mono font-black" style="color: #92400e; font-size: 9.5px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalPra)}
              </td>
              <td class="text-right font-mono font-black" style="color: #047857; font-size: 10px; white-space: nowrap;">
                ${formatCurrency2Decimals(totalNet)}
              </td>
              <td class="text-center font-mono" style="color: #475569;">—</td>
            </tr>
          </tfoot>
        </table>
        ` : `
        <div class="kpi-grid">
          <div class="kpi-card" style="border-color: #cbd5e1; background-color: #f8fafc;">
            <span>Gross Bill Amount</span>
            <strong style="color: #0f172a;">Rs. ${formatCurrency2Decimals(totalGross)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #ddd6fe; background-color: #f5f3ff;">
            <span>GST Sales Tax</span>
            <strong style="color: #6b21a8;">Rs. ${formatCurrency2Decimals(totalGst)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #fca5a5; background-color: #fef2f2;">
            <span>WHT Income Tax</span>
            <strong style="color: #9f1239;">Rs. ${formatCurrency2Decimals(totalWht)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #fde68a; background-color: #fffbeb;">
            <span>PRA Sales Tax</span>
            <strong style="color: #92400e;">Rs. ${formatCurrency2Decimals(totalPra)}</strong>
          </div>
          <div class="kpi-card" style="border-color: #a7f3d0; background-color: #ecfdf5;">
            <span>Net Paid (Cheques)</span>
            <strong style="color: #047857;">Rs. ${formatCurrency2Decimals(totalNet)}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 3%;" class="text-center">SR#</th>
              <th style="width: 6.5%;">VOUCHER#</th>
              <th style="width: 6%;">DATE</th>
              <th style="width: 16%;">PAYEE / VENDOR</th>
              <th style="width: 6%;">BILL/INV #</th>
              <th style="width: 5.5%;">BILL DATE</th>
              <th style="width: 7.5%;" class="text-right">AMOUNT EXCL. TAX (RS.)</th>
              <th style="width: 6.5%;" class="text-right">PRA (BILL) (RS.)</th>
              <th style="width: 7.5%;" class="text-right">GROSS BILL (RS.)</th>
              <th style="width: 6.5%;" class="text-right">GST (RS.)</th>
              <th style="width: 13%;">BUDGET ACCOUNT HEAD</th>
              <th style="width: 5.5%;" class="text-center">CHEQUE#</th>
              <th style="width: 6%;" class="text-right">WHT (RS.)</th>
              <th style="width: 6%;" class="text-right">PRA (RS.)</th>
              <th style="width: 8%;" class="text-right">NET PAID (RS.)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredVouchers.map((v, i) => `
              <tr style="border-bottom: 1px solid #cbd5e1;">
                <td class="text-center font-mono" style="color: #475569;">${i + 1}</td>
                <td class="font-mono font-bold" style="color: #1d4ed8; white-space: nowrap;">${v.voucherNo}</td>
                <td class="font-mono" style="white-space: nowrap;">${v.chequeDate || v.billDate}</td>
                <td style="word-break: break-word;">
                  <div class="font-bold" style="color: #0f172a; line-height: 1.2;">${v.payeeName}</div>
                  ${v.description ? `<div style="font-size: 8px; color: #334155; font-weight: normal; line-height: 1.2; margin-top: 1.5px;">${v.description}</div>` : ''}
                </td>
                <td class="font-mono" style="color: #1e293b;">${v.billNo || '—'}</td>
                <td class="font-mono" style="color: #475569;">${v.billDate || '—'}</td>
                <td class="text-right font-mono" style="color: #0f172a;">${formatCurrency2Decimals(Number(v.billAmtExclTax || v.billAmountGross))}</td>
                <td class="text-right font-mono font-bold" style="color: #92400e;">${Number(v.praTaxOnBill) > 0 ? formatCurrency2Decimals(v.praTaxOnBill) : '—'}</td>
                <td class="text-right font-mono font-bold" style="color: #0f172a;">${formatCurrency2Decimals(v.billAmountGross)}</td>
                <td class="text-right font-mono font-bold" style="color: #6b21a8;">${v.gstAmount > 0 ? formatCurrency2Decimals(v.gstAmount) : '—'}</td>
                <td style="color: #1e293b; font-size: 8px; word-break: break-word;">${v.accountHead}</td>
                <td class="text-center font-mono" style="font-size: 8px; color: #0f172a;">${v.chequeNoNet || '—'}</td>
                <td class="text-right font-mono font-bold" style="color: #9f1239;">${v.incomeTaxAmount > 0 ? formatCurrency2Decimals(v.incomeTaxAmount) : '—'}</td>
                <td class="text-right font-mono font-bold" style="color: #92400e;">${v.praAmount > 0 ? formatCurrency2Decimals(v.praAmount) : '—'}</td>
                <td class="text-right font-mono font-black" style="color: #047857;">${formatCurrency2Decimals(v.chequeAmountNet)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #0b2545;">
              <td colspan="4" class="text-right font-black" style="padding: 6px; text-transform: uppercase; color: #0f172a;">
                GRAND TOTALS (${filteredVouchers.length} RECORDS):
              </td>
              <td class="text-center" style="color: #64748b;">—</td>
              <td class="text-center" style="color: #64748b;">—</td>
              <td class="text-right font-mono font-black" style="color: #0f172a; font-size: 9.5px;">
                ${formatCurrency2Decimals(totalBillExclTax)}
              </td>
              <td class="text-right font-mono font-black" style="color: #92400e; font-size: 9.5px;">
                ${formatCurrency2Decimals(totalPraOnBill)}
              </td>
              <td class="text-right font-mono font-black" style="color: #0f172a; font-size: 9.5px;">
                ${formatCurrency2Decimals(totalGross)}
              </td>
              <td class="text-right font-mono font-black" style="color: #6b21a8; font-size: 9.5px;">
                ${formatCurrency2Decimals(totalGst)}
              </td>
              <td class="text-center" style="color: #64748b;">—</td>
              <td class="text-center" style="color: #64748b;">—</td>
              <td class="text-right font-mono font-black" style="color: #9f1239; font-size: 9.5px;">
                ${formatCurrency2Decimals(totalWht)}
              </td>
              <td class="text-right font-mono font-black" style="color: #92400e; font-size: 9.5px;">
                ${formatCurrency2Decimals(totalPra)}
              </td>
              <td class="text-right font-mono font-black" style="color: #047857; font-size: 10px;">
                ${formatCurrency2Decimals(totalNet)}
              </td>
            </tr>
          </tfoot>
        </table>
        `}

        <div style="display: flex; justify-content: space-between; margin-top: 35px; padding: 0 35px; text-align: center; font-size: 8.5px; page-break-inside: avoid;">
          ${OFFICIAL_SIGNATORIES.map((sig) => `
            <div style="border-top: 1.5px solid #0f172a; width: 170px; padding-top: 5px;">
              <strong style="display: block; font-size: 10px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${sig.name}</strong>
              <span style="display: block; font-size: 9px; color: #334155; font-weight: 600; margin-top: 1px;">${sig.role}</span>
              <span style="display: block; font-size: 7.5px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">${sig.label}</span>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 25px; padding-top: 6px; border-top: 1px dotted #94a3b8; font-size: 7.5px; font-family: monospace; color: #64748b; text-align: center;">
          e-CashBook &amp; Voucher System developed by MKZ for institute 33028
        </div>
      </body>
    </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 400);
  };

  // EXPORT CSV: CASH BOOK STATEMENT
  const handleExportCashBookCSV = (data: CashBookStatementData) => {
    const headers = [
      'Sr No',
      'Date',
      'Account',
      'Voucher No',
      'Paid To / By',
      'Account Head',
      'Particulars / Narration',
      'Cheque No',
      'Receipts (Rs.)',
      'Payments (Rs.)',
      'Balance (Rs.)',
    ];

    const rows: any[] = [];

    // Opening row
    rows.push([
      '—',
      '01-Jul-2026',
      data.isConsolidated ? 'ALL' : data.groups[0]?.accountKey || 'NS',
      '—',
      data.isConsolidated ? 'CONSOLIDATED OPENING BALANCE (b/d)' : 'OPENING BALANCE BROUGHT FORWARD (b/d)',
      '—',
      'Opening Balance brought forward',
      '—',
      '0.00',
      '0.00',
      data.openingBalance.toFixed(2),
    ]);

    let sr = 1;
    for (const g of data.groups) {
      if (data.isConsolidated) {
        rows.push([
          '—',
          '—',
          g.accountKey,
          '—',
          `*** ${g.meta.shortName} (${g.accountKey}) CASH BOOK - Acc No: ${g.meta.accountNo} ***`,
          '—',
          `Opening: Rs. ${g.openingBalance.toFixed(2)}`,
          '—',
          '—',
          '—',
          '—',
        ]);
      }
      for (const r of g.rows) {
        const billText = formatCashBookBillInfo(r.billNo, r.billDate);
        const particularsWithBill = r.particulars
          ? `${r.particulars}\n${billText}`
          : billText;
        rows.push([
          sr++,
          r.date,
          r.accountKey,
          `"${r.voucherNo}"`,
          `"${r.paidToBy}"`,
          `"${r.accountHead}"`,
          `"${particularsWithBill.replace(/"/g, '""')}"`,
          `"${r.chequeNo}"`,
          r.receipts.toFixed(2),
          r.payments.toFixed(2),
          r.balance.toFixed(2),
        ]);
      }
      if (data.isConsolidated) {
        rows.push([
          '—',
          '—',
          g.accountKey,
          '—',
          `SUBTOTAL - ${g.meta.shortName} (${g.accountKey})`,
          '—',
          '—',
          '—',
          g.totalReceipts.toFixed(2),
          g.totalPayments.toFixed(2),
          g.closingBalance.toFixed(2),
        ]);
      }
    }

    // Grand totals
    rows.push([
      '—',
      '—',
      'ALL',
      '—',
      'GRAND TOTALS (Rs.)',
      '—',
      '—',
      '—',
      data.totalReceipts.toFixed(2),
      data.totalPayments.toFixed(2),
      '—',
    ]);

    // Closing balance
    rows.push([
      '—',
      '—',
      'ALL',
      '—',
      'CLOSING BALANCE CARRIED FORWARD (c/d)',
      '—',
      '[Opening + Receipts - Payments]',
      '—',
      '—',
      '—',
      data.closingBalance.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        '"Source: Reports & Statements → Cashbook Statement"',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        '',
        '"e-CashBook & Voucher System developed by MKZ for institute 33028"',
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GVTIW_CashBook_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT CSV: HEAD EXPENDITURE STATEMENT
  const handleExportHeadCSV = (data: HeadExpenditureStatementData) => {
    if (multiHeadExpenditureData && multiHeadExpenditureData.isMultiHead) {
      const headers = [
        'Sr No',
        'Date',
        'Account',
        'Voucher No',
        'Vendor / Paid To',
        'Account Head',
        'Particulars / Narration',
        'Cheque No',
        'Receipts (Rs.)',
        'Expenditure (Rs.)',
        'Remaining Unspent Budget (Rs.)',
      ];
      const rows: any[] = [];

      // Grand Summary row
      rows.push([
        '—',
        '01-Jul-2026',
        'ALL',
        '—',
        'CONSOLIDATED MULTI-HEAD BUDGET ALLOCATION (b/d)',
        '—',
        `Grand Sanctioned Budget Allocation across ${multiHeadExpenditureData.headReports.length} heads`,
        '—',
        '0.00',
        '0.00',
        multiHeadExpenditureData.grandTotal.budgetAllocationOpening.toFixed(2),
      ]);

      let globalSr = 1;
      for (const hReport of multiHeadExpenditureData.headReports) {
        const headCode = hReport.groups[0]?.headCode || hReport.headCodeText;
        const headName = hReport.groups[0]?.headName || hReport.subtitle;
        rows.push([
          '—',
          '—',
          headCode,
          '—',
          `*** ${headCode} - ${headName} ***`,
          '—',
          `Sanctioned Allocation: Rs. ${hReport.budgetAllocationOpening.toFixed(2)}`,
          '—',
          '—',
          '—',
          '—',
        ]);
        rows.push([
          '—',
          '01-Jul-2026',
          headCode,
          '—',
          'SANCTIONED BUDGET ALLOCATION (b/d)',
          '—',
          'Sanctioned Budget Allocation for FY 2026-27',
          '—',
          '0.00',
          '0.00',
          hReport.budgetAllocationOpening.toFixed(2),
        ]);
        for (const g of hReport.groups) {
          for (const r of g.rows) {
            const billText = formatCashBookBillInfo(r.billNo, r.billDate);
            const particularsWithBill = r.particulars ? `${r.particulars}\n${billText}` : billText;
            rows.push([
              globalSr++,
              r.date,
              r.accountKey,
              `"${r.voucherNo}"`,
              `"${r.paidToBy}"`,
              `"${r.accountHead}"`,
              `"${particularsWithBill.replace(/"/g, '""')}"`,
              `"${r.chequeNo}"`,
              r.receipts.toFixed(2),
              r.payments.toFixed(2),
              r.balance.toFixed(2),
            ]);
          }
        }
        rows.push([
          '—',
          '—',
          headCode,
          '—',
          `CLOSING BALANCE (c/d) - ${headCode}`,
          '—',
          `Total Receipts: Rs. ${hReport.receiptsReappr.toFixed(2)} | Total Exp: Rs. ${hReport.totalExpenditure.toFixed(2)}`,
          '—',
          hReport.receiptsReappr.toFixed(2),
          hReport.totalExpenditure.toFixed(2),
          hReport.closingUnspentBalance.toFixed(2),
        ]);
      }

      // Grand totals row
      rows.push([
        '—',
        '—',
        'ALL',
        '—',
        'CONSOLIDATED GRAND TOTALS (Rs.)',
        '—',
        '—',
        '—',
        multiHeadExpenditureData.grandTotal.receiptsReappr.toFixed(2),
        multiHeadExpenditureData.grandTotal.totalExpenditure.toFixed(2),
        multiHeadExpenditureData.grandTotal.closingUnspentBalance.toFixed(2),
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          '"Source: Reports & Statements → Head Expenditure Statement (Multi-Head)"',
          headers.join(','),
          ...rows.map((e) => e.join(',')),
          '',
          '"e-CashBook & Voucher System developed by MKZ for institute 33028"',
        ].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `Consolidated_Multi_Head_Statement_${multiHeadExpenditureData.selectedHeadCodes.join('_')}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      'Sr No',
      'Date',
      'Account',
      'Voucher No',
      'Vendor / Paid To',
      'Account Head',
      'Particulars / Narration',
      'Cheque No',
      'Receipts (Rs.)',
      'Expenditure (Rs.)',
      'Remaining Unspent Budget (Rs.)',
    ];

    const rows: any[] = [];

    // Opening row
    rows.push([
      '—',
      '01-Jul-2026',
      data.isGroupedAllHeads ? 'ALL' : 'HEAD',
      '—',
      data.isGroupedAllHeads ? 'CONSOLIDATED BUDGET ALLOCATION (b/d)' : 'SANCTIONED BUDGET ALLOCATION (b/d)',
      '—',
      'Sanctioned Budget Allocation for FY 2026-27',
      '—',
      '0.00',
      '0.00',
      data.budgetAllocationOpening.toFixed(2),
    ]);

    let sr = 1;
    for (const g of data.groups) {
      if (data.isGroupedAllHeads) {
        rows.push([
          '—',
          '—',
          g.headCode,
          '—',
          `*** ${g.headCode} - ${g.headName} ***`,
          '—',
          `Allocation: Rs. ${g.allocationOpening.toFixed(2)}`,
          '—',
          '—',
          '—',
          '—',
        ]);
      }
      for (const r of g.rows) {
        const billText = formatCashBookBillInfo(r.billNo, r.billDate);
        const particularsWithBill = r.particulars
          ? `${r.particulars}\n${billText}`
          : billText;
        rows.push([
          sr++,
          r.date,
          r.accountKey,
          `"${r.voucherNo}"`,
          `"${r.paidToBy}"`,
          `"${r.accountHead}"`,
          `"${particularsWithBill.replace(/"/g, '""')}"`,
          `"${r.chequeNo}"`,
          r.receipts.toFixed(2),
          r.payments.toFixed(2),
          r.balance.toFixed(2),
        ]);
      }
      if (data.isGroupedAllHeads) {
        rows.push([
          '—',
          '—',
          g.headCode,
          '—',
          `SUBTOTAL - ${g.headCode}`,
          '—',
          '—',
          '—',
          g.receiptsReappr.toFixed(2),
          g.totalExpenditure.toFixed(2),
          g.closingUnspentBalance.toFixed(2),
        ]);
      }
    }

    // Grand totals
    rows.push([
      '—',
      '—',
      'ALL',
      '—',
      'GRAND TOTALS (Rs.)',
      '—',
      '—',
      '—',
      data.receiptsReappr.toFixed(2),
      data.totalExpenditure.toFixed(2),
      '—',
    ]);

    // Closing unspent balance
    rows.push([
      '—',
      '—',
      'ALL',
      '—',
      'CLOSING UNSPENT BUDGET CARRIED FORWARD (c/d)',
      '—',
      '[Allocation + Receipts - Expenditure]',
      '—',
      '—',
      '—',
      data.closingUnspentBalance.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        '"Source: Reports & Statements → Head Expenditure Statement"',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        '',
        '"e-CashBook & Voucher System developed by MKZ for institute 33028"',
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GVTIW_Head_Expenditure_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export General CSV
  const handleExportCSV = (reportName: string) => {
    if (reportName === 'FBR' || activeReportTab === 'FBR') {
      const headers = [
        'Sr No',
        'Date',
        'Cheque No',
        'Payee / Vendor',
        'Particulars / Description',
        'NTN / CNIC',
        'Bill / Inv # & Date',
        'Gross Bill (Rs.)',
        'Amount Excl. Tax (Rs.)',
        'GST / Sales Tax Withheld (Rs.)',
        'Net Paid (Rs.)',
        'Voucher No',
      ];

      const rows = filteredVouchers.map((v, i) => [
        i + 1,
        v.chequeDate || v.billDate,
        `"${v.chequeNoNet || ''}"`,
        `"${v.payeeName.replace(/"/g, '""')}"`,
        `"${(v.description || '').replace(/"/g, '""')}"`,
        `"${(v.ntnCnic || '').replace(/"/g, '""')}"`,
        `"${(v.billNo || '')}${v.billDate ? (v.billNo ? ' (' + v.billDate + ')' : v.billDate) : ''}"`,
        v.billAmountGross,
        Number(v.billAmtExclTax || v.billAmountGross),
        v.gstAmount || 0,
        v.chequeAmountNet,
        `"${v.voucherNo}"`,
      ]);

      rows.push([
        '—',
        '—',
        '—',
        '"GRAND TOTALS (Rs.)"',
        '—',
        '—',
        '—',
        totalGross,
        totalBillExclTax,
        totalGst,
        totalNet,
        '—',
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          '"Source: Reports & Statements → FBR Withholding Statement"',
          headers.join(','),
          ...rows.map((r) => r.join(',')),
          '',
          '"e-CashBook & Voucher System developed by MKZ for institute 33028"',
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `GVTIW_FBR_Monthly_Withholding_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (reportName === 'PRA' || activeReportTab === 'PRA') {
      const headers = [
        'Sr No',
        'Date',
        'PRA Cheque No',
        'Payee / Vendor',
        'Particulars / Description',
        'NTN / CNIC',
        'Bill / Inv # & Date',
        'Bill Amount (Rs.)',
        'Amount Excl. Tax (Rs.)',
        'PRA (Bill) (Rs.)',
        'PRA Withheld (Rs.)',
        'Net Paid (Rs.)',
        'Voucher No',
      ];

      const rows = filteredVouchers.map((v, i) => [
        i + 1,
        v.chequeDate || v.billDate,
        `"${v.chequeNoPra || ''}"`,
        `"${v.payeeName.replace(/"/g, '""')}"`,
        `"${(v.description || '').replace(/"/g, '""')}"`,
        `"${(v.ntnCnic || '').replace(/"/g, '""')}"`,
        `"${(v.billNo || '')}${v.billDate ? (v.billNo ? ' (' + v.billDate + ')' : v.billDate) : ''}"`,
        v.billAmountGross,
        Number(v.billAmtExclTax || v.billAmountGross),
        v.praTaxOnBill || 0,
        v.praAmount || 0,
        v.chequeAmountNet,
        `"${v.voucherNo}"`,
      ]);

      rows.push([
        '—',
        '—',
        '—',
        '"GRAND TOTALS (Rs.)"',
        '—',
        '—',
        '—',
        totalGross,
        totalBillExclTax,
        totalPraOnBill,
        totalPra,
        totalNet,
        '—',
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          '"Source: Reports & Statements → PRA Sales Tax Statement"',
          headers.join(','),
          ...rows.map((r) => r.join(',')),
          '',
          '"e-CashBook & Voucher System developed by MKZ for institute 33028"',
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `GVTIW_PRA_Monthly_Sales_Tax_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      'Sr No',
      'Voucher No',
      'Cheque Date',
      'Payee Name',
      'NTN/CNIC',
      'Bill No',
      'Bill Date',
      'Amount Excl. Tax',
      'PRA (Bill)',
      'Gross Bill Amount',
      'GST Amount',
      'Account Head',
      'Cheque No Net',
      'Income Tax Amount (WHT)',
      'PRA Amount',
      'Cheque Net Amount',
      'Bank Account',
      'Narration',
    ];

    const rows = filteredVouchers.map((v, i) => [
      i + 1,
      `"${v.voucherNo}"`,
      v.chequeDate || v.billDate,
      `"${v.payeeName}"`,
      `"${v.ntnCnic}"`,
      `"${v.billNo}"`,
      `"${v.billDate}"`,
      Number(v.billAmtExclTax || v.billAmountGross),
      v.praTaxOnBill || 0,
      v.billAmountGross,
      v.gstAmount || 0,
      `"${v.accountHead}"`,
      `"${v.chequeNoNet}"`,
      v.incomeTaxAmount,
      v.praAmount,
      v.chequeAmountNet,
      `"${v.bankAccount}"`,
      `"${v.description.replace(/"/g, '""')}"`,
    ]);

    // Grand totals row
    rows.push([
      '—',
      '—',
      '—',
      '"GRAND TOTALS (Rs.)"',
      '—',
      '—',
      '—',
      totalBillExclTax,
      totalPraOnBill,
      totalGross,
      totalGst,
      '—',
      '—',
      totalWht,
      totalPra,
      totalNet,
      '—',
      '—',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"Source: Reports & Statements → ${reportName}"`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        '',
        '"e-CashBook & Voucher System developed by MKZ for institute 33028"',
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GVTIW_${reportName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Audit Log sample entries
  const auditEntries = [
    { id: 'AUD-101', timestamp: '02-Sep-2026 05:20 pm', action: 'NEW_VOUCHER', user: 'kashifzia.tevta@gmail.com', details: 'Recorded Voucher #SC-SEP26-002 for Muddasara Saeed (Net: Rs. 8,480).' },
    { id: 'AUD-102', timestamp: '02-Sep-2026 05:14 pm', action: 'NEW_VOUCHER', user: 'kashifzia.tevta@gmail.com', details: 'Recorded Voucher #SC-SEP26-001 for Akbar Ali (Net: Rs. 1,200).' },
    { id: 'AUD-103', timestamp: '02-Sep-2026 05:10 pm', action: 'NEW_VOUCHER', user: 'kashifzia.tevta@gmail.com', details: 'Recorded Voucher #NS-SEP26-001 for Kashif Zia (Net: Rs. 1,500).' },
    { id: 'AUD-104', timestamp: '02-Sep-2026 05:08 pm', action: 'NEW_VOUCHER', user: 'kashifzia.tevta@gmail.com', details: 'Recorded Voucher #PF-SEP26-001 for Kashif Zia (Net: Rs. 1,664).' },
    { id: 'AUD-105', timestamp: '01-Sep-2026 11:20 am', action: 'NEW_VOUCHER', user: 'kashifzia.tevta@gmail.com', details: 'Recorded Voucher #AA-SEP26-001 for FESCO (Electricity Rs. 137,325).' },
    { id: 'AUD-106', timestamp: '30-Aug-2026 01:14 pm', action: 'DEEP_BACKUP', user: 'kashifzia.tevta@gmail.com', details: 'Full System Deep Backup generated (7 Workbooks + Manifest) to GDrive Folder.' },
  ];

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. REPORT CATEGORY SWITCHER TABS (Aligned with Apps Script)    */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-2 rounded-2xl border ${
        darkMode ? 'bg-[#0B132B] border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none">
          <button
            onClick={() => setActiveReportTab('DIRECTOR_RECON')}
            className={`flex-1 min-w-[170px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'DIRECTOR_RECON'
                ? darkMode ? 'bg-cyan-900/50 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/40' : 'bg-cyan-50 border-cyan-600 text-cyan-950 shadow-md ring-1 ring-cyan-500'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Accounting Data Entry</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Director's Office Reconciliation &amp; Registers</p>
          </button>

          <button
            onClick={() => setActiveReportTab('CASHBOOK')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'CASHBOOK'
                ? darkMode ? 'bg-blue-900/40 border-blue-400 text-white shadow-md' : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Cashbook Statement</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Consolidated &amp; Bank-Wise</p>
          </button>

          <button
            onClick={() => setActiveReportTab('HEAD')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'HEAD'
                ? darkMode ? 'bg-indigo-900/40 border-indigo-400 text-white shadow-md' : 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Head Expenditure</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">By Budget Head</p>
          </button>

          <button
            onClick={() => setActiveReportTab('NS_OWN_FY26_27')}
            className={`flex-1 min-w-[175px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'NS_OWN_FY26_27'
                ? darkMode ? 'bg-teal-900/40 border-teal-400 text-white shadow-md' : 'bg-teal-50 border-teal-600 text-teal-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <FileSpreadsheet className="w-4 h-4 text-teal-400" />
              <span>NS &amp; OWN Working</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">FY 26-27 (GID: 1689777979)</p>
          </button>

          <button
            onClick={() => setActiveReportTab('PAYEE')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'PAYEE'
                ? darkMode ? 'bg-emerald-900/40 border-emerald-400 text-white shadow-md' : 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Payee Statement</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Supplier Ledger</p>
          </button>

          <button
            onClick={() => setActiveReportTab('FBR')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'FBR'
                ? darkMode ? 'bg-purple-900/40 border-purple-400 text-white shadow-md' : 'bg-purple-50 border-purple-600 text-purple-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Landmark className="w-4 h-4 text-purple-400" />
              <span>FBR Withholding</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Monthly Statement</p>
          </button>

          <button
            onClick={() => setActiveReportTab('PRA')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'PRA'
                ? darkMode ? 'bg-amber-900/40 border-amber-400 text-white shadow-md' : 'bg-amber-50 border-amber-600 text-amber-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>PRA Sales Tax</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Monthly Statement</p>
          </button>

          <button
            onClick={() => setActiveReportTab('CHEQUE')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'CHEQUE'
                ? darkMode ? 'bg-amber-900/40 border-amber-400 text-white shadow-md' : 'bg-amber-50 border-amber-600 text-amber-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Cheque Inquiry</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Disbursement Search</p>
          </button>

          <button
            onClick={() => setActiveReportTab('AMOUNT')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'AMOUNT'
                ? darkMode ? 'bg-rose-900/40 border-rose-400 text-white shadow-md' : 'bg-rose-50 border-rose-600 text-rose-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              <span>Amount Range</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">High-Value Audit</p>
          </button>

          <button
            onClick={() => setActiveReportTab('BRS')}
            className={`flex-1 min-w-[140px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'BRS'
                ? darkMode ? 'bg-teal-900/40 border-teal-400 text-white shadow-md' : 'bg-teal-50 border-teal-600 text-teal-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Building className="w-4 h-4 text-teal-400" />
              <span>Bank BRS</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Reconciliation</p>
          </button>

          <button
            onClick={() => setActiveReportTab('AUDIT')}
            className={`flex-1 min-w-[140px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'AUDIT'
                ? darkMode ? 'bg-purple-900/40 border-purple-400 text-white shadow-md' : 'bg-purple-50 border-purple-600 text-purple-950 shadow-md'
                : darkMode ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60' : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <History className="w-4 h-4 text-purple-400" />
              <span>Audit Trail</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">System Logs</p>
          </button>

          <button
            onClick={() => setActiveReportTab('PRINT_CENTER')}
            className={`flex-1 min-w-[140px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'PRINT_CENTER'
                ? darkMode ? 'bg-blue-900/40 border-blue-400 text-white shadow-md' : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Print Center</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">PAF by Sr.#</p>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1.5 CFO OPENING BALANCES VERIFICATION STRIP                     */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-3 rounded-xl border flex items-center justify-between flex-wrap gap-3 text-xs ${
        darkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-50 border-slate-300 shadow-xs'
      }`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200 text-[11px]">
              Audited Opening Balances (FY 2026-27):
            </span>
          </div>
          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            <span>NS: <strong className="text-blue-600 dark:text-blue-400">Rs. {formatCurrency2Decimals(cashBookStates.NS?.openingBalance ?? 2387207)}</strong></span>
            <span>•</span>
            <span>PF: <strong className="text-emerald-600 dark:text-emerald-400">Rs. {formatCurrency2Decimals(cashBookStates.PF?.openingBalance ?? 408588)}</strong></span>
            <span>•</span>
            <span className="bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200">
              FC: <strong className="font-bold">Rs. {formatCurrency2Decimals(cashBookStates.FC?.openingBalance ?? 77717)}</strong>
            </span>
            <span>•</span>
            <span>SEC: <strong className="text-amber-600 dark:text-amber-400">Rs. {formatCurrency2Decimals(cashBookStates.SEC?.openingBalance ?? 357709)}</strong></span>
            <span>•</span>
            <span>SC: <strong className="text-sky-600 dark:text-sky-400">Rs. {formatCurrency2Decimals(cashBookStates.SC?.openingBalance ?? 251567)}</strong></span>
            <span>•</span>
            <span>AAA: <strong className="text-teal-600 dark:text-teal-400">Rs. {formatCurrency2Decimals(cashBookStates.AA?.openingBalance ?? 0)}</strong></span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REPORT FILTERS & CONTROLS STRIP                             */}
      {/* ------------------------------------------------------------- */}
      {['CASHBOOK', 'HEAD', 'PAYEE', 'CHEQUE', 'AMOUNT', 'FBR', 'PRA'].includes(activeReportTab) && (
        <div className={`p-4 rounded-xl border space-y-3.5 ${
          darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          {/* Main Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Bank Account Searchable Combobox */}
            <div className="space-y-1.5">
              <SearchableCombobox
                id="bank-account-combobox"
                label={activeReportTab === 'CASHBOOK' ? 'Cash Book / Bank Account' : 'Bank Account Filter'}
                placeholder="Select Bank Account..."
                searchPlaceholder="Search bank, account #, or code..."
                options={bankComboboxOptions}
                value={selectedBank}
                onChange={(val) => {
                  setSelectedBank(val);
                }}
                darkMode={darkMode}
                categories={bankCategories}
              />

              {/* Quick Bank Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none">
                {[
                  { label: 'ALL', val: 'ALL' },
                  { label: 'NS', val: 'Non Salary' },
                  { label: 'PF', val: 'Pupil Funds' },
                  { label: 'FC', val: 'Fee Collection' },
                  { label: 'SEC', val: 'Securities' },
                  { label: 'SC', val: 'Short Course' },
                  { label: 'AAA', val: 'AAA' },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setSelectedBank(chip.val)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer transition-colors ${
                      selectedBank === chip.val
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Budget Account Head Searchable Combobox (when in HEAD tab) */}
            {activeReportTab === 'HEAD' && (
              <div className="space-y-1.5">
                <SearchableCombobox
                  id="budget-head-combobox"
                  label="Budget Account Head"
                  placeholder="Select Budget Account Head..."
                  searchPlaceholder="Search e.g. A03303, Electricity, Printing, NAVTTC..."
                  options={headComboboxOptions}
                  value={selectedHead}
                  onChange={(val) => {
                    setSelectedHead(val);
                    setSelectedHeads([val]);
                    setHeadSearchQuery('');
                  }}
                  multiSelect={true}
                  selectedValues={selectedHeads}
                  onMultiChange={(vals) => {
                    setSelectedHeads(vals);
                    if (vals.length === 1) {
                      setSelectedHead(vals[0]);
                    } else if (vals.length === 0 || vals.includes('ALL')) {
                      setSelectedHead('ALL');
                    } else {
                      setSelectedHead(vals[0]);
                    }
                    setHeadSearchQuery('');
                  }}
                  darkMode={darkMode}
                  categories={headCategories}
                />

                {/* Quick Head Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none">
                  {[
                    { label: 'ALL', val: 'ALL', tag: null, tagType: null },
                    { label: 'Water', val: 'A03302-WATER CHARGES-NS', tag: '-NS', tagType: 'NS' },
                    { label: 'Water', val: 'A03302-WATER CHARGES-AAA', tag: '-AAA', tagType: 'AAA' },
                    { label: 'Electricity', val: 'A03303-ELECTRICITY CHARGES-NS', tag: '-NS', tagType: 'NS' },
                    { label: 'Electricity', val: 'A03303-ELECTRICITY CHARGES-AAA', tag: '-AAA', tagType: 'AAA' },
                    { label: 'Printing', val: 'A03902-PRINTING CHARGES-NS', tag: '-NS', tagType: 'NS' },
                    { label: 'POL', val: 'A03807-POL CHARGES-NS', tag: '-NS', tagType: 'NS' },
                    { label: 'POL', val: 'A03807-POL CHARGES-AAA', tag: '-AAA', tagType: 'AAA' },
                    { label: 'Bank Charges', val: 'A03101-BANK CHARGES-NS', tag: '-NS', tagType: 'NS' },
                    { label: 'Bank Charges', val: 'A03101-BANK CHARGES-AAA', tag: '-AAA', tagType: 'AAA' },
                    { label: 'Service Charges', val: 'A03933-SERVICE CHARGES', tag: null, tagType: null },
                    { label: 'NAVTTC', val: 'A03970-OTHERS(NAVTTC)', tag: '-NAVTTC', tagType: 'NAVTTC' },
                  ].map((chip, idx) => {
                    const isChipActive =
                      (chip.val === 'ALL' && (selectedHeads.includes('ALL') || selectedHeads.length === 0)) ||
                      (selectedHeads.length === 1 && selectedHeads[0] === chip.val);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedHead(chip.val);
                          setSelectedHeads([chip.val]);
                        }}
                        className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer whitespace-nowrap transition-colors inline-flex items-center gap-1 ${
                          isChipActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{chip.label}</span>
                        {chip.tag && (
                          <span
                            className={`px-1 py-0.2 rounded text-[8px] font-mono font-black uppercase tracking-wider ${
                              chip.tagType === 'NS'
                                ? isChipActive
                                  ? 'bg-sky-300 text-slate-950'
                                  : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                                : chip.tagType === 'AAA'
                                ? isChipActive
                                  ? 'bg-amber-300 text-slate-950'
                                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-slate-300 text-slate-900'
                            }`}
                          >
                            {chip.tag}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payee Filter (when in PAYEE tab) */}
            {activeReportTab === 'PAYEE' && (
              <div className="space-y-1.5">
                <SearchableCombobox
                  id="payee-combobox"
                  label="Payee / Supplier Filter"
                  placeholder="Select Payee / Vendor..."
                  searchPlaceholder="Search supplier or payee name..."
                  options={payeeComboboxOptions}
                  value={selectedPayee}
                  onChange={(val) => setSelectedPayee(val)}
                  darkMode={darkMode}
                />
              </div>
            )}

            {/* Cheque Query (when in CHEQUE tab) */}
            {activeReportTab === 'CHEQUE' && (
              <div className="space-y-1.5">
                <ChequeSearchInput
                  id="cheque-payee-search-input"
                  value={chequeQuery}
                  onChange={(val) => setChequeQuery(val)}
                  vouchers={vouchers}
                  selectedBank={selectedBank}
                  darkMode={darkMode}
                  placeholder="Enter Cheque # or Payee..."
                />
              </div>
            )}

            {/* Amount Range (when in AMOUNT tab) */}
            {activeReportTab === 'AMOUNT' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Min Amount</label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="Min Rs."
                    className={`w-full p-2 rounded-lg border font-mono font-bold outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Amount</label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="Max Rs."
                    className={`w-full p-2 rounded-lg border font-mono font-bold outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Date Presets */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quick Presets</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset('thisMonth')}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('lastMonth')}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('fy')}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  FY 2026-27
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. REPORT DATA DISPLAY: DIRECTOR BRS & CASH BOOK REPORT       */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'DIRECTOR_RECON' && (
        <DirectorReconciliationReport
          initialAccountKey="NS"
          districtName="FAISALABAD"
          instituteName="GVTIW SAMANABAD FAISALABAD"
          isUnlocked={isAuthUnlocked}
          darkMode={darkMode}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          customGopLogo={customGopLogo}
          onUnlockRequest={() => setShowPinModal(true)}
          vouchers={vouchers}
          cashBookStates={cashBookStates}
          accountsStore={accountsStore}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. REPORT DATA DISPLAY: CASHBOOK STATEMENT TAB                */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'CASHBOOK' && (
        <CashBookStatementView
          data={cashBookStatementData}
          darkMode={darkMode}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          onPrint={() => handlePrintCashBook(cashBookStatementData)}
          onExportCSV={() => handleExportCashBookCSV(cashBookStatementData)}
          onOpenPAF={handleOpenPAFByVoucherNo}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. REPORT DATA DISPLAY: HEAD EXPENDITURE STATEMENT TAB        */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'HEAD' && (
        <HeadExpenditureStatementView
          data={headExpenditureStatementData}
          multiHeadData={multiHeadExpenditureData}
          darkMode={darkMode}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          onPrint={() => handlePrintHeadExpenditure(headExpenditureStatementData)}
          onExportCSV={() => handleExportHeadCSV(headExpenditureStatementData)}
          onOpenPAF={handleOpenPAFByVoucherNo}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4B. REPORT DATA DISPLAY: NS & OWN WORKING FY 26-27 (GID: 1689777979) */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'NS_OWN_FY26_27' && (
        <NsOwnWorkingReportView
          darkMode={darkMode}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          customGopLogo={customGopLogo}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TABS: GENERAL TRANSACTION LISTS (PAYEE, CHEQUE, AMOUNT)    */}
      {/* ------------------------------------------------------------- */}
      {['PAYEE', 'CHEQUE', 'AMOUNT'].includes(activeReportTab) && (
        <div className="space-y-4">
          {/* Action strip */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wide">
                  {activeReportTab === 'PAYEE' && selectedPayee !== 'ALL'
                    ? `PAYEE TRANSACTION STATEMENT — ${selectedPayee.toUpperCase()}`
                    : `${activeReportTab} TRANSACTION STATEMENT`}
                </h3>
                {activeReportTab === 'PAYEE' && selectedPayee !== 'ALL' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Filtered
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-slate-400 font-bold block">
                Showing {filteredVouchers.length} Filtered Transactions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV(activeReportTab === 'PAYEE' && selectedPayee !== 'ALL' ? `Payee_${selectedPayee.replace(/\s+/g, '_')}` : activeReportTab)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handlePrintGeneralReport(
                  activeReportTab === 'PAYEE' && selectedPayee !== 'ALL'
                    ? `PAYEE TRANSACTION STATEMENT — ${selectedPayee.toUpperCase()}`
                    : `${activeReportTab} Transaction Statement`
                )}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Print Official Report</span>
              </button>
            </div>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Gross Claimed</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                {formatPKR(totalGross, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-purple-900/60 bg-purple-950/20' : 'bg-purple-50 border-purple-200 shadow-xs'}`}>
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold uppercase block">GST Sales Tax</span>
              <span className="text-base font-black font-mono text-purple-700 dark:text-purple-400">
                {formatPKR(totalGst, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">WHT Income Tax</span>
              <span className="text-base font-black font-mono text-rose-700 dark:text-rose-400">
                {formatPKR(totalWht, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">PRA Sales Tax</span>
              <span className="text-base font-black font-mono text-amber-700 dark:text-amber-400">
                {formatPKR(totalPra, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-emerald-800 bg-emerald-950/20' : 'bg-emerald-50 border-emerald-200 shadow-xs'}`}>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">Net Paid (Cheques)</span>
              <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">
                {formatPKR(totalNet, false)}
              </span>
            </div>
          </div>

          {/* Detailed Table */}
          <div className={`rounded-xl border overflow-hidden shadow-lg ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[420px] table-scrollbar-always-visible">
              <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
                <thead className="bg-[#0b2545] text-white font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-800 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-12 border-r border-slate-800 sticky top-0 bg-[#0b2545]">Sr.#</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 w-24 sticky top-0 bg-[#0b2545]">Voucher#</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 w-24 sticky top-0 bg-[#0b2545]">Date</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 min-w-[170px] max-w-[240px] sticky top-0 bg-[#0b2545]">Payee / Vendor</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-800 w-24 sticky top-0 bg-[#0b2545]">Bill/Invoice #</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-800 w-24 sticky top-0 bg-[#0b2545]">Bill Date</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800 w-28 sticky top-0 bg-[#0b2545]">Amount Excl. Tax (Rs.)</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-800 w-24 text-amber-300 sticky top-0 bg-[#0b2545]">PRA (Bill) (Rs.)</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800 w-28 sticky top-0 bg-[#0b2545]">Gross Bill (Rs.)</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-800 w-24 text-purple-300 sticky top-0 bg-[#0b2545]">GST (Rs.)</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 sticky top-0 bg-[#0b2545]">Budget Account Head</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-800 w-24 sticky top-0 bg-[#0b2545]">Cheque#</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-800 w-20 text-rose-300 sticky top-0 bg-[#0b2545]">WHT (Rs.)</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-800 w-20 text-amber-300 sticky top-0 bg-[#0b2545]">PRA (Rs.)</th>
                    <th className="py-2.5 px-3 text-right w-28 text-emerald-300 sticky top-0 bg-[#0b2545]">Net Paid (Rs.)</th>
                    <th className="py-2.5 px-2 text-center w-16 sticky top-0 bg-[#0b2545]">PAF</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="py-10 text-center text-slate-500 italic">
                        No transactions found matching the selected report filters.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((v, i) => (
                      <tr key={i} className="hover:bg-blue-500/10 transition-colors">
                        <td className="py-2 px-2 text-center font-mono text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/50">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800/50">{v.voucherNo}</td>
                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/50">{v.chequeDate || v.billDate}</td>
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800/50 min-w-[170px] max-w-[240px]">
                          <div className="font-bold text-slate-900 dark:text-white leading-tight">
                            {v.payeeName}
                          </div>
                          {v.description && (
                            <div className="text-[10.5px] text-slate-600 dark:text-slate-400 font-normal leading-normal mt-0.5">
                              {v.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800/50">{v.billNo || '—'}</td>
                        <td className="py-2 px-2.5 font-mono text-slate-700 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/50">{v.billDate || '—'}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800/50">{formatPKR(Number(v.billAmtExclTax || v.billAmountGross), false)}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800/50">{Number(v.praTaxOnBill) > 0 ? formatPKR(Number(v.praTaxOnBill), false) : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800/50">{formatPKR(v.billAmountGross, false)}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-purple-700 dark:text-purple-400 border-r border-slate-200 dark:border-slate-800/50">{v.gstAmount > 0 ? formatPKR(v.gstAmount, false) : '-'}</td>
                        <td className="py-2 px-3 text-[11px] font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/50">
                          <AccountHeadDisplay head={v.accountHead} />
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/50">{v.chequeNoNet || '—'}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-rose-700 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800/50">{v.incomeTaxAmount > 0 ? formatPKR(v.incomeTaxAmount, false) : '-'}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800/50">{v.praAmount > 0 ? formatPKR(v.praAmount, false) : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800/50">{formatPKR(v.chequeAmountNet, false)}</td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => setSelectedVoucherForPAF(v)}
                            className="px-1.5 py-1 text-[10px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                          >
                            PAF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredVouchers.length > 0 && (
                  <tfoot className={`border-t-2 font-bold ${darkMode ? 'border-slate-700 bg-slate-900/90 text-white' : 'border-slate-300 bg-slate-100 text-slate-900'}`}>
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-right uppercase text-[11px] font-black tracking-wider text-slate-700 dark:text-slate-200 border-r border-slate-300 dark:border-slate-800/50">
                        Grand Totals ({filteredVouchers.length} Records):
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500 border-r border-slate-300 dark:border-slate-800/50">—</td>
                      <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500 border-r border-slate-300 dark:border-slate-800/50">—</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white text-xs border-r border-slate-300 dark:border-slate-800/50">
                        {formatPKR(totalBillExclTax, false)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-amber-700 dark:text-amber-400 text-xs border-r border-slate-300 dark:border-slate-800/50">
                        {formatPKR(totalPraOnBill, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white text-xs border-r border-slate-300 dark:border-slate-800/50">
                        {formatPKR(totalGross, false)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-purple-700 dark:text-purple-400 text-xs border-r border-slate-300 dark:border-slate-800/50">
                        {formatPKR(totalGst, false)}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500 border-r border-slate-300 dark:border-slate-800/50">—</td>
                      <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500 border-r border-slate-300 dark:border-slate-800/50">—</td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-rose-700 dark:text-rose-400 text-xs border-r border-slate-300 dark:border-slate-800/50">
                        {formatPKR(totalWht, false)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-black text-amber-700 dark:text-amber-400 text-xs border-r border-slate-300 dark:border-slate-800/50">
                        {formatPKR(totalPra, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-xs border-r border-slate-300 dark:border-slate-800/50">
                        {formatPKR(totalNet, false)}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Official Signatures Block matching PAF Report */}
          <div className="pt-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
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

      {/* ------------------------------------------------------------- */}
      {/* 5.1 TAB: FBR MONTHLY WITHHOLDING STATEMENT                    */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'FBR' && (
        <div className="space-y-4">
          {/* Header & Action Strip */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-600 dark:text-purple-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">
                    FBR Monthly Withholding Statement
                  </h3>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold mt-0.5">
                    Statement of Tax Deducted at Source under the Income Tax Ordinance, 2001 / Sales Tax Act, 1990
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-2 flex-wrap">
                <span><strong>Institute:</strong> GVTI(W) Samanabad (Code: 33028)</span>
                <span>•</span>
                <span><strong>NTN:</strong> 9020301 (Withholding Agent)</span>
                <span>•</span>
                <span><strong>Period:</strong> {buildPeriodLabel(fromDate, toDate)}</span>
                <span>•</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {filteredVouchers.length} Withholding Entries
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleExportCSV('FBR')}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 text-purple-500" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handlePrintGeneralReport('FBR')}
                className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Claimed</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                {formatPKR(totalGross, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-purple-900/60 bg-purple-950/20' : 'bg-purple-50 border-purple-200 shadow-xs'}`}>
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold uppercase block">GST / Sales Tax Withheld</span>
              <span className="text-base font-black font-mono text-purple-700 dark:text-purple-400">
                {formatPKR(totalGst, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-emerald-900/60 bg-emerald-950/20' : 'bg-emerald-50 border-emerald-200 shadow-xs'}`}>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">Net Paid (Cheques)</span>
              <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">
                {formatPKR(totalNet, false)}
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className={`rounded-xl border overflow-hidden ${
            darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[420px] table-scrollbar-always-visible">
              <table className="w-full text-xs text-left min-w-[1100px]">
                <thead className={`text-[10.5px] uppercase font-black border-b sticky top-0 z-20 shadow-sm ${
                  darkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12 sticky top-0">SR#</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[85px] sticky top-0">DATE</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[85px] sticky top-0">CHEQUE#</th>
                    <th className="py-2.5 px-3 min-w-[180px] max-w-[260px] sticky top-0">PAYEE / VENDOR</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[95px] sticky top-0">NTN / CNIC</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[110px] sticky top-0">BILL/INV # & DATE</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[105px] sticky top-0">GROSS BILL (RS.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px] sticky top-0">AMOUNT EXCL. TAX (RS.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[105px] sticky top-0">GST / SALES TAX (RS.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[105px] sticky top-0">NET PAID (RS.)</th>
                    <th className="py-2.5 px-2 text-center w-14 whitespace-nowrap sticky top-0">PAF</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[85px] sticky top-0">VOUCHER#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-slate-500 dark:text-slate-400">
                        No transactions found with GST deductions for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((v, i) => (
                      <tr
                        key={v.voucherNo}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          i % 2 === 1 ? (darkMode ? 'bg-slate-900/30' : 'bg-slate-50/50') : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-mono text-slate-500 dark:text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatPakistaniDate(v.chequeDate || v.billDate)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {v.chequeNoNet || '—'}
                        </td>
                        <td className="py-2 px-3 min-w-[180px] max-w-[260px]">
                          <div className="font-bold text-slate-900 dark:text-white leading-tight">
                            {v.payeeName}
                          </div>
                          {v.description && (
                            <div className="text-[10.5px] text-slate-600 dark:text-slate-400 font-normal leading-normal mt-0.5">
                              {v.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {v.ntnCnic || '—'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold font-mono text-slate-900 dark:text-slate-100 leading-tight">
                            {v.billNo || '—'}
                          </div>
                          {v.billDate && (
                            <div className="text-[10.5px] font-mono text-slate-600 dark:text-slate-400 font-normal leading-normal mt-0.5 whitespace-nowrap">
                              {formatPakistaniDate(v.billDate)}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPKR(v.billAmountGross, false)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPKR(Number(v.billAmtExclTax || v.billAmountGross), false)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                          {v.gstAmount > 0 ? formatPKR(v.gstAmount, false) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatPKR(v.chequeAmountNet, false)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => setSelectedVoucherForPAF(v)}
                            className="px-1.5 py-1 text-[10px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                          >
                            PAF
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-center text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {v.voucherNo}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredVouchers.length > 0 && (
                  <tfoot className={`font-bold border-t-2 ${
                    darkMode ? 'bg-slate-900/90 border-purple-500/50 text-white' : 'bg-purple-50 border-purple-600 text-slate-900'
                  }`}>
                    <tr>
                      <td colSpan={6} className="py-3 px-3 text-right font-black uppercase text-[11px] tracking-wider">
                        GRAND TOTALS ({filteredVouchers.length} WITHHOLDING RECORDS):
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                        {formatPKR(totalGross, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                        {formatPKR(totalBillExclTax, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-purple-700 dark:text-purple-400 whitespace-nowrap">
                        {formatPKR(totalGst, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatPKR(totalNet, false)}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500">—</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400 dark:text-slate-500">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Official Signatures Block matching PAF Report */}
          <div className="pt-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
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

      {/* ------------------------------------------------------------- */}
      {/* 5.2 TAB: PRA MONTHLY SALES TAX STATEMENT                      */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'PRA' && (
        <div className="space-y-4">
          {/* Header & Action Strip */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-amber-600/20 text-amber-600 dark:text-amber-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">
                    PRA Monthly Sales Tax Statement
                  </h3>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                    Statement of Punjab Sales Tax on Services Withheld under the Punjab Revenue Authority Act.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-2 flex-wrap">
                <span><strong>Institute:</strong> GVTI(W) Samanabad (Code: 33028)</span>
                <span>•</span>
                <span><strong>PNTN:</strong> 9020301-1 (Withholding Agent)</span>
                <span>•</span>
                <span><strong>Period:</strong> {buildPeriodLabel(fromDate, toDate)}</span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {filteredVouchers.length} PRA Service Tax Entries
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleExportCSV('PRA')}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handlePrintGeneralReport('PRA')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-slate-900" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Total Bill Amount</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                {formatPKR(totalGross, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-amber-900/60 bg-amber-950/20' : 'bg-amber-50 border-amber-200 shadow-xs'}`}>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase block">PRA (Bill)</span>
              <span className="text-base font-black font-mono text-amber-700 dark:text-amber-400">
                {formatPKR(totalPraOnBill, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-amber-900/60 bg-amber-950/20' : 'bg-amber-50 border-amber-200 shadow-xs'}`}>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase block">PRA Withheld</span>
              <span className="text-base font-black font-mono text-amber-700 dark:text-amber-400">
                {formatPKR(totalPra, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-emerald-900/60 bg-emerald-950/20' : 'bg-emerald-50 border-emerald-200 shadow-xs'}`}>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">Net Paid (Cheques)</span>
              <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">
                {formatPKR(totalNet, false)}
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className={`rounded-xl border overflow-hidden ${
            darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[420px] table-scrollbar-always-visible">
              <table className="w-full text-xs text-left min-w-[1150px]">
                <thead className={`text-[10.5px] uppercase font-black border-b sticky top-0 z-20 shadow-sm ${
                  darkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12 sticky top-0">SR#</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[85px] sticky top-0">DATE</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[85px] sticky top-0">PRA CHEQUE#</th>
                    <th className="py-2.5 px-3 min-w-[180px] max-w-[260px] sticky top-0">PAYEE / VENDOR</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[95px] sticky top-0">NTN / CNIC</th>
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[110px] sticky top-0">BILL/INV # & DATE</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[105px] sticky top-0">BILL AMOUNT (RS.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[110px] sticky top-0">AMOUNT EXCL. TAX (RS.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[105px] sticky top-0">PRA (BILL) (RS.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[105px] sticky top-0">PRA WITHHELD (RS.)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[105px] sticky top-0">NET PAID (RS.)</th>
                    <th className="py-2.5 px-2 text-center w-14 whitespace-nowrap sticky top-0">PAF</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[85px] sticky top-0">VOUCHER#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-10 text-slate-500 dark:text-slate-400">
                        No transactions found with PRA service tax for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((v, i) => (
                      <tr
                        key={v.voucherNo}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          i % 2 === 1 ? (darkMode ? 'bg-slate-900/30' : 'bg-slate-50/50') : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-mono text-slate-500 dark:text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatPakistaniDate(v.chequeDate || v.billDate)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {v.chequeNoPra || '—'}
                        </td>
                        <td className="py-2 px-3 min-w-[180px] max-w-[260px]">
                          <div className="font-bold text-slate-900 dark:text-white leading-tight">
                            {v.payeeName}
                          </div>
                          {v.description && (
                            <div className="text-[10.5px] text-slate-600 dark:text-slate-400 font-normal leading-normal mt-0.5">
                              {v.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {v.ntnCnic || '—'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold font-mono text-slate-900 dark:text-slate-100 leading-tight">
                            {v.billNo || '—'}
                          </div>
                          {v.billDate && (
                            <div className="text-[10.5px] font-mono text-slate-600 dark:text-slate-400 font-normal leading-normal mt-0.5 whitespace-nowrap">
                              {formatPakistaniDate(v.billDate)}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPKR(v.billAmountGross, false)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPKR(Number(v.billAmtExclTax || v.billAmountGross), false)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          {Number(v.praTaxOnBill) > 0 ? formatPKR(Number(v.praTaxOnBill), false) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          {v.praAmount > 0 ? formatPKR(v.praAmount, false) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatPKR(v.chequeAmountNet, false)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => setSelectedVoucherForPAF(v)}
                            className="px-1.5 py-1 text-[10px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                          >
                            PAF
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-center text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {v.voucherNo}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredVouchers.length > 0 && (
                  <tfoot className={`font-bold border-t-2 ${
                    darkMode ? 'bg-slate-900/90 border-amber-500/50 text-white' : 'bg-amber-50 border-amber-600 text-slate-900'
                  }`}>
                    <tr>
                      <td colSpan={6} className="py-3 px-3 text-right font-black uppercase text-[11px] tracking-wider">
                        GRAND TOTALS ({filteredVouchers.length} PRA RECORDS):
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                        {formatPKR(totalGross, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                        {formatPKR(totalBillExclTax, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        {formatPKR(totalPraOnBill, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        {formatPKR(totalPra, false)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatPKR(totalNet, false)}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500">—</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400 dark:text-slate-500">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Official Signatures Block matching PAF Report */}
          <div className="pt-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
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

      {/* TAB: BANK RECONCILIATION STATEMENT (BRS) */}
      {activeReportTab === 'BRS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(INSTITUTIONAL_BANK_ACCOUNTS) as BankAccountKey[]).map((key) => {
              const meta = INSTITUTIONAL_BANK_ACCOUNTS[key];
              const state = cashBookStates[key] || INITIAL_CASHBOOK_STATES[key];

              return (
                <div
                  key={key}
                  className={`p-5 rounded-2xl border ${
                    darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-3">
                    <div>
                      <span className="font-extrabold text-sm uppercase block text-white">{meta.shortName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">A/C: {meta.accountNo}</span>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 font-bold">
                      {meta.code}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cashbook Closing Balance:</span>
                      <strong className="text-amber-300">{formatPKR(state.closingBalance, false)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Unpresented Cheques:</span>
                      <span className="text-slate-400">Rs. 0.00</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700 font-bold">
                      <span className="text-emerald-400">Reconciled Bank Balance:</span>
                      <strong className="text-emerald-400">{formatPKR(state.reconciledBankBalance, false)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: AUDIT TRAIL */}
      {activeReportTab === 'AUDIT' && (
        <div className={`p-5 rounded-2xl border ${
          darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <span>Institutional Audit Log & System Activity</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Real-Time Tamper-Resistant</span>
          </div>

          <div className="space-y-2.5">
            {auditEntries.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-purple-400">{a.id}</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {a.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{a.timestamp}</span>
                  </div>
                  <p className="text-slate-200">{a.details}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">{a.user}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: PRINT CENTER */}
      {activeReportTab === 'PRINT_CENTER' && (
        <div className={`p-6 rounded-2xl border max-w-xl mx-auto ${
          darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
        }`}>
          <div className="text-center mb-6">
            <Printer className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h3 className="text-base font-black uppercase tracking-tight">Print Center & Document Retrieval</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Retrieve official PAF (N&apos;Sheet) [B4:K49] &amp; Sanction Order XL [A1:H23] by Voucher Sr.#
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={vouchers.length}
              value={voucherSrInput}
              onChange={(e) => setVoucherSrInput(e.target.value)}
              placeholder="Enter Voucher Sr.# (e.g. 40, 41, 42)"
              className="flex-1 p-2.5 rounded-xl border border-slate-700 bg-slate-900 font-mono text-sm font-bold text-white outline-none"
            />
            <button
              onClick={() => {
                const sr = parseInt(voucherSrInput.trim());
                if (isNaN(sr)) return;
                const found = vouchers.find((v) => v.srNo === sr);
                if (found) setSelectedVoucherForPAF(found);
                else alert(`Voucher with Sr.# ${sr} not found.`);
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              <span>Load Voucher</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment Approval Form Modal */}
      {selectedVoucherForPAF && (
        <PaymentApprovalForm
          voucher={selectedVoucherForPAF}
          onClose={() => setSelectedVoucherForPAF(null)}
          isModal={true}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          customGopLogo={customGopLogo}
        />
      )}

      {/* Admin Security PIN Unlock Modal */}
      {showPinModal && !isAuthUnlocked && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowPinModal(false)}
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
                setShowPinModal(false);
                setInternalUnlocked(true);
                if (onUnlock) {
                  onUnlock(pin);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

