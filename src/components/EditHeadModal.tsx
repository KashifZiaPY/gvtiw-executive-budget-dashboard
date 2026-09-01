import React, { useState, useEffect } from 'react';
import { AccountHead } from '../types';
import { formatPKR } from '../lib/formatters';
import { submitAccountEdit } from '../lib/apiEngine';
import { X, CheckCircle, Edit3, AlertTriangle } from 'lucide-react';

interface EditHeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  head: AccountHead | null;
  onSuccess: () => void;
}

export const EditHeadModal: React.FC<EditHeadModalProps> = ({
  isOpen,
  onClose,
  head,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [opening, setOpening] = useState('');
  const [reappr, setReappr] = useState('');
  const [receipts, setReceipts] = useState('');
  const [payments, setPayments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (head) {
      setTitle(head.head);
      setOpening(String(head.opening));
      setReappr(String(head.reappr));
      setReceipts(String(head.receipts));
      setPayments(String(head.payments));
    }
  }, [head]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !head) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await submitAccountEdit(head.code, {
        head: title,
        opening: parseFloat(opening) || 0,
        reappr: parseFloat(reappr) || 0,
        receipts: parseFloat(receipts) || 0,
        payments: parseFloat(payments) || 0,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden font-sans">
        {/* Header */}
        <div className="py-3.5 px-6 bg-[#020617] text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Edit Parameters: {head.code}
              </h3>
              <p className="text-[11px] text-slate-500">Recalculate allocations and record instant audit log</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-xl flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Account Head Description:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Opening Budget (PKR):</label>
              <input
                type="number"
                step="any"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Reappropriations (PKR):</label>
              <input
                type="number"
                step="any"
                value={reappr}
                onChange={(e) => setReappr(e.target.value)}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Receipts (PKR):</label>
              <input
                type="number"
                step="any"
                value={receipts}
                onChange={(e) => setReceipts(e.target.value)}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Payments (PKR):</label>
              <input
                type="number"
                step="any"
                value={payments}
                onChange={(e) => setPayments(e.target.value)}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl border border-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save & Trigger Audit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
