import React from 'react';

export type AccountTagType = 'NS' | 'AAA' | 'PLACEMENT' | 'NAVTTC' | 'SALARY' | 'OWN_FUND' | 'OTHER';

export interface ParsedHeadInfo {
  code?: string;
  baseTitle: string;
  tag: string | null;
  tagType: AccountTagType | null;
}

/**
 * Parses an account head string (e.g. "A03302-WATER CHARGES-NS", "Water Charges-AAA",
 * "Placement-A03807-POL", etc.) and cleanly isolates the distinguishing tag suffix.
 */
export function parseAccountHead(
  rawHead: string | undefined | null,
  category?: string,
  code?: string
): ParsedHeadInfo {
  if (!rawHead || typeof rawHead !== 'string' || !rawHead.trim()) {
    return { baseTitle: 'N/A', tag: null, tagType: null };
  }

  let text = rawHead.trim();
  let tag: string | null = null;
  let tagType: AccountTagType | null = null;

  // 1. Detect AAA (Assan Assignment Account)
  if (
    text.toUpperCase().endsWith('-AAA') ||
    text.toUpperCase().endsWith(' - AAA') ||
    text.toUpperCase().endsWith('(AAA)') ||
    text.toUpperCase().endsWith('-AA') ||
    text.toUpperCase().endsWith(' - AA') ||
    text.toUpperCase().endsWith(' AAA')
  ) {
    tag = '-AAA';
    tagType = 'AAA';
    text = text.replace(/(-AAA| - AAA|\(AAA\)|-AA| - AA| AAA)$/i, '').trim();
  }
  // 2. Detect Non-Salary (NS)
  else if (
    text.toUpperCase().endsWith('-NS') ||
    text.toUpperCase().endsWith(' - NS') ||
    text.toUpperCase().endsWith('(NS)') ||
    text.toUpperCase().endsWith(' NS')
  ) {
    tag = '-NS';
    tagType = 'NS';
    text = text.replace(/(-NS| - NS|\(NS\)| NS)$/i, '').trim();
  }
  // 3. Detect Placement
  else if (
    text.toUpperCase().includes('PLACEMENT') ||
    text.toUpperCase().endsWith('-P') ||
    text.toUpperCase().startsWith('PLACEMENT-')
  ) {
    tag = '-PLACEMENT';
    tagType = 'PLACEMENT';
    text = text
      .replace(/^PLACEMENT-?/i, '')
      .replace(/-PLACEMENT/i, '')
      .replace(/-P$/i, '')
      .trim();
  }
  // 4. Detect NAVTTC
  else if (
    text.toUpperCase().includes('(NAVTTC)') ||
    text.toUpperCase().endsWith('-NAVTTC') ||
    text.toUpperCase().endsWith('-N')
  ) {
    tag = '-NAVTTC';
    tagType = 'NAVTTC';
    text = text
      .replace(/\(NAVTTC\)/i, '')
      .replace(/-NAVTTC$/i, '')
      .replace(/-N$/i, '')
      .trim();
  }
  // 5. Detect Salary
  else if (
    text.toUpperCase().includes('-SALARY') ||
    text.toUpperCase().includes('-SALARIES') ||
    text.toUpperCase().includes('(SALARY)')
  ) {
    tag = '-SALARY';
    tagType = 'SALARY';
    text = text
      .replace(/-SALARIES/i, '')
      .replace(/-SALARY/i, '')
      .replace(/\(SALARY\)/i, '')
      .trim();
  }
  // 6. Detect Untagged Bank Charges or General Heads
  else if (text.toUpperCase() === 'A03101-BANK CHARGES' || text.toUpperCase() === 'BANK CHARGES') {
    if (category && (category.toUpperCase().includes('AAA') || category.toUpperCase().includes('ASSAN'))) {
      tag = '-AAA';
      tagType = 'AAA';
    } else {
      tag = '-NS';
      tagType = 'NS';
    }
  }
  // 7. Category / Code fallback if tag is not in text string
  else if (category) {
    const catUpper = category.toUpperCase().trim();
    if (catUpper === 'AAA' || catUpper === 'AA' || (code && code.toUpperCase().endsWith('-AA'))) {
      tag = '-AAA';
      tagType = 'AAA';
    } else if (catUpper === 'NON SALARY' || catUpper === 'NS') {
      tag = '-NS';
      tagType = 'NS';
    } else if (catUpper === 'PLACEMENT') {
      tag = '-PLACEMENT';
      tagType = 'PLACEMENT';
    } else if (catUpper === 'NAVTTC') {
      tag = '-NAVTTC';
      tagType = 'NAVTTC';
    } else if (catUpper === 'OWN FUND') {
      tag = '-OWN FUND';
      tagType = 'OWN_FUND';
    } else if (catUpper === 'SALARY') {
      tag = '-SALARY';
      tagType = 'SALARY';
    }
  } else if (code) {
    const codeUpper = code.toUpperCase().trim();
    if (codeUpper.endsWith('-AA')) {
      tag = '-AAA';
      tagType = 'AAA';
    } else if (codeUpper.endsWith('-P')) {
      tag = '-PLACEMENT';
      tagType = 'PLACEMENT';
    } else if (codeUpper.endsWith('-N')) {
      tag = '-NAVTTC';
      tagType = 'NAVTTC';
    }
  }

  // Clean any trailing or double hyphens from base title
  text = text.replace(/-+$/, '').trim();

  return {
    code,
    baseTitle: text,
    tag,
    tagType,
  };
}

export interface AccountHeadBadgeProps {
  tag: string;
  tagType?: AccountTagType | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/**
 * Distinct badge for account tags like -NS and -AAA with high-contrast font styling
 */
export const AccountHeadBadge: React.FC<AccountHeadBadgeProps> = ({
  tag,
  tagType,
  size = 'sm',
  className = '',
}) => {
  let colorClasses = '';

  switch (tagType) {
    case 'AAA':
      // Warm Amber / Gold with bold border
      colorClasses =
        'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 shadow-2xs';
      break;
    case 'NS':
      // Crisp Sky / Teal with blue border
      colorClasses =
        'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700 shadow-2xs';
      break;
    case 'PLACEMENT':
      colorClasses =
        'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700 shadow-2xs';
      break;
    case 'NAVTTC':
      colorClasses =
        'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700 shadow-2xs';
      break;
    case 'SALARY':
      colorClasses =
        'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs';
      break;
    case 'OWN_FUND':
      colorClasses =
        'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700 shadow-2xs';
      break;
    default:
      colorClasses =
        'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      break;
  }

  const sizeClasses =
    size === 'xs'
      ? 'text-[9px] px-1 py-0.2 tracking-wider'
      : size === 'md'
      ? 'text-[11px] px-2 py-0.5 tracking-wider'
      : 'text-[9.5px] px-1.5 py-0.5 tracking-wider';

  return (
    <span
      className={`inline-flex items-center font-mono font-black rounded uppercase border select-none whitespace-nowrap leading-none transition-colors ${sizeClasses} ${colorClasses} ${className}`}
      title={`Account classification tag: ${tag}`}
    >
      {tag}
    </span>
  );
};

export interface AccountHeadDisplayProps {
  head?: string | null;
  category?: string;
  code?: string;
  className?: string;
  titleClassName?: string;
  badgeSize?: 'xs' | 'sm' | 'md';
  hideTag?: boolean;
}

/**
 * Universal component to display account head titles with separated, distinctly styled tags.
 */
export const AccountHeadDisplay: React.FC<AccountHeadDisplayProps> = ({
  head,
  category,
  code,
  className = '',
  titleClassName = '',
  badgeSize = 'sm',
  hideTag = false,
}) => {
  const parsed = parseAccountHead(head, category, code);

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className={titleClassName || undefined}>
        {parsed.baseTitle}
      </span>
      {!hideTag && parsed.tag && (
        <AccountHeadBadge
          tag={parsed.tag}
          tagType={parsed.tagType}
          size={badgeSize}
        />
      )}
    </span>
  );
};

/**
 * Formats a head name for HTML string contexts (like print views and PDFs)
 */
export function formatHeadToHtml(
  rawHead?: string | null,
  category?: string,
  code?: string
): string {
  if (!rawHead) return '';
  const parsed = parseAccountHead(rawHead, category, code);
  if (!parsed.tag) return parsed.baseTitle;

  let bg = '#e0f2fe';
  let color = '#0369a1';
  let border = '#7dd3fc';

  if (parsed.tagType === 'AAA') {
    bg = '#fef3c7';
    color = '#92400e';
    border = '#fcd34d';
  } else if (parsed.tagType === 'PLACEMENT') {
    bg = '#e0e7ff';
    color = '#3730a3';
    border = '#a5b4fc';
  } else if (parsed.tagType === 'NAVTTC') {
    bg = '#f3e8ff';
    color = '#6b21a8';
    border = '#d8b4fe';
  } else if (parsed.tagType === 'SALARY') {
    bg = '#d1fae5';
    color = '#065f46';
    border = '#6ee7b7';
  }

  return `${parsed.baseTitle} <span style="display:inline-block; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-weight:800; font-size:9px; letter-spacing:0.06em; padding:1px 5px; border-radius:4px; background-color:${bg}; color:${color}; border:1px solid ${border}; margin-left:4px; vertical-align:middle;">${parsed.tag}</span>`;
}
