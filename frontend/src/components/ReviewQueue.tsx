import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, ChevronRight, XCircle } from 'lucide-react';
import type { ExecutionUpdate, ProjectActivity } from '../types';
import { API_BASE } from '../lib/api';

interface ReviewQueueProps {
  projectId: string;
  activities: ProjectActivity[];
  onEventResolved: () => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ projectId, activities, onEventResolved }) => {
  const [queue, setQueue] = useState<ExecutionUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedActivityMap, setSelectedActivityMap] = useState<Record<string, string>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projects/${projectId}/execution-events/review`);
      const data = await res.json();
      if (data.success) {
        setQueue(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch review queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleSelectActivity = (eventId: string, activityId: string) => {
    setSelectedActivityMap(prev => ({ ...prev, [eventId]: activityId }));
    setErrorMap(prev => {
      const copy = { ...prev };
      delete copy[eventId];
      return copy;
    });
  };

  const handleResolve = async (event: any, actionType: 'MATCH' | 'DISCARD') => {
    const eventId = event.id || event._id;

    let targetActivityId: string | undefined = undefined;
    if (actionType === 'MATCH') {
      targetActivityId = selectedActivityMap[eventId] || event.activityId;
      if (!targetActivityId) {
        setErrorMap(prev => ({ ...prev, [eventId]: 'Please select an activity to bind this execution evidence.' }));
        return;
      }
    }

    try {
      setResolvingId(eventId);
      setErrorMap(prev => {
        const copy = { ...prev };
        delete copy[eventId];
        return copy;
      });

      const res = await fetch(`${API_BASE}/projects/${projectId}/execution-events/${eventId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, activityId: targetActivityId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchQueue();
        onEventResolved();
      } else {
        setErrorMap(prev => ({ ...prev, [eventId]: data.message || data.error || 'Failed to resolve event' }));
      }
    } catch (err: any) {
      console.error('Failed to resolve event', err);
      setErrorMap(prev => ({ ...prev, [eventId]: err.message || 'Network error' }));
    } finally {
      setResolvingId(null);
    }
  };

  if (loading && queue.length === 0) {
    return (
      <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        Loading review queue...
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-48) var(--space-24)', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
        <CheckCircle size={32} color="var(--color-success)" style={{ marginBottom: 'var(--space-12)' }} />
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No review items</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 'var(--space-4)', maxWidth: '420px', lineHeight: 1.5 }}>
          New unmatched execution signals will appear here for verification and manual assignment.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ gap: 'var(--space-16)' }}>
      {queue.map(event => {
        const eventId = String(event.id || event._id || '');
        if (!eventId) return null;
        const isResolving = resolvingId === eventId;
        const currentSelectedId = selectedActivityMap[eventId] || event.activityId || '';
        const errorMessage = errorMap[eventId];

        // Find candidate activities if provided
        const candidates = event.matchCandidates || [];

        return (
          <div key={eventId} className="surface flex-col" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
            {/* Card Header */}
            <div style={{ padding: 'var(--space-12) var(--space-16)', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', letterSpacing: '0.05em' }}>
                  {event.matchingDecision || event.processingStatus || 'UNMATCHED'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {event.extractedActivity || 'Unassigned Signal'}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {event.reportDate ? new Date(event.reportDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date'}
              </span>
            </div>
            
            {/* Card Body */}
            <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-24)', alignItems: 'center' }}>
                <div className="flex-col">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Observed Progress</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {event.actualProgress !== undefined ? `${event.actualProgress}%` : '-'}
                  </span>
                </div>
                {event.sourceType && (
                  <div className="flex-col">
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Source Format</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {event.sourceType}
                    </span>
                  </div>
                )}
              </div>

              {event.rawText && (
                <div style={{ padding: 'var(--space-10) var(--space-12)', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '3px solid var(--border-medium)', lineHeight: 1.5 }}>
                  "{event.rawText}"
                </div>
              )}

              {/* Explicit Activity Matching UI */}
              <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-12)', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 'var(--space-8)' }}>
                  Target Project Activity
                </div>

                {/* Case B: Candidates available */}
                {candidates.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-12)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Suggested Candidates:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {candidates.map((c: any) => {
                        const isChosen = currentSelectedId === c.activityId;
                        return (
                          <button
                            key={c.activityId}
                            type="button"
                            onClick={() => handleSelectActivity(eventId, c.activityId)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              border: `1px solid ${isChosen ? 'var(--color-primary)' : 'var(--border-medium)'}`,
                              background: isChosen ? 'var(--color-primary-soft)' : 'var(--bg-surface)',
                              color: isChosen ? 'var(--color-primary)' : 'var(--text-primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: isChosen ? 600 : 500
                            }}
                          >
                            <span>{c.activityCode} — {c.name}</span>
                            {c.matchScore !== undefined && (
                              <span style={{ fontSize: '10px', opacity: 0.8 }}>({Math.round(c.matchScore * 100)}%)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Case C: Manual selection dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {candidates.length > 0 ? 'Or select another activity manually:' : 'Select activity to link this evidence:'}
                  </label>
                  <select
                    className="input-field"
                    style={{ height: '34px', fontSize: '12px' }}
                    value={currentSelectedId}
                    onChange={e => handleSelectActivity(eventId, e.target.value)}
                  >
                    <option value="">-- Choose activity --</option>
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {errorMessage && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> {errorMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Card Actions */}
            <div style={{ padding: 'var(--space-12) var(--space-16)', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isResolving}
                onClick={() => handleResolve(event, 'DISCARD')}
                style={{ height: '32px', fontSize: '12px', gap: '4px' }}
              >
                <XCircle size={14} /> Discard Signal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isResolving || !currentSelectedId}
                onClick={() => handleResolve(event, 'MATCH')}
                style={{ height: '32px', fontSize: '12px', gap: '4px', opacity: !currentSelectedId ? 0.6 : 1 }}
                title={!currentSelectedId ? 'Please select an activity first' : 'Confirm match and promote to trusted state'}
              >
                {isResolving ? 'Resolving...' : 'Confirm Match'} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
