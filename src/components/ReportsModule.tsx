import React, { useState, useMemo } from 'react';
import {
  INITIAL_MASTER_VOUCHERS,
  INITIAL_CASHBOOK_STATES,
  INSTITUTIONAL_BANK_ACCOUNTS,
  BankAccountKey,
  MasterVoucher,
} from '../data/cashBookData';
import { MASTER_PAYEE_LIST, MASTER_ACCOUNT_HEADS } from '../data/voucherMasterLists';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import { formatPKR } from '../lib/formatters';
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
} from 'lucide-react';

interface ReportsModuleProps {
  darkMode: boolean;
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

export const ReportsModule: React.FC<ReportsModuleProps> = ({ darkMode }) => {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('CASHBOOK');
  const [vouchers] = useState<MasterVoucher[]>(() => {
    try {
      const cached = localStorage.getItem('gvtiw_live_vouchers_v1');
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_MASTER_VOUCHERS;
  });

  // Common Filters
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Tab-Specific Filters
  const [selectedHead, setSelectedHead] = useState<string>('ALL');
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

  // Base Date & Bank Filter for Vouchers
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

  // Print Report Handler
  const handlePrintReport = (reportTitle: string) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = filteredVouchers.map((v, i) => `
      <tr>
        <td style="text-align:center; padding: 4px; border: 1px solid #cbd5e1;">${i + 1}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${v.voucherNo}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; white-space: nowrap;">${v.chequeDate || v.billDate}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; font-weight: bold;">${v.payeeName}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; font-size: 10px;">${v.accountHead}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${v.chequeNoNet}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right;">${Number(v.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #be123c;">${v.incomeTaxAmount > 0 ? Number(v.incomeTaxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; color: #b45309;">${v.praAmount > 0 ? Number(v.praAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #047857;">${Number(v.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 10px; }
            .header-box { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px; }
            .header-box h1 { font-size: 16px; margin: 0; text-transform: uppercase; font-weight: 900; }
            .header-box h2 { font-size: 12px; margin: 3px 0 0 0; text-transform: uppercase; color: #1e3a8a; font-weight: 800; }
            .meta-strip { display: flex; justify-content: space-between; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; margin-bottom: 10px; font-weight: bold; }
            .metrics-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; text-align: center; }
            .metric-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background-color: #f8fafc; }
            .metric-card span { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .metric-card strong { font-size: 12px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
            th { background-color: #0f172a; color: #ffffff; padding: 5px 4px; text-align: left; font-size: 9px; text-transform: uppercase; border: 1px solid #0f172a; }
            .sig-box { margin-top: 35px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sig-col { text-align: center; width: 28%; border-top: 1px solid #475569; padding-top: 6px; }
            .sig-col strong { display: block; font-size: 10px; }
            .sig-col span { font-size: 9px; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <p style="margin: 0; font-size: 9px; font-weight: bold; color: #475569;">GOVERNMENT OF PUNJAB • TEVTA</p>
            <h1>GOVT. VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD</h1>
            <h2>${reportTitle}</h2>
            <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-family: monospace;">Institute Code: 33028 • Financial Year 2026-27</p>
          </div>

          <div class="meta-strip">
            <div><span>Bank Filter: </span>${selectedBank}</div>
            <div><span>Period: </span>${fromDate || 'Beginning'} to ${toDate || 'Present'}</div>
            <div><span>Total Records: </span>${filteredVouchers.length}</div>
            <div><span>Generated: </span>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>

          <div class="metrics-strip">
            <div class="metric-card">
              <span>Gross Claimed</span>
              <strong style="color: #0f172a;">Rs. ${Number(totalGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card">
              <span>Income Tax Withheld</span>
              <strong style="color: #be123c;">Rs. ${Number(totalWht).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card">
              <span>PRA Tax Withheld</span>
              <strong style="color: #b45309;">Rs. ${Number(totalPra).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="metric-card" style="background-color: #ecfdf5; border-color: #10b981;">
              <span style="color: #065f46;">Net Disbursed</span>
              <strong style="color: #047857;">Rs. ${Number(totalNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">Sr#</th>
                <th style="width: 80px;">Voucher#</th>
                <th style="width: 65px;">Date</th>
                <th>Payee / Vendor</th>
                <th>Budget Account Head</th>
                <th style="width: 65px; text-align: center;">Cheque#</th>
                <th style="width: 75px; text-align: right;">Gross (Rs.)</th>
                <th style="width: 65px; text-align: right;">WHT (Rs.)</th>
                <th style="width: 65px; text-align: right;">PRA (Rs.)</th>
                <th style="width: 80px; text-align: right;">Net Paid (Rs.)</th>
              </tr>
            </thead>
            <tbody>
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

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 400);
  };

  // Export CSV
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
      [headers.join(','), ...rows.map((r) => r.join(','))].join('
');

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
              <span>Cashbook Report</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Consolidated & Bank-Wise</p>
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
      {/* 2. REPORT FILTERS & CONTROLS STRIP (Only for Transaction Tabs) */}
      {/* ------------------------------------------------------------- */}
      {['CASHBOOK', 'HEAD', 'PAYEE', 'CHEQUE', 'AMOUNT'].includes(activeReportTab) && (
        <div className={`p-4 rounded-xl border space-y-3 ${
          darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Bank Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bank Account</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className={`w-full p-2 rounded-lg border font-bold outline-none ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="ALL">🌐 All Cashbooks (Consolidated)</option>
                <option value="Non Salary">Non-Salary (NS)</option>
                <option value="Pupil Funds">Pupil Funds (PF)</option>
                <option value="Fee Collection">Fee Collection (FC)</option>
                <option value="Securities">Securities (SEC)</option>
                <option value="Short Course">Short Course (SC)</option>
                <option value="AAA">AAA Account (NBP)</option>
              </select>
            </div>

            {/* Account Head Filter (when in HEAD tab) */}
            {activeReportTab === 'HEAD' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Account Head</label>
                <select
                  value={selectedHead}
                  onChange={(e) => setSelectedHead(e.target.value)}
                  className={`w-full p-2 rounded-lg border font-bold outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ALL">📋 All Account Heads</option>
                  {MASTER_ACCOUNT_HEADS.map((h, i) => (
                    <option key={i} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Payee Filter (when in PAYEE tab) */}
            {activeReportTab === 'PAYEE' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payee / Supplier</label>
                <select
                  value={selectedPayee}
                  onChange={(e) => setSelectedPayee(e.target.value)}
                  className={`w-full p-2 rounded-lg border font-bold outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ALL">👥 All Payees</option>
                  {MASTER_PAYEE_LIST.map((p, i) => (
                    <option key={i} value={p.name}>{p.name}</option>
                  ))}
                </select>
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

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 flex-wrap gap-2">
            <span className="text-xs font-mono text-slate-400 font-bold">
              Showing {filteredVouchers.length} Transactions
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
                onClick={() => handlePrintReport(`${activeReportTab} Financial Statement`)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Print Official Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. REPORT DATA DISPLAY                                        */}
      {/* ------------------------------------------------------------- */}

      {/* TABS: TRANSACTION REPORTS (CASHBOOK, HEAD, PAYEE, CHEQUE, AMOUNT) */}
      {['CASHBOOK', 'HEAD', 'PAYEE', 'CHEQUE', 'AMOUNT'].includes(activeReportTab) && (
        <div className="space-y-4">
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
                <thead className="bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-800">
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
              const state = INITIAL_CASHBOOK_STATES[key];

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
              Retrieve official PAF (N'Sheet) [B4:K49] & Sanction Order XL [A1:H23] by Voucher Sr.#
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
        />
      )}
    </div>
  );
};
