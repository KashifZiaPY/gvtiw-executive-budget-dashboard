import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Printer, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import {
  TfcChallanRecord,
  COURSE_TITLE_MAP,
  PRESCRIBED_COURSE_FEE_MAP,
} from '../data/tfcChallanData';
import { TfcCourseMultiSelect } from './TfcCourseMultiSelect';

/**
 * Pending Dues / Fee Report — BOP Fee Challan Hub sub-tab.
 *
 * Rule (Kashif, 2026-10-22): benchmark per trade = prescribed fee (system
 * schedule, PRESCRIBED_COURSE_FEE_MAP) x 25 trainees. Excess trainees never
 * create negative pending. Trades below benchmark are detailed trainee by
 * trainee from the fee record: installment-pending trainees appear once with
 * every paid challan (no, date, amount), and complete-fee-pending is stated
 * as a student count x the prescribed fee. Collected is the ACTUAL amount
 * deposited in the period (excess included). The report follows the hub
 * period (month / custom date range) and carries its own trade selection;
 * a partial selection is labeled PARTIAL on screen and on print, with the
 * period and the selected / excluded trades printed on the report's face.
 */

const TRADE_ORDER = ['MVi', 'MVii', 'FD', 'ADDM', 'CO', 'DM', 'BT', 'CK', 'BTE'];
const BENCHMARK_STRENGTH = 25;

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const cleanCnic = (c: string) => String(c || '').replace(/\D/g, '');
const fmtCnic = (c: string) => {
  const d = cleanCnic(c);
  return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : c || '—';
};

const MON_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
const MON_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseTs(rawDate: string): number {
  if (!rawDate) return 0;
  const m1 = rawDate.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d+)/);
  if (m1) {
    const mon = MON_MAP[m1[1].slice(0, 3).toLowerCase()] ?? 7;
    let yr = parseInt(m1[3], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, mon, parseInt(m1[2], 10)).getTime();
  }
  const m2 = rawDate.match(/(\d{1,2})-([A-Za-z]+)-(\d+)/);
  if (m2) {
    const mon = MON_MAP[m2[2].slice(0, 3).toLowerCase()] ?? 7;
    let yr = parseInt(m2[3], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, mon, parseInt(m2[1], 10)).getTime();
  }
  return 0;
}

/** "Aug 7, 26" / "Aug 07, 26" / "07-Aug-2026" -> "07 Aug 2026" */
function fmtDate(rawDate: string): string {
  const ts = parseTs(rawDate);
  if (!ts) return rawDate || '—';
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')} ${MON_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function properCase(s: string): string {
  if (!s) return s;
  return s
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

interface PaidChallan {
  id: string;
  date: string;
  ts: number;
  amount: number;
}

interface TraineeDue {
  key: string;
  roll: string;
  name: string;
  father: string;
  cnic: string;
  challans: PaidChallan[];
  deposited: number;
  balance: number;
}

interface TradeDue {
  code: string;
  title: string;
  fee: number;
  benchmark: number;
  collected: number;
  pending: number;
  payerCount: number;
  fullCount: number;
  partials: TraineeDue[];
  completePendingCount: number;
}

interface TfcPendingDuesProps {
  /** Challans of the hub period (date filter applied, all trades). */
  challans: TfcChallanRecord[];
  darkMode: boolean;
  periodLabel: string;
  /** Increment from the parent (hub Print / PDF buttons) to trigger print. */
  printSignal?: number;
}

export const TfcPendingDues: React.FC<TfcPendingDuesProps> = ({
  challans,
  darkMode,
  periodLabel,
  printSignal = 0,
}) => {
  const [selectedTrades, setSelectedTrades] = useState<string[]>(['ALL']);
  const [showPrintPortal, setShowPrintPortal] = useState(false);
  const [generatedOn, setGeneratedOn] = useState(
    () => `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`
  );

  // Trades covered by the prescribed-fee schedule that appear in this period
  const availableTrades = useMemo(() => {
    const present = new Set(challans.map((c) => c.courseAbbreviation));
    return TRADE_ORDER.filter((code) => present.has(code) && PRESCRIBED_COURSE_FEE_MAP[code]);
  }, [challans]);

  const effectiveTrades = useMemo(() => {
    if (selectedTrades.includes('ALL')) return availableTrades;
    const wanted = new Set(selectedTrades);
    return availableTrades.filter((c) => wanted.has(c));
  }, [selectedTrades, availableTrades]);

  const isPartial = effectiveTrades.length > 0 && effectiveTrades.length !== availableTrades.length;
  const noneSelected = effectiveTrades.length === 0;

  const tradeDues: TradeDue[] = useMemo(() => {
    return effectiveTrades.map((code) => {
      const fee = PRESCRIBED_COURSE_FEE_MAP[code].fullFee;
      const rows = challans.filter((c) => c.courseAbbreviation === code);
      const byTrainee = new Map<string, TraineeDue>();
      rows.forEach((c) => {
        const cnicDigits = cleanCnic(c.cnic);
        const key = cnicDigits.length >= 8 ? cnicDigits : `ROLL:${c.rollOrCode}`;
        let t = byTrainee.get(key);
        if (!t) {
          t = {
            key,
            roll: c.rollOrCode || '—',
            name: properCase(c.traineeName || ''),
            father: c.guardianName || '—',
            cnic: c.cnic || '',
            challans: [],
            deposited: 0,
            balance: 0,
          };
          byTrainee.set(key, t);
        }
        t.challans.push({
          id: c.challanId,
          date: c.challanPaymentDate,
          ts: parseTs(c.challanPaymentDate),
          amount: c.totalAmount || 0,
        });
        t.deposited += c.totalAmount || 0;
      });
      const trainees = Array.from(byTrainee.values());
      trainees.forEach((t) => {
        t.challans.sort((a, b) => a.ts - b.ts);
        t.balance = Math.max(0, fee - t.deposited);
      });
      const collected = rows.reduce((s, c) => s + (c.totalAmount || 0), 0);
      const counted = trainees.reduce((s, t) => s + Math.min(t.deposited, fee), 0);
      const benchmark = fee * BENCHMARK_STRENGTH;
      const partials = trainees
        .filter((t) => t.deposited > 0 && t.deposited < fee)
        .sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true }));
      return {
        code,
        title: COURSE_TITLE_MAP[code] || code,
        fee,
        benchmark,
        collected,
        pending: Math.max(0, benchmark - counted),
        payerCount: trainees.length,
        fullCount: trainees.filter((t) => t.deposited >= fee).length,
        partials,
        completePendingCount: Math.max(0, BENCHMARK_STRENGTH - trainees.length),
      };
    });
  }, [challans, effectiveTrades]);

  const totals = useMemo(
    () => ({
      benchmark: tradeDues.reduce((s, t) => s + t.benchmark, 0),
      collected: tradeDues.reduce((s, t) => s + t.collected, 0),
      pending: tradeDues.reduce((s, t) => s + t.pending, 0),
      challans: challans.filter((c) => effectiveTrades.includes(c.courseAbbreviation)).length,
      grossPeriod: challans.reduce((s, c) => s + (c.totalAmount || 0), 0),
      periodChallans: challans.length,
    }),
    [tradeDues, challans, effectiveTrades]
  );

  // Duplicate roll numbers inside one trade (distinct trainees) — register typos
  const dupRollNotes = useMemo(() => {
    const notes: string[] = [];
    tradeDues.forEach((td) => {
      const rows = challans.filter((c) => c.courseAbbreviation === td.code);
      const byRoll = new Map<string, Set<string>>();
      rows.forEach((c) => {
        const cnicDigits = cleanCnic(c.cnic);
        const key = cnicDigits.length >= 8 ? cnicDigits : `ROLL:${c.rollOrCode}`;
        if (!byRoll.has(c.rollOrCode)) byRoll.set(c.rollOrCode, new Set());
        byRoll.get(c.rollOrCode)!.add(key);
      });
      byRoll.forEach((set, roll) => {
        if (roll && set.size > 1) {
          const names = Array.from(
            new Set(
              rows
                .filter((c) => c.rollOrCode === roll)
                .map((c) => properCase(c.traineeName || ''))
            )
          ).join(', ');
          notes.push(`Roll No. ${roll} (${td.code}) appears against ${set.size} trainees (${names}) in the fee record — possibly a typo in the register.`);
        }
      });
    });
    return notes;
  }, [tradeDues, challans]);

  const includedNames = effectiveTrades.map((c) => `${c} — ${COURSE_TITLE_MAP[c] || c}`);
  const excludedNames = availableTrades
    .filter((c) => !effectiveTrades.includes(c))
    .map((c) => `${c} — ${COURSE_TITLE_MAP[c] || c}`);

  const doPrint = useCallback(() => {
    setGeneratedOn(`${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`);
    setShowPrintPortal(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrintPortal(false), 1000);
    }, 200);
  }, []);

  useEffect(() => {
    if (printSignal > 0) doPrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printSignal]);

  const positionText = (t: TradeDue): string => {
    if (t.pending === 0) return `Complete — ${t.payerCount} trainees paid`;
    const bits: string[] = [];
    if (t.fullCount > 0) bits.push(`${t.fullCount} full`);
    if (t.partials.length > 0) bits.push(`${t.partials.length} installment pending`);
    if (t.completePendingCount > 0) bits.push(`${t.completePendingCount} complete fee${t.completePendingCount > 1 ? 's' : ''} pending`);
    if (t.payerCount === 0) return 'No deposits in period — 25 complete fees pending';
    return bits.join(' · ');
  };

  // ------------------------------------------------------------- renderers
  const renderSummary = (pr: boolean) => (
    <table className={pr ? 'pd-table' : 'w-full border-collapse text-sm'}>
      <thead>
        <tr className={pr ? '' : darkMode ? 'bg-slate-800 text-slate-100' : 'bg-emerald-800 text-white'}>
          <th className={pr ? 'c' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center'}>Sr.</th>
          <th className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-left'}>Trade</th>
          <th className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>Fee / Trainee (Rs.)</th>
          <th className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>Benchmark ×25 (Rs.)</th>
          <th className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>Collected (Rs.)</th>
          <th className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>Pending Dues (Rs.)</th>
          <th className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-left'}>Position</th>
        </tr>
      </thead>
      <tbody>
        {tradeDues.map((t, i) => (
          <tr key={t.code} className={pr ? (t.pending > 0 ? 'pending' : '') : t.pending > 0 ? (darkMode ? 'bg-orange-950/30' : 'bg-orange-50') : ''}>
            <td className={pr ? 'c' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center align-middle'}>{i + 1}</td>
            <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-middle'}>{t.code} — {t.title}</td>
            <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right align-middle'}>{fmt(t.fee)}</td>
            <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right align-middle'}>{fmt(t.benchmark)}</td>
            <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right align-middle'}>{fmt(t.collected)}</td>
            <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right align-middle font-bold'}>{fmt(t.pending)}</td>
            <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-middle'}>{positionText(t)}</td>
          </tr>
        ))}
        <tr className={pr ? 'total' : darkMode ? 'bg-emerald-950/40 font-bold' : 'bg-emerald-50 font-bold'}>
          <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5'}></td>
          <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5'}>TOTAL</td>
          <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}></td>
          <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>{fmt(totals.benchmark)}</td>
          <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>{fmt(totals.collected)}</td>
          <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>{fmt(totals.pending)}</td>
          <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5'}></td>
        </tr>
      </tbody>
    </table>
  );

  const renderDetails = (pr: boolean) => (
    <>
      {tradeDues
        .filter((t) => t.partials.length > 0 || t.completePendingCount > 0)
        .map((t, di) => (
          <div key={t.code} className={pr ? '' : 'mt-5'}>
            <h3 className={pr ? 'pd-h3' : 'text-sm font-bold text-emerald-800 dark:text-emerald-300 border-l-4 border-teal-600 pl-2 mb-2'}>
              {String.fromCharCode(66 + di)} — DETAIL: {t.code} ({t.title.toUpperCase()})
              {t.partials.length > 0 ? ' — INSTALLMENT PENDING' : ' — COMPLETE FEE PENDING'}
              <span className={pr ? 'fee' : 'text-slate-500 dark:text-slate-400 font-semibold'}> · Prescribed Fee Rs. {fmt(t.fee)} per trainee</span>
            </h3>
            {t.partials.length > 0 && (
              <table className={pr ? 'pd-table' : 'w-full border-collapse text-sm'}>
                <thead>
                  <tr className={pr ? '' : darkMode ? 'bg-slate-800 text-slate-100' : 'bg-emerald-800 text-white'}>
                    <th className={pr ? 'c' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center'}>Sr.</th>
                    <th className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-left'}>Roll No.</th>
                    <th className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-left'}>Trainee Name</th>
                    <th className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-left'}>Father / Guardian</th>
                    <th className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-left'}>CNIC</th>
                    <th className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-left'}>Paid Challan(s) — No. · Date · Amount</th>
                    <th className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>Deposited (Rs.)</th>
                    <th className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>Balance Due (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {t.partials.map((s, i) => (
                    <tr key={s.key}>
                      <td className={pr ? 'c' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center align-middle'}>{i + 1}</td>
                      <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-middle'}>{s.roll}</td>
                      <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-middle font-semibold'}>{s.name}</td>
                      <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-middle'}>{s.father}</td>
                      <td className={pr ? 'mono' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-middle font-mono text-xs whitespace-nowrap'}>{fmtCnic(s.cnic)}</td>
                      <td className={pr ? 'ch' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 align-middle text-xs leading-relaxed whitespace-nowrap'}>
                        {s.challans.map((ch, ci) => (
                          <span key={ci} className="block">#{ch.id} · {fmtDate(ch.date)} · Rs. {fmt(ch.amount)}</span>
                        ))}
                      </td>
                      <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right align-middle'}>{fmt(s.deposited)}</td>
                      <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right align-middle font-bold'}>{fmt(s.balance)}</td>
                    </tr>
                  ))}
                  <tr className={pr ? 'total' : darkMode ? 'bg-emerald-950/40 font-bold' : 'bg-emerald-50 font-bold'}>
                    <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5'}></td>
                    <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5'}></td>
                    <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5'} colSpan={pr ? 1 : 3}>Sub-Total — {t.code} Installment Pending ({t.partials.length} trainees)</td>
                    {pr && <td></td>}
                    {pr && <td></td>}
                    <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5'}></td>
                    <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>{fmt(t.partials.reduce((s2, x) => s2 + x.deposited, 0))}</td>
                    <td className={pr ? 'r' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-right'}>{fmt(t.partials.reduce((s2, x) => s2 + x.balance, 0))}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {t.completePendingCount > 0 && (
              <table className={pr ? 'pd-table' : 'w-full border-collapse text-sm mt-3'}>
                <tbody>
                  <tr className={pr ? 'pending' : darkMode ? 'bg-orange-950/30' : 'bg-orange-50'}>
                    <td className={pr ? '' : 'border border-slate-300 dark:border-slate-700 px-2 py-1.5'}>
                      <strong>Complete fee pending</strong> — {t.completePendingCount} student{t.completePendingCount > 1 ? 's' : ''} × Rs. {fmt(t.fee)} ={' '}
                      <strong>Rs. {fmt(t.completePendingCount * t.fee)}</strong> (names to be taken from the registration record — no challan exists in this period)
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        ))}
    </>
  );

  const notesList = [
    'Trades with more than 25 trainees are shown complete; excess collections are ignored per the benchmark rule — pending dues are never negative.',
    ...dupRollNotes,
    `Total deposits verified against the BOP TFC record for this period: ${fmt(totals.periodChallans)} challans, gross Rs. ${fmt(totals.grossPeriod)}.`,
  ];

  // ------------------------------------------------------------- screen
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className={`p-4 rounded-xl border shadow-xs ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-black text-base text-slate-900 dark:text-white">Pending Dues / Fee Report</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Basis: <strong className="text-slate-900 dark:text-slate-200">Prescribed Fee × 25 trainees</strong> per trade (system fee schedule).
              Excess trainees never create negative pending. Period follows the hub date filter (month or custom range).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TfcCourseMultiSelect
              availableCourses={availableTrades}
              selectedCourses={selectedTrades}
              onChange={setSelectedTrades}
              challans={challans}
              darkMode={darkMode}
              size="sm"
            />
            <button
              onClick={doPrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-600 dark:text-slate-300">
          <span><strong>Period:</strong> {periodLabel}</span>
          <span><strong>Trades:</strong> {noneSelected ? 'None selected' : isPartial ? `${effectiveTrades.length} of ${availableTrades.length} (Partial)` : `All ${availableTrades.length} trades`}</span>
          <span><strong>Generated:</strong> {generatedOn}</span>
        </div>
      </div>

      {/* Scope banner */}
      {!noneSelected && (
        <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${
          isPartial
            ? darkMode ? 'bg-amber-950/40 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
            : darkMode ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
        }`}>
          {isPartial ? (
            <span className="inline-flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-none" />
              <span>
                <strong>PARTIAL REPORT</strong> — this report covers only: {includedNames.join('; ')}.
                <br />Excluded trades: {excludedNames.join('; ')}. Totals reconcile to the selected trades only.
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-none" />
              <span><strong>COMPLETE REPORT</strong> — all {availableTrades.length} trades of the period are included.</span>
            </span>
          )}
        </div>
      )}

      {noneSelected ? (
        <div className={`rounded-xl border px-4 py-10 text-center text-sm ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-300 text-slate-500'}`}>
          No trades selected — use the trade dropdown above (Select All) to build the report.
        </div>
      ) : (
        <>
          <div className={`p-4 rounded-xl border shadow-xs overflow-x-auto ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 border-l-4 border-teal-600 pl-2 mb-2">A — TRADE-WISE SUMMARY</h3>
            {renderSummary(false)}
            <div className="mt-3 rounded-lg bg-emerald-800 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold">Total Pending Dues — {isPartial ? 'selected trades' : 'all trades'}</span>
              <span className="text-lg font-black">Rs. {fmt(totals.pending)}</span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border shadow-xs overflow-x-auto ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
            {renderDetails(false)}
            <div className="mt-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-emerald-800 dark:text-emerald-300">Notes:</strong>
              {notesList.map((nt, i) => (
                <div key={i}>{i + 1}. {nt}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Print Portal */}
      {showPrintPortal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div id="print-pending-dues-portal" className="p-4 bg-white text-slate-900 font-sans" style={{ display: 'none' }}>
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 11mm 10mm 17mm;
                  @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-family: Arial, sans-serif;
                    font-size: 9px;
                    color: #64748b;
                  }
                }
              }
              .pd-table { width: 100%; border-collapse: collapse; }
              .pd-table th { background: #065f46; color: #fff; font-size: 10.5px; padding: 5px 6px; text-align: left; }
              .pd-table td { border: 1px solid #cbd5e1; padding: 3px 6px; font-size: 10.8px; vertical-align: middle; }
              .pd-table td.r, .pd-table th.r { text-align: right; }
              .pd-table td.c, .pd-table th.c { text-align: center; }
              .pd-table td.mono { font-family: Consolas, monospace; font-size: 10.2px; white-space: nowrap; }
              .pd-table td.ch { font-size: 10.2px; line-height: 1.5; white-space: nowrap; }
              .pd-table tr.pending td { background: #fff7ed; }
              .pd-table tr.total td { background: #ecfdf5; border-top: 2px solid #065f46; font-weight: 700; }
              .pd-h3 { font-size: 12.5px; color: #065f46; margin: 12px 0 5px; border-left: 4px solid #0d9488; padding-left: 7px; }
              .pd-h3 .fee { color: #475569; font-weight: 600; font-size: 11px; }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, borderBottom: '3px solid #065f46', paddingBottom: 6 }}>
              <img src="/gvtiw-logo.jpg" alt="GVTIW" style={{ width: 56, height: 56, objectFit: 'contain' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16.5, fontWeight: 800, color: '#065f46', letterSpacing: '.02em' }}>
                  GOVT. VOCATIONAL TRAINING INSTITUTE (W) SAMANABAD, FAISALABAD
                </div>
                <div style={{ fontSize: 10, letterSpacing: '.34em', color: '#0d9488', fontWeight: 700, marginTop: 3 }}>
                  ACCOUNTS &amp; FINANCE HUB
                </div>
              </div>
              <img src="/tevta-logo.png" alt="TEVTA" style={{ width: 56, height: 56, objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'center', margin: '10px 0 2px', fontSize: 17, fontWeight: 800, letterSpacing: '.06em' }}>
              PENDING DUES / FEE REPORT
            </div>
            <div style={{ textAlign: 'center', color: '#475569', fontSize: 10.5, marginBottom: 4 }}>
              Basis: Prescribed Fee × 25 Trainees per Trade — excess trainees ignored · Deposits per BOP TFC record
            </div>
            <div style={{ textAlign: 'center', color: '#334155', fontSize: 10.5, marginBottom: 8 }}>
              <strong>Period:</strong> {periodLabel} &nbsp;·&nbsp;{' '}
              {noneSelected ? (
                <strong>No trades selected</strong>
              ) : isPartial ? (
                <>
                  <strong>PARTIAL REPORT</strong> — Trades covered: {includedNames.join('; ')} · Excluded: {excludedNames.join('; ')}
                </>
              ) : (
                <strong>Complete report — all {availableTrades.length} trades</strong>
              )}
              <br />Report Generated: {generatedOn}
            </div>

            {!noneSelected && (
              <>
                <h3 className="pd-h3">A — TRADE-WISE SUMMARY</h3>
                {renderSummary(true)}
                <div style={{ marginTop: 9, background: '#065f46', color: '#fff', borderRadius: 8, padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Total Pending Dues — {isPartial ? 'selected trades' : 'all trades'}</span>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>Rs. {fmt(totals.pending)}</span>
                </div>
                {renderDetails(true)}
                <div style={{ marginTop: 9, fontSize: 10.3, color: '#334155', lineHeight: 1.5 }}>
                  <strong style={{ color: '#065f46' }}>Notes:</strong>
                  {notesList.map((nt, i) => (
                    <div key={i}>{i + 1}. {nt}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 18, marginTop: 46 }}>
                  {[
                    { name: 'KASHIF ZIA', role: 'Accountant', sub: 'Prepared by' },
                    { name: 'ANEEBA JAMIL', role: 'CO-Signatory', sub: 'Checked by' },
                    { name: 'SHAZIA KHADIM', role: 'Acting Principal / DDO', sub: 'Approved by' },
                  ].map((s) => (
                    <div key={s.name} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ borderTop: '1.5px solid #0f172a', margin: '0 8px 5px', paddingTop: 5, fontWeight: 700, fontSize: 11 }}>{s.name}</div>
                      <div style={{ fontSize: 9.5, color: '#475569' }}>{s.role}<br />{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, textAlign: 'center', fontSize: 9, color: '#94a3b8' }}>
                  e-CashBook System developed by MKZ for Institute 33028
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default TfcPendingDues;
