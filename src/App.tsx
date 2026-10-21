/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardResponse, CategoryType } from './types';
import { exportToCSV } from './lib/formatters';
import { exportBudgetMatrixExcel } from './lib/excelExportEngine';
import { Header } from './components/Header';
import { CategoryDeck } from './components/CategoryDeck';
import { HeadWiseTable } from './components/HeadWiseTable';
import { PrintExecutiveReport } from './components/PrintExecutiveReport';
import { LogoUploaderModal } from './components/LogoUploaderModal';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO, DEFAULT_GOP_LOGO } from './data/initialData';
import { CashBookModule } from './components/CashBookModule';
import { VoucherModule } from './components/VoucherModule';
import { PaymentApprovalForm } from './components/PaymentApprovalForm';
import { ReportsModule } from './components/ReportsModule';
import type { ReportTab } from './components/ReportsModule';
import type { TfcSubTab } from './components/TfcChallanHub';
import { AppSidebar } from './components/AppSidebar';
import { AdminHubModule } from './components/AdminHubModule';
import { PinLockScreen } from './components/PinLockScreen';
import { AnimatedSplashLogos } from './components/AnimatedSplashLogos';
import { INITIAL_MASTER_VOUCHERS } from './data/cashBookData';
import { AlertTriangle } from 'lucide-react';
import { fetchDashboardPayload } from './lib/apiEngine';

export type ActiveModuleTab = 'DASHBOARD' | 'CASHBOOK' | 'VOUCHERS' | 'REPORTS' | 'ADMIN';

class ModuleErrorBoundary extends React.Component<
  { children: React.ReactNode; moduleName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; moduleName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.moduleName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-slate-900 border border-rose-500/50 text-white max-w-xl mx-auto my-12 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-rose-300">Module Alert ({this.props.moduleName})</h3>
          <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 break-words">
            {this.state.error?.message || 'An unexpected error occurred in this module.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Reset Session & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModuleTab>('DASHBOARD');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Report selection is owned here so the sidebar can drive it (ReportsModule runs in controlled mode).
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('DIRECTOR_RECON');
  // TFC hub sub-view, driven by the sidebar's nested items (TfcChallanHub runs controlled).
  const [tfcSubTab, setTfcSubTab] = useState<TfcSubTab>('DATE_WISE_RECEIPTS');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Logo State (Persisted in browser localStorage & Server Sync, with built-in official fallbacks)
  const [customGvtiwLogo, setCustomGvtiwLogo] = useState<string | null>(() => {
    const saved = localStorage.getItem('gvtiw_custom_logo');
    return saved && (saved.startsWith('data:') || saved.startsWith('/')) ? saved : DEFAULT_GVTIW_LOGO;
  });
  const [customTevtaLogo, setCustomTevtaLogo] = useState<string | null>(() => {
    const saved = localStorage.getItem('tevta_custom_logo');
    return saved && (saved.startsWith('data:') || saved.startsWith('/')) ? saved : DEFAULT_TEVTA_LOGO;
  });
  const [customGopLogo, setCustomGopLogo] = useState<string | null>(() => {
    const saved = localStorage.getItem('gop_custom_logo');
    return saved && (saved.startsWith('data:') || saved.startsWith('/')) ? saved : DEFAULT_GOP_LOGO;
  });
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  const refreshLogos = () => {
    const localGv = localStorage.getItem('gvtiw_custom_logo');
    const localTv = localStorage.getItem('tevta_custom_logo');
    const localGp = localStorage.getItem('gop_custom_logo');
    setCustomGvtiwLogo(localGv && (localGv.startsWith('data:') || localGv.startsWith('/')) ? localGv : DEFAULT_GVTIW_LOGO);
    setCustomTevtaLogo(localTv && (localTv.startsWith('data:') || localTv.startsWith('/')) ? localTv : DEFAULT_TEVTA_LOGO);
    setCustomGopLogo(localGp && (localGp.startsWith('data:') || localGp.startsWith('/')) ? localGp : DEFAULT_GOP_LOGO);

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
        if (data?.gopLogo && data.gopLogo.startsWith('data:')) {
          setCustomGopLogo(data.gopLogo);
          localStorage.setItem('gop_custom_logo', data.gopLogo);
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
        if (data?.gopLogo && data.gopLogo.startsWith('data:') && !localStorage.getItem('gop_custom_logo')) {
          setCustomGopLogo(data.gopLogo);
          localStorage.setItem('gop_custom_logo', data.gopLogo);
        }
      })
      .catch(() => {});
  }, []);

  // Corporate Theme Mode (Default: Light Mode on first open; saved preference wins afterwards)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gvtiw_theme');
    return saved !== null ? saved === 'dark' : false;
  });

  // Selected Category Filter
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');

  // Auto Sync Interval (in seconds, 20s default)
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(20);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Shared Admin & Voucher PIN Authentication State (pure in-memory state, resets on page reload)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return !!sessionStorage.getItem('gvtiw_active_session_pin');
    } catch {
      return false;
    }
  });
  // Session role: 'admin' (Master PIN) or 'guest' (view-only PIN), restored per session
  const [sessionRole, setSessionRole] = useState<'admin' | 'guest'>(() => {
    try {
      return sessionStorage.getItem('gvtiw_session_role') === 'guest' ? 'guest' : 'admin';
    } catch {
      return 'admin';
    }
  });
  const [storedPin, setStoredPin] = useState<string>(() => {
    try {
      return sessionStorage.getItem('gvtiw_active_session_pin') || '';
    } catch {
      return '';
    }
  });

  // One-time cleanup on app mount: wipe any stale admin session or persisted PIN from previous versions
  useEffect(() => {
    try {
      sessionStorage.removeItem('gvtiw_admin_session');
      localStorage.removeItem('gvtiw_admin_custom_pin');
    } catch {
      // Safe fallback in restricted environments
    }
  }, []);

  // System Backend Sync Status (reflects recent write attempts)
  const [syncStatus, setSyncStatus] = useState<'connected' | 'failed'>('connected');

  useEffect(() => {
    const handleSyncStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: 'connected' | 'failed' }>;
      if (customEvent.detail?.status) {
        setSyncStatus(customEvent.detail.status);
      }
    };
    window.addEventListener('gvtiw_sync_status_changed', handleSyncStatus);
    return () => window.removeEventListener('gvtiw_sync_status_changed', handleSyncStatus);
  }, []);

  const handleUnlock = useCallback((typedPin?: string, role: 'admin' | 'guest' = 'admin') => {
    setIsUnlocked(true);
    setSessionRole(role);
    if (typedPin) {
      setStoredPin(typedPin);
      try {
        sessionStorage.setItem('gvtiw_active_session_pin', typedPin);
        sessionStorage.setItem('gvtiw_session_role', role);
      } catch {
        // Safe fallback
      }
    }
  }, []);

  const handleLock = useCallback(() => {
    setIsUnlocked(false);
    setStoredPin('');
    setSessionRole('admin');
    try {
      sessionStorage.removeItem('gvtiw_active_session_pin');
      sessionStorage.removeItem('gvtiw_session_role');
    } catch {
      // Safe fallback
    }
  }, []);

  // Admin sections (Voucher Matrix, Admin Operations) need the Master PIN role;
  // a guest session stays view-only even though the front door is unlocked.
  const isAdmin = isUnlocked && sessionRole === 'admin';

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

  // Initial Load (front-door gate: no data loads until the session is unlocked)
  useEffect(() => {
    if (!isUnlocked) return;
    fetchDashboardData(false);
  }, [fetchDashboardData, isUnlocked]);

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
    if (!isUnlocked || autoSyncInterval <= 0) return;

    const timer = setInterval(() => {
      fetchDashboardData(true);
    }, autoSyncInterval * 1000);

    return () => clearInterval(timer);
  }, [autoSyncInterval, fetchDashboardData, isUnlocked]);

  // Export Excel / CSV Handler
  const handleExportCSV = async () => {
    if (!data) return;
    try {
      await exportBudgetMatrixExcel(
        data.accounts,
        data.financialYear || '2026-2027',
        `GVTIW_Budget_Position_${new Date().toISOString().split('T')[0]}.xlsx`
      );
    } catch (err) {
      console.error('Error exporting budget matrix to Excel, falling back to CSV:', err);
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
    }
  };

  // FRONT-DOOR PIN GATE — the whole app stays behind the PIN until the
  // browser session is unlocked (same server-verified PIN as Voucher/Admin).
  if (!isUnlocked) {
    return (
      <div className="gate-screen">
        <img src="/gvtiw-logo.jpg" alt="" aria-hidden="true" className="gate-bg-logo gate-bg-logo-a" />
        <img src="/tevta-logo.png" alt="" aria-hidden="true" className="gate-bg-logo gate-bg-logo-b" />
        <div className="gate-topbar">
          <div className="gate-logo-wrap">
            <span className="gate-halo" aria-hidden="true" />
            <span className="gate-ring" aria-hidden="true" />
            <img
              src={customGvtiwLogo || '/gvtiw-logo.jpg'}
              alt="GVTIW Logo"
              className="gate-logo"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="gate-titleblock">
            <h1 className="gate-institute">
              Govt. Vocational Training Institute (W) Samanabad, Faisalabad
            </h1>
            <p className="gate-hubline">Accounts &amp; Finance Hub</p>
          </div>
          <div className="gate-logo-wrap">
            <span className="gate-halo" aria-hidden="true" />
            <span className="gate-ring" aria-hidden="true" />
            <img
              src={customTevtaLogo || '/tevta-logo.png'}
              alt="TEVTA Logo"
              className="gate-logo"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
        <div className="gate-center gate-fade-up">
          <PinLockScreen
            darkMode={false}
            customGvtiwLogo={customGvtiwLogo}
            onUnlock={handleUnlock}
            title="GVTIW Accounts — Secure Access"
            size="large"
          />
        </div>
        <footer className="gate-footer">
          e-CashBook System developed by MKZ for Institute 33028
        </footer>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <AnimatedSplashLogos
        gvtiwLogo={customGvtiwLogo}
        tevtaLogo={customTevtaLogo}
        darkMode={darkMode}
        instituteName="Govt. Vocational Training Institute (W), Samanabad, Faisalabad"
      />
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
      className={`min-h-screen flex transition-colors duration-200 ${
        darkMode ? 'bg-[#03091E] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDEBAR NAVIGATION (replaces the top tab bar)            */}
      {/* ------------------------------------------------------------- */}
      <AppSidebar
        darkMode={darkMode}
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        isUnlocked={isUnlocked}
        activeReportTab={activeReportTab}
        onSelectReportTab={setActiveReportTab}
        tfcSubTab={tfcSubTab}
        onSelectTfcSubTab={setTfcSubTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onExpand={() => setSidebarCollapsed(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">

      {/* ------------------------------------------------------------- */}
      {/* CORPORATE EXECUTIVE HEADER                                    */}
      {/* ------------------------------------------------------------- */}
      <Header
        data={data}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onRefresh={() => fetchDashboardData(false)}
        onLock={handleLock}
        sessionRole={isUnlocked ? sessionRole : null}
        isRefreshing={isRefreshing}
        autoSyncInterval={autoSyncInterval}
        setAutoSyncInterval={setAutoSyncInterval}
        onPrintReport={() => setIsPrintModalOpen(true)}
        onExportCSV={handleExportCSV}
        onOpenLogoModal={() => setIsLogoModalOpen(true)}
        customGvtiwLogo={customGvtiwLogo}
        customTevtaLogo={customTevtaLogo}
        activeModule={activeModule}
        syncStatus={syncStatus}
      />

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
                accounts={data.accounts}
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
            <CashBookModule
              darkMode={darkMode}
              customGvtiwLogo={customGvtiwLogo}
              customTevtaLogo={customTevtaLogo}
              customGopLogo={customGopLogo}
            />
          </section>
        )}

        {activeModule === 'VOUCHERS' && (
          <section aria-label="Master Voucher Matrix">
            {!isAdmin ? (
              <PinLockScreen
                darkMode={darkMode}
                customGvtiwLogo={customGvtiwLogo}
                onUnlock={handleUnlock}
                adminOnly
                title="Voucher Matrix Authentication"
              />
            ) : (
              <VoucherModule
                darkMode={darkMode}
                customGvtiwLogo={customGvtiwLogo}
                customTevtaLogo={customTevtaLogo}
                customGopLogo={customGopLogo}
                storedPin={storedPin}
              />
            )}
          </section>
        )}

        {activeModule === 'REPORTS' && (
          <section aria-label="Reports & Statements Hub">
            <ReportsModule
              darkMode={darkMode}
              customGvtiwLogo={customGvtiwLogo}
              customTevtaLogo={customTevtaLogo}
              customGopLogo={customGopLogo}
              isUnlocked={isUnlocked}
              isAdminUnlocked={isAdmin}
              onUnlock={handleUnlock}
              activeReportTab={activeReportTab}
              onSelectReportTab={setActiveReportTab}
              tfcSubTab={tfcSubTab}
              onTfcSubTabChange={setTfcSubTab}
            />
          </section>
        )}

        {activeModule === 'ADMIN' && (
          <ModuleErrorBoundary moduleName="Admin Operations Hub">
            <section aria-label="Admin Operations Hub">
              <AdminHubModule
                darkMode={darkMode}
                customGvtiwLogo={customGvtiwLogo}
                customTevtaLogo={customTevtaLogo}
                customGopLogo={customGopLogo}
                isUnlocked={isAdmin}
                onUnlock={(pin: string) => handleUnlock(pin, 'admin')}
                onLock={handleLock}
                storedPin={storedPin}
                setStoredPin={setStoredPin}
              />
            </section>
          </ModuleErrorBoundary>
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
      </div>{/* end: flex-1 content column */}

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
