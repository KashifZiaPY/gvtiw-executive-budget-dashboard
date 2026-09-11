// Types for Bank of Punjab (BOP) Statement Extraction & Reconciliation

export interface BankStatementHeader {
  bankName: string;
  branch: string;
  accountNumber: string;
  iban?: string;
  statementPeriodFrom?: string;
  statementPeriodTo?: string;
  openingBalance?: number;
  closingBalance: number;
  totalDr?: number;
  totalCr?: number;
}

export interface BankStatementTransaction {
  id: string;
  transactionDate: string; // DD-MM-YYYY or YYYY-MM-DD
  valueDate?: string;
  natureOfTransaction: string; // e.g. "CHEQUE WITHDRAWAL INTERNAL", "CHEQUE DEPOSIT INTERNAL", "BANK CHARGES", "PROFIT"
  instrumentNumber: string; // Cheque No / Challan No (BOP Instrument Number)
  drAmount: number; // Debit / Withdrawal
  crAmount: number; // Credit / Deposit
  remainingBalance: number;
  isManuallyAdded?: boolean;
}

export interface BankStatementData {
  header: BankStatementHeader;
  transactions: BankStatementTransaction[];
  sourceType: 'UPLOAD_AI' | 'MANUAL' | 'SAMPLE_BOP';
  lastUpdated: string;
}

export type MatchStatus = 'MATCHED' | 'AMOUNT_MISMATCH' | 'UNMATCHED_BANK' | 'MANUAL_TICK';

export interface MatchedPair {
  id: string;
  bankTx: BankStatementTransaction;
  cashBookType: 'PAYMENT' | 'RECEIPT';
  cashBookId: string;
  cashBookVoucherNo?: string;
  cashBookInstrumentNo: string;
  cashBookDate: string;
  cashBookPayeeOrSource: string;
  cashBookHead: string;
  cashBookAmount: number; // Net amount (or receipt amount)
  bankAmount: number;
  amountDifference: number;
  status: MatchStatus;
  statusNote?: string;
  manualOverride?: boolean;
}

export interface UnmatchedBankItem {
  id: string;
  bankTx: BankStatementTransaction;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  nature: string;
  suggestedAction: 'RECORD_VOUCHER' | 'BANK_CHARGES' | 'PROFIT' | 'TAX_DEDUCTION' | 'UNKNOWN';
}

export interface UnpresentedChequeItemMatch {
  id: string;
  srNo: number;
  chequeNo: string;
  chequeDate: string;
  voucherNo?: string;
  payee: string;
  headOfAccount: string;
  netAmount: number;
  totalBillAmount: number;
  remarks: string;
  isStale?: boolean;
}

export interface UncreditedReceiptItemMatch {
  id: string;
  srNo: number;
  challanChequeNo: string;
  date: string;
  receivedFrom: string;
  headOfAccount: string;
  amount: number;
  remarks: string;
}

export interface InternalReceiptRecord {
  id: string;
  srNo: number;
  date: string;
  dateTs: number;
  monthKey: string;
  challanChequeNo: string;
  headOfAccount: string;
  amount: number;
  remarks: string;
  paidToBy: string;
}

export interface InternalPaymentRecord {
  id: string;
  srNo: number;
  voucherNo: string;
  headOfAccount: string;
  billNo: string;
  billDate: string;
  chequeDate: string;
  dateTs: number;
  monthKey: string;
  chequeNo: string;
  totalBillAmount: number;
  gstAmount: number;
  incomeTax: number;
  praAmount: number;
  salesTaxPRA: number;
  praTaxOnBill: number;
  security: number;
  netAmountPaid: number;
  remarks: string;
  paidTo: string;
}

export interface BankReconciliationResult {
  cashBookClosingBalance: number;
  bankStatementClosingBalance: number;
  
  // Schedules
  unpresentedCheques: UnpresentedChequeItemMatch[];
  totalUnpresentedCheques: number;

  uncreditedReceipts: UncreditedReceiptItemMatch[];
  totalUncreditedReceipts: number;

  inBankNotInCashBookDebits: UnmatchedBankItem[];
  totalBankDebitsNotInCashBook: number;

  inBankNotInCashBookCredits: UnmatchedBankItem[];
  totalBankCreditsNotInCashBook: number;

  // Matches
  matchedTransactions: MatchedPair[];
  amountMismatches: MatchedPair[];

  // Reconciliation summary
  reconciledBankBalance: number; // Computed balance from cashbook adjusted
  directDifference: number; // CashBook - BankStatement
  variance: number; // ReconciledBankBalance - BankStatement
  isDirectlyMatching: boolean;
  isFullyExplained: boolean;
}
