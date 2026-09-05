import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Landmark,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface PinLockScreenProps {
  darkMode: boolean;
  customGvtiwLogo?: string | null;
  storedPin: string;
  onUnlock: () => void;
  title?: string;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  darkMode,
  customGvtiwLogo,
  storedPin,
  onUnlock,
  title = 'Admin & Operations Authentication',
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = pinInput.trim();
    if (cleanInput && cleanInput === storedPin) {
      setPinError(null);
      onUnlock();
    } else {
      setPinError('Invalid Security PIN. Access denied.');
    }
  };

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
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Govt. Vocational Training Institute (W) Samanabad, Faisalabad
            <br />
            Punjab TEVTA
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
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
            <span>Unlock Access</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted Session • Strict LIFO Safety Enforced</span>
        </div>
      </div>
    </div>
  );
};
