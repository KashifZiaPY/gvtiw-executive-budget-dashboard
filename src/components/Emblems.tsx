import React, { useState } from 'react';

export const InstituteEmblem: React.FC<{ className?: string; src?: string }> = ({
  className = 'w-10 h-10',
  src,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const logoSource = src || '/gvtiw-logo.png';

  if (!imgFailed && logoSource) {
    return (
      <img
        src={logoSource}
        alt="GVTIW Emblem"
        className={`${className} object-contain`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circular gold ring */}
      <circle cx="50" cy="50" r="46" fill="#0F2537" stroke="#D4AF37" strokeWidth="4" />
      <circle cx="50" cy="50" r="41" fill="#1E3A8A" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="3 2" />

      {/* Inner institutional shield */}
      <path
        d="M50 18 L72 28 V52 C72 66 50 78 50 78 C50 78 28 66 28 52 V28 Z"
        fill="#1E293B"
        stroke="#F59E0B"
        strokeWidth="2.5"
      />

      {/* Book / Knowledge rays */}
      <path d="M38 46 Q50 40 62 46 V60 Q50 54 38 60 Z" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1.2" />
      <line x1="50" y1="42" x2="50" y2="58" stroke="#FFFFFF" strokeWidth="1.5" />

      {/* Vocational gear / cog wheel */}
      <circle cx="50" cy="34" r="6" fill="#D97706" stroke="#FDE68A" strokeWidth="1.2" />
      <circle cx="50" cy="34" r="2.5" fill="#1E293B" />

      {/* Wheat stalks / Laurel leaves */}
      <path d="M34 65 Q42 70 50 72 Q58 70 66 65" stroke="#FBBF24" strokeWidth="2" fill="none" />

      {/* Stars */}
      <circle cx="50" cy="14" r="2.5" fill="#FBBF24" />
      <circle cx="20" cy="50" r="2" fill="#FBBF24" />
      <circle cx="80" cy="50" r="2" fill="#FBBF24" />
    </svg>
  );
};

export const TevtaEmblem: React.FC<{ className?: string; src?: string }> = ({
  className = 'w-10 h-10',
  src,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const logoSource = src || '/tevta-logo.png';

  if (!imgFailed && logoSource) {
    return (
      <img
        src={logoSource}
        alt="TEVTA Punjab Emblem"
        className={`${className} object-contain`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield container */}
      <rect x="6" y="6" width="88" height="88" rx="14" fill="#064E3B" stroke="#10B981" strokeWidth="3" />
      <rect x="10" y="10" width="80" height="80" rx="10" fill="#022C22" stroke="#34D399" strokeWidth="1" />

      {/* Crescent & Star */}
      <circle cx="44" cy="38" r="14" fill="#10B981" />
      <circle cx="48" cy="36" r="12" fill="#022C22" />
      <polygon points="54,28 56,33 61,33 57,36 59,41 54,38 50,41 51,36 48,33 53,33" fill="#FBBF24" />

      {/* TEVTA letters */}
      <text x="50" y="66" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.5">
        TEVTA
      </text>

      {/* Government of the Punjab banner */}
      <rect x="16" y="74" width="68" height="12" rx="3" fill="#047857" />
      <text x="50" y="83" textAnchor="middle" fill="#E6FFFA" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
        PUNJAB GOVT.
      </text>
    </svg>
  );
};
