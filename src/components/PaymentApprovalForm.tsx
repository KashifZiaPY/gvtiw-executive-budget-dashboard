import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MasterVoucher } from '../data/cashBookData';
import { Printer, X, FileText, Layers } from 'lucide-react';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO, DEFAULT_GOP_LOGO } from '../data/initialData';
import { formatPakistaniDate } from '../lib/formatters';

interface PaymentApprovalFormProps {
  voucher: MasterVoucher | null;
  onClose?: () => void;
  isModal?: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
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

/**
 * Official Filing Margin Punch Hole Guide
 * Standard ISO 838 2-Hole Filing Coordinates:
 * - A4 Height: 297mm (center is 148.5mm from top edge of paper)
 * - Hole Spacing: 80mm
 * - Page Top Margin in Print: 15mm (increased to eliminate printer cropping)
 * - Upper Hole: 108.5mm from A4 top (93.5mm from container top in print)
 * - Center Guide Mark: 148.5mm from A4 top (133.5mm from container top in print)
 * - Lower Hole: 188.5mm from A4 top (173.5mm from container top in print)
 * - Left Distance: 4mm inside container + 8mm page margin = 12mm from paper edge (exact ISO 838 standard)
 */
const PunchHoleGuide: React.FC = () => (
  <div
    className="absolute left-1.5 sm:left-[3.5mm] print:left-[4mm] top-0 bottom-0 pointer-events-none select-none z-20 w-6 print:w-[8mm]"
    aria-hidden="true"
  >
    {/* Upper Punch Guide (108.5mm from paper top = 93.5mm in container) */}
    <div className="absolute top-[36%] sm:top-[93.5mm] print:top-[93.5mm] -translate-y-1/2 left-0 right-0 flex flex-col items-center gap-0.5 opacity-40 print:opacity-50">
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-600 print:text-slate-700"
      >
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="10" y1="16" x2="10" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="1" y1="10" x2="4" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="16" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <span className="text-[6.5px] print:text-[6.5px] font-mono font-bold tracking-tight text-slate-500 print:text-slate-700 uppercase">
        PUNCH
      </span>
    </div>

    {/* Center Fold & Punch Center Slider Alignment Marker (148.5mm = Exact A4 Midpoint) */}
    <div className="absolute top-[50%] sm:top-[133.5mm] print:top-[133.5mm] -translate-y-1/2 left-0 right-0 flex flex-col items-center gap-0.5 opacity-50 print:opacity-60">
      <div className="flex items-center gap-0.5 w-full justify-center">
        <div className="w-2 border-t-2 border-slate-700 print:border-slate-800"></div>
        <div className="w-2 h-2 rounded-full border border-slate-700 print:border-slate-800 flex items-center justify-center">
          <div className="w-0.5 h-0.5 bg-slate-700 print:bg-slate-800 rounded-full"></div>
        </div>
        <div className="w-2 border-t-2 border-slate-700 print:border-slate-800"></div>
      </div>
      <span className="text-[6px] print:text-[5.5px] font-mono font-black text-slate-700 print:text-slate-800 tracking-tighter uppercase whitespace-nowrap">
        ◄ CENTER ►
      </span>
    </div>

    {/* Lower Punch Guide (188.5mm from paper top = 173.5mm in container, exactly 80mm from upper hole) */}
    <div className="absolute top-[64%] sm:top-[173.5mm] print:top-[173.5mm] -translate-y-1/2 left-0 right-0 flex flex-col items-center gap-0.5 opacity-40 print:opacity-50">
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-600 print:text-slate-700"
      >
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="10" y1="16" x2="10" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="1" y1="10" x2="4" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="16" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <span className="text-[6.5px] print:text-[6.5px] font-mono font-bold tracking-tight text-slate-500 print:text-slate-700 uppercase">
        PUNCH
      </span>
    </div>
  </div>
);

/**
 * Ink-Efficient Center Watermark (GVTIW Institutional Crest)
 * Faint, desaturated, dignified background emblem that saves printer ink/toner
 * Renders on both Page 1 (PAF) and Page 2 (Sanction Order)
 */
const CenterWatermark: React.FC<{ logoSrc: string }> = ({ logoSrc }) => (
  <div
    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
    aria-hidden="true"
  >
    <img
      src={logoSrc}
      alt="GVTIW Institutional Watermark"
      className="w-72 h-72 sm:w-88 sm:h-88 print:w-72 print:h-72 object-contain opacity-[0.08] print:opacity-[0.075] grayscale contrast-125 transition-opacity"
      referrerPolicy="no-referrer"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = DEFAULT_GVTIW_LOGO;
      }}
    />
  </div>
);

// Very Dim Footer Watermark Requested for System Attribution
const DimSystemFooter: React.FC = () => (
  <div className="relative z-10 mt-3 pt-1.5 border-t border-dotted border-slate-300 print:border-slate-300 text-center select-none">
    <p className="text-[7.5px] print:text-[7px] font-mono tracking-wider text-slate-400 print:text-slate-400">
      e-CashBook &amp; Voucher System Generated by MKZ for 33028
    </p>
  </div>
);

export const PaymentApprovalForm: React.FC<PaymentApprovalFormProps> = ({
  voucher,
  onClose,
  isModal = true,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
}) => {
  // Format state: 'BOTH' (default for 1-click 2-page print), 'PAF', or 'SANCTION'
  const [printFormat, setPrintFormat] = useState<'BOTH' | 'PAF' | 'SANCTION'>('BOTH');

  // Resolve institutional crests with local-storage and built-in fallbacks
  const [gvtiwLogoSrc] = useState<string>(() => {
    if (customGvtiwLogo && (customGvtiwLogo.startsWith('data:') || customGvtiwLogo.startsWith('/'))) return customGvtiwLogo;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gvtiw_custom_logo') : null;
    return saved && (saved.startsWith('data:') || saved.startsWith('/')) ? saved : DEFAULT_GVTIW_LOGO;
  });

  const [tevtaLogoSrc] = useState<string>(() => {
    if (customTevtaLogo && (customTevtaLogo.startsWith('data:') || customTevtaLogo.startsWith('/'))) return customTevtaLogo;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tevta_custom_logo') : null;
    return saved && (saved.startsWith('data:') || saved.startsWith('/')) ? saved : DEFAULT_TEVTA_LOGO;
  });

  const [gopLogoSrc] = useState<string>(() => {
    if (customGopLogo && (customGopLogo.startsWith('data:') || customGopLogo.startsWith('/')) && !customGopLogo.endsWith('.svg')) {
      return customGopLogo;
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gop_custom_logo') : null;
    if (saved && (saved.startsWith('data:') || saved.startsWith('/')) && !saved.endsWith('.svg')) {
      return saved;
    }
    return DEFAULT_GOP_LOGO;
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

  // Official Institutional Header: TEVTA Logo (Left), Title (Center), Govt of Punjab Logo (Right)
  const renderOfficialHeader = (title: string, subheader: string) => (
    <div className="relative z-10 flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2 print:pb-1.5 print:mb-1.5 gap-3">
      {/* Left Crest: TEVTA */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 print:w-13 print:h-13 shrink-0 flex items-center justify-center p-0.5">
        <img
          src={tevtaLogoSrc}
          alt="TEVTA Authority"
          className="max-w-full max-h-full object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_TEVTA_LOGO;
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

      {/* Right Crest: Govt of Punjab (GOP) */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 print:w-13 print:h-13 shrink-0 flex items-center justify-center p-0.5">
        <img
          src={gopLogoSrc}
          alt="Govt of Punjab Emblem"
          className="max-w-full max-h-full object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_GOP_LOGO;
          }}
        />
      </div>
    </div>
  );

  // PAGE 1: Payment Approval Form (PAF)
  const renderPafPage = (pageBreakClass: string = '') => (
    <div
      key="page-1-paf"
      className={`paf-single-page min-h-[760px] sm:min-h-[860px] p-3 sm:pt-6 sm:pb-5 sm:pr-5 sm:pl-10 border-2 border-slate-800 rounded-xl print:border-none relative bg-white overflow-hidden ${pageBreakClass}`}
    >
      {/* GVTIW Center Watermark (Ink Efficient / Saving) */}
      <CenterWatermark logoSrc={gvtiwLogoSrc} />

      {/* Filing Margin Visual Punch Guideline (Aligned with A4 Center in Screen & Print) */}
      <PunchHoleGuide />

      {/* Top Header: Left TEVTA, Center Titles, Right GOP */}
      {renderOfficialHeader(
        "PAYMENT APPROVAL FORM",
        "GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN SAMANABAD, FAISALABAD"
      )}

      {/* Prominent Separate Voucher # Header with Quick Reference Audit Indicators all clustered on the Right for Thumb Counting */}
      <div className="relative z-10 flex items-center justify-end gap-1.5 sm:gap-2 mb-1.5 print:mb-1">
        {/* Dim Quick Reference Labels for counting/sorting hard vouchers (Shifted right alongside Voucher #) */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] print:text-[8px] font-mono select-none">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-300 bg-slate-50/90 print:bg-white shadow-2xs">
            <span className="text-[8px] print:text-[7px] uppercase font-sans font-bold text-slate-400 tracking-wider">NET CHEQUE#</span>
            <span className="font-semibold text-slate-800">{voucher.chequeNoNet}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-300 bg-slate-50/90 print:bg-white shadow-2xs">
            <span className="text-[8px] print:text-[7px] uppercase font-sans font-bold text-slate-400 tracking-wider">NET AMOUNT</span>
            <span className="font-semibold text-slate-800">Rs. {Number(voucher.chequeAmountNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-300 bg-slate-50/90 print:bg-white shadow-2xs">
            <span className="text-[8px] print:text-[7px] uppercase font-sans font-bold text-slate-400 tracking-wider">NET DATE</span>
            <span className="font-semibold text-slate-800">{formatPakistaniDate(voucher.chequeDate || voucher.billDate)}</span>
          </div>
        </div>

        {/* Prominent Right-Extreme Voucher # with light grey highlight and rounded border */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border-2 border-slate-900 rounded-md bg-slate-200 print:bg-slate-200 shadow-xs shrink-0">
          <span className="text-[10px] print:text-[9px] font-black uppercase text-slate-900 tracking-wider">
            VOUCHER # :
          </span>
          <span className="text-xs sm:text-sm print:text-xs font-black font-mono text-slate-950 tracking-tight">
            {voucher.voucherNo}
          </span>
        </div>
      </div>

      {/* Rows 8 to 16: Voucher Meta & Vendor Information with Light Grey Heading Style */}
      <div className="relative z-10 border-2 border-slate-900 text-[10.5px] print:text-[9.5px] mb-1.5 divide-y divide-slate-400 bg-white/80 backdrop-blur-none">
        <div className="grid grid-cols-12">
          <span className="col-span-4 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
            DATE :
          </span>
          <span className="col-span-8 font-black text-slate-950 font-mono text-xs py-0.5 px-2.5">
            {formatPakistaniDate(voucher.chequeDate || voucher.billDate)}
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
            INVOICE DATE &amp; NO. :
          </span>
          <span className="col-span-8 font-mono font-bold text-slate-900 py-0.5 px-2.5">
            Bill#: {voucher.billNo || 'N/A'} &nbsp;•&nbsp; Date: {formatPakistaniDate(voucher.billDate)}
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
      <div className="relative z-10 border-2 border-slate-900 text-[10.5px] print:text-[9.5px] mb-1.5 divide-y divide-slate-400 bg-white/90">
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
      <div className="relative z-10 border-2 border-slate-900 text-[10.5px] print:text-[9.5px] mb-1.5 divide-y divide-slate-400 bg-white/90">
        <div className="grid grid-cols-12">
          <span className="col-span-6 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
            ADMINISTRATIVE APPROVAL :
          </span>
          <span className="col-span-3 font-bold text-slate-900 py-0.5 px-2.5">PRINCIPAL</span>
          <span className="col-span-3 text-right font-mono font-bold text-slate-900 py-0.5 px-2.5">
            {formatPakistaniDate(voucher.chequeDate || voucher.billDate)}
          </span>
        </div>
        <div className="grid grid-cols-12">
          <span className="col-span-6 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
            FINANCIAL SANCTION :
          </span>
          <span className="col-span-3 font-bold text-slate-900 py-0.5 px-2.5">PRINCIPAL</span>
          <span className="col-span-3 text-right font-mono font-bold text-slate-900 py-0.5 px-2.5">
            {formatPakistaniDate(voucher.chequeDate || voucher.billDate)}
          </span>
        </div>
        <div className="grid grid-cols-12">
          <span className="col-span-6 font-bold text-slate-800 bg-slate-100 py-0.5 px-2.5 border-r border-slate-400 uppercase">
            COMMITTEE APPROVAL (WHERE APPLICABLE) :
          </span>
          <span className="col-span-6 text-slate-400 py-0.5 px-2.5">N/A</span>
        </div>
      </div>

      {/* Rows 27-34: Double-Entry Deductions & Net Calculation Table (SR.# as whole number 1) */}
      <div className="relative z-10 mb-1.5">
        <div className="text-[10px] print:text-[9px] font-black uppercase text-center bg-slate-200 text-slate-950 py-0.5 border-2 border-b-0 border-slate-900 tracking-wider">
          DETAILED DEDUCTIONS &amp; NET PAYABLE DISTRIBUTION
        </div>
        <table className="w-full text-[9.5px] print:text-[8.5px] border-collapse border-2 border-slate-900 bg-white/80 backdrop-blur-none">
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
              <td className="border-r border-slate-900 p-0.5 font-bold">1</td>
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
      <div className="relative z-10 border-2 border-slate-900 text-[10.5px] print:text-[9.5px] mb-1.5 divide-y divide-slate-400 bg-white/80 backdrop-blur-none">
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
            {formatPakistaniDate(voucher.chequeDate || voucher.billDate)}
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
      <div className="relative z-10 text-[8.5px] print:text-[8px] text-slate-600 mb-2 italic space-y-0.5 leading-tight">
        <p>• This form shall be utilized for all categories of expenditures and purchases, including but not limited to the procurement of goods, services and works etc.</p>
        <p>• It is hereby certified that all applicable policies, procedures, SOP&apos;s and PPRA Rules have been duly complied with, prior to the execution of the said payment.</p>
      </div>

      {/* Rows 47-49: Official Signatories (KASHIF ZIA in ALL CAPS) */}
      <div className="relative z-10 mt-3 sm:mt-4 print:mt-3 pt-2 print:pt-1.5 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-xs print:text-[10px]">
        {/* Prepared by - KASHIF ZIA */}
        <div className="flex flex-col items-center">
          <div className="h-12 sm:h-14 print:h-11 w-full flex items-end justify-center">
            {/* Generous physical ink signature zone */}
          </div>
          <div className="border-b-2 border-slate-800 w-32 sm:w-36 mb-1.5"></div>
          <strong className="block text-slate-950 font-black text-[11px] print:text-[10px] uppercase">
            KASHIF ZIA
          </strong>
          <span className="text-[10px] print:text-[9px] text-slate-700 font-semibold block">
            Accountant
          </span>
          <span className="text-[8.5px] print:text-[7.5px] text-slate-500 font-extrabold uppercase tracking-wider block mt-0.5">
            Prepared by:
          </span>
        </div>

        {/* Checked by - ANEEBA JAMIL */}
        <div className="flex flex-col items-center">
          <div className="h-12 sm:h-14 print:h-11 w-full flex items-end justify-center">
            {/* Generous physical ink signature zone */}
          </div>
          <div className="border-b-2 border-slate-800 w-32 sm:w-36 mb-1.5"></div>
          <strong className="block text-slate-950 font-black text-[11px] print:text-[10px] uppercase">
            ANEEBA JAMIL
          </strong>
          <span className="text-[10px] print:text-[9px] text-slate-700 font-semibold block">
            CO-Signatory
          </span>
          <span className="text-[8.5px] print:text-[7.5px] text-slate-500 font-extrabold uppercase tracking-wider block mt-0.5">
            Checked by:
          </span>
        </div>

        {/* Approved by - SHAZIA KHADIM */}
        <div className="flex flex-col items-center">
          <div className="h-12 sm:h-14 print:h-11 w-full flex items-end justify-center">
            {/* Generous physical ink signature zone */}
          </div>
          <div className="border-b-2 border-slate-800 w-32 sm:w-36 mb-1.5"></div>
          <strong className="block text-slate-950 font-black text-[11px] print:text-[10px] uppercase">
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

      {/* Dim Footer Watermark Requested for System Attribution */}
      <DimSystemFooter />
    </div>
  );

  // PAGE 2: Sanction Order (XL)
  const renderSanctionPage = (pageBreakClass: string = '') => (
    <div
      key="page-2-sanction"
      className={`paf-single-page min-h-[760px] sm:min-h-[860px] p-3 sm:pt-6 sm:pb-5 sm:pr-5 sm:pl-10 border-2 border-slate-800 rounded-xl print:border-none relative bg-white overflow-hidden ${pageBreakClass}`}
    >
      {/* GVTIW Center Watermark (Ink Efficient / Saving) */}
      <CenterWatermark logoSrc={gvtiwLogoSrc} />

      {/* Filing Margin Visual Punch Guideline (Aligned with A4 Center in Screen & Print) */}
      <PunchHoleGuide />

      {/* Top Header: Left TEVTA, Center Titles, Right GOP */}
      {renderOfficialHeader(
        "Govt. Vocational Training Institute (W)",
        "Samanabad, Faisalabad"
      )}

      {/* Sanction Order Title & Corporate Meta Header with Light Grey Styling */}
      <div className="relative z-10 text-center mb-2.5 print:mb-2">
        <h1 className="text-base sm:text-lg print:text-base font-black tracking-wider text-slate-950 uppercase underline decoration-2 underline-offset-4">
          SANCTION ORDER
        </h1>
        <p className="text-xs print:text-[11px] font-extrabold text-slate-800 mt-0.5 uppercase">
          {voucher.bankAccount}
        </p>
      </div>

      {/* Corporate Executive Voucher & Reference Strip (Light Grey Highlight) */}
      <div className="relative z-10 grid grid-cols-12 bg-slate-100/90 border-2 border-slate-900 text-xs print:text-[10.5px] mb-3 divide-x divide-slate-400">
        <div className="col-span-4 px-2.5 py-1.5 flex items-center gap-1.5">
          <span className="font-bold text-slate-700 uppercase text-[10px]">Voucher No :</span>
          <span className="font-black font-mono text-slate-950 text-xs sm:text-sm">{voucher.voucherNo}</span>
        </div>
        <div className="col-span-4 px-2.5 py-1.5 flex items-center gap-1.5">
          <span className="font-bold text-slate-700 uppercase text-[10px]">Cheque Date :</span>
          <span className="font-black font-mono text-slate-950 text-xs">{formatPakistaniDate(voucher.chequeDate || voucher.billDate)}</span>
        </div>
        <div className="col-span-4 px-2.5 py-1.5 flex items-center gap-1.5">
          <span className="font-bold text-slate-700 uppercase text-[10px]">Cheque No :</span>
          <span className="font-mono font-black text-slate-950 text-xs">{voucher.chequeNoNet}</span>
        </div>
      </div>

      {/* Legal Powers Delegation Clause with Bolded Key Values */}
      <p className="relative z-10 text-xs print:text-[11px] text-justify leading-relaxed text-slate-900 mb-3 print:mb-2.5">
        In exercise of the Powers Delegated to the undersigned vide Sr. No.06 Part 1st &amp; 2nd Schedule of Delegation of Financial Powers vides Notification No. TEVTA/GM (F&amp;A) Financial Powers/2012 dated September 22, 2012; the sanction is hereby accorded for Purchases, <strong className="font-black text-slate-950">{voucher.accountHead}</strong> of <strong className="font-black font-mono text-slate-950">Rs. {Number(voucher.billAmountGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}/-</strong>.
      </p>

      {/* Detail Table Header & Rows with Light Grey Styling (Sr.# as whole number 1) */}
      <div className="relative z-10 mb-3.5 print:mb-2.5">
        <p className="text-xs print:text-[11px] font-bold text-slate-800 mb-1">The detail is given below: -</p>
        <table className="w-full text-xs print:text-[10.5px] border-collapse border-2 border-slate-900 bg-white/80 backdrop-blur-none">
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
              <td className="border-r border-slate-900 p-1.5 text-center font-bold">1</td>
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
      <div className="relative z-10 text-xs print:text-[11px] text-justify leading-relaxed text-slate-800 mb-5 print:mb-3.5 space-y-1.5">
        <p>
          The expenditure involved shall be debit-able to the budget of Govt. Vocational Training Institute (W) Samanabad, Faisalabad. Under the head Grant No. PC-21022 (022)-044101- Support for Industrial Development – L04219 Grant-in-aid to TEVTA for the Financial Year 2026-27.
        </p>
        <p className="italic font-bold text-slate-800">
          Submitted for signature, if sanctioned please.
        </p>
      </div>

      {/* Principal Signature Authority (SHAZIA KHADIM in ALL CAPS) */}
      <div className="relative z-10 pt-3 print:pt-1.5 flex justify-end">
        <div className="text-center w-56 sm:w-64">
          <div className="h-12 sm:h-14 print:h-10"></div>
          <div className="border-b-2 border-slate-800 w-36 sm:w-44 mx-auto mb-1.5"></div>
          <strong className="block text-sm print:text-xs font-black text-slate-950 uppercase">
            SHAZIA KHADIM
          </strong>
          <p className="text-xs print:text-[10px] text-slate-800 font-bold">Acting Principal</p>
          <p className="text-xs print:text-[10px] text-slate-700 font-medium">Govt. Vocational Training Institute (W)</p>
          <p className="text-xs print:text-[10px] text-slate-700 font-medium">Samanabad, FSD</p>
        </div>
      </div>

      {/* Dim Footer Watermark Requested for System Attribution */}
      <DimSystemFooter />
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
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-800 print:hidden gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-sm tracking-wide">
              {voucher.voucherNo}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
              Status: {voucher.entryStatus}
            </span>
          </div>

          {/* Single-File vs Individual Page Format Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 flex-wrap">
            <button
              onClick={() => setPrintFormat('BOTH')}
              title="Prints Page 1 & Page 2 together as a single 2-page print file"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                printFormat === 'BOTH'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              📑 Complete Set (Page 1 &amp; 2)
            </button>
            <button
              onClick={() => setPrintFormat('PAF')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'PAF'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📄 Page 1: PAF Only
            </button>
            <button
              onClick={() => setPrintFormat('SANCTION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'SANCTION'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📜 Page 2: Sanction Only
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {printFormat === 'BOTH'
                ? 'Print Complete Set (Page 1 & 2)'
                : 'Print Single Sheet (A4)'}
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
        <div className="p-4 sm:p-6 print:p-0 font-sans text-slate-900 bg-white leading-relaxed space-y-6 print:space-y-0">
          
          {/* OPTION 1: COMPLETE SET (Page 1 + Page 2) in a single printable document stream */}
          {printFormat === 'BOTH' && (
            <>
              {/* Screen Visual Header for Page 1 */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b pb-1 print:hidden">
                <span className="flex items-center gap-1.5 text-blue-700 font-extrabold uppercase">
                  <span>📄</span> Sheet 1 of 2: Payment Approval Form (PAF)
                </span>
                <span className="text-[11px] font-mono text-slate-400">Fits Page 1 of 2 (A4 Portrait)</span>
              </div>

              {/* Render Page 1 with page-break-after: always for print */}
              {renderPafPage('paf-page-break')}

              {/* Screen Visual Divider between Page 1 and Page 2 */}
              <div className="my-6 border-t-2 border-dashed border-slate-300 print:hidden flex items-center justify-center relative">
                <span className="bg-slate-100 text-slate-600 text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border border-slate-300 shadow-xs">
                  ▼ Next Page (Page 2 of 2) ▼
                </span>
              </div>

              {/* Screen Visual Header for Page 2 */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b pb-1 print:hidden">
                <span className="flex items-center gap-1.5 text-amber-700 font-extrabold uppercase">
                  <span>📜</span> Sheet 2 of 2: Sanction Order
                </span>
                <span className="text-[11px] font-mono text-slate-400">Fits Page 2 of 2 (A4 Portrait)</span>
              </div>

              {/* Render Page 2 with page-break-after: avoid for print */}
              {renderSanctionPage('paf-no-page-break')}
            </>
          )}

          {/* OPTION 2: Individual Page 1 Only */}
          {printFormat === 'PAF' && renderPafPage('paf-no-page-break')}

          {/* OPTION 3: Individual Page 2 Only */}
          {printFormat === 'SANCTION' && renderSanctionPage('paf-no-page-break')}

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
