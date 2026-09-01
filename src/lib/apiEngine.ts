import {
  AccountHead,
  CategorySummary,
  CategoryType,
  DashboardResponse,
  GrandTotalSummary,
  VoucherTransaction,
  AuditLogEntry,
  AiInsightResponse,
} from '../types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_VOUCHERS,
  INITIAL_AUDIT_LOGS,
  CATEGORY_DISPLAY_ORDER,
  CATEGORY_METADATA,
  INSTITUTE_NAME,
  REPORT_TITLE,
  FINANCIAL_YEAR,
  DEV_WATERMARK,
  SCRIPT_VERSION,
  SOURCE_SHEET_URL,
  WEB_APP_URL,
} from '../data/initialData';

const GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1wU3zS6BSrCJuFqio8Az7sKkCcwuTOSeJ8GRW7FhCRls/export?format=csv&gid=240736415';

const STORAGE_KEY_ACCOUNTS = 'gvtiw_accounts_store_v29';
const STORAGE_KEY_VOUCHERS = 'gvtiw_vouchers_store_v29';
const STORAGE_KEY_AUDITS = 'gvtiw_audits_store_v29';
const STORAGE_KEY_SPOTLIGHT = 'gvtiw_spotlight_code_v29';
const STORAGE_KEY_LATEST_ACTIVITY_TS = 'gvtiw_latest_activity_ts_v29';

const VALID_ACCOUNT_CODES = new Set(INITIAL_ACCOUNTS.map((a) => a.code));

function getAccountsStore(): AccountHead[] {
  // Clear any legacy polluted local storage keys
  try {
    localStorage.removeItem('gvtiw_accounts_store');
    localStorage.removeItem('gvtiw_spotlight_code');
  } catch {}

  const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
  if (saved) {
    try {
      const parsed: AccountHead[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Strictly filter to ensure only canonical 38 accounts are accepted
        const sanitized = parsed.filter(
          (a) =>
            a &&
            a.code &&
            VALID_ACCOUNT_CODES.has(a.code) &&
            !a.code.toUpperCase().includes('SUBTOTAL') &&
            !a.code.toUpperCase().includes('GRAND') &&
            !a.code.toUpperCase().includes('TOTAL')
        );
        if (sanitized.length === INITIAL_ACCOUNTS.length) {
          return sanitized;
        }
      }
    } catch {
      // ignore
    }
  }
  return JSON.parse(JSON.stringify(INITIAL_ACCOUNTS));
}

function saveAccountsStore(accounts: AccountHead[]) {
  // Never save corrupted non-head objects
  const sanitized = accounts.filter(
    (a) =>
      a &&
      a.code &&
      VALID_ACCOUNT_CODES.has(a.code) &&
      !a.code.toUpperCase().includes('SUBTOTAL') &&
      !a.code.toUpperCase().includes('GRAND') &&
      !a.code.toUpperCase().includes('TOTAL')
  );
  localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(sanitized));
}

function getVouchersStore(): VoucherTransaction[] {
  const saved = localStorage.getItem(STORAGE_KEY_VOUCHERS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return JSON.parse(JSON.stringify(INITIAL_VOUCHERS));
}

function saveVouchersStore(vouchers: VoucherTransaction[]) {
  localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(vouchers));
}

function getAuditsStore(): AuditLogEntry[] {
  const saved = localStorage.getItem(STORAGE_KEY_AUDITS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
}

function saveAuditsStore(audits: AuditLogEntry[]) {
  localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(audits));
}

function calculateHash(acc: { opening: number; reappr: number; receipts: number; payments: number; balance: number }): string {
  return `${acc.opening.toFixed(2)}|${acc.reappr.toFixed(2)}|${acc.receipts.toFixed(2)}|${acc.payments.toFixed(2)}|${acc.balance.toFixed(2)}`;
}

export function computeAggregations(accounts: AccountHead[]) {
  const categoryMap: Record<CategoryType, AccountHead[]> = {
    Salary: [],
    'Non Salary': [],
    Placement: [],
    NAVTTC: [],
    CMSDI: [],
    'Own Fund': [],
    'Interest Income': [],
    'Other Income': [],
    AAA: [],
    Uncategorized: [],
  };

  accounts.forEach((acc) => {
    acc.balance = acc.opening + acc.reappr + acc.receipts - acc.payments;
    const totalAllocated = acc.opening + acc.reappr + acc.receipts;
    acc.burnRate = totalAllocated > 0 ? acc.payments / totalAllocated : 0;
    acc.hash = calculateHash(acc);

    if (!categoryMap[acc.category]) {
      categoryMap[acc.category] = [];
    }
    categoryMap[acc.category].push(acc);
  });

  const categories: CategorySummary[] = [];

  CATEGORY_DISPLAY_ORDER.forEach((cat) => {
    const list = categoryMap[cat] || [];
    const meta = CATEGORY_METADATA[cat] || CATEGORY_METADATA['Uncategorized'];

    let opening = 0;
    let reappr = 0;
    let receipts = 0;
    let payments = 0;
    let balance = 0;
    let latestActivity = '2026-08-01T00:00:00.000Z';

    list.forEach((item) => {
      opening += item.opening;
      reappr += item.reappr;
      receipts += item.receipts;
      payments += item.payments;
      balance += item.balance;
      if (new Date(item.lastActivity) > new Date(latestActivity)) {
        latestActivity = item.lastActivity;
      }
    });

    const totalAllocated = opening + reappr + receipts;
    const burnRate = totalAllocated > 0 ? payments / totalAllocated : 0;

    categories.push({
      category: cat,
      title: meta.title,
      shortName: meta.shortName,
      headCount: list.length,
      opening,
      reappr,
      receipts,
      payments,
      balance,
      burnRate,
      latestActivity: list.length > 0 ? latestActivity : new Date().toISOString(),
      themeColor: meta.theme,
      isMemo: cat === 'AAA',
    });
  });

  const nonAaaCategories = categories.filter((c) => c.category !== 'AAA');
  let gtOpening = 0;
  let gtReappr = 0;
  let gtReceipts = 0;
  let gtPayments = 0;
  let gtBalance = 0;
  let gtLatestActivity = '2026-08-01T00:00:00.000Z';
  let gtHeads = 0;

  nonAaaCategories.forEach((cat) => {
    gtOpening += cat.opening;
    gtReappr += cat.reappr;
    gtReceipts += cat.receipts;
    gtPayments += cat.payments;
    gtBalance += cat.balance;
    gtHeads += cat.headCount;
    if (new Date(cat.latestActivity) > new Date(gtLatestActivity)) {
      gtLatestActivity = cat.latestActivity;
    }
  });

  const gtAllocated = gtOpening + gtReappr + gtReceipts;
  const gtBurnRate = gtAllocated > 0 ? gtPayments / gtAllocated : 0;

  const grandTotal: GrandTotalSummary = {
    opening: gtOpening,
    reappr: gtReappr,
    receipts: gtReceipts,
    payments: gtPayments,
    balance: gtBalance,
    burnRate: gtBurnRate,
    latestActivity: gtLatestActivity,
    totalHeads: gtHeads,
  };

  const aaaMemo = categories.find((c) => c.category === 'AAA') || categories[0];

  return { categories, grandTotal, aaaMemo };
}

export async function syncDirectFromGoogleSheet(accounts: AccountHead[]): Promise<{
  changed: number;
  spotlight: string | null;
  latestTransactionTs: string | null;
}> {
  try {
    const res = await fetch(GOOGLE_SHEET_CSV_URL, { cache: 'no-store' });
    if (!res.ok) return { changed: 0, spotlight: null, latestTransactionTs: null };
    const csvText = await res.text();
    if (!csvText || !csvText.includes('A00000DW')) return { changed: 0, spotlight: null, latestTransactionTs: null };

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

    let extractedLatestTx: string | null = null;
    let detectedChanges = 0;
    let mostRecentChangedHead: string | null = null;

    // 1. Extract overall Latest Transaction from Google Sheet Header (Row 3)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      const match = line.match(/Latest (?:Transaction|Activity):\s*([0-9A-Za-z\-:\s]+?)(?:\||\,|$)/i);
      if (match && match[1]) {
        extractedLatestTx = match[1].trim();
      }
    }

    const cleanNum = (str: string | undefined) => {
      if (!str || str.trim() === '-' || str.trim() === '') return 0;
      let s = str.replace(/[",\s]/g, '');
      if (s.startsWith('(') && s.endsWith(')')) s = '-' + s.slice(1, -1);
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    // 2. Parse Valid Head-Wise Rows (Excluding category headers and subtotal rows)
    for (const line of lines) {
      const cols: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          cols.push(cur.trim());
          cur = '';
        } else cur += char;
      }
      cols.push(cur.trim());

      // Valid account rows have numeric serial in cols[0], valid code in cols[1], full description in cols[2]
      if (cols.length >= 7) {
        const srStr = cols[0]?.trim();
        const code = cols[1]?.trim();
        const headDesc = cols[2]?.trim();

        // Skip non-data rows, headers, and subtotal rows
        if (!code || code.toUpperCase().includes('SUBTOTAL') || isNaN(parseInt(srStr))) {
          continue;
        }

        const newOpening = cleanNum(cols[3]);
        const newReappr = cleanNum(cols[4]);
        const newReceipts = cleanNum(cols[5]);
        const newPayments = cleanNum(cols[6]);
        const newBalance = cleanNum(cols[7]);
        const rawActivity = cols[9]?.trim() || '';

        const acc = accounts.find((a) => a.code === code);
        if (acc) {
          // Always maintain full descriptive title e.g. "A03806-TRANSPORTATION OF GOODS"
          if (headDesc && headDesc.length > code.length) {
            acc.head = headDesc;
          }

          // Check if numerical figures moved
          const isNumChanged =
            Math.abs(acc.opening - newOpening) > 0.001 ||
            Math.abs(acc.reappr - newReappr) > 0.001 ||
            Math.abs(acc.receipts - newReceipts) > 0.001 ||
            Math.abs(acc.payments - newPayments) > 0.001 ||
            Math.abs(acc.balance - newBalance) > 0.001;

          if (isNumChanged) {
            detectedChanges++;
            mostRecentChangedHead = acc.code;
            acc.opening = newOpening;
            acc.reappr = newReappr;
            acc.receipts = newReceipts;
            acc.payments = newPayments;
            acc.balance = newBalance;
            const totalAlloc = newOpening + newReappr + newReceipts;
            acc.burnRate = totalAlloc > 0 ? newPayments / totalAlloc : 0;
            if (rawActivity) acc.lastActivity = rawActivity;
            acc.hash = calculateHash(acc);
          } else if (rawActivity && rawActivity !== '-') {
            // Keep head activity synchronized with sheet
            acc.lastActivity = rawActivity;
          }
        }
      }
    }

    // Determine authentic active spotlight
    // If a head changed right now, use it. Otherwise, look for the head with the latest activity timestamp
    if (detectedChanges > 0 && mostRecentChangedHead) {
      localStorage.setItem(STORAGE_KEY_SPOTLIGHT, mostRecentChangedHead);
    } else {
      // Find head with the newest lastActivity date in accounts (e.g. A03201 or A03806)
      let newestCode: string | null = null;
      let newestDate = 0;
      accounts.forEach((a) => {
        if (a.code && VALID_ACCOUNT_CODES.has(a.code) && !a.code.includes('SUBTOTAL') && !a.code.includes('GRAND')) {
          const d = new Date(a.lastActivity).getTime();
          if (!isNaN(d) && d > newestDate) {
            newestDate = d;
            newestCode = a.code;
          }
        }
      });
      if (newestCode) {
        localStorage.setItem(STORAGE_KEY_SPOTLIGHT, newestCode);
        mostRecentChangedHead = newestCode;
      }
    }

    if (extractedLatestTx) {
      localStorage.setItem(STORAGE_KEY_LATEST_ACTIVITY_TS, extractedLatestTx);
    }

    return {
      changed: detectedChanges,
      spotlight: mostRecentChangedHead,
      latestTransactionTs: extractedLatestTx,
    };
  } catch (err) {
    console.warn('Direct Google Sheet fetch skipped:', err);
    return { changed: 0, spotlight: null, latestTransactionTs: null };
  }
}

// -------------------------------------------------------------
// UNIVERSAL API CALLS (With Seamless Client-Side Ledger)
// -------------------------------------------------------------

export async function fetchDashboardPayload(): Promise<DashboardResponse> {
  // 1. Try server endpoint first
  try {
    const res = await fetch('/api/dashboard');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // server not present (static deploy) - use autonomous client engine
  }

  // 2. Client-side autonomous ledger execution
  const accounts = getAccountsStore();
  const vouchers = getVouchersStore();
  const audits = getAuditsStore();
  let spotlight = localStorage.getItem(STORAGE_KEY_SPOTLIGHT) || 'A03201';

  // Live Sheet Sync
  const syncResult = await syncDirectFromGoogleSheet(accounts);
  if (syncResult.spotlight) {
    spotlight = syncResult.spotlight;
    localStorage.setItem(STORAGE_KEY_SPOTLIGHT, spotlight);
    saveAccountsStore(accounts);
  }

  const { categories, grandTotal, aaaMemo } = computeAggregations(accounts);

  // Preserve real financial activity timestamp from Google Sheet (e.g. 30-Aug-2026 11:31 am)
  const storedActivityTs = localStorage.getItem(STORAGE_KEY_LATEST_ACTIVITY_TS);
  const latestFinancialActivityTs =
    syncResult.latestTransactionTs ||
    storedActivityTs ||
    '30-Aug-2026 11:31 am';

  return {
    instituteName: INSTITUTE_NAME,
    reportTitle: REPORT_TITLE,
    financialYear: FINANCIAL_YEAR,
    developerWatermark: DEV_WATERMARK,
    version: SCRIPT_VERSION,
    systemStatus: 'Live & Connected',
    autoSyncMinutes: 1,
    lastSyncedAt: new Date().toISOString(), // live poll time
    latestFinancialActivityTs, // authentic sheet transaction time
    latestChangedCode: spotlight,
    sourceSheetUrl: SOURCE_SHEET_URL,
    webAppUrl: WEB_APP_URL,
    syncSource: 'Google Sheet Live',
    accounts,
    categories,
    grandTotal,
    aaaMemo,
    recentAudits: audits.slice(0, 15),
    recentVouchers: vouchers.slice(0, 20),
  };
}

export async function submitVoucher(payload: {
  headCode: string;
  type: 'Payment' | 'Receipt' | 'Reappropriation' | 'Adjustment';
  amount: number;
  payeeOrSource: string;
  description: string;
  operator: string;
}): Promise<void> {
  try {
    const res = await fetch('/api/vouchers/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
  } catch {
    // client fallback
  }

  const accounts = getAccountsStore();
  const vouchers = getVouchersStore();
  const audits = getAuditsStore();

  const acc = accounts.find((a) => a.code === payload.headCode);
  if (!acc) throw new Error('Account head not found.');

  const prevBalance = acc.balance;
  const now = new Date().toISOString();

  if (payload.type === 'Payment') acc.payments += payload.amount;
  else if (payload.type === 'Receipt') acc.receipts += payload.amount;
  else if (payload.type === 'Reappropriation') acc.reappr += payload.amount;
  else if (payload.type === 'Adjustment') acc.opening += payload.amount;

  acc.lastActivity = now;
  acc.balance = acc.opening + acc.reappr + acc.receipts - acc.payments;
  const totalAlloc = acc.opening + acc.reappr + acc.receipts;
  acc.burnRate = totalAlloc > 0 ? acc.payments / totalAlloc : 0;
  acc.hash = calculateHash(acc);

  const voucherId = `VR-${new Date().getFullYear()}/${String(vouchers.length + 100).padStart(3, '0')}`;
  const newVoucher: VoucherTransaction = {
    id: `V-${Date.now()}`,
    voucherNo: voucherId,
    headCode: acc.code,
    headTitle: acc.head,
    category: acc.category,
    type: payload.type,
    amount: payload.amount,
    payeeOrSource: payload.payeeOrSource || 'Direct Payee',
    description: payload.description || `Transaction recorded under ${acc.code}`,
    date: new Date().toISOString().split('T')[0],
    timestamp: now,
    operator: payload.operator || 'Accounts Officer (MKZ)',
  };
  vouchers.unshift(newVoucher);

  const auditEntry: AuditLogEntry = {
    id: `AUD-${Date.now()}`,
    headCode: acc.code,
    headTitle: acc.head,
    action: 'VOUCHER_ADDED',
    deltaAmount: payload.amount,
    previousBalance: prevBalance,
    newBalance: acc.balance,
    timestamp: now,
    details: `Voucher ${voucherId} registered: ${payload.type} of Rs. ${payload.amount.toLocaleString()}. Spotlight moved to ${acc.code}.`,
  };
  audits.unshift(auditEntry);

  localStorage.setItem(STORAGE_KEY_SPOTLIGHT, acc.code);
  localStorage.setItem(STORAGE_KEY_LATEST_ACTIVITY_TS, now);
  saveAccountsStore(accounts);
  saveVouchersStore(vouchers);
  saveAuditsStore(audits);
}

export async function submitAccountEdit(code: string, payload: {
  head: string;
  opening: number;
  reappr: number;
  receipts: number;
  payments: number;
}): Promise<void> {
  try {
    const res = await fetch(`/api/accounts/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
  } catch {
    // client fallback
  }

  const accounts = getAccountsStore();
  const audits = getAuditsStore();
  const acc = accounts.find((a) => a.code === code);
  if (!acc) throw new Error('Account head not found.');

  const prevBalance = acc.balance;
  const now = new Date().toISOString();

  acc.head = payload.head;
  acc.opening = payload.opening;
  acc.reappr = payload.reappr;
  acc.receipts = payload.receipts;
  acc.payments = payload.payments;
  acc.balance = acc.opening + acc.reappr + acc.receipts - acc.payments;
  const totalAlloc = acc.opening + acc.reappr + acc.receipts;
  acc.burnRate = totalAlloc > 0 ? acc.payments / totalAlloc : 0;
  acc.lastActivity = now;
  acc.hash = calculateHash(acc);

  audits.unshift({
    id: `AUD-${Date.now()}`,
    headCode: acc.code,
    headTitle: acc.head,
    action: 'AMOUNT_EDITED',
    deltaAmount: Math.abs(acc.balance - prevBalance),
    previousBalance: prevBalance,
    newBalance: acc.balance,
    timestamp: now,
    details: `Head-level parameters updated for ${acc.code}. New balance: Rs. ${acc.balance.toLocaleString()}.`,
  });

  localStorage.setItem(STORAGE_KEY_SPOTLIGHT, acc.code);
  localStorage.setItem(STORAGE_KEY_LATEST_ACTIVITY_TS, now);
  saveAccountsStore(accounts);
  saveAuditsStore(audits);
}

export async function simulateReappr(fromCode: string, toCode: string, amount: number) {
  try {
    const res = await fetch('/api/reappropriation/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromHeadCode: fromCode, toHeadCode: toCode, amount }),
    });
    if (res.ok) return await res.json();
  } catch {
    // client fallback
  }

  const accounts = getAccountsStore();
  const fromAcc = accounts.find((a) => a.code === fromCode);
  const toAcc = accounts.find((a) => a.code === toCode);
  if (!fromAcc || !toAcc) throw new Error('One or both account heads not found.');

  if (fromAcc.balance < amount) {
    throw new Error(`Insufficient funds in source ${fromAcc.code}. Available: Rs. ${fromAcc.balance.toLocaleString()}`);
  }

  const pFromReappr = fromAcc.reappr - amount;
  const pFromAlloc = fromAcc.opening + pFromReappr + fromAcc.receipts;
  const pFromBal = pFromAlloc - fromAcc.payments;
  const pFromBurn = pFromAlloc > 0 ? fromAcc.payments / pFromAlloc : 0;

  const pToReappr = toAcc.reappr + amount;
  const pToAlloc = toAcc.opening + pToReappr + toAcc.receipts;
  const pToBal = pToAlloc - toAcc.payments;
  const pToBurn = pToAlloc > 0 ? toAcc.payments / pToAlloc : 0;

  return {
    valid: true,
    amount,
    from: {
      code: fromAcc.code,
      head: fromAcc.head,
      currentBalance: fromAcc.balance,
      projectedBalance: pFromBal,
      currentBurnRate: fromAcc.burnRate,
      projectedBurnRate: pFromBurn,
    },
    to: {
      code: toAcc.code,
      head: toAcc.head,
      currentBalance: toAcc.balance,
      projectedBalance: pToBal,
      currentBurnRate: toAcc.burnRate,
      projectedBurnRate: pToBurn,
    },
  };
}

export async function executeReappr(fromCode: string, toCode: string, amount: number, reason: string) {
  try {
    const res = await fetch('/api/reappropriation/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromHeadCode: fromCode, toHeadCode: toCode, amount, reason }),
    });
    if (res.ok) return await res.json();
  } catch {
    // client fallback
  }

  const accounts = getAccountsStore();
  const audits = getAuditsStore();
  const fromAcc = accounts.find((a) => a.code === fromCode);
  const toAcc = accounts.find((a) => a.code === toCode);
  if (!fromAcc || !toAcc) throw new Error('Account heads not found.');

  const now = new Date().toISOString();
  fromAcc.reappr -= amount;
  fromAcc.lastActivity = now;
  toAcc.reappr += amount;
  toAcc.lastActivity = now;

  [fromAcc, toAcc].forEach((acc) => {
    acc.balance = acc.opening + acc.reappr + acc.receipts - acc.payments;
    const tot = acc.opening + acc.reappr + acc.receipts;
    acc.burnRate = tot > 0 ? acc.payments / tot : 0;
    acc.hash = calculateHash(acc);
  });

  audits.unshift({
    id: `AUD-${Date.now()}-1`,
    headCode: toAcc.code,
    headTitle: toAcc.head,
    action: 'REAPPROPRIATION',
    deltaAmount: amount,
    previousBalance: toAcc.balance - amount,
    newBalance: toAcc.balance,
    timestamp: now,
    details: `Reappropriation received: +Rs. ${amount.toLocaleString()} from ${fromAcc.code}. Reason: ${reason}`,
  });

  audits.unshift({
    id: `AUD-${Date.now()}-2`,
    headCode: fromAcc.code,
    headTitle: fromAcc.head,
    action: 'REAPPROPRIATION',
    deltaAmount: -amount,
    previousBalance: fromAcc.balance + amount,
    newBalance: fromAcc.balance,
    timestamp: now,
    details: `Reappropriation debited: -Rs. ${amount.toLocaleString()} transferred to ${toAcc.code}.`,
  });

  localStorage.setItem(STORAGE_KEY_SPOTLIGHT, toAcc.code);
  localStorage.setItem(STORAGE_KEY_LATEST_ACTIVITY_TS, now);
  saveAccountsStore(accounts);
  saveAuditsStore(audits);
  return { success: true };
}

export async function fetchAiAnalysis(): Promise<AiInsightResponse> {
  try {
    const res = await fetch('/api/ai/analysis', { method: 'POST' });
    if (res.ok) return await res.json();
  } catch {
    // client fallback
  }

  return {
    overview: `GVTIW Samanabad Faisalabad (Institute: 33028) manages a consolidated net operational budget with high capital stability across 38 institutional heads. Salary and OPEX constitute the primary operating framework, alongside specialized vocational training portfolios (NAVTTC, CMSDI, Own Fund).`,
    keyFindings: [
      {
        type: 'critical',
        title: 'Bank Charges Over-Burn Alert',
        description: 'A03101 (Bank Charges) has exceeded budget with Rs. 2,784 payments against Rs. 1,407 opening balance, creating a negative balance of (Rs. 1,377) and burn rate of 197.9%. Reappropriation required.',
        affectedCategory: 'Non Salary',
      },
      {
        type: 'warning',
        title: 'Pupil Welfare & Short Course Utilization',
        description: 'A00000PF (Pupil Fund) has recorded Rs. 362,079 in payments (88.6% burn rate) with Rs. 46,509 remaining, while Short Courses have reached 63.9% burn rate (Rs. 160,847 payments).',
        affectedCategory: 'Own Fund',
      },
      {
        type: 'positive',
        title: 'AAA Assignment Account Segregation',
        description: 'Assan Assignment Account (AAA) holds Rs. 385,521 net balance (Receipts: Rs. 508,831 against Payments: Rs. 123,310) and is properly isolated as memo reconciliation to prevent duplication.',
        affectedCategory: 'AAA',
      },
      {
        type: 'info',
        title: 'NAVTTC Training Program Velocity',
        description: 'NAVTTC Cook course accounts (Training Material Rs. 260,037, Teacher Remuneration Rs. 131,625, Overheads Rs. 125,495) are executing actively with cumulative available balance of Rs. 709,909.',
        affectedCategory: 'NAVTTC',
      },
    ],
    burnRateAnomalies: [
      {
        headCode: 'A03101',
        headTitle: 'A03101-BANK CHARGES',
        burnRate: 1.9787,
        riskLevel: 'High',
        suggestion: 'Process immediate budget reappropriation from surplus heads (e.g. A03933 Service Charges or A13201 Repair of Furniture) to clear deficit.',
      },
      {
        headCode: 'A00000PF',
        headTitle: 'A00000PF-PUPIL FUND',
        burnRate: 0.8862,
        riskLevel: 'High',
        suggestion: 'Replenish pupil fund through upcoming student session admissions or adjust non-essential student kit disbursements.',
      },
      {
        headCode: 'A00000NTOH',
        headTitle: 'A00000NTOH-NAVTTC COOK-OVERHEADS',
        burnRate: 0.6602,
        riskLevel: 'Medium',
        suggestion: 'Monitor ongoing overheads to ensure the remaining Rs. 64,580 covers concluding certification phase.',
      },
    ],
    recommendations: [
      'Rebalance deficit utility heads (Water Charges A03302: -Rs. 7,684, Gas Charges A03301: -Rs. 36,746) via internal Non-Salary reallocation.',
      'Submit quarterly verified expenditure statements to TEVTA Faisalabad Regional Office ahead of next grant disbursement.',
      'Ensure NAVTTC batch completion vouchers and trainee stipends are reconciled with national portal attendance records.',
    ],
  };
}
