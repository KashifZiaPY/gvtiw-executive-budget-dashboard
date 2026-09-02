import React, { useState, useEffect } from 'react';
import { MasterVoucher, INSTITUTIONAL_BANK_ACCOUNTS, BankAccountKey } from '../data/cashBookData';
import { formatPKR } from '../lib/formatters';
import { Printer, X, FileText, ScrollText, CheckCircle2, Layers } from 'lucide-react';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../data/initialData';

interface PaymentApprovalFormProps {
  voucher: MasterVoucher | null;
  onClose?: () => void;
  isModal?: boolean;
}

// Convert numbers into words for official cheque / sanction
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
  const [printFormat, setPrintFormat] = useState<'PAF' | 'SANCTION' | 'BOTH'>('BOTH');

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

  const balanceBudgetAfterPayment = Math.max(0, (voucher.preEntryBalance || 0) - voucher.billAmountGross);

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
              📄 Page 1: PAF (N&apos;Sheet) [B4:K49]
            </button>
            <button
              onClick={() => setPrintFormat('SANCTION')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'SANCTION'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📜 Page 2: Sanction Order (XL) [A1:H23]
            </button>
            <button
              onClick={() => setPrintFormat('BOTH')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'BOTH'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📑 Both (2-Page Official Print)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print (A4 Portrait)
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

        {/* Printable Official Document Container */}
        <div className="p-6 sm:p-10 font-sans text-slate-900 bg-white leading-relaxed print:p-0 space-y-12">
          
          {/* ================================================================ */}
          {/* PAGE 1: PAF (N'Sheet) STRICTLY BOUNDED TO [B4:K49]               */}
          {/* ================================================================ */}
          {(printFormat === 'PAF' || printFormat === 'BOTH') && (
            <div className="p-4 sm:p-6 border-2 border-slate-800 rounded-xl print:border-none print:p-0 page-break-after">
              
              {/* Header (Rows 4-6) */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <p className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                  TECHNICAL EDUCATION AND VOCATIONAL TRAINING AUTHORITY
                </p>
                <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  PAYMENT APPROVAL FORM
                </h1>
                <p className="text-xs font-bold text-slate-800 uppercase">
                  GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN SAMANABAD, FAISALABAD
                </p>
              </div>

              {/* Rows 8 to 16: Voucher Meta & Vendor Information */}
              <div className="border border-slate-900 text-xs mb-4">
                <div className="grid grid-cols-12 border-b border-slate-400 bg-slate-50 py-1.5 px-3">
                  <span className="col-span-4 font-bold text-slate-700">Sr. / Voucher# :</span>
                  <span className="col-span-8 font-extrabold text-blue-900 font-mono text-sm">{voucher.voucherNo}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-4 font-bold text-slate-700">DATE :</span>
                  <span className="col-span-8 font-bold font-mono">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-4 font-bold text-slate-700">VENDER / PARTY :</span>
                  <span className="col-span-8 font-black uppercase text-slate-900">{voucher.payeeName}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-4 font-bold text-slate-700">NTN / CNIC :</span>
                  <span className="col-span-8 font-mono font-bold">{voucher.ntnCnic || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-4 font-bold text-slate-700">STRN / PNTN# :</span>
                  <span className="col-span-8 font-mono">{voucher.praAmount > 0 ? (voucher.ntnCnic || 'Registered') : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-4 font-bold text-slate-700">PEC (WHERE APPLICABLE) :</span>
                  <span className="col-span-8 text-slate-400">—</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-4 font-bold text-slate-700">INVOICE DATE & NO. :</span>
                  <span className="col-span-8 font-mono font-bold">
                    Bill#: {voucher.billNo || 'N/A'} &nbsp;•&nbsp; Date: {voucher.billDate || 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-4 font-bold text-slate-700">ITEM DETAIL :</span>
                  <span className="col-span-8 font-medium italic text-slate-800">{voucher.description}</span>
                </div>
                <div className="grid grid-cols-12 bg-slate-100 py-1.5 px-3">
                  <span className="col-span-4 font-black text-slate-900 uppercase">BILL AMOUNT (GROSS) :</span>
                  <span className="col-span-8 font-black font-mono text-sm text-slate-900">
                    Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rows 18-21: Budget Appropriations & Approvals */}
              <div className="border border-slate-900 text-xs mb-4">
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-5 font-bold text-slate-700">CODE / HEAD OF PAYMENT :</span>
                  <span className="col-span-7 font-black font-mono text-blue-900">{voucher.accountHead}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-5 font-bold text-slate-700">BUDGET AVAILABLE AMOUNT :</span>
                  <span className="col-span-7 font-mono font-bold">
                    Rs. {Number(voucher.preEntryBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-1.5 px-3">
                  <span className="col-span-5 font-bold text-slate-700">CURRENT BILL AMOUNT :</span>
                  <span className="col-span-7 font-mono font-bold text-rose-700">
                    Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-12 bg-amber-50/60 py-1.5 px-3">
                  <span className="col-span-5 font-black text-amber-900">BALANCE BUDGET :</span>
                  <span className="col-span-7 font-mono font-black text-amber-950">
                    Rs. {Number(balanceBudgetAfterPayment).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rows 23-25: Sanction Authorities */}
              <div className="border border-slate-900 text-xs mb-4 divide-y divide-slate-400">
                <div className="grid grid-cols-12 py-1 px-3">
                  <span className="col-span-6 font-bold text-slate-700">ADMINISTRATIVE APPROVAL :</span>
                  <span className="col-span-3 font-bold">PRINCIPAL</span>
                  <span className="col-span-3 text-right font-mono">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="grid grid-cols-12 py-1 px-3">
                  <span className="col-span-6 font-bold text-slate-700">FINANCIAL SANCTION :</span>
                  <span className="col-span-3 font-bold">PRINCIPAL</span>
                  <span className="col-span-3 text-right font-mono">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="grid grid-cols-12 py-1 px-3">
                  <span className="col-span-6 font-bold text-slate-700">COMMITTEE APPROVAL (WHERE APPLICABLE) :</span>
                  <span className="col-span-6 text-slate-400">N/A</span>
                </div>
              </div>

              {/* Rows 27-34: Double-Entry Deductions & Net Calculation Table */}
              <div className="mb-4">
                <div className="text-[10px] font-black uppercase text-center bg-slate-900 text-white py-1">
                  DETAILED DEDUCTIONS & NET PAYABLE DISTRIBUTION
                </div>
                <table className="w-full text-[10px] border-collapse border border-slate-900">
                  <thead className="bg-slate-100 font-bold text-slate-900">
                    <tr className="border-b border-slate-900 text-center">
                      <th className="border-r border-slate-900 p-1">SR.#</th>
                      <th className="border-r border-slate-900 p-1">AMOUNT (EXCL. TAX)</th>
                      <th className="border-r border-slate-900 p-1">SALE TAX</th>
                      <th className="border-r border-slate-900 p-1">PRA (BILL)</th>
                      <th className="border-r border-slate-900 p-1">GROSS AMOUNT</th>
                      <th className="border-r border-slate-900 p-1">WH INCOME TAX</th>
                      <th className="border-r border-slate-900 p-1">PRA SERVICE TAX</th>
                      <th className="border-r border-slate-900 p-1">SECURITY</th>
                      <th className="p-1">NET AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-center">
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-900 p-1 font-bold">1.0</td>
                      <td className="border-r border-slate-900 p-1 text-right">{Number(voucher.billAmtExclTax || voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-1 text-right">{voucher.gstAmount > 0 ? Number(voucher.gstAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="border-r border-slate-900 p-1 text-right">{voucher.praTaxOnBill > 0 ? Number(voucher.praTaxOnBill).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="border-r border-slate-900 p-1 text-right font-bold">{Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-1 text-right text-rose-700">{voucher.incomeTaxAmount > 0 ? Number(voucher.incomeTaxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="border-r border-slate-900 p-1 text-right text-rose-700">{voucher.praAmount > 0 ? Number(voucher.praAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="border-r border-slate-900 p-1 text-right">-</td>
                      <td className="p-1 text-right font-black text-emerald-800">{Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                      <td className="border-r border-slate-900 p-1">TOTAL</td>
                      <td className="border-r border-slate-900 p-1 text-right">{Number(voucher.billAmtExclTax || voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-1 text-right">{voucher.gstAmount > 0 ? Number(voucher.gstAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-1 text-right">{voucher.praTaxOnBill > 0 ? Number(voucher.praTaxOnBill).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-1 text-right font-black">{Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-1 text-right">{voucher.incomeTaxAmount > 0 ? Number(voucher.incomeTaxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-1 text-right">{voucher.praAmount > 0 ? Number(voucher.praAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-1 text-right">0.00</td>
                      <td className="p-1 text-right font-black text-emerald-900">{Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Rows 36-41: Bank & Cheque Details */}
              <div className="border border-slate-900 text-xs mb-4 divide-y divide-slate-400">
                <div className="grid grid-cols-12 py-1 px-3">
                  <span className="col-span-5 font-bold text-slate-700">BANK NAME & ACCOUNT TITLE :</span>
                  <span className="col-span-7 font-bold">The Bank of Punjab • {voucher.bankAccount}</span>
                </div>
                <div className="grid grid-cols-12 py-1 px-3">
                  <span className="col-span-5 font-bold text-slate-700">BANK ACCOUNT NO. :</span>
                  <span className="col-span-7 font-mono font-bold">6580006795600014</span>
                </div>
                <div className="grid grid-cols-12 py-1 px-3">
                  <span className="col-span-5 font-bold text-slate-700">CHEQUE NO. :</span>
                  <span className="col-span-7 font-mono font-extrabold text-blue-900">{voucher.chequeNoNet}</span>
                </div>
                <div className="grid grid-cols-12 py-1 px-3">
                  <span className="col-span-5 font-bold text-slate-700">CHEQUE TITLE :</span>
                  <span className="col-span-7 font-black">{voucher.payeeName}</span>
                </div>
                <div className="grid grid-cols-12 py-1 px-3">
                  <span className="col-span-5 font-bold text-slate-700">CHEQUE DATE :</span>
                  <span className="col-span-7 font-mono font-bold">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="grid grid-cols-12 py-1 px-3 bg-blue-50/50">
                  <span className="col-span-5 font-black text-blue-950">CHEQUE AMOUNT (NET) :</span>
                  <span className="col-span-7 font-mono font-black text-sm text-blue-950">
                    Rs. {Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    <span className="block text-[10px] font-sans font-medium italic text-slate-600">
                      ({numberToWords(voucher.chequeAmountNet)})
                    </span>
                  </span>
                </div>
              </div>

              {/* Rows 43-44: Institutional Certifications */}
              <div className="text-[10px] text-slate-600 mb-6 italic space-y-1">
                <p>• This form shall be utilized for all categories of expenditures and purchases, including but not limited to the procurement of goods, services and works etc.</p>
                <p>• It is hereby certified that all applicable policies, procedures, SOP's and PPRA Rules have been duly complied with, prior to the execution of the said payment.</p>
              </div>

              {/* Rows 47-49: Official Signatories */}
              <div className="pt-6 border-t border-slate-400 grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="border-b border-slate-700 w-36 mx-auto mb-1 h-8"></div>
                  <strong className="block text-slate-900">Kashif Zia</strong>
                  <span className="text-[10px] text-slate-600 block">Accountant</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Prepared by:</span>
                </div>
                <div>
                  <div className="border-b border-slate-700 w-36 mx-auto mb-1 h-8"></div>
                  <strong className="block text-slate-900">ANEEBA JAMIL</strong>
                  <span className="text-[10px] text-slate-600 block">CO-Signatory</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Checked by:</span>
                </div>
                <div>
                  <div className="border-b border-slate-700 w-36 mx-auto mb-1 h-8"></div>
                  <strong className="block text-slate-900">SHAZIA KHADIM</strong>
                  <span className="text-[10px] text-slate-600 block">Acting Principal / DDO</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Approved by:</span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* PAGE 2: N'Sheet-Sanction Order XL STRICTLY BOUNDED TO [A1:H23]   */}
          {/* ================================================================ */}
          {(printFormat === 'SANCTION' || printFormat === 'BOTH') && (
            <div className="p-4 sm:p-6 border-2 border-slate-800 rounded-xl print:border-none print:p-0 page-break-after">
              
              {/* Header (Rows 2-4) */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
                <p className="text-xs font-extrabold tracking-wider text-slate-700 uppercase">
                  TECHNICAL EDUCATIONAL & VOCATIONAL TRAINING AUTHORITY
                </p>
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                  Govt. Vocational Training Institute (W)
                </h2>
                <p className="text-xs font-bold text-slate-800 uppercase">
                  Samanabad, Faisalabad
                </p>
              </div>

              {/* Sanction Order Title & Account (Rows 7-8) */}
              <div className="text-center mb-5">
                <h1 className="text-lg font-black tracking-wider text-slate-900 uppercase underline decoration-2 underline-offset-4">
                  SANCTION ORDER
                </h1>
                <p className="text-xs font-bold font-mono text-blue-900 mt-1 uppercase">
                  {voucher.bankAccount}
                </p>
              </div>

              {/* Legal Powers Delegation Clause (Row 10) */}
              <p className="text-xs text-justify leading-relaxed text-slate-800 mb-5">
                In exercise of the Powers Delegated to the undersigned vide Sr. No.06 Part 1st & 2nd Schedule of Delegation of Financial Powers vides Notification No. TEVTA/GM (F&A) Financial Powers/2012 dated September 22, 2012; the sanction is hereby accorded for Purchases, <strong className="text-slate-900">{voucher.accountHead}</strong> of <strong className="font-mono text-slate-900">Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}/-</strong>.
              </p>

              {/* Detail Table Header & Rows (Rows 12-16) */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-700 mb-2">The detail is given below: -</p>
                <table className="w-full text-xs border-collapse border-2 border-slate-900">
                  <thead className="bg-slate-100 font-black text-slate-900">
                    <tr className="border-b-2 border-slate-900 text-center">
                      <th className="border-r border-slate-900 p-2 w-16">Sr.#</th>
                      <th className="border-r border-slate-900 p-2 text-left">NAME OF FIRM</th>
                      <th className="border-r border-slate-900 p-2 text-left">HEAD OF ACCOUNT</th>
                      <th className="p-2 text-right w-40">AMOUNT (RS.)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-900 p-2 text-center font-bold">1.0</td>
                      <td className="border-r border-slate-900 p-2 font-sans font-bold uppercase">{voucher.payeeName}</td>
                      <td className="border-r border-slate-900 p-2 text-xs font-bold text-blue-900">{voucher.accountHead}</td>
                      <td className="p-2 text-right font-black">
                        {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                      <td colSpan={3} className="border-r border-slate-900 p-2 text-right uppercase font-black">
                        TOTAL:
                      </td>
                      <td className="p-2 text-right font-black text-sm">
                        Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Budget Debit Head Clause (Row 18) */}
              <div className="text-xs text-justify leading-relaxed text-slate-800 mb-12 space-y-3">
                <p>
                  The expenditure involved shall be debit-able to the budget of Govt. Vocational Training Institute (W) Samanabad, Faisalabad. Under the head Grant No. PC-21022 (022)-044101- Support for Industrial Development – L04219 Grant-in-aid to TEVTA for the Financial Year 2026-27.
                </p>
                <p className="italic font-semibold text-slate-700">
                  Submitted for signature, if sanctioned please.
                </p>
              </div>

              {/* Principal Signature Authority (Rows 22-23) */}
              <div className="pt-10 flex justify-end">
                <div className="text-center w-64">
                  <div className="border-b border-slate-700 w-44 mx-auto mb-2"></div>
                  <strong className="block text-sm font-black text-slate-900">Shazia Khadim</strong>
                  <p className="text-xs text-slate-700 font-medium">Acting Principal</p>
                  <p className="text-xs text-slate-700 font-medium">Govt. Vocational Training Institute (W)</p>
                  <p className="text-xs text-slate-700 font-medium">Samanabad, FSD</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
