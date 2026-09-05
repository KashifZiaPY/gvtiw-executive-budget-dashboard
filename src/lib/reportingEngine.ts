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
import { AccountHead } from '../types';
import { INITIAL_ACCOUNTS } from '../data/initialData';
import { format12HourDate, formatPakistaniDate } from './formatters';

export interface CashBookStatementRow {
  id: string;
  srNo: number | string;
  date: string;
  accountKey: string;
  voucherNo: string;
  paidToBy: string;
  accountHead: string;
  particulars: string;
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
    return new Date(s).getTime();
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
  return '01-Jul-2026 to 31-Jul-2026';
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
  chequeNo: string;
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
          // Guard against stale bogus synthetic FC-R1 receipt
          if (key === 'FC' && (e.id === 'FC-R1' || (e.particulars && e.particulars.includes('Admission & Tuition Fee Collection Session 2026-2027')))) {
            continue;
          }
          result[key].push({
            id: e.id || `${key}-REC-${Math.random()}`,
            date: e.date || '03-Sep-2026',
            dateTs: parseDateToTimestamp(e.date || '03-Sep-2026'),
            srNo: e.srNo || 0,
            voucherNo: e.voucherSerial || '—',
            paidToBy: e.paidToBy || 'Collection / Deposit',
            accountHead: e.accountHead || 'Budget / Fee Collection',
            particulars: e.particulars || 'Receipt Deposit',
            chequeNo: e.chequeNo || '—',
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
          accountHead: v.accountHead || 'A03101-BANK CHARGES',
          particulars: v.description || 'Bank Service Charge',
          chequeNo: '—',
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
          chequeNo: v.chequeNoNet || '—',
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
          chequeNo: v.chequeNoIncomeTax || '—',
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
          chequeNo: v.chequeNoPra || '—',
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
  let targetHeads: AccountHead[] = isGroupedAllHeads
    ? canonicalAccounts
    : canonicalAccounts.filter(
        (a) => a.head.toLowerCase() === selectedHead.toLowerCase() || a.code.toLowerCase() === selectedHead.toLowerCase()
      );

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
    const headTitleOnly = (acc.head.includes('-') ? acc.head.split('-')[1] : acc.head).toUpperCase().trim();

    // 1. Collect all payment vouchers matching this head & bank
    const allHeadVouchers = vouchers.filter((v) => {
      const vHeadUpper = (v.accountHead || '').toUpperCase().trim();
      const matchHead =
        vHeadUpper === accHeadUpper ||
        vHeadUpper.startsWith(accCodeUpper) ||
        (accCodeUpper.length >= 4 && vHeadUpper.includes(accCodeUpper));
      if (!matchHead) return false;

      if (selectedBank !== 'ALL' && !v.bankAccount.includes(selectedBank)) {
        return false;
      }
      return true;
    });

    // 2. Collect all receipts matching this head
    const allHeadReceipts = allAvailableReceipts.filter((r) => {
      const rHeadUpper = (r.head || '').toUpperCase().trim();
      const rPartUpper = (r.particulars || '').toUpperCase().trim();

      const matchDirect =
        rHeadUpper === accHeadUpper ||
        rHeadUpper.startsWith(accCodeUpper) ||
        (accCodeUpper.length >= 4 && rHeadUpper.includes(accCodeUpper));

      const matchParticulars = accCodeUpper.length >= 4 && rPartUpper.includes(accCodeUpper);

      const matchTitleKeyword = headTitleOnly.length >= 4 && (rHeadUpper.includes(headTitleOnly) || rPartUpper.includes(headTitleOnly));

      const matchBankSpecific =
        (acc.code === 'A00000PF' && (r.accountKey === 'PF' || rPartUpper.includes('PUPIL'))) ||
        (acc.code === 'A00000SC' && (r.accountKey === 'SC' || rPartUpper.includes('SHORT COURSE'))) ||
        (acc.code === 'A00000SS' && (r.accountKey === 'SEC' || rPartUpper.includes('SECURITY'))) ||
        (acc.code === 'A00000TFC' && (r.accountKey === 'FC' || rPartUpper.includes('FEE'))) ||
        (acc.code === 'A00000AA' && r.accountKey === 'AA');

      // Bank account filter condition for receipts
      if (selectedBank !== 'ALL') {
        const targetBankKey = resolveBankKeyFromAccount(selectedBank);
        // If bank is NS or AA, allow AA and NS receipts for Non-Salary heads
        const isNonSalaryHead = acc.code.startsWith('A03') || acc.code.startsWith('A13') || acc.code.startsWith('A01');
        if (isNonSalaryHead && (targetBankKey === 'NS' || targetBankKey === 'AA')) {
          // Allow AAA ceiling receipts
        } else if (r.accountKey !== targetBankKey) {
          return false;
        }
      }

      return matchDirect || matchParticulars || matchTitleKeyword || matchBankSpecific;
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
          <td style="padding: 4px; border: 1px solid #cbd5e1; font-size: 8.5px; color: #334155;">${r.accountHead}</td>
          <td style="padding: 4px; border: 1px solid #cbd5e1; font-size: 8.5px; color: #475569;">${r.particulars}</td>
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
          <div class="sig-column">
            <strong>Kashif Zia</strong>
            <span>Prepared by: Accountant</span>
          </div>
          <div class="sig-column">
            <strong>ANEEBA JAMIL</strong>
            <span>Checked by: CO-Signatory</span>
          </div>
          <div class="sig-column">
            <strong>SHAZIA KHADIM</strong>
            <span>Approved by: Acting Principal / DDO</span>
          </div>
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
