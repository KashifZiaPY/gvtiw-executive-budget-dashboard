import React, { useState, useEffect } from 'react';
import { MasterVoucher, INSTITUTIONAL_BANK_ACCOUNTS, BankAccountKey } from '../data/cashBookData';
import { formatPKR, format12HourDate } from '../lib/formatters';
import { Printer, X, ShieldCheck, CheckCircle2, FileText, Landmark, ScrollText } from 'lucide-react';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../data/initialData';

interface PaymentApprovalFormProps {
  voucher: MasterVoucher | null;
  onClose?: () => void;
  isModal?: boolean;
}

// Convert numbers into words for official cheque / sanction sanctioning
function numberToWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let groupStr = '';
    if (n >= 100) {
      groupStr += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      groupStr += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      groupStr += units[n] + ' ';
    }
    return groupStr;
  }

  let num = Math.floor(Math.abs(amount));
  let words = '';

  if (num >= 10000000) {
    words += convertGroup(Math.floor(num / 10000000)) + 'Crore ';
    num %= 10000000;
  }
  if (num >= 100000) {
    words += convertGroup(Math.floor(num / 100000)) + 'Lakh ';
    num %= 100000;
  }
  if (num >= 1000) {
    words += convertGroup(Math.floor(num / 1000)) + 'Thousand ';
    num %= 1000;
  }
  if (num > 0) {
    words += convertGroup(num);
  }

  return 'Rupees ' + words.trim() + ' Only';
}

export const PaymentApprovalForm: React.FC<PaymentApprovalFormProps> = ({
  voucher,
  onClose,
  isModal = true,
}) => {
  const [printFormat, setPrintFormat] = useState<'PAF' | 'SANCTION'>('PAF');

  // Handle Escape Key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalDeductions = (voucher.incomeTaxAmount || 0) + (voucher.praAmount || 0) + (voucher.gstAmount || 0);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className={
        isModal
          ? "fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          : "w-full max-w-4xl mx-auto"
      }
    >
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col my-auto print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800 print:hidden gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-sm tracking-wide">
              {voucher.voucherNo}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
              Status: {voucher.entryStatus}
            </span>
          </div>

          {/* Format Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setPrintFormat('PAF')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'PAF'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📄 Payment Approval (PAF)
            </button>
            <button
              onClick={() => setPrintFormat('SANCTION')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'SANCTION'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📜 Contingent Sanction Order
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print (A4)
            </button>
            {onClose && (
              <button
                onClick={onClose}
                title="Close (Esc)"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Official Document Folio */}
        <div className="p-6 sm:p-10 font-sans text-slate-900 bg-white leading-relaxed print:p-4" id="printable-paf">
          
          {/* Header with Dual Logos */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <img
                src={DEFAULT_GVTIW_LOGO}
                alt="GVTIW Logo"
                className="w-16 h-16 object-contain rounded-full border border-slate-300 p-0.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="text-center flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  GOVERNMENT OF THE PUNJAB • TEVTA
                </p>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  GOVT. VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD
                </h1>
                <h2 className="text-xs sm:text-sm font-extrabold text-blue-900 tracking-wider uppercase mt-0.5">
                  {printFormat === 'PAF'
                    ? 'PAYMENT APPROVAL FORM (PAF) • N-SHEET FORMAT'
                    : 'CONTINGENT BILL & EXPENDITURE SANCTION ORDER'}
                </h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 font-semibold">
                  Institute Code: 33028 &nbsp;•&nbsp; Financial Year 2026-27
                </p>
              </div>
              <img
                src={DEFAULT_TEVTA_LOGO}
                alt="TEVTA Logo"
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Key Reference Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono mb-6">
            <div>
              <span className="text-[10px] text-slate-500 block">VOUCHER NO:</span>
              <span className="font-extrabold text-blue-900 text-sm">{voucher.voucherNo}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">SERIAL NO:</span>
              <span className="font-bold text-slate-800">#{voucher.srNo}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">CHEQUE DATE:</span>
              <span className="font-bold text-slate-800">{voucher.chequeDate || voucher.billDate}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">BANK ACCOUNT:</span>
              <span className="font-bold text-slate-800 truncate block" title={voucher.bankAccount}>
                {voucher.bankAccount.replace('Payment of ', '').replace(' For 2026-2027', '')}
              </span>
            </div>
          </div>

          {/* Particulars Section */}
          <div className="space-y-4 text-xs mb-6">
            
            {/* Payee & Budget Head */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  1. Payee / Supplier Particulars
                </span>
                <p className="text-sm font-black text-slate-900">{voucher.payeeName}</p>
                <div className="mt-1 flex items-center gap-3 text-slate-600">
                  <span>NTN / CNIC: <strong className="font-mono text-slate-800">{voucher.ntnCnic || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Bill No: <strong className="font-mono text-slate-800">{voucher.billNo || 'N/A'}</strong></span>
                </div>
              </div>

              <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  2. Budget Classification & Head
                </span>
                <p className="text-xs font-black text-blue-900">{voucher.accountHead}</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Pre-Entry Head Balance: <strong className="font-mono text-slate-800">{formatPKR(voucher.preEntryBalance)}</strong>
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                3. Purpose / Expenditure Description
              </span>
              <p className="text-slate-800 font-medium italic">{voucher.description}</p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white font-bold text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-700">Financial Description</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-700 w-36">Cheque No.</th>
                  <th className="py-2.5 px-3 text-right w-36">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr className="bg-slate-50 font-bold">
                  <td className="py-2 px-3">Gross Bill Amount (Claimed)</td>
                  <td className="py-2 px-3 text-center text-slate-500">—</td>
                  <td className="py-2 px-3 text-right font-black text-slate-900">
                    {formatPKR(voucher.billAmountGross, false)}
                  </td>
                </tr>

                {/* Deductions */}
                {voucher.incomeTaxAmount > 0 && (
                  <tr className="text-rose-700 bg-rose-50/30">
                    <td className="py-2 px-3 pl-6">Less: Withholding Income Tax (WHT)</td>
                    <td className="py-2 px-3 text-center font-bold">{voucher.chequeNoIncomeTax || 'Direct'}</td>
                    <td className="py-2 px-3 text-right font-bold">({formatPKR(voucher.incomeTaxAmount, false)})</td>
                  </tr>
                )}

                {voucher.praAmount > 0 && (
                  <tr className="text-rose-700 bg-rose-50/30">
                    <td className="py-2 px-3 pl-6">Less: Punjab Revenue Authority (PRA Sales Tax)</td>
                    <td className="py-2 px-3 text-center font-bold">{voucher.chequeNoPra || 'Direct'}</td>
                    <td className="py-2 px-3 text-right font-bold">({formatPKR(voucher.praAmount, false)})</td>
                  </tr>
                )}

                {voucher.gstAmount > 0 && (
                  <tr className="text-rose-700 bg-rose-50/30">
                    <td className="py-2 px-3 pl-6">Less: General Sales Tax (GST)</td>
                    <td className="py-2 px-3 text-center text-slate-500">—</td>
                    <td className="py-2 px-3 text-right font-bold">({formatPKR(voucher.gstAmount, false)})</td>
                  </tr>
                )}

                {/* Net Payable Row */}
                <tr className="bg-blue-900 text-white font-bold text-sm">
                  <td className="py-2.5 px-3 uppercase tracking-wide">
                    Net Sanctioned Payable Amount
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                    {voucher.chequeNoNet}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300">
                    {formatPKR(voucher.chequeAmountNet, false)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-8 text-xs">
            <span className="text-[10px] font-bold text-amber-900 uppercase block mb-0.5">
              Net Amount In Words:
            </span>
            <p className="font-extrabold text-amber-950 italic">
              {numberToWords(voucher.chequeAmountNet)}
            </p>
          </div>

          {/* 3-Tier Official Signature Blocks */}
          <div className="border-t-2 border-slate-300 pt-8 mt-10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-8 text-center">
              INSTITUTIONAL AUDIT & SANCTION AUTHORITY SIGNATURES
            </p>
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              
              {/* Tier 1 */}
              <div className="flex flex-col items-center">
                <div className="w-36 border-b-2 border-dashed border-slate-400 mb-2 h-10"></div>
                <p className="font-black text-slate-900">PREPARED BY</p>
                <p className="text-[11px] text-slate-600 font-medium">Accountant / Accounts Officer</p>
                <p className="text-[9px] text-slate-400 font-mono">Developed by MKZ (Inst: 33028)</p>
              </div>

              {/* Tier 2 */}
              <div className="flex flex-col items-center">
                <div className="w-36 border-b-2 border-dashed border-slate-400 mb-2 h-10"></div>
                <p className="font-black text-slate-900">VERIFIED BY</p>
                <p className="text-[11px] text-slate-600 font-medium">Audit Officer / Co-Signatory</p>
                <p className="text-[9px] text-slate-400 font-mono">Internal Control Check</p>
              </div>

              {/* Tier 3 */}
              <div className="flex flex-col items-center">
                <div className="w-36 border-b-2 border-dashed border-slate-400 mb-2 h-10"></div>
                <p className="font-black text-slate-900">SANCTIONED & APPROVED BY</p>
                <p className="text-[11px] text-slate-600 font-bold">Principal / DDO</p>
                <p className="text-[9px] text-slate-400 font-mono">Govt. Vocational Training Inst. (W)</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
