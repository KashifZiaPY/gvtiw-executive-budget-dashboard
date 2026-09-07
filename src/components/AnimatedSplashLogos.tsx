import React, { useState } from 'react';
import { InstituteEmblem, TevtaEmblem } from './Emblems';
import { DEFAULT_GVTIW_LOGO, DEFAULT_TEVTA_LOGO } from '../defaultLogos';

interface AnimatedSplashLogosProps {
  gvtiwLogo?: string | null;
  tevtaLogo?: string | null;
}

export const AnimatedSplashLogos: React.FC<AnimatedSplashLogosProps> = ({
  gvtiwLogo,
  tevtaLogo,
}) => {
  const [gvtiwFailed, setGvtiwFailed] = useState(false);
  const [tevtaFailed, setTevtaFailed] = useState(false);

  const gvLogoSrc = gvtiwLogo || DEFAULT_GVTIW_LOGO;
  const tvLogoSrc = tevtaLogo || DEFAULT_TEVTA_LOGO;

  return (
    <div className="relative flex flex-col items-center justify-center my-2">
      {/* Background ambient glow */}
      <div className="absolute w-56 h-28 bg-blue-600/15 dark:bg-blue-500/20 rounded-full blur-2xl pointer-events-none -z-10 animate-pulse" />

      {/* Side-by-side 3D Flipping Medallions */}
      <div className="flex items-center justify-center gap-6 sm:gap-8">
        {/* Left Medallion: Front = GVTIW, Back = TEVTA */}
        <div className="splash-flip-perspective w-20 h-20 sm:w-24 sm:h-24">
          <div className="splash-flip-card splash-flip-card-left w-full h-full relative">
            {/* Front Face: GVTIW */}
            <div className="splash-flip-face splash-flip-front absolute inset-0 rounded-2xl sm:rounded-3xl bg-white border border-slate-700/60 p-2 sm:p-2.5 shadow-xl shadow-black/50 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-blue-50/20 pointer-events-none" />
              {!gvtiwFailed ? (
                <img
                  src={gvLogoSrc}
                  alt="GVTIW Logo"
                  className="w-full h-full object-contain filter drop-shadow-sm select-none"
                  onError={() => setGvtiwFailed(true)}
                />
              ) : (
                <InstituteEmblem className="w-full h-full" />
              )}
            </div>

            {/* Back Face: TEVTA */}
            <div className="splash-flip-face splash-flip-back absolute inset-0 rounded-2xl sm:rounded-3xl bg-white border border-slate-700/60 p-2 sm:p-2.5 shadow-xl shadow-black/50 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-emerald-50/20 pointer-events-none" />
              {!tevtaFailed ? (
                <img
                  src={tvLogoSrc}
                  alt="TEVTA Punjab Logo"
                  className="w-full h-full object-contain filter drop-shadow-sm select-none"
                  onError={() => setTevtaFailed(true)}
                />
              ) : (
                <TevtaEmblem className="w-full h-full" />
              )}
            </div>
          </div>
        </div>

        {/* Right Medallion: Front = TEVTA, Back = GVTIW */}
        <div className="splash-flip-perspective w-20 h-20 sm:w-24 sm:h-24">
          <div className="splash-flip-card splash-flip-card-right w-full h-full relative">
            {/* Front Face: TEVTA */}
            <div className="splash-flip-face splash-flip-front absolute inset-0 rounded-2xl sm:rounded-3xl bg-white border border-slate-700/60 p-2 sm:p-2.5 shadow-xl shadow-black/50 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-emerald-50/20 pointer-events-none" />
              {!tevtaFailed ? (
                <img
                  src={tvLogoSrc}
                  alt="TEVTA Punjab Logo"
                  className="w-full h-full object-contain filter drop-shadow-sm select-none"
                  onError={() => setTevtaFailed(true)}
                />
              ) : (
                <TevtaEmblem className="w-full h-full" />
              )}
            </div>

            {/* Back Face: GVTIW */}
            <div className="splash-flip-face splash-flip-back absolute inset-0 rounded-2xl sm:rounded-3xl bg-white border border-slate-700/60 p-2 sm:p-2.5 shadow-xl shadow-black/50 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-blue-50/20 pointer-events-none" />
              {!gvtiwFailed ? (
                <img
                  src={gvLogoSrc}
                  alt="GVTIW Logo"
                  className="w-full h-full object-contain filter drop-shadow-sm select-none"
                  onError={() => setGvtiwFailed(true)}
                />
              ) : (
                <InstituteEmblem className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for 3D flip transform with alternating continuous loop */}
      <style>{`
        .splash-flip-perspective {
          perspective: 1000px;
          -webkit-perspective: 1000px;
        }

        .splash-flip-card {
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          will-change: transform;
        }

        .splash-flip-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .splash-flip-front {
          transform: rotateY(0deg);
          -webkit-transform: rotateY(0deg);
        }

        .splash-flip-back {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
        }

        /* Left Medallion: Flips first in the cycle */
        .splash-flip-card-left {
          animation: splashCardFlip 3.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }

        /* Right Medallion: Alternates with a slight stagger for a fluid wave effect */
        .splash-flip-card-right {
          animation: splashCardFlip 3.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          animation-delay: 0.28s;
        }

        @keyframes splashCardFlip {
          0%, 30% {
            transform: rotateY(0deg) scale(1);
          }
          45% {
            transform: rotateY(90deg) scale(1.06);
          }
          55%, 80% {
            transform: rotateY(180deg) scale(1);
          }
          95% {
            transform: rotateY(270deg) scale(1.06);
          }
          100% {
            transform: rotateY(360deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
