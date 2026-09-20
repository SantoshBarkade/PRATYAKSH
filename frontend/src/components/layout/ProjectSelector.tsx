import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, LayoutTemplate } from 'lucide-react';

interface ProjectSelectorProps {
  projects: any[];
  activeProjectId: string | null;
  onProjectChange: (id: string) => void;
  onCreateNew: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, activeProjectId, onProjectChange, onCreateNew }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject = projects?.find(p => p._id === activeProjectId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatProjectName = (name?: string) => name ? name.replace(/PRATYAKSH/gi, 'INFRA LINK') : '';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', minWidth: '320px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          padding: 'var(--space-8) var(--space-12)',
          borderRadius: 'var(--radius-md)',
          transition: 'background 0.2s',
          background: isOpen ? 'var(--bg-surface-hover)' : 'transparent',
          position: 'relative'
        }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2px' }}>
          Project
        </div>
        <div className="flex-row items-center justify-between">
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }}>
            {activeProject ? formatProjectName(activeProject.name) : 'Select a Project'}
          </div>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          minWidth: '400px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          marginTop: 'var(--space-4)',
          zIndex: 100,
          padding: 'var(--space-8)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: 'var(--space-8) var(--space-12)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Projects
          </div>
          <div className="flex-col" style={{ gap: '2px', maxHeight: '300px', overflowY: 'auto' }}>
            {projects.map(p => (
              <button
                key={p._id}
                onClick={() => {
                  onProjectChange(p._id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-12)',
                  width: '100%',
                  padding: 'var(--space-8) var(--space-12)',
                  background: p._id === activeProjectId ? 'var(--color-primary-soft)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => { if (p._id !== activeProjectId) e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                onMouseLeave={(e) => { if (p._id !== activeProjectId) e.currentTarget.style.background = 'transparent'; }}
              >
                <LayoutTemplate size={16} style={{ color: p._id === activeProjectId ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '13px', fontWeight: p._id === activeProjectId ? 600 : 500, color: p._id === activeProjectId ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                  {formatProjectName(p.name)}
                </span>
              </button>
            ))}
          </div>

          <div style={{ height: '1px', background: 'var(--border-light)', margin: 'var(--space-8) 0' }} />
          
          <button
            onClick={() => {
              onCreateNew();
              setIsOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-8)',
              width: '100%',
              padding: 'var(--space-8) var(--space-12)',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Plus size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Create New Project</span>
          </button>
        </div>
      )}
    </div>
  );
};
