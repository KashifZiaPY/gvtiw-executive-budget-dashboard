import { formatCNIC } from '../lib/formatters';

export interface TfcChallanRecord {
  srNo: number;
  region: string;
  district: string;
  city: string;
  collegeId: string;
  collegeType: string;
  courseId: string;
  collegeName: string;
  courseName: string;
  courseType: string;
  challanId: string;
  cnic: string;
  name: string;
  rollOrCode: string;
  traineeName: string;
  guardianName: string;
  courseAbbreviation: string;
  paymentType: string;
  admissionTuitionRegFee: number;
  pupilFee25Percent: number;
  pupilFee75Percent: number;
  instituteSecurity: number;
  otherFee: number;
  totalAmount: number;
  headOfficeTotal: number;
  instituteTotal: number;
  expiryDate: string;
  accountNumber: string;
  challanCreatedBy: string;
  challanStatus: string;
  challanPaymentDate: string;
}

export function parseTraineeNameField(rawName: string): {
  courseAbbreviation: string;
  rollOrCode: string;
  traineeName: string;
  guardianName: string;
} {
  const parts = String(rawName || '').split('-').map((p) => p.trim());
  let courseAbbr = 'OTHER';
  let rollCode = '';
  let tName = '';
  let gName = '';

  const p0 = parts[0] || '';
  const upper0 = p0.toUpperCase();

  if (upper0.startsWith('MVII') || upper0.startsWith('MV2')) {
    courseAbbr = 'MVii';
  } else if (upper0.startsWith('MVI') || upper0.startsWith('MV1')) {
    courseAbbr = 'MVi';
  } else if (upper0.startsWith('ADDM')) {
    courseAbbr = 'ADDM';
  } else if (upper0.startsWith('BTE')) {
    courseAbbr = 'BTE';
  } else if (upper0.startsWith('BT')) {
    courseAbbr = 'BT';
  } else if (upper0.startsWith('CK')) {
    courseAbbr = 'CK';
  } else if (upper0.startsWith('CO')) {
    courseAbbr = 'CO';
  } else if (upper0.startsWith('DM')) {
    courseAbbr = 'DM';
  } else if (upper0.startsWith('FD')) {
    courseAbbr = 'FD';
  } else if (upper0.startsWith('TUV')) {
    courseAbbr = 'TUV';
  }

  // Handle standard format: CourseSessionPrefix-RollNo-TraineeName-FatherName
  // e.g., MVi0926-01-Malaika-M Iqbal -> Roll: MVi0926-01, Trainee: Malaika, Guardian: M Iqbal
  // e.g., MVii0926-01-Noor Fatima D/O Sabir -> Roll: MVii0926-01, Trainee: Noor Fatima, Guardian: Sabir
  // e.g., TUV0826-BT02-Sania Rafique-Muhammad Rafique -> Roll: TUV0826-BT02, Trainee: Sania Rafique, Guardian: Muhammad Rafique
  if (parts.length >= 4) {
    rollCode = `${parts[0]}-${parts[1]}`;
    tName = parts[2];
    gName = parts.slice(3).join(' - ');
  } else if (parts.length === 3) {
    rollCode = `${parts[0]}-${parts[1]}`;
    tName = parts[2];
    if (tName.includes(' D/O ') || tName.includes(' d/o ')) {
      const sub = tName.split(/ D\/O | d\/o /i);
      tName = sub[0].trim();
      gName = sub[1]?.trim() || '—';
    } else {
      gName = '—';
    }
  } else if (parts.length === 2) {
    rollCode = parts[0];
    tName = parts[1];
    if (tName.includes(' D/O ') || tName.includes(' d/o ')) {
      const sub = tName.split(/ D\/O | d\/o /i);
      tName = sub[0].trim();
      gName = sub[1]?.trim() || '—';
    } else {
      gName = '—';
    }
  } else {
    rollCode = parts[0] || '';
    tName = parts[0] || rawName;
    gName = '—';
  }

  // Further check D/O notation in tName if still present
  if (tName.includes(' D/O ') || tName.includes(' d/o ')) {
    const sub = tName.split(/ D\/O | d\/o /i);
    tName = sub[0].trim();
    if (!gName || gName === '—') gName = sub[1]?.trim() || '—';
  }

  return {
    courseAbbreviation: courseAbbr,
    rollOrCode: rollCode,
    traineeName: tName || rawName,
    guardianName: gName || '—',
  };
}

/**
 * Returns strictly clean course/trade abbreviation without session or roll numbers
 * e.g. 'MVi0926-01' -> 'MVi', 'MVii0926-02' -> 'MVii', 'ADDM0926-03' -> 'ADDM'
 */
export function getCleanTradeAbbreviation(c: {
  courseAbbreviation?: string;
  rollOrCode?: string;
  name?: string;
  courseName?: string;
}): string {
  if (c.courseAbbreviation && c.courseAbbreviation !== 'OTHER') {
    return c.courseAbbreviation;
  }
  const source = `${c.rollOrCode || ''} ${c.name || ''} ${c.courseName || ''}`.toUpperCase();
  if (source.includes('MVII') || source.includes('MV2')) return 'MVii';
  if (source.includes('MVI') || source.includes('MV1')) return 'MVi';
  if (source.includes('ADDM')) return 'ADDM';
  if (source.includes('BTE')) return 'BTE';
  if (source.includes('BT')) return 'BT';
  if (source.includes('CK')) return 'CK';
  if (source.includes('CO')) return 'CO';
  if (source.includes('DM')) return 'DM';
  if (source.includes('FD')) return 'FD';
  if (source.includes('TUV')) return 'TUV';
  if (c.rollOrCode) {
    const letters = c.rollOrCode.replace(/[0-9\-_]+.*$/, '').trim();
    if (letters) return letters;
  }
  return c.courseAbbreviation || 'OTHER';
}

// Default empty array when starting fresh before fetching from Google Sheets
export const INITIAL_TFC_PORTAL_CHALLANS: TfcChallanRecord[] = [];

/**
 * Parses 2D array of raw values returned from Google Sheet 'BOP_TFC_RAW'
 * Automatically removes duplicates by Challan ID
 */
export function parseGoogleSheetRawToTfcChallans(rawRows: (string | number)[][]): TfcChallanRecord[] {
  if (!Array.isArray(rawRows) || rawRows.length < 2) return [];

  const headers = rawRows[0].map((h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const records: TfcChallanRecord[] = [];
  const seenChallans = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length < 5) continue;

    const getCol = (exactName: string, fallbackIdx: number): string => {
      const target = exactName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const idx = headers.indexOf(target);
      if (idx !== -1 && row[idx] !== undefined) return String(row[idx]).trim().replace(/^"|"$/g, '');
      return row[fallbackIdx] !== undefined ? String(row[fallbackIdx]).trim().replace(/^"|"$/g, '') : '';
    };

    const getNum = (exactName: string, fallbackIdx: number): number => {
      const valStr = getCol(exactName, fallbackIdx);
      const cleaned = valStr.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const challanId = getCol('challanid', 10);
    // Ignore empty or dummy rows
    if (!challanId && !getCol('name', 12)) continue;

    // Deduplication by Challan ID
    if (challanId && seenChallans.has(challanId)) {
      continue;
    }
    if (challanId) {
      seenChallans.add(challanId);
    }

    const rawName = getCol('name', 12);
    const parsedName = parseTraineeNameField(rawName);

    const record: TfcChallanRecord = {
      srNo: parseInt(getCol('srno', 0), 10) || records.length + 1,
      region: getCol('region', 1) || 'North',
      district: getCol('district', 2) || 'Faisalabad',
      city: getCol('city', 3) || 'Faisalabad',
      collegeId: getCol('collegeid', 4) || '33028',
      collegeType: getCol('collegetype', 5) || 'Vocational',
      courseId: getCol('courseid', 6) || '',
      collegeName: getCol('collegename', 7) || 'Govt. Vocational Training Institute (W), Samanabad, Faisalabad',
      courseName: getCol('coursename', 8) || '',
      courseType: getCol('coursetype', 9) || 'Regular',
      challanId: challanId || '',
      cnic: formatCNIC(getCol('cnic', 11)),
      name: rawName,
      ...parsedName,
      paymentType: getCol('paymenttype', 13) || 'Full Challan',
      admissionTuitionRegFee: getNum('admissiontuitionregfee', 14),
      pupilFee25Percent: getNum('25percentpupilfee', 15),
      pupilFee75Percent: getNum('75percentpupilfee', 16),
      instituteSecurity: getNum('institutesecurity', 17),
      otherFee: getNum('otherfee', 18),
      totalAmount: getNum('totalamount', 19),
      headOfficeTotal: getNum('headofficetotal', 20),
      instituteTotal: getNum('institutetotal', 21),
      expiryDate: getCol('expirydate', 22) || '',
      accountNumber: getCol('accountnumber', 23) || '6580027832200011',
      challanCreatedBy: getCol('challancreatedby', 24) || 'GVTI33028',
      challanStatus: getCol('challanstatus', 25) || 'Paid',
      challanPaymentDate: getCol('challanpaymentdate', 26) || '',
    };

    records.push(record);
  }

  return records;
}

export const COURSE_TITLE_MAP: Record<string, string> = {
  MVi: 'Matric Vocational 9th (1st Year)',
  MVii: 'Matric Vocational 10th (2nd Year)',
  ADDM: 'Advance Diploma Dress Making (1-Year Conventional)',
  FD: 'Fashion Designing (1-Year CBT)',
  CO: 'Computer Operator (6-Month CBT)',
  DM: 'Dress Making (6-Month CBT)',
  BT: 'Beautician (Morning 6-Month CBT)',
  BTE: 'Beautician Self-Finance (Evening)',
  CK: 'Cook / Chef (6-Month CBT)',
  TUV: 'TUV Rheinland Technical / IT Certification',
  OTHER: 'General / Other Trainee Course',
};

export type OtherFeeClassification = 'SELF_FINANCE_BTE' | 'TUV_CERTIFICATION' | 'BOARD_CHARGES';

export interface OtherFeeDetails {
  classification: OtherFeeClassification;
  label: string;
  targetAccountNo: string;
  targetAccountName: string;
  actionRequired: string;
  notes: string;
}

export function classifyOtherFee(courseAbbr: string): OtherFeeDetails {
  if (courseAbbr === 'BTE') {
    return {
      classification: 'SELF_FINANCE_BTE',
      label: 'Self-Finance Course Fee (BTE)',
      targetAccountNo: '6580027832200033',
      targetAccountName: 'BOP Short Course A/C',
      actionRequired: 'Issue Cheque from TFC to Short Course Account',
      notes: 'Full fee (Rs. 10,012/trainee) belongs to Short Course fund',
    };
  }
  if (courseAbbr === 'TUV') {
    return {
      classification: 'TUV_CERTIFICATION',
      label: 'TUV Rheinland Certification Fee',
      targetAccountNo: 'Pending Directive / TEVTA Centralized',
      targetAccountName: 'TFC Retained / Pending TEVTA Share',
      actionRequired: 'Retained in TFC Pending TEVTA Transfer Policy',
      notes: 'One-time certification fee, to be decided (likely part of TEVTA share)',
    };
  }
  return {
    classification: 'BOARD_CHARGES',
    label: 'Board Registration & Examination Charges',
    targetAccountNo: 'Punjab Board of Technical Education (PBTE)',
    targetAccountName: 'Retained in TFC for PBTE / Board Fee',
    actionRequired: 'Retained in TFC to pay PBTE / Trade Testing Board',
    notes: 'Examination & registration charges for MV, FD, CO, CK, BT Morning & DM',
  };
}

const STORAGE_KEY_TFC_CHALLANS = 'gvtiw_tfc_challans_v5';

export function getStoredTfcChallans(): TfcChallanRecord[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_TFC_CHALLANS);
    if (!raw) {
      raw = localStorage.getItem('gvtiw_tfc_challans_v4');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: any) => ({
          ...c,
          cnic: formatCNIC(c.cnic),
        }));
      }
    }
  } catch {}
  return INITIAL_TFC_PORTAL_CHALLANS;
}

export function saveStoredTfcChallans(records: TfcChallanRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TFC_CHALLANS, JSON.stringify(records));
  } catch {}
}

/**
 * Net Cash Book Posting Amount: Gross collection less central TEVTA share (100% admission/tuition + 25% PF)
 * Remaining net amount credited to institute account / posted in TFC Cash Book receipts
 */
export function getNetCashBookReceiptAmount(c: TfcChallanRecord): number {
  const tevtaShare = (c.admissionTuitionRegFee || 0) + (c.pupilFee25Percent || 0);
  return Math.max(0, (c.totalAmount || 0) - tevtaShare);
}

/**
 * Merges incoming challans into existing list, de-duplicating by challanId
 */
export function mergeTfcChallanRecords(
  existing: TfcChallanRecord[],
  incoming: TfcChallanRecord[]
): { merged: TfcChallanRecord[]; addedCount: number; updatedCount: number } {
  const map = new Map<string, TfcChallanRecord>();
  for (const item of existing) {
    const key = item.challanId ? String(item.challanId).trim() : `${item.cnic}-${item.name}`;
    map.set(key, item);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const item of incoming) {
    const key = item.challanId ? String(item.challanId).trim() : `${item.cnic}-${item.name}`;
    if (map.has(key)) {
      map.set(key, item);
      updatedCount++;
    } else {
      map.set(key, item);
      addedCount++;
    }
  }

  return {
    merged: Array.from(map.values()),
    addedCount,
    updatedCount,
  };
}

export function parseRawCsvToTfcChallans(csvText: string): TfcChallanRecord[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse CSV line handling quotes
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        values.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur.trim());
    return values;
  };

  const records: TfcChallanRecord[] = [];
  const header = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length < 15) continue;

    const getCol = (namePattern: string, fallbackIdx: number): string => {
      const idx = header.findIndex((h) => h.includes(namePattern));
      if (idx !== -1 && row[idx] !== undefined) return row[idx].replace(/^"|"$/g, '');
      return row[fallbackIdx] !== undefined ? row[fallbackIdx].replace(/^"|"$/g, '') : '';
    };

    const getNum = (namePattern: string, fallbackIdx: number): number => {
      const valStr = getCol(namePattern, fallbackIdx);
      const cleaned = valStr.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const rawName = getCol('name', 12);
    const parsedName = parseTraineeNameField(rawName);

    const record: TfcChallanRecord = {
      srNo: parseInt(getCol('srno', 0), 10) || i,
      region: getCol('region', 1) || 'North',
      district: getCol('district', 2) || 'Faisalabad',
      city: getCol('city', 3) || 'Faisalabad',
      collegeId: getCol('collegeid', 4) || '33028',
      collegeType: getCol('collegetype', 5) || 'Vocational',
      courseId: getCol('courseid', 6) || '',
      collegeName: getCol('collegename', 7) || 'Govt. Vocational Training Institute (W), Samanabad, Faisalabad',
      courseName: getCol('coursename', 8) || '',
      courseType: getCol('coursetype', 9) || 'Regular',
      challanId: getCol('challanid', 10) || '',
      cnic: formatCNIC(getCol('cnic', 11)),
      name: rawName,
      ...parsedName,
      paymentType: getCol('paymenttype', 13) || 'Full Challan',
      admissionTuitionRegFee: getNum('admission', 14),
      pupilFee25Percent: getNum('25percent', 15),
      pupilFee75Percent: getNum('75percent', 16),
      instituteSecurity: getNum('institutesecurity', 17),
      otherFee: getNum('otherfee', 18),
      totalAmount: getNum('totalamount', 19),
      headOfficeTotal: getNum('headofficetotal', 20),
      instituteTotal: getNum('institutetotal', 21),
      expiryDate: getCol('expirydate', 22) || '',
      accountNumber: getCol('accountnumber', 23) || '6580027832200011',
      challanCreatedBy: getCol('challancreatedby', 24) || 'GVTI33028',
      challanStatus: getCol('challanstatus', 25) || 'Paid',
      challanPaymentDate: getCol('challanpaymentdate', 26) || '',
    };

    if (record.challanId || record.traineeName) {
      records.push(record);
    }
  }

  return records;
}

export interface ChallanFeeBreakdown {
  admissionTuitionRegFee: number;
  pupilFee25Percent: number;
  totalTevtaDues: number;
  pupilFee75Percent: number;
  collegeSecurity: number;
  boardCharges: number;
  shortCourseSelfFinance: number;
  bankProfit: number;
  subTotalInstituteShare: number;
  totalAmountReceived: number;
  instituteShare: number;
  isBeauticianSelfFinance: boolean;
  isTuv: boolean;
}

/**
 * Computes official Fee Breakdown for BOP Fee Collection Account (6580027832200011):
 * 1. Beautician Self Finance (Total Fee Rs. 10,012 includes 1,500 Board Charges under Other head):
 *    - Base Course Fee: Rs. 8,512 (Short Course / Self Finance)
 *    - Board Dues: Any amount above 8,512 (Standard: 10,012 - 8,512 = 1,500).
 *    - Double/Excess Board Fee: If total > 10,012, all amount above 8,512 is board charges.
 * 2. TUV Course:
 *    - No Board Charges yet (Rs. 0 for Board, pending instructions for TEVTA Share transfer).
 * 3. All Other Regular Courses:
 *    - All amount in other head is charged for Board Fee (TTB / PBTE Charges).
 */
export function computeChallanFeeBreakdown(c: TfcChallanRecord): ChallanFeeBreakdown {
  const adm = Number(c.admissionTuitionRegFee) || 0;
  const pf25 = Number(c.pupilFee25Percent) || 0;
  const totalTevta = adm + pf25;

  const pf75 = Number(c.pupilFee75Percent) || 0;
  const security = Number(c.instituteSecurity) || 0;
  const rawOther = Number(c.otherFee) || 0;

  let board = 0;
  let selfFinance = 0;

  const courseAbbrUpper = (c.courseAbbreviation || '').toUpperCase();
  const courseNameUpper = (c.courseName || '').toUpperCase();
  const nameUpper = (c.name || '').toUpperCase();

  const isBeauticianSelfFinance =
    courseAbbrUpper === 'BTE' ||
    courseNameUpper.includes('BEAUTICIAN') ||
    courseNameUpper.includes('SELF FINANCE') ||
    courseNameUpper.includes('SELF-FINANCE') ||
    nameUpper.includes('BTE');

  const isTuv =
    courseAbbrUpper === 'TUV' ||
    courseNameUpper.includes('TUV') ||
    nameUpper.includes('TUV');

  let bankProfit = 0;

  if (isBeauticianSelfFinance) {
    if (rawOther > 8512) {
      board = rawOther - 8512;
      selfFinance = 8512;
    } else {
      board = 0;
      selfFinance = rawOther;
    }
  } else if (isTuv) {
    board = 0;
    selfFinance = 0;
    // TUV Certification: 100% placed into Other Income (Bank Profit / Any Other Income column)
    // as TEVTA head office share transfer policy is not decided yet.
    bankProfit = rawOther > 0 ? rawOther : (Number(c.totalAmount) || 0);
  } else {
    board = rawOther;
    selfFinance = 0;
  }

  const subTotalInst = pf75 + security + board + selfFinance + bankProfit;
  const totalReceived = totalTevta + subTotalInst;

  return {
    admissionTuitionRegFee: adm,
    pupilFee25Percent: pf25,
    totalTevtaDues: totalTevta,
    pupilFee75Percent: pf75,
    collegeSecurity: security,
    boardCharges: board,
    shortCourseSelfFinance: selfFinance,
    bankProfit,
    subTotalInstituteShare: subTotalInst,
    totalAmountReceived: totalReceived,
    instituteShare: subTotalInst,
    isBeauticianSelfFinance,
    isTuv,
  };
}
