import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CategorySummary, GrandTotalSummary, AccountHead } from '../types';
import { formatPKR, formatCompactPKR, formatPercent } from '../lib/formatters';
import { BarChart3, PieChart as PieIcon, TrendingUp, Activity, GitFork } from 'lucide-react';

interface AnalyticsChartsProps {
  categories: CategorySummary[];
  grandTotal: GrandTotalSummary;
  accounts: AccountHead[];
  darkMode: boolean;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  categories,
  grandTotal,
  accounts,
  darkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'allocation' | 'burnRate' | 'aaaFlow'>('cashflow');

  // 1. Data for Cashflow Comparison
  const cashflowData = categories.map((c) => ({
    name: c.shortName,
    Opening: c.opening,
    Receipts: c.receipts,
    Reappr: c.reappr,
    Payments: c.payments,
    Balance: c.balance,
    burnRate: c.burnRate,
  }));

  // 2. Data for Allocation Donut
  const nonAaaCategories = categories.filter((c) => c.category !== 'AAA');
  const allocationData = nonAaaCategories.map((c) => ({
    name: c.shortName,
    value: c.balance,
    color: c.themeColor.header,
    payments: c.payments,
    opening: c.opening,
  }));

  // 3. Ranked Head-wise Burn Rates (Top 10 most active heads)
  const rankedBurnHeads = [...accounts]
    .sort((a, b) => b.burnRate - a.burnRate)
    .slice(0, 10)
    .map((h) => ({
      code: h.code,
      name: h.head.length > 28 ? h.head.substring(0, 26) + '…' : h.head,
      burnRatePercent: +(h.burnRate * 100).toFixed(1),
      payments: h.payments,
      balance: h.balance,
      category: h.category,
    }));

  // Custom Chart Tooltips
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0F172A]/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans text-slate-100">
          <p className="font-bold text-amber-300 mb-1.5 border-b border-slate-800 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span style={{ color: entry.color }} className="font-medium">
                {entry.name}:
              </span>
              <span className="font-mono font-semibold">{formatPKR(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0F172A]/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs text-slate-100 font-sans">
          <p className="font-bold text-blue-400 mb-1">{data.name}</p>
          <div className="space-y-0.5 font-mono">
            <p className="text-slate-300">
              Available Balance: <span className="font-bold text-white">{formatPKR(data.value)}</span>
            </p>
            <p className="text-slate-400">
              Share of Operating Pool: <span className="text-amber-300">{((data.value / grandTotal.balance) * 100).toFixed(1)}%</span>
            </p>
            <p className="text-slate-400">
              Total Outflow: <span className="text-rose-400">{formatPKR(data.payments)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const gridColor = darkMode ? '#1E293B' : '#E2E8F0';
  const textColor = darkMode ? '#94A3B8' : '#475569';

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
        darkMode ? 'bg-[#0F172A] border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Chart Navigation Tabs */}
      <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
        darkMode ? 'bg-[#020617]/50 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              darkMode ? 'text-slate-200' : 'text-slate-800'
            }`}>
              Financial Analytics & Computational Models
            </span>
          </div>
        </div>

        <div className={`flex items-center flex-wrap gap-1 p-1 rounded-full border ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
              activeTab === 'cashflow'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Cashflow</span>
          </button>

          <button
            onClick={() => setActiveTab('allocation')}
            className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
              activeTab === 'allocation'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieIcon className="w-3 h-3" />
            <span>Pool Allocation</span>
          </button>

          <button
            onClick={() => setActiveTab('burnRate')}
            className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
              activeTab === 'burnRate'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Burn Velocity</span>
          </button>

          <button
            onClick={() => setActiveTab('aaaFlow')}
            className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
              activeTab === 'aaaFlow'
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-3 h-3 text-amber-300" />
            <span>AAA Reconciliation</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Body */}
      <div className="p-5 sm:p-6">
        {/* TAB 1: CASHFLOW BREAKDOWN */}
        {activeTab === 'cashflow' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 text-xs">
              <div>
                <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Comparative Category Cashflow & Net Available Balances
                </h3>
                <p className="text-slate-500 text-xs">
                  Side-by-side comparison of Opening Allocation vs Actual Payments vs Net Balance
                </p>
              </div>
              <div className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border self-start ${
                darkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                All values in PKR (Rs.)
              </div>
            </div>

            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={textColor}
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke={textColor}
                    fontSize={10}
                    tickFormatter={(val) => formatCompactPKR(val)}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                  <Bar dataKey="Opening" name="Opening Budget" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Receipts" name="Receipts" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Payments" name="Payments" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Balance" name="Net Balance" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 2: POOL ALLOCATION DONUT */}
        {activeTab === 'allocation' && (
          <div>
            <div className="mb-4 text-xs">
              <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Consolidated Operating Pool Share by Category (Excl. AAA Memo)
              </h3>
              <p className="text-slate-500">
                Proportion of Rs. {grandTotal.balance.toLocaleString()} total available liquidity
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={108}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={darkMode ? '#0F172A' : '#FFFFFF'} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="md:col-span-5 space-y-2 text-xs">
                {allocationData.map((item, idx) => {
                  const percent = ((item.value / grandTotal.balance) * 100).toFixed(1);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border font-sans transition-all ${
                        darkMode
                          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{item.name}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCompactPKR(item.value)}</span>
                        <span className="text-slate-400 text-[11px] ml-2">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BURN VELOCITY & ANOMALIES */}
        {activeTab === 'burnRate' && (
          <div>
            <div className="mb-4 text-xs">
              <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Head-Wise Burn Velocity & Expenditure Index (Top 10 Active Outflow Heads)
              </h3>
              <p className="text-slate-500">
                Identifies accounts consuming budget faster than quarterly benchmarks
              </p>
            </div>

            <div className="space-y-2.5">
              {rankedBurnHeads.map((head) => {
                const isHigh = head.burnRatePercent > 40;
                const isMedium = head.burnRatePercent >= 25 && head.burnRatePercent <= 40;
                const barColor = isHigh
                  ? 'bg-rose-500'
                  : isMedium
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

                return (
                  <div
                    key={head.code}
                    className={`p-3 rounded-xl border transition-colors ${
                      darkMode
                        ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 text-xs">
                          {head.code}
                        </span>
                        <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{head.name}</span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-800/60 rounded">
                          {head.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-slate-400">Paid: {formatPKR(head.payments, false)}</span>
                        <span className="text-slate-400">Rem: {formatPKR(head.balance, false)}</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            isHigh
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isMedium
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {head.burnRatePercent}% Burn
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className={`w-full rounded-full h-1.5 overflow-hidden ${
                      darkMode ? 'bg-slate-800' : 'bg-slate-200'
                    }`}>
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, head.burnRatePercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: AAA RECONCILIATION & MEMO FLOW */}
        {activeTab === 'aaaFlow' && (() => {
          const aaaCat = categories.find((c) => c.category === 'AAA') || {
            opening: 0,
            reappr: 0,
            receipts: 0,
            payments: 0,
            balance: 0,
            burnRate: 0,
          };
          const aaaHeads = accounts.filter((h) => h.category === 'AAA');

          return (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-[#020617]/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className="font-bold text-amber-500 text-sm mb-1.5 flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-amber-500" />
                  Assan Assignment Account (AAA) Reconciliation & Audit Transparency
                </h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Under Punjab Treasury & TEVTA Financial Regulations, <strong>Assan Assignment Account (AAA)</strong> represents an imprest/revolving financing account provided for operational expenditures.
                  To ensure <strong>100% financial integrity and prevent double-counting</strong> with other operational heads (like Non-Salary and Own Funds), the AAA balance is tracked as an official <strong>Pass-Through Memo Head</strong>.
                  It is maintained in full institutional records but strictly excluded from the Grand Operating Liquidity Pool ({formatPKR(grandTotal.balance)}).
                </p>
              </div>

              {/* Dynamic Real AAA Financial Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">1. Sanctioned Allocation (Opening)</span>
                  <p className="font-mono text-xl font-bold text-blue-500">
                    {formatPKR(aaaCat.opening, true)}
                  </p>
                  <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Total treasury credit sanctioned for institutional assignment account.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-2 ${
                  darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">2. Disbursed Payments (YTD Outflow)</span>
                  <p className="font-mono text-xl font-bold text-rose-500">
                    {formatPKR(aaaCat.payments, true)}
                  </p>
                  <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Total verified voucher disbursements settled from this head.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-2 ${
                  darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">3. Segregated Net Balance</span>
                  <p className="font-mono text-xl font-bold text-emerald-500">
                    {formatPKR(aaaCat.balance, true)}
                  </p>
                  <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Dedicated available reserve; zero double-count in Grand Total.
                  </p>
                </div>
              </div>

              {/* List of specific AAA sub-heads if present */}
              {aaaHeads.length > 0 && (
                <div className={`p-3.5 rounded-xl border ${
                  darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Synchronized AAA Account Heads ({aaaHeads.length})
                    </span>
                    <span className="text-[10px] font-mono text-amber-500">Status: Active & Reconciled</span>
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {aaaHeads.map((h) => (
                      <div key={h.code} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {h.code}
                          </span>
                          <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{h.head}</span>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-[11px]">
                          <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                            Opening: <strong className={darkMode ? 'text-slate-200' : 'text-slate-700'}>{formatPKR(h.opening)}</strong>
                          </span>
                          <span className="text-emerald-500 font-bold">
                            Net: {formatPKR(h.balance)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
