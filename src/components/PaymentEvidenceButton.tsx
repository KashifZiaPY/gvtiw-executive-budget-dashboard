import React, { useState } from 'react';
import { AlertTriangle, Eye, Paperclip } from 'lucide-react';
import type { MasterVoucher } from '../data/cashBookData';
import {
  usePaymentEvidenceIndex,
  getVoucherEvidenceState,
  isEvidenceAdmin,
} from '../lib/paymentEvidence';
import { PaymentEvidenceModal } from './PaymentEvidenceModal';

// =============================================================
// PAYMENT EVIDENCE button — sits right after the PAF button in
// a voucher row and IS the missing-copy flag:
//   red    "Missing: Net, PRA"  — a real cheque slot has no copy
//   amber  "Evidence 2/3"       — partially filed
//   green  "View"               — every cheque slot has its copy
// Vouchers with no paper cheque (Direct Debit / '0' slots) show
// nothing. Guests never see the button (evidence is admin-only).
// No prompt ever appears at voucher save or print: the cheque is
// unsigned at that point, so the row flag is the only reminder.
// =============================================================

const SLOT_SHORT: Record<string, string> = { NET: 'Net', PRA: 'PRA', IT: 'Income Tax' };

interface PaymentEvidenceButtonProps {
  voucher: MasterVoucher;
}

export const PaymentEvidenceButton: React.FC<PaymentEvidenceButtonProps> = ({ voucher }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { records, failed } = usePaymentEvidenceIndex();

  if (!isEvidenceAdmin()) return null;

  const state = records ? getVoucherEvidenceState(voucher, records) : null;
  if (state && state.state === 'none') return null;

  let className =
    'px-2.5 py-1.5 font-bold text-[10px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer border ';
  let title = 'Payment evidence (signed cheque copies)';
  let content: React.ReactNode;

  if (!state) {
    className +=
      'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200';
    title = failed
      ? 'Payment evidence service is unavailable — the backend file needs to be deployed first.'
      : 'Loading payment evidence…';
    content = (
      <>
        <Paperclip className="w-3 h-3" />
        <span>Evidence</span>
      </>
    );
  } else if (state.state === 'missing') {
    const missing = state.missingSlots.map((s) => SLOT_SHORT[s]).join(', ');
    className +=
      'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100';
    title = `Missing signed cheque copy: ${missing}. Click to upload.`;
    content = (
      <>
        <AlertTriangle className="w-3 h-3" />
        <span>Missing: {missing}</span>
      </>
    );
  } else if (state.state === 'partial') {
    className +=
      'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100';
    title = `Partially filed — missing: ${state.missingSlots.map((s) => SLOT_SHORT[s]).join(', ')}. Click to upload the rest.`;
    content = (
      <>
        <AlertTriangle className="w-3 h-3" />
        <span>
          Evidence {state.presentCount}/{state.slots.length}
        </span>
      </>
    );
  } else {
    className +=
      'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100';
    title = 'All signed cheque copies filed. Click to view.';
    content = (
      <>
        <Eye className="w-3 h-3" />
        <span>View</span>
      </>
    );
  }

  return (
    <>
      <button onClick={() => setModalOpen(true)} className={className} title={title}>
        {content}
      </button>
      {modalOpen && <PaymentEvidenceModal voucher={voucher} onClose={() => setModalOpen(false)} />}
    </>
  );
};
