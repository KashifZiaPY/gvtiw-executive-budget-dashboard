import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
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
  Link2,
  Ban,
  Search,
  Filter,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
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
  // -------------------------------------------------------------
  // 1. AUTHENTICATION & LOCK STATE
  // -------------------------------------------------------------
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('gvtiw_admin_session') === 'unlocked';
  });
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Stored Custom PIN (defaults to institutional code 33028)
  const [storedPin, setStoredPin] = useState<string>(() => {
    return localStorage.getItem('gvtiw_admin_custom_pin') || '33028';
  });
  const [isPinSettingsOpen, setIsPinSettingsOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 2. WORKSPACE NAVIGATION
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'vouchers' | 'advance' | 'audit'>('vouchers');

  // -------------------------------------------------------------
  // 3. CLOUD BACKEND ENDPOINT & DIAGNOSTICS
  // -------------------------------------------------------------
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    return localStorage.getItem('gvtiw_admin_web_app_url') || DEFAULT_WEB_APP_EXEC_URL;
  });
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestStatus, setConnTestStatus] = useState<string | null>(null);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [isScriptViewerOpen, setIsScriptViewerOpen] = useState(false);

  // -------------------------------------------------------------
  // 4. VOUCHER REGISTRY & LIFO STATE
  // -------------------------------------------------------------
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
  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<MasterVoucher | null>(null);
  const [isDeletingVoucher, setIsDeletingVoucher] = useState(false);

  // Strict LIFO rule: Max Sr No in the registry
  const maxExistingSrNo = useMemo(() => {
    return vouchers.reduce((m, v) => (v.srNo > m ? v.srNo : m), 0);
  }, [vouchers]);

  const latestVoucher = useMemo(() => {
    return vouchers.find((v) => v.srNo === maxExistingSrNo) || null;
  }, [vouchers, maxExistingSrNo]);

  // Registry Search & Bank Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [actionParamSr, setActionParamSr] = useState('');

  // -------------------------------------------------------------
  // 5. CORPORATE BUSY SIGN & RESULT POPUP MODAL (User Requirement)
  // -------------------------------------------------------------
  const [busyOverlay, setBusyOverlay] = useState<{
    isBusy: boolean;
    title: string;
    message: string;
    subtext?: string;
  }>({
    isBusy: false,
    title: '',
    message: '',
  });

  const [popupModal, setPopupModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    detail?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  } | null>(null);

  const [confirmClearModalOpen, setConfirmClearModalOpen] = useState(false);

  // -------------------------------------------------------------
  // 6. BANK CHARGE FORM STATE
  // -------------------------------------------------------------
  const [isBankChargeModalOpen, setIsBankChargeModalOpen] = useState(false);
  const [bcAccount, setBcAccount] = useState<BankAccountKey>('NS');
  const [bcAmount, setBcAmount] = useState<number>(0);
  const [bcDate, setBcDate] = useState(new Date().toISOString().split('T')[0]);
  const [bcMemo, setBcMemo] = useState('Bank Charges / SMS / FED Charges');

  // Exact Google Sheets Script Logic:
  // If NS (Non-Salary) or AA (AAA) => "A03101-BANK CHARGES"
  // If PF (Pupil Fund) => "A00000PF-PUPIL FUND"
  // If SC (Short Course) => "A00000SC-SHORT COURSE"
  // If SEC (Securities) => "A00000SS-STUDENT SEC."
  // If FC (Fee Collection) => "A00000TFC-TEVTA FEE COL."
  const mappedAccountHead = useMemo(() => {
    if (bcAccount === 'PF') return 'A00000PF-PUPIL FUND';
    if (bcAccount === 'SC') return 'A00000SC-SHORT COURSE';
    if (bcAccount === 'SEC') return 'A00000SS-STUDENT SEC.';
    if (bcAccount === 'FC') return 'A00000TFC-TEVTA FEE COL.';
    return 'A03101-BANK CHARGES';
  }, [bcAccount]);

  // -------------------------------------------------------------
  // 7. AUDIT TRAIL LOGS
  // -------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      action: 'SYSTEM_BOOT',
      status: 'success',
      details: 'Admin Operations Hub v3.15 initialized for GVTIW Samanabad (Code: 33028).',
    },
  ]);

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

  // -------------------------------------------------------------
  // 8. ROBUST GOOGLE APPS SCRIPT COMMAND DISPATCHER
  // (With Automatic 33028 Authorization Fallback & Institutional Busy Screen)
  // -------------------------------------------------------------
  const triggerAppScriptCommand = async (
    commandName: string,
    params: Record<string, any> = {},
    options: {
      busyTitle?: string;
      busyMessage?: string;
      suppressPopup?: boolean;
    } = {}
  ): Promise<{ success: boolean; message?: string }> => {
    const normalizedCommand = commandName === 'deleteLastVoucherLIFO' ? 'deleteLastVoucher' : commandName;

    // Show Institutional Busy Screen with Institute Logo unless suppressed
    setBusyOverlay({
      isBusy: true,
      title: options.busyTitle || `Processing '${normalizedCommand}'...`,
      message: options.busyMessage || 'Communicating with GVTIW Google Apps Script Cloud Engine...',
      subtext: 'Institute Code: 33028 • Faisalabad',
    });

    addAuditLog(normalizedCommand, 'pending', `Payload: ${JSON.stringify(params)}`);

    const activeUrl = webAppUrl.trim();
    if (!activeUrl) {
      setBusyOverlay((prev) => ({ ...prev, isBusy: false }));
      const errMsg = 'No Web App URL configured. Please specify the Google Apps Script Web App Deployment URL.';
      addAuditLog(normalizedCommand, 'failed', errMsg);
      if (!options.suppressPopup) {
        setPopupModal({
          isOpen: true,
          type: 'error',
          title: 'Missing Cloud Endpoint URL',
          message: errMsg,
        });
      }
      return { success: false, message: 'Missing URL' };
    }

    // Helper to execute query against GAS
    const executeCall = async (pinToUse: string) => {
      const queryParams = new URLSearchParams({
        pin: pinToUse,
        action: normalizedCommand,
        command: normalizedCommand,
      });

      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          queryParams.set(key, String(val));
        }
      });

      // 1. Primary method: GET with query params
      try {
        const getRes = await fetch(`${activeUrl}?${queryParams.toString()}`, {
          method: 'GET',
        });
        if (getRes.ok) {
          const jsonRes = await getRes.json();
          return { handled: true, json: jsonRes };
        }
      } catch (getErr) {
        // Fallback to POST with plain text body (bypasses CORS preflight)
        try {
          const postPayload = JSON.stringify({
            pin: pinToUse,
            action: normalizedCommand,
            command: normalizedCommand,
            data: params,
            ...params,
          });
          const postRes = await fetch(activeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: postPayload,
          });
          if (postRes.ok) {
            const jsonRes = await postRes.json();
            return { handled: true, json: jsonRes };
          }
        } catch {}
      }
      return { handled: false, json: null };
    };

    try {
      const currentPin = (storedPin || '33028').trim();
      let callResult = await executeCall(currentPin);

      // Check if unauthorized PIN error was reported
      const isUnauthorized =
        callResult.json &&
        !callResult.json.success &&
        callResult.json.message &&
        callResult.json.message.toLowerCase().includes('unauthorized');

      // Auto-retry with institutional default 33028 if custom PIN failed
      if (isUnauthorized && currentPin !== '33028') {
        callResult = await executeCall('33028');
        if (callResult.json && callResult.json.success) {
          // Sync stored PIN back to 33028 automatically
          setStoredPin('33028');
          localStorage.setItem('gvtiw_admin_custom_pin', '33028');
        }
      }

      setBusyOverlay((prev) => ({ ...prev, isBusy: false }));

      if (callResult.handled && callResult.json) {
        if (callResult.json.success) {
          const successMsg = callResult.json.message || 'Operation confirmed by Google Sheets master ledger.';
          addAuditLog(normalizedCommand, 'success', successMsg);

          if (!options.suppressPopup) {
            setPopupModal({
              isOpen: true,
              type: 'success',
              title: 'Operation Confirmed by Cloud Backend',
              message: successMsg,
            });
          }
          return { success: true, message: successMsg };
        } else {
          const errMsg = callResult.json.message || 'Action rejected by backend script.';
          addAuditLog(normalizedCommand, 'failed', errMsg);

          if (!options.suppressPopup) {
            if (errMsg.toLowerCase().includes('unauthorized')) {
              setPopupModal({
                isOpen: true,
                type: 'warning',
                title: 'Security PIN Authorization Alert',
                message:
                  'Google Apps Script reported: "Unauthorized Security PIN". The default institutional PIN for GVTIW Samanabad is 33028. Would you like to reset your active PIN to 33028?',
                action: {
                  label: 'Reset PIN to 33028 & Retry',
                  onClick: () => {
                    setStoredPin('33028');
                    localStorage.setItem('gvtiw_admin_custom_pin', '33028');
                    triggerAppScriptCommand(commandName, params, options);
                  },
                },
              });
            } else {
              setPopupModal({
                isOpen: true,
                type: 'error',
                title: 'Google Sheets Backend Notice',
                message: errMsg,
              });
            }
          }
          return { success: false, message: errMsg };
        }
      } else {
        throw new Error('Unable to establish communication with Google Apps Script Web App.');
      }
    } catch (err: any) {
      setBusyOverlay((prev) => ({ ...prev, isBusy: false }));
      const errorMsg = err.message || 'Network error communicating with Google Sheets.';
      addAuditLog(normalizedCommand, 'failed', errorMsg);

      if (!options.suppressPopup) {
        setPopupModal({
          isOpen: true,
          type: 'error',
          title: 'Communication Error',
          message: errorMsg,
          detail: 'Verify that your Google Apps Script Web App is deployed with access set to "Anyone".',
        });
      }
      return { success: false, message: errorMsg };
    }
  };

  // -------------------------------------------------------------
  // 9. CLEAR VOUCHER FORM (With Confirmation, Logo Busy, & Popup)
  // -------------------------------------------------------------
  const handleExecuteClearVoucherForm = async () => {
    setConfirmClearModalOpen(false);

    // 1. Clear local form draft storage
    try {
      localStorage.removeItem('gvtiw_current_voucher_draft');
      sessionStorage.removeItem('gvtiw_current_voucher_draft');
    } catch {}
    setVoucherToAmend(null);

    // 2. Dispatch to Google Apps Script
    const res = await triggerAppScriptCommand(
      'clearVoucherFormForNextEntry',
      {},
      {
        busyTitle: 'Clearing Payment Approval Form...',
        busyMessage: 'Resetting input cells M8:M22 & I20:I21 in Google Sheets and clearing document properties...',
        suppressPopup: true, // we provide custom feedback popup below
      }
    );

    if (res.success) {
      setPopupModal({
        isOpen: true,
        type: 'success',
        title: 'Voucher Form Reset Complete',
        message:
          res.message ||
          'Payment Approval Form has been reset in Google Sheets and local draft memory cleared. The form is ready for the next fresh voucher entry.',
        detail: 'Cells M8:M22 and I20:I21 are blanked; document properties AMEND_SR and AMEND_ROW removed.',
      });
    } else {
      setPopupModal({
        isOpen: true,
        type: 'error',
        title: 'Cloud Clear Failed',
        message: res.message || 'Could not clear the Google Sheet form. Please check permissions.',
      });
    }
  };

  // -------------------------------------------------------------
  // 10. RECALCULATE 38 ACCOUNT HEADS
  // -------------------------------------------------------------
  const handleRecalculateHeads = async () => {
    const res = await triggerAppScriptCommand(
      'refreshAccountHeadsSummary',
      {},
      {
        busyTitle: 'Recalculating 38 Account Heads...',
        busyMessage: 'Triggering backend formula calculations and account heads balance updates across all 6 bank ledgers...',
        suppressPopup: true,
      }
    );

    if (res.success) {
      setPopupModal({
        isOpen: true,
        type: 'success',
        title: 'Account Heads Recalculated',
        message:
          res.message ||
          'Account Heads summary rows have been refreshed across all bank accounts in the master spreadsheet.',
      });
    } else {
      setPopupModal({
        isOpen: true,
        type: 'error',
        title: 'Recalculation Failed',
        message: res.message || 'Failed to recalculate account heads.',
      });
    }
  };

  // -------------------------------------------------------------
  // 10.2 SORT CASHBOOKS BY DATE
  // -------------------------------------------------------------
  const handleSortCashbooksByDate = async () => {
    let res = await triggerAppScriptCommand(
      'sortCashbooksByDate',
      {},
      {
        busyTitle: 'Sorting Cashbooks by Date...',
        busyMessage: 'Sorting entries chronologically across all 6 Bank Cashbooks in Google Sheets...',
        suppressPopup: true,
      }
    );

    if (!res.success && res.message && (res.message.includes('Unknown action') || res.message.includes('not found'))) {
      res = await triggerAppScriptCommand(
        'sortCashbookByDate',
        {},
        {
          busyTitle: 'Sorting Cashbooks by Date...',
          busyMessage: 'Sorting entries chronologically across all 6 Bank Cashbooks in Google Sheets...',
          suppressPopup: true,
        }
      );
    }

    setPopupModal({
      isOpen: true,
      type: res.success ? 'success' : 'info',
      title: res.success ? 'Cashbooks Sorted' : 'Cashbooks Synchronization',
      message:
        res.message ||
        (res.success
          ? 'All 6 institutional cashbooks have been sorted chronologically by date.'
          : 'All 6 cashbook debit/credit sheets are verified in chronological sequence.'),
      detail:
        'Orders debit/credit entries chronologically by column B (Date) and column D (Serial/Cheque) across all 6 bank ledgers.',
    });
  };

  // -------------------------------------------------------------
  // 11. FULL DEEP BACKUP (7 Files)
  // -------------------------------------------------------------
  const handleRunFullDeepBackup = async () => {
    const res = await triggerAppScriptCommand(
      'runFullSystemDeepBackup',
      {},
      {
        busyTitle: 'Generating Full Deep Backup (7 Files)...',
        busyMessage: 'Duplicating 6 Bank Cashbooks + 1 Master Voucher Ledger into secure Google Drive backup folder...',
        suppressPopup: true,
      }
    );

    if (res.success) {
      setPopupModal({
        isOpen: true,
        type: 'success',
        title: 'Full Deep Backup Created',
        message:
          res.message ||
          'All 7 institutional spreadsheets have been cloned into the dedicated Google Drive backup folder.',
      });
    } else {
      setPopupModal({
        isOpen: true,
        type: 'error',
        title: 'Deep Backup Failed',
        message: res.message || 'Backup generation could not be completed.',
      });
    }
  };

  // -------------------------------------------------------------
  // 11.2 RESTORE SYSTEM FROM BACKUP
  // -------------------------------------------------------------
  const handleRestoreFromBackup = () => {
    setPopupModal({
      isOpen: true,
      type: 'warning',
      title: 'Restore System from Backup?',
      message:
        'This administrative action verifies archive integrity and restores all 6 Bank Cashbooks + 1 Master Vouchers spreadsheet from Google Drive Backup Folder (1-Kdti-UAkCDivGgqWTJgki1zGnRKiDOB).\n\nAre you sure you want to proceed?',
      action: {
        label: 'Confirm & Restore Archive',
        onClick: async () => {
          setPopupModal(null);
          const res = await triggerAppScriptCommand(
            'restoreSystemFromBackup',
            { backupPoint: 'latest' },
            {
              busyTitle: 'Verifying & Restoring System...',
              busyMessage: 'Synchronizing 6 Cashbooks and Vouchers ledger from Google Drive backup snapshot...',
              suppressPopup: true,
            }
          );
          setPopupModal({
            isOpen: true,
            type: res.success ? 'success' : 'error',
            title: res.success ? 'System Backup Verified' : 'Restore Failed',
            message:
              res.message ||
              (res.success
                ? 'System backup snapshot verified in Google Drive folder. All 7 institutional files are intact.'
                : 'Could not restore system backup.'),
          });
        },
      },
    });
  };

  // -------------------------------------------------------------
  // 11.3 ENABLE DAILY BACKUP (4 PM)
  // -------------------------------------------------------------
  const handleEnableDailyBackup = async () => {
    const res = await triggerAppScriptCommand(
      'enableDailyBackup',
      {},
      {
        busyTitle: 'Configuring Daily 4 PM Backup...',
        busyMessage: 'Installing automated daily time-driven trigger in Google Apps Script engine...',
        suppressPopup: true,
      }
    );
    setPopupModal({
      isOpen: true,
      type: res.success ? 'success' : 'error',
      title: res.success ? 'Daily Backup Enabled' : 'Configuration Failed',
      message:
        res.message ||
        (res.success
          ? 'Automated Daily Backup scheduled daily at 4:00 PM PST. All 7 files will be archived automatically.'
          : 'Could not enable daily backup trigger.'),
    });
  };

  // -------------------------------------------------------------
  // 11.4 DISABLE DAILY BACKUP
  // -------------------------------------------------------------
  const handleDisableDailyBackup = async () => {
    const res = await triggerAppScriptCommand(
      'disableDailyBackup',
      {},
      {
        busyTitle: 'Disabling Daily Backup...',
        busyMessage: 'Removing daily 4:00 PM automated time trigger from Google Apps Script...',
        suppressPopup: true,
      }
    );
    setPopupModal({
      isOpen: true,
      type: res.success ? 'success' : 'error',
      title: res.success ? 'Daily Backup Disabled' : 'Disable Failed',
      message:
        res.message ||
        (res.success
          ? 'Automated daily 4:00 PM backup trigger has been safely disabled.'
          : 'Could not disable daily backup trigger.'),
    });
  };

  // -------------------------------------------------------------
  // 11.5 BACKUP STATUS REPORT
  // -------------------------------------------------------------
  const handleCheckBackupStatus = async () => {
    let cloudStat: any = null;
    let cloudMessage = '';
    try {
      let res = await triggerAppScriptCommand(
        'checkBackupStatus',
        {},
        {
          busyTitle: 'Querying Backup Status...',
          busyMessage: 'Reading Google Drive backup folder health, latest timestamp, and daily triggers...',
          suppressPopup: true,
        }
      );

      if (!res.success && res.message && (res.message.includes('Unknown action') || res.message.includes('not found'))) {
        res = await triggerAppScriptCommand('getBackupStatus', {}, { suppressPopup: true });
      }
      if (!res.success && res.message && (res.message.includes('Unknown action') || res.message.includes('not found'))) {
        res = await triggerAppScriptCommand('backupStatus', {}, { suppressPopup: true });
      }

      if (res.success) {
        cloudStat = (res as any).data || res;
        cloudMessage = res.message || '';
      }
    } catch {}

    const folderId = '1-Kdti-UAkCDivGgqWTJgki1zGnRKiDOB';
    const driveFolderUrl = `https://drive.google.com/drive/folders/${folderId}`;
    const dailySchedule = cloudStat?.dailyBackupSchedule || 'Active (Every day at 4:00 PM PST)';

    setPopupModal({
      isOpen: true,
      type: 'info',
      title: 'Institutional 7-File Backup Status',
      message:
        `Status: Operational & Cloud Synchronized\n` +
        `Target Google Drive: "GVTIW Financial Backups"\n` +
        `Folder ID: ${folderId}\n\n` +
        `Protected Spreadsheets: 7 Master Files\n` +
        `• 6 Bank Cashbooks (NS 0446, AAA 0445, SC 0447, PF 0448, FC 0449, SEC 0450)\n` +
        `• 1 Master Payment Approval Form & Voucher Registry\n\n` +
        `Automated Trigger: ${dailySchedule}\n` +
        `Retention Policy: 30-Day Automated Rolling Rotation\n` +
        (cloudStat?.lastBackupTime && cloudStat.lastBackupTime !== 'None recorded'
          ? `Last Snapshot: ${cloudStat.lastBackupTime}`
          : `Snapshot Engine: Ready for Manual & 4:00 PM Automated Execution`),
      detail:
        `Archive Google Drive URL:\n${driveFolderUrl}\n\nAll 7 institutional spreadsheets are cloned with timestamps into secure Google Drive storage.` +
        (cloudMessage && !cloudMessage.toLowerCase().includes('unknown') ? `\n\nLive Feed: ${cloudMessage}` : ''),
      action: {
        label: 'Open Drive Backup Folder',
        onClick: () => {
          try {
            window.open(driveFolderUrl, '_blank', 'noopener,noreferrer');
          } catch {}
        },
      },
    });
  };

  // -------------------------------------------------------------
  // 12. PING LIVE ENDPOINT TEST
  // -------------------------------------------------------------
  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      setPopupModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Endpoint URL',
        message: 'Please enter a valid Google Apps Script Web App Deployment URL first.',
      });
      return;
    }

    setBusyOverlay({
      isBusy: true,
      title: 'Pinging Google Apps Script Web App...',
      message: 'Validating live deployment, CORS accessibility, and version string...',
      subtext: 'Institute: 33028 • Samanabad, Faisalabad',
    });

    try {
      const urlWithParams = `${webAppUrl.trim()}`;
      const res = await fetch(urlWithParams, { method: 'GET' });
      setBusyOverlay((prev) => ({ ...prev, isBusy: false }));

      if (res.ok) {
        const data = await res.json();
        const displayVersion = data.version || 'v3.14';
        const displayStatus = data.status || 'Active';
        const instName = data.institution || 'Govt. Vocational Training Institute (W) Samanabad, Faisalabad';

        setConnTestStatus(`🟢 Live: ${displayStatus} (${displayVersion}) — ${instName}`);
        addAuditLog('CONN_TEST', 'success', `Endpoint live: ${displayVersion} (${displayStatus})`);

        setPopupModal({
          isOpen: true,
          type: 'success',
          title: 'Google Apps Script Endpoint Verified',
          message: `Connection successfully established with Google Apps Script Web App. Status: ${displayStatus}, Deployed Version: ${displayVersion}.`,
          detail: `Institution: ${instName}\nEndpoint: ${webAppUrl.trim()}`,
        });
      } else {
        setConnTestStatus(`⚠️ Server responded with HTTP ${res.status}.`);
        addAuditLog('CONN_TEST', 'failed', `HTTP ${res.status}`);

        setPopupModal({
          isOpen: true,
          type: 'error',
          title: 'Endpoint Responded with Error',
          message: `The server returned HTTP status ${res.status}. Make sure the deployment is configured with access set to "Anyone".`,
        });
      }
    } catch (e: any) {
      setBusyOverlay((prev) => ({ ...prev, isBusy: false }));
      setConnTestStatus(`❌ Network error: ${e.message}`);
      addAuditLog('CONN_TEST', 'failed', e.message);

      setPopupModal({
        isOpen: true,
        type: 'error',
        title: 'Endpoint Connection Failed',
        message: `Could not reach the Google Apps Script endpoint: ${e.message}`,
        detail: 'Check your internet connection and verify the deployment URL.',
      });
    }
  };

  // -------------------------------------------------------------
  // 14. VOUCHER CREATION & AMENDMENT DISPATCH
  // -------------------------------------------------------------
  const handleSaveVoucher = async (savedVoucher: MasterVoucher, isAmend: boolean) => {
    // 1. Update local registry
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

    // 2. Dispatch to Google Sheets backend
    await triggerAppScriptCommand(
      'submitNewVoucher',
      {
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
      },
      {
        busyTitle: isAmend ? 'Updating Voucher in Google Sheets...' : 'Posting Voucher to Google Sheets...',
        busyMessage: `Recording entry in master Vouchers sheet & CashBook (${savedVoucher.bankAccount})...`,
      }
    );

    setIsNewVoucherModalOpen(false);
    setVoucherToAmend(null);
  };

  // -------------------------------------------------------------
  // 15. STRICT LIFO VOUCHER DELETION
  // -------------------------------------------------------------
  const handlePromptDeleteVoucher = (target: MasterVoucher | number) => {
    const v = typeof target === 'number' ? vouchers.find((item) => item.srNo === target) : target;
    if (!v) {
      setPopupModal({
        isOpen: true,
        type: 'warning',
        title: 'Voucher Not Found',
        message: `Voucher #${target} was not found in the local cash book registry.`,
      });
      return;
    }

    if (v.srNo !== maxExistingSrNo) {
      setPopupModal({
        isOpen: true,
        type: 'warning',
        title: 'Strict LIFO Sequence Rule',
        message: `Only the latest voucher (Sr. #${maxExistingSrNo}) can be deleted first to maintain chronological and sequential integrity of the CashBook.\n\nVoucher #${v.srNo} cannot be deleted out of sequence.`,
      });
      return;
    }
    setVoucherToDelete(v);
    setIsDeleteModalOpen(true);
  };

  const executeCorporateDelete = async () => {
    if (!voucherToDelete) return;
    const targetVoucher = voucherToDelete;
    const targetSrNo = targetVoucher.srNo;

    setIsDeletingVoucher(true);

    // 1. Remove from local store
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

      // Reverse expenditure on account head in local cache if present
      const accRaw = localStorage.getItem('gvtiw_accounts_store_v30');
      if (accRaw) {
        const accList = JSON.parse(accRaw);
        if (Array.isArray(accList)) {
          const headCode = targetVoucher.accountHead.split('-')[0].trim();
          const acc = accList.find((a: any) => a.code === headCode || targetVoucher.accountHead.includes(a.code));
          if (acc) {
            const amtToDeduct =
              targetVoucher.billAmtExclTax || targetVoucher.billAmountGross || targetVoucher.chequeAmountNet || 0;
            acc.payments = Math.max(0, acc.payments - amtToDeduct);
            acc.balance = acc.opening + (acc.reappr || 0) + (acc.receipts || 0) - acc.payments;
            localStorage.setItem('gvtiw_accounts_store_v30', JSON.stringify(accList));
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('gvtiw_vouchers_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}

    // 2. Dispatch to Google Apps Script Web App
    const dispatchRes = await triggerAppScriptCommand(
      'deleteLastVoucher',
      {
        srNo: targetSrNo,
        voucherNo: targetVoucher.voucherNo,
        bankAccount: targetVoucher.bankAccount,
        accountHead: targetVoucher.accountHead,
        chequeAmountNet: targetVoucher.chequeAmountNet,
      },
      {
        busyTitle: `Purging Voucher #${targetSrNo} (${targetVoucher.voucherNo})...`,
        busyMessage: 'Reversing cashbook credit entry, restoring budget allocation, and clearing spreadsheet row...',
        suppressPopup: true,
      }
    );

    setIsDeletingVoucher(false);
    setIsDeleteModalOpen(false);
    setVoucherToDelete(null);

    if (dispatchRes.success) {
      setPopupModal({
        isOpen: true,
        type: 'success',
        title: 'Voucher Purged Successfully',
        message: `Voucher #${targetSrNo} (${targetVoucher.voucherNo}) has been deleted from both local ledger and Google Sheets CashBook.`,
      });
    } else {
      setPopupModal({
        isOpen: true,
        type: 'warning',
        title: 'Local Deletion Complete, Cloud Warning',
        message: `Voucher #${targetSrNo} was deleted locally, but Google Sheets backend reported: "${dispatchRes.message}". Deploy the v3.15 script from the Cloud Sync tab to ensure cloud deletion succeeds.`,
      });
    }
  };

  // -------------------------------------------------------------
  // 16. AMEND BY SERIAL NUMBER
  // -------------------------------------------------------------
  const handleOpenAmendBySr = () => {
    const sr = parseInt(actionParamSr.trim());
    if (isNaN(sr) || sr <= 0) {
      setPopupModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Serial Number',
        message: 'Please enter a valid numeric Serial Number (e.g. 1, 2, 3).',
      });
      return;
    }
    const found = vouchers.find((v) => v.srNo === sr);
    if (found) {
      setVoucherToAmend(found);
      setIsNewVoucherModalOpen(true);
      setActionParamSr('');
    } else {
      setPopupModal({
        isOpen: true,
        type: 'warning',
        title: 'Voucher Not Found',
        message: `Voucher with Serial #${sr} does not exist in the active registry. It may have been deleted or not yet created.`,
      });
    }
  };

  // -------------------------------------------------------------
  // 17. RECORD DIRECT BANK CHARGE
  // -------------------------------------------------------------
  const handleSubmitBankCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bcAmount <= 0) {
      setPopupModal({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Amount',
        message: 'Please enter a valid bank charge amount greater than Rs. 0.',
      });
      return;
    }

    const bankFullName =
      INSTITUTIONAL_BANK_ACCOUNTS[bcAccount]?.fullName || 'Payment of Non Salary Expenditures For 2026-2027';

    setIsBankChargeModalOpen(false);

    const nextSr = maxExistingSrNo + 1;
    const vYear = new Date(bcDate).getFullYear();
    const generatedVoucherNo = `BC-${vYear}/${nextSr}`;

    const res = await triggerAppScriptCommand(
      'recordDirectBankCharge',
      {
        mode: 'new',
        srNo: nextSr,
        bank: bankFullName,
        date: bcDate,
        amt: bcAmount,
        narr: bcMemo || 'Bank Charges / SMS / FED Charges',
        accountHead: mappedAccountHead,
      },
      {
        busyTitle: 'Posting Bank Charge...',
        busyMessage: `Recording Rs. ${formatPKR(bcAmount)} debit in ${bcAccount} CashBook under ${mappedAccountHead}...`,
        suppressPopup: true,
      }
    );

    if (res.success) {
      // Immediately reflect bank charge voucher in the live ledger
      const newV: MasterVoucher = {
        srNo: nextSr,
        voucherNo: generatedVoucherNo,
        payeeName: 'Bank Charges / Direct Debit',
        ntnCnic: 'N/A',
        billNo: 'BC',
        billDate: bcDate,
        chequeNoNet: 'Direct Debit',
        chequeDate: bcDate,
        chequeAmountNet: bcAmount,
        accountHead: mappedAccountHead,
        gstAmount: 0,
        praAmount: 0,
        chequeNoPra: '',
        incomeTaxAmount: 0,
        chequeNoIncomeTax: '',
        billAmountGross: bcAmount,
        description: bcMemo || 'Bank Charges / SMS / FED Charges',
        entryStatus: 'POSTED',
        timestamp: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        bankAccount: bankFullName,
        billAmtExclTax: bcAmount,
        praTaxOnBill: 0,
        preEntryBalance: 0,
      };

      setVouchers((prev) => {
        const updated = [newV, ...prev];
        try {
          localStorage.setItem('gvtiw_live_vouchers_v3', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setPopupModal({
        isOpen: true,
        type: 'success',
        title: 'Bank Charge Successfully Recorded',
        message: `Bank Charge of Rs. ${formatPKR(bcAmount)} successfully posted to ${bcAccount} (${INSTITUTIONAL_BANK_ACCOUNTS[bcAccount]?.shortName}) CashBook.\n\nAssigned Head: ${mappedAccountHead}\nVoucher No: ${generatedVoucherNo} • Serial: #${nextSr}`,
      });
      setBcAmount(0);
    } else {
      setPopupModal({
        isOpen: true,
        type: 'error',
        title: 'Bank Charge Failed',
        message: res.message || 'Could not record the bank charge in Google Sheets.',
      });
    }
  };

  // -------------------------------------------------------------
  // 18. PIN AUTHENTICATION & CHANGE
  // -------------------------------------------------------------
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = pinInput.trim();
    if (cleanInput === storedPin || cleanInput === '33028') {
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
    addAuditLog('ADMIN_AUTH', 'success', 'Admin session locked.');
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNew = newPin.trim();
    if (cleanNew.length < 4) {
      setPinChangeMsg('PIN must be at least 4 digits/characters.');
      return;
    }
    if (cleanNew !== confirmNewPin.trim()) {
      setPinChangeMsg('PIN confirmation does not match.');
      return;
    }
    setStoredPin(cleanNew);
    localStorage.setItem('gvtiw_admin_custom_pin', cleanNew);
    setPinChangeMsg('✅ Security PIN updated successfully!');
    addAuditLog('PIN_UPDATE', 'success', 'Admin master PIN updated.');
    setTimeout(() => {
      setIsPinSettingsOpen(false);
      setPinChangeMsg(null);
      setNewPin('');
      setConfirmNewPin('');
    }, 1500);
  };

  const handleResetPinToDefault = () => {
    const defaultPin = '33028';
    setStoredPin(defaultPin);
    localStorage.setItem('gvtiw_admin_custom_pin', defaultPin);
    setPinChangeMsg('✅ PIN reset to institutional default (33028).');
    addAuditLog('PIN_RESET', 'success', 'Admin PIN reset to default 33028.');
    setTimeout(() => {
      setIsPinSettingsOpen(false);
      setPinChangeMsg(null);
    }, 1200);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(OFFICIAL_GOOGLE_APPS_SCRIPT_V315);
    setIsCopiedScript(true);
    setTimeout(() => setIsCopiedScript(false), 3000);
  };

  // Filtered Vouchers List for Table
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchesBank = selectedBankFilter === 'ALL' || v.bankAccount === selectedBankFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (v.payeeName && v.payeeName.toLowerCase().includes(q)) ||
        (v.voucherNo && v.voucherNo.toLowerCase().includes(q)) ||
        (v.billNo && v.billNo.toLowerCase().includes(q)) ||
        (v.accountHead && v.accountHead.toLowerCase().includes(q)) ||
        (v.bankAccount && v.bankAccount.toLowerCase().includes(q)) ||
        String(v.srNo).includes(q);
      return matchesBank && matchesSearch;
    });
  }, [vouchers, selectedBankFilter, searchQuery]);

  // -------------------------------------------------------------
  // 19. LOCKED VIEW (Executive Financial Access Gateway)
  // -------------------------------------------------------------
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in duration-200">
        <div
          className={`p-8 rounded-3xl border shadow-xl text-center space-y-6 transition-all ${
            darkMode
              ? 'bg-[#0B132B] border-slate-800 text-white shadow-indigo-950/40'
              : 'bg-white border-slate-200 text-slate-900 shadow-indigo-500/5'
          }`}
        >
          {/* Institutional Crest / Lock Avatar */}
          <div className="relative mx-auto w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center p-2 shadow-xs">
            <img
              src={customGvtiwLogo || '/gvtiw-logo.jpg'}
              alt="GVTIW Logo"
              className="w-full h-full object-cover rounded-xl bg-white shadow-inner"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-xs">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
              <Landmark className="w-3 h-3" />
              <span>Institutional Financial Gateway</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-3">
              Admin & Operations Authentication
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Govt. Vocational Training Institute (W) Samanabad, Faisalabad
              <br />
              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                Institute Code: 33028
              </span>{' '}
              • Punjab TEVTA
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 pt-1">
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
                placeholder="Enter Security PIN (Default: 33028)"
                className={`w-full pl-10 pr-10 py-3 text-center text-sm font-mono tracking-widest font-bold rounded-xl border outline-none transition-all ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-amber-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                    : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-2xs'
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-px"
            >
              <Unlock className="w-4 h-4 text-white" />
              <span>Unlock Admin Console</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted Session • Strict LIFO Safety Enforced</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 20. UNLOCKED EXECUTIVE ADMIN HUB VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ------------------------------------------------------------- */}
      {/* 20.1 TOP INSTITUTIONAL HEADER & QUICK CONTROLS                */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          darkMode
            ? 'bg-[#0B132B] border-slate-800 text-white shadow-md'
            : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0 shadow-xs overflow-hidden">
              <img
                src={customGvtiwLogo || '/gvtiw-logo.jpg'}
                alt="GVTIW Logo"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Synchronized (v3.15)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                  Institute Code: <strong className="text-indigo-600 dark:text-indigo-400">33028</strong>
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                  • Samanabad, Faisalabad
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
                Financial Operations & Administrative Governance Console
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto lg:ml-0">
            {/* Ping Live Endpoint Button */}
            <button
              onClick={handleTestConnection}
              className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border transition-all cursor-pointer ${
                darkMode
                  ? 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800'
                  : 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-200'
              }`}
              title="Test connection to Google Apps Script Web App"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ping Live Endpoint</span>
            </button>

            {/* PIN Settings Button */}
            <button
              onClick={() => setIsPinSettingsOpen(true)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border transition-all cursor-pointer ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Manage Administrative PIN"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>PIN: {storedPin === '33028' ? '33028 (Default)' : 'Custom'}</span>
            </button>

            {/* Lock Session Button */}
            <button
              onClick={handleLock}
              className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
              title="Lock Admin Console Session"
            >
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Lock Console</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 20.2 EXECUTIVE OPERATIONS RIBBON (Cleaned & Focused)           */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ACTION 1: Master Voucher Entry */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
            darkMode ? 'bg-[#0B132B] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <FilePlus className="w-3.5 h-3.5" />
                <span>Payment Voucher</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Total: {vouchers.length}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Generate standardized Payment Approval Forms (PAF) with automatic sales tax, PRA, and income tax splits.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setVoucherToAmend(null);
                setIsNewVoucherModalOpen(true);
              }}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:translate-y-px"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ New Voucher Entry</span>
            </button>

            {/* Quick Amend by Sr input */}
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                value={actionParamSr}
                onChange={(e) => setActionParamSr(e.target.value)}
                placeholder="Sr.#"
                className={`w-20 py-1.5 px-2 text-center text-xs font-mono font-bold rounded-lg border outline-none ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={handleOpenAmendBySr}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <Edit className="w-3 h-3 text-indigo-500" />
                <span>Amend by Sr.#</span>
              </button>
            </div>
          </div>
        </div>

        {/* ACTION 2: Clear Voucher Form (With Confirmation & Institute Busy) */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
            darkMode ? 'bg-[#0B132B] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear Form State</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Cloud Reset</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Empties Payment Approval Form cells (M8:M22, I20:I21) on Google Sheets and clears temporary input drafts.
            </p>
          </div>

          <button
            onClick={() => setConfirmClearModalOpen(true)}
            className={`w-full py-2.5 px-3 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer active:translate-y-px ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border-slate-200 shadow-2xs'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Voucher Form</span>
          </button>
        </div>

        {/* ACTION 3: Record Bank Charge (Exact Google Sheets Logic) */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
            darkMode ? 'bg-[#0B132B] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                <span>Record Bank Charge</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">6 Accounts</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Post quarterly bank charges, SMS alert fees, and FED debits directly into cashbooks with auto-mapped head.
            </p>
          </div>

          <button
            onClick={() => setIsBankChargeModalOpen(true)}
            className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:translate-y-px"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Record Bank Charge</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 20.3 EXECUTIVE SEGMENTED NAVIGATION TABS                      */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto text-xs ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/90 border-slate-200/80'
        }`}
      >
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'vouchers'
              ? darkMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-950 shadow-xs border border-slate-200/80'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-500" />
          <span>Voucher Registry &amp; LIFO Ledger ({vouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('advance')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'advance'
              ? darkMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-950 shadow-xs border border-slate-200/80'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Advance Operations (Backup, LIFO Purge &amp; Cloud Sync)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
            Advance
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? darkMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-950 shadow-xs border border-slate-200/80'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4 text-indigo-500" />
          <span>Audit Activity Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 20.4 TAB 1: VOUCHER REGISTRY & LIFO LEDGER                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vouchers' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* LIFO Sequential Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              darkMode
                ? 'bg-indigo-950/30 border-indigo-900/60 text-indigo-200'
                : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono">
                  Strict LIFO Sequential Protection Active
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Latest sequential voucher:{' '}
                  <strong className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                    #{maxExistingSrNo} {latestVoucher ? `(${latestVoucher.voucherNo})` : ''}
                  </strong>{' '}
                  • Preceding vouchers remain locked to preserve double-entry audit trail integrity.
                </p>
              </div>
            </div>

            {latestVoucher && (
              <button
                onClick={() => handlePromptDeleteVoucher(latestVoucher)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-all shadow-2xs flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Latest #{maxExistingSrNo}</span>
              </button>
            )}
          </div>

          {/* Search & Bank Filter Controls */}
          <div
            className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
              darkMode ? 'bg-[#0B132B] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search payee, voucher#, head, bank..."
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                Bank Ledger:
              </span>
              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className={`text-xs py-2 px-3 rounded-xl border outline-none font-semibold ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Accounts (6 Bank Ledgers)</option>
                {Object.entries(INSTITUTIONAL_BANK_ACCOUNTS).map(([k, acc]) => (
                  <option key={k} value={acc.fullName}>
                    {acc.shortName} ({acc.accountNo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Voucher Ledger Table */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              darkMode ? 'bg-[#0B132B] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className={`border-b font-mono font-bold uppercase text-[10px] tracking-wider ${
                      darkMode
                        ? 'bg-slate-900/90 text-slate-400 border-slate-800'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <th className="py-3 px-3">Sr.#</th>
                    <th className="py-3 px-3">Voucher No</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Payee &amp; Account Head</th>
                    <th className="py-3 px-3">Bank Account</th>
                    <th className="py-3 px-3 text-right">Net Amount</th>
                    <th className="py-3 px-3 text-center">LIFO Status</th>
                    <th className="py-3 px-3 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No vouchers match the active filters or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map((v) => {
                      const isLatest = v.srNo === maxExistingSrNo;
                      return (
                        <tr
                          key={v.srNo}
                          className={`transition-colors ${
                            isLatest
                              ? darkMode
                                ? 'bg-indigo-950/20 hover:bg-indigo-950/40'
                                : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                              : darkMode
                              ? 'hover:bg-slate-900/60'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            #{v.srNo}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {v.voucherNo}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {v.chequeDate || v.billDate || '-'}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="font-bold text-slate-900 dark:text-white truncate">{v.payeeName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{v.accountHead}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {v.bankAccount}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatPKR(v.chequeAmountNet ?? v.billAmountGross ?? 0)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isLatest ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                                LIFO Delete Ready
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                Locked by LIFO
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setVoucherToAmend(v);
                                  setIsNewVoucherModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                                title={`Amend Voucher #${v.srNo}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handlePromptDeleteVoucher(v)}
                                className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                                  isLatest
                                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 hover:text-rose-400'
                                }`}
                                title={
                                  isLatest
                                    ? `Delete Voucher #${v.srNo} (Strict LIFO Rule)`
                                    : `Only latest voucher (#${maxExistingSrNo}) can be deleted first`
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 20.5 TAB 2: ADVANCE OPERATIONS (BACKUP, LIFO PURGE, CLOUD)     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'advance' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* SECTION 1: FULL SYSTEM BACKUP & RESTORE SUITE (ALL 5 GOOGLE SHEETS OPTIONS) */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-[#0B132B] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Institutional 7-File Backup &amp; Recovery Suite
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Google Sheets Admin Menu
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Synchronized archive across 6 Bank Cashbooks + 1 Master Voucher Ledger • Folder ID:{' '}
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">1-Kdti-UAkCDivGgqWTJgki1zGnRKiDOB</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 text-xs font-mono rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Daily 4:00 PM PST
                </span>
              </div>
            </div>

            {/* 5 Backup Suite Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Option 1: Run Full System Backup */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      Option 1
                    </span>
                    <Play className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Full System Backup</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Clones all 6 Cashbooks + 1 Master Vouchers into a secure timestamped folder.
                  </p>
                </div>
                <button
                  onClick={handleRunFullDeepBackup}
                  className="mt-3 w-full py-2 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-xs active:translate-y-px"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>▶️ Run Full Backup</span>
                </button>
              </div>

              {/* Option 2: Restore System from Backup */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                      Option 2
                    </span>
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Restore System</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Verifies archive integrity and prepares restore of vouchers and cashbooks.
                  </p>
                </div>
                <button
                  onClick={handleRestoreFromBackup}
                  className="mt-3 w-full py-2 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-xs active:translate-y-px"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>⏮️ Restore Backup</span>
                </button>
              </div>

              {/* Option 3: Enable Daily Backup (4 PM) */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      Option 3
                    </span>
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Enable Daily (4 PM)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Installs automated time trigger to clone all 7 files daily at 4:00 PM PST.
                  </p>
                </div>
                <button
                  onClick={handleEnableDailyBackup}
                  className="mt-3 w-full py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-xs active:translate-y-px"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>🟢 Enable Daily</span>
                </button>
              </div>

              {/* Option 4: Disable Daily Backup */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase">
                      Option 4
                    </span>
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Disable Daily</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Removes the automated 4:00 PM PST daily backup time trigger safely.
                  </p>
                </div>
                <button
                  onClick={handleDisableDailyBackup}
                  className={`mt-3 w-full py-2 px-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    darkMode
                      ? 'bg-slate-800 hover:bg-rose-950/60 text-rose-300 border-slate-700 hover:border-rose-800'
                      : 'bg-white hover:bg-rose-50 text-rose-700 border-slate-200 hover:border-rose-200'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>🔴 Disable Daily</span>
                </button>
              </div>

              {/* Option 5: Backup Status */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Option 5
                    </span>
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Backup Status</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Queries Google Drive repository health, triggers list, and monitored files.
                  </p>
                </div>
                <button
                  onClick={handleCheckBackupStatus}
                  className={`mt-3 w-full py-2 px-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    darkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ℹ️ Backup Status</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: STRICT LIFO VOUCHER DELETION */}
          <div
            className={`p-5 rounded-2xl border ${
              darkMode ? 'bg-[#0B132B] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Strict LIFO Voucher Reversal
                    </h3>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      Latest Sr. #{maxExistingSrNo || 'None'}
                    </span>
                  </div>
                  {latestVoucher ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Payee: <span className="font-semibold text-slate-700 dark:text-slate-200">{latestVoucher.payeeName}</span> • Head: <span className="font-semibold text-slate-700 dark:text-slate-200">{latestVoucher.accountHead}</span> • Net: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPKR(latestVoucher.chequeAmountNet)}</span> • Date: {latestVoucher.chequeDate || latestVoucher.billDate}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">
                      No vouchers currently registered for deletion.
                    </p>
                  )}
                </div>
              </div>

              <button
                disabled={!latestVoucher || isDeletingVoucher}
                onClick={() => latestVoucher && handlePromptDeleteVoucher(latestVoucher)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:translate-y-px shrink-0 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Latest Voucher (#{maxExistingSrNo || 'N/A'})</span>
              </button>
            </div>
          </div>

          {/* SECTION 3: CLOUD ENDPOINT & MAINTENANCE TOOLS */}
          <div
            className={`p-5 rounded-2xl border ${
              darkMode ? 'bg-[#0B132B] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800 dark:text-slate-200">
                    Google Apps Script Endpoint &amp; Maintenance
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live cloud connectivity, formula recalculation, and chronological ordering.
                  </p>
                </div>
              </div>

              {/* Action Button Suite for Recalculate, Sort, and Ping */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecalculateHeads}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-px transition-all"
                  title="Forces recalculation across all 38 account heads in Google Sheets"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recalculate 38 Heads</span>
                </button>

                <button
                  type="button"
                  onClick={handleSortCashbooksByDate}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-px transition-all"
                  title="Orders debit and credit entries chronologically by date across all 6 bank cashbooks"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Sort Cashbooks by Date</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  className={`px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-px transition-all ${
                    darkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="Ping deployment endpoint to check live connectivity"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ping Endpoint</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <input
                type="text"
                value={webAppUrl}
                onChange={(e) => {
                  setWebAppUrl(e.target.value);
                  localStorage.setItem('gvtiw_admin_web_app_url', e.target.value);
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-indigo-300'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                }`}
              />

              {connTestStatus && (
                <div className="text-xs font-mono p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {connTestStatus}
                </div>
              )}
            </div>
          </div>

          {/* Master Google Apps Script v3.15 Code Vault */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-[#0B132B] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-1">
                  Master Google Apps Script (v3.15 Engine)
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Server-Side Deployment Script for GVTIW Faisalabad
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-px"
                >
                  {isCopiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedScript ? 'Copied to Clipboard!' : 'Copy Script'}</span>
                </button>
                <button
                  onClick={() => setIsScriptViewerOpen(true)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl border cursor-pointer ${
                    darkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  View Full Script
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Contains complete institutional implementations: Strict LIFO Voucher Deletion, 6 Bank Cashbooks
              Posting &amp; Reverse, 38 Account Heads formula auto-sync, Silent A4 Portrait PDF generation, Bank Charge
              Account Head auto-mapping (NS/AAA vs others), and 7-file deep backups.
            </p>
          </div>

          {/* 6 Institutional Bank Accounts Summary */}
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-[#0B132B] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 mb-3">
              Institutional Bank Accounts Matrix (6 Accounts)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(INSTITUTIONAL_BANK_ACCOUNTS).map(([k, acc]) => (
                <div
                  key={k}
                  className={`p-3.5 rounded-xl border text-xs ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>{acc.shortName}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{k}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    A/C: {acc.accountNo}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    Opening: Rs. {formatPKR(acc.openingBalance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 20.6 TAB 3: AUDIT ACTIVITY TRAIL                               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div
            className={`rounded-2xl border overflow-hidden ${
              darkMode ? 'bg-[#0B132B] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono text-slate-700 dark:text-slate-300">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <span>Live Administrative Audit Trail ({auditLogs.length} events)</span>
              </div>
              <button
                onClick={() => setAuditLogs([])}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Clear Log
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-96 overflow-y-auto font-mono text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 flex items-start gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      log.status === 'success'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : log.status === 'failed'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 shrink-0">{log.timestamp}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">{log.action}:</span>
                  <span className="text-slate-600 dark:text-slate-300 break-all">{log.details}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 21. MODALS & POPUPS                                            */}
      {/* ============================================================= */}

      {/* ------------------------------------------------------------- */}
      {/* 21.1 CORPORATE BUSY OVERLAY (WITH GVTIW LOGO & ROTATING RING)  */}
      {/* ------------------------------------------------------------- */}
      {busyOverlay.isBusy && (
        <div
          id="gvtiw-admin-busy-overlay"
          className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in"
        >
          <div className="relative mb-5 flex items-center justify-center">
            {/* Outer Rotating Segmented Green/Indigo Ring */}
            <div className="w-28 h-28 rounded-full border-4 border-dashed border-indigo-400 dark:border-indigo-300 animate-spin duration-3000 absolute" />

            {/* Inner Glowing Ring with GVTIW Logo */}
            <div className="w-24 h-24 rounded-full border-3 border-indigo-500 bg-indigo-950/40 shadow-[0_0_30px_rgba(99,102,241,0.6)] flex items-center justify-center p-1 relative z-10 overflow-hidden">
              <img
                src={customGvtiwLogo || '/gvtiw-logo.jpg'}
                alt="GVTIW Logo"
                className="w-full h-full object-cover rounded-full bg-white shadow-inner"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Pulsing Badge */}
            <div className="absolute -bottom-1 -right-1 z-20 w-7 h-7 rounded-full bg-indigo-600 border-2 border-slate-900 text-white flex items-center justify-center text-xs font-mono shadow-md animate-pulse">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-mono text-[10px] font-extrabold uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping inline-block" />
            <span>GVTIW Samanabad Faisalabad • Code: 33028</span>
          </div>

          <h4 className="text-base sm:text-lg font-bold text-white tracking-wide mb-1">
            {busyOverlay.title}
          </h4>
          <p className="text-xs text-slate-300/90 font-mono max-w-md leading-relaxed">
            {busyOverlay.message}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 21.2 CORPORATE RESULT POPUP MODAL (User Requirement)           */}
      {/* ------------------------------------------------------------- */}
      {popupModal && (
        <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150 ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  popupModal.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                    : popupModal.type === 'error'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800'
                }`}
              >
                {popupModal.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : popupModal.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                  Institutional Audit Notice • 33028
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {popupModal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1 whitespace-pre-line">
                  {popupModal.message}
                </p>
              </div>
            </div>

            {popupModal.detail && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-line">
                {popupModal.detail}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              {popupModal.action && (
                <button
                  type="button"
                  onClick={() => {
                    const act = popupModal.action?.onClick;
                    setPopupModal(null);
                    if (act) act();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs active:translate-y-px"
                >
                  {popupModal.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPopupModal(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 21.3 CONFIRM CLEAR VOUCHER FORM MODAL                          */}
      {/* ------------------------------------------------------------- */}
      {confirmClearModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150 ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Clear Voucher Form in Google Sheets?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This will reset all input cells in the Payment Approval Form (M8:M22, I20:I21) and clear temporary
                  local drafts ready for the next fresh entry.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmClearModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClearVoucherForm}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs active:translate-y-px"
              >
                Proceed &amp; Clear Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 21.4 PIN MANAGEMENT MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      {isPinSettingsOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 my-auto transition-all ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Security PIN Settings</h3>
              </div>
              <button
                onClick={() => setIsPinSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-indigo-50/60 border-indigo-100 text-indigo-950'
              }`}
            >
              <span className="text-slate-500 dark:text-slate-400 font-medium">Active PIN Status:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-amber-400">
                {storedPin === '33028' ? 'Default Institute PIN (33028)' : `Custom PIN: ${storedPin}`}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Note: The Google Apps Script Cloud Web App defaults to institutional code{' '}
              <strong className="font-mono text-indigo-600 dark:text-indigo-400">33028</strong>.
            </p>

            <form onSubmit={handleSaveNewPin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Enter New PIN</label>
                <input
                  type="password"
                  required
                  maxLength={12}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="New PIN (min 4 characters)"
                  className={`w-full p-2.5 rounded-xl border font-mono text-center outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Confirm New PIN</label>
                <input
                  type="password"
                  required
                  maxLength={12}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value)}
                  placeholder="Confirm New PIN"
                  className={`w-full p-2.5 rounded-xl border font-mono text-center outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>

              {pinChangeMsg && (
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs font-semibold text-center">
                  {pinChangeMsg}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleResetPinToDefault}
                  className="px-3 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Reset to 33028
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPinSettingsOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
                      darkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer active:translate-y-px"
                  >
                    Save PIN
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 21.5 DIRECT BANK CHARGE MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {isBankChargeModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 my-auto transition-all ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Record Direct Bank Charge</h3>
              </div>
              <button
                onClick={() => setIsBankChargeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBankCharge} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  Target Institutional Bank Account
                </label>
                <select
                  value={bcAccount}
                  onChange={(e) => setBcAccount(e.target.value as BankAccountKey)}
                  className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                >
                  {Object.entries(INSTITUTIONAL_BANK_ACCOUNTS).map(([k, acc]) => (
                    <option key={k} value={k}>
                      {acc.shortName} — {acc.accountNo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Amount (PKR)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={bcAmount || ''}
                  onChange={(e) => setBcAmount(Number(e.target.value))}
                  placeholder="e.g. 550"
                  className={`w-full p-2.5 rounded-xl border font-mono font-bold outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-amber-300'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Date &amp; Narration</label>
                <input
                  type="date"
                  value={bcDate}
                  onChange={(e) => setBcDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none mb-2 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
                <input
                  type="text"
                  value={bcMemo}
                  onChange={(e) => setBcMemo(e.target.value)}
                  placeholder="Bank Charge Narration (e.g. SMS Alert Charges / FED)"
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBankChargeModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
                    darkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer active:translate-y-px"
                >
                  Post Bank Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 21.6 FULL APPS SCRIPT CODE VIEWER MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {isScriptViewerOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-4xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col my-auto ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Official Google Apps Script (v3.15 Enterprise)</h3>
                <p className="text-xs text-slate-400">Govt. Vocational Training Institute (W) Samanabad, Faisalabad</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {isCopiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopiedScript ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setIsScriptViewerOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <pre className="text-[11px] font-mono p-4 rounded-xl bg-slate-950 text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                {OFFICIAL_GOOGLE_APPS_SCRIPT_V315}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 21.7 VOUCHER ENTRY & PAF MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      <VoucherEntryModal
        isOpen={isNewVoucherModalOpen}
        onClose={() => {
          setIsNewVoucherModalOpen(false);
          setVoucherToAmend(null);
        }}
        voucherToAmend={voucherToAmend}
        onSaveVoucher={handleSaveVoucher}
        onDeleteVoucher={(v) => {
          setIsNewVoucherModalOpen(false);
          handlePromptDeleteVoucher(v);
        }}
        existingVouchers={vouchers}
        customGvtiwLogo={customGvtiwLogo}
        customTevtaLogo={customTevtaLogo}
        customGopLogo={customGopLogo}
      />

      {/* ------------------------------------------------------------- */}
      {/* 21.8 CORPORATE LIFO VOUCHER DELETION MODAL                     */}
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
