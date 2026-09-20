import React, { useState, useMemo } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import type { ProjectActivity, ProjectDependency, ProjectRisk } from '../types';

interface ActivitiesWorkspaceProps {
  activities: ProjectActivity[];
  dependencies?: ProjectDependency[];
  risks?: ProjectRisk[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
}

export const ActivitiesWorkspace: React.FC<ActivitiesWorkspaceProps> = ({ 
  activities = [], 
  dependencies = [],
  risks = [],
  selectedActivityId, 
  onSelectActivity 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'AT_RISK' | 'NO_RISK'>('ALL');

  // Map dependencies for fast lookup: activityId -> { preds: string[], succs: string[] }
  const depMap = useMemo(() => {
    const map: Record<string, { preds: string[]; succs: string[] }> = {};
    for (const act of activities) {
      map[act.id] = { preds: [], succs: [] };
    }
    for (const dep of dependencies) {
      if (map[dep.target]) {
        const srcAct = activities.find(a => a.id === dep.source || a.code === dep.source);
        map[dep.target].preds.push(srcAct ? srcAct.code : dep.source);
      }
      if (map[dep.source]) {
        const tgtAct = activities.find(a => a.id === dep.target || a.code === dep.target);
        map[dep.source].succs.push(tgtAct ? tgtAct.code : dep.target);
      }
    }
    return map;
  }, [activities, dependencies]);

  // Set of activity IDs that are currently at risk from risks array or status
  const atRiskIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of risks) {
      if (r.targetActivityId) set.add(r.targetActivityId);
    }
    for (const a of activities) {
      if (a.dependencyRisk === 'AT_RISK' || a.status === ('AT_RISK' as any)) {
        set.add(a.id);
      }
    }
    return set;
  }, [risks, activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchSearch = 
        act.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        act.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'ALL' || (act.status === statusFilter);
      
      const isAtRisk = atRiskIds.has(act.id);
      const matchRisk = 
        riskFilter === 'ALL' || 
        (riskFilter === 'AT_RISK' && isAtRisk) || 
        (riskFilter === 'NO_RISK' && !isAtRisk);
      
      return matchSearch && matchStatus && matchRisk;
    });
  }, [activities, searchQuery, statusFilter, riskFilter, atRiskIds]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return <span className="status-badge status-badge-on-track">ON TRACK</span>;
      case 'DELAYED':
        return <span className="status-badge status-badge-delayed">DELAYED</span>;
      case 'COMPLETED':
        return <span className="status-badge status-badge-completed">COMPLETED</span>;
      case 'NOT_STARTED':
        return <span className="status-badge status-badge-not-started">NOT STARTED</span>;
      default:
        return <span className="status-badge status-badge-not-started">{status.replace('_', ' ')}</span>;
    }
  };

  const renderProgressBar = (progress: number, color: string = 'var(--text-secondary)') => {
    const p = Math.max(0, Math.min(100, progress || 0));
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, width: '32px', fontFamily: "'JetBrains Mono', monospace" }}>{p}%</div>
        <div style={{ flex: 1, height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${p}%`, height: '100%', background: color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-col gap-16" style={{ width: '100%' }}>
      {/* Search & Refined Filter Controls */}
      <div 
        className="surface"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        {/* Row 1: Primary Search Discovery Control */}
        <div style={{ position: 'relative', maxWidth: '380px', width: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search activity code or name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '34px', height: '34px', fontSize: '13px', width: '100%' }}
            aria-label="Search activities by code or name"
          />
        </div>

        {/* Row 2: Distinct Filter Dimensions */}
        <div 
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'flex-start', 
            gap: '28px', 
            rowGap: '16px' 
          }}
        >
          {/* Dimension 1: Execution Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span 
              id="status-filter-label"
              style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: 'var(--text-secondary)', 
                letterSpacing: '0.06em', 
                textTransform: 'uppercase' 
              }}
            >
              Status
            </span>
            <div 
              className="filter-segmented-control" 
              role="group" 
              aria-labelledby="status-filter-label"
            >
              {[
                { value: 'ALL', label: 'All' },
                { value: 'ON_TRACK', label: 'On Track' },
                { value: 'DELAYED', label: 'Delayed' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'NOT_STARTED', label: 'Not Started' }
              ].map(opt => {
                const isActive = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`filter-chip ${isActive ? 'active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dimension 2: Dependency Risk */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span 
              id="risk-filter-label"
              style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: 'var(--text-secondary)', 
                letterSpacing: '0.06em', 
                textTransform: 'uppercase' 
              }}
            >
              Dependency Risk
            </span>
            <div 
              className="filter-segmented-control" 
              role="group" 
              aria-labelledby="risk-filter-label"
            >
              {[
                { value: 'ALL' as const, label: 'All' },
                { value: 'AT_RISK' as const, label: 'At Risk' },
                { value: 'NO_RISK' as const, label: 'Insulated' }
              ].map(opt => {
                const isActive = riskFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setRiskFilter(opt.value)}
                    className={`filter-chip ${isActive ? 'active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Canonical 7-Column WBS Table */}
      <div className="surface" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="table-scroll-container">
          <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '90px' }}>CODE</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '200px' }}>ACTIVITY</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>PLANNED</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>ACTUAL</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>VARIANCE</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>STATUS</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px' }}>DEPENDENCY</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No work packages found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredActivities.map(act => {
                  const variance = (act.actualProgress || 0) - (act.plannedProgress || 0);
                  const isSelected = selectedActivityId === act.id;
                  const isAtRisk = atRiskIds.has(act.id);
                  const deps = depMap[act.id] || { preds: [], succs: [] };

                  return (
                    <tr 
                      key={act.id} 
                      onClick={() => onSelectActivity(act.id)}
                      style={{ 
                        borderBottom: '1px solid var(--border-light)',
                        background: isSelected ? 'var(--color-primary-soft)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* 1. CODE */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {act.code}
                      </td>

                      {/* 2. ACTIVITY */}
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{act.name}</span>
                          {isAtRisk && (
                            <span title="Exposed to downstream dependency risk" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-warning-text)' }}>
                              <AlertTriangle size={13} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. PLANNED */}
                      <td style={{ padding: '12px 14px' }}>
                        {renderProgressBar(act.plannedProgress || 0, 'var(--text-muted)')}
                      </td>

                      {/* 4. ACTUAL */}
                      <td style={{ padding: '12px 14px' }}>
                        {renderProgressBar(act.actualProgress || 0, variance < 0 ? 'var(--color-danger)' : 'var(--color-success)')}
                      </td>

                      {/* 5. VARIANCE (pp) */}
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: variance < 0 ? 'var(--color-danger)' : variance > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                        {variance !== 0 ? `${variance > 0 ? '+' : ''}${variance} pp` : '0 pp'}
                      </td>

                      {/* 6. STATUS */}
                      <td style={{ padding: '12px 14px' }}>
                        {getStatusBadge(act.status || 'NOT_STARTED')}
                      </td>

                      {/* 7. DEPENDENCY */}
                      <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {deps.preds.length === 0 && deps.succs.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>Independent</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {deps.preds.length > 0 && (
                              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                &larr; {deps.preds.join(', ')}
                              </span>
                            )}
                            {deps.succs.length > 0 && (
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
                                &rarr; {deps.succs.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
