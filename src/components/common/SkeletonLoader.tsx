import React from 'react';

interface SkeletonProps {
    isDark?: boolean;
    primary?: string;
}

const pulse = `
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.15; }
}
.sk-pulse { animation: skeleton-pulse 1.5s ease-in-out infinite; }
`;

const Bone: React.FC<{ w?: string; h?: string; r?: string; style?: React.CSSProperties }> = ({
    w = '100%', h = '1rem', r = '8px', style,
}) => (
    <div
        className="sk-pulse"
        style={{ width: w, height: h, borderRadius: r, background: 'currentColor', ...style }}
    />
);

// ─── Skeleton para Analytics ──────────────────────────────────────────────────
export const AnalyticsSkeleton: React.FC<SkeletonProps> = ({ isDark = true, primary = '#9370DB' }) => (
    <div style={{ color: isDark ? '#ffffff' : '#000000', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <style>{pulse}</style>
        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ padding: '1.5rem', borderRadius: '16px', background: isDark ? '#1e1e1e' : '#f5f5f5', borderBottom: `4px solid ${primary}33` }}>
                    <Bone w="60%" h="0.7rem" style={{ marginBottom: '0.8rem' }} />
                    <Bone w="50%" h="2rem" r="6px" style={{ marginBottom: '0.5rem' }} />
                    <Bone w="40%" h="0.7rem" />
                </div>
            ))}
        </div>
        {/* Chart area */}
        <div style={{ padding: '2rem', borderRadius: '20px', background: isDark ? '#1e1e1e' : '#f5f5f5' }}>
            <Bone w="35%" h="1.2rem" style={{ marginBottom: '1.5rem' }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '200px', paddingTop: '1rem' }}>
                {[60, 80, 45, 90, 70, 55, 85, 65, 75, 50, 95, 40].map((h, i) => (
                    <div key={i} className="sk-pulse" style={{ flex: 1, height: `${h}%`, borderRadius: '6px 6px 0 0', background: i % 3 === 0 ? primary : 'currentColor', opacity: i % 3 === 0 ? 0.7 : 0.3 }} />
                ))}
            </div>
        </div>
    </div>
);

// ─── Skeleton para Grid Feed ──────────────────────────────────────────────────
export const FeedSkeleton: React.FC<SkeletonProps> = ({ isDark = true }) => (
    <div style={{ color: isDark ? '#ffffff' : '#000000' }}>
        <style>{pulse}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="sk-pulse" style={{ aspectRatio: '1 / 1', borderRadius: '4px', background: 'currentColor' }} />
            ))}
        </div>
    </div>
);

// ─── Skeleton para Gerador de Conteúdo ───────────────────────────────────────
export const GeneratorSkeleton: React.FC<SkeletonProps> = ({ isDark = true, primary = '#9370DB' }) => (
    <div style={{ color: isDark ? '#ffffff' : '#000000', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <style>{pulse}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Bone h="3rem" r="16px" />
            <div style={{ padding: '1.5rem', borderRadius: '20px', background: isDark ? '#1e1e1e' : '#f5f5f5' }}>
                <Bone w="40%" style={{ marginBottom: '1rem' }} />
                <Bone style={{ marginBottom: '0.6rem' }} />
                <Bone w="80%" style={{ marginBottom: '0.6rem' }} />
                <Bone w="60%" />
            </div>
            <div style={{ height: '4px', borderRadius: '2px', background: primary, opacity: 0.3 }} />
        </div>
        <div style={{ padding: '1.5rem', borderRadius: '20px', background: isDark ? '#1e1e1e' : '#f5f5f5' }}>
            <Bone w="50%" style={{ marginBottom: '1.5rem' }} />
            <Bone style={{ marginBottom: '0.8rem' }} />
            <Bone w="90%" style={{ marginBottom: '0.8rem' }} />
            <Bone w="70%" style={{ marginBottom: '1.5rem' }} />
            <Bone h="3rem" r="12px" />
        </div>
    </div>
);

// ─── Skeleton genérico para qualquer view ────────────────────────────────────
export const ModuleSkeleton: React.FC<SkeletonProps> = ({ isDark = true, primary = '#9370DB' }) => (
    <div style={{ color: isDark ? '#ffffff' : '#000000', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <style>{pulse}</style>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Bone w="180px" h="2rem" r="10px" />
            <Bone w="80px" h="1.5rem" r="8px" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', borderRadius: '20px', background: isDark ? '#1e1e1e' : '#f5f5f5', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Bone w="40%" />
                <Bone />
                <Bone w="85%" />
                <Bone w="70%" />
                <div style={{ height: '120px', borderRadius: '12px', background: `${primary}10` }} />
                <Bone h="3rem" r="14px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ padding: '1rem', borderRadius: '16px', background: isDark ? '#1e1e1e' : '#f5f5f5' }}>
                        <Bone w="60%" style={{ marginBottom: '0.5rem' }} />
                        <Bone w="80%" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default ModuleSkeleton;
