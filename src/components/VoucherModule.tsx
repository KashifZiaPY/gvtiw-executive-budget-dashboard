import React, { useState, useEffect, useMemo } from 'react';
import { MasterVoucher, INITIAL_MASTER_VOUCHERS, INSTITUTIONAL_BANK_ACCOUNTS, BankAccountKey } from '../data/cashBookData';
import { PaymentApprovalForm } from './PaymentApprovalForm';
import { VoucherEntryModal } from './VoucherEntryModal';
import { CorporateDeleteVoucherModal } from './CorporateDeleteVoucherModal';
import { BankChargeModal, isBankChargeVoucher, BankChargeSavePayload } from './BankChargeModal';
import { formatPKR } from '../lib/formatters';
import {
  Search,
  Filter,
  FileText,
  Printer,
  Download,
  Eye,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  PlusCircle,
  Edit3,
  Trash2,
  Landmark,
} from 'lucide-react';

interface VoucherModuleProps {
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
}

export const VoucherModule: React.FC<VoucherModuleProps> = ({
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
}) => {
  const [vouchers, setVouchers] = useState<MasterVoucher[]>(() => {
    try {
      const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_MASTER_VOUCHERS;
  });

  useEffect(() => {
    const handleVoucherUpdate = () => {
      try {
        const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
        if (cached) setVouchers(JSON.parse(cached));
      } catch {}
    };
    window.addEventListener('gvtiw_vouchers_updated', handleVoucherUpdate);
    window.addEventListener('storage', handleVoucherUpdate);
    return () => {
      window.removeEventListener('gvtiw_vouchers_updated', handleVoucherUpdate);
      window.removeEventListener('storage', handleVoucherUpdate);
    };
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('ALL');
  const [selectedVoucherForPAF, setSelectedVoucherForPAF] = useState<MasterVoucher | null>(null);

  // New & Amend Voucher Modal States
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [voucherToAmend, setVoucherToAmend] = useState<MasterVoucher | null>(null);

  // Bank Charge Modal States
  const [isBankChargeModalOpen, setIsBankChargeModalOpen] = useState(false);
  const [bcVoucherToAmend, setBcVoucherToAmend] = useState<MasterVoucher | null>(null);

  // Corporate Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<MasterVoucher | null>(null);
  const [isDeletingVoucher, setIsDeletingVoucher] = useState(false);

  const handleOpenNewEntry = () => {
    setVoucherToAmend(null);
    setIsEntryModalOpen(true);
  };

  const handleOpenNewBankCharge = () => {
    setBcVoucherToAmend(null);
    setIsBankChargeModalOpen(true);
  };

  const handleInitiateAmend = (v: MasterVoucher) => {
    if (isBankChargeVoucher(v)) {
      setBcVoucherToAmend(v);
      setVoucherToAmend(null);
      setIsEntryModalOpen(false);
      setIsBankChargeModalOpen(true);
    } else {
      setBcVoucherToAmend(null);
      setVoucherToAmend(v);
      setIsBankChargeModalOpen(false);
      setIsEntryModalOpen(true);
    }
  };

  const handleOpenAmend = (v: MasterVoucher) => {
    handleInitiateAmend(v);
  };

  // Strict LIFO Rule: Max Sr No
  const maxExistingSrNo = useMemo(() => {
    return vouchers.reduce((m, v) => (v.srNo > m ? v.srNo : m), 0);
  }, [vouchers]);

  const handleDeleteVoucher = (srNo: number) => {
    if (srNo !== maxExistingSrNo) {
      alert(
        `⚠️ STRICT LIFO CASH BOOK SEQUENCE INTEGRITY RULE:\n\nOnly the latest voucher (Sr. #${maxExistingSrNo}) can be deleted first as per Google Sheet Cash Book sequential rules.\n\nVoucher #${srNo} cannot be deleted out of sequence.`
      );
      return;
    }

    const targetVoucher = vouchers.find((v) => v.srNo === srNo);
    if (!targetVoucher) return;

    setVoucherToDelete(targetVoucher);
    setIsDeleteModalOpen(true);
  };

  const executeCorporateDelete = async () => {
    if (!voucherToDelete) return;
    const targetSrNo = voucherToDelete.srNo;
    const targetVoucher = voucherToDelete;

    setIsDeletingVoucher(true);

    // 1. Remove from vouchers state and update localStorage
    const updated = vouchers.filter((v) => v.srNo !== targetSrNo);
    setVouchers(updated);
    try {
      localStorage.setItem('gvtiw_live_vouchers_v3', JSON.stringify(updated));
      let deletedSerials: number[] = [];
      const delRaw = localStorage.getItem('gvtiw_deleted_serials_v3');
      if (delRaw) {
        try {
          const parsed = JSON.parse(delRaw);
          if (Array.isArray(parsed)) deletedSerials = parsed;
        } catch {}
      }
      if (!deletedSerials.includes(targetSrNo)) {
        deletedSerials.push(targetSrNo);
      }
      localStorage.setItem('gvtiw_deleted_serials_v3', JSON.stringify(deletedSerials));

      // Reverse expenditure on account head in local store if present
      try {
        const accRaw = localStorage.getItem('gvtiw_accounts_store_v30');
        if (accRaw) {
          const accList = JSON.parse(accRaw);
          if (Array.isArray(accList)) {
            const headCode = targetVoucher.accountHead.split('-')[0].trim();
            const acc = accList.find((a: any) => a.code === headCode || targetVoucher.accountHead.includes(a.code));
            if (acc) {
              const amtToDeduct = targetVoucher.billAmtExclTax || targetVoucher.billAmountGross || targetVoucher.chequeAmountNet || 0;
              acc.payments = Math.max(0, acc.payments - amtToDeduct);
              acc.balance = acc.opening + (acc.reappr || 0) + (acc.receipts || 0) - acc.payments;
              localStorage.setItem('gvtiw_accounts_store_v30', JSON.stringify(accList));
            }
          }
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('gvtiw_vouchers_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}

    if (voucherToAmend?.srNo === targetSrNo) {
      setVoucherToAmend(null);
      setIsEntryModalOpen(false);
    }

    // 2. Dispatch deleteLastVoucher to Google Apps Script Web App
    try {
      const webAppUrl =
        localStorage.getItem('gvtiw_admin_web_app_url') ||
        'https://script.google.com/macros/s/AKfycbzUIXvBBY_rGOiDLLz5cR11mxpgVtdq8Wf4bYcUZ6e1R4VhyeUfN2t_EtGDsPd5jrcP/exec';
      const activePin = localStorage.getItem('gvtiw_admin_custom_pin') || '33028';

      const qp = new URLSearchParams({
        pin: activePin,
        action: 'deleteLastVoucher',
        command: 'deleteLastVoucher',
        srNo: String(targetSrNo),
        voucherNo: targetVoucher.voucherNo,
        bankAccount: targetVoucher.bankAccount,
        accountHead: targetVoucher.accountHead,
        chequeAmountNet: String(targetVoucher.chequeAmountNet),
      });

      const getRes = await fetch(`${webAppUrl}?${qp.toString()}`, { method: 'GET' });
      if (!getRes.ok) {
        // Fallback to text/plain POST
        await fetch(webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            pin: activePin,
            action: 'deleteLastVoucher',
            srNo: targetSrNo,
            voucherNo: targetVoucher.voucherNo,
            bankAccount: targetVoucher.bankAccount,
            accountHead: targetVoucher.accountHead,
            chequeAmountNet: targetVoucher.chequeAmountNet,
          }),
        });
      }
    } catch {}

    // Smooth pause for animation cycle
    await new Promise((r) => setTimeout(r, 800));

    setIsDeletingVoucher(false);
    setIsDeleteModalOpen(false);
    setVoucherToDelete(null);
  };

  const handleSaveVoucher = (savedVoucher: MasterVoucher, isAmend: boolean) => {
    setVouchers((prev) => {
      let updated: MasterVoucher[];
      if (isAmend) {
        updated = prev.map((v) => (v.srNo === savedVoucher.srNo ? savedVoucher : v));
      } else {
        updated = [savedVoucher, ...prev];
      }
      try {
        localStorage.setItem('gvtiw_live_vouchers_v3', JSON.stringify(updated));
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('gvtiw_vouchers_updated'));
      } catch {}
      return updated;
    });
  };

  const handleSaveBankCharge = async (payload: BankChargeSavePayload) => {
    const { accountKey, bankFullName, amount, date, memo, accountHead, isAmend, srNo, voucherNo } = payload;
    const targetSrNo = isAmend && srNo ? srNo : maxExistingSrNo + 1;
    const year = new Date(date).getFullYear();
    const targetVoucherNo =
      isAmend && (voucherNo || bcVoucherToAmend?.voucherNo)
        ? (voucherNo || bcVoucherToAmend?.voucherNo!)
        : `BC-${year}/${targetSrNo}`;

    const newVoucherObj: MasterVoucher = {
      srNo: targetSrNo,
      voucherNo: targetVoucherNo,
      payeeName: 'BANK CHARGES',
      ntnCnic: 'N/A',
      billNo: 'DIRECT DEBIT',
      billDate: date,
      accountHead: accountHead,
      billAmountGross: amount,
      billAmtExclTax: amount,
      chequeNoNet: 'DIRECT DEBIT',
      chequeDate: date,
      chequeAmountNet: amount,
      gstAmount: 0,
      praAmount: 0,
      chequeNoPra: '0',
      incomeTaxAmount: 0,
      chequeNoIncomeTax: '0',
      description: memo ? memo.trim() : 'Bank Service Charges & Govt Taxes (Direct Debit)',
      entryStatus: 'ACTIVE',
      timestamp: new Date().toISOString(),
      bankAccount: bankFullName || `Bank Account (${accountKey})`,
      preEntryBalance: 0,
    };

    setVouchers((prev) => {
      let updated: MasterVoucher[];
      if (isAmend) {
        updated = prev.map((v) => (v.srNo === targetSrNo ? newVoucherObj : v));
      } else {
        updated = [newVoucherObj, ...prev];
      }
      try {
        localStorage.setItem('gvtiw_live_vouchers_v3', JSON.stringify(updated));
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('gvtiw_vouchers_updated'));
      } catch {}
      return updated;
    });

    setIsBankChargeModalOpen(false);
    setBcVoucherToAmend(null);

    // Sync with Google Apps Script Web App
    try {
      const webAppUrl =
        localStorage.getItem('gvtiw_admin_web_app_url') ||
        'https://script.google.com/macros/s/AKfycbzUIXvBBY_rGOiDLLz5cR11mxpgVtdq8Wf4bYcUZ6e1R4VhyeUfN2t_EtGDsPd5jrcP/exec';
      const activePin = localStorage.getItem('gvtiw_admin_custom_pin') || '33028';

      const requestPayload = {
        pin: activePin,
        action: isAmend ? 'amendVoucher' : 'recordBankCharge',
        command: isAmend ? 'amendVoucher' : 'recordBankCharge',
        voucher: newVoucherObj,
        entry: payload,
        isAmend,
        origSrNo: srNo,
      };

      await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(requestPayload),
      });
    } catch {}
  };

  // Sorting
  const [sortBy, setSortBy] = useState<'srNo' | 'amount' | 'date'>('srNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtered & Sorted vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers
      .filter((v) => {
        if (selectedAccountFilter !== 'ALL' && !v.bankAccount.includes(selectedAccountFilter)) {
          return false;
        }
        if (searchTerm) {
          const t = searchTerm.toLowerCase();
          const matchesNo = v.voucherNo.toLowerCase().includes(t);
          const matchesPayee = v.payeeName.toLowerCase().includes(t);
          const matchesHead = v.accountHead.toLowerCase().includes(t);
          const matchesDesc = v.description.toLowerCase().includes(t);
          const matchesCheque = v.chequeNoNet.toLowerCase().includes(t);
          const matchesNtn = v.ntnCnic.toLowerCase().includes(t);
          if (!matchesNo && !matchesPayee && !matchesHead && !matchesDesc && !matchesCheque && !matchesNtn) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'srNo') diff = a.srNo - b.srNo;
        else if (sortBy === 'amount') diff = a.chequeAmountNet - b.chequeAmountNet;
        else if (sortBy === 'date') diff = new Date(a.chequeDate).getTime() - new Date(b.chequeDate).getTime();
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [vouchers, searchTerm, selectedAccountFilter, sortBy, sortOrder]);

  // Aggregate Metrics
  const totalGrossClaimed = useMemo(() => vouchers.reduce((sum, v) => sum + v.billAmountGross, 0), [vouchers]);
  const totalNetDisbursed = useMemo(() => vouchers.reduce((sum, v) => sum + v.chequeAmountNet, 0), [vouchers]);
  const totalPraTax = useMemo(() => vouchers.reduce((sum, v) => sum + v.praAmount, 0), [vouchers]);
  const totalIncomeTax = useMemo(() => vouchers.reduce((sum, v) => sum + v.incomeTaxAmount, 0), [vouchers]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Sr No',
      'Voucher No',
      'Payee Name',
      'NTN/CNIC',
      'Bill No',
      'Bill Date',
      'Account Head',
      'Bill Gross Amount',
      'Net Cheque No',
      'Net Cheque Amount',
      'PRA Tax Amount',
      'PRA Cheque No',
      'Income Tax Amount',
      'Income Tax Cheque No',
      'Narration',
      'Bank Account',
    ];

    const rows = filteredVouchers.map((v) => [
      v.srNo,
      `"${v.voucherNo}"`,
      `"${v.payeeName}"`,
      `"${v.ntnCnic}"`,
      `"${v.billNo}"`,
      v.billDate,
      `"${v.accountHead}"`,
      v.billAmountGross,
      `"${v.chequeNoNet}"`,
      v.chequeAmountNet,
      v.praAmount,
      `"${v.chequeNoPra}"`,
      v.incomeTaxAmount,
      `"${v.chequeNoIncomeTax}"`,
      `"${v.description.replace(/"/g, '""')}"`,
      `"${v.bankAccount}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GVTIW_Master_Vouchers_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP SUMMARY BANNER & METRIC CARDS                           */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Vouchers Recorded */}
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? 'bg-[#0B132B] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Total Vouchers</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-blue-400">
            {vouchers.length} <span className="text-xs font-normal text-slate-400">Entries</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Master Registry FY 2026-27</p>
        </div>

        {/* Net Cheques Disbursed */}
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? 'bg-[#0B132B] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Net Paid via Cheques</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {formatPKR(totalNetDisbursed, false)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Direct Vendor Net Disbursed</p>
        </div>

        {/* PRA Punjab Sales Tax Deducted */}
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? 'bg-[#0B132B] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>PRA Tax Deductions</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-400">
            {formatPKR(totalPraTax, false)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Dedicated PRA Cheques Drawn</p>
        </div>

        {/* Withholding Income Tax Deducted */}
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? 'bg-[#0B132B] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-1">
            <span>Income Tax (WHT)</span>
            <Building2 className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-rose-400">
            {formatPKR(totalIncomeTax, false)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Federal Tax FBR Deductions</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SEARCH & ACCOUNT FILTER BAR                                 */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        darkMode ? 'bg-[#0F1D3B] border-slate-700/90 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
      }`}>
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Voucher# (NS-JUL26-001), Payee, Head, Cheque#, or Narration..."
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border outline-none transition-all ${
              darkMode
                ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500 focus:border-blue-400'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600'
            }`}
          />
        </div>

        {/* Bank Account Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedAccountFilter}
            onChange={(e) => setSelectedAccountFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-lg border outline-none font-medium cursor-pointer transition-all ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="ALL">All Bank Accounts ({vouchers.length})</option>
            <option value="Non Salary">Non-Salary Account</option>
            <option value="Pupil Funds">Pupil Funds Account</option>
            <option value="Short Course">Short Course Account</option>
            <option value="AAA">AAA Revolving Account</option>
            <option value="Fee Collection">Fee Collection Account</option>
            <option value="Securities">Securities Account</option>
          </select>

          {/* Actions: New Voucher & Direct Bank Charge */}
          <button
            onClick={handleOpenNewEntry}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>New Voucher Entry</span>
          </button>
          <button
            onClick={handleOpenNewBankCharge}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Landmark className="w-4 h-4 text-amber-100" />
            <span>Record Bank Charge</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 border border-slate-700 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MASTER VOUCHER TABLE                                        */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-xl border overflow-hidden shadow-xl ${
        darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-300'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1050px]">
            <thead className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-2 text-center w-14 border-r border-slate-800">Sr.#</th>
                <th className="py-3 px-3 border-r border-slate-800">Voucher No.</th>
                <th className="py-3 px-3 border-r border-slate-800">Payee & Bill Particulars</th>
                <th className="py-3 px-3 border-r border-slate-800">Budget Account Head</th>
                <th className="py-3 px-3 text-right border-r border-slate-800">Gross (PKR)</th>
                <th className="py-3 px-3 text-center border-r border-slate-800">Net Cheque #</th>
                <th className="py-3 px-3 text-right border-r border-slate-800">Net Paid (PKR)</th>
                <th className="py-3 px-3 text-center border-r border-slate-800">Tax Deductions</th>
                <th className="py-3 px-3 text-center">Action / Sanction</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                    No matching vouchers found in Master Registry.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v, idx) => {
                  const isEven = idx % 2 === 0;
                  const hasPra = v.praAmount > 0;
                  const hasWht = v.incomeTaxAmount > 0;

                  return (
                    <tr
                      key={v.voucherNo}
                      className={`transition-colors hover:bg-blue-500/10 ${
                        isEven
                          ? darkMode
                            ? 'bg-[#0B132B]'
                            : 'bg-white'
                          : darkMode
                          ? 'bg-[#070E20]'
                          : 'bg-slate-50/70'
                      }`}
                    >
                      {/* Sr.# */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-400 border-r border-slate-700/50">
                        {v.srNo}
                      </td>

                      {/* Voucher Serial & Date */}
                      <td className="py-3 px-3 border-r border-slate-700/50">
                        <span className="font-extrabold font-mono text-blue-400 block text-xs">
                          {v.voucherNo}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {v.chequeDate || v.billDate}
                        </span>
                      </td>

                      {/* Payee Particulars */}
                      <td className="py-3 px-3 border-r border-slate-700/50">
                        <span className={`font-bold block ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {v.payeeName}
                        </span>
                        <span className="text-[10px] text-slate-400 block line-clamp-1 italic" title={v.description}>
                          {v.description}
                        </span>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono mt-0.5">
                          {v.ntnCnic && <span>NTN: {v.ntnCnic}</span>}
                          {v.billNo && <span>Bill#: {v.billNo}</span>}
                        </div>
                      </td>

                      {/* Account Head */}
                      <td className="py-3 px-3 border-r border-slate-700/50">
                        <span className={`font-bold text-[11px] block line-clamp-1 ${darkMode ? 'text-amber-300' : 'text-blue-900'}`} title={v.accountHead}>
                          {v.accountHead}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {v.bankAccount.replace('Payment of ', '').replace(' For 2026-2027', '')}
                        </span>
                      </td>

                      {/* Gross Amount */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-400 border-r border-slate-700/50">
                        {formatPKR(v.billAmountGross, false)}
                      </td>

                      {/* Net Cheque # */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-300 border-r border-slate-700/50 text-[11px]">
                        {v.chequeNoNet}
                      </td>

                      {/* Net Paid Amount */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 border-r border-slate-700/50 text-xs">
                        {formatPKR(v.chequeAmountNet, false)}
                      </td>

                      {/* Tax Deductions Column */}
                      <td className="py-3 px-3 text-center border-r border-slate-700/50">
                        {hasPra || hasWht ? (
                          <div className="flex flex-col items-center gap-0.5 text-[10px] font-mono">
                            {hasWht && (
                              <span className="text-rose-400 font-bold">
                                WHT: {formatPKR(v.incomeTaxAmount, false)}
                              </span>
                            )}
                            {hasPra && (
                              <span className="text-amber-400 font-bold">
                                PRA: {formatPKR(v.praAmount, false)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Nil (0)</span>
                        )}
                      </td>

                      {/* Action Buttons: View PAF, Amend, & LIFO Delete */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedVoucherForPAF(v)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="View & Print Official PAF (N'Sheet)"
                          >
                            <FileText className="w-3 h-3 text-amber-300" />
                            <span>PAF</span>
                          </button>
                          <button
                            onClick={() => handleInitiateAmend(v)}
                            className={`px-2.5 py-1.5 text-white font-bold text-[10px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer ${
                              isBankChargeVoucher(v)
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-indigo-600 hover:bg-indigo-500'
                            }`}
                            title={
                              isBankChargeVoucher(v)
                                ? `Amend Bank Charge #${v.srNo} (Direct Debit Dialogue)`
                                : `Amend Voucher #${v.srNo}`
                            }
                          >
                            <Edit3 className="w-3 h-3 text-white" />
                            <span>{isBankChargeVoucher(v) ? 'Amend Charge' : 'Amend'}</span>
                          </button>
                          {v.srNo === maxExistingSrNo && (
                            <button
                              onClick={() => handleDeleteVoucher(v.srNo)}
                              className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold text-[10px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Delete Latest Voucher (Strict LIFO Rule)"
                            >
                              <Trash2 className="w-3 h-3 text-rose-200" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: PAYMENT APPROVAL FORM (PAF) POPUP                    */}
      {/* ------------------------------------------------------------- */}
      {selectedVoucherForPAF && (
        <PaymentApprovalForm
          voucher={selectedVoucherForPAF}
          onClose={() => setSelectedVoucherForPAF(null)}
          isModal={true}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          customGopLogo={customGopLogo}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL: VOUCHER ENTRY & AMEND FORM                          */}
      {/* ------------------------------------------------------------- */}
      <VoucherEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setVoucherToAmend(null);
        }}
        voucherToAmend={voucherToAmend}
        onSaveVoucher={handleSaveVoucher}
        onDeleteVoucher={handleDeleteVoucher}
        existingVouchers={vouchers}
        customGvtiwLogo={customGvtiwLogo}
        customTevtaLogo={customTevtaLogo}
        customGopLogo={customGopLogo}
        onSwitchToBankChargeAmend={handleInitiateAmend}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5.5 MODAL: DIRECT BANK CHARGE ENTRY & AMEND FORM              */}
      {/* ------------------------------------------------------------- */}
      <BankChargeModal
        isOpen={isBankChargeModalOpen}
        onClose={() => {
          setIsBankChargeModalOpen(false);
          setBcVoucherToAmend(null);
        }}
        voucherToAmend={bcVoucherToAmend}
        maxExistingSrNo={maxExistingSrNo}
        onSaveBankCharge={handleSaveBankCharge}
        darkMode={darkMode}
      />

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: CORPORATE LIFO VOUCHER PURGE & BUSY DIALOG          */}
      {/* ------------------------------------------------------------- */}
      <CorporateDeleteVoucherModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeletingVoucher}
        voucher={voucherToDelete}
        onConfirm={executeCorporateDelete}
        onClose={() => {
          if (!isDeletingVoucher) {
            setIsDeleteModalOpen(false);
            setVoucherToDelete(null);
          }
        }}
        customGvtiwLogo={customGvtiwLogo || undefined}
        darkMode={darkMode}
      />

    </div>
  );
};
