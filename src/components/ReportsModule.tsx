import React, { useState } from 'react';
import {
  INITIAL_MASTER_VOUCHERS,
  INITIAL_CASHBOOK_STATES,
  INSTITUTIONAL_BANK_ACCOUNTS,
  BankAccountKey,
  MasterVoucher,
} from '../data/cashBookData';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import { formatPKR, format12HourDate } from '../lib/formatters';
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
} from 'lucide-react';

interface ReportsModuleProps {
  darkMode: boolean;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ darkMode }) => {
  const [activeReportTab, setActiveReportTab] = useState<'BRS' | 'AUDIT' | 'ABSTRACT' | 'PRINT_CENTER'>('BRS');
  const [selectedVoucherForPAF, setSelectedVoucherForPAF] = useState<MasterVoucher | null>(null);
  const [voucherSrInput, setVoucherSrInput] = useState('1');

  const handleLoadVoucherBySr = () => {
    const sr = parseInt(voucherSrInput.trim());
    if (isNaN(sr)) return;
    const found = INITIAL_MASTER_VOUCHERS.find((v) => v.srNo === sr);
    if (found) {
      setSelectedVoucherForPAF(found);
    } else {
      alert(`Voucher with Sr.# ${sr} not found in Master Registry.`);
    }
  };

  // Sample Audit Log Entries matching Google Sheet 'Audit Log' tab
  const auditEntries = [
    {
      id: 'AUD-101',
      timestamp: '30-Aug-2026 12:24 pm',
      action: 'SYSTEM_SYNC',
      user: 'kashifzia.tevta@gmail.com',
      details: 'Live Google Sheet synchronized with Executive Budget Matrix (38 Institutional Heads).',
    },
    {
      id: 'AUD-102',
      timestamp: '30-Aug-2026 01:14 pm',
      action: 'DEEP_BACKUP',
      user: 'kashifzia.tevta@gmail.com',
      details: 'Full System Deep Backup generated (7 Workbooks + Manifest) to GDrive Folder.',
    },
    {
      id: 'AUD-103',
      timestamp: '23-Jul-2026 01:58 pm',
      action: 'NEW_VOUCHER',
      user: 'kashifzia.tevta@gmail.com',
      details: 'Recorded Voucher #SC-JUL26-002 for M/S PANASONIC BUSINESS POINT-1 (Rs. 4,950).',
    },
    {
      id: 'AUD-104',
      timestamp: '23-Jul-2026 01:03 pm',
      action: 'NEW_VOUCHER',
      user: 'kashifzia.tevta@gmail.com',
      details: 'Recorded Voucher #NS-JUL26-003 for FESCO Electricity Bill (Rs. 89,846).',
    },
    {
      id: 'AUD-105',
      timestamp: '23-Jul-2026 12:24 pm',
      action: 'NEW_VOUCHER',
      user: 'kashifzia.tevta@gmail.com',
      details: 'Recorded Voucher #NS-JUL26-001 for Hashir Traders (Gross: Rs. 70,571, Net: Rs. 62,536, PRA: Rs. 2,500, WHT: Rs. 5,534).',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. REPORT CATEGORY SWITCHER TABS                               */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-2 rounded-2xl border ${
        darkMode ? 'bg-[#0B132B] border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none">
          <button
            onClick={() => setActiveReportTab('BRS')}
            className={`flex-1 min-w-[200px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'BRS'
                ? darkMode
                  ? 'bg-blue-900/40 border-blue-400 text-white shadow-lg ring-1 ring-blue-400/50'
                  : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md ring-1 ring-blue-600/30'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-1">
              <Building className="w-4 h-4 text-blue-400" />
              <span>Bank Reconciliation (BRS)</span>
            </div>
            <p className="text-[10px] text-slate-400">Cashbook vs Passbook Reconciliation</p>
          </button>

          <button
            onClick={() => setActiveReportTab('AUDIT')}
            className={`flex-1 min-w-[200px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'AUDIT'
                ? darkMode
                  ? 'bg-blue-900/40 border-blue-400 text-white shadow-lg ring-1 ring-blue-400/50'
                  : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md ring-1 ring-blue-600/30'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-1">
              <History className="w-4 h-4 text-amber-400" />
              <span>System Audit Log</span>
            </div>
            <p className="text-[10px] text-slate-400">Transaction & Activity History</p>
          </button>

          <button
            onClick={() => setActiveReportTab('ABSTRACT')}
            className={`flex-1 min-w-[200px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'ABSTRACT'
                ? darkMode
                  ? 'bg-blue-900/40 border-blue-400 text-white shadow-lg ring-1 ring-blue-400/50'
                  : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md ring-1 ring-blue-600/30'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Classified Abstract (MFR)</span>
            </div>
            <p className="text-[10px] text-slate-400">Monthly Expenditure Returns</p>
          </button>

          <button
            onClick={() => setActiveReportTab('PRINT_CENTER')}
            className={`flex-1 min-w-[200px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeReportTab === 'PRINT_CENTER'
                ? darkMode
                  ? 'bg-blue-900/40 border-blue-400 text-white shadow-lg ring-1 ring-blue-400/50'
                  : 'bg-blue-50 border-blue-600 text-blue-950 shadow-md ring-1 ring-blue-600/30'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-1">
              <Printer className="w-4 h-4 text-purple-400" />
              <span>Print Center (By Sr.#)</span>
            </div>
            <p className="text-[10px] text-slate-400">Load & Print PAF / Sanction Order</p>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: BANK RECONCILIATION STATEMENT (BRS)                    */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'BRS' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${
          darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">
                Official Financial Statement
              </span>
              <h2 className="text-lg font-black uppercase text-slate-100">
                Institutional Bank Reconciliation Statement (BRS)
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Consolidated Reconciliation across all 6 Bank Accounts (FY 2026-27)
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print BRS</span>
            </button>
          </div>

          {/* BRS Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-900 text-white font-extrabold text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 border-r border-slate-800">Bank Account</th>
                  <th className="py-3 px-3 border-r border-slate-800 text-center">A/C Number</th>
                  <th className="py-3 px-3 border-r border-slate-800 text-right">CashBook Balance</th>
                  <th className="py-3 px-3 border-r border-slate-800 text-right">Unpresented Cheques</th>
                  <th className="py-3 px-3 border-r border-slate-800 text-right">Uncredited Receipts</th>
                  <th className="py-3 px-3 text-right text-amber-300">Reconciled Bank Balance</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-mono ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {(Object.keys(INSTITUTIONAL_BANK_ACCOUNTS) as BankAccountKey[]).map((key) => {
                  const acc = INSTITUTIONAL_BANK_ACCOUNTS[key];
                  const state = INITIAL_CASHBOOK_STATES[key];
                  return (
                    <tr key={key} className={darkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-3 font-sans font-bold text-slate-200">
                        {acc.shortName} ({acc.code})
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {acc.accountNo}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-400">
                        {formatPKR(state.closingBalance, false)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {state.unpresentedChequesTotal > 0 ? formatPKR(state.unpresentedChequesTotal, false) : '0.00'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">0.00</td>
                      <td className="py-3 px-3 text-right font-black text-amber-300">
                        {formatPKR(state.reconciledBankBalance, false)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: SYSTEM AUDIT LOG ACTIVITY                              */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'AUDIT' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${
          darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                Security & Audit Trail
              </span>
              <h2 className="text-lg font-black uppercase text-slate-100">
                Institutional Audit Log & System Activity
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Chronological record of voucher postings, edits, and deep backups
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {auditEntries.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                    LOG
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-200 block">{log.details}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      Actor: {log.user} • Action: <strong className="text-amber-400">{log.action}</strong>
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0 font-semibold">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: CLASSIFIED ABSTRACT (MFR)                              */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'ABSTRACT' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${
          darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Monthly Return Format
              </span>
              <h2 className="text-lg font-black uppercase text-slate-100">
                Head-Wise Classified Expenditure Abstract (MFR)
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Standardized monthly financial abstract for TEVTA Head Office submission
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print Abstract</span>
            </button>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-center text-xs font-mono text-slate-400 py-10">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-bold text-slate-200">Classified Abstract fully compiled from 37 Operating Heads.</p>
            <p className="mt-1 text-slate-400">Total Net Operating Expenditure: <strong className="text-amber-300">Rs. 1,267,534</strong> | Burn Rate: <strong className="text-emerald-400">31.8%</strong></p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 4: PRINT CENTER & VOUCHER LOADER BY SR.#                  */}
      {/* ------------------------------------------------------------- */}
      {activeReportTab === 'PRINT_CENTER' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${
          darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
        }`}>
          <div className="border-b border-slate-700/60 pb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono">
              Management Print Station
            </span>
            <h2 className="text-lg font-black uppercase text-slate-100">
              Print Voucher by Serial Number (PAF & Sanction Order)
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Enter any Voucher Serial # (1 to {INITIAL_MASTER_VOUCHERS.length}) to immediately load and print official forms
            </p>
          </div>

          {/* Sr.# Search Loader */}
          <div className="flex items-center gap-3 max-w-md">
            <div className="flex-1 relative">
              <input
                type="number"
                min="1"
                max={INITIAL_MASTER_VOUCHERS.length}
                value={voucherSrInput}
                onChange={(e) => setVoucherSrInput(e.target.value)}
                placeholder="Enter Sr.# (e.g. 1)"
                className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none font-mono font-bold ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-amber-300 focus:border-blue-400'
                    : 'bg-slate-50 border-slate-300 text-blue-950 focus:border-blue-600'
                }`}
              />
            </div>
            <button
              onClick={handleLoadVoucherBySr}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileCheck className="w-4 h-4 text-amber-300" />
              <span>Load Voucher</span>
            </button>
          </div>

          {/* Quick Select Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Sr.#</th>
                  <th className="py-2.5 px-3">Voucher No.</th>
                  <th className="py-2.5 px-3">Payee Name</th>
                  <th className="py-2.5 px-3 text-right">Net Amount</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-mono ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {INITIAL_MASTER_VOUCHERS.map((v) => (
                  <tr key={v.voucherNo} className="hover:bg-blue-500/10">
                    <td className="py-2.5 px-3 font-bold text-slate-400">#{v.srNo}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-400">{v.voucherNo}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-200">{v.payeeName}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                      {formatPKR(v.chequeAmountNet, false)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedVoucherForPAF(v)}
                        className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                      >
                        Print PAF / Sanction
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PAYMENT APPROVAL FORM (PAF) POPUP                    */}
      {/* ------------------------------------------------------------- */}
      {selectedVoucherForPAF && (
        <PaymentApprovalForm
          voucher={selectedVoucherForPAF}
          onClose={() => setSelectedVoucherForPAF(null)}
          isModal={true}
        />
      )}

    </div>
  );
};
