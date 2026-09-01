import React, { useState } from 'react';
import { AccountHead } from '../types';
import { formatPKR, formatPercent } from '../lib/formatters';
import { simulateReappr, executeReappr } from '../lib/apiEngine';
import { X, ArrowLeftRight, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ReapprSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountHead[];
  onSuccess: () => void;
}

export const ReapprSimulatorModal: React.FC<ReapprSimulatorModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}) => {
  const [fromHeadCode, setFromHeadCode] = useState(accounts[0]?.code || '');
  const [toHeadCode, setToHeadCode] = useState(accounts[1]?.code || '');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('Operational budget rebalancing to support vocational lab utilities');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleSimulate = async () => {
    const num = parseFloat(amount);
    if (!fromHeadCode || !toHeadCode || isNaN(num) || num <= 0) {
      setError('Please provide source, target, and positive transfer amount.');
      return;
    }
    if (fromHeadCode === toHeadCode) {
      setError('Source and Destination account heads must be distinct.');
      return;
    }

    setIsSimulating(true);
    setError(null);

    try {
      const data = await simulateReappr(fromHeadCode, toHeadCode, num);
      setSimulationResult(data);
    } catch (err: any) {
      setError(err.message);
      setSimulationResult(null);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExecute = async () => {
    const num = parseFloat(amount);
    if (!fromHeadCode || !toHeadCode || isNaN(num) || num <= 0) return;

    setIsExecuting(true);
    setError(null);

    try {
      await executeReappr(fromHeadCode, toHeadCode, num, reason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden font-sans">
        {/* Header */}
        <div className="py-3.5 px-6 bg-[#020617] text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Budget Reappropriation & Inter-Head Simulator
              </h3>
              <p className="text-[11px] text-slate-500">Autonomous solvency verification and ledger transfers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-xl flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-slate-400">
            Simulate moving surplus budget from low-burn heads into high-demand heads. The system validates solvency before committing ledger entries.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From Head */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Source Account Head (Debited -):</label>
              <select
                value={fromHeadCode}
                onChange={(e) => {
                  setFromHeadCode(e.target.value);
                  setSimulationResult(null);
                }}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} — {acc.head.substring(0, 30)} (Avail: {formatPKR(acc.balance, false)})
                  </option>
                ))}
              </select>
            </div>

            {/* To Head */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">Target Account Head (Credited +):</label>
              <select
                value={toHeadCode}
                onChange={(e) => {
                  setToHeadCode(e.target.value);
                  setSimulationResult(null);
                }}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} — {acc.head.substring(0, 30)} (Avail: {formatPKR(acc.balance, false)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Transfer Amount (PKR):</label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 250000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setSimulationResult(null);
                }}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Administrative Reason:</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Simulate button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSimulate}
              disabled={isSimulating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <span>{isSimulating ? 'Simulating...' : '⚡ Test Solvency & Project Impact'}</span>
            </button>
          </div>

          {/* Simulation Output Card */}
          {simulationResult && (
            <div className="p-4 bg-[#020617] rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Simulation Verified: Solvency Preserved</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                {/* Source Head Result */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <p className="font-bold text-rose-400">{simulationResult.from.code} (Debited)</p>
                  <p className="text-slate-400">Balance: {formatPKR(simulationResult.from.currentBalance)} → <span className="text-rose-300 font-bold">{formatPKR(simulationResult.from.projectedBalance)}</span></p>
                  <p className="text-slate-400">Burn Rate: {formatPercent(simulationResult.from.currentBurnRate)} → {formatPercent(simulationResult.from.projectedBurnRate)}</p>
                </div>

                {/* Target Head Result */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <p className="font-bold text-emerald-400">{simulationResult.to.code} (Credited)</p>
                  <p className="text-slate-400">Balance: {formatPKR(simulationResult.to.currentBalance)} → <span className="text-emerald-300 font-bold">{formatPKR(simulationResult.to.projectedBalance)}</span></p>
                  <p className="text-slate-400">Burn Rate: {formatPercent(simulationResult.to.currentBurnRate)} → {formatPercent(simulationResult.to.projectedBurnRate)}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isExecuting ? 'Executing Transfer...' : 'Commit & Execute Reappropriation'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
