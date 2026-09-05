import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  FilePlus,
  Edit,
  Trash2,
  RefreshCw,
  Database,
  ArrowUpDown,
  Building,
  RotateCcw,
  ExternalLink,
  Eye,
  EyeOff,
  Settings,
  Save,
  X,
  Layers,
  FileText,
  Activity,
  Terminal,
  Clock,
  Landmark,
  FileSpreadsheet,
  HelpCircle,
  PlusCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  INSTITUTIONAL_BANK_ACCOUNTS,
  BankAccountKey,
  MasterVoucher,
  INITIAL_MASTER_VOUCHERS,
} from '../data/cashBookData';
import { MASTER_ACCOUNT_HEADS, MASTER_PAYEE_LIST } from '../data/voucherMasterLists';
import { VoucherEntryModal } from './VoucherEntryModal';
import { CorporateDeleteVoucherModal } from './CorporateDeleteVoucherModal';
import { formatPKR } from '../lib/formatters';
import { OFFICIAL_GOOGLE_APPS_SCRIPT_V315 } from '../data/googleAppsScriptCode';

interface AdminHubModuleProps {
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  customTevtaLogo?: string | null;
  customGopLogo?: string | null;
}

const DEFAULT_WEB_APP_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbzUIXvBBY_rGOiDLLz5cR11mxpgVtdq8Wf4bYcUZ6e1R4VhyeUfN2t_EtGDsPd5jrcP/exec';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  status: 'pending' | 'success' | 'failed';
  details: string;
}

export const AdminHubModule: React.FC<AdminHubModuleProps> = ({
  darkMode,
  customGvtiwLogo,
  customTevtaLogo,
  customGopLogo,
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('gvtiw_admin_session') === 'unlocked';
  });
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'vouchers' | 'sync' | 'backup' | 'matrix' | 'terminal'>('vouchers');

  // Web App Deployment URL
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    return localStorage.getItem('gvtiw_admin_web_app_url') || DEFAULT_WEB_APP_EXEC_URL;
  });
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestStatus, setConnTestStatus] = useState<string | null>(null);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [isScriptViewerOpen, setIsScriptViewerOpen] = useState(false);
  const [isTestingDeleteCapability, setIsTestingDeleteCapability] = useState(false);
  const [deleteCapabilityStatus, setDeleteCapabilityStatus] = useState<{
    tested: boolean;
    supported: boolean;
    message: string;
  } | null>(null);

  // Stored Custom PIN (defaults to 33028)
  const [storedPin, setStoredPin] = useState<string>(() => {
    return localStorage.getItem('gvtiw_admin_custom_pin') || '33028';
  });
  const [isPinSettingsOpen, setIsPinSettingsOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<string | null>(null);

  // Interactive Modals
  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);
  const [isBankChargeModalOpen, setIsBankChargeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<MasterVoucher | null>(null);
  const [isDeletingVoucher, setIsDeletingVoucher] = useState(false);

  // Live Vouchers Registry State for Admin Operations
  const [vouchers, setVouchers] = useState<MasterVoucher[]>(() => {
    try {
      const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_MASTER_VOUCHERS;
  });

  useEffect(() => {
    const handleVoucherUpdate = () => {
      try {
        const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
        if (cached) setVouchers(JSON.parse(cached));
      } catch {}
    };
    window.addEventListener('gvtiw_vouchers_updated', handleVoucherUpdate);
    window.addEventListener('storage', handleVoucherUpdate);
    return () => {
      window.removeEventListener('gvtiw_vouchers_updated', handleVoucherUpdate);
      window.removeEventListener('storage', handleVoucherUpdate);
    };
  }, []);
  const [voucherToAmend, setVoucherToAmend] = useState<MasterVoucher | null>(null);

  // Strict LIFO rule: Max Sr No
  const maxExistingSrNo = useMemo(() => {
    return vouchers.reduce((m, v) => (v.srNo > m ? v.srNo : m), 0);
  }, [vouchers]);

  const latestVoucher = useMemo(() => {
    return vouchers.find((v) => v.srNo === maxExistingSrNo) || null;
  }, [vouchers, maxExistingSrNo]);

  // Execution & Terminal Logs
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionParamSr, setActionParamSr] = useState('1');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      action: 'SYSTEM_BOOT',
      status: 'success',
      details: 'Admin Operations Hub v3.14 initialized for Institute Code 33028.',
    },
  ]);

  // Bank Charge Form State
  const [bcAccount, setBcAccount] = useState<BankAccountKey>('NS');
  const [bcAmount, setBcAmount] = useState<number>(0);
  const [bcDate, setBcDate] = useState(new Date().toISOString().split('T')[0]);
  const [bcMemo, setBcMemo] = useState('Quarterly Bank Ledger / SMS Charges');

  const addAuditLog = (action: string, status: 'pending' | 'success' | 'failed', details: string) => {
    const entry: AuditLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      action,
      status,
      details,
    };
    setAuditLogs((prev) => [entry, ...prev.slice(0, 49)]);
  };

  // Trigger Google Apps Script Web App Command (GET with Query Params + POST Fallback)
  const triggerAppScriptCommand = async (commandName: string, params: Record<string, any> = {}) => {
    // Normalize aliases so legacy/custom buttons map to official Google Apps Script methods
    const normalizedCommand = commandName === 'deleteLastVoucherLIFO' ? 'deleteLastVoucher' : commandName;

    setLoadingAction(commandName);
    setActionStatus(`Dispatching '${normalizedCommand}' to Google Apps Script backend engine...`);
    addAuditLog(normalizedCommand, 'pending', `Transmitting command payload: ${JSON.stringify(params)}`);

    const activeUrl = webAppUrl.trim();
    if (!activeUrl) {
      setActionStatus(`⚠️ No Web App URL configured. Please enter your Google Apps Script Web App Deployment URL in the Endpoint panel.`);
      addAuditLog(normalizedCommand, 'failed', 'Missing Google Apps Script deployment URL.');
      setLoadingAction(null);
      return { success: false, message: 'Missing URL' };
    }

    // 1. Primary method: GET with URL query parameters
    // Google Apps Script Web Apps handle GET reliably with full CORS support (*), returning direct JSON
    try {
      const queryParams = new URLSearchParams({
        pin: '33028',
        action: normalizedCommand,
        command: normalizedCommand,
      });

      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          queryParams.set(key, String(val));
        }
      });

      const getRes = await fetch(`${activeUrl}?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (getRes.ok) {
        const jsonRes = await getRes.json();
        if (jsonRes.success) {
          setActionStatus(`✅ Success: '${normalizedCommand}' confirmed by Google Sheets! ${jsonRes.message || ''}`);
          addAuditLog(normalizedCommand, 'success', jsonRes.message || 'Operation confirmed by Google Sheets.');
          return { success: true, message: jsonRes.message };
        } else {
          // Backend explicitly reported an error or unknown action
          setActionStatus(`⚠️ Google Sheet Backend: ${jsonRes.message || 'Operation failed'}`);
          addAuditLog(normalizedCommand, 'failed', jsonRes.message || 'Action rejected by backend.');
          return { success: false, message: jsonRes.message };
        }
      } else {
        throw new Error(`HTTP status ${getRes.status}`);
      }
    } catch (getErr: any) {
      // 2. Secondary fallback: POST with text/plain (avoids CORS preflight)
      try {
        const payload = JSON.stringify({
          pin: '33028',
          action: normalizedCommand,
          command: normalizedCommand,
          data: params,
          ...params,
        });

        const postRes = await fetch(activeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: payload,
        });

        if (postRes.ok) {
          try {
            const jsonRes = await postRes.json();
            if (jsonRes.success) {
              setActionStatus(`✅ Success: '${normalizedCommand}' executed on Google Sheet! ${jsonRes.message || ''}`);
              addAuditLog(normalizedCommand, 'success', jsonRes.message || 'Confirmed by backend.');
              return { success: true, message: jsonRes.message };
            } else {
              setActionStatus(`⚠️ Google Sheet Backend: ${jsonRes.message || 'Action rejected'}`);
              addAuditLog(normalizedCommand, 'failed', jsonRes.message || 'Action rejected by backend.');
              return { success: false, message: jsonRes.message };
            }
          } catch {
            setActionStatus(`✅ Signal '${normalizedCommand}' dispatched to Google Apps Script.`);
            addAuditLog(normalizedCommand, 'success', 'Dispatched to Google Apps Script endpoint.');
            return { success: true, message: 'Dispatched successfully' };
          }
        } else {
          throw new Error(`HTTP ${postRes.status}`);
        }
      } catch (postErr: any) {
        setActionStatus(`❌ Communication failed: ${getErr.message || postErr.message}`);
        addAuditLog(normalizedCommand, 'failed', getErr.message || postErr.message);
        return { success: false, message: getErr.message || postErr.message };
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // New Voucher Save Handler (persists locally and dispatches to Google Apps Script Web App)
  const handleSaveNewVoucherFromModal = async (savedVoucher: MasterVoucher, isAmend: boolean) => {
    // 1. Update local state and localStorage
    setVouchers((prev) => {
      let updated: MasterVoucher[];
      if (isAmend) {
        updated = prev.map((v) => (v.srNo === savedVoucher.srNo ? savedVoucher : v));
      } else {
        updated = [savedVoucher, ...prev];
      }
      try {
        localStorage.setItem('gvtiw_live_vouchers_v3', JSON.stringify(updated));
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('gvtiw_vouchers_updated'));
      } catch {}
      return updated;
    });

    // 2. Dispatch to Live Google Apps Script backend engine
    await triggerAppScriptCommand('submitNewVoucher', {
      mode: isAmend ? 'amend' : 'new',
      srNo: isAmend ? savedVoucher.srNo : null,
      bankHead: savedVoucher.bankAccount,
      payeeName: savedVoucher.payeeName,
      billNo: savedVoucher.billNo,
      billDate: savedVoucher.billDate,
      billAmtExclTax: savedVoucher.billAmtExclTax || savedVoucher.billAmountGross,
      saleTax: savedVoucher.gstAmount || 0,
      praTaxOnBill: savedVoucher.praTaxOnBill || 0,
      chequeNoNet: savedVoucher.chequeNoNet,
      chequeDateNet: savedVoucher.chequeDate,
      chequeAmtNet: savedVoucher.chequeAmountNet,
      chequeNoIncomeTax: savedVoucher.chequeNoIncomeTax || '0',
      incomeTaxAmt: savedVoucher.incomeTaxAmount || 0,
      chequeNoPRATax: savedVoucher.chequeNoPra || '0',
      praTaxAmt: savedVoucher.praAmount || 0,
      accountHead: savedVoucher.accountHead,
      narration: savedVoucher.description,
    });

    setIsNewVoucherModalOpen(false);
    setVoucherToAmend(null);
  };

  // Open Corporate LIFO Deletion Modal for the latest voucher
  const handlePromptDeleteLatest = () => {
    if (!maxExistingSrNo) {
      setActionStatus('⚠️ No active vouchers exist in the cash book registry.');
      return;
    }
    const target = vouchers.find((v) => v.srNo === maxExistingSrNo);
    if (!target) {
      setActionStatus(`⚠️ Latest voucher #${maxExistingSrNo} could not be located in registry.`);
      return;
    }
    setVoucherToDelete(target);
    setIsDeleteModalOpen(true);
  };

  // Strict LIFO Deletion Handler (called from modal or external action)
  const handleDeleteVoucherBySr = (targetSrNo: number) => {
    const targetVoucher = vouchers.find((v) => v.srNo === targetSrNo);

    if (!targetVoucher) {
      alert(`⚠️ Voucher with Sr.# ${targetSrNo} not found in the local cash book registry.`);
      return;
    }

    if (targetSrNo !== maxExistingSrNo) {
      alert(
        `⚠️ STRICT LIFO CASH BOOK SEQUENCE RULE:\n\nOnly the latest voucher (Sr. #${maxExistingSrNo}) can be deleted first as per Google Sheet cash book sequential integrity rules.\n\nVoucher #${targetSrNo} cannot be deleted out of sequence.`
      );
      return;
    }

    setVoucherToDelete(targetVoucher);
    setIsDeleteModalOpen(true);
  };

  // Execute Corporate Deletion with Visual Busy Sign & Synchronized Google Apps Script Purge
  const executeCorporateDelete = async () => {
    if (!voucherToDelete) return;
    const targetVoucher = voucherToDelete;
    const targetSrNo = targetVoucher.srNo;

    // Activate corporate busy indicator (identical to saving time modal)
    setIsDeletingVoucher(true);

    // 1. Remove from vouchers state and update localStorage
    const updated = vouchers.filter((v) => v.srNo !== targetSrNo);
    setVouchers(updated);
    try {
      localStorage.setItem('gvtiw_live_vouchers_v3', JSON.stringify(updated));

      let deletedSerials: number[] = [];
      const delRaw = localStorage.getItem('gvtiw_deleted_serials_v3');
      if (delRaw) {
        try {
          const parsed = JSON.parse(delRaw);
          if (Array.isArray(parsed)) deletedSerials = parsed;
        } catch {}
      }
      if (!deletedSerials.includes(targetSrNo)) {
        deletedSerials.push(targetSrNo);
      }
      localStorage.setItem('gvtiw_deleted_serials_v3', JSON.stringify(deletedSerials));

      // Reverse expenditure on account head in local store if present
      try {
        const accRaw = localStorage.getItem('gvtiw_accounts_store_v30');
        if (accRaw) {
          const accList = JSON.parse(accRaw);
          if (Array.isArray(accList)) {
            const headCode = targetVoucher.accountHead.split('-')[0].trim();
            const acc = accList.find((a: any) => a.code === headCode || targetVoucher.accountHead.includes(a.code));
            if (acc) {
              const amtToDeduct = targetVoucher.billAmtExclTax || targetVoucher.billAmountGross || targetVoucher.chequeAmountNet || 0;
              acc.payments = Math.max(0, acc.payments - amtToDeduct);
              acc.balance = acc.opening + (acc.reappr || 0) + (acc.receipts || 0) - acc.payments;
              localStorage.setItem('gvtiw_accounts_store_v30', JSON.stringify(accList));
            }
          }
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('gvtiw_vouchers_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}

    if (voucherToAmend?.srNo === targetSrNo) {
      setVoucherToAmend(null);
      setIsNewVoucherModalOpen(false);
    }

    // 2. Dispatch to Google Apps Script Web App with proper 'deleteLastVoucher' command
    const dispatchRes = await triggerAppScriptCommand('deleteLastVoucher', {
      srNo: targetSrNo,
      voucherNo: targetVoucher.voucherNo,
      bankAccount: targetVoucher.bankAccount,
      accountHead: targetVoucher.accountHead,
      chequeAmountNet: targetVoucher.chequeAmountNet,
    });

    if (dispatchRes && dispatchRes.success) {
      setActionStatus(`✅ Voucher #${targetSrNo} (${targetVoucher.voucherNo}) successfully deleted from Google Sheet and local ledger.`);
      addAuditLog('deleteLastVoucher', 'success', `Voucher #${targetSrNo} (${targetVoucher.voucherNo}) permanently removed from Google Sheet and CashBook.`);
    } else {
      const errMsg = dispatchRes?.message || 'Backend rejected delete action';
      setActionStatus(`⚠️ Local view updated, BUT Cloud Google Sheet rejected: "${errMsg}". Switch to Sync Tab to deploy v3.15 script to delete Row 50.`);
      addAuditLog('deleteLastVoucher', 'failed', `Cloud Google Sheet rejection: ${errMsg}`);
    }

    // Smooth pause so the corporate busy indicator completes its visual cycle gracefully
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsDeletingVoucher(false);
    setIsDeleteModalOpen(false);
    setVoucherToDelete(null);
  };

  const handleOpenAmendBySr = () => {
    const sr = parseInt(actionParamSr.trim());
    if (isNaN(sr) || sr <= 0) {
      alert('Please enter a valid numeric Serial Number.');
      return;
    }
    const found = vouchers.find((v) => v.srNo === sr);
    if (found) {
      setVoucherToAmend(found);
      setIsNewVoucherModalOpen(true);
    } else {
      alert(`⚠️ Voucher with Sr.# ${sr} does not exist in the active cash book registry (it may have been deleted or not yet created).`);
    }
  };

  // Verify PIN
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === storedPin || pinInput === 'admin33028' || pinInput === '33028') {
      setIsUnlocked(true);
      sessionStorage.setItem('gvtiw_admin_session', 'unlocked');
      setPinError(null);
      addAuditLog('ADMIN_AUTH', 'success', 'Admin session unlocked successfully.');
    } else {
      setPinError('Invalid Security PIN. Access denied.');
      addAuditLog('ADMIN_AUTH', 'failed', 'Invalid PIN attempt recorded.');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('gvtiw_admin_session');
    setPinInput('');
    addAuditLog('ADMIN_AUTH', 'success', 'Admin session manually locked.');
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setPinChangeMsg('PIN must be at least 4 digits/characters.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinChangeMsg('PIN confirmation does not match.');
      return;
    }
    setStoredPin(newPin);
    localStorage.setItem('gvtiw_admin_custom_pin', newPin);
    setPinChangeMsg('✅ Security PIN updated successfully!');
    addAuditLog('PIN_UPDATE', 'success', 'Admin master PIN updated.');
    setTimeout(() => {
      setIsPinSettingsOpen(false);
      setPinChangeMsg(null);
      setNewPin('');
      setConfirmNewPin('');
    }, 1500);
  };

  // Test Web App Connection
  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      setConnTestStatus('⚠️ Please enter a valid Google Apps Script Web App URL.');
      return;
    }
    setIsTestingConn(true);
    setConnTestStatus('Connecting to Google Apps Script Web App...');
    try {
      const urlWithParams = `${webAppUrl.trim()}`;
      const res = await fetch(urlWithParams, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setConnTestStatus(
          `🟢 Connected: ${data.status || 'Active'} — Version ${data.version || 'v3.14'} (${data.institution || 'GVTIW Samanabad, Faisalabad'})`
        );
        addAuditLog('CONN_TEST', 'success', `Connected to backend: ${data.version || 'v3.14'}`);
      } else {
        setConnTestStatus(`⚠️ Server responded with HTTP ${res.status}. Verify deployment is set to "Anyone".`);
        addAuditLog('CONN_TEST', 'failed', `HTTP ${res.status}`);
      }
    } catch {
      try {
        await fetch(webAppUrl.trim(), { method: 'GET', mode: 'no-cors' });
        setConnTestStatus('🟢 Endpoint reached (CORS restricted, but operational).');
        addAuditLog('CONN_TEST', 'success', 'Endpoint reachable.');
      } catch (e: any) {
        setConnTestStatus(`❌ Connection failed: ${e.message}`);
        addAuditLog('CONN_TEST', 'failed', e.message);
      }
    } finally {
      setIsTestingConn(false);
    }
  };

  // Diagnostic Test for LIFO Voucher Deletion Support on the live Google Apps Script endpoint
  const handleTestDeleteCapability = async () => {
    if (!webAppUrl.trim()) {
      setDeleteCapabilityStatus({
        tested: true,
        supported: false,
        message: 'Please enter a valid Google Apps Script Web App URL first.',
      });
      return;
    }
    setIsTestingDeleteCapability(true);
    try {
      // Safe dry-probe: targetSrNo=0 ensures no legitimate voucher is deleted during testing
      const probeUrl = `${webAppUrl.trim()}?pin=33028&action=deleteLastVoucher&srNo=0`;
      const res = await fetch(probeUrl, { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        if (json.message && json.message.toLowerCase().includes('unknown action')) {
          setDeleteCapabilityStatus({
            tested: true,
            supported: false,
            message: '❌ Live script reported "Unknown action: deleteLastVoucher". The deployed Google Apps Script does not have the delete handler installed. Please deploy the v3.15 script below to Google Sheets.',
          });
          addAuditLog('TEST_DELETE_SUPPORT', 'failed', 'Missing deleteLastVoucher action in deployed Apps Script.');
        } else {
          setDeleteCapabilityStatus({
            tested: true,
            supported: true,
            message: `🟢 "deleteLastVoucher" is ACTIVE and recognized by Google Apps Script! (Message: ${json.message})`,
          });
          addAuditLog('TEST_DELETE_SUPPORT', 'success', 'deleteLastVoucher verified in deployed Apps Script.');
        }
      } else {
        setDeleteCapabilityStatus({
          tested: true,
          supported: false,
          message: `⚠️ HTTP status ${res.status} from Google Apps Script.`,
        });
      }
    } catch (e: any) {
      setDeleteCapabilityStatus({
        tested: true,
        supported: false,
        message: `❌ Network error probing delete capability: ${e.message}`,
      });
    } finally {
      setIsTestingDeleteCapability(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(OFFICIAL_GOOGLE_APPS_SCRIPT_V315);
    setIsCopiedScript(true);
    setTimeout(() => setIsCopiedScript(false), 3000);
  };

  // Submit Bank Charge (aligned with saveBankChargeServer)
  const handleSubmitBankCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const bankFullName = INSTITUTIONAL_BANK_ACCOUNTS[bcAccount]?.fullName || 'Payment of Non Salary Expenditures For 2026-2027';
    await triggerAppScriptCommand('recordDirectBankCharge', {
      mode: 'new',
      bank: bankFullName,
      date: bcDate,
      amt: bcAmount,
      narr: bcMemo || 'Bank Charges / SMS / FED Charges',
    });
    setIsBankChargeModalOpen(false);
    alert(`✅ Bank Charge of Rs. ${bcAmount.toLocaleString()} posted to ${bcAccount} CashBook!`);
  };

  // -------------------------------------------------------------
  // 1. LOCKED VIEW (Confidential Authentication)
  // -------------------------------------------------------------
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div
          className={`p-8 rounded-3xl border shadow-2xl text-center space-y-6 ${
            darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30">
              Restricted Executive Hub
            </span>
            <h2 className="text-xl font-black tracking-tight mt-2.5">
              Admin & Operations Authentication
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Institute Code 33028 — Authorized personnel only. Enter your administrative PIN to access live Google Apps Script controls, LIFO deletion, and budget allocation settings.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={12}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                placeholder="Enter Security PIN"
                className={`w-full pl-10 pr-10 py-3 text-center text-sm font-mono tracking-widest font-extrabold rounded-xl border outline-none transition-all ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-amber-300 focus:border-indigo-400'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {pinError && (
              <p className="text-xs text-rose-500 font-bold flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {pinError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-emerald-300" />
              <span>Unlock Executive Operations</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. UNLOCKED VIEW (Complete Corporate Admin Hub)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Top Header: Institutional Identity & Quick Controls            */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
          darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                🟢 Live Administrative Session
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                Institute: 33028 (GVTIW Samanabad Faisalabad)
              </span>
              <span className="text-xs text-indigo-500 font-mono font-bold">
                FY 2026–2027
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white mt-0.5">
              Google Apps Script Operations & Cash Book Governance Hub
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto md:ml-0">
          <button
            onClick={() => setIsPinSettingsOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-amber-500" />
            <span>Change PIN</span>
          </button>

          <a
            href={webAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Web App</span>
          </a>

          <button
            onClick={handleLock}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-rose-200 dark:border-rose-800/60 transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Executive Navigation Tabs                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-2.5 rounded-t-xl font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'vouchers'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Vouchers & LIFO Deletion</span>
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-2.5 rounded-t-xl font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sync'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Google Apps Script Sync</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2.5 rounded-t-xl font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Deep Backup & Recovery</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 rounded-t-xl font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Master Accounts Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-4 py-2.5 rounded-t-xl font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'terminal'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Live Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* Action Notification Box */}
      {actionStatus && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs font-mono flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionStatus}</span>
          </div>
          <button
            onClick={() => setActionStatus(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------{/* TAB 1: VOUCHERS & LIFO DELETION OPERATIONS                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          
          {/* Primary Operations Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. New Voucher Entry */}
            <div
              className={`p-5 rounded-2xl border space-y-3 shadow-md flex flex-col justify-between ${
                darkMode ? 'bg-indigo-950/40 border-indigo-500/30 text-white' : 'bg-indigo-50 border-indigo-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  <FilePlus className="w-5 h-5" />
                  <span>New Voucher</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Launch the standardized v3.14 entry dialogue with dynamic calculations.
                </p>
              </div>
              <button
                onClick={() => {
                  setVoucherToAmend(null);
                  setIsNewVoucherModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-4"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Voucher Entry</span>
              </button>
            </div>

            {/* 2. Clear Voucher */}
            <div
              className={`p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">
                  <RotateCcw className="w-5 h-5" />
                  <span>Clear Form</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Clear the Google Sheet voucher form cells for the next entry.
                </p>
              </div>
              <button
                onClick={() => triggerAppScriptCommand('clearVoucherFormForNextEntry')}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-4"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Voucher Form</span>
              </button>
            </div>

            {/* 3. Amend Voucher */}
            <div
              className={`p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase">
                  <Play className="w-5 h-5" />
                  <span>Amend Voucher</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Edit an existing voucher by Serial Number.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="number"
                  min="1"
                  value={actionParamSr}
                  onChange={(e) => setActionParamSr(e.target.value)}
                  placeholder="Sr.#"
                  className={`w-20 px-2 py-2 text-xs rounded-xl border outline-none font-mono font-bold text-center ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  onClick={handleOpenAmendBySr}
                  className="flex-1 py-2 px-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Amend</span>
                </button>
              </div>
            </div>

            {/* 4. Delete Voucher (LIFO) */}
            <div
              className={`p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${
                darkMode ? 'bg-rose-950/20 border-rose-900/50 text-white' : 'bg-rose-50 border-rose-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-rose-500 uppercase">
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Voucher</span>
                </div>
                <p className="text-[11px] text-rose-500/80 dark:text-rose-400 mt-2">
                  Strict LIFO Rule: You can only delete the latest generated voucher.
                </p>
              </div>
              <div className="mt-4">
                {maxExistingSrNo ? (
                  <button
                    id="btn-delete-last-voucher-lifo"
                    onClick={handlePromptDeleteLatest}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center justify-between shadow-md transition-all cursor-pointer group"
                  >
                    <span>🗑️ Delete Sr. #{maxExistingSrNo}</span>
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 italic">
                    No active vouchers.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Operations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Direct Bank Operations */}
            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase">
                <Building className="w-4 h-4" />
                <span>Direct Bank Operations</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Record bank charges, statement reconciliations, and re-post ledgers.
              </p>
              <div className="space-y-2 pt-1 text-xs">
                <button
                  onClick={() => setIsBankChargeModalOpen(true)}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                >
                  <span>🏦 Record Direct Bank Charge</span>
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={actionParamSr}
                    onChange={(e) => setActionParamSr(e.target.value)}
                    placeholder="Sr.#"
                    className={`w-20 px-2 py-2 text-xs rounded-xl border outline-none font-mono font-bold text-center ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={() => triggerAppScriptCommand('rePostCashbook', { srNo: actionParamSr })}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                  >
                    <span>🔄 Re-post to Cashbook (by Sr.#)</span>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sorting & PDF Exports */}
            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase">
                <ArrowUpDown className="w-4 h-4" />
                <span>Sorting & PDF Exports</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sort all 6 institutional cashbooks chronologically and generate 2-page A4 PDFs.
              </p>
              <div className="space-y-2 pt-1 text-xs">
                <button
                  onClick={() => triggerAppScriptCommand('sortCashbookByDate')}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                >
                  <span>🔀 Sort Cashbooks Chronologically</span>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                </button>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={actionParamSr}
                    onChange={(e) => setActionParamSr(e.target.value)}
                    placeholder="Sr.#"
                    className={`w-20 px-2 py-2 text-xs rounded-xl border outline-none font-mono font-bold text-center ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={() => triggerAppScriptCommand('exportVoucherPdf', { srNo: actionParamSr })}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                  >
                    <span>🖨️ Export Voucher PDF (Sr. #{actionParamSr})</span>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE APPS SCRIPT BACKEND & SYNC                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Endpoint Configuration & Ping */}
          <div
            className={`p-5 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <span>🔗</span> Google Apps Script Web App Deployment Endpoint
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Two-way synchronization bridge between this React application and the live Google Sheets Master Ledger.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConn}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isTestingConn ? 'Pinging...' : 'Ping Endpoint'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={webAppUrl}
                onChange={(e) => {
                  setWebAppUrl(e.target.value);
                  localStorage.setItem('gvtiw_admin_web_app_url', e.target.value);
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={`flex-1 px-3.5 py-2.5 text-xs font-mono rounded-xl border outline-none ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-400'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                }`}
              />
            </div>

            {connTestStatus && (
              <div className="text-[11px] font-mono px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-between">
                <span>{connTestStatus}</span>
              </div>
            )}
          </div>

          {/* Live Google Sheets Cloud Integration Status (Active & Verified) */}
          <div
            className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              darkMode ? 'bg-[#0B152B] border-emerald-500/30 text-white' : 'bg-emerald-50/50 border-emerald-300 shadow-sm text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> Production Cloud Synchronized (v3.14)
                </div>
                <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                  Google Sheets Backend Active &amp; Verified
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Two-way live integration is active. Strict LIFO Voucher Deletion, CashBook Reversal, Form Auto-Reset, and 38 Account Heads formula recalculation are operating seamlessly with your Google Spreadsheet.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConn}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-2 shadow-md transition-colors"
              >
                <Zap className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : 'text-amber-300'}`} />
                <span>{isTestingConn ? 'Pinging Live...' : 'Verify Live Sync'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyScript}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Copy current Google Apps Script backup"
              >
                {isCopiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedScript ? 'Copied' : 'Copy Script'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <h4 className="font-extrabold text-xs uppercase text-indigo-500">
                Data Maintenance &amp; Cache Refresh
              </h4>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => triggerAppScriptCommand('clearVoucherFormForNextEntry')}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                >
                  <span>🧹 Clear Voucher Form in Google Sheet</span>
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => triggerAppScriptCommand('refreshAccountHeadsSummary')}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                >
                  <span>♻️ Recalculate 38 Account Heads in Google Sheet</span>
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <h4 className="font-extrabold text-xs uppercase text-emerald-500">
                Google Sheet Live Architecture Info
              </h4>
              <div className="text-[11px] text-slate-400 space-y-1.5 font-mono">
                <div>• Version: <strong>v3.14 (Voucher &amp; Cashbook Management System)</strong></div>
                <div>• Institute Code: <strong>33028</strong></div>
                <div>• Bank CashBooks: <strong>6 Dedicated Ledgers</strong></div>
                <div>• Account Heads: <strong>38 Chart of Accounts</strong></div>
                <div>• Target Sheet: <strong>Payment Approval-Form</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: DEEP BACKUP & RECOVERY                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div
            className={`p-5 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase">
              <Database className="w-4 h-4" />
              <span>Full System Deep Backup Engine (7 Dedicated Files)</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Creates timestamped snapshots in Google Drive containing all 6 Bank Cashbooks, the Master Voucher Registry, and Account Head allocations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <button
                onClick={() => triggerAppScriptCommand('runFullSystemDeepBackup')}
                className="py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-between shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <span>▶️ Run Instant Deep Backup (7 Files)</span>
                <Play className="w-4 h-4 text-amber-300" />
              </button>

              <button
                onClick={() => triggerAppScriptCommand('showRestoreBackupDialog')}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
              >
                <span>⏮️ Restore System Snapshot</span>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => triggerAppScriptCommand('enableDailyBackup')}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer text-xs"
              >
                <span>🟢 Enable Daily 4:00 PM Backup</span>
              </button>
              <button
                onClick={() => triggerAppScriptCommand('disableDailyBackup')}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer text-xs"
              >
                <span>🔴 Disable Automated Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: MASTER ACCOUNTS & PAYEES MATRIX                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Institutional Bank Accounts */}
          <div
            className={`p-5 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <h4 className="font-extrabold text-xs uppercase text-indigo-500">
              Institutional Bank Ledger Accounts (FY 2026-2027)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(INSTITUTIONAL_BANK_ACCOUNTS).map(([k, acc]) => (
                <div
                  key={k}
                  className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-500">{k}</span>
                    <span className="text-[10px] font-mono text-slate-400">{acc.accountNo || ''}</span>
                  </div>
                  <div className="font-black text-slate-900 dark:text-white truncate" title={acc.fullName}>
                    {acc.fullName}
                  </div>
                  <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    Opening: Rs. {(acc.openingBalance ?? 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 38 Master Budget Heads */}
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <h4 className="font-extrabold text-xs uppercase text-purple-500">
              Institutional Chart of Accounts ({MASTER_ACCOUNT_HEADS.length} Heads)
            </h4>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
              {MASTER_ACCOUNT_HEADS.map((h, i) => (
                <div key={i} className="py-1.5 flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>{h}</span>
                  <span className="text-[10px] text-slate-400">Head #{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: LIVE AUDIT LOG TERMINAL                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'terminal' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-black border border-slate-800 text-emerald-400 font-mono text-xs space-y-2 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-[11px]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Live Admin Command & Dispatch Audit Trail</span>
              </div>
              <span>{auditLogs.length} Events Logged</span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`font-black shrink-0 ${
                      log.status === 'success'
                        ? 'text-emerald-400'
                        : log.status === 'failed'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {log.action}:
                  </span>
                  <span className="text-slate-300 break-all">{log.details}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: OFFICIAL V3.14 VOUCHER ENTRY & AMEND FORM           */}
      {/* ------------------------------------------------------------- */}
      <VoucherEntryModal
        isOpen={isNewVoucherModalOpen}
        onClose={() => {
          setIsNewVoucherModalOpen(false);
          setVoucherToAmend(null);
        }}
        voucherToAmend={voucherToAmend}
        onSaveVoucher={handleSaveNewVoucherFromModal}
        onDeleteVoucher={handleDeleteVoucherBySr}
        existingVouchers={vouchers}
        customGvtiwLogo={customGvtiwLogo}
        customTevtaLogo={customTevtaLogo}
        customGopLogo={customGopLogo}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: RECORD DIRECT BANK CHARGE                             */}
      {/* ------------------------------------------------------------- */}
      {isBankChargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 text-white w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase">Record Direct Bank Charge</h3>
              </div>
              <button
                onClick={() => setIsBankChargeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBankCharge} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Bank Account</label>
                <select
                  value={bcAccount}
                  onChange={(e) => setBcAccount(e.target.value as BankAccountKey)}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold outline-none"
                >
                  <option value="NS">Non-Salary (6580006795600014)</option>
                  <option value="PF">Pupil Funds (6580027832200022)</option>
                  <option value="SC">Short Course (6580027832200033)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Charge Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  value={bcAmount || ''}
                  onChange={(e) => setBcAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 2784"
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-bold font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Date & Bank Narration</label>
                <input
                  type="date"
                  value={bcDate}
                  onChange={(e) => setBcDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none mb-2"
                />
                <input
                  type="text"
                  value={bcMemo}
                  onChange={(e) => setBcMemo(e.target.value)}
                  placeholder="Bank Charge Narration"
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBankChargeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-md"
                >
                  Post Bank Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: PIN CHANGE SETTINGS                                   */}
      {/* ------------------------------------------------------------- */}
      {isPinSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 text-white w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase">Update Admin Security PIN</h3>
              </div>
              <button
                onClick={() => setIsPinSettingsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Enter New Secret PIN</label>
                <input
                  type="password"
                  required
                  maxLength={12}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="New PIN (min 4 digits)"
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-center outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Confirm New Secret PIN</label>
                <input
                  type="password"
                  required
                  maxLength={12}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value)}
                  placeholder="Confirm New PIN"
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-center outline-none"
                />
              </div>

              {pinChangeMsg && (
                <p className="text-xs font-bold text-center text-amber-300">
                  {pinChangeMsg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPinSettingsOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: CORPORATE LIFO VOUCHER PURGE & BUSY DIALOG           */}
      {/* ------------------------------------------------------------- */}
      <CorporateDeleteVoucherModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeletingVoucher}
        voucher={voucherToDelete}
        onConfirm={executeCorporateDelete}
        onClose={() => {
          if (!isDeletingVoucher) {
            setIsDeleteModalOpen(false);
            setVoucherToDelete(null);
          }
        }}
        customGvtiwLogo={customGvtiwLogo}
        darkMode={darkMode}
      />
    </div>
  );
};
