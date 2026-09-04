import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MasterVoucher } from '../data/cashBookData';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
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
  // Format state: strictly 'PAF' or 'SANCTION' (Dual-page 'BOTH' option removed)
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
    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5 print:pb-1.5 print:mb-2 gap-3">
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

      {/* Center Corporate Header */}
      <div className="text-center flex-1 space-y-0.5">
        <p className="text-[10px] sm:text-[11px] print:text-[9.5px] font-extrabold tracking-wider text-slate-800 uppercase">
          TECHNICAL EDUCATION AND VOCATIONAL TRAINING AUTHORITY
        </p>
        <h1 className="text-sm sm:text-base print:text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">
          {title}
        </h1>
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

          {/* Format Switcher - Dual 'Both' option completely removed for single-page precision */}
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

        {/* Printable Document Area */}
        <div className="p-4 sm:p-6 print:p-0 font-sans text-slate-900 bg-white leading-relaxed">
          
          {/* ================================================================ */}
          {/* PAGE 1: PAF (N'Sheet) STRICTLY BOUNDED TO SINGLE A4 PAGE         */}
          {/* ================================================================ */}
          {printFormat === 'PAF' && (
            <div className="paf-single-page p-3 sm:p-5 border-2 border-slate-800 rounded-xl print:border-none print:p-0">
              
              {/* Header with Both Institutional Emblems */}
              {renderOfficialHeader(
                "PAYMENT APPROVAL FORM",
                "GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN SAMANABAD, FAISALABAD"
              )}

              {/* Rows 8 to 16: Voucher Meta & Vendor Information */}
              <div className="border border-slate-900 text-[11px] print:text-[10px] mb-2 print:mb-1.5">
                <div className="grid grid-cols-12 border-b border-slate-400 bg-slate-50 py-0.5 px-2.5">
                  <span className="col-span-4 font-bold text-slate-700">Sr. / Voucher# :</span>
                  <span className="col-span-8 font-extrabold text-blue-900 font-mono text-xs">{voucher.voucherNo}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-4 font-bold text-slate-700">DATE :</span>
                  <span className="col-span-8 font-bold font-mono">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-4 font-bold text-slate-700">VENDER / PARTY :</span>
                  <span className="col-span-8 font-black uppercase text-slate-900">{voucher.payeeName}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-4 font-bold text-slate-700">NTN / CNIC :</span>
                  <span className="col-span-8 font-mono font-bold">{voucher.ntnCnic || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-4 font-bold text-slate-700">STRN / PNTN# :</span>
                  <span className="col-span-8 font-mono">{voucher.praAmount > 0 ? (voucher.ntnCnic || 'Registered') : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-4 font-bold text-slate-700">PEC (WHERE APPLICABLE) :</span>
                  <span className="col-span-8 text-slate-400">—</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-4 font-bold text-slate-700">INVOICE DATE & NO. :</span>
                  <span className="col-span-8 font-mono font-bold">
                    Bill#: {voucher.billNo || 'N/A'} &nbsp;•&nbsp; Date: {voucher.billDate || 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-4 font-bold text-slate-700">ITEM DETAIL :</span>
                  <span className="col-span-8 font-medium italic text-slate-800">{voucher.description}</span>
                </div>
                <div className="grid grid-cols-12 bg-slate-100 py-0.5 px-2.5">
                  <span className="col-span-4 font-black text-slate-900 uppercase">BILL AMOUNT (GROSS) :</span>
                  <span className="col-span-8 font-black font-mono text-xs text-slate-900">
                    Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rows 18-21: Budget Appropriations & Approvals */}
              <div className="border border-slate-900 text-[11px] print:text-[10px] mb-2 print:mb-1.5">
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-5 font-bold text-slate-700">CODE / HEAD OF PAYMENT :</span>
                  <span className="col-span-7 font-black font-mono text-blue-900">{voucher.accountHead}</span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-5 font-bold text-slate-700">BUDGET AVAILABLE AMOUNT :</span>
                  <span className="col-span-7 font-mono font-bold">
                    Rs. {Number(voucher.preEntryBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-12 border-b border-slate-400 py-0.5 px-2.5">
                  <span className="col-span-5 font-bold text-slate-700">CURRENT BILL AMOUNT :</span>
                  <span className="col-span-7 font-mono font-bold text-rose-700">
                    Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-12 bg-amber-50/60 py-0.5 px-2.5">
                  <span className="col-span-5 font-black text-amber-900">BALANCE BUDGET :</span>
                  <span className="col-span-7 font-mono font-black text-amber-950">
                    Rs. {Number(balanceBudgetAfterPayment).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rows 23-25: Sanction Authorities */}
              <div className="border border-slate-900 text-[11px] print:text-[10px] mb-2 print:mb-1.5 divide-y divide-slate-400">
                <div className="grid grid-cols-12 py-0.5 px-2.5">
                  <span className="col-span-6 font-bold text-slate-700">ADMINISTRATIVE APPROVAL :</span>
                  <span className="col-span-3 font-bold">PRINCIPAL</span>
                  <span className="col-span-3 text-right font-mono">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="grid grid-cols-12 py-0.5 px-2.5">
                  <span className="col-span-6 font-bold text-slate-700">FINANCIAL SANCTION :</span>
                  <span className="col-span-3 font-bold">PRINCIPAL</span>
                  <span className="col-span-3 text-right font-mono">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="grid grid-cols-12 py-0.5 px-2.5">
                  <span className="col-span-6 font-bold text-slate-700">COMMITTEE APPROVAL (WHERE APPLICABLE) :</span>
                  <span className="col-span-6 text-slate-400">N/A</span>
                </div>
              </div>

              {/* Rows 27-34: Double-Entry Deductions & Net Calculation Table */}
              <div className="mb-2 print:mb-1.5">
                <div className="text-[9.5px] print:text-[9px] font-black uppercase text-center bg-slate-900 text-white py-0.5">
                  DETAILED DEDUCTIONS & NET PAYABLE DISTRIBUTION
                </div>
                <table className="w-full text-[9.5px] print:text-[9px] border-collapse border border-slate-900">
                  <thead className="bg-slate-100 font-bold text-slate-900">
                    <tr className="border-b border-slate-900 text-center">
                      <th className="border-r border-slate-900 p-0.5">SR.#</th>
                      <th className="border-r border-slate-900 p-0.5">AMOUNT (EXCL. TAX)</th>
                      <th className="border-r border-slate-900 p-0.5">SALE TAX</th>
                      <th className="border-r border-slate-900 p-0.5">PRA (BILL)</th>
                      <th className="border-r border-slate-900 p-0.5">GROSS AMOUNT</th>
                      <th className="border-r border-slate-900 p-0.5">WH INCOME TAX</th>
                      <th className="border-r border-slate-900 p-0.5">PRA SERVICE TAX</th>
                      <th className="border-r border-slate-900 p-0.5">SECURITY</th>
                      <th className="p-0.5">NET AMOUNT</th>
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
                      <td className="p-0.5 text-right font-black text-emerald-800">{Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                      <td className="border-r border-slate-900 p-0.5">TOTAL</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{Number(voucher.billAmtExclTax || voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.gstAmount > 0 ? Number(voucher.gstAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.praTaxOnBill > 0 ? Number(voucher.praTaxOnBill).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right font-black">{Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.incomeTaxAmount > 0 ? Number(voucher.incomeTaxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">{voucher.praAmount > 0 ? Number(voucher.praAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</td>
                      <td className="border-r border-slate-900 p-0.5 text-right">0.00</td>
                      <td className="p-0.5 text-right font-black text-emerald-900">{Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Rows 36-41: Bank & Cheque Details */}
              <div className="border border-slate-900 text-[11px] print:text-[10px] mb-2 print:mb-1.5 divide-y divide-slate-400">
                <div className="grid grid-cols-12 py-0.5 px-2.5">
                  <span className="col-span-5 font-bold text-slate-700">BANK NAME & ACCOUNT TITLE :</span>
                  <span className="col-span-7 font-bold">The Bank of Punjab • {voucher.bankAccount}</span>
                </div>
                <div className="grid grid-cols-12 py-0.5 px-2.5">
                  <span className="col-span-5 font-bold text-slate-700">BANK ACCOUNT NO. :</span>
                  <span className="col-span-7 font-mono font-bold">6580006795600014</span>
                </div>
                <div className="grid grid-cols-12 py-0.5 px-2.5">
                  <span className="col-span-5 font-bold text-slate-700">CHEQUE NO. :</span>
                  <span className="col-span-7 font-mono font-extrabold text-blue-900">{voucher.chequeNoNet}</span>
                </div>
                <div className="grid grid-cols-12 py-0.5 px-2.5">
                  <span className="col-span-5 font-bold text-slate-700">CHEQUE TITLE :</span>
                  <span className="col-span-7 font-black">{voucher.payeeName}</span>
                </div>
                <div className="grid grid-cols-12 py-0.5 px-2.5">
                  <span className="col-span-5 font-bold text-slate-700">CHEQUE DATE :</span>
                  <span className="col-span-7 font-mono font-bold">{voucher.chequeDate || voucher.billDate}</span>
                </div>
                <div className="grid grid-cols-12 py-0.5 px-2.5 bg-blue-50/50">
                  <span className="col-span-5 font-black text-blue-950">CHEQUE AMOUNT (NET) :</span>
                  <span className="col-span-7 font-mono font-black text-xs text-blue-950">
                    Rs. {Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    <span className="block text-[9.5px] font-sans font-medium italic text-slate-600">
                      ({numberToWords(voucher.chequeAmountNet)})
                    </span>
                  </span>
                </div>
              </div>

              {/* Rows 43-44: Institutional Certifications */}
              <div className="text-[9px] print:text-[8px] text-slate-600 mb-2 print:mb-1.5 italic space-y-0.5 leading-tight">
                <p>• This form shall be utilized for all categories of expenditures and purchases, including but not limited to the procurement of goods, services and works etc.</p>
                <p>• It is hereby certified that all applicable policies, procedures, SOP&apos;s and PPRA Rules have been duly complied with, prior to the execution of the said payment.</p>
              </div>

              {/* Rows 47-49: Official Signatories */}
              <div className="pt-2 print:pt-1 border-t border-slate-400 grid grid-cols-3 gap-4 text-center text-xs print:text-[10px]">
                <div>
                  <div className="border-b border-slate-700 w-28 sm:w-32 mx-auto mb-1 h-5 print:h-4"></div>
                  <strong className="block text-slate-900 text-[10.5px] print:text-[9.5px]">Kashif Zia</strong>
                  <span className="text-[9.5px] print:text-[8.5px] text-slate-600 block">Accountant</span>
                  <span className="text-[8.5px] print:text-[7.5px] text-slate-500 font-bold uppercase block">Prepared by:</span>
                </div>
                <div>
                  <div className="border-b border-slate-700 w-28 sm:w-32 mx-auto mb-1 h-5 print:h-4"></div>
                  <strong className="block text-slate-900 text-[10.5px] print:text-[9.5px]">ANEEBA JAMIL</strong>
                  <span className="text-[9.5px] print:text-[8.5px] text-slate-600 block">CO-Signatory</span>
                  <span className="text-[8.5px] print:text-[7.5px] text-slate-500 font-bold uppercase block">Checked by:</span>
                </div>
                <div>
                  <div className="border-b border-slate-700 w-28 sm:w-32 mx-auto mb-1 h-5 print:h-4"></div>
                  <strong className="block text-slate-900 text-[10.5px] print:text-[9.5px]">SHAZIA KHADIM</strong>
                  <span className="text-[9.5px] print:text-[8.5px] text-slate-600 block">Acting Principal / DDO</span>
                  <span className="text-[8.5px] print:text-[7.5px] text-slate-500 font-bold uppercase block">Approved by:</span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* PAGE 2: N'Sheet-Sanction Order XL STRICTLY BOUNDED TO SINGLE A4 */}
          {/* ================================================================ */}
          {printFormat === 'SANCTION' && (
            <div className="paf-single-page p-3 sm:p-5 border-2 border-slate-800 rounded-xl print:border-none print:p-0">
              
              {/* Header with Both Institutional Emblems */}
              {renderOfficialHeader(
                "Govt. Vocational Training Institute (W)",
                "Samanabad, Faisalabad"
              )}

              {/* Sanction Order Title & Account */}
              <div className="text-center mb-3.5 print:mb-2.5">
                <h1 className="text-base sm:text-lg print:text-base font-black tracking-wider text-slate-900 uppercase underline decoration-2 underline-offset-4">
                  SANCTION ORDER
                </h1>
                <p className="text-xs print:text-[11px] font-bold font-mono text-blue-900 mt-0.5 uppercase">
                  {voucher.bankAccount}
                </p>
              </div>

              {/* Legal Powers Delegation Clause */}
              <p className="text-xs print:text-[11px] text-justify leading-relaxed text-slate-800 mb-3.5 print:mb-2.5">
                In exercise of the Powers Delegated to the undersigned vide Sr. No.06 Part 1st &amp; 2nd Schedule of Delegation of Financial Powers vides Notification No. TEVTA/GM (F&amp;A) Financial Powers/2012 dated September 22, 2012; the sanction is hereby accorded for Purchases, <strong className="text-slate-900">{voucher.accountHead}</strong> of <strong className="font-mono text-slate-900">Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}/-</strong>.
              </p>

              {/* Detail Table Header & Rows */}
              <div className="mb-4 print:mb-3">
                <p className="text-xs print:text-[11px] font-bold text-slate-700 mb-1.5">The detail is given below: -</p>
                <table className="w-full text-xs print:text-[11px] border-collapse border-2 border-slate-900">
                  <thead className="bg-slate-100 font-black text-slate-900">
                    <tr className="border-b-2 border-slate-900 text-center">
                      <th className="border-r border-slate-900 p-1.5 w-16">Sr.#</th>
                      <th className="border-r border-slate-900 p-1.5 text-left">NAME OF FIRM</th>
                      <th className="border-r border-slate-900 p-1.5 text-left">HEAD OF ACCOUNT</th>
                      <th className="p-1.5 text-right w-40">AMOUNT (RS.)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-900 p-1.5 text-center font-bold">1.0</td>
                      <td className="border-r border-slate-900 p-1.5 font-sans font-bold uppercase">{voucher.payeeName}</td>
                      <td className="border-r border-slate-900 p-1.5 text-xs font-bold text-blue-900">{voucher.accountHead}</td>
                      <td className="p-1.5 text-right font-black">
                        {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                      <td colSpan={3} className="border-r border-slate-900 p-1.5 text-right uppercase font-black">
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
              <div className="text-xs print:text-[11px] text-justify leading-relaxed text-slate-800 mb-6 print:mb-4 space-y-2">
                <p>
                  The expenditure involved shall be debit-able to the budget of Govt. Vocational Training Institute (W) Samanabad, Faisalabad. Under the head Grant No. PC-21022 (022)-044101- Support for Industrial Development – L04219 Grant-in-aid to TEVTA for the Financial Year 2026-27.
                </p>
                <p className="italic font-semibold text-slate-700">
                  Submitted for signature, if sanctioned please.
                </p>
              </div>

              {/* Principal Signature Authority */}
              <div className="pt-4 print:pt-2 flex justify-end">
                <div className="text-center w-56 sm:w-64">
                  <div className="border-b border-slate-700 w-36 sm:w-44 mx-auto mb-1.5 h-6 print:h-5"></div>
                  <strong className="block text-sm print:text-xs font-black text-slate-900">Shazia Khadim</strong>
                  <p className="text-xs print:text-[10px] text-slate-700 font-medium">Acting Principal</p>
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
