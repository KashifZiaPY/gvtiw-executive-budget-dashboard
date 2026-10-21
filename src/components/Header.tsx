/**
 * Header — top banner of the Executive Budget Dashboard.
 *
 * PRESENTATION ONLY refactor: the TEVTA light green/white theme is pure
 * styling. Every prop, handler, conditional, timestamp formatter and the
 * auto-sync timer contract is unchanged from the previous version.
 */
import React from 'react';
import {
  RefreshCw,
  Moon,
  Sun,
  Lock,
  Download,
  Printer,
  ShieldCheck,
  Clock,
  Radio,
} from 'lucide-react';
import { DashboardResponse } from '../types';
import { format12HourDate } from '../lib/formatters';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../data/initialData';

interface HeaderProps {
  data: DashboardResponse;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onRefresh: () => void;
  onLock?: () => void;
  sessionRole?: 'admin' | 'guest' | null;
  isRefreshing: boolean;
  autoSyncInterval: number; // in seconds, 0 = paused
  setAutoSyncInterval: (val: number) => void;
  onPrintReport: () => void;
  onExportCSV: () => void;
  onOpenLogoModal?: () => void;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  activeModule?: string;
  syncStatus?: 'connected' | 'failed';
}

export const Header: React.FC<HeaderProps> = ({
  data,
  darkMode,
  setDarkMode,
  onRefresh,
  onLock,
  sessionRole,
  isRefreshing,
  autoSyncInterval,
  setAutoSyncInterval,
  onPrintReport,
  onExportCSV,
  onOpenLogoModal,
  customGvtiwLogo,
  customTevtaLogo,
  activeModule = 'DASHBOARD',
  syncStatus = 'connected',
}) => {
  return (
    <header id="app-header" className={`hdr-shell w-full ${darkMode ? 'hdr-dark' : ''}`}>
      {/* ------------------------------------------------------------- */}
      {/* ROW 1: INSTITUTIONAL CREST & MAIN TITLE BANNER                 */}
      {/* ------------------------------------------------------------- */}
      <div className="hdr-hero">
        <div className="hdr-accent" aria-hidden="true" />
        <div className="hdr-watermark" aria-hidden="true" />
        <div className="hdr-hero-inner">
          {/* Left Institutional Emblem */}
          <div className="hdr-side">
            <span className="hdr-logo-circle">
              <img
                src={customGvtiwLogo && customGvtiwLogo.startsWith('data:') ? customGvtiwLogo : DEFAULT_GVTIW_LOGO}
                alt="GVTIW Logo"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_GVTIW_LOGO;
                }}
              />
            </span>
            <span className="hdr-pill">
              Institute Code:&nbsp;<span className="font-mono">33028</span>
            </span>
          </div>

          {/* Center Main Institution Title */}
          <div className="hdr-center">
            <h1 className="font-display">{data.instituteName}</h1>
            <p>Technical Education &amp; Vocational Training Authority (TEVTA), Govt of Punjab</p>
          </div>

          {/* Right TEVTA Emblem */}
          <div className="hdr-side">
            <span className="hdr-pill">
              Financial Year,&nbsp;<span className="font-mono">2026-2027</span>
            </span>
            <span className="hdr-logo-rounded">
              <img
                src={customTevtaLogo && customTevtaLogo.startsWith('data:') ? customTevtaLogo : DEFAULT_TEVTA_LOGO}
                alt="TEVTA Logo"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_TEVTA_LOGO;
                }}
              />
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 2: EXECUTIVE DASHBOARD TITLE BAR                           */}
      {/* ------------------------------------------------------------- */}
      <div className="hdr-titlebar">
        <div className="hdr-titlebar-inner">
          <span className="hdr-dot" aria-hidden="true" />
          <h2 className="font-display">
            {data.reportTitle} — {data.financialYear}
          </h2>
          <span className="hdr-dot" aria-hidden="true" />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 3: SYSTEM STATUS, TELEMETRY & CORPORATE CONTROLS          */}
      {/* ------------------------------------------------------------- */}
      <div className="hdr-statusbar">
        <div className="hdr-status-inner">
          {/* Left: System Status, Live Auto-Sync, Sync Now & Latest Activity */}
          <div className="hdr-chips">
            {/* Live Indicator */}
            {syncStatus === 'failed' ? (
              <span className="hdr-chip hdr-failed">
                <span className="hdr-pulse-dot" aria-hidden="true" />
                <strong>Sync Failed</strong>
              </span>
            ) : (
              <span className="hdr-chip" id="chip-sync-status">
                <span className="hdr-pulse-dot" aria-hidden="true" />
                <strong>System Status: Connected &amp; Live</strong>
              </span>
            )}

            {/* Auto-Sync timestamp */}
            <span className="hdr-chip">
              <Clock />
              <span className="hdr-lbl">Auto-Synced:</span>
              <span className="font-mono">{format12HourDate(data.lastSyncedAt, true)}</span>
            </span>

            {/* Sync Now Button */}
            <button
              id="btn-sync-now"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="hdr-btn hdr-btn-solid"
              title="Instantly poll Google Sheet for real-time live data"
            >
              <RefreshCw className={isRefreshing ? 'hdr-spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* Latest Activity */}
            <span className="hdr-chip">
              <Radio />
              <span className="hdr-lbl">Latest Activity:</span>
              <span className="font-mono">{format12HourDate(data.latestFinancialActivityTs, false)}</span>
            </span>
          </div>

          {/* Right: Quick Corporate Actions */}
          <div className="hdr-chips">
            {/* Developer Watermark */}
            <span className="hdr-chip hdr-mkz">
              <ShieldCheck />
              <span>{data.developerWatermark}</span>
            </span>

            {/* Export Excel & Print Report (Contextual for Dashboard) */}
            {activeModule === 'DASHBOARD' && (
              <>
                <button
                  id="btn-export"
                  type="button"
                  onClick={onExportCSV}
                  className="hdr-btn hdr-btn-outline"
                  title="Download full 38-head budget position matrix as styled Excel (.xlsx)"
                >
                  <Download />
                  <span>Export Excel</span>
                </button>

                <button
                  id="btn-print"
                  type="button"
                  onClick={onPrintReport}
                  className="hdr-btn hdr-btn-solid"
                  title="Open print-ready Executive Board report"
                >
                  <Printer />
                  <span>Print Report</span>
                </button>
              </>
            )}

          </div>
        </div>

        {/* ROW 4: SESSION ROLE BADGE (centered) + SESSION CONTROLS */}
        <div className="hdr-badgerow">
          {sessionRole && (
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase border ${
                sessionRole === 'admin'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
              }`}
              title={sessionRole === 'admin' ? 'Signed in with the Master PIN' : 'View-only guest session — Voucher & Admin stay locked'}
            >
              {sessionRole === 'admin' ? 'Admin' : 'Guest · View Only'}
            </span>
          )}
          <div className="hdr-badgerow-actions">
            {/* Lock Session (front-door PIN gate) */}
            {onLock && (
              <button
                id="btn-lock-session"
                type="button"
                onClick={onLock}
                className="hdr-toggle"
                title="Lock — PIN required to re-enter"
              >
                <Lock />
              </button>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              id="btn-theme-toggle"
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="hdr-toggle"
              title={`Switch to ${darkMode ? 'Light' : 'Dark'} Mode`}
            >
              {darkMode ? <Sun /> : <Moon />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
