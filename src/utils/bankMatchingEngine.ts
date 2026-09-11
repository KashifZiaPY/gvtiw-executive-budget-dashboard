import {
  BankStatementData,
  BankStatementTransaction,
  BankReconciliationResult,
  MatchedPair,
  UnmatchedBankItem,
  UnpresentedChequeItemMatch,
  UncreditedReceiptItemMatch,
  InternalPaymentRecord,
  InternalReceiptRecord,
} from '../types/bankStatement';

/**
 * Normalizes cheque / challan / instrument numbers for robust exact matching.
 * - Trims whitespace
 * - Strips common prefix noise ("CHQ", "CHEQUE", "#", "VR", "VNO", "NO")
 * - If string consists purely of digits, strips leading zeros (e.g., "008061107476" -> "8061107476")
 * - Returns upper-case trimmed string
 */
export function normalizeInstrumentNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  let s = String(raw).trim();
  if (s === '—' || s === '-' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'null') {
    return '';
  }

  // Remove common prefixes
  s = s.replace(/^(CHQ|CHEQUE|CHALLAN|CHQ#|VR|V#|NO|\#)\s*[:#-]?\s*/i, '');
  s = s.trim();

  // If purely digits, strip leading zeroes
  if (/^\d+$/.test(s)) {
    const stripped = s.replace(/^0+/, '');
    return stripped === '' ? '0' : stripped;
  }

  return s.toUpperCase();
}

/**
 * Formats Pakistani currency amount
 */
export function formatPKR(val: number | undefined | null, showSymbol = true): string {
  const num = Number(val) || 0;
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `Rs. ${formatted}` : formatted;
}

/**
 * Matching Engine:
 * 1. Primary Match: Instrument Number == Cash Book Cheque / Challan No
 * 2. Secondary Check: Dr Amount vs Cash Book Payment Net Amount (or Gross), Cr Amount vs Cash Book Receipt Amount
 * 3. Schedule Partitioning:
 *    - Matched pairs (Exact Instrument & Amount)
 *    - Amount Mismatches (Instrument matched, Amount differs -> Flag for review)
 *    - In Bank, Not Yet in Cash Book (No instrument match on Bank Statement)
 *    - Unpresented Cheques (Cash Book payments not yet debited in Bank)
 *    - Uncredited Receipts (Cash Book receipts not yet credited in Bank)
 */
export function performBankReconciliation(
  statement: BankStatementData,
  cashBookPayments: InternalPaymentRecord[],
  cashBookReceipts: InternalReceiptRecord[],
  cashBookClosingBalance: number,
  manualOverrides: Record<string, boolean> = {}
): BankReconciliationResult {
  const matchedTransactions: MatchedPair[] = [];
  const amountMismatches: MatchedPair[] = [];
  const inBankNotInCashBookDebits: UnmatchedBankItem[] = [];
  const inBankNotInCashBookCredits: UnmatchedBankItem[] = [];

  // Track which cash book items have been matched
  const matchedPaymentIds = new Set<string>();
  const matchedReceiptIds = new Set<string>();

  // Normalize cash book lookup maps
  // Key: normalized instrument number -> list of items (in case duplicate instrument)
  const paymentsByInstrument = new Map<string, InternalPaymentRecord[]>();
  cashBookPayments.forEach((p) => {
    const norm = normalizeInstrumentNumber(p.chequeNo);
    if (norm) {
      const list = paymentsByInstrument.get(norm) || [];
      list.push(p);
      paymentsByInstrument.set(norm, list);
    }
  });

  const receiptsByInstrument = new Map<string, InternalReceiptRecord[]>();
  cashBookReceipts.forEach((r) => {
    const norm = normalizeInstrumentNumber(r.challanChequeNo);
    if (norm) {
      const list = receiptsByInstrument.get(norm) || [];
      list.push(r);
      receiptsByInstrument.set(norm, list);
    }
  });

  // Process each transaction row from the Bank of Punjab Statement
  statement.transactions.forEach((tx) => {
    const normInst = normalizeInstrumentNumber(tx.instrumentNumber);
    const hasManualTick = manualOverrides[tx.id] === true;

    // Check Debit (Withdrawal / Cheque Cleared)
    if (tx.drAmount > 0) {
      if (normInst && paymentsByInstrument.has(normInst)) {
        // Find candidate payment not yet claimed
        const candidates = paymentsByInstrument.get(normInst)!;
        const candidate = candidates.find((c) => !matchedPaymentIds.has(c.id)) || candidates[0];

        matchedPaymentIds.add(candidate.id);

        // Check amount match:
        // Cash book payment has netAmountPaid (cheque drawn) and totalBillAmount (gross)
        const netDiff = Math.abs(tx.drAmount - candidate.netAmountPaid);
        const grossDiff = Math.abs(tx.drAmount - candidate.totalBillAmount);

        const isExactMatch = netDiff < 0.05 || grossDiff < 0.05 || hasManualTick;

        const pair: MatchedPair = {
          id: `match-${tx.id}-${candidate.id}`,
          bankTx: tx,
          cashBookType: 'PAYMENT',
          cashBookId: candidate.id,
          cashBookVoucherNo: candidate.voucherNo,
          cashBookInstrumentNo: candidate.chequeNo,
          cashBookDate: candidate.chequeDate,
          cashBookPayeeOrSource: candidate.paidTo,
          cashBookHead: candidate.headOfAccount,
          cashBookAmount: candidate.netAmountPaid,
          bankAmount: tx.drAmount,
          amountDifference: tx.drAmount - candidate.netAmountPaid,
          status: isExactMatch ? 'MATCHED' : 'AMOUNT_MISMATCH',
          statusNote: isExactMatch
            ? netDiff < 0.05
              ? 'Exact Instrument # & Net Cheque Amount Matched'
              : 'Matched on Gross Bill Amount'
            : `Instrument #${tx.instrumentNumber} matched, but Bank Dr (Rs. ${tx.drAmount.toLocaleString()}) != Cash Book Net (Rs. ${candidate.netAmountPaid.toLocaleString()})`,
          manualOverride: hasManualTick,
        };

        if (isExactMatch) {
          matchedTransactions.push(pair);
        } else {
          amountMismatches.push(pair);
        }
      } else {
        // No match found in Cash Book payments
        let action: UnmatchedBankItem['suggestedAction'] = 'RECORD_VOUCHER';
        const natureLower = (tx.natureOfTransaction || '').toLowerCase();
        if (natureLower.includes('charge') || natureLower.includes('fee') || natureLower.includes('chrg')) {
          action = 'BANK_CHARGES';
        } else if (natureLower.includes('tax') || natureLower.includes('wht') || natureLower.includes('fed')) {
          action = 'TAX_DEDUCTION';
        }

        inBankNotInCashBookDebits.push({
          id: `unmatched-dr-${tx.id}`,
          bankTx: tx,
          type: 'DEBIT',
          amount: tx.drAmount,
          nature: tx.natureOfTransaction,
          suggestedAction: action,
        });
      }
    } else if (tx.crAmount > 0) {
      // Check Credit (Deposit / Grant / Profit)
      if (normInst && receiptsByInstrument.has(normInst)) {
        const candidates = receiptsByInstrument.get(normInst)!;
        const candidate = candidates.find((c) => !matchedReceiptIds.has(c.id)) || candidates[0];

        matchedReceiptIds.add(candidate.id);

        const diff = Math.abs(tx.crAmount - candidate.amount);
        const isExactMatch = diff < 0.05 || hasManualTick;

        const pair: MatchedPair = {
          id: `match-cr-${tx.id}-${candidate.id}`,
          bankTx: tx,
          cashBookType: 'RECEIPT',
          cashBookId: candidate.id,
          cashBookInstrumentNo: candidate.challanChequeNo,
          cashBookDate: candidate.date,
          cashBookPayeeOrSource: candidate.paidToBy,
          cashBookHead: candidate.headOfAccount,
          cashBookAmount: candidate.amount,
          bankAmount: tx.crAmount,
          amountDifference: tx.crAmount - candidate.amount,
          status: isExactMatch ? 'MATCHED' : 'AMOUNT_MISMATCH',
          statusNote: isExactMatch
            ? 'Exact Instrument & Receipt Amount Matched'
            : `Instrument #${tx.instrumentNumber} matched, but Bank Cr (Rs. ${tx.crAmount.toLocaleString()}) != Cash Book (Rs. ${candidate.amount.toLocaleString()})`,
          manualOverride: hasManualTick,
        };

        if (isExactMatch) {
          matchedTransactions.push(pair);
        } else {
          amountMismatches.push(pair);
        }
      } else {
        // No match found in Cash Book receipts
        let action: UnmatchedBankItem['suggestedAction'] = 'RECORD_VOUCHER';
        const natureLower = (tx.natureOfTransaction || '').toLowerCase();
        if (natureLower.includes('profit') || natureLower.includes('interest')) {
          action = 'PROFIT';
        }

        inBankNotInCashBookCredits.push({
          id: `unmatched-cr-${tx.id}`,
          bankTx: tx,
          type: 'CREDIT',
          amount: tx.crAmount,
          nature: tx.natureOfTransaction,
          suggestedAction: action,
        });
      }
    }
  });

  // Schedule 1: Unpresented Cheques (Cash Book payments NOT matched in Bank statement)
  const unpresentedCheques: UnpresentedChequeItemMatch[] = [];
  cashBookPayments.forEach((p, idx) => {
    if (!matchedPaymentIds.has(p.id)) {
      unpresentedCheques.push({
        id: `unp-${p.id}`,
        srNo: idx + 1,
        chequeNo: p.chequeNo || '—',
        chequeDate: p.chequeDate,
        voucherNo: p.voucherNo,
        payee: p.paidTo,
        headOfAccount: p.headOfAccount,
        netAmount: p.netAmountPaid,
        totalBillAmount: p.totalBillAmount,
        remarks: p.remarks,
      });
    }
  });

  // Schedule 2: Uncredited Receipts (Cash Book receipts NOT matched in Bank statement)
  const uncreditedReceipts: UncreditedReceiptItemMatch[] = [];
  cashBookReceipts.forEach((r, idx) => {
    if (!matchedReceiptIds.has(r.id)) {
      uncreditedReceipts.push({
        id: `unc-${r.id}`,
        srNo: idx + 1,
        challanChequeNo: r.challanChequeNo || '—',
        date: r.date,
        receivedFrom: r.paidToBy,
        headOfAccount: r.headOfAccount,
        amount: r.amount,
        remarks: r.remarks,
      });
    }
  });

  // Sums
  const totalUnpresentedCheques = unpresentedCheques.reduce((sum, c) => sum + c.netAmount, 0);
  const totalUncreditedReceipts = uncreditedReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalBankDebitsNotInCashBook = inBankNotInCashBookDebits.reduce((sum, d) => sum + d.amount, 0);
  const totalBankCreditsNotInCashBook = inBankNotInCashBookCredits.reduce((sum, c) => sum + c.amount, 0);

  // Bank Reconciliation Equation:
  // Reconciled Bank Balance = Cash Book Closing Balance
  //                         + Unpresented Cheques (issued, not yet debited by BOP)
  //                         - Uncredited Receipts (deposited, not yet credited by BOP)
  //                         + Bank Credits not in Cash Book (profit, direct credit)
  //                         - Bank Debits not in Cash Book (bank charges, tax deductions)
  const reconciledBankBalance =
    Math.round(
      (cashBookClosingBalance +
        totalUnpresentedCheques -
        totalUncreditedReceipts +
        totalBankCreditsNotInCashBook -
        totalBankDebitsNotInCashBook) *
        100
    ) / 100;

  const bankStatementClosingBalance = statement.header.closingBalance;
  const directDifference = Math.round((cashBookClosingBalance - bankStatementClosingBalance) * 100) / 100;
  const variance = Math.round((reconciledBankBalance - bankStatementClosingBalance) * 100) / 100;

  const isDirectlyMatching = Math.abs(directDifference) < 0.05;
  const isFullyExplained = Math.abs(variance) < 0.05;

  return {
    cashBookClosingBalance,
    bankStatementClosingBalance,
    unpresentedCheques,
    totalUnpresentedCheques,
    uncreditedReceipts,
    totalUncreditedReceipts,
    inBankNotInCashBookDebits,
    totalBankDebitsNotInCashBook,
    inBankNotInCashBookCredits,
    totalBankCreditsNotInCashBook,
    matchedTransactions,
    amountMismatches,
    reconciledBankBalance,
    directDifference,
    variance,
    isDirectlyMatching,
    isFullyExplained,
  };
}

/**
 * Built-in real Bank of Punjab (BOP) Sample Statement generator for GVTIW Account 6580047970800018
 * Perfectly matches real account particulars, showing real cheque withdrawals, grant deposits,
 * bank charges, and leaving exact unpresented cheques as on period end.
 */
export function generateSampleBOPStatement(
  accountNo = '6580047970800018',
  periodFrom = '2026-07-01',
  periodTo = '2026-08-31',
  sampleClosingBalance = 3044164.95
): BankStatementData {
  return {
    sourceType: 'SAMPLE_BOP',
    lastUpdated: new Date().toISOString(),
    header: {
      bankName: 'The Bank of Punjab',
      branch: 'Samanabad Branch, Faisalabad (0658)',
      accountNumber: accountNo,
      iban: `PK18BPUN${accountNo}`,
      statementPeriodFrom: periodFrom,
      statementPeriodTo: periodTo,
      openingBalance: 2387207.0,
      closingBalance: sampleClosingBalance,
      totalDr: 1458900.0,
      totalCr: 2115857.95,
    },
    transactions: [
      {
        id: 'bop-tx-1',
        transactionDate: '05-07-2026',
        valueDate: '05-07-2026',
        natureOfTransaction: 'CHEQUE DEPOSIT INTERNAL (GRANT RECEIPT)',
        instrumentNumber: '1045',
        drAmount: 0,
        crAmount: 1850000.0,
        remainingBalance: 4237207.0,
      },
      {
        id: 'bop-tx-2',
        transactionDate: '10-07-2026',
        valueDate: '10-07-2026',
        natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
        instrumentNumber: '8061082496',
        drAmount: 85200.0,
        crAmount: 0,
        remainingBalance: 4152007.0,
      },
      {
        id: 'bop-tx-3',
        transactionDate: '14-07-2026',
        valueDate: '14-07-2026',
        natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
        instrumentNumber: '8061082497',
        drAmount: 124000.0,
        crAmount: 0,
        remainingBalance: 4028007.0,
      },
      {
        id: 'bop-tx-4',
        transactionDate: '20-07-2026',
        valueDate: '20-07-2026',
        natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
        instrumentNumber: '8061082498',
        drAmount: 46800.0,
        crAmount: 0,
        remainingBalance: 3981207.0,
      },
      {
        id: 'bop-tx-5',
        transactionDate: '28-07-2026',
        valueDate: '28-07-2026',
        natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
        instrumentNumber: '8061082499',
        drAmount: 68500.0,
        crAmount: 0,
        remainingBalance: 3912707.0,
      },
      {
        id: 'bop-tx-6',
        transactionDate: '31-07-2026',
        valueDate: '31-07-2026',
        natureOfTransaction: 'BANK CHARGES E-STATEMENT & SMS',
        instrumentNumber: '', // No instrument # -> will appear in "In Bank, Not in Cash Book"
        drAmount: 150.0,
        crAmount: 0,
        remainingBalance: 3912557.0,
      },
      {
        id: 'bop-tx-7',
        transactionDate: '31-07-2026',
        valueDate: '31-07-2026',
        natureOfTransaction: 'FED ON BANK CHARGES 16%',
        instrumentNumber: '',
        drAmount: 24.0,
        crAmount: 0,
        remainingBalance: 3912533.0,
      },
      {
        id: 'bop-tx-8',
        transactionDate: '06-08-2026',
        valueDate: '06-08-2026',
        natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
        instrumentNumber: '8061107476',
        drAmount: 95400.0,
        crAmount: 0,
        remainingBalance: 3817133.0,
      },
      {
        id: 'bop-tx-9',
        transactionDate: '12-08-2026',
        valueDate: '12-08-2026',
        natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
        instrumentNumber: '8061107477',
        drAmount: 112000.0,
        crAmount: 0,
        remainingBalance: 3705133.0,
      },
      {
        id: 'bop-tx-10',
        transactionDate: '18-08-2026',
        valueDate: '18-08-2026',
        natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
        instrumentNumber: '8061107478',
        drAmount: 78000.0,
        crAmount: 0,
        remainingBalance: 3627133.0,
      },
      {
        id: 'bop-tx-11',
        transactionDate: '25-08-2026',
        valueDate: '25-08-2026',
        natureOfTransaction: 'PROFIT / RETURN ON PLS DEPOSIT',
        instrumentNumber: '', // Direct credit -> will appear in "In Bank, Not in Cash Book"
        drAmount: 0,
        crAmount: 265857.95,
        remainingBalance: 3892990.95,
      },
      {
        id: 'bop-tx-12',
        transactionDate: '29-08-2026',
        valueDate: '29-08-2026',
        natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
        instrumentNumber: '8061107479',
        drAmount: 848826.0,
        crAmount: 0,
        remainingBalance: sampleClosingBalance,
      },
    ],
  };
}
