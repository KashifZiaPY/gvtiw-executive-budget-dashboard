import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MasterVoucher } from '../data/cashBookData';
import { Printer, X, FileText } from 'lucide-react';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../data/initialData';

interface PaymentApprovalFormProps {
  voucher: MasterVoucher | null;
  onClose?: () => void;
  isModal?: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
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
  customGvtiwLogo,
  customTevtaLogo,
}) => {
  // Format state: strictly 'PAF' or 'SANCTION'
  const [printFormat, setPrintFormat] = useState<'PAF' | 'SANCTION'>('PAF');

  // Resolve institutional crests with local-storage and built-in fallbacks
  const [gvtiwLogoSrc] = useState<string>(() => {
    if (customGvtiwLogo && customGvtiwLogo.startsWith('data:')) return customGvtiwLogo;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gvtiw_custom_logo') : null;
    return saved && saved.startsWith('data:') ? saved : DEFAULT_GVTIW_LOGO;
  });

  const [tevtaLogoSrc] = useState<string>(() => {
    if (customTevtaLogo && customTevtaLogo.startsWith('data:')) return customTevtaLogo;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tevta_custom_logo') : null;
    return saved && saved.startsWith('data:') ? saved : DEFAULT_TEVTA_LOGO;
  });

  // Handle Escape Key to dismiss modal and manage modal class
  useEffect(() => {
    if (isModal) {
      document.body.classList.add('paf-modal-open');
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (isModal) {
        document.body.classList.remove('paf-modal-open');
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModal, onClose]);

  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const balanceBudgetAfterPayment = Math.max(0, (voucher.preEntryBalance || 0) - voucher.billAmountGross);

  // Reusable official institutional header with dual emblems (GVTIW on left, TEVTA on right)
  const renderOfficialHeader = (title: string, subheader: string) => (
    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2 print:pb-1.5 print:mb-1.5 gap-3">
      {/* Left Crest: GVTIW */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 print:w-13 print:h-13 shrink-0 flex items-center justify-center p-0.5">
        <img
          src={gvtiwLogoSrc}
          alt="GVTIW Logo"
          className="max-w-full max-h-full object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_GVTIW_LOGO;
          }}
        />
      </div>

      {/* Center Corporate Header with Light Grey Highlight */}
      <div className="text-center flex-1 space-y-0.5">
        <p className="text-[10px] sm:text-[11px] print:text-[9.5px] font-extrabold tracking-wider text-slate-800 uppercase">
          TECHNICAL EDUCATION AND VOCATIONAL TRAINING AUTHORITY
        </p>
        <div className="bg-slate-100 border border-slate-300 py-0.5 px-2 inline-block rounded-xs">
          <h1 className="text-sm sm:text-base print:text-sm font-black text-slate-950 uppercase tracking-tight leading-tight">
            {title}
          </h1>
        </div>
        <p className="text-[10px] sm:text-[11px] print:text-[9.5px] font-bold text-slate-800 uppercase">
          {subheader}
        </p>
      </div>

      {/* Right Crest: TEVTA */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 print:w-13 print:h-13 shrink-0 flex items-center justify-center p-0.5">
        <img
          src={tevtaLogoSrc}
          alt="TEVTA Logo"
          className="max-w-full max-h-full object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_TEVTA_LOGO;
          }}
        />
      </div>
    </div>
  );

  const modalContent = (
    <div
      id="print-paf-portal"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className={
        isModal
          ? "fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block"
          : "w-full max-w-4xl mx-auto"
      }
    >
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col my-auto print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Top Control Bar (Strictly Hidden in Print) */}
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'PAF'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📄 Page 1: PAF (N&apos;Sheet) [B4:K49]
            </button>
            <button
              onClick={() => setPrintFormat('SANCTION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'SANCTION'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📜 Page 2: Sanction Order (XL) [A1:H23]
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print (A4 Portrait • Punch Ready)
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

        {/* Printable Document Area */}
        <div className="p-4 sm:p-6 print:p-0 font-sans text-slate-900 bg-white leading-relaxed">
          
          {/* ================================================================ */}
          {/* PAGE 1: PAF (N'Sheet) STRICTLY BOUNDED TO SINGLE A4 PAGE         */}
          {/* ================================================================ */}
          {printFormat === 'PAF' && (
            <div className="paf-single-page p-3 sm:py-5 sm:pr-5 sm:pl-9 border-2 border-slate-800 rounded-xl print:border-none print:p-0 relative">
              
              {/* Filing Margin Visual Punch Guideline (Screen Only) */}
              <div className="hidden sm:flex print:hidden absolute left-3 top-10 bottom-10 flex-col justify-around items-center opacity-30 pointer-events-none select-none">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-[7px] text-slate-600">●</div>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-[7px] text-slate-600">●</div>
              </div>

              {/* Header with Both Institutional Emblems */}
              {renderOfficialHeader(
                "PAYMENT APPROVAL FORM",
                "GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN SAMANABAD, FAISALABAD"
              )}

              {/* Rows 8 to 16: Voucher Meta & Vendor Information with Light Grey Heading Style */}
              <div className="border-2 border-slate-900 text-[10.5px] print:text-[9.5px] mb-1.5 divide-y divide-slate-400">
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    Sr. / Voucher# :
                  </span>
                  <span className="col-span-8 font-black text-slate-950 font-mono text-xs py-0.5 px-2.5">
                    {voucher.voucherNo}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    DATE :
                  </span>
                  <span className="col-span-8 font-black text-slate-950 font-mono text-xs py-0.5 px-2.5">
                    {voucher.chequeDate || voucher.billDate}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    VENDER / PARTY :
                  </span>
                  <span className="col-span-8 font-black uppercase text-slate-950 text-xs py-0.5 px-2.5 tracking-wide">
                    {voucher.payeeName}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    NTN / CNIC :
                  </span>
                  <span className="col-span-8 font-mono font-bold text-slate-900 py-0.5 px-2.5">
                    {voucher.ntnCnic || 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    STRN / PNTN# :
                  </span>
                  <span className="col-span-8 font-mono text-slate-900 py-0.5 px-2.5">
                    {voucher.praAmount > 0 ? (voucher.ntnCnic || 'Registered') : 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    PEC (WHERE APPLICABLE) :
                  </span>
                  <span className="col-span-8 text-slate-400 py-0.5 px-2.5">—</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    INVOICE DATE & NO. :
                  </span>
                  <span className="col-span-8 font-mono font-bold text-slate-900 py-0.5 px-2.5">
                    Bill#: {voucher.billNo || 'N/A'} &nbsp;•&nbsp; Date: {voucher.billDate || 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    ITEM DETAIL :
                  </span>
                  <span className="col-span-8 font-medium italic text-slate-900 py-0.5 px-2.5">
                    {voucher.description}
                  </span>
                </div>
                <div className="grid grid-cols-12 bg-slate-100">
                  <span className="col-span-4 font-black text-slate-950 uppercase py-0.5 px-2.5 border-r border-slate-400">
                    BILL AMOUNT (GROSS) :
                  </span>
                  <span className="col-span-8 font-black font-mono text-xs text-slate-950 py-0.5 px-2.5">
                    Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rows 18-21: Budget Appropriations & Approvals */}
              <div className="border-2 border-slate-900 text-[10.5px] print:text-[9.5px] mb-1.5 divide-y divide-slate-400">
                <div className="grid grid-cols-12">
                  <span className="col-span-5 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    CODE / HEAD OF PAYMENT :
                  </span>
                  <span className="col-span-7 font-black font-mono text-slate-950 text-xs py-0.5 px-2.5">
                    {voucher.accountHead}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    BUDGET AVAILABLE AMOUNT :
                  </span>
                  <span className="col-span-7 font-mono font-bold text-slate-900 py-0.5 px-2.5">
                    Rs. {Number(voucher.preEntryBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    CURRENT BILL AMOUNT :
                  </span>
                  <span className="col-span-7 font-mono font-black text-rose-800 py-0.5 px-2.5">
                    Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-12 bg-slate-100">
                  <span className="col-span-5 font-black text-slate-950 uppercase py-0.5 px-2.5 border-r border-slate-400">
                    BALANCE BUDGET :
                  </span>
                  <span className="col-span-7 font-mono font-black text-slate-950 py-0.5 px-2.5">
                    Rs. {Number(balanceBudgetAfterPayment).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rows 23-25: Sanction Authorities with Light Grey Label Columns */}
              <div className="border-2 border-slate-900 text-[10.5px] print:text-[9.5px] mb-1.5 divide-y divide-slate-400">
                <div className="grid grid-cols-12">
                  <span className="col-span-6 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    ADMINISTRATIVE APPROVAL :
                  </span>
                  <span className="col-span-3 font-bold text-slate-900 py-0.5 px-2.5">PRINCIPAL</span>
                  <span className="col-span-3 text-right font-mono font-bold text-slate-900 py-0.5 px-2.5">
                    {voucher.chequeDate || voucher.billDate}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-6 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    FINANCIAL SANCTION :
                  </span>
                  <span className="col-span-3 font-bold text-slate-900 py-0.5 px-2.5">PRINCIPAL</span>
                  <span className="col-span-3 text-right font-mono font-bold text-slate-900 py-0.5 px-2.5">
                    {voucher.chequeDate || voucher.billDate}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-6 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    COMMITTEE APPROVAL (WHERE APPLICABLE) :
                  </span>
                  <span className="col-span-6 text-slate-400 py-0.5 px-2.5">N/A</span>
                </div>
              </div>

              {/* Rows 27-34: Double-Entry Deductions & Net Calculation Table */}
              <div className="mb-1.5">
                <div className="text-[10px] print:text-[9px] font-black uppercase text-center bg-slate-200 text-slate-950 py-0.5 border-2 border-b-0 border-slate-900 tracking-wider">
                  DETAILED DEDUCTIONS &amp; NET PAYABLE DISTRIBUTION
                </div>
                <table className="w-full text-[9.5px] print:text-[8.5px] border-collapse border-2 border-slate-900">
                  <thead className="bg-slate-100 font-black text-slate-950">
                    <tr className="border-b-2 border-slate-900 text-center">
                      <th className="border-r border-slate-900 p-0.5">SR.#</th>
                      <th className="border-r border-slate-900 p-0.5">AMOUNT (EXCL. TAX)</th>
                      <th className="border-r border-slate-900 p-0.5">SALE TAX</th>
                      <th className="border-r border-slate-900 p-0.5">PRA (BILL)</th>
                      <th className="border-r border-slate-900 p-0.5">GROSS AMOUNT</th>
                      <th className="border-r border-slate-900 p-0.5">WH INCOME TAX</th>
                      <th className="border-r border-slate-900 p-0.5">PRA SERVICE TAX</th>
                      <th className="border-r border-slate-900 p-0.5">SECURITY</th>
                      <th className="p-0.5 bg-slate-200 text-slate-950 font-black">NET AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-center">
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-900 p-0.5 font-bold">1.0</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{Number(voucher.billAmtExclTax || voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.gstAmount > 0 ? Number(voucher.gstAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.praTaxOnBill > 0 ? Number(voucher.praTaxOnBill).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right font-bold">{Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right text-rose-700">{voucher.incomeTaxAmount > 0 ? Number(voucher.incomeTaxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right text-rose-700">{voucher.praAmount > 0 ? Number(voucher.praAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">-</td>
                      <td className="p-0.5 text-right font-black text-slate-950 bg-slate-100 text-[10.5px]">{Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-100 font-black border-t-2 border-slate-900 text-slate-950">
                      <td className="border-r border-slate-900 p-0.5">TOTAL</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{Number(voucher.billAmtExclTax || voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.gstAmount > 0 ? Number(voucher.gstAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.praTaxOnBill > 0 ? Number(voucher.praTaxOnBill).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right font-black">{Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.incomeTaxAmount > 0 ? Number(voucher.incomeTaxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.praAmount > 0 ? Number(voucher.praAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">0.00</td>
                      <td className="p-0.5 text-right font-black text-slate-950 bg-slate-200 text-[10.5px]">{Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Rows 36-41: Bank & Cheque Details */}
              <div className="border-2 border-slate-900 text-[10.5px] print:text-[9.5px] mb-1.5 divide-y divide-slate-400">
                <div className="grid grid-cols-12">
                  <span className="col-span-5 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    BANK NAME &amp; ACCOUNT TITLE :
                  </span>
                  <span className="col-span-7 font-bold text-slate-900 py-0.5 px-2.5">
                    The Bank of Punjab • {voucher.bankAccount}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    BANK ACCOUNT NO. :
                  </span>
                  <span className="col-span-7 font-mono font-bold text-slate-900 py-0.5 px-2.5">
                    6580006795600014
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    CHEQUE NO. :
                  </span>
                  <span className="col-span-7 font-mono font-extrabold text-blue-900 py-0.5 px-2.5">
                    {voucher.chequeNoNet}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    CHEQUE TITLE :
                  </span>
                  <span className="col-span-7 font-black uppercase text-slate-950 text-xs py-0.5 px-2.5 tracking-wide">
                    {voucher.payeeName}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
                    CHEQUE DATE :
                  </span>
                  <span className="col-span-7 font-mono font-black text-slate-950 text-xs py-0.5 px-2.5">
                    {voucher.chequeDate || voucher.billDate}
                  </span>
                </div>
                <div className="grid grid-cols-12 bg-slate-100">
                  <span className="col-span-5 font-black text-slate-950 uppercase py-1 px-2.5 border-r border-slate-400">
                    CHEQUE AMOUNT (NET) :
                  </span>
                  <span className="col-span-7 font-mono font-black text-sm text-slate-950 py-1 px-2.5">
                    Rs. {Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    <span className="block text-[10px] font-sans font-bold italic text-slate-800 mt-0.5">
                      ({numberToWords(voucher.chequeAmountNet)})
                    </span>
                  </span>
                </div>
              </div>

              {/* Rows 43-44: Institutional Certifications */}
              <div className="text-[8.5px] print:text-[8px] text-slate-600 mb-2 italic space-y-0.5 leading-tight">
                <p>• This form shall be utilized for all categories of expenditures and purchases, including but not limited to the procurement of goods, services and works etc.</p>
                <p>• It is hereby certified that all applicable policies, procedures, SOP&apos;s and PPRA Rules have been duly complied with, prior to the execution of the said payment.</p>
              </div>

              {/* Rows 47-49: Official Signatories - Moved down with ample signing clearance */}
              <div className="mt-3 sm:mt-4 print:mt-3 pt-2 print:pt-1.5 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-xs print:text-[10px]">
                {/* Prepared by */}
                <div className="flex flex-col items-center">
                  <div className="h-12 sm:h-14 print:h-11 w-full flex items-end justify-center">
                    {/* Generous physical ink signature zone */}
                  </div>
                  <div className="border-b-2 border-slate-800 w-32 sm:w-36 mb-1.5"></div>
                  <strong className="block text-slate-950 font-black text-[11px] print:text-[10px]">
                    Kashif Zia
                  </strong>
                  <span className="text-[10px] print:text-[9px] text-slate-700 font-semibold block">
                    Accountant
                  </span>
                  <span className="text-[8.5px] print:text-[7.5px] text-slate-500 font-extrabold uppercase tracking-wider block mt-0.5">
                    Prepared by:
                  </span>
                </div>

                {/* Checked by */}
                <div className="flex flex-col items-center">
                  <div className="h-12 sm:h-14 print:h-11 w-full flex items-end justify-center">
                    {/* Generous physical ink signature zone */}
                  </div>
                  <div className="border-b-2 border-slate-800 w-32 sm:w-36 mb-1.5"></div>
                  <strong className="block text-slate-950 font-black text-[11px] print:text-[10px]">
                    ANEEBA JAMIL
                  </strong>
                  <span className="text-[10px] print:text-[9px] text-slate-700 font-semibold block">
                    CO-Signatory
                  </span>
                  <span className="text-[8.5px] print:text-[7.5px] text-slate-500 font-extrabold uppercase tracking-wider block mt-0.5">
                    Checked by:
                  </span>
                </div>

                {/* Approved by */}
                <div className="flex flex-col items-center">
                  <div className="h-12 sm:h-14 print:h-11 w-full flex items-end justify-center">
                    {/* Generous physical ink signature zone */}
                  </div>
                  <div className="border-b-2 border-slate-800 w-32 sm:w-36 mb-1.5"></div>
                  <strong className="block text-slate-950 font-black text-[11px] print:text-[10px]">
                    SHAZIA KHADIM
                  </strong>
                  <span className="text-[10px] print:text-[9px] text-slate-700 font-semibold block">
                    Acting Principal / DDO
                  </span>
                  <span className="text-[8.5px] print:text-[7.5px] text-slate-500 font-extrabold uppercase tracking-wider block mt-0.5">
                    Approved by:
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================ */}
          {/* PAGE 2: N'Sheet-Sanction Order XL STRICTLY BOUNDED TO SINGLE A4 */}
          {/* ================================================================ */}
          {printFormat === 'SANCTION' && (
            <div className="paf-single-page p-3 sm:py-5 sm:pr-5 sm:pl-9 border-2 border-slate-800 rounded-xl print:border-none print:p-0 relative">
              
              {/* Filing Margin Visual Punch Guideline (Screen Only) */}
              <div className="hidden sm:flex print:hidden absolute left-3 top-10 bottom-10 flex-col justify-around items-center opacity-30 pointer-events-none select-none">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-[7px] text-slate-600">●</div>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-[7px] text-slate-600">●</div>
              </div>

              {/* Header with Both Institutional Emblems */}
              {renderOfficialHeader(
                "Govt. Vocational Training Institute (W)",
                "Samanabad, Faisalabad"
              )}

              {/* Sanction Order Title & Corporate Meta Header with Light Grey Styling */}
              <div className="text-center mb-2.5 print:mb-2">
                <h1 className="text-base sm:text-lg print:text-base font-black tracking-wider text-slate-950 uppercase underline decoration-2 underline-offset-4">
                  SANCTION ORDER
                </h1>
                <p className="text-xs print:text-[11px] font-extrabold text-slate-800 mt-0.5 uppercase">
                  {voucher.bankAccount}
                </p>
              </div>

              {/* Corporate Executive Voucher & Reference Strip (Light Grey Highlight) */}
              <div className="grid grid-cols-12 bg-slate-100 border-2 border-slate-900 text-xs print:text-[10.5px] mb-3 divide-x divide-slate-400">
                <div className="col-span-4 px-2.5 py-1.5 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Voucher No :</span>
                  <span className="font-black font-mono text-slate-950 text-xs sm:text-sm">{voucher.voucherNo}</span>
                </div>
                <div className="col-span-4 px-2.5 py-1.5 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Cheque Date :</span>
                  <span className="font-black font-mono text-slate-950 text-xs">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="col-span-4 px-2.5 py-1.5 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Cheque No :</span>
                  <span className="font-mono font-black text-slate-950 text-xs">{voucher.chequeNoNet}</span>
                </div>
              </div>

              {/* Legal Powers Delegation Clause with Bolded Key Values */}
              <p className="text-xs print:text-[11px] text-justify leading-relaxed text-slate-900 mb-3 print:mb-2.5">
                In exercise of the Powers Delegated to the undersigned vide Sr. No.06 Part 1st &amp; 2nd Schedule of Delegation of Financial Powers vides Notification No. TEVTA/GM (F&amp;A) Financial Powers/2012 dated September 22, 2012; the sanction is hereby accorded for Purchases, <strong className="font-black text-slate-950">{voucher.accountHead}</strong> of <strong className="font-black font-mono text-slate-950">Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}/-</strong>.
              </p>

              {/* Detail Table Header & Rows with Light Grey Styling */}
              <div className="mb-3.5 print:mb-2.5">
                <p className="text-xs print:text-[11px] font-bold text-slate-800 mb-1">The detail is given below: -</p>
                <table className="w-full text-xs print:text-[10.5px] border-collapse border-2 border-slate-900">
                  <thead className="bg-slate-200 font-black text-slate-950">
                    <tr className="border-b-2 border-slate-900 text-center">
                      <th className="border-r border-slate-900 p-1.5 w-12">Sr.#</th>
                      <th className="border-r border-slate-900 p-1.5 w-32">VOUCHER REF</th>
                      <th className="border-r border-slate-900 p-1.5 text-left">NAME OF FIRM</th>
                      <th className="border-r border-slate-900 p-1.5 text-left">HEAD OF ACCOUNT</th>
                      <th className="p-1.5 text-right w-36">AMOUNT (RS.)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-900 p-1.5 text-center font-bold">1.0</td>
                      <td className="border-r border-slate-900 p-1.5 text-center font-black text-slate-950 text-[11px]">{voucher.voucherNo}</td>
                      <td className="border-r border-slate-900 p-1.5 font-sans font-black uppercase text-slate-950 tracking-wide text-xs">{voucher.payeeName}</td>
                      <td className="border-r border-slate-900 p-1.5 text-xs font-black text-slate-950">{voucher.accountHead}</td>
                      <td className="p-1.5 text-right font-black text-slate-950">
                        {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-black border-t-2 border-slate-900 text-slate-950">
                      <td colSpan={4} className="border-r border-slate-900 p-1.5 text-right uppercase font-black">
                        TOTAL:
                      </td>
                      <td className="p-1.5 text-right font-black text-sm print:text-xs">
                        Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Budget Debit Head Clause */}
              <div className="text-xs print:text-[11px] text-justify leading-relaxed text-slate-800 mb-5 print:mb-3.5 space-y-1.5">
                <p>
                  The expenditure involved shall be debit-able to the budget of Govt. Vocational Training Institute (W) Samanabad, Faisalabad. Under the head Grant No. PC-21022 (022)-044101- Support for Industrial Development – L04219 Grant-in-aid to TEVTA for the Financial Year 2026-27.
                </p>
                <p className="italic font-bold text-slate-800">
                  Submitted for signature, if sanctioned please.
                </p>
              </div>

              {/* Principal Signature Authority */}
              <div className="pt-3 print:pt-1.5 flex justify-end">
                <div className="text-center w-56 sm:w-64">
                  <div className="h-12 sm:h-14 print:h-10"></div>
                  <div className="border-b-2 border-slate-800 w-36 sm:w-44 mx-auto mb-1.5"></div>
                  <strong className="block text-sm print:text-xs font-black text-slate-950">Shazia Khadim</strong>
                  <p className="text-xs print:text-[10px] text-slate-800 font-bold">Acting Principal</p>
                  <p className="text-xs print:text-[10px] text-slate-700 font-medium">Govt. Vocational Training Institute (W)</p>
                  <p className="text-xs print:text-[10px] text-slate-700 font-medium">Samanabad, FSD</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render via portal directly into document.body to isolate print stream from main app
  if (isModal && typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
