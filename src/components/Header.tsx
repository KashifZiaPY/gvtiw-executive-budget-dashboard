import React from 'react';
import {
  RefreshCw,
  Moon,
  Sun,
  Download,
  Printer,
  ShieldCheck,
  Clock,
  Radio,
} from 'lucide-react';
import { DashboardResponse } from '../types';
import { format12HourDate } from '../lib/formatters';
import { InstituteEmblem, TevtaEmblem } from './Emblems';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../data/initialData';

interface HeaderProps {
  data: DashboardResponse;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  autoSyncInterval: number; // in seconds, 0 = paused
  setAutoSyncInterval: (val: number) => void;
  onPrintReport: () => void;
  onExportCSV: () => void;
  onOpenLogoModal?: () => void;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  activeModule?: string;
}

export const Header: React.FC<HeaderProps> = ({
  data,
  darkMode,
  setDarkMode,
  onRefresh,
  isRefreshing,
  autoSyncInterval,
  setAutoSyncInterval,
  onPrintReport,
  onExportCSV,
  onOpenLogoModal,
  customGvtiwLogo,
  customTevtaLogo,
  activeModule = 'DASHBOARD',
}) => {
  return (
    <header className="w-full transition-colors duration-200 border-b border-slate-800 bg-[#020617] text-white">
      {/* ------------------------------------------------------------- */}
      {/* ROW 1: INSTITUTIONAL CREST & MAIN TITLE BANNER                 */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full px-4 sm:px-8 py-3.5 bg-gradient-to-r from-[#0a192f] via-[#0F2537] to-[#0a192f] border-b border-slate-700/80 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left Institutional Emblem */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center rounded-xl bg-white p-1 border border-amber-500/30 shadow-md">
              <img
                src={customGvtiwLogo && customGvtiwLogo.startsWith('data:') ? customGvtiwLogo : DEFAULT_GVTIW_LOGO}
                alt="GVTIW Logo"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_GVTIW_LOGO;
                }}
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-[11px] font-medium text-slate-200">
                <span className="font-mono text-amber-400 font-bold">Institute Code: 33028</span>
              </span>
            </div>
          </div>

          {/* Center Main Institution Title */}
          <div className="text-center flex-1 px-2">
            <h1 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-extrabold tracking-wide text-white uppercase drop-shadow-sm font-sans">
              {data.instituteName}
            </h1>
            <p className="text-[11px] sm:text-xs text-blue-200/90 font-medium tracking-wide mt-0.5">
              Technical Education & Vocational Training Authority (TEVTA), Govt of Punjab
            </p>
          </div>

          {/* Right TEVTA Emblem */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <span className="text-[11px] font-medium text-slate-200">
                <span className="font-mono text-emerald-400 font-bold">Financial Year</span>, 2026-2027
              </span>
            </div>
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center rounded-xl bg-white p-1 border border-emerald-500/30 shadow-md">
              <img
                src={customTevtaLogo && customTevtaLogo.startsWith('data:') ? customTevtaLogo : DEFAULT_TEVTA_LOGO}
                alt="TEVTA Logo"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_TEVTA_LOGO;
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 2: EXECUTIVE DASHBOARD BLUE RIBBON                         */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full bg-[#1E3A8A] text-white py-2 px-4 shadow-inner border-b border-blue-900">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
          <h2 className="text-xs sm:text-sm md:text-base font-black tracking-widest uppercase text-white font-sans drop-shadow-xs">
            {data.reportTitle} — {data.financialYear}
          </h2>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 3: SYSTEM STATUS, TELEMETRY & CORPORATE CONTROLS          */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full bg-[#0B1329] border-b border-slate-800 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Left: System Status, Live Auto-Sync, Sync Now & Latest Activity */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 font-mono text-[11px] text-slate-300 justify-center md:justify-start">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 bg-emerald-950/80 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-bold">System Status: Connected & Live</span>
            </div>

            {/* Auto-Sync timestamp */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Auto-Synced:</span>
              <span className="text-white font-semibold">{format12HourDate(data.lastSyncedAt, true)}</span>
            </div>

            {/* Sync Now Button (Shifted to Left Side, Just After Auto-Synced) */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Instantly poll Google Sheet for real-time live data"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* Latest Activity (Scenario A Spotlight indicator) */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Latest Activity:</span>
              <span className="text-amber-200 font-bold">{format12HourDate(data.latestFinancialActivityTs, false)}</span>
            </div>
          </div>

          {/* Right: Quick Corporate Actions */}
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-end">
            {/* Developer Watermark */}
            <div className="hidden lg:flex items-center gap-1.5 text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-[11px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{data.developerWatermark}</span>
            </div>

            {/* Export CSV & Print Report (Contextual for Dashboard) */}
            {activeModule === 'DASHBOARD' && (
              <>
                <button
                  onClick={onExportCSV}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                  title="Download full head-wise statement as CSV"
                >
                  <Download className="w-3 h-3 text-blue-400" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={onPrintReport}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                  title="Open print-ready Executive Board report"
                >
                  <Printer className="w-3 h-3 text-slate-400" />
                  <span>Print Report</span>
                </button>
              </>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={`Switch to ${darkMode ? 'Light' : 'Dark'} Mode`}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
