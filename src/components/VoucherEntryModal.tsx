import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MasterVoucher, INSTITUTIONAL_BANK_ACCOUNTS, BankAccountKey } from '../data/cashBookData';
import { MASTER_PAYEE_LIST, MASTER_ACCOUNT_HEADS, PayeeRecord } from '../data/voucherMasterLists';
import { INITIAL_ACCOUNTS } from '../data/initialData';
import { MiniCalculatorPopover } from './MiniCalculatorPopover';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import {
  X,
  CheckCircle,
  AlertCircle,
  Search,
  ChevronDown,
  Landmark,
  Receipt,
  FileText,
  Calculator,
  ShieldCheck,
  Building2,
  Lock,
  Sparkles,
  Scale,
  DollarSign,
  Wallet,
  Printer,
  Info,
  Check,
  ArrowRight,
  Trash2,
  PlusCircle,
} from 'lucide-react';

interface VoucherEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherToAmend?: MasterVoucher | null;
  onSaveVoucher: (newVoucher: MasterVoucher, isAmend: boolean) => void;
  onDeleteVoucher?: (srNo: number) => void;
  existingVouchers: MasterVoucher[];
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
}

// Institutional Bank Options (v3.14 Aligned)
export const BANK_OPTIONS = [
  {
    key: 'NS' as BankAccountKey,
    shortName: 'Non-Salary',
    code: 'NS',
    fullName: 'Payment of Non Salary Expenditures For 2026-2027',
    acctNo: '6580006795600014',
    openingBal: 2387207.0,
    receiptsBal: 0.0,
  },
  {
    key: 'PF' as BankAccountKey,
    shortName: 'Pupil Funds',
    code: 'PF',
    fullName: 'Payment of Pupil Funds For 2026-2027',
    acctNo: '6580027832200022',
    openingBal: 408588.0,
    receiptsBal: 77717.0, // Online transfer collection from student fees
  },
  {
    key: 'SC' as BankAccountKey,
    shortName: 'Short Course',
    code: 'SC',
    fullName: 'Payment of Short Course For 2026-2027',
    acctNo: '6580027832200033',
    openingBal: 251567.0,
    receiptsBal: 0.0,
  },
  {
    key: 'SEC' as BankAccountKey,
    shortName: 'Securities',
    code: 'SEC',
    fullName: 'Payment of Securities For 2026-2027',
    acctNo: '6580027832200044',
    openingBal: 357709.0,
    receiptsBal: 0.0,
  },
  {
    key: 'FC' as BankAccountKey,
    shortName: 'Fee Collection',
    code: 'FC',
    fullName: 'Payment of TEVTA Fee Collection For 2026-2027',
    acctNo: '6580027832200011',
    openingBal: 0.0,
    receiptsBal: 77717.0,
  },
  {
    key: 'AA' as BankAccountKey,
    shortName: 'AAA (Revolving)',
    code: 'AA',
    fullName: 'Payment of AAA For 2026-2027',
    acctNo: 'AAA0000000000000',
    openingBal: 1460000.0, // District Allocation Ceiling
    receiptsBal: 0.0,
  },
];

// Map of Allocated Budget Ceilings for every Account Head (derived directly from INITIAL_ACCOUNTS)
const HEAD_ALLOCATIONS: Record<string, number> = {
  'A00000PF-PUPIL FUND': 408588.0 + 77717.0, // 486,305.00
  'A00000SC-SHORT COURSE': 251567.0,
  'A00000SS-STUDENT SEC.': 357709.0,
  'A00000TFC-TEVTA FEE COL.': 77717.0,
  'A00000DW-DAILY WAGES-SALARIES': 182127.0,
  'A03933-SERVICE CHARGES': 373946.0,
  'A03302-WATER CHARGES': -15730.0,
  'A03202-TELEPHONE & TRUNK CHARGES': -59990.0,
  'A03303-ELECTRICITY CHARGES': -230811.0,
  'A03101-BANK CHARGES': 1407.0,
  'A03201-POSTAGE & TELEGRAPH': 16350.0,
  'A03301-SUI GAS CHARGES': -40275.0,
  'A03805-TA/DA CHARGES': -53695.0,
  'A03808-CONVEYANCE CHARGES': -12175.0,
  'A03901-STATIONERY CHARGES': -3530.0,
  'A03902-PRINTING CHARGES': 6975.0,
  'A03907-PUBLICITY ADVERTISING CHARGES': -40419.0,
  'A03970-OTHERS (MISC. CHARGES)': -190335.0,
  'A13101-REPAIR OF MACHINERY/EQUIPMENTS': 8434.0,
  'A13201-REPAIR OF FURNITURE & FIXTURES': 89238.0,
  'A03807-POL CHARGES': -8718.0,
  'A03942-COST OF OTHER STORES / TRAINING MATERIALS': -40040.0,
  'A03806-TRANSPORTATION OF GOODS': -8500.0,
  'A13301-REPAIR OF BUILDING (AR/SR)': 1834.0,
  'A03905-Newspapers & Books': 0.0,
  'PLACEMENT-A03918-JOB FAIR & EXHIBITION': 4942.0,
  'PLACEMENT-A03903- CONFRENCE SEMINAR & WORKSHOP': -43972.0,
  'PLACEMENT-A03202-TELEPHONE & TRUNK CALLS': 54500.0,
  'PLACEMENT-A03807-POL': 14834.0,
  'A00000NTTM-NAVTTC COOK-TRAINING MATERIAL': 527067.0,
  'A00000NTTR-NAVTTC COOK-TEACHER REMUNERATION': 463120.0,
  'A00000NTADC-NAVTTC COOK-ADVERTISING COST': -9293.0,
  'A00000NTOH-NAVTTC COOK-OVERHEADS': 190075.0,
  'A00000NTADM-NAVTTC COOK-ADMIN COST': 52097.0,
  'A00000CM2-DATA ANALYTICS-CMSDI': 332511.0,
  'A00000CM1-GRAPHIC DESIGN-HIGH TECH': 451543.0,
  'A00000II-NS INTEREST INCOME': 137492.0,
  'A00000FG-SALE OF FINISHED PROJECTS': 112090.0,
  'A00000LN-LOAN ACC.': 0.0,
  'A00000FW-FEE WAIVER BUDGET (2020-21)': 114108.0,
  'A00000WB-FUND AGAINST DLI-4 WB PROJECT': 0.0,
  'A00000AA-AAA': 1460000.0,
};

// Populate additional from INITIAL_ACCOUNTS if any missing
INITIAL_ACCOUNTS.forEach((acc) => {
  if (HEAD_ALLOCATIONS[acc.head] === undefined) {
    HEAD_ALLOCATIONS[acc.head] = acc.opening + acc.reappr + acc.receipts;
  }
});

// Dedicated Independent Funds (Not Non-Salary)
const DEDICATED_OWN_FUND_HEADS = [
  'A00000PF-PUPIL FUND',
  'A00000SC-SHORT COURSE',
  'A00000SS-STUDENT SEC.',
  'A00000TFC-TEVTA FEE COL.',
];

export const VoucherEntryModal: React.FC<VoucherEntryModalProps> = ({
  isOpen,
  onClose,
  voucherToAmend,
  onSaveVoucher,
  onDeleteVoucher,
  existingVouchers,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
}) => {
  const isAmend = Boolean(voucherToAmend);
  const todayISO = new Date().toISOString().slice(0, 10);

  // Strict LIFO Rule Evaluation for Deletion
  const maxExistingSrNo = useMemo(() => {
    return existingVouchers.reduce((m, v) => (v.srNo > m ? v.srNo : m), 0);
  }, [existingVouchers]);

  const isLatestVoucher = voucherToAmend ? voucherToAmend.srNo === maxExistingSrNo : false;

  // Form State
  const [payeeName, setPayeeName] = useState('');
  const [payeeSearch, setPayeeSearch] = useState('');
  const [isPayeeDropdownOpen, setIsPayeeDropdownOpen] = useState(false);
  const [payeeHighlightedIndex, setPayeeHighlightedIndex] = useState(0);
  const [ntnCnic, setNtnCnic] = useState('');

  const [bankAccount, setBankAccount] = useState(BANK_OPTIONS[0].fullName);
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(todayISO);
  const [billAmtExclTax, setBillAmtExclTax] = useState<number | string>('');
  const [saleTax, setSaleTax] = useState<number | string>('');
  const [praTaxOnBill, setPraTaxOnBill] = useState<number | string>('');

  const [chequeNoNet, setChequeNoNet] = useState('');
  const [chequeDate, setChequeDate] = useState(todayISO);
  const [chequeAmtNet, setChequeAmtNet] = useState<number | string>('');
  const [isManualNetOverride, setIsManualNetOverride] = useState(false);

  const [chequeNoIncomeTax, setChequeNoIncomeTax] = useState('');
  const [incomeTaxAmt, setIncomeTaxAmt] = useState<number | string>('');

  const [chequeNoPra, setChequeNoPra] = useState('');
  const [praTaxAmt, setPraTaxAmt] = useState<number | string>('');

  const [accountHead, setAccountHead] = useState('A00000DW-DAILY WAGES-SALARIES');
  const [headSearch, setHeadSearch] = useState('');
  const [isHeadDropdownOpen, setIsHeadDropdownOpen] = useState(false);
  const [headHighlightedIndex, setHeadHighlightedIndex] = useState(0);

  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mini Calculator state
  const [calcState, setCalcState] = useState<{
    isOpen: boolean;
    fieldName: string;
    initialValue: number | string;
    onApply: (val: number) => void;
  }>({
    isOpen: false,
    fieldName: '',
    initialValue: 0,
    onApply: () => {},
  });

  // Corporate Busy / Posting State
  const [isPosting, setIsPosting] = useState(false);

  // Success Summary State
  const [successSummary, setSuccessSummary] = useState<{
    srNo: number;
    voucherNo: string;
    payeeName: string;
    bankAccount: string;
    grossBill: number;
    netCheque: number;
    accountHead: string;
    chequeNo: string;
    isAmend: boolean;
    savedVoucherObj: MasterVoucher;
  } | null>(null);

  // Voucher Print Modal State (Direct PAF Popup from Success Dialog)
  const [printVoucherPAF, setPrintVoucherPAF] = useState<MasterVoucher | null>(null);

  // Refs for keyboard scroll into view
  const payeeListRef = useRef<HTMLDivElement>(null);
  const headListRef = useRef<HTMLDivElement>(null);

  // Selected Bank Object
  const selectedBankObj = useMemo(() => {
    return BANK_OPTIONS.find((b) => b.fullName === bankAccount) || BANK_OPTIONS[0];
  }, [bankAccount]);

  // Account Heads available based on Selected Bank (Google Sheet Rule Enforcement)
  // - If Non-Salary or AAA -> Show all 38 non-salary / operating / placement / NAVTTC / CMSDI heads
  // - If Pupil Funds -> ONLY A00000PF-PUPIL FUND
  // - If Short Course -> ONLY A00000SC-SHORT COURSE
  // - If Securities -> ONLY A00000SS-STUDENT SEC.
  // - If Fee Collection -> ONLY A00000TFC-TEVTA FEE COL.
  const availableHeadsForBank = useMemo(() => {
    if (selectedBankObj.key === 'PF') {
      return ['A00000PF-PUPIL FUND'];
    }
    if (selectedBankObj.key === 'SC') {
      return ['A00000SC-SHORT COURSE'];
    }
    if (selectedBankObj.key === 'SEC') {
      return ['A00000SS-STUDENT SEC.'];
    }
    if (selectedBankObj.key === 'FC') {
      return ['A00000TFC-TEVTA FEE COL.'];
    }
    // Non-Salary (NS) or AAA (AA): return all heads excluding the dedicated own-funds
    return MASTER_ACCOUNT_HEADS.filter((h) => !DEDICATED_OWN_FUND_HEADS.includes(h));
  }, [selectedBankObj.key]);

  // Sync / enforce account head when Bank Account changes
  const handleBankChange = (newBankFullName: string) => {
    setBankAccount(newBankFullName);
    const bankOpt = BANK_OPTIONS.find((b) => b.fullName === newBankFullName) || BANK_OPTIONS[0];

    if (bankOpt.key === 'PF') {
      setAccountHead('A00000PF-PUPIL FUND');
      setHeadSearch('A00000PF-PUPIL FUND');
    } else if (bankOpt.key === 'SC') {
      setAccountHead('A00000SC-SHORT COURSE');
      setHeadSearch('A00000SC-SHORT COURSE');
    } else if (bankOpt.key === 'SEC') {
      setAccountHead('A00000SS-STUDENT SEC.');
      setHeadSearch('A00000SS-STUDENT SEC.');
    } else if (bankOpt.key === 'FC') {
      setAccountHead('A00000TFC-TEVTA FEE COL.');
      setHeadSearch('A00000TFC-TEVTA FEE COL.');
    } else {
      // NS or AAA: If current head is an own fund, switch to default non-salary head
      if (DEDICATED_OWN_FUND_HEADS.includes(accountHead)) {
        setAccountHead('A00000DW-DAILY WAGES-SALARIES');
        setHeadSearch('A00000DW-DAILY WAGES-SALARIES');
      }
    }
  };

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSuccessSummary(null);
      setPrintVoucherPAF(null);
      setIsPosting(false);
      return;
    }

    if (voucherToAmend) {
      setPayeeName(voucherToAmend.payeeName || '');
      setPayeeSearch(voucherToAmend.payeeName || '');
      setNtnCnic(voucherToAmend.ntnCnic || 'N/A');
      setBankAccount(voucherToAmend.bankAccount || BANK_OPTIONS[0].fullName);
      setBillNo(voucherToAmend.billNo || '');
      setBillDate(voucherToAmend.billDate || todayISO);
      setBillAmtExclTax(voucherToAmend.billAmtExclTax ?? voucherToAmend.billAmountGross ?? 0);
      setSaleTax(voucherToAmend.gstAmount ?? 0);
      setPraTaxOnBill(voucherToAmend.praTaxOnBill ?? 0);
      setChequeNoNet(voucherToAmend.chequeNoNet || '');
      setChequeDate(voucherToAmend.chequeDate || todayISO);
      setChequeAmtNet(voucherToAmend.chequeAmountNet ?? 0);
      setIsManualNetOverride(true);
      setChequeNoIncomeTax(voucherToAmend.chequeNoIncomeTax || '0');
      setIncomeTaxAmt(voucherToAmend.incomeTaxAmount ?? 0);
      setChequeNoPra(voucherToAmend.chequeNoPra || '0');
      setPraTaxAmt(voucherToAmend.praAmount ?? 0);
      const targetHead = voucherToAmend.accountHead || 'A00000DW-DAILY WAGES-SALARIES';
      setAccountHead(targetHead);
      setHeadSearch(targetHead);
      setDescription(voucherToAmend.description || '');
    } else {
      setPayeeName('');
      setPayeeSearch('');
      setNtnCnic('');
      setBankAccount(BANK_OPTIONS[0].fullName);
      setBillNo('');
      setBillDate(todayISO);
      setBillAmtExclTax('');
      setSaleTax('');
      setPraTaxOnBill('');
      setChequeNoNet('');
      setChequeDate(todayISO);
      setChequeAmtNet('');
      setIsManualNetOverride(false);
      setChequeNoIncomeTax('');
      setIncomeTaxAmt('');
      setChequeNoPra('');
      setPraTaxAmt('');
      setAccountHead('A00000DW-DAILY WAGES-SALARIES');
      setHeadSearch('A00000DW-DAILY WAGES-SALARIES');
      setDescription('');
    }
    setErrorMsg(null);
    setIsPayeeDropdownOpen(false);
    setIsHeadDropdownOpen(false);
    setSuccessSummary(null);
    setPrintVoucherPAF(null);
    setIsPosting(false);
  }, [isOpen, voucherToAmend]);

  // Global ESC Key Listener for Modal and Success Summary
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (printVoucherPAF) {
          setPrintVoucherPAF(null);
        } else if (calcState.isOpen) {
          setCalcState((prev) => ({ ...prev, isOpen: false }));
        } else if (successSummary) {
          setSuccessSummary(null);
          onClose();
        } else if (isPayeeDropdownOpen) {
          setIsPayeeDropdownOpen(false);
        } else if (isHeadDropdownOpen) {
          setIsHeadDropdownOpen(false);
        } else if (isOpen && !isPosting) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [printVoucherPAF, calcState.isOpen, successSummary, isPayeeDropdownOpen, isHeadDropdownOpen, isOpen, isPosting, onClose]);

  // Filter Payees: when typing, filter by Name, NTN, or CNIC
  const filteredPayees = useMemo(() => {
    if (!payeeSearch || payeeSearch.trim() === '') return MASTER_PAYEE_LIST;
    const s = payeeSearch.toLowerCase().trim();
    return MASTER_PAYEE_LIST.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.ntn && p.ntn.toLowerCase().includes(s)) ||
        (p.cnic && p.cnic.toLowerCase().includes(s))
    );
  }, [payeeSearch]);

  // Filter Heads: when typing, filter within availableHeadsForBank
  const filteredHeads = useMemo(() => {
    if (!headSearch || headSearch.trim() === '') return availableHeadsForBank;
    const s = headSearch.toLowerCase().trim();
    return availableHeadsForBank.filter((h) => h.toLowerCase().includes(s));
  }, [headSearch, availableHeadsForBank]);

  // =========================================================================
  // 1. TOP: Dynamic Available Bank Balance Calculation
  // Opening Balance + Receipts in this Bank - Total Payments in this Bank
  // =========================================================================
  const currentBankBalance = useMemo(() => {
    const opening = selectedBankObj.openingBal || 0;
    const receipts = selectedBankObj.receiptsBal || 0;
    const totalPaymentsInThisBank = existingVouchers
      .filter((v) => v.bankAccount === bankAccount && (!voucherToAmend || v.srNo !== voucherToAmend.srNo))
      .reduce((sum, v) => sum + (v.chequeAmountNet || 0) + (v.incomeTaxAmount || 0) + (v.praAmount || 0), 0);
    return opening + receipts - totalPaymentsInThisBank;
  }, [selectedBankObj, bankAccount, existingVouchers, voucherToAmend]);

  // =========================================================================
  // 2. BOTTOM: Dynamic Available Account Head Balance & FY Expenditure
  // Allocated Ceiling (from initial accounts) - Total FY Gross Invoiced in Head
  // =========================================================================
  const headAllocatedCeiling = useMemo(() => {
    if (!accountHead) return 0;
    return HEAD_ALLOCATIONS[accountHead] ?? 0;
  }, [accountHead]);

  const currentHeadExpenditure = useMemo(() => {
    if (!accountHead) return 0;
    return existingVouchers
      .filter((v) => v.accountHead === accountHead && (!voucherToAmend || v.srNo !== voucherToAmend.srNo))
      .reduce((sum, v) => sum + (v.billAmountGross || 0), 0);
  }, [accountHead, existingVouchers, voucherToAmend]);

  const availableHeadBalance = useMemo(() => {
    return headAllocatedCeiling - currentHeadExpenditure;
  }, [headAllocatedCeiling, currentHeadExpenditure]);

  // =========================================================================
  // 3. Mathematical Calculations
  // =========================================================================
  const numBillExcl = Number(billAmtExclTax) || 0;
  const numSaleTax = Number(saleTax) || 0;
  const numPraOnBill = Number(praTaxOnBill) || 0;
  const numIncomeTax = Number(incomeTaxAmt) || 0;
  const numPraTaxAmt = Number(praTaxAmt) || 0;

  // Gross Bill = Bill Excl + Sale Tax + PRA Tax on Bill (formula: =SUM(M10:M12) in master sheet)
  const grossBillAmount = numBillExcl + numSaleTax + numPraOnBill;

  // Exact Auto Net Calculation = Gross Bill - Income Tax - PRA Tax Paid
  const exactAutoNet = Math.max(0, grossBillAmount - numIncomeTax - numPraTaxAmt);

  // Keep chequeAmtNet in automatic sync unless user explicitly overrides it
  useEffect(() => {
    if (!isManualNetOverride && grossBillAmount > 0) {
      setChequeAmtNet(exactAutoNet);
    }
  }, [grossBillAmount, numIncomeTax, numPraTaxAmt, isManualNetOverride, exactAutoNet]);

  const numChequeNet = Number(chequeAmtNet) || 0;

  // Reconciliation Discrepancy Check (Gross vs Paid Net + Taxes)
  const totalDisbursedAndTaxes = numChequeNet + numIncomeTax + numPraTaxAmt;
  const reconciliationDifference = grossBillAmount - totalDisbursedAndTaxes;
  const isReconciled = Math.abs(reconciliationDifference) < 0.01;

  if (!isOpen) return null;

  // Handle Payee Select
  const handleSelectPayee = (payee: PayeeRecord) => {
    setPayeeName(payee.name);
    setPayeeSearch(payee.name);
    setNtnCnic(payee.ntn || payee.cnic || 'N/A');
    setIsPayeeDropdownOpen(false);
  };

  // Handle Head Select
  const handleSelectHead = (h: string) => {
    setAccountHead(h);
    setHeadSearch(h);
    setIsHeadDropdownOpen(false);
  };

  // Keyboard navigation for Payees (Up, Down, Enter, Escape)
  const handlePayeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPayeeDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsPayeeDropdownOpen(true);
        setPayeeHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPayeeHighlightedIndex((prev) => (prev + 1 < filteredPayees.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPayeeHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredPayees.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPayees[payeeHighlightedIndex]) {
        handleSelectPayee(filteredPayees[payeeHighlightedIndex]);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsPayeeDropdownOpen(false);
    }
  };

  // Keyboard navigation for Account Heads (Up, Down, Enter, Escape)
  const handleHeadKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isHeadDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsHeadDropdownOpen(true);
        setHeadHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHeadHighlightedIndex((prev) => (prev + 1 < filteredHeads.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHeadHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredHeads.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredHeads[headHighlightedIndex]) {
        handleSelectHead(filteredHeads[headHighlightedIndex]);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsHeadDropdownOpen(false);
    }
  };

  // Open Mini Calculator helper
  const openCalculator = (
    fieldName: string,
    initialValue: number | string,
    onApply: (val: number) => void
  ) => {
    setCalcState({
      isOpen: true,
      fieldName,
      initialValue,
      onApply,
    });
  };

  // Strict LIFO Delete Voucher Handler
  const handleDeleteCurrentVoucher = () => {
    if (!voucherToAmend || !onDeleteVoucher) return;
    if (!isLatestVoucher) {
      setErrorMsg(
        `⚠️ STRICT LIFO CASH BOOK SEQUENCE RULE:\nOnly the latest voucher (Sr. #${maxExistingSrNo}) can be deleted first. Voucher #${voucherToAmend.srNo} cannot be deleted out of sequence.`
      );
      return;
    }
    const confirmed = window.confirm(
      `⚠️ PERMANENT VOUCHER DELETION (STRICT LIFO RULE):\n\nAre you sure you want to permanently DELETE Voucher #${voucherToAmend.srNo} (${voucherToAmend.voucherNo})?\n\n• Payee: ${voucherToAmend.payeeName}\n• Net Cheque: Rs. ${Number(voucherToAmend.chequeAmountNet).toLocaleString()}\n• Account Head: ${voucherToAmend.accountHead}\n• Bank Ledger: ${voucherToAmend.bankAccount}\n\nThis will permanently reverse all ledger entries and restore account head budget balance.`
    );
    if (confirmed) {
      onDeleteVoucher(voucherToAmend.srNo);
      onClose();
    }
  };

  // Form Validation strictly enforcing all mandatory fields for New and Amend modes
  const validateForm = (): boolean => {
    if (!payeeName.trim()) {
      setErrorMsg('⚠️ Please enter or select a valid Payee Name (Mandatory).');
      return false;
    }
    if (!bankAccount || !bankAccount.trim()) {
      setErrorMsg('⚠️ Bank Account Ledger selection is mandatory.');
      return false;
    }
    if (!billNo.trim()) {
      setErrorMsg('⚠️ Bill / Invoice Number is mandatory (cannot be blank).');
      return false;
    }
    if (!billDate || !billDate.trim()) {
      setErrorMsg('⚠️ Bill Date is mandatory.');
      return false;
    }
    if (billAmtExclTax === '' || isNaN(numBillExcl) || numBillExcl <= 0) {
      setErrorMsg('⚠️ Bill Amount (Excl. Tax) is mandatory and must be greater than zero.');
      return false;
    }
    if (saleTax === '' || isNaN(numSaleTax) || numSaleTax < 0) {
      setErrorMsg('⚠️ Sale Tax (GST) must be 0 or a positive number.');
      return false;
    }
    if (numSaleTax > 0 && numSaleTax >= numBillExcl) {
      setErrorMsg('⚠️ Sale Tax must be less than Bill Amount (Excl. Tax).');
      return false;
    }
    if (praTaxOnBill === '' || isNaN(numPraOnBill) || numPraOnBill < 0) {
      setErrorMsg('⚠️ PRA Tax (Bill) must be 0 or a positive number.');
      return false;
    }
    if (numPraOnBill > 0 && numPraOnBill >= numBillExcl) {
      setErrorMsg('⚠️ PRA Tax (Bill) must be less than Bill Amount (Excl. Tax).');
      return false;
    }
    if (!chequeNoNet.trim()) {
      setErrorMsg('⚠️ Net Cheque Number is mandatory (cannot be blank).');
      return false;
    }
    if (!chequeDate || !chequeDate.trim()) {
      setErrorMsg('⚠️ Cheque Date is mandatory.');
      return false;
    }
    if (chequeAmtNet === '' || isNaN(numChequeNet) || numChequeNet <= 0) {
      setErrorMsg('⚠️ Net Cheque Amount is mandatory and must be greater than zero.');
      return false;
    }
    if (numChequeNet > grossBillAmount) {
      setErrorMsg(`⚠️ Net Cheque Amount (Rs. ${numChequeNet.toLocaleString()}) cannot exceed Gross Invoiced Bill (Rs. ${grossBillAmount.toLocaleString()}).`);
      return false;
    }
    if (incomeTaxAmt === '' || isNaN(numIncomeTax) || numIncomeTax < 0) {
      setErrorMsg('⚠️ Income Tax Amount must be 0 or a valid positive amount.');
      return false;
    }
    if (numIncomeTax > 0 && (!chequeNoIncomeTax || !chequeNoIncomeTax.trim() || chequeNoIncomeTax.trim() === '0')) {
      setErrorMsg('⚠️ Income Tax Cheque Number is mandatory when Income Tax is deducted.');
      return false;
    }
    if (numIncomeTax > 0 && numIncomeTax >= numChequeNet) {
      setErrorMsg('⚠️ Income Tax deduction must be less than Net Cheque Amount.');
      return false;
    }
    if (praTaxAmt === '' || isNaN(numPraTaxAmt) || numPraTaxAmt < 0) {
      setErrorMsg('⚠️ PRA Tax Amount must be 0 or a valid positive amount.');
      return false;
    }
    if (numPraTaxAmt > 0 && (!chequeNoPra || !chequeNoPra.trim() || chequeNoPra.trim() === '0')) {
      setErrorMsg('⚠️ PRA Tax Cheque Number is mandatory when PRA Tax is deducted.');
      return false;
    }
    if (numPraOnBill > 0 && numPraTaxAmt < numPraOnBill) {
      setErrorMsg(`⚠️ PRA Tax Amount paid (Rs. ${numPraTaxAmt.toLocaleString()}) cannot be less than PRA Tax assessed on Bill (Rs. ${numPraOnBill.toLocaleString()}).`);
      return false;
    }
    if (!accountHead || !accountHead.trim() || !headSearch.trim() || !availableHeadsForBank.includes(accountHead)) {
      setErrorMsg(`⚠️ Please select a valid Account Head from the official chart of accounts for ${selectedBankObj.shortName}.`);
      return false;
    }
    if (!description || !description.trim() || description.trim().length < 3) {
      setErrorMsg('⚠️ Narration / Description is mandatory (minimum 3 characters required).');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let targetSrNo: number;
    let targetVoucherNo: string;

    const bMatch = selectedBankObj;
    const prefix = bMatch.key;

    // Date formatting for Voucher number
    const dt = new Date(chequeDate || todayISO);
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mStr = monthNames[dt.getMonth()] || 'SEP';
    const yyStr = String(dt.getFullYear()).slice(2);

    if (isAmend && voucherToAmend) {
      targetSrNo = voucherToAmend.srNo;
      if (voucherToAmend.bankAccount && voucherToAmend.bankAccount !== bankAccount) {
        let maxSeq = 0;
        const targetPrefix = `${prefix}-${mStr}${yyStr}-`;
        existingVouchers.forEach((v) => {
          if (v.voucherNo && v.voucherNo.startsWith(targetPrefix)) {
            const num = Number(v.voucherNo.slice(targetPrefix.length));
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          }
        });
        targetVoucherNo = `${targetPrefix}${String(maxSeq + 1).padStart(3, '0')}`;
      } else {
        targetVoucherNo = voucherToAmend.voucherNo;
      }
    } else {
      const maxSr = existingVouchers.reduce((m, v) => (v.srNo > m ? v.srNo : m), 0);
      targetSrNo = maxSr + 1;
      let maxSeq = 0;
      const targetPrefix = `${prefix}-${mStr}${yyStr}-`;
      existingVouchers.forEach((v) => {
        if (v.voucherNo && v.voucherNo.startsWith(targetPrefix)) {
          const num = Number(v.voucherNo.slice(targetPrefix.length));
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });
      targetVoucherNo = `${targetPrefix}${String(maxSeq + 1).padStart(3, '0')}`;
    }

    const timestampStr =
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newVoucher: MasterVoucher = {
      srNo: targetSrNo,
      voucherNo: targetVoucherNo,
      payeeName: payeeName.trim(),
      ntnCnic: ntnCnic.trim() || 'N/A',
      billNo: billNo.trim(),
      billDate: billDate,
      chequeNoNet: chequeNoNet.trim() || 'DEBIT',
      chequeDate: chequeDate,
      chequeAmountNet: numChequeNet,
      accountHead: accountHead,
      gstAmount: numSaleTax,
      praAmount: numPraTaxAmt,
      chequeNoPra: chequeNoPra.trim() || '0',
      incomeTaxAmount: numIncomeTax,
      chequeNoIncomeTax: chequeNoIncomeTax.trim() || '0',
      billAmountGross: grossBillAmount,
      description: description.trim(),
      entryStatus: isAmend ? 'Updated' : 'New',
      timestamp: timestampStr,
      bankAccount: bankAccount,
      billAmtExclTax: numBillExcl,
      praTaxOnBill: numPraOnBill,
      preEntryBalance: voucherToAmend?.preEntryBalance || 0,
    };

    // Show Corporate Revolving Posting State
    setIsPosting(true);

    setTimeout(() => {
      onSaveVoucher(newVoucher, isAmend);
      setIsPosting(false);
      setSuccessSummary({
        srNo: targetSrNo,
        voucherNo: targetVoucherNo,
        payeeName: payeeName.trim(),
        bankAccount: selectedBankObj.shortName,
        grossBill: grossBillAmount,
        netCheque: numChequeNet,
        accountHead: accountHead,
        chequeNo: chequeNoNet.trim() || 'DEBIT',
        isAmend: isAmend,
        savedVoucherObj: newVoucher,
      });
    }, 700);
  };

  const handleCloseSuccessPopup = () => {
    setSuccessSummary(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. SUCCESS SUMMARY POPUP DIALOG (With Print PAF & ESC Close)  */}
      {/* ------------------------------------------------------------- */}
      {successSummary ? (
        <div className="bg-white dark:bg-[#0c1322] text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border-2 border-emerald-500 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-700">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 font-extrabold">
                  {successSummary.isAmend ? 'Amendment Certified' : 'Voucher Certified & Posted'}
                </span>
                <h3 className="text-base font-black tracking-tight text-white mt-0.5">
                  Voucher #{successSummary.srNo} Authorization Summary
                </h3>
              </div>
            </div>
            <button
              onClick={handleCloseSuccessPopup}
              className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-200 hover:text-white transition-all cursor-pointer"
              title="Close summary (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 text-xs font-sans">
            {/* Voucher Badge Banner */}
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-700 dark:text-emerald-400 block">
                  Official Voucher Number
                </span>
                <span className="text-xl font-mono font-black text-emerald-950 dark:text-emerald-200 tracking-tight">
                  {successSummary.voucherNo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block">
                  Bank Account Ledger
                </span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {successSummary.bankAccount}
                </span>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Beneficiary / Payee:</span>
                <span className="font-bold text-slate-900 dark:text-white">{successSummary.payeeName}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Account Head:</span>
                <span className="font-mono font-bold text-purple-700 dark:text-purple-300 text-[11px] max-w-[260px] truncate text-right">
                  {successSummary.accountHead}
                </span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Cheque Number:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{successSummary.chequeNo}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Gross Invoiced:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  Rs. {successSummary.grossBill.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300">Net Cheque Disbursed:</span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                  Rs. {successSummary.netCheque.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center font-mono pt-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">ESC</kbd> or use action buttons below:
            </p>

            {/* Action Buttons: 1. Print PAF Voucher, 2. Enter Another Voucher, 3. Close & Return */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPrintVoucherPAF(successSummary.savedVoucherObj)}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print PAF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessSummary(null);
                  setPayeeName('');
                  setPayeeSearch('');
                  setNtnCnic('');
                  setBillNo('');
                  setBillDate(todayISO);
                  setBillAmtExclTax('');
                  setSaleTax('');
                  setPraTaxOnBill('');
                  setChequeNoNet('');
                  setChequeDate(todayISO);
                  setChequeAmtNet('');
                  setIsManualNetOverride(false);
                  setChequeNoIncomeTax('');
                  setIncomeTaxAmt('');
                  setChequeNoPra('');
                  setPraTaxAmt('');
                  setDescription('');
                  setErrorMsg(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ New Entry</span>
              </button>
              <button
                type="button"
                onClick={handleCloseSuccessPopup}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Done &amp; Close</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* 2. MAIN VOUCHER ENTRY & AMEND FORM                            */
        /* ------------------------------------------------------------- */
        <div className="bg-white dark:bg-[#0c1322] text-slate-900 dark:text-slate-100 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[95vh] relative">
          
          {/* ========================================================= */}
          {/* OFFICIAL CORPORATE BUSY SIGN (REVOLVING GVTIW LOGO IN GREEN CIRCLE) */}
          {/* ========================================================= */}
          {isPosting && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              <div className="relative mb-5 flex items-center justify-center">
                {/* Outer Rotating Segmented Green Ring */}
                <div className="w-28 h-28 rounded-full border-4 border-dashed border-emerald-400 animate-spin duration-3000 absolute" />
                {/* Inner Glowing Solid Emerald Ring */}
                <div className="w-24 h-24 rounded-full border-3 border-emerald-500 bg-emerald-950/40 shadow-[0_0_30px_rgba(16,185,129,0.7)] flex items-center justify-center p-1.5 relative z-10">
                  <img
                    src={customGvtiwLogo || '/gvtiw-logo.jpg'}
                    alt="GVTIW Logo"
                    className="w-full h-full object-cover rounded-full bg-white shadow-inner"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                {/* Pulsing Badge */}
                <div className="absolute -bottom-1 -right-1 z-20 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 text-white flex items-center justify-center text-xs font-mono shadow-md animate-pulse">
                  ✓
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-extrabold uppercase mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>GVTIW Institutional Financial Server</span>
              </div>

              <h4 className="text-base font-black text-white uppercase tracking-wider mb-1">
                Posting Payment Authorization
              </h4>
              <p className="text-xs text-emerald-300/90 font-mono max-w-sm">
                Validating Head Ceilings, Reconciling Bank Ledgers &amp; Assigning Official v3.14 Voucher Serial...
              </p>
            </div>
          )}

          {/* Executive Header (TEVTA Logo Left, Proper Institute & Owner Center, GVTIW Logo Right) */}
          <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-indigo-950/60 select-none">
            {/* Left: TEVTA Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md border border-white/20 overflow-hidden">
                <img
                  src={customTevtaLogo || '/tevta-logo.png'}
                  alt="TEVTA Punjab"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const el = e.target as HTMLElement;
                    el.style.display = 'none';
                    if (el.parentElement) {
                      el.parentElement.innerHTML = '<span class="text-[10px] font-bold font-mono text-emerald-800">TEVTA</span>';
                    }
                  }}
                />
              </div>
            </div>

            {/* Center: Proper Institute Name, Form Title & Owner Text */}
            <div className="flex-1 text-center px-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight">
                Government Vocational Training Institute (W), Samanabad, Faisalabad
              </h2>
              <div className="flex items-center justify-center gap-2 mt-0.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-amber-300">
                  {isAmend
                    ? `Amend Voucher #${voucherToAmend?.srNo} (${voucherToAmend?.voucherNo})`
                    : 'New Voucher Entry & Payment Authorization'}
                </h3>
                {isAmend && (
                  <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase">
                    Amendment Mode
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-indigo-200/90 mt-0.5">
                System developed by MKZ v3.14
              </div>
            </div>

            {/* Right: GVTIW Logo & Close Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md border border-white/20 overflow-hidden">
                <img
                  src={customGvtiwLogo || '/gvtiw-logo.jpg'}
                  alt="GVTIW Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const el = e.target as HTMLElement;
                    el.style.display = 'none';
                    if (el.parentElement) {
                      el.parentElement.innerHTML = '<span class="text-[10px] font-bold font-mono text-indigo-900">GVTIW</span>';
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer border border-transparent hover:border-white/10"
                title="Close form (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs font-sans">
            
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2.5 font-bold animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Party & Bank Account (WITH TOP AVAILABLE BANK BALANCE) */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>1. Party &amp; Banking Details</span>
                </h4>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono font-black text-[11px]">
                  Available {selectedBankObj.shortName} Balance: Rs. {currentBankBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Payee Searchable Select (with Keyboard Arrow & Enter Navigation) */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      PAYEE NAME <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      {filteredPayees.length} Payees
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={payeeSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPayeeSearch(val);
                        setPayeeName(val);
                        setIsPayeeDropdownOpen(true);
                        setPayeeHighlightedIndex(0);
                      }}
                      onFocus={() => setIsPayeeDropdownOpen(true)}
                      onKeyDown={handlePayeeKeyDown}
                      placeholder="Type supplier name, NTN or CNIC..."
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-emerald-500/60 dark:border-emerald-500/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold outline-none focus:ring-3 focus:ring-emerald-500/20 text-xs shadow-xs"
                      autoComplete="off"
                    />
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1 text-slate-400">
                      {payeeSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayeeSearch('');
                            setPayeeName('');
                            setNtnCnic('');
                            setIsPayeeDropdownOpen(true);
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsPayeeDropdownOpen(!isPayeeDropdownOpen)}
                        className="p-0.5 hover:text-slate-600"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isPayeeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isPayeeDropdownOpen && (
                    <div
                      ref={payeeListRef}
                      className="absolute z-30 top-full mt-1.5 left-0 right-0 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border-2 border-emerald-500/50 rounded-xl shadow-2xl divide-y divide-slate-100 dark:divide-slate-800"
                    >
                      <div className="p-2 bg-emerald-50/80 dark:bg-emerald-950/60 sticky top-0 z-10 flex items-center justify-between text-[10px] font-bold text-emerald-900 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-800">
                        <span>Select Supplier (↑ ↓ Arrows + Enter):</span>
                        <button type="button" onClick={() => setIsPayeeDropdownOpen(false)} className="text-slate-500 hover:text-slate-700">Done ✕</button>
                      </div>
                      {filteredPayees.map((p, idx) => {
                        const isHighlighted = idx === payeeHighlightedIndex;
                        const isSelected = p.name === payeeName;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectPayee(p)}
                            className={`px-3 py-2 cursor-pointer flex justify-between items-center text-xs transition-colors ${
                              isHighlighted
                                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-white font-black'
                                : isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 font-bold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span className="font-bold">{p.name}</span>
                            {(p.ntn || p.cnic) && (
                              <span className="text-[10px] text-slate-400 font-mono">{p.ntn || p.cnic}</span>
                            )}
                          </div>
                        );
                      })}
                      {filteredPayees.length === 0 && (
                        <div className="p-3 text-center text-slate-400 italic">No matching payee found.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bank Account Selection with Real-time Top Balance */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      BANK ACCOUNT / LEDGER <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Bal: Rs. {currentBankBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <select
                    value={bankAccount}
                    onChange={(e) => handleBankChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-emerald-500/60 dark:border-emerald-500/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold outline-none focus:ring-3 focus:ring-emerald-500/20 text-xs shadow-xs cursor-pointer"
                  >
                    {BANK_OPTIONS.map((b) => (
                      <option key={b.key} value={b.fullName}>
                        {b.shortName} ({b.code} — A/C: {b.acctNo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* NTN / CNIC Auto-filled (READ-ONLY Lock) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>NTN / CNIC Number (Auto-Populated from Master Directory — Read-Only)</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={ntnCnic}
                  readOnly
                  placeholder="Select Payee above to populate verified NTN / CNIC"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 font-mono font-bold text-xs cursor-not-allowed select-all"
                />
              </div>
            </div>

            {/* Section 2: Bill / Invoice Details (With Mini Calculators) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-3.5 shadow-xs">
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>2. Bill &amp; Invoice Breakdown</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    BILL / INVOICE NO <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    placeholder="e.g. INV-2026-089"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    BILL DATE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    max={todayISO}
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Future dates blocked</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Bill Amt Excl Tax (With Mini Calc) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                      BILL AMT (EXCL TAX) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openCalculator('Bill Amt Excl. Tax', billAmtExclTax, (v) => {
                          setBillAmtExclTax(v);
                          setIsManualNetOverride(false);
                        })
                      }
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-0.5 text-[10px] font-bold p-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      title="Open Mini Calculator"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Calc</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={billAmtExclTax}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setBillAmtExclTax(e.target.value);
                        setIsManualNetOverride(false);
                      }}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-extrabold outline-none focus:border-indigo-500 text-right"
                    />
                  </div>
                </div>

                {/* 2. Sale Tax GST (With Mini Calc) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                      SALE TAX AMT (GST)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openCalculator('Sale Tax (GST)', saleTax, (v) => {
                          setSaleTax(v);
                          setIsManualNetOverride(false);
                        })
                      }
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-0.5 text-[10px] font-bold p-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      title="Open Mini Calculator"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Calc</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={saleTax}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setSaleTax(e.target.value);
                      setIsManualNetOverride(false);
                    }}
                    onBlur={() => {
                      if (saleTax === '') setSaleTax('');
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-extrabold outline-none focus:border-indigo-500 text-right"
                  />
                </div>

                {/* 3. PRA Tax on Bill (With Mini Calc) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                      PRA TAX (BILL)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openCalculator('PRA Tax on Bill', praTaxOnBill, (v) => {
                          setPraTaxOnBill(v);
                          if (numPraTaxAmt === 0 || numPraTaxAmt < Number(v)) setPraTaxAmt(v);
                          setIsManualNetOverride(false);
                        })
                      }
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-0.5 text-[10px] font-bold p-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      title="Open Mini Calculator"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Calc</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={praTaxOnBill}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPraTaxOnBill(val);
                      const parsed = parseFloat(val);
                      if (!isNaN(parsed) && (numPraTaxAmt === 0 || numPraTaxAmt < parsed)) {
                        setPraTaxAmt(val);
                      }
                      setIsManualNetOverride(false);
                    }}
                    onBlur={() => {
                      if (praTaxOnBill === '') setPraTaxOnBill('');
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-extrabold outline-none focus:border-indigo-500 text-right"
                  />
                </div>
              </div>

              {/* Gross Bill Display Strip */}
              <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Gross Invoiced Calculation (=SUM M10:M12):</span>
                </span>
                <span className="font-mono font-black text-blue-950 dark:text-blue-100 text-sm">
                  Rs. {grossBillAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Section 3: Cheque & Tax Deductions (With Mini Calculators & Live Auto-Computation) */}
            <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/60 bg-gradient-to-b from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-slate-900/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>3. Cheque &amp; Statutory Tax Deductions</span>
                </h4>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                  Live Auto-Net Sync: Active
                </span>
              </div>

              {/* Row 1: Primary Net Cheque */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    NET CHEQUE NO <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chequeNoNet}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setChequeNoNet(e.target.value)}
                    placeholder="e.g. 8061193888"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    CHEQUE DATE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      NET CHEQUE AMT <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openCalculator('Net Cheque Amount', chequeAmtNet, (v) => {
                          setChequeAmtNet(v);
                          setIsManualNetOverride(true);
                        })
                      }
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-0.5 text-[10px] font-bold p-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title="Open Mini Calculator"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Calc</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={chequeAmtNet}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setChequeAmtNet(e.target.value);
                      setIsManualNetOverride(true);
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 font-mono font-black outline-none focus:ring-2 focus:ring-emerald-500/20 text-right text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Income Tax & PRA Tax Deductions with Calculators */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 mb-1">
                    INCOME TAX CHEQUE #
                  </label>
                  <input
                    type="text"
                    value={chequeNoIncomeTax}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setChequeNoIncomeTax(e.target.value)}
                    onBlur={() => {
                      if (!chequeNoIncomeTax.trim()) setChequeNoIncomeTax('');
                    }}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400">
                      INCOME TAX AMT
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openCalculator('Income Tax Amount', incomeTaxAmt, (v) => {
                          setIncomeTaxAmt(v);
                          setIsManualNetOverride(false);
                        })
                      }
                      className="text-amber-600 dark:text-amber-400 hover:text-amber-800 flex items-center gap-0.5 text-[9px] font-bold p-0.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      title="Open Mini Calculator"
                    >
                      <Calculator className="w-2.5 h-2.5" />
                      <span>Calc</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={incomeTaxAmt}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setIncomeTaxAmt(e.target.value);
                      setIsManualNetOverride(false);
                    }}
                    onBlur={() => {
                      if (incomeTaxAmt === '') setIncomeTaxAmt('');
                    }}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs text-right"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 mb-1">
                    PRA TAX CHEQUE #
                  </label>
                  <input
                    type="text"
                    value={chequeNoPra}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setChequeNoPra(e.target.value)}
                    onBlur={() => {
                      if (!chequeNoPra.trim()) setChequeNoPra('');
                    }}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400">
                      PRA TAX AMT
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openCalculator('PRA Tax Amount', praTaxAmt, (v) => {
                          setPraTaxAmt(v);
                          setIsManualNetOverride(false);
                        })
                      }
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-0.5 text-[9px] font-bold p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      title="Open Mini Calculator"
                    >
                      <Calculator className="w-2.5 h-2.5" />
                      <span>Calc</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={praTaxAmt}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setPraTaxAmt(e.target.value);
                      setIsManualNetOverride(false);
                    }}
                    onBlur={() => {
                      if (praTaxAmt === '') setPraTaxAmt('');
                    }}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs text-right"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Account Classification & BOTTOM AVAILABLE HEAD BALANCE MATRIX */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>4. Account Classification &amp; Head Balance</span>
                </h4>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  {availableHeadsForBank.length} Heads Available for {selectedBankObj.shortName}
                </span>
              </div>

              {/* Searchable Account Head Dropdown (Strictly filtered by Bank logic) */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    ACCOUNT HEAD <span className="text-rose-500">*</span>
                  </label>
                  {selectedBankObj.key !== 'NS' && selectedBankObj.key !== 'AA' && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      Locked to {selectedBankObj.shortName} Account Head
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={headSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHeadSearch(val);
                      const matched = availableHeadsForBank.find(
                        (h) => h.toLowerCase() === val.toLowerCase().trim()
                      );
                      if (matched) {
                        setAccountHead(matched);
                      } else {
                        setAccountHead(val);
                      }
                      setIsHeadDropdownOpen(true);
                      setHeadHighlightedIndex(0);
                    }}
                    onFocus={() => setIsHeadDropdownOpen(true)}
                    onKeyDown={handleHeadKeyDown}
                    disabled={availableHeadsForBank.length <= 1}
                    placeholder="Type to search code or head description..."
                    className={`w-full px-3.5 py-2.5 pr-16 rounded-xl border-2 border-purple-400/60 dark:border-purple-500/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold outline-none focus:ring-3 focus:ring-purple-500/20 text-xs shadow-xs ${
                      availableHeadsForBank.length <= 1 ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                    }`}
                    autoComplete="off"
                  />
                  {availableHeadsForBank.length > 1 && (
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1 text-slate-400">
                      {headSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setHeadSearch('');
                            setAccountHead('');
                            setIsHeadDropdownOpen(true);
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                          title="Clear Account Head"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsHeadDropdownOpen(!isHeadDropdownOpen)}
                        className="p-0.5 hover:text-slate-600"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isHeadDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  )}
                </div>

                {isHeadDropdownOpen && availableHeadsForBank.length > 1 && (
                  <div
                    ref={headListRef}
                    className="absolute z-30 top-full mt-1.5 left-0 right-0 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border-2 border-purple-500/50 rounded-xl shadow-2xl divide-y divide-slate-100 dark:divide-slate-800"
                  >
                    <div className="p-2 bg-purple-50/80 dark:bg-purple-950/60 sticky top-0 z-10 flex items-center justify-between text-[10px] font-bold text-purple-900 dark:text-purple-200 border-b border-purple-200 dark:border-purple-800">
                      <span>Select Account Head (↑ ↓ Arrows + Enter):</span>
                      <button type="button" onClick={() => setIsHeadDropdownOpen(false)} className="text-slate-500 hover:text-slate-700">Done ✕</button>
                    </div>
                    {filteredHeads.map((h, idx) => {
                      const isHighlighted = idx === headHighlightedIndex;
                      const isSelected = h === accountHead;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectHead(h)}
                          className={`px-3.5 py-2.5 cursor-pointer font-mono text-xs flex items-center justify-between transition-colors ${
                            isHighlighted
                              ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-950 dark:text-white font-black'
                              : isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 font-extrabold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold'
                          }`}
                        >
                          <span>{h}</span>
                          {isSelected && <span className="text-emerald-600 font-extrabold text-[10px]">✓ Selected</span>}
                        </div>
                      );
                    })}
                    {filteredHeads.length === 0 && (
                      <div className="p-3 text-center text-slate-400 italic">No matching account head found.</div>
                    )}
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* BOTTOM: RELEVANT ACCOUNT HEAD AVAILABLE BALANCE & CEILING */}
              {/* ========================================================= */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-2">
                <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/40 pb-2">
                  <span className="text-[11px] font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Relevant Head Available Balance:</span>
                  </span>
                  <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-md ${
                    availableHeadBalance >= 0 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' 
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                  }`}>
                    Rs. {Number(availableHeadBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Allocated Budget Ceiling:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-200">
                      Rs. {Number(headAllocatedCeiling).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Current FY Expended:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      Rs. {Number(currentHeadExpenditure).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 5: Small Financial Audit & Reconciliation Verification Box */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isReconciled
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-extrabold text-xs">
                      {isReconciled ? '✅ Audit Calculation Reconciled (100% Balanced)' : '⚠️ Unreconciled Math Discrepancy'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold">
                    Diff: Rs. {reconciliationDifference.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500 block">Gross Invoiced:</span>
                    <span className="font-bold">Rs. {grossBillAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Deductions:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      Rs. {(numIncomeTax + numPraTaxAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Net Paid Cheque:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Rs. {numChequeNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  NARRATION / DESCRIPTION <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed payment purpose / item description..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* Dialog Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">ESC</kbd> to cancel
                </span>
                {isAmend && voucherToAmend && onDeleteVoucher && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentVoucher}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLatestVoucher
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-rose-500'
                    }`}
                    title={
                      isLatestVoucher
                        ? 'Delete this latest voucher (Strict LIFO Rule)'
                        : `Only latest voucher (#${maxExistingSrNo}) can be deleted first`
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Voucher (LIFO)</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 sm:px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-xs text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPosting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>{isAmend ? 'Update & Post Voucher' : 'Save & Authorize Voucher'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. MINI CALCULATOR POPOVER COMPONENT                          */}
      {/* ------------------------------------------------------------- */}
      <MiniCalculatorPopover
        isOpen={calcState.isOpen}
        fieldName={calcState.fieldName}
        initialValue={calcState.initialValue}
        onApply={calcState.onApply}
        onClose={() => setCalcState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ------------------------------------------------------------- */}
      {/* 4. PAYMENT APPROVAL FORM (PAF) POPUP FROM SUCCESS MODAL       */}
      {/* ------------------------------------------------------------- */}
      {printVoucherPAF && (
        <PaymentApprovalForm
          voucher={printVoucherPAF}
          onClose={() => setPrintVoucherPAF(null)}
          isModal={true}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          customGopLogo={customGopLogo}
        />
      )}

    </div>
  );
};
