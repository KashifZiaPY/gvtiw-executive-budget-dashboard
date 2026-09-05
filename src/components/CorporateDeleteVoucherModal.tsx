import React from 'react';
import {
  Trash2,
  AlertTriangle,
  ShieldAlert,
  X,
  Building,
  Calendar,
  FileText,
  Clock,
  Landmark,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MasterVoucher } from '../data/cashBookData';
import { formatPKR } from '../lib/formatters';

interface CorporateDeleteVoucherModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  voucher: MasterVoucher | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  customGvtiwLogo?: string;
  darkMode?: boolean;
}

export const CorporateDeleteVoucherModal: React.FC<CorporateDeleteVoucherModalProps> = ({
  isOpen,
  isDeleting,
  voucher,
  onConfirm,
  onClose,
  customGvtiwLogo,
  darkMode = true,
}) => {
  if (!isOpen && !isDeleting) return null;

  return (
    <>
      {/* ================================================================= */}
      {/* 1. OFFICIAL CORPORATE BUSY SIGN (IDENTICAL TO SAVING TIME MODAL)  */}
      {/* ================================================================= */}
      {isDeleting && (
        <div
          id="gvtiw-corporate-delete-busy-overlay"
          className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in"
        >
          <div className="relative mb-5 flex items-center justify-center">
            {/* Outer Rotating Segmented Green Ring */}
            <div className="w-28 h-28 rounded-full border-4 border-dashed border-emerald-400 animate-spin duration-3000 absolute" />
            
            {/* Inner Glowing Solid Emerald Ring */}
            <div className="w-24 h-24 rounded-full border-3 border-emerald-500 bg-emerald-950/40 shadow-[0_0_30px_rgba(16,185,129,0.7)] flex items-center justify-center p-1.5 relative z-10">
              <img
                src={customGvtiwLogo || '/gvtiw-logo.jpg'}
                alt="GVTIW Logo"
                className="w-full h-full object-cover rounded-full bg-white shadow-inner"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            
            {/* Pulsing Badge */}
            <div className="absolute -bottom-1 -right-1 z-20 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 text-white flex items-center justify-center text-xs font-mono shadow-md animate-pulse">
              ✓
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-extrabold uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>GVTIW Institutional Financial Server</span>
          </div>

          <h4 className="text-base font-black text-white uppercase tracking-wider mb-1">
            Purging Payment Authorization
          </h4>
          <p className="text-xs text-emerald-300/90 font-mono max-w-sm">
            Reversing Head Ceilings, Restoring Bank Ledgers &amp; Purging Official v3.14 Voucher Serial #{voucher?.srNo ?? ''}...
          </p>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. CORPORATE LEVEL CONFIRMATION POPUP MODAL                       */}
      {/* ================================================================= */}
      {isOpen && !isDeleting && voucher && (
        <div
          id="gvtiw-corporate-delete-modal-backdrop"
          className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            id="gvtiw-corporate-delete-modal-card"
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 ${
              darkMode ? 'bg-[#0b1329] border-rose-900/60 text-white' : 'bg-white border-rose-200 text-slate-900'
            }`}
          >
            {/* Top Institutional Header Banner */}
            <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-rose-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shadow-inner">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400/40 uppercase">
                      Strict LIFO Deletion
                    </span>
                    <span className="text-[10px] font-mono text-rose-300/80">
                      Institute: 33028
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-white mt-0.5">
                    Authorize Permanent Voucher Purge
                  </h3>
                </div>
              </div>
              <button
                id="btn-close-delete-modal"
                type="button"
                onClick={onClose}
                className="text-rose-200/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Cancel & Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* LIFO Sequential Rule Notice */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  darkMode
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold uppercase tracking-wide text-[11px] text-rose-400">
                    Chronological Cash Book Integrity Rule (LIFO)
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    In compliance with Govt of Punjab Financial Rules, only the latest generated entry (
                    <strong className="text-rose-300 font-mono">Sr. #{voucher.srNo}</strong>) may be purged to prevent gaps in cash book serial numbering.
                  </p>
                </div>
              </div>

              {/* Transaction Detail Card */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-extrabold">
                      Sr. #{voucher.srNo}
                    </span>
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      {voucher.voucherNo || `VR-2026/${String(voucher.srNo).padStart(3, '0')}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Net Cheque Amount
                    </span>
                    <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-400">
                      {formatPKR(voucher.chequeAmountNet)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 mb-0.5">
                      <Building className="w-3 h-3 text-slate-400" /> Payee / Beneficiary
                    </span>
                    <div className="font-bold text-white truncate" title={voucher.payeeName}>
                      {voucher.payeeName || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 mb-0.5">
                      <Landmark className="w-3 h-3 text-slate-400" /> Bank Account Ledger
                    </span>
                    <div className="font-semibold text-slate-300 truncate" title={voucher.bankAccount}>
                      {voucher.bankAccount || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 mb-0.5">
                      <Layers className="w-3 h-3 text-slate-400" /> Account Head
                    </span>
                    <div className="font-semibold text-slate-300 truncate" title={voucher.accountHead}>
                      {voucher.accountHead || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 mb-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" /> Cheque No &amp; Date
                    </span>
                    <div className="font-mono text-slate-300">
                      {voucher.chequeNoNet ? `#${voucher.chequeNoNet}` : 'N/A'} • {voucher.chequeDate || voucher.billDate || 'N/A'}
                    </div>
                  </div>
                </div>

                {voucher.description && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                      Transaction Description / Narration
                    </span>
                    <p className="text-xs text-slate-300 italic line-clamp-2">
                      "{voucher.description}"
                    </p>
                  </div>
                )}
              </div>

              {/* Automatic Ledger Reversal Summary */}
              <div className="text-[11px] text-slate-400 space-y-1.5 px-1 font-mono">
                <div className="font-sans font-bold text-xs text-slate-300 uppercase tracking-wide mb-1">
                  Automatic Ledger Impacts:
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400/90">
                  <span>✓</span>
                  <span>Restores <strong>{formatPKR(voucher.chequeAmountNet)}</strong> back to Bank CashBook running balance.</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400/90">
                  <span>✓</span>
                  <span>Unreserves expenditure ceiling on account head <strong>{voucher.accountHead}</strong>.</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-400/90">
                  <span>✓</span>
                  <span>Dispatches <strong>deleteLastVoucher</strong> command to Google Apps Script backend engine.</span>
                </div>
                <div className="text-[10px] text-amber-400/90 pt-1.5 border-t border-slate-800/80">
                  ℹ️ Note: Physical removal of the row in Google Sheets requires the v3.15 Apps Script engine deployed on the sheet (Admin Hub &rarr; Google Apps Script Sync).
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div
              className={`px-6 py-4 border-t flex flex-col-reverse sm:flex-row items-center justify-end gap-3 ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                id="btn-cancel-delete-voucher"
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-colors"
              >
                Keep Voucher (Cancel)
              </button>
              <button
                id="btn-confirm-delete-voucher"
                type="button"
                onClick={onConfirm}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition-all group"
              >
                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Confirm &amp; Purge Voucher #{voucher.srNo}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
