import React, { useState, useEffect } from 'react';
import { Calculator, X, Check, Delete, ArrowRight } from 'lucide-react';

interface MiniCalculatorPopoverProps {
  isOpen: boolean;
  fieldName: string;
  initialValue: number | string;
  onApply: (value: number) => void;
  onClose: () => void;
}

export const MiniCalculatorPopover: React.FC<MiniCalculatorPopoverProps> = ({
  isOpen,
  fieldName,
  initialValue,
  onApply,
  onClose,
}) => {
  const [expression, setExpression] = useState<string>('');
  const [result, setResult] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      const initVal = Number(initialValue);
      if (!isNaN(initVal) && initVal > 0) {
        setExpression(String(initVal));
        setResult(initVal);
      } else {
        setExpression('');
        setResult(0);
      }
    }
  }, [isOpen, initialValue]);

  // Safe evaluation of mathematical expression (+, -, *, /)
  const evaluateExpression = (expr: string): number => {
    try {
      // Clean and sanitize string (only allow numbers, decimal, and basic operators)
      const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
      if (!sanitized.trim()) return 0;
      if (!/^[0-9+\-*/. ()]+$/.test(sanitized)) return 0;

      // Safe arithmetic evaluator using Function
      // eslint-disable-next-line no-new-func
      const calcResult = Function(`'use strict'; return (${sanitized})`)();
      if (typeof calcResult === 'number' && !isNaN(calcResult) && isFinite(calcResult)) {
        return Math.round(calcResult * 100) / 100;
      }
      return 0;
    } catch {
      return result;
    }
  };

  const handleAppend = (char: string) => {
    setExpression((prev) => {
      const next = prev + char;
      setResult(evaluateExpression(next));
      return next;
    });
  };

  const handleClear = () => {
    setExpression('');
    setResult(0);
  };

  const handleBackspace = () => {
    setExpression((prev) => {
      const next = prev.slice(0, -1);
      setResult(evaluateExpression(next));
      return next;
    });
  };

  const handleTaxPreset = (percentage: number) => {
    const currentVal = evaluateExpression(expression) || Number(initialValue) || 0;
    if (currentVal > 0) {
      const taxAmt = Math.round(currentVal * (percentage / 100) * 100) / 100;
      setExpression(String(taxAmt));
      setResult(taxAmt);
    }
  };

  const handleApply = () => {
    const finalVal = evaluateExpression(expression) || result;
    onApply(finalVal);
    onClose();
  };

  // Keyboard support for mini-calc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '*', '/'].includes(e.key)) {
        e.preventDefault();
        handleAppend(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, expression, result]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
      <div className="bg-slate-900 text-white w-full max-w-xs rounded-2xl border-2 border-indigo-500 shadow-2xl p-4 space-y-3 relative animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              <Calculator className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-white block">
                Instant Amount Calculator
              </span>
              <span className="text-[9px] font-mono text-indigo-300">
                Target: {fieldName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-right font-mono">
          <div className="text-[10px] text-slate-400 min-h-[14px] truncate">
            {expression || '0'}
          </div>
          <div className="text-lg font-black text-emerald-400">
            Rs. {result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Tax Presets Strip */}
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Quick Tax &amp; GST Presets (% of Amount):
          </span>
          <div className="grid grid-cols-3 gap-1 text-[9px] font-mono font-bold">
            <button
              type="button"
              onClick={() => handleTaxPreset(18)}
              className="py-1 px-1.5 rounded-md bg-purple-900/40 hover:bg-purple-900/70 border border-purple-700/50 text-purple-200 transition-colors"
            >
              18% GST
            </button>
            <button
              type="button"
              onClick={() => handleTaxPreset(16)}
              className="py-1 px-1.5 rounded-md bg-blue-900/40 hover:bg-blue-900/70 border border-blue-700/50 text-blue-200 transition-colors"
            >
              16% PRA
            </button>
            <button
              type="button"
              onClick={() => handleTaxPreset(5)}
              className="py-1 px-1.5 rounded-md bg-blue-900/40 hover:bg-blue-900/70 border border-blue-700/50 text-blue-200 transition-colors"
            >
              5% PRA
            </button>
            <button
              type="button"
              onClick={() => handleTaxPreset(4.5)}
              className="py-1 px-1.5 rounded-md bg-amber-900/40 hover:bg-amber-900/70 border border-amber-700/50 text-amber-200 transition-colors"
            >
              4.5% IT (Supp)
            </button>
            <button
              type="button"
              onClick={() => handleTaxPreset(10)}
              className="py-1 px-1.5 rounded-md bg-amber-900/40 hover:bg-amber-900/70 border border-amber-700/50 text-amber-200 transition-colors"
            >
              10% IT (Serv)
            </button>
            <button
              type="button"
              onClick={() => handleTaxPreset(15)}
              className="py-1 px-1.5 rounded-md bg-amber-900/40 hover:bg-amber-900/70 border border-amber-700/50 text-amber-200 transition-colors"
            >
              15% IT (Rent)
            </button>
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-1.5 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-lg bg-rose-900/40 hover:bg-rose-900/70 border border-rose-700/50 text-rose-300"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleAppend('/')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300"
          >
            ÷
          </button>
          <button
            type="button"
            onClick={() => handleAppend('*')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300"
          >
            ×
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
          >
            <Delete className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleAppend('7')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleAppend('8')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleAppend('9')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleAppend('-')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300"
          >
            -
          </button>

          <button
            type="button"
            onClick={() => handleAppend('4')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleAppend('5')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleAppend('6')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleAppend('+')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => handleAppend('1')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleAppend('2')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleAppend('3')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => {
              const res = evaluateExpression(expression);
              setExpression(String(res));
              setResult(res);
            }}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black"
          >
            =
          </button>

          <button
            type="button"
            onClick={() => handleAppend('0')}
            className="col-span-2 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleAppend('.')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white"
          >
            .
          </button>
          <button
            type="button"
            onClick={() => {
              const res = evaluateExpression(expression);
              setExpression(String(res));
              setResult(res);
            }}
            className="p-2 rounded-lg bg-slate-700 text-slate-300"
          >
            ↵
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Result</span>
          </button>
        </div>
      </div>
    </div>
  );
};
