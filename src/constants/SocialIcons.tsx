/**
 * SVGs oficiais das principais redes sociais
 * Usar em componentes de plataforma, previews e cards
 */
import React from 'react';

interface IconProps { size?: number; className?: string; style?: React.CSSProperties; }

export const InstagramSVG: React.FC<IconProps> = ({ size = 24, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
        <defs>
            <radialGradient id="ig-grad-1" cx="30%" cy="107%" r="150%">
                <stop offset="0%" stopColor="#fdf497" />
                <stop offset="5%" stopColor="#fdf497" />
                <stop offset="45%" stopColor="#fd5949" />
                <stop offset="60%" stopColor="#d6249f" />
                <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig-grad-1)" />
        <circle cx="12" cy="12" r="4.5" stroke="#fff" strokeWidth="1.8" fill="none" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth="1.8" fill="none" />
    </svg>
);

export const TikTokSVG: React.FC<IconProps> = ({ size = 24, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
        <rect width="24" height="24" rx="6" fill="#000" />
        <path d="M16.6 8.8c-.8-.5-1.3-1.3-1.5-2.3h-2.2v9.2c0 1.2-1 2.2-2.2 2.2s-2.2-1-2.2-2.2 1-2.2 2.2-2.2c.2 0 .5 0 .7.1v-2.3c-.2 0-.5-.1-.7-.1-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5V11c.8.6 1.8.9 2.8.9V9.7c-.5 0-1-.1-1.4-.3-.3-.2-.7-.4-1-.6z" fill="#fff" />
        <path d="M16.6 8.8c.8.5 1.7.8 2.8.8V7.5c-.5 0-1-.1-1.4-.3-.5-.3-.9-.7-1.2-1.2h-.2v2.8z" fill="#69C9D0" />
        <path d="M10.7 13.6c-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2V6.5h2.2c0-.2 0-.3 0-.5h-2.2v9.2c0 1.2-1 2.2-2.2 2.2-.4 0-.8-.1-1.1-.3.5.5 1.1.8 1.8.8 1.2 0 2.2-1 2.2-2.2V6h-.7v7.6z" fill="#EE1D52" opacity="0.7" />
    </svg>
);

export const YouTubeSVG: React.FC<IconProps> = ({ size = 24, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path d="M20.5 8.5S20.3 7 19.6 6.3c-.7-.7-1.5-.7-1.9-.8C15.5 5.3 12 5.3 12 5.3s-3.5 0-5.7.2c-.4 0-1.2.1-1.9.8C3.7 7 3.5 8.5 3.5 8.5S3.3 10.2 3.3 12s.2 3.5.2 3.5.2 1.5.9 2.2c.7.7 1.6.7 2 .8C8 18.7 12 18.7 12 18.7s3.5 0 5.7-.2c.4-.1 1.2-.1 1.9-.8.7-.7.9-2.2.9-2.2s.2-1.7.2-3.5-.2-3.5-.2-3.5Z" fill="#FF0000" />
        <polygon points="10,9 10,15 15.5,12" fill="#fff" />
    </svg>
);

export const LinkedInSVG: React.FC<IconProps> = ({ size = 24, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
        <rect width="24" height="24" rx="4" fill="#0A66C2" />
        <rect x="4" y="9" width="3" height="11" fill="#fff" />
        <circle cx="5.5" cy="5.5" r="2" fill="#fff" />
        <path d="M9 9h3v1.5s.8-1.5 3-1.5c2.5 0 4 1.5 4 4.5V20h-3v-5.5c0-1.5-.5-2.5-1.8-2.5S12 13 12 15v5H9V9Z" fill="#fff" />
    </svg>
);

export const FacebookSVG: React.FC<IconProps> = ({ size = 24, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path d="M16 12h-2.5v8h-3v-8H9V9h1.5V7.5C10.5 5.5 11.8 4 14 4h2v3h-1.2c-.5 0-.8.2-.8.7V9H16l-.4 3Z" fill="#fff" />
    </svg>
);

export const WhatsAppSVG: React.FC<IconProps> = ({ size = 24, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
        <rect width="24" height="24" rx="6" fill="#25D366" />
        <path d="M12 4C7.58 4 4 7.58 4 12c0 1.5.41 2.9 1.12 4.12L4 20l3.88-1.12A8 8 0 1 0 12 4Z" fill="#25D366" />
        <path d="M12 4C7.58 4 4 7.58 4 12c0 1.5.41 2.9 1.12 4.12L4 20l3.88-1.12A8 8 0 1 0 12 4Z" stroke="#fff" strokeWidth="1.5" fill="none" />
        <path d="M9.5 8.5c.2 0 .4.1.5.3l.8 1.8c.1.2 0 .5-.2.7l-.5.5c.5 1 1.4 1.9 2.4 2.4l.5-.5c.2-.2.5-.3.7-.2l1.8.8c.2.1.3.3.3.5v1.7c0 .4-.3.5-.7.5-4.2-.5-7-4.2-6.5-7.8.1-.3.4-.7.9-.7Z" fill="#fff" />
    </svg>
);

export const PinterestSVG: React.FC<IconProps> = ({ size = 24, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
        <rect width="24" height="24" rx="6" fill="#E60023" />
        <path d="M12 3C7 3 3 7 3 12c0 3.8 2.4 7.1 5.8 8.5-.1-.7-.1-1.8.1-2.5.2-.7 1.4-5.9 1.4-5.9s-.4-.7-.4-1.8c0-1.6.9-2.8 2.3-2.8 1.1 0 1.6.8 1.6 1.8 0 1.1-.7 2.7-1 4.2-.3 1.2.6 2.2 1.8 2.2 2.1 0 3.6-2.7 3.6-6 0-3-2-5.1-5-5.1-3.5 0-5.6 2.7-5.6 5.4 0 1.3.5 2.7 1.2 3.4.1.1.1.3.1.4-.1.5-.4 1.6-.4 1.8-.1.2-.2.3-.4.2C5.4 15.2 4 12.6 4 12 4 7.6 7.6 4 12 4Z" fill="#fff" />
    </svg>
);

export const XTwitterSVG: React.FC<IconProps> = ({ size = 24, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
        <rect width="24" height="24" rx="6" fill="#000" />
        <path d="M13.5 10.8 18.5 5h-1.2L13 10l-3.6-5H5.5l5.3 7.7L5.5 19h1.2L11 13.5l3.7 5.5H19l-5.5-8.2ZM11.5 13l-.6-.9-4.7-6.7h2.1l3.8 5.5.6.9L17 18.1h-2L11.5 13Z" fill="#fff" />
    </svg>
);

// Map para fácil acesso por ID de plataforma
const PLATFORM_ICONS: Record<string, React.FC<IconProps>> = {
    instagram: InstagramSVG,
    tiktok: TikTokSVG,
    youtube: YouTubeSVG,
    linkedin: LinkedInSVG,
    facebook: FacebookSVG,
    whatsapp: WhatsAppSVG,
    pinterest: PinterestSVG,
    twitter: XTwitterSVG,
    x: XTwitterSVG,
};

export function PlatformIcon({ platformId, size = 24, style }: { platformId: string; size?: number; style?: React.CSSProperties }) {
    const Icon = PLATFORM_ICONS[platformId.toLowerCase()];
    if (!Icon) return <span style={{ fontSize: size * 0.7 }}>📱</span>;
    return <Icon size={size} style={style} />;
}
