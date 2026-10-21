import { useEffect, useReducer } from 'react';
import { MASTER_PAYEE_LIST, PayeeRecord } from '../data/voucherMasterLists';

// =============================================================
// LIVE PAYEE LIST — fetched from the Apps Script backend action
// "getPayeeList", which reads the Payment Approval-Form sheet's
// Head-Approval tab (Suppliers F, NTN G, CNIC H, from row 3 down).
// The built-in MASTER_PAYEE_LIST remains the instant fallback:
// it is what renders first, and what stays if the fetch fails,
// returns nothing usable, or the backend action is unavailable.
// =============================================================

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzUIXvBBY_rGOiDLLz5cR11mxpgVtdq8Wf4bYcUZ6e1R4VhyeUfN2t_EtGDsPd5jrcP/exec';

let livePayees: PayeeRecord[] | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function getPayeeListSnapshot(): PayeeRecord[] {
  return livePayees ?? MASTER_PAYEE_LIST;
}

function sanitizePayees(raw: unknown): PayeeRecord[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PayeeRecord[] = [];
  const seen = new Set<string>();
  for (const r of raw as Array<Record<string, unknown>>) {
    const name = String(r?.name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      ntn: String(r?.ntn ?? '').trim(),
      cnic: String(r?.cnic ?? '').trim(),
    });
  }
  return out.length > 0 ? out : null;
}

export function refreshPayeeList(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const webAppUrl =
        localStorage.getItem('gvtiw_admin_web_app_url') || DEFAULT_WEB_APP_URL;
      const res = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          pin: (() => {
            try {
              return sessionStorage.getItem('gvtiw_active_session_pin') || '';
            } catch {
              return '';
            }
          })(),
          action: 'getPayeeList',
          command: 'getPayeeList',
          data: {},
        }),
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      const clean = sanitizePayees(json?.payees ?? json?.data?.payees);
      if (clean) {
        livePayees = clean;
        listeners.forEach((fn) => fn());
      }
    } catch {
      // Silent: the built-in fallback list stays in use.
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Reactive payee list: built-in snapshot first, live sheet list when loaded. */
export function usePayeeList(): PayeeRecord[] {
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(forceRender);
    void refreshPayeeList();
    return () => {
      listeners.delete(forceRender);
    };
  }, []);
  return getPayeeListSnapshot();
}
