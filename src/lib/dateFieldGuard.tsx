import React, { useRef, useState } from 'react';

/**
 * Shared guard for native <input type="date"> fields (system-wide).
 *
 * A native date box DISPLAYS an impossible date the user typed (31-Sep,
 * 30-Feb, ...) while its real value is empty — and fires no change event
 * at all — so without this the app silently treats it as "no date": a
 * filter runs open-ended, or an entry field keeps its previous value
 * while showing the typed one. The guard flags validity.badInput on blur
 * AND shortly after the last keystroke (one Tab only reaches the field's
 * picker button, so blur alone can miss a keyboard user).
 *
 * It changes no values and no logic — it only makes the impossible date
 * visible instead of silent. ReportsModule carries the original inline
 * version of this logic (shipped 2026-11-25, commit 5c0fbe0).
 */

export const DATE_RANGE_ERROR =
  'To date is before From date — no transactions can fall in this range.';

const invalidMessage = (note: string) =>
  `Invalid date — this date does not exist (e.g. September has 30 days). ${note}`;

type Which = 'from' | 'to';

/** Guard for a From/To pair of date inputs (filters and ranges). */
export function useDateRangeGuard(
  from: string,
  setFrom: (v: string) => void,
  to: string,
  setTo: (v: string) => void,
  notes: { from?: string; to?: string } = {}
) {
  const [fromError, setFromError] = useState<string | null>(null);
  const [toError, setToError] = useState<string | null>(null);
  const timers = useRef<Record<Which, ReturnType<typeof setTimeout> | null>>({
    from: null,
    to: null,
  });

  const checkRange = (f: string, t: string) => {
    if (f && t && f > t) {
      setToError(DATE_RANGE_ERROR);
    } else {
      setToError((prev) => (prev === DATE_RANGE_ERROR ? null : prev));
    }
  };

  const validate = (which: Which, input: HTMLInputElement | null) => {
    if (!input) return;
    const setErr = which === 'from' ? setFromError : setToError;
    if (input.validity.badInput) {
      setErr(
        invalidMessage(
          which === 'from'
            ? notes.from ?? 'Not applied: this date bound is ignored.'
            : notes.to ?? 'Not applied: this date bound is ignored.'
        )
      );
      return;
    }
    setErr(null);
    checkRange(from, to);
  };

  const keyUp = (which: Which, input: HTMLInputElement | null) => {
    if (!input) return;
    const t = timers.current;
    if (t[which]) clearTimeout(t[which]);
    if (!input.validity.badInput) return;
    t[which] = setTimeout(() => {
      if (input.validity.badInput && !input.value) validate(which, input);
    }, 700);
  };

  const change = (which: Which, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    (which === 'from' ? setFrom : setTo)(v);
    if (!e.currentTarget.validity.badInput) {
      (which === 'from' ? setFromError : setToError)(null);
    }
    checkRange(which === 'from' ? v : from, which === 'to' ? v : to);
  };

  const clearErrors = () => {
    setFromError(null);
    setToError(null);
  };

  return { fromError, toError, change, keyUp, blur: validate, clearErrors };
}

/** Guard for a single date input (entry fields, cut-off dates). */
export function useDateFieldGuard(
  setValue: (v: string) => void,
  note = 'Please enter a valid date.'
) {
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validate = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (input.validity.badInput) {
      setError(invalidMessage(note));
      return;
    }
    setError(null);
  };

  const keyUp = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (timer.current) clearTimeout(timer.current);
    if (!input.validity.badInput) return;
    timer.current = setTimeout(() => {
      if (input.validity.badInput && !input.value) validate(input);
    }, 700);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (!e.currentTarget.validity.badInput) setError(null);
  };

  return { error, change, keyUp, blur: validate, clearError: () => setError(null) };
}

/** The red warning line shown under a guarded date field. */
export const DateFieldError: React.FC<{ message: string | null; className?: string }> = ({
  message,
  className,
}) =>
  message ? (
    <p
      className={
        className ?? 'mt-1 text-[10px] font-bold leading-snug text-rose-600 dark:text-rose-400'
      }
    >
      {message}
    </p>
  ) : null;
