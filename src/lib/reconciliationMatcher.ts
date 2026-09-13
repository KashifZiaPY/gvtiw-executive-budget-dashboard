import {
  MasterVoucher,
  CashBookAccountState,
  BankAccountKey,
} from '../data/cashBookData';
import {
  parseDateToTimestamp,
  resolveBankKeyFromAccount,
} from './reportingEngine';
import { ManualUnpresentedCheque, ddmmyyyyToIso, isoToDdmmyyyy } from '../components/DirectorReconReport';

export type CandidateType =
  | 'NET_CHEQUE'
  | 'INCOME_TAX'
  | 'PRA_TAX'
  | 'BANK_CHARGE'
  | 'CASHBOOK_PAYMENT'
  | 'CASHBOOK_RECEIPT';

export interface ReconciliationCandidate {
  id: string;
  chequeNo: string;
  date: string;
  dateIso: string;
  dateTs: number;
  paidTo: string;
  accountHead: string;
  amount: number;
  description: string;
  type: CandidateType;
  sourceLabel: string;
  isStaleRisk?: boolean;
}

export interface MatchedCombination {
  id: string;
  type: 'EXACT' | 'NEAR';
  totalAmount: number;
  delta: number; // Math.abs(totalAmount - target)
  items: ReconciliationCandidate[];
  confidence: number; // 0 to 100
  auditNote?: string;
}

export interface AiAuditResult {
  primaryAssessment: string;
  recommendedOptionIndex: number;
  combinationNotes: string[];
  potentialBankCharges: string;
  actionRecommendations: string[];
}

/**
 * Extracts candidate transactions from vouchers and cash book entries.
 */
export function extractReconciliationCandidates(options: {
  liveVouchers: MasterVoucher[];
  cashBookState?: CashBookAccountState;
  selectedAccountKey: BankAccountKey;
  periodFromIso: string;
  periodToIso: string;
  scope: 'ACTIVE_PERIOD' | 'EXTENDED_6_MONTHS';
  direction: 'PAYMENTS' | 'RECEIPTS' | 'ALL';
  existingManualCheques: ManualUnpresentedCheque[];
}): ReconciliationCandidate[] {
  const {
    liveVouchers,
    cashBookState,
    selectedAccountKey,
    periodFromIso,
    periodToIso,
    scope,
    direction,
    existingManualCheques,
  } = options;

  const candidates: ReconciliationCandidate[] = [];

  // Parse boundary dates with strict end-of-day timestamp for periodTo
  let toTs = parseDateToTimestamp(periodToIso);
  if (!toTs && periodToIso) {
    const isoStr = ddmmyyyyToIso(periodToIso);
    if (isoStr) toTs = parseDateToTimestamp(isoStr);
  }
  // If still not parsed, default to current time
  toTs = toTs || Date.now();
  // Ensure toTs covers through the very end of that day (23:59:59.999)
  const toDateObj = new Date(toTs);
  toDateObj.setHours(23, 59, 59, 999);
  const toCeilingTs = toDateObj.getTime();

  let fromTs = parseDateToTimestamp(periodFromIso);
  if (!fromTs && periodFromIso) {
    const isoStr = ddmmyyyyToIso(periodFromIso);
    if (isoStr) fromTs = parseDateToTimestamp(isoStr);
  }
  fromTs = fromTs || 0;
  if (fromTs > 0) {
    const fromDateObj = new Date(fromTs);
    fromDateObj.setHours(0, 0, 0, 0);
    fromTs = fromDateObj.getTime();
  }

  if (scope === 'EXTENDED_6_MONTHS') {
    // 180 days lookback prior to toCeilingTs (strictly looking into the past, never forward)
    fromTs = toCeilingTs - 180 * 24 * 60 * 60 * 1000;
  }

  // Set of existing manual cheque numbers for deduplication
  const existingChequeSet = new Set(
    existingManualCheques
      .map((m) => (m.chequeNo || '').trim().toLowerCase())
      .filter((c) => c && c !== '—' && c !== '0')
  );

  // Filter vouchers for this bank account
  const matchedVouchers = liveVouchers.filter(
    (v) => resolveBankKeyFromAccount(v.bankAccount) === selectedAccountKey
  );

  // Helper: robustly parse any transaction date to timestamp
  const resolveTransactionTs = (rawDate: string): number => {
    if (!rawDate) return 0;
    let ts = parseDateToTimestamp(rawDate);
    if (ts <= 0) {
      const iso = ddmmyyyyToIso(rawDate);
      if (iso) ts = parseDateToTimestamp(iso);
    }
    return ts;
  };

  if (direction === 'PAYMENTS' || direction === 'ALL') {
    matchedVouchers.forEach((v, idx) => {
      const rawDate = v.chequeDate || v.billDate || '';
      const ts = resolveTransactionTs(rawDate);
      const iso = ddmmyyyyToIso(rawDate);
      const formattedDate = isoToDdmmyyyy(rawDate) || rawDate;

      // STRICT STATUTORY CUTOFF:
      // Never allow any transaction dated after the reconciliation cut-off date (toCeilingTs)
      if (ts > 0 && ts > toCeilingTs) return;

      // Filter by start boundary
      if (ts > 0 && fromTs > 0 && ts < fromTs) return;

      const isStale = ts > 0 && toCeilingTs - ts > 60 * 24 * 60 * 60 * 1000;

      // 1. Net Cheque
      const netAmt = Number(v.chequeAmountNet) || 0;
      const netChq = (v.chequeNoNet || '').trim();
      if (netAmt > 0 && (!netChq || !existingChequeSet.has(netChq.toLowerCase()))) {
        candidates.push({
          id: `CAND-NET-${v.voucherNo || idx}`,
          chequeNo: netChq || '—',
          date: formattedDate,
          dateIso: iso,
          dateTs: ts,
          paidTo: v.payeeName || 'Vendor / Payee',
          accountHead: v.accountHead || 'Non Salary Expenditure',
          amount: Math.round(netAmt * 100) / 100,
          description: v.description || `Net Payment (Voucher #${v.voucherNo || idx + 1})`,
          type: 'NET_CHEQUE',
          sourceLabel: 'Vendor Net Cheque',
          isStaleRisk: isStale,
        });
      }

      // 2. Income Tax Cheque
      const itAmt = Number(v.incomeTaxAmount) || 0;
      const itChq = (v.chequeNoIncomeTax || '').trim();
      if (itAmt > 0 && (!itChq || !existingChequeSet.has(itChq.toLowerCase()))) {
        candidates.push({
          id: `CAND-IT-${v.voucherNo || idx}`,
          chequeNo: itChq || '—',
          date: formattedDate,
          dateIso: iso,
          dateTs: ts,
          paidTo: 'Income Tax',
          accountHead: v.accountHead || 'Non Salary Expenditure',
          amount: Math.round(itAmt * 100) / 100,
          description: `IT Deducted - ${v.description || v.payeeName || 'Voucher'}`,
          type: 'INCOME_TAX',
          sourceLabel: 'Income Tax Cheque',
          isStaleRisk: isStale,
        });
      }

      // 3. PRA Tax Cheque
      let praAmt = Number(v.praAmount) || 0;
      const praOnBill = Number(v.praTaxOnBill) || 0;
      if (praAmt === 0 && praOnBill > 0) {
        praAmt = praOnBill + 100;
      }
      const praChq = (v.chequeNoPra || '').trim();
      if (praAmt > 0 && (!praChq || !existingChequeSet.has(praChq.toLowerCase()))) {
        candidates.push({
          id: `CAND-PRA-${v.voucherNo || idx}`,
          chequeNo: praChq || '—',
          date: formattedDate,
          dateIso: iso,
          dateTs: ts,
          paidTo: 'PRA Tax',
          accountHead: v.accountHead || 'Non Salary Expenditure',
          amount: Math.round(praAmt * 100) / 100,
          description: `PRA Deducted - ${v.description || v.payeeName || 'Voucher'}`,
          type: 'PRA_TAX',
          sourceLabel: 'PRA Sales Tax Cheque',
          isStaleRisk: isStale,
        });
      }
    });

    // Standalone Cash Book payments (e.g. Bank Charges / Debits)
    if (cashBookState && Array.isArray(cashBookState.entries)) {
      cashBookState.entries.forEach((e, idx) => {
        const amt = Number(e.payments) || 0;
        if (amt > 0 || e.entryType === 'PAYMENT' || e.entryType === 'TAX_DEDUCTION') {
          const rawDate = e.date || '';
          const ts = resolveTransactionTs(rawDate);
          
          // STRICT STATUTORY CUTOFF:
          // Never allow any transaction dated after the reconciliation cut-off date (toCeilingTs)
          if (ts > 0 && ts > toCeilingTs) return;
          if (ts > 0 && fromTs > 0 && ts < fromTs) return;

          const chq = (e.chequeNo || '').trim();
          if (chq && existingChequeSet.has(chq.toLowerCase())) return;

          // Check if already covered by vouchers
          const isVoucherMatch = matchedVouchers.some((v) => {
            if (e.voucherSerial && v.voucherNo && e.voucherSerial.toLowerCase() === v.voucherNo.toLowerCase()) return true;
            if (chq && (v.chequeNoNet === chq || v.chequeNoIncomeTax === chq || v.chequeNoPra === chq)) return true;
            return false;
          });

          if (!isVoucherMatch && amt > 0) {
            candidates.push({
              id: `CAND-CB-PAY-${idx}`,
              chequeNo: chq && chq !== '0' ? chq : 'DEBIT',
              date: isoToDdmmyyyy(rawDate) || rawDate,
              dateIso: ddmmyyyyToIso(rawDate),
              dateTs: ts,
              paidTo: e.paidToBy || (e.particulars?.toLowerCase().includes('bank') ? 'The Bank of Punjab' : 'Expense'),
              accountHead: e.accountHead || 'Cash Book Payment',
              amount: Math.round(amt * 100) / 100,
              description: e.particulars || 'Direct Cash Book Payment',
              type: e.particulars?.toLowerCase().includes('bank') ? 'BANK_CHARGE' : 'CASHBOOK_PAYMENT',
              sourceLabel: e.particulars?.toLowerCase().includes('bank') ? 'Bank Charge / Debit Advice' : 'Cash Book Payment',
            });
          }
        }
      });
    }
  }

  if (direction === 'RECEIPTS' || direction === 'ALL') {
    if (cashBookState && Array.isArray(cashBookState.entries)) {
      cashBookState.entries.forEach((e, idx) => {
        const amt = Number(e.receipts) || 0;
        if (amt > 0 || e.entryType === 'RECEIPT') {
          const rawDate = e.date || '';
          const ts = resolveTransactionTs(rawDate);
          
          // STRICT STATUTORY CUTOFF:
          // Never allow any transaction dated after the reconciliation cut-off date (toCeilingTs)
          if (ts > 0 && ts > toCeilingTs) return;
          if (ts > 0 && fromTs > 0 && ts < fromTs) return;

          const chq = (e.chequeNo || '').trim();
          if (chq && existingChequeSet.has(chq.toLowerCase())) return;

          candidates.push({
            id: `CAND-CB-REC-${idx}`,
            chequeNo: chq && chq !== '0' ? chq : 'CREDIT',
            date: isoToDdmmyyyy(rawDate) || rawDate,
            dateIso: ddmmyyyyToIso(rawDate),
            dateTs: ts,
            paidTo: e.paidToBy || 'Deposit / Collection',
            accountHead: e.accountHead || 'Cash Book Receipt',
            amount: Math.round(amt * 100) / 100,
            description: e.particulars || 'Uncredited Collection / Deposit in Transit',
            type: 'CASHBOOK_RECEIPT',
            sourceLabel: 'Uncredited Deposit in Transit',
          });
        }
      });
    }
  }

  // Sort: most recent date first
  candidates.sort((a, b) => b.dateTs - a.dateTs);
  return candidates;
}

/**
 * High-performance Combinatorial Subset Sum Matcher
 * Finds exact and near combinations totaling targetAmount within tolerance.
 */
export function findReconciliationMatches(
  candidates: ReconciliationCandidate[],
  targetAmount: number,
  tolerance = 500, // Tolerance in Rs. for near-matches
  maxResults = 15
): MatchedCombination[] {
  const target = Math.round(Math.abs(targetAmount) * 100) / 100;
  if (target <= 0 || candidates.length === 0) return [];

  const validCandidates = candidates.filter((c) => c.amount > 0 && c.amount <= target + tolerance);

  const results: MatchedCombination[] = [];
  const seenSignature = new Set<string>();

  const addResult = (items: ReconciliationCandidate[]) => {
    const sortedIds = items.map((x) => x.id).sort().join('|');
    if (seenSignature.has(sortedIds)) return;
    seenSignature.add(sortedIds);

    const sum = Math.round(items.reduce((acc, curr) => acc + curr.amount, 0) * 100) / 100;
    const delta = Math.round(Math.abs(sum - target) * 100) / 100;
    const isExact = delta < 0.05;

    // Confidence heuristic based on delta, number of items, and recency
    let confidence = isExact ? 98 : Math.max(40, Math.round(95 - (delta / Math.max(1, tolerance)) * 50));
    if (items.length === 1 && isExact) confidence = 100;

    results.push({
      id: `COMB-${results.length + 1}-${isExact ? 'EXACT' : 'NEAR'}`,
      type: isExact ? 'EXACT' : 'NEAR',
      totalAmount: sum,
      delta,
      items,
      confidence,
    });
  };

  const n = validCandidates.length;

  // 1. Single Item Matches (Level 1)
  for (let i = 0; i < n; i++) {
    const c1 = validCandidates[i];
    const diff = Math.abs(c1.amount - target);
    if (diff <= tolerance) {
      addResult([c1]);
    }
  }

  // 2. Two-Item Combinations (Level 2)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sum2 = validCandidates[i].amount + validCandidates[j].amount;
      const diff = Math.abs(sum2 - target);
      if (diff <= tolerance) {
        addResult([validCandidates[i], validCandidates[j]]);
      }
    }
  }

  // 3. Three-Item Combinations (Level 3)
  // Limit candidate pool for 3-item to top 60 candidates to keep execution < 20ms
  const pool3 = validCandidates.slice(0, 60);
  const n3 = pool3.length;
  for (let i = 0; i < n3; i++) {
    for (let j = i + 1; j < n3; j++) {
      const partial = pool3[i].amount + pool3[j].amount;
      if (partial > target + tolerance) continue;
      for (let k = j + 1; k < n3; k++) {
        const sum3 = partial + pool3[k].amount;
        const diff = Math.abs(sum3 - target);
        if (diff <= tolerance) {
          addResult([pool3[i], pool3[j], pool3[k]]);
        }
      }
    }
  }

  // 4. Four-Item Combinations (Level 4)
  // Check 4 items for tax deduction bundles (Net + IT + PRA + Bank fee)
  const pool4 = validCandidates.slice(0, 35);
  const n4 = pool4.length;
  for (let i = 0; i < n4; i++) {
    for (let j = i + 1; j < n4; j++) {
      const sum2 = pool4[i].amount + pool4[j].amount;
      if (sum2 > target + tolerance) continue;
      for (let k = j + 1; k < n4; k++) {
        const sum3 = sum2 + pool4[k].amount;
        if (sum3 > target + tolerance) continue;
        for (let l = k + 1; l < n4; l++) {
          const sum4 = sum3 + pool4[l].amount;
          const diff = Math.abs(sum4 - target);
          if (diff <= tolerance) {
            addResult([pool4[i], pool4[j], pool4[k], pool4[l]]);
          }
        }
      }
    }
  }

  // Sort results:
  // Exact matches first (delta === 0), then ascending by delta, then by fewer items
  results.sort((a, b) => {
    if (a.delta !== b.delta) return a.delta - b.delta;
    return a.items.length - b.items.length;
  });

  return results.slice(0, maxResults);
}

/**
 * Call Server-Side Gemini endpoint for AI reasoning and statutory audit remarks.
 */
export async function fetchAiReconciliationAudit(payload: {
  bankName: string;
  accountNo: string;
  differenceAmount: number;
  cashBookBalance: number;
  bankStatementBalance: number;
  periodFrom: string;
  periodTo: string;
  matchedCombinations: MatchedCombination[];
  allCandidatesSummary: {
    totalCandidatesChecked: number;
    totalAmountChecked: number;
    scope: string;
  };
}): Promise<AiAuditResult> {
  try {
    const res = await fetch('/api/analyze-reconciliation-difference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.success && data.data) {
      return data.data as AiAuditResult;
    }
  } catch (err) {
    console.warn('AI Reconciliation Server call failed, using heuristic auditor:', err);
  }

  // Default fallback audit note
  return {
    primaryAssessment: `Mathematical subset-sum identified candidate transactions matching the Rs. ${payload.differenceAmount.toLocaleString(
      'en-US',
      { minimumFractionDigits: 2 }
    )} variance. Review the matched cheques and verify clearance against your bank e-statement.`,
    recommendedOptionIndex: 0,
    combinationNotes: payload.matchedCombinations.map(
      (c, i) =>
        `Option ${i + 1}: ${c.items.length} item(s) totaling Rs. ${c.totalAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })} (${c.type === 'EXACT' ? 'Exact Match 100%' : `Delta: Rs. ${c.delta.toFixed(2)}`})`
    ),
    potentialBankCharges:
      'Any small residual difference (under Rs. 500) may be unrecorded bank ledger fees, withholding tax, or FED charges.',
    actionRecommendations: [
      'Confirm physical cheque clearance against the Bank Statement.',
      'Click "Apply to Unpresented List" to import these cheques into the reconciliation schedule.',
    ],
  };
}
