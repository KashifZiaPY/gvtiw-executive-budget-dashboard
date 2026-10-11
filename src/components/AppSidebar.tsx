/**
 * AppSidebar — left navigation shell for the Executive Budget Dashboard.
 *
 * PRESENTATION ONLY: this component renders navigation buttons and forwards
 * clicks to the handlers owned by App.tsx. It owns no data, no fetching,
 * no business logic. The light TEVTA executive theme (white/mint) is pure
 * styling; darkMode only switches the sidebar's own palette.
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
  darkMode,
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

  // ---------- style helpers (light TEVTA executive theme) ----------
  const iconTile = (isActive: boolean) =>
    `sb-tile group-hover:translate-x-0.5 flex items-center justify-center w-9 h-9 shrink-0 rounded-[10px] border transition-all duration-200 ${
      isActive ? 'sb-tile-active' : ''
    }`;

  const moduleBtn = (isActive: boolean, amber = false) =>
    `group flex items-center gap-2.5 w-full px-2.5 py-2.5 my-0.5 rounded-[14px] border text-sm font-semibold text-left whitespace-nowrap cursor-pointer transition-all duration-200 ${
      collapsed ? 'justify-center' : ''
    } ${
      isActive
        ? `${amber ? 'sb-active-amber' : 'sb-active-pill'} sb-active-text`
        : 'sb-idle hover:-translate-y-px'
    }`;

  const renderTfcNested = (small = false) => (
    <div className={`sb-submenu ${tfcOpen ? 'open' : ''}`}>
      <div className="sb-submenu-inner">
        <div className="sb-nest-line ml-5 mt-0.5 mb-1 pl-2 border-l-2">
          {TFC_SUB_TABS.map((sub, si) => (
            <button
              key={sub.value}
              type="button"
              onClick={() => handleTfcSubClick(sub.value)}
              title={sub.label}
              style={{ ['--i' as string]: si } as React.CSSProperties}
              className={`sb-sub-item flex items-center gap-2.5 w-full pl-1 pr-2 py-1.5 my-px rounded-[10px] font-semibold text-left cursor-pointer ${
                small ? 'text-[11px]' : 'text-[12px]'
              } ${isTfcActive && tfcSubTab === sub.value ? 'sb-sub-active' : 'sb-sub-idle'}`}
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
        <span className="sb-divider w-6 h-px rounded" />
      </div>
    ) : (
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="sb-section-label flex items-center gap-2 w-full px-3 pt-3.5 pb-2 font-display text-[10.5px] font-bold uppercase tracking-[0.14em] cursor-pointer select-none"
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
      className={`sb-shell sticky top-0 h-screen flex flex-col shrink-0 z-30 transition-all duration-200 ${
        collapsed ? 'w-[76px] sb-collapsed' : 'w-[280px]'
      } ${darkMode ? 'sb-dark' : ''}`}
      aria-label="Primary navigation"
    >
      {/* Brand card */}
      <div className={`px-3.5 pt-4 pb-3 whitespace-nowrap ${collapsed ? 'px-2.5' : ''}`}>
        <div className={`sb-brand-card flex items-center gap-3 rounded-2xl p-3 ${collapsed ? 'justify-center px-1.5' : ''}`}>
          <span className="sb-logo block w-[38px] h-[38px] shrink-0 rounded-full overflow-hidden">
            <img src="/gvtiw-logo.jpg" alt="GVTIW Logo" className="w-full h-full object-cover" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="sb-brand-title block font-display font-extrabold truncate">GVTIW Samanabad FSD</span>
              <span className="sb-brand-sub block text-[10.5px] font-medium uppercase tracking-[0.06em] mt-0.5">Accounts Section</span>
            </span>
          )}
        </div>
      </div>

      <div ref={navRef} className="sb-scroll relative flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3.5">
        <div ref={indicatorRef} id="sb-indicator" className={collapsed ? 'left-[5px]' : 'left-[7px]'} />

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
                    <span className="sb-lock-badge flex items-center justify-center w-5 h-5 shrink-0 rounded-md border">
                      <Lock className="w-3 h-3" strokeWidth={2.2} />
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
                  className="sb-flyout absolute left-full top-28 z-50 ml-3 w-72 max-h-[72vh] overflow-y-auto rounded-2xl border p-3 shadow-2xl"
                  role="menu"
                  aria-label="Reports & Statements flyout"
                >
                  <p className="sb-flyout-title px-2 pb-2 font-display text-[10px] font-bold uppercase tracking-[0.14em]">
                    Reports &amp; Statements
                  </p>
                  {REPORT_GROUPS.map((group, gi) => (
                    <div key={group.label} className="mb-1">
                      <button
                        type="button"
                        onClick={() => setOpenGroup(openGroup === gi ? null : gi)}
                        aria-expanded={openGroup === gi}
                        className="sb-flyout-group flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${openGroup === gi ? 'rotate-90' : ''}`} />
                        <span>{group.label}</span>
                      </button>
                      <div className={`sb-submenu ${openGroup === gi ? 'open' : ''}`}>
                        <div className="sb-submenu-inner">
                          <div className="sb-nest-line ml-4 mt-0.5 mb-1 pl-2 border-l">
                            {group.items.map((item, ii) =>
                              item.tab === 'TFC_CHALLAN_HUB' ? (
                                <div key={item.tab}>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={handleFlyoutTfcClick}
                                      style={{ ['--i' as string]: ii } as React.CSSProperties}
                                      className={`sb-sub-item flex items-center flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-left cursor-pointer ${
                                        isTfcActive ? 'sb-sub-active' : 'sb-sub-idle'
                                      }`}
                                    >
                                      <span className="truncate">{item.label}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setTfcOpen((v) => !v); }}
                                      aria-expanded={tfcOpen}
                                      className="sb-sub-idle p-1 rounded-md shrink-0 cursor-pointer"
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
                                      ? 'sb-sub-active'
                                      : 'sb-sub-idle'
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
                      className="sb-group-btn group flex items-center gap-2.5 w-full px-2.5 py-2.5 my-0.5 rounded-[14px] text-sm font-semibold text-left cursor-pointer whitespace-nowrap transition-all duration-200"
                      aria-expanded={open}
                    >
                      <span className={iconTile(false)}>{GROUP_ICONS[group.label]}</span>
                      <span className="flex-1 truncate">{group.label}</span>
                      <ChevronRight className={`sb-chev w-4 h-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
                    </button>
                    <div className={`sb-submenu ${open ? 'open' : ''}`}>
                      <div className="sb-submenu-inner">
                        <div className="sb-nest-line ml-[29px] mt-0.5 mb-1 pl-[14px] border-l">
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
                                      isTfcActive ? 'sb-sub-active' : 'sb-sub-idle'
                                    }`}
                                  >
                                    <span className="truncate">{item.label}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (collapsed) onExpand(); setTfcOpen((v) => !v); }}
                                    title={tfcOpen ? 'Collapse sub-views' : 'Expand sub-views'}
                                    aria-expanded={tfcOpen}
                                    className="sb-sub-idle p-1 rounded-md shrink-0 cursor-pointer"
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
                                    ? 'sb-sub-active'
                                    : 'sb-sub-idle'
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
            <span className={iconTile(activeModule === 'ADMIN')}>
              <ShieldCheck className="w-5 h-5" strokeWidth={1.8} />
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-[13px]">Admin Operations (PIN)</span>
                {!isUnlocked && (
                  <span className="sb-lock-badge flex items-center justify-center w-5 h-5 shrink-0 rounded-md border">
                    <Lock className="w-3 h-3" strokeWidth={2.2} />
                  </span>
                )}
              </>
            )}
          </button>
        )}
      </div>

      {/* ---------- Footer: user card + collapse ---------- */}
      <div className="sb-footer border-t p-3.5 space-y-2.5">
        <div className={`sb-user-card flex items-center gap-3 p-2.5 rounded-[14px] border overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <span className="flex items-center justify-center w-[38px] h-[38px] shrink-0 rounded-xl font-display text-[13px] font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #12a06a, #0b7a4b)', boxShadow: '0 4px 12px rgba(11,122,75,0.35)' }}>
            MKZ
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="sb-user-name block font-display text-[13px] font-bold">MKZ</span>
              <span className="sb-user-sub block text-[10.5px] mt-px">Institute 33028</span>
              <span className="flex items-center gap-1.5 mt-1">
                <span className="sb-pulse-dot" />
                <span className="sb-live-text text-[10px] font-semibold tracking-[0.04em]">Connected &amp; Live</span>
              </span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setFlyoutOpen(false); onToggleCollapse(); }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="sb-collapse-btn flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border font-display text-[11px] font-bold uppercase tracking-[0.08em] transition-all cursor-pointer"
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
