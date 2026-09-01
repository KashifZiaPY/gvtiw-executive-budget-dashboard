export type CategoryType =
  | 'Salary'
  | 'Non Salary'
  | 'Placement'
  | 'NAVTTC'
  | 'CMSDI'
  | 'Own Fund'
  | 'Interest Income'
  | 'Other Income'
  | 'AAA'
  | 'Uncategorized';

export interface AccountHead {
  code: string;
  head: string;
  category: CategoryType;
  opening: number;
  reappr: number;
  receipts: number;
  payments: number;
  balance: number;
  burnRate: number; // payments / (opening + reappr + receipts)
  lastActivity: string; // ISO string
  hash: string;
}

export interface CategorySummary {
  category: CategoryType;
  title: string;
  shortName: string;
  headCount: number;
  opening: number;
  reappr: number;
  receipts: number;
  payments: number;
  balance: number;
  burnRate: number;
  latestActivity: string;
  themeColor: {
    header: string;
    cardBg: string;
    text: string;
    accent: string;
  };
  isMemo?: boolean; // For AAA memo account
}

export interface GrandTotalSummary {
  opening: number;
  reappr: number;
  receipts: number;
  payments: number;
  balance: number;
  burnRate: number;
  latestActivity: string;
  totalHeads: number;
}

export interface VoucherTransaction {
  id: string;
  voucherNo: string;
  headCode: string;
  headTitle: string;
  category: CategoryType;
  type: 'Payment' | 'Receipt' | 'Reappropriation' | 'Adjustment';
  amount: number;
  payeeOrSource: string;
  description: string;
  date: string;
  timestamp: string;
  operator: string;
}

export interface AuditLogEntry {
  id: string;
  headCode: string;
  headTitle: string;
  action: 'VOUCHER_ADDED' | 'AMOUNT_EDITED' | 'VOUCHER_DELETED' | 'REAPPROPRIATION' | 'BUDGET_ADJUSTED';
  deltaAmount: number;
  previousBalance: number;
  newBalance: number;
  timestamp: string;
  details: string;
}

export interface ReappropriationSimulation {
  fromHeadCode: string;
  toHeadCode: string;
  amount: number;
  reason: string;
}

export interface DashboardResponse {
  instituteName: string;
  reportTitle: string;
  financialYear: string;
  developerWatermark: string;
  version: string;
  systemStatus: 'Live & Connected' | 'Syncing' | 'Paused';
  autoSyncMinutes: number;
  lastSyncedAt: string;
  latestFinancialActivityTs: string;
  latestChangedCode: string | null;
  sourceSheetUrl?: string;
  webAppUrl?: string;
  syncSource?: 'Google Sheet Live' | 'Apps Script Web App' | 'Institutional Baseline';
  accounts: AccountHead[];
  categories: CategorySummary[];
  grandTotal: GrandTotalSummary;
  aaaMemo: CategorySummary;
  recentAudits: AuditLogEntry[];
  recentVouchers: VoucherTransaction[];
}

export interface AiInsightResponse {
  overview: string;
  keyFindings: {
    type: 'critical' | 'warning' | 'positive' | 'info';
    title: string;
    description: string;
    affectedCategory?: string;
  }[];
  burnRateAnomalies: {
    headCode: string;
    headTitle: string;
    burnRate: number;
    riskLevel: 'High' | 'Medium' | 'Low';
    suggestion: string;
  }[];
  recommendations: string[];
}
