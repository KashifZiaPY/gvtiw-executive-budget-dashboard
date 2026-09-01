import React from 'react';
import { AuditLogEntry, VoucherTransaction } from '../types';
import { formatPKR, format12HourDate } from '../lib/formatters';
import { X, History, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  audits: AuditLogEntry[];
  vouchers: VoucherTransaction[];
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  audits,
  vouchers,
}) => {
  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden font-sans max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="py-3.5 px-6 bg-[#020617] text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Scenario A Instant Audit Spotlight & Event Log
              </h3>
              <p className="text-[11px] text-slate-500">Real-time delta tracking & cryptographic verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Scenario A Instant Audit Spotlight Architecture</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Whenever a voucher is added, an amount is modified, or an adjustment occurs, the system recalculates the cryptographic hash, applies a gold spotlight to the modified head, and permanently records the delta state.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Audit Event Trail ({audits.length} Records)
            </span>

            <div className="space-y-2.5">
              {audits.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 bg-[#020617] rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 text-xs">
                        {entry.headCode}
                      </span>
                      <span className="font-bold text-white">{entry.headTitle}</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {format12HourDate(entry.timestamp, true)}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">{entry.details}</p>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-900">
                    <span>
                      Previous: <span className="text-slate-200">{formatPKR(entry.previousBalance, false)}</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span>
                      New Balance: <span className="text-amber-300 font-bold">{formatPKR(entry.newBalance, false)}</span>
                    </span>
                    <span className="ml-auto text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-emerald-400 font-semibold">
                      Delta: {formatPKR(entry.deltaAmount, false)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
