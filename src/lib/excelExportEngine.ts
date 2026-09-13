/**
 * GVTIW FINANCIAL MANAGEMENT SYSTEM — PROFESSIONAL EXCEL EXPORT ENGINE
 * Generates true Microsoft Excel (.xlsx) workbooks with live Excel formulas,
 * styled headers, currency number formatting, and automatic column widths.
 */

import ExcelJS from 'exceljs';

// Standard styling palettes
const COLORS = {
  NAVY_HEADER: '1E3A8A', // Deep institutional blue
  WHITE: 'FFFFFF',
  ICE_BLUE: 'E0F2FE', // Receipts header fill
  ICE_BLUE_TEXT: '0369A1',
  CREAM_AMBER: 'FEF3C7', // Payments header fill
  CREAM_AMBER_TEXT: '92400E',
  LIGHT_GRAY: 'F8FAFC',
  BORDER_GRAY: 'CBD5E1',
  TOTALS_BG: 'F1F5F9',
  TEXT_DARK: '0F172A',
  SUCCESS_GREEN: '166534',
  ALERT_RED: '991B1B',
};

const NUM_FORMAT_CURRENCY = '#,##0.00';
const NUM_FORMAT_PERCENT = '0.00%';
const NUM_FORMAT_INT = '#,##0';

/**
 * Triggers client-side download of the workbook as an .xlsx file
 */
export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Applies auto-fitted column widths based on content length
 */
function autoFitColumns(worksheet: ExcelJS.Worksheet, minWidth = 12, maxWidth = 45): void {
  worksheet.columns.forEach((col) => {
    let maxLen = 0;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      // Don't size based on merged title rows (length > 60 usually indicates full title banners)
      const val = cell.value ? String(cell.value) : '';
      if (val.length < 70 && !cell.isMerged) {
        maxLen = Math.max(maxLen, val.length);
      }
    });
    col.width = Math.min(Math.max(maxLen + 3, minWidth), maxWidth);
  });
}

// ============================================================================
// 1. BANK RECONCILIATION STATEMENT & NS OWN WORKING REPORT (.xlsx)
// ============================================================================
export interface ReconRowExportItem {
  monthShortLabel: string;
  receiptDesc: string;
  directReceipts: number;
  cmsdiNavttcShortCourse: number;
  otherReceiptsProfit: number;
  fromOtherBankAccount: number;
  totalReceipt: number;
  paymentDesc: string;
  directPayments: number;
  otherPaymentsBankCharges: number;
  directPaymentsCMSDI: number;
  totalPayment: number;
}

export interface UnpresentedChequeExportItem {
  chequeNo: string;
  date: string;
  paidTo?: string;
  accountHead?: string;
  amount: number;
  description: string;
}

export interface ReconExportParams {
  instituteName: string;
  districtName: string;
  activeAccountName: string;
  bankName: string;
  accountNo: string;
  asOnDate: string;
  openingBalance: number;
  periodOpeningLabel: string;
  rows: ReconRowExportItem[];
  bankStatementBalance: number;
  manualCheques: UnpresentedChequeExportItem[];
  filename: string;
}

export async function exportReconciliationExcel(p: ReconExportParams): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GVTIW Management System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Reconciliation & Own Working', {
    views: [{ showGridLines: true }],
  });

  // 1. Title Banner
  ws.mergeCells('A1:L1');
  const titleCell = ws.getCell('A1');
  titleCell.value = p.instituteName.toUpperCase();
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:L2');
  const subTitle = ws.getCell('A2');
  subTitle.value = `ACCOUNTING DATA ENTRY — OFFICIAL BANK RECONCILIATION STATEMENT & MONTHLY BREAKDOWN`;
  subTitle.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.WHITE } };
  subTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  subTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  // Metadata block
  const metaRows = [
    [`DISTRICT: ${p.districtName}`, `HEAD: ${p.activeAccountName}`],
    [`BANK: ${p.bankName} (A/C: ${p.accountNo})`, `AS ON DATE: ${p.asOnDate}`],
  ];

  metaRows.forEach((rowVals, i) => {
    const rowNum = 3 + i;
    ws.mergeCells(`A${rowNum}:F${rowNum}`);
    ws.mergeCells(`G${rowNum}:L${rowNum}`);
    const c1 = ws.getCell(`A${rowNum}`);
    const c2 = ws.getCell(`G${rowNum}`);
    c1.value = rowVals[0];
    c2.value = rowVals[1];
    c1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLORS.TEXT_DARK } };
    c2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLORS.TEXT_DARK } };
    c1.alignment = { horizontal: 'left', vertical: 'middle' };
    c2.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(rowNum).height = 18;
  });

  // Blank row
  ws.addRow([]);

  // Opening Balance Row
  const opRowIndex = 6;
  ws.mergeCells(`A${opRowIndex}:B${opRowIndex}`);
  ws.getCell(`A${opRowIndex}`).value = p.periodOpeningLabel.toUpperCase();
  ws.getCell(`A${opRowIndex}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.NAVY_HEADER } };
  ws.getCell(`C${opRowIndex}`).value = p.openingBalance;
  ws.getCell(`C${opRowIndex}`).numFmt = NUM_FORMAT_CURRENCY;
  ws.getCell(`C${opRowIndex}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.NAVY_HEADER } };
  ws.getRow(opRowIndex).height = 20;

  // 2. Dual Group Headers (Row 8 & Row 9)
  const groupHeaderRow = 8;
  ws.mergeCells(`A${groupHeaderRow}:G${groupHeaderRow}`);
  const rGroup = ws.getCell(`A${groupHeaderRow}`);
  rGroup.value = 'RECEIPTS (INFLOWS)';
  rGroup.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: COLORS.ICE_BLUE_TEXT } };
  rGroup.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ICE_BLUE } };
  rGroup.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`H${groupHeaderRow}:L${groupHeaderRow}`);
  const pGroup = ws.getCell(`H${groupHeaderRow}`);
  pGroup.value = 'PAYMENTS (EXPENDITURES / CHARGES)';
  pGroup.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: COLORS.CREAM_AMBER_TEXT } };
  pGroup.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.CREAM_AMBER } };
  pGroup.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(groupHeaderRow).height = 22;

  // Specific Columns (Row 9)
  const colHeaders = [
    'Month',
    'Receipt Description',
    'Direct Receipts (Budget)',
    'CMSDI / Short Course',
    'Other / Bank Profit',
    'From Other Bank A/C',
    'Total Receipts (Rs.)',
    'Payment Description',
    'Direct Payments',
    'Other / Bank Charges',
    'Direct CMSDI / NAVTTC',
    'Total Payments (Rs.)',
  ];

  const colHeaderRow = ws.getRow(9);
  colHeaders.forEach((h, idx) => {
    const cell = colHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  colHeaderRow.height = 28;

  // 3. Populate Monthly Rows (Rows 10 onwards)
  let startDataRow = 10;
  p.rows.forEach((r, idx) => {
    const currRow = startDataRow + idx;
    const row = ws.getRow(currRow);

    row.getCell(1).value = r.monthShortLabel;
    row.getCell(2).value = r.receiptDesc;
    row.getCell(3).value = r.directReceipts;
    row.getCell(4).value = r.cmsdiNavttcShortCourse;
    row.getCell(5).value = r.otherReceiptsProfit;
    row.getCell(6).value = r.fromOtherBankAccount;
    // Live formula for Total Receipts: C + D + E + F
    row.getCell(7).value = { formula: `SUM(C${currRow}:F${currRow})`, result: r.totalReceipt };

    row.getCell(8).value = r.paymentDesc;
    row.getCell(9).value = r.directPayments;
    row.getCell(10).value = r.otherPaymentsBankCharges;
    row.getCell(11).value = r.directPaymentsCMSDI;
    // Live formula for Total Payments: I + J + K
    row.getCell(12).value = { formula: `SUM(I${currRow}:K${currRow})`, result: r.totalPayment };

    // Formats & alignments
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };

    [3, 4, 5, 6, 7, 9, 10, 11, 12].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      cell.numFmt = NUM_FORMAT_CURRENCY;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    // Emphasize Total Receipts & Payments
    row.getCell(7).font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.ICE_BLUE_TEXT } };
    row.getCell(12).font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.CREAM_AMBER_TEXT } };

    // Subtle border
    for (let c = 1; c <= 12; c++) {
      row.getCell(c).border = {
        top: { style: 'hair' },
        left: { style: 'thin' },
        bottom: { style: 'hair' },
        right: { style: 'thin' },
      };
    }
  });

  const endDataRow = startDataRow + p.rows.length - 1;
  const grandTotalRowIndex = endDataRow + 1;
  const grandTotalRow = ws.getRow(grandTotalRowIndex);

  grandTotalRow.getCell(1).value = 'GRAND TOTALS';
  grandTotalRow.getCell(2).value = '';
  // Formulas for column totals
  grandTotalRow.getCell(3).value = { formula: `SUM(C${startDataRow}:C${endDataRow})` };
  grandTotalRow.getCell(4).value = { formula: `SUM(D${startDataRow}:D${endDataRow})` };
  grandTotalRow.getCell(5).value = { formula: `SUM(E${startDataRow}:E${endDataRow})` };
  grandTotalRow.getCell(6).value = { formula: `SUM(F${startDataRow}:F${endDataRow})` };
  grandTotalRow.getCell(7).value = { formula: `SUM(G${startDataRow}:G${endDataRow})` };

  grandTotalRow.getCell(8).value = '';
  grandTotalRow.getCell(9).value = { formula: `SUM(I${startDataRow}:I${endDataRow})` };
  grandTotalRow.getCell(10).value = { formula: `SUM(J${startDataRow}:J${endDataRow})` };
  grandTotalRow.getCell(11).value = { formula: `SUM(K${startDataRow}:K${endDataRow})` };
  grandTotalRow.getCell(12).value = { formula: `SUM(L${startDataRow}:L${endDataRow})` };

  grandTotalRow.height = 22;
  for (let c = 1; c <= 12; c++) {
    const cell = grandTotalRow.getCell(c);
    cell.font = { name: 'Arial', size: 9.5, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'double' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (c >= 3) cell.numFmt = NUM_FORMAT_CURRENCY;
  }

  // 4. Reconciliation Math Summary Box (Beginning below table)
  let reconBoxStart = grandTotalRowIndex + 3;

  ws.mergeCells(`B${reconBoxStart}:F${reconBoxStart}`);
  const cbBalLabel = ws.getCell(`B${reconBoxStart}`);
  cbBalLabel.value = 'Balance as per Cash Book at End of Period:';
  cbBalLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.NAVY_HEADER } };

  const cbBalCell = ws.getCell(`G${reconBoxStart}`);
  // Live formula: Opening Balance (C6) + Total Receipts (G{grandTotalRowIndex}) - Total Payments (L{grandTotalRowIndex})
  cbBalCell.value = { formula: `C${opRowIndex}+G${grandTotalRowIndex}-L${grandTotalRowIndex}` };
  cbBalCell.numFmt = NUM_FORMAT_CURRENCY;
  cbBalCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.NAVY_HEADER } };

  const bankBalRow = reconBoxStart + 1;
  ws.mergeCells(`B${bankBalRow}:F${bankBalRow}`);
  const bankBalLabel = ws.getCell(`B${bankBalRow}`);
  bankBalLabel.value = 'Balance as per Bank Statement at End of Period:';
  bankBalLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.TEXT_DARK } };

  const bankBalCell = ws.getCell(`G${bankBalRow}`);
  bankBalCell.value = p.bankStatementBalance;
  bankBalCell.numFmt = NUM_FORMAT_CURRENCY;
  bankBalCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.TEXT_DARK } };

  const diffRow = reconBoxStart + 2;
  ws.mergeCells(`B${diffRow}:F${diffRow}`);
  const diffLabel = ws.getCell(`B${diffRow}`);
  diffLabel.value = 'Net Difference (Unpresented Cheques / Pending Deposits):';
  diffLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.ALERT_RED } };

  const diffCell = ws.getCell(`G${diffRow}`);
  // Live formula: CashBook Balance - Bank Statement Balance
  diffCell.value = { formula: `G${reconBoxStart}-G${bankBalRow}` };
  diffCell.numFmt = NUM_FORMAT_CURRENCY;
  diffCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.ALERT_RED } };

  // Box borders
  [reconBoxStart, bankBalRow, diffRow].forEach((rIdx) => {
    ws.getRow(rIdx).height = 20;
    for (let c = 2; c <= 7; c++) {
      ws.getCell(rIdx, c).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  });

  // 5. Unpresented Cheques Sub-Table
  const unpresHeaderRow = diffRow + 3;
  ws.mergeCells(`B${unpresHeaderRow}:G${unpresHeaderRow}`);
  const unpresTitle = ws.getCell(`B${unpresHeaderRow}`);
  unpresTitle.value = 'SCHEDULE OF UNPRESENTED CHEQUES / UNCREDITED ITEMS';
  unpresTitle.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.WHITE } };
  unpresTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  unpresTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(unpresHeaderRow).height = 22;

  const unpresCols = ['Cheque No.', 'Cheque Date', 'Paid To / By', 'Account Head', 'Description / Remarks', 'Amount (Rs.)'];
  const unpresColRow = ws.getRow(unpresHeaderRow + 1);
  unpresColRow.getCell(2).value = unpresCols[0];
  unpresColRow.getCell(3).value = unpresCols[1];
  unpresColRow.getCell(4).value = unpresCols[2];
  unpresColRow.getCell(5).value = unpresCols[3];
  unpresColRow.getCell(6).value = unpresCols[4];
  unpresColRow.getCell(7).value = unpresCols[5];

  [2, 3, 4, 5, 6, 7].forEach((col) => {
    const c = unpresColRow.getCell(col);
    c.font = { name: 'Arial', size: 9, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const chequeStartRow = unpresHeaderRow + 2;
  let chequeEndRow = chequeStartRow;

  if (p.manualCheques.length === 0) {
    const row = ws.getRow(chequeStartRow);
    ws.mergeCells(`B${chequeStartRow}:F${chequeStartRow}`);
    row.getCell(2).value = 'No unpresented cheques or outstanding items recorded for this period.';
    row.getCell(2).font = { name: 'Arial', size: 9, italic: true, color: { argb: '64748B' } };
    row.getCell(7).value = 0;
    row.getCell(7).numFmt = NUM_FORMAT_CURRENCY;
  } else {
    p.manualCheques.forEach((chq, i) => {
      const cRowIdx = chequeStartRow + i;
      const row = ws.getRow(cRowIdx);
      row.getCell(2).value = chq.chequeNo;
      row.getCell(3).value = chq.date;
      row.getCell(4).value = chq.paidTo || '—';
      row.getCell(5).value = chq.accountHead || '—';
      row.getCell(6).value = chq.description || '—';
      row.getCell(7).value = chq.amount;
      row.getCell(7).numFmt = NUM_FORMAT_CURRENCY;

      [2, 3, 4, 5, 6, 7].forEach((col) => {
        row.getCell(col).border = {
          top: { style: 'hair' },
          bottom: { style: 'hair' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      chequeEndRow = cRowIdx;
    });
  }

  // Cheque Grand Total Row
  const chqTotalRowIdx = chequeEndRow + 1;
  const chqTotalRow = ws.getRow(chqTotalRowIdx);
  ws.mergeCells(`B${chqTotalRowIdx}:F${chqTotalRowIdx}`);
  chqTotalRow.getCell(2).value = 'TOTAL UNPRESENTED CHEQUES (Rs.)';
  chqTotalRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true };
  chqTotalRow.getCell(2).alignment = { horizontal: 'right' };
  chqTotalRow.getCell(7).value = { formula: `SUM(G${chequeStartRow}:G${chequeEndRow})` };
  chqTotalRow.getCell(7).numFmt = NUM_FORMAT_CURRENCY;
  chqTotalRow.getCell(7).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.ALERT_RED } };

  [2, 3, 4, 5, 6, 7].forEach((col) => {
    chqTotalRow.getCell(col).border = {
      top: { style: 'thin' },
      bottom: { style: 'double' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
    chqTotalRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
  });

  // 6. Signatures Block
  const sigRow = chqTotalRowIdx + 4;
  ws.mergeCells(`B${sigRow}:D${sigRow}`);
  ws.mergeCells(`E${sigRow}:G${sigRow}`);
  ws.mergeCells(`I${sigRow}:L${sigRow}`);

  ws.getCell(`B${sigRow}`).value = '_________________________\nPREPARED BY (ACCOUNTANT)';
  ws.getCell(`E${sigRow}`).value = '_________________________\nVERIFIED BY (CO-SIGNATURE)';
  ws.getCell(`I${sigRow}`).value = '_________________________\nPRINCIPAL / DDO';

  [`B${sigRow}`, `E${sigRow}`, `I${sigRow}`].forEach((cellRef) => {
    const c = ws.getCell(cellRef);
    c.font = { name: 'Arial', size: 9, bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  ws.getRow(sigRow).height = 36;

  autoFitColumns(ws, 12, 40);
  await downloadWorkbook(wb, p.filename);
}

// ============================================================================
// 2. DATE-WISE RECEIPTS REGISTER EXPORT (.xlsx)
// ============================================================================
export interface ReceiptsRegisterRow {
  sr: number;
  date: string;
  challanChequeNo: string;
  headOfAccount: string;
  amount: number;
  remarks: string;
}

export async function exportReceiptsRegisterExcel(
  instituteName: string,
  accountName: string,
  period: string,
  rows: ReceiptsRegisterRow[],
  filename: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Date-Wise Receipts', { views: [{ showGridLines: true }] });

  // Title
  ws.mergeCells('A1:F1');
  const t1 = ws.getCell('A1');
  t1.value = instituteName.toUpperCase();
  t1.font = { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:F2');
  const t2 = ws.getCell('A2');
  t2.value = `DATE-WISE RECEIPTS REGISTER — ${accountName.toUpperCase()}`;
  t2.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.WHITE } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A3:F3');
  ws.getCell('A3').value = `Period: ${period}`;
  ws.getCell('A3').font = { name: 'Arial', size: 9.5, italic: true };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  // Headers
  const headers = ['Sr #', 'Date of Receipt', 'Challan / Cheque No', 'Head of Account', 'Amount (Rs.)', 'Remarks'];
  const hRow = ws.getRow(5);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLORS.WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    c.alignment = { horizontal: i === 4 ? 'right' : 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  const startRow = 6;
  rows.forEach((r, idx) => {
    const curr = startRow + idx;
    const row = ws.getRow(curr);
    row.getCell(1).value = r.sr;
    row.getCell(2).value = r.date;
    row.getCell(3).value = r.challanChequeNo;
    row.getCell(4).value = r.headOfAccount;
    row.getCell(5).value = r.amount;
    row.getCell(5).numFmt = NUM_FORMAT_CURRENCY;
    row.getCell(6).value = r.remarks;

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'left' };
    row.getCell(5).alignment = { horizontal: 'right' };
    row.getCell(6).alignment = { horizontal: 'left' };

    for (let c = 1; c <= 6; c++) {
      row.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
  });

  const endRow = startRow + rows.length - 1;
  const totRow = ws.getRow(endRow + 1);
  ws.mergeCells(`A${endRow + 1}:D${endRow + 1}`);
  totRow.getCell(1).value = 'TOTAL RECEIPTS (Rs.)';
  totRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  totRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  totRow.getCell(5).value = { formula: `SUM(E${startRow}:E${endRow})` };
  totRow.getCell(5).numFmt = NUM_FORMAT_CURRENCY;
  totRow.getCell(5).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: COLORS.SUCCESS_GREEN } };

  for (let c = 1; c <= 6; c++) {
    const cell = totRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }

  autoFitColumns(ws);
  await downloadWorkbook(wb, filename);
}

// ============================================================================
// 3. DATE-WISE PAYMENTS REGISTER EXPORT (.xlsx)
// ============================================================================
export interface PaymentsRegisterRow {
  sr: number;
  headOfAccount: string;
  chequeDate: string;
  chequeNo: string;
  totalBillAmount: number;
  incomeTax: number;
  praAmount: number;
  security: number;
  netAmountPaid: number;
  remarks: string;
  paidTo: string;
}

export async function exportPaymentsRegisterExcel(
  instituteName: string,
  accountName: string,
  period: string,
  rows: PaymentsRegisterRow[],
  filename: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Date-Wise Payments', { views: [{ showGridLines: true }] });

  ws.mergeCells('A1:K1');
  const t1 = ws.getCell('A1');
  t1.value = instituteName.toUpperCase();
  t1.font = { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:K2');
  const t2 = ws.getCell('A2');
  t2.value = `DATE-WISE PAYMENTS REGISTER — ${accountName.toUpperCase()}`;
  t2.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.WHITE } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A3:K3');
  ws.getCell('A3').value = `Period: ${period}`;
  ws.getCell('A3').font = { name: 'Arial', size: 9.5, italic: true };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = [
    'Sr #',
    'Account Head',
    'Cheque Date',
    'Cheque No.',
    'Total Bill Amount',
    'Income Tax',
    'Sales Tax (PRA)',
    'Security',
    'Net Amount Paid',
    'Remarks',
    'Paid To',
  ];

  const hRow = ws.getRow(5);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  const startRow = 6;
  rows.forEach((r, idx) => {
    const curr = startRow + idx;
    const row = ws.getRow(curr);
    row.getCell(1).value = r.sr;
    row.getCell(2).value = r.headOfAccount;
    row.getCell(3).value = r.chequeDate;
    row.getCell(4).value = r.chequeNo;
    row.getCell(5).value = r.totalBillAmount;
    row.getCell(6).value = r.incomeTax;
    row.getCell(7).value = r.praAmount;
    row.getCell(8).value = r.security;
    row.getCell(9).value = r.netAmountPaid;
    row.getCell(10).value = r.remarks;
    row.getCell(11).value = r.paidTo;

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };

    [5, 6, 7, 8, 9].forEach((cIdx) => {
      const cell = row.getCell(cIdx);
      cell.numFmt = NUM_FORMAT_CURRENCY;
      cell.alignment = { horizontal: 'right' };
    });

    for (let c = 1; c <= 11; c++) {
      row.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
  });

  const endRow = startRow + rows.length - 1;
  const totRow = ws.getRow(endRow + 1);
  ws.mergeCells(`A${endRow + 1}:D${endRow + 1}`);
  totRow.getCell(1).value = 'GRAND TOTALS (Rs.)';
  totRow.getCell(1).font = { name: 'Arial', size: 9.5, bold: true };
  totRow.getCell(1).alignment = { horizontal: 'right' };

  totRow.getCell(5).value = { formula: `SUM(E${startRow}:E${endRow})` };
  totRow.getCell(6).value = { formula: `SUM(F${startRow}:F${endRow})` };
  totRow.getCell(7).value = { formula: `SUM(G${startRow}:G${endRow})` };
  totRow.getCell(8).value = { formula: `SUM(H${startRow}:H${endRow})` };
  totRow.getCell(9).value = { formula: `SUM(I${startRow}:I${endRow})` };

  [5, 6, 7, 8, 9].forEach((cIdx) => {
    const c = totRow.getCell(cIdx);
    c.numFmt = NUM_FORMAT_CURRENCY;
    c.font = { name: 'Arial', size: 9.5, bold: true };
    c.alignment = { horizontal: 'right' };
  });

  for (let c = 1; c <= 11; c++) {
    const cell = totRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }

  autoFitColumns(ws);
  await downloadWorkbook(wb, filename);
}

// ============================================================================
// 4. CASH BOOK STATEMENT EXPORT (.xlsx)
// ============================================================================
export interface CashBookExportGroup {
  accountKey: string;
  meta: { shortName: string; accountNo: string };
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  rows: Array<{
    date: string;
    voucherNo: string;
    paidToBy: string;
    accountHead: string;
    particulars: string;
    chequeNo: string;
    receipts: number;
    payments: number;
    balance: number;
    billNo?: string;
    billDate?: string;
  }>;
}

export interface CashBookExportParams {
  isConsolidated: boolean;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  groups: CashBookExportGroup[];
  filename: string;
}

export async function exportCashBookStatementExcel(p: CashBookExportParams): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Cash Book Statement', { views: [{ showGridLines: true }] });

  // Header
  ws.mergeCells('A1:J1');
  const t1 = ws.getCell('A1');
  t1.value = 'GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD';
  t1.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:J2');
  const t2 = ws.getCell('A2');
  t2.value = p.isConsolidated
    ? 'CONSOLIDATED CASH BOOK STATEMENT — ALL BANK ACCOUNTS'
    : `CASH BOOK STATEMENT — ${p.groups[0]?.meta.shortName || 'BANK'} (${p.groups[0]?.meta.accountNo || ''})`;
  t2.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: COLORS.WHITE } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = [
    'Sr #',
    'Date',
    'Voucher No.',
    'Paid To / By',
    'Account Head',
    'Particulars / Narration',
    'Cheque No.',
    'Receipts (Rs.)',
    'Payments (Rs.)',
    'Balance (Rs.)',
  ];

  const hRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  let currRow = 5;

  // Opening Balance Row
  const opRow = ws.getRow(currRow);
  opRow.getCell(1).value = '—';
  opRow.getCell(2).value = '01-Jul-2026';
  opRow.getCell(3).value = '—';
  opRow.getCell(4).value = p.isConsolidated ? 'CONSOLIDATED OPENING BALANCE (b/d)' : 'OPENING BALANCE BROUGHT FORWARD (b/d)';
  opRow.getCell(5).value = '—';
  opRow.getCell(6).value = 'Audited Opening Balance brought forward';
  opRow.getCell(7).value = '—';
  opRow.getCell(8).value = 0;
  opRow.getCell(9).value = 0;
  opRow.getCell(10).value = p.openingBalance;
  opRow.getCell(10).numFmt = NUM_FORMAT_CURRENCY;
  opRow.getCell(10).font = { name: 'Arial', size: 9.5, bold: true };
  currRow++;

  let globalSr = 1;
  const dataRowStart = currRow;

  for (const g of p.groups) {
    if (p.isConsolidated) {
      const banner = ws.getRow(currRow);
      ws.mergeCells(`A${currRow}:J${currRow}`);
      banner.getCell(1).value = `🏦 ${g.meta.shortName} (${g.accountKey}) CASH BOOK — Account No: ${g.meta.accountNo} (Opening: Rs. ${g.openingBalance.toLocaleString()})`;
      banner.getCell(1).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLORS.WHITE } };
      banner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
      banner.height = 20;
      currRow++;
    }

    for (const r of g.rows) {
      const row = ws.getRow(currRow);
      row.getCell(1).value = globalSr++;
      row.getCell(2).value = r.date;
      row.getCell(3).value = r.voucherNo;
      row.getCell(4).value = r.paidToBy;
      row.getCell(5).value = r.accountHead;
      row.getCell(6).value = r.particulars;
      row.getCell(7).value = r.chequeNo;
      row.getCell(8).value = r.receipts;
      row.getCell(9).value = r.payments;
      row.getCell(10).value = r.balance;

      [8, 9, 10].forEach((c) => {
        row.getCell(c).numFmt = NUM_FORMAT_CURRENCY;
        row.getCell(c).alignment = { horizontal: 'right' };
      });
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };

      for (let c = 1; c <= 10; c++) {
        row.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      }
      currRow++;
    }
  }

  const dataRowEnd = currRow - 1;

  // Grand Totals
  const totRow = ws.getRow(currRow);
  ws.mergeCells(`A${currRow}:G${currRow}`);
  totRow.getCell(1).value = 'GRAND TOTALS (Rs.)';
  totRow.getCell(1).font = { name: 'Arial', size: 9.5, bold: true };
  totRow.getCell(1).alignment = { horizontal: 'right' };

  totRow.getCell(8).value = { formula: `SUM(H${dataRowStart}:H${dataRowEnd})` };
  totRow.getCell(9).value = { formula: `SUM(I${dataRowStart}:I${dataRowEnd})` };
  totRow.getCell(10).value = '';

  [8, 9].forEach((c) => {
    totRow.getCell(c).numFmt = NUM_FORMAT_CURRENCY;
    totRow.getCell(c).font = { name: 'Arial', size: 9.5, bold: true };
  });

  for (let c = 1; c <= 10; c++) {
    totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    totRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }
  currRow++;

  // Closing Balance Row with Formula
  const closeRow = ws.getRow(currRow);
  ws.mergeCells(`A${currRow}:G${currRow}`);
  closeRow.getCell(1).value = 'CLOSING BALANCE CARRIED FORWARD (c/d)';
  closeRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.NAVY_HEADER } };
  closeRow.getCell(1).alignment = { horizontal: 'right' };

  closeRow.getCell(10).value = { formula: `J5+H${currRow - 1}-I${currRow - 1}` };
  closeRow.getCell(10).numFmt = NUM_FORMAT_CURRENCY;
  closeRow.getCell(10).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: COLORS.NAVY_HEADER } };

  for (let c = 1; c <= 10; c++) {
    closeRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    closeRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }

  autoFitColumns(ws);
  await downloadWorkbook(wb, p.filename);
}

// ============================================================================
// 5. GENERAL REPORT EXPORT (Payee, Amount, FBR, PRA) (.xlsx)
// ============================================================================
export interface GeneralReportExportParams {
  title: string;
  subtitle: string;
  headers: string[];
  rows: Array<(string | number)[]>;
  numericColIndices: number[]; // 1-indexed column indices that represent numbers
  totalFormulas?: { [colIdx: number]: string };
  filename: string;
}

export async function exportGeneralReportExcel(p: GeneralReportExportParams): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report', { views: [{ showGridLines: true }] });

  const totalCols = p.headers.length;
  const colLetter = ws.getColumn(totalCols).letter;

  // Title
  ws.mergeCells(`A1:${colLetter}1`);
  const t1 = ws.getCell('A1');
  t1.value = 'GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD';
  t1.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`A2:${colLetter}2`);
  const t2 = ws.getCell('A2');
  t2.value = `${p.title.toUpperCase()} — ${p.subtitle.toUpperCase()}`;
  t2.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.WHITE } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Headers
  const hRow = ws.getRow(4);
  p.headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  const startRow = 5;
  p.rows.forEach((r, idx) => {
    const curr = startRow + idx;
    const row = ws.getRow(curr);
    r.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;

      if (p.numericColIndices.includes(cIdx + 1)) {
        cell.numFmt = NUM_FORMAT_CURRENCY;
        cell.alignment = { horizontal: 'right' };
      } else {
        cell.alignment = { horizontal: typeof val === 'number' ? 'center' : 'left' };
      }

      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  const endRow = startRow + p.rows.length - 1;
  const totRow = ws.getRow(endRow + 1);
  totRow.getCell(1).value = 'GRAND TOTALS';
  totRow.getCell(1).font = { name: 'Arial', size: 9.5, bold: true };

  p.numericColIndices.forEach((cIdx) => {
    const colChar = ws.getColumn(cIdx).letter;
    totRow.getCell(cIdx).value = { formula: `SUM(${colChar}${startRow}:${colChar}${endRow})` };
    totRow.getCell(cIdx).numFmt = NUM_FORMAT_CURRENCY;
    totRow.getCell(cIdx).font = { name: 'Arial', size: 9.5, bold: true };
    totRow.getCell(cIdx).alignment = { horizontal: 'right' };
  });

  for (let c = 1; c <= totalCols; c++) {
    totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    totRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }

  autoFitColumns(ws);
  await downloadWorkbook(wb, p.filename);
}

// ============================================================================
// 6. EXECUTIVE BUDGET MATRIX EXPORT (38 Heads) (.xlsx)
// ============================================================================
export interface BudgetMatrixAccountItem {
  code: string;
  head: string;
  category: string;
  opening: number;
  reappr: number;
  receipts: number;
  payments: number;
}

export async function exportBudgetMatrixExcel(
  accounts: BudgetMatrixAccountItem[],
  fiscalYear: string,
  filename: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Executive Budget Matrix', { views: [{ showGridLines: true }] });

  // Title
  ws.mergeCells('A1:J1');
  const t1 = ws.getCell('A1');
  t1.value = 'GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD';
  t1.font = { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:J2');
  const t2 = ws.getCell('A2');
  t2.value = `EXECUTIVE BUDGET POSITION MATRIX & EXPENDITURE MONITORING (${fiscalYear})`;
  t2.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: COLORS.WHITE } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = [
    'Sr #',
    'Head Code',
    'Account Head Description',
    'Category',
    'Opening Budget (Rs.)',
    'Reappropriation (Rs.)',
    'Total Budget (Rs.)',
    'Expenditure / Payments (Rs.)',
    'Remaining Balance (Rs.)',
    'Utilization %',
  ];

  const hRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  const startRow = 5;
  accounts.forEach((acc, idx) => {
    const curr = startRow + idx;
    const row = ws.getRow(curr);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = acc.code;
    row.getCell(3).value = acc.head;
    row.getCell(4).value = acc.category;
    row.getCell(5).value = acc.opening;
    row.getCell(6).value = acc.reappr;
    // Live Formula: Total Budget = Opening + Reappr
    row.getCell(7).value = { formula: `E${curr}+F${curr}` };
    row.getCell(8).value = acc.payments;
    // Live Formula: Remaining Balance = Total Budget - Payments
    row.getCell(9).value = { formula: `G${curr}-H${curr}` };
    // Live Formula: Utilization % = Payments / Total Budget
    row.getCell(10).value = { formula: `IF(G${curr}>0, H${curr}/G${curr}, 0)` };

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };

    [5, 6, 7, 8, 9].forEach((c) => {
      row.getCell(c).numFmt = NUM_FORMAT_CURRENCY;
      row.getCell(c).alignment = { horizontal: 'right' };
    });
    row.getCell(10).numFmt = NUM_FORMAT_PERCENT;
    row.getCell(10).alignment = { horizontal: 'right' };

    for (let c = 1; c <= 10; c++) {
      row.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
  });

  const endRow = startRow + accounts.length - 1;
  const totRow = ws.getRow(endRow + 1);
  ws.mergeCells(`A${endRow + 1}:D${endRow + 1}`);
  totRow.getCell(1).value = 'INSTITUTIONAL GRAND TOTALS (Rs.)';
  totRow.getCell(1).font = { name: 'Arial', size: 9.5, bold: true };
  totRow.getCell(1).alignment = { horizontal: 'right' };

  totRow.getCell(5).value = { formula: `SUM(E${startRow}:E${endRow})` };
  totRow.getCell(6).value = { formula: `SUM(F${startRow}:F${endRow})` };
  totRow.getCell(7).value = { formula: `SUM(G${startRow}:G${endRow})` };
  totRow.getCell(8).value = { formula: `SUM(H${startRow}:H${endRow})` };
  totRow.getCell(9).value = { formula: `SUM(I${startRow}:I${endRow})` };
  totRow.getCell(10).value = { formula: `IF(G${endRow + 1}>0, H${endRow + 1}/G${endRow + 1}, 0)` };

  [5, 6, 7, 8, 9].forEach((c) => {
    totRow.getCell(c).numFmt = NUM_FORMAT_CURRENCY;
    totRow.getCell(c).font = { name: 'Arial', size: 9.5, bold: true };
  });
  totRow.getCell(10).numFmt = NUM_FORMAT_PERCENT;
  totRow.getCell(10).font = { name: 'Arial', size: 9.5, bold: true };

  for (let c = 1; c <= 10; c++) {
    totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    totRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }

  autoFitColumns(ws);
  await downloadWorkbook(wb, filename);
}

// ============================================================================
// 7. HEAD EXPENDITURE STATEMENT EXPORT (.xlsx)
// ============================================================================
export interface HeadExpenditureExportGroup {
  headCode: string;
  headName: string;
  allocationOpening: number;
  receiptsReappr: number;
  totalExpenditure: number;
  closingUnspentBalance: number;
  rows: Array<{
    date: string;
    accountKey: string;
    voucherNo: string;
    paidToBy: string;
    accountHead: string;
    particulars: string;
    chequeNo: string;
    receipts: number;
    payments: number;
    balance: number;
  }>;
}

export interface HeadExpenditureExportParams {
  isMultiHead: boolean;
  title: string;
  subtitle: string;
  budgetAllocationOpening: number;
  totalReceipts: number;
  totalExpenditure: number;
  closingUnspentBalance: number;
  groups: HeadExpenditureExportGroup[];
  filename: string;
}

export async function exportHeadExpenditureExcel(p: HeadExpenditureExportParams): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Head Expenditure', { views: [{ showGridLines: true }] });

  // Title
  ws.mergeCells('A1:J1');
  const t1 = ws.getCell('A1');
  t1.value = 'GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD';
  t1.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:J2');
  const t2 = ws.getCell('A2');
  t2.value = `${p.title.toUpperCase()} — ${p.subtitle.toUpperCase()}`;
  t2.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: COLORS.WHITE } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = [
    'Sr #',
    'Date',
    'Account / Head',
    'Voucher No.',
    'Paid To / Vendor',
    'Particulars / Narration',
    'Cheque No.',
    'Receipts / Reappr (Rs.)',
    'Expenditure (Rs.)',
    'Unspent Balance (Rs.)',
  ];

  const hRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  let currRow = 5;

  // Sanctioned Allocation Opening row
  const opRow = ws.getRow(currRow);
  opRow.getCell(1).value = '—';
  opRow.getCell(2).value = '01-Jul-2026';
  opRow.getCell(3).value = p.isMultiHead ? 'ALL' : (p.groups[0]?.headCode || 'HEAD');
  opRow.getCell(4).value = '—';
  opRow.getCell(5).value = p.isMultiHead ? 'CONSOLIDATED BUDGET ALLOCATION (b/d)' : 'SANCTIONED BUDGET ALLOCATION (b/d)';
  opRow.getCell(6).value = 'Sanctioned Budget Allocation for FY 2026-27';
  opRow.getCell(7).value = '—';
  opRow.getCell(8).value = 0;
  opRow.getCell(9).value = 0;
  opRow.getCell(10).value = p.budgetAllocationOpening;
  opRow.getCell(10).numFmt = NUM_FORMAT_CURRENCY;
  opRow.getCell(10).font = { name: 'Arial', size: 9.5, bold: true };
  currRow++;

  let globalSr = 1;
  const dataStartRow = currRow;

  for (const g of p.groups) {
    if (p.isMultiHead) {
      const banner = ws.getRow(currRow);
      ws.mergeCells(`A${currRow}:J${currRow}`);
      banner.getCell(1).value = `📌 ${g.headCode} - ${g.headName} (Sanctioned Allocation: Rs. ${g.allocationOpening.toLocaleString()})`;
      banner.getCell(1).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLORS.WHITE } };
      banner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
      banner.height = 20;
      currRow++;
    }

    for (const r of g.rows) {
      const row = ws.getRow(currRow);
      row.getCell(1).value = globalSr++;
      row.getCell(2).value = r.date;
      row.getCell(3).value = r.accountKey;
      row.getCell(4).value = r.voucherNo;
      row.getCell(5).value = r.paidToBy;
      row.getCell(6).value = r.particulars;
      row.getCell(7).value = r.chequeNo;
      row.getCell(8).value = r.receipts;
      row.getCell(9).value = r.payments;
      row.getCell(10).value = r.balance;

      [8, 9, 10].forEach((c) => {
        row.getCell(c).numFmt = NUM_FORMAT_CURRENCY;
        row.getCell(c).alignment = { horizontal: 'right' };
      });
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };

      for (let c = 1; c <= 10; c++) {
        row.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      }
      currRow++;
    }
  }

  const dataEndRow = currRow - 1;

  // Grand Totals
  const totRow = ws.getRow(currRow);
  ws.mergeCells(`A${currRow}:G${currRow}`);
  totRow.getCell(1).value = 'GRAND TOTALS (Rs.)';
  totRow.getCell(1).font = { name: 'Arial', size: 9.5, bold: true };
  totRow.getCell(1).alignment = { horizontal: 'right' };

  totRow.getCell(8).value = { formula: `SUM(H${dataStartRow}:H${dataEndRow})` };
  totRow.getCell(9).value = { formula: `SUM(I${dataStartRow}:I${dataEndRow})` };
  totRow.getCell(10).value = '';

  [8, 9].forEach((c) => {
    totRow.getCell(c).numFmt = NUM_FORMAT_CURRENCY;
    totRow.getCell(c).font = { name: 'Arial', size: 9.5, bold: true };
  });

  for (let c = 1; c <= 10; c++) {
    totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    totRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }
  currRow++;

  // Closing Unspent Balance Row
  const closeRow = ws.getRow(currRow);
  ws.mergeCells(`A${currRow}:G${currRow}`);
  closeRow.getCell(1).value = 'UNSPENT SANCTIONED BUDGET BALANCE (c/d)';
  closeRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.NAVY_HEADER } };
  closeRow.getCell(1).alignment = { horizontal: 'right' };

  closeRow.getCell(10).value = { formula: `J5+H${currRow - 1}-I${currRow - 1}` };
  closeRow.getCell(10).numFmt = NUM_FORMAT_CURRENCY;
  closeRow.getCell(10).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: COLORS.NAVY_HEADER } };

  for (let c = 1; c <= 10; c++) {
    closeRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTALS_BG } };
    closeRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }

  autoFitColumns(ws);
  await downloadWorkbook(wb, p.filename);
}

// ============================================================================
// 8. NON-SALARY & OWN FUNDS MONTHLY EXPENDITURE STATEMENT (.xlsx)
// ============================================================================
export interface NsOwnWorkingExcelRow {
  sr: string;
  code: string;
  particulars: string;
  originalBudget: string | number;
  recJul: string | number;
  recAug: string | number;
  recSep: string | number;
  totReceipts: string | number;
  totalBudget: string | number;
  expJul: string | number;
  expAug: string | number;
  expSep: string | number;
  totExp: string | number;
  balance: string | number;
  isMainHeader?: boolean;
  isCategoryHeader?: boolean;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
}

export interface NsOwnWorkingExcelParams {
  instituteName?: string;
  financialYear?: string;
  periodDescription?: string;
  reportGenTime?: string;
  lastRefreshed?: string;
  rows: NsOwnWorkingExcelRow[];
  filename?: string;
}

function parseRowAmount(val: string | number | undefined): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str || str === '-' || str === '') return 0;
  const clean = str.replace(/,/g, '').trim();
  if (clean.startsWith('(') && clean.endsWith(')')) {
    const num = parseFloat(clean.slice(1, -1));
    return isNaN(num) ? 0 : -num;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export async function exportNsOwnWorkingExcel(p: NsOwnWorkingExcelParams): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GVTIW eCashBook & Financial System (MKZ)';
  wb.created = new Date();

  const ws = wb.addWorksheet('NS & Own Working', {
    views: [{ showGridLines: true }],
  });

  const institute = p.instituteName || 'GOVERNMENT VOCATIONAL TRAINING INSTITUTE FOR WOMEN (GVTIW), SAMANABAD, FAISALABAD';
  const fy = p.financialYear || '2026-27';
  const period = p.periodDescription || 'All Months (FY 2026-27: 01-Jul-2026 to 30-Jun-2027)';
  const genTime = p.reportGenTime || new Date().toLocaleString();
  const synced = p.lastRefreshed || genTime;

  // 1. Header Banner
  ws.mergeCells('A1:N1');
  const t1 = ws.getCell('A1');
  t1.value = 'TECHNICAL EDUCATION & VOCATIONAL TRAINING AUTHORITY (TEVTA)';
  t1.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0B2545' } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:N2');
  const t2 = ws.getCell('A2');
  t2.value = institute.toUpperCase();
  t2.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.WHITE } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0B2545' } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  ws.mergeCells('A3:N3');
  const t3 = ws.getCell('A3');
  t3.value = `NON-SALARY & OWN FUNDS MONTHLY EXPENDITURE STATEMENT — FINANCIAL YEAR ${fy}`;
  t3.font = { name: 'Arial', size: 11, bold: true, color: { argb: '1E3A8A' } };
  t3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEF2FF' } };
  t3.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 22;

  ws.mergeCells('A4:N4');
  const t4 = ws.getCell('A4');
  t4.value = `Period: ${period}  |  Synced: ${synced}  |  Report Generated: ${genTime}`;
  t4.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: '475569' } };
  t4.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 18;

  // Blank line
  ws.getRow(5).height = 8;

  // Table Column Headers
  const colHeaders = [
    'Sr. No',
    'Account Code',
    'Particulars / Description',
    'Opening Budget',
    'Receipts (Jul)',
    'Receipts (Aug)',
    'Receipts (Sep)',
    'Total Receipts',
    'Total Net Budget',
    'Exp (Jul)',
    'Exp (Aug)',
    'Exp (Sep)',
    'Total Expenditure',
    'Net Balance (Surplus/Deficit)',
  ];

  const headerRow = ws.getRow(6);
  headerRow.height = 28;
  colHeaders.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: '475569' } },
      right: { style: 'thin', color: { argb: '475569' } },
    };
  });

  const NUM_FMT_FINANCIAL = '#,##0;[Red](#,##0);"-"';

  let currRow = 7;

  for (const r of p.rows) {
    const isCat = r.isCategoryHeader || r.isMainHeader || (!r.code && !r.originalBudget && r.particulars && !r.isSubtotal && !r.isGrandTotal);
    const isSub = r.isSubtotal && !r.isGrandTotal;
    const isGrand = r.isGrandTotal;

    const row = ws.getRow(currRow);

    if (isCat) {
      ws.mergeCells(`A${currRow}:N${currRow}`);
      const c = row.getCell(1);
      c.value = r.sr ? `${r.sr}  ${r.particulars}` : r.particulars;
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
      c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      row.height = 22;

      for (let i = 1; i <= 14; i++) {
        row.getCell(i).border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
          left: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
          right: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        };
      }
      currRow++;
      continue;
    }

    if (isSub) {
      ws.mergeCells(`A${currRow}:C${currRow}`);
      const c1 = row.getCell(1);
      c1.value = r.particulars.toUpperCase();
      c1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
      c1.alignment = { horizontal: 'right', vertical: 'middle' };

      const origVal = parseRowAmount(r.originalBudget);
      const rJul = parseRowAmount(r.recJul);
      const rAug = parseRowAmount(r.recAug);
      const rSep = parseRowAmount(r.recSep);
      const eJul = parseRowAmount(r.expJul);
      const eAug = parseRowAmount(r.expAug);
      const eSep = parseRowAmount(r.expSep);

      row.getCell(4).value = origVal;
      row.getCell(5).value = rJul;
      row.getCell(6).value = rAug;
      row.getCell(7).value = rSep;
      row.getCell(8).value = { formula: `SUM(E${currRow}:G${currRow})` };
      row.getCell(9).value = { formula: `D${currRow}+H${currRow}` };
      row.getCell(10).value = eJul;
      row.getCell(11).value = eAug;
      row.getCell(12).value = eSep;
      row.getCell(13).value = { formula: `SUM(J${currRow}:L${currRow})` };
      row.getCell(14).value = { formula: `I${currRow}-M${currRow}` };

      row.height = 22;

      for (let i = 1; i <= 14; i++) {
        const cell = row.getCell(i);
        cell.font = { name: 'Arial', size: 9.5, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = {
          top: { style: 'thin', color: { argb: '94A3B8' } },
          bottom: { style: 'thin', color: { argb: '94A3B8' } },
          left: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
          right: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        };
        if (i >= 4) {
          cell.numFmt = NUM_FMT_FINANCIAL;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      }
      currRow++;
      continue;
    }

    if (isGrand) {
      ws.mergeCells(`A${currRow}:C${currRow}`);
      const c1 = row.getCell(1);
      c1.value = r.particulars.toUpperCase();
      c1.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E1B4B' } };
      c1.alignment = { horizontal: 'right', vertical: 'middle' };

      const origVal = parseRowAmount(r.originalBudget);
      const rJul = parseRowAmount(r.recJul);
      const rAug = parseRowAmount(r.recAug);
      const rSep = parseRowAmount(r.recSep);
      const eJul = parseRowAmount(r.expJul);
      const eAug = parseRowAmount(r.expAug);
      const eSep = parseRowAmount(r.expSep);

      row.getCell(4).value = origVal;
      row.getCell(5).value = rJul;
      row.getCell(6).value = rAug;
      row.getCell(7).value = rSep;
      row.getCell(8).value = { formula: `SUM(E${currRow}:G${currRow})` };
      row.getCell(9).value = { formula: `D${currRow}+H${currRow}` };
      row.getCell(10).value = eJul;
      row.getCell(11).value = eAug;
      row.getCell(12).value = eSep;
      row.getCell(13).value = { formula: `SUM(J${currRow}:L${currRow})` };
      row.getCell(14).value = { formula: `I${currRow}-M${currRow}` };

      row.height = 24;

      for (let i = 1; i <= 14; i++) {
        const cell = row.getCell(i);
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E1B4B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E7FF' } };
        cell.border = {
          top: { style: 'thin', color: { argb: '4338CA' } },
          bottom: { style: 'double', color: { argb: '1E1B4B' } },
          left: { style: 'thin', color: { argb: '818CF8' } },
          right: { style: 'thin', color: { argb: '818CF8' } },
        };
        if (i >= 4) {
          cell.numFmt = NUM_FMT_FINANCIAL;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      }
      currRow++;
      continue;
    }

    // Normal item row
    row.height = 20;
    row.getCell(1).value = r.sr;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = r.code;
    row.getCell(2).numFmt = '@';
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).font = { name: 'Arial', size: 8.5, bold: true };

    row.getCell(3).value = r.particulars;
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    row.getCell(4).value = parseRowAmount(r.originalBudget);
    row.getCell(5).value = parseRowAmount(r.recJul);
    row.getCell(6).value = parseRowAmount(r.recAug);
    row.getCell(7).value = parseRowAmount(r.recSep);
    row.getCell(8).value = { formula: `SUM(E${currRow}:G${currRow})` };
    row.getCell(9).value = { formula: `D${currRow}+H${currRow}` };
    row.getCell(10).value = parseRowAmount(r.expJul);
    row.getCell(11).value = parseRowAmount(r.expAug);
    row.getCell(12).value = parseRowAmount(r.expSep);
    row.getCell(13).value = { formula: `SUM(J${currRow}:L${currRow})` };
    row.getCell(14).value = { formula: `I${currRow}-M${currRow}` };

    for (let i = 1; i <= 14; i++) {
      const cell = row.getCell(i);
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        bottom: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        left: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
        right: { style: 'thin', color: { argb: COLORS.BORDER_GRAY } },
      };
      if (i >= 4) {
        cell.numFmt = NUM_FMT_FINANCIAL;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }

    // Light color cues on key computed columns
    row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F9FF' } }; // Total Rec
    row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEF2FF' } }; // Net Budget
    row.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEFCE8' } }; // Total Exp
    row.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } }; // Balance

    row.getCell(8).font = { name: 'Arial', size: 8.5, bold: true, color: { argb: '0369A1' } };
    row.getCell(9).font = { name: 'Arial', size: 8.5, bold: true, color: { argb: '4338CA' } };
    row.getCell(13).font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'A16207' } };
    row.getCell(14).font = { name: 'Arial', size: 8.5, bold: true, color: { argb: '15803D' } };

    currRow++;
  }

  // 4. Signatories Block
  currRow += 2;

  // Signature lines
  ws.mergeCells(`B${currRow}:D${currRow}`);
  ws.getCell(`B${currRow}`).value = '______________________________________';
  ws.getCell(`B${currRow}`).alignment = { horizontal: 'center' };

  ws.mergeCells(`F${currRow}:H${currRow}`);
  ws.getCell(`F${currRow}`).value = '______________________________________';
  ws.getCell(`F${currRow}`).alignment = { horizontal: 'center' };

  ws.mergeCells(`K${currRow}:M${currRow}`);
  ws.getCell(`K${currRow}`).value = '______________________________________';
  ws.getCell(`K${currRow}`).alignment = { horizontal: 'center' };

  currRow++;
  ws.mergeCells(`B${currRow}:D${currRow}`);
  const s1 = ws.getCell(`B${currRow}`);
  s1.value = 'KASHIF ZIA';
  s1.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
  s1.alignment = { horizontal: 'center' };

  ws.mergeCells(`F${currRow}:H${currRow}`);
  const s2 = ws.getCell(`F${currRow}`);
  s2.value = 'ANEEBA JAMIL';
  s2.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
  s2.alignment = { horizontal: 'center' };

  ws.mergeCells(`K${currRow}:M${currRow}`);
  const s3 = ws.getCell(`K${currRow}`);
  s3.value = 'SHAZIA KHADIM';
  s3.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
  s3.alignment = { horizontal: 'center' };

  currRow++;
  ws.mergeCells(`B${currRow}:D${currRow}`);
  const st1 = ws.getCell(`B${currRow}`);
  st1.value = 'Prepared by: ACCOUNTANT';
  st1.font = { name: 'Arial', size: 8.5, color: { argb: '475569' } };
  st1.alignment = { horizontal: 'center' };

  ws.mergeCells(`F${currRow}:H${currRow}`);
  const st2 = ws.getCell(`F${currRow}`);
  st2.value = 'Checked by: CO. SIGNATUREE';
  st2.font = { name: 'Arial', size: 8.5, color: { argb: '475569' } };
  st2.alignment = { horizontal: 'center' };

  ws.mergeCells(`K${currRow}:M${currRow}`);
  const st3 = ws.getCell(`K${currRow}`);
  st3.value = 'Approved by: ACTING PRINCIPAL / DDO';
  st3.font = { name: 'Arial', size: 8.5, color: { argb: '475569' } };
  st3.alignment = { horizontal: 'center' };

  currRow += 2;
  ws.mergeCells(`A${currRow}:N${currRow}`);
  const footerCell = ws.getCell(`A${currRow}`);
  footerCell.value = `eCashBook & Voucher System Generated by MKZ for Institute 33028 • Report Generated on: ${genTime}`;
  footerCell.font = { name: 'Arial', size: 8, italic: true, color: { argb: '64748B' } };
  footerCell.alignment = { horizontal: 'center' };

  autoFitColumns(ws, 11, 42);
  // Column specifics
  ws.getColumn(1).width = 7;   // Sr
  ws.getColumn(2).width = 14;  // Code
  ws.getColumn(3).width = 38;  // Particulars
  for (let c = 4; c <= 14; c++) {
    ws.getColumn(c).width = 14;
  }

  const outFilename = p.filename || `NS_OWN_FY${fy}_Statement_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await downloadWorkbook(wb, outFilename);
}
