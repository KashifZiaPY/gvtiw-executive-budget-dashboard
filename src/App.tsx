/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardResponse, CategoryType } from './types';
import { exportToCSV } from './lib/formatters';
import { Header } from './components/Header';
import { CategoryDeck } from './components/CategoryDeck';
import { HeadWiseTable } from './components/HeadWiseTable';
import { PrintExecutiveReport } from './components/PrintExecutiveReport';
import { LogoUploaderModal } from './components/LogoUploaderModal';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from './data/initialData';
import { CashBookModule } from './components/CashBookModule';
import { VoucherModule } from './components/VoucherModule';
import { PaymentApprovalForm } from './components/PaymentApprovalForm';
import { ReportsModule } from './components/ReportsModule';
import { AdminHubModule } from './components/AdminHubModule';
import { INITIAL_MASTER_VOUCHERS } from './data/cashBookData';
import { Loader2, AlertTriangle, LayoutDashboard, BookOpen, Receipt, FileSpreadsheet, Lock } from 'lucide-react';
import { fetchDashboardPayload } from './lib/apiEngine';

export type ActiveModuleTab = 'DASHBOARD' | 'CASHBOOK' | 'VOUCHERS' | 'REPORTS' | 'ADMIN';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModuleTab>('DASHBOARD');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Logo State (Persisted in browser localStorage & Server Sync, with built-in official fallbacks)
  const [customGvtiwLogo, setCustomGvtiwLogo] = useState<string | null>(() => {
    const saved = localStorage.getItem('gvtiw_custom_logo');
    return saved && saved.startsWith('data:') ? saved : DEFAULT_GVTIW_LOGO;
  });
  const [customTevtaLogo, setCustomTevtaLogo] = useState<string | null>(() => {
    const saved = localStorage.getItem('tevta_custom_logo');
    return saved && saved.startsWith('data:') ? saved : DEFAULT_TEVTA_LOGO;
  });
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  const refreshLogos = () => {
    const localGv = localStorage.getItem('gvtiw_custom_logo');
    const localTv = localStorage.getItem('tevta_custom_logo');
    setCustomGvtiwLogo(localGv && localGv.startsWith('data:') ? localGv : DEFAULT_GVTIW_LOGO);
    setCustomTevtaLogo(localTv && localTv.startsWith('data:') ? localTv : DEFAULT_TEVTA_LOGO);

    fetch('/api/logos')
      .then((res) => res.json())
      .then((data) => {
        if (data?.gvtiwLogo && data.gvtiwLogo.startsWith('data:')) {
          setCustomGvtiwLogo(data.gvtiwLogo);
          localStorage.setItem('gvtiw_custom_logo', data.gvtiwLogo);
        }
        if (data?.tevtaLogo && data.tevtaLogo.startsWith('data:')) {
          setCustomTevtaLogo(data.tevtaLogo);
          localStorage.setItem('tevta_custom_logo', data.tevtaLogo);
        }
      })
      .catch(() => {});
  };

  // Sync server logos on mount
  useEffect(() => {
    fetch('/api/logos')
      .then((res) => res.json())
      .then((data) => {
        if (data?.gvtiwLogo && data.gvtiwLogo.startsWith('data:') && !localStorage.getItem('gvtiw_custom_logo')) {
          setCustomGvtiwLogo(data.gvtiwLogo);
          localStorage.setItem('gvtiw_custom_logo', data.gvtiwLogo);
        }
        if (data?.tevtaLogo && data.tevtaLogo.startsWith('data:') && !localStorage.getItem('tevta_custom_logo')) {
          setCustomTevtaLogo(data.tevtaLogo);
          localStorage.setItem('tevta_custom_logo', data.tevtaLogo);
        }
      })
      .catch(() => {});
  }, []);

  // Corporate Theme Mode (Default: Dark Mode for executive monitoring)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gvtiw_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  // Selected Category Filter
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');

  // Auto Sync Interval (in seconds, 20s default)
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(20);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Fetch Dashboard State from High-Performance Backend or Autonomous Engine
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const json = await fetchDashboardPayload();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
      setError(err.message || 'Error loading financial ledger');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('gvtiw_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Scheduled Auto-Sync Loop
  useEffect(() => {
    if (autoSyncInterval <= 0) return;

    const timer = setInterval(() => {
      fetchDashboardData(true);
    }, autoSyncInterval * 1000);

    return () => clearInterval(timer);
  }, [autoSyncInterval, fetchDashboardData]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!data) return;
    const csvRows = data.accounts.map((acc, index) => ({
      'Sr.#': index + 1,
      'Head Code': acc.code,
      'Account Head Description': acc.head,
      Category: acc.category,
      'Opening Budget (PKR)': acc.opening,
      'Reappropriation (PKR)': acc.reappr,
      'Receipts (PKR)': acc.receipts,
      'Payments (PKR)': acc.payments,
      'Net Balance (PKR)': acc.balance,
      'Burn Rate %': (acc.burnRate * 100).toFixed(1) + '%',
      'Last Activity': acc.lastActivity,
    }));
    exportToCSV(`GVTIW_Budget_Position_${new Date().toISOString().split('T')[0]}.csv`, csvRows);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-100 font-sans p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <h2 className="text-sm font-bold tracking-wider uppercase text-slate-300">
            Initializing Executive Financial Ledger...
          </h2>
          <p className="text-xs text-slate-500 font-mono">GVTIW Samanabad Faisalabad (Institute:33028)</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 text-center font-sans">
        <div className="p-6 bg-[#0F172A] border border-rose-600/40 rounded-2xl max-w-md space-y-3 shadow-2xl">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-rose-400">Connection Failed</h2>
          <p className="text-xs text-slate-300">{error}</p>
          <button
            onClick={() => fetchDashboardData(false)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            Retry Synchronization
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        darkMode ? 'bg-[#03091E] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >

      {/* ------------------------------------------------------------- */}
      {/* CORPORATE EXECUTIVE HEADER                                    */}
      {/* ------------------------------------------------------------- */}
      <Header
        data={data}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onRefresh={() => fetchDashboardData(false)}
        isRefreshing={isRefreshing}
        autoSyncInterval={autoSyncInterval}
        setAutoSyncInterval={setAutoSyncInterval}
        onPrintReport={() => setIsPrintModalOpen(true)}
        onExportCSV={handleExportCSV}
        onOpenLogoModal={() => setIsLogoModalOpen(true)}
        customGvtiwLogo={customGvtiwLogo}
        customTevtaLogo={customTevtaLogo}
        activeModule={activeModule}
      />

      {/* ------------------------------------------------------------- */}
      {/* MASTER ERP MODULE SWITCHER NAVIGATION BAR                     */}
      {/* ------------------------------------------------------------- */}
      <nav className={`border-b sticky top-0 z-30 backdrop-blur-md transition-colors ${
        darkMode ? 'bg-[#0F1D3B]/90 border-slate-700/80 shadow-lg' : 'bg-white/95 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-8 flex items-center justify-between gap-2 overflow-x-auto py-2 scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Tab 1: Executive Dashboard */}
            <button
              onClick={() => setActiveModule('DASHBOARD')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeModule === 'DASHBOARD'
                  ? darkMode
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-blue-600 text-white shadow-md'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-amber-300" />
              <span>Executive Budget Matrix</span>
            </button>

            {/* Tab 2: Digital CashBooks */}
            <button
              onClick={() => setActiveModule('CASHBOOK')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeModule === 'CASHBOOK'
                  ? darkMode
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-blue-600 text-white shadow-md'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              <span>Digital CashBooks (6 A/C)</span>
            </button>

            {/* Tab 3: Voucher Explorer */}
            <button
              onClick={() => setActiveModule('VOUCHERS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeModule === 'VOUCHERS'
                  ? darkMode
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-blue-600 text-white shadow-md'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4 text-amber-300" />
              <span>Voucher Matrix</span>
            </button>

            {/* Tab 4: Reports & Statements Hub */}
            <button
              onClick={() => setActiveModule('REPORTS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeModule === 'REPORTS'
                  ? darkMode
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-blue-600 text-white shadow-md'
                  : darkMode
                  ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>Reports & Statements</span>
            </button>

            {/* Tab 5: Admin Operations Hub (PIN Protected) */}
            <button
              onClick={() => setActiveModule('ADMIN')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeModule === 'ADMIN'
                  ? darkMode
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'bg-amber-600 text-white shadow-md'
                  : darkMode
                  ? 'text-amber-300/80 hover:bg-amber-500/20 hover:text-amber-300'
                  : 'text-amber-800 hover:bg-amber-50 hover:text-amber-900'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>Admin Operations (PIN)</span>
            </button>

          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Enterprise Suite v3.1 (v3.14 Live)</span>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* MAIN ACTIVE MODULE CANVAS                                      */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-8 py-5 space-y-6">
        {activeModule === 'DASHBOARD' && (
          <>
            {/* 1. Category Summary Deck / Quick Overview Tabs */}
            <section aria-label="Category Summary Deck">
              <CategoryDeck
                categories={data.categories}
                grandTotal={data.grandTotal}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                darkMode={darkMode}
              />
            </section>

            {/* 2. Detail Head-Wise Account Position Table & Consolidated Summary */}
            <section aria-label="Head-Wise Detail Matrix and Category Summary">
              <HeadWiseTable
                accounts={data.accounts}
                categories={data.categories}
                grandTotal={data.grandTotal}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                latestChangedCode={data.latestChangedCode}
                darkMode={darkMode}
              />
            </section>
          </>
        )}

        {activeModule === 'CASHBOOK' && (
          <section aria-label="Digital Multi-Account CashBook">
            <CashBookModule darkMode={darkMode} />
          </section>
        )}

        {activeModule === 'VOUCHERS' && (
          <section aria-label="Master Voucher Matrix">
            <VoucherModule darkMode={darkMode} />
          </section>
        )}

        {activeModule === 'REPORTS' && (
          <section aria-label="Reports & Statements Hub">
            <ReportsModule darkMode={darkMode} />
          </section>
        )}

        {activeModule === 'ADMIN' && (
          <section aria-label="Admin Operations Hub">
            <AdminHubModule darkMode={darkMode} />
          </section>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* CORPORATE FOOTER WITH VERSION & WATERMARK                      */}
      {/* ------------------------------------------------------------- */}
      <footer
        className={`mt-auto py-4 px-6 border-t text-center text-xs font-sans ${
          darkMode ? 'bg-[#020617] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            © 2026-27 {data.instituteName} — Financial Management & Analytics Suite
          </span>
          <span className="font-mono text-amber-400/90 text-[11px] bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800">
            {data.developerWatermark}
          </span>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* PRINT REPORT DIALOG                                           */}
      {/* ------------------------------------------------------------- */}
      <PrintExecutiveReport
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={data}
        customGvtiwLogo={customGvtiwLogo}
        customTevtaLogo={customTevtaLogo}
      />

      {/* ------------------------------------------------------------- */}
      {/* LOGO CUSTOMIZER & UPLOADER MODAL                              */}
      {/* ------------------------------------------------------------- */}
      <LogoUploaderModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        onLogosUpdated={refreshLogos}
      />
    </div>
  );
}
