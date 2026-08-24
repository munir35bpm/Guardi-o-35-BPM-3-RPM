import React from 'react';

interface Logo35BPMProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export const Logo35BPM: React.FC<Logo35BPMProps> = ({ className = 'w-10 h-10', size, showText = false }) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Official 35º BPM PMMG Shield Crest Vector */}
      <svg
        viewBox="0 0 400 450"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md select-none"
        style={size ? { width: size, height: size } : undefined}
      >
        <defs>
          {/* Shield Outer Path */}
          <clipPath id="shield-clip">
            <path d="M200 440C120 400 20 300 20 50C130 50 200 20 200 20C200 20 270 50 380 50C380 300 280 400 200 440Z" />
          </clipPath>
          <linearGradient id="gold-border" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DFC897" />
            <stop offset="50%" stopColor="#C4A76E" />
            <stop offset="100%" stopColor="#9E7E45" />
          </linearGradient>
          <linearGradient id="river-blue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#12234B" />
            <stop offset="50%" stopColor="#1E3875" />
            <stop offset="100%" stopColor="#152756" />
          </linearGradient>
        </defs>

        {/* Outer Dark Shield Border */}
        <path
          d="M200 445C118 405 15 303 15 48C128 48 200 15 200 15C200 15 272 48 385 48C385 303 282 405 200 445Z"
          fill="#111216"
          stroke="#090A0D"
          strokeWidth="3"
        />

        {/* Inner Gold / Khaki Border Frame */}
        <path
          d="M200 435C124 397 27 298 27 56C132 56 200 26 200 26C200 26 268 56 373 56C373 298 276 397 200 435Z"
          fill="url(#gold-border)"
        />

        {/* Shield Parchment / Off-White Inner Body */}
        <path
          d="M200 420C128 384 37 288 37 66C136 66 200 37 200 37C200 37 264 66 363 66C363 288 272 384 200 420Z"
          fill="#F3EEE4"
        />

        {/* Inner Masked Graphics */}
        <g clipPath="url(#shield-clip)">
          {/* Header Typography: PMMG */}
          <text
            x="200"
            y="125"
            textAnchor="middle"
            fontFamily="Impact, 'Arial Black', -apple-system, sans-serif"
            fontWeight="900"
            fontSize="76"
            fill="#141518"
            letterSpacing="2"
          >
            PMMG
          </text>

          {/* 35º BPM Sub-Header */}
          <text
            x="200"
            y="158"
            textAnchor="middle"
            fontFamily="Impact, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="26"
            fill="#181A20"
            letterSpacing="1"
          >
            35º BPM
          </text>

          {/* Motto: O GUARDIÃO DO ALTO RIO DAS VELHAS */}
          <text
            x="200"
            y="178"
            textAnchor="middle"
            fontFamily="'Inter', 'Arial', sans-serif"
            fontWeight="700"
            fontSize="10"
            fill="#333842"
            letterSpacing="1.2"
          >
            O GUARDIÃO DO ALTO RIO DAS VELHAS
          </text>

          {/* Flying Eagle Symbol (Left) */}
          <g transform="translate(68, 190) scale(0.65)" fill="#1F232B">
            <path d="M0,22 Q20,5 45,0 Q30,15 25,25 Q45,18 60,28 Q35,32 20,40 Q15,30 0,22 Z" />
            <path d="M22,23 Q35,35 48,32 Q32,42 18,36 Z" />
          </g>

          {/* Central Historic Monument & Church */}
          <g transform="translate(142, 172)">
            {/* Church Facade (Center) */}
            {/* Steps */}
            <rect x="2" y="130" width="112" height="4" fill="#20232A" />
            <rect x="6" y="134" width="104" height="4" fill="#20232A" />
            <rect x="10" y="138" width="96" height="4" fill="#20232A" />
            <rect x="14" y="142" width="88" height="4" fill="#20232A" />

            {/* Base platform */}
            <rect x="10" y="70" width="96" height="60" fill="#E8DFCE" stroke="#A88B52" strokeWidth="2.5" />
            
            {/* Center Portal / Doors */}
            <path d="M46,130 L46,102 Q58,92 70,102 L70,130 Z" fill="#1C1E24" />
            
            {/* Upper Church Pediment */}
            <polygon points="30,70 58,35 86,70" fill="#E8DFCE" stroke="#A88B52" strokeWidth="2.5" />
            <circle cx="58" cy="58" r="7" fill="#A88B52" />
            <circle cx="58" cy="58" r="4" fill="#E8DFCE" />
            
            {/* Cross on roof */}
            <rect x="56" y="20" width="4" height="16" fill="#1A1C22" />
            <rect x="51" y="24" width="14" height="4" fill="#1A1C22" />

            {/* Left Tower */}
            <rect x="10" y="42" width="22" height="88" fill="#E8DFCE" stroke="#A88B52" strokeWidth="2" />
            <polygon points="8,42 21,12 34,42" fill="#B3975C" stroke="#7A6335" strokeWidth="1.5" />
            <rect x="16" y="58" width="10" height="16" rx="5" fill="#1C1E24" />
            <rect x="16" y="90" width="10" height="16" rx="5" fill="#1C1E24" />
            
            {/* Right Tower */}
            <rect x="84" y="42" width="22" height="88" fill="#E8DFCE" stroke="#A88B52" strokeWidth="2" />
            <polygon points="82,42 95,12 108,42" fill="#B3975C" stroke="#7A6335" strokeWidth="1.5" />
            <rect x="90" y="58" width="10" height="16" rx="5" fill="#1C1E24" />
            <rect x="90" y="90" width="10" height="16" rx="5" fill="#1C1E24" />
            {/* Clock */}
            <circle cx="95" cy="78" r="4" fill="#FFF" stroke="#A88B52" strokeWidth="1" />
          </g>

          {/* Right Monument (Cruzeiro / Obelisco) */}
          <g transform="translate(262, 235)">
            <rect x="4" y="80" width="38" height="8" fill="#B3975C" />
            <rect x="8" y="72" width="30" height="8" fill="#B3975C" />
            {/* Obelisk Body */}
            <polygon points="14,72 17,6 30,6 33,72" fill="#B3975C" stroke="#7A6335" strokeWidth="1" />
            <polygon points="17,6 23.5,0 30,6" fill="#B3975C" stroke="#7A6335" strokeWidth="1" />
            {/* Monument Cross engraving */}
            <line x1="23.5" y1="14" x2="23.5" y2="40" stroke="#FFF" strokeWidth="2" />
            <line x1="17.5" y1="22" x2="29.5" y2="22" stroke="#FFF" strokeWidth="2" />
          </g>

          {/* Rio das Velhas (Winding Deep Blue River at Bottom) */}
          <path
            d="M90 318 C160 318 110 332 170 332 C230 332 260 345 310 350 L360 415 C280 435 180 435 90 405 C50 375 70 340 90 318 Z"
            fill="url(#river-blue)"
          />
          <path
            d="M95 320 Q145 322 175 334 Q240 336 295 352 L260 365 Q205 348 150 345 Q115 335 95 320 Z"
            fill="#F3EEE4"
            opacity="0.95"
          />
          <path
            d="M110 355 Q170 358 200 372 Q250 376 290 395 L270 405 Q225 388 175 385 Q130 372 110 355 Z"
            fill="#F3EEE4"
            opacity="0.95"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-wider text-amber-200 uppercase font-display">
              35º BPM
            </span>
            <span className="text-[10px] bg-[#C4A76E]/20 text-[#DFC897] px-1.5 py-0.2 rounded border border-[#C4A76E]/40 font-mono font-bold">
              PMMG
            </span>
          </div>
          <span className="text-[9px] text-[#A69372] font-mono tracking-tight leading-none uppercase">
            Guardião do Alto Rio das Velhas
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo35BPM;
