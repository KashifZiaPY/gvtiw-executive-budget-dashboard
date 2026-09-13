import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  X,
  Filter,
  Check,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  Coins,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import {
  ReconciliationCandidate,
  MatchedCombination,
  AiAuditResult,
  extractReconciliationCandidates,
  findReconciliationMatches,
  fetchAiReconciliationAudit,
} from '../lib/reconciliationMatcher';
import { MasterVoucher, CashBookAccountState, BankAccountKey } from '../data/cashBookData';
import { ManualUnpresentedCheque } from './DirectorReconReport';

interface AiReconciliationDifferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankName: string;
  accountNo: string;
  bankStatementBalance: number;
  cashBookBalance: number;
  differenceAmount: number;
  unexplainedVariance: number;
  periodFromIso: string;
  periodToIso: string;
  selectedAccountKey: BankAccountKey;
  liveVouchers: MasterVoucher[];
  cashBookState?: CashBookAccountState;
  existingManualCheques: ManualUnpresentedCheque[];
  onApplyCheques: (cheques: ManualUnpresentedCheque[], mode: 'APPEND' | 'REPLACE') => void;
  formatAmount: (val: number, decimals?: number) => string;
}

export const AiReconciliationDifferenceModal: React.FC<AiReconciliationDifferenceModalProps> = ({
  isOpen,
  onClose,
  bankName,
  accountNo,
  bankStatementBalance,
  cashBookBalance,
  differenceAmount,
  unexplainedVariance,
  periodFromIso,
  periodToIso,
  selectedAccountKey,
  liveVouchers,
  cashBookState,
  existingManualCheques,
  onApplyCheques,
  formatAmount,
}) => {
  // Primary target to match: if existing cheques explain part of it, allow targeting unexplained variance or full difference
  const [targetType, setTargetType] = useState<'UNEXPLAINED' | 'FULL'>(
    unexplainedVariance > 0 && Math.abs(unexplainedVariance - Math.abs(differenceAmount)) > 1
      ? 'UNEXPLAINED'
      : 'FULL'
  );

  const targetAmount = useMemo(() => {
    if (targetType === 'UNEXPLAINED' && unexplainedVariance > 0) {
      return unexplainedVariance;
    }
    return Math.abs(differenceAmount);
  }, [targetType, unexplainedVariance, differenceAmount]);

  // Horizon scope: Active Period vs Extended 6 Months Lookback
  const [scope, setScope] = useState<'ACTIVE_PERIOD' | 'EXTENDED_6_MONTHS'>('ACTIVE_PERIOD');

  // Direction: Auto-detect from difference sign
  // If bankStatementBalance > cashBookBalance -> difference > 0 -> Payments (cheques issued not yet cleared)
  // If bankStatementBalance < cashBookBalance -> difference < 0 -> Receipts (uncredited collections)
  const defaultDirection = differenceAmount >= 0 ? 'PAYMENTS' : 'RECEIPTS';
  const [direction, setDirection] = useState<'PAYMENTS' | 'RECEIPTS' | 'ALL'>(defaultDirection);

  // Near match tolerance in Rs.
  const [tolerance, setTolerance] = useState<number>(500);

  // State for candidate extraction and matches
  const [candidates, setCandidates] = useState<ReconciliationCandidate[]>([]);
  const [matchedCombinations, setMatchedCombinations] = useState<MatchedCombination[]>([]);
  const [selectedCombinationIndex, setSelectedCombinationIndex] = useState<number>(0);

  // Custom individual row selection in the candidates view
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  // AI Audit State
  const [aiAudit, setAiAudit] = useState<AiAuditResult | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'ALL_CANDIDATES' | 'AI_INSIGHTS'>('MATCHES');

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Run combinatorial match when parameters change
  useEffect(() => {
    if (!isOpen) return;

    // 1. Extract candidate entries
    const extracted = extractReconciliationCandidates({
      liveVouchers,
      cashBookState,
      selectedAccountKey,
      periodFromIso,
      periodToIso,
      scope,
      direction,
      existingManualCheques,
    });
    setCandidates(extracted);

    // 2. Run Subset-Sum Combinatorial Search
    const matches = findReconciliationMatches(extracted, targetAmount, tolerance, 12);
    setMatchedCombinations(matches);
    setSelectedCombinationIndex(0);

    // Pre-select items from the best match if available
    if (matches.length > 0) {
      setSelectedCandidateIds(new Set(matches[0].items.map((i) => i.id)));
    } else {
      setSelectedCandidateIds(new Set());
    }

    // 3. Trigger Gemini AI Audit Analysis
    if (matches.length > 0 && targetAmount > 0) {
      setIsLoadingAi(true);
      const totalAmountChecked = extracted.reduce((a, b) => a + b.amount, 0);

      fetchAiReconciliationAudit({
        bankName,
        accountNo,
        differenceAmount: targetAmount,
        cashBookBalance,
        bankStatementBalance,
        periodFrom: periodFromIso,
        periodTo: periodToIso,
        matchedCombinations: matches,
        allCandidatesSummary: {
          totalCandidatesChecked: extracted.length,
          totalAmountChecked,
          scope,
        },
      })
        .then((audit) => {
          setAiAudit(audit);
          if (
            audit &&
            audit.recommendedOptionIndex >= 0 &&
            audit.recommendedOptionIndex < matches.length
          ) {
            setSelectedCombinationIndex(audit.recommendedOptionIndex);
            setSelectedCandidateIds(
              new Set(matches[audit.recommendedOptionIndex].items.map((i) => i.id))
            );
          }
        })
        .finally(() => {
          setIsLoadingAi(false);
        });
    } else {
      setAiAudit(null);
      setIsLoadingAi(false);
    }
  }, [
    isOpen,
    targetAmount,
    scope,
    direction,
    tolerance,
    selectedAccountKey,
    periodFromIso,
    periodToIso,
    liveVouchers,
    cashBookState,
  ]);

  if (!isOpen) return null;

  // Currently viewed combination
  const currentCombination =
    matchedCombinations.length > 0 && selectedCombinationIndex < matchedCombinations.length
      ? matchedCombinations[selectedCombinationIndex]
      : null;

  // Selected candidate objects
  const selectedCandidatesList = candidates.filter((c) => selectedCandidateIds.has(c.id));
  const selectedTotalAmount = selectedCandidatesList.reduce((acc, curr) => acc + curr.amount, 0);
  const selectedVariance = Math.abs(selectedTotalAmount - targetAmount);

  // Handle Apply to Reconciliation
  const handleApplyToReconciliation = (mode: 'APPEND' | 'REPLACE') => {
    if (selectedCandidatesList.length === 0) {
      alert('Please select at least one cheque / entry to apply.');
      return;
    }

    const convertedCheques: ManualUnpresentedCheque[] = selectedCandidatesList.map((item, idx) => ({
      id: `AI-${Date.now()}-${idx}`,
      chequeNo: item.chequeNo !== '—' ? item.chequeNo : '',
      date: item.date,
      paidTo: item.paidTo,
      accountHead: item.accountHead,
      amount: item.amount,
      description: item.description,
    }));

    onApplyCheques(convertedCheques, mode);
    setToastMessage(`Successfully imported ${convertedCheques.length} item(s) to unpresented list!`);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-linear-to-r from-[#0b2545] to-[#133c55] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide flex items-center gap-2">
                <span>AI Reconciliation Difference Analyzer</span>
                <span className="text-[10px] bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 px-2 py-0.5 rounded-full font-bold uppercase">
                  Combinatorial Math + Gemini
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {bankName} • Account: <span className="font-mono font-bold text-white">{accountNo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close Analyzer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Context & Variance Banner */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
                Cash Book Balance
              </span>
              <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                Rs. {formatAmount(cashBookBalance, 2)}
              </span>
            </div>
            <div className="text-slate-400 font-mono">vs</div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
                Bank Statement Balance
              </span>
              <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                Rs. {formatAmount(bankStatementBalance, 2)}
              </span>
            </div>
            <div className="h-7 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
                Target Difference to Reconcile
              </span>
              <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                Rs. {formatAmount(targetAmount, 2)}
              </span>
            </div>
          </div>

          {/* Quick Target Switcher if unpresented cheques already entered */}
          {existingManualCheques.length > 0 && unexplainedVariance > 0 && (
            <div className="flex items-center gap-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setTargetType('UNEXPLAINED')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  targetType === 'UNEXPLAINED'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Remaining Variance (Rs. {formatAmount(unexplainedVariance, 2)})
              </button>
              <button
                onClick={() => setTargetType('FULL')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  targetType === 'FULL'
                    ? 'bg-[#0b2545] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Full Difference (Rs. {formatAmount(Math.abs(differenceAmount), 2)})
              </button>
            </div>
          )}
        </div>

        {/* Intelligent Controls & Horizons Bar */}
        <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Horizon Selection */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-600" />
              <span>Search Horizon:</span>
            </span>
            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-950">
              <button
                onClick={() => setScope('ACTIVE_PERIOD')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                  scope === 'ACTIVE_PERIOD'
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Only transactions within the selected reconciliation period"
              >
                Active Period ({periodFromIso} to {periodToIso})
              </button>
              <button
                onClick={() => setScope('EXTENDED_6_MONTHS')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                  scope === 'EXTENDED_6_MONTHS'
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={`Looks backward up to 6 months prior to ${periodToIso} for unpresented/stale cheques. Strictly excludes any dates after ${periodToIso}.`}
              >
                Prior 6 Months Lookback (Up to {periodToIso})
              </button>
            </div>
          </div>

          {/* Direction & Tolerance */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Direction:</span>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as any)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="PAYMENTS">Payments / Cheques Issued (Unpresented)</option>
                <option value="RECEIPTS">Receipts / Deposits (Uncredited)</option>
                <option value="ALL">All Transactions</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Tolerance:</span>
              <select
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs text-slate-800 dark:text-slate-200"
              >
                <option value={0}>Exact Match Only (Rs. 0)</option>
                <option value={100}>Within ±Rs. 100</option>
                <option value={500}>Within ±Rs. 500 (Bank Charges)</option>
                <option value={2000}>Within ±Rs. 2,000</option>
                <option value={10000}>Within ±Rs. 10,000</option>
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('MATCHES')}
              className={`py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'MATCHES'
                  ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Matching Combinations ({matchedCombinations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('AI_INSIGHTS')}
              className={`py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'AI_INSIGHTS'
                  ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Gemini AI Audit Reasoning</span>
              {isLoadingAi && <RefreshCw className="w-3 h-3 animate-spin text-purple-500" />}
            </button>

            <button
              onClick={() => setActiveTab('ALL_CANDIDATES')}
              className={`py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'ALL_CANDIDATES'
                  ? 'border-slate-700 text-slate-800 dark:text-slate-200'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>All Scanned Candidates ({candidates.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Target: <span className="font-bold text-slate-800 dark:text-slate-200">Rs. {formatAmount(targetAmount, 2)}</span>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: MATCHING COMBINATIONS */}
          {activeTab === 'MATCHES' && (
            <div className="space-y-4">
              {matchedCombinations.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                  <Coins className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Direct Combinations Found Within Tolerance (±Rs. {tolerance})
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Try switching to the <strong>Last 6 Months (Extended Horizon)</strong>, widening the tolerance threshold, or review the <strong>All Scanned Candidates</strong> tab to manually select cheques.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => setScope('EXTENDED_6_MONTHS')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-700 text-white text-xs font-bold hover:bg-cyan-600 transition-colors"
                    >
                      Search Extended 6-Month Horizon
                    </button>
                    <button
                      onClick={() => setTolerance(2000)}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300"
                    >
                      Increase Tolerance to ±Rs. 2,000
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left Column: Combination Selector Cards */}
                  <div className="md:col-span-1 space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      Identified Combinations ({matchedCombinations.length})
                    </div>
                    {matchedCombinations.map((comb, index) => {
                      const isSelected = selectedCombinationIndex === index;
                      const isExact = comb.type === 'EXACT';
                      const isAiRecommended = aiAudit?.recommendedOptionIndex === index;

                      return (
                        <div
                          key={comb.id}
                          onClick={() => {
                            setSelectedCombinationIndex(index);
                            setSelectedCandidateIds(new Set(comb.items.map((i) => i.id)));
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-cyan-600 dark:border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <span>Option #{index + 1}</span>
                              {isExact ? (
                                <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-300">
                                  Exact (100%)
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-300">
                                  ± Rs. {comb.delta.toFixed(2)}
                                </span>
                              )}
                            </span>
                            {isAiRecommended && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-300">
                                <Sparkles className="w-2.5 h-2.5" /> AI Pick
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono mt-1">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Rs. {formatAmount(comb.totalAmount, 2)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {comb.items.length} item{comb.items.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-500 mt-1 truncate">
                            {comb.items.map((it) => it.chequeNo !== '—' ? `#${it.chequeNo}` : it.paidTo).join(' + ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Full Details of the Selected Combination */}
                  <div className="md:col-span-2 space-y-3">
                    {currentCombination && (
                      <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>Combination #{selectedCombinationIndex + 1} Breakdown</span>
                              {currentCombination.type === 'EXACT' ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Exact Match (Diff: Rs. 0.00)
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                                  Near Match (Variance: Rs. {currentCombination.delta.toFixed(2)})
                                </span>
                              )}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Total of these {currentCombination.items.length} cheques equals Rs.{' '}
                              <strong className="font-mono text-slate-800 dark:text-slate-200">
                                {formatAmount(currentCombination.totalAmount, 2)}
                              </strong>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block uppercase">Difference to Target</span>
                            <span
                              className={`font-mono font-bold text-xs ${
                                currentCombination.delta < 0.05
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {currentCombination.delta < 0.05
                                ? 'Rs. 0.00 (Balanced)'
                                : `Rs. ${currentCombination.delta.toFixed(2)}`}
                            </span>
                          </div>
                        </div>

                        {/* Unpresented / Uncleared Table for this match */}
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#0b2545] text-white text-[10px] uppercase font-bold text-left">
                                <th className="p-2 text-center w-8">
                                  <Check className="w-3 h-3 text-cyan-300 mx-auto" />
                                </th>
                                <th className="p-2 w-24">Cheque No</th>
                                <th className="p-2 w-28">Date</th>
                                <th className="p-2 min-w-[130px]">Paid To / By</th>
                                <th className="p-2 min-w-[140px]">Account Head</th>
                                <th className="p-2 text-right w-24">Amount (Rs.)</th>
                                <th className="p-2 min-w-[140px]">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentCombination.items.map((item) => {
                                const isChecked = selectedCandidateIds.has(item.id);
                                return (
                                  <tr
                                    key={item.id}
                                    onClick={() => toggleCandidateSelection(item.id)}
                                    className={`border-b border-slate-200 dark:border-slate-800 cursor-pointer transition-colors ${
                                      isChecked
                                        ? 'bg-cyan-50/60 dark:bg-cyan-950/20'
                                        : 'bg-white dark:bg-slate-900 opacity-60'
                                    }`}
                                  >
                                    <td className="p-2 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleCandidateSelection(item.id)}
                                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {item.chequeNo}
                                    </td>
                                    <td className="p-2 font-mono text-slate-600 dark:text-slate-400">
                                      {item.date}
                                    </td>
                                    <td className="p-2 font-medium text-slate-900 dark:text-slate-100">
                                      {item.paidTo}
                                    </td>
                                    <td className="p-2 text-[11px] text-slate-600 dark:text-slate-400">
                                      {item.accountHead}
                                    </td>
                                    <td className="p-2 font-mono font-bold text-right text-slate-900 dark:text-slate-100">
                                      {formatAmount(item.amount, 2)}
                                    </td>
                                    <td className="p-2 text-[11px] text-slate-500">
                                      {item.description}
                                      {item.isStaleRisk && (
                                        <span className="ml-1.5 text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold">
                                          Prior Month
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-xs border-t border-slate-300 dark:border-slate-700">
                                <td colSpan={5} className="p-2 text-right uppercase text-slate-600 dark:text-slate-300">
                                  Total Selected Amount:
                                </td>
                                <td className="p-2 text-right font-mono font-black text-cyan-700 dark:text-cyan-300">
                                  Rs. {formatAmount(selectedTotalAmount, 2)}
                                </td>
                                <td className="p-2 text-[11px] font-mono text-slate-500">
                                  Residual Delta: Rs. {formatAmount(selectedVariance, 2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* AI Audit Comment for this combination */}
                        {aiAudit && aiAudit.combinationNotes && aiAudit.combinationNotes[selectedCombinationIndex] && (
                          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">AI Audit Reasoning: </span>
                              <span>{aiAudit.combinationNotes[selectedCombinationIndex]}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GEMINI AI AUDIT REASONING */}
          {activeTab === 'AI_INSIGHTS' && (
            <div className="space-y-4">
              {isLoadingAi ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Gemini AI is analyzing financial ledgers & banking clearing patterns...
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Evaluating transaction dates, withholding tax pairings, and clearing cycles.
                  </p>
                </div>
              ) : aiAudit ? (
                <div className="space-y-4">
                  {/* Executive Finding */}
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-black text-xs uppercase tracking-wide">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Executive Audit Assessment</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {aiAudit.primaryAssessment}
                    </p>
                  </div>

                  {/* Potential Bank Charges / Rounding */}
                  {aiAudit.potentialBankCharges && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900 dark:text-amber-200">
                          Bank Charges & Rounding Notice:{' '}
                        </span>
                        <span className="text-amber-800 dark:text-amber-300">
                          {aiAudit.potentialBankCharges}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Recommendations */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                      Auditor Recommended Actions:
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      {aiAudit.actionRecommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  AI Audit insights are not available for this combination. Check the Matches tab.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALL SCANNED CANDIDATES (FULL BROWSE & CUSTOM SELECT) */}
          {activeTab === 'ALL_CANDIDATES' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Browsing all {candidates.length} candidate transactions from Cash Book & Vouchers. Select any items to sum and apply.
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  Selected Sum: Rs. {formatAmount(selectedTotalAmount, 2)} / Target: Rs.{' '}
                  {formatAmount(targetAmount, 2)}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[420px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#0b2545] text-white text-[10px] uppercase font-bold text-left">
                    <tr>
                      <th className="p-2 text-center w-8">
                        <Check className="w-3 h-3 mx-auto" />
                      </th>
                      <th className="p-2 w-24">Cheque No</th>
                      <th className="p-2 w-28">Date</th>
                      <th className="p-2 min-w-[130px]">Paid To / By</th>
                      <th className="p-2 min-w-[140px]">Account Head</th>
                      <th className="p-2 text-right w-24">Amount (Rs.)</th>
                      <th className="p-2 min-w-[130px]">Category</th>
                      <th className="p-2 min-w-[140px]">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => {
                      const isChecked = selectedCandidateIds.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => toggleCandidateSelection(c.id)}
                          className={`border-b border-slate-200 dark:border-slate-800 cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-cyan-50 dark:bg-cyan-950/30'
                              : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCandidateSelection(c.id)}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {c.chequeNo}
                          </td>
                          <td className="p-2 font-mono text-slate-600 dark:text-slate-400">
                            {c.date}
                          </td>
                          <td className="p-2 font-medium text-slate-900 dark:text-slate-100">
                            {c.paidTo}
                          </td>
                          <td className="p-2 text-[11px] text-slate-600 dark:text-slate-400">
                            {c.accountHead}
                          </td>
                          <td className="p-2 font-mono font-bold text-right text-slate-900 dark:text-slate-100">
                            {formatAmount(c.amount, 2)}
                          </td>
                          <td className="p-2 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {c.sourceLabel}
                            </span>
                          </td>
                          <td className="p-2 text-[11px] text-slate-500">
                            {c.description}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Selected: <strong>{selectedCandidatesList.length} item(s)</strong> totaling{' '}
              <strong className="font-mono text-slate-900 dark:text-white">
                Rs. {formatAmount(selectedTotalAmount, 2)}
              </strong>
            </span>
            <span
              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                selectedVariance < 0.05
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {selectedVariance < 0.05
                ? '✓ Reconciles 100% of Target'
                : `Variance: Rs. ${formatAmount(selectedVariance, 2)}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {existingManualCheques.length > 0 && (
              <button
                onClick={() => handleApplyToReconciliation('REPLACE')}
                disabled={selectedCandidatesList.length === 0}
                className="px-3.5 py-1.5 rounded-lg border border-cyan-600 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                title="Replace existing unpresented cheques with this verified set"
              >
                Replace Unpresented List
              </button>
            )}

            <button
              onClick={() => handleApplyToReconciliation('APPEND')}
              disabled={selectedCandidatesList.length === 0}
              className="px-4 py-1.5 rounded-lg bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Selected to Unpresented Table</span>
            </button>
          </div>
        </div>

        {/* Floating Toast Message */}
        {toastMessage && (
          <div className="absolute top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg text-xs font-bold animate-in fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
};
