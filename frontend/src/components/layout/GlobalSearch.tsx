import React from 'react';
import { Search } from 'lucide-react';

export const GlobalSearch: React.FC = () => {
  return (
    <div style={{ position: 'relative' }}>
      <Search 
        size={14} 
        color="var(--text-muted)" 
        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
      />
      <input 
        type="text" 
        placeholder="Search activities, dependencies, risks..." 
        disabled
        style={{
          padding: '8px 12px 8px 34px',
          borderRadius: '6px',
          border: '1px solid var(--border-light)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          width: '280px',
          outline: 'none',
          transition: 'all 0.2s',
          cursor: 'not-allowed'
        }}
      />
      <div style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        background: 'var(--bg-surface)',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid var(--border-light)'
      }}>
        ⌘K
      </div>
    </div>
  );
};
