import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Database, RefreshCw, CheckCheck, Clock } from 'lucide-react';
import { API_BASE } from '../lib/api';
import type { ProjectActivity } from '../types';

interface EvidenceDetail {
  _id: string;
  sourceType?: string;
  sourceFileName?: string;
  reportDate?: string;
  progress?: number;
  extractedStatus?: string;
  reason?: string;
  rawText?: string;
}

interface ConflictValue {
  evidenceId: string;
  value: any;
}

interface ConflictField {
  field: string;
  values: ConflictValue[];
}

interface ReconciliationItem {
  _id: string;
  projectId: string;
  activityId: any; // Populated object or string
  logicalDate: string;
  status: 'CONFLICT' | 'RESOLVED' | 'ALIGNED';
  evidenceIds: (string | EvidenceDetail)[];
  conflicts: ConflictField[];
  resolvedAt?: string | null;
  resolutionAction?: string | null;
  resolutionEvidenceId?: string | null;
  createdAt: string;
}

interface ReconciliationQueueProps {
  projectId: string;
  activities?: ProjectActivity[];
  onConflictResolved?: () => void;
}

export const ReconciliationQueue: React.FC<ReconciliationQueueProps> = ({
  projectId,
  activities = [],
  onConflictResolved,
}) => {
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [filter, setFilter] = useState<'CONFLICT' | 'RESOLVED' | 'ALL'>('CONFLICT');

  const fetchReconciliations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/projects/${projectId}/reconciliations`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();

      if (data.success && Array.isArray(data.reconciliations)) {
        setReconciliations(data.reconciliations);
      } else {
        setReconciliations([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch reconciliations', err);
      setError({
        title: 'Unable to load reconciliation data',
        message: 'The project reconciliation records could not be retrieved from the server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Project isolation: clear state immediately upon project change
    setReconciliations([]);
    fetchReconciliations();
  }, [projectId]);

  const handleResolve = async (
    reconciliationId: string,
    action: 'ACCEPT_EVIDENCE' | 'KEEP_CURRENT_STATE',
    resolutionEvidenceId?: string
  ) => {
    try {
      setError(null);
      setResolvingId(reconciliationId);

      // Canonical payload per H1.9
      const payload: { action: string; resolutionEvidenceId?: string } = {
        action,
      };
      if (resolutionEvidenceId) {
        payload.resolutionEvidenceId = resolutionEvidenceId;
      }

      const res = await fetch(`${API_BASE}/projects/${projectId}/reconciliations/${reconciliationId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        await fetchReconciliations();
        if (onConflictResolved) {
          onConflictResolved();
        }
      } else {
        setError({
          title: 'Conflict Resolution Failed',
          message: data.error || data.message || 'Unable to update reconciliation state.',
        });
      }
    } catch (err: any) {
      console.error('Failed to resolve conflict', err);
      setError({
        title: 'Network Communication Error',
        message: err.message || 'Failed to communicate with reconciliation service.',
      });
    } finally {
      setResolvingId(null);
    }
  };

  // Helper to find activity code and name
  const getActivityDisplay = (actId: any) => {
    if (!actId) return { code: 'UNKNOWN', name: 'Unassigned Activity' };
    if (typeof actId === 'object') {
      const code = actId.activityCode || actId.code || actId._id;
      const matched = activities.find((a) => a.code === code || a.id === actId._id);
      return {
        code,
        name: actId.name || actId.activityName || matched?.name || 'Activity',
      };
    }
    const matched = activities.find((a) => a.id === actId || a.code === actId);
    return {
      code: matched ? matched.code : actId,
      name: matched ? matched.name : 'Activity',
    };
  };

  // Helper to retrieve detailed evidence by ID
  const getEvidenceDetail = (item: ReconciliationItem, evId: string): EvidenceDetail | null => {
    const found = item.evidenceIds.find((e) => {
      if (typeof e === 'string') return e === evId;
      return e._id === evId;
    });
    if (found && typeof found === 'object') {
      return found as EvidenceDetail;
    }
    return null;
  };

  const conflictCount = reconciliations.filter((r) => r.status === 'CONFLICT').length;
  const resolvedCount = reconciliations.filter((r) => r.status === 'RESOLVED').length;

  const filteredList = reconciliations.filter((r) => {
    if (filter === 'CONFLICT') return r.status === 'CONFLICT';
    if (filter === 'RESOLVED') return r.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="surface" style={{ padding: 'var(--space-24)', borderRadius: 'var(--radius-lg)' }}>
      {/* Header & Filter Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-12)',
          marginBottom: 'var(--space-20)',
          paddingBottom: 'var(--space-16)',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              Evidence Reconciliation
            </h3>
            {conflictCount > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  background: 'var(--color-warning-bg)',
                  color: 'var(--color-warning-text)',
                  border: '1px solid var(--color-warning)',
                }}
              >
                {conflictCount} Active {conflictCount === 1 ? 'Conflict' : 'Conflicts'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Multi-source variance resolution. When multiple reports disagree on an activity, explicit user decision is required.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          {/* Sub-filter tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-canvas)',
              padding: '2px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
            }}
          >
            <button
              onClick={() => setFilter('CONFLICT')}
              style={{
                padding: '4px 12px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: filter === 'CONFLICT' ? 'var(--bg-surface)' : 'transparent',
                color: filter === 'CONFLICT' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: filter === 'CONFLICT' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              Conflicts ({conflictCount})
            </button>
            <button
              onClick={() => setFilter('RESOLVED')}
              style={{
                padding: '4px 12px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: filter === 'RESOLVED' ? 'var(--bg-surface)' : 'transparent',
                color: filter === 'RESOLVED' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: filter === 'RESOLVED' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              onClick={() => setFilter('ALL')}
              style={{
                padding: '4px 12px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: filter === 'ALL' ? 'var(--bg-surface)' : 'transparent',
                color: filter === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: filter === 'ALL' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              All Records
            </button>
          </div>

          <button
            onClick={fetchReconciliations}
            disabled={loading}
            aria-label="Refresh Reconciliation Queue"
            style={{
              padding: '6px',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: 'var(--space-12) var(--space-16)',
            marginBottom: 'var(--space-16)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{error.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>{error.message}</div>
          </div>
          <button
            onClick={fetchReconciliations}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && reconciliations.length === 0 && (
        <div
          style={{
            padding: 'var(--space-32)',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Loading reconciliation queue...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredList.length === 0 && (
        <div
          style={{
            padding: 'var(--space-32)',
            textAlign: 'center',
            background: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-medium)',
          }}
        >
          <CheckCheck size={28} color="var(--color-success)" style={{ margin: '0 auto var(--space-12)' }} />
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {filter === 'CONFLICT' ? 'No active conflicts' : 'No reconciliation records'}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto' }}>
            {filter === 'CONFLICT'
              ? 'Multi-source evidence reports for this project are currently aligned with the trusted baseline, or have been successfully reconciled.'
              : 'No reconciliation entries match the selected view.'}
          </p>
          {filter === 'CONFLICT' && resolvedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('RESOLVED')}
              className="btn btn-secondary"
              style={{ marginTop: 'var(--space-16)', fontSize: '12px', height: '32px' }}
            >
              View resolved history ({resolvedCount}) &rarr;
            </button>
          )}
        </div>
      )}

      {/* Reconciliations List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
        {filteredList.map((rec) => {
          const act = getActivityDisplay(rec.activityId);
          const isConflict = rec.status === 'CONFLICT';
          const isResolving = resolvingId === rec._id;

          // Extract conflict details
          const progressConflict = rec.conflicts?.find((c) => c.field === 'progress');
          let diffValue: number | null = null;
          if (progressConflict && progressConflict.values.length >= 2) {
            const val0 = Number(progressConflict.values[0].value);
            const val1 = Number(progressConflict.values[1].value);
            if (!isNaN(val0) && !isNaN(val1)) {
              diffValue = Math.abs(val0 - val1);
            }
          }

          return (
            <div
              key={rec._id}
              style={{
                border: `1px solid ${isConflict ? 'var(--color-warning)' : 'var(--border-light)'}`,
                borderLeft: `4px solid ${isConflict ? 'var(--color-warning)' : 'var(--color-success)'}`,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                overflow: 'hidden',
              }}
            >
              {/* Item Header */}
              <div
                style={{
                  padding: 'var(--space-12) var(--space-16)',
                  background: isConflict ? 'var(--color-warning-bg)' : 'var(--bg-surface-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-8)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                  {isConflict ? (
                    <AlertTriangle size={16} color="var(--color-warning-text)" />
                  ) : (
                    <CheckCircle size={16} color="var(--color-success-text)" />
                  )}
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {act.code} &mdash; {act.name}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-micro)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      background: isConflict ? 'var(--color-warning)' : 'var(--color-success)',
                      color: '#ffffff',
                    }}
                  >
                    {rec.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    Logical Date: <strong style={{ color: 'var(--text-primary)' }}>{rec.logicalDate}</strong>
                  </span>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 'var(--space-16)' }}>
                {/* Conflict Comparison Grid */}
                {isConflict && progressConflict && (
                  <div style={{ marginBottom: 'var(--space-16)' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--space-8)',
                      }}
                    >
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Conflicting Field: {progressConflict.field.toUpperCase()}
                      </span>
                      {diffValue !== null && (
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: 'var(--color-danger-text)',
                            background: 'var(--color-danger-bg)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-danger)',
                          }}
                        >
                          Discrepancy: {diffValue} percentage points
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 'var(--space-12)',
                      }}
                    >
                      {progressConflict.values.map((v, idx) => {
                        const detail = getEvidenceDetail(rec, v.evidenceId);
                        const label = idx === 0 ? 'Evidence Stream A' : 'Evidence Stream B';
                        const source = detail?.sourceFileName || detail?.sourceType || `Evidence #${v.evidenceId.slice(-6)}`;

                        return (
                          <div
                            key={v.evidenceId}
                            style={{
                              padding: 'var(--space-12)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-medium)',
                              background: 'var(--bg-canvas)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--space-8)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                {label}
                              </span>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                {detail?.reportDate ? new Date(detail.reportDate).toLocaleDateString() : 'Recorded Date'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-8)' }}>
                              <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {v.value}%
                              </span>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                reported progress
                              </span>
                            </div>

                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                              <strong>Source:</strong> {source}
                            </div>

                            {detail?.reason && (
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                &ldquo;{detail.reason}&rdquo;
                              </div>
                            )}

                            {/* Action to accept this specific evidence */}
                            <button
                              onClick={() => handleResolve(rec._id, 'ACCEPT_EVIDENCE', v.evidenceId)}
                              disabled={isResolving}
                              className="btn btn-primary"
                              style={{
                                marginTop: 'var(--space-4)',
                                padding: '6px 12px',
                                fontSize: 'var(--text-xs)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              <CheckCircle size={14} />
                              Accept {v.value}% ({source})
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Keep current state action */}
                {isConflict && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 'var(--space-12)',
                      borderTop: '1px solid var(--border-light)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      Do not overwrite current activity progress with either evidence stream:
                    </span>
                    <button
                      onClick={() => handleResolve(rec._id, 'KEEP_CURRENT_STATE')}
                      disabled={isResolving}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--text-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Database size={14} />
                      Keep Current Baseline State
                    </button>
                  </div>
                )}

                {/* Resolved Info */}
                {!isConflict && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <strong>Resolution Action:</strong>{' '}
                      <span className="text-mono" style={{ color: 'var(--color-success-text)', fontWeight: 600 }}>
                        {rec.resolutionAction || 'RESOLVED'}
                      </span>
                    </div>
                    {rec.resolutionEvidenceId && (
                      <div>
                        <strong>Accepted Evidence ID:</strong>{' '}
                        <span className="text-mono">{rec.resolutionEvidenceId}</span>
                      </div>
                    )}
                    {rec.resolvedAt && (
                      <div>
                        <strong>Resolved Timestamp:</strong>{' '}
                        <span>{new Date(rec.resolvedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
