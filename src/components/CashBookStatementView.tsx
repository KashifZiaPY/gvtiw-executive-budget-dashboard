import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  CashBookStatementData,
  CashBookStatementRow,
  formatCurrency2Decimals,
  formatCashBookBillInfo,
  parseDateToTimestamp,
} from '../lib/reportingEngine';
import {
  HeaderFilterButton,
  HeaderFilterPanel,
  ValuesChecklist,
  DateRangeFilter,
  TextFilter,
  AmountRangeFilter,
  FilterChip,
  EntryTypeControl,
  EntryTypeFilter,
} from './HeaderFilter';
import { formatPakistaniDate } from '../lib/formatters';
import { InstituteEmblem, TevtaEmblem } from './Emblems';
import {
  Printer,
  Download,
  Building,
  CreditCard,
  ShieldCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  MoveHorizontal,
} from 'lucide-react';
import { OFFICIAL_SIGNATORIES } from '../types';
import { AccountHeadDisplay } from './AccountHeadTag';

interface CashBookStatementViewProps {
  data: CashBookStatementData;
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  onPrint: () => void;
  onExportCSV: () => void;
  onOpenPAF?: (voucherNo: string) => void;
}

export const CashBookStatementView: React.FC<CashBookStatementViewProps> = ({
  data,
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  onPrint,
  onExportCSV,
  onOpenPAF,
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [isCompactView, setIsCompactView] = useState(true);

  /* ------------------------------------------------------------------ */
  /* HEADER FILTERS (display-only): they choose which already-computed  */
  /* rows are shown. Balances are NEVER recomputed here — every visible */
  /* row keeps its true ledger running balance, and the official Print  */
  /* / Excel exports always use the complete statement data.           */
  /* ------------------------------------------------------------------ */
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [fltMonths, setFltMonths] = useState<Set<string> | null>(null);
  const [fltHeads, setFltHeads] = useState<Set<string> | null>(null);
  const [fltPayees, setFltPayees] = useState<Set<string> | null>(null);
  const [fltCheque, setFltCheque] = useState('');
  const [fltFrom, setFltFrom] = useState('');
  const [fltTo, setFltTo] = useState('');
  const [fltType, setFltType] = useState<EntryTypeFilter>('ALL');
  const [fltAccts, setFltAccts] = useState<Set<string> | null>(null);
  const [fltVoucher, setFltVoucher] = useState('');
  const [fltParticulars, setFltParticulars] = useState('');
  const [fltRecMin, setFltRecMin] = useState('');
  const [fltRecMax, setFltRecMax] = useState('');
  const [fltPayMin, setFltPayMin] = useState('');
  const [fltPayMax, setFltPayMax] = useState('');
  const [fltBalMin, setFltBalMin] = useState('');
  const [fltBalMax, setFltBalMax] = useState('');

  const clearAllFilters = () => {
    setFltMonths(null);
    setFltHeads(null);
    setFltPayees(null);
    setFltCheque('');
    setFltFrom('');
    setFltTo('');
    setFltType('ALL');
    setFltAccts(null);
    setFltVoucher('');
    setFltParticulars('');
    setFltRecMin('');
    setFltRecMax('');
    setFltPayMin('');
    setFltPayMax('');
    setFltBalMin('');
    setFltBalMax('');
    setOpenFilter(null);
  };

  // A new statement (different bank / period) starts with clean filters.
  useEffect(() => {
    clearAllFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthLabelOf = (dateStr: string): string => {
    const ts = parseDateToTimestamp(dateStr);
    if (!ts) return 'Unknown';
    const d = new Date(ts);
    return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
  };
  const monthSortKey = (label: string): number => {
    const m = label.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (!m) return Number.MAX_SAFE_INTEGER;
    const idx = MONTH_LABELS.indexOf(m[1]);
    return parseInt(m[2], 10) * 100 + (idx < 0 ? 99 : idx);
  };

  const isSpecialRow = (r: CashBookStatementRow): boolean =>
    Boolean(
      r.isOpening ||
      r.isSubtotal ||
      r.isGrandTotal ||
      r.isClosing ||
      (r.entryType &&
        ['OPENING', 'SUBTOTAL', 'GRAND_TOTAL', 'CLOSING'].includes(r.entryType))
    );
  const isOpeningRow = (r: CashBookStatementRow): boolean =>
    Boolean(r.isOpening || r.entryType === 'OPENING');

  const anyFilterActive =
    fltMonths !== null ||
    fltHeads !== null ||
    fltPayees !== null ||
    fltCheque !== '' ||
    fltFrom !== '' ||
    fltTo !== '' ||
    fltType !== 'ALL' ||
    fltAccts !== null ||
    fltVoucher !== '' ||
    fltParticulars !== '' ||
    fltRecMin !== '' ||
    fltRecMax !== '' ||
    fltPayMin !== '' ||
    fltPayMax !== '' ||
    fltBalMin !== '' ||
    fltBalMax !== '';

  // Distinct values present in this statement (for the header panels).
  const filterOptions = useMemo(() => {
    const months = new Map<string, number>();
    const heads = new Map<string, number>();
    const payees = new Map<string, number>();
    const accts = new Map<string, number>();
    for (const g of data.groups) {
      for (const r of g.rows) {
        if (isSpecialRow(r)) continue;
        const ml = monthLabelOf(r.date);
        months.set(ml, (months.get(ml) || 0) + 1);
        if (g.accountKey) accts.set(g.accountKey, (accts.get(g.accountKey) || 0) + 1);
        const head = (r.accountHead || '').trim();
        if (head) heads.set(head, (heads.get(head) || 0) + 1);
        const payee = (r.paidToBy || '').trim();
        if (payee) payees.set(payee, (payees.get(payee) || 0) + 1);
      }
    }
    const toArr = (m: Map<string, number>) =>
      [...m.entries()].map(([value, count]) => ({ value, count }));
    return {
      months: toArr(months).sort((a, b) => monthSortKey(a.value) - monthSortKey(b.value)),
      heads: toArr(heads).sort((a, b) => a.value.localeCompare(b.value)),
      payees: toArr(payees).sort((a, b) => a.value.localeCompare(b.value)),
      accts: toArr(accts).sort((a, b) => a.value.localeCompare(b.value)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const inAmtRange = (v: number, minS: string, maxS: string): boolean => {
    if (minS !== '' && !Number.isNaN(parseFloat(minS)) && v < parseFloat(minS)) return false;
    if (maxS !== '' && !Number.isNaN(parseFloat(maxS)) && v > parseFloat(maxS)) return false;
    return true;
  };

  const rowPassesFilters = (r: CashBookStatementRow, acctKey?: string): boolean => {
    if (isOpeningRow(r)) return true; // opening row is always pinned
    if (isSpecialRow(r)) return !anyFilterActive; // statement subtotal/closing rows belong to the complete statement
    if (fltMonths !== null && !fltMonths.has(monthLabelOf(r.date))) return false;
    if (fltHeads !== null && !fltHeads.has((r.accountHead || '').trim())) return false;
    if (fltPayees !== null && !fltPayees.has((r.paidToBy || '').trim())) return false;
    if (fltCheque && !(r.chequeNo || '').toLowerCase().includes(fltCheque.toLowerCase()))
      return false;
    if (fltFrom || fltTo) {
      const ts = parseDateToTimestamp(r.date);
      if (fltFrom && ts < parseDateToTimestamp(fltFrom)) return false;
      if (fltTo && ts > parseDateToTimestamp(fltTo) + 86399999) return false;
    }
    if (fltType === 'RECEIPT' && !(r.receipts > 0)) return false;
    if (fltType === 'PAYMENT' && !(r.payments > 0)) return false;
    if (fltAccts !== null && !(acctKey && fltAccts.has(acctKey))) return false;
    if (fltVoucher && !(r.voucherNo || '').toLowerCase().includes(fltVoucher.toLowerCase()))
      return false;
    if (
      fltParticulars &&
      !(r.particulars || '').toLowerCase().includes(fltParticulars.toLowerCase())
    )
      return false;
    if (!inAmtRange(r.receipts || 0, fltRecMin, fltRecMax)) return false;
    if (!inAmtRange(r.payments || 0, fltPayMin, fltPayMax)) return false;
    if (!inAmtRange(r.balance || 0, fltBalMin, fltBalMax)) return false;
    return true;
  };

  const visibleByGroup = data.groups.map((group) => ({
    group,
    rows: group.rows.filter((r) => rowPassesFilters(r, group.accountKey)),
  }));
  const visibleTxRows = visibleByGroup.flatMap((v) => v.rows.filter((r) => !isSpecialRow(r)));
  const totalTxCount = data.groups.reduce(
    (n, g) => n + g.rows.filter((r) => !isSpecialRow(r)).length,
    0
  );
  const filteredReceiptsSum = visibleTxRows.reduce((s, r) => s + (r.receipts || 0), 0);
  const filteredPaymentsSum = visibleTxRows.reduce((s, r) => s + (r.payments || 0), 0);

  // Serial numbers are the rows' true positions in the complete statement:
  // identical to the old render counter when unfiltered, and stable (never
  // renumbered) when a header filter hides other rows.
  const srByRow = new Map<CashBookStatementRow, number>();
  {
    let n = 1;
    data.groups.forEach((g) =>
      g.rows.forEach((r) => {
        if (!srByRow.has(r)) srByRow.set(r, n++);
      })
    );
  }

  // Human-readable criteria — printed on the filtered extract's face.
  const rangeCriteria = (label: string, minS: string, maxS: string) =>
    `${label}: Rs. ${minS !== '' ? Number(minS).toLocaleString('en-US') : '…'} to ${maxS !== '' ? Number(maxS).toLocaleString('en-US') : '…'}`;
  const criteriaParts: string[] = [];
  if (fltMonths !== null)
    criteriaParts.push(
      fltMonths.size === 0 ? 'Month: (none selected)' : `Month: ${[...fltMonths].join(', ')}`
    );
  if (fltFrom || fltTo)
    criteriaParts.push(
      `Dates: ${fltFrom ? formatPakistaniDate(fltFrom) : '…'} to ${fltTo ? formatPakistaniDate(fltTo) : '…'}`
    );
  if (fltHeads !== null) {
    const arr = [...fltHeads];
    criteriaParts.push(
      arr.length === 0
        ? 'Account Head: (none selected)'
        : `Account Head: ${arr.slice(0, 3).join(', ')}${arr.length > 3 ? ` +${arr.length - 3} more` : ''}`
    );
  }
  if (fltPayees !== null) {
    const arr = [...fltPayees];
    criteriaParts.push(
      arr.length === 0
        ? 'Paid To / By: (none selected)'
        : `Paid To / By: ${arr.slice(0, 3).join(', ')}${arr.length > 3 ? ` +${arr.length - 3} more` : ''}`
    );
  }
  if (fltCheque) criteriaParts.push(`Cheque # contains "${fltCheque}"`);
  if (fltAccts !== null)
    criteriaParts.push(
      fltAccts.size === 0 ? 'Account: (none selected)' : `Account: ${[...fltAccts].join(', ')}`
    );
  if (fltVoucher) criteriaParts.push(`Voucher # contains "${fltVoucher}"`);
  if (fltParticulars) criteriaParts.push(`Particulars contain "${fltParticulars}"`);
  if (fltRecMin !== '' || fltRecMax !== '')
    criteriaParts.push(rangeCriteria('Receipts', fltRecMin, fltRecMax));
  if (fltPayMin !== '' || fltPayMax !== '')
    criteriaParts.push(rangeCriteria('Payments', fltPayMin, fltPayMax));
  if (fltBalMin !== '' || fltBalMax !== '')
    criteriaParts.push(rangeCriteria('Balance', fltBalMin, fltBalMax));
  if (fltType !== 'ALL')
    criteriaParts.push(fltType === 'RECEIPT' ? 'Entries: Receipts only' : 'Entries: Payments only');
  const criteriaText = criteriaParts.join(' • ');

  /* Filtered extract print: a working paper, NOT the signed statement. */
  const handlePrintFiltered = () => {
    const win = window.open('', '_blank');
    if (!win) {
      window.print();
      return;
    }
    const fmt = (n: number) => formatCurrency2Decimals(n || 0);
    const bodyRows = visibleByGroup
      .map(({ group, rows }) => {
        const headRow = data.isConsolidated
          ? `<tr class="grp"><td colspan="11">${group.meta.shortName} (${group.accountKey}) CASH BOOK — Account No: ${group.meta.accountNo}</td></tr>`
          : '';
        const trs = rows
          .filter((r) => !isSpecialRow(r))
          .map(
            (r) => `<tr>
              <td class="c">${srByRow.get(r) ?? ''}</td>
              <td>${r.date || ''}</td>
              <td class="c">${r.accountKey || ''}</td>
              <td>${r.voucherNo || ''}</td>
              <td>${r.paidToBy || ''}</td>
              <td>${r.accountHead || ''}</td>
              <td>${r.particulars || ''}</td>
              <td class="c">${r.chequeNo || ''}</td>
              <td class="r">${r.receipts > 0 ? fmt(r.receipts) : '—'}</td>
              <td class="r">${r.payments > 0 ? fmt(r.payments) : '—'}</td>
              <td class="r b">${fmt(r.balance)}</td>
            </tr>`
          )
          .join('');
        return headRow + trs;
      })
      .join('');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Filtered Extract — ${data.title}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10px; }
    .inst { text-align: center; color: #065f46; font-size: 9px; font-weight: bold; letter-spacing: 0.08em; }
    h1 { text-align: center; font-size: 14px; margin: 2px 0 0; text-transform: uppercase; }
    h2 { text-align: center; font-size: 11.5px; margin: 3px 0 0; text-transform: uppercase; }
    .sub { text-align: center; font-family: monospace; font-size: 9.5px; color: #334155; margin-top: 2px; }
    .banner { margin: 10px 0 4px; padding: 6px 8px; border: 1.5px solid #b45309; background: #fffbeb; color: #92400e; text-align: center; font-weight: bold; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; }
    .criteria { text-align: center; font-size: 9.5px; color: #334155; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0b3d2e; color: #fff; padding: 5px 4px; font-size: 8.5px; text-transform: uppercase; text-align: left; border: 1px solid #0b3d2e; }
    td { padding: 4px; border: 1px solid #cbd5e1; vertical-align: top; }
    td.r { text-align: right; font-family: monospace; }
    td.c { text-align: center; }
    td.b { font-weight: bold; }
    tr.grp td { background: #0f172a; color: #fff; font-weight: bold; font-size: 9.5px; }
    tr.opening td { background: #f8fafc; font-weight: bold; }
    tr.totals td { background: #f1f5f9; font-weight: bold; border-top: 2px solid #0b3d2e; }
    .note { margin-top: 8px; font-size: 9px; color: #475569; }
    .foot { margin-top: 14px; padding-top: 5px; border-top: 1px dotted #94a3b8; font-size: 8px; font-family: monospace; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="inst">TECHNICAL EDUCATION &amp; VOCATIONAL TRAINING AUTHORITY • GOVERNMENT OF PUNJAB</div>
  <h1>Govt. Vocational Training Institute (W) Samanabad, Faisalabad</h1>
  <h2>${data.title} — Filtered Extract</h2>
  <div class="sub">${data.accountNoText} • Period: ${data.periodLabel} • Generated: ${data.generatedTimestamp}</div>
  <div class="banner">Filtered Extract — Not the Complete Statement</div>
  <div class="criteria"><strong>Filters applied:</strong> ${criteriaText}</div>
  <table>
    <thead>
      <tr>
        <th style="width:26px; text-align:center;">Sr#</th>
        <th style="width:66px;">Date</th>
        <th style="width:38px; text-align:center;">Acct</th>
        <th style="width:80px;">Voucher #</th>
        <th>Paid To / By</th>
        <th>Account Head</th>
        <th>Particulars / Narration</th>
        <th style="width:60px; text-align:center;">Cheque #</th>
        <th style="width:78px; text-align:right;">Receipts (Rs.)</th>
        <th style="width:78px; text-align:right;">Payments (Rs.)</th>
        <th style="width:86px; text-align:right;">Balance (Rs.)</th>
      </tr>
    </thead>
    <tbody>
      <tr class="opening">
        <td class="c">—</td>
        <td>${data.fromDate ? formatPakistaniDate(data.fromDate) : ''}</td>
        <td class="c">${data.isConsolidated ? 'ALL' : data.groups[0]?.accountKey || ''}</td>
        <td colspan="5">${data.isConsolidated ? 'CONSOLIDATED OPENING BALANCE BROUGHT FORWARD (b/d)' : 'OPENING BALANCE BROUGHT FORWARD (b/d)'}</td>
        <td class="r">—</td>
        <td class="r">—</td>
        <td class="r b">${fmt(data.openingBalance)}</td>
      </tr>
      ${bodyRows}
      <tr class="totals">
        <td colspan="8" style="text-align:right;">FILTERED TOTALS — VISIBLE ENTRIES ONLY (${visibleTxRows.length} OF ${totalTxCount}):</td>
        <td class="r">${fmt(filteredReceiptsSum)}</td>
        <td class="r">${fmt(filteredPaymentsSum)}</td>
        <td class="r">—</td>
      </tr>
    </tbody>
  </table>
  <div class="note">Balances shown are the ledger running balances. This extract prints only the entries matching the filters above; the complete signed statement is produced by Print Official Report.</div>
  <div class="foot">e-CashBook &amp; Voucher System developed by MKZ for institute 33028</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
    win.document.close();
  };

  // Synchronize Top Scrollbar with Table Scrollbar
  useEffect(() => {
    const tableEl = tableRef.current;
    const topEl = topScrollRef.current;
    if (!tableEl || !topEl) return;

    let isSyncingTop = false;
    let isSyncingTable = false;

    const handleTableScroll = () => {
      if (isSyncingTable) {
        isSyncingTable = false;
        return;
      }
      isSyncingTop = true;
      topEl.scrollLeft = tableEl.scrollLeft;
    };

    const handleTopScroll = () => {
      if (isSyncingTop) {
        isSyncingTop = false;
        return;
      }
      isSyncingTable = true;
      tableEl.scrollLeft = topEl.scrollLeft;
    };

    tableEl.addEventListener('scroll', handleTableScroll, { passive: true });
    topEl.addEventListener('scroll', handleTopScroll, { passive: true });

    return () => {
      tableEl.removeEventListener('scroll', handleTableScroll);
      topEl.removeEventListener('scroll', handleTopScroll);
    };
  }, []);

  const scrollToLeft = () => {
    if (tableRef.current) {
      tableRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollToRight = () => {
    if (tableRef.current) {
      tableRef.current.scrollTo({ left: tableRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all shadow-xl p-5 md:p-7 space-y-6 ${
        darkMode ? 'bg-[#0a2b21] border-slate-700/80 text-white' : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. OFFICIAL INSTITUTIONAL HEADER WITH DUAL LOGOS              */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-5 border-b-2 border-[#065f46] dark:border-blue-500">
        {/* Left Emblem: GVTI(W) */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 p-1 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
            <InstituteEmblem className="w-12 h-12" src={customGvtiwLogo || undefined} />
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-400 font-bold block uppercase">
              Govt. of Punjab • TEVTA
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
              Institute # 33028
            </span>
          </div>
        </div>

        {/* Center Title Block */}
        <div className="text-center flex-1 px-2">
          <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-[#065f46] dark:text-blue-300">
            GOVERNMENT VOCATIONAL TRAINING INSTITUTE (W)
          </h1>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            Samanabad, Faisalabad • Accounts & Finance Wing
          </p>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900 dark:text-white block">
              {data.title}
            </span>
            <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">
              {data.accountNoText}
            </span>
          </div>
        </div>

        {/* Right Emblem: TEVTA & Meta Details */}
        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] font-mono leading-tight text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400">Generated: </span>
              <strong className="font-bold text-slate-900 dark:text-white">{data.generatedTimestamp}</strong>
            </div>
            <div>
              <span className="text-slate-400">Period: </span>
              <strong className="font-bold text-slate-900 dark:text-white">{data.periodLabel}</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Tx: </span>
              <strong className="font-bold text-blue-600 dark:text-blue-400">{data.totalTransactionsCount}</strong>
            </div>
          </div>
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 p-1 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
            <TevtaEmblem className="w-12 h-12" src={customTevtaLogo || undefined} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. 4 FINANCIAL KPI METRIC CARDS (Exact Screenshot Format)      */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Opening Balance Card */}
        <div
          className={`p-3.5 rounded-xl border text-center transition-all ${
            darkMode
              ? 'bg-blue-950/30 border-blue-800/80 text-white'
              : 'bg-blue-50/70 border-blue-300 text-blue-950'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block">
            {data.isConsolidated ? 'CONSOLIDATED OPENING (B/D)' : 'OPENING BALANCE (B/D)'}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-blue-700 dark:text-blue-300 block mt-1">
            Rs. {formatCurrency2Decimals(data.openingBalance)}
          </span>
        </div>

        {/* Total Receipts Card */}
        <div
          className={`p-3.5 rounded-xl border text-center transition-all ${
            darkMode
              ? 'bg-emerald-950/30 border-emerald-800/80 text-white'
              : 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700 dark:text-emerald-400 block">
            TOTAL RECEIPTS (+)
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
            Rs. {formatCurrency2Decimals(data.totalReceipts)}
          </span>
        </div>

        {/* Total Payments Card */}
        <div
          className={`p-3.5 rounded-xl border text-center transition-all ${
            darkMode
              ? 'bg-rose-950/30 border-rose-800/80 text-white'
              : 'bg-rose-50/70 border-rose-300 text-rose-950'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-700 dark:text-rose-400 block">
            TOTAL PAYMENTS (-)
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 block mt-1">
            Rs. {formatCurrency2Decimals(data.totalPayments)}
          </span>
        </div>

        {/* Net Closing Balance Card */}
        <div
          className={`p-3.5 rounded-xl border text-center transition-all ${
            darkMode
              ? 'bg-slate-900 border-slate-600 text-white shadow-md ring-1 ring-blue-400/40'
              : 'bg-slate-100 border-slate-400 text-slate-900 shadow-sm'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-300 block">
            {data.isConsolidated ? 'CONSOLIDATED CLOSING (C/D)' : 'NET CLOSING BALANCE (C/D)'}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-[#065f46] dark:text-blue-300 block mt-1">
            Rs. {formatCurrency2Decimals(data.closingBalance)}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. REPORT ACTION CONTROLS & HORIZONTAL SCROLL NAVIGATOR       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-1">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Double-Entry Reconciled Cash Book</span>
          <span>•</span>
          <span>
            {anyFilterActive
              ? `Showing ${visibleTxRows.length} of ${totalTxCount} Line Items`
              : `${data.allRows.length} Total Line Items`}
          </span>
        </div>

        {/* Quick Horizontal Scroll & Viewport Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={scrollToLeft}
              title="Scroll table to left columns (Date, Voucher, Payee)"
              className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Left (Date/Sr)</span>
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={scrollToRight}
              title="Scroll table to right columns (Receipts, Payments, Balance, PAF)"
              className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Right (Balance/PAF)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCompactView((prev) => !prev)}
            title={isCompactView ? 'Expand to view all rows without vertical viewport scroll' : 'Enable compact viewport with sticky scrollbar'}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
              isCompactView
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {isCompactView ? <Minimize2 className="w-3.5 h-3.5 text-blue-500" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCompactView ? 'Sticky Viewport' : 'Full Page'}</span>
          </button>

          <button
            onClick={onExportCSV}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
            title="Download structured Excel workbook (.xlsx) with formulas"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export Excel</span>
          </button>
          {/* ONE smart print button: unfiltered it prints the complete official
              statement; while any header filter is active it switches (label +
              amber) to the labeled filtered extract — never a partial official. */}
          <button
            onClick={anyFilterActive ? handlePrintFiltered : onPrint}
            title={
              anyFilterActive
                ? 'Filters are active — prints the labeled filtered extract (unsigned working paper). Clear filters to print the official statement.'
                : 'Print the complete official statement'
            }
            className={`px-4 py-1.5 text-xs font-black rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer transition-colors ${
              anyFilterActive
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <Printer className={`w-3.5 h-3.5 ${anyFilterActive ? '' : 'text-amber-300'}`} />
            <span>{anyFilterActive ? 'Print Filtered View' : 'Print Official Report'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3.05 HEADER FILTER BAR: entries type, active chips, sums      */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <EntryTypeControl value={fltType} onChange={setFltType} darkMode={darkMode} />
          {anyFilterActive && (
            <>
              {fltMonths !== null && (
                <FilterChip
                  darkMode={darkMode}
                  label={
                    fltMonths.size === 0
                      ? 'Month: (none)'
                      : `Month: ${[...fltMonths].join(', ')}`
                  }
                  onClear={() => setFltMonths(null)}
                />
              )}
              {(fltFrom || fltTo) && (
                <FilterChip
                  darkMode={darkMode}
                  label={`Dates: ${fltFrom ? formatPakistaniDate(fltFrom) : '…'} → ${fltTo ? formatPakistaniDate(fltTo) : '…'}`}
                  onClear={() => {
                    setFltFrom('');
                    setFltTo('');
                  }}
                />
              )}
              {fltHeads !== null && (
                <FilterChip
                  darkMode={darkMode}
                  label={
                    fltHeads.size === 0
                      ? 'Head: (none)'
                      : fltHeads.size === 1
                        ? `Head: ${[...fltHeads][0]}`
                        : `Head: ${fltHeads.size} selected`
                  }
                  onClear={() => setFltHeads(null)}
                />
              )}
              {fltPayees !== null && (
                <FilterChip
                  darkMode={darkMode}
                  label={
                    fltPayees.size === 0
                      ? 'Payee: (none)'
                      : fltPayees.size === 1
                        ? `Payee: ${[...fltPayees][0]}`
                        : `Payee: ${fltPayees.size} selected`
                  }
                  onClear={() => setFltPayees(null)}
                />
              )}
              {fltCheque && (
                <FilterChip
                  darkMode={darkMode}
                  label={`Cheque: "${fltCheque}"`}
                  onClear={() => setFltCheque('')}
                />
              )}
              {fltAccts !== null && (
                <FilterChip
                  darkMode={darkMode}
                  label={
                    fltAccts.size === 0
                      ? 'Account: (none)'
                      : fltAccts.size === 1
                        ? `Account: ${[...fltAccts][0]}`
                        : `Account: ${fltAccts.size} selected`
                  }
                  onClear={() => setFltAccts(null)}
                />
              )}
              {fltVoucher && (
                <FilterChip
                  darkMode={darkMode}
                  label={`Voucher: "${fltVoucher}"`}
                  onClear={() => setFltVoucher('')}
                />
              )}
              {fltParticulars && (
                <FilterChip
                  darkMode={darkMode}
                  label={`Particulars: "${fltParticulars}"`}
                  onClear={() => setFltParticulars('')}
                />
              )}
              {(fltRecMin !== '' || fltRecMax !== '') && (
                <FilterChip
                  darkMode={darkMode}
                  label={rangeCriteria('Receipts', fltRecMin, fltRecMax)}
                  onClear={() => {
                    setFltRecMin('');
                    setFltRecMax('');
                  }}
                />
              )}
              {(fltPayMin !== '' || fltPayMax !== '') && (
                <FilterChip
                  darkMode={darkMode}
                  label={rangeCriteria('Payments', fltPayMin, fltPayMax)}
                  onClear={() => {
                    setFltPayMin('');
                    setFltPayMax('');
                  }}
                />
              )}
              {(fltBalMin !== '' || fltBalMax !== '') && (
                <FilterChip
                  darkMode={darkMode}
                  label={rangeCriteria('Balance', fltBalMin, fltBalMax)}
                  onClear={() => {
                    setFltBalMin('');
                    setFltBalMax('');
                  }}
                />
              )}
              {fltType !== 'ALL' && (
                <FilterChip
                  darkMode={darkMode}
                  label={fltType === 'RECEIPT' ? 'Receipts only' : 'Payments only'}
                  onClear={() => setFltType('ALL')}
                />
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </>
          )}
        </div>
        {anyFilterActive && (
          <div
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
              darkMode
                ? 'bg-amber-400/10 border-amber-400/40 text-amber-200'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            Filtered view: Receipts Rs. {formatCurrency2Decimals(filteredReceiptsSum)} · Payments
            Rs. {formatCurrency2Decimals(filteredPaymentsSum)} · Balances are ledger running
            balances
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3.1 TOP SYNCHRONIZED SCROLLBAR (INSTANT ACCESSIBILITY)        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-100 dark:bg-slate-900/90 rounded-t-xl border-x border-t border-slate-300 dark:border-slate-700 px-3 py-1.5 flex items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 select-none whitespace-nowrap">
          <MoveHorizontal className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span className="hidden sm:inline">Top Scroll Bar:</span>
        </div>
        <div
          ref={topScrollRef}
          className="flex-1 overflow-x-auto table-scrollbar-always-visible h-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Inner spacer matching the exact minimum table width */}
          <div className="min-w-[1250px] h-1" />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. OFFICIAL CASH BOOK DATA TABLE (Pixel Perfect Matching)     */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={tableRef}
        className={`overflow-auto rounded-b-xl border-x border-b border-slate-300 dark:border-slate-700 shadow-sm table-scrollbar-always-visible relative ${
          isCompactView ? 'max-h-[calc(100vh-280px)] min-h-[420px]' : ''
        }`}
      >
        <table className="w-full text-xs text-left border-collapse min-w-[1250px]">
          {/* Table Header with Sticky Pinned Positioning */}
          <thead className="bg-[#0b3d2e] text-white font-extrabold text-[10px] uppercase tracking-wider sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700 sticky top-0 bg-[#0b3d2e]">SR#</th>
              <th className="py-2.5 px-3 border-r border-slate-700 w-24 sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  DATE
                  <HeaderFilterButton
                    label="Date / Month"
                    active={fltMonths !== null || fltFrom !== '' || fltTo !== ''}
                    open={openFilter === 'date'}
                    onClick={() => setOpenFilter(openFilter === 'date' ? null : 'date')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'date'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  width={264}
                >
                  <div className="text-[11px] font-bold mb-1.5">Month</div>
                  <ValuesChecklist
                    options={filterOptions.months}
                    included={fltMonths}
                    onChange={setFltMonths}
                    darkMode={darkMode}
                  />
                  <div
                    className={`my-2.5 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}
                  />
                  <DateRangeFilter
                    from={fltFrom}
                    to={fltTo}
                    onChange={(f, t) => {
                      setFltFrom(f);
                      setFltTo(t);
                    }}
                    darkMode={darkMode}
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-2 text-center border-r border-slate-700 w-16 sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  ACCT
                  <HeaderFilterButton
                    label="Account"
                    active={fltAccts !== null}
                    open={openFilter === 'acct'}
                    onClick={() => setOpenFilter(openFilter === 'acct' ? null : 'acct')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'acct'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  width={190}
                >
                  <ValuesChecklist
                    options={filterOptions.accts}
                    included={fltAccts}
                    onChange={setFltAccts}
                    darkMode={darkMode}
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-700 w-32 sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  VOUCHER #
                  <HeaderFilterButton
                    label="Voucher Number"
                    active={fltVoucher !== ''}
                    open={openFilter === 'voucher'}
                    onClick={() => setOpenFilter(openFilter === 'voucher' ? null : 'voucher')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'voucher'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  width={220}
                >
                  <TextFilter
                    value={fltVoucher}
                    onChange={setFltVoucher}
                    darkMode={darkMode}
                    placeholder="e.g. NS-JUL26"
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-700 min-w-[140px] sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  PAID TO / BY
                  <HeaderFilterButton
                    label="Paid To / By"
                    active={fltPayees !== null}
                    open={openFilter === 'payee'}
                    onClick={() => setOpenFilter(openFilter === 'payee' ? null : 'payee')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'payee'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  width={280}
                >
                  <ValuesChecklist
                    options={filterOptions.payees}
                    included={fltPayees}
                    onChange={setFltPayees}
                    searchable
                    darkMode={darkMode}
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-700 min-w-[180px] sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  ACCOUNT HEAD
                  <HeaderFilterButton
                    label="Account Head"
                    active={fltHeads !== null}
                    open={openFilter === 'head'}
                    onClick={() => setOpenFilter(openFilter === 'head' ? null : 'head')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'head'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  width={300}
                >
                  <ValuesChecklist
                    options={filterOptions.heads}
                    included={fltHeads}
                    onChange={setFltHeads}
                    searchable
                    darkMode={darkMode}
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-700 min-w-[220px] sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  PARTICULAR / NARRATION
                  <HeaderFilterButton
                    label="Particulars"
                    active={fltParticulars !== ''}
                    open={openFilter === 'particulars'}
                    onClick={() => setOpenFilter(openFilter === 'particulars' ? null : 'particulars')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'particulars'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  width={260}
                >
                  <TextFilter
                    value={fltParticulars}
                    onChange={setFltParticulars}
                    darkMode={darkMode}
                    placeholder="e.g. Cylinder GAS"
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-2 text-center border-r border-slate-700 w-24 sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  CHEQUE #
                  <HeaderFilterButton
                    label="Cheque Number"
                    active={fltCheque !== ''}
                    open={openFilter === 'cheque'}
                    onClick={() => setOpenFilter(openFilter === 'cheque' ? null : 'cheque')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'cheque'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  align="right"
                  width={220}
                >
                  <TextFilter
                    value={fltCheque}
                    onChange={setFltCheque}
                    darkMode={darkMode}
                    placeholder="e.g. 8061"
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-3 text-right border-r border-slate-700 w-28 sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  RECEIPTS (RS.)
                  <HeaderFilterButton
                    label="Receipts Amount"
                    active={fltRecMin !== '' || fltRecMax !== ''}
                    open={openFilter === 'receipts'}
                    onClick={() => setOpenFilter(openFilter === 'receipts' ? null : 'receipts')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'receipts'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  align="right"
                  width={230}
                >
                  <AmountRangeFilter
                    min={fltRecMin}
                    max={fltRecMax}
                    onChange={(mn, mx) => {
                      setFltRecMin(mn);
                      setFltRecMax(mx);
                    }}
                    darkMode={darkMode}
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-3 text-right border-r border-slate-700 w-28 sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  PAYMENTS (RS.)
                  <HeaderFilterButton
                    label="Payments Amount"
                    active={fltPayMin !== '' || fltPayMax !== ''}
                    open={openFilter === 'payments'}
                    onClick={() => setOpenFilter(openFilter === 'payments' ? null : 'payments')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'payments'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  align="right"
                  width={230}
                >
                  <AmountRangeFilter
                    min={fltPayMin}
                    max={fltPayMax}
                    onChange={(mn, mx) => {
                      setFltPayMin(mn);
                      setFltPayMax(mx);
                    }}
                    darkMode={darkMode}
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-3 text-right border-r border-slate-700 w-32 sticky top-0 bg-[#0b3d2e]">
                <span className="inline-flex items-center gap-1.5">
                  BALANCE (RS.)
                  <HeaderFilterButton
                    label="Balance Amount"
                    active={fltBalMin !== '' || fltBalMax !== ''}
                    open={openFilter === 'balance'}
                    onClick={() => setOpenFilter(openFilter === 'balance' ? null : 'balance')}
                  />
                </span>
                <HeaderFilterPanel
                  open={openFilter === 'balance'}
                  onClose={() => setOpenFilter(null)}
                  darkMode={darkMode}
                  align="right"
                  width={230}
                >
                  <AmountRangeFilter
                    min={fltBalMin}
                    max={fltBalMax}
                    onChange={(mn, mx) => {
                      setFltBalMin(mn);
                      setFltBalMax(mx);
                    }}
                    darkMode={darkMode}
                  />
                </HeaderFilterPanel>
              </th>
              <th className="py-2.5 px-2 text-center w-16 whitespace-nowrap sticky top-0 bg-[#0b3d2e]">PAF</th>
            </tr>
          </thead>

          <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
            {/* ROW 1: OPENING BALANCE ROW */}
            <tr
              className={`font-bold ${
                darkMode ? 'bg-slate-900/90 text-white' : 'bg-slate-50 text-slate-900'
              }`}
            >
              <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                —
              </td>
              <td className="py-2 px-3 font-mono border-r border-slate-200 dark:border-slate-800">
                {data.fromDate ? formatPakistaniDate(data.fromDate) : '01-Jul-2026'}
              </td>
              <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {data.isConsolidated ? 'ALL' : data.groups[0]?.accountKey || 'NS'}
                </span>
              </td>
              <td className="py-2 px-3 font-mono text-center text-slate-400 border-r border-slate-200 dark:border-slate-800">
                —
              </td>
              <td
                colSpan={4}
                className="py-2 px-3 font-extrabold uppercase text-blue-700 dark:text-blue-300 border-r border-slate-200 dark:border-slate-800"
              >
                {data.isConsolidated
                  ? 'CONSOLIDATED OPENING BALANCE BROUGHT FORWARD (b/d)'
                  : 'OPENING BALANCE BROUGHT FORWARD (b/d)'}
              </td>
              <td className="py-2 px-3 text-right font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                —
              </td>
              <td className="py-2 px-3 text-right font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                —
              </td>
              <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                {formatCurrency2Decimals(data.openingBalance)}
              </td>
              <td className="py-2 px-2 text-center font-mono text-slate-400">
                —
              </td>
            </tr>

            {/* TRANSACTIONS: GROUPED OR SINGLE */}
            {visibleByGroup.map(({ group, rows: visibleRows }) => {
              const accountEmoji =
                group.accountKey === 'NS'
                  ? '🏛️'
                  : group.accountKey === 'PF'
                  ? '👥'
                  : group.accountKey === 'FC'
                  ? '🎓'
                  : group.accountKey === 'SEC'
                  ? '🛡️'
                  : group.accountKey === 'SC'
                  ? '⚡'
                  : '🏢';

              return (
                <React.Fragment key={group.accountKey}>
                  {/* Group Header Bar (When Consolidated) */}
                  {data.isConsolidated && visibleRows.length > 0 && (
                    <tr className="bg-[#0f172a] text-white font-extrabold">
                      <td
                        colSpan={12}
                        className="py-2 px-3 text-xs tracking-wider border-y border-slate-700"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="flex items-center gap-2">
                            <span>{accountEmoji}</span>
                            <span>
                              {group.meta.shortName} ({group.accountKey}) CASH BOOK
                            </span>
                            <span className="font-normal font-mono text-slate-300 text-[11px]">
                              — Account No: {group.meta.accountNo}
                            </span>
                          </span>
                          <span className="font-mono text-blue-300 text-[11px]">
                            Opening: Rs. {formatCurrency2Decimals(group.openingBalance)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Transaction Rows for this Group */}
                  {visibleRows.map((r) => {
                    const isReceipt = Boolean(
                      r.entryType === 'RECEIPT' ||
                      r.receipts > 0 ||
                      (r.voucherNo && r.voucherNo.trim().toUpperCase().startsWith('REC-')) ||
                      (r.id && r.id.trim().toUpperCase().startsWith('REC-')) ||
                      (r.id && r.id.trim().toUpperCase().startsWith('CUSTOM-REC-'))
                    );
                    const isBankCharge = Boolean(
                      (r.voucherNo && (r.voucherNo.trim().toUpperCase().startsWith('BC-') || r.voucherNo.trim().toUpperCase().startsWith('BC/'))) ||
                      (r.voucherNo && r.voucherNo.trim().toUpperCase() === 'BC') ||
                      (r.billNo && r.billNo.trim().toUpperCase() === 'BC') ||
                      (r.billNo && r.billNo.trim().toUpperCase() === 'DIRECT DEBIT') ||
                      (r.chequeNo && r.chequeNo.trim().toLowerCase().includes('direct debit')) ||
                      (r.chequeNo && r.chequeNo.trim().toLowerCase().includes('bank debit')) ||
                      (r.paidToBy && r.paidToBy.trim().toLowerCase().includes('bank charge')) ||
                      (r.accountHead && (r.accountHead.trim().toUpperCase().includes('A03101') || r.accountHead.trim().toUpperCase().includes('BANK CHARGES'))) ||
                      (r.particulars && r.particulars.trim().toLowerCase().includes('bank charge'))
                    );
                    const canShowPAF = Boolean(
                      !isReceipt &&
                      !isBankCharge &&
                      r.voucherNo &&
                      r.voucherNo !== '—' &&
                      r.voucherNo.trim() !== '' &&
                      !r.isOpening &&
                      !r.isSubtotal &&
                      !r.isGrandTotal &&
                      !r.isClosing
                    );

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-blue-500/10 transition-colors ${
                          darkMode ? 'odd:bg-slate-950/40 even:bg-transparent' : 'odd:bg-slate-50/50 even:bg-white'
                        }`}
                      >
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60">
                          {srByRow.get(r) ?? ''}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap border-r border-slate-200 dark:border-slate-800/60">
                          {r.date}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800/60">
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {r.accountKey}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-extrabold whitespace-nowrap border-r border-slate-200 dark:border-slate-800/60">
                          {canShowPAF && onOpenPAF ? (
                            <button
                              type="button"
                              onClick={() => onOpenPAF(r.voucherNo)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer font-mono font-extrabold text-left"
                              title={`Click to view linked PAF for ${r.voucherNo}`}
                            >
                              {r.voucherNo}
                            </button>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400">{r.voucherNo}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800/60">
                          {r.paidToBy}
                        </td>
                        <td className="py-2 px-3 text-[11px] font-mono text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/60">
                          <AccountHeadDisplay head={r.accountHead} />
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800/60 min-w-[200px]">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] leading-tight">
                            {r.particulars}
                          </div>
                          <div className="text-[10px] text-slate-900 dark:text-slate-100 font-mono font-normal leading-normal mt-0.5">
                            {formatCashBookBillInfo(r.billNo, r.billDate)}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-950 dark:text-slate-200 text-[11px] border-r border-slate-200 dark:border-slate-800/60">
                          {r.chequeNo}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800/60">
                          {isReceipt ? formatCurrency2Decimals(r.receipts) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800/60">
                          {!isReceipt && r.payments > 0 ? formatCurrency2Decimals(r.payments) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-[#0b3d2e] dark:text-blue-200 border-r border-slate-200 dark:border-slate-800/60">
                          {formatCurrency2Decimals(r.balance)}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {canShowPAF ? (
                            <button
                              type="button"
                              onClick={() => onOpenPAF?.(r.voucherNo)}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1 mx-auto"
                              title={`View Payment Approval Form (PAF) for ${r.voucherNo}`}
                            >
                              <FileText className="w-3 h-3" />
                              <span>PAF</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Subtotal Row (When Consolidated) — complete-statement rows hide while filters are active */}
                  {data.isConsolidated && !anyFilterActive && (
                    <tr
                      className={`font-black border-t border-slate-300 dark:border-slate-700 ${
                        darkMode ? 'bg-slate-900/80 text-white' : 'bg-slate-100/90 text-slate-900'
                      }`}
                    >
                      <td
                        colSpan={8}
                        className="py-2 px-3 text-right uppercase tracking-wider text-[11px] border-r border-slate-200 dark:border-slate-800"
                      >
                        SUBTOTAL — {group.meta.shortName} ({group.accountKey}):
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">
                        {formatCurrency2Decimals(group.totalReceipts)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800">
                        {formatCurrency2Decimals(group.totalPayments)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-blue-700 dark:text-blue-300 border-r border-slate-200 dark:border-slate-800">
                        {formatCurrency2Decimals(group.closingBalance)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-400 text-xs">
                        —
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {/* EMPTY STATE — filters active but nothing matches */}
            {anyFilterActive && visibleTxRows.length === 0 && (
              <tr>
                <td colSpan={12} className="py-10 px-3 text-center">
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    No entries match the active filters
                  </div>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            )}

            {/* GRAND TOTALS + CLOSING — complete-statement rows, hidden while filters are active */}
            {!anyFilterActive && (
              <>
            {/* GRAND TOTALS ROW */}
            <tr
              className={`font-black border-t-2 border-[#0b3d2e] dark:border-blue-500 ${
                darkMode ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-950'
              }`}
            >
              <td
                colSpan={8}
                className="py-2.5 px-3 text-right uppercase tracking-wider text-xs border-r border-slate-300 dark:border-slate-700"
              >
                GRAND TOTALS (RS.):
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-700">
                {formatCurrency2Decimals(data.totalReceipts)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-xs text-rose-600 dark:text-rose-400 border-r border-slate-300 dark:border-slate-700">
                {formatCurrency2Decimals(data.totalPayments)}
              </td>
              <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-xs border-r border-slate-300 dark:border-slate-700">
                —
              </td>
              <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-xs">
                —
              </td>
            </tr>

            {/* CLOSING BALANCE CARRIED FORWARD ROW */}
            <tr
              className={`font-black border-t border-b-2 border-[#0b3d2e] dark:border-blue-500 ${
                darkMode ? 'bg-blue-950/60 text-white' : 'bg-blue-50 text-blue-950'
              }`}
            >
              <td
                colSpan={5}
                className="py-2.5 px-3 text-left uppercase tracking-wider text-xs text-blue-800 dark:text-blue-300 border-r border-slate-300 dark:border-slate-700"
              >
                CLOSING BALANCE CARRIED FORWARD (c/d):
              </td>
              <td
                colSpan={5}
                className="py-2.5 px-3 text-right text-[11px] font-normal italic text-slate-500 dark:text-slate-400 border-r border-slate-300 dark:border-slate-700"
              >
                [Opening + Receipts - Payments]
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-sm font-black text-[#065f46] dark:text-blue-300 border-r border-slate-300 dark:border-slate-700">
                {formatCurrency2Decimals(data.closingBalance)}
              </td>
              <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-xs">
                —
              </td>
            </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. OFFICIAL SIGNATURES BLOCK                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="pt-8 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        {OFFICIAL_SIGNATORIES.map((sig) => (
          <div key={sig.name} className="border-t border-slate-400 dark:border-slate-600 pt-2">
            <strong className="block text-xs font-black text-slate-900 dark:text-white uppercase">
              {sig.name}
            </strong>
            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold block">
              {sig.role}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
              {sig.label}
            </span>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. INSTITUTIONAL WATERMARK FOOTER                             */}
      {/* ------------------------------------------------------------- */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <div>
          Voucher / Cashbook Management System • Generated by Kashif Zia (Accounts Deptt.) • Version 3.14
        </div>
        <div>
          Government Vocational Training Institute (W) Samanabad, Faisalabad
        </div>
      </div>
    </div>
  );
};
