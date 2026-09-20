import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Inbox, Calendar, AlertTriangle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from '../ui/Logo';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('infralink_sidebar_collapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('infralink_sidebar_collapsed', String(newState));
  };

  const navItems = [
    { section: 'OVERVIEW', items: [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard }
    ]},
    { section: 'EXECUTION', items: [
      { id: 'data-intake', label: 'Data Intake', icon: Inbox }
    ]},
    { section: 'INTELLIGENCE', items: [
      { id: 'schedule', label: 'Schedule & Activities', icon: Calendar },
      { id: 'risks-forecast', label: 'Risks & Forecast', icon: AlertTriangle }
    ]}
  ];

  return (
    <aside 
      className="flex-col"
      style={{ 
        width: isCollapsed ? '72px' : '260px',
        transition: 'width 0.3s cubic-bezier(0.2, 0, 0, 1)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        height: '100%',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      <div
        style={{
          padding: isCollapsed ? 'var(--space-20) var(--space-12)' : 'var(--space-20)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        <a
          href="/"
          aria-label="Go to INFRA LINK home"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            width: isCollapsed ? 'auto' : '100%',
            cursor: 'pointer',
          }}
        >
          <Logo collapsed={isCollapsed} showTagline={false} size={isCollapsed ? 'sm' : 'md'} />
        </a>
      </div>

      <div className="flex-col" style={{ padding: 'var(--space-16) 0', flex: 1, overflowY: 'auto' }}>
        {navItems.map((group, i) => (
          <div key={i} style={{ marginBottom: 'var(--space-24)' }}>
            {!isCollapsed && (
              <div style={{ 
                padding: '0 var(--space-24)', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-8)'
              }}>
                {group.section}
              </div>
            )}
            
            <div className="flex-col" style={{ gap: 'var(--space-4)', padding: '0 var(--space-12)' }}>
              {group.items.map(item => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-12)',
                      padding: 'var(--space-12)',
                      background: isActive ? 'rgba(37,99,235,0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      color: isActive ? 'var(--text-inverse)' : 'var(--text-inverse-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      justifyContent: isCollapsed ? 'center' : 'flex-start'
                    }}
                    title={isCollapsed ? item.label : undefined}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.color = 'var(--text-inverse)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-inverse-muted)';
                      }
                    }}
                  >
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '15%',
                        height: '70%',
                        width: '3px',
                        background: 'var(--color-primary)',
                        borderRadius: '0 4px 4px 0'
                      }} />
                    )}
                    <item.icon size={20} style={{ color: isActive ? 'var(--color-primary)' : 'inherit', flexShrink: 0 }} />
                    {!isCollapsed && (
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 'var(--space-16) var(--space-12)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={toggleCollapse}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 'var(--space-12)',
            padding: 'var(--space-12)',
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-inverse-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.color = 'var(--text-inverse)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-inverse-muted)';
          }}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          {!isCollapsed && <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, whiteSpace: 'nowrap' }}>Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
