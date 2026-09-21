import React, { useEffect } from 'react';
import {
  X,
  Compass,
  ArrowRight,
  GitFork,
  Scale,
  TrendingUp,
  Calendar,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNavigateToView: (view: string, initialTab?: 'capture' | 'review' | 'reconciliation') => void;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onNavigateToView,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Find IDs of known seeded benchmark projects
  const pWater = projects.find((p) => p.name?.toLowerCase().includes('water pipeline'));
  const pDrainage = projects.find((p) => p.name?.toLowerCase().includes('drainage'));
  const pFlyover = projects.find((p) => p.name?.toLowerCase().includes('flyover'));
  const pRingRoad = projects.find((p) => p.name?.toLowerCase().includes('ring road'));

  const handleScenarioSelect = (projectId?: string, view?: string, tab?: 'capture' | 'review' | 'reconciliation') => {
    if (projectId) {
      onSelectProject(projectId);
    }
    if (view) {
      onNavigateToView(view, tab);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid var(--border-medium)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={20} />
            </div>
            <div>
              <h2 id="guide-title" style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Explore INFRA LINK
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
                Explore the four benchmark scenarios built into the prototype.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Close Guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Executive Overview */}
          <div
            style={{
              padding: '16px',
              background: 'var(--bg-surface-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              What is INFRA LINK?
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              INFRA LINK bridges baseline schedule planning (M1) with messy, real-world execution evidence (M2/M6).
              Rather than trusting verbal progress claims, it extracts physical progress signals, matches them to activities (M3),
              reconciles multi-source contractor vs supervisor conflicts (M7), propagates delay risks through the dependency network (M4),
              and projects completion dates via audited historical velocity (M8).
            </p>
          </div>

          {/* Section 1: Capability Map & Navigation */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
              1. Platform Capability Map &mdash; Where to Inspect
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '10px',
              }}
            >
              <div
                onClick={() => handleScenarioSelect(activeProjectId || undefined, 'dashboard')}
                className="surface"
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-light)',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Layers size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Command Center</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Project Situation Room, schedule variance, and causal dependency trace.
                </div>
              </div>

              <div
                onClick={() => handleScenarioSelect(activeProjectId || undefined, 'data-intake', 'capture')}
                className="surface"
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-light)',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FileSpreadsheet size={14} color="#047857" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Data Intake &amp; Ingestion</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Upload contractor PDF, TXT, or XLSX reports, or submit structured observations.
                </div>
              </div>

              <div
                onClick={() => handleScenarioSelect(activeProjectId || undefined, 'data-intake', 'review')}
                className="surface"
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-light)',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <CheckCircle2 size={14} color="#B45309" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Review Queue</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Verify ambiguous evidence signals with explicit engineer match confirmation.
                </div>
              </div>

              <div
                onClick={() => handleScenarioSelect(activeProjectId || undefined, 'data-intake', 'reconciliation')}
                className="surface"
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-light)',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Scale size={14} color="#B91C1C" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Reconciliation Engine</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Resolve multi-source evidence disputes (e.g. 90% contractor vs 40% supervisor).
                </div>
              </div>

              <div
                onClick={() => handleScenarioSelect(activeProjectId || undefined, 'schedule')}
                className="surface"
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-light)',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Calendar size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Schedule &amp; WBS</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Inspect planned vs actual progress, variance strips, and activity drawer.
                </div>
              </div>

              <div
                onClick={() => handleScenarioSelect(activeProjectId || undefined, 'risks-forecast')}
                className="surface"
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-light)',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <TrendingUp size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Risks &amp; Forecast</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Propagated dependency risk paths and mathematical velocity projection.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Real Project Test Scenarios */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Built-In Benchmark Scenarios
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Scenario 1: Water Pipeline (Dependency Propagation) */}
              <div
                style={{
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '16px',
                  background: activeProjectId === pWater?._id ? 'var(--color-primary-soft)' : '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <GitFork size={16} color="#B45309" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      01 DEPENDENCY IMPACT
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>M4 Network</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Municipal Water Pipeline Upgrade &mdash; Zone 4</strong><br />
                    <code>W002 Trenching</code> is DELAYED (40% actual vs 100% planned, -60 pp variance), exposing downstream successor <code>W003 Pipe Laying</code> (AT RISK).
                  </div>
                </div>

                <button
                  onClick={() => handleScenarioSelect(pWater?._id, 'dashboard')}
                  disabled={!pWater}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                >
                  Try Scenario <ArrowRight size={14} />
                </button>
              </div>

              {/* Scenario 2: Smart Drainage (Evidence Reconciliation) */}
              <div
                style={{
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '16px',
                  background: activeProjectId === pDrainage?._id ? 'var(--color-primary-soft)' : '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Scale size={16} color="#047857" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      02 EVIDENCE RECONCILIATION
                    </span>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>M6 / M7</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Smart Drainage &amp; Stormwater Upgrade &mdash; Sector 7</strong><br />
                    <code>D001 Survey</code> 40% vs 90% resolved reconciliation history, plus 1 active unmatched signal (<code>Unknown Digging Work</code>, 20%) in Review Queue.
                  </div>
                </div>

                <button
                  onClick={() => handleScenarioSelect(pDrainage?._id, 'data-intake', 'review')}
                  disabled={!pDrainage}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                >
                  Try Scenario <ArrowRight size={14} />
                </button>
              </div>

              {/* Scenario 3: Urban Flyover (Deterministic Forecast) */}
              <div
                style={{
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '16px',
                  background: activeProjectId === pFlyover?._id ? 'var(--color-primary-soft)' : '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <TrendingUp size={16} color="var(--color-primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      03 DETERMINISTIC FORECAST
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '10px' }}>M8 Velocity</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Urban Flyover Construction &mdash; Phase 1</strong><br />
                    <code>F001 Piers Construction</code>: 4 verified evidence points (10% &rarr; 40% &rarr; 75% &rarr; 95%). Observed velocity 0.92%/day deterministically forecasts completion by 20 June 2026.
                  </div>
                </div>

                <button
                  onClick={() => handleScenarioSelect(pFlyover?._id, 'risks-forecast')}
                  disabled={!pFlyover}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                >
                  Try Scenario <ArrowRight size={14} />
                </button>
              </div>

              {/* Scenario 4: Pune Ring Road (Schedule & Variance) */}
              <div
                style={{
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '16px',
                  background: activeProjectId === pRingRoad?._id ? 'var(--color-primary-soft)' : '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Calendar size={16} color="var(--text-secondary)" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      04 SCHEDULE &amp; VARIANCE
                    </span>
                    <span className="badge" style={{ fontSize: '10px', background: 'var(--bg-canvas)' }}>M1 / M5</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Pune Ring Road Expansion &mdash; Package 02</strong><br />
                    Baseline WBS tracking: <code>P002 Earthworks</code> is delayed (70% actual vs 100% planned, -30 pp progress variance), exposing successor <code>P003 Paving</code> to dependency risk.
                  </div>
                </div>

                <button
                  onClick={() => handleScenarioSelect(pRingRoad?._id, 'dashboard')}
                  disabled={!pRingRoad}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                >
                  Try Scenario <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--bg-surface-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            All scenario data is drawn live from verified backend MongoDB datasets without mock generators.
          </span>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 16px' }}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
