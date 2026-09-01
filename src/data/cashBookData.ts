// =============================================================
// INSTITUTIONAL CASHBOOK & VOUCHER SYSTEM DATA MODELS (v3.14 Aligned)
// Government Vocational Training Institute (W) Samanabad, Faisalabad
// 100% Authentic Source-Synchronized (All 6 Accounts & 37 Master Vouchers)
// =============================================================

export type BankAccountKey = 'NS' | 'PF' | 'FC' | 'SC' | 'SEC' | 'AA';

export interface BankAccountMetadata {
  key: BankAccountKey;
  code: string;
  shortName: string;
  fullName: string;
  accountNo: string;
  bankName: string;
  branch: string;
  themeColor: {
    primary: string;
    bgLight: string;
    bgDark: string;
    border: string;
    badge: string;
  };
}

export interface CashBookEntry {
  id: string;
  srNo: number;
  date: string;
  month: string;
  vNo: string;
  voucherSerial: string;
  particulars: string;
  paidToBy: string;
  accountHead: string;
  chequeNo: string;
  receipts: number;
  payments: number;
  runningBalance: number;
  entryType: 'PAYMENT' | 'RECEIPT' | 'TRANSFER' | 'BANK_CHARGE' | 'TAX_DEDUCTION';
}

export interface CashBookAccountState {
  meta: BankAccountMetadata;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  unpresentedChequesTotal: number;
  reconciledBankBalance: number;
  entries: CashBookEntry[];
}

export interface MasterVoucher {
  srNo: number;
  voucherNo: string;
  payeeName: string;
  ntnCnic: string;
  billNo: string;
  billDate: string;
  chequeNoNet: string;
  chequeDate: string;
  chequeAmountNet: number;
  accountHead: string;
  gstAmount: number;
  praAmount: number;
  chequeNoPra: string;
  incomeTaxAmount: number;
  chequeNoIncomeTax: string;
  billAmountGross: number;
  description: string;
  entryStatus: 'New' | 'Updated' | 'Verified';
  timestamp: string;
  bankAccount: string;
  preEntryBalance: number;
}

export const INSTITUTIONAL_BANK_ACCOUNTS: Record<BankAccountKey, BankAccountMetadata> = {
  NS: {
    key: 'NS',
    code: 'NS',
    shortName: 'Non-Salary',
    fullName: 'Payment of Non Salary Expenditures For 2026-2027',
    accountNo: '6580006795600014',
    bankName: 'Bank of Punjab (BOP)',
    branch: 'Samanabad Branch, Faisalabad',
    themeColor: {
      primary: '#0284C7',
      bgLight: '#F0F9FF',
      bgDark: '#0C4A6E',
      border: '#38BDF8',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    },
  },
  PF: {
    key: 'PF',
    code: 'PF',
    shortName: 'Pupil Funds',
    fullName: 'Payment of Pupil Funds For 2026-2027',
    accountNo: '6580027832200022',
    bankName: 'Bank of Punjab (BOP)',
    branch: 'Samanabad Branch, Faisalabad',
    themeColor: {
      primary: '#8B5CF6',
      bgLight: '#F5F3FF',
      bgDark: '#4C1D95',
      border: '#A78BFA',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    },
  },
  FC: {
    key: 'FC',
    code: 'FC',
    shortName: 'Fee Collection',
    fullName: 'Payment of TEVTA Fee Collection For 2026-2027',
    accountNo: '6580027832200011',
    bankName: 'Bank of Punjab (BOP)',
    branch: 'Samanabad Branch, Faisalabad',
    themeColor: {
      primary: '#10B981',
      bgLight: '#ECFDF5',
      bgDark: '#064E3B',
      border: '#34D399',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    },
  },
  SC: {
    key: 'SC',
    code: 'SC',
    shortName: 'Short Course',
    fullName: 'Payment of Short Course For 2026-2027',
    accountNo: '6580027832200033',
    bankName: 'Bank of Punjab (BOP)',
    branch: 'Samanabad Branch, Faisalabad',
    themeColor: {
      primary: '#F59E0B',
      bgLight: '#FFFBEB',
      bgDark: '#78350F',
      border: '#FBBF24',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    },
  },
  SEC: {
    key: 'SEC',
    code: 'SEC',
    shortName: 'Securities',
    fullName: 'Payment of Securities For 2026-2027',
    accountNo: '6580027832200044',
    bankName: 'Bank of Punjab (BOP)',
    branch: 'Samanabad Branch, Faisalabad',
    themeColor: {
      primary: '#64748B',
      bgLight: '#F8FAFC',
      bgDark: '#1E293B',
      border: '#94A3B8',
      badge: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
    },
  },
  AA: {
    key: 'AA',
    code: 'AA',
    shortName: 'Assan Assignment (AAA)',
    fullName: 'Payment of AAA For 2026-2027 (Segregated Grant)',
    accountNo: 'AAA0000000000000',
    bankName: 'State Bank of Pakistan / National Treasury',
    branch: 'Main Treasury Faisalabad',
    themeColor: {
      primary: '#EA580C',
      bgLight: '#FFF7ED',
      bgDark: '#7C2D12',
      border: '#FB923C',
      badge: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    },
  },
};

// -------------------------------------------------------------
// MASTER VOUCHERS REGISTRY (ALL 37 ENTRIES: JULY & AUGUST 2026)
// -------------------------------------------------------------
export const INITIAL_MASTER_VOUCHERS: MasterVoucher[] = [
    {
        "srNo":  1,
        "voucherNo":  "NS-JUL26-001",
        "payeeName":  "Hashir Traders",
        "ntnCnic":  "8637356-3",
        "billNo":  "199.0",
        "billDate":  "27-Jun-2026",
        "chequeNoNet":  "8.061174906E9",
        "chequeDate":  "03-Jul-2026",
        "chequeAmountNet":  62536,
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "gstAmount":  8111,
        "praAmount":  2500,
        "chequeNoPra":  "8.061174908E9",
        "incomeTaxAmount":  5534,
        "chequeNoIncomeTax":  "8.061174907E9",
        "billAmountGross":  70571,
        "description":  "Sanitary Extention for NAVTTC Cook Lab Drinking Water",
        "entryStatus":  "New",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  2,
        "voucherNo":  "PF-JUL26-001",
        "payeeName":  "Hashir Traders",
        "ntnCnic":  "8637356-3",
        "billNo":  "198.0",
        "billDate":  "27-Jun-2026",
        "chequeNoNet":  "8.061065795E9",
        "chequeDate":  "03-Jul-2026",
        "chequeAmountNet":  52281,
        "accountHead":  "A00000PF-PUPIL FUND",
        "gstAmount":  7722,
        "praAmount":  980,
        "chequeNoPra":  "8.061065797E9",
        "incomeTaxAmount":  3741,
        "chequeNoIncomeTax":  "8.061065796E9",
        "billAmountGross":  57002,
        "description":  "Misc Electric Repair Flood lights Security Lights Breakers, wire etc for Lab Use",
        "entryStatus":  "New",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Pupil Funds For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  3,
        "voucherNo":  "PF-JUL26-002",
        "payeeName":  "Anwar Traders",
        "ntnCnic":  "4821279-6",
        "billNo":  "2426.0",
        "billDate":  "30-Jun-2026",
        "chequeNoNet":  "8.061065798E9",
        "chequeDate":  "03-Jul-2026",
        "chequeAmountNet":  12127,
        "accountHead":  "A00000PF-PUPIL FUND",
        "gstAmount":  1958,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  706,
        "chequeNoIncomeTax":  "8.061065799E9",
        "billAmountGross":  12833,
        "description":  "Student ID Card Session April 2026 complete set",
        "entryStatus":  "New",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Pupil Funds For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  4,
        "voucherNo":  "NS-JUL26-002",
        "payeeName":  "Kashif Zia",
        "ntnCnic":  "6709658-5",
        "billNo":  "Cooking Lab Cylinder GAS",
        "billDate":  "22-Jun-2026",
        "chequeNoNet":  "8.061174909E9",
        "chequeDate":  "03-Jul-2026",
        "chequeAmountNet":  4000,
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  4000,
        "description":  "GAS for Cook Lab Cylinder NAVTTC Course (Consumeable Material) 9kg GAS two cylinder",
        "entryStatus":  "Updated",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  5,
        "voucherNo":  "NS-JUL26-003",
        "payeeName":  "FESCO",
        "ntnCnic":  "3048930-0",
        "billNo":  "FESCO June 2026",
        "billDate":  "01-Jun-2026",
        "chequeNoNet":  "8.061174913E9",
        "chequeDate":  "07-Jul-2026",
        "chequeAmountNet":  89846,
        "accountHead":  "A03303-ELECTRICITY CHARGES",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  89846,
        "description":  "Electricity Bill June 2026 Ref#109 on Loan Basis from other head.",
        "entryStatus":  "New",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  6,
        "voucherNo":  "SC-JUL26-001",
        "payeeName":  "WASA",
        "ntnCnic":  "",
        "billNo":  "WASA Bill June 2026",
        "billDate":  "01-Jul-2026",
        "chequeNoNet":  "8.061065823E9",
        "chequeDate":  "10-Jul-2026",
        "chequeAmountNet":  7880,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  7880,
        "description":  "WASA Bill Jul 2026 paid from Short Course",
        "entryStatus":  "New",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  7,
        "voucherNo":  "NS-JUL26-004",
        "payeeName":  "Amir Shahzad Driver",
        "ntnCnic":  "",
        "billNo":  "Placement Activity Computer Operator",
        "billDate":  "30-Jun-2026",
        "chequeNoNet":  "8.06117491E9",
        "chequeDate":  "04-Jul-2026",
        "chequeAmountNet":  6500,
        "accountHead":  "PLACEMENT-A03807-POL",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  6500,
        "description":  "Computer Operator Ind Visit 30.6 Vehicle Rent etc. Driver Amir",
        "entryStatus":  "New",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  8,
        "voucherNo":  "NS-JUL26-005",
        "payeeName":  "Iram Shahzadi",
        "ntnCnic":  "33301-1595133-8",
        "billNo":  "Placement Activity Computer Operator",
        "billDate":  "30-Jun-2026",
        "chequeNoNet":  "8.061174911E9",
        "chequeDate":  "04-Jul-2026",
        "chequeAmountNet":  5000,
        "accountHead":  "PLACEMENT-A03903- CONFRENCE SEMINAR \u0026 WORKSHOP",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  5000,
        "description":  "Placement Activity, Guest Speaker Lecture, Computer Operator Class IPO Iram Shahzadi",
        "entryStatus":  "New",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  9,
        "voucherNo":  "NS-JUL26-006",
        "payeeName":  "Kashif Zia",
        "ntnCnic":  "6709658-5",
        "billNo":  "Cylinder GAS Bills 3nos",
        "billDate":  "13-Jul-2026",
        "chequeNoNet":  "8.061174914E9",
        "chequeDate":  "13-Jul-2026",
        "chequeAmountNet":  7500,
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "0.0",
        "billAmountGross":  0,
        "description":  "GAS Refilled for Cylinders 03,09,13 Jul 2026 2500*3",
        "entryStatus":  "Updated",
        "timestamp":  "21-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  267030
    },
    {
        "srNo":  10,
        "voucherNo":  "SC-JUL26-002",
        "payeeName":  "M/S PANASONIC BUSINESS POINT-1",
        "ntnCnic":  "2862096-8",
        "billNo":  "15383.0",
        "billDate":  "01-Jul-2026",
        "chequeNoNet":  "8.061065824E9",
        "chequeDate":  "13-Jul-2026",
        "chequeAmountNet":  4950,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  4950,
        "description":  "Paid Photocopies Charges for June 2026",
        "entryStatus":  "New",
        "timestamp":  "14-Jul-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  11,
        "voucherNo":  "NS-JUL26-007",
        "payeeName":  "PTCL",
        "ntnCnic":  "0801599-6",
        "billNo":  "Jun 2026",
        "billDate":  "20-Jul-2026",
        "chequeNoNet":  "8.061174915E9",
        "chequeDate":  "20-Jul-2026",
        "chequeAmountNet":  16280,
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "0.0",
        "billAmountGross":  16280,
        "description":  "PTCL Bills 0412662425=8570,0412406642=7710 paid from NAVTTC overhead",
        "entryStatus":  "Updated",
        "timestamp":  "21-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  88800
    },
    {
        "srNo":  12,
        "voucherNo":  "NS-JUL26-008",
        "payeeName":  "Iram Shahzadi",
        "ntnCnic":  "33301-1595133-8",
        "billNo":  "GAS for Cylinders (NAVTTC)",
        "billDate":  "22-Jul-2026",
        "chequeNoNet":  "8.061174916E9",
        "chequeDate":  "22-Jul-2026",
        "chequeAmountNet":  5000,
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  5000,
        "description":  "Paid for Cylinder GAS for NAVTTC (Consumable material) Class (Paid by Ms Iram Shahzadi)",
        "entryStatus":  "New",
        "timestamp":  "22-Jul-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  13,
        "voucherNo":  "AA-AUG26-001",
        "payeeName":  "PTCL",
        "ntnCnic":  "0801599-6",
        "billNo":  "46204.0",
        "billDate":  "05-Aug-2026",
        "chequeNoNet":  "AAA",
        "chequeDate":  "05-Aug-2026",
        "chequeAmountNet":  16270,
        "accountHead":  "A03202-TELEPHONE \u0026 TRUNK CHARGES",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  16270,
        "description":  "PTCL Bills 0412662425=8560, 0412406642=7710",
        "entryStatus":  "New",
        "timestamp":  "05-Aug-2026",
        "bankAccount":  "Payment of AAA For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  14,
        "voucherNo":  "AA-AUG26-002",
        "payeeName":  "FESCO",
        "ntnCnic":  "3048930-0",
        "billNo":  "46204.0",
        "billDate":  "05-Aug-2026",
        "chequeNoNet":  "AAA",
        "chequeDate":  "05-Aug-2026",
        "chequeAmountNet":  107040,
        "accountHead":  "A03303-ELECTRICITY CHARGES",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  107040,
        "description":  "Electricity Bill for the month of July 2026 Ref#13132130885109",
        "entryStatus":  "New",
        "timestamp":  "05-Aug-2026",
        "bankAccount":  "Payment of AAA For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  15,
        "voucherNo":  "SC-AUG26-001",
        "payeeName":  "Rozina Kousar",
        "ntnCnic":  "8908250-5",
        "billNo":  "Jul 2026 BT Self",
        "billDate":  "01-Jul-2026",
        "chequeNoNet":  "8.061065825E9",
        "chequeDate":  "",
        "chequeAmountNet":  25920,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  25920,
        "description":  "BT Self Salary Jul 2026 Rozina Kousar Evening",
        "entryStatus":  "New",
        "timestamp":  "10-Aug-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  16,
        "voucherNo":  "NS-AUG26-001",
        "payeeName":  "Kashaf Noor",
        "ntnCnic":  "B698039-8",
        "billNo":  "Jul 2026 NAVTTC Salary",
        "billDate":  "01-Jul-2026",
        "chequeNoNet":  "8.061174917E9",
        "chequeDate":  "",
        "chequeAmountNet":  127646,
        "accountHead":  "A00000NTTR-NAVTTC COOK-TEACHER REMUNERATION",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  3979,
        "chequeNoIncomeTax":  "8.061174918E9",
        "billAmountGross":  131625,
        "description":  "NAVTTC Cook Kashaf Noor Salary Jul 2026",
        "entryStatus":  "New",
        "timestamp":  "10-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  463120
    },
    {
        "srNo":  17,
        "voucherNo":  "PF-AUG26-001",
        "payeeName":  "Hashir Traders",
        "ntnCnic":  "8637356-3",
        "billNo":  "200.0",
        "billDate":  "04-Aug-2026",
        "chequeNoNet":  "8.0610658E9",
        "chequeDate":  "10-Aug-2026",
        "chequeAmountNet":  14690,
        "accountHead":  "A00000PF-PUPIL FUND",
        "gstAmount":  295,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  855,
        "chequeNoIncomeTax":  "8.061187401E9",
        "billAmountGross":  15545,
        "description":  "Cook Morning Class Traning Material Jul 2026 (from Pupil Fund due unavailability of NS Funds)",
        "entryStatus":  "New",
        "timestamp":  "10-Aug-2026",
        "bankAccount":  "Payment of Pupil Funds For 2026-2027",
        "preEntryBalance":  0
    },
    {
        "srNo":  18,
        "voucherNo":  "NS-AUG26-002",
        "payeeName":  "Hashir Traders",
        "ntnCnic":  "8637356-3",
        "billNo":  "202.0",
        "billDate":  "04-Aug-2026",
        "chequeNoNet":  "8.061174919E9",
        "chequeDate":  "10-Aug-2026",
        "chequeAmountNet":  33933,
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "gstAmount":  578,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  1975,
        "chequeNoIncomeTax":  "8.06117492E9",
        "billAmountGross":  35908,
        "description":  "NAVTTC Cook Consumeable Training Material Jul 2026",
        "entryStatus":  "New",
        "timestamp":  "10-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  510567
    },
    {
        "srNo":  19,
        "voucherNo":  "PF-AUG26-002",
        "payeeName":  "Afshan Alam",
        "ntnCnic":  "",
        "billNo":  "AI Video Clip Generation (Online Chrages)",
        "billDate":  "27-Jul-2026",
        "chequeNoNet":  "8.061187402E9",
        "chequeDate":  "11-Aug-2026",
        "chequeAmountNet":  5950,
        "accountHead":  "A00000PF-PUPIL FUND",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  5950,
        "description":  "Institute AI Video Generation Class Rooms Building (Directions by District Director TEVTA Fsd) online chgs paid by Ms Afsha",
        "entryStatus":  "New",
        "timestamp":  "11-Aug-2026",
        "bankAccount":  "Payment of Pupil Funds For 2026-2027",
        "preEntryBalance":  323208
    },
    {
        "srNo":  20,
        "voucherNo":  "NS-AUG26-003",
        "payeeName":  "Kashif Zia",
        "ntnCnic":  "6709658-5",
        "billNo":  "NAVTTC Cylinder GAS",
        "billDate":  "11-Aug-2026",
        "chequeNoNet":  "8.061174921E9",
        "chequeDate":  "11-Aug-2026",
        "chequeAmountNet":  3500,
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  3500,
        "description":  "NAVTTC Cook Class GAS for Cylinder Use 06-08-2026  \u0026 11-08-2026",
        "entryStatus":  "New",
        "timestamp":  "11-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  474659
    },
    {
        "srNo":  21,
        "voucherNo":  "PF-AUG26-003",
        "payeeName":  "Akbar Ali",
        "ntnCnic":  "",
        "billNo":  "Director office housekeeping Jul 2026",
        "billDate":  "01-Jul-2026",
        "chequeNoNet":  "8.061187403E9",
        "chequeDate":  "11-Aug-2026",
        "chequeAmountNet":  1200,
        "accountHead":  "A00000PF-PUPIL FUND",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "0.0",
        "billAmountGross":  1200,
        "description":  "Akbar (housekeeper) Director office visits Jul 2026 Rickshaw Rent",
        "entryStatus":  "Updated",
        "timestamp":  "15-Aug-2026",
        "bankAccount":  "Payment of Pupil Funds For 2026-2027",
        "preEntryBalance":  316058
    },
    {
        "srNo":  22,
        "voucherNo":  "NS-AUG26-004",
        "payeeName":  "WASA",
        "ntnCnic":  "",
        "billNo":  "WASA Bill",
        "billDate":  "01-Aug-2026",
        "chequeNoNet":  "8.061174922E9",
        "chequeDate":  "11-Aug-2026",
        "chequeAmountNet":  7880,
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  7880,
        "description":  "Water Charges (WASA Bill Aug 2026) Paid from NAVTTC Overhead (Cook)",
        "entryStatus":  "New",
        "timestamp":  "11-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  103225
    },
    {
        "srNo":  23,
        "voucherNo":  "NS-AUG26-005",
        "payeeName":  "Anwar Traders",
        "ntnCnic":  "4821279-6",
        "billNo":  "2428.0",
        "billDate":  "10-Aug-2026",
        "chequeNoNet":  "8.061174923E9",
        "chequeDate":  "11-Aug-2026",
        "chequeAmountNet":  114844,
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "gstAmount":  11048,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  6684,
        "chequeNoIncomeTax":  "8.061174924E9",
        "billAmountGross":  121528,
        "description":  "NAVTTC Cook Training Material non Perishable Items 2nd QTR",
        "entryStatus":  "New",
        "timestamp":  "11-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  471159
    },
    {
        "srNo":  24,
        "voucherNo":  "BC-NS-JUL26-001",
        "payeeName":  "Bank Charges",
        "ntnCnic":  "",
        "billNo":  "",
        "billDate":  "10-Jul-2026",
        "chequeNoNet":  "",
        "chequeDate":  "10-Jul-2026",
        "chequeAmountNet":  2784,
        "accountHead":  "A03101-BANK CHARGES",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "",
        "billAmountGross":  2784,
        "description":  "Bank Charge  Cheque Book Issuance",
        "entryStatus":  "New",
        "timestamp":  "15-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  1407
    },
    {
        "srNo":  25,
        "voucherNo":  "SC-AUG26-002",
        "payeeName":  "M/S PANASONIC BUSINESS POINT",
        "ntnCnic":  "2862065-8",
        "billNo":  "15417.0",
        "billDate":  "03-Aug-2026",
        "chequeNoNet":  "8.061065826E9",
        "chequeDate":  "17-Aug-2026",
        "chequeAmountNet":  4950,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "0.0",
        "billAmountGross":  4950,
        "description":  "Photocopier Rent for the m/o July 2026",
        "entryStatus":  "New",
        "timestamp":  "17-Aug-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  212817
    },
    {
        "srNo":  26,
        "voucherNo":  "PF-AUG26-004",
        "payeeName":  "HASHIR TRADERS",
        "ntnCnic":  "8637356-3",
        "billNo":  "204.0",
        "billDate":  "11-Aug-2026",
        "chequeNoNet":  "8.061187404E9",
        "chequeDate":  "18-Aug-2026",
        "chequeAmountNet":  35767,
        "accountHead":  "A00000PF-PUPIL FUND",
        "gstAmount":  5774,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  2082,
        "chequeNoIncomeTax":  "8.061187405E9",
        "billAmountGross":  37849,
        "description":  "Morning Cook Class Cleanliness Items",
        "entryStatus":  "New",
        "timestamp":  "18-Aug-2026",
        "bankAccount":  "Payment of Pupil Funds For 2026-2027",
        "preEntryBalance":  316058
    },
    {
        "srNo":  27,
        "voucherNo":  "NS-AUG26-006",
        "payeeName":  "ANWAR TRADERS",
        "ntnCnic":  "4821279-6",
        "billNo":  "2431.0",
        "billDate":  "11-Aug-2026",
        "chequeNoNet":  "8.061174925E9",
        "chequeDate":  "18-Aug-2026",
        "chequeAmountNet":  43032,
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "gstAmount":  6946,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  2504,
        "chequeNoIncomeTax":  "8.061193876E9",
        "billAmountGross":  45536,
        "description":  "Cleanliness Consuemable Items, Material for NAVTTC Cook",
        "entryStatus":  "New",
        "timestamp":  "18-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  349631
    },
    {
        "srNo":  28,
        "voucherNo":  "SC-AUG26-003",
        "payeeName":  "ANWAR TRADERS",
        "ntnCnic":  "4821279-6",
        "billNo":  "2429.0",
        "billDate":  "11-Aug-2026",
        "chequeNoNet":  "8.061065827E9",
        "chequeDate":  "18-Aug-2026",
        "chequeAmountNet":  37991,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  6133,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  2211,
        "chequeNoIncomeTax":  "8.061065828E9",
        "billAmountGross":  40203,
        "description":  "Institute Cleanliness Items",
        "entryStatus":  "New",
        "timestamp":  "18-Aug-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  207867
    },
    {
        "srNo":  29,
        "voucherNo":  "NS-AUG26-007",
        "payeeName":  "ANWAR TRADERS",
        "ntnCnic":  "4821279-6",
        "billNo":  "2430.0",
        "billDate":  "11-Aug-2026",
        "chequeNoNet":  "8.061193877E9",
        "chequeDate":  "18-Aug-2026",
        "chequeAmountNet":  35026,
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "gstAmount":  1475,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  2039,
        "chequeNoIncomeTax":  "8.061193878E9",
        "billAmountGross":  37065,
        "description":  "NAVTTC Cook Perishable Items Aug 2026",
        "entryStatus":  "New",
        "timestamp":  "18-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  304095
    },
    {
        "srNo":  30,
        "voucherNo":  "NS-AUG26-008",
        "payeeName":  "KASHIF ZIA",
        "ntnCnic":  "6709658-5",
        "billNo":  "Diesel \u0026 Oven repair",
        "billDate":  "15-Aug-2026",
        "chequeNoNet":  "8.061193879E9",
        "chequeDate":  "18-Aug-2026",
        "chequeAmountNet":  6545,
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "0.0",
        "billAmountGross":  6545,
        "description":  "Diesel for Generator Use 15.8.26 \u0026 Oven Repair 27.7.26 (Amount Paid by Kashif)",
        "entryStatus":  "New",
        "timestamp":  "18-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  95345
    },
    {
        "srNo":  31,
        "voucherNo":  "SC-AUG26-004",
        "payeeName":  "ANWAR TRADERS",
        "ntnCnic":  "4821279-6",
        "billNo":  "2432.0",
        "billDate":  "15-Aug-2026",
        "chequeNoNet":  "8.061065829E9",
        "chequeDate":  "24-Aug-2026",
        "chequeAmountNet":  22581,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  3645,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  1314,
        "chequeNoIncomeTax":  "8.06106583E9",
        "billAmountGross":  23895,
        "description":  "14 Aug 2026 Indpendance Day Celebration Items",
        "entryStatus":  "New",
        "timestamp":  "24-Aug-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  167665
    },
    {
        "srNo":  32,
        "voucherNo":  "SC-AUG26-005",
        "payeeName":  "HASHIR TRADERS",
        "ntnCnic":  "8637356-3",
        "billNo":  "5.0",
        "billDate":  "21-Aug-2026",
        "chequeNoNet":  "8.061065831E9",
        "chequeDate":  "24-Aug-2026",
        "chequeAmountNet":  10638,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  0,
        "praAmount":  2180,
        "chequeNoPra":  "8.061065833E9",
        "incomeTaxAmount":  2262,
        "chequeNoIncomeTax":  "8.061065832E9",
        "billAmountGross":  15180,
        "description":  "14 Aug Independance day lighting etc exp service chgs",
        "entryStatus":  "New",
        "timestamp":  "24-Aug-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  143770
    },
    {
        "srNo":  33,
        "voucherNo":  "PF-AUG26-005",
        "payeeName":  "KASHIF ZIA",
        "ntnCnic":  "6709658-5",
        "billNo":  "GAS \u0026 Misc Repair",
        "billDate":  "04-Aug-2026",
        "chequeNoNet":  "8.061187406E9",
        "chequeDate":  "25-Aug-2026",
        "chequeAmountNet":  2700,
        "accountHead":  "A00000PF-PUPIL FUND",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "0.0",
        "billAmountGross":  2700,
        "description":  "Gas for Cook Lab, \u0026  Gardener Equipment repair (Amount Paid by Kashif Zia)",
        "entryStatus":  "New",
        "timestamp":  "25-Aug-2026",
        "bankAccount":  "Payment of Pupil Funds For 2026-2027",
        "preEntryBalance":  278209
    },
    {
        "srNo":  34,
        "voucherNo":  "PF-AUG26-006",
        "payeeName":  "DIYA PAKISTAN STIPEND-STUDENT",
        "ntnCnic":  "",
        "billNo":  "7719-20-228",
        "billDate":  "12-Jun-2026",
        "chequeNoNet":  "8061187407-455",
        "chequeDate":  "25-Aug-2026",
        "chequeAmountNet":  229000,
        "accountHead":  "A00000PF-PUPIL FUND",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "0.0",
        "billAmountGross":  229000,
        "description":  "Diya Stipend Chqs 2026 Distrbuted 49 Students",
        "entryStatus":  "Updated",
        "timestamp":  "25-Aug-2026",
        "bankAccount":  "Payment of Pupil Funds For 2026-2027",
        "preEntryBalance":  275509
    },
    {
        "srNo":  35,
        "voucherNo":  "NS-AUG26-009",
        "payeeName":  "HASHIR TRADERS",
        "ntnCnic":  "8637356-3",
        "billNo":  "208.0",
        "billDate":  "21-Aug-2026",
        "chequeNoNet":  "8.06119388E9",
        "chequeDate":  "27-Aug-2026",
        "chequeAmountNet":  21437,
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "gstAmount":  2810,
        "praAmount":  900,
        "chequeNoPra":  "8.061193882E9",
        "incomeTaxAmount":  1883,
        "chequeNoIncomeTax":  "8.061193881E9",
        "billAmountGross":  24220,
        "description":  "Fridge Repair NAVTTC Class, Misc Electric Repair, fan Repair etc",
        "entryStatus":  "New",
        "timestamp":  "27-Aug-2026",
        "bankAccount":  "Payment of Non Salary Expenditures For 2026-2027",
        "preEntryBalance":  88800
    },
    {
        "srNo":  36,
        "voucherNo":  "SC-AUG26-006",
        "payeeName":  "ANWAR TRADERS",
        "ntnCnic":  "4821279-6",
        "billNo":  "2434.0",
        "billDate":  "21-Aug-2026",
        "chequeNoNet":  "8.061065834E9",
        "chequeDate":  "28-Aug-2026",
        "chequeAmountNet":  30111,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  4410,
        "praAmount":  660,
        "chequeNoPra":  "8.061065836E9",
        "incomeTaxAmount":  2199,
        "chequeNoIncomeTax":  "8.061065835E9",
        "billAmountGross":  32970,
        "description":  "Misc Electric Repair Exhaust Fan etc Repair (Washroom ventilation etc)",
        "entryStatus":  "New",
        "timestamp":  "28-Aug-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  128690
    },
    {
        "srNo":  37,
        "voucherNo":  "SC-AUG26-007",
        "payeeName":  "IRAM SHAHZADI",
        "ntnCnic":  "33301-1595133-8",
        "billNo":  "BT GuestSpeaker",
        "billDate":  "11-Aug-2026",
        "chequeNoNet":  "8.061065837E9",
        "chequeDate":  "28-Aug-2026",
        "chequeAmountNet":  5000,
        "accountHead":  "A00000SC-SHORT COURSE",
        "gstAmount":  0,
        "praAmount":  0,
        "chequeNoPra":  "0.0",
        "incomeTaxAmount":  0,
        "chequeNoIncomeTax":  "0.0",
        "billAmountGross":  5000,
        "description":  "Beautician Class Guest Speaker dated 11.08.2026",
        "entryStatus":  "New",
        "timestamp":  "28-Aug-2026",
        "bankAccount":  "Payment of Short Course For 2026-2027",
        "preEntryBalance":  95720
    }
]
;

// -------------------------------------------------------------
// AUTHENTIC CASHBOOK LEDGER ENTRIES FOR ALL 6 ACCOUNTS
// -------------------------------------------------------------
export const INITIAL_CASHBOOK_STATES: Record<BankAccountKey, CashBookAccountState> = {
  NS: {
    meta: INSTITUTIONAL_BANK_ACCOUNTS.NS,
    openingBalance: 2387207,
    totalReceipts: 0,
    totalPayments: 621287,
    closingBalance: 1765920,
    unpresentedChequesTotal: 0,
    reconciledBankBalance: 1765920,
    entries: [
    {
        "id":  "NS-E6",
        "srNo":  1,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "1.0",
        "voucherSerial":  "NS-JUL26-001",
        "particulars":  "Sanitary Extention for NAVTTC Cook Lab Drinking Water",
        "paidToBy":  "Hashir Traders",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061174906",
        "receipts":  0,
        "payments":  62536,
        "runningBalance":  2324671,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E7",
        "srNo":  2,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "1.0",
        "voucherSerial":  "NS-JUL26-001",
        "particulars":  "Sanitary Extention for NAVTTC Cook Lab Drinking Water",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061174907",
        "receipts":  0,
        "payments":  5534,
        "runningBalance":  2319137,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E8",
        "srNo":  3,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "1.0",
        "voucherSerial":  "NS-JUL26-001",
        "particulars":  "Sanitary Extention for NAVTTC Cook Lab Drinking Water",
        "paidToBy":  "PRA Tax",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061174908",
        "receipts":  0,
        "payments":  2500,
        "runningBalance":  2316637,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E9",
        "srNo":  4,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "4.0",
        "voucherSerial":  "NS-JUL26-002",
        "particulars":  "GAS for Cook Lab Cylinder NAVTTC Course (Consumeable Material) 9kg GAS two cylinder",
        "paidToBy":  "Kashif Zia",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174909",
        "receipts":  0,
        "payments":  4000,
        "runningBalance":  2312637,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E10",
        "srNo":  5,
        "date":  "04-Jul-2026",
        "month":  "July",
        "vNo":  "7.0",
        "voucherSerial":  "NS-JUL26-004",
        "particulars":  "Computer Operator Ind Visit 30.6 Vehicle Rent etc. Driver Amir",
        "paidToBy":  "Amir Shahzad Driver",
        "accountHead":  "PLACEMENT-A03807-POL",
        "chequeNo":  "8061174910",
        "receipts":  0,
        "payments":  6500,
        "runningBalance":  2306137,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E11",
        "srNo":  6,
        "date":  "04-Jul-2026",
        "month":  "July",
        "vNo":  "8.0",
        "voucherSerial":  "NS-JUL26-005",
        "particulars":  "Placement Activity, Guest Speaker Lecture, Computer Operator Class IPO Iram Shahzadi",
        "paidToBy":  "Iram Shahzadi",
        "accountHead":  "PLACEMENT-A03903- CONFRENCE SEMINAR \u0026 WORKSHOP",
        "chequeNo":  "8061174911",
        "receipts":  0,
        "payments":  5000,
        "runningBalance":  2301137,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E12",
        "srNo":  7,
        "date":  "07-Jul-2026",
        "month":  "July",
        "vNo":  "5.0",
        "voucherSerial":  "NS-JUL26-003",
        "particulars":  "Electricity Bill June 2026 Ref#109 on Loan Basis from other head.",
        "paidToBy":  "FESCO",
        "accountHead":  "A03303-ELECTRICITY CHARGES",
        "chequeNo":  "8061174913",
        "receipts":  0,
        "payments":  89846,
        "runningBalance":  2211291,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E13",
        "srNo":  8,
        "date":  "10-Jul-2026",
        "month":  "July",
        "vNo":  "24.0",
        "voucherSerial":  "BC-NS-JUL26-001",
        "particulars":  "Bank Charge  Cheque Book Issuance",
        "paidToBy":  "Bank Charges",
        "accountHead":  "A03101-BANK CHARGES",
        "chequeNo":  "",
        "receipts":  0,
        "payments":  2784,
        "runningBalance":  2208507,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E14",
        "srNo":  9,
        "date":  "13-Jul-2026",
        "month":  "July",
        "vNo":  "9.0",
        "voucherSerial":  "NS-JUL26-006",
        "particulars":  "GAS Refilled for Cylinders 03,09,13 Jul 2026 2500*3",
        "paidToBy":  "Kashif Zia",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174914",
        "receipts":  0,
        "payments":  7500,
        "runningBalance":  2201007,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E15",
        "srNo":  10,
        "date":  "20-Jul-2026",
        "month":  "July",
        "vNo":  "11.0",
        "voucherSerial":  "NS-JUL26-007",
        "particulars":  "PTCL Bills 0412662425=8570,0412406642=7710 paid from NAVTTC overhead",
        "paidToBy":  "PTCL",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061174915",
        "receipts":  0,
        "payments":  16280,
        "runningBalance":  2184727,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E16",
        "srNo":  11,
        "date":  "22-Jul-2026",
        "month":  "July",
        "vNo":  "12.0",
        "voucherSerial":  "NS-JUL26-008",
        "particulars":  "Paid for Cylinder GAS for NAVTTC (Consumable material) Class (Paid by Ms Iram Shahzadi)",
        "paidToBy":  "IRAM SHAHZADI",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174916",
        "receipts":  0,
        "payments":  5000,
        "runningBalance":  2179727,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E17",
        "srNo":  12,
        "date":  "10-Aug-2026",
        "month":  "August",
        "vNo":  "16.0",
        "voucherSerial":  "NS-AUG26-001",
        "particulars":  "NAVTTC Cook Kashaf Noor Salary Jul 2026",
        "paidToBy":  "Kashaf Noor",
        "accountHead":  "A00000NTTR-NAVTTC COOK-TEACHER REMUNERATION",
        "chequeNo":  "8061174917",
        "receipts":  0,
        "payments":  127646,
        "runningBalance":  2052081,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E18",
        "srNo":  13,
        "date":  "10-Aug-2026",
        "month":  "August",
        "vNo":  "16.0",
        "voucherSerial":  "NS-AUG26-001",
        "particulars":  "NAVTTC Cook Kashaf Noor Salary Jul 2026",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000NTTR-NAVTTC COOK-TEACHER REMUNERATION",
        "chequeNo":  "8061174918",
        "receipts":  0,
        "payments":  3979,
        "runningBalance":  2048102,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E19",
        "srNo":  14,
        "date":  "10-Aug-2026",
        "month":  "August",
        "vNo":  "18.0",
        "voucherSerial":  "NS-AUG26-002",
        "particulars":  "NAVTTC Cook Consumeable Training Material Jul 2026",
        "paidToBy":  "Hashir Traders",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174919",
        "receipts":  0,
        "payments":  33933,
        "runningBalance":  2014169,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E20",
        "srNo":  15,
        "date":  "10-Aug-2026",
        "month":  "August",
        "vNo":  "18.0",
        "voucherSerial":  "NS-AUG26-002",
        "particulars":  "NAVTTC Cook Consumeable Training Material Jul 2026",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174920",
        "receipts":  0,
        "payments":  1975,
        "runningBalance":  2012194,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E21",
        "srNo":  16,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "20.0",
        "voucherSerial":  "NS-AUG26-003",
        "particulars":  "NAVTTC Cook Class GAS for Cylinder Use 06-08-2026  \u0026 11-08-2026",
        "paidToBy":  "Kashif Zia",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174921",
        "receipts":  0,
        "payments":  3500,
        "runningBalance":  2008694,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E22",
        "srNo":  17,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "22.0",
        "voucherSerial":  "NS-AUG26-004",
        "particulars":  "Water Charges (WASA Bill Aug 2026) Paid from NAVTTC Overhead (Cook)",
        "paidToBy":  "WASA",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061174922",
        "receipts":  0,
        "payments":  7880,
        "runningBalance":  2000814,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E23",
        "srNo":  18,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "23.0",
        "voucherSerial":  "NS-AUG26-005",
        "particulars":  "NAVTTC Cook Training Material non Perishable Items 2nd QTR",
        "paidToBy":  "Anwar Traders",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174923",
        "receipts":  0,
        "payments":  114844,
        "runningBalance":  1885970,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E24",
        "srNo":  19,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "23.0",
        "voucherSerial":  "NS-AUG26-005",
        "particulars":  "NAVTTC Cook Training Material non Perishable Items 2nd QTR",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174924",
        "receipts":  0,
        "payments":  6684,
        "runningBalance":  1879286,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E25",
        "srNo":  20,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "27.0",
        "voucherSerial":  "NS-AUG26-006",
        "particulars":  "Cleanliness Consuemable Items, Material for NAVTTC Cook",
        "paidToBy":  "ANWAR TRADERS",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061174925",
        "receipts":  0,
        "payments":  43032,
        "runningBalance":  1836254,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E26",
        "srNo":  21,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "27.0",
        "voucherSerial":  "NS-AUG26-006",
        "particulars":  "Cleanliness Consuemable Items, Material for NAVTTC Cook",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061193876",
        "receipts":  0,
        "payments":  2504,
        "runningBalance":  1833750,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E27",
        "srNo":  22,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "29.0",
        "voucherSerial":  "NS-AUG26-007",
        "particulars":  "NAVTTC Cook Perishable Items Aug 2026",
        "paidToBy":  "ANWAR TRADERS",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061193877",
        "receipts":  0,
        "payments":  35026,
        "runningBalance":  1798724,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E28",
        "srNo":  23,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "29.0",
        "voucherSerial":  "NS-AUG26-007",
        "particulars":  "NAVTTC Cook Perishable Items Aug 2026",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000NTTM-NAVTTC COOK-TRAINING MATERIAL",
        "chequeNo":  "8061193878",
        "receipts":  0,
        "payments":  2039,
        "runningBalance":  1796685,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E29",
        "srNo":  24,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "30.0",
        "voucherSerial":  "NS-AUG26-008",
        "particulars":  "Diesel for Generator Use 15.8.26 \u0026 Oven Repair 27.7.26 (Amount Paid by Kashif)",
        "paidToBy":  "KASHIF ZIA",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061193879",
        "receipts":  0,
        "payments":  6545,
        "runningBalance":  1790140,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E30",
        "srNo":  25,
        "date":  "27-Aug-2026",
        "month":  "August",
        "vNo":  "35.0",
        "voucherSerial":  "NS-AUG26-009",
        "particulars":  "Fridge Repair NAVTTC Class, Misc Electric Repair, fan Repair etc",
        "paidToBy":  "HASHIR TRADERS",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061193880",
        "receipts":  0,
        "payments":  21437,
        "runningBalance":  1768703,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E31",
        "srNo":  26,
        "date":  "27-Aug-2026",
        "month":  "August",
        "vNo":  "35.0",
        "voucherSerial":  "NS-AUG26-009",
        "particulars":  "Fridge Repair NAVTTC Class, Misc Electric Repair, fan Repair etc",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061193881",
        "receipts":  0,
        "payments":  1883,
        "runningBalance":  1766820,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "NS-E32",
        "srNo":  27,
        "date":  "27-Aug-2026",
        "month":  "August",
        "vNo":  "35.0",
        "voucherSerial":  "NS-AUG26-009",
        "particulars":  "Fridge Repair NAVTTC Class, Misc Electric Repair, fan Repair etc",
        "paidToBy":  "PRA Tax",
        "accountHead":  "A00000NTOH-NAVTTC COOK-OVERHEADS",
        "chequeNo":  "8061193882",
        "receipts":  0,
        "payments":  900,
        "runningBalance":  1765920,
        "entryType":  "PAYMENT"
    }
],
  },
  PF: {
    meta: INSTITUTIONAL_BANK_ACCOUNTS.PF,
    openingBalance: 408588,
    totalReceipts: 0,
    totalPayments: 362079,
    closingBalance: 46509,
    unpresentedChequesTotal: 0,
    reconciledBankBalance: 46509,
    entries: [
    {
        "id":  "PF-E6",
        "srNo":  1,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "2.0",
        "voucherSerial":  "PF-JUL26-001",
        "particulars":  "Misc Electric Repair Flood lights Security Lights Breakers, wire etc for Lab Use",
        "paidToBy":  "Hashir Traders",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061065795",
        "receipts":  0,
        "payments":  52281,
        "runningBalance":  356307,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E7",
        "srNo":  2,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "2.0",
        "voucherSerial":  "PF-JUL26-001",
        "particulars":  "Misc Electric Repair Flood lights Security Lights Breakers, wire etc for Lab Use",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061065796",
        "receipts":  0,
        "payments":  3741,
        "runningBalance":  352566,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E8",
        "srNo":  3,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "2.0",
        "voucherSerial":  "PF-JUL26-001",
        "particulars":  "Misc Electric Repair Flood lights Security Lights Breakers, wire etc for Lab Use",
        "paidToBy":  "PRA Tax",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061065797",
        "receipts":  0,
        "payments":  980,
        "runningBalance":  351586,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E9",
        "srNo":  4,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "3.0",
        "voucherSerial":  "PF-JUL26-002",
        "particulars":  "Student ID Card Session April 2026 complete set",
        "paidToBy":  "Anwar Traders",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061065798",
        "receipts":  0,
        "payments":  12127,
        "runningBalance":  339459,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E10",
        "srNo":  5,
        "date":  "03-Jul-2026",
        "month":  "July",
        "vNo":  "3.0",
        "voucherSerial":  "PF-JUL26-002",
        "particulars":  "Student ID Card Session April 2026 complete set",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061065799",
        "receipts":  0,
        "payments":  706,
        "runningBalance":  338753,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E11",
        "srNo":  6,
        "date":  "10-Aug-2026",
        "month":  "August",
        "vNo":  "17.0",
        "voucherSerial":  "PF-AUG26-001",
        "particulars":  "Cook Morning Class Traning Material Jul 2026 (from Pupil Fund due unavailability of NS Funds)",
        "paidToBy":  "Hashir Traders",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061065800",
        "receipts":  0,
        "payments":  14690,
        "runningBalance":  324063,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E12",
        "srNo":  7,
        "date":  "10-Aug-2026",
        "month":  "August",
        "vNo":  "17.0",
        "voucherSerial":  "PF-AUG26-001",
        "particulars":  "Cook Morning Class Traning Material Jul 2026 (from Pupil Fund due unavailability of NS Funds)",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061187401",
        "receipts":  0,
        "payments":  855,
        "runningBalance":  323208,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E13",
        "srNo":  8,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "19.0",
        "voucherSerial":  "PF-AUG26-002",
        "particulars":  "Institute AI Video Generation Class Rooms Building (Directions by District Director TEVTA Fsd) online chgs paid by Ms Afsha",
        "paidToBy":  "Afshan Alam",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061187402",
        "receipts":  0,
        "payments":  5950,
        "runningBalance":  317258,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E14",
        "srNo":  9,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "21.0",
        "voucherSerial":  "PF-AUG26-003",
        "particulars":  "Akbar (housekeeper) Director office visits Jul 2026 Rickshaw Rent",
        "paidToBy":  "Akbar Ali",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061187403",
        "receipts":  0,
        "payments":  1200,
        "runningBalance":  316058,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E15",
        "srNo":  10,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "26.0",
        "voucherSerial":  "PF-AUG26-004",
        "particulars":  "Morning Cook Class Cleanliness Items",
        "paidToBy":  "HASHIR TRADERS",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061187404",
        "receipts":  0,
        "payments":  35767,
        "runningBalance":  280291,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E16",
        "srNo":  11,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "26.0",
        "voucherSerial":  "PF-AUG26-004",
        "particulars":  "Morning Cook Class Cleanliness Items",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061187405",
        "receipts":  0,
        "payments":  2082,
        "runningBalance":  278209,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E17",
        "srNo":  12,
        "date":  "25-Aug-2026",
        "month":  "August",
        "vNo":  "33.0",
        "voucherSerial":  "PF-AUG26-005",
        "particulars":  "Gas for Cook Lab, \u0026  Gardener Equipment repair (Amount Paid by Kashif Zia)",
        "paidToBy":  "KASHIF ZIA",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061187406",
        "receipts":  0,
        "payments":  2700,
        "runningBalance":  275509,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "PF-E18",
        "srNo":  13,
        "date":  "25-Aug-2026",
        "month":  "August",
        "vNo":  "34.0",
        "voucherSerial":  "PF-AUG26-006",
        "particulars":  "Diya Stipend Chqs 2026 Distrbuted 49 Students",
        "paidToBy":  "DIYA PAKISTAN STIPEND-STUDENT",
        "accountHead":  "A00000PF-PUPIL FUND",
        "chequeNo":  "8061187407-455",
        "receipts":  0,
        "payments":  229000,
        "runningBalance":  46509,
        "entryType":  "PAYMENT"
    }
],
  },
  FC: {
    meta: INSTITUTIONAL_BANK_ACCOUNTS.FC,
    openingBalance: 77717.04,
    totalReceipts: 0,
    totalPayments: 0,
    closingBalance: 77717.04,
    unpresentedChequesTotal: 0,
    reconciledBankBalance: 77717.04,
    entries: ,
  },
  SC: {
    meta: INSTITUTIONAL_BANK_ACCOUNTS.SC,
    openingBalance: 251567,
    totalReceipts: 0,
    totalPayments: 160847,
    closingBalance: 90720,
    unpresentedChequesTotal: 0,
    reconciledBankBalance: 90720,
    entries: [
    {
        "id":  "SC-E6",
        "srNo":  1,
        "date":  "10-Jul-2026",
        "month":  "July",
        "vNo":  "6.0",
        "voucherSerial":  "SC-JUL26-001",
        "particulars":  "WASA Bill Jul 2026 paid from Short Course",
        "paidToBy":  "WASA",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065823",
        "receipts":  0,
        "payments":  7880,
        "runningBalance":  243687,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E7",
        "srNo":  2,
        "date":  "13-Jul-2026",
        "month":  "July",
        "vNo":  "10.0",
        "voucherSerial":  "SC-JUL26-002",
        "particulars":  "Paid Photocopies Charges for June 2026",
        "paidToBy":  "M/S PANASONIC BUSINESS POINT-1",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065824",
        "receipts":  0,
        "payments":  4950,
        "runningBalance":  238737,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E8",
        "srNo":  3,
        "date":  "10-Aug-2026",
        "month":  "August",
        "vNo":  "15.0",
        "voucherSerial":  "SC-AUG26-001",
        "particulars":  "BT Self Salary Jul 2026 Rozina Kousar Evening",
        "paidToBy":  "Rozina Kousar",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065825",
        "receipts":  0,
        "payments":  25920,
        "runningBalance":  212817,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E9",
        "srNo":  4,
        "date":  "17-Aug-2026",
        "month":  "August",
        "vNo":  "25.0",
        "voucherSerial":  "SC-AUG26-002",
        "particulars":  "Photocopier Rent for the m/o July 2026",
        "paidToBy":  "M/S PANASONIC BUSINESS POINT",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065826",
        "receipts":  0,
        "payments":  4950,
        "runningBalance":  207867,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E10",
        "srNo":  5,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "28.0",
        "voucherSerial":  "SC-AUG26-003",
        "particulars":  "Institute Cleanliness Items",
        "paidToBy":  "ANWAR TRADERS",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065827",
        "receipts":  0,
        "payments":  37991,
        "runningBalance":  169876,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E11",
        "srNo":  6,
        "date":  "18-Aug-2026",
        "month":  "August",
        "vNo":  "28.0",
        "voucherSerial":  "SC-AUG26-003",
        "particulars":  "Institute Cleanliness Items",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065828",
        "receipts":  0,
        "payments":  2211,
        "runningBalance":  167665,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E12",
        "srNo":  7,
        "date":  "24-Aug-2026",
        "month":  "August",
        "vNo":  "31.0",
        "voucherSerial":  "SC-AUG26-004",
        "particulars":  "14 Aug 2026 Indpendance Day Celebration Items",
        "paidToBy":  "ANWAR TRADERS",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065829",
        "receipts":  0,
        "payments":  22581,
        "runningBalance":  145084,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E13",
        "srNo":  8,
        "date":  "24-Aug-2026",
        "month":  "August",
        "vNo":  "31.0",
        "voucherSerial":  "SC-AUG26-004",
        "particulars":  "14 Aug 2026 Indpendance Day Celebration Items",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065830",
        "receipts":  0,
        "payments":  1314,
        "runningBalance":  143770,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E14",
        "srNo":  9,
        "date":  "24-Aug-2026",
        "month":  "August",
        "vNo":  "32.0",
        "voucherSerial":  "SC-AUG26-005",
        "particulars":  "14 Aug Independance day lighting etc exp service chgs",
        "paidToBy":  "HASHIR TRADERS",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065831",
        "receipts":  0,
        "payments":  10638,
        "runningBalance":  133132,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E15",
        "srNo":  10,
        "date":  "24-Aug-2026",
        "month":  "August",
        "vNo":  "32.0",
        "voucherSerial":  "SC-AUG26-005",
        "particulars":  "14 Aug Independance day lighting etc exp service chgs",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065832",
        "receipts":  0,
        "payments":  2262,
        "runningBalance":  130870,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E16",
        "srNo":  11,
        "date":  "24-Aug-2026",
        "month":  "August",
        "vNo":  "32.0",
        "voucherSerial":  "SC-AUG26-005",
        "particulars":  "14 Aug Independance day lighting etc exp service chgs",
        "paidToBy":  "PRA Tax",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065833",
        "receipts":  0,
        "payments":  2180,
        "runningBalance":  128690,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E17",
        "srNo":  12,
        "date":  "28-Aug-2026",
        "month":  "August",
        "vNo":  "36.0",
        "voucherSerial":  "SC-AUG26-006",
        "particulars":  "Misc Electric Repair Exhaust Fan etc Repair (Washroom ventilation etc)",
        "paidToBy":  "ANWAR TRADERS",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065834",
        "receipts":  0,
        "payments":  30111,
        "runningBalance":  98579,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E18",
        "srNo":  13,
        "date":  "28-Aug-2026",
        "month":  "August",
        "vNo":  "36.0",
        "voucherSerial":  "SC-AUG26-006",
        "particulars":  "Misc Electric Repair Exhaust Fan etc Repair (Washroom ventilation etc)",
        "paidToBy":  "Income Tax",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065835",
        "receipts":  0,
        "payments":  2199,
        "runningBalance":  96380,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E19",
        "srNo":  14,
        "date":  "28-Aug-2026",
        "month":  "August",
        "vNo":  "36.0",
        "voucherSerial":  "SC-AUG26-006",
        "particulars":  "Misc Electric Repair Exhaust Fan etc Repair (Washroom ventilation etc)",
        "paidToBy":  "PRA Tax",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065836",
        "receipts":  0,
        "payments":  660,
        "runningBalance":  95720,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "SC-E20",
        "srNo":  15,
        "date":  "28-Aug-2026",
        "month":  "August",
        "vNo":  "37.0",
        "voucherSerial":  "SC-AUG26-007",
        "particulars":  "Beautician Class Guest Speaker dated 11.08.2026",
        "paidToBy":  "IRAM SHAHZADI",
        "accountHead":  "A00000SC-SHORT COURSE",
        "chequeNo":  "8061065837",
        "receipts":  0,
        "payments":  5000,
        "runningBalance":  90720,
        "entryType":  "PAYMENT"
    }
],
  },
  SEC: {
    meta: INSTITUTIONAL_BANK_ACCOUNTS.SEC,
    openingBalance: 357709,
    totalReceipts: 0,
    totalPayments: 0,
    closingBalance: 357709,
    unpresentedChequesTotal: 0,
    reconciledBankBalance: 357709,
    entries: ,
  },
  AA: {
    meta: INSTITUTIONAL_BANK_ACCOUNTS.AA,
    openingBalance: 0,
    totalReceipts: 508831,
    totalPayments: 123310,
    closingBalance: 385521,
    unpresentedChequesTotal: 0,
    reconciledBankBalance: 385521,
    entries: [
    {
        "id":  "AA-E6",
        "srNo":  1,
        "date":  "05-Aug-2026",
        "month":  "August",
        "vNo":  "13.0",
        "voucherSerial":  "AA-AUG26-001",
        "particulars":  "PTCL Bills 0412662425=8560, 0412406642=7710",
        "paidToBy":  "PTCL",
        "accountHead":  "A03202-TELEPHONE \u0026 TRUNK CHARGES",
        "chequeNo":  "AAA",
        "receipts":  0,
        "payments":  16270,
        "runningBalance":  -16270,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "AA-E7",
        "srNo":  2,
        "date":  "05-Aug-2026",
        "month":  "August",
        "vNo":  "14.0",
        "voucherSerial":  "AA-AUG26-002",
        "particulars":  "Electricity Bill for the month of July 2026 Ref#13132130885109",
        "paidToBy":  "FESCO",
        "accountHead":  "A03303-ELECTRICITY CHARGES",
        "chequeNo":  "AAA",
        "receipts":  0,
        "payments":  107040,
        "runningBalance":  -123310,
        "entryType":  "PAYMENT"
    },
    {
        "id":  "AA-E8",
        "srNo":  3,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03201-POSTAGE \u0026 TELEGRAPH",
        "chequeNo":  "AAA",
        "receipts":  4794,
        "payments":  0,
        "runningBalance":  -118516,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E9",
        "srNo":  4,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03202-TELEPHONE \u0026 TRUNK CHARGES",
        "chequeNo":  "AAA",
        "receipts":  23697,
        "payments":  0,
        "runningBalance":  -94819,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E10",
        "srNo":  5,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03301-SUI GAS CHARGES",
        "chequeNo":  "AAA",
        "receipts":  3529,
        "payments":  0,
        "runningBalance":  -91290,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E11",
        "srNo":  6,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03302-WATER CHARGES",
        "chequeNo":  "AAA",
        "receipts":  8046,
        "payments":  0,
        "runningBalance":  -83244,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E12",
        "srNo":  7,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03303-ELECTRICITY CHARGES",
        "chequeNo":  "AAA",
        "receipts":  202490,
        "payments":  0,
        "runningBalance":  119246,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E13",
        "srNo":  8,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03805-TA/DA CHARGES",
        "chequeNo":  "AAA",
        "receipts":  6804,
        "payments":  0,
        "runningBalance":  126050,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E14",
        "srNo":  9,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03807-POL CHARGES",
        "chequeNo":  "AAA",
        "receipts":  67546,
        "payments":  0,
        "runningBalance":  193596,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E15",
        "srNo":  10,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03808-CONVEYANCE CHARGES",
        "chequeNo":  "AAA",
        "receipts":  3314,
        "payments":  0,
        "runningBalance":  196910,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E16",
        "srNo":  11,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03901-STATIONERY CHARGES",
        "chequeNo":  "AAA",
        "receipts":  19334,
        "payments":  0,
        "runningBalance":  216244,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E17",
        "srNo":  12,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03902-PRINTING CHARGES",
        "chequeNo":  "AAA",
        "receipts":  8393,
        "payments":  0,
        "runningBalance":  224637,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E18",
        "srNo":  13,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A03933-SERVICE CHARGES",
        "chequeNo":  "AAA",
        "receipts":  142852,
        "payments":  0,
        "runningBalance":  367489,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E19",
        "srNo":  14,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A13101-REPAIR OF MACHINERY/EQUIPMENTS",
        "chequeNo":  "AAA",
        "receipts":  6212,
        "payments":  0,
        "runningBalance":  373701,
        "entryType":  "RECEIPT"
    },
    {
        "id":  "AA-E20",
        "srNo":  15,
        "date":  "11-Aug-2026",
        "month":  "August",
        "vNo":  "",
        "voucherSerial":  "",
        "particulars":  "1st Qtr Budget Jul-Sep 2026 AAA",
        "paidToBy":  "Budget",
        "accountHead":  "A13201-REPAIR OF FURNITURE \u0026 FIXTURES",
        "chequeNo":  "AAA",
        "receipts":  11820,
        "payments":  0,
        "runningBalance":  385521,
        "entryType":  "RECEIPT"
    }
],
  },
};
