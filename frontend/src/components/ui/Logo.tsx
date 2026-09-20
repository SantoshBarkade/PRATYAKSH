import React from 'react';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  collapsed = false,
  className = '',
  theme = 'dark',
  showTagline = false,
  size = 'md',
}) => {
  const isLight = theme === 'light';

  // Mark dimensions based on size
  const markSize = size === 'sm' ? 28 : size === 'lg' ? 40 : 34;

  return (
    <div
      className={`flex-row items-center ${className}`}
      style={{
        textDecoration: 'none',
        gap: collapsed ? '0px' : '12px',
        maxWidth: '100%',
        overflow: 'visible',
      }}
    >
      {/* Canonical InfraLink Symbol Mark */}
      <div
        style={{
          width: `${markSize}px`,
          height: `${markSize}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        title="InfraLink"
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={isLight ? 'pLeftL' : 'pLeftD'} x1="0%" y1="0%" x2="100%" y2="100%">
              {isLight ? (
                <>
                  <stop offset="0%" stopColor="#0F2137" />
                  <stop offset="100%" stopColor="#1E3A5F" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#CBD5E1" />
                </>
              )}
            </linearGradient>

            <linearGradient id={isLight ? 'pMidL' : 'pMidD'} x1="0%" y1="0%" x2="100%" y2="100%">
              {isLight ? (
                <>
                  <stop offset="0%" stopColor="#081526" />
                  <stop offset="100%" stopColor="#142B47" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </>
              )}
            </linearGradient>

            <linearGradient id={isLight ? 'pRightL' : 'pRightD'} x1="0%" y1="0%" x2="100%" y2="100%">
              {isLight ? (
                <>
                  <stop offset="0%" stopColor="#0F243E" />
                  <stop offset="100%" stopColor="#1C3554" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#E2E8F0" />
                  <stop offset="100%" stopColor="#94A3B8" />
                </>
              )}
            </linearGradient>

            <linearGradient id="swooshRibbon" x1="0%" y1="30%" x2="100%" y2="70%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="45%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>

          {/* Left Pillar (slopes up) */}
          <path
            d="M 18 42 L 34 26 L 34 76 L 18 76 Z"
            fill={`url(#${isLight ? 'pLeftL' : 'pLeftD'})`}
          />
          <path
            d="M 28 32 L 34 26 L 34 76 L 28 76 Z"
            fill={isLight ? '#0A1526' : '#94A3B8'}
            opacity={isLight ? 0.35 : 0.45}
          />

          {/* Center Pillar (Tallest) */}
          <path
            d="M 40 8 L 56 16 L 56 76 L 40 76 Z"
            fill={`url(#${isLight ? 'pMidL' : 'pMidD'})`}
          />
          <path
            d="M 48 12 L 56 16 L 56 76 L 48 76 Z"
            fill={isLight ? '#040D1A' : '#CBD5E1'}
            opacity={isLight ? 0.4 : 0.55}
          />

          {/* Right Pillar (slopes down) */}
          <path
            d="M 62 26 L 78 40 L 78 76 L 62 76 Z"
            fill={`url(#${isLight ? 'pRightL' : 'pRightD'})`}
          />
          <path
            d="M 62 26 L 70 33 L 70 76 L 62 76 Z"
            fill={isLight ? '#071424' : '#64748B'}
            opacity={isLight ? 0.3 : 0.4}
          />

          {/* Under-shadow */}
          <path
            d="M 14 65 C 28 48, 48 46, 68 54 C 78 58, 86 66, 92 78 L 84 80 C 78 68, 70 60, 58 56 C 42 50, 26 56, 16 68 Z"
            fill="#047857"
            opacity={0.85}
          />

          {/* Green Dynamic Highway Ribbon */}
          <path
            d="M 14 62 C 26 44, 48 40, 68 49 C 80 54, 88 64, 94 76 C 88 77, 80 75, 74 68 C 62 54, 46 47, 30 52 C 22 55, 17 60, 14 62 Z"
            fill="url(#swooshRibbon)"
          />
        </svg>
      </div>

      {/* Canonical InfraLink Wordmark & Tagline */}
      {!collapsed && (
        <div className="flex-col" style={{ gap: '1px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1.1 }}>
            <span
              style={{
                color: isLight ? '#0F172A' : '#FFFFFF',
                fontWeight: 700,
                fontSize: size === 'sm' ? '15px' : size === 'lg' ? '20px' : '17px',
                letterSpacing: '-0.02em',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              Infra
            </span>
            <span
              style={{
                color: isLight ? '#0F172A' : '#FFFFFF',
                fontWeight: 600,
                fontSize: size === 'sm' ? '15px' : size === 'lg' ? '20px' : '17px',
                letterSpacing: '-0.02em',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                position: 'relative',
              }}
            >
              L
              {/* Custom 'i' with green triangular wing dot */}
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ visibility: 'visible' }}>ı</span>
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    left: '1px',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50% 10% 50% 50%',
                    background: '#10B981',
                    transform: 'rotate(-25deg)',
                  }}
                />
              </span>
              nk
            </span>
          </div>

          {showTagline && (
            <span
              style={{
                color: isLight ? '#64748B' : '#94A3B8',
                fontSize: size === 'sm' ? '9px' : '10px',
                fontWeight: 500,
                letterSpacing: '0.01em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              Connect Plans. Track Progress. Predict Impact.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
