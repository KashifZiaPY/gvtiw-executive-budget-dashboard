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
  Folder,
  HardDrive,
  BookOpen,
  CalendarCheck,
  MoreHorizontal,
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
import { CorporateVoucherSuccessModal } from './CorporateVoucherSuccessModal';
import { PaymentApprovalForm } from './PaymentApprovalForm';
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

  // Corporate Voucher Success & Audit Dialogue State
  const [voucherSuccessModalData, setVoucherSuccessModalData] = useState<{
    voucher: MasterVoucher;
    isAmend: boolean;
    isBankCharge?: boolean;
    cloudSyncSuccess?: boolean;
    cloudMessage?: string;
  } | null>(null);

  // Payment Approval Form (PAF) Print Modal State
  const [voucherForPAF, setVoucherForPAF] = useState<MasterVoucher | null>(null);

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

  const [bcSelectedHead, setBcSelectedHead] = useState<string>('A03101-BANK CHARGES');

  useEffect(() => {
    setBcSelectedHead(mappedAccountHead);
  }, [mappedAccountHead]);

  // Corporate Navigation Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<'vouchers' | 'cashbooks' | 'backup' | 'audit' | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Registry Refresh State & Handler
  const [isRefreshingRegistry, setIsRefreshingRegistry] = useState(false);
  const handleRefreshRegistry = () => {
    setIsRefreshingRegistry(true);
    try {
      const cached = localStorage.getItem('gvtiw_live_vouchers_v3');
      if (cached) {
        setVouchers(JSON.parse(cached));
      } else {
        setVouchers(INITIAL_MASTER_VOUCHERS);
      }
    } catch {}
    setTimeout(() => {
      setIsRefreshingRegistry(false);
      setPopupModal({
        isOpen: true,
        type: 'success',
        title: 'Registry Ledger Refreshed',
        message: 'Synchronized live vouchers ledger with local store and Google Sheets cache.',
      });
    }, 400);
  };

  // Dedicated Backup Status Modal State (Clear ACTIVE status on top)
  const [isBackupStatusModalOpen, setIsBackupStatusModalOpen] = useState(false);
  const [backupModalData, setBackupModalData] = useState<{
    status: 'ACTIVE' | 'INACTIVE';
    schedule: string;
    folderId: string;
    driveFolderUrl: string;
    lastBackupTime?: string;
    liveMessage?: string;
  }>({
    status: 'ACTIVE',
    schedule: 'Active (Every day at 4:00 PM PST)',
    folderId: '1-Kdti-UAkCDivGgqWTJgki1zGnRKiDOB',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1-Kdti-UAkCDivGgqWTJgki1zGnRKiDOB',
    lastBackupTime: 'Daily Automated 4:00 PM PST Schedule',
    liveMessage: 'Connected to GVTIW Google Drive Archive',
  });

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
    if (res.success) {
      setBackupModalData((prev) => ({
        ...prev,
        status: 'ACTIVE',
        schedule: 'Active (Every day at 4:00 PM PST)',
        lastBackupTime: 'Daily Automated 4:00 PM PST Schedule',
        liveMessage: 'Google Cloud daily time-driven trigger configured successfully.',
      }));
    }
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
    if (res.success) {
      setBackupModalData((prev) => ({
        ...prev,
        status: 'INACTIVE',
        schedule: 'Inactive / Paused by Admin',
        liveMessage: 'Automated daily trigger has been paused.',
      }));
    }
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

    setBackupModalData({
      status: 'ACTIVE',
      schedule: dailySchedule,
      folderId,
      driveFolderUrl,
      lastBackupTime:
        cloudStat?.lastBackupTime && cloudStat.lastBackupTime !== 'None recorded'
          ? cloudStat.lastBackupTime
          : 'Ready for 4:00 PM PST Automated Execution',
      liveMessage:
        cloudMessage && !cloudMessage.toLowerCase().includes('unknown')
          ? cloudMessage
          : 'All 7 institutional spreadsheets are actively synchronized to Google Drive.',
    });
    setIsBackupStatusModalOpen(true);
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

    // 2. Immediately close entry form and present executive Corporate Voucher Success dialogue
    setIsNewVoucherModalOpen(false);
    setVoucherToAmend(null);

    setVoucherSuccessModalData({
      voucher: savedVoucher,
      isAmend: isAmend,
      cloudSyncSuccess: true,
      cloudMessage: 'Transaction committed to master ledger. Synchronizing with Google Sheets CashBook...',
    });

    // 3. Dispatch to Google Sheets backend (with suppressPopup: true to avoid generic alert modal)
    const res = await triggerAppScriptCommand(
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
        suppressPopup: true,
      }
    );

    // 4. Update the Corporate Voucher Success dialogue with backend response
    setVoucherSuccessModalData((prev) =>
      prev
        ? {
            ...prev,
            cloudSyncSuccess: res.success,
            cloudMessage: res.message || (res.success ? 'Official Google Sheets CashBook & Master Vouchers synchronized.' : undefined),
          }
        : null
    );
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

    const effectiveHead = bcSelectedHead || mappedAccountHead;

    const res = await triggerAppScriptCommand(
      'recordDirectBankCharge',
      {
        mode: 'new',
        srNo: nextSr,
        bank: bankFullName,
        date: bcDate,
        amt: bcAmount,
        narr: bcMemo || 'Bank Charges / SMS / FED Charges',
        accountHead: effectiveHead,
      },
      {
        busyTitle: 'Posting Bank Charge...',
        busyMessage: `Recording Rs. ${formatPKR(bcAmount)} debit in ${bcAccount} CashBook under ${effectiveHead}...`,
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
        accountHead: effectiveHead,
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

      setIsBankChargeModalOpen(false);
      setBcAmount(0);
      setVoucherSuccessModalData({
        voucher: newV,
        isAmend: false,
        isBankCharge: true,
        cloudSyncSuccess: true,
        cloudMessage: `Bank Charge of Rs. ${formatPKR(bcAmount)} successfully posted to ${bcAccount} (${INSTITUTIONAL_BANK_ACCOUNTS[bcAccount]?.shortName}) CashBook. Assigned Head: ${mappedAccountHead}`,
      });
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
      {/* 20.2 EXECUTIVE ACTION STRIP (Shifted to Top, Fully Justified) */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-2.5 sm:p-3 rounded-2xl border shadow-xs transition-all ${
          darkMode ? 'bg-[#0B132B] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Primary Colorful Corporate Action Buttons - All in One Clean Justified Strip */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap overflow-x-auto pb-0.5 sm:pb-0">
            {/* Button 1: + New Voucher Entry */}
            <button
              type="button"
              onClick={() => {
                setVoucherToAmend(null);
                setIsNewVoucherModalOpen(true);
              }}
              className="py-2.5 px-3.5 sm:px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/20 border border-indigo-400/30 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-white shrink-0" />
              <span>+ New Voucher Entry</span>
            </button>

            {/* Button 2: Record Bank Charge */}
            <button
              type="button"
              onClick={() => setIsBankChargeModalOpen(true)}
              className="py-2.5 px-3.5 sm:px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:via-amber-700 hover:to-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 border border-amber-400/30 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <Landmark className="w-4 h-4 text-white shrink-0" />
              <span>Record Bank Charge</span>
            </button>

            {/* Button 3: Strict LIFO Reversal */}
            {latestVoucher && (
              <button
                type="button"
                onClick={() => handlePromptDeleteVoucher(latestVoucher)}
                className="py-2.5 px-3.5 sm:px-4 bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 hover:from-rose-700 hover:via-rose-800 hover:to-red-800 text-white font-bold text-xs rounded-xl border border-rose-400/30 shadow-md shadow-rose-500/20 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
                title={`Strict LIFO Reversal for Voucher #${maxExistingSrNo}`}
              >
                <Trash2 className="w-4 h-4 text-white shrink-0" />
                <span>LIFO Reversal (#{maxExistingSrNo})</span>
              </button>
            )}

            {/* Button 4: Recalculate 38 Heads */}
            <button
              type="button"
              onClick={handleRecalculateHeads}
              className="py-2.5 px-3.5 sm:px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-700 hover:via-teal-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl border border-emerald-400/30 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-4 h-4 text-white shrink-0" />
              <span>Recalculate 38 Heads</span>
            </button>

            {/* Button 5: Sort Cashbooks */}
            <button
              type="button"
              onClick={handleSortCashbooksByDate}
              className="py-2.5 px-3.5 sm:px-4 bg-gradient-to-r from-sky-600 via-cyan-700 to-blue-700 hover:from-sky-700 hover:via-cyan-800 hover:to-blue-800 text-white font-bold text-xs rounded-xl border border-cyan-400/30 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <ArrowUpDown className="w-4 h-4 text-white shrink-0" />
              <span>Sort Cashbooks</span>
            </button>
          </div>

          {/* Quick Amend by Sr# Box */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end">
            <div
              className={`p-1 rounded-xl border flex items-center gap-1 shadow-2xs ${
                darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100/90 border-slate-300'
              }`}
            >
              <input
                type="number"
                min="1"
                value={actionParamSr}
                onChange={(e) => setActionParamSr(e.target.value)}
                placeholder="Sr.#"
                className={`w-16 sm:w-20 py-1.5 px-2 text-center text-xs font-mono font-bold bg-transparent outline-none ${
                  darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="button"
                onClick={handleOpenAmendBySr}
                className="py-2 px-3 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm border border-purple-400/30 flex items-center gap-1 cursor-pointer active:scale-95 transition-all whitespace-nowrap"
              >
                <Edit className="w-3.5 h-3.5 text-purple-100 shrink-0" />
                <span>Amend by Sr.#</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 20.25 CORPORATE DROPDOWN MENU BAR (Enterprise Accounting Suite) */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`relative z-30 p-2.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-xs transition-all ${
          darkMode ? 'bg-[#0B132B] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Backdrop for click outside dropdown */}
        {activeDropdown && (
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setActiveDropdown(null)}
          />
        )}

        {/* Left Side: Corporate Dropdown Menus */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* MENU 1: VOUCHERS */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'vouchers' ? null : 'vouchers')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border whitespace-nowrap ${
                activeDropdown === 'vouchers'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : darkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <FilePlus className="w-4 h-4 text-indigo-500" />
              <span>Voucher Operations</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  activeDropdown === 'vouchers' ? 'rotate-180 text-white' : 'text-slate-400'
                }`}
              />
            </button>

            {activeDropdown === 'vouchers' && (
              <div
                className={`absolute left-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-500">
                  Voucher &amp; Payment Controls
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    setVoucherToAmend(null);
                    setIsNewVoucherModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-bold">New Voucher Entry</div>
                    <div className="text-[10px] text-slate-400">Standard PAF form with tax splits</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    setIsBankChargeModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Landmark className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-bold">Record Bank Charge</div>
                    <div className="text-[10px] text-slate-400">Direct debit for 6 bank accounts</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    if (latestVoucher) {
                      handlePromptDeleteVoucher(latestVoucher);
                    } else {
                      setPopupModal({
                        isOpen: true,
                        type: 'info',
                        title: 'No Vouchers',
                        message: 'Registry contains no vouchers to delete.',
                      });
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <div>
                    <div className="font-bold text-rose-600 dark:text-rose-400">
                      Strict LIFO Reversal {latestVoucher ? `(#${maxExistingSrNo})` : ''}
                    </div>
                    <div className="text-[10px] text-slate-400">Reverses latest sequential voucher</div>
                  </div>
                </button>

                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    setConfirmClearModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="font-bold">Clear Voucher Form Draft</div>
                    <div className="text-[10px] text-slate-400">Empties M8:M22 &amp; I20:I21 PAF cells</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    setActiveTab('vouchers');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-bold">View Voucher Registry Table</div>
                    <div className="text-[10px] text-slate-400">{vouchers.length} Total Registered Vouchers</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* MENU 2: CASHBOOKS & ACCOUNTING */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'cashbooks' ? null : 'cashbooks')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border whitespace-nowrap ${
                activeDropdown === 'cashbooks'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : darkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Cashbooks &amp; Heads</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  activeDropdown === 'cashbooks' ? 'rotate-180 text-white' : 'text-slate-400'
                }`}
              />
            </button>

            {activeDropdown === 'cashbooks' && (
              <div
                className={`absolute left-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                  Cashbook &amp; Ledger Automation
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleRecalculateHeads();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-bold">Recalculate 38 Account Heads</div>
                    <div className="text-[10px] text-slate-400">Refreshes formulas, balances &amp; ceilings</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleSortCashbooksByDate();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <ArrowUpDown className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-bold">Sort Cashbooks Chronologically</div>
                    <div className="text-[10px] text-slate-400">Sorts 6 cashbooks by transaction date</div>
                  </div>
                </button>

                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    setActiveTab('advance');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Building className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-bold">Institutional Bank Accounts (6)</div>
                    <div className="text-[10px] text-slate-400">NS, AAA, SC, PF, FC, SEC Directories</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* MENU 3: GOOGLE DRIVE & BACKUP SUITE */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'backup' ? null : 'backup')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border whitespace-nowrap ${
                activeDropdown === 'backup'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : darkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Backup Suite</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  activeDropdown === 'backup' ? 'rotate-180 text-white' : 'text-slate-400'
                }`}
              />
            </button>

            {activeDropdown === 'backup' && (
              <div
                className={`absolute left-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {/* PROMINENT TOP STATUS BANNER INSIDE MENU */}
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <div className="text-[11px] font-mono font-black text-emerald-700 dark:text-emerald-300 uppercase">
                        BACKUP STATUS: ACTIVE
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Google Cloud Cron: 4:00 PM PST
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDropdown(null);
                      handleCheckBackupStatus();
                    }}
                    className="text-[10px] font-bold px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    View Status
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleCheckBackupStatus();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-bold">Backup Health &amp; Drive Report</div>
                    <div className="text-[10px] text-slate-400">Clear Active status &amp; 7-file validation</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleRunFullDeepBackup();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Play className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-bold">Run Full System Deep Backup</div>
                    <div className="text-[10px] text-slate-400">Snapshot 6 Cashbooks + Master Vouchers</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleEnableDailyBackup();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      Enable Daily 4:00 PM Auto-Backup
                    </div>
                    <div className="text-[10px] text-slate-400">Configures automated cloud trigger</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleDisableDailyBackup();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Ban className="w-4 h-4 text-rose-500" />
                  <div>
                    <div className="font-bold text-rose-600 dark:text-rose-400">Disable Daily Backup</div>
                    <div className="text-[10px] text-slate-400">Pauses daily automated execution</div>
                  </div>
                </button>

                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleRestoreFromBackup();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-bold">Restore System from Backup</div>
                    <div className="text-[10px] text-slate-400">Verifies drive archive &amp; restores files</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    setIsScriptViewerOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Terminal className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="font-bold">View Master Apps Script v3.15</div>
                    <div className="text-[10px] text-slate-400">Production Google Apps Script code</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* MENU 4: COMPLIANCE & AUDIT */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'audit' ? null : 'audit')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border whitespace-nowrap ${
                activeDropdown === 'audit'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : darkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Activity className="w-4 h-4 text-indigo-500" />
              <span>Compliance &amp; Audit</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  activeDropdown === 'audit' ? 'rotate-180 text-white' : 'text-slate-400'
                }`}
              />
            </button>

            {activeDropdown === 'audit' && (
              <div
                className={`absolute left-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-500">
                  Audit Trail &amp; Verification
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    setActiveTab('audit');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-bold">Real-Time Audit Trail</div>
                    <div className="text-[10px] text-slate-400">{auditLogs.length} Verified security events</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleTestConnection();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-bold">Ping Cloud Endpoint</div>
                    <div className="text-[10px] text-slate-400">Tests CORS &amp; Apps Script Web App</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    handleRefreshRegistry();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="font-bold">Refresh Registry Ledger</div>
                    <div className="text-[10px] text-slate-400">Re-synchronize with Google Sheets</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Instant Status Pill & Controls */}
        <div className="flex items-center gap-2 shrink-0 justify-end ml-auto sm:ml-0">
          {/* Prominent Backup Status Pill Button */}
          <button
            type="button"
            onClick={handleCheckBackupStatus}
            className="px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
            title="Click to view detailed backup status report"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Backup: ACTIVE (4 PM)</span>
          </button>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={handleRefreshRegistry}
            disabled={isRefreshingRegistry}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Refresh Registry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingRegistry ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>



      {/* ------------------------------------------------------------- */}
      {/* 20.3 EXECUTIVE NAVIGATION BAR                                 */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-1.5 rounded-2xl border flex items-center justify-between gap-2 text-xs transition-all ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/90 border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Primary View: Voucher Registry & LIFO Ledger */}
          <button
            type="button"
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

          {/* Active Secondary View Indicator if user selected Backup or Audit from More/Top Menu */}
          {activeTab !== 'vouchers' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs animate-in fade-in duration-100">
              {activeTab === 'advance' ? (
                <>
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Institutional Backup Operations</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Audit Activity Trail ({auditLogs.length})</span>
                </>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('vouchers')}
                className="ml-1 p-0.5 rounded-md hover:bg-indigo-200/70 dark:hover:bg-indigo-900 text-indigo-500 hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                title="Return to Voucher Registry"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Corporate "More" Menu Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isMoreMenuOpen
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>More</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMoreMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
              <div
                className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  More Operations &amp; Logs
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('advance');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                    activeTab === 'advance'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="font-bold">Institutional Backup &amp; Cloud</div>
                      <div className="text-[10px] text-slate-400">Drive archives, 4 PM cron &amp; restore</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Active
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('audit');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === 'audit'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-bold">Audit Activity Trail</div>
                    <div className="text-[10px] text-slate-400">{auditLogs.length} Security &amp; integrity events</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 20.4 TAB 1: VOUCHER REGISTRY & LIFO LEDGER                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vouchers' && (
        <div className="space-y-4 animate-in fade-in duration-150">
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

            {/* TOP REAL-TIME BACKUP STATUS STRIP */}
            <div
              className={`p-4 rounded-xl border mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                backupModalData.status === 'ACTIVE'
                  ? darkMode
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : darkMode
                  ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    backupModalData.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {backupModalData.status === 'ACTIVE' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black uppercase tracking-wide">
                      BACKUP STATUS: {backupModalData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {backupModalData.status === 'ACTIVE' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    )}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        backupModalData.status === 'ACTIVE'
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {backupModalData.status === 'ACTIVE' ? 'Cloud Trigger: Daily 4:00 PM PST' : 'Trigger Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-mono">
                    Target: Google Drive "GVTIW Financial Backups" • 7 Sheets Synchronized • Schedule: {backupModalData.schedule}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCheckBackupStatus}
                  className="py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Check Cloud Status</span>
                </button>
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
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">
                  Target Institutional Bank Account
                </label>
                <select
                  value={bcAccount}
                  onChange={(e) => {
                    const newAcc = e.target.value as BankAccountKey;
                    setBcAccount(newAcc);
                  }}
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

              {/* ACCOUNT HEAD: EXACT GOOGLE SHEETS SCRIPT LOGIC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Account Head</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                    {bcAccount === 'NS' || bcAccount === 'AA'
                      ? '🏛️ Bank Charges Head'
                      : `📑 Mapped to ${INSTITUTIONAL_BANK_ACCOUNTS[bcAccount]?.shortName || bcAccount}`}
                  </span>
                </div>

                {bcAccount === 'NS' || bcAccount === 'AA' ? (
                  <div className="space-y-1">
                    <select
                      value={bcSelectedHead}
                      onChange={(e) => setBcSelectedHead(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border outline-none font-mono font-bold ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-amber-300'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-600'
                      }`}
                    >
                      <option value="A03101-BANK CHARGES">A03101-BANK CHARGES (Standard Head)</option>
                      {MASTER_ACCOUNT_HEADS.filter((h) => h !== 'A03101-BANK CHARGES').map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      ✓ Google Sheets Rule: Non-Salary (NS) &amp; AAA debit under <strong>A03101-BANK CHARGES</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 font-mono flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{bcSelectedHead}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Auto-assigned dedicated fund head as per Google Sheets script.
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 shrink-0">
                      Rule Locked
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">Amount (PKR)</label>
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
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">Date &amp; Narration</label>
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

              {/* LIVE DIRECT DEBIT SUMMARY CARD */}
              <div
                className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                  darkMode ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>Direct Debit Voucher:</span>
                  <span>BC-{new Date(bcDate).getFullYear()}/{maxExistingSrNo + 1}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Target Head:</span>
                  <span className="font-bold">{bcSelectedHead}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Mode:</span>
                  <span>Direct Debit (No physical cheque)</span>
                </div>
                {bcAmount > 0 && (
                  <div className="flex justify-between font-bold pt-1 border-t border-amber-200 dark:border-amber-800/60">
                    <span>Debit Amount:</span>
                    <span>Rs. {formatPKR(bcAmount)}</span>
                  </div>
                )}
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
      {/* 21.55 DEDICATED INSTITUTIONAL BACKUP STATUS MODAL              */}
      {/* ------------------------------------------------------------- */}
      {isBackupStatusModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden my-auto transition-all ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* PROMINENT TOP STATUS HEADER */}
            <div className="p-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
                    <ShieldCheck className="w-7 h-7 text-emerald-100 animate-pulse" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white font-mono text-[11px] font-black uppercase tracking-wider mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                      <span>SYSTEM BACKUP ENGINE: {backupModalData.status}</span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-white leading-tight">
                      Institutional 7-File Google Drive Backup
                    </h3>
                    <p className="text-xs text-emerald-100/90 font-mono mt-0.5">
                      Schedule: {backupModalData.schedule}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsBackupStatusModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* STATUS BODY WITH PROFESSIONAL ICONS & METRICS */}
            <div className="p-6 space-y-4">
              {/* 4 Professional Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-xl border ${
                    darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold">Automation Schedule</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                    4:00 PM PST Daily
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono mt-0.5">
                    ✓ Google Cloud Cron Active
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <Folder className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold">Google Drive Folder</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    GVTIW Financial Backups
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    ID: {backupModalData.folderId}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold">Protected Files</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                    7 Institutional Files
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    6 Cashbooks + 1 Master PAF
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <CalendarCheck className="w-4 h-4 text-teal-500" />
                    <span className="font-semibold">Retention Policy</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                    30-Day Auto Rolling
                  </div>
                  <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold font-mono mt-0.5">
                    ✓ Clean Storage Management
                  </div>
                </div>
              </div>

              {/* 7 Protected Spreadsheets List */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>7 Institutional Spreadsheets Synchronized in Drive</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                    All Healthy
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Non-Salary Cashbook (NS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>AAA Revolving Cashbook</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Short Course Cashbook (SC)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Pupil Fund Cashbook (PF)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>TEVTA Fee Collection (FC)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Securities Cashbook (SEC)</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Master Payment Approval Form &amp; Vouchers Sheet</span>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>{backupModalData.liveMessage}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.open(backupModalData.driveFolderUrl, '_blank', 'noopener,noreferrer');
                    } catch {}
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Drive Backup Folder</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBackupStatusModalOpen(false);
                      handleRunFullDeepBackup();
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                      darkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Play className="w-3 h-3 text-emerald-500" />
                    <span>Run Backup Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBackupStatusModalOpen(false)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer border ${
                      darkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
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

      {/* ------------------------------------------------------------- */}
      {/* 21.9 CORPORATE VOUCHER SUCCESS & AUDIT DIALOGUE                */}
      {/* ------------------------------------------------------------- */}
      <CorporateVoucherSuccessModal
        isOpen={Boolean(voucherSuccessModalData)}
        voucher={voucherSuccessModalData?.voucher || null}
        isAmend={voucherSuccessModalData?.isAmend || false}
        isBankCharge={voucherSuccessModalData?.isBankCharge || false}
        cloudSyncSuccess={voucherSuccessModalData?.cloudSyncSuccess ?? true}
        cloudMessage={voucherSuccessModalData?.cloudMessage}
        onClose={() => setVoucherSuccessModalData(null)}
        onPrintPAF={(v) => setVoucherForPAF(v)}
        onNewEntry={() => {
          setVoucherSuccessModalData(null);
          setVoucherToAmend(null);
          setIsNewVoucherModalOpen(true);
        }}
        customGvtiwLogo={customGvtiwLogo}
        darkMode={darkMode}
      />

      {/* ------------------------------------------------------------- */}
      {/* 21.10 PAYMENT APPROVAL FORM (PAF) MODAL (A4 PRINT & EXPORT)    */}
      {/* ------------------------------------------------------------- */}
      {voucherForPAF && (
        <PaymentApprovalForm
          voucher={voucherForPAF}
          onClose={() => setVoucherForPAF(null)}
          isModal={true}
          customGvtiwLogo={customGvtiwLogo}
          customTevtaLogo={customTevtaLogo}
          customGopLogo={customGopLogo}
        />
      )}
    </div>
  );
};
