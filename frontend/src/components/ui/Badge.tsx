import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export const Badge: React.FC<{ children: React.ReactNode; variant?: BadgeVariant }> = ({ children, variant = 'default' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success': return { background: '#dcfce7', color: '#166534' }; // green
      case 'warning': return { background: '#fef3c7', color: '#92400e' }; // amber
      case 'error': return { background: '#fee2e2', color: '#991b1b' }; // red
      case 'info': return { background: '#e0f2fe', color: '#075985' }; // sky
      default: return { background: '#f1f5f9', color: '#475569' }; // slate
    }
  };

  return (
    <span style={{
      ...getVariantStyles(),
      padding: '4px 8px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {children}
    </span>
  );
};
