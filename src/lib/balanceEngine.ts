import {
  BankAccountKey,
  BankAccountMetadata,
  INSTITUTIONAL_BANK_ACCOUNTS,
  INITIAL_CASHBOOK_STATES,
  INITIAL_MASTER_VOUCHERS,
  CashBookAccountState,
  MasterVoucher,
} from '../data/cashBookData';
import {
  buildRawCashBookItems,
  parseDateToTimestamp,
  resolveBankKeyFromAccount,
} from './reportingEngine';

export interface BalanceEngineOptions {
  vouchers?: MasterVoucher[];
  cashBookStates?: Record<BankAccountKey, CashBookAccountState>;
  selectedFY?: string;
}

export interface PeriodFinancials {
  accountKey: BankAccountKey;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  transactionsCount: number;
}

/**
 * Normalizes any target date/month representation into a start-of-day timestamp
 */
export function normalizeDateToStartTimestamp(targetDate?: string | Date | null): number {
  if (!targetDate) return 0;
  if (targetDate instanceof Date) {
    return new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  }

  const s = String(targetDate).trim();
  if (!s || s.toUpperCase() === 'ALL') return 0;

  // Handle YYYY-MM format (e.g. '2026-08' -> '2026-08-01')
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [yearStr, monthStr] = s.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    return new Date(y, m - 1, 1).getTime();
  }

  // Month code aliases
  const upper = s.toUpperCase();
  if (upper === 'JUL' || upper === 'JULY') return new Date(2026, 6, 1).getTime();
  if (upper === 'AUG' || upper === 'AUGUST') return new Date(2026, 7, 1).getTime();
  if (upper === 'SEP' || upper === 'SEPTEMBER') return new Date(2026, 8, 1).getTime();
  if (upper === 'OCT' || upper === 'OCTOBER') return new Date(2026, 9, 1).getTime();
  if (upper === 'NOV' || upper === 'NOVEMBER') return new Date(2026, 10, 1).getTime();
  if (upper === 'DEC' || upper === 'DECEMBER') return new Date(2026, 11, 1).getTime();
  if (upper === 'Q1') return new Date(2026, 6, 1).getTime();
  if (upper === 'Q2') return new Date(2026, 9, 1).getTime();

  return parseDateToTimestamp(s);
}

/**
 * Normalizes any date representation into an end-of-day timestamp
 */
export function normalizeDateToEndTimestamp(targetDate?: string | Date | null): number {
  if (!targetDate) return Infinity;
  if (targetDate instanceof Date) {
    return new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999).getTime();
  }

  const s = String(targetDate).trim();
  if (!s || s.toUpperCase() === 'ALL') return Infinity;

  // Handle YYYY-MM format (e.g. '2026-08' -> end of August 2026)
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [yearStr, monthStr] = s.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    // Last day of month
    const nextMonth = new Date(y, m, 1);
    return nextMonth.getTime() - 1;
  }

  const startTs = parseDateToTimestamp(s);
  return startTs > 0 ? startTs + 86400000 - 1 : Infinity;
}

/**
 * SINGLE SOURCE OF TRUTH for Opening Balance Calculations.
 *
 * Calculates the exact running cash book balance as of the start of targetDate
 * (i.e. rolling forward the FY-start balance by summing all receipts and payments
 * occurring strictly before targetDate).
 *
 * @param account - BankAccountKey ('NS', 'PF', 'FC', 'SEC', 'SC', 'AA') or account string name
 * @param targetDate - Start date or month of the period (e.g. '2026-08-01', '01-Aug-2026', '2026-08')
 * @param options - Optional custom vouchers, cashBookStates, or selectedFY overrides
 * @returns Rolling running balance as of the day before targetDate
 */
export function getOpeningBalance(
  account: BankAccountKey | string,
  targetDate?: string | Date | null,
  options?: BalanceEngineOptions
): number {
  const key = resolveBankKeyFromAccount(account);
  const fromTs = normalizeDateToStartTimestamp(targetDate);

  // Resolve active states
  let cashBookStates = options?.cashBookStates;
  if (!cashBookStates) {
    try {
      const cached =
        localStorage.getItem('gvtiw_live_cashbook_states_v3') ||
        localStorage.getItem('gvtiw_tevta_live_cashbooks');
      if (cached) cashBookStates = JSON.parse(cached);
    } catch {}
  }
  if (!cashBookStates) {
    cashBookStates = INITIAL_CASHBOOK_STATES;
  }

  // Resolve vouchers
  let vouchers = options?.vouchers;
  if (!vouchers) {
    try {
      const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
      if (cached) vouchers = JSON.parse(cached);
    } catch {}
  }
  if (!vouchers) {
    vouchers = INITIAL_MASTER_VOUCHERS;
  }

  const meta: BankAccountMetadata = INSTITUTIONAL_BANK_ACCOUNTS[key] || {
    code: key,
    shortName: key,
    fullName: `Account ${key}`,
    accountNo: '—',
    bankName: 'The Bank of Punjab',
    branch: 'Samanabad Faisalabad',
    openingBalance: 0,
    themeColor: {
      primary: '#2563eb',
      bgLight: '#eff6ff',
      bgDark: '#1e3a8a',
      border: '#93c5fd',
      badge: '#bfdbfe',
    },
  };

  const baselineOpening =
    options?.selectedFY === '2025-26'
      ? (key === 'NS' ? 2387207.0 : meta.openingBalance || 0)
      : (cashBookStates[key]?.openingBalance ?? meta.openingBalance ?? 0);

  // If no period cutoff or before FY start, return baseline opening balance
  if (fromTs <= 0) {
    return baselineOpening;
  }

  // Build raw atomic cashbook items (same reference as Cashbook Statement in reportingEngine)
  const rawItems = buildRawCashBookItems(vouchers, cashBookStates);
  const items = rawItems[key] || [];

  let preRec = 0;
  let prePay = 0;

  for (const item of items) {
    if (item.dateTs < fromTs) {
      preRec += item.receipts;
      prePay += item.payments;
    }
  }

  return Math.round((baselineOpening + preRec - prePay) * 100) / 100;
}

/**
 * Calculates complete period financials (opening balance, in-period receipts/payments, and closing balance)
 */
export function getPeriodFinancials(
  account: BankAccountKey | string,
  fromDate?: string | Date | null,
  toDate?: string | Date | null,
  options?: BalanceEngineOptions
): PeriodFinancials {
  const key = resolveBankKeyFromAccount(account);
  const fromTs = normalizeDateToStartTimestamp(fromDate);
  const toTs = normalizeDateToEndTimestamp(toDate);

  // Resolve active states
  let cashBookStates = options?.cashBookStates;
  if (!cashBookStates) {
    try {
      const cached =
        localStorage.getItem('gvtiw_live_cashbook_states_v3') ||
        localStorage.getItem('gvtiw_tevta_live_cashbooks');
      if (cached) cashBookStates = JSON.parse(cached);
    } catch {}
  }
  if (!cashBookStates) {
    cashBookStates = INITIAL_CASHBOOK_STATES;
  }

  let vouchers = options?.vouchers;
  if (!vouchers) {
    try {
      const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
      if (cached) vouchers = JSON.parse(cached);
    } catch {}
  }
  if (!vouchers) {
    vouchers = INITIAL_MASTER_VOUCHERS;
  }

  const openingBal = getOpeningBalance(key, fromDate, {
    vouchers,
    cashBookStates,
    selectedFY: options?.selectedFY,
  });

  const rawItems = buildRawCashBookItems(vouchers, cashBookStates);
  const items = rawItems[key] || [];

  let periodRec = 0;
  let periodPay = 0;
  let count = 0;

  for (const item of items) {
    const isAfterFrom = fromTs <= 0 || item.dateTs >= fromTs;
    const isBeforeTo = item.dateTs <= toTs;

    if (isAfterFrom && isBeforeTo) {
      periodRec += item.receipts;
      periodPay += item.payments;
      count++;
    }
  }

  const closingBal = Math.round((openingBal + periodRec - periodPay) * 100) / 100;

  return {
    accountKey: key,
    openingBalance: openingBal,
    totalReceipts: Math.round(periodRec * 100) / 100,
    totalPayments: Math.round(periodPay * 100) / 100,
    closingBalance: closingBal,
    transactionsCount: count,
  };
}
