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
  STORAGE_KEY_LIVE_CASHBOOKS,
  STORAGE_KEY_LIVE_SYNC_TS,
} from '../lib/apiEngine';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import { formatPKR, format12HourDate } from '../lib/formatters';
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
} from 'lucide-react';

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
  }, []);

  const currentAccount = cashBookStates[activeAccountKey];

  // Filtered Ledger Entries by Search & Period Range
  const filteredEntries = useMemo(() => {
    if (!currentAccount) return [];
    return currentAccount.entries.filter((entry) => {
      // Period filter
      const m = (entry.month || '').toLowerCase();
      const d = (entry.date || '').toLowerCase();
      if (periodFilter === 'JUL' && !m.includes('jul') && !d.includes('jul')) return false;
      if (periodFilter === 'AUG' && !m.includes('aug') && !d.includes('aug')) return false;
      if (periodFilter === 'SEP' && !m.includes('sep') && !d.includes('sep') && !d.includes('-09-') && !d.includes('/09/')) return false;
      if (periodFilter === 'Q1' && !['jul', 'aug', 'sep'].some((term) => m.includes(term) || d.includes(term))) return false;
      if (periodFilter === 'Q2' && !['oct', 'nov', 'dec'].some((term) => m.includes(term) || d.includes(term))) return false;
      if (periodFilter === 'CUSTOM' && (customFromDate || customToDate)) {
        const entryTs = new Date(entry.date).getTime();
        if (customFromDate && entryTs < new Date(customFromDate).getTime()) return false;
        if (customToDate && entryTs > new Date(customToDate).getTime()) return false;
      }

      // Search filter
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return (
          entry.particulars.toLowerCase().includes(t) ||
          entry.paidToBy.toLowerCase().includes(t) ||
          entry.accountHead.toLowerCase().includes(t) ||
          entry.chequeNo.toLowerCase().includes(t) ||
          entry.voucherSerial.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [currentAccount, searchTerm, periodFilter, customFromDate, customToDate]);

  // Find linked voucher for a given entry
  const handleOpenPAF = (voucherSerial: string) => {
    const v = liveVouchers.find((item) => item.voucherNo === voucherSerial) ||
              INITIAL_MASTER_VOUCHERS.find((item) => item.voucherNo === voucherSerial);
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
        `CashBook: ${currentAccount.meta.fullName} - Account No: ${currentAccount.meta.accountNo}`,
        `Opening Balance: ${currentAccount.openingBalance} | Closing Balance: ${currentAccount.closingBalance}`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GVTIW_CashBook_${activeAccountKey}_${new Date().toISOString().slice(0, 10)}.csv`);
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

    const rowsHtml = filteredEntries.map((e) => `
      <tr>
        <td style="text-align:center; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: bold;">${e.srNo}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1; white-space: nowrap;">${e.date}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1;">${e.month}</td>
        <td style="text-align:center; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: bold;">${e.vNo || '-'}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1;">${e.particulars}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 600;">${e.paidToBy}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px;">${e.accountHead}</td>
        <td style="padding: 4px 6px; border: 1px solid #cbd5e1; font-family: monospace; text-align: center;">${e.chequeNo || '-'}</td>
        <td style="text-align:right; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 600; color: #047857;">${e.receipts > 0 ? Number(e.receipts).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td style="text-align:right; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 600; color: #be123c;">${e.payments > 0 ? Number(e.payments).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td style="text-align:right; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: bold; font-family: monospace;">${Number(e.runningBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CashBook - ${currentAccount.meta.shortName} (FY 2026-27)</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 11px; }
            .header-box { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px; }
            .header-box h1 { font-size: 16px; margin: 0; text-transform: uppercase; color: #0f172a; font-weight: 900; }
            .header-box h2 { font-size: 13px; margin: 3px 0 0 0; text-transform: uppercase; color: #1e3a8a; font-weight: 800; }
            .header-box p { font-size: 10px; margin: 2px 0 0 0; color: #475569; font-weight: 600; font-family: monospace; }
            .meta-strip { display: flex; justify-content: space-between; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; margin-bottom: 12px; font-size: 11px; font-weight: bold; }
            .metrics-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; text-align: center; }
            .metric-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background-color: #f8fafc; }
            .metric-card span { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .metric-card strong { font-size: 13px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #0f172a; color: #ffffff; padding: 6px 4px; text-align: left; font-size: 9px; text-transform: uppercase; border: 1px solid #0f172a; }
            .sig-box { margin-top: 35px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sig-col { text-align: center; width: 28%; border-top: 1px solid #475569; padding-top: 6px; }
            .sig-col strong { display: block; font-size: 11px; }
            .sig-col span { font-size: 10px; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <p>TECHNICAL EDUCATION & VOCATIONAL TRAINING AUTHORITY • GOVERNMENT OF PUNJAB</p>
            <h1>GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN SAMANABAD, FAISALABAD</h1>
            <h2>OFFICIAL CASH BOOK FOLIO — FY 2026-2027</h2>
            <p>${currentAccount.meta.fullName} • A/C NO: ${currentAccount.meta.accountNo} (${currentAccount.meta.bankName})</p>
          </div>

          <div class="meta-strip">
            <div><span>Account: </span>${currentAccount.meta.shortName} (${currentAccount.meta.code})</div>
            <div><span>Period Filter: </span>${periodFilter === 'ALL' ? 'Complete FY 2026-27' : periodFilter}</div>
            <div><span>Total Records: </span>${filteredEntries.length}</div>
            <div><span>Printed Date: </span>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>

          <div class="metrics-strip">
            <div class="metric-card">
              <span>1. Opening Balance</span>
              <strong style="color: #1e3a8a;">Rs. ${Number(currentAccount.openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card">
              <span>2. Total Receipts</span>
              <strong style="color: #047857;">Rs. ${Number(currentAccount.totalReceipts).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card">
              <span>3. Total Payments</span>
              <strong style="color: #be123c;">Rs. ${Number(currentAccount.totalPayments).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card" style="background-color: #fef3c7; border-color: #f59e0b;">
              <span style="color: #92400e;">4. Net Closing Balance</span>
              <strong style="color: #b45309;">Rs. ${Number(currentAccount.closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
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
                <td style="border: 1px solid #cbd5e1;">01-Jul-2026</td>
                <td style="border: 1px solid #cbd5e1;">July</td>
                <td style="text-align: center; border: 1px solid #cbd5e1;">-</td>
                <td style="border: 1px solid #cbd5e1;" colspan="6">OPENING BALANCE BROUGHT FORWARD (FY 2026-27)</td>
                <td style="text-align: right; border: 1px solid #cbd5e1; font-family: monospace;">${Number(currentAccount.openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="sig-box">
            <div class="sig-col">
              <strong>Kashif Zia</strong>
              <span>Prepared by: Accountant</span>
            </div>
            <div class="sig-col">
              <strong>ANEEBA JAMIL</strong>
              <span>Checked by: CO-Signatory</span>
            </div>
            <div class="sig-col">
              <strong>SHAZIA KHADIM</strong>
              <span>Approved by: Acting Principal / DDO</span>
            </div>
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
            const isActive = activeAccountKey === key;

            return (
              <button
                key={key}
                onClick={() => setActiveAccountKey(key)}
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
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {accMeta.code}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  A/C: {accMeta.accountNo}
                </p>
                <p className={`text-sm font-black font-mono mt-1 ${
                  isActive
                    ? darkMode
                      ? 'text-amber-300'
                      : 'text-blue-900'
                    : 'text-slate-400'
                }`}>
                  {formatPKR(state.closingBalance, false)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. ACTIVE CASHBOOK FOLIO HEADER & METRICS BAR                  */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-5 rounded-2xl border relative overflow-hidden transition-all ${
        darkMode
          ? 'bg-gradient-to-r from-[#0F1D3B] via-[#0B132B] to-[#132247] border-slate-700 text-white'
          : 'bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 border-slate-800 text-white shadow-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Official Double-Column Folio (2026-27)
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-mono bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{syncStatus}</span>
                {lastSyncTime && <span className="opacity-70">({lastSyncTime})</span>}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {currentAccount.meta.bankName} • {currentAccount.meta.branch}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1 text-white uppercase">
              {currentAccount.meta.fullName}
            </h2>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Dedicated Ledger Account Number: <strong className="text-amber-300">{currentAccount.meta.accountNo}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-white/20 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-300" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print CashBook</span>
            </button>
          </div>
        </div>

        {/* Financial Flow Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs font-mono">
          <div className="bg-black/30 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">1. Opening Balance</span>
            <span className="text-base font-black text-blue-300">
              {formatPKR(currentAccount.openingBalance, false)}
            </span>
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
              2. Total Receipts
            </span>
            <span className="text-base font-black text-emerald-400">
              {currentAccount.totalReceipts > 0 ? formatPKR(currentAccount.totalReceipts, false) : '0.00'}
            </span>
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-rose-400" />
              3. Total Payments
            </span>
            <span className="text-base font-black text-rose-400">
              {currentAccount.totalPayments > 0 ? formatPKR(currentAccount.totalPayments, false) : '0.00'}
            </span>
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-amber-400/30">
            <span className="text-[10px] text-amber-300 block uppercase font-black">4. Net Closing Balance</span>
            <span className="text-base font-black text-amber-300">
              {formatPKR(currentAccount.closingBalance, false)}
            </span>
          </div>
        </div>
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
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. DOUBLE-COLUMN CASHBOOK LEDGER TABLE                         */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-xl border overflow-hidden shadow-xl ${
        darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-300'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1150px]">
            <thead className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-2 text-center w-12 border-r border-slate-800">Sr.#</th>
                <th className="py-3 px-3 border-r border-slate-800 w-28">Date</th>
                <th className="py-3 px-2 border-r border-slate-800 w-20">Month</th>
                <th className="py-3 px-2 text-center border-r border-slate-800 w-16">V#</th>
                <th className="py-3 px-4 border-r border-slate-800 min-w-[240px]">Particulars / Narration</th>
                <th className="py-3 px-3 border-r border-slate-800 w-44">Paid To / By</th>
                <th className="py-3 px-3 border-r border-slate-800 w-48">Budget Account Head</th>
                <th className="py-3 px-3 text-center border-r border-slate-800 w-28">Cheque #</th>
                <th className="py-3 px-3 text-right border-r border-slate-800 w-28 text-emerald-400">Receipts (Rs.)</th>
                <th className="py-3 px-3 text-right border-r border-slate-800 w-28 text-rose-400">Payments (Rs.)</th>
                <th className="py-3 px-3 text-right border-r border-slate-800 w-32 text-amber-300">Balance (Rs.)</th>
                <th className="py-3 px-2 text-center w-24">PAF</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              
              {/* Opening Balance Row */}
              <tr className={`font-bold ${darkMode ? 'bg-slate-900/60 text-slate-300' : 'bg-slate-100 text-slate-800'}`}>
                <td className="py-2.5 px-2 text-center font-mono text-slate-500">—</td>
                <td className="py-2.5 px-3 font-mono">01-Jul-2026</td>
                <td className="py-2.5 px-2 font-mono">July</td>
                <td className="py-2.5 px-2 text-center font-mono">—</td>
                <td colSpan={3} className="py-2.5 px-4 font-black uppercase text-blue-400">
                  OPENING BALANCE BROUGHT FORWARD (FY 2026-27)
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-500">—</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">—</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">—</td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300">
                  {formatPKR(currentAccount.openingBalance, false)}
                </td>
                <td className="py-2.5 px-2 text-center">—</td>
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
                      className={`transition-colors hover:bg-blue-500/10 ${
                        isEven
                          ? darkMode
                            ? 'bg-[#0B132B]'
                            : 'bg-white'
                          : darkMode
                          ? 'bg-[#070E20]'
                          : 'bg-slate-50/70'
                      }`}
                    >
                      {/* Sr.# */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-400 border-r border-slate-700/50">
                        {entry.srNo}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-300 border-r border-slate-700/50">
                        {entry.date}
                      </td>

                      {/* Month */}
                      <td className="py-3 px-2 font-mono text-slate-400 border-r border-slate-700/50">
                        {entry.month}
                      </td>

                      {/* V# */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-blue-400 border-r border-slate-700/50">
                        {entry.vNo}
                      </td>

                      {/* Particulars */}
                      <td className="py-3 px-4 border-r border-slate-700/50">
                        <span className={`font-medium block leading-snug ${isTaxEntry ? 'text-rose-400 font-semibold' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {entry.particulars}
                        </span>
                        {entry.voucherSerial && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Ref: {entry.voucherSerial}
                          </span>
                        )}
                      </td>

                      {/* Paid To / By */}
                      <td className="py-3 px-3 font-bold border-r border-slate-700/50">
                        <span className={darkMode ? 'text-slate-200' : 'text-slate-800'}>
                          {entry.paidToBy}
                        </span>
                      </td>

                      {/* Budget Head */}
                      <td className="py-3 px-3 border-r border-slate-700/50">
                        <span className={`font-bold text-[11px] block line-clamp-1 ${darkMode ? 'text-blue-300' : 'text-blue-900'}`} title={entry.accountHead}>
                          {entry.accountHead}
                        </span>
                      </td>

                      {/* Cheque # */}
                      <td className="py-3 px-3 text-center font-mono text-slate-300 border-r border-slate-700/50">
                        {entry.chequeNo || '—'}
                      </td>

                      {/* Receipts */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 border-r border-slate-700/50">
                        {entry.receipts > 0 ? formatPKR(entry.receipts, false) : '—'}
                      </td>

                      {/* Payments */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-400 border-r border-slate-700/50">
                        {entry.payments > 0 ? formatPKR(entry.payments, false) : '—'}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-3 text-right font-mono font-black text-amber-300 border-r border-slate-700/50">
                        {formatPKR(entry.runningBalance, false)}
                      </td>

                      {/* PAF Action Button */}
                      <td className="py-3 px-2 text-center">
                        {entry.voucherSerial ? (
                          <button
                            onClick={() => handleOpenPAF(entry.voucherSerial)}
                            className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                          >
                            View PAF
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[10px]">—</span>
                        )}
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
                  {formatPKR(currentAccount.totalReceipts, false)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-rose-400">
                  {formatPKR(currentAccount.totalPayments, false)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-amber-300 text-sm">
                  {formatPKR(currentAccount.closingBalance, false)}
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

    </div>
  );
};
