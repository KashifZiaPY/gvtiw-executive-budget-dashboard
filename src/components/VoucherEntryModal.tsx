import React, { useState, useEffect, useMemo } from 'react';
import { MasterVoucher } from '../data/cashBookData';
import { MASTER_PAYEE_LIST, MASTER_ACCOUNT_HEADS, PayeeRecord } from '../data/voucherMasterLists';
import { formatPKR } from '../lib/formatters';
import { X, CheckCircle, AlertCircle, Building2, Receipt, Landmark, FileSpreadsheet, Search } from 'lucide-react';

interface VoucherEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherToAmend?: MasterVoucher | null;
  onSaveVoucher: (newVoucher: MasterVoucher, isAmend: boolean) => void;
  existingVouchers: MasterVoucher[];
}

const BANK_OPTIONS = [
  { key: 'NS', shortName: 'Non-Salary', fullName: 'Payment of Non Salary Expenditures For 2026-2027' },
  { key: 'PF', shortName: 'Pupil Funds', fullName: 'Payment of Pupil Funds For 2026-2027' },
  { key: 'FC', shortName: 'Fee Collection', fullName: 'Payment of TEVTA Fee Collection For 2026-2027' },
  { key: 'SEC', shortName: 'Securities', fullName: 'Payment of Securities For 2026-2027' },
  { key: 'SC', shortName: 'Short Course', fullName: 'Payment of Short Course For 2026-2027' },
  { key: 'AA', shortName: 'AAA', fullName: 'Payment of AAA For 2026-2027' },
];

export const VoucherEntryModal: React.FC<VoucherEntryModalProps> = ({
  isOpen,
  onClose,
  voucherToAmend,
  onSaveVoucher,
  existingVouchers,
}) => {
  const isAmend = Boolean(voucherToAmend);
  const todayISO = new Date().toISOString().slice(0, 10);

  // Form State
  const [payeeName, setPayeeName] = useState('');
  const [payeeSearch, setPayeeSearch] = useState('');
  const [isPayeeDropdownOpen, setIsPayeeDropdownOpen] = useState(false);
  const [ntnCnic, setNtnCnic] = useState('');

  const [bankAccount, setBankAccount] = useState(BANK_OPTIONS[0].fullName);

  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(todayISO);
  const [billAmtExclTax, setBillAmtExclTax] = useState<number>(0);
  const [saleTax, setSaleTax] = useState<number>(0);
  const [praTaxOnBill, setPraTaxOnBill] = useState<number>(0);

  const [chequeNoNet, setChequeNoNet] = useState('');
  const [chequeDate, setChequeDate] = useState(todayISO);
  const [chequeAmtNet, setChequeAmtNet] = useState<number>(0);

  const [chequeNoIncomeTax, setChequeNoIncomeTax] = useState('0');
  const [incomeTaxAmt, setIncomeTaxAmt] = useState<number>(0);

  const [chequeNoPra, setChequeNoPra] = useState('0');
  const [praTaxAmt, setPraTaxAmt] = useState<number>(0);

  const [accountHead, setAccountHead] = useState(MASTER_ACCOUNT_HEADS[0] || '');
  const [headSearch, setHeadSearch] = useState('');
  const [isHeadDropdownOpen, setIsHeadDropdownOpen] = useState(false);

  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (voucherToAmend) {
      setPayeeName(voucherToAmend.payeeName || '');
      setPayeeSearch(voucherToAmend.payeeName || '');
      setNtnCnic(voucherToAmend.ntnCnic || '');
      setBankAccount(voucherToAmend.bankAccount || BANK_OPTIONS[0].fullName);
      setBillNo(voucherToAmend.billNo || '');
      setBillDate(voucherToAmend.billDate || todayISO);
      setBillAmtExclTax(voucherToAmend.billAmtExclTax || voucherToAmend.billAmountGross || 0);
      setSaleTax(voucherToAmend.gstAmount || 0);
      setPraTaxOnBill(voucherToAmend.praTaxOnBill || 0);
      setChequeNoNet(voucherToAmend.chequeNoNet || '');
      setChequeDate(voucherToAmend.chequeDate || todayISO);
      setChequeAmtNet(voucherToAmend.chequeAmountNet || 0);
      setChequeNoIncomeTax(voucherToAmend.chequeNoIncomeTax || '0');
      setIncomeTaxAmt(voucherToAmend.incomeTaxAmount || 0);
      setChequeNoPra(voucherToAmend.chequeNoPra || '0');
      setPraTaxAmt(voucherToAmend.praAmount || 0);
      setAccountHead(voucherToAmend.accountHead || MASTER_ACCOUNT_HEADS[0] || '');
      setHeadSearch(voucherToAmend.accountHead || '');
      setDescription(voucherToAmend.description || '');
    } else {
      setPayeeName('');
      setPayeeSearch('');
      setNtnCnic('');
      setBankAccount(BANK_OPTIONS[0].fullName);
      setBillNo('');
      setBillDate(todayISO);
      setBillAmtExclTax(0);
      setSaleTax(0);
      setPraTaxOnBill(0);
      setChequeNoNet('');
      setChequeDate(todayISO);
      setChequeAmtNet(0);
      setChequeNoIncomeTax('0');
      setIncomeTaxAmt(0);
      setChequeNoPra('0');
      setPraTaxAmt(0);
      setAccountHead('');
      setHeadSearch('');
      setDescription('');
    }
    setErrorMsg(null);
  }, [isOpen, voucherToAmend]);

  // Filter Payees: when search matches payeeName or is empty, show all 121 payees!
  const filteredPayees = useMemo(() => {
    if (!payeeSearch || payeeSearch.trim() === payeeName.trim()) return MASTER_PAYEE_LIST;
    const s = payeeSearch.toLowerCase().trim();
    return MASTER_PAYEE_LIST.filter((p) => p.name.toLowerCase().includes(s));
  }, [payeeSearch, payeeName]);

  // Filter Heads: when search matches accountHead or is empty, show all 42 heads!
  const filteredHeads = useMemo(() => {
    if (!headSearch || headSearch.trim() === accountHead.trim()) return MASTER_ACCOUNT_HEADS;
    const s = headSearch.toLowerCase().trim();
    return MASTER_ACCOUNT_HEADS.filter((h) => h.toLowerCase().includes(s));
  }, [headSearch, accountHead]);

  // Dynamic Current FY Expenditure for selected Head
  const currentHeadExpenditure = useMemo(() => {
    if (!accountHead) return 0;
    return existingVouchers
      .filter((v) => v.accountHead === accountHead)
      .reduce((sum, v) => sum + (v.billAmountGross || 0), 0);
  }, [accountHead, existingVouchers]);

  if (!isOpen) return null;

  // Handle Payee Select
  const handleSelectPayee = (payee: PayeeRecord) => {
    setPayeeName(payee.name);
    setPayeeSearch(payee.name);
    setNtnCnic(payee.ntn || payee.cnic || '');
    setIsPayeeDropdownOpen(false);
  };

  // Handle Head Select
  const handleSelectHead = (h: string) => {
    setAccountHead(h);
    setHeadSearch(h);
    setIsHeadDropdownOpen(false);
  };

  // Auto-calculate Net when gross or taxes change (if net not manually overridden)
  const grossBillAmount = (Number(billAmtExclTax) || 0) + (Number(saleTax) || 0) + (Number(praTaxOnBill) || 0);

  // Form Validation identical to validateVoucherAmountsServer_ in Google Apps Script v3.14
  const validateForm = (): boolean => {
    if (!payeeName.trim()) {
      setErrorMsg('⚠️ Please select or enter a Payee Name.');
      return false;
    }
    if (!billNo.trim()) {
      setErrorMsg('⚠️ Bill / Invoice number is mandatory.');
      return false;
    }
    if (billAmtExclTax <= 0) {
      setErrorMsg('⚠️ Bill Amount (Excl. Tax) must be greater than zero.');
      return false;
    }
    if (saleTax < 0 || praTaxOnBill < 0 || chequeAmtNet <= 0 || incomeTaxAmt < 0 || praTaxAmt < 0) {
      setErrorMsg('⚠️ Amounts cannot be negative, and Net Amount must be greater than zero.');
      return false;
    }
    if (saleTax > 0 && saleTax >= billAmtExclTax) {
      setErrorMsg('⚠️ Sale Tax must be less than Bill Amount (Excl. Tax), or zero.');
      return false;
    }
    if (praTaxOnBill > 0 && praTaxOnBill >= billAmtExclTax) {
      setErrorMsg('⚠️ PRA Tax (Bill) must be less than Bill Amount (Excl. Tax), or zero.');
      return false;
    }
    if (chequeAmtNet > grossBillAmount) {
      setErrorMsg(`⚠️ Net Amount (Rs. ${chequeAmtNet}) cannot be greater than Gross Bill (Rs. ${grossBillAmount}).`);
      return false;
    }
    if (incomeTaxAmt > 0 && incomeTaxAmt >= chequeAmtNet) {
      setErrorMsg('⚠️ Income Tax must be less than Net Amount, or zero.');
      return false;
    }
    if (praTaxAmt < praTaxOnBill) {
      setErrorMsg('⚠️ PRA Tax Amount cannot be less than PRA Tax on Bill.');
      return false;
    }
    if (!accountHead) {
      setErrorMsg('⚠️ Please select an Account Head.');
      return false;
    }
    if (!description.trim()) {
      setErrorMsg('⚠️ Narration / Description is mandatory.');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let targetSrNo: number;
    let targetVoucherNo: string;

    const bMatch = BANK_OPTIONS.find((b) => b.fullName === bankAccount) || BANK_OPTIONS[0];
    const prefix = bMatch.key;

    // Date formatting for Voucher number
    const dt = new Date(chequeDate || todayISO);
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mStr = monthNames[dt.getMonth()] || 'SEP';
    const yyStr = String(dt.getFullYear()).slice(2);

    if (isAmend && voucherToAmend) {
      targetSrNo = voucherToAmend.srNo;
      targetVoucherNo = voucherToAmend.voucherNo;
    } else {
      const maxSr = existingVouchers.reduce((m, v) => (v.srNo > m ? v.srNo : m), 0);
      targetSrNo = maxSr + 1;
      // Find count for this bank prefix in this month
      const countPrefix = existingVouchers.filter(
        (v) => v.voucherNo && v.voucherNo.startsWith(`${prefix}-${mStr}${yyStr}`)
      ).length;
      const seqStr = String(countPrefix + 1).padStart(3, '0');
      targetVoucherNo = `${prefix}-${mStr}${yyStr}-${seqStr}`;
    }

    const timestampStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newVoucher: MasterVoucher = {
      srNo: targetSrNo,
      voucherNo: targetVoucherNo,
      payeeName: payeeName.trim(),
      ntnCnic: ntnCnic.trim() || 'N/A',
      billNo: billNo.trim(),
      billDate: billDate,
      chequeNoNet: chequeNoNet.trim() || 'DEBIT',
      chequeDate: chequeDate,
      chequeAmountNet: Number(chequeAmtNet),
      accountHead: accountHead,
      gstAmount: Number(saleTax),
      praAmount: Number(praTaxAmt),
      chequeNoPra: chequeNoPra.trim() || '0',
      incomeTaxAmount: Number(incomeTaxAmt),
      chequeNoIncomeTax: chequeNoIncomeTax.trim() || '0',
      billAmountGross: grossBillAmount,
      description: description.trim(),
      entryStatus: isAmend ? 'Updated' : 'New',
      timestamp: timestampStr,
      bankAccount: bankAccount,
      billAmtExclTax: Number(billAmtExclTax),
      praTaxOnBill: Number(praTaxOnBill),
      preEntryBalance: voucherToAmend?.preEntryBalance || 0,
    };

    onSaveVoucher(newVoucher, isAmend);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Purple / Navy Header Matching User's Apps Script Modal */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-900">
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>📝</span>
              <span>{isAmend ? `Amend Voucher #${voucherToAmend?.srNo} (${voucherToAmend?.voucherNo})` : 'New Voucher Entry'}</span>
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5 font-medium">
              All fields are mandatory — enter 0 if not applicable
            </p>
            <p className="text-[10px] text-indigo-300/80 font-mono">
              Voucher System generated by MKZ — Version 3.14
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs font-sans">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2 font-bold animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. PARTY DETAILS */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
            <h4 className="font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>🏛️</span> PARTY DETAILS
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Payee Searchable Select */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PAYEE NAME <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={payeeSearch}
                    onChange={(e) => {
                      setPayeeSearch(e.target.value);
                      setPayeeName(e.target.value);
                      setIsPayeeDropdownOpen(true);
                    }}
                    onFocus={() => setIsPayeeDropdownOpen(true)}
                    placeholder="Select or type Payee..."
                    className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>

                {isPayeeDropdownOpen && (
                  <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayees.slice(0, 20).map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectPayee(p)}
                        className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-bold">{p.name}</span>
                        {(p.ntn || p.cnic) && (
                          <span className="text-[10px] text-slate-400 font-mono">{p.ntn || p.cnic}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  BANK ACCOUNT <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {BANK_OPTIONS.map((b) => (
                    <option key={b.key} value={b.fullName}>
                      {b.shortName} ({b.key})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* NTN / CNIC Auto-filled */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                NTN / CNIC (AUTO-LOOKUP FROM MASTER)
              </label>
              <input
                type="text"
                value={ntnCnic}
                onChange={(e) => setNtnCnic(e.target.value)}
                placeholder="NTN or CNIC"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* 2. BILL DETAILS */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>📝</span> BILL DETAILS
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  BILL NO <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="Bill / Invoice number"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  BILL DATE <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  max={todayISO}
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Future dates blocked</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  BILL AMT (EXCL TAX) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={billAmtExclTax}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setBillAmtExclTax(val);
                    setChequeAmtNet(val + saleTax + praTaxOnBill - incomeTaxAmt - praTaxAmt);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  SALE TAX AMT <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={saleTax}
                  onChange={(e) => setSaleTax(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PRA TAX (BILL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={praTaxOnBill}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPraTaxOnBill(val);
                    if (praTaxAmt === 0 || praTaxAmt < val) setPraTaxAmt(val);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 3. PAYMENT / CHEQUE DETAILS */}
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
            <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>🏦</span> PAYMENT / CHEQUE DETAILS
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  CHEQUE # (NET) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={chequeNoNet}
                  onChange={(e) => setChequeNoNet(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  CHEQUE DATE <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  NET AMT (RS.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={chequeAmtNet}
                  onChange={(e) => setChequeAmtNet(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-200 dark:border-emerald-900">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  INC. TAX CHEQUE #
                </label>
                <input
                  type="text"
                  value={chequeNoIncomeTax}
                  onChange={(e) => setChequeNoIncomeTax(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  INCOME TAX AMT
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={incomeTaxAmt}
                  onChange={(e) => setIncomeTaxAmt(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  PRA TAX CHEQUE #
                </label>
                <input
                  type="text"
                  value={chequeNoPra}
                  onChange={(e) => setChequeNoPra(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  PRA TAX AMT
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={praTaxAmt}
                  onChange={(e) => setPraTaxAmt(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* 4. ACCOUNT & NARRATION */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>📊</span> ACCOUNT & NARRATION
            </h4>

            {/* Searchable Account Head Dropdown (Displays All 42 Account Heads) */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  ACCOUNT HEAD <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {filteredHeads.length} of {MASTER_ACCOUNT_HEADS.length} heads available
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={headSearch}
                  onChange={(e) => {
                    setHeadSearch(e.target.value);
                    setIsHeadDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsHeadDropdownOpen(true);
                  }}
                  placeholder="Click to browse 42 Account Heads or type to search..."
                  className="w-full px-3 py-2 pr-16 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 text-xs sm:text-sm"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  {headSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeadSearch('');
                        setAccountHead('');
                        setIsHeadDropdownOpen(true);
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 text-xs"
                      title="Clear selection"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsHeadDropdownOpen(!isHeadDropdownOpen)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                    title="Toggle all 42 heads"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isHeadDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {isHeadDropdownOpen && (
                <div className="absolute z-30 top-full mt-1 left-0 right-0 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-xl shadow-2xl divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-2 bg-indigo-50/80 dark:bg-indigo-950/60 sticky top-0 z-10 flex items-center justify-between text-[11px] font-bold text-indigo-900 dark:text-indigo-200 border-b border-indigo-200 dark:border-indigo-800">
                    <span>Select from 42 Official Institutional Heads:</span>
                    <button
                      type="button"
                      onClick={() => setIsHeadDropdownOpen(false)}
                      className="text-slate-500 hover:text-slate-700 text-xs"
                    >
                      Done ✕
                    </button>
                  </div>
                  {filteredHeads.map((h, idx) => {
                    const isSelected = h === accountHead;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectHead(h)}
                        className={`px-3 py-2.5 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60 cursor-pointer font-mono text-[11px] flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-black' : 'text-slate-800 dark:text-slate-200 font-bold'
                        }`}
                      >
                        <span>{h}</span>
                        {isSelected && <span className="text-emerald-600 font-bold">✓ Selected</span>}
                      </div>
                    );
                  })}
                  {filteredHeads.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500 italic">
                      No matching account head found for &ldquo;{headSearch}&rdquo;.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Expenditure Display Box */}
            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400">
                Current FY Expenditure (this head):
              </span>
              <span className="font-mono font-black text-amber-900 dark:text-amber-300 text-xs">
                Rs. {Number(currentHeadExpenditure).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                NARRATION / DESCRIPTION <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of payment"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span>{isAmend ? 'Update Voucher' : 'Save Voucher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
