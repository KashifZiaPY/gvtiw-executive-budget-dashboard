import React, { useState, useEffect } from 'react';
import { InstituteEmblem, TevtaEmblem } from './Emblems';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../defaultLogos';

export interface AnimatedSplashLogosProps {
  gvtiwLogo?: string | null;
  tevtaLogo?: string | null;
  darkMode?: boolean;
  statusMessage?: string;
  instituteName?: string;
  isFullPage?: boolean;
  className?: string;
}

export const AnimatedSplashLogos: React.FC<AnimatedSplashLogosProps> = ({
  gvtiwLogo,
  tevtaLogo,
  darkMode = true,
  statusMessage,
  instituteName = 'Govt. Vocational Training Institute (W), Samanabad, Faisalabad',
  isFullPage = true,
  className = '',
}) => {
  const [gvtiwFailed, setGvtiwFailed] = useState(false);
  const [tevtaFailed, setTevtaFailed] = useState(false);

  // Status message sequence for smooth feedback during initial load and data sync
  const [statusIndex, setStatusIndex] = useState(0);
  const defaultStatusList = [
    statusMessage || 'Connecting to Google Sheets...',
    'Synchronizing Live CashBooks & Vouchers...',
    'Verifying Institutional Head Allocations...',
    'Initializing Executive Financial Ledger...',
  ];

  useEffect(() => {
    if (statusMessage) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % defaultStatusList.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [statusMessage, defaultStatusList.length]);

  const currentStatusText = statusMessage || defaultStatusList[statusIndex];

  const gvLogoSrc = gvtiwLogo || DEFAULT_GVTIW_LOGO;
  const tvLogoSrc = tevtaLogo || DEFAULT_TEVTA_LOGO;

  const coreContent = (
    <div className={`relative flex flex-col items-center justify-center text-center font-sans ${className}`}>
      {/* ------------------------------------------------------------- */}
      {/* 1. DUAL LOGO DISPLAY WITH HALOS AND CONNECTING SYNC ANIMATION */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex items-center justify-center my-4 select-none">
        
        {/* Ambient background soft glow */}
        <div className="absolute w-72 sm:w-96 h-36 bg-blue-600/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* LEFT: GVTIW Circular Logo with Amber/Orange Halo */}
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 flex items-center justify-center">
            {/* Soft Breathing Ambient Glow */}
            <div className="absolute inset-0 rounded-full bg-amber-500/20 dark:bg-amber-500/25 blur-xl splash-halo-pulse pointer-events-none" />

            {/* Slow Rotating Amber Halo Ring */}
            <svg
              className="absolute -inset-2 sm:-inset-2.5 w-[calc(100%+16px)] sm:w-[calc(100%+20px)] h-[calc(100%+16px)] sm:h-[calc(100%+20px)] splash-rotate-cw pointer-events-none"
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient id="gvtiwHaloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#ea580c" stopOpacity="0.75" />
                  <stop offset="75%" stopColor="#fbbf24" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="url(#gvtiwHaloGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="175 95"
              />
            </svg>

            {/* Subtle Circular Frame */}
            <div
              className={`relative w-full h-full rounded-full p-2 sm:p-2.5 flex items-center justify-center overflow-hidden transition-all ${
                darkMode
                  ? 'bg-white border border-amber-500/30 shadow-[0_4px_24px_rgba(245,158,11,0.25)]'
                  : 'bg-white border border-amber-400/40 shadow-[0_4px_20px_rgba(217,119,6,0.15)]'
              }`}
            >
              {!gvtiwFailed ? (
                <img
                  src={gvLogoSrc}
                  alt="GVTIW Logo"
                  className="w-full h-full object-contain rounded-full"
                  onError={() => setGvtiwFailed(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <InstituteEmblem className="w-full h-full" />
              )}
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider mt-2.5 text-amber-600 dark:text-amber-400">
            GVTIW (33028)
          </span>
        </div>

        {/* CENTER: Subtle Connecting Sync Pipeline between the two logos */}
        <div className="relative flex items-center justify-center w-16 sm:w-24 md:w-32 mx-2 sm:mx-3">
          {/* Base Track Line */}
          <div
            className={`w-full h-[2px] rounded-full overflow-hidden relative ${
              darkMode ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          >
            {/* Animated Energy Highlight moving between the logos */}
            <div className="absolute top-0 bottom-0 w-8 sm:w-12 rounded-full splash-sync-beam" />
          </div>

          {/* Central Institutional Sync Nexus Node */}
          <div
            className={`absolute z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-md transition-all ${
              darkMode
                ? 'bg-[#0B132B] border border-slate-700 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                : 'bg-white border border-slate-300 text-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            }`}
            title="Institutional Data Sync"
          >
            {/* Orbiting / pulsing dual micro dots */}
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-0.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* RIGHT: TEVTA Circular Logo with Corporate Blue Halo */}
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 flex items-center justify-center">
            {/* Soft Breathing Ambient Glow */}
            <div className="absolute inset-0 rounded-full bg-blue-600/20 dark:bg-blue-500/25 blur-xl splash-halo-pulse pointer-events-none" />

            {/* Slow Rotating Blue Halo Ring */}
            <svg
              className="absolute -inset-2 sm:-inset-2.5 w-[calc(100%+16px)] sm:w-[calc(100%+20px)] h-[calc(100%+16px)] sm:h-[calc(100%+20px)] splash-rotate-ccw pointer-events-none"
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient id="tevtaHaloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#0284c7" stopOpacity="0.75" />
                  <stop offset="75%" stopColor="#38bdf8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="url(#tevtaHaloGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="175 95"
              />
            </svg>

            {/* Subtle Circular Frame */}
            <div
              className={`relative w-full h-full rounded-full p-2 sm:p-2.5 flex items-center justify-center overflow-hidden transition-all ${
                darkMode
                  ? 'bg-white border border-blue-500/30 shadow-[0_4px_24px_rgba(37,99,235,0.25)]'
                  : 'bg-white border border-blue-400/40 shadow-[0_4px_20px_rgba(37,99,235,0.15)]'
              }`}
            >
              {!tevtaFailed ? (
                <img
                  src={tvLogoSrc}
                  alt="TEVTA Punjab Logo"
                  className="w-full h-full object-contain rounded-full"
                  onError={() => setTevtaFailed(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <TevtaEmblem className="w-full h-full" />
              )}
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider mt-2.5 text-blue-600 dark:text-blue-400">
            TEVTA PUNJAB
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. INSTITUTE NAME & EXECUTIVE DASHBOARD TITLES (FADE-IN)      */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-5 max-w-xl px-4 flex flex-col items-center splash-fade-in">
        <h1
          className={`text-base sm:text-lg md:text-xl font-extrabold uppercase tracking-wide transition-colors ${
            darkMode ? 'text-white drop-shadow-sm' : 'text-slate-900'
          }`}
        >
          {instituteName}
        </h1>

        <p
          className={`text-[11px] sm:text-xs font-medium tracking-wide mt-1 transition-colors ${
            darkMode ? 'text-blue-300/80' : 'text-blue-800'
          }`}
        >
          Technical Education & Vocational Training Authority (TEVTA), Govt. of Punjab
        </p>

        <div className="mt-3 inline-block">
          <h2
            className={`text-xs sm:text-sm font-black tracking-widest uppercase px-3 py-1 rounded-lg transition-colors ${
              darkMode
                ? 'bg-blue-950/60 text-blue-200 border border-blue-800/40'
                : 'bg-blue-50 text-blue-900 border border-blue-200/80'
            }`}
          >
            EXECUTIVE BUDGET POSITION & FINANCIAL MANAGEMENT DASHBOARD
          </h2>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. RESTYLED PROFESSIONAL LOADING STATUS CONTAINER             */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div
            className={`px-4 py-2 rounded-full flex items-center gap-2.5 shadow-md border transition-all ${
              darkMode
                ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-black/40'
                : 'bg-white border-slate-300/90 text-slate-700 shadow-slate-200/60'
            }`}
          >
            {/* Pulsing Status Dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            {/* Active Status Text */}
            <span className="text-xs font-mono font-medium tracking-wide whitespace-nowrap">
              {currentStatusText}
            </span>
          </div>

          {/* Hairline Shimmer Progress Line */}
          <div
            className={`w-48 sm:w-56 h-1 rounded-full overflow-hidden relative ${
              darkMode ? 'bg-slate-800/90' : 'bg-slate-200'
            }`}
          >
            <div className="absolute inset-y-0 w-24 rounded-full splash-shimmer-bar" />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. TASTEFUL PROFESSIONAL CREDIT LINE TAGLINE                   */}
        {/* ------------------------------------------------------------- */}
        <p
          className={`text-[11px] sm:text-xs font-mono tracking-wide mt-8 select-none transition-colors ${
            darkMode ? 'text-slate-400/80' : 'text-slate-500'
          }`}
        >
          e-CashBook & Voucher System by MKZ for Institute 33028
        </p>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. EMBEDDED HIGH-PERFORMANCE CSS KEYFRAMES                     */}
      {/* ------------------------------------------------------------- */}
      <style>{`
        /* Smooth Slow Clockwise Halo Rotation (6.8s) */
        @keyframes splashRotateCW {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Smooth Slow Counter-Clockwise Halo Rotation (6.8s) */
        @keyframes splashRotateCCW {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(-360deg);
          }
        }

        /* Calm Breathing Halo Glow (3.2s) */
        @keyframes splashHaloPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.75;
          }
        }

        /* Back-and-forth reciprocating sync beam between GVTIW and TEVTA (2.6s) */
        @keyframes splashSyncBeam {
          0% {
            left: 0%;
            transform: translateX(0%);
            background: linear-gradient(90deg, #f59e0b, #38bdf8);
            opacity: 0.5;
          }
          50% {
            left: 100%;
            transform: translateX(-100%);
            background: linear-gradient(90deg, #38bdf8, #2563eb);
            opacity: 1;
          }
          100% {
            left: 0%;
            transform: translateX(0%);
            background: linear-gradient(90deg, #f59e0b, #38bdf8);
            opacity: 0.5;
          }
        }

        /* Gentle Shimmer Bar Progress (1.8s) */
        @keyframes splashShimmer {
          0% {
            left: -40%;
            background: linear-gradient(90deg, transparent, #38bdf8, transparent);
          }
          100% {
            left: 120%;
            background: linear-gradient(90deg, transparent, #38bdf8, transparent);
          }
        }

        /* Entrance Fade-In */
        @keyframes splashFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .splash-rotate-cw {
          animation: splashRotateCW 6.8s linear infinite;
          will-change: transform;
        }

        .splash-rotate-ccw {
          animation: splashRotateCCW 6.8s linear infinite;
          will-change: transform;
        }

        .splash-halo-pulse {
          animation: splashHaloPulse 3.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .splash-sync-beam {
          animation: splashSyncBeam 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          will-change: left, transform;
        }

        .splash-shimmer-bar {
          animation: splashShimmer 1.8s ease-in-out infinite;
          will-change: left;
        }

        .splash-fade-in {
          animation: splashFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );

  if (!isFullPage) {
    return coreContent;
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-200 select-none ${
        darkMode
          ? 'bg-[#020617] text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Subtle radial ambient background light */}
      <div
        className={`absolute inset-0 pointer-events-none -z-10 ${
          darkMode
            ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/20 via-[#020617] to-[#020617]'
            : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50 to-slate-100'
        }`}
      />
      {coreContent}
    </div>
  );
};

