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
 * Format date in standard Pakistani official format (e.g. "05-SEP-2026")
 */
export function formatPakistaniDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput || dateInput === 'N/A' || dateInput === '-') return 'N/A';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return 'N/A';
    // Match DD-MMM-YYYY (e.g. 05-SEP-2026)
    const matchDmy = trimmed.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})$/);
    if (matchDmy) {
      const day = matchDmy[1].padStart(2, '0');
      const mon = matchDmy[2].toUpperCase();
      const yr = matchDmy[3];
      return `${day}-${mon}-${yr}`;
    }
    // Match YYYY-MM-DD (e.g. 2026-09-04)
    const matchYmd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (matchYmd) {
      const yr = matchYmd[1];
      const mNum = parseInt(matchYmd[2], 10);
      const day = matchYmd[3].padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mon = months[mNum - 1] || 'JAN';
      return `${day}-${mon}-${yr}`;
    }
    // Match DD-MM-YYYY (e.g. 04-09-2026)
    const matchDdmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (matchDdmmyyyy) {
      const day = matchDdmmyyyy[1].padStart(2, '0');
      const mNum = parseInt(matchDdmmyyyy[2], 10);
      const yr = matchDdmmyyyy[3];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mon = months[mNum - 1] || 'JAN';
      return `${day}-${mon}-${yr}`;
    }
  }

  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (d && !isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mon = months[d.getMonth()];
      const yr = d.getFullYear();
      return `${day}-${mon}-${yr}`;
    }
  } catch {}

  return String(dateInput).toUpperCase();
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
 * Export dataset to CSV string
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]): void {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
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
