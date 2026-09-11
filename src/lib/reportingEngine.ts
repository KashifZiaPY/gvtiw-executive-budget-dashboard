import {
  BankAccountKey,
  BankAccountMetadata,
  INSTITUTIONAL_BANK_ACCOUNTS,
  INITIAL_CASHBOOK_STATES,
  AUTHENTIC_CASHBOOK_RECEIPTS,
  CashBookAccountState,
  CashBookEntry,
  MasterVoucher,
} from '../data/cashBookData';
import { AccountHead, OFFICIAL_SIGNATORIES } from '../types';
import { INITIAL_ACCOUNTS } from '../data/initialData';
import { format12HourDate, formatPakistaniDate } from './formatters';
import { formatHeadToHtml } from '../components/AccountHeadTag';

export interface CashBookStatementRow {
  id: string;
  srNo: number | string;
  date: string;
  accountKey: string;
  voucherNo: string;
  paidToBy: string;
  accountHead: string;
  particulars: string;
  billNo?: string;
  billDate?: string;
  chequeNo: string;
  receipts: number;
  payments: number;
  balance: number;
  entryType?: 'OPENING' | 'RECEIPT' | 'PAYMENT' | 'SUBTOTAL' | 'GRAND_TOTAL' | 'CLOSING';
  isOpening?: boolean;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  isClosing?: boolean;
}

export interface CashBookAccountGroup {
  accountKey: BankAccountKey;
  meta: BankAccountMetadata;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  rows: CashBookStatementRow[];
}

export interface CashBookStatementData {
  title: string;
  subtitle: string;
  accountNoText: string;
  generatedTimestamp: string;
  periodLabel: string;
  fromDate?: string;
  toDate?: string;
  totalTransactionsCount: number;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  isConsolidated: boolean;
  groups: CashBookAccountGroup[];
  allRows: CashBookStatementRow[];
}

export interface HeadExpenditureGroup {
  headCode: string;
  headName: string;
  allocationOpening: number;
  receiptsReappr: number;
  totalExpenditure: number;
  closingUnspentBalance: number;
  rows: CashBookStatementRow[];
}

export interface HeadExpenditureStatementData {
  title: string;
  subtitle: string;
  headCodeText: string;
  generatedTimestamp: string;
  periodLabel: string;
  fromDate?: string;
  toDate?: string;
  totalTransactionsCount: number;
  budgetAllocationOpening: number;
  receiptsReappr: number;
  totalExpenditure: number;
  closingUnspentBalance: number;
  isGroupedAllHeads: boolean;
  groups: HeadExpenditureGroup[];
  allRows: CashBookStatementRow[];
}

/**
 * Format currency with exact 2 decimal places and standard commas
 * e.g. 2387207 -> "2,387,207.00"
 */
export function formatCurrency2Decimals(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNeg ? `(${formatted})` : formatted;
}

/**
 * Resolve standard bank account key from any string representation
 */
export function resolveBankKeyFromAccount(accountStr?: string): BankAccountKey {
  const s = (accountStr || '').toUpperCase();
  if (s.includes('NON SALARY') || s.includes('NON-SALARY') || s.includes('NS')) return 'NS';
  if (s.includes('PUPIL') || s.includes('PF')) return 'PF';
  if (s.includes('FEE') || s.includes('TFC') || s.includes('FC')) return 'FC';
  if (s.includes('SECURIT') || s.includes('SEC')) return 'SEC';
  if (s.includes('SHORT') || s.includes('SC')) return 'SC';
  if (s.includes('AAA') || s.includes('DISTRICT') || s.includes('AA')) return 'AA';
  return 'NS';
}

/**
 * Robust date parser handling DD-MMM-YYYY, YYYY-MM-DD, and standard strings
 */
export function parseDateToTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const year = parseInt(s.substring(0, 4), 10);
    const month = parseInt(s.substring(5, 7), 10);
    const day = parseInt(s.substring(8, 10), 10);
    return new Date(year, month - 1, day).getTime();
  }
  const parts = s.split(/[-/ ]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const m = months[monthStr.slice(0, 3)];
    if (!isNaN(day) && m !== undefined && !isNaN(year)) {
      return new Date(year, m, day).getTime();
    }
  }
  const parsed = Date.parse(s);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format timestamp into standard Pakistani official audit date e.g. "05-Sep-2026 05:43 PM"
 */
export function formatGeneratedTimestamp(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = String(hours).padStart(2, '0');
  return `${day}-${month}-${year} ${hh}:${minutes} ${ampm}`;
}

/**
 * Helper to build standard Period label
 */
export function buildPeriodLabel(fromDate?: string, toDate?: string): string {
  if (fromDate && toDate) {
    return `${formatPakistaniDate(fromDate)} to ${formatPakistaniDate(toDate)}`;
  }
  if (fromDate) {
    return `From ${formatPakistaniDate(fromDate)} onwards`;
  }
  if (toDate) {
    return `Up to ${formatPakistaniDate(toDate)}`;
  }
  return 'All Dates (Full Cash Book History)';
}

/**
 * Checks if voucher is a Bank Charge
 */
export function isBankChargeVoucher(v: MasterVoucher): boolean {
  if ((v.voucherNo || '').startsWith('BC-')) return true;
  if ((v.billNo || '').toUpperCase() === 'DIRECT DEBIT') return true;
  if ((v.payeeName || '').toLowerCase().includes('bank charge')) return true;
  if ((v.accountHead || '').toUpperCase().includes('A03101-BANK CHARGES')) return true;
  return false;
}

/**
 * Check if a transaction has a valid, assigned cheque number
 * (i.e. not blank, dash, zero, or placeholder)
 */
export function hasValidChequeNo(chq?: string): boolean {
  if (!chq) return false;
  const t = chq.trim().toLowerCase();
  if (
    !t ||
    t === '—' ||
    t === '–' ||
    t === '-' ||
    t === '0' ||
    t === 'n/a' ||
    t === 'none' ||
    t === 'nil'
  ) {
    return false;
  }
  return true;
}

/**
 * Decomposes master vouchers and receipts into atomic cashbook transaction items
 */
export function buildRawCashBookItems(
  vouchers: MasterVoucher[],
  cashBookStates: Record<BankAccountKey, CashBookAccountState>
): Record<BankAccountKey, Array<{
  id: string;
  date: string;
  dateTs: number;
  srNo: number;
  voucherNo: string;
  paidToBy: string;
  accountHead: string;
  particulars: string;
  billNo?: string;
  billDate?: string;
  chequeNo: string;
  chequeDate?: string;
  chequeDateTs?: number;
  receipts: number;
  payments: number;
}>> {
  const result: Record<BankAccountKey, any[]> = {
    NS: [],
    PF: [],
    FC: [],
    SEC: [],
    SC: [],
    AA: [],
  };

  // 1. Collect receipts from cashBookStates
  for (const key of Object.keys(result) as BankAccountKey[]) {
    const st = cashBookStates[key];
    if (st && st.entries) {
      for (const e of st.entries) {
        if (e.entryType === 'RECEIPT' && e.receipts > 0) {
          // Exclude incomplete entries rather than substituting fake fallback values
          if (!e.date?.trim() || !e.particulars?.trim() || !e.accountHead?.trim()) {
            console.warn('[ReportingEngine] Excluding incomplete receipt entry:', e);
            continue;
          }

          result[key].push({
            id: e.id || `${key}-REC-${Math.random()}`,
            date: e.date,
            dateTs: parseDateToTimestamp(e.date),
            srNo: e.srNo || 0,
            voucherNo: e.voucherSerial || '—',
            paidToBy: e.paidToBy || 'Collection / Deposit',
            accountHead: e.accountHead,
            particulars: e.particulars,
            billNo: '',
            billDate: '',
            chequeNo: e.chequeNo || '—',
            chequeDate: e.date || '',
            chequeDateTs: parseDateToTimestamp(e.date),
            receipts: e.receipts,
            payments: 0,
          });
        }
      }
    }
  }

  // 2. Decompose active vouchers into cashbook components
  for (const v of vouchers) {
    const key = resolveBankKeyFromAccount(v.bankAccount);
    const dateStr = v.chequeDate || v.billDate || '03-Jul-2026';
    const dateTs = parseDateToTimestamp(dateStr);
    const vNoStr = v.voucherNo || `V#${v.srNo}`;

    if (isBankChargeVoucher(v)) {
      const chargeAmt = v.billAmountGross || v.chequeAmountNet || 0;
      if (chargeAmt > 0) {
        result[key].push({
          id: `${key}-BC-${v.srNo}`,
          date: dateStr,
          dateTs,
          srNo: v.srNo,
          voucherNo: vNoStr,
          paidToBy: 'Bank Charges',
          accountHead:
            v.accountHead ||
            (key === 'AA'
              ? 'A03101-BANK CHARGES-AAA'
              : key === 'PF'
              ? 'A00000PF-PUPIL FUND'
              : key === 'SC'
              ? 'A00000SC-SHORT COURSE'
              : key === 'SEC'
              ? 'A00000SS-STUDENT SEC.'
              : key === 'FC'
              ? 'A00000TFC-TEVTA FEE COL.'
              : 'A03101-BANK CHARGES-NS'),
          particulars: v.description || 'Bank Service Charge',
          billNo: '',
          billDate: v.billDate || '',
          chequeNo: '—',
          chequeDate: v.chequeDate || v.billDate || '',
          chequeDateTs: parseDateToTimestamp(v.chequeDate || v.billDate || dateStr),
          receipts: 0,
          payments: chargeAmt,
        });
      }
    } else {
      // Net Cheque to Vendor
      if (v.chequeAmountNet > 0) {
        result[key].push({
          id: `${key}-NET-${v.srNo}`,
          date: dateStr,
          dateTs,
          srNo: v.srNo,
          voucherNo: vNoStr,
          paidToBy: v.payeeName,
          accountHead: v.accountHead,
          particulars: v.description,
          billNo: v.billNo || '',
          billDate: v.billDate || '',
          chequeNo: v.chequeNoNet || '—',
          chequeDate: v.chequeDate || '',
          chequeDateTs: parseDateToTimestamp(v.chequeDate || dateStr),
          receipts: 0,
          payments: v.chequeAmountNet,
        });
      }

      // Income Tax Withheld
      if (v.incomeTaxAmount > 0) {
        result[key].push({
          id: `${key}-IT-${v.srNo}`,
          date: dateStr,
          dateTs,
          srNo: v.srNo,
          voucherNo: vNoStr,
          paidToBy: 'Income Tax',
          accountHead: v.accountHead,
          particulars: v.description,
          billNo: v.billNo || '',
          billDate: v.billDate || '',
          chequeNo: v.chequeNoIncomeTax || '—',
          chequeDate: v.chequeDate || '',
          chequeDateTs: parseDateToTimestamp(v.chequeDate || dateStr),
          receipts: 0,
          payments: v.incomeTaxAmount,
        });
      }

      // PRA Tax Withheld
      if (v.praAmount > 0) {
        result[key].push({
          id: `${key}-PRA-${v.srNo}`,
          date: dateStr,
          dateTs,
          srNo: v.srNo,
          voucherNo: vNoStr,
          paidToBy: 'PRA Tax',
          accountHead: v.accountHead,
          particulars: v.description,
          billNo: v.billNo || '',
          billDate: v.billDate || '',
          chequeNo: v.chequeNoPra || '—',
          chequeDate: v.chequeDate || '',
          chequeDateTs: parseDateToTimestamp(v.chequeDate || dateStr),
          receipts: 0,
          payments: v.praAmount,
        });
      }
    }
  }

  // 3. Sort entries chronologically for each bank account
  for (const key of Object.keys(result) as BankAccountKey[]) {
    result[key].sort((a, b) => {
      if (a.dateTs !== b.dateTs) return a.dateTs - b.dateTs;
      if (a.srNo !== b.srNo) return a.srNo - b.srNo;
      return a.id.localeCompare(b.id);
    });
  }

  return result;
}

/**
 * GENERATE AUTHORITATIVE CASH BOOK STATEMENT DATA
 * Supporting single account view and consolidated grouped view
 */
export function generateCashBookStatementData(
  vouchers: MasterVoucher[],
  cashBookStates: Record<BankAccountKey, CashBookAccountState>,
  selectedBank: string,
  fromDate?: string,
  toDate?: string
): CashBookStatementData {
  const rawItems = buildRawCashBookItems(vouchers, cashBookStates);
  const isConsolidated = selectedBank === 'ALL';
  const fromTs = fromDate ? parseDateToTimestamp(fromDate) : 0;
  const toTs = toDate ? parseDateToTimestamp(toDate) + 86400000 - 1 : Infinity;

  const targetKeys: BankAccountKey[] = isConsolidated
    ? ['NS', 'PF', 'FC', 'SEC', 'SC', 'AA']
    : [resolveBankKeyFromAccount(selectedBank)];

  const groups: CashBookAccountGroup[] = [];
  const allRows: CashBookStatementRow[] = [];

  let grandOpening = 0;
  let grandReceipts = 0;
  let grandPayments = 0;
  let totalTxCount = 0;

  for (const key of targetKeys) {
    const meta: BankAccountMetadata = INSTITUTIONAL_BANK_ACCOUNTS[key] || {
      key,
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

    const baselineOpening = cashBookStates[key]?.openingBalance ?? meta.openingBalance;
    const items = rawItems[key] || [];

    // Separate pre-period items (before fromDate) from in-period items
    let preRec = 0;
    let prePay = 0;
    const inPeriodItems: typeof items = [];

    for (const item of items) {
      if (fromTs > 0 && item.dateTs < fromTs) {
        preRec += item.receipts;
        prePay += item.payments;
      } else if (item.dateTs <= toTs) {
        inPeriodItems.push(item);
      }
    }

    // In Consolidated view, sort each bank group's transaction rows by:
    // Primary sort key: Date (chronological, ascending) — this is the main ordering.
    // Within the same date, if multiple transactions share that date, break ties in this order:
    // 1. Cheque# (ascending) — entries with a cheque# sort before entries without one, on the same date
    // 2. Then Cheque Date (ascending), if needed
    // 3. Then Voucher# (ascending), if still tied
    //
    // Entries with no cheque# (e.g. Bank Charges) fall into their correct chronological position by date.
    // Single-bank and all other reports keep their existing chronological sort order.
    if (isConsolidated) {
      inPeriodItems.sort((a, b) => {
        // Primary sort key: Date (chronological, ascending)
        if (a.dateTs !== b.dateTs) {
          return a.dateTs - b.dateTs;
        }

        // Within the same date:
        // 1. Cheque# (ascending) — entries with a cheque# sort before entries without one, on the same date
        const hasA = hasValidChequeNo(a.chequeNo);
        const hasB = hasValidChequeNo(b.chequeNo);

        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;

        if (hasA && hasB) {
          const chqA = (a.chequeNo || '').trim();
          const chqB = (b.chequeNo || '').trim();
          if (chqA !== chqB) {
            const chqCmp = chqA.localeCompare(chqB, undefined, { numeric: true, sensitivity: 'base' });
            if (chqCmp !== 0) return chqCmp;
          }
        }

        // 2. Then Cheque Date (ascending), if needed
        const chqDateTsA = a.chequeDateTs ?? a.dateTs;
        const chqDateTsB = b.chequeDateTs ?? b.dateTs;
        if (chqDateTsA !== chqDateTsB) {
          return chqDateTsA - chqDateTsB;
        }

        // 3. Then Voucher# (ascending), if still tied
        const vNoA = (a.voucherNo || '').trim();
        const vNoB = (b.voucherNo || '').trim();
        if (vNoA !== vNoB) {
          const vCmp = vNoA.localeCompare(vNoB, undefined, { numeric: true, sensitivity: 'base' });
          if (vCmp !== 0) return vCmp;
        }

        // Stable fallback for identical date, cheque, chequeDate, and voucher
        if (a.srNo !== b.srNo) {
          return a.srNo - b.srNo;
        }
        return (a.id || '').localeCompare(b.id || '');
      });
    }

    const effectiveOpening = baselineOpening + preRec - prePay;
    let runningBal = effectiveOpening;
    let accReceipts = 0;
    let accPayments = 0;

    const groupRows: CashBookStatementRow[] = [];

    // Calculate running balance row by row
    for (let i = 0; i < inPeriodItems.length; i++) {
      const item = inPeriodItems[i];
      accReceipts += item.receipts;
      accPayments += item.payments;
      runningBal = runningBal + item.receipts - item.payments;

      const row: CashBookStatementRow = {
        id: item.id,
        srNo: i + 1,
        date: item.date,
        accountKey: key,
        voucherNo: item.voucherNo,
        paidToBy: item.paidToBy,
        accountHead: item.accountHead,
        particulars: item.particulars,
        billNo: item.billNo || '',
        billDate: item.billDate || '',
        chequeNo: item.chequeNo,
        receipts: item.receipts,
        payments: item.payments,
        balance: Math.round(runningBal * 100) / 100,
        entryType: item.receipts > 0 ? 'RECEIPT' : 'PAYMENT',
      };
      groupRows.push(row);
      allRows.push(row);
    }

    const accClosing = Math.round(runningBal * 100) / 100;

    // Only include groups with either transactions, opening balance, or when explicitly selected
    if (!isConsolidated || groupRows.length > 0 || Math.abs(effectiveOpening) > 0) {
      groups.push({
        accountKey: key,
        meta,
        openingBalance: Math.round(effectiveOpening * 100) / 100,
        totalReceipts: Math.round(accReceipts * 100) / 100,
        totalPayments: Math.round(accPayments * 100) / 100,
        closingBalance: accClosing,
        rows: groupRows,
      });

      grandOpening += effectiveOpening;
      grandReceipts += accReceipts;
      grandPayments += accPayments;
      totalTxCount += groupRows.length;
    }
  }

  // Adjust grandOpening in consolidated view if we have the reference screenshot baseline
  const roundedGrandOpening = Math.round(grandOpening * 100) / 100;
  const roundedGrandReceipts = Math.round(grandReceipts * 100) / 100;
  const roundedGrandPayments = Math.round(grandPayments * 100) / 100;
  const roundedGrandClosing = Math.round((roundedGrandOpening + roundedGrandReceipts - roundedGrandPayments) * 100) / 100;

  let title = 'CONSOLIDATED CASH BOOK STATEMENT';
  let subtitle = 'All Bank Accounts (Grouped by Cash Book)';
  let accountNoText = 'All Bank Accounts (Grouped by Cash Book)';

  if (!isConsolidated && groups.length > 0) {
    const singleMeta = groups[0].meta;
    title = `${singleMeta.shortName} — CASH BOOK STATEMENT`;
    subtitle = singleMeta.fullName;
    accountNoText = `Bank Account No: ${singleMeta.accountNo}`;
  }

  return {
    title,
    subtitle,
    accountNoText,
    generatedTimestamp: formatGeneratedTimestamp(),
    periodLabel: buildPeriodLabel(fromDate, toDate),
    fromDate,
    toDate,
    totalTransactionsCount: totalTxCount,
    openingBalance: roundedGrandOpening,
    totalReceipts: roundedGrandReceipts,
    totalPayments: roundedGrandPayments,
    closingBalance: roundedGrandClosing,
    isConsolidated,
    groups,
    allRows,
  };
}

/**
 * GENERATE HEAD EXPENDITURE STATEMENT DATA
 * Supporting single budget head view and grouped all heads view
 * Reconciles both Sanctioned Budget Allocations, Receipts/Grants, and Payments
 */
export function generateHeadExpenditureStatementData(
  vouchers: MasterVoucher[],
  accountsStore: AccountHead[],
  selectedHead: string,
  selectedBank: string,
  fromDate?: string,
  toDate?: string,
  searchQuery?: string,
  cashBookStates?: Record<BankAccountKey, CashBookAccountState>
): HeadExpenditureStatementData {
  const isGroupedAllHeads = selectedHead === 'ALL';
  const fromTs = fromDate ? parseDateToTimestamp(fromDate) : 0;
  const toTs = toDate ? parseDateToTimestamp(toDate) + 86400000 - 1 : Infinity;

  // Use live accounts store or fallback
  const canonicalAccounts = accountsStore && accountsStore.length > 0 ? accountsStore : INITIAL_ACCOUNTS;

  // Build target list of heads
  let targetHeads: AccountHead[] = [];
  if (isGroupedAllHeads) {
    targetHeads = [...canonicalAccounts];
  } else {
    const selLower = selectedHead.trim().toLowerCase();

    // 1. Direct exact match by head name or code
    let matched = canonicalAccounts.filter(
      (a) => a.head.trim().toLowerCase() === selLower || a.code.trim().toLowerCase() === selLower
    );

    // 2. If no direct match, try matching by code prefix or head prefix
    if (matched.length === 0) {
      matched = canonicalAccounts.filter(
        (a) =>
          a.code.trim().toLowerCase().startsWith(selLower) ||
          a.head.trim().toLowerCase().includes(selLower) ||
          selLower.startsWith(a.code.trim().toLowerCase())
      );
    }

    // 3. Disambiguate if multiple matches (e.g. A03302 vs A03302-AA)
    if (matched.length > 1) {
      if (selLower.includes('-ns') || selLower.includes('non salary') || selLower.endsWith('ns')) {
        const nsOnly = matched.filter(
          (a) => a.category === 'Non Salary' || a.head.toUpperCase().includes('-NS')
        );
        if (nsOnly.length > 0) matched = nsOnly;
      } else if (selLower.includes('-aa') || selLower.includes('aaa') || selLower.endsWith('aa')) {
        const aaaOnly = matched.filter(
          (a) =>
            a.category === 'AAA' ||
            a.code.toUpperCase().endsWith('-AA') ||
            a.head.toUpperCase().includes('AAA')
        );
        if (aaaOnly.length > 0) matched = aaaOnly;
      }
    }

    targetHeads = matched.length > 0 ? matched : canonicalAccounts.filter((a) => a.head.toLowerCase() === selLower);
  }

  // Apply search query filter if provided
  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    targetHeads = targetHeads.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.head.toLowerCase().includes(q) ||
        (a.category && a.category.toLowerCase().includes(q))
    );
  }

  const groups: HeadExpenditureGroup[] = [];
  const allRows: CashBookStatementRow[] = [];

  let grandAllocation = 0;
  let grandReceiptsReappr = 0;
  let grandExpenditure = 0;
  let totalTxCount = 0;

  // Collect all receipts across bank states or fallback
  const allAvailableReceipts: Array<{
    id: string;
    date: string;
    month: string;
    vNo?: string;
    voucherSerial?: string;
    particulars: string;
    paidToBy: string;
    head: string;
    chequeNo: string;
    receipts: number;
    accountKey: BankAccountKey;
  }> = [];

  const bankKeysToScan: BankAccountKey[] = ['NS', 'PF', 'FC', 'SEC', 'SC', 'AA'];

  for (const bKey of bankKeysToScan) {
    if (cashBookStates && cashBookStates[bKey]?.entries && cashBookStates[bKey].entries.length > 0) {
      for (const e of cashBookStates[bKey].entries) {
        if (e.entryType === 'RECEIPT' && e.receipts > 0) {
          allAvailableReceipts.push({
            id: e.id,
            date: e.date,
            month: e.month || 'July',
            vNo: e.vNo,
            voucherSerial: e.voucherSerial,
            particulars: e.particulars || '',
            paidToBy: e.paidToBy || '',
            head: e.accountHead || '',
            chequeNo: e.chequeNo || '',
            receipts: e.receipts,
            accountKey: bKey,
          });
        }
      }
    } else {
      // Fallback to authentic baseline receipts
      const recs = AUTHENTIC_CASHBOOK_RECEIPTS[bKey] || [];
      for (const r of recs) {
        allAvailableReceipts.push({
          id: r.id,
          date: r.date,
          month: r.month,
          vNo: r.vNo,
          voucherSerial: r.voucherSerial,
          particulars: r.particulars || '',
          paidToBy: r.paidToBy || '',
          head: r.head || '',
          chequeNo: r.chq || '',
          receipts: r.amount,
          accountKey: bKey,
        });
      }
    }
  }

  for (const acc of targetHeads) {
    const accCodeUpper = acc.code.toUpperCase().trim();
    const accHeadUpper = acc.head.toUpperCase().trim();
    const accCatUpper = (acc.category || '').toUpperCase().trim();

    // Account Type Disambiguation
    const isAAAAccount =
      accCatUpper === 'AAA' ||
      accCodeUpper.endsWith('-AA') ||
      accHeadUpper.includes('-AAA') ||
      accHeadUpper.endsWith('AAA');

    const isPlacementAccount =
      accCatUpper === 'PLACEMENT' ||
      accCodeUpper.endsWith('-P') ||
      accHeadUpper.startsWith('PLACEMENT');

    const isNSAccount =
      accCatUpper === 'NON SALARY' ||
      (!isAAAAccount && !isPlacementAccount && (accHeadUpper.includes('-NS') || accHeadUpper.endsWith('-NS') || accCodeUpper.startsWith('A03') || accCodeUpper.startsWith('A13')));

    const isNavttcAccount =
      accCatUpper === 'NAVTTC' ||
      accHeadUpper.includes('NAVTTC');

    // Base code without suffixes (e.g. 'A03302' from 'A03302-AA' or 'A03302')
    const baseCode = accCodeUpper.replace(/-AA$|-P$/i, '').trim();

    // Clean title keyword (e.g. 'WATER CHARGES')
    let headTitleOnly = '';
    if (acc.head.includes('-')) {
      const parts = acc.head.split('-');
      headTitleOnly = parts.length > 2 ? parts[parts.length - 1] : parts[1];
    } else {
      headTitleOnly = acc.head;
    }
    headTitleOnly = headTitleOnly.replace(/\b(NS|AAA|AA|PLACEMENT|GOVT|TEVTA)\b/gi, '').trim().toUpperCase();

    // 1. Collect all payment vouchers matching this head & bank
    const allHeadVouchers = vouchers.filter((v) => {
      // Respect selected bank filter
      if (selectedBank !== 'ALL' && !v.bankAccount.includes(selectedBank)) {
        return false;
      }

      const vHeadUpper = (v.accountHead || '').toUpperCase().trim();
      const vBankUpper = (v.bankAccount || '').toUpperCase().trim();
      const vNoUpper = (v.voucherNo || '').toUpperCase().trim();

      // Classify the voucher
      const isVoucherAAA =
        vBankUpper.includes('PAYMENT OF AAA') ||
        vBankUpper.includes('ASSAN ASSIGNMENT') ||
        vBankUpper.includes('AAA') ||
        vNoUpper.startsWith('AA-') ||
        vHeadUpper.includes('-AA') ||
        vHeadUpper.includes('-AAA') ||
        vHeadUpper.endsWith('AAA');

      const isVoucherPlacement =
        vHeadUpper.includes('-P') ||
        vHeadUpper.startsWith('PLACEMENT');

      const isVoucherNS =
        !isVoucherAAA &&
        !isVoucherPlacement &&
        (vBankUpper.includes('NON SALARY') ||
         vBankUpper.includes('NS') ||
         vNoUpper.startsWith('NS-') ||
         vHeadUpper.includes('-NS'));

      // STRICT ISOLATION RULES:
      // AAA Accounts ONLY accept AAA vouchers
      if (isAAAAccount && !isVoucherAAA) return false;

      // Non-Salary Accounts MUST NEVER accept AAA or Placement vouchers
      if (isNSAccount && (isVoucherAAA || isVoucherPlacement)) return false;

      // Placement Accounts ONLY accept Placement vouchers
      if (isPlacementAccount && !isVoucherPlacement) return false;

      // NAVTTC Accounts DO NOT accept AAA or Non Salary vouchers
      if (isNavttcAccount && (isVoucherAAA || isVoucherNS)) return false;

      // Direct exact match
      if (vHeadUpper === accHeadUpper) return true;

      // Direct code match (ensuring no suffix confusion)
      if (vHeadUpper.startsWith(accCodeUpper) || (accCodeUpper.length >= 4 && vHeadUpper.includes(accCodeUpper))) {
        if (isNSAccount && (vHeadUpper.includes('-AA') || vHeadUpper.includes('AAA'))) {
          return false;
        }
        return true;
      }

      // Base code or keyword match for AAA vouchers
      if (isAAAAccount && isVoucherAAA) {
        if (vHeadUpper.includes(baseCode)) return true;
        if (headTitleOnly.length >= 4 && vHeadUpper.includes(headTitleOnly)) return true;
      }

      // Base code or keyword match for Non-Salary vouchers
      if (isNSAccount && !isVoucherAAA) {
        if (
          (vHeadUpper.includes(baseCode) || (headTitleOnly.length >= 4 && vHeadUpper.includes(headTitleOnly))) &&
          !vHeadUpper.includes('-AA') &&
          !vHeadUpper.includes('AAA')
        ) {
          return true;
        }
      }

      return false;
    });

    // 2. Collect all receipts matching this head
    const allHeadReceipts = allAvailableReceipts.filter((r) => {
      const rHeadUpper = (r.head || '').toUpperCase().trim();
      const rPartUpper = (r.particulars || '').toUpperCase().trim();
      const rChqUpper = (r.chequeNo || '').toUpperCase().trim();
      const rVNoUpper = (r.vNo || '').toUpperCase().trim();

      // Classify the receipt
      const isReceiptAAA =
        r.accountKey === 'AA' ||
        rPartUpper.includes('AAA-CEILING') ||
        rPartUpper.includes('ASSAN ASSIGNMENT') ||
        rPartUpper.includes('AAA') ||
        rHeadUpper.includes('-AA') ||
        rHeadUpper.includes('-AAA') ||
        rHeadUpper.endsWith('AAA') ||
        rChqUpper.includes('AAA') ||
        rVNoUpper.startsWith('AA-');

      const isReceiptPlacement =
        rHeadUpper.includes('-P') ||
        rHeadUpper.startsWith('PLACEMENT') ||
        rPartUpper.includes('PLACEMENT');

      const isReceiptNS =
        r.accountKey === 'NS' ||
        (!isReceiptAAA && !isReceiptPlacement && (rPartUpper.includes('NON SALARY') || rHeadUpper.includes('-NS')));

      // STRICT ISOLATION RULES:
      // AAA Accounts ONLY accept AAA receipts
      if (isAAAAccount && !isReceiptAAA) return false;

      // Non-Salary Accounts MUST NEVER accept AAA or Placement receipts
      if (isNSAccount && (isReceiptAAA || isReceiptPlacement)) return false;

      // Placement Accounts ONLY accept Placement receipts
      if (isPlacementAccount && !isReceiptPlacement) return false;

      // Bank account filter condition for receipts
      if (selectedBank !== 'ALL') {
        const targetBankKey = resolveBankKeyFromAccount(selectedBank);
        if (isAAAAccount && targetBankKey !== 'AA') return false;
        if (isNSAccount && targetBankKey !== 'NS') return false;
        if (r.accountKey !== targetBankKey) return false;
      }

      // Direct exact match
      if (rHeadUpper === accHeadUpper) return true;

      // Exact code match
      if (rHeadUpper.startsWith(accCodeUpper) || (accCodeUpper.length >= 4 && rHeadUpper.includes(accCodeUpper))) {
        if (isNSAccount && (rHeadUpper.includes('-AA') || rHeadUpper.includes('AAA'))) {
          return false;
        }
        return true;
      }

      // Base code or title keyword matching for AAA receipts
      if (isAAAAccount && isReceiptAAA) {
        if (
          rHeadUpper.includes(baseCode) ||
          rPartUpper.includes(baseCode) ||
          (headTitleOnly.length >= 4 && (rHeadUpper.includes(headTitleOnly) || rPartUpper.includes(headTitleOnly)))
        ) {
          return true;
        }
      }

      // Base code or title keyword matching for Non-Salary receipts
      if (isNSAccount && !isReceiptAAA) {
        if (
          (rHeadUpper.includes(baseCode) || rPartUpper.includes(baseCode) ||
           (headTitleOnly.length >= 4 && (rHeadUpper.includes(headTitleOnly) || rPartUpper.includes(headTitleOnly)))) &&
          !rHeadUpper.includes('-AA') &&
          !rHeadUpper.includes('AAA') &&
          !rPartUpper.includes('AAA')
        ) {
          return true;
        }
      }

      // Special institutional receipts
      const matchBankSpecific =
        (acc.code === 'A00000PF' && (r.accountKey === 'PF' || rPartUpper.includes('PUPIL'))) ||
        (acc.code === 'A00000SC' && (r.accountKey === 'SC' || rPartUpper.includes('SHORT COURSE'))) ||
        (acc.code === 'A00000SS' && (r.accountKey === 'SEC' || rPartUpper.includes('SECURITY'))) ||
        (acc.code === 'A00000TFC' && (r.accountKey === 'FC' || rPartUpper.includes('FEE'))) ||
        (acc.code === 'A00000AA' && r.accountKey === 'AA');

      if (matchBankSpecific) return true;

      return false;
    });

    // 3. Separate into pre-period and in-period
    let prePeriodExpenditure = 0;
    let prePeriodReceipts = 0;

    interface UnifiedTx {
      id: string;
      date: string;
      accountKey: string;
      voucherNo: string;
      paidToBy: string;
      accountHead: string;
      particulars: string;
      billNo?: string;
      billDate?: string;
      chequeNo: string;
      receipts: number;
      payments: number;
      entryType: 'RECEIPT' | 'PAYMENT';
      timestamp: number;
    }

    const inPeriodTransactions: UnifiedTx[] = [];

    // Process Receipts
    for (const r of allHeadReceipts) {
      const rTs = parseDateToTimestamp(r.date);
      if (fromTs > 0 && rTs < fromTs) {
        prePeriodReceipts += r.receipts;
      } else if (rTs <= toTs) {
        inPeriodTransactions.push({
          id: `HEAD-${acc.code}-REC-${r.id || Math.random().toString(36).substring(2, 7)}`,
          date: r.date,
          accountKey: r.accountKey,
          voucherNo: r.vNo || r.voucherSerial || 'RECEIPT',
          paidToBy: r.paidToBy || 'Govt. / TEVTA / Trainees',
          accountHead: acc.head,
          particulars: r.particulars,
          chequeNo: r.chequeNo || '—',
          receipts: r.receipts,
          payments: 0,
          entryType: 'RECEIPT',
          timestamp: rTs,
        });
      }
    }

    // Process Payments
    for (const v of allHeadVouchers) {
      const vDateStr = v.chequeDate || v.billDate || '03-Jul-2026';
      const vTs = parseDateToTimestamp(vDateStr);
      const amt = v.billAmountGross || v.chequeAmountNet || 0;

      if (fromTs > 0 && vTs < fromTs) {
        prePeriodExpenditure += amt;
      } else if (vTs <= toTs) {
        const bankKey = resolveBankKeyFromAccount(v.bankAccount);
        inPeriodTransactions.push({
          id: `HEAD-${acc.code}-V${v.srNo}`,
          date: vDateStr,
          accountKey: bankKey,
          voucherNo: v.voucherNo || `VR-2026/${v.srNo}`,
          paidToBy: v.payeeName,
          accountHead: v.accountHead || acc.head,
          particulars: v.description,
          billNo: v.billNo,
          billDate: v.billDate,
          chequeNo: v.chequeNoNet || '—',
          receipts: 0,
          payments: amt,
          entryType: 'PAYMENT',
          timestamp: vTs,
        });
      }
    }

    // Sort unified transactions chronologically
    inPeriodTransactions.sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      // If same date, receipts credit before payments debit
      if (a.entryType === 'RECEIPT' && b.entryType === 'PAYMENT') return -1;
      if (a.entryType === 'PAYMENT' && b.entryType === 'RECEIPT') return 1;
      return 0;
    });

    const allocation = acc.opening || 0;
    const effectiveOpeningAllocation = allocation + prePeriodReceipts - prePeriodExpenditure;
    let runningBudget = effectiveOpeningAllocation;
    let inPeriodReceiptsSum = 0;
    let inPeriodExpenditureSum = 0;

    const groupRows: CashBookStatementRow[] = [];

    for (let i = 0; i < inPeriodTransactions.length; i++) {
      const tx = inPeriodTransactions[i];
      if (tx.entryType === 'RECEIPT') {
        inPeriodReceiptsSum += tx.receipts;
        runningBudget += tx.receipts;
      } else {
        inPeriodExpenditureSum += tx.payments;
        runningBudget -= tx.payments;
      }

      const row: CashBookStatementRow = {
        id: tx.id,
        srNo: i + 1,
        date: tx.date,
        accountKey: tx.accountKey,
        voucherNo: tx.voucherNo,
        paidToBy: tx.paidToBy,
        accountHead: tx.accountHead,
        particulars: tx.particulars,
        billNo: tx.billNo,
        billDate: tx.billDate,
        chequeNo: tx.chequeNo,
        receipts: tx.receipts,
        payments: tx.payments,
        balance: Math.round(runningBudget * 100) / 100,
        entryType: tx.entryType,
      };
      groupRows.push(row);
      allRows.push(row);
    }

    const closingUnspent = Math.round(runningBudget * 100) / 100;

    // In grouped mode, include heads with allocation or in-period/pre-period activity
    if (
      !isGroupedAllHeads ||
      groupRows.length > 0 ||
      Math.abs(allocation) > 0 ||
      prePeriodExpenditure > 0 ||
      prePeriodReceipts > 0
    ) {
      groups.push({
        headCode: acc.code,
        headName: acc.head,
        allocationOpening: Math.round(effectiveOpeningAllocation * 100) / 100,
        receiptsReappr: Math.round(inPeriodReceiptsSum * 100) / 100,
        totalExpenditure: Math.round(inPeriodExpenditureSum * 100) / 100,
        closingUnspentBalance: closingUnspent,
        rows: groupRows,
      });

      grandAllocation += effectiveOpeningAllocation;
      grandReceiptsReappr += inPeriodReceiptsSum;
      grandExpenditure += inPeriodExpenditureSum;
      totalTxCount += groupRows.length;
    }
  }

  const grandClosing = Math.round((grandAllocation + grandReceiptsReappr - grandExpenditure) * 100) / 100;

  let title = 'HEAD-WISE EXPENDITURE STATEMENT';
  let subtitle = searchQuery ? `Filtered by Search: "${searchQuery}"` : 'All Sanctioned Budget Heads (Grouped by Head of Account)';
  let headCodeText = 'Consolidated Budget Heads • Financial Year 2026-27';

  if (!isGroupedAllHeads && groups.length > 0) {
    const single = groups[0];
    title = `${single.headCode} — HEAD EXPENDITURE STATEMENT`;
    subtitle = single.headName;
    headCodeText = `Budget Head Code: ${single.headCode} • FY 2026-27`;
  }

  return {
    title,
    subtitle,
    headCodeText,
    generatedTimestamp: formatGeneratedTimestamp(),
    periodLabel: buildPeriodLabel(fromDate, toDate),
    fromDate,
    toDate,
    totalTransactionsCount: totalTxCount,
    budgetAllocationOpening: Math.round(grandAllocation * 100) / 100,
    receiptsReappr: Math.round(grandReceiptsReappr * 100) / 100,
    totalExpenditure: Math.round(grandExpenditure * 100) / 100,
    closingUnspentBalance: grandClosing,
    isGroupedAllHeads,
    groups,
    allRows,
  };
}

export interface MultiHeadReportResult {
  isMultiHead: boolean;
  selectedHeads: string[];
  selectedHeadCodes: string[];
  grandTotal: {
    budgetAllocationOpening: number;
    receiptsReappr: number;
    totalExpenditure: number;
    closingUnspentBalance: number;
    totalTransactionsCount: number;
  };
  headReports: HeadExpenditureStatementData[];
}

/**
 * THIN WRAPPER FOR MULTI-HEAD EXPENDITURE STATEMENTS:
 * 1. Calls the existing single-head calc function (generateHeadExpenditureStatementData) once per selected head.
 * 2. Sums the four totals across those results for the grand total card.
 * 3. Preserves the list ordering from accountsStore (dropdown order, not selection order).
 */
export function generateMultiHeadExpenditureStatementData(
  vouchers: MasterVoucher[],
  accountsStore: AccountHead[],
  selectedHeads: string[],
  selectedBank: string,
  fromDate?: string,
  toDate?: string,
  searchQuery?: string,
  cashBookStates?: Record<BankAccountKey, CashBookAccountState>
): MultiHeadReportResult {
  const canonicalAccounts = accountsStore && accountsStore.length > 0 ? accountsStore : INITIAL_ACCOUNTS;

  // Filter out any 'ALL' sentinel
  const headsToProcess = selectedHeads.filter((h) => h !== 'ALL');

  // Order the selected heads in the exact order they appear in canonicalAccounts (dropdown order)
  const orderedHeads: string[] = [];
  for (const acc of canonicalAccounts) {
    if (
      headsToProcess.some(
        (sh) =>
          sh.trim().toLowerCase() === acc.head.trim().toLowerCase() ||
          sh.trim().toLowerCase() === acc.code.trim().toLowerCase()
      )
    ) {
      orderedHeads.push(acc.head);
    }
  }

  // Any head that didn't match canonicalAccounts directly is appended
  for (const sh of headsToProcess) {
    if (!orderedHeads.some((oh) => oh.trim().toLowerCase() === sh.trim().toLowerCase())) {
      orderedHeads.push(sh);
    }
  }

  // Call the existing single-head calc function once per selected head
  const headReports: HeadExpenditureStatementData[] = orderedHeads.map((headKey) => {
    return generateHeadExpenditureStatementData(
      vouchers,
      accountsStore,
      headKey,
      selectedBank,
      fromDate,
      toDate,
      searchQuery,
      cashBookStates
    );
  });

  // Sum the four totals across those results for the grand total card
  let grandAllocation = 0;
  let grandReceipts = 0;
  let grandExpenditure = 0;
  let grandTransactions = 0;

  for (const r of headReports) {
    grandAllocation += r.budgetAllocationOpening;
    grandReceipts += r.receiptsReappr;
    grandExpenditure += r.totalExpenditure;
    grandTransactions += r.totalTransactionsCount;
  }

  const grandClosing = Math.round((grandAllocation + grandReceipts - grandExpenditure) * 100) / 100;

  const selectedHeadCodes = headReports.map(
    (hr) => hr.groups[0]?.headCode || hr.title.split(' — ')[0] || ''
  ).filter(Boolean);

  return {
    isMultiHead: headReports.length >= 2,
    selectedHeads: orderedHeads,
    selectedHeadCodes,
    grandTotal: {
      budgetAllocationOpening: Math.round(grandAllocation * 100) / 100,
      receiptsReappr: Math.round(grandReceipts * 100) / 100,
      totalExpenditure: Math.round(grandExpenditure * 100) / 100,
      closingUnspentBalance: grandClosing,
      totalTransactionsCount: grandTransactions,
    },
    headReports,
  };
}

/**
 * Formats Bill/Invoice # and Bill Date for Cash Book Statement & Head Expenditure display.
 * Returns formatted string like "Bill/Invoice#: 199 (27-Jun-2026)" or "Bill/Invoice#: N/A".
 */
export function formatCashBookBillInfo(billNo?: string, billDate?: string): string {
  const bNo = (billNo || '').trim();
  const bDate = (billDate || '').trim();

  const isNoBill =
    !bNo ||
    ['N/A', 'NONE', 'NIL', '—', '-', '0', 'BC', 'DIRECT DEBIT'].includes(bNo.toUpperCase());

  if (isNoBill) {
    return 'Bill/Invoice#: N/A';
  }

  const prefix = bNo.toLowerCase().startsWith('bill/invoice#') ? '' : 'Bill/Invoice#: ';

  if (bDate) {
    return `${prefix}${bNo} (${bDate})`;
  }
  return `${prefix}${bNo}`;
}

/**
 * GENERATE OFFICIAL A4 LANDSCAPE PRINT / PDF HTML TEMPLATE
 * Incorporates dual logos (TEVTA & GVTI(W)) on top, 4 KPI cards, running balances, and signatures
 */
export function generateOfficialStatementPrintHtml(params: {
  reportType: 'CASHBOOK' | 'HEAD' | 'GENERAL';
  title: string;
  subtitle: string;
  accountOrHeadInfo: string;
  generatedTimestamp: string;
  periodLabel: string;
  totalTransactionsCount: number;
  kpiCards: Array<{
    label: string;
    amount: number;
    color: string;
    bgColor: string;
    borderColor: string;
  }>;
  tableHeaders: string[];
  isGrouped: boolean;
  openingRow?: {
    date: string;
    acct: string;
    description: string;
    balance: number;
  };
  groups: Array<{
    headerTitle: string;
    rows: CashBookStatementRow[];
    subtotalReceipts?: number;
    subtotalPayments?: number;
    subtotalBalance?: number;
  }>;
  grandTotals: {
    receipts: number;
    payments: number;
  };
  closingRow: {
    label: string;
    formulaText: string;
    balance: number;
  };
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
}): string {
  const gvtiwLogoSrc = params.customGvtiwLogo || '/gvtiw-logo.jpg';
  const tevtaLogoSrc = params.customTevtaLogo || '/tevta-logo.png';

  // Build KPI Cards HTML
  const kpiCardsHtml = params.kpiCards
    .map(
      (kpi) => `
    <div style="border: 1px solid ${kpi.borderColor}; border-radius: 6px; padding: 7px 10px; background-color: ${kpi.bgColor}; text-align: center;">
      <span style="display: block; font-size: 8.5px; text-transform: uppercase; font-weight: 800; color: #475569; letter-spacing: 0.5px;">${kpi.label}</span>
      <strong style="display: block; font-size: 13px; font-family: monospace; font-weight: 900; color: ${kpi.color}; margin-top: 3px;">Rs. ${formatCurrency2Decimals(kpi.amount)}</strong>
    </div>
  `
    )
    .join('');

  // Build Table Rows HTML
  let rowsHtml = '';

  // 1. Opening Balance Row
  if (params.openingRow) {
    rowsHtml += `
      <tr style="background-color: #f8fafc; font-weight: bold; border-bottom: 1px solid #cbd5e1;">
        <td style="text-align: center; padding: 5px; border: 1px solid #cbd5e1; font-family: monospace; color: #64748b;">—</td>
        <td style="padding: 5px; border: 1px solid #cbd5e1; white-space: nowrap; font-family: monospace;">${params.openingRow.date}</td>
        <td style="text-align: center; padding: 5px; border: 1px solid #cbd5e1;">
          <span style="background-color: #e2e8f0; color: #0f172a; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: 800;">${params.openingRow.acct}</span>
        </td>
        <td style="text-align: center; padding: 5px; border: 1px solid #cbd5e1; color: #64748b;">—</td>
        <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: 800; color: #003399;">${params.openingRow.description}</td>
        <td style="padding: 5px; border: 1px solid #cbd5e1; color: #64748b; font-size: 8.5px;">—</td>
        <td style="padding: 5px; border: 1px solid #cbd5e1; color: #64748b;">—</td>
        <td style="text-align: center; padding: 5px; border: 1px solid #cbd5e1; color: #64748b;">—</td>
        <td style="text-align: right; padding: 5px; border: 1px solid #cbd5e1; color: #64748b;">—</td>
        <td style="text-align: right; padding: 5px; border: 1px solid #cbd5e1; color: #64748b;">—</td>
        <td style="text-align: right; padding: 5px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0f172a;">${formatCurrency2Decimals(params.openingRow.balance)}</td>
      </tr>
    `;
  }

  // 2. Groups
  let globalSr = 1;
  for (const group of params.groups) {
    if (params.isGrouped) {
      rowsHtml += `
        <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold;">
          <td colspan="11" style="padding: 6px 8px; font-size: 9.5px; letter-spacing: 0.5px; border: 1px solid #0f172a;">
            ${group.headerTitle}
          </td>
        </tr>
      `;
    }

    for (const r of group.rows) {
      const recText = r.receipts > 0 ? formatCurrency2Decimals(r.receipts) : '—';
      const payText = r.payments > 0 ? formatCurrency2Decimals(r.payments) : '—';
      const balText = formatCurrency2Decimals(r.balance);

      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="text-align: center; padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; color: #64748b;">${globalSr++}</td>
          <td style="padding: 4px; border: 1px solid #cbd5e1; white-space: nowrap; font-family: monospace;">${r.date}</td>
          <td style="text-align: center; padding: 4px; border: 1px solid #cbd5e1;">
            <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #1e293b; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold;">${r.accountKey}</span>
          </td>
          <td style="padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #1d4ed8; white-space: nowrap;">${r.voucherNo}</td>
          <td style="padding: 4px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">${r.paidToBy}</td>
          <td style="padding: 4px; border: 1px solid #cbd5e1; font-size: 8.5px; color: #334155;">${formatHeadToHtml(r.accountHead)}</td>
          <td style="padding: 4px; border: 1px solid #cbd5e1; font-size: 8.5px; word-break: break-word;">
            <div style="font-weight: 600; color: #0f172a; line-height: 1.25;">${r.particulars}</div>
            ${(params.reportType === 'CASHBOOK' || params.reportType === 'HEAD') ? `<div style="font-family: monospace; font-size: 7.5px; color: #0f172a; font-weight: normal; line-height: 1.2; margin-top: 2px;">${formatCashBookBillInfo(r.billNo, r.billDate)}</div>` : ''}
          </td>
          <td style="text-align: center; padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 8.5px;">${r.chequeNo}</td>
          <td style="text-align: right; padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #15803d;">${recText}</td>
          <td style="text-align: right; padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #dc2626;">${payText}</td>
          <td style="text-align: right; padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0b2545;">${balText}</td>
        </tr>
      `;
    }

    // Subtotal Row for this group (in consolidated / grouped view)
    if (params.isGrouped && group.subtotalPayments !== undefined) {
      rowsHtml += `
        <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 1px solid #94a3b8; border-bottom: 2px solid #64748b;">
          <td colspan="8" style="text-align: right; padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 900; text-transform: uppercase;">
            SUBTOTAL — ${group.headerTitle.split('•')[0].replace(/🏛️|👥|📋/g, '').trim()}:
          </td>
          <td style="text-align: right; padding: 5px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 900; color: #15803d;">
            ${formatCurrency2Decimals(group.subtotalReceipts || 0)}
          </td>
          <td style="text-align: right; padding: 5px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 900; color: #dc2626;">
            ${formatCurrency2Decimals(group.subtotalPayments || 0)}
          </td>
          <td style="text-align: right; padding: 5px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 900; color: #0b2545;">
            ${formatCurrency2Decimals(group.subtotalBalance || 0)}
          </td>
        </tr>
      `;
    }
  }

  // 3. Grand Totals Row
  rowsHtml += `
    <tr style="background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: 1px solid #0f172a;">
      <td colspan="8" style="text-align: right; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">
        GRAND TOTALS (Rs.):
      </td>
      <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10.5px; font-weight: 900; color: #15803d;">
        ${formatCurrency2Decimals(params.grandTotals.receipts)}
      </td>
      <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10.5px; font-weight: 900; color: #dc2626;">
        ${formatCurrency2Decimals(params.grandTotals.payments)}
      </td>
      <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; color: #64748b; font-size: 10px;">—</td>
    </tr>
  `;

  // 4. Closing Balance Row
  rowsHtml += `
    <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a;">
      <td colspan="5" style="text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10px; font-weight: 900; color: #003399; text-transform: uppercase;">
        ${params.closingRow.label}
      </td>
      <td colspan="5" style="text-align: right; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 8.5px; color: #64748b; font-style: italic;">
        ${params.closingRow.formulaText}
      </td>
      <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px; font-weight: 900; color: #0b2545;">
        ${formatCurrency2Decimals(params.closingRow.balance)}
      </td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${params.title} — GVTI(W) Samanabad</title>
        <style>
          @page { size: A4 landscape; margin: 7mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 8px;
            font-size: 9px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-header-wrap {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5px solid #0b2545;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .logo-container {
            width: 58px;
            height: 58px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo-container img {
            max-width: 56px;
            max-height: 56px;
            object-fit: contain;
          }
          .header-text-block {
            text-align: center;
            flex: 1;
            padding: 0 10px;
          }
          .header-text-block h1 {
            font-size: 15px;
            margin: 0;
            font-weight: 900;
            color: #002b66;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-text-block .sub1 {
            font-size: 9px;
            font-weight: 700;
            color: #475569;
            margin: 2px 0 0 0;
          }
          .header-text-block .statement-title {
            font-size: 12.5px;
            font-weight: 900;
            color: #0f172a;
            margin: 3px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-text-block .acct-text {
            font-size: 9.5px;
            font-weight: 800;
            color: #1e3a8a;
            font-family: monospace;
            margin: 1px 0 0 0;
          }
          .meta-side-box {
            text-align: right;
            font-size: 8.5px;
            line-height: 1.4;
            color: #334155;
            font-family: monospace;
            min-width: 170px;
          }
          .meta-side-box strong {
            color: #0f172a;
          }
          .kpi-cards-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
          }
          th {
            background-color: #0b2545;
            color: #ffffff;
            padding: 5px 4px;
            font-size: 8.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: 1px solid #0b2545;
          }
          .signatures-container {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sig-column {
            width: 28%;
            text-align: center;
            border-top: 1.5px solid #475569;
            padding-top: 5px;
          }
          .sig-column strong {
            display: block;
            font-size: 9.5px;
            color: #0f172a;
          }
          .sig-column span {
            font-size: 8.5px;
            color: #475569;
          }
          .official-footer-strip {
            margin-top: 15px;
            padding-top: 4px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 7.5px;
            color: #64748b;
            font-family: monospace;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <!-- Header Strip with Dual Logos -->
        <div class="report-header-wrap">
          <div class="logo-container">
            <img src="${gvtiwLogoSrc}" alt="GVTIW Logo" onerror="this.style.display='none'" />
          </div>

          <div class="header-text-block">
            <h1>GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W)</h1>
            <p class="sub1">Samanabad, Faisalabad • Accounts & Finance Wing</p>
            <p class="statement-title">${params.title}</p>
            <p class="acct-text">${params.accountOrHeadInfo}</p>
          </div>

          <div class="logo-container">
            <img src="${tevtaLogoSrc}" alt="TEVTA Logo" onerror="this.style.display='none'" />
          </div>

          <div class="meta-side-box">
            <div>Generated: <strong>${params.generatedTimestamp}</strong></div>
            <div>Period: <strong>${params.periodLabel}</strong></div>
            <div>Total Transactions: <strong>${params.totalTransactionsCount}</strong></div>
          </div>
        </div>

        <!-- 4 Metric KPI Cards -->
        <div class="kpi-cards-grid">
          ${kpiCardsHtml}
        </div>

        <!-- Official Financial Data Table -->
        <table>
          <thead>
            <tr>
              ${params.tableHeaders.map((th) => `<th>${th}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Signatures Block -->
        <div class="signatures-container">
          ${OFFICIAL_SIGNATORIES.map((sig) => `
            <div class="sig-column">
              <strong style="text-transform: uppercase;">${sig.name}</strong>
              <span style="font-weight: 600; color: #334155; display: block;">${sig.role}</span>
              <span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-top: 1px;">${sig.label}</span>
            </div>
          `).join('')}
        </div>

        <!-- Watermark Footer -->
        <div class="official-footer-strip">
          <div>Voucher / Cashbook Management System • Generated by Kashif Zia (Accounts Deptt.) • Version 3.14</div>
          <div>Government Vocational Training Institute (W) Samanabad, Faisalabad</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * GENERATE OFFICIAL A4 LANDSCAPE PRINT / PDF HTML TEMPLATE FOR MULTI-HEAD CONSOLIDATED REPORT
 * Renders Grand Total summary card at the top, followed by each head's full section with its own
 * opening balance B/D, voucher transactions, and closing balance C/D.
 */
export function generateMultiHeadStatementPrintHtml(params: {
  multiHeadData: MultiHeadReportResult;
  periodLabel: string;
  generatedTimestamp: string;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
}): string {
  const gvtiwLogoSrc = params.customGvtiwLogo || '/gvtiw-logo.jpg';
  const tevtaLogoSrc = params.customTevtaLogo || '/tevta-logo.png';
  const { multiHeadData, periodLabel, generatedTimestamp } = params;

  // Build Grand Total 4 KPI Boxes
  const grandKpiHtml = `
    <div style="border: 1.5px solid #94a3b8; border-radius: 6px; padding: 7px 10px; background-color: #f8fafc; text-align: center;">
      <span style="display: block; font-size: 8.5px; text-transform: uppercase; font-weight: 800; color: #475569; letter-spacing: 0.5px;">GRAND BUDGET ALLOCATION (B/D)</span>
      <strong style="display: block; font-size: 13px; font-family: monospace; font-weight: 900; color: #0b2545; margin-top: 3px;">Rs. ${formatCurrency2Decimals(multiHeadData.grandTotal.budgetAllocationOpening)}</strong>
    </div>
    <div style="border: 1.5px solid #86efac; border-radius: 6px; padding: 7px 10px; background-color: #f0fdf4; text-align: center;">
      <span style="display: block; font-size: 8.5px; text-transform: uppercase; font-weight: 800; color: #166534; letter-spacing: 0.5px;">TOTAL RECEIPTS / REAPPR (+)</span>
      <strong style="display: block; font-size: 13px; font-family: monospace; font-weight: 900; color: #15803d; margin-top: 3px;">Rs. ${formatCurrency2Decimals(multiHeadData.grandTotal.receiptsReappr)}</strong>
    </div>
    <div style="border: 1.5px solid #fca5a5; border-radius: 6px; padding: 7px 10px; background-color: #fef2f2; text-align: center;">
      <span style="display: block; font-size: 8.5px; text-transform: uppercase; font-weight: 800; color: #991b1b; letter-spacing: 0.5px;">TOTAL EXPENDITURE (-)</span>
      <strong style="display: block; font-size: 13px; font-family: monospace; font-weight: 900; color: #b91c1c; margin-top: 3px;">Rs. ${formatCurrency2Decimals(multiHeadData.grandTotal.totalExpenditure)}</strong>
    </div>
    <div style="border: 1.5px solid #93c5fd; border-radius: 6px; padding: 7px 10px; background-color: #eff6ff; text-align: center;">
      <span style="display: block; font-size: 8.5px; text-transform: uppercase; font-weight: 800; color: #1e40af; letter-spacing: 0.5px;">NET UNSPENT CLOSING (C/D)</span>
      <strong style="display: block; font-size: 13px; font-family: monospace; font-weight: 900; color: #1d4ed8; margin-top: 3px;">Rs. ${formatCurrency2Decimals(multiHeadData.grandTotal.closingUnspentBalance)}</strong>
    </div>
  `;

  // Build each Head's Section HTML
  const headSectionsHtml = multiHeadData.headReports.map((hr, idx) => {
    const headCode = hr.groups[0]?.headCode || hr.title.split(' — ')[0];
    const headTitle = hr.subtitle || hr.groups[0]?.headName || hr.title;

    // Per-head 4 KPI boxes
    const perHeadKpiHtml = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px;">
        <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; background-color: #f8fafc; text-align: center;">
          <span style="display: block; font-size: 7.5px; text-transform: uppercase; font-weight: 700; color: #64748b;">ALLOCATION (B/D)</span>
          <strong style="display: block; font-size: 11px; font-family: monospace; font-weight: 900; color: #0b2545;">Rs. ${formatCurrency2Decimals(hr.budgetAllocationOpening)}</strong>
        </div>
        <div style="border: 1px solid #bbf7d0; border-radius: 4px; padding: 4px 6px; background-color: #f0fdf4; text-align: center;">
          <span style="display: block; font-size: 7.5px; text-transform: uppercase; font-weight: 700; color: #166534;">RECEIPTS (+)</span>
          <strong style="display: block; font-size: 11px; font-family: monospace; font-weight: 900; color: #15803d;">Rs. ${formatCurrency2Decimals(hr.receiptsReappr)}</strong>
        </div>
        <div style="border: 1px solid #fecaca; border-radius: 4px; padding: 4px 6px; background-color: #fef2f2; text-align: center;">
          <span style="display: block; font-size: 7.5px; text-transform: uppercase; font-weight: 700; color: #991b1b;">EXPENDITURE (-)</span>
          <strong style="display: block; font-size: 11px; font-family: monospace; font-weight: 900; color: #b91c1c;">Rs. ${formatCurrency2Decimals(hr.totalExpenditure)}</strong>
        </div>
        <div style="border: 1px solid #bfdbfe; border-radius: 4px; padding: 4px 6px; background-color: #eff6ff; text-align: center;">
          <span style="display: block; font-size: 7.5px; text-transform: uppercase; font-weight: 700; color: #1e40af;">CLOSING (C/D)</span>
          <strong style="display: block; font-size: 11px; font-family: monospace; font-weight: 900; color: #1d4ed8;">Rs. ${formatCurrency2Decimals(hr.closingUnspentBalance)}</strong>
        </div>
      </div>
    `;

    // Per-head table rows
    let perHeadRowsHtml = '';
    let perHeadSr = 1;

    // Opening row
    perHeadRowsHtml += `
      <tr class="opening-row">
        <td class="center font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">—</td>
        <td class="center font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">${hr.fromDate || '—'}</td>
        <td class="center font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">ALL</td>
        <td class="center font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">—</td>
        <td class="font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">SANCTIONED BUDGET ALLOCATION</td>
        <td class="font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">${headCode}</td>
        <td style="padding: 4px; border: 1px solid #cbd5e1; font-size: 8px; color: #475569;">Brought Forward Sanctioned Grant Allocation (B/D)</td>
        <td class="center font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">—</td>
        <td class="center font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">—</td>
        <td class="center font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">—</td>
        <td class="right font-mono font-bold text-navy" style="padding: 4px; border: 1px solid #cbd5e1;">Rs. ${formatCurrency2Decimals(hr.budgetAllocationOpening)}</td>
      </tr>
    `;

    // Voucher line items
    if (hr.allRows.length === 0) {
      perHeadRowsHtml += `
        <tr>
          <td colspan="11" class="center italic" style="padding: 10px; color: #64748b;">
            No In-Period Transactions Registered for this Head • Expenditure: Rs. 0.00 • Closing Balance remains at Brought Forward figure.
          </td>
        </tr>
      `;
    } else {
      hr.allRows.forEach((r) => {
        const recText = r.receipts > 0 ? formatCurrency2Decimals(r.receipts) : '—';
        const payText = r.payments > 0 ? formatCurrency2Decimals(r.payments) : '—';
        const balText = formatCurrency2Decimals(r.balance);

        perHeadRowsHtml += `
          <tr>
            <td class="center font-mono" style="padding: 4px; border: 1px solid #cbd5e1; color: #64748b;">${perHeadSr++}</td>
            <td class="center font-mono" style="padding: 4px; border: 1px solid #cbd5e1; white-space: nowrap;">${r.date}</td>
            <td class="center font-mono" style="padding: 4px; border: 1px solid #cbd5e1;">${r.accountKey}</td>
            <td class="center font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1; color: #1d4ed8;">${r.voucherNo || '—'}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; font-weight: bold;">${r.paidToBy || '—'}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; font-size: 8px;">${r.accountHead || '—'}</td>
            <td style="padding: 4px; border: 1px solid #cbd5e1; font-size: 8px;">
              <div style="font-weight: 600; color: #0f172a;">${r.particulars || ''}</div>
              <div style="font-family: monospace; font-size: 7px; color: #0284c7; margin-top: 1px;">${formatCashBookBillInfo(r.billNo, r.billDate)}</div>
            </td>
            <td class="center font-mono" style="padding: 4px; border: 1px solid #cbd5e1;">${r.chequeNo || '—'}</td>
            <td class="right font-mono text-emerald" style="padding: 4px; border: 1px solid #cbd5e1;">${recText}</td>
            <td class="right font-mono text-rose" style="padding: 4px; border: 1px solid #cbd5e1;">${payText}</td>
            <td class="right font-mono font-bold" style="padding: 4px; border: 1px solid #cbd5e1;">${balText}</td>
          </tr>
        `;
      });
    }

    // Subtotal / Closing row for this head
    perHeadRowsHtml += `
      <tr class="subtotal-row">
        <td colspan="8" class="right font-bold uppercase" style="font-size: 8px; padding: 4px 8px; border: 1px solid #cbd5e1;">SUBTOTAL — ${headCode}:</td>
        <td class="right font-mono font-bold text-emerald" style="padding: 4px; border: 1px solid #cbd5e1;">Rs. ${formatCurrency2Decimals(hr.receiptsReappr)}</td>
        <td class="right font-mono font-bold text-rose" style="padding: 4px; border: 1px solid #cbd5e1;">Rs. ${formatCurrency2Decimals(hr.totalExpenditure)}</td>
        <td class="right font-mono font-bold text-navy" style="padding: 4px; border: 1px solid #cbd5e1;">Rs. ${formatCurrency2Decimals(hr.closingUnspentBalance)}</td>
      </tr>
      <tr class="closing-row">
        <td colspan="5" class="left font-bold uppercase" style="color: #1e40af; font-size: 8.5px; padding: 4px 8px; border: 1px solid #cbd5e1;">CLOSING UNSPENT BALANCE (C/D) — ${headCode}:</td>
        <td colspan="5" class="right italic" style="font-size: 8px; color: #475569; padding: 4px; border: 1px solid #cbd5e1;">[Allocation + Receipts - Expenditure]</td>
        <td class="right font-mono font-bold text-navy" style="font-size: 10px; padding: 4px; border: 1px solid #cbd5e1;">Rs. ${formatCurrency2Decimals(hr.closingUnspentBalance)}</td>
      </tr>
    `;

    return `
      <div style="margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #ffffff; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #0b2545; padding-bottom: 5px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #0b2545; color: #ffffff; font-size: 9px; font-weight: 900; font-family: monospace; padding: 2px 7px; border-radius: 4px;">#${idx + 1}</span>
            <strong style="font-size: 11px; color: #0f172a; text-transform: uppercase;">${headCode} — ${headTitle}</strong>
          </div>
          <div style="font-size: 9px; font-family: monospace; color: #64748b;">
            ${hr.allRows.length} Line Items • ${hr.headCodeText}
          </div>
        </div>

        ${perHeadKpiHtml}

        <table>
          <thead>
            <tr>
              <th style="width: 3.5%;">Sr#</th>
              <th style="width: 6.5%;">Tx Date</th>
              <th style="width: 4.5%;">Bank</th>
              <th style="width: 8%;">Voucher #</th>
              <th style="width: 14%;">Paid To / By</th>
              <th style="width: 10%;">Head</th>
              <th style="width: 25.5%;">Particulars / Bill Details</th>
              <th style="width: 7.5%;">Cheque #</th>
              <th style="width: 6.5%;">Receipts (Rs.)</th>
              <th style="width: 7%;">Payments (Rs.)</th>
              <th style="width: 7%;">Balance (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${perHeadRowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Multi-Head Expenditure Statement - GVTI(W) Samanabad</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 8mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 8px;
            font-size: 8.5px;
            line-height: 1.25;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0b2545;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .logo-box { width: 50px; height: 50px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
          .logo-box img { max-width: 50px; max-height: 50px; object-fit: contain; }
          .inst-center { text-align: center; flex: 1; margin: 0 10px; }
          .inst-h1 { font-size: 13px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; margin: 0; color: #0b2545; }
          .inst-sub { font-size: 8.5px; color: #475569; font-weight: 600; margin: 1px 0 0 0; }
          .statement-badge { display: inline-block; font-size: 10px; font-weight: 900; text-transform: uppercase; background: #0b2545; color: #ffffff; padding: 2px 10px; border-radius: 4px; margin-top: 3px; }
          .meta-side-box {
            font-size: 7.5px;
            font-family: monospace;
            color: #475569;
            text-align: right;
            border-left: 1px solid #cbd5e1;
            padding-left: 8px;
            line-height: 1.4;
          }
          .badges-strip {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex-wrap: wrap;
            margin-top: 3px;
          }
          .head-badge {
            background: #e2e8f0;
            color: #0f172a;
            padding: 1px 5px;
            border-radius: 3px;
            font-weight: 800;
            font-family: monospace;
            font-size: 8px;
            border: 1px solid #cbd5e1;
          }
          .grand-kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 8px; }
          th {
            background-color: #0b2545;
            color: #ffffff;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 4px 4px;
            border: 1px solid #0b2545;
            font-size: 7.5px;
            text-align: center;
          }
          td {
            padding: 3px 4px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          tr:nth-child(even) { background-color: #f8fafc; }
          .center { text-align: center; }
          .right { text-align: right; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .font-bold { font-weight: 700; }
          .italic { font-style: italic; }
          .text-emerald { color: #15803d; font-weight: 700; }
          .text-rose { color: #b91c1c; font-weight: 700; }
          .text-navy { color: #0b2545; font-weight: 900; }
          .opening-row { background-color: #f1f5f9 !important; }
          .subtotal-row { background-color: #e2e8f0 !important; }
          .closing-row { background-color: #eff6ff !important; border-top: 1.5px solid #0b2545; }
          .bold-text { font-weight: 700; color: #0f172a; }
          .desc-text { color: #475569; font-size: 7.5px; }
          .bill-info-text { font-family: monospace; font-size: 7px; color: #0284c7; }
          .signatures-container {
            margin-top: 24px;
            padding-top: 8px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            text-align: center;
            page-break-inside: avoid;
          }
          .sig-column {
            border-top: 1px solid #475569;
            padding-top: 4px;
            font-size: 8px;
          }
          .official-footer-strip {
            margin-top: 12px;
            padding-top: 5px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 7px;
            font-family: monospace;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <!-- Header Strip -->
        <div class="header-container">
          <div class="logo-box">
            <img src="${gvtiwLogoSrc}" alt="GVTI(W) Logo" onerror="this.style.display='none'" />
          </div>

          <div class="inst-center">
            <h1 class="inst-h1">GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W)</h1>
            <p class="inst-sub">Samanabad, Faisalabad • Accounts & Finance Wing</p>
            <div class="statement-badge">MULTI-HEAD EXPENDITURE STATEMENT (CONSOLIDATED)</div>
            <div class="badges-strip">
              <span style="font-weight: 800; font-size: 8px; color: #475569;">${multiHeadData.headReports.length} Heads Selected:</span>
              ${multiHeadData.selectedHeadCodes.map((c) => `<span class="head-badge">${c}</span>`).join('')}
            </div>
          </div>

          <div class="logo-box">
            <img src="${tevtaLogoSrc}" alt="TEVTA Logo" onerror="this.style.display='none'" />
          </div>

          <div class="meta-side-box">
            <div>Generated: <strong>${generatedTimestamp}</strong></div>
            <div>Period: <strong>${periodLabel}</strong></div>
            <div>Total Heads: <strong>${multiHeadData.headReports.length}</strong></div>
            <div>Total Tx: <strong>${multiHeadData.grandTotal.totalTransactionsCount}</strong></div>
          </div>
        </div>

        <!-- GRAND TOTAL CARD (4 KPI BOXES) -->
        <div class="grand-kpi-grid">
          ${grandKpiHtml}
        </div>

        <!-- PER-HEAD SECTIONS -->
        ${headSectionsHtml}

        <!-- SIGNATURES BLOCK -->
        <div class="signatures-container">
          ${OFFICIAL_SIGNATORIES.map((sig) => `
            <div class="sig-column">
              <strong style="text-transform: uppercase;">${sig.name}</strong>
              <span style="font-weight: 600; color: #334155; display: block;">${sig.role}</span>
              <span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-top: 1px;">${sig.label}</span>
            </div>
          `).join('')}
        </div>

        <!-- WATERMARK FOOTER -->
        <div class="official-footer-strip">
          <div>Voucher / Cashbook Management System • Generated by Kashif Zia (Accounts Deptt.) • Version 3.14</div>
          <div>Government Vocational Training Institute (W) Samanabad, Faisalabad</div>
        </div>
      </body>
    </html>
  `;
}
