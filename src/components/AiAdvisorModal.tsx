import React, { useState, useEffect } from 'react';
import { AiInsightResponse } from '../types';
import { formatPercent } from '../lib/formatters';
import { fetchAiAnalysis } from '../lib/apiEngine';
import { X, Sparkles, AlertCircle, CheckCircle2, Info, AlertTriangle, RefreshCw } from 'lucide-react';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({ isOpen, onClose }) => {
  const [insights, setInsights] = useState<AiInsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAiAnalysis();
      setInsights(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !insights) {
      fetchInsights();
    }
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden font-sans max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="py-3.5 px-6 bg-[#020617] text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Executive AI Financial Advisor & Risk Engine
              </h3>
              <p className="text-[11px] text-slate-500">Continuous anomaly detection & institutional compliance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh AI analysis"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {loading && (
            <div className="py-12 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              <p className="text-slate-300 font-semibold">
                Synthesizing institutional head-wise ledgers & variance models...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-xl flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && insights && (
            <>
              {/* Executive Synopsis */}
              <div className="p-4 bg-[#020617] rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Executive Financial Synopsis
                </span>
                <p className="text-slate-200 leading-relaxed text-xs">{insights.overview}</p>
              </div>

              {/* Key Findings */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Audit Observations & Risk Vectors
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {insights.keyFindings.map((finding, idx) => {
                    const icon =
                      finding.type === 'critical' || finding.type === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : finding.type === 'positive' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-400 shrink-0" />
                      );

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1"
                      >
                        <div className="flex items-center gap-2 font-semibold text-white">
                          {icon}
                          <span className="truncate">{finding.title}</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {finding.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Burn Rate Anomalies */}
              {insights.burnRateAnomalies.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    High Velocity Burn Accounts
                  </span>
                  <div className="space-y-2">
                    {insights.burnRateAnomalies.map((item) => (
                      <div
                        key={item.headCode}
                        className="p-3 bg-[#020617] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-sans"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 text-xs">
                              {item.headCode}
                            </span>
                            <span className="font-semibold text-slate-200">{item.headTitle}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{item.suggestion}</p>
                        </div>
                        <div className="shrink-0 font-mono text-right">
                          <span className="text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 text-xs">
                            {formatPercent(item.burnRate)} Burn
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategic Recommendations */}
              <div className="p-4 bg-purple-950/20 rounded-xl border border-purple-800/30 space-y-2">
                <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
                  Comptroller Directives & Next Steps
                </span>
                <ul className="space-y-1.5 text-slate-200 list-disc list-inside">
                  {insights.recommendations.map((rec, i) => (
                    <li key={i} className="leading-relaxed">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
