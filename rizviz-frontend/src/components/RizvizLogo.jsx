import React from 'react';

const RizvizLogo = ({ className = '', height = 48, withBackground = false, light = false }) => {
  // Rich corporate colors matching the uploaded logo
  const textColor = light ? '#FFFFFF' : '#003B73';
  const subtextColor = light ? '#E5E7EB' : '#003B73';
  const rBackground = '#003B73'; // Dark blue background for R
  const rCircuitColor = '#00A3E0'; // Light blue for traces

  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        display: 'inline-flex',
        padding: withBackground ? '12px 28px' : '0px',
        background: withBackground ? '#ffffff' : 'transparent',
        borderRadius: withBackground ? '12px' : '0px',
        boxShadow: withBackground ? '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      <svg 
        viewBox="0 0 350 85" 
        height={height} 
        style={{ width: 'auto', display: 'block' }}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* === STYLIZED "R" WITH CIRCUITS AND CLOUD === */}
        <g id="R-Logo">
          {/* Main Solid R Body */}
          <path 
            d="M 10 10 L 56 10 C 72 10 82 20 82 34 C 82 45 72 53 58 53 L 44 53 L 74 80 L 56 80 L 29 53 L 29 80 L 10 80 Z" 
            fill={rBackground} 
          />

          {/* Circuit Trace Lines inside the R stem */}
          <path 
            d="M 18 15 L 18 75" 
            stroke={rCircuitColor} 
            strokeWidth="1.2" 
            opacity="0.8" 
          />
          <path 
            d="M 23 15 L 23 50 M 23 58 L 23 75" 
            stroke={rCircuitColor} 
            strokeWidth="1.2" 
            opacity="0.8" 
          />
          {/* Circuit nodes (dots) */}
          <circle cx="18" cy="25" r="2.5" fill={rCircuitColor} />
          <circle cx="18" cy="65" r="2.5" fill={rCircuitColor} />
          <circle cx="23" cy="45" r="2" fill={rCircuitColor} />
          <circle cx="23" cy="70" r="2" fill={rCircuitColor} />
          
          {/* Circuit branch paths */}
          <path 
            d="M 23 25 L 32 34" 
            stroke={rCircuitColor} 
            strokeWidth="1.2" 
            opacity="0.7"
          />
          <circle cx="32" cy="34" r="1.5" fill={rCircuitColor} />
          <path 
            d="M 18 65 L 26 73" 
            stroke={rCircuitColor} 
            strokeWidth="1.2" 
            opacity="0.7"
          />

          {/* White Cloud Symbol embedded in the loop of R */}
          <path 
            d="M 33 40 C 33 34.5 37.5 30 43 30 C 45 30 47.5 31 49 32.5 C 51.5 29 55.5 27 60 27 C 67 27 72 32 72 39 C 73 39 74.5 39 75 40 C 78.5 42 81 45.5 81 50 C 81 55.5 76.5 60 71 60 L 59 60 L 59 74 C 59 75 58 76 57 76 L 53 76 C 52 76 51 75 51 74 L 51 60 L 39 60 C 35.5 60 33 57.5 33 54 Z" 
            fill="#FFFFFF" 
          />
        </g>

        {/* === "IZVIZ" Text === */}
        <text 
          x="90" 
          y="53" 
          fill={textColor} 
          style={{ 
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: '56px', 
            fontWeight: '900', 
            letterSpacing: '1px',
          }}
        >
          IZVIZ
        </text>

        {/* === "INTERNATIONAL IMPEX" Subtext === */}
        <text 
          x="92" 
          y="74" 
          fill={subtextColor} 
          style={{ 
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '15.5px', 
            fontWeight: '800', 
            letterSpacing: '2.5px',
            textTransform: 'uppercase'
          }}
        >
          INTERNATIONAL IMPEX
        </text>
      </svg>
    </div>
  );
};

export default RizvizLogo;
