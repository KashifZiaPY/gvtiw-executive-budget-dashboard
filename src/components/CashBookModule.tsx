import React, { useState, useMemo, useEffect } from 'react';
import {
  BankAccountKey,
  INSTITUTIONAL_BANK_ACCOUNTS,
  INITIAL_CASHBOOK_STATES,
  CashBookEntry,
  CashBookAccountState,
  INITIAL_MASTER_VOUCHERS,
  MasterVoucher,
} from '../data/cashBookData';
import {
  fetchLiveCashBookFromGoogleSheet,
  recordCashBookReceipt,
  deleteCashBookReceipt,
  STORAGE_KEY_LIVE_CASHBOOKS,
  STORAGE_KEY_LIVE_SYNC_TS,
} from '../lib/apiEngine';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import {
  formatCashBookBillInfo,
  parseDateToTimestamp,
  generateCashBookStatementData,
  isNavttcHead,
  compareChequeWiseThenDate,
  compareCashBookItems,
  NAVTTC_OPENING_GRANT_BALANCE,
} from '../lib/reportingEngine';
import { getOpeningBalance } from '../lib/balanceEngine';
import { formatPKR, format12HourDate, formatPakistaniDate } from '../lib/formatters';
import {
  BookOpen,
  Search,
  Printer,
  RefreshCw,
  Download,
  Calendar,
  Building,
  CreditCard,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  PlusCircle,
  Trash2,
  X,
  Building2,
  GraduationCap,
  ArrowUpDown,
} from 'lucide-react';
import { AccountHeadDisplay } from './AccountHeadTag';
import { TfcChallanHub } from './TfcChallanHub';

interface CashBookModuleProps {
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
}

export const CashBookModule: React.FC<CashBookModuleProps> = ({
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
}) => {
  const [activeAccountKey, setActiveAccountKey] = useState<BankAccountKey>('NS');
  const [cashBookStates, setCashBookStates] = useState<Record<BankAccountKey, CashBookAccountState>>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_LIVE_CASHBOOKS);
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_CASHBOOK_STATES;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('Live Connected');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_LIVE_SYNC_TS) || '';
  });
  const [liveVouchers, setLiveVouchers] = useState<MasterVoucher[]>(INITIAL_MASTER_VOUCHERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'JUL' | 'AUG' | 'SEP' | 'Q1' | 'Q2' | 'CUSTOM'>('ALL');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [selectedVoucherForPAF, setSelectedVoucherForPAF] = useState<MasterVoucher | null>(null);

  // Sub-Ledger Presentation States for Non-Salary Account (allows extracting dedicated NAVTTC cashbook)
  const [nsSubMode, setNsSubMode] = useState<'ALL' | 'REGULAR' | 'NAVTTC'>('ALL');
  const [navttcSortOrder, setNavttcSortOrder] = useState<'CHEQUE_THEN_DATE' | 'DATE_THEN_CHEQUE'>('CHEQUE_THEN_DATE');

  // Custom User Recorded Receipt Modal
  const [showRecordReceiptModal, setShowRecordReceiptModal] = useState(false);
  const [showTfcHubModal, setShowTfcHubModal] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    bankKey: activeAccountKey,
    date: '15-Aug-2026',
    particulars: '',
    paidToBy: '',
    accountHead: '',
    chequeNo: '',
    amount: '',
  });

  // Keep modal bank key aligned with active tab
  useEffect(() => {
    setReceiptForm((prev) => ({ ...prev, bankKey: activeAccountKey }));
  }, [activeAccountKey]);

  // Handle saving new cashbook receipt
  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(receiptForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive receipt amount in PKR.');
      return;
    }
    if (!receiptForm.particulars.trim()) {
      alert('Please provide transaction particulars/description.');
      return;
    }

    recordCashBookReceipt({
      bankKey: receiptForm.bankKey,
      date: receiptForm.date.trim() || '15-Aug-2026',
      particulars: receiptForm.particulars.trim(),
      paidToBy: receiptForm.paidToBy.trim() || 'Govt of Punjab / Collection',
      accountHead: receiptForm.accountHead.trim() || 'Budget Allocation / Fee Deposit',
      chequeNo: receiptForm.chequeNo.trim() || 'Bank Challan',
      receipts: amt,
      vNo: '',
      voucherSerial: '',
    });

    setShowRecordReceiptModal(false);
    setReceiptForm({
      bankKey: activeAccountKey,
      date: '15-Aug-2026',
      particulars: '',
      paidToBy: '',
      accountHead: '',
      chequeNo: '',
      amount: '',
    });

    await handleSyncLive();
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!window.confirm('Are you sure you want to remove this custom recorded receipt?')) return;
    deleteCashBookReceipt(receiptId);
    await handleSyncLive();
  };

  // Instant Live Synchronization with Google Sheets
  const handleSyncLive = async () => {
    setIsSyncing(true);
    setSyncStatus('Connecting to Google Sheet...');
    try {
      const res = await fetchLiveCashBookFromGoogleSheet();
      if (res.success && res.cashBookStates) {
        setCashBookStates(res.cashBookStates);
        if (res.vouchers) setLiveVouchers(res.vouchers);
        setLastSyncTime(res.syncTimestamp);
        setSyncStatus(`Live Synced (${res.totalVouchers} Vouchers)`);
      } else {
        setSyncStatus('Using Baseline System');
      }
    } catch {
      setSyncStatus('Using Baseline Cache');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    handleSyncLive();

    const handleVoucherUpdate = () => {
      try {
        const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
        if (cached) setLiveVouchers(JSON.parse(cached));
      } catch {}
    };
    window.addEventListener('gvtiw_vouchers_updated', handleVoucherUpdate);
    window.addEventListener('storage', handleVoucherUpdate);
    return () => {
      window.removeEventListener('gvtiw_vouchers_updated', handleVoucherUpdate);
      window.removeEventListener('storage', handleVoucherUpdate);
    };
  }, []);

  const currentAccount = cashBookStates[activeAccountKey];

  const isNavttcActive = activeAccountKey === 'NS' && nsSubMode === 'NAVTTC';
  const isRegularNsActive = activeAccountKey === 'NS' && nsSubMode === 'REGULAR';

  // Compute full-year unspent closing balance for NAVTTC (to display on the tab badge)
  const navttcFullClosingBalance = useMemo(() => {
    const allNsStatement = generateCashBookStatementData(
      liveVouchers,
      cashBookStates,
      'NS',
      undefined,
      undefined
    );
    const allNsRows = allNsStatement.groups.length > 0 ? allNsStatement.groups[0].rows : [];
    let totRec = 0;
    let totPay = 0;
    for (const r of allNsRows) {
      if (isNavttcHead(r.accountHead)) {
        totRec += r.receipts || 0;
        totPay += r.payments || 0;
      }
    }
    return Math.round((NAVTTC_OPENING_GRANT_BALANCE + totRec - totPay) * 100) / 100;
  }, [liveVouchers, cashBookStates]);

  // Active Folio Metadata for title, bank details, and exports
  const activeFolioMeta = useMemo(() => {
    if (isNavttcActive) {
      return {
        fullName: 'NAVTTC Special Training Program Cash Book (FY 2026-2027)',
        shortName: 'NAVTTC Program',
        code: 'NAVTTC',
        accountNo: '6580006795600014 (Sub-Ledger)',
        bankName: 'The Bank of Punjab (BOP)',
        branch: 'Samanabad, Faisalabad',
        themeColor: {
          primary: '#059669',
          badgeBg: 'bg-emerald-950/60',
          badgeBorder: 'border-emerald-500/40',
          text: 'text-emerald-300',
        },
      };
    }
    if (isRegularNsActive) {
      return {
        fullName: 'Regular Non-Salary (Excluding NAVTTC) Cash Book',
        shortName: 'Regular Non-Salary',
        code: 'NS-REG',
        accountNo: '6580006795600014',
        bankName: currentAccount.meta.bankName,
        branch: currentAccount.meta.branch,
        themeColor: currentAccount.meta.themeColor,
      };
    }
    return currentAccount.meta;
  }, [isNavttcActive, isRegularNsActive, currentAccount]);

  // Map period filter to date range and label
  const periodDateRange = useMemo(() => {
    if (periodFilter === 'JUL') {
      return { fromDate: '2026-07-01', toDate: '2026-07-31', label: 'July 2026', displayStartDate: '01-Jul-2026', displayMonth: 'July' };
    }
    if (periodFilter === 'AUG') {
      return { fromDate: '2026-08-01', toDate: '2026-08-31', label: 'August 2026', displayStartDate: '01-Aug-2026', displayMonth: 'August' };
    }
    if (periodFilter === 'SEP') {
      return { fromDate: '2026-09-01', toDate: '2026-09-30', label: 'September 2026', displayStartDate: '01-Sep-2026', displayMonth: 'September' };
    }
    if (periodFilter === 'Q1') {
      return { fromDate: '2026-07-01', toDate: '2026-09-30', label: 'Quarter 1 (Jul-Sep 2026)', displayStartDate: '01-Jul-2026', displayMonth: 'July' };
    }
    if (periodFilter === 'Q2') {
      return { fromDate: '2026-10-01', toDate: '2026-12-31', label: 'Quarter 2 (Oct-Dec 2026)', displayStartDate: '01-Oct-2026', displayMonth: 'October' };
    }
    if (periodFilter === 'CUSTOM') {
      const from = customFromDate ? customFromDate : undefined;
      const to = customToDate ? customToDate : undefined;
      const displayStartDate = from ? formatPakistaniDate(from) : '01-Jul-2026';
      const displayMonth = from ? '' : 'July';
      return { fromDate: from, toDate: to, label: `${from ? formatPakistaniDate(from) : 'Start'} to ${to ? formatPakistaniDate(to) : 'End'}`, displayStartDate, displayMonth };
    }
    return { fromDate: undefined, toDate: undefined, label: 'All FY 2026-27', displayStartDate: '01-Jul-2026', displayMonth: 'July' };
  }, [periodFilter, customFromDate, customToDate]);

  // Statement data generated via authoritative reporting engine
  const statementData = useMemo(() => {
    return generateCashBookStatementData(
      liveVouchers,
      cashBookStates,
      activeAccountKey,
      periodDateRange.fromDate,
      periodDateRange.toDate
    );
  }, [liveVouchers, cashBookStates, activeAccountKey, periodDateRange.fromDate, periodDateRange.toDate]);

  // Core Active Ledger Data:
  // For standard accounts (PF, FC, SEC, SC, AA) and All-NS ('ALL'), strictly preserves existing statementData.
  // For 'NAVTTC', extracts NAVTTC records from NS, sorts cheque-wise then date-wise, and calculates running balance.
  // For 'REGULAR', filters out NAVTTC records from NS.
  const activeLedgerData = useMemo(() => {
    if (activeAccountKey !== 'NS' || nsSubMode === 'ALL') {
      const rawRows = statementData.groups.length > 0 ? statementData.groups[0].rows : [];
      return {
        openingBalance: statementData.openingBalance,
        rows: rawRows,
        totalReceipts: statementData.totalReceipts,
        totalPayments: statementData.totalPayments,
        closingBalance: statementData.closingBalance,
      };
    }

    // We are on NS with a sub-mode ('NAVTTC' or 'REGULAR')
    const allNsStatement = generateCashBookStatementData(
      liveVouchers,
      cashBookStates,
      'NS',
      undefined,
      undefined
    );
    const allNsRows = allNsStatement.groups.length > 0 ? allNsStatement.groups[0].rows : [];

    const isNavttc = nsSubMode === 'NAVTTC';
    const subRowsAllTime = allNsRows.filter((r) => {
      const match = isNavttcHead(r.accountHead);
      return isNavttc ? match : !match;
    });

    const baseOpening = isNavttc
      ? NAVTTC_OPENING_GRANT_BALANCE
      : Math.round(((cashBookStates.NS?.openingBalance ?? 2387207) - NAVTTC_OPENING_GRANT_BALANCE) * 100) / 100;

    const fromTs = periodDateRange.fromDate ? parseDateToTimestamp(periodDateRange.fromDate) : null;
    const toTs = periodDateRange.toDate ? parseDateToTimestamp(periodDateRange.toDate) : null;

    let preRec = 0;
    let prePay = 0;
    const inPeriodRows: typeof allNsRows = [];

    for (const r of subRowsAllTime) {
      const dTs = parseDateToTimestamp(r.date);
      if (fromTs !== null && dTs < fromTs) {
        preRec += r.receipts || 0;
        prePay += r.payments || 0;
      } else if (toTs === null || dTs <= toTs) {
        inPeriodRows.push({ ...r });
      }
    }

    const effectiveOpening = Math.round((baseOpening + preRec - prePay) * 100) / 100;

    // Apply sort order
    if (isNavttc && navttcSortOrder === 'CHEQUE_THEN_DATE') {
      inPeriodRows.sort(compareChequeWiseThenDate);
    } else {
      inPeriodRows.sort(compareCashBookItems);
    }

    // Sequentially compute exact running balance in active display order
    let runningBal = effectiveOpening;
    let totRec = 0;
    let totPay = 0;

    const finalRows = inPeriodRows.map((r) => {
      const rec = r.receipts || 0;
      const pay = r.payments || 0;
      totRec += rec;
      totPay += pay;
      runningBal = Math.round((runningBal + rec - pay) * 100) / 100;
      return {
        ...r,
        balance: runningBal,
      };
    });

    return {
      openingBalance: effectiveOpening,
      rows: finalRows,
      totalReceipts: Math.round(totRec * 100) / 100,
      totalPayments: Math.round(totPay * 100) / 100,
      closingBalance: runningBal,
    };
  }, [
    activeAccountKey,
    nsSubMode,
    statementData,
    liveVouchers,
    cashBookStates,
    periodDateRange.fromDate,
    periodDateRange.toDate,
    navttcSortOrder,
  ]);

  // Rolling running opening balance before the selected period starts
  const periodOpeningBalance = useMemo(() => {
    return activeLedgerData.openingBalance;
  }, [activeLedgerData.openingBalance]);

  // Filtered Ledger Entries by Search & Period Range (interleaved chronologically with running balances)
  const filteredEntries = useMemo(() => {
    const rawRows = activeLedgerData.rows;
    
    // Map CashBookStatementRow to CashBookEntry format compatible with table and exports
    const mappedEntries: CashBookEntry[] = rawRows.map((r, idx) => {
      // Extract month name from date string e.g. "03-Sep-2026"
      const dateParts = (r.date || '').split(/[-/ ]/);
      let month = '';
      if (dateParts.length >= 2) {
        const mStr = dateParts[1].toLowerCase();
        const months: Record<string, string> = {
          '01': 'January', '02': 'February', '03': 'March', '04': 'April',
          '05': 'May', '06': 'June', '07': 'July', '08': 'August',
          '09': 'September', '10': 'October', '11': 'November', '12': 'December',
          jan: 'July', feb: 'February', mar: 'March', apr: 'April',
          may: 'May', jun: 'June', jul: 'July', aug: 'August',
          sep: 'September', oct: 'October', nov: 'November', dec: 'December'
        };
        month = months[mStr] || mStr;
      }

      return {
        id: r.id,
        srNo: idx + 1,
        date: r.date,
        month: month,
        vNo: r.voucherNo || '',
        voucherSerial: r.voucherNo || '',
        particulars: r.particulars || '',
        billNo: r.billNo,
        billDate: r.billDate,
        paidToBy: r.paidToBy || '',
        accountHead: r.accountHead || '',
        chequeNo: r.chequeNo || '',
        receipts: r.receipts || 0,
        payments: r.payments || 0,
        runningBalance: r.balance || 0,
        entryType: r.entryType === 'RECEIPT' ? 'RECEIPT' : 'PAYMENT',
      };
    });

    if (!searchTerm) {
      return mappedEntries;
    }

    const t = searchTerm.toLowerCase();
    return mappedEntries.filter((entry) => {
      return (
        entry.particulars.toLowerCase().includes(t) ||
        entry.paidToBy.toLowerCase().includes(t) ||
        entry.accountHead.toLowerCase().includes(t) ||
        entry.chequeNo.toLowerCase().includes(t) ||
        entry.voucherSerial.toLowerCase().includes(t)
      );
    });
  }, [activeLedgerData.rows, searchTerm]);

  // Period-aware financial totals (opening balance, total receipts, total payments, net closing balance)
  const periodFinancials = useMemo(() => {
    if (!searchTerm) {
      return {
        openingBalance: activeLedgerData.openingBalance,
        totalReceipts: activeLedgerData.totalReceipts,
        totalPayments: activeLedgerData.totalPayments,
        closingBalance: activeLedgerData.closingBalance,
      };
    }
    let totRec = 0;
    let totPay = 0;
    for (const e of filteredEntries) {
      totRec += e.receipts || 0;
      totPay += e.payments || 0;
    }
    const closeBal = Math.round((periodOpeningBalance + totRec - totPay) * 100) / 100;
    return {
      openingBalance: periodOpeningBalance,
      totalReceipts: Math.round(totRec * 100) / 100,
      totalPayments: Math.round(totPay * 100) / 100,
      closingBalance: closeBal,
    };
  }, [searchTerm, activeLedgerData, filteredEntries, periodOpeningBalance]);

  // Find linked voucher for a given entry
  const voucherMap = useMemo(() => {
    const map = new Map<string, MasterVoucher>();
    for (const v of INITIAL_MASTER_VOUCHERS) {
      if (v.voucherNo) map.set(v.voucherNo, v);
    }
    for (const v of liveVouchers) {
      if (v.voucherNo) map.set(v.voucherNo, v);
    }
    return map;
  }, [liveVouchers]);

  const handleOpenPAF = (voucherSerial: string) => {
    const v = voucherMap.get(voucherSerial);
    if (v) {
      setSelectedVoucherForPAF(v);
    }
  };

  // Export CashBook to CSV
  const handleExportCSV = () => {
    if (!currentAccount) return;
    const headers = [
      'Sr No',
      'Date',
      'Month',
      'V No',
      'Voucher Serial',
      'Particulars',
      'Paid To / By',
      'Budget Account Head',
      'Cheque No',
      'Receipts (Debit)',
      'Payments (Credit)',
      'Running Balance',
    ];

    const rows = filteredEntries.map((e) => [
      e.srNo,
      e.date,
      e.month,
      `"${e.vNo}"`,
      `"${e.voucherSerial}"`,
      `"${e.particulars.replace(/"/g, '""')}"`,
      `"${e.paidToBy.replace(/"/g, '""')}"`,
      `"${e.accountHead.replace(/"/g, '""')}"`,
      `"${e.chequeNo}"`,
      e.receipts,
      e.payments,
      e.runningBalance,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        '"Source: CashBook → Double-Column Folio"',
        `CashBook: ${activeFolioMeta.fullName} - Account No: ${activeFolioMeta.accountNo}`,
        `Period: ${periodDateRange.label} | Opening Balance: ${periodFinancials.openingBalance} | Total Receipts: ${periodFinancials.totalReceipts} | Total Payments: ${periodFinancials.totalPayments} | Closing Balance: ${periodFinancials.closingBalance}${isNavttcActive ? ` | Sort: ${navttcSortOrder}` : ''}`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        '',
        '"e-CashBook & Voucher System developed by MKZ for institute 33028"',
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GVTIW_CashBook_${activeFolioMeta.code}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!currentAccount) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = filteredEntries.map((e) => {
      const isTax =
        e.particulars.toLowerCase().includes('tax') ||
        e.paidToBy.toLowerCase().includes('tax') ||
        e.particulars.toLowerCase().includes('wht') ||
        e.particulars.toLowerCase().includes('pra');

      const linkedVoucher = (e.voucherSerial && voucherMap.get(e.voucherSerial)) || (e.vNo && voucherMap.get(e.vNo));
      const bNo = e.billNo || (linkedVoucher ? linkedVoucher.billNo : undefined);
      const bDate = e.billDate || (linkedVoucher ? linkedVoucher.billDate : undefined);
      const billInfo = formatCashBookBillInfo(bNo, bDate);

      return `
      <tr>
        <td style="text-align:center; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: bold;">${e.srNo}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1; white-space: nowrap;">${e.date}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1;">${e.month}</td>
        <td style="text-align:center; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: bold; white-space: nowrap;">${e.vNo && e.voucherSerial && e.vNo !== e.voucherSerial ? `${e.vNo} (${e.voucherSerial})` : (e.vNo || e.voucherSerial || '-')}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1;">
          <div style="${isTax ? 'color: #b91c1c; font-weight: 600;' : ''}">${e.particulars}</div>
          ${billInfo ? `<div style="font-size: 8px; font-family: monospace; color: ${isTax ? '#b91c1c' : '#475569'}; margin-top: 2px; font-weight: 500;">${billInfo}</div>` : ''}
        </td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 600;">${e.paidToBy}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px;">${e.accountHead}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1; font-family: monospace; text-align: center;">${e.chequeNo || '-'}</td>
        <td style="text-align:right; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 600; color: #047857;">${e.receipts > 0 ? Number(e.receipts).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td style="text-align:right; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 600; color: #be123c;">${e.payments > 0 ? Number(e.payments).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td style="text-align:right; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: bold; font-family: monospace;">${Number(e.runningBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CashBook - ${activeFolioMeta.shortName} (FY 2026-27)</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 11px; }
            .header-box { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px; }
            .header-box h1 { font-size: 16px; margin: 0; text-transform: uppercase; color: #0f172a; font-weight: 900; }
            .header-box h2 { font-size: 13px; margin: 3px 0 0 0; text-transform: uppercase; color: #1e3a8a; font-weight: 800; }
            .header-box p { font-size: 10px; margin: 2px 0 0 0; color: #475569; font-weight: 600; font-family: monospace; }
            .meta-strip { display: flex; justify-content: space-between; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; margin-bottom: 12px; font-size: 11px; font-weight: bold; flex-wrap: wrap; gap: 6px; }
            .metrics-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; text-align: center; }
            .metric-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background-color: #f8fafc; }
            .metric-card span { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .metric-card strong { font-size: 13px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; break-inside: auto; }
            thead { display: table-header-group; }
            tr { break-inside: avoid; }
            th { background-color: #0f172a; color: #ffffff; padding: 6px 4px; text-align: left; font-size: 9px; text-transform: uppercase; border: 1px solid #0f172a; }
            .sig-box { margin-top: 35px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sig-col { text-align: center; width: 28%; border-top: 1px solid #475569; padding-top: 6px; }
            .sig-col strong { display: block; font-size: 11px; }
            .sig-col span { font-size: 10px; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div style="font-size: 8px; font-family: monospace; color: #475569; font-weight: bold; margin-bottom: 3px;">Source: CashBook → Double-Column Folio</div>
            <p>TECHNICAL EDUCATION & VOCATIONAL TRAINING AUTHORITY • GOVERNMENT OF PUNJAB</p>
            <h1>GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN SAMANABAD, FAISALABAD</h1>
            <h2>${isNavttcActive ? 'OFFICIAL NAVTTC SPECIAL CASH BOOK FOLIO — FY 2026-2027' : 'OFFICIAL CASH BOOK FOLIO — FY 2026-2027'}</h2>
            <p>${activeFolioMeta.fullName} • A/C NO: ${activeFolioMeta.accountNo} (${activeFolioMeta.bankName})</p>
          </div>

          <div class="meta-strip">
            <div><span>Account: </span>${activeFolioMeta.shortName} (${activeFolioMeta.code})</div>
            ${isNavttcActive ? `<div><span>Sort: </span>${navttcSortOrder === 'CHEQUE_THEN_DATE' ? 'Cheque-wise → Date-wise' : 'Date-wise → Cheque-wise'}</div>` : ''}
            <div><span>Period Filter: </span>${periodDateRange.label}</div>
            <div><span>Total Records: </span>${filteredEntries.length}</div>
            <div><span>Printed Date: </span>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>

          <div class="metrics-strip">
            <div class="metric-card">
              <span>1. Opening Balance</span>
              <strong style="color: #1e3a8a;">Rs. ${Number(periodFinancials.openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card">
              <span>2. Total Receipts</span>
              <strong style="color: #047857;">Rs. ${Number(periodFinancials.totalReceipts).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card">
              <span>3. Total Payments</span>
              <strong style="color: #be123c;">Rs. ${Number(periodFinancials.totalPayments).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card" style="background-color: #fef3c7; border-color: #f59e0b;">
              <span style="color: #92400e;">4. Net Closing Balance</span>
              <strong style="color: #b45309;">Rs. ${Number(periodFinancials.closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">Sr#</th>
                <th style="width: 65px;">Date</th>
                <th style="width: 45px;">Month</th>
                <th style="width: 35px; text-align: center;">V#</th>
                <th>Particulars / Narration</th>
                <th style="width: 120px;">Paid To / By</th>
                <th style="width: 140px;">Budget Account Head</th>
                <th style="width: 65px; text-align: center;">Cheque #</th>
                <th style="width: 75px; text-align: right;">Receipts (Rs.)</th>
                <th style="width: 75px; text-align: right;">Payments (Rs.)</th>
                <th style="width: 85px; text-align: right;">Balance (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <td style="text-align: center; border: 1px solid #cbd5e1;">-</td>
                <td style="border: 1px solid #cbd5e1;">${periodDateRange.displayStartDate}</td>
                <td style="border: 1px solid #cbd5e1;">${periodDateRange.displayMonth}</td>
                <td style="text-align: center; border: 1px solid #cbd5e1;">-</td>
                <td style="border: 1px solid #cbd5e1;" colspan="6">OPENING BALANCE BROUGHT FORWARD (${periodDateRange.label})</td>
                <td style="text-align: right; border: 1px solid #cbd5e1; font-family: monospace;">${Number(periodFinancials.openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="sig-box">
            <div class="sig-col">
              <strong>KASHIF ZIA</strong>
              <span>Accountant / Prepared by:</span>
            </div>
            <div class="sig-col">
              <strong>ANEEBA JAMIL</strong>
              <span>CO-Signatory / Checked by:</span>
            </div>
            <div class="sig-col">
              <strong>SHAZIA KHADIM</strong>
              <span>Acting Principal / DDO / Approved by:</span>
            </div>
          </div>

          <div style="margin-top: 25px; padding-top: 6px; border-top: 1px dotted #94a3b8; font-size: 8px; font-family: monospace; color: #64748b; text-align: center;">
            e-CashBook &amp; Voucher System developed by MKZ for institute 33028
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. MULTI-ACCOUNT TAB SELECTOR                                  */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-2 rounded-2xl border ${
        darkMode ? 'bg-[#0B132B] border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none">
          {(Object.keys(INSTITUTIONAL_BANK_ACCOUNTS) as BankAccountKey[]).map((key) => {
            const accMeta = INSTITUTIONAL_BANK_ACCOUNTS[key];
            const state = cashBookStates[key];
            const isActive = activeAccountKey === key && (key !== 'NS' || nsSubMode !== 'NAVTTC');

            return (
              <button
                key={key}
                onClick={() => {
                  setActiveAccountKey(key);
                  if (key === 'NS' && nsSubMode === 'NAVTTC') {
                    setNsSubMode('ALL');
                  }
                }}
                className={`flex-1 min-w-[170px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? darkMode
                      ? 'bg-blue-900/40 border-blue-400 text-white shadow-lg ring-1 ring-blue-400/50'
                      : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md ring-1 ring-blue-600/30'
                    : darkMode
                    ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: accMeta.themeColor.primary }}
                    ></span>
                    {accMeta.shortName}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    isActive ? 'bg-blue-600 text-white' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {accMeta.code}
                  </span>
                </div>
                <p className={`text-[10px] font-mono truncate ${darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                  A/C: {accMeta.accountNo}
                </p>
                <p className={`text-sm font-black font-mono mt-1 ${
                  isActive
                    ? darkMode
                      ? 'text-amber-300'
                      : 'text-blue-900'
                    : darkMode
                    ? 'text-slate-400'
                    : 'text-slate-700 font-bold'
                }`}>
                  {formatPKR(state.closingBalance, false)}
                </p>
              </button>
            );
          })}

          {/* Dedicated NAVTTC Special Sub-Ledger Quick Tab */}
          <button
            onClick={() => {
              setActiveAccountKey('NS');
              setNsSubMode('NAVTTC');
            }}
            className={`flex-1 min-w-[185px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
              isNavttcActive
                ? darkMode
                  ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-lg ring-1 ring-emerald-400/50'
                  : 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-md ring-1 ring-emerald-600/30'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                NAVTTC Special
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                isNavttcActive
                  ? 'bg-emerald-600 text-white'
                  : darkMode
                  ? 'bg-emerald-950/70 border border-emerald-600/40 text-emerald-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                SUB-CB
              </span>
            </div>
            <p className={`text-[10px] font-mono truncate ${darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
              Extracted from NS BOP
            </p>
            <p className={`text-sm font-black font-mono mt-1 ${
              isNavttcActive
                ? darkMode
                  ? 'text-emerald-300'
                  : 'text-emerald-700 font-black'
                : darkMode
                ? 'text-emerald-400'
                : 'text-emerald-700 font-bold'
            }`}>
              {formatPKR(navttcFullClosingBalance, false)}
            </p>
          </button>
        </div>

        {/* Sub-Ledger Presentation Modes for Non-Salary BOP Account */}
        {activeAccountKey === 'NS' && (
          <div className={`mt-2.5 pt-2.5 border-t flex flex-wrap items-center justify-between gap-3 px-2 ${
            darkMode ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                NS Account Cashbook View:
              </span>
              <div className={`inline-flex rounded-lg p-0.5 border ${
                darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'
              }`}>
                <button
                  onClick={() => setNsSubMode('ALL')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    nsSubMode === 'ALL'
                      ? darkMode
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-blue-950 shadow-xs'
                      : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All NS (Consolidated BOP)
                </button>
                <button
                  onClick={() => setNsSubMode('REGULAR')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    nsSubMode === 'REGULAR'
                      ? darkMode
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-blue-950 shadow-xs'
                      : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Regular Non-Salary (Excl. NAVTTC)
                </button>
                <button
                  onClick={() => setNsSubMode('NAVTTC')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    nsSubMode === 'NAVTTC'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : darkMode
                      ? 'text-emerald-400 hover:bg-emerald-950/40'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>NAVTTC Special Cashbook</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950/70 border border-emerald-400/50 text-emerald-200 font-bold">
                    Rs. {Number(navttcFullClosingBalance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </button>
              </div>
            </div>

            {/* Sort Order Selector when NAVTTC Cashbook is active */}
            {isNavttcActive && (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                  Sort Order:
                </span>
                <div className={`inline-flex rounded-lg p-0.5 border ${
                  darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'
                }`}>
                  <button
                    onClick={() => setNavttcSortOrder('CHEQUE_THEN_DATE')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      navttcSortOrder === 'CHEQUE_THEN_DATE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : darkMode
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Display Cheque-wise, then Date-wise"
                  >
                    Cheque-Wise → Date-Wise
                  </button>
                  <button
                    onClick={() => setNavttcSortOrder('DATE_THEN_CHEQUE')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      navttcSortOrder === 'DATE_THEN_CHEQUE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : darkMode
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Display Date-wise chronological order"
                  >
                    Date-Wise → Cheque-Wise
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. ACTIVE CASHBOOK FOLIO HEADER & METRICS BAR                  */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-5 rounded-2xl border relative overflow-hidden transition-all ${
        darkMode
          ? isNavttcActive
            ? 'bg-gradient-to-r from-[#06241b] via-[#0B132B] to-[#0b291d] border-emerald-600/40 text-white'
            : 'bg-gradient-to-r from-[#0F1D3B] via-[#0B132B] to-[#132247] border-slate-700 text-white'
          : isNavttcActive
          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-800 text-white shadow-xl'
          : 'bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 border-slate-800 text-white shadow-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider border ${
                isNavttcActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
              }`}>
                {isNavttcActive ? 'NAVTTC Special Sub-Ledger (2026-27)' : 'Official Double-Column Folio (2026-27)'}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-mono bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{syncStatus}</span>
                {lastSyncTime && <span className="opacity-70">({lastSyncTime})</span>}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {activeFolioMeta.bankName} • {activeFolioMeta.branch}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1 text-white uppercase flex items-center gap-2">
              {isNavttcActive && <GraduationCap className="w-5 h-5 text-emerald-400 shrink-0" />}
              <span>{activeFolioMeta.fullName}</span>
            </h2>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Dedicated Ledger Account Number: <strong className="text-amber-300">{activeFolioMeta.accountNo}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {activeAccountKey === 'FC' && (
              <button
                onClick={() => setShowTfcHubModal(true)}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-teal-200" />
                <span>BOP Fee Challan Hub</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-white/20 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-300" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className={`px-3 py-2 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                isNavttcActive ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print CashBook</span>
            </button>
          </div>
        </div>

        {/* Financial Flow Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs font-mono">
          <div className="bg-black/30 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">
              {isNavttcActive
                ? '1. NAVTTC Opening Grant'
                : activeAccountKey === 'AA'
                ? '1. Opening Assigned Ceiling'
                : '1. Opening Cash Balance'}
            </span>
            <span className="text-base font-black text-blue-300">
              {formatPKR(periodFinancials.openingBalance, false)}
            </span>
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
              {activeAccountKey === 'AA' ? '2. Budget Allocation Ceiling' : '2. Total Receipts'}
            </span>
            <span className="text-base font-black text-emerald-400">
              {periodFinancials.totalReceipts > 0 ? formatPKR(periodFinancials.totalReceipts, false) : '0.00'}
            </span>
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-rose-400" />
              {activeAccountKey === 'AA' ? '3. District Sanctions / Bills' : '3. Total Cheque Payments'}
            </span>
            <span className="text-base font-black text-rose-400">
              {periodFinancials.totalPayments > 0 ? formatPKR(periodFinancials.totalPayments, false) : '0.00'}
            </span>
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-amber-400/30">
            <span className="text-[10px] text-amber-300 block uppercase font-black">
              {isNavttcActive
                ? '4. NAVTTC Unspent Balance'
                : activeAccountKey === 'AA'
                ? '4. Available Budget Ceiling'
                : '4. Net Bank Closing Balance'}
            </span>
            <span className="text-base font-black text-amber-300">
              {formatPKR(periodFinancials.closingBalance, false)}
            </span>
          </div>
        </div>

        {/* Informative Guidance Banner for AAA */}
        {activeAccountKey === 'AA' && (
          <div className="mt-4 p-3 rounded-xl bg-teal-950/60 border border-teal-500/40 text-[11px] text-teal-200 flex items-start gap-2">
            <span className="text-base">ℹ️</span>
            <div>
              <strong className="text-teal-100 font-bold block mb-0.5">Assan Assignment Account (AAA) - District Director Ceiling Register</strong>
              <span>
                Maintained at NBP by District Director Office TEVTA Fsd. Institute submits bill sanctions (e.g. FESCO, PTCL utilities) against this allocated budget quota. These funds are drawn directly by DDO and do not alter the Institute's BOP Non-Salary bank balance.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SEARCH & PERIOD / DATE RANGE FILTER BAR                     */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
      }`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search entries by Payee, Particulars, Head, Cheque#, or Voucher Serial..."
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border outline-none transition-all ${
              darkMode
                ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500 focus:border-blue-400'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600'
            }`}
          />
        </div>

        {/* Period Range Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-400" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className={`px-3 py-2 text-xs rounded-lg border outline-none font-bold cursor-pointer transition-all ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-amber-300'
                  : 'bg-slate-50 border-slate-300 text-blue-950'
              }`}
            >
              <option value="ALL">📅 All FY 2026-27</option>
              <option value="JUL">July 2026</option>
              <option value="AUG">August 2026</option>
              <option value="SEP">September 2026</option>
              <option value="Q1">Quarter 1 (Jul-Sep 2026)</option>
              <option value="Q2">Quarter 2 (Oct-Dec 2026)</option>
              <option value="CUSTOM">Custom Date Range...</option>
            </select>
          </div>

          {periodFilter === 'CUSTOM' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className={`px-2 py-1.5 text-xs rounded-lg border outline-none ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className={`px-2 py-1.5 text-xs rounded-lg border outline-none ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          )}

          <div className="text-xs font-mono text-slate-400 font-bold hidden lg:block">
            {filteredEntries.length} Records
          </div>
        </div>

        {/* Informative Guidance Banner for NAVTTC Special Sub-Ledger */}
        {isNavttcActive && (
          <div className="w-full mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>NAVTTC Special Training Program Cash Book:</strong> Displaying all NAVTTC heads extracted from BOP Non-Salary A/C <span className="font-mono text-emerald-300 font-bold">6580006795600014</span>.
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-bold">
                Opening Grant: Rs. 1,223,066.00
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-bold">
                Sort: {navttcSortOrder === 'CHEQUE_THEN_DATE' ? 'Cheque-Wise → Date-Wise' : 'Date-Wise → Cheque-Wise'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. DOUBLE-COLUMN CASHBOOK LEDGER TABLE                         */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-xl border overflow-hidden shadow-xl ${
        darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-300'
      }`}>
        <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[420px] table-scrollbar-always-visible">
          <table className="w-full text-xs text-left border-collapse min-w-[1250px]">
            <thead className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-800 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="py-3 px-2 text-center w-12 border-r border-slate-800 sticky top-0 bg-slate-900">Sr.#</th>
                <th className="py-3 px-3 border-r border-slate-800 w-28 sticky top-0 bg-slate-900">Date</th>
                <th className="py-3 px-2 border-r border-slate-800 w-20 sticky top-0 bg-slate-900">Month</th>
                <th className="py-3 px-2 text-center border-r border-slate-800 min-w-[140px] whitespace-nowrap sticky top-0 bg-slate-900">V#</th>
                <th className="py-3 px-4 border-r border-slate-800 min-w-[240px] sticky top-0 bg-slate-900">Particulars / Narration</th>
                <th className="py-3 px-3 border-r border-slate-800 w-44 sticky top-0 bg-slate-900">Paid To / By</th>
                <th className="py-3 px-3 border-r border-slate-800 w-48 sticky top-0 bg-slate-900">Budget Account Head</th>
                <th className="py-3 px-3 text-center border-r border-slate-800 w-28 sticky top-0 bg-slate-900">Cheque #</th>
                <th className="py-3 px-3 text-right border-r border-slate-800 w-28 text-emerald-400 sticky top-0 bg-slate-900">Receipts (Rs.)</th>
                <th className="py-3 px-3 text-right border-r border-slate-800 w-28 text-rose-400 sticky top-0 bg-slate-900">Payments (Rs.)</th>
                <th className="py-3 px-3 text-right border-r border-slate-800 w-32 text-amber-300 sticky top-0 bg-slate-900">Balance (Rs.)</th>
                <th className="py-3 px-2 text-center w-24 sticky top-0 bg-slate-900">PAF</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              
              {/* Opening Balance Row */}
              <tr className={`font-bold ${
                isNavttcActive
                  ? darkMode ? 'bg-emerald-950/40 text-emerald-200' : 'bg-emerald-50/80 text-emerald-950'
                  : darkMode ? 'bg-slate-900/60 text-slate-300' : 'bg-slate-100 text-slate-900'
              }`}>
                <td className={`py-2.5 px-2 text-center font-mono ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>—</td>
                <td className={`py-2.5 px-3 font-mono font-bold ${darkMode ? 'text-slate-300' : 'text-slate-950'}`}>
                  {periodDateRange.displayStartDate}
                </td>
                <td className={`py-2.5 px-2 font-mono font-bold ${darkMode ? 'text-slate-400' : 'text-slate-800'}`}>
                  {periodDateRange.displayMonth}
                </td>
                <td className={`py-2.5 px-2 text-center font-mono ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>—</td>
                <td colSpan={3} className={`py-2.5 px-4 font-black uppercase ${
                  isNavttcActive
                    ? darkMode ? 'text-emerald-400' : 'text-emerald-900'
                    : darkMode ? 'text-blue-400' : 'text-blue-950'
                }`}>
                  {isNavttcActive
                    ? `NAVTTC OPENING SPECIAL GRANT ALLOCATION BROUGHT FORWARD (${periodDateRange.label})`
                    : isRegularNsActive
                    ? `REGULAR NON-SALARY OPENING BALANCE BROUGHT FORWARD (${periodDateRange.label})`
                    : `OPENING BALANCE BROUGHT FORWARD (${periodDateRange.label})`}
                </td>
                <td className={`py-2.5 px-3 text-center font-mono ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>—</td>
                <td className={`py-2.5 px-3 text-right font-mono font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>—</td>
                <td className={`py-2.5 px-3 text-right font-mono font-bold ${darkMode ? 'text-rose-400' : 'text-rose-700'}`}>—</td>
                <td className={`py-2.5 px-3 text-right font-mono font-black ${
                  isNavttcActive
                    ? darkMode ? 'text-emerald-300' : 'text-emerald-900'
                    : darkMode ? 'text-amber-300' : 'text-amber-900'
                }`}>
                  {formatPKR(periodFinancials.openingBalance, false)}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-400">—</td>
              </tr>

              {/* Ledger Rows */}
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-500 italic">
                    No transactions recorded in this cashbook for FY 2026-27.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const isEven = idx % 2 === 0;
                  const isTaxEntry = entry.paidToBy.toLowerCase().includes('tax');

                  return (
                    <tr
                      key={entry.id}
                      className={`transition-colors ${
                        isEven
                          ? darkMode
                            ? 'bg-[#0B132B] hover:bg-blue-500/10'
                            : 'bg-white hover:bg-blue-50/70'
                          : darkMode
                          ? 'bg-[#070E20] hover:bg-blue-500/10'
                          : 'bg-slate-50/70 hover:bg-blue-50/70'
                      }`}
                    >
                      {/* Sr.# */}
                      <td className={`py-3 px-2 text-center font-mono font-bold border-r ${
                        darkMode ? 'text-slate-400 border-slate-700/50' : 'text-slate-800 border-slate-200'
                      }`}>
                        {entry.srNo}
                      </td>

                      {/* Date */}
                      <td className={`py-3 px-3 font-mono font-bold border-r ${
                        darkMode ? 'text-slate-300 border-slate-700/50' : 'text-slate-950 border-slate-200'
                      }`}>
                        {entry.date}
                      </td>

                      {/* Month */}
                      <td className={`py-3 px-2 font-mono border-r ${
                        darkMode ? 'text-slate-400 border-slate-700/50' : 'text-slate-800 font-semibold border-slate-200'
                      }`}>
                        {entry.month}
                      </td>

                      {/* V# */}
                      <td className={`py-3 px-2 text-center font-mono font-bold whitespace-nowrap border-r ${
                        darkMode ? 'text-blue-400 border-slate-700/50' : 'text-blue-700 font-black border-slate-200'
                      }`}>
                        {entry.entryType === 'RECEIPT' && !entry.vNo ? (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}>
                            {entry.voucherSerial ? `REC (${entry.voucherSerial})` : 'REC'}
                          </span>
                        ) : (
                          (() => {
                            if (entry.vNo && entry.voucherSerial) {
                              if (entry.vNo === entry.voucherSerial) return entry.vNo;
                              return `${entry.vNo} (${entry.voucherSerial})`;
                            }
                            return entry.vNo || entry.voucherSerial || '—';
                          })()
                        )}
                      </td>

                      {/* Particulars */}
                      <td className={`py-3 px-4 border-r ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
                        <div className="flex items-start gap-2">
                          {entry.entryType === 'RECEIPT' && (
                            <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 text-[9px] font-black uppercase rounded border ${
                              darkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              RECEIPT
                            </span>
                          )}
                          <div>
                            <span
                              className={`font-medium block leading-snug ${
                                isTaxEntry
                                  ? darkMode ? 'text-rose-400 font-semibold' : 'text-rose-700 font-semibold'
                                  : entry.entryType === 'RECEIPT'
                                  ? darkMode ? 'text-emerald-300 font-semibold' : 'text-emerald-800 font-semibold'
                                  : darkMode ? 'text-white' : 'text-slate-950 font-semibold'
                              }`}
                            >
                              {entry.particulars}
                            </span>
                            {((entry.voucherSerial && voucherMap.get(entry.voucherSerial)) || entry.billNo) && (
                              <span
                                className={`text-[10px] font-mono block mt-0.5 ${
                                  isTaxEntry
                                    ? darkMode ? 'text-rose-400' : 'text-rose-700 font-medium'
                                    : entry.entryType === 'RECEIPT'
                                    ? darkMode ? 'text-emerald-300' : 'text-emerald-700 font-medium'
                                    : darkMode ? 'text-slate-300' : 'text-slate-600 font-medium'
                                }`}
                              >
                                {formatCashBookBillInfo(
                                  entry.billNo || (entry.voucherSerial ? voucherMap.get(entry.voucherSerial)?.billNo : undefined),
                                  entry.billDate || (entry.voucherSerial ? voucherMap.get(entry.voucherSerial)?.billDate : undefined)
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Paid To / By */}
                      <td className={`py-3 px-3 font-bold border-r ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
                        <span className={entry.entryType === 'RECEIPT' ? (darkMode ? 'text-emerald-300 font-semibold' : 'text-emerald-800 font-bold') : darkMode ? 'text-slate-200' : 'text-slate-950 font-bold'}>
                          {entry.paidToBy}
                        </span>
                      </td>

                      {/* Budget Head */}
                      <td className={`py-3 px-3 border-r ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
                        <AccountHeadDisplay head={entry.accountHead} />
                      </td>

                      {/* Cheque # */}
                      <td className={`py-3 px-3 text-center font-mono font-bold border-r ${
                        darkMode ? 'text-slate-200 border-slate-700/50' : 'text-slate-950 font-black border-slate-200'
                      }`}>
                        {entry.chequeNo || '—'}
                      </td>

                      {/* Receipts */}
                      <td className={`py-3 px-3 text-right font-mono font-bold border-r ${
                        darkMode ? 'text-emerald-400 border-slate-700/50' : 'text-emerald-700 font-black border-slate-200'
                      }`}>
                        {entry.receipts > 0 ? formatPKR(entry.receipts, false) : '—'}
                      </td>

                      {/* Payments */}
                      <td className={`py-3 px-3 text-right font-mono font-bold border-r ${
                        darkMode ? 'text-rose-400 border-slate-700/50' : 'text-rose-700 font-black border-slate-200'
                      }`}>
                        {entry.payments > 0 ? formatPKR(entry.payments, false) : '—'}
                      </td>

                      {/* Running Balance */}
                      <td className={`py-3 px-3 text-right font-mono font-black border-r ${
                        darkMode ? 'text-amber-300 border-slate-700/50' : 'text-amber-900 font-black border-slate-200'
                      }`}>
                        {formatPKR(entry.runningBalance, false)}
                      </td>

                      {/* PAF Action Button / Receipt Deletion */}
                      <td className="py-3 px-2 text-center">
                        {(() => {
                          const isEntryReceipt = Boolean(
                            entry.entryType === 'RECEIPT' ||
                            entry.receipts > 0 ||
                            entry.voucherSerial?.toUpperCase().startsWith('REC-') ||
                            entry.id.startsWith('REC-') ||
                            entry.id.startsWith('CUSTOM-REC-')
                          );
                          const isEntryBankCharge = Boolean(
                            entry.entryType === 'BANK_CHARGE' ||
                            entry.voucherSerial?.toUpperCase().startsWith('BC-') ||
                            entry.voucherSerial?.toUpperCase().startsWith('BC/') ||
                            entry.voucherSerial?.toUpperCase() === 'BC' ||
                            entry.paidToBy?.toLowerCase().includes('bank charge') ||
                            entry.accountHead?.toUpperCase().includes('BANK CHARGES') ||
                            entry.accountHead?.toUpperCase().includes('A03101') ||
                            entry.particulars?.toLowerCase().includes('bank charge')
                          );
                          const canShowPAF = entry.voucherSerial && !isEntryReceipt && !isEntryBankCharge;

                          if (canShowPAF) {
                            return (
                              <button
                                onClick={() => handleOpenPAF(entry.voucherSerial)}
                                className={`px-2.5 py-1 font-bold rounded-lg text-[10px] transition-all cursor-pointer ${
                                  darkMode
                                    ? 'bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                }`}
                              >
                                View PAF
                              </button>
                            );
                          }
                          if (entry.id.startsWith('CUSTOM-REC-')) {
                            return (
                              <button
                                onClick={() => handleDeleteReceipt(entry.id)}
                                title="Delete custom receipt"
                                className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            );
                          }
                          return <span className={`${darkMode ? 'text-slate-600' : 'text-slate-400'} font-mono text-[10px]`}>—</span>;
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Folio Closing Total Row */}
              <tr className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-slate-700">
                <td colSpan={8} className="py-3 px-4 text-right uppercase tracking-wider text-amber-300">
                  CASHBOOK TOTAL & CLOSING RECONCILED POSITION:
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-400">
                  {formatPKR(periodFinancials.totalReceipts, false)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-rose-400">
                  {formatPKR(periodFinancials.totalPayments, false)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-amber-300 text-sm">
                  {formatPKR(periodFinancials.closingBalance, false)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. PAYMENT APPROVAL FORM MODAL                                 */}
      {/* ------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------- */}
      {/* 6. RECORD CASHBOOK RECEIPT MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {showRecordReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200 ${
              darkMode ? 'bg-[#0B1528] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-emerald-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Record CashBook Receipt</h3>
                  <p className="text-xs text-emerald-300/80 font-mono">
                    Post budget allocation, grant, or student fee receipt directly to ledger
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecordReceiptModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveReceipt} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Account Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Bank Ledger Account <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={receiptForm.bankKey}
                    onChange={(e) => setReceiptForm({ ...receiptForm, bankKey: e.target.value as BankAccountKey })}
                    className={`w-full px-3 py-2 text-xs rounded-xl border font-bold outline-none cursor-pointer transition-all ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                    }`}
                  >
                    {Object.values(INSTITUTIONAL_BANK_ACCOUNTS).map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.shortName} ({acc.accountNo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Transaction Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptForm.date}
                    onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })}
                    placeholder="e.g. 15-Aug-2026"
                    className={`w-full px-3 py-2 text-xs rounded-xl border font-mono outline-none transition-all ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                </div>
              </div>

              {/* Amount (PKR) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Receipt Amount (PKR) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                    PKR
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    placeholder="0.00"
                    className={`w-full pl-12 pr-4 py-2.5 text-base font-black font-mono rounded-xl border outline-none transition-all ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-emerald-400 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-emerald-700 focus:border-emerald-600'
                    }`}
                  />
                </div>
              </div>

              {/* Particulars */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Particulars / Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={receiptForm.particulars}
                  onChange={(e) => setReceiptForm({ ...receiptForm, particulars: e.target.value })}
                  placeholder="e.g. 1st Quarter Non-Salary Budget Allocation Grant FY 2026-27 or Student Fee Collection"
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                    darkMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Received From / Paid By */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Received From / Deposited By
                  </label>
                  <input
                    type="text"
                    value={receiptForm.paidToBy}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paidToBy: e.target.value })}
                    placeholder="e.g. Govt of Punjab / Trainees"
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                </div>

                {/* Cheque / Challan / Ref No */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Challan / Cheque / Reference #
                  </label>
                  <input
                    type="text"
                    value={receiptForm.chequeNo}
                    onChange={(e) => setReceiptForm({ ...receiptForm, chequeNo: e.target.value })}
                    placeholder="e.g. BOP Challan / AAA Grant"
                    className={`w-full px-3 py-2 text-xs rounded-xl border font-mono outline-none transition-all ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                </div>
              </div>

              {/* Account Head */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Budget Account Head / Category
                </label>
                <input
                  type="text"
                  value={receiptForm.accountHead}
                  onChange={(e) => setReceiptForm({ ...receiptForm, accountHead: e.target.value })}
                  placeholder="e.g. A03933-SERVICE CHARGES or A00000PF-PUPIL FUND"
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-mono outline-none transition-all ${
                    darkMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowRecordReceiptModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Record & Post to Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOP Fee Challan Portal Hub Modal */}
      {showTfcHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl relative">
            <div className="sticky top-3 right-3 z-50 flex justify-end pr-3">
              <button
                onClick={() => setShowTfcHubModal(false)}
                className="px-3.5 py-1.5 bg-slate-900/90 text-white hover:bg-rose-600 rounded-full font-bold text-xs border border-white/20 shadow-lg cursor-pointer transition-all"
              >
                ✕ Close Hub
              </button>
            </div>
            <TfcChallanHub
              darkMode={darkMode}
              customGvtiwLogo={customGvtiwLogo}
              customTevtaLogo={customTevtaLogo}
              customGopLogo={customGopLogo}
              onClose={() => setShowTfcHubModal(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
};
