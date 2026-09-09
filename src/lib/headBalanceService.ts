/**
 * Head-Wise Budget & Available Balance Resolution Engine
 * Specifically handles Non-Salary (NS) and Assan Assignment Account (AAA) bank accounts
 * with live syncing from Google Sheets:
 * - NS Sheet: GID 1689777979 (Rows 6-74: Col D = Head Name, Col E = Opening, Col R = Total Receipts)
 * - AAA Sheet: GID 2012464444 (Rows 6-74: Col D = Head Name, Col E = Opening, Col R = Total Receipts)
 *
 * For NS:
 *   Available = (NS Opening + NS Receipts) - NS Only Head Gross Expense
 * For AAA:
 *   Available = (AAA Opening + AAA Receipts) - AAA Only Head Gross Expense
 * For Other Accounts:
 *   Preserves standard baseline allocations without alteration.
 */

import { MasterVoucher } from '../data/cashBookData';
import { INITIAL_ACCOUNTS } from '../data/initialData';

export interface HeadBudgetRow {
  sheetRow: number;
  code: string;
  headName: string;
  opening: number;
  receipts: number;
  totalAllocated: number;
}

export interface HeadBalanceComputation {
  accountHead: string;
  bankAccount: string;
  isNs: boolean;
  isAaa: boolean;
  opening: number;
  receipts: number;
  allocatedCeiling: number;
  headExpenditure: number;
  availableBalance: number;
  sheetRow?: number;
  sheetGid?: string;
  matchedCode?: string;
  matchedName?: string;
}

export const SPREADSHEET_ID = '1CJ-IW14fyHSIvux07kxn6HVomfNstYtbkNLPAaXvexY';
export const NS_SHEET_GID = '1689777979';
export const AAA_SHEET_GID = '2012464444';

export const STORAGE_KEY_NS_HEADS = 'gvtiw_live_ns_heads_budget_v1';
export const STORAGE_KEY_AAA_HEADS = 'gvtiw_live_aaa_heads_budget_v1';

// Compact baseline definitions: [sheetRow, code, headName, opening, receipts]
const NS_RAW_BASELINE: [number, string, string, number, number][] = [[6, "A031", "A031-Fees", 0.0, 0.0], [7, "A03101", "A03101-Bank Charges", 1407.0, 0.0], [8, "A031", "A031-Total Fees", 1407.0, 0.0], [9, "A032", "A032 Communications", 0.0, 0.0], [10, "A03201", "A03201-Postage & Telegraph", 16350.0, 0.0], [11, "A03202", "A03202-Telephone & Trunk Charges", -59990.0, 0.0], [12, "A03202-P", "Placement-A03202-Telephone & Trunk Calls", 54500.0, 0.0], [13, "A03203", "A03203-Telephone,Teleprinter & Fax/Communication", 0.0, 0.0], [14, "A03204", "A03204-Electronic Communications", 0.0, 0.0], [15, "A032", "A032  Total Communications", 10860.0, 0.0], [16, "A033", "A033 Utilities", 0.0, 0.0], [17, "A03301", "A03301-Sui Gas Charges", -40275.0, 0.0], [18, "A03302", "A03302-Water Charges", -15730.0, 0.0], [19, "A03303", "A03303-Electricity Charges", -230811.0, 0.0], [20, "A03304", "A03304-Hot & Cold Weather Charges", 0.0, 0.0], [21, "A033", "A033  Total Utilities", -286816.0, 0.0], [22, "A034", "A034 Occupancy Costs.", 0.0, 0.0], [23, "A03402", "A03402 Rent of Office Building", 0.0, 0.0], [24, "A03407", "A03407 Rates and Taxes", 0.0, 0.0], [25, "A034", "A034 Total Occupancy Costs.", 0.0, 0.0], [26, "A036", "A036-Motor Vehicles", 0.0, 0.0], [27, "A03602", "A03602-Insurance", 0.0, 0.0], [28, "A03603", "A03603-Registration", 0.0, 0.0], [29, "A036", "A036 Total Motor Vehicles", 0.0, 0.0], [30, "A037", "A037-Consultancy & Cont Work", 0.0, 0.0], [31, "A03702", "A03702-Management", 0.0, 0.0], [32, "A037", "A037 Total Consultancy & Contractual Work", 0.0, 0.0], [33, "A038", "A038 Travel & Transport.", 0.0, 0.0], [34, "A03801", "A03801-Staff Training", 0.0, 0.0], [35, "A03805", "A03805-TA/DA Charges", -53695.0, 0.0], [36, "A03806", "A03806-Transportation of Goods", -8500.0, 0.0], [37, "A03807-P", "Placement-A03807-POL", 14834.0, 0.0], [38, "A03807", "A03807-POL Charges", -8718.0, 0.0], [39, "A03808", "A03808-Conveyance Charges", -12175.0, 0.0], [40, "A03809", "A03809-CNG Charges", 0.0, 0.0], [41, "A038", "A038 Total Travel & Transportation.", -68254.0, 0.0], [42, "A039", "A039 General", 0.0, 0.0], [43, "A03901", "A03901-Stationery Charges", -3530.0, 0.0], [44, "A03902", "A03902-Printing Charges", 6975.0, 0.0], [45, "A03903", "Placement-A03903- Confrence Seminar & Workshop", -43972.0, 0.0], [46, "A03905", "A03905-Newspapers & Books", 0.0, 0.0], [47, "A03906", "A03906-Uniforms Liveries", 0.0, 0.0], [48, "A03907", "A03907-Publicity Advertising Charges", -40419.0, 0.0], [49, "A03917", "A03917-Law Charges", 0.0, 0.0], [50, "A03918", "Placement-A03918-Job Fair & Exhibition", 4942.0, 0.0], [51, "A03927", "A03927-Purchase of Drug & Medicines", 0.0, 0.0], [52, "A03933", "A03933-Service Charges", 373946.0, 0.0], [53, "A03942", "A03942-Cost of Other Stores / Training Materials", -40040.0, 0.0], [54, "A03970", "A03970-Others (Misc. Charges)", -190335.0, 0.0], [55, "A03949", "A03949-Research & Development /Tarining", 0.0, 0.0], [56, "A039", "A039 Total General", 67567.0, 0.0], [57, "AO41", "AO41-Pension", 0.0, 0.0], [58, "A04104", "A04104-Pension-Others", 0.0, 0.0], [59, "AO41", "AO41 Total Pension", 0.0, 0.0], [60, "AO52", "AO52-Domestic Grant", 0.0, 0.0], [61, "AO5216", "AO5216-Financial Assistance", 0.0, 0.0], [62, "AO52", "AO52 Total Domestic Grant", 0.0, 0.0], [63, "A061", "A061-Scholarship", 0.0, 0.0], [64, "A06104", "A06104-S. Bonus", 0.0, 0.0], [65, "A061", "A061-Total Scholarship", 0.0, 0.0], [66, "A063", "A063-Entertainment & Gifts", 0.0, 0.0], [67, "A06301", "A06301-Entertainment & Gifts", 0.0, 0.0], [68, "A063", "A063 Total Entertainment & Gifts", 0.0, 0.0], [69, "A013", "A013- Repairs and Maintenance of D/Goods", 0.0, 0.0], [70, "A13001", "A13001-Repair of Transport", 0.0, 0.0], [71, "A13101", "A13101-Repair of Machinery/Equipments", 8434.0, 0.0], [72, "A13201", "A13201-Repair of Furniture & Fixtures", 89238.0, 0.0], [73, "A013", "Total Repair And Maintenance", 97672.0, 0.0], [74, "", "Non Salary Sub Total:", -177564.0, 0.0]];

const AAA_RAW_BASELINE: [number, string, string, number, number][] = [[6, "A031", "A031-Fees", 0.0, 0.0], [7, "A03101", "A03101-Bank Charges", 0.0, 0.0], [8, "A031", "A031-Total Fees", 0.0, 0.0], [9, "A032", "A032 Communications", 0.0, 0.0], [10, "A03201", "A03201-Postage & Telegraph", 0.0, 4794.0], [11, "A03202", "A03202-Telephone & Trunk Charges", 0.0, 23697.0], [12, "A03202-P", "Placement-A03202-Telephone & Trunk Calls", 0.0, 0.0], [13, "A03203", "A03203-Telephone,Teleprinter & Fax/Communication", 0.0, 0.0], [14, "A03204", "A03204-Electronic Communications", 0.0, 0.0], [15, "A032", "A032  Total Communications", 0.0, 28491.0], [16, "A033", "A033 Utilities", 0.0, 0.0], [17, "A03301", "A03301-Sui Gas Charges", 0.0, 3529.0], [18, "A03302", "A03302-Water Charges", 0.0, 8046.0], [19, "A03303", "A03303-Electricity Charges", 0.0, 202490.0], [20, "A03304", "A03304-Hot & Cold Weather Charges", 0.0, 0.0], [21, "A033", "A033  Total Utilities", 0.0, 214065.0], [22, "A034", "A034 Occupancy Costs.", 0.0, 0.0], [23, "A03402", "A03402 Rent of Office Building", 0.0, 0.0], [24, "A03407", "A03407 Rates and Taxes", 0.0, 0.0], [25, "A034", "A034 Total Occupancy Costs.", 0.0, 0.0], [26, "A036", "A036-Motor Vehicles", 0.0, 0.0], [27, "A03602", "A03602-Insurance", 0.0, 0.0], [28, "A03603", "A03603-Registration", 0.0, 0.0], [29, "A036", "A036 Total Motor Vehicles", 0.0, 0.0], [30, "A037", "A037-Consultancy & Cont Work", 0.0, 0.0], [31, "A03702", "A03702-Management", 0.0, 0.0], [32, "A037", "A037 Total Consultancy & Contractual Work", 0.0, 0.0], [33, "A038", "A038 Travel & Transport.", 0.0, 0.0], [34, "A03801", "A03801-Staff Training", 0.0, 0.0], [35, "A03805", "A03805-TA/DA Charges", 0.0, 6804.0], [36, "A03806", "A03806-Transportation of Goods", 0.0, 0.0], [37, "A03807-P", "Placement-A03807-POL", 0.0, 0.0], [38, "A03807", "A03807-POL Charges", 0.0, 67546.0], [39, "A03808", "A03808-Conveyance Charges", 0.0, 3314.0], [40, "A03809", "A03809-CNG Charges", 0.0, 0.0], [41, "A038", "A038 Total Travel & Transportation.", 0.0, 77664.0], [42, "A039", "A039 General", 0.0, 0.0], [43, "A03901", "A03901-Stationery Charges", 0.0, 19334.0], [44, "A03902", "A03902-Printing Charges", 0.0, 8393.0], [45, "A03903", "Placement-A03903- Confrence Seminar & Workshop", 0.0, 0.0], [46, "A03905", "A03905-Newspapers & Books", 0.0, 0.0], [47, "A03906", "A03906-Uniforms Liveries", 0.0, 0.0], [48, "A03907", "A03907-Publicity Advertising Charges", 0.0, 0.0], [49, "A03917", "A03917-Law Charges", 0.0, 0.0], [50, "A03918", "Placement-A03918-Job Fair & Exhibition", 0.0, 0.0], [51, "A03927", "A03927-Purchase of Drug & Medicines", 0.0, 0.0], [52, "A03933", "A03933-Service Charges", 0.0, 142852.0], [53, "A03942", "A03942-Cost of Other Stores / Training Materials", 0.0, 0.0], [54, "A03970", "A03970-Others (Misc. Charges)", 0.0, 0.0], [55, "A03949", "A03949-Research & Development /Tarining", 0.0, 0.0], [56, "A039", "A039 Total General", 0.0, 170579.0], [57, "AO41", "AO41-Pension", 0.0, 0.0], [58, "A04104", "A04104-Pension-Others", 0.0, 0.0], [59, "AO41", "AO41 Total Pension", 0.0, 0.0], [60, "AO52", "AO52-Domestic Grant", 0.0, 0.0], [61, "AO5216", "AO5216-Financial Assistance", 0.0, 0.0], [62, "AO52", "AO52 Total Domestic Grant", 0.0, 0.0], [63, "A061", "A061-Scholarship", 0.0, 0.0], [64, "A06104", "A06104-S. Bonus", 0.0, 0.0], [65, "A061", "A061-Total Scholarship", 0.0, 0.0], [66, "A063", "A063-Entertainment & Gifts", 0.0, 0.0], [67, "A06301", "A06301-Entertainment & Gifts", 0.0, 0.0], [68, "A063", "A063 Total Entertainment & Gifts", 0.0, 0.0], [69, "A013", "A013- Repairs and Maintenance of D/Goods", 0.0, 0.0], [70, "A13001", "A13001-Repair of Transport", 0.0, 0.0], [71, "A13101", "A13101-Repair of Machinery/Equipments", 0.0, 6212.0], [72, "A13201", "A13201-Repair of Furniture & Fixtures", 0.0, 11820.0], [73, "A013", "Total Repair And Maintenance", 0.0, 18032.0], [74, "", "AAA-Non Salary Sub Total:", 0.0, 508831.0]];

function unpackRawRows(raw: [number, string, string, number, number][]): HeadBudgetRow[] {
  return raw.map(([sheetRow, code, headName, opening, receipts]) => ({
    sheetRow,
    code,
    headName,
    opening,
    receipts,
    totalAllocated: opening + receipts,
  }));
}

export const NS_BASELINE_HEADS: HeadBudgetRow[] = unpackRawRows(NS_RAW_BASELINE);
export const AAA_BASELINE_HEADS: HeadBudgetRow[] = unpackRawRows(AAA_RAW_BASELINE);

// In-memory runtime caches
let memoryNsRows: HeadBudgetRow[] | null = null;
let memoryAaaRows: HeadBudgetRow[] | null = null;

export function isNsBankAccount(bank?: string): boolean {
  if (!bank) return false;
  const b = bank.toLowerCase();
  return (
    b.includes('non salary') ||
    b.includes('non-salary') ||
    b.includes('ns-') ||
    b === 'ns'
  );
}

export function isAaaBankAccount(bank?: string): boolean {
  if (!bank) return false;
  const b = bank.toLowerCase();
  return (
    b.includes('aaa') ||
    b === 'aa' ||
    b.includes('assan') ||
    b.includes('assignment')
  );
}

export function getNsHeadBudgetRows(): HeadBudgetRow[] {
  if (memoryNsRows && memoryNsRows.length > 0) return memoryNsRows;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NS_HEADS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryNsRows = parsed;
        return parsed;
      }
    }
  } catch {}
  return NS_BASELINE_HEADS;
}

export function getAaaHeadBudgetRows(): HeadBudgetRow[] {
  if (memoryAaaRows && memoryAaaRows.length > 0) return memoryAaaRows;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_AAA_HEADS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryAaaRows = parsed;
        return parsed;
      }
    }
  } catch {}
  return AAA_BASELINE_HEADS;
}

function cleanStr(s: string): string {
  return (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * Robustly matches an accountHead (from select dropdown or voucher)
 * to an entry in the sheet budget rows (rows 6 to 74).
 */
export function matchHeadInSheetList(
  accountHead: string,
  sheetRows: HeadBudgetRow[]
): HeadBudgetRow | null {
  if (!accountHead || !accountHead.trim()) return null;
  const ahClean = cleanStr(accountHead);
  const isPlacement = ahClean.includes('placement');

  // Extract head code (e.g. A03101, A03202, A13101)
  const parts = accountHead.split('-');
  let primaryCode = '';
  if (parts[0] && (parts[0].startsWith('A') || parts[0].startsWith('a'))) {
    primaryCode = parts[0].trim().toUpperCase();
  } else if (isPlacement && parts.length > 1 && (parts[1].startsWith('A') || parts[1].startsWith('a'))) {
    primaryCode = parts[1].trim().toUpperCase() + '-P';
  }

  // Filter out subtotal / summary category rows (e.g. Total Communications, Non Salary Sub Total)
  const operationalRows = sheetRows.filter((h) => {
    const n = h.headName.toLowerCase();
    return (
      !n.includes('total') &&
      !n.startsWith('non salary sub total') &&
      !n.startsWith('aaa-non salary sub total')
    );
  });

  // 1. Direct exact clean match
  for (const h of operationalRows) {
    if (cleanStr(h.headName) === ahClean) return h;
  }

  // 2. Primary code match
  if (primaryCode) {
    for (const h of operationalRows) {
      const hCode = h.code.trim().toUpperCase();
      if (hCode === primaryCode) return h;
      if (primaryCode.endsWith('-P') && hCode === primaryCode.replace('-P', '')) {
        if (cleanStr(h.headName).includes('placement')) return h;
      }
    }
  }

  // 3. Substring matching with placement disambiguation
  for (const h of operationalRows) {
    const hClean = cleanStr(h.headName);
    const rowIsPlacement = hClean.includes('placement') || h.code.toUpperCase().includes('-P');
    if (isPlacement === rowIsPlacement) {
      if (ahClean.includes(hClean) || hClean.includes(ahClean)) {
        return h;
      }
      if (h.code && h.code.length >= 5 && ahClean.includes(cleanStr(h.code))) {
        return h;
      }
    }
  }

  return null;
}

/**
 * Standard CSV parser handling commas inside quotes, CRLF, etc.
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === String.fromCharCode(13) || char === String.fromCharCode(10)) && !insideQuotes) {
      if (char === String.fromCharCode(13) && nextChar === String.fromCharCode(10)) {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

function parseNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).replace(/,/g, '').trim();
  if (s === '-' || s === '') return 0;
  if (s.startsWith('(') && s.endsWith(')')) {
    const n = parseFloat(s.slice(1, -1));
    return isNaN(n) ? 0 : -n;
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Live fetch NS or AAA head rows from Google Sheet
 */
export async function fetchLiveHeadBudgets(gid: string): Promise<HeadBudgetRow[]> {
  const gvizUrl = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/gviz/tq?tqx=out:csv&gid=' + gid + '&_t=' + Date.now();
  const exportUrl = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/export?format=csv&gid=' + gid + '&_t=' + Date.now();

  let csvText = '';
  try {
    const res = await fetch(gvizUrl);
    if (res.ok) {
      csvText = await res.text();
    }
  } catch {}

  if (!csvText) {
    try {
      const res = await fetch(exportUrl);
      if (res.ok) {
        csvText = await res.text();
      }
    } catch {}
  }

  if (!csvText) {
    console.warn('Could not fetch live CSV for sheet gid=' + gid);
    return gid === AAA_SHEET_GID ? getAaaHeadBudgetRows() : getNsHeadBudgetRows();
  }

  const rows = parseCsvRows(csvText);
  if (!rows || rows.length < 6) {
    console.warn('Empty or short CSV returned for sheet gid=' + gid);
    return gid === AAA_SHEET_GID ? getAaaHeadBudgetRows() : getNsHeadBudgetRows();
  }

  const resultRows: HeadBudgetRow[] = [];
  // Rows 6 to 74 in 1-based indexing correspond to indices 5 to 73 in 0-based array
  for (let r = 5; r < Math.min(74, rows.length); r++) {
    const row = rows[r];
    const code = row[2] || '';
    const headName = row[3] || '';
    const opening = parseNum(row[4]);
    const receipts = parseNum(row[17]);

    if (code || headName) {
      resultRows.push({
        sheetRow: r + 1,
        code: code.trim(),
        headName: headName.trim(),
        opening,
        receipts,
        totalAllocated: opening + receipts,
      });
    }
  }

  if (resultRows.length > 0) {
    if (gid === NS_SHEET_GID) {
      memoryNsRows = resultRows;
      try {
        localStorage.setItem(STORAGE_KEY_NS_HEADS, JSON.stringify(resultRows));
      } catch {}
    } else if (gid === AAA_SHEET_GID) {
      memoryAaaRows = resultRows;
      try {
        localStorage.setItem(STORAGE_KEY_AAA_HEADS, JSON.stringify(resultRows));
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gvtiw_head_budgets_updated', { detail: { gid } }));
    }
    return resultRows;
  }

  return gid === AAA_SHEET_GID ? getAaaHeadBudgetRows() : getNsHeadBudgetRows();
}

/**
 * Concurrently syncs both NS and AAA head balances live from Google Sheets
 */
export async function syncLiveNsAndAaaHeadBudgets(): Promise<{
  ns: HeadBudgetRow[];
  aaa: HeadBudgetRow[];
}> {
  try {
    const [ns, aaa] = await Promise.all([
      fetchLiveHeadBudgets(NS_SHEET_GID),
      fetchLiveHeadBudgets(AAA_SHEET_GID),
    ]);
    return { ns, aaa };
  } catch (err) {
    console.warn('Error in syncLiveNsAndAaaHeadBudgets:', err);
    return {
      ns: getNsHeadBudgetRows(),
      aaa: getAaaHeadBudgetRows(),
    };
  }
}

// Map of Allocated Budget Ceilings for every Account Head (derived directly from INITIAL_ACCOUNTS)
export const HEAD_ALLOCATIONS: Record<string, number> = {
  'A00000PF-PUPIL FUND': 408588.0 + 77717.0, // 486,305.00
  'A00000SC-SHORT COURSE': 251567.0,
  'A00000SS-STUDENT SEC.': 357709.0,
  'A00000TFC-TEVTA FEE COL.': 77717.0,
  'A00000DW-DAILY WAGES-SALARIES': 182127.0,
  'A03933-SERVICE CHARGES': 373946.0,
  'A03302-WATER CHARGES': -15730.0,
  'A03202-TELEPHONE & TRUNK CHARGES': -59990.0,
  'A03303-ELECTRICITY CHARGES': -230811.0,
  'A03101-BANK CHARGES': 1407.0,
  'A03201-POSTAGE & TELEGRAPH': 16350.0,
  'A03301-SUI GAS CHARGES': -40275.0,
  'A03805-TA/DA CHARGES': -53695.0,
  'A03808-CONVEYANCE CHARGES': -12175.0,
  'A03901-STATIONERY CHARGES': -3530.0,
  'A03902-PRINTING CHARGES': 6975.0,
  'A03907-PUBLICITY ADVERTISING CHARGES': -40419.0,
  'A03970-OTHERS (MISC. CHARGES)': -190335.0,
  'A13101-REPAIR OF MACHINERY/EQUIPMENTS': 8434.0,
  'A13201-REPAIR OF FURNITURE & FIXTURES': 89238.0,
  'A03807-POL CHARGES': -8718.0,
  'A03942-COST OF OTHER STORES / TRAINING MATERIALS': -40040.0,
  'A03806-TRANSPORTATION OF GOODS': -8500.0,
  'A13301-REPAIR OF BUILDING (AR/SR)': 1834.0,
  'A03905-Newspapers & Books': 0.0,
  'PLACEMENT-A03918-JOB FAIR & EXHIBITION': 4942.0,
  'PLACEMENT-A03903- CONFRENCE SEMINAR & WORKSHOP': -43972.0,
  'PLACEMENT-A03202-TELEPHONE & TRUNK CALLS': 54500.0,
  'PLACEMENT-A03807-POL': 14834.0,
  'A00000NTTM-NAVTTC COOK-TRAINING MATERIAL': 527067.0,
  'A00000NTTR-NAVTTC COOK-TEACHER REMUNERATION': 463120.0,
  'A00000NTADC-NAVTTC COOK-ADVERTISING COST': -9293.0,
  'A00000NTOH-NAVTTC COOK-OVERHEADS': 190075.0,
  'A00000NTADM-NAVTTC COOK-ADMIN COST': 52097.0,
  'A00000CM2-DATA ANALYTICS-CMSDI': 332511.0,
  'A00000CM1-GRAPHIC DESIGN-HIGH TECH': 451543.0,
  'A00000II-NS INTEREST INCOME': 137492.0,
  'A00000FG-SALE OF FINISHED PROJECTS': 112090.0,
  'A00000LN-LOAN ACC.': 0.0,
  'A00000FW-FEE WAIVER BUDGET (2020-21)': 114108.0,
  'A00000WB-FUND AGAINST DLI-4 WB PROJECT': 0.0,
  'A00000AA-AAA': 1460000.0,
};

INITIAL_ACCOUNTS.forEach((acc) => {
  if (HEAD_ALLOCATIONS[acc.head] === undefined) {
    HEAD_ALLOCATIONS[acc.head] = acc.opening + acc.reappr + acc.receipts;
  }
});

function matchOtherBankAccount(vAcct: string, targetAcct: string): boolean {
  if (!vAcct || !targetAcct) return false;
  if (vAcct === targetAcct) return true;
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/payment of\s+/g, '')
      .replace(/\s+for\s+20\d\d-20\d\d/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return clean(vAcct) === clean(targetAcct);
}

/**
 * Intelligent Head Available Balance Computer:
 * - When bankAccount is Non-Salary (NS):
 *     allocated = NS Opening (Col E6:E74) + NS Receipts (Col R6:R74)
 *     expense = NS ONLY vouchers head gross expenses
 *     available = allocated - expense
 * - When bankAccount is AAA (Assan Assignment Account):
 *     allocated = AAA Opening (Col E6:E74) + AAA Receipts (Col R6:R74)
 *     expense = AAA ONLY vouchers head gross expenses
 *     available = allocated - expense
 * - When bankAccount is any other account:
 *     allocated = default allocation ceiling
 *     expense = matching voucher head gross expenses
 *     available = allocated - expense
 */
export function computeHeadAvailableBalance(params: {
  accountHead: string;
  bankAccount: string;
  allVouchers: MasterVoucher[];
  excludeVoucherSrNo?: number;
  defaultCeilings?: Record<string, number>;
}): HeadBalanceComputation {
  const {
    accountHead,
    bankAccount,
    allVouchers,
    excludeVoucherSrNo,
    defaultCeilings = HEAD_ALLOCATIONS,
  } = params;

  const isNs = isNsBankAccount(bankAccount);
  const isAaa = isAaaBankAccount(bankAccount);

  if (isNs) {
    const nsRows = getNsHeadBudgetRows();
    const matched = matchHeadInSheetList(accountHead, nsRows);
    const opening = matched ? matched.opening : (defaultCeilings[accountHead] ?? 0);
    const receipts = matched ? matched.receipts : 0;
    const allocatedCeiling = opening + receipts;

    // Filter expenses to NS bank account ONLY
    const headExpenditure = allVouchers
      .filter((v) => {
        if (v.accountHead !== accountHead) return false;
        if (excludeVoucherSrNo !== undefined && v.srNo === excludeVoucherSrNo) return false;
        return isNsBankAccount(v.bankAccount);
      })
      .reduce((sum, v) => sum + (v.billAmountGross || 0), 0);

    const availableBalance = allocatedCeiling - headExpenditure;

    return {
      accountHead,
      bankAccount,
      isNs: true,
      isAaa: false,
      opening,
      receipts,
      allocatedCeiling,
      headExpenditure,
      availableBalance,
      sheetRow: matched?.sheetRow,
      sheetGid: NS_SHEET_GID,
      matchedCode: matched?.code,
      matchedName: matched?.headName,
    };
  }

  if (isAaa) {
    const aaaRows = getAaaHeadBudgetRows();
    const matched = matchHeadInSheetList(accountHead, aaaRows);
    const opening = matched ? matched.opening : 0;
    const receipts = matched ? matched.receipts : 0;
    const allocatedCeiling = opening + receipts;

    // Filter expenses to AAA bank account ONLY
    const headExpenditure = allVouchers
      .filter((v) => {
        if (v.accountHead !== accountHead) return false;
        if (excludeVoucherSrNo !== undefined && v.srNo === excludeVoucherSrNo) return false;
        return isAaaBankAccount(v.bankAccount);
      })
      .reduce((sum, v) => sum + (v.billAmountGross || 0), 0);

    const availableBalance = allocatedCeiling - headExpenditure;

    return {
      accountHead,
      bankAccount,
      isNs: false,
      isAaa: true,
      opening,
      receipts,
      allocatedCeiling,
      headExpenditure,
      availableBalance,
      sheetRow: matched?.sheetRow,
      sheetGid: AAA_SHEET_GID,
      matchedCode: matched?.code,
      matchedName: matched?.headName,
    };
  }

  // Other Bank Accounts (Pupil Fund, Short Course, Securities, Fee Collection):
  // Standard allocation ceiling and matching account expenses
  const allocatedCeiling = defaultCeilings[accountHead] ?? 0;
  const headExpenditure = allVouchers
    .filter((v) => {
      if (v.accountHead !== accountHead) return false;
      if (excludeVoucherSrNo !== undefined && v.srNo === excludeVoucherSrNo) return false;
      return matchOtherBankAccount(v.bankAccount, bankAccount);
    })
    .reduce((sum, v) => sum + (v.billAmountGross || 0), 0);

  const availableBalance = allocatedCeiling - headExpenditure;

  return {
    accountHead,
    bankAccount,
    isNs: false,
    isAaa: false,
    opening: 0,
    receipts: 0,
    allocatedCeiling,
    headExpenditure,
    availableBalance,
  };
}
