/**
 * Formatting and helper utilities aligned with GVTIW Executive Budget Dashboard standards.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a Date object or ISO string into exact 12-Hour AM/PM format (e.g. "28-Aug-2026 11:40:15 pm")
 */
export function format12HourDate(dateInput: Date | string | number | null | undefined, includeSeconds = true): string {
  if (!dateInput) return '-';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{2}-[A-Za-z]{3}-\d{4}\s+\d{1,2}:\d{2}/.test(trimmed)) {
      return trimmed;
    }
  }
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : '-';

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const formattedHours = String(hours).padStart(2, '0');

  if (includeSeconds) {
    return `${day}-${month}-${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
  }
  return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Format currency with PKR / standard comma separator
 * In institutional accounting, negative figures are rendered in parentheses e.g. (Rs. 230,811) or (230,811)
 */
export function formatPKR(val: number | null | undefined, showSymbol = true): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  if (val === 0) return showSymbol ? 'Rs. 0' : '0';
  const isNegative = val < 0;
  const formatted = Math.abs(Math.round(val)).toLocaleString('en-US');
  if (isNegative) {
    return showSymbol ? `(Rs. ${formatted})` : `(${formatted})`;
  }
  if (showSymbol) {
    return `Rs. ${formatted}`;
  }
  return formatted;
}

/**
 * Compact currency for KPI cards / charts (e.g. Rs. 14.50 M or Rs. 890 K)
 */
export function formatCompactPKR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return 'Rs. 0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}Rs. ${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}Rs. ${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}Rs. ${abs.toLocaleString('en-US')}`;
}

/**
 * Format date in standard Pakistani official format (e.g. "03-Jul-2026")
 */
export function formatPakistaniDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput || dateInput === 'N/A' || dateInput === '-') return 'N/A';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return 'N/A';
    // Match DD-MMM-YYYY (e.g. 05-Sep-2026 or 05 - Sep - 2026)
    const matchDmy = trimmed.match(/^(\d{1,2})\s*[-/ ]\s*([A-Za-z]{3})\s*[-/ ]\s*(\d{4})$/);
    if (matchDmy) {
      const day = matchDmy[1].padStart(2, '0');
      const mon = matchDmy[2].charAt(0).toUpperCase() + matchDmy[2].slice(1).toLowerCase();
      const yr = matchDmy[3];
      return `${day}-${mon}-${yr}`;
    }
    // Match YYYY-MM-DD (e.g. 2026-09-04 or 2026 - 09 - 04)
    const matchYmd = trimmed.match(/^(\d{4})\s*[-/ ]\s*(\d{1,2})\s*[-/ ]\s*(\d{1,2})$/);
    if (matchYmd) {
      const yr = matchYmd[1];
      const mNum = parseInt(matchYmd[2], 10);
      const day = matchYmd[3].padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mon = months[mNum - 1] || 'Jan';
      return `${day}-${mon}-${yr}`;
    }
    // Match DD-MM-YYYY (e.g. 04-09-2026 or 04 - 09 - 2026)
    const matchDdmmyyyy = trimmed.match(/^(\d{1,2})\s*[-/ ]\s*(\d{1,2})\s*[-/ ]\s*(\d{4})$/);
    if (matchDdmmyyyy) {
      const day = matchDdmmyyyy[1].padStart(2, '0');
      const mNum = parseInt(matchDdmmyyyy[2], 10);
      const yr = matchDdmmyyyy[3];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mon = months[mNum - 1] || 'Jan';
      return `${day}-${mon}-${yr}`;
    }
  }

  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (d && !isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mon = months[d.getMonth()];
      const yr = d.getFullYear();
      return `${day}-${mon}-${yr}`;
    }
  } catch {}

  return String(dateInput);
}

/**
 * Format percentage (e.g. 33.3%)
 */
export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  return `${(val * 100).toFixed(1)}%`;
}

/**
 * Get Burn Rate Risk and Styling
 */
export function getBurnRateBadge(burnRate: number): {
  label: string;
  badgeClass: string;
  textClass: string;
  dotColor: string;
} {
  if (burnRate >= 0.95) {
    return {
      label: 'Exhausted / Critical',
      badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      textClass: 'text-rose-400',
      dotColor: 'bg-rose-500',
    };
  }
  if (burnRate >= 0.75) {
    return {
      label: 'Accelerated',
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      textClass: 'text-amber-400',
      dotColor: 'bg-amber-500',
    };
  }
  if (burnRate >= 0.4) {
    return {
      label: 'Optimal Pace',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      textClass: 'text-emerald-400',
      dotColor: 'bg-emerald-500',
    };
  }
  return {
    label: 'Low / Conservative',
    badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    textClass: 'text-blue-400',
    dotColor: 'bg-blue-500',
  };
}

/**
 * Safely normalizes any date representation (dd-MMM-yyyy, dd/mm/yyyy, ISO, Date object)
 * to ISO YYYY-MM-DD for native HTML5 <input type="date"> and API payloads.
 */
export function toIsoDate(d: string | Date | number | null | undefined): string {
  if (!d) return '';
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(d).trim();
  if (!s || s === 'N/A' || s === '-') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const parts = s.split(/[-/ ]+/).filter(Boolean);
  if (parts.length >= 3) {
    let [day, month, year] = parts;
    if (day.length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
    const y = year.length === 2 ? `20${year}` : year;
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const m = monthMap[month.toLowerCase().slice(0, 3)] || month.padStart(2, '0');
    return `${y}-${m}-${day.padStart(2, '0')}`;
  }

  const ts = Date.parse(s);
  if (!isNaN(ts)) {
    const dt = new Date(ts);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return '';
}

/**
 * Export dataset to CSV string
 */
export function exportToCSV(filename: string, rows: Record<string, any>[], sourceLabel?: string): void {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const source = sourceLabel ? `"${sourceLabel}"` : '"Source: e-CashBook & Voucher System (33028)"';
  const csvContent = [
    source,
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          let val = row[header];
          if (typeof val === 'string') {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',')
    ),
    '"e-CashBook & Voucher System developed by MKZ for institute 33028"',
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats a Pakistani CNIC into standard 13-digit pattern: XXXXX-XXXXXXX-X
 * Automatically cleans scientific notation (e.g. 3.31E+12, 3.84E+12), raw digit strings, or dashes.
 */
export function formatCNIC(raw: string | number | null | undefined): string {
  if (!raw) return '—';
  let s = String(raw).trim();
  if (!s || s === '—' || s === '-' || s.toLowerCase() === 'nan') return '—';

  // Expand scientific notation if present (e.g. 3.31E+12 from Excel/Google Sheets export)
  if (/[eE]\+?\d+/.test(s)) {
    try {
      const num = Number(s);
      if (!isNaN(num)) {
        s = BigInt(Math.round(num)).toString();
      }
    } catch {}
  }

  // Strip all non-digit characters
  const digits = s.replace(/\D/g, '');

  if (digits.length === 13) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  } else if (digits.length >= 5 && digits.length < 13) {
    const padded = digits.padEnd(13, '0');
    return `${padded.slice(0, 5)}-${padded.slice(5, 12)}-${padded.slice(12, 13)}`;
  } else if (digits.length > 13) {
    const d13 = digits.slice(0, 13);
    return `${d13.slice(0, 5)}-${d13.slice(5, 12)}-${d13.slice(12, 13)}`;
  }

  return s;
}
