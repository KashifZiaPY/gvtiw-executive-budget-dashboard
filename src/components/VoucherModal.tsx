import React, { useState, useEffect } from 'react';
import { AccountHead, VoucherTransaction } from '../types';
import { formatPKR, formatPercent } from '../lib/formatters';
import { submitVoucher } from '../lib/apiEngine';
import { X, CheckCircle, AlertTriangle, Receipt, ArrowRight } from 'lucide-react';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountHead[];
  preselectedHead?: AccountHead | null;
  onSuccess: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  accounts,
  preselectedHead,
  onSuccess,
}) => {
  const [headCode, setHeadCode] = useState(preselectedHead?.code || (accounts[0]?.code || ''));
  const [type, setType] = useState<'Payment' | 'Receipt' | 'Reappropriation' | 'Adjustment'>('Payment');
  const [amount, setAmount] = useState<string>('');
  const [payeeOrSource, setPayeeOrSource] = useState('');
  const [description, setDescription] = useState('');
  const [operator, setOperator] = useState('Accounts Officer (MKZ)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedHead) {
      setHeadCode(preselectedHead.code);
    } else if (accounts.length > 0 && !headCode) {
      setHeadCode(accounts[0].code);
    }
  }, [preselectedHead, accounts]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentAcc = accounts.find((a) => a.code === headCode);
  const numAmount = parseFloat(amount) || 0;

  // Calculate projected new balance
  let projectedBalance = currentAcc ? currentAcc.balance : 0;
  let projectedBurnRate = currentAcc ? currentAcc.burnRate : 0;

  if (currentAcc && numAmount > 0) {
    if (type === 'Payment') {
      const newPayments = currentAcc.payments + numAmount;
      projectedBalance = currentAcc.opening + currentAcc.reappr + currentAcc.receipts - newPayments;
      const tot = currentAcc.opening + currentAcc.reappr + currentAcc.receipts;
      projectedBurnRate = tot > 0 ? newPayments / tot : 0;
    } else if (type === 'Receipt') {
      const newReceipts = currentAcc.receipts + numAmount;
      projectedBalance = currentAcc.opening + currentAcc.reappr + newReceipts - currentAcc.payments;
      const tot = currentAcc.opening + currentAcc.reappr + newReceipts;
      projectedBurnRate = tot > 0 ? currentAcc.payments / tot : 0;
    } else if (type === 'Reappropriation') {
      const newReappr = currentAcc.reappr + numAmount;
      projectedBalance = currentAcc.opening + newReappr + currentAcc.receipts - currentAcc.payments;
      const tot = currentAcc.opening + newReappr + currentAcc.receipts;
      projectedBurnRate = tot > 0 ? currentAcc.payments / tot : 0;
    } else if (type === 'Adjustment') {
      const newOpening = currentAcc.opening + numAmount;
      projectedBalance = newOpening + currentAcc.reappr + currentAcc.receipts - currentAcc.payments;
      const tot = newOpening + currentAcc.reappr + currentAcc.receipts;
      projectedBurnRate = tot > 0 ? currentAcc.payments / tot : 0;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headCode || numAmount <= 0) {
      setError('Please provide a valid account head and positive amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitVoucher({
        headCode,
        type,
        amount: numAmount,
        payeeOrSource: payeeOrSource || (type === 'Payment' ? 'Beneficiary / Direct Payee' : 'Treasury / Counter Deposit'),
        description: description || `${type} recorded under ${headCode}`,
        operator,
      });

      setAmount('');
      setDescription('');
      setPayeeOrSource('');
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
      <div className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="py-3.5 px-6 bg-[#020617] text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Record Financial Transaction Voucher
              </h3>
              <p className="text-[11px] text-slate-500">Instantly update ledger & activate Scenario A Spotlight</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-xl flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Head Picker */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Select Target Account Head:
            </label>
            <select
              value={headCode}
              onChange={(e) => setHeadCode(e.target.value)}
              className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.code} value={acc.code}>
                  {acc.code} — {acc.head} (Avail: {formatPKR(acc.balance, false)})
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Buttons */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Transaction Type:</label>
            <div className="grid grid-cols-4 gap-2">
              {(['Payment', 'Receipt', 'Reappropriation', 'Adjustment'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-2 rounded-xl font-semibold text-center border transition-all text-xs ${
                    type === t
                      ? t === 'Payment'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                        : t === 'Receipt'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                        : 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Payee / Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Amount (PKR):</label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {type === 'Payment' ? 'Payee / Vendor / Party:' : 'Source / Depository:'}
              </label>
              <input
                type="text"
                placeholder={type === 'Payment' ? 'e.g. FESCO / Vendor Name' : 'e.g. TEVTA / Bank Counter'}
                value={payeeOrSource}
                onChange={(e) => setPayeeOrSource(e.target.value)}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Voucher Description / Purpose:</label>
            <input
              type="text"
              placeholder="e.g. Purchase of lab raw material for autumn semester"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          {/* Officer Operator */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Authorizing Officer / Clerk:</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-mono"
            />
          </div>

          {/* Real-time Calculation Preview */}
          {currentAcc && numAmount > 0 && (
            <div className="p-3.5 bg-[#020617] rounded-xl border border-slate-800 space-y-2 font-mono">
              <div className="text-[11px] text-amber-300 font-bold uppercase flex items-center gap-1 font-sans">
                <span>Instant Financial Delta Impact (Scenario A Spotlight)</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 text-xs">
                <span>Current Balance:</span>
                <span>{formatPKR(currentAcc.balance)}</span>
              </div>
              <div className="flex items-center justify-between text-white font-bold text-xs">
                <span>Projected New Balance:</span>
                <span className="text-amber-300">{formatPKR(projectedBalance)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Projected Burn Rate:</span>
                <span>{formatPercent(projectedBurnRate)}</span>
              </div>
            </div>
          )}

          {/* Submit Actions */}
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
              <span>{isSubmitting ? 'Registering...' : 'Register Voucher & Activate Spotlight'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
