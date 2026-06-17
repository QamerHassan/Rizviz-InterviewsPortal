import React, { useState } from 'react';
import { Col } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useSelector } from 'react-redux';

/**
 * Parses a hex color string into { r, g, b }.
 */
const hexToRgb = (hex) => {
  const h = hex.trim().replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
};

/**
 * Derives card theme when cardBg is explicitly provided (already a pastel).
 * Uses iconBg as the accent color for text, borders, and icon.
 */
const buildExplicitTheme = (cardBg, iconBg, isDarkMode) => {
  const accent = iconBg || '#6d28d9';
  const { r, g, b } = hexToRgb(accent.startsWith('#') ? accent : '#6d28d9');

  if (isDarkMode) {
    return {
      background: `rgba(${r}, ${g}, ${b}, 0.18)`,
      border: `rgba(${r}, ${g}, ${b}, 0.40)`,
      text: '#f1f5f9',
      textMuted: 'rgba(241, 245, 249, 0.60)',
      iconBgFinal: accent,
      iconColor: '#ffffff',
      glow: `rgba(${r}, ${g}, ${b}, 0.40)`,
      activeAccent: accent,
    };
  }

  return {
    background: cardBg,                         // use the pastel directly
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.20)`,
    text: accent,                                // vivid accent as main text
    textMuted: `rgba(${r}, ${g}, ${b}, 0.65)`,
    iconBgFinal: accent,
    iconColor: '#ffffff',
    glow: `rgba(${r}, ${g}, ${b}, 0.20)`,
    activeAccent: accent,
  };
};

/**
 * Derives card theme when only iconBg is provided (legacy usage).
 * Generates a soft tint from iconBg for the background.
 */
const buildDerivedTheme = (iconBg, isDarkMode) => {
  const color = iconBg || '#7c3aed';
  let r = 124, g = 58, b = 237;
  if (color.startsWith('#')) {
    const parsed = hexToRgb(color);
    r = parsed.r; g = parsed.g; b = parsed.b;
  }

  if (isDarkMode) {
    return {
      background: `rgba(${r}, ${g}, ${b}, 0.15)`,
      border: `rgba(${r}, ${g}, ${b}, 0.35)`,
      text: '#f1f5f9',
      textMuted: 'rgba(241, 245, 249, 0.65)',
      iconBgFinal: color,
      iconColor: '#ffffff',
      glow: `rgba(${r}, ${g}, ${b}, 0.35)`,
      activeAccent: color,
    };
  }

  return {
    background: `rgba(${r}, ${g}, ${b}, 0.09)`,
    border: `rgba(${r}, ${g}, ${b}, 0.18)`,
    text: `rgb(${Math.max(0, Math.floor(r * 0.7))}, ${Math.max(0, Math.floor(g * 0.7))}, ${Math.max(0, Math.floor(b * 0.7))})`,
    textMuted: `rgba(${Math.max(0, Math.floor(r * 0.7))}, ${Math.max(0, Math.floor(g * 0.7))}, ${Math.max(0, Math.floor(b * 0.7))}, 0.7)`,
    iconBgFinal: color,
    iconColor: '#ffffff',
    glow: `rgba(${r}, ${g}, ${b}, 0.20)`,
    activeAccent: color,
  };
};

/**
 * StatCard — professional, light, and distinct per status.
 *
 * Pass `cardBg` (pastel hex) + `iconBg` (vivid accent) for status cards.
 * Pass only `iconBg` for legacy cards — a soft tint is auto-generated.
 */
const StatCard = ({
  label,
  value,
  subLabel,
  icon,
  iconBg = '#10B981', // Default to green
  labelColor,
  colProps = { xs: 24, sm: 12, lg: 6 },
  onClick,
  active = false,
  dimmed = false,
  cardStyle = {},
  cardClassName = '',
  clickLabel = '',
  activeLabel = '',
  cardBg,
  size = 'default', // 'default' or 'small'
}) => {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const [hovered, setHovered] = useState(false);
  const clickable = typeof onClick === 'function';

  // In NidusJob style, the card is always white (or dark gray in dark mode)
  // and the icon is inside a small tinted rounded square.
  const theme = {
    background: isDarkMode ? '#1e293b' : (cardBg || '#ffffff'),
    border: isDarkMode ? '1px solid #334155' : '1px solid #f3f4f6',
    text: isDarkMode ? '#f8fafc' : '#111827',
    textMuted: isDarkMode ? '#cbd5e1' : '#334155',
    iconBgFinal: iconBg,
    glow: 'rgba(0,0,0,0.05)',
  };

  const isSmall = size === 'small';

  return (
    <Col {...colProps}>
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onKeyDown={clickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
        } : undefined}
        className={`flex flex-col rounded-[16px] ${isSmall ? 'p-4' : 'p-6'} ${clickable ? 'cursor-pointer' : ''} ${cardClassName}`}
        style={{
          position: 'relative',
          background: theme.background,
          border: theme.border,
          boxShadow: hovered 
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          opacity: dimmed ? 0.40 : 1,
          filter: dimmed ? 'grayscale(30%)' : 'none',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'all 0.2s ease-in-out',
          minHeight: isSmall ? '65px' : '160px',
          ...cardStyle,
        }}
      >
        <div className={`flex justify-between items-center ${isSmall ? 'mb-1.5' : 'mb-4'}`}>
          <div
            className={`flex items-center justify-center ${
              isSmall ? 'w-8 h-8 text-sm rounded-lg' : 'w-12 h-12 text-xl rounded-2xl'
            }`}
            style={{
              backgroundColor: theme.iconBgFinal,
              color: '#ffffff',
            }}
          >
            {icon}
          </div>
          {!isSmall && (
            <div style={{ color: theme.iconBgFinal }}>
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
              </svg>
            </div>
          )}
        </div>

        <div className="flex flex-col mt-auto text-left">
          <span
            className={`font-black tracking-tight ${isSmall ? 'text-2xl mb-0' : 'text-3xl mb-1'}`}
            style={{ color: theme.text }}
          >
            {value}
          </span>
          <span
            className={`uppercase tracking-wider font-extrabold block ${isSmall ? 'text-[10px]' : 'text-sm'}`}
            style={{ color: theme.textMuted }}
          >
            {label}
          </span>
          {subLabel && (
            <div className="text-xs mt-2 font-semibold" style={{ color: theme.iconBgFinal }}>
              {subLabel}
            </div>
          )}
        </div>
      </div>
    </Col>
  );
}

export default StatCard;
