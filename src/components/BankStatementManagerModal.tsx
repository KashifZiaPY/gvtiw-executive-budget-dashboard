import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  Plus,
  RefreshCw,
  RotateCcw,
  FileSpreadsheet,
  ArrowRight,
  Landmark,
  Calendar,
  CreditCard,
  Building2,
} from 'lucide-react';
import {
  BankStatementData,
  BankStatementHeader,
  BankStatementTransaction,
} from '../types/bankStatement';
import { generateSampleBOPStatement } from '../utils/bankMatchingEngine';

interface BankStatementManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitStatement: (statement: BankStatementData) => void;
  currentStatement?: BankStatementData | null;
  accountNo: string;
  accountShortName: string;
  branchName?: string;
  darkMode: boolean;
}

export const BankStatementManagerModal: React.FC<BankStatementManagerModalProps> = ({
  isOpen,
  onClose,
  onCommitStatement,
  currentStatement,
  accountNo,
  accountShortName,
  branchName = 'Samanabad Branch, Faisalabad',
  darkMode,
}) => {
  if (!isOpen) return null;

  // Active step: 'UPLOAD' | 'REVIEW_STAGING' | 'MANUAL_ENTRY'
  const [activeStep, setActiveStep] = useState<'UPLOAD' | 'REVIEW_STAGING' | 'MANUAL_ENTRY'>('UPLOAD');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staging Data for Accountant Review
  const [stagingHeader, setStagingHeader] = useState<BankStatementHeader>(() => {
    if (currentStatement?.header) {
      return { ...currentStatement.header };
    }
    return {
      bankName: 'The Bank of Punjab',
      branch: branchName,
      accountNumber: accountNo,
      iban: `PK18BPUN${accountNo}`,
      statementPeriodFrom: '2026-07-01',
      statementPeriodTo: '2026-08-31',
      closingBalance: 3044164.95,
      totalDr: 0,
      totalCr: 0,
    };
  });

  const [stagingRows, setStagingRows] = useState<BankStatementTransaction[]>(() => {
    if (currentStatement?.transactions && currentStatement.transactions.length > 0) {
      return currentStatement.transactions.map((t) => ({ ...t }));
    }
    return [];
  });

  const [sourceType, setSourceType] = useState<'UPLOAD_AI' | 'MANUAL' | 'SAMPLE_BOP'>('UPLOAD_AI');

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setExtractionError('Please upload a PDF document or a scanned image (JPEG/PNG/WEBP).');
      return;
    }
    setSelectedFile(file);
    setExtractionError(null);
    setStatusMessage(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  };

  // Run AI Extraction via server endpoint
  const handleExtractWithGemini = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    setExtractionError(null);
    setStatusMessage('Reading file and sending to Gemini AI for BOP statement analysis...');

    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          // Strip data URL prefix
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(selectedFile);
      });

      setStatusMessage('Extracting transactions, instrument numbers, and statement closing balance...');

      const response = await fetch('/api/extract-bank-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType: selectedFile.type,
          defaultAccountNo: accountNo,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Server failed to process bank statement');
      }

      const extracted = json.data;

      // Update staging state
      setStagingHeader({
        bankName: extracted.bankName || 'The Bank of Punjab',
        branch: extracted.branch || branchName,
        accountNumber: extracted.accountNumber || accountNo,
        iban: extracted.iban || `PK18BPUN${accountNo}`,
        statementPeriodFrom: extracted.statementPeriodFrom || '2026-07-01',
        statementPeriodTo: extracted.statementPeriodTo || '2026-08-31',
        openingBalance: typeof extracted.openingBalance === 'number' ? extracted.openingBalance : undefined,
        closingBalance: Number(extracted.closingBalance) || 0,
        totalDr: Number(extracted.totalDr) || 0,
        totalCr: Number(extracted.totalCr) || 0,
      });

      const rows: BankStatementTransaction[] = (extracted.transactions || []).map(
        (t: any, idx: number) => ({
          id: `ai-tx-${idx + 1}-${Date.now()}`,
          transactionDate: t.transactionDate || '',
          valueDate: t.valueDate || t.transactionDate || '',
          natureOfTransaction: t.natureOfTransaction || 'CHEQUE TRANSACTION',
          instrumentNumber: String(t.instrumentNumber || '').trim(),
          drAmount: Number(t.drAmount) || 0,
          crAmount: Number(t.crAmount) || 0,
          remainingBalance: Number(t.remainingBalance) || 0,
        })
      );

      setStagingRows(rows);
      setSourceType('UPLOAD_AI');
      setActiveStep('REVIEW_STAGING');
      setStatusMessage(`Extracted ${rows.length} rows successfully! Review data before confirming.`);
    } catch (err: any) {
      console.error('Gemini extraction failed:', err);
      let errorMsg = err.message || 'Failed to extract bank statement. You can also review or enter rows manually.';
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed?.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch {}
      if (
        errorMsg.includes('503') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('Spikes in demand') ||
        errorMsg.includes('UNAVAILABLE')
      ) {
        errorMsg =
          'Google Gemini AI is experiencing temporary high demand (503). You can retry in a few moments, or proceed immediately with the Sample BOP Statement or Manual Entry.';
      }
      setExtractionError(errorMsg);
    } finally {
      setIsExtracting(false);
    }
  };

  // Quick Load Sample BOP Statement
  const handleLoadSampleBOP = () => {
    const sample = generateSampleBOPStatement(accountNo);
    setStagingHeader(sample.header);
    setStagingRows(sample.transactions);
    setSourceType('SAMPLE_BOP');
    setActiveStep('REVIEW_STAGING');
    setExtractionError(null);
    setStatusMessage('Loaded official Bank of Punjab sample statement for GVTIW account.');
  };

  // Manual Entry Initializer
  const handleStartManualEntry = () => {
    if (stagingRows.length === 0) {
      setStagingRows([
        {
          id: `manual-tx-${Date.now()}`,
          transactionDate: '2026-08-15',
          valueDate: '2026-08-15',
          natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
          instrumentNumber: '8061107476',
          drAmount: 95400,
          crAmount: 0,
          remainingBalance: 3044164.95,
          isManuallyAdded: true,
        },
      ]);
    }
    setSourceType('MANUAL');
    setActiveStep('REVIEW_STAGING');
  };

  // Staging Row Manipulations
  const handleUpdateRow = (id: string, field: keyof BankStatementTransaction, value: any) => {
    setStagingRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          return updated;
        }
        return r;
      })
    );
  };

  const handleAddRow = () => {
    const lastRow = stagingRows[stagingRows.length - 1];
    const newRow: BankStatementTransaction = {
      id: `new-tx-${Date.now()}`,
      transactionDate: lastRow ? lastRow.transactionDate : '2026-08-31',
      valueDate: lastRow ? lastRow.valueDate : '2026-08-31',
      natureOfTransaction: 'CHEQUE WITHDRAWAL INTERNAL',
      instrumentNumber: '',
      drAmount: 0,
      crAmount: 0,
      remainingBalance: stagingHeader.closingBalance,
      isManuallyAdded: true,
    };
    setStagingRows((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setStagingRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Final confirmation to commit into live reconciliation
  const handleConfirmCommit = () => {
    // Recalculate totals
    const totalDr = stagingRows.reduce((sum, r) => sum + (Number(r.drAmount) || 0), 0);
    const totalCr = stagingRows.reduce((sum, r) => sum + (Number(r.crAmount) || 0), 0);

    const statementToCommit: BankStatementData = {
      sourceType,
      lastUpdated: new Date().toISOString(),
      header: {
        ...stagingHeader,
        totalDr,
        totalCr,
      },
      transactions: stagingRows,
    };

    onCommitStatement(statementToCommit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl my-6 rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/60 bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Bank Statement Reconciliation Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  The Bank of Punjab (BOP)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Account: <strong className="text-slate-200">{accountShortName}</strong> (A/C: {accountNo}) • Smart Instrument Number Matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center border-b border-slate-700/60 bg-slate-800/20 px-5 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveStep('UPLOAD')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeStep === 'UPLOAD'
                ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Upload Document / Scan</span>
          </button>

          <button
            onClick={() => setActiveStep('REVIEW_STAGING')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeStep === 'REVIEW_STAGING'
                ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>2. Review &amp; Verify Rows ({stagingRows.length})</span>
            {stagingRows.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Body Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ============================================================== */}
          {/* STEP 1: UPLOAD & EXTRACTION                                     */}
          {/* ============================================================== */}
          {activeStep === 'UPLOAD' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : darkMode
                    ? 'border-slate-700 hover:border-blue-500/60 bg-slate-800/30'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mb-4 shadow-inner">
                  {isExtracting ? (
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-base font-bold text-white print:text-black">
                  {selectedFile ? selectedFile.name : 'Upload Bank of Punjab E-Statement'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Drag and drop your official PDF statement or scanned images (JPEG, PNG).
                  Gemini will extract all columns: Transaction Date, Nature, Instrument #, Dr, Cr &amp; Balance.
                </p>

                {selectedFile && (
                  <div className="mt-4 px-3 py-1.5 rounded-full bg-slate-800 text-xs text-emerald-400 font-mono border border-slate-700 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready for AI Analysis ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              {/* Status or Error Banner */}
              {statusMessage && !extractionError && (
                <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-blue-300 text-xs flex items-center gap-3">
                  <Sparkles className="w-4 h-4 shrink-0 animate-pulse text-blue-400" />
                  <span className="font-mono">{statusMessage}</span>
                </div>
              )}

              {extractionError && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="leading-relaxed">{extractionError}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20">
                    <button
                      type="button"
                      disabled={!selectedFile || isExtracting}
                      onClick={handleExtractWithGemini}
                      className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry AI Extraction</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleBOP}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Landmark className="w-3 h-3 text-amber-400" />
                      <span>Use Sample Statement</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartManualEntry}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                      <span>Enter Manually</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Extraction Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleLoadSampleBOP}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Landmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>Load Sample BOP Statement</span>
                  </button>

                  <button
                    onClick={handleStartManualEntry}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Manual Entry Table</span>
                  </button>
                </div>

                <button
                  disabled={!selectedFile || isExtracting}
                  onClick={handleExtractWithGemini}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    !selectedFile || isExtracting
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Extracting with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Extract &amp; Parse Statement</span>
                    </>
                  )}
                </button>
              </div>

              {/* Key Insight Guidance Card */}
              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Building2 className="w-4 h-4" />
                  <span>How Bank of Punjab Reconciliation Works:</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  The <strong>Instrument Number</strong> printed on the BOP statement matches the exact Cheque No. (in Date Wise Payments) or Challan No. (in Date Wise Receipts). Extraction output is staged in the next tab for your thorough review and verification before being committed.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: REVIEW & VERIFY ROWS (MANDATORY STAGING STEP)          */}
          {/* ============================================================== */}
          {activeStep === 'REVIEW_STAGING' && (
            <div className="space-y-4">
              {/* Header Cards (Editable Header Metadata) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Bank &amp; Branch</label>
                  <input
                    type="text"
                    value={stagingHeader.bankName}
                    onChange={(e) => setStagingHeader({ ...stagingHeader, bankName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold"
                  />
                  <input
                    type="text"
                    value={stagingHeader.branch}
                    onChange={(e) => setStagingHeader({ ...stagingHeader, branch: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Account No &amp; IBAN</label>
                  <input
                    type="text"
                    value={stagingHeader.accountNumber}
                    onChange={(e) => setStagingHeader({ ...stagingHeader, accountNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white"
                  />
                  <input
                    type="text"
                    value={stagingHeader.iban || ''}
                    onChange={(e) => setStagingHeader({ ...stagingHeader, iban: e.target.value })}
                    placeholder="IBAN"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-300"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Statement Period</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={stagingHeader.statementPeriodFrom || ''}
                      onChange={(e) => setStagingHeader({ ...stagingHeader, statementPeriodFrom: e.target.value })}
                      placeholder="From (YYYY-MM-DD)"
                      className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                    <span className="text-slate-500 text-xs">to</span>
                    <input
                      type="text"
                      value={stagingHeader.statementPeriodTo || ''}
                      onChange={(e) => setStagingHeader({ ...stagingHeader, statementPeriodTo: e.target.value })}
                      placeholder="To (YYYY-MM-DD)"
                      className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Rows in Table: <strong>{stagingRows.length}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-black text-indigo-300">
                      Statement Closing Balance
                    </label>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200">
                      Physical BOP
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-indigo-400 font-mono">Rs.</span>
                    <input
                      type="number"
                      step="0.01"
                      value={stagingHeader.closingBalance}
                      onChange={(e) =>
                        setStagingHeader({
                          ...stagingHeader,
                          closingBalance: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg px-2 py-1 text-sm font-mono font-black text-amber-300 focus:outline-hidden"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">Editable before committing</div>
                </div>
              </div>

              {/* Action Toolbar for Rows */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Statement Transaction Rows:
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                    {stagingRows.length} transactions
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddRow}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Add Row</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Clear all rows in the review table?')) {
                        setStagingRows([]);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Editable Staging Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/60 max-h-[44vh]">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-800 text-slate-200 border-b border-slate-700 font-bold shadow-xs">
                    <tr>
                      <th className="p-2.5 text-center w-10 border-r border-slate-700">#</th>
                      <th className="p-2.5 text-center w-28 border-r border-slate-700">Date</th>
                      <th className="p-2.5 text-center w-28 border-r border-slate-700">Value Date</th>
                      <th className="p-2.5 text-left min-w-[200px] border-r border-slate-700">Nature of Transaction</th>
                      <th className="p-2.5 text-center w-32 border-r border-slate-700">
                        Instrument # <br />
                        <span className="text-[10px] font-normal text-amber-300">(Cheque No)</span>
                      </th>
                      <th className="p-2.5 text-right w-28 border-r border-slate-700 text-rose-400">Dr. Amount (Rs.)</th>
                      <th className="p-2.5 text-right w-28 border-r border-slate-700 text-emerald-400">Cr. Amount (Rs.)</th>
                      <th className="p-2.5 text-right w-28 border-r border-slate-700">Remaining Balance</th>
                      <th className="p-2.5 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagingRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          No transactions in staging review. Click "Add Row" or load statement.
                        </td>
                      </tr>
                    ) : (
                      stagingRows.map((r, idx) => (
                        <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                          <td className="p-2 text-center text-slate-500 font-mono border-r border-slate-800">
                            {idx + 1}
                          </td>
                          <td className="p-1 border-r border-slate-800">
                            <input
                              type="text"
                              value={r.transactionDate}
                              onChange={(e) => handleUpdateRow(r.id, 'transactionDate', e.target.value)}
                              className="w-full bg-transparent px-1.5 py-1 text-center font-mono text-slate-200 focus:bg-slate-800 rounded border border-transparent focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-800">
                            <input
                              type="text"
                              value={r.valueDate || ''}
                              onChange={(e) => handleUpdateRow(r.id, 'valueDate', e.target.value)}
                              className="w-full bg-transparent px-1.5 py-1 text-center font-mono text-slate-400 focus:bg-slate-800 rounded border border-transparent focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-800">
                            <input
                              type="text"
                              value={r.natureOfTransaction}
                              onChange={(e) => handleUpdateRow(r.id, 'natureOfTransaction', e.target.value)}
                              className="w-full bg-transparent px-1.5 py-1 text-left text-slate-200 focus:bg-slate-800 rounded border border-transparent focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-800">
                            <input
                              type="text"
                              value={r.instrumentNumber}
                              onChange={(e) => handleUpdateRow(r.id, 'instrumentNumber', e.target.value)}
                              placeholder="e.g. 8061107476"
                              className="w-full bg-transparent px-1.5 py-1 text-center font-mono font-bold text-amber-300 focus:bg-slate-800 rounded border border-transparent focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={r.drAmount}
                              onChange={(e) => handleUpdateRow(r.id, 'drAmount', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent px-1.5 py-1 text-right font-mono text-rose-300 font-semibold focus:bg-slate-800 rounded border border-transparent focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={r.crAmount}
                              onChange={(e) => handleUpdateRow(r.id, 'crAmount', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent px-1.5 py-1 text-right font-mono text-emerald-300 font-semibold focus:bg-slate-800 rounded border border-transparent focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-800">
                            <input
                              type="number"
                              step="0.01"
                              value={r.remainingBalance}
                              onChange={(e) => handleUpdateRow(r.id, 'remainingBalance', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent px-1.5 py-1 text-right font-mono text-slate-300 focus:bg-slate-800 rounded border border-transparent focus:border-blue-500"
                            />
                          </td>
                          <td className="p-1 text-center">
                            <button
                              onClick={() => handleDeleteRow(r.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Confirmation / Commit Banner */}
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Accountant Verification Guarantee</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Confirming will feed these verified rows directly into the reconciliation engine, matching exact Instrument Numbers against cash book cheques.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel / Discard
                  </button>

                  <button
                    onClick={handleConfirmCommit}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Commit Statement</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
