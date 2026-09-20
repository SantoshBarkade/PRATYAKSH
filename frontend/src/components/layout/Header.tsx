import React, { useState } from 'react';
import { RefreshCw, Compass } from 'lucide-react';
import { ProjectSelector } from './ProjectSelector';
import { CreateProjectModal } from './CreateProjectModal';

interface HeaderProps {
  currentView: string;
  projects: any[];
  activeProjectId: string | null;
  onProjectChange: (id: string) => void;
  onRefresh: () => void;
  onProjectCreated: (id: string) => void;
  onOpenDemoGuide?: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProjectId,
  onProjectChange,
  onRefresh,
  onProjectCreated,
  onOpenDemoGuide,
  loading,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <header
      className="flex-row items-center justify-between"
      style={{
        height: '64px',
        width: '100%',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 clamp(16px, 2.4vw, 40px)',
        flexShrink: 0,
        zIndex: 10,
        gap: 'var(--space-16)',
      }}
    >
      {/* Left: Project Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ProjectSelector
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectChange={onProjectChange}
          onCreateNew={() => setIsModalOpen(true)}
        />
      </div>

      {/* Right: Actions (Demo Guide & Refresh) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onOpenDemoGuide && (
          <button
            onClick={onOpenDemoGuide}
            className="btn btn-secondary"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--color-primary-soft)',
              borderColor: 'var(--color-primary)',
              color: 'var(--color-primary)',
            }}
            title="Open SIH Reviewer Walkthrough & Benchmark Scenarios"
          >
            <Compass size={15} />
            <span>Demo Guide &amp; Scenarios</span>
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={loading || !activeProjectId}
          aria-label="Refresh project intelligence"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            cursor: loading || !activeProjectId ? 'not-allowed' : 'pointer',
            color: loading ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            padding: '6px 12px',
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {isModalOpen && (
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(id) => {
            setIsModalOpen(false);
            onProjectCreated(id);
          }}
        />
      )}
    </header>
  );
};
