/**
 * AppSidebar — left navigation shell for the Executive Budget Dashboard.
 *
 * PRESENTATION ONLY: this component renders navigation buttons and forwards
 * clicks to the handlers owned by App.tsx. It owns no data, no fetching,
 * no business logic. The indigo/navy executive theme, emerald active pill,
 * sliding indicator and submenu animations are pure styling.
 */
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Receipt,
  FileSpreadsheet,
  Lock,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calculator,
  Wallet,
  Percent,
  Banknote,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import type { ActiveModuleTab } from '../App';
import type { ReportTab } from './ReportsModule';
import { TFC_SUB_TABS } from './TfcChallanHub';
import type { TfcSubTab } from './TfcChallanHub';

interface ReportGroup {
  label: string;
  items: { tab: ReportTab; label: string }[];
}

const REPORT_GROUPS: ReportGroup[] = [
  {
    label: 'Accounting',
    items: [
      { tab: 'DIRECTOR_RECON', label: 'Accounting Data Entry' },
      { tab: 'CASHBOOK', label: 'Cashbook Statement' },
    ],
  },
  {
    label: 'Expenditure',
    items: [
      { tab: 'HEAD', label: 'Head Expenditure' },
      { tab: 'NS_OWN_FY26_27', label: 'NS & OWN Working' },
    ],
  },
  {
    label: 'Tax & Withholding',
    items: [
      { tab: 'PAYEE', label: 'Payee Statement' },
      { tab: 'FBR', label: 'FBR Withholding' },
      { tab: 'PRA', label: 'PRA Sales Tax' },
    ],
  },
  {
    label: 'Disbursements',
    items: [
      { tab: 'CHEQUE', label: 'Cheque Inquiry' },
      { tab: 'AMOUNT', label: 'Amount Range' },
      { tab: 'PRINT_CENTER', label: 'Print Center' },
    ],
  },
  {
    label: 'Fee Collection',
    items: [{ tab: 'TFC_CHALLAN_HUB', label: 'BOP Fee Challan Hub' }],
  },
];

const GROUP_ICONS: Record<string, React.ReactNode> = {
  Accounting: <Calculator className="w-5 h-5" strokeWidth={1.8} />,
  Expenditure: <Wallet className="w-5 h-5" strokeWidth={1.8} />,
  'Tax & Withholding': <Percent className="w-5 h-5" strokeWidth={1.8} />,
  Disbursements: <Banknote className="w-5 h-5" strokeWidth={1.8} />,
  'Fee Collection': <GraduationCap className="w-5 h-5" strokeWidth={1.8} />,
};

function groupOfTab(tab: ReportTab): number {
  return REPORT_GROUPS.findIndex((g) => g.items.some((i) => i.tab === tab));
}

interface AppSidebarProps {
  darkMode: boolean;
  activeModule: ActiveModuleTab;
  onSelectModule: (m: ActiveModuleTab) => void;
  isUnlocked: boolean;
  activeReportTab: ReportTab;
  onSelectReportTab: (t: ReportTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onExpand: () => void;
  /** Active TFC hub sub-view, for the nested sidebar items. */
  tfcSubTab: TfcSubTab;
  onSelectTfcSubTab: (t: TfcSubTab) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeModule,
  onSelectModule,
  isUnlocked,
  activeReportTab,
  onSelectReportTab,
  collapsed,
  onToggleCollapse,
  onExpand,
  tfcSubTab,
  onSelectTfcSubTab,
}) => {
  const [openGroup, setOpenGroup] = useState<number | null>(() => groupOfTab(activeReportTab));

  // Keep the group containing the active report open when navigating.
  useEffect(() => {
    if (activeModule === 'REPORTS') {
      setOpenGroup(groupOfTab(activeReportTab));
    }
  }, [activeModule, activeReportTab]);

  // Nested TFC hub sub-views (enterprise accordion). Open whenever the hub is the active report.
  const [tfcOpen, setTfcOpen] = useState<boolean>(() => activeReportTab === 'TFC_CHALLAN_HUB');
  useEffect(() => {
    if (activeModule === 'REPORTS' && activeReportTab === 'TFC_CHALLAN_HUB') setTfcOpen(true);
  }, [activeModule, activeReportTab]);
  // Right-flipping flyout for collapsed (icons-only) mode.
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  // Collapsible section labels.
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setClosedSections((p) => ({ ...p, [key]: !p[key] }));

  // ---- Sliding active indicator ----
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const positionIndicator = () => {
    const nav = navRef.current;
    const ind = indicatorRef.current;
    if (!nav || !ind) return;
    const active = nav.querySelector('[data-sb-active="true"]') as HTMLElement | null;
    if (!active) {
      ind.style.opacity = '0';
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    ind.style.opacity = '1';
    ind.style.top = `${r.top - navRect.top + nav.scrollTop + 9}px`;
    ind.style.height = `${Math.max(r.height - 18, 12)}px`;
  };
  useLayoutEffect(() => {
    positionIndicator();
  });
  useEffect(() => {
    const nav = navRef.current;
    window.addEventListener('resize', positionIndicator);
    nav?.addEventListener('scroll', positionIndicator, { passive: true });
    const t = window.setTimeout(positionIndicator, 350);
    return () => {
      window.removeEventListener('resize', positionIndicator);
      nav?.removeEventListener('scroll', positionIndicator);
      window.clearTimeout(t);
    };
  }, []);

  // ---- "Dashing" activation: pop + sheen sweep whenever the active target changes ----
  const activeKey = `${activeModule}|${activeReportTab}|${tfcSubTab}`;
  const [animKey, setAnimKey] = useState(activeKey);
  const [isActivating, setIsActivating] = useState(false);
  useEffect(() => {
    if (activeKey !== animKey) {
      setAnimKey(activeKey);
      setIsActivating(true);
      const t = window.setTimeout(() => setIsActivating(false), 750);
      return () => window.clearTimeout(t);
    }
  }, [activeKey, animKey]);

  // ---- Lock shake (visual only; the PIN flow still triggers via onSelectModule) ----
  const [voucherShake, setVoucherShake] = useState(0);
  const [adminShake, setAdminShake] = useState(0);

  const handleGroupClick = (idx: number) => {
    if (collapsed) onExpand();
    setOpenGroup(openGroup === idx ? null : idx);
  };

  const handleReportClick = (tab: ReportTab) => {
    onSelectReportTab(tab);
    onSelectModule('REPORTS');
  };

  const handleTfcClick = () => {
    if (collapsed) onExpand();
    onSelectReportTab('TFC_CHALLAN_HUB');
    onSelectModule('REPORTS');
    setTfcOpen(true);
  };

  const handleTfcSubClick = (sub: TfcSubTab) => {
    onSelectReportTab('TFC_CHALLAN_HUB');
    onSelectModule('REPORTS');
    onSelectTfcSubTab(sub);
    setFlyoutOpen(false);
  };

  const isTfcActive = activeModule === 'REPORTS' && activeReportTab === 'TFC_CHALLAN_HUB';

  // Collapsed-mode flyout: the enterprise right-flipping submenu.
  const handleFlyoutReportClick = (tab: ReportTab) => {
    handleReportClick(tab);
    setFlyoutOpen(false);
  };
  const handleFlyoutTfcClick = () => {
    onSelectReportTab('TFC_CHALLAN_HUB');
    onSelectModule('REPORTS');
    setTfcOpen(true);
    setFlyoutOpen(false);
  };

  // ---------- style helpers ----------
  const iconTile = (isActive: boolean, amber = false) =>
    `flex items-center justify-center w-9 h-9 shrink-0 rounded-[10px] border transition-all duration-200 group-hover:translate-x-0.5 ${
      isActive
        ? amber
          ? 'bg-white/[0.18] border-white/25 text-white'
          : 'bg-white/[0.18] border-white/25 text-white'
        : 'bg-white/[0.07] border-white/10 text-white/80 group-hover:text-white'
    }`;

  const moduleBtn = (isActive: boolean, amber = false) =>
    `sb-sheen group flex items-center gap-2.5 w-full px-2.5 py-2.5 my-0.5 rounded-[14px] border text-sm font-semibold text-left whitespace-nowrap cursor-pointer transition-all duration-200 ${
      collapsed ? 'justify-center' : ''
    } ${
      isActive
        ? `${amber ? 'sb-active-amber' : 'sb-active-pill'} text-white border-white/25${isActivating ? ' sb-activating' : ''}`
        : 'text-white/75 border-transparent hover:bg-white/[0.07] hover:text-white hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.22)]'
    }`;

  const renderTfcNested = (small = false) => (
    <div className={`sb-submenu ${tfcOpen ? 'open' : ''}`}>
      <div className="sb-submenu-inner">
        <div className="ml-5 mt-0.5 mb-1 pl-2 border-l-2 border-[#0b7a4b]/30">
          {TFC_SUB_TABS.map((sub, si) => (
            <button
              key={sub.value}
              type="button"
              onClick={() => handleTfcSubClick(sub.value)}
              title={sub.label}
              style={{ ['--i' as string]: si } as React.CSSProperties}
              className={`sb-sub-item flex items-center gap-2.5 w-full pl-1 pr-2 py-1.5 my-px rounded-[10px] font-semibold text-left cursor-pointer ${
                small ? 'text-[11px]' : 'text-[12px]'
              } ${
                isTfcActive && tfcSubTab === sub.value
                  ? 'sb-sub-active text-white bg-[#0b7a4b]/30'
                  : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span className="truncate">{sub.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const sectionLabel = (key: string, text: string) =>
    collapsed ? (
      <div className="flex justify-center py-3">
        <span className="w-6 h-px bg-white/20 rounded" />
      </div>
    ) : (
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="flex items-center gap-2 w-full px-3 pt-3.5 pb-2 font-display text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/40 hover:text-white/75 transition-colors cursor-pointer select-none"
        aria-expanded={!closedSections[key]}
      >
        <span>{text}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 ml-auto transition-transform duration-300 ${closedSections[key] ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>
    );

  return (
    <aside
      className={`sb-shell relative flex flex-col shrink-0 z-30 transition-all duration-200 ${
        collapsed ? 'w-[76px] sb-collapsed' : 'w-[280px]'
      }`}
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 px-[18px] pt-5 pb-4 whitespace-nowrap ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="flex items-center justify-center w-11 h-11 shrink-0 rounded-[14px] border border-white/20 font-display text-[15px] font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))', boxShadow: '0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
          GV
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-display text-sm font-extrabold text-white tracking-[0.04em] leading-tight">GVTIW Executive</h1>
            <p className="text-[10.5px] font-medium text-white/50 tracking-[0.08em] uppercase mt-0.5">Budget Position · TEVTA</p>
          </div>
        )}
      </div>

      <div ref={navRef} className="sb-scroll relative flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3.5">
        <div ref={indicatorRef} id="sb-indicator" className={collapsed ? 'left-1' : 'left-1.5'} />

        {/* ---------- Main modules ---------- */}
        {sectionLabel('main', 'Main Modules')}
        {!closedSections['main'] && (
          <>
            <button
              type="button"
              onClick={() => onSelectModule('DASHBOARD')}
              title="Executive Budget Matrix"
              data-tip="Executive Budget Matrix"
              data-sb-active={activeModule === 'DASHBOARD' ? 'true' : undefined}
              className={moduleBtn(activeModule === 'DASHBOARD')}
            >
              <span className={iconTile(activeModule === 'DASHBOARD')}>
                <LayoutDashboard className="w-5 h-5" strokeWidth={1.8} />
              </span>
              {!collapsed && <span className="flex-1 truncate">Executive Budget Matrix</span>}
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('CASHBOOK')}
              title="Digital CashBooks (6 A/C)"
              data-tip="Digital CashBooks (6 A/C)"
              data-sb-active={activeModule === 'CASHBOOK' ? 'true' : undefined}
              className={moduleBtn(activeModule === 'CASHBOOK')}
            >
              <span className={iconTile(activeModule === 'CASHBOOK')}>
                <BookOpen className="w-5 h-5" strokeWidth={1.8} />
              </span>
              {!collapsed && <span className="flex-1 truncate">Digital CashBooks (6 A/C)</span>}
            </button>

            <button
              type="button"
              key={`vouchers-${voucherShake}`}
              onClick={() => {
                if (!isUnlocked) setVoucherShake((k) => k + 1);
                onSelectModule('VOUCHERS');
              }}
              title="Voucher Matrix"
              data-tip="Voucher Matrix"
              data-sb-active={activeModule === 'VOUCHERS' ? 'true' : undefined}
              className={`${moduleBtn(activeModule === 'VOUCHERS')}${!isUnlocked && voucherShake > 0 ? ' sb-shake-once' : ''}`}
            >
              <span className={iconTile(activeModule === 'VOUCHERS')}>
                <Receipt className="w-5 h-5" strokeWidth={1.8} />
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">Voucher Matrix</span>
                  {!isUnlocked && (
                    <span className="flex items-center justify-center w-5 h-5 shrink-0 rounded-md bg-white/[0.08] border border-white/[0.14]">
                      <Lock className="w-3 h-3 text-white/65" strokeWidth={2.2} />
                    </span>
                  )}
                </>
              )}
            </button>
          </>
        )}

        {/* ---------- Reports hub ---------- */}
        {sectionLabel('reports', 'Reports & Statements')}
        {!closedSections['reports'] && (
          <>
            <button
              type="button"
              onClick={() => {
                if (collapsed) {
                  setFlyoutOpen((v) => !v);
                } else {
                  onSelectModule('REPORTS');
                }
              }}
              title="Reports & Statements"
              data-tip="Reports Hub"
              aria-expanded={collapsed ? flyoutOpen : undefined}
              data-sb-active={activeModule === 'REPORTS' && groupOfTab(activeReportTab) === -1 ? 'true' : undefined}
              className={moduleBtn(activeModule === 'REPORTS' && groupOfTab(activeReportTab) === -1)}
            >
              <span className={iconTile(activeModule === 'REPORTS' && groupOfTab(activeReportTab) === -1)}>
                <FileSpreadsheet className="w-5 h-5" strokeWidth={1.8} />
              </span>
              {!collapsed && <span className="flex-1 truncate">Reports Hub</span>}
            </button>

            {/* Right-flipping enterprise flyout (collapsed mode) */}
            {collapsed && flyoutOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setFlyoutOpen(false)} aria-hidden="true" />
                <div
                  className="absolute left-full top-28 z-50 ml-3 w-72 max-h-[72vh] overflow-y-auto rounded-2xl border border-white/15 p-3 shadow-2xl"
                  style={{ background: 'linear-gradient(180deg, #1e1b6e 0%, #0f0d3a 100%)' }}
                  role="menu"
                  aria-label="Reports & Statements flyout"
                >
                  <p className="px-2 pb-2 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#4ade9e]/80">
                    Reports &amp; Statements
                  </p>
                  {REPORT_GROUPS.map((group, gi) => (
                    <div key={group.label} className="mb-1">
                      <button
                        type="button"
                        onClick={() => setOpenGroup(openGroup === gi ? null : gi)}
                        aria-expanded={openGroup === gi}
                        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                      >
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${openGroup === gi ? 'rotate-90' : ''}`} />
                        <span>{group.label}</span>
                      </button>
                      <div className={`sb-submenu ${openGroup === gi ? 'open' : ''}`}>
                        <div className="sb-submenu-inner">
                          <div className="ml-4 mt-0.5 mb-1 pl-2 border-l border-white/10">
                            {group.items.map((item, ii) =>
                              item.tab === 'TFC_CHALLAN_HUB' ? (
                                <div key={item.tab}>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={handleFlyoutTfcClick}
                                      style={{ ['--i' as string]: ii } as React.CSSProperties}
                                      className={`sb-sub-item flex items-center flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-left cursor-pointer ${
                                        isTfcActive ? 'sb-sub-active text-white bg-[#0b7a4b]/30' : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                                      }`}
                                    >
                                      <span className="truncate">{item.label}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setTfcOpen((v) => !v); }}
                                      aria-expanded={tfcOpen}
                                      className="p-1 rounded-md shrink-0 text-white/55 hover:text-white cursor-pointer"
                                    >
                                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${tfcOpen ? 'rotate-90' : ''}`} />
                                    </button>
                                  </div>
                                  {renderTfcNested(true)}
                                </div>
                              ) : (
                                <button
                                  key={item.tab}
                                  type="button"
                                  onClick={() => handleFlyoutReportClick(item.tab)}
                                  style={{ ['--i' as string]: ii } as React.CSSProperties}
                                  className={`sb-sub-item flex items-center w-full px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-left cursor-pointer ${
                                    activeModule === 'REPORTS' && activeReportTab === item.tab
                                      ? 'sb-sub-active text-white bg-[#0b7a4b]/30'
                                      : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                                  }`}
                                >
                                  <span className="truncate">{item.label}</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!collapsed &&
              REPORT_GROUPS.map((group, gi) => {
                const open = openGroup === gi;
                return (
                  <div key={group.label}>
                    <button
                      type="button"
                      onClick={() => handleGroupClick(gi)}
                      data-tip={group.label}
                      className="group flex items-center gap-2.5 w-full px-2.5 py-2.5 my-0.5 rounded-[14px] text-sm font-semibold text-white/75 hover:bg-white/[0.07] hover:text-white text-left cursor-pointer whitespace-nowrap transition-all duration-200"
                      aria-expanded={open}
                    >
                      <span className={iconTile(false)}>{GROUP_ICONS[group.label]}</span>
                      <span className="flex-1 truncate">{group.label}</span>
                      <ChevronRight className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
                    </button>
                    <div className={`sb-submenu ${open ? 'open' : ''}`}>
                      <div className="sb-submenu-inner">
                        <div className="ml-[29px] mt-0.5 mb-1 pl-[14px] border-l border-white/10">
                          {group.items.map((item, ii) =>
                            item.tab === 'TFC_CHALLAN_HUB' ? (
                              <div key={item.tab}>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={handleTfcClick}
                                    title={item.label}
                                    style={{ ['--i' as string]: ii } as React.CSSProperties}
                                    className={`sb-sub-item flex items-center flex-1 min-w-0 pl-1 pr-2 py-2 my-px rounded-[10px] text-[13px] font-semibold text-left cursor-pointer ${
                                      isTfcActive ? 'sb-sub-active text-white bg-[#0b7a4b]/30' : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                                    }`}
                                  >
                                    <span className="truncate">{item.label}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (collapsed) onExpand(); setTfcOpen((v) => !v); }}
                                    title={tfcOpen ? 'Collapse sub-views' : 'Expand sub-views'}
                                    aria-expanded={tfcOpen}
                                    className="p-1 rounded-md shrink-0 text-white/50 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${tfcOpen ? 'rotate-90' : ''}`} />
                                  </button>
                                </div>
                                {renderTfcNested()}
                              </div>
                            ) : (
                              <button
                                key={item.tab}
                                type="button"
                                onClick={() => handleReportClick(item.tab)}
                                style={{ ['--i' as string]: ii } as React.CSSProperties}
                                className={`sb-sub-item flex items-center gap-2.5 w-full pl-1 pr-2 py-2 my-px rounded-[10px] text-[13px] font-semibold text-left cursor-pointer ${
                                  activeModule === 'REPORTS' && activeReportTab === item.tab
                                    ? 'sb-sub-active text-white bg-[#0b7a4b]/30'
                                    : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                                }`}
                              >
                                <span className="truncate">{item.label}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </>
        )}

        {/* ---------- Administration ---------- */}
        {sectionLabel('admin', 'Administration')}
        {!closedSections['admin'] && (
          <button
            type="button"
            key={`admin-${adminShake}`}
            onClick={() => {
              if (!isUnlocked) setAdminShake((k) => k + 1);
              onSelectModule('ADMIN');
            }}
            title="Admin Operations (PIN)"
            data-tip="Admin Operations (PIN)"
            data-sb-active={activeModule === 'ADMIN' ? 'true' : undefined}
            className={`${moduleBtn(activeModule === 'ADMIN', true)}${!isUnlocked && adminShake > 0 ? ' sb-shake-once' : ''}`}
          >
            <span className={iconTile(activeModule === 'ADMIN', true)}>
              <ShieldCheck className="w-5 h-5" strokeWidth={1.8} />
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-[13px]">Admin Operations (PIN)</span>
                {!isUnlocked && (
                  <span className="flex items-center justify-center w-5 h-5 shrink-0 rounded-md bg-white/[0.08] border border-white/[0.14]">
                    <Lock className="w-3 h-3 text-white/65" strokeWidth={2.2} />
                  </span>
                )}
              </>
            )}
          </button>
        )}
      </div>

      {/* ---------- Footer: copyright + collapse ---------- */}
      <div className="border-t border-white/10 p-3.5 space-y-2.5" style={{ background: 'rgba(0,0,0,0.14)' }}>
        <div className={`flex items-start gap-2.5 p-3 rounded-[14px] border border-white/10 bg-white/[0.045] overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-[10px] border border-white/20 bg-white/[0.07] font-display text-[15px] font-bold text-white/90">
            ©
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-[12.5px] font-bold text-white truncate">MKZ e-CashBook System</span>
              <span className="block text-[10px] font-medium text-white/50 leading-relaxed mt-0.5">
                © {new Date().getFullYear()} Developed by MKZ · All rights reserved
              </span>
              <span className="block text-[9.5px] font-semibold tracking-[0.08em] uppercase text-[#4ade9e]/75 mt-1">
                GVTIW Samanabad-33028, TEVTA FSD
              </span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setFlyoutOpen(false); onToggleCollapse(); }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/10 bg-white/[0.05] font-display text-[11px] font-bold uppercase tracking-[0.08em] text-white/50 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        >
          {collapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronsLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
