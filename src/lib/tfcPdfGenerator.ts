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

  // Two-pass Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Govt. Vocational Training Institute for Women, Samanabad Faisalabad — Official TFC Portal`,
      10,
      pageHeight - 6
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 10,
      pageHeight - 6,
      { align: 'right' }
    );
  }

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

  // Two-pass Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Govt. Vocational Training Institute for Women, Samanabad Faisalabad — TFC Hard CashBook Register`,
      8,
      pageHeight - 6
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 8,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  const cleanFilename = `GVTIW_TFC_Hard_CashBook_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(cleanFilename);
}

export interface FeeRegisterPdfRow {
  srNo: number;
  dateStr: string;
  challanId: string;
  rollNo: string;
  traineeName: string;
  cnic?: string;
  fatherName: string;
  // Optional installment columns for dedicated installment report
  inst1Info?: string;
  inst2Info?: string;
  inst3Info?: string;
  inst1Amount?: number;
  inst2Amount?: number;
  inst3Amount?: number;
  admissionTuition: number;
  pupil25: number;
  tevtaDues?: number;
  welfare75: number;
  sports: number;
  magazine: number;
  medical: number;
  library: number;
  security: number;
  boardOther: number;
  instSubtotal?: number;
  totalAmount: number;
  remarks: string;
}

export interface FeeRegisterTradeGroupPdf {
  tradeCode: string;
  tradeTitle: string;
  traineeCount: number;
  inst1Total?: number;
  inst2Total?: number;
  inst3Total?: number;
  rows: FeeRegisterPdfRow[];
  subtotal: {
    admissionTuition: number;
    pupil25: number;
    tevtaDues?: number;
    welfare75: number;
    sports: number;
    magazine: number;
    medical: number;
    library: number;
    security: number;
    boardOther: number;
    totalAmount: number;
  };
}

export interface FeeRegisterPdfOptions {
  periodLabel: string;
  tradeFilterLabel: string;
  totalTrainees: number;
  reportTitle?: string;
  isInstallmentAligned?: boolean;
  printDirectly?: boolean;
  tradeGroups: FeeRegisterTradeGroupPdf[];
  grandTotal: {
    admissionTuition: number;
    pupil25: number;
    tevtaDues?: number;
    welfare75: number;
    sports: number;
    magazine: number;
    medical: number;
    library: number;
    security: number;
    boardOther: number;
    instSubtotal?: number;
    totalAmount: number;
    inst1Total?: number;
    inst2Total?: number;
    inst3Total?: number;
  };
}

export function generateFeeRegisterPdf(options: FeeRegisterPdfOptions): void {
  const {
    periodLabel,
    tradeFilterLabel,
    totalTrainees,
    tradeGroups,
    grandTotal,
    isInstallmentAligned = false,
    reportTitle,
    printDirectly = false,
  } = options;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Official Header Banner
  doc.setFillColor(15, 76, 60); // TEVTA Dark Emerald
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

  const mainTitle =
    reportTitle ||
    (isInstallmentAligned
      ? 'OFFICIAL FEE REGISTER — INSTALLMENT-ALIGNED TRAINEE HEADCOUNT'
      : 'OFFICIAL FEE REGISTER & HEAD-WISE TRAINEE ALLOCATION (GROUPED BY TRADE & SORTED BY DATE)');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(mainTitle, pageWidth / 2, 19, { align: 'center' });

  // 2. Metadata Ribbon
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period / Filter: ${periodLabel}`, 6, 26);
  doc.text(`Trade Filter: ${tradeFilterLabel}`, 88, 26);
  const countLabel = isInstallmentAligned
    ? `Unique Students: ${totalTrainees} (${tradeGroups.length} Trades)`
    : `Total Trainees: ${totalTrainees} (${tradeGroups.length} Trades)`;
  doc.text(countLabel, 175, 26);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`,
    pageWidth - 6,
    26,
    { align: 'right' }
  );

  // 3. Summary KPI Block
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(6, 29, pageWidth - 12, 11, 1.5, 1.5, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');

  const tevtaDuesTotal = grandTotal.admissionTuition + grandTotal.pupil25;
  const kpis = [
    { label: 'TOTAL COLLECTION', value: `Rs. ${formatPKR(grandTotal.totalAmount, false)}` },
    { label: 'TEVTA DUES (HO)', value: `Rs. ${formatPKR(tevtaDuesTotal, false)}` },
    { label: 'WELFARE FUND (75% PF)', value: `Rs. ${formatPKR(grandTotal.welfare75, false)}` },
    { label: 'COLLEGE SECURITY', value: `Rs. ${formatPKR(grandTotal.security, false)}` },
    { label: 'BOARD / OTHER DUES', value: `Rs. ${formatPKR(grandTotal.boardOther, false)}` },
  ];

  const colW = (pageWidth - 12) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 8 + idx * colW;
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x, 33);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x, 38);
  });

  // 4. Two-Tier Table Headers
  const tableHeaders: any[] = isInstallmentAligned
    ? [
        [
          { content: 'TRAINEE PARTICULARS (COLS A TO D)', colSpan: 4, styles: { halign: 'center', fillColor: [15, 76, 60] } },
          { content: 'INSTALLMENT SUBMISSIONS (COLS E TO G)', colSpan: 3, styles: { halign: 'center', fillColor: [180, 83, 9] } },
          { content: 'TEVTA DUES (HO)', colSpan: 3, styles: { halign: 'center', fillColor: [30, 64, 175] } },
          { content: 'PUPIL WELFARE (75% PF) & INSTITUTIONAL ALLOCATION (COLS K TO Q)', colSpan: 8, styles: { halign: 'center', fillColor: [13, 148, 136] } },
          { content: 'TOTAL', colSpan: 1, styles: { halign: 'center', fillColor: [15, 76, 60] } },
          { content: 'STATUS', colSpan: 1, styles: { halign: 'center', fillColor: [71, 85, 105] } },
        ],
        [
          'Sr #\n(A)',
          'Roll #\n(B)',
          'Trainee Name & CNIC\n(C)',
          'Father Name\n(D)',
          '1st Installment\n(E)',
          '2nd Installment\n(F)',
          '3rd Installment\n(G)',
          'Adm/Tuition\n(H)',
          '25% PF\n(I)',
          'Subtotal\nTEVTA (H+I)',
          'Welfare\nFund (K)',
          'Stationary\nExam (L)',
          'Computer\nFund (M)',
          'M & E\nBreakage (N)',
          'Sports\nFund (O)',
          'Security\n(P)',
          'Board/Oth\n(Q)',
          'Subtotal\n(K:Q)',
          'Total PKR\n(R)',
          'Remarks / Status\n(S)',
        ],
      ]
    : [
        [
          { content: 'TRAINEE PARTICULARS (COLS A TO F)', colSpan: 6, styles: { halign: 'center', fillColor: [15, 76, 60] } },
          { content: 'TEVTA DUES (HO)', colSpan: 3, styles: { halign: 'center', fillColor: [30, 64, 175] } },
          { content: 'PUPIL WELFARE (75% PF) & INSTITUTIONAL ALLOCATION (COLS I TO O)', colSpan: 8, styles: { halign: 'center', fillColor: [13, 148, 136] } },
          { content: 'TOTAL', colSpan: 1, styles: { halign: 'center', fillColor: [15, 76, 60] } },
          { content: 'STATUS', colSpan: 1, styles: { halign: 'center', fillColor: [71, 85, 105] } },
        ],
        [
          'Sr #\n(A)',
          'Date\n(B)',
          'Challan #\n(C)',
          'Roll #\n(D)',
          'Trainee Name\n(E)',
          'Father Name\n(F)',
          'Adm/Tuition\n(G)',
          '25% PF\n(H)',
          'Subtotal\nTEVTA (G+H)',
          'Welfare\nFund (I)',
          'Stationary\nExam (J)',
          'Computer\nFund (K)',
          'M & E\nBreakage (L)',
          'Sports\nFund (M)',
          'Security\n(N)',
          'Board/Oth\n(O)',
          'Subtotal\n(I:O)',
          'Total PKR\n(P)',
          'Remarks\n(Q)',
        ],
      ];

  // 5. Table Body with Trade Sections and Subtotals
  const tableBody: any[] = [];

  tradeGroups.forEach((group) => {
    // Trade Header Section Banner
    const bannerLabel = isInstallmentAligned
      ? `TRADE: ${group.tradeTitle.toUpperCase()} (${group.tradeCode}) — ${group.traineeCount} UNIQUE ENROLLED STUDENTS`
      : `TRADE: ${group.tradeTitle.toUpperCase()} (${group.tradeCode}) — ${group.traineeCount} TRAINEES`;

    tableBody.push([
      {
        content: bannerLabel,
        colSpan: isInstallmentAligned ? 20 : 19,
        styles: {
          fillColor: [22, 101, 52] as [number, number, number],
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: 'bold',
          halign: 'left',
          fontSize: 7.5,
        },
      },
    ]);

    // Trainee Rows
    const isMV = group.tradeCode === 'MVi' || group.tradeCode === 'MVii';

    group.rows.forEach((r) => {
      const tevtaSub = r.tevtaDues ?? (r.admissionTuition + r.pupil25);
      const instSub = r.instSubtotal ?? (r.welfare75 + r.security + r.boardOther);

      if (isInstallmentAligned) {
        const inst1Text = isMV ? (r.inst1Info || (r.challanId ? `Ch# ${r.challanId}\nRs. ${formatPKR(r.inst1Amount ?? r.totalAmount, false)}` : '—')) : '—';
        const inst2Text = isMV ? (r.inst2Info || (r.inst2Amount && r.inst2Amount > 0 ? `Rs. ${formatPKR(r.inst2Amount, false)}` : (r.remarks?.includes('Installment') ? 'Awaiting 2nd' : '—'))) : '—';
        const inst3Text = isMV ? (r.inst3Info || (r.inst3Amount && r.inst3Amount > 0 ? `Rs. ${formatPKR(r.inst3Amount, false)}` : (r.remarks?.includes('3rd Installment Awaited') ? 'Awaiting 3rd' : '—'))) : '—';

        tableBody.push([
          r.srNo,
          r.rollNo,
          r.cnic ? `${r.traineeName.toUpperCase()}\nCNIC: ${r.cnic}` : r.traineeName.toUpperCase(),
          r.fatherName,
          inst1Text,
          inst2Text,
          inst3Text,
          formatPKR(r.admissionTuition, false),
          formatPKR(r.pupil25, false),
          formatPKR(tevtaSub, false),
          formatPKR(r.welfare75, false),
          '-',
          '-',
          '-',
          '-',
          formatPKR(r.security, false),
          r.boardOther === 0 ? '-' : formatPKR(r.boardOther, false),
          formatPKR(instSub, false),
          formatPKR(r.totalAmount, false),
          r.remarks || 'Full Prescribed Fee',
        ]);
      } else {
        tableBody.push([
          r.srNo,
          r.dateStr,
          r.challanId,
          r.rollNo,
          r.cnic ? `${r.traineeName.toUpperCase()}\nCNIC: ${r.cnic}` : r.traineeName.toUpperCase(),
          r.fatherName,
          formatPKR(r.admissionTuition, false),
          formatPKR(r.pupil25, false),
          formatPKR(tevtaSub, false),
          formatPKR(r.welfare75, false),
          '-',
          '-',
          '-',
          '-',
          formatPKR(r.security, false),
          r.boardOther === 0 ? '-' : formatPKR(r.boardOther, false),
          formatPKR(instSub, false),
          formatPKR(r.totalAmount, false),
          r.remarks || 'Full Prescribed Fee',
        ]);
      }
    });

    // Trade Subtotal Row
    const groupTevtaSub = group.subtotal.tevtaDues ?? (group.subtotal.admissionTuition + group.subtotal.pupil25);
    const groupInstSub = group.subtotal.welfare75 + group.subtotal.security + group.subtotal.boardOther;

    if (isInstallmentAligned) {
      tableBody.push([
        {
          content: `Subtotal (${group.tradeCode})`,
          colSpan: 4,
          styles: {
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [240, 253, 244] as [number, number, number],
            textColor: [22, 101, 52] as [number, number, number],
            fontSize: 7.0,
          },
        },
        {
          content: isMV && group.inst1Total ? formatPKR(group.inst1Total, false) : '—',
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [254, 243, 199] as [number, number, number], textColor: [180, 83, 9] as [number, number, number], fontSize: 6.5 },
        },
        {
          content: isMV && group.inst2Total ? formatPKR(group.inst2Total, false) : '—',
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [254, 243, 199] as [number, number, number], textColor: [180, 83, 9] as [number, number, number], fontSize: 6.5 },
        },
        {
          content: isMV && group.inst3Total ? formatPKR(group.inst3Total, false) : '—',
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [254, 243, 199] as [number, number, number], textColor: [180, 83, 9] as [number, number, number], fontSize: 6.5 },
        },
        {
          content: formatPKR(group.subtotal.admissionTuition, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        {
          content: formatPKR(group.subtotal.pupil25, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        {
          content: formatPKR(groupTevtaSub, false),
          styles: { fontStyle: 'bold', fontSize: 7.2, halign: 'right', fillColor: [224, 242, 254] as [number, number, number], textColor: [30, 64, 175] as [number, number, number] },
        },
        {
          content: formatPKR(group.subtotal.welfare75, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        { content: '-', styles: { halign: 'center', fillColor: [240, 253, 244] as [number, number, number] } },
        { content: '-', styles: { halign: 'center', fillColor: [240, 253, 244] as [number, number, number] } },
        { content: '-', styles: { halign: 'center', fillColor: [240, 253, 244] as [number, number, number] } },
        { content: '-', styles: { halign: 'center', fillColor: [240, 253, 244] as [number, number, number] } },
        {
          content: formatPKR(group.subtotal.security, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        {
          content: group.subtotal.boardOther === 0 ? '-' : formatPKR(group.subtotal.boardOther, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        {
          content: formatPKR(groupInstSub, false),
          styles: { fontStyle: 'bold', fontSize: 7.2, halign: 'right', fillColor: [204, 251, 241] as [number, number, number], textColor: [15, 118, 110] as [number, number, number] },
        },
        {
          content: formatPKR(group.subtotal.totalAmount, false),
          styles: { fontStyle: 'bold', fontSize: 7.5, halign: 'right', fillColor: [240, 253, 244] as [number, number, number], textColor: [22, 101, 52] as [number, number, number] },
        },
        {
          content: `${group.traineeCount} Trainees`,
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 253, 244] as [number, number, number] },
        },
      ]);
    } else {
      tableBody.push([
        {
          content: `Subtotal (${group.tradeCode})`,
          colSpan: 6,
          styles: {
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [240, 253, 244] as [number, number, number],
            textColor: [22, 101, 52] as [number, number, number],
            fontSize: 7.0,
          },
        },
        {
          content: formatPKR(group.subtotal.admissionTuition, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        {
          content: formatPKR(group.subtotal.pupil25, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        {
          content: formatPKR(groupTevtaSub, false),
          styles: { fontStyle: 'bold', fontSize: 7.2, halign: 'right', fillColor: [224, 242, 254] as [number, number, number], textColor: [30, 64, 175] as [number, number, number] },
        },
        {
          content: formatPKR(group.subtotal.welfare75, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        { content: '-', styles: { halign: 'center', fillColor: [240, 253, 244] as [number, number, number] } },
        { content: '-', styles: { halign: 'center', fillColor: [240, 253, 244] as [number, number, number] } },
        { content: '-', styles: { halign: 'center', fillColor: [240, 253, 244] as [number, number, number] } },
        { content: '-', styles: { halign: 'center', fillColor: [240, 253, 244] as [number, number, number] } },
        {
          content: formatPKR(group.subtotal.security, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        {
          content: group.subtotal.boardOther === 0 ? '-' : formatPKR(group.subtotal.boardOther, false),
          styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] as [number, number, number] },
        },
        {
          content: formatPKR(groupInstSub, false),
          styles: { fontStyle: 'bold', fontSize: 7.2, halign: 'right', fillColor: [204, 251, 241] as [number, number, number], textColor: [15, 118, 110] as [number, number, number] },
        },
        {
          content: formatPKR(group.subtotal.totalAmount, false),
          styles: { fontStyle: 'bold', fontSize: 7.5, halign: 'right', fillColor: [240, 253, 244] as [number, number, number], textColor: [22, 101, 52] as [number, number, number] },
        },
        {
          content: `${group.traineeCount} Trainees`,
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 253, 244] as [number, number, number] },
        },
      ]);
    }
  });

  // 6. Grand Total Footer Row
  const grandTevtaSub = grandTotal.tevtaDues ?? (grandTotal.admissionTuition + grandTotal.pupil25);
  const grandInstSub = grandTotal.welfare75 + grandTotal.security + grandTotal.boardOther;

  const tableFoot: any[] = isInstallmentAligned
    ? [
        [
          {
            content: `GRAND TOTAL (${totalTrainees} Unique Trainees across ${tradeGroups.length} Trades)`,
            colSpan: 4,
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
              fontSize: 7.5,
            },
          },
          {
            content: grandTotal.inst1Total ? formatPKR(grandTotal.inst1Total, false) : '—',
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [22, 101, 52] as [number, number, number], textColor: [254, 243, 199] as [number, number, number], fontSize: 6.8 },
          },
          {
            content: grandTotal.inst2Total ? formatPKR(grandTotal.inst2Total, false) : '—',
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [22, 101, 52] as [number, number, number], textColor: [254, 243, 199] as [number, number, number], fontSize: 6.8 },
          },
          {
            content: grandTotal.inst3Total ? formatPKR(grandTotal.inst3Total, false) : '—',
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [22, 101, 52] as [number, number, number], textColor: [254, 243, 199] as [number, number, number], fontSize: 6.8 },
          },
          {
            content: formatPKR(grandTotal.admissionTuition, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
              fontSize: 7.2,
            },
          },
          {
            content: formatPKR(grandTotal.pupil25, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
              fontSize: 7.2,
            },
          },
          {
            content: formatPKR(grandTevtaSub, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [30, 64, 175] as [number, number, number],
              textColor: [254, 240, 138] as [number, number, number],
              fontSize: 7.8,
            },
          },
          {
            content: formatPKR(grandTotal.welfare75, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [254, 240, 138] as [number, number, number],
              fontSize: 7.2,
            },
          },
          { content: '-', styles: { halign: 'center', fillColor: [15, 76, 60] as [number, number, number], textColor: [203, 213, 225] as [number, number, number] } },
          { content: '-', styles: { halign: 'center', fillColor: [15, 76, 60] as [number, number, number], textColor: [203, 213, 225] as [number, number, number] } },
          { content: '-', styles: { halign: 'center', fillColor: [15, 76, 60] as [number, number, number], textColor: [203, 213, 225] as [number, number, number] } },
          { content: '-', styles: { halign: 'center', fillColor: [15, 76, 60] as [number, number, number], textColor: [203, 213, 225] as [number, number, number] } },
          {
            content: formatPKR(grandTotal.security, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
              fontSize: 7.2,
            },
          },
          {
            content: grandTotal.boardOther === 0 ? '-' : formatPKR(grandTotal.boardOther, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
              fontSize: 7.2,
            },
          },
          {
            content: formatPKR(grandInstSub, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [13, 148, 136] as [number, number, number],
              textColor: [254, 240, 138] as [number, number, number],
              fontSize: 7.8,
            },
          },
          {
            content: formatPKR(grandTotal.totalAmount, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [254, 240, 138] as [number, number, number],
              fontSize: 8.5,
            },
          },
          {
            content: 'RECONCILED',
            styles: {
              fontStyle: 'bold',
              halign: 'center',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [167, 243, 208] as [number, number, number],
              fontSize: 7.0,
            },
          },
        ],
      ]
    : [
        [
          {
            content: `GRAND TOTAL (${totalTrainees} Trainees across ${tradeGroups.length} Trades)`,
            colSpan: 6,
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
              fontSize: 7.5,
            },
          },
          {
            content: formatPKR(grandTotal.admissionTuition, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
            },
          },
          {
            content: formatPKR(grandTotal.pupil25, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
            },
          },
          {
            content: formatPKR(grandTevtaSub, false),
            styles: {
              fontStyle: 'bold',
              fontSize: 7.5,
              halign: 'right',
              fillColor: [30, 64, 175] as [number, number, number],
              textColor: [254, 240, 138] as [number, number, number],
            },
          },
          {
            content: formatPKR(grandTotal.welfare75, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [254, 240, 138] as [number, number, number],
            },
          },
          {
            content: '-',
            styles: {
              halign: 'center',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [203, 213, 225] as [number, number, number],
            },
          },
          {
            content: '-',
            styles: {
              halign: 'center',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [203, 213, 225] as [number, number, number],
            },
          },
          {
            content: '-',
            styles: {
              halign: 'center',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [203, 213, 225] as [number, number, number],
            },
          },
          {
            content: '-',
            styles: {
              halign: 'center',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [203, 213, 225] as [number, number, number],
            },
          },
          {
            content: formatPKR(grandTotal.security, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
            },
          },
          {
            content: grandTotal.boardOther === 0 ? '-' : formatPKR(grandTotal.boardOther, false),
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number],
            },
          },
          {
            content: formatPKR(grandInstSub, false),
            styles: {
              fontStyle: 'bold',
              fontSize: 7.5,
              halign: 'right',
              fillColor: [13, 148, 136] as [number, number, number],
              textColor: [254, 240, 138] as [number, number, number],
            },
          },
          {
            content: formatPKR(grandTotal.totalAmount, false),
            styles: {
              fontStyle: 'bold',
              fontSize: 8.0,
              halign: 'right',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [254, 240, 138] as [number, number, number],
            },
          },
          {
            content: 'RECONCILED',
            styles: {
              fontStyle: 'bold',
              halign: 'center',
              fillColor: [15, 76, 60] as [number, number, number],
              textColor: [167, 243, 208] as [number, number, number],
            },
          },
        ],
      ];

  const nameColIndex = isInstallmentAligned ? 2 : 4;

  const columnStyles: any = isInstallmentAligned
    ? {
        0: { halign: 'center', cellWidth: 6 }, // Sr # (A)
        1: { halign: 'center', cellWidth: 14, fontStyle: 'bold' }, // Roll # (B)
        2: { halign: 'left', cellWidth: 30, fontStyle: 'bold', fontSize: 7.0, textColor: [15, 23, 42] }, // Trainee Name & CNIC (C)
        3: { halign: 'left', cellWidth: 19, fontSize: 6.2 }, // Father Name (D)
        4: { halign: 'center', cellWidth: 15, fontSize: 5.6 }, // 1st Installment (E)
        5: { halign: 'center', cellWidth: 15, fontSize: 5.6 }, // 2nd Installment (F)
        6: { halign: 'center', cellWidth: 15, fontSize: 5.6 }, // 3rd Installment (G)
        7: { halign: 'right', cellWidth: 12.5 }, // Adm/Tuition (H)
        8: { halign: 'right', cellWidth: 10 }, // 25% PF (I)
        9: { halign: 'right', cellWidth: 15.5, fontStyle: 'bold', fontSize: 7.0, textColor: [30, 64, 175] }, // Subtotal TEVTA (H+I)
        10: { halign: 'right', cellWidth: 12.5 }, // Welfare Fund (K)
        11: { halign: 'center', cellWidth: 8.5, textColor: [148, 163, 184] }, // Stationary / Exam (L)
        12: { halign: 'center', cellWidth: 8.5, textColor: [148, 163, 184] }, // Computer Fund (M)
        13: { halign: 'center', cellWidth: 8.5, textColor: [148, 163, 184] }, // M & E Breakage (N)
        14: { halign: 'center', cellWidth: 8.5, textColor: [148, 163, 184] }, // Sports Fund (O)
        15: { halign: 'right', cellWidth: 11 }, // Security (P)
        16: { halign: 'right', cellWidth: 11.5 }, // Board/Other (Q)
        17: { halign: 'right', cellWidth: 15.5, fontStyle: 'bold', fontSize: 7.0, textColor: [15, 118, 110] }, // Subtotal (K:Q)
        18: { halign: 'right', cellWidth: 17.5, fontStyle: 'bold', fontSize: 7.2, textColor: [6, 95, 70] }, // Total PKR (R)
        19: { halign: 'center', cellWidth: 20.5 }, // Remarks (S)
      }
    : {
        0: { halign: 'center', cellWidth: 6 }, // Sr # (A)
        1: { halign: 'center', cellWidth: 13.5 }, // Date (B)
        2: { halign: 'center', cellWidth: 12.5, fontStyle: 'bold' }, // Challan # (C)
        3: { halign: 'center', cellWidth: 15, fontStyle: 'bold' }, // Roll # (D)
        4: { halign: 'left', cellWidth: 35, fontStyle: 'bold', fontSize: 7.0, textColor: [15, 23, 42] }, // Trainee Name & CNIC (E)
        5: { halign: 'left', cellWidth: 24, fontSize: 6.2 }, // Father Name (F)
        6: { halign: 'right', cellWidth: 13 }, // Adm/Tuition (G)
        7: { halign: 'right', cellWidth: 10.5 }, // 25% PF (H)
        8: { halign: 'right', cellWidth: 17, fontStyle: 'bold', fontSize: 7.0, textColor: [30, 64, 175] }, // Subtotal TEVTA (G+H)
        9: { halign: 'right', cellWidth: 13 }, // Welfare Fund (I)
        10: { halign: 'center', cellWidth: 11, textColor: [148, 163, 184] }, // Stationary / Exam (J)
        11: { halign: 'center', cellWidth: 11, textColor: [148, 163, 184] }, // Computer Fund (K)
        12: { halign: 'center', cellWidth: 11, textColor: [148, 163, 184] }, // M & E Breakage (L)
        13: { halign: 'center', cellWidth: 11, textColor: [148, 163, 184] }, // Sports Fund (M)
        14: { halign: 'right', cellWidth: 11.5 }, // Security (N)
        15: { halign: 'right', cellWidth: 12.5 }, // Board/Other (O)
        16: { halign: 'right', cellWidth: 17, fontStyle: 'bold', fontSize: 7.0, textColor: [15, 118, 110] }, // Subtotal (I:O)
        17: { halign: 'right', cellWidth: 18.5, fontStyle: 'bold', fontSize: 7.2, textColor: [6, 95, 70] }, // Total PKR (P)
        18: { halign: 'center', cellWidth: 21 }, // Remarks (Q)
      };

  autoTable(doc, {
    startY: 42,
    head: tableHeaders,
    body: tableBody,
    foot: tableFoot,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: {
      fontSize: 6.2,
      cellPadding: { top: 1.2, bottom: 1.2, left: 1, right: 1 },
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [15, 76, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 6.0,
      cellPadding: { top: 1.5, bottom: 1.5, left: 0.8, right: 0.8 },
    },
    columnStyles,
    margin: { left: 6, right: 6, bottom: 16 },
    didParseCell: (data) => {
      // For Trainee Name column: capture text lines and keep spacing
      if (data.section === 'body' && data.column.index === nameColIndex) {
        (data.cell as any)._traineeLines = [...data.cell.text];
        data.cell.text = (data.cell as any)._traineeLines.map(() => ' ');
      }
      // Highlight & enlarge Subtotal TEVTA column (col 9 in installment mode, col 8 in regular mode)
      const tevtaColIdx = isInstallmentAligned ? 9 : 8;
      if (data.section === 'body' && data.column.index === tevtaColIdx) {
        data.cell.styles.fillColor = [239, 246, 255]; // Soft blue 50
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 7.0; // Same size as student name
        data.cell.styles.textColor = [30, 64, 175]; // Blue 800
      }
      // Highlight & enlarge Subtotal Inst column (col 17 in installment mode, col 16 in regular mode)
      const instColIdx = isInstallmentAligned ? 17 : 16;
      if (data.section === 'body' && data.column.index === instColIdx) {
        data.cell.styles.fillColor = [240, 253, 250]; // Soft teal 50
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 7.0; // Same size as student name
        data.cell.styles.textColor = [15, 118, 110]; // Teal 700
      }
      // Highlight & enlarge Total PKR column (col 18 in installment mode, col 17 in regular mode)
      const totalColIdx = isInstallmentAligned ? 18 : 17;
      if (data.section === 'body' && data.column.index === totalColIdx) {
        data.cell.styles.fillColor = [236, 253, 245]; // Soft emerald 50
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 7.2; // Extra readable
        data.cell.styles.textColor = [6, 95, 70]; // Emerald 800
      }
    },
    didDrawCell: (data) => {
      // Draw Student Name in BOLD CAPITAL LETTERS and CNIC in NORMAL (NOT BOLD) REGULAR font
      if (data.section === 'body' && data.column.index === nameColIndex && (data.cell as any)._traineeLines) {
        const lines: string[] = (data.cell as any)._traineeLines;
        const name = (lines[0] || '').toUpperCase();
        const cnicLine = lines[1] || '';
        const x = data.cell.x + data.cell.padding('left');
        const y = data.cell.y + data.cell.padding('top') + 2.8;

        // 1. Student Name in BOLD CAPITAL LETTERS
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.0);
        doc.setTextColor(15, 23, 42); // deep slate-950 high contrast
        doc.text(name, x, y);

        // 2. CNIC in NORMAL (NOT BOLD) REGULAR FONT
        if (cnicLine) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.6);
          doc.setTextColor(100, 116, 139); // clean slate grey
          doc.text(cnicLine, x, y + 3.2);
        }
      }
    },
  });

  // Official Signature Section
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 170;
  const pageHeight = doc.internal.pageSize.getHeight();
  let signY = finalY + 14;
  if (signY + 12 > pageHeight - 8) {
    doc.addPage();
    signY = 30;
  }

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

  // Two-pass Footer: Accurate "Page X of TotalPages" on every single page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // clean slate grey

    // Left side: Clean Report Name only
    doc.text(
      'Govt. Vocational Training Institute for Women, Samanabad Faisalabad — Official Fee Register',
      6,
      pageHeight - 6
    );

    // Right side: Accurate Current Page of Total Pages (e.g. Page 1 of 13)
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 6,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  if (printDirectly) {
    // Direct Print Mode: trigger browser print dialog on this exact official PDF report
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0.01';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Direct iframe PDF print failed, falling back to window.print()', err);
        window.print();
      }
    };

    iframe.onload = () => {
      setTimeout(triggerPrint, 350);
    };
    setTimeout(triggerPrint, 800);

    // Clean up
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(pdfUrl);
      } catch {}
    }, 60000);
  } else {
    const cleanFilename = `GVTIW_Official_Fee_Register_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(cleanFilename);
  }
}
