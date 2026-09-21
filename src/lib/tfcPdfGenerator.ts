import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPKR } from './formatters';
import { ChallanFeeBreakdown } from '../data/tfcChallanData';

interface ReceiptsPdfOptions {
  mode: 'DATE_WISE' | 'MONTH_WISE';
  periodLabel: string;
  courseFilter: string;
  rows: Array<{
    key: string;
    label: string;
    challanCount: number;
    breakdown: ChallanFeeBreakdown;
  }>;
  grandTotal: ChallanFeeBreakdown;
  totalChallans: number;
}

export function generateReceiptsRegisterPdf(options: ReceiptsPdfOptions): void {
  const { mode, periodLabel, courseFilter, rows, grandTotal, totalChallans } = options;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 76, 60); // Official Dark Emerald
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN, SAMANABAD FAISALABAD',
    pageWidth / 2,
    8,
    { align: 'center' }
  );

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'TEVTA FEE COLLECTION (TFC) BANK ACCOUNT # 6580027832200011 (BANK OF PUNJAB)',
    pageWidth / 2,
    14,
    { align: 'center' }
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const titleText =
    mode === 'DATE_WISE'
      ? 'DATE WISE RECEIPTS & HEAD-WISE ALLOCATION REGISTER'
      : 'MONTH WISE RECEIPTS & HEAD-WISE ALLOCATION REGISTER';
  doc.text(titleText, pageWidth / 2, 19, { align: 'center' });

  // Metadata ribbon
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Filter / Period: ${periodLabel}`, 10, 27);
  doc.text(`Course: ${courseFilter}`, 85, 27);
  doc.text(`Total Paid Challans: ${totalChallans} (${rows.length} ${mode === 'DATE_WISE' ? 'Days' : 'Months'})`, 155, 27);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`, pageWidth - 10, 27, { align: 'right' });

  // Summary KPI block
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(10, 30, pageWidth - 20, 11, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  const kpis = [
    { label: 'TOTAL INFLOW', value: `Rs. ${formatPKR(grandTotal.totalAmountReceived, false)}` },
    { label: 'TEVTA DUES (HO)', value: `Rs. ${formatPKR(grandTotal.totalTevtaDues, false)}` },
    { label: 'INSTITUTE SHARE', value: `Rs. ${formatPKR(grandTotal.instituteShare, false)}` },
    { label: 'BOARD CHARGES', value: `Rs. ${formatPKR(grandTotal.boardCharges, false)}` },
    { label: 'COLLEGE SECURITY', value: `Rs. ${formatPKR(grandTotal.collegeSecurity, false)}` },
    { label: 'OTHER / TUV', value: `Rs. ${formatPKR(grandTotal.bankProfit, false)}` },
  ];

  const colWidth = (pageWidth - 24) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 12 + idx * colWidth;
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x, 34);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x, 39);
  });

  // Table Columns
  const tableHeaders = [
    [
      'Sr #',
      mode === 'DATE_WISE' ? 'Date of Receipt' : 'Month',
      'Adm / Reg\nFee',
      '25% Pupil\nFund',
      'Total TEVTA\n(HO Share)',
      '75% Pupil\nFund',
      'College\nSecurity',
      'Board / TTB\nCharges',
      'Short Course\nSelf Fin.',
      'Bank Profit\n/ Other',
      'Sub Total\n(Inst.)',
      'Total Received\nPer Day',
      'Institute\nShare',
    ],
  ];

  const tableBody = rows.map((r, idx) => [
    idx + 1,
    r.label,
    formatPKR(r.breakdown.admissionTuitionRegFee, false),
    formatPKR(r.breakdown.pupilFee25Percent, false),
    formatPKR(r.breakdown.totalTevtaDues, false),
    formatPKR(r.breakdown.pupilFee75Percent, false),
    formatPKR(r.breakdown.collegeSecurity, false),
    formatPKR(r.breakdown.boardCharges, false),
    r.breakdown.shortCourseSelfFinance === 0 ? '-' : formatPKR(r.breakdown.shortCourseSelfFinance, false),
    r.breakdown.bankProfit === 0 ? '-' : formatPKR(r.breakdown.bankProfit, false),
    formatPKR(r.breakdown.subTotalInstituteShare, false),
    formatPKR(r.breakdown.totalAmountReceived, false),
    formatPKR(r.breakdown.instituteShare, false),
  ]);

  const tableFoot = [
    [
      'Total',
      `${rows.length} ${mode === 'DATE_WISE' ? 'Days' : 'Months'}`,
      formatPKR(grandTotal.admissionTuitionRegFee, false),
      formatPKR(grandTotal.pupilFee25Percent, false),
      formatPKR(grandTotal.totalTevtaDues, false),
      formatPKR(grandTotal.pupilFee75Percent, false),
      formatPKR(grandTotal.collegeSecurity, false),
      formatPKR(grandTotal.boardCharges, false),
      grandTotal.shortCourseSelfFinance === 0 ? '-' : formatPKR(grandTotal.shortCourseSelfFinance, false),
      grandTotal.bankProfit === 0 ? '-' : formatPKR(grandTotal.bankProfit, false),
      formatPKR(grandTotal.subTotalInstituteShare, false),
      formatPKR(grandTotal.totalAmountReceived, false),
      formatPKR(grandTotal.instituteShare, false),
    ],
  ];

  autoTable(doc, {
    startY: 43,
    head: tableHeaders,
    body: tableBody,
    foot: tableFoot,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [16, 85, 68], // Emerald Header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'right',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 }, // Sr
      1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' }, // Date
      2: { halign: 'right', cellWidth: 19 }, // Adm
      3: { halign: 'right', cellWidth: 18 }, // 25% PF
      4: { halign: 'right', cellWidth: 21, fontStyle: 'bold', fillColor: [241, 245, 249] }, // TEVTA
      5: { halign: 'right', cellWidth: 19 }, // 75% PF
      6: { halign: 'right', cellWidth: 19 }, // Security
      7: { halign: 'right', cellWidth: 20 }, // Board
      8: { halign: 'right', cellWidth: 19 }, // Short Course
      9: { halign: 'right', cellWidth: 18 }, // Bank Profit
      10: { halign: 'right', cellWidth: 21, fontStyle: 'bold', fillColor: [241, 245, 249] }, // Sub Total
      11: { halign: 'right', cellWidth: 24, fontStyle: 'bold', fillColor: [224, 242, 254] }, // Total Day (Cyan highlight)
      12: { halign: 'right', cellWidth: 22, fontStyle: 'bold', fillColor: [238, 242, 255] }, // Inst Share
    },
    margin: { left: 10, right: 10, bottom: 20 },
    didDrawPage: (data) => {
      // Footer page count
      const pageCount = doc.internal.pages.length - 1;
      const currentPage = data.pageNumber;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Govt. Vocational Training Institute for Women, Samanabad Faisalabad — Official TFC Portal — Page ${currentPage} of ${pageCount}`,
        10,
        doc.internal.pageSize.getHeight() - 6
      );
      doc.text(
        `Strictly for Institutional Audit & TEVTA Financial Reconciliation`,
        pageWidth - 10,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'right' }
      );
    },
  });

  // Signature section on the last page
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 170;
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = finalY + 18 > pageHeight - 20 ? pageHeight - 16 : Math.max(finalY + 12, pageHeight - 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  // 3 signatures
  const sig1X = 45;
  const sig2X = pageWidth / 2;
  const sig3X = pageWidth - 45;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('KASHIF ZIA', sig1X, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Accountant / Prepared by:', sig1X, signY + 4, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ANEEBA JAMIL', sig2X, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('CO-Signatory / Checked by:', sig2X, signY + 4, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SHAZIA KHADIM', sig3X, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Acting Principal / DDO / Approved by:', sig3X, signY + 4, { align: 'center' });

  const cleanFilename = `GVTIW_TFC_${mode === 'DATE_WISE' ? 'Date_Wise_Receipts' : 'Month_Wise_Receipts'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(cleanFilename);
}

interface HardCashBookPdfOptions {
  periodLabel: string;
  totalChallans: number;
  dateGroups: Array<{
    dateKey: string;
    paymentDate: string;
    rows: Array<{
      challanId: string;
      cnic: string;
      name: string;
      trade: string;
      paymentType: string;
      admissionTuition: number;
      pupil25: number;
      pupil75: number;
      security: number;
      otherFee: number;
      tfcCredited: number;
      totalAmount: number;
      headOfficeTotal: number;
      instituteTotal: number;
      paymentDate: string;
    }>;
    subtotal: {
      admissionTuition: number;
      pupil25: number;
      pupil75: number;
      security: number;
      otherFee: number;
      tfcCredited: number;
      totalAmount: number;
      headOfficeTotal: number;
      instituteTotal: number;
      count: number;
    };
  }>;
  grandTotal: {
    admissionTuition: number;
    pupil25: number;
    pupil75: number;
    security: number;
    otherFee: number;
    tfcCredited: number;
    totalAmount: number;
    headOfficeTotal: number;
    instituteTotal: number;
  };
}

export function generateHardCashBookPdf(options: HardCashBookPdfOptions): void {
  const { periodLabel, totalChallans, dateGroups, grandTotal } = options;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner - Warm Amber / Terracotta
  doc.setFillColor(198, 89, 17); // Orange #C65911
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'GOVT. VOCATIONAL TRAINING INSTITUTE FOR WOMEN, SAMANABAD FAISALABAD',
    pageWidth / 2,
    8,
    { align: 'center' }
  );

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'TFC HARD CASHBOOK ENTRY REGISTER — OFFICIAL LEDGER RECONCILIATION',
    pageWidth / 2,
    14,
    { align: 'center' }
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'BOP TFC ACCOUNT # 6580027832200011 (GROUPED BY DATE & SORTED BY TRADE)',
    pageWidth / 2,
    19,
    { align: 'center' }
  );

  // Metadata ribbon
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${periodLabel}`, 10, 27);
  doc.text(`Total Challans: ${totalChallans} across ${dateGroups.length} Dates`, 100, 27);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`, pageWidth - 10, 27, { align: 'right' });

  // Summary KPI block
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.roundedRect(10, 30, pageWidth - 20, 11, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');

  const kpis = [
    { label: 'TOTAL GROSS (COL P)', value: `Rs. ${formatPKR(grandTotal.totalAmount, false)}` },
    { label: 'HEAD OFFICE TOTAL (COL Q)', value: `Rs. ${formatPKR(grandTotal.headOfficeTotal, false)}` },
    { label: 'INSTITUTE TOTAL (COL R)', value: `Rs. ${formatPKR(grandTotal.instituteTotal, false)}` },
    { label: 'TFC CREDITED (=+N+M+L)', value: `Rs. ${formatPKR(grandTotal.tfcCredited, false)}` },
  ];

  const colWidth = (pageWidth - 24) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * colWidth;
    doc.setTextColor(146, 64, 14);
    doc.text(kpi.label, x, 34);
    doc.setTextColor(120, 53, 15);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x, 39);
  });

  // Table Headers
  const tableHeaders = [
    [
      'Challan Payment\nDate',
      'Challan ID',
      'CNIC',
      'Name & Roll Code',
      'Trade',
      'Payment\nType',
      'Adm / Reg\nFee',
      '25%\nPupil Fee',
      '75%\nPupil Fee',
      'Institute\nSecurity',
      'Other\nFee',
      'TFC\nCredited',
      'Total\nAmount',
      'Head Office\nTotal',
      'Institute\nTotal',
    ],
  ];

  const tableBody: any[] = [];

  dateGroups.forEach((group) => {
    // Challan rows
    group.rows.forEach((r) => {
      tableBody.push([
        r.paymentDate,
        r.challanId,
        r.cnic,
        r.name,
        r.trade,
        r.paymentType,
        formatPKR(r.admissionTuition, false),
        formatPKR(r.pupil25, false),
        formatPKR(r.pupil75, false),
        formatPKR(r.security, false),
        r.otherFee === 0 ? '-' : formatPKR(r.otherFee, false),
        formatPKR(r.tfcCredited, false),
        formatPKR(r.totalAmount, false),
        formatPKR(r.headOfficeTotal, false),
        formatPKR(r.instituteTotal, false),
      ]);
    });

    // Subtotal row for this date
    tableBody.push([
      {
        content: `${group.paymentDate} Total (${group.subtotal.count} Challan${group.subtotal.count > 1 ? 's' : ''})`,
        colSpan: 6,
        styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number], textColor: [15, 23, 42] as [number, number, number], halign: 'left' as const },
      },
      { content: formatPKR(group.subtotal.admissionTuition, false), styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      { content: formatPKR(group.subtotal.pupil25, false), styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      { content: formatPKR(group.subtotal.pupil75, false), styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      { content: formatPKR(group.subtotal.security, false), styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      { content: group.subtotal.otherFee === 0 ? '-' : formatPKR(group.subtotal.otherFee, false), styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      { content: formatPKR(group.subtotal.tfcCredited, false), styles: { fontStyle: 'bold' as const, fillColor: [254, 243, 199] as [number, number, number], textColor: [146, 64, 14] as [number, number, number] } },
      { content: formatPKR(group.subtotal.totalAmount, false), styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      { content: formatPKR(group.subtotal.headOfficeTotal, false), styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number], textColor: [29, 78, 216] as [number, number, number] } },
      { content: formatPKR(group.subtotal.instituteTotal, false), styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number], textColor: [126, 34, 206] as [number, number, number] } },
    ]);
  });

  const tableFoot = [
    [
      {
        content: `Grand Total (${totalChallans} Challans)`,
        colSpan: 6,
        styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], halign: 'left' as const },
      },
      { content: formatPKR(grandTotal.admissionTuition, false), styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] } },
      { content: formatPKR(grandTotal.pupil25, false), styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] } },
      { content: formatPKR(grandTotal.pupil75, false), styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] } },
      { content: formatPKR(grandTotal.security, false), styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] } },
      { content: grandTotal.otherFee === 0 ? '-' : formatPKR(grandTotal.otherFee, false), styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] } },
      { content: formatPKR(grandTotal.tfcCredited, false), styles: { fontStyle: 'bold' as const, fillColor: [161, 62, 0] as [number, number, number], textColor: [254, 240, 138] as [number, number, number] } },
      { content: formatPKR(grandTotal.totalAmount, false), styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] } },
      { content: formatPKR(grandTotal.headOfficeTotal, false), styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [191, 219, 254] as [number, number, number] } },
      { content: formatPKR(grandTotal.instituteTotal, false), styles: { fontStyle: 'bold' as const, fillColor: [198, 89, 17] as [number, number, number], textColor: [233, 213, 255] as [number, number, number] } },
    ],
  ];

  autoTable(doc, {
    startY: 43,
    head: tableHeaders,
    body: tableBody,
    foot: tableFoot,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 1.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [237, 125, 49], // Amber-Orange #ED7D31
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 7,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 }, // Date
      1: { halign: 'center', cellWidth: 15, fontStyle: 'bold' }, // ChallanID
      2: { halign: 'center', cellWidth: 21 }, // CNIC
      3: { halign: 'left', cellWidth: 35 }, // Name
      4: { halign: 'center', cellWidth: 12, fontStyle: 'bold' }, // Trade
      5: { halign: 'center', cellWidth: 14 }, // PaymentType
      6: { halign: 'right', cellWidth: 16 }, // Adm
      7: { halign: 'right', cellWidth: 14 }, // 25%
      8: { halign: 'right', cellWidth: 14 }, // 75%
      9: { halign: 'right', cellWidth: 14 }, // Security
      10: { halign: 'right', cellWidth: 14 }, // Other
      11: { halign: 'right', cellWidth: 17, fontStyle: 'bold', fillColor: [254, 249, 195] }, // TFC Credited
      12: { halign: 'right', cellWidth: 17, fontStyle: 'bold' }, // Total
      13: { halign: 'right', cellWidth: 16, fontStyle: 'bold' }, // HO
      14: { halign: 'right', cellWidth: 16, fontStyle: 'bold' }, // Inst
    },
    margin: { left: 8, right: 8, bottom: 20 },
    didDrawPage: (data) => {
      const pageCount = doc.internal.pages.length - 1;
      const currentPage = data.pageNumber;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Govt. Vocational Training Institute for Women, Samanabad Faisalabad — TFC Hard CashBook Register — Page ${currentPage} of ${pageCount}`,
        8,
        doc.internal.pageSize.getHeight() - 6
      );
      doc.text(
        `Reconciled against BOP Portal & Official Hard CashBook Ledger`,
        pageWidth - 8,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'right' }
      );
    },
  });

  // Signature section
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 170;
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = finalY + 18 > pageHeight - 20 ? pageHeight - 16 : Math.max(finalY + 12, pageHeight - 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  const sig1X = 45;
  const sig2X = pageWidth / 2;
  const sig3X = pageWidth - 45;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('KASHIF ZIA', sig1X, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Accountant / Prepared by:', sig1X, signY + 4, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ANEEBA JAMIL', sig2X, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('CO-Signatory / Checked by:', sig2X, signY + 4, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SHAZIA KHADIM', sig3X, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Acting Principal / DDO / Approved by:', sig3X, signY + 4, { align: 'center' });

  const cleanFilename = `GVTIW_TFC_Hard_CashBook_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(cleanFilename);
}
