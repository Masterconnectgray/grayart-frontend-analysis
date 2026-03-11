import React from 'react';
import type { Division } from './Themes';

interface LogoProps {
  size?: number;
  color?: string;
}

const ConnectGrayLogo: React.FC<LogoProps> = ({ size = 32, color = '#9370DB' }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" stroke={color} strokeWidth="4" fill="none" />
    <circle cx="40" cy="50" r="10" fill={color} />
    <circle cx="80" cy="50" r="10" fill={color} />
    <circle cx="60" cy="80" r="10" fill={color} />
    <line x1="48" y1="54" x2="72" y2="54" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <line x1="44" y1="58" x2="56" y2="74" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <line x1="76" y1="58" x2="64" y2="74" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <text x="60" y="110" textAnchor="middle" fill={color} fontSize="11" fontWeight="800" fontFamily="Outfit, sans-serif">CONNECT</text>
  </svg>
);

const GrayUpLogo: React.FC<LogoProps> = ({ size = 32, color = '#2563EB' }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="35" y="25" width="50" height="75" rx="4" stroke={color} strokeWidth="4" fill="none" />
    <rect x="45" y="35" width="30" height="10" rx="2" fill={color} opacity="0.3" />
    <rect x="45" y="50" width="30" height="10" rx="2" fill={color} opacity="0.5" />
    <rect x="45" y="65" width="30" height="10" rx="2" fill={color} opacity="0.7" />
    <rect x="45" y="80" width="30" height="10" rx="2" fill={color} />
    <polygon points="60,15 70,25 50,25" fill={color} />
    <text x="60" y="112" textAnchor="middle" fill={color} fontSize="11" fontWeight="800" fontFamily="Outfit, sans-serif">GRAY UP</text>
  </svg>
);

const GrayUpFlowLogo: React.FC<LogoProps> = ({ size = 32, color = '#10B981' }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 20 60 Q 40 30 60 60 Q 80 90 100 60" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M 20 45 Q 40 15 60 45 Q 80 75 100 45" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4" />
    <path d="M 20 75 Q 40 45 60 75 Q 80 105 100 75" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4" />
    <circle cx="60" cy="60" r="6" fill={color} />
    <circle cx="30" cy="52" r="4" fill={color} opacity="0.6" />
    <circle cx="90" cy="52" r="4" fill={color} opacity="0.6" />
    <text x="60" y="110" textAnchor="middle" fill={color} fontSize="10" fontWeight="800" fontFamily="Outfit, sans-serif">FLOW</text>
  </svg>
);

const GrayArtLogo: React.FC<LogoProps> = ({ size = 32, color = '#9370DB' }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 30 85 L 55 25 L 65 25 L 90 85" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="38" y1="65" x2="82" y2="65" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <circle cx="90" cy="35" r="12" fill="none" stroke={color} strokeWidth="3" />
    <circle cx="90" cy="35" r="4" fill={color} />
    <line x1="85" y1="35" x2="80" y2="45" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <text x="60" y="108" textAnchor="middle" fill={color} fontSize="11" fontWeight="800" fontFamily="Outfit, sans-serif">GRAY ART</text>
  </svg>
);

const GrupoGrayLogo: React.FC<LogoProps & { variant?: 'full' | 'icon' }> = ({ size = 40, variant = 'icon' }) => (
  <svg width={variant === 'full' ? size * 3 : size} height={size} viewBox={variant === 'full' ? '0 0 200 50' : '0 0 50 50'} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="46" height="46" rx="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <text x="25" y="33" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="900" fontFamily="Outfit, sans-serif">G</text>
    {variant === 'full' && (
      <text x="65" y="33" fill="currentColor" fontSize="18" fontWeight="800" fontFamily="Outfit, sans-serif">
        GRUPO GRAY
      </text>
    )}
  </svg>
);

const DIVISION_LOGOS: Record<Division, React.FC<LogoProps>> = {
  'connect-gray': ConnectGrayLogo,
  'gray-up': GrayUpLogo,
  'gray-up-flow': GrayUpFlowLogo,
  'gray-art': GrayArtLogo,
};

export { DIVISION_LOGOS, GrupoGrayLogo, ConnectGrayLogo, GrayUpLogo, GrayUpFlowLogo, GrayArtLogo };
