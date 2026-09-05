import React from 'react';
import {
  CashBookStatementData,
  formatCurrency2Decimals,
} from '../lib/reportingEngine';
import { InstituteEmblem, TevtaEmblem } from './Emblems';
import { Printer, Download, Building, CreditCard, ShieldCheck } from 'lucide-react';

interface CashBookStatementViewProps {
  data: CashBookStatementData;
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  onPrint: () => void;
  onExportCSV: () => void;
}

export const CashBookStatementView: React.FC<CashBookStatementViewProps> = ({
  data,
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  onPrint,
  onExportCSV,
}) => {
  let globalSr = 1;

  return (
    <div
      className={`rounded-2xl border transition-all shadow-xl p-5 md:p-7 space-y-6 ${
        darkMode ? 'bg-[#0B132B] border-slate-700/80 text-white' : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. OFFICIAL INSTITUTIONAL HEADER WITH DUAL LOGOS              */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-5 border-b-2 border-[#002b66] dark:border-blue-500">
        {/* Left Emblem: GVTI(W) */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 p-1 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
            <InstituteEmblem className="w-12 h-12" src={customGvtiwLogo || undefined} />
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-400 font-bold block uppercase">
              Govt. of Punjab • TEVTA
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
              Institute # 33028
            </span>
          </div>
        </div>

        {/* Center Title Block */}
        <div className="text-center flex-1 px-2">
          <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-[#002b66] dark:text-blue-300">
            GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W)
          </h1>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            Samanabad, Faisalabad • Accounts & Finance Wing
          </p>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900 dark:text-white block">
              {data.title}
            </span>
            <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">
              {data.accountNoText}
            </span>
          </div>
        </div>

        {/* Right Emblem: TEVTA & Meta Details */}
        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] font-mono leading-tight text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400">Generated: </span>
              <strong className="font-bold text-slate-900 dark:text-white">{data.generatedTimestamp}</strong>
            </div>
            <div>
              <span className="text-slate-400">Period: </span>
              <strong className="font-bold text-slate-900 dark:text-white">{data.periodLabel}</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Tx: </span>
              <strong className="font-bold text-blue-600 dark:text-blue-400">{data.totalTransactionsCount}</strong>
            </div>
          </div>
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 p-1 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
            <TevtaEmblem className="w-12 h-12" src={customTevtaLogo || undefined} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. 4 FINANCIAL KPI METRIC CARDS (Exact Screenshot Format)      */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Opening Balance Card */}
        <div
          className={`p-3.5 rounded-xl border text-center transition-all ${
            darkMode
              ? 'bg-blue-950/30 border-blue-800/80 text-white'
              : 'bg-blue-50/70 border-blue-300 text-blue-950'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block">
            {data.isConsolidated ? 'CONSOLIDATED OPENING (B/D)' : 'OPENING BALANCE (B/D)'}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-blue-700 dark:text-blue-300 block mt-1">
            Rs. {formatCurrency2Decimals(data.openingBalance)}
          </span>
        </div>

        {/* Total Receipts Card */}
        <div
          className={`p-3.5 rounded-xl border text-center transition-all ${
            darkMode
              ? 'bg-emerald-950/30 border-emerald-800/80 text-white'
              : 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700 dark:text-emerald-400 block">
            TOTAL RECEIPTS (+)
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
            Rs. {formatCurrency2Decimals(data.totalReceipts)}
          </span>
        </div>

        {/* Total Payments Card */}
        <div
          className={`p-3.5 rounded-xl border text-center transition-all ${
            darkMode
              ? 'bg-rose-950/30 border-rose-800/80 text-white'
              : 'bg-rose-50/70 border-rose-300 text-rose-950'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-700 dark:text-rose-400 block">
            TOTAL PAYMENTS (-)
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 block mt-1">
            Rs. {formatCurrency2Decimals(data.totalPayments)}
          </span>
        </div>

        {/* Net Closing Balance Card */}
        <div
          className={`p-3.5 rounded-xl border text-center transition-all ${
            darkMode
              ? 'bg-slate-900 border-slate-600 text-white shadow-md ring-1 ring-blue-400/40'
              : 'bg-slate-100 border-slate-400 text-slate-900 shadow-sm'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-300 block">
            {data.isConsolidated ? 'CONSOLIDATED CLOSING (C/D)' : 'NET CLOSING BALANCE (C/D)'}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-[#002b66] dark:text-blue-300 block mt-1">
            Rs. {formatCurrency2Decimals(data.closingBalance)}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. REPORT ACTION CONTROLS                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-1">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Double-Entry Reconciled Cash Book</span>
          <span>•</span>
          <span>{data.allRows.length} Total Line Items</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onPrint}
            className="px-4 py-1.5 text-xs font-black rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. OFFICIAL CASH BOOK DATA TABLE (Pixel Perfect Matching)     */}
      {/* ------------------------------------------------------------- */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm">
        <table className="w-full text-xs text-left border-collapse min-w-[1050px]">
          {/* Table Header */}
          <thead className="bg-[#0b2545] text-white font-extrabold text-[10px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">SR#</th>
              <th className="py-2.5 px-3 border-r border-slate-700 w-24">DATE</th>
              <th className="py-2.5 px-2 text-center border-r border-slate-700 w-16">ACCT</th>
              <th className="py-2.5 px-3 border-r border-slate-700 w-32">VOUCHER #</th>
              <th className="py-2.5 px-3 border-r border-slate-700 min-w-[140px]">PAID TO / BY</th>
              <th className="py-2.5 px-3 border-r border-slate-700 min-w-[180px]">ACCOUNT HEAD</th>
              <th className="py-2.5 px-3 border-r border-slate-700 min-w-[220px]">PARTICULAR / NARRATION</th>
              <th className="py-2.5 px-2 text-center border-r border-slate-700 w-24">CHEQUE #</th>
              <th className="py-2.5 px-3 text-right border-r border-slate-700 w-28">RECEIPTS (RS.)</th>
              <th className="py-2.5 px-3 text-right border-r border-slate-700 w-28">PAYMENTS (RS.)</th>
              <th className="py-2.5 px-3 text-right w-32">BALANCE (RS.)</th>
            </tr>
          </thead>

          <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
            {/* ROW 1: OPENING BALANCE ROW */}
            <tr
              className={`font-bold ${
                darkMode ? 'bg-slate-900/90 text-white' : 'bg-slate-50 text-slate-900'
              }`}
            >
              <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                —
              </td>
              <td className="py-2 px-3 font-mono border-r border-slate-200 dark:border-slate-800">
                01-Jul-2026
              </td>
              <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {data.isConsolidated ? 'ALL' : data.groups[0]?.accountKey || 'NS'}
                </span>
              </td>
              <td className="py-2 px-3 font-mono text-center text-slate-400 border-r border-slate-200 dark:border-slate-800">
                —
              </td>
              <td
                colSpan={4}
                className="py-2 px-3 font-extrabold uppercase text-blue-700 dark:text-blue-300 border-r border-slate-200 dark:border-slate-800"
              >
                {data.isConsolidated
                  ? 'CONSOLIDATED OPENING BALANCE BROUGHT FORWARD (b/d)'
                  : 'OPENING BALANCE BROUGHT FORWARD (b/d)'}
              </td>
              <td className="py-2 px-3 text-right font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                —
              </td>
              <td className="py-2 px-3 text-right font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                —
              </td>
              <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                {formatCurrency2Decimals(data.openingBalance)}
              </td>
            </tr>

            {/* TRANSACTIONS: GROUPED OR SINGLE */}
            {data.groups.map((group) => {
              const accountEmoji =
                group.accountKey === 'NS'
                  ? '🏛️'
                  : group.accountKey === 'PF'
                  ? '👥'
                  : group.accountKey === 'FC'
                  ? '🎓'
                  : group.accountKey === 'SEC'
                  ? '🛡️'
                  : group.accountKey === 'SC'
                  ? '⚡'
                  : '🏢';

              return (
                <React.Fragment key={group.accountKey}>
                  {/* Group Header Bar (When Consolidated) */}
                  {data.isConsolidated && (
                    <tr className="bg-[#0f172a] text-white font-extrabold">
                      <td
                        colSpan={11}
                        className="py-2 px-3 text-xs tracking-wider border-y border-slate-700"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="flex items-center gap-2">
                            <span>{accountEmoji}</span>
                            <span>
                              {group.meta.shortName} ({group.accountKey}) CASH BOOK
                            </span>
                            <span className="font-normal font-mono text-slate-300 text-[11px]">
                              — Account No: {group.meta.accountNo}
                            </span>
                          </span>
                          <span className="font-mono text-blue-300 text-[11px]">
                            Opening: Rs. {formatCurrency2Decimals(group.openingBalance)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Transaction Rows for this Group */}
                  {group.rows.map((r) => {
                    const isReceipt = r.receipts > 0;

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-blue-500/10 transition-colors ${
                          darkMode ? 'odd:bg-slate-950/40 even:bg-transparent' : 'odd:bg-slate-50/50 even:bg-white'
                        }`}
                      >
                        <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800/60">
                          {globalSr++}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap border-r border-slate-200 dark:border-slate-800/60">
                          {r.date}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800/60">
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {r.accountKey}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-800/60">
                          {r.voucherNo}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800/60">
                          {r.paidToBy}
                        </td>
                        <td className="py-2 px-3 text-[11px] font-mono text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/60">
                          {r.accountHead}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/60">
                          {r.particulars}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[11px] border-r border-slate-200 dark:border-slate-800/60">
                          {r.chequeNo}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800/60">
                          {isReceipt ? formatCurrency2Decimals(r.receipts) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800/60">
                          {!isReceipt && r.payments > 0 ? formatCurrency2Decimals(r.payments) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-[#0b2545] dark:text-blue-200">
                          {formatCurrency2Decimals(r.balance)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Subtotal Row (When Consolidated) */}
                  {data.isConsolidated && (
                    <tr
                      className={`font-black border-t border-slate-300 dark:border-slate-700 ${
                        darkMode ? 'bg-slate-900/80 text-white' : 'bg-slate-100/90 text-slate-900'
                      }`}
                    >
                      <td
                        colSpan={8}
                        className="py-2 px-3 text-right uppercase tracking-wider text-[11px] border-r border-slate-200 dark:border-slate-800"
                      >
                        SUBTOTAL — {group.meta.shortName} ({group.accountKey}):
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">
                        {formatCurrency2Decimals(group.totalReceipts)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800">
                        {formatCurrency2Decimals(group.totalPayments)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-blue-700 dark:text-blue-300">
                        {formatCurrency2Decimals(group.closingBalance)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {/* GRAND TOTALS ROW */}
            <tr
              className={`font-black border-t-2 border-[#0b2545] dark:border-blue-500 ${
                darkMode ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-950'
              }`}
            >
              <td
                colSpan={8}
                className="py-2.5 px-3 text-right uppercase tracking-wider text-xs border-r border-slate-300 dark:border-slate-700"
              >
                GRAND TOTALS (RS.):
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-700">
                {formatCurrency2Decimals(data.totalReceipts)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-xs text-rose-600 dark:text-rose-400 border-r border-slate-300 dark:border-slate-700">
                {formatCurrency2Decimals(data.totalPayments)}
              </td>
              <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-xs">
                —
              </td>
            </tr>

            {/* CLOSING BALANCE CARRIED FORWARD ROW */}
            <tr
              className={`font-black border-t border-b-2 border-[#0b2545] dark:border-blue-500 ${
                darkMode ? 'bg-blue-950/60 text-white' : 'bg-blue-50 text-blue-950'
              }`}
            >
              <td
                colSpan={5}
                className="py-2.5 px-3 text-left uppercase tracking-wider text-xs text-blue-800 dark:text-blue-300 border-r border-slate-300 dark:border-slate-700"
              >
                CLOSING BALANCE CARRIED FORWARD (c/d):
              </td>
              <td
                colSpan={5}
                className="py-2.5 px-3 text-right text-[11px] font-normal italic text-slate-500 dark:text-slate-400 border-r border-slate-300 dark:border-slate-700"
              >
                [Opening + Receipts - Payments]
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-sm font-black text-[#002b66] dark:text-blue-300">
                {formatCurrency2Decimals(data.closingBalance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. OFFICIAL SIGNATURES BLOCK                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="pt-8 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="border-t border-slate-400 dark:border-slate-600 pt-2">
          <strong className="block text-xs font-black text-slate-900 dark:text-white">
            Kashif Zia
          </strong>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Prepared by: Accountant
          </span>
        </div>
        <div className="border-t border-slate-400 dark:border-slate-600 pt-2">
          <strong className="block text-xs font-black text-slate-900 dark:text-white">
            ANEEBA JAMIL
          </strong>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Checked by: CO-Signatory
          </span>
        </div>
        <div className="border-t border-slate-400 dark:border-slate-600 pt-2">
          <strong className="block text-xs font-black text-slate-900 dark:text-white">
            SHAZIA KHADIM
          </strong>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Approved by: Acting Principal / DDO
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. INSTITUTIONAL WATERMARK FOOTER                             */}
      {/* ------------------------------------------------------------- */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <div>
          Voucher / Cashbook Management System • Generated by Kashif Zia (Accounts Deptt.) • Version 3.14
        </div>
        <div>
          Government Vocational Training Institute (W) Samanabad, Faisalabad
        </div>
      </div>
    </div>
  );
};
