import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TfcChallanRecord,
  computeChallanFeeBreakdown,
  COURSE_TITLE_MAP,
} from '../data/tfcChallanData';
import { formatPKR } from '../lib/formatters';
import { Printer, Landmark, ArrowRightLeft, ShieldCheck, Info } from 'lucide-react';

/**
 * Fee Share Transfer Statement — comprehensive distribution of the gross BOP TFC
 * inflow into its destination shares/accounts.
 *
 * Rules (per institute direction):
 *  - TEVTA share (Admission/Tuition 100% + 25% Pupil Fund) is auto-transferred by
 *    the BOP portal to TEVTA HQ for EVERY deposited trainee, with no cap.
 *  - BTE self-finance fee (Rs. 10,012/trainee): Rs. 12 is the TEVTA share (auto,
 *    already counted in the TEVTA share above), Rs. 1,500 is board dues (inside
 *    Board Charges), and the net course fee of Rs. 8,500/trainee is transferred
 *    in full by cheque to the BOP Short Course A/C (6580027832200033).
 *  - Board dues are payable to the board only for up to 25 registered trainees
 *    per trade. Board dues collected from trainees above the 25 cap are NOT
 *    payable to the board; they are transferred to the Pupil Funds Account
 *    together with the 75% Pupil Fund share.
 *  - Student security (100%) is transferred to the BOP Student Securities A/C
 *    (6580027832200044). Pupil Funds go to BOP Pupil Funds A/C (6580027832200022).
 *  - TUV Rheinland fee (100%) is transferred manually to the TEVTA share.
 *
 * Scope: the hub's course selection applies (transfers are executed trade-by-trade).
 * A selection short of every trade in the period yields a PARTIAL statement, labeled
 * as such on screen and in print, reconciling to the selected trades' gross.
 *
 * Read-only report: it only aggregates the challans it is given.
 */

const BOARD_CAP_PER_TRADE = 25;

const AC_TFC = '6580027832200011';
const AC_PUPIL_FUNDS = '6580027832200022';
const AC_SHORT_COURSE = '6580027832200033';
const AC_SECURITIES = '6580027832200044';

interface TfcTransferStatementProps {
  /** Challans in scope: period (date) filter + the hub course selection applied. */
  challans: TfcChallanRecord[];
  /** All challans of the period before the course selection — used to detect and label a partial statement. */
  fullPeriodChallans: TfcChallanRecord[];
  darkMode: boolean;
  periodLabel: string;
  /** Increment from the parent (hub PDF button) to trigger this statement's print. */
  printSignal?: number;
}

// Timestamp parser for challan payment dates ("Aug 03, 26" / "03-Aug-2026")
function parseTs(rawDate: string): number {
  if (!rawDate) return 0;
  const monMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const m1 = rawDate.match(/([A-Za-z]+)\s+(\d+),?\s+(\d+)/);
  if (m1) {
    const mon = monMap[m1[1].slice(0, 3).toLowerCase()] ?? 7;
    let yr = parseInt(m1[3], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, mon, parseInt(m1[2], 10)).getTime();
  }
  const m2 = rawDate.match(/(\d+)-([A-Za-z]+)-(\d+)/);
  if (m2) {
    const mon = monMap[m2[2].slice(0, 3).toLowerCase()] ?? 7;
    let yr = parseInt(m2[3], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, mon, parseInt(m2[1], 10)).getTime();
  }
  const t = Date.parse(rawDate);
  return Number.isNaN(t) ? 0 : t;
}

// Identity key for one trainee (mirrors the Course-Wise Matrix / Fee Register rule)
function studentKey(c: TfcChallanRecord): string {
  const cnicDigits = (c.cnic || '').replace(/\D/g, '');
  if (cnicDigits.length >= 8) return `CNIC:${cnicDigits}`;
  const nameKey = `${(c.traineeName || '').trim().toUpperCase()}|${(c.fatherName || '').trim().toUpperCase()}`;
  if (nameKey.replace('|', '').length >= 3) return `NF:${nameKey}`;
  if ((c.rollOrCode || '').trim()) return `ROLL:${c.rollOrCode.trim().toUpperCase()}`;
  return `CH:${c.id}`;
}

interface TradeRow {
  code: string;
  name: string;
  students: number;
  challans: number;
  gross: number;
  tevtaAuto: number;
  pupil75: number;
  security: number;
  boardCollected: number;
  boardPayable: number;
  excessBoard: number;
  excessStudents: number;
  scGross: number;
  tuv: number;
}

export const TfcTransferStatement: React.FC<TfcTransferStatementProps> = ({
  challans,
  fullPeriodChallans,
  darkMode,
  periodLabel,
  printSignal = 0,
}) => {
  const [showPrintPortal, setShowPrintPortal] = useState(false);

  const { rows, totals } = useMemo(() => {
    const byCourse = new Map<
      string,
      TradeRow & { studentBoard: Map<string, { board: number; firstTs: number }> }
    >();

    challans.forEach((c) => {
      const code = c.courseAbbreviation || '—';
      let row = byCourse.get(code);
      if (!row) {
        row = {
          code,
          name: COURSE_TITLE_MAP[code] || c.courseName || code,
          students: 0,
          challans: 0,
          gross: 0,
          tevtaAuto: 0,
          pupil75: 0,
          security: 0,
          boardCollected: 0,
          boardPayable: 0,
          excessBoard: 0,
          excessStudents: 0,
          scGross: 0,
          tuv: 0,
          studentBoard: new Map(),
        };
        byCourse.set(code, row);
      }
      const bd = computeChallanFeeBreakdown(c);
      row.challans += 1;
      row.gross += c.totalAmount || 0;
      row.tevtaAuto += bd.admissionTuitionRegFee + bd.pupilFee25Percent;
      row.pupil75 += bd.pupilFee75Percent;
      row.security += bd.collegeSecurity;
      row.boardCollected += bd.boardCharges;
      row.scGross += bd.shortCourseSelfFinance;
      row.tuv += bd.bankProfit;

      const key = studentKey(c);
      const ts = parseTs(c.challanPaymentDate);
      const existing = row.studentBoard.get(key);
      if (existing) {
        existing.board += bd.boardCharges;
        if (ts > 0 && (existing.firstTs === 0 || ts < existing.firstTs)) existing.firstTs = ts;
      } else {
        row.studentBoard.set(key, { board: bd.boardCharges, firstTs: ts });
      }
    });

    const tradeRows: TradeRow[] = Array.from(byCourse.values())
      .map((row) => {
        // Board dues payable for up to 25 trainees per trade (earliest depositors first;
        // dues are uniform per trainee in a trade, so the payable total is the same
        // whichever 25 are counted). Everything collected above that goes to Pupil Funds.
        const students = Array.from(row.studentBoard.values()).sort(
          (a, b) => a.firstTs - b.firstTs
        );
        const payableStudents = students.slice(0, BOARD_CAP_PER_TRADE);
        const boardPayable = payableStudents.reduce((s, x) => s + x.board, 0);
        return {
          code: row.code,
          name: row.name,
          students: row.studentBoard.size,
          challans: row.challans,
          gross: row.gross,
          tevtaAuto: row.tevtaAuto,
          pupil75: row.pupil75,
          security: row.security,
          boardCollected: row.boardCollected,
          boardPayable,
          excessBoard: row.boardCollected - boardPayable,
          excessStudents: Math.max(0, row.studentBoard.size - BOARD_CAP_PER_TRADE),
          scGross: row.scGross,
          tuv: row.tuv,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const totals: TradeRow = {
      code: 'TOTAL',
      name: 'GRAND TOTAL',
      students: tradeRows.reduce((s, r) => s + r.students, 0),
      challans: tradeRows.reduce((s, r) => s + r.challans, 0),
      gross: tradeRows.reduce((s, r) => s + r.gross, 0),
      tevtaAuto: tradeRows.reduce((s, r) => s + r.tevtaAuto, 0),
      pupil75: tradeRows.reduce((s, r) => s + r.pupil75, 0),
      security: tradeRows.reduce((s, r) => s + r.security, 0),
      boardCollected: tradeRows.reduce((s, r) => s + r.boardCollected, 0),
      boardPayable: tradeRows.reduce((s, r) => s + r.boardPayable, 0),
      excessBoard: tradeRows.reduce((s, r) => s + r.excessBoard, 0),
      excessStudents: tradeRows.reduce((s, r) => s + r.excessStudents, 0),
      scGross: tradeRows.reduce((s, r) => s + r.scGross, 0),
      tuv: tradeRows.reduce((s, r) => s + r.tuv, 0),
    };

    return { rows: tradeRows, totals };
  }, [challans]);

  // Scope of this statement: transfers are executed trade-by-trade, so the hub's
  // course selection applies. Anything short of every trade in the period is a
  // PARTIAL statement and is labeled as such on screen and in print.
  const scope = useMemo(() => {
    const all = new Map<string, string>();
    fullPeriodChallans.forEach((c) => {
      if (c.courseAbbreviation && !all.has(c.courseAbbreviation)) {
        all.set(
          c.courseAbbreviation,
          COURSE_TITLE_MAP[c.courseAbbreviation] || c.courseName || c.courseAbbreviation
        );
      }
    });
    const selectedCodes = new Set(challans.map((c) => c.courseAbbreviation));
    const excludedNames = Array.from(all.entries())
      .filter(([code]) => !selectedCodes.has(code))
      .map(([, name]) => name);
    const includedNames = Array.from(all.entries())
      .filter(([code]) => selectedCodes.has(code))
      .map(([, name]) => name);
    return {
      totalTrades: all.size,
      selectedTrades: selectedCodes.size,
      excludedNames,
      includedNames,
      fullGross: fullPeriodChallans.reduce((s, c) => s + (c.totalAmount || 0), 0),
      isPartial: selectedCodes.size !== all.size,
    };
  }, [challans, fullPeriodChallans]);

  // Transfer summary figures
  const autoTotal = totals.tevtaAuto;
  const pupilFundsTransfer = totals.pupil75 + totals.excessBoard;
  const manualTotal =
    pupilFundsTransfer + totals.security + totals.scGross + totals.boardPayable + totals.tuv;
  const reconciles = autoTotal + manualTotal === totals.gross;

  const doPrint = useCallback(() => {
    setShowPrintPortal(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrintPortal(false), 1000);
    }, 200);
  }, []);

  useEffect(() => {
    if (printSignal > 0) doPrint();
  }, [printSignal, doPrint]);

  const generatedOn = `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`;

  const thCls = `py-2.5 px-3 text-[11px] uppercase tracking-wider font-black ${
    darkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-200 text-slate-900'
  }`;
  const tdNum = 'py-2 px-3 text-right font-mono font-semibold';
  const cardCls = `rounded-xl border overflow-hidden shadow-sm ${
    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
  }`;
  const cardHeadCls = `p-4 border-b font-black text-sm flex items-center justify-between ${
    darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-100 text-slate-900 border-slate-300'
  }`;

  const renderSectionA = (print: boolean) => (
    <table className={`w-full text-left border-collapse ${print ? 'text-[10px]' : 'text-xs'}`}>
      <thead>
        <tr className={print ? 'bg-slate-200 font-black' : thCls}>
          <th className="py-2 px-3">Trade / Course</th>
          <th className="py-2 px-3 text-center">Trainees</th>
          <th className="py-2 px-3 text-right">Gross Deposited</th>
          <th className="py-2 px-3 text-right">TEVTA Share (Auto)</th>
          <th className="py-2 px-3 text-right">Pupil Fund 75%</th>
          <th className="py-2 px-3 text-right">Security 100%</th>
          <th className="py-2 px-3 text-right">Board Charges</th>
          <th className="py-2 px-3 text-right">Short Course Fee</th>
          <th className="py-2 px-3 text-right">TUV Fee</th>
        </tr>
      </thead>
      <tbody className={print ? '' : `divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
        {rows.map((r) => (
          <tr key={r.code} className={print ? 'border-b border-slate-200' : darkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}>
            <td className="py-2 px-3 font-bold">
              {r.name} <span className="font-mono text-[10px] opacity-60">({r.code})</span>
            </td>
            <td className="py-2 px-3 text-center font-mono font-bold">{r.students}</td>
            <td className={tdNum}>{formatPKR(r.gross, false)}</td>
            <td className={tdNum}>{formatPKR(r.tevtaAuto, false)}</td>
            <td className={tdNum}>{formatPKR(r.pupil75, false)}</td>
            <td className={tdNum}>{r.security > 0 ? formatPKR(r.security, false) : '—'}</td>
            <td className={tdNum}>{r.boardCollected > 0 ? formatPKR(r.boardCollected, false) : '—'}</td>
            <td className={tdNum}>{r.scGross > 0 ? formatPKR(r.scGross, false) : '—'}</td>
            <td className={tdNum}>{r.tuv > 0 ? formatPKR(r.tuv, false) : '—'}</td>
          </tr>
        ))}
        <tr className={print ? 'bg-slate-200 font-black border-t-2 border-slate-500' : `font-black ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-900'}`}>
          <td className="py-2.5 px-3 uppercase tracking-wider">Grand Total</td>
          <td className="py-2.5 px-3 text-center font-mono">{totals.students}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.gross, false)}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.tevtaAuto, false)}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.pupil75, false)}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.security, false)}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.boardCollected, false)}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.scGross, false)}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.tuv, false)}</td>
        </tr>
      </tbody>
    </table>
  );

  const renderSectionB = (print: boolean) => (
    <table className={`w-full text-left border-collapse ${print ? 'text-[10px]' : 'text-xs'}`}>
      <thead>
        <tr className={print ? 'bg-slate-200 font-black' : thCls}>
          <th className="py-2 px-3">Trade / Course</th>
          <th className="py-2 px-3 text-center">Trainees</th>
          <th className="py-2 px-3 text-center">Registered (Max 25)</th>
          <th className="py-2 px-3 text-center">Excess Trainees</th>
          <th className="py-2 px-3 text-right">Board Collected</th>
          <th className="py-2 px-3 text-right">Payable to Board</th>
          <th className="py-2 px-3 text-right">Excess → Pupil Funds</th>
        </tr>
      </thead>
      <tbody className={print ? '' : `divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
        {rows.map((r) => (
          <tr
            key={r.code}
            className={
              print
                ? 'border-b border-slate-200'
                : r.excessBoard > 0
                  ? darkMode
                    ? 'bg-amber-950/20'
                    : 'bg-amber-50'
                  : darkMode
                    ? 'hover:bg-slate-900/50'
                    : 'hover:bg-slate-50'
            }
          >
            <td className="py-2 px-3 font-bold">
              {r.name} <span className="font-mono text-[10px] opacity-60">({r.code})</span>
            </td>
            <td className="py-2 px-3 text-center font-mono font-bold">{r.students}</td>
            <td className="py-2 px-3 text-center font-mono">{Math.min(r.students, BOARD_CAP_PER_TRADE)}</td>
            <td className="py-2 px-3 text-center font-mono font-bold">{r.excessStudents > 0 ? r.excessStudents : '—'}</td>
            <td className={tdNum}>{r.boardCollected > 0 ? formatPKR(r.boardCollected, false) : '—'}</td>
            <td className={tdNum}>{r.boardPayable > 0 ? formatPKR(r.boardPayable, false) : '—'}</td>
            <td className={`${tdNum} font-black ${r.excessBoard > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>
              {r.excessBoard > 0 ? formatPKR(r.excessBoard, false) : '—'}
            </td>
          </tr>
        ))}
        <tr className={print ? 'bg-slate-200 font-black border-t-2 border-slate-500' : `font-black ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-900'}`}>
          <td className="py-2.5 px-3 uppercase tracking-wider">Total</td>
          <td className="py-2.5 px-3 text-center font-mono">{totals.students}</td>
          <td className="py-2.5 px-3 text-center font-mono">
            {rows.reduce((s, r) => s + Math.min(r.students, BOARD_CAP_PER_TRADE), 0)}
          </td>
          <td className="py-2.5 px-3 text-center font-mono">{totals.excessStudents}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.boardCollected, false)}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.boardPayable, false)}</td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.excessBoard, false)}</td>
        </tr>
      </tbody>
    </table>
  );

  const transferRows: {
    group: 'AUTO' | 'MANUAL';
    title: string;
    basis: string;
    destination: string;
    amount: number;
  }[] = [
    {
      group: 'AUTO',
      title: 'TEVTA Centralized Share',
      basis: 'Admission / Tuition (100%) + 25% Pupil Fund — all trainees, no cap',
      destination: 'TEVTA Centralized Account (HQ Lahore)',
      amount: totals.tevtaAuto,
    },
    {
      group: 'MANUAL',
      title: 'Pupil Funds Transfer',
      basis: `Pupil Fund 75% (${formatPKR(totals.pupil75, false)}) + Excess board dues above 25/trade (${formatPKR(totals.excessBoard, false)})`,
      destination: `BOP Pupil Funds A/C (${AC_PUPIL_FUNDS})`,
      amount: pupilFundsTransfer,
    },
    {
      group: 'MANUAL',
      title: 'Student Securities Transfer',
      basis: 'Student caution money / security (100%)',
      destination: `BOP Student Securities A/C (${AC_SECURITIES})`,
      amount: totals.security,
    },
    {
      group: 'MANUAL',
      title: 'Short Course Transfer',
      basis: 'Net BTE self-finance course fee (Rs. 8,500/trainee) — transferred in full',
      destination: `BOP Short Course A/C (${AC_SHORT_COURSE})`,
      amount: totals.scGross,
    },
    {
      group: 'MANUAL',
      title: 'Board Dues Payable',
      basis: `PBTE / TTB board dues for registered trainees (max ${BOARD_CAP_PER_TRADE} per trade)`,
      destination: 'Punjab Board of Technical Education (PBTE) / TTB',
      amount: totals.boardPayable,
    },
    {
      group: 'MANUAL',
      title: 'TUV Fee → TEVTA Share',
      basis: 'TUV Rheinland certification fee (100%) — manual transfer to TEVTA',
      destination: 'TEVTA Centralized Account (HQ Lahore)',
      amount: totals.tuv,
    },
  ];

  const autoRowCount = transferRows.filter((t) => t.group === 'AUTO').length;

  const renderSectionC = (print: boolean) => (
    <table className={`w-full text-left border-collapse ${print ? 'text-[10px]' : 'text-xs'}`}>
      <thead>
        <tr className={print ? 'bg-slate-200 font-black' : thCls}>
          <th className="py-2 px-3 w-8">#</th>
          <th className="py-2 px-3">Transfer</th>
          <th className="py-2 px-3">Basis</th>
          <th className="py-2 px-3">Destination</th>
          <th className="py-2 px-3 text-right">Amount (PKR)</th>
        </tr>
      </thead>
      <tbody className={print ? '' : `divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
        <tr className={print ? 'bg-blue-50 font-black' : darkMode ? 'bg-blue-950/30' : 'bg-blue-50'}>
          <td colSpan={5} className="py-2 px-3 font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px]">
            A — Auto-Transferred by BOP Portal
          </td>
        </tr>
        {transferRows
          .filter((t) => t.group === 'AUTO')
          .map((t, i) => (
            <tr key={t.title} className={print ? 'border-b border-slate-200' : ''}>
              <td className="py-2 px-3 font-mono">{i + 1}</td>
              <td className="py-2 px-3 font-bold">{t.title}</td>
              <td className="py-2 px-3 opacity-80">{t.basis}</td>
              <td className="py-2 px-3 font-semibold">{t.destination}</td>
              <td className={tdNum}>{formatPKR(t.amount, false)}</td>
            </tr>
          ))}
        <tr className={print ? 'font-black border-b border-slate-300' : 'font-black'}>
          <td colSpan={4} className="py-2 px-3 text-right uppercase tracking-wider">Subtotal — Auto</td>
          <td className="py-2 px-3 text-right font-mono">{formatPKR(autoTotal, false)}</td>
        </tr>
        <tr className={print ? 'bg-emerald-50 font-black' : darkMode ? 'bg-emerald-950/30' : 'bg-emerald-50'}>
          <td colSpan={5} className="py-2 px-3 font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
            B — Manual Transfers from TFC (Issue Cheques from BOP TFC A/C {AC_TFC})
          </td>
        </tr>
        {transferRows
          .filter((t) => t.group === 'MANUAL')
          .map((t, i) => (
            <tr key={t.title} className={print ? 'border-b border-slate-200' : ''}>
              <td className="py-2 px-3 font-mono">{i + autoRowCount + 1}</td>
              <td className="py-2 px-3 font-bold">{t.title}</td>
              <td className="py-2 px-3 opacity-80">{t.basis}</td>
              <td className="py-2 px-3 font-semibold">{t.destination}</td>
              <td className={`${tdNum} font-black`}>{formatPKR(t.amount, false)}</td>
            </tr>
          ))}
        <tr className={print ? 'font-black border-b border-slate-300' : 'font-black'}>
          <td colSpan={4} className="py-2 px-3 text-right uppercase tracking-wider">Subtotal — Manual</td>
          <td className="py-2 px-3 text-right font-mono">{formatPKR(manualTotal, false)}</td>
        </tr>
        <tr className={print ? 'bg-slate-200 font-black border-t-2 border-slate-500' : `font-black ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-900'}`}>
          <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider">
            {scope.isPartial
              ? 'Total Accounted (Auto + Manual) = Gross of Selected Trades'
              : 'Total Accounted (Auto + Manual) = Gross TFC Inflow'}
          </td>
          <td className="py-2.5 px-3 text-right font-mono">{formatPKR(totals.gross, false)}</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
        }`}
      >
        <div className="flex items-start gap-3">
          <ArrowRightLeft className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <h3 className={`text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Fee Share Transfer Statement
            </h3>
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Complete distribution of fee deposited in BOP TFC A/C ({AC_TFC}) — Period: {periodLabel} •{' '}
              {totals.challans} challans • {totals.students} trainees •{' '}
              {scope.isPartial
                ? `Partial — ${scope.selectedTrades} of ${scope.totalTrades} trades selected`
                : `All ${scope.totalTrades} trades`}
            </p>
          </div>
        </div>
        <button
          onClick={doPrint}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / PDF Statement</span>
        </button>
      </div>

      {/* Partial-scope banner: a partial statement must never be mistaken for the complete one */}
      {scope.isPartial && (
        <div
          className={`p-4 rounded-xl border-2 text-xs flex items-start gap-3 ${
            darkMode
              ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
              : 'bg-amber-50 border-amber-500 text-amber-950'
          }`}
        >
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="font-medium">
            <strong className="text-sm font-black block mb-0.5">
              ⚠ PARTIAL STATEMENT — {scope.selectedTrades} of {scope.totalTrades} trades selected
            </strong>
            Transfer figures below cover <strong>only the selected trades</strong> (gross{' '}
            {formatPKR(totals.gross, false)} of the full-period gross {formatPKR(scope.fullGross, false)}).
            {scope.excludedNames.length > 0 && (
              <>
                {' '}Not included: <strong>{scope.excludedNames.join(' • ')}</strong>.
              </>
            )}{' '}
            Use Select All in the course filter for the complete statement.
          </div>
        </div>
      )}

      {/* Rules strip */}
      <div
        className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
          darkMode
            ? 'bg-teal-950/30 border-teal-500/40 text-teal-200'
            : 'bg-teal-50 border-teal-400 text-teal-950'
        }`}
      >
        <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1 font-medium">
          <p>
            <strong>TEVTA share</strong> (Admission/Tuition + 25% Pupil Fund) auto-transfers to TEVTA HQ for{' '}
            <strong>every</strong> deposited trainee — no cap. BTE self-finance (Rs. 10,012/trainee):{' '}
            <strong>Rs. 12 to TEVTA (auto)</strong>, Rs. 1,500 board fee inside board dues, and the net{' '}
            <strong>Rs. 8,500 in full</strong> by cheque to the Short Course A/C.
          </p>
          <p>
            <strong>Board dues</strong> are payable only for up to <strong>25 registered trainees per trade</strong>.
            Dues collected from trainees above 25 are <strong>not</strong> paid to the board — they move to the{' '}
            <strong>Pupil Funds Account</strong> along with the 75% Pupil Fund share.
          </p>
          <p>
            <strong>TUV fee (100%)</strong> is transferred manually to the TEVTA share. <strong>Security (100%)</strong>{' '}
            goes to the Student Securities A/C.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={cardCls}>
          <div className="p-8 text-center">
            <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              No trades selected
            </p>
            <p className={`text-xs font-medium mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              The course selection is empty, so there is nothing to state. Tick at least one trade — or Select
              All — in the course filter above.
            </p>
          </div>
        </div>
      ) : (
        <>
      {/* Section A */}
      <div className={cardCls}>
        <div className={cardHeadCls}>
          <span className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-teal-600" />
            <span>Section A — Trade-Wise Fee Distribution</span>
          </span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            Gross: {formatPKR(totals.gross, false)}
          </span>
        </div>
        <div className="overflow-x-auto">{renderSectionA(false)}</div>
      </div>

      {/* Section B */}
      <div className={cardCls}>
        <div className={cardHeadCls}>
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Section B — Board Dues Reconciliation (25-Trainee Cap per Trade)</span>
          </span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
            Excess → Pupil Funds: {formatPKR(totals.excessBoard, false)}
          </span>
        </div>
        <div className="overflow-x-auto">{renderSectionB(false)}</div>
      </div>

      {/* Section C */}
      <div className={cardCls}>
        <div className={cardHeadCls}>
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
            <span>Section C — Transfer Summary</span>
          </span>
          <span
            className={`text-xs font-black px-2 py-0.5 rounded-md ${
              !reconciles
                ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200'
                : scope.isPartial
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            {!reconciles
              ? '⚠ Does not reconcile'
              : scope.isPartial
                ? '✓ Reconciled for Selected Trades (Partial)'
                : '✓ Reconciled with Gross TFC Inflow'}
          </span>
        </div>
        <div className="overflow-x-auto">{renderSectionC(false)}</div>
      </div>
        </>
      )}

      {/* Print Portal */}
      {showPrintPortal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="print-transfer-portal"
            className="p-4 bg-white text-slate-900 font-sans"
            style={{ display: 'none' }}
          >
            <div className="border-b-2 border-teal-800 pb-3 mb-3 text-center">
              <h1 className="text-base font-black uppercase text-teal-950 tracking-wide">
                Govt. Vocational Training Institute for Women, Samanabad Faisalabad
              </h1>
              <p className="text-xs font-bold text-slate-700">
                Fee Share Transfer Statement — BOP Fee Collection (TFC) Account # {AC_TFC} (Bank of Punjab)
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2 px-2 border-t pt-1">
                <span>
                  <strong>Period:</strong> {periodLabel}
                </span>
                <span>
                  <strong>Challans:</strong> {totals.challans} • <strong>Trainees:</strong> {totals.students}
                </span>
                <span>
                  <strong>Gross Inflow:</strong> Rs. {formatPKR(totals.gross, false)}
                </span>
                <span>
                  <strong>Generated:</strong> {generatedOn}
                </span>
              </div>
              {scope.isPartial && (
                <p className="text-[11px] font-black text-slate-900 mt-2 uppercase text-left">
                  ⚠ Partial Statement — Selected Trades Only ({scope.selectedTrades} of {scope.totalTrades}):{' '}
                  {scope.includedNames.join(' • ')} | Full-Period Gross: Rs. {formatPKR(scope.fullGross, false)}
                </p>
              )}
            </div>

            <h2 className="text-xs font-black uppercase tracking-wider text-teal-900 mt-2 mb-1">
              Section A — Trade-Wise Fee Distribution
            </h2>
            {renderSectionA(true)}

            <h2 className="text-xs font-black uppercase tracking-wider text-teal-900 mt-4 mb-1">
              Section B — Board Dues Reconciliation (Payable for Max 25 Trainees per Trade; Excess to Pupil Funds)
            </h2>
            {renderSectionB(true)}

            <h2 className="text-xs font-black uppercase tracking-wider text-teal-900 mt-4 mb-1">
              Section C — Transfer Summary
            </h2>
            {renderSectionC(true)}

            <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
              Notes: (1) TEVTA share (Admission/Tuition + 25% Pupil Fund) is auto-transferred by the BOP portal to
              TEVTA HQ for every deposited trainee, without any cap. For BTE self-finance (Rs. 10,012/trainee) the
              TEVTA share is Rs. 12 per trainee (included in this share), the Rs. 1,500 board fee is included in
              board dues, and the net course fee of Rs. 8,500 per trainee is transferred in full to the Short
              Course Account.
              (2) Board dues are payable to PBTE/TTB only for up to 25 registered trainees per trade; dues collected
              from trainees above 25 are transferred to the Pupil Funds Account with the 75% Pupil Fund share.
              (3) TUV Rheinland fee (100%) is transferred manually to the TEVTA share. (4) Manual transfers are made by
              cheque from the BOP TFC Account # {AC_TFC}. (5) Where this statement is partial, its figures cover
              only the trades named in the scope line above and reconcile to those trades' gross.
            </p>

            {/* Official 3-Signatory Block (same as Fee Register and other official reports) */}
            <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 text-center text-[10px]">
              <div className="space-y-1">
                <div className="h-8"></div>
                <div className="font-bold text-slate-900 uppercase">KASHIF ZIA</div>
                <div className="text-[9px] text-slate-500 italic">Accountant / Prepared by:</div>
              </div>
              <div className="space-y-1">
                <div className="h-8"></div>
                <div className="font-bold text-slate-900 uppercase">ANEEBA JAMIL</div>
                <div className="text-[9px] text-slate-500 italic">CO-Signatory / Checked by:</div>
              </div>
              <div className="space-y-1">
                <div className="h-8"></div>
                <div className="font-bold text-slate-900 uppercase">SHAZIA KHADIM</div>
                <div className="text-[9px] text-slate-500 italic">Acting Principal / DDO / Approved by:</div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TfcTransferStatement;
