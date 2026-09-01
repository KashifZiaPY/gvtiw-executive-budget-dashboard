import React, { useEffect } from 'react';
import { DashboardResponse } from '../types';
import { formatPKR, formatPercent, format12HourDate } from '../lib/formatters';
import { Printer, X } from 'lucide-react';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../data/initialData';

interface PrintExecutiveReportProps {
  isOpen: boolean;
  onClose: () => void;
  data: DashboardResponse;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
}

export const PrintExecutiveReport: React.FC<PrintExecutiveReportProps> = ({
  isOpen,
  onClose,
  data,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden font-sans my-8">
        {/* Action bar (hidden on print) */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <span className="font-bold text-xs">Executive Board Financial Summary (Print Ready) — Press Esc to Exit</span>
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
        <div className="p-8 space-y-6 text-xs bg-white text-slate-900">
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
              <h1 className="text-lg font-black tracking-wide uppercase">{data.instituteName}</h1>
              <p className="text-xs font-bold text-slate-700">Technical Education & Vocational Training Authority (TEVTA), Govt of Punjab</p>
              <h2 className="text-sm font-bold text-blue-900 uppercase pt-0.5">{data.reportTitle}</h2>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-600 pt-1">
                <span className="whitespace-nowrap font-bold text-slate-800">{data.financialYear}</span>
                <span className="text-slate-400">•</span>
                <span className="whitespace-nowrap">Generated: {format12HourDate(new Date(), true)}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono whitespace-nowrap text-slate-700">{data.developerWatermark}</span>
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

          {/* Key Executive Metrics Cards (Including Inflow) */}
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

          {/* Consolidated Category Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Consolidated Category Breakdown
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
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
                <tr className="bg-slate-900 text-white font-extrabold">
                  <td colSpan={2} className="p-2 border border-slate-900 uppercase">
                    GRAND TOTAL OPERATING POOL (Excl. AAA Memo)
                  </td>
                  <td className="p-2 border border-slate-900 text-right font-mono">{formatPKR(data.grandTotal.opening, false)}</td>
                  <td className="p-2 border border-slate-900 text-right font-mono">{data.grandTotal.reappr !== 0 ? formatPKR(data.grandTotal.reappr, false) : '-'}</td>
                  <td className="p-2 border border-slate-900 text-right font-mono text-emerald-300">{formatPKR(data.grandTotal.receipts, false)}</td>
                  <td className="p-2 border border-slate-900 text-right font-mono text-rose-300">{formatPKR(data.grandTotal.payments, false)}</td>
                  <td className="p-2 border border-slate-900 text-right font-mono font-black text-amber-300">{formatPKR(data.grandTotal.balance, false)}</td>
                  <td className="p-2 border border-slate-900 text-center font-mono">{formatPercent(data.grandTotal.burnRate)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures Section */}
          <div className="pt-14 grid grid-cols-3 gap-8 text-center text-xs text-slate-800">
            <div className="border-t-2 border-slate-700 pt-2 font-bold">
              Prepared by: Accountant
            </div>
            <div className="border-t-2 border-slate-700 pt-2 font-bold">
              Verified by: Co. Signature
            </div>
            <div className="border-t-2 border-slate-700 pt-2 font-bold">
              Approved by: HOI / DDO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
