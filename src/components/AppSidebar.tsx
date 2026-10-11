/**
 * AppSidebar — left navigation shell for the Executive Budget Dashboard.
 *
 * PRESENTATION ONLY: this component renders navigation buttons and forwards
 * clicks to the handlers owned by App.tsx. It owns no data, no fetching,
 * no business logic. Replacing the old top tab bar with this sidebar
 * changes where buttons sit, not what they do.
 */
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Receipt,
  FileSpreadsheet,
  Lock,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { ActiveModuleTab } from '../App';
import type { ReportTab } from './ReportsModule';

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
}) => {
  const [openGroup, setOpenGroup] = useState<number | null>(() => groupOfTab(activeReportTab));

  // Keep the group containing the active report open when navigating.
  useEffect(() => {
    if (activeModule === 'REPORTS') {
      setOpenGroup(groupOfTab(activeReportTab));
    }
  }, [activeModule, activeReportTab]);

  const baseBtn =
    'flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap';
  const idle = darkMode
    ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900';
  const active =
    'bg-blue-600 text-white shadow-md ' + (darkMode ? 'shadow-blue-500/20' : '');
  const adminIdle = darkMode
    ? 'text-amber-300/80 hover:bg-amber-500/20 hover:text-amber-300'
    : 'text-amber-800 hover:bg-amber-50 hover:text-amber-900';
  const adminActive =
    'bg-amber-600 text-white shadow-md ' + (darkMode ? 'shadow-amber-500/20' : '');

  const subIdle = darkMode
    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';
  const subActive = darkMode
    ? 'bg-blue-600/25 text-white ring-1 ring-blue-500/40'
    : 'bg-blue-50 text-blue-950 ring-1 ring-blue-500';

  const handleGroupClick = (idx: number) => {
    if (collapsed) onExpand();
    setOpenGroup(openGroup === idx ? null : idx);
  };

  const handleReportClick = (tab: ReportTab) => {
    onSelectReportTab(tab);
    onSelectModule('REPORTS');
  };

  return (
    <aside
      className={`flex flex-col shrink-0 border-r transition-all duration-200 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      } ${darkMode ? 'bg-[#0F1D3B] border-slate-700/80' : 'bg-white border-slate-200'}`}
      aria-label="Primary navigation"
    >
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 scrollbar-none">
        {/* ---------- Main modules ---------- */}
        {!collapsed && (
          <p
            className={`px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Main Modules
          </p>
        )}

        <button
          type="button"
          onClick={() => onSelectModule('DASHBOARD')}
          title="Executive Budget Matrix"
          className={`${baseBtn} ${collapsed ? 'justify-center px-2' : ''} ${
            activeModule === 'DASHBOARD' ? active : idle
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-amber-300 shrink-0" />
          {!collapsed && <span>Executive Budget Matrix</span>}
        </button>

        <button
          type="button"
          onClick={() => onSelectModule('CASHBOOK')}
          title="Digital CashBooks (6 A/C)"
          className={`${baseBtn} ${collapsed ? 'justify-center px-2' : ''} ${
            activeModule === 'CASHBOOK' ? active : idle
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
          {!collapsed && <span>Digital CashBooks (6 A/C)</span>}
        </button>

        <button
          type="button"
          onClick={() => onSelectModule('VOUCHERS')}
          title="Voucher Matrix"
          className={`${baseBtn} ${collapsed ? 'justify-center px-2' : ''} ${
            activeModule === 'VOUCHERS' ? active : idle
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-300 shrink-0" />
          {!collapsed && (
            <>
              <span>Voucher Matrix</span>
              {!isUnlocked && <Lock className="w-3 h-3 text-amber-400/80 ml-auto" />}
            </>
          )}
        </button>

        {/* ---------- Reports hub (grouped, replaces the horizontal strip) ---------- */}
        {!collapsed && (
          <p
            className={`px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Reports &amp; Statements
          </p>
        )}
        {collapsed && (
          <div
            className={`my-2 border-t ${darkMode ? 'border-slate-700/60' : 'border-slate-200'}`}
          />
        )}

        <button
          type="button"
          onClick={() => {
            if (collapsed) onExpand();
            onSelectModule('REPORTS');
          }}
          title="Reports & Statements"
          className={`${baseBtn} ${collapsed ? 'justify-center px-2' : ''} ${
            activeModule === 'REPORTS' ? active : idle
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-300 shrink-0" />
          {!collapsed && <span>Reports Hub</span>}
        </button>

        {!collapsed &&
          REPORT_GROUPS.map((group, gi) => (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => handleGroupClick(gi)}
                className={`${baseBtn} ${subIdle}`}
                aria-expanded={openGroup === gi}
              >
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    openGroup === gi ? 'rotate-90' : ''
                  } ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}
                />
                <span className="font-bold">{group.label}</span>
              </button>
              {openGroup === gi && (
                <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l pl-2 border-slate-700/40 dark:border-slate-700/40">
                  {group.items.map((item) => (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => handleReportClick(item.tab)}
                      className={`flex items-center w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all cursor-pointer ${
                        activeModule === 'REPORTS' && activeReportTab === item.tab
                          ? subActive
                          : subIdle
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

        {/* ---------- Administration ---------- */}
        {!collapsed && (
          <p
            className={`px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Administration
          </p>
        )}
        {collapsed && (
          <div
            className={`my-2 border-t ${darkMode ? 'border-slate-700/60' : 'border-slate-200'}`}
          />
        )}

        <button
          type="button"
          onClick={() => onSelectModule('ADMIN')}
          title="Admin Operations (PIN)"
          className={`${baseBtn} ${collapsed ? 'justify-center px-2' : ''} ${
            activeModule === 'ADMIN' ? adminActive : adminIdle
          }`}
        >
          <Lock className="w-4 h-4 text-amber-300 shrink-0" />
          {!collapsed && <span>Admin Operations (PIN)</span>}
        </button>
      </div>

      {/* ---------- Footer: version + collapse ---------- */}
      <div
        className={`border-t p-2.5 space-y-2 ${
          darkMode ? 'border-slate-700/80' : 'border-slate-200'
        }`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">Enterprise Suite v3.1 (v3.14 Live)</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            darkMode
              ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
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
