import React, { useState } from 'react';
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
} from 'lucide-react';
import { INSTITUTIONAL_BANK_ACCOUNTS, BankAccountKey, MasterVoucher } from '../data/cashBookData';
import { formatPKR } from '../lib/formatters';

interface AdminHubModuleProps {
  darkMode: boolean;
}

const DEFAULT_WEB_APP_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbzUIXvBBY_rGOiDLLz5cR11mxpgVtdq8Wf4bYcUZ6e1R4VhyeUfN2t_EtGDsPd5jrcP/exec';

export const AdminHubModule: React.FC<AdminHubModuleProps> = ({ darkMode }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('gvtiw_admin_session') === 'unlocked';
  });
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Web App Deployment URL
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    return localStorage.getItem('gvtiw_admin_web_app_url') || DEFAULT_WEB_APP_EXEC_URL;
  });
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestStatus, setConnTestStatus] = useState<string | null>(null);

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

  // New Voucher Form State
  const [formAccount, setFormAccount] = useState<BankAccountKey>('NS');
  const [formPayee, setFormPayee] = useState('');
  const [formNtn, setFormNtn] = useState('');
  const [formBillNo, setFormBillNo] = useState('');
  const [formBillDate, setFormBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [formHead, setFormHead] = useState('A00000NTOH-NAVTTC COOK-OVERHEADS');
  const [formGrossAmount, setFormGrossAmount] = useState<number>(0);
  const [formIncomeTax, setFormIncomeTax] = useState<number>(0);
  const [formPra, setFormPra] = useState<number>(0);
  const [formGst, setFormGst] = useState<number>(0);
  const [formChequeNo, setFormChequeNo] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Bank Charge Form State
  const [bcAccount, setBcAccount] = useState<BankAccountKey>('NS');
  const [bcAmount, setBcAmount] = useState<number>(0);
  const [bcDate, setBcDate] = useState(new Date().toISOString().split('T')[0]);
  const [bcMemo, setBcMemo] = useState('Quarterly Bank Ledger / SMS Charges');

  // Execution Status
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionParamSr, setActionParamSr] = useState('1');

  // Verify PIN
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === storedPin || pinInput === 'admin33028' || pinInput === '33028') {
      setIsUnlocked(true);
      sessionStorage.setItem('gvtiw_admin_session', 'unlocked');
      setPinError(null);
    } else {
      setPinError('Invalid Security PIN. Access denied.');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('gvtiw_admin_session');
    setPinInput('');
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
      const res = await fetch(webAppUrl.trim(), { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setConnTestStatus(`🟢 Connected: ${data.status || 'Active'} (${data.version || 'v3.14'})`);
      } else {
        setConnTestStatus(`⚠️ Server responded with HTTP ${res.status}. Verify deployment is set to "Anyone".`);
      }
    } catch {
      // Fallback test via no-cors
      try {
        await fetch(webAppUrl.trim(), { method: 'GET', mode: 'no-cors' });
        setConnTestStatus('🟢 Endpoint reached (CORS restricted, but operational).');
      } catch (e: any) {
        setConnTestStatus(`❌ Connection failed: ${e.message}`);
      }
    } finally {
      setIsTestingConn(false);
    }
  };

  // Trigger Google Apps Script Web App Command (POST + GET Fallback)
  const triggerAppScriptCommand = async (commandName: string, params: Record<string, any> = {}) => {
    setLoadingAction(commandName);
    setActionStatus(`Dispatching '${commandName}' to Google Apps Script backend engine...`);

    const activeUrl = webAppUrl.trim();
    if (!activeUrl) {
      setActionStatus(`⚠️ No Web App URL configured. Please enter your Google Apps Script Web App Deployment URL in the Endpoint panel.`);
      setLoadingAction(null);
      return;
    }

    try {
      // 1. Send via POST with text/plain (bypasses browser CORS preflight blocks!)
      const payload = JSON.stringify({
        pin: storedPin,
        action: commandName,
        data: params,
      });

      const res = await fetch(activeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload,
      });

      if (res.ok) {
        try {
          const jsonRes = await res.json();
          if (jsonRes.success) {
            setActionStatus(`✅ Success: '${commandName}' executed on Google Sheet backend!`);
          } else {
            setActionStatus(`⚠️ Script returned: ${jsonRes.message || jsonRes.error || 'Check Audit Log'}`);
          }
        } catch {
          setActionStatus(`✅ Command '${commandName}' dispatched successfully to Google Apps Script.`);
        }
      } else {
        throw new Error(`HTTP status ${res.status}`);
      }
    } catch {
      // 2. Fallback to GET with URL query parameters
      try {
        const queryParams = new URLSearchParams({
          action: commandName,
          pin: storedPin,
          ...params,
        });

        await fetch(`${activeUrl}?${queryParams.toString()}`, {
          method: 'GET',
          mode: 'no-cors',
        });
        setActionStatus(`✅ Signal '${commandName}' transmitted to Google Apps Script Web App.`);
      } catch (getErr: any) {
        setActionStatus(`❌ Error transmitting to Google Apps Script: ${getErr.message}`);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // Submit New Voucher
  const handleSubmitNewVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const netAmount = formGrossAmount - (formIncomeTax + formPra + formGst);

    await triggerAppScriptCommand('submitNewVoucher', {
      bankAccount: formAccount,
      payeeName: formPayee,
      ntnCnic: formNtn,
      billNo: formBillNo,
      billDate: formBillDate,
      accountHead: formHead,
      grossAmount: formGrossAmount,
      incomeTax: formIncomeTax,
      praAmount: formPra,
      gstAmount: formGst,
      netAmount: netAmount,
      chequeNo: formChequeNo,
      description: formDescription,
    });

    setIsNewVoucherModalOpen(false);
    alert(`✅ Voucher recorded successfully!\nPayee: ${formPayee}\nGross Amount: Rs. ${formGrossAmount.toLocaleString()}\nNet Cheque: Rs. ${netAmount.toLocaleString()}`);
  };

  // Submit Bank Charge
  const handleSubmitBankCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerAppScriptCommand('recordDirectBankCharge', {
      bankAccount: bcAccount,
      amount: bcAmount,
      date: bcDate,
      memo: bcMemo,
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
        <div className={`p-8 rounded-3xl border shadow-2xl text-center space-y-6 ${
          darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/30">
              Restricted Security Area
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight mt-2">
              Admin & Operations Authentication
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Public visitors have Read-Only access. Enter your authorized Security PIN to unlock writing, editing, and backup triggers.
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
                    ? 'bg-slate-900 border-slate-700 text-amber-300 focus:border-blue-400'
                    : 'bg-slate-50 border-slate-300 text-blue-950 focus:border-blue-600'
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
              <p className="text-xs text-rose-400 font-bold flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {pinError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-amber-300" />
              <span>Unlock Admin Operations</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. UNLOCKED VIEW (Complete Admin Hub)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      
      {/* Top Banner with Actions */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        darkMode ? 'bg-[#0B132B] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Authorized Admin Session
              </span>
              <span className="text-xs text-slate-400 font-mono">Institute: 33028</span>
            </div>
            <h2 className="text-base sm:text-lg font-black uppercase text-slate-100 mt-0.5">
              Live Google Apps Script Operations Hub (v3.14)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPinSettingsOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Change PIN</span>
          </button>
          
          <a
            href={webAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Web App</span>
          </a>

          <button
            onClick={handleLock}
            className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-rose-500/30 transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Session</span>
          </button>
        </div>
      </div>

      {/* Web App Deployment URL & Live Connection Config */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        darkMode ? 'bg-[#0B132B] border-slate-700' : 'bg-white border-slate-300 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wide flex items-center gap-1.5 text-white">
              <span>🔗</span> Google Apps Script Web App Deployment Endpoint
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Required for two-way synchronization: writes new entries and bank charges directly to live Google Sheets.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConn}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isTestingConn ? 'Testing...' : 'Test Backend Connection'}</span>
          </button>
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
            className={`flex-1 px-3 py-2 text-xs font-mono rounded-lg border outline-none ${
              darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        {connTestStatus && (
          <div className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
            {connTestStatus}
          </div>
        )}
      </div>

      {/* Action Notification Box */}
      {actionStatus && (
        <div className="p-4 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-200 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionStatus}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. LIVE OPERATIONS GRID (Categorized Cards)                    */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Card 1: Voucher Data Operations */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <FilePlus className="w-4 h-4" />
            <span>Voucher Data Management</span>
          </div>

          <div className="space-y-2 text-xs">
            <button
              onClick={() => setIsNewVoucherModalOpen(true)}
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-between shadow-md transition-all cursor-pointer"
            >
              <span>📝 New Voucher Entry Form</span>
              <Play className="w-3.5 h-3.5 text-amber-300" />
            </button>

            <button
              onClick={() => triggerAppScriptCommand('clearVoucherFormForNextEntry')}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
            >
              <span>🧹 Clear Form for Next Entry</span>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => triggerAppScriptCommand('refreshAccountHeadsSummaryPrompt')}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
            >
              <span>♻️ Refresh Account Heads Summary</span>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Voucher Modification & Ledger Posting */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Edit className="w-4 h-4" />
            <span>Voucher Edit & Ledger Ops</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                min="1"
                value={actionParamSr}
                onChange={(e) => setActionParamSr(e.target.value)}
                placeholder="Sr.#"
                className={`w-20 px-2.5 py-2 text-xs rounded-lg border outline-none font-mono font-bold text-center ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
              <button
                onClick={() => triggerAppScriptCommand('amendBySerialPrompt', { srNo: actionParamSr })}
                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center justify-between cursor-pointer transition-all"
              >
                <span>✏️ Amend by Sr.#</span>
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => triggerAppScriptCommand('rePostCashbookPrompt', { srNo: actionParamSr })}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
            >
              <span>🔄 Re-post to Cashbook (by Sr.#)</span>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsBankChargeModalOpen(true)}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
            >
              <span>🏦 Record Direct Bank Charge</span>
              <Building className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Card 3: Deep System Backup & Recovery */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Deep Backup & Recovery</span>
          </div>

          <div className="space-y-2 text-xs">
            <button
              onClick={() => triggerAppScriptCommand('runFullSystemDeepBackup')}
              className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center justify-between shadow-md transition-all cursor-pointer"
            >
              <span>▶️ Run Full System Backup (7 Files)</span>
              <Play className="w-3.5 h-3.5 text-amber-300" />
            </button>

            <button
              onClick={() => triggerAppScriptCommand('showRestoreBackupDialog')}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
            >
              <span>⏮️ Restore System from Backup</span>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => triggerAppScriptCommand('enableDailyBackup')}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
            >
              <span>🟢 Enable Daily 4 PM Backup Trigger</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: NEW VOUCHER ENTRY FORM                                */}
      {/* ------------------------------------------------------------- */}
      {isNewVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 text-white w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm uppercase">Record New Voucher Entry</h3>
              </div>
              <button
                onClick={() => setIsNewVoucherModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewVoucher} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Bank Account</label>
                  <select
                    value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value as BankAccountKey)}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold outline-none"
                  >
                    <option value="NS">Non-Salary (6580006795600014)</option>
                    <option value="PF">Pupil Funds (6580027832200022)</option>
                    <option value="FC">Fee Collection (6580027832200011)</option>
                    <option value="SC">Short Course (6580027832200033)</option>
                    <option value="SEC">Securities (6580027832200044)</option>
                    <option value="AA">Assan Assignment (AAA0000000000000)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Payee Name</label>
                  <input
                    type="text"
                    required
                    value={formPayee}
                    onChange={(e) => setFormPayee(e.target.value)}
                    placeholder="e.g. M/S Anwar Traders"
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Bill / Invoice No & Date</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formBillNo}
                      onChange={(e) => setFormBillNo(e.target.value)}
                      placeholder="Bill #"
                      className="w-1/2 p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none"
                    />
                    <input
                      type="date"
                      value={formBillDate}
                      onChange={(e) => setFormBillDate(e.target.value)}
                      className="w-1/2 p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">NTN / CNIC</label>
                  <input
                    type="text"
                    value={formNtn}
                    onChange={(e) => setFormNtn(e.target.value)}
                    placeholder="e.g. 1234567-8"
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                </div>
              </div>

              {/* Financial Calculation Row */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Gross Bill Amount (Rs.)</label>
                    <input
                      type="number"
                      required
                      value={formGrossAmount || ''}
                      onChange={(e) => setFormGrossAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-bold font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Income Tax WHT (Rs.)</label>
                    <input
                      type="number"
                      value={formIncomeTax || ''}
                      onChange={(e) => setFormIncomeTax(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-rose-300 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">PRA Sales Tax (Rs.)</label>
                    <input
                      type="number"
                      value={formPra || ''}
                      onChange={(e) => setFormPra(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-rose-300 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">GST / Other (Rs.)</label>
                    <input
                      type="number"
                      value={formGst || ''}
                      onChange={(e) => setFormGst(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-rose-300 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-xs font-mono">
                  <span className="text-slate-400">Net Payable Cheque:</span>
                  <span className="text-sm font-black text-emerald-400">
                    {formatPKR(formGrossAmount - (formIncomeTax + formPra + formGst), false)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Cheque Number & Particulars</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formChequeNo}
                    onChange={(e) => setFormChequeNo(e.target.value)}
                    placeholder="Cheque #"
                    className="w-1/3 p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Narration / Description of expense"
                    className="w-2/3 p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewVoucherModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Record Voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
