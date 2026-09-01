import React, { useState, useEffect } from 'react';
import { InstituteEmblem, TevtaEmblem } from './Emblems';
import { Upload, Image as ImageIcon, RotateCcw, Check, Sparkles } from 'lucide-react';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../data/initialData';

interface LogoUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogosUpdated: () => void;
}

export const LogoUploaderModal: React.FC<LogoUploaderModalProps> = ({
  isOpen,
  onClose,
  onLogosUpdated,
}) => {
  const [gvtiwLogo, setGvtiwLogo] = useState<string | null>(null);
  const [tevtaLogo, setTevtaLogo] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const gv = localStorage.getItem('gvtiw_custom_logo');
      const tv = localStorage.getItem('tevta_custom_logo');
      setGvtiwLogo(gv && gv.startsWith('data:') ? gv : DEFAULT_GVTIW_LOGO);
      setTevtaLogo(tv && tv.startsWith('data:') ? tv : DEFAULT_TEVTA_LOGO);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'gvtiw' | 'tevta'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'gvtiw') {
        setGvtiwLogo(dataUrl);
      } else {
        setTevtaLogo(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (gvtiwLogo) {
      localStorage.setItem('gvtiw_custom_logo', gvtiwLogo);
    } else {
      localStorage.removeItem('gvtiw_custom_logo');
    }

    if (tevtaLogo) {
      localStorage.setItem('tevta_custom_logo', tevtaLogo);
    } else {
      localStorage.removeItem('tevta_custom_logo');
    }

    // Also persist to backend API for multi-device sync
    fetch('/api/logos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gvtiwLogo, tevtaLogo }),
    }).catch((err) => console.warn('Logo sync error:', err));

    setSavedSuccess(true);
    onLogosUpdated();
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleResetToDefault = (type: 'gvtiw' | 'tevta') => {
    if (type === 'gvtiw') {
      setGvtiwLogo(DEFAULT_GVTIW_LOGO);
    } else {
      setTevtaLogo(DEFAULT_TEVTA_LOGO);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#0F1D3B] text-slate-100 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#0a192f] via-[#0F2537] to-[#0a192f] border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Customize Institutional Logos
              </h2>
              <p className="text-[11px] text-slate-400">
                Upload your official high-resolution PNG/SVG emblems or use the built-in vectors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GVTIW Logo Box */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-center flex flex-col items-center">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                GVTIW Institute Logo (Left)
              </span>

              {/* Preview */}
              <div className="w-20 h-20 rounded-xl bg-slate-950 border-2 border-amber-500/40 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                {gvtiwLogo ? (
                  <img
                    src={gvtiwLogo}
                    alt="GVTIW Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <InstituteEmblem className="w-16 h-16" />
                )}
              </div>

              <span className="text-[10px] text-slate-400 font-mono">
                {gvtiwLogo ? 'Custom PNG/SVG Loaded' : 'Default Official Vector'}
              </span>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full pt-1">
                <label className="flex-1 cursor-pointer py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'gvtiw')}
                  />
                </label>
                {gvtiwLogo && (
                  <button
                    onClick={() => handleResetToDefault('gvtiw')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                    title="Reset to official vector"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* TEVTA Logo Box */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-center flex flex-col items-center">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                TEVTA Punjab Logo (Right)
              </span>

              {/* Preview */}
              <div className="w-20 h-20 rounded-xl bg-slate-950 border-2 border-emerald-500/40 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                {tevtaLogo ? (
                  <img
                    src={tevtaLogo}
                    alt="TEVTA Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <TevtaEmblem className="w-16 h-16" />
                )}
              </div>

              <span className="text-[10px] text-slate-400 font-mono">
                {tevtaLogo ? 'Custom PNG/SVG Loaded' : 'Default Official Vector'}
              </span>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full pt-1">
                <label className="flex-1 cursor-pointer py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'tevta')}
                  />
                </label>
                {tevtaLogo && (
                  <button
                    onClick={() => handleResetToDefault('tevta')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                    title="Reset to official vector"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-xl text-[11px] text-blue-200/90 leading-relaxed">
            💡 <strong>Tip:</strong> Uploaded images are stored locally in your browser so they will persist across reloads and will also appear in the <strong>Print / PDF Report</strong>.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-white font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Logos Saved!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Apply & Save Logos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
