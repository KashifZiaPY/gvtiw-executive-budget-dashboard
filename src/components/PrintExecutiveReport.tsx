import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DashboardResponse, CategoryType } from '../types';
import { formatPKR, formatPercent, format12HourDate } from '../lib/formatters';
import { Printer, X } from 'lucide-react';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../data/initialData';

interface PrintExecutiveReportProps {
  isOpen: boolean;
  onClose: () => void;
  data: DashboardResponse;
  /** Dashboard card filter — when a category is selected, the print follows it. */
  selectedCategory?: CategoryType | 'ALL';
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
}

export const PrintExecutiveReport: React.FC<PrintExecutiveReportProps> = ({
  isOpen,
  onClose,
  data,
  selectedCategory = 'ALL',
  customGvtiwLogo,
  customTevtaLogo,
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtered print: when a dashboard card is selected, the print follows that
  // card instead of the full report. An unknown category falls back to full.
  const filteredCat =
    selectedCategory && selectedCategory !== 'ALL'
      ? data.categories.find((c) => c.category === selectedCategory)
      : undefined;
  const isFilteredPrint = !!filteredCat;
  const filteredHeads = isFilteredPrint
    ? data.accounts.filter((a) => a.category === selectedCategory)
    : [];

  // Portalled to <body> so print CSS can isolate it (same pattern as the TFC
  // print portals): in print the portal goes static and #root is hidden, so the
  // report prints exactly once instead of repeating per page like a fixed overlay.
  // m-auto (not flex centering) keeps the modal top reachable when the document
  // is taller than the viewport — flex centering clips the top in that case.
  return createPortal(
    <div id="print-executive-portal" className="fixed inset-0 z-50 flex p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      {/* Print page setup for this report only: narrower side margins so the
          document fills the sheet instead of leaving wide empty sides. */}
      <style>{`@page { size: A4; margin: 12mm 8mm; }`}</style>
      <div className="m-auto w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden font-sans">
        {/* Action bar (hidden on print) */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <span className="font-bold text-xs">{isFilteredPrint ? `Filtered Category Report — ${filteredCat!.shortName} (Print Ready)` : 'Executive Board Financial Summary (Print Ready)'} — Press Esc to Exit</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded cursor-pointer" title="Close (Esc)">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 print:p-3 print:border-2 print:border-slate-900 space-y-6 text-xs bg-white text-slate-900">
          {/* Header Banner with Both Institutional Emblems */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
            {/* Left Logo */}
            <div className="w-14 h-14 shrink-0 flex items-center justify-center p-0.5">
              <img
                src={customGvtiwLogo && customGvtiwLogo.startsWith('data:') ? customGvtiwLogo : DEFAULT_GVTIW_LOGO}
                alt="GVTIW Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_GVTIW_LOGO;
                }}
              />
            </div>

            {/* Center Text */}
            <div className="text-center flex-1 space-y-0.5">
              <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', fontWeight: 'bold' }}>Source: Dashboard → Executive Report</div>
              <h1 className="text-lg font-black tracking-wide uppercase">{data.instituteName}</h1>
              <p className="text-xs font-bold text-slate-700">Technical Education & Vocational Training Authority (TEVTA), Govt of Punjab</p>
              <h2 className="text-sm font-bold text-blue-900 uppercase pt-0.5">{data.reportTitle}</h2>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-600 pt-1">
                <span className="whitespace-nowrap font-bold text-slate-800">{data.financialYear}</span>
                <span className="text-slate-400">•</span>
                <span className="whitespace-nowrap">Generated: {format12HourDate(new Date(), true)}</span>
              </div>
            </div>

            {/* Right Logo */}
            <div className="w-14 h-14 shrink-0 flex items-center justify-center p-0.5">
              <img
                src={customTevtaLogo && customTevtaLogo.startsWith('data:') ? customTevtaLogo : DEFAULT_TEVTA_LOGO}
                alt="TEVTA Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_TEVTA_LOGO;
                }}
              />
            </div>
          </div>

          {isFilteredPrint && (
            <div className="border-2 border-amber-600 bg-amber-50 text-amber-900 rounded px-3 py-2 text-center">
              <span className="font-black text-xs tracking-wide uppercase">Filtered Report — {filteredCat!.title}</span>
            </div>
          )}

          {/* Key Executive Metrics Cards (Including Inflow) — category strip when filtered */}
          {isFilteredPrint ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-100 border border-slate-300 rounded text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-600">Category Opening</p>
                <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{formatPKR(filteredCat!.opening)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-700">Inflow (Receipts)</p>
                <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">{formatPKR(filteredCat!.receipts)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-rose-700">Outflow (Payments)</p>
                <p className="text-sm font-black text-rose-700 font-mono mt-0.5">{formatPKR(filteredCat!.payments)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-blue-950">Net Balance</p>
                <p className="text-sm font-black text-blue-950 font-mono mt-0.5">{formatPKR(filteredCat!.balance)}</p>
                <span className="text-[9px] font-bold text-amber-700 font-mono">Burn: {formatPercent(filteredCat!.burnRate)}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase font-bold text-slate-600">Account Heads</p>
                <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{filteredHeads.length}</p>
                <span className="text-[9px] text-slate-500 italic">{filteredCat!.shortName}</span>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-100 border border-slate-300 rounded text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-600">Total Opening Pool</p>
              <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{formatPKR(data.grandTotal.opening)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-700">Total Inflow (Receipts)</p>
              <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">{formatPKR(data.grandTotal.receipts)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-rose-700">Total Outflow (Payments)</p>
              <p className="text-sm font-black text-rose-700 font-mono mt-0.5">{formatPKR(data.grandTotal.payments)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-950">Net Operating Balance</p>
              <p className="text-sm font-black text-blue-950 font-mono mt-0.5">{formatPKR(data.grandTotal.balance)}</p>
              <span className="text-[9px] font-bold text-amber-700 font-mono">Burn: {formatPercent(data.grandTotal.burnRate)}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-bold text-slate-600">AAA Memo Balance</p>
              <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{formatPKR(data.aaaMemo.balance)}</p>
              <span className="text-[9px] text-slate-500 italic">Segregated</span>
            </div>
          </div>
          )}

          {/* Consolidated Category Table */}
          {isFilteredPrint ? (
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Account Heads under {filteredCat!.shortName} ({filteredHeads.length})
              </h3>
              {filteredHeads.length === 0 ? (
                <p className="text-[11px] text-slate-600">No account heads listed for this category.</p>
              ) : (
                <table className="w-full table-fixed border-collapse border border-slate-400 text-left text-[11px] print:text-[11px]">
                  <colgroup><col style={{ width: "11.5%" }} /><col style={{ width: "25%" }} /><col style={{ width: "9.5%" }} /><col style={{ width: "9.5%" }} /><col style={{ width: "9.5%" }} /><col style={{ width: "9.5%" }} /><col style={{ width: "7%" }} /><col style={{ width: "18.5%" }} /></colgroup>
                  <thead>
                    <tr className="bg-slate-800 text-white print:bg-slate-200 print:text-slate-900 font-bold">
                      <th className="p-2 border border-slate-400 text-center">Head Code</th>
                      <th className="p-2 border border-slate-400">Account Description</th>
                      <th className="p-2 text-right border border-slate-400">Opening (PKR)</th>
                      <th className="p-2 text-right border border-slate-400">Inflow / Receipts</th>
                      <th className="p-2 text-right border border-slate-400">Outflow / Payments</th>
                      <th className="p-2 text-right border border-slate-400">Net Balance (PKR)</th>
                      <th className="p-2 text-center border border-slate-400">Burn %</th>
                      <th className="p-2 text-center border border-slate-400">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHeads.map((head, idx) => (
                      <tr key={head.code} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-1.5 border border-slate-400 text-center font-mono font-bold whitespace-nowrap print:px-1">{head.code}</td>
                        <td className="p-1.5 border border-slate-400 font-semibold print:text-[10.5px]">{head.head}</td>
                        <td className="p-1.5 border border-slate-400 text-right font-mono whitespace-nowrap print:px-1">{formatPKR(head.opening, false)}</td>
                        <td className="p-1.5 border border-slate-400 text-right font-mono text-emerald-700 whitespace-nowrap print:px-1">{head.receipts > 0 ? formatPKR(head.receipts, false) : '-'}</td>
                        <td className="p-1.5 border border-slate-400 text-right font-mono text-rose-700 whitespace-nowrap print:px-1">{head.payments > 0 ? formatPKR(head.payments, false) : '-'}</td>
                        <td className="p-1.5 border border-slate-400 text-right font-mono font-bold text-slate-900 whitespace-nowrap print:px-1">{formatPKR(head.balance, false)}</td>
                        <td className="p-1.5 border border-slate-400 text-center font-mono whitespace-nowrap print:px-1">{formatPercent(head.burnRate)}</td>
                        <td className="p-1.5 border border-slate-400 text-center font-mono text-slate-500 whitespace-nowrap print:text-[10px] print:px-1">{format12HourDate(head.lastActivity, false)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white print:bg-slate-200 print:text-slate-900 font-extrabold">
                      <td colSpan={2} className="p-2 border border-slate-900 uppercase">Category Total — {filteredCat!.shortName}</td>
                      <td className="p-2 border border-slate-900 text-right font-mono">{formatPKR(filteredCat!.opening, false)}</td>
                      <td className="p-2 border border-slate-900 text-right font-mono text-emerald-300 print:text-emerald-700">{formatPKR(filteredCat!.receipts, false)}</td>
                      <td className="p-2 border border-slate-900 text-right font-mono text-rose-300 print:text-rose-700">{formatPKR(filteredCat!.payments, false)}</td>
                      <td className="p-2 border border-slate-900 text-right font-mono font-black text-amber-300 print:text-amber-700">{formatPKR(filteredCat!.balance, false)}</td>
                      <td className="p-2 border border-slate-900 text-center font-mono">{formatPercent(filteredCat!.burnRate)}</td>
                      <td className="p-2 border border-slate-900 text-center font-mono">—</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          ) : (
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Consolidated Category Breakdown
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-left text-[11px] print:text-xs">
              <thead>
                <tr className="bg-slate-800 text-white print:bg-slate-200 print:text-slate-900 font-bold">
                  <th className="p-2 border border-slate-400 text-center w-10">Sr.#</th>
                  <th className="p-2 border border-slate-400">Category</th>
                  <th className="p-2 text-right border border-slate-400">Opening (PKR)</th>
                  <th className="p-2 text-right border border-slate-400">Reappr. (PKR)</th>
                  <th className="p-2 text-right border border-slate-400">Inflow / Receipts</th>
                  <th className="p-2 text-right border border-slate-400">Outflow / Payments</th>
                  <th className="p-2 text-right border border-slate-400">Net Balance (PKR)</th>
                  <th className="p-2 text-center border border-slate-400">Burn %</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((cat, idx) => {
                  // Format title cleanly (strip leading duplicate number if present)
                  const cleanCategoryTitle = cat.title.replace(/^\d+\.\s*/, '');

                  return (
                    <tr key={cat.category} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-1.5 border border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-1.5 border border-slate-300 font-semibold">
                        {cleanCategoryTitle} {cat.isMemo ? '(Memo Pass-Through)' : ''}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono">{formatPKR(cat.opening, false)}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono">{cat.reappr !== 0 ? formatPKR(cat.reappr, false) : '-'}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono text-emerald-700">{cat.receipts > 0 ? formatPKR(cat.receipts, false) : '-'}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono text-rose-700">{cat.payments > 0 ? formatPKR(cat.payments, false) : '-'}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-900">{formatPKR(cat.balance, false)}</td>
                      <td className="p-1.5 border border-slate-300 text-center font-mono">{formatPercent(cat.burnRate)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-900 text-white print:bg-slate-200 print:text-slate-900 font-extrabold">
                  <td colSpan={2} className="p-2 border border-slate-900 uppercase">
                    GRAND TOTAL OPERATING POOL (Excl. AAA Memo)
                  </td>
                  <td className="p-2 border border-slate-900 text-right font-mono">{formatPKR(data.grandTotal.opening, false)}</td>
                  <td className="p-2 border border-slate-900 text-right font-mono">{data.grandTotal.reappr !== 0 ? formatPKR(data.grandTotal.reappr, false) : '-'}</td>
                  <td className="p-2 border border-slate-900 text-right font-mono text-emerald-300 print:text-emerald-700">{formatPKR(data.grandTotal.receipts, false)}</td>
                  <td className="p-2 border border-slate-900 text-right font-mono text-rose-300 print:text-rose-700">{formatPKR(data.grandTotal.payments, false)}</td>
                  <td className="p-2 border border-slate-900 text-right font-mono font-black text-amber-300 print:text-amber-700">{formatPKR(data.grandTotal.balance, false)}</td>
                  <td className="p-2 border border-slate-900 text-center font-mono">{formatPercent(data.grandTotal.burnRate)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          )}

          {/* Signatures Section */}
          <div className="pt-14 print:pt-4 grid grid-cols-3 gap-8 text-center text-xs text-slate-800">
            <div className="border-t-2 border-slate-700 pt-2 font-bold">
              <div>KASHIF ZIA</div>
              <div className="text-[10px] font-normal text-slate-600">Accountant / Prepared by:</div>
            </div>
            <div className="border-t-2 border-slate-700 pt-2 font-bold">
              <div>ANEEBA JAMIL</div>
              <div className="text-[10px] font-normal text-slate-600">CO-Signatory / Checked by:</div>
            </div>
            <div className="border-t-2 border-slate-700 pt-2 font-bold">
              <div>SHAZIA KHADIM</div>
              <div className="text-[10px] font-normal text-slate-600">Acting Principal / DDO / Approved by:</div>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '6px', borderTop: '1px dotted #94a3b8', fontSize: '8px', fontFamily: 'monospace', color: '#64748b', textAlign: 'center' }}>
            e-CashBook &amp; Voucher System developed by MKZ for institute 33028
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
