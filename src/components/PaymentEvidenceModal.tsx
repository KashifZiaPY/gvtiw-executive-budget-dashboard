import React, { useEffect, useState } from 'react';
import { X, Upload, Eye, Download, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import type { MasterVoucher } from '../data/cashBookData';
import { formatPKR } from '../lib/formatters';
import {
  usePaymentEvidenceIndex,
  getVoucherEvidenceState,
  uploadEvidenceFile,
  deleteEvidenceFile,
  validateEvidenceFile,
  type EvidenceRecord,
  type EvidenceSlot,
} from '../lib/paymentEvidence';

// =============================================================
// PAYMENT EVIDENCE modal — one row per real cheque slot of the
// voucher (NET / PRA / IT). Missing slots offer an upload;
// filed slots offer View (Drive preview), Download, Replace and
// Delete. Only SIGNED cheque copies are filed here; the unsigned
// copy shown at signing time is not evidence and has no slot.
// =============================================================

interface PaymentEvidenceModalProps {
  voucher: MasterVoucher;
  onClose: () => void;
}

export const PaymentEvidenceModal: React.FC<PaymentEvidenceModalProps> = ({ voucher, onClose }) => {
  const { records, failed, refresh } = usePaymentEvidenceIndex();
  const [uploadingSlot, setUploadingSlot] = useState<EvidenceSlot | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<EvidenceSlot | null>(null);
  const [previewFile, setPreviewFile] = useState<EvidenceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const state = records ? getVoucherEvidenceState(voucher, records) : null;

  const handleFile = async (slot: EvidenceSlot, chequeNo: string, file: File | undefined) => {
    if (!file) return;
    const problem = validateEvidenceFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setUploadingSlot(slot);
    try {
      await uploadEvidenceFile(voucher.voucherNo, slot, chequeNo, file);
      setPreviewFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleDelete = async (slot: EvidenceSlot) => {
    if (confirmDeleteSlot !== slot) {
      setConfirmDeleteSlot(slot);
      return;
    }
    setConfirmDeleteSlot(null);
    setError(null);
    try {
      await deleteEvidenceFile(voucher.voucherNo, slot);
      setPreviewFile((prev) => (prev && prev.slot === slot ? null : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 overflow-y-auto">
      <div className="m-auto w-full max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <span className="font-bold text-xs">
            Payment Evidence — Voucher {voucher.voucherNo} · {voucher.payeeName}
          </span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded cursor-pointer" title="Close (Esc)">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!records && failed && (
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-semibold">
              The evidence service is not available yet — the backend file with the Payment Evidence actions
              has not been deployed. Deploy it, then press Retry.
              <button
                onClick={() => void refresh()}
                className="ml-2 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {!records && !failed && <p className="text-slate-500">Loading evidence…</p>}

          {state && state.slots.length === 0 && (
            <p className="text-slate-500 font-semibold">
              This voucher has no paper cheque (Direct Debit / no cheque number), so there is nothing to file.
            </p>
          )}

          {state &&
            state.slots.map((s) => (
              <div
                key={s.slot}
                className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    {s.label} — Cheque #{s.chequeNo}
                    {s.amount > 0 && (
                      <span className="font-mono font-semibold text-slate-500"> · {formatPKR(s.amount, false)}</span>
                    )}
                  </p>
                  {s.file ? (
                    <p className="text-slate-500 truncate mt-0.5" title={s.file.fileName}>
                      Filed: {s.file.fileName}
                    </p>
                  ) : (
                    <p className="text-rose-600 font-bold mt-0.5">No signed copy filed yet</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {s.file ? (
                    <>
                      <button
                        onClick={() => setPreviewFile(s.file)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <a
                        href={`https://drive.google.com/uc?export=download&id=${s.file.fileId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                      <label
                        className={`px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer ${
                          uploadingSlot === s.slot ? 'opacity-60 pointer-events-none' : ''
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>{uploadingSlot === s.slot ? 'Uploading…' : 'Replace'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => void handleFile(s.slot, s.chequeNo, e.target.files?.[0])}
                        />
                      </label>
                      <button
                        onClick={() => void handleDelete(s.slot)}
                        className={`px-2.5 py-1.5 font-bold rounded-lg flex items-center gap-1 cursor-pointer ${
                          confirmDeleteSlot === s.slot
                            ? 'bg-rose-700 text-white'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{confirmDeleteSlot === s.slot ? 'Confirm delete?' : 'Delete'}</span>
                      </button>
                    </>
                  ) : (
                    <label
                      className={`px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer ${
                        uploadingSlot === s.slot ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{uploadingSlot === s.slot ? 'Uploading…' : 'Upload signed copy'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => void handleFile(s.slot, s.chequeNo, e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}

          {previewFile && (
            <div className="rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden">
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 flex items-center justify-between gap-2">
                <span className="font-bold truncate">{previewFile.fileName}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <a
                    href={previewFile.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Drive</span>
                  </a>
                  <button onClick={() => setPreviewFile(null)} className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
                    Close preview
                  </button>
                </span>
              </div>
              <iframe
                src={previewFile.previewUrl}
                title={previewFile.fileName}
                className="w-full h-[420px] bg-white"
              />
              <p className="px-3 py-1.5 text-[11px] text-slate-500">
                If the preview asks you to sign in, use the Google account that owns the institute Drive, or
                use Open in Drive.
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-500 pt-1">
            Only signed cheque copies are filed here. The unsigned copy shown when the voucher is presented
            for signature is not evidence and has no slot. Photos and scanned PDFs up to 10 MB.
          </p>
        </div>
      </div>
    </div>
  );
};
