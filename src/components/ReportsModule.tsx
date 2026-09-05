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
import { AccountHead } from '../types';
import { INITIAL_ACCOUNTS } from '../data/initialData';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import { formatPKR } from '../lib/formatters';
import {
  CashBookStatementView,
} from './CashBookStatementView';
import {
  HeadExpenditureStatementView,
} from './HeadExpenditureStatementView';
import {
  SearchableCombobox,
  ComboboxOption,
} from './SearchableCombobox';
import {
  generateCashBookStatementData,
  generateHeadExpenditureStatementData,
  generateOfficialStatementPrintHtml,
  formatCurrency2Decimals,
  CashBookStatementData,
  HeadExpenditureStatementData,
  CashBookStatementRow,
  resolveBankKeyFromAccount,
  formatGeneratedTimestamp,
  buildPeriodLabel,
} from '../lib/reportingEngine';
import {
  sanitizeCashBookStates,
  updateBankAccountOpeningBalance,
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
  Edit3,
  X,
  Sparkles,
} from 'lucide-react';

interface ReportsModuleProps {
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
}

type ReportTab =
  | 'CASHBOOK'
  | 'HEAD'
  | 'PAYEE'
  | 'CHEQUE'
  | 'AMOUNT'
  | 'BRS'
  | 'AUDIT'
  | 'PRINT_CENTER';

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('CASHBOOK');
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
  const [headSearchQuery, setHeadSearchQuery] = useState<string>('');
  const [selectedHeadCategory, setSelectedHeadCategory] = useState<string>('ALL');
  const [selectedPayee, setSelectedPayee] = useState<string>('ALL');
  const [chequeQuery, setChequeQuery] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Opening Balance CFO Audit & Verification State
  const [showOpeningAuditModal, setShowOpeningAuditModal] = useState(false);
  const [editingOpeningBank, setEditingOpeningBank] = useState<BankAccountKey | null>(null);
  const [openingInputVal, setOpeningInputVal] = useState<string>('');

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
      const y = now.getFullYear();
      const m = String(now.getMonth()).padStart(2, '0');
      setFromDate(`${y}-${m}-01`);
      setToDate(new Date(y, now.getMonth(), 0).toISOString().slice(0, 10));
    } else if (type === 'fy') {
      setFromDate('2026-07-01');
      setToDate('2027-06-30');
    } else {
      setFromDate('');
      setToDate('');
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

  // Authoritative Head Expenditure Statement Data
  const headExpenditureStatementData = useMemo(() => {
    return generateHeadExpenditureStatementData(
      vouchers,
      accountsStore,
      selectedHead,
      selectedBank,
      fromDate,
      toDate,
      headSearchQuery,
      cashBookStates
    );
  }, [vouchers, accountsStore, selectedHead, selectedBank, fromDate, toDate, headSearchQuery, cashBookStates]);

  // Handle Opening Balance Adjustment
  const handleSaveOpeningBalance = (bankKey: BankAccountKey, val: number) => {
    const updated = updateBankAccountOpeningBalance(bankKey, val);
    setCashBookStates({ ...updated });
    setEditingOpeningBank(null);
  };

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
      { label: 'NAVTTC', value: 'NAVTTC', count: counts['NAVTTC'] || 13 },
      { label: 'Own Fund', value: 'Own Fund', count: counts['Own Fund'] || 4 },
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
      let badgeColor = 'bg-slate-700 text-white';
      if (h.category === 'Non Salary') badgeColor = 'bg-emerald-700 text-white';
      else if (h.category === 'NAVTTC') badgeColor = 'bg-blue-700 text-white';
      else if (h.category === 'Own Fund' || h.head.includes('FEE') || h.head.includes('PUPIL')) badgeColor = 'bg-purple-700 text-white';

      return {
        value: h.head,
        label: h.head,
        code: h.code,
        subtitle: `Category: ${h.category || 'Standard'} • Sanctioned Opening: Rs. ${formatCurrency2Decimals(h.opening || 0)}`,
        category: h.category || 'Other',
        badge: h.category || 'HEAD',
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
      if (activeReportTab === 'HEAD' && selectedHead !== 'ALL' && v.accountHead !== selectedHead) {
        return false;
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
  const totalGross = useMemo(() => filteredVouchers.reduce((s, v) => s + v.billAmountGross, 0), [filteredVouchers]);
  const totalNet = useMemo(() => filteredVouchers.reduce((s, v) => s + v.chequeAmountNet, 0), [filteredVouchers]);
  const totalWht = useMemo(() => filteredVouchers.reduce((s, v) => s + v.incomeTaxAmount, 0), [filteredVouchers]);
  const totalPra = useMemo(() => filteredVouchers.reduce((s, v) => s + v.praAmount, 0), [filteredVouchers]);

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
        date: '01-Jul-2026',
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
        date: '01-Jul-2026',
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

    const kpiCards = [
      {
        label: 'GROSS CLAIMED',
        amount: totalGross,
        color: '#0f172a',
        bgColor: '#f8fafc',
        borderColor: '#cbd5e1',
      },
      {
        label: 'WHT INCOME TAX',
        amount: totalWht,
        color: '#be123c',
        bgColor: '#fef2f2',
        borderColor: '#fca5a5',
      },
      {
        label: 'PRA SALES TAX',
        amount: totalPra,
        color: '#b45309',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
      },
      {
        label: 'NET PAID (CHEQUES)',
        amount: totalNet,
        color: '#047857',
        bgColor: '#ecfdf5',
        borderColor: '#a7f3d0',
      },
    ];

    const tableHeaders = [
      'SR#',
      'DATE',
      'ACCT',
      'VOUCHER #',
      'PAYEE / VENDOR',
      'BUDGET ACCOUNT HEAD',
      'PARTICULAR / NARRATION',
      'CHEQUE #',
      'WHT (RS.)',
      'PRA (RS.)',
      'NET PAID (RS.)',
    ];

    const rows: CashBookStatementRow[] = filteredVouchers.map((v, i) => ({
      id: `GEN-V${v.srNo}`,
      srNo: i + 1,
      date: v.chequeDate || v.billDate,
      accountKey: resolveBankKeyFromAccount(v.bankAccount),
      voucherNo: v.voucherNo,
      paidToBy: v.payeeName,
      accountHead: v.accountHead,
      particulars: v.description,
      chequeNo: v.chequeNoNet || '—',
      receipts: v.incomeTaxAmount,
      payments: v.praAmount,
      balance: v.chequeAmountNet,
    }));

    const html = generateOfficialStatementPrintHtml({
      reportType: 'GENERAL',
      title: reportTitle.toUpperCase(),
      subtitle: 'Institutional Disbursement & Tax Audit Record',
      accountOrHeadInfo: `Bank Filter: ${selectedBank} • Records: ${filteredVouchers.length}`,
      generatedTimestamp: formatGeneratedTimestamp(),
      periodLabel: buildPeriodLabel(fromDate, toDate),
      totalTransactionsCount: filteredVouchers.length,
      kpiCards,
      tableHeaders,
      isGrouped: false,
      groups: [
        {
          headerTitle: `${reportTitle} Transactions`,
          rows,
        },
      ],
      grandTotals: {
        receipts: totalGross,
        payments: totalNet,
      },
      closingRow: {
        label: 'NET DISBURSED AMOUNT (TOTAL):',
        formulaText: '[Gross Claimed - Withheld Taxes]',
        balance: totalNet,
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
        rows.push([
          sr++,
          r.date,
          r.accountKey,
          `"${r.voucherNo}"`,
          `"${r.paidToBy}"`,
          `"${r.accountHead}"`,
          `"${(r.particulars || '').replace(/"/g, '""')}"`,
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
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
        rows.push([
          sr++,
          r.date,
          r.accountKey,
          `"${r.voucherNo}"`,
          `"${r.paidToBy}"`,
          `"${r.accountHead}"`,
          `"${(r.particulars || '').replace(/"/g, '""')}"`,
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
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
    const headers = [
      'Sr No',
      'Voucher No',
      'Cheque Date',
      'Payee Name',
      'NTN/CNIC',
      'Bill No',
      'Account Head',
      'Bill Gross',
      'Cheque No Net',
      'Cheque Net Amount',
      'Income Tax Amount',
      'PRA Amount',
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
      `"${v.accountHead}"`,
      v.billAmountGross,
      `"${v.chequeNoNet}"`,
      v.chequeAmountNet,
      v.incomeTaxAmount,
      v.praAmount,
      `"${v.bankAccount}"`,
      `"${v.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

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
            onClick={() => setActiveReportTab('CASHBOOK')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'CASHBOOK'
                ? darkMode ? 'bg-blue-900/40 border-blue-400 text-white shadow-md' : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
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
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Head Expenditure</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">By Budget Head</p>
          </button>

          <button
            onClick={() => setActiveReportTab('PAYEE')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'PAYEE'
                ? darkMode ? 'bg-emerald-900/40 border-emerald-400 text-white shadow-md' : 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-md'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Payee Statement</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Supplier Ledger</p>
          </button>

          <button
            onClick={() => setActiveReportTab('CHEQUE')}
            className={`flex-1 min-w-[150px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'CHEQUE'
                ? darkMode ? 'bg-amber-900/40 border-amber-400 text-white shadow-md' : 'bg-amber-50 border-amber-600 text-amber-950 shadow-md'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
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
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
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
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
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
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
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
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200 text-[11px]">
            Audited Opening Balances (FY 2026-27):
          </span>
          <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            <span>NS: <strong className="text-blue-600 dark:text-blue-400">Rs. {formatCurrency2Decimals(cashBookStates.NS?.openingBalance || 2387207)}</strong></span>
            <span>•</span>
            <span>PF: <strong className="text-emerald-600 dark:text-emerald-400">Rs. {formatCurrency2Decimals(cashBookStates.PF?.openingBalance || 408588)}</strong></span>
            <span>•</span>
            <span className="bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200">
              FC: <strong className="font-bold">Rs. {formatCurrency2Decimals(cashBookStates.FC?.openingBalance || 77717)}</strong>
            </span>
            <span>•</span>
            <span>SEC: <strong className="text-amber-600 dark:text-amber-400">Rs. {formatCurrency2Decimals(cashBookStates.SEC?.openingBalance || 357709)}</strong></span>
            <span>•</span>
            <span>SC: <strong className="text-sky-600 dark:text-sky-400">Rs. {formatCurrency2Decimals(cashBookStates.SC?.openingBalance || 251567)}</strong></span>
          </div>
        </div>

        <button
          onClick={() => setShowOpeningAuditModal(true)}
          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-300" />
          <span>Audit & Confirm Balances</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REPORT FILTERS & CONTROLS STRIP                             */}
      {/* ------------------------------------------------------------- */}
      {['CASHBOOK', 'HEAD', 'PAYEE', 'CHEQUE', 'AMOUNT'].includes(activeReportTab) && (
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
                    setHeadSearchQuery('');
                  }}
                  darkMode={darkMode}
                  categories={headCategories}
                />

                {/* Quick Head Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none">
                  {[
                    { label: 'ALL', val: 'ALL' },
                    { label: 'Electricity (A03303)', val: 'A03303-ELECTRICITY CHARGES' },
                    { label: 'Printing (A03902)', val: 'A03902-PRINTING AND PUBLICATION' },
                    { label: 'Service Charges', val: 'A03933-SERVICE CHARGES' },
                    { label: 'NAVTTC (A03970)', val: 'A03970-OTHERS(NAVTTC)' },
                    { label: 'Admission Fee', val: 'A012-ADMISSION FEE' },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedHead(chip.val)}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer whitespace-nowrap transition-colors ${
                        selectedHead === chip.val
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
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
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cheque# / Payee Query</label>
                <input
                  type="text"
                  value={chequeQuery}
                  onChange={(e) => setChequeQuery(e.target.value)}
                  placeholder="Enter Cheque # or Payee..."
                  className={`w-full p-2 rounded-lg border font-bold outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
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
      {/* 1.6 CFO OPENING BALANCES VERIFICATION & ADJUSTMENT MODAL        */}
      {/* ------------------------------------------------------------- */}
      {showOpeningAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-4 ${
            darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-black uppercase tracking-wide">
                  CFO Audit: Institutional Bank Opening Balances
                </h3>
              </div>
              <button
                onClick={() => { setShowOpeningAuditModal(false); setEditingOpeningBank(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Review and confirm the exact opening balance brought forward (b/d) for each institutional bank account as of <strong>01-Jul-2026</strong>. All cashbook statements, running balances, and sub-totals will rebalance immediately.
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {(['NS', 'PF', 'FC', 'SEC', 'SC', 'AA'] as BankAccountKey[]).map((key) => {
                const meta = INSTITUTIONAL_BANK_ACCOUNTS[key];
                const currentVal = cashBookStates[key]?.openingBalance ?? meta.openingBalance;
                const isEditing = editingOpeningBank === key;

                return (
                  <div
                    key={key}
                    className={`p-3.5 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
                      key === 'FC'
                        ? darkMode ? 'bg-purple-950/40 border-purple-800' : 'bg-purple-50/80 border-purple-300'
                        : darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{meta.shortName} ({meta.code})</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {meta.accountNo}
                        </span>
                        {key === 'FC' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200">
                            Fee Collection
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {meta.fullName} • {meta.bankName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={openingInputVal}
                            onChange={(e) => setOpeningInputVal(e.target.value)}
                            className={`w-32 p-1.5 rounded-lg border font-mono font-bold text-xs outline-none ${
                              darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                          <button
                            onClick={() => handleSaveOpeningBalance(key, parseFloat(openingInputVal) || 0)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingOpeningBank(null)}
                            className="px-2 py-1.5 bg-slate-400 hover:bg-slate-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            Rs. {formatCurrency2Decimals(currentVal)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingOpeningBank(key);
                              setOpeningInputVal(String(currentVal));
                            }}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 cursor-pointer"
                            title="Edit opening balance"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {key === 'FC' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSaveOpeningBalance('FC', 77717)}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                                  currentVal === 77717 ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                77,717
                              </button>
                              <button
                                onClick={() => handleSaveOpeningBalance('FC', 77714)}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                                  currentVal === 77714 ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                77,714
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => { setShowOpeningAuditModal(false); setEditingOpeningBank(null); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Close & Apply to Reports
              </button>
            </div>
          </div>
        </div>
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
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. REPORT DATA DISPLAY: HEAD EXPENDITURE STATEMENT TAB        */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'HEAD' && (
        <HeadExpenditureStatementView
          data={headExpenditureStatementData}
          darkMode={darkMode}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          onPrint={() => handlePrintHeadExpenditure(headExpenditureStatementData)}
          onExportCSV={() => handleExportHeadCSV(headExpenditureStatementData)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TABS: GENERAL TRANSACTION LISTS (PAYEE, CHEQUE, AMOUNT)    */}
      {/* ------------------------------------------------------------- */}
      {['PAYEE', 'CHEQUE', 'AMOUNT'].includes(activeReportTab) && (
        <div className="space-y-4">
          {/* Action strip */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-mono text-slate-400 font-bold">
              Showing {filteredVouchers.length} Filtered Transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV(activeReportTab)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handlePrintGeneralReport(`${activeReportTab} Transaction Statement`)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Print Official Report</span>
              </button>
            </div>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Claimed</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                {formatPKR(totalGross, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">WHT Income Tax</span>
              <span className="text-base font-black font-mono text-rose-500">
                {formatPKR(totalWht, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200 shadow-xs'}`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">PRA Sales Tax</span>
              <span className="text-base font-black font-mono text-amber-400">
                {formatPKR(totalPra, false)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-[#0B132B] border-emerald-800 bg-emerald-950/20' : 'bg-emerald-50 border-emerald-200'}`}>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">Net Paid (Cheques)</span>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatPKR(totalNet, false)}
              </span>
            </div>
          </div>

          {/* Detailed Table */}
          <div className={`rounded-xl border overflow-hidden shadow-lg ${darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[950px]">
                <thead className="bg-[#0b2545] text-white font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-12 border-r border-slate-800">Sr.#</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 w-28">Voucher#</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 w-24">Date</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">Payee / Vendor</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">Budget Account Head</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-800 w-24">Cheque#</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800 w-28">Gross (Rs.)</th>
                    <th className="py-2.5 px-2 text-right border-r border-slate-800 w-20">WHT</th>
                    <th className="py-2.5 px-2 text-right border-r border-slate-800 w-20">PRA</th>
                    <th className="py-2.5 px-3 text-right w-28">Net Paid (Rs.)</th>
                    <th className="py-2.5 px-2 text-center w-16">PAF</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-500 italic">
                        No transactions found matching the selected report filters.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((v, i) => (
                      <tr key={i} className="hover:bg-blue-500/10 transition-colors">
                        <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-800/50">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-400 border-r border-slate-800/50">{v.voucherNo}</td>
                        <td className="py-2 px-3 font-mono text-slate-400 border-r border-slate-800/50">{v.chequeDate || v.billDate}</td>
                        <td className="py-2 px-3 font-bold border-r border-slate-800/50">{v.payeeName}</td>
                        <td className="py-2 px-3 text-[11px] font-mono text-slate-300 border-r border-slate-800/50">{v.accountHead}</td>
                        <td className="py-2 px-2 text-center font-mono border-r border-slate-800/50">{v.chequeNoNet}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold border-r border-slate-800/50">{formatPKR(v.billAmountGross, false)}</td>
                        <td className="py-2 px-2 text-right font-mono text-rose-400 border-r border-slate-800/50">{v.incomeTaxAmount > 0 ? formatPKR(v.incomeTaxAmount, false) : '-'}</td>
                        <td className="py-2 px-2 text-right font-mono text-amber-400 border-r border-slate-800/50">{v.praAmount > 0 ? formatPKR(v.praAmount, false) : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-400">{formatPKR(v.chequeAmountNet, false)}</td>
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
              </table>
            </div>
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
    </div>
  );
};

