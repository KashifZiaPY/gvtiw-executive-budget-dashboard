import { useEffect, useReducer } from 'react';
import type { MasterVoucher } from '../data/cashBookData';

// =============================================================
// PAYMENT EVIDENCE — signed cheque copies on Google Drive.
// One voucher carries up to three cheque slots (NET / PRA / IT).
// Each uploaded copy is one file in the Drive folder
// "GVTIW Payment Evidence" plus one row in the Payment_Evidence
// tab of the Payment Approval-Form workbook. The unsigned copy
// shown at signing time is deliberately NOT filed: it is not an
// instrument and proves no payment.
//
// All four backend actions sit BEHIND the Master PIN gate, so
// even reading the index is admin-only; guests never see the
// button at all. Until the backend file is deployed, the index
// fetch fails — that failure is surfaced (never mistaken for
// "no evidence"), so no false red flags can appear.
// =============================================================

export type EvidenceSlot = 'NET' | 'PRA' | 'IT';

export interface EvidenceRecord {
  uploadedAt: string;
  voucherNo: string;
  slot: EvidenceSlot;
  chequeNo: string;
  fileName: string;
  fileId: string;
  fileUrl: string;
  previewUrl: string;
}

export interface EvidenceSlotStatus {
  slot: EvidenceSlot;
  label: string;
  chequeNo: string;
  amount: number;
  file: EvidenceRecord | null;
}

export type EvidenceState = 'none' | 'missing' | 'partial' | 'complete';

export interface VoucherEvidenceState {
  slots: EvidenceSlotStatus[];
  state: EvidenceState;
  missingSlots: EvidenceSlot[];
  presentCount: number;
}

export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

const SLOT_LABELS: Record<EvidenceSlot, string> = {
  NET: 'Net Cheque',
  PRA: 'PRA Cheque',
  IT: 'Income Tax Cheque',
};

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzUIXvBBY_rGOiDLLz5cR11mxpgVtdq8Wf4bYcUZ6e1R4VhyeUfN2t_EtGDsPd5jrcP/exec';

function isRealChequeNo(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim().toUpperCase();
  return v !== '' && v !== '0' && v !== 'DIRECT DEBIT';
}

/** The cheque slots a voucher actually has. '0', blank and Direct Debit never count. */
export function getEvidenceSlots(v: MasterVoucher): { slot: EvidenceSlot; chequeNo: string; amount: number }[] {
  const out: { slot: EvidenceSlot; chequeNo: string; amount: number }[] = [];
  if (isRealChequeNo(v.chequeNoNet)) {
    out.push({ slot: 'NET', chequeNo: v.chequeNoNet.trim(), amount: Number(v.chequeAmountNet) || 0 });
  }
  if (isRealChequeNo(v.chequeNoPra)) {
    out.push({ slot: 'PRA', chequeNo: v.chequeNoPra.trim(), amount: Number(v.praAmount) || 0 });
  }
  if (isRealChequeNo(v.chequeNoIncomeTax)) {
    out.push({ slot: 'IT', chequeNo: v.chequeNoIncomeTax.trim(), amount: Number(v.incomeTaxAmount) || 0 });
  }
  return out;
}

export function getVoucherEvidenceState(
  v: MasterVoucher,
  records: EvidenceRecord[]
): VoucherEvidenceState {
  const bySlot = new Map<EvidenceSlot, EvidenceRecord>();
  for (const r of records) {
    if (r.voucherNo === v.voucherNo) bySlot.set(r.slot, r);
  }
  const slots: EvidenceSlotStatus[] = getEvidenceSlots(v).map((s) => ({
    slot: s.slot,
    label: SLOT_LABELS[s.slot],
    chequeNo: s.chequeNo,
    amount: s.amount,
    file: bySlot.get(s.slot) ?? null,
  }));
  const presentCount = slots.filter((s) => s.file !== null).length;
  const missingSlots = slots.filter((s) => s.file === null).map((s) => s.slot);
  let state: EvidenceState = 'none';
  if (slots.length > 0) {
    state = presentCount === 0 ? 'missing' : presentCount === slots.length ? 'complete' : 'partial';
  }
  return { slots, state, missingSlots, presentCount };
}

// -------------------------------------------------------------
// Backend calls (same shape as the payee list: PIN top-level,
// everything else inside `data` — the Apps Script doPost rule).
// -------------------------------------------------------------

function getSessionPin(): string {
  try {
    return sessionStorage.getItem('gvtiw_active_session_pin') || '';
  } catch {
    return '';
  }
}

export function isEvidenceAdmin(): boolean {
  try {
    return sessionStorage.getItem('gvtiw_session_role') !== 'guest';
  } catch {
    return false;
  }
}

async function callEvidenceAction(action: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const webAppUrl = localStorage.getItem('gvtiw_admin_web_app_url') || DEFAULT_WEB_APP_URL;
  const res = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      pin: getSessionPin(),
      action,
      command: action,
      data,
    }),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json || json.success !== true) {
    throw new Error(
      typeof json?.message === 'string' && json.message
        ? json.message
        : 'Evidence service did not return a usable response.'
    );
  }
  return json;
}

function sanitizeRecords(raw: unknown): EvidenceRecord[] | null {
  if (!Array.isArray(raw)) return null;
  const out: EvidenceRecord[] = [];
  for (const r of raw as Array<Record<string, unknown>>) {
    const voucherNo = String(r?.voucherNo ?? '').trim();
    const slot = String(r?.slot ?? '').trim().toUpperCase();
    if (!voucherNo || (slot !== 'NET' && slot !== 'PRA' && slot !== 'IT')) continue;
    out.push({
      uploadedAt: String(r?.uploadedAt ?? ''),
      voucherNo,
      slot: slot as EvidenceSlot,
      chequeNo: String(r?.chequeNo ?? ''),
      fileName: String(r?.fileName ?? ''),
      fileId: String(r?.fileId ?? ''),
      fileUrl: String(r?.fileUrl ?? ''),
      previewUrl: String(r?.previewUrl ?? ''),
    });
  }
  return out;
}

// -------------------------------------------------------------
// Shared index cache (same listener pattern as the payee list):
// one fetch serves every voucher row and the missing filter.
// -------------------------------------------------------------

let cachedRecords: EvidenceRecord[] | null = null;
let cacheFailed = false;
let cacheLoading = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function refreshPaymentEvidence(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    cacheLoading = true;
    try {
      if (!isEvidenceAdmin()) {
        cachedRecords = [];
        cacheFailed = false;
        return;
      }
      const json = await callEvidenceAction('getPaymentEvidenceIndex', {});
      const clean = sanitizeRecords(json?.evidence ?? json?.data?.evidence);
      if (clean === null) throw new Error('Evidence index came back unreadable.');
      cachedRecords = clean;
      cacheFailed = false;
    } catch {
      cachedRecords = null;
      cacheFailed = true;
    } finally {
      cacheLoading = false;
      notify();
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

export interface EvidenceIndexSnapshot {
  records: EvidenceRecord[] | null;
  loading: boolean;
  failed: boolean;
  refresh: () => Promise<void>;
}

export function usePaymentEvidenceIndex(): EvidenceIndexSnapshot {
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(forceRender);
    void refreshPaymentEvidence();
    return () => {
      listeners.delete(forceRender);
    };
  }, []);
  return { records: cachedRecords, loading: cacheLoading, failed: cacheFailed, refresh: refreshPaymentEvidence };
}

// -------------------------------------------------------------
// Upload / delete. Replace is an upsert server-side: uploading
// to a slot that already has a file trashes the old file.
// -------------------------------------------------------------

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function validateEvidenceFile(file: File): string | null {
  const isImage = file.type.indexOf('image/') === 0;
  const isPdf = file.type === 'application/pdf';
  if (!isImage && !isPdf) return 'Only a photo (image) or a scanned PDF can be uploaded as cheque evidence.';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > EVIDENCE_MAX_BYTES) return 'The file is larger than the 10 MB limit. Please scan or photograph it smaller.';
  return null;
}

export async function uploadEvidenceFile(
  voucherNo: string,
  slot: EvidenceSlot,
  chequeNo: string,
  file: File
): Promise<EvidenceRecord> {
  const problem = validateEvidenceFile(file);
  if (problem) throw new Error(problem);
  const base64 = await readFileAsBase64(file);
  const json = await callEvidenceAction('uploadPaymentEvidence', {
    voucherNo,
    slot,
    chequeNo,
    fileName: file.name,
    mimeType: file.type,
    base64,
  });
  await refreshPaymentEvidence();
  return {
    uploadedAt: new Date().toISOString(),
    voucherNo,
    slot,
    chequeNo,
    fileName: String(json.fileName ?? file.name),
    fileId: String(json.fileId ?? ''),
    fileUrl: String(json.fileUrl ?? ''),
    previewUrl: String(json.previewUrl ?? ''),
  };
}

export async function deleteEvidenceFile(voucherNo: string, slot: EvidenceSlot): Promise<void> {
  await callEvidenceAction('deletePaymentEvidence', { voucherNo, slot });
  await refreshPaymentEvidence();
}
