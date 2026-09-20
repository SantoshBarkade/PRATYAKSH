import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  GitFork,
  Scale,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  HelpCircle,
  ArrowUpRight,
  Compass,
  Zap,
} from 'lucide-react';
import type { DashboardPayload } from '../types';
import { API_BASE } from '../lib/api';

interface CommandCenterProps {
  projectId: string;
  data: DashboardPayload;
  loading: boolean;
  onRefresh: () => void;
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
  onNavigateToView?: (view: string, initialTab?: 'capture' | 'review' | 'reconciliation') => void;
  onOpenDemoGuide?: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  projectId,
  data,
  selectedActivityId,
  onSelectActivity,
  onNavigateToView,
  onOpenDemoGuide,
}) => {
  // Live queue data for "What Needs Attention" & Evidence Health
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [conflictItems, setConflictItems] = useState<any[]>([]);

  // Tooltip active states
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Fetch queue items to enrich the Situation Room
  useEffect(() => {
    let isMounted = true;
    const fetchQueues = async () => {
      try {
        const [revRes, recRes] = await Promise.all([
          fetch(`${API_BASE}/projects/${projectId}/execution-events/review`),
          fetch(`${API_BASE}/projects/${projectId}/reconciliations`),
        ]);

        if (isMounted && revRes.ok) {
          const revData = await revRes.json();
          if (revData.success && Array.isArray(revData.data)) {
            setReviewItems(revData.data);
          }
        }

        if (isMounted && recRes.ok) {
          const recData = await recRes.json();
          if (recData.success && Array.isArray(recData.reconciliations)) {
            const conflicts = recData.reconciliations.filter((r: any) => r.status === 'CONFLICT');
            setConflictItems(conflicts);
          }
        }
      } catch {
        // Soft fail
      }
    };

    setReviewItems([]);
    setConflictItems([]);
    fetchQueues();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Overall schedule position calculations
  const schedulePosition = useMemo(() => {
    if (!data.activities || data.activities.length === 0) return { planned: 0, actual: 0, variance: 0 };

    let totalPlanned = 0;
    let totalActual = 0;

    data.activities.forEach((a) => {
      totalPlanned += a.plannedProgress || 0;
      totalActual += a.actualProgress || 0;
    });

    const count = data.activities.length;
    const avgPlanned = Math.round(totalPlanned / count);
    const avgActual = Math.round(totalActual / count);

    return {
      planned: avgPlanned,
      actual: avgActual,
      variance: avgActual - avgPlanned,
    };
  }, [data.activities]);

  const delayedActivities = data.activities.filter((a) => a.status === 'DELAYED');
  const atRiskActivities = data.activities.filter((a) => a.dependencyRisk === 'AT_RISK');
  const completedCount = data.activities.filter((a) => a.status === 'COMPLETED').length;
  const inProgressCount = data.activities.filter((a) => a.status === 'ON_TRACK' || a.status === 'DELAYED').length;
  const notStartedCount = data.activities.filter((a) => a.status === 'NOT_STARTED').length;

  // Latest evidence recency from recentExecutionUpdates
  const latestUpdate = data.recentExecutionUpdates && data.recentExecutionUpdates.length > 0
    ? data.recentExecutionUpdates[0]
    : null;

  // Format date helper
  const formatDate = (d: string | Date | undefined | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Determine Evidence Health status
  const evidenceHealth = useMemo(() => {
    if (conflictItems.length > 0) {
      return {
        label: `${conflictItems.length} Evidence Conflict${conflictItems.length === 1 ? '' : 's'}`,
        status: 'CONFLICT',
        color: 'var(--color-danger)',
        bg: 'var(--color-danger-bg)',
        icon: <Scale size={14} color="var(--color-danger)" />,
        desc: 'Multiple reporting sources disagree on progress values. Human resolution required.',
      };
    }
    if (reviewItems.length > 0) {
      return {
        label: `${reviewItems.length} Unmatched Signal${reviewItems.length === 1 ? '' : 's'}`,
        status: 'REVIEW_REQUIRED',
        color: 'var(--color-warning)',
        bg: 'var(--color-warning-bg)',
        icon: <AlertCircle size={14} color="var(--color-warning)" />,
        desc: 'Evidence received from site requires activity mapping confirmation.',
      };
    }
    if (data.recentExecutionUpdates && data.recentExecutionUpdates.length > 0) {
      return {
        label: 'Trusted Baseline',
        status: 'TRUSTED',
        color: 'var(--color-success)',
        bg: 'var(--color-success-bg)',
        icon: <CheckCircle size={14} color="var(--color-success)" />,
        desc: 'All available field evidence has been reconciled and applied to activities.',
      };
    }
    return {
      label: 'Awaiting Evidence',
      status: 'INSUFFICIENT',
      color: 'var(--text-muted)',
      bg: 'var(--bg-canvas)',
      icon: <Clock size={14} color="var(--text-muted)" />,
      desc: 'No field reports uploaded yet for this project package.',
    };
  }, [conflictItems, reviewItems, data.recentExecutionUpdates]);

  // Dynamic Situation Narrative Generation
  const situationNarrative = useMemo(() => {
    if (delayedActivities.length > 0) {
      const root = delayedActivities[0];
      const impacted = atRiskActivities.length > 0 ? atRiskActivities[0] : null;

      if (impacted) {
        return {
          title: `${root.name} (${root.code}) is ${Math.abs(root.variance)} pp behind plan, exposing downstream ${impacted.name} (${impacted.code}).`,
          details: `${root.code} is currently ${root.actualProgress}% complete against ${root.plannedProgress}% planned milestone (${root.variance} pp progress variance). Through the Finish-to-Start dependency, this upstream slippage propagates risk to ${impacted.code}.`,
          severity: 'DELAYED',
          rootCode: root.code,
          impactedCode: impacted.code,
        };
      }
      return {
        title: `${root.name} (${root.code}) is slipping behind the planned schedule baseline.`,
        details: `${root.code} has recorded ${root.actualProgress}% progress against ${root.plannedProgress}% planned (${root.variance} pp progress variance). Predecessor link monitoring active.`,
        severity: 'WARNING',
        rootCode: root.code,
        impactedCode: null,
      };
    }

    if (conflictItems.length > 0) {
      return {
        title: `Multi-source evidence discrepancy detected on active work package.`,
        details: `Disparate reports (contractor vs supervisor) submit conflicting progress metrics. INFRA LINK holds the activity in protective reconciliation to prevent unverified mutations.`,
        severity: 'ATTENTION',
        rootCode: null,
        impactedCode: null,
      };
    }

    if (reviewItems.length > 0) {
      return {
        title: `Incoming execution signals pending activity match confirmation.`,
        details: `Unstructured site evidence has been extracted but requires engineer confirmation in the Review Queue before mutating schedule state.`,
        severity: 'ATTENTION',
        rootCode: null,
        impactedCode: null,
      };
    }

    if (data.activities.length > 0 && schedulePosition.actual > 0) {
      return {
        title: `Project execution is tracking verified field milestones.`,
        details: `All ${data.activities.length} work packages are aligned with incoming audited evidence. No active downstream dependency risks detected across the project network.`,
        severity: 'HEALTHY',
        rootCode: null,
        impactedCode: null,
      };
    }

    return {
      title: `Schedule baseline imported. Awaiting physical field evidence.`,
      details: `The approved project WBS baseline is active. Upload contractor daily diaries, drone surveys, or structured field updates to begin execution intelligence and velocity tracking.`,
      severity: 'NEUTRAL',
      rootCode: null,
      impactedCode: null,
    };
  }, [delayedActivities, atRiskActivities, conflictItems, reviewItems, data.activities, schedulePosition]);

  // Causal Dependency Path extraction
  const causalChain = useMemo(() => {
    if (delayedActivities.length > 0) {
      const root = delayedActivities[0];
      // Find downstream dependency in data.dependencies
      const dep = data.dependencies.find((d) => d.source === root.id);
      const target = dep ? data.activities.find((a) => a.id === dep.target) : null;

      return {
        hasChain: true,
        root,
        relationship: dep ? dep.relationship : 'Finish-to-Start',
        target: target || (atRiskActivities.length > 0 ? atRiskActivities[0] : null),
        reason: target
          ? `${target.code} cannot proceed past scheduled milestones until ${root.code} reaches required execution threshold.`
          : 'Downstream activities are monitoring this upstream work package.',
      };
    }

    // Fallback: If no delayed, pick first activity with dependency
    if (data.dependencies.length > 0) {
      const dep = data.dependencies[0];
      const source = data.activities.find((a) => a.id === dep.source);
      const target = data.activities.find((a) => a.id === dep.target);
      if (source && target) {
        return {
          hasChain: true,
          root: source,
          relationship: dep.relationship,
          target: target,
          reason: 'Normal planned execution sequence. Predecessor is currently on track.',
        };
      }
    }

    return { hasChain: false, root: null, relationship: '', target: null, reason: '' };
  }, [delayedActivities, atRiskActivities, data.dependencies, data.activities]);

  const toggleTooltip = (key: string) => {
    setActiveTooltip(activeTooltip === key ? null : key);
  };

  return (
    <div className={`page-container flex-col command-center-container ${selectedActivityId ? 'command-center-drawer-active' : ''}`} style={{ gap: 'var(--space-24)' }}>
      {/* ============================================================
          LEVEL 1: WHERE AM I? (SITUATION ROOM HEADER)
          ============================================================ */}
      <div className="flex-col" style={{ gap: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-12)' }}>
          <div>
            <div className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge" style={{ background: '#0F172A', color: '#fff', fontSize: '10px', padding: '2px 8px' }}>
                INFRA LINK
              </span>
              <span>Project Situation Room</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0 0' }}>
              {data.project?.name || 'Project Command Center'}
            </h1>
          </div>

          {/* Quick Demo Guide Callout for Reviewers */}
          {onOpenDemoGuide && (
            <button
              onClick={onOpenDemoGuide}
              className="btn btn-secondary"
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <Compass size={14} /> Reviewer Walkthrough Guide
            </button>
          )}
        </div>

        {/* Status Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-20)',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: 'var(--space-12)',
            fontSize: '12px',
            flexWrap: 'wrap',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            BASELINE: <strong style={{ color: 'var(--text-primary)' }}>Active ({data.summary.totalActivities} WBS Items)</strong>
          </div>
          <span>&bull;</span>
          <div>
            PHYSICAL PROGRESS: <strong style={{ color: 'var(--text-primary)' }}>{schedulePosition.actual}% Verified</strong>
          </div>
          <span>&bull;</span>
          <div>
            PROGRESS VARIANCE:{' '}
            <strong style={{ color: schedulePosition.variance < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {schedulePosition.variance === 0 ? 'On Plan' : `${schedulePosition.variance} pp vs plan`}
            </strong>
          </div>
          <span>&bull;</span>
          <div>
            EVIDENCE RECENCY:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {latestUpdate ? `${formatDate(latestUpdate.reportDate)} (${latestUpdate.sourceType})` : 'Awaiting Data'}
            </strong>
          </div>
          <span>&bull;</span>
          <div>
            EXPOSED SUCCESSORS:{' '}
            <strong style={{ color: atRiskActivities.length > 0 ? 'var(--color-warning-text)' : 'var(--text-primary)' }}>
              {atRiskActivities.length} At Risk
            </strong>
          </div>
        </div>
      </div>

      {/* ============================================================
          LEVEL 2: WHAT IS HAPPENING? (PROJECT SITUATION BRIEFING)
          ============================================================ */}
      <div
        className="surface"
        style={{
          padding: 'var(--space-20)',
          borderRadius: 'var(--radius-lg)',
          borderLeft: `4px solid ${
            situationNarrative.severity === 'DELAYED'
              ? 'var(--color-danger)'
              : situationNarrative.severity === 'WARNING'
              ? 'var(--color-warning)'
              : situationNarrative.severity === 'ATTENTION'
              ? 'var(--color-primary)'
              : 'var(--color-success)'
          }`,
          background:
            situationNarrative.severity === 'DELAYED'
              ? 'var(--color-danger-bg)'
              : situationNarrative.severity === 'WARNING'
              ? 'var(--color-warning-bg)'
              : 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {situationNarrative.severity === 'DELAYED' ? (
              <AlertTriangle size={18} color="var(--color-danger-text)" />
            ) : situationNarrative.severity === 'WARNING' ? (
              <AlertCircle size={18} color="var(--color-warning-text)" />
            ) : situationNarrative.severity === 'ATTENTION' ? (
              <Scale size={18} color="var(--color-primary)" />
            ) : (
              <CheckCircle2 size={18} color="var(--color-success-text)" />
            )}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color:
                  situationNarrative.severity === 'DELAYED'
                    ? 'var(--color-danger-text)'
                    : situationNarrative.severity === 'WARNING'
                    ? 'var(--color-warning-text)'
                    : 'var(--text-secondary)',
              }}
            >
              Executive Project Briefing &bull; Verified Synthesis
            </span>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Ground Truth: M1&ndash;M8 Verified State
          </span>
        </div>

        <h3
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '4px',
            lineHeight: 1.4,
          }}
        >
          {situationNarrative.title}
        </h3>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {situationNarrative.details}
        </p>
      </div>

      {/* ============================================================
          METRICS SUMMARY RAIL (ACCURATE LABELS & MICRO-EXPLANATIONS)
          ============================================================ */}
      <div className="surface flex-row" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' }}>
        {/* Metric 1: Activities / Scope */}
        <div style={{ flex: 1, padding: 'var(--space-20)', borderRight: '1px solid var(--border-light)', minWidth: '160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              WBS SCOPE
            </span>
            <button
              onClick={() => toggleTooltip('scope')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
              title="Click for explanation"
            >
              <HelpCircle size={13} />
            </button>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
            {data.summary.totalActivities.toString().padStart(2, '0')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {completedCount} completed &bull; {inProgressCount} active
          </div>
          {activeTooltip === 'scope' && (
            <div style={{ marginTop: '8px', padding: '6px 8px', background: 'var(--bg-canvas)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              Total approved work packages defined in the active baseline schedule.
            </div>
          )}
        </div>

        {/* Metric 2: Overall Physical Progress */}
        <div style={{ flex: 1.3, padding: 'var(--space-20)', borderRight: '1px solid var(--border-light)', background: 'var(--bg-surface-subtle)', minWidth: '180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              PHYSICAL PROGRESS
            </span>
            <button
              onClick={() => toggleTooltip('progress')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
              title="Click for explanation"
            >
              <HelpCircle size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-12)' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {schedulePosition.actual}%
            </div>
            {schedulePosition.variance !== 0 && (
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: schedulePosition.variance < 0 ? 'var(--color-danger)' : 'var(--color-success)',
                }}
              >
                {schedulePosition.variance > 0 ? `+${schedulePosition.variance}` : schedulePosition.variance} pp
              </div>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Average physical progress vs {schedulePosition.planned}% plan
          </div>
          {activeTooltip === 'progress' && (
            <div style={{ marginTop: '8px', padding: '6px 8px', background: 'var(--bg-canvas)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              Average verified physical completion across all activities compared to scheduled baseline position at reporting date.
            </div>
          )}
        </div>

        {/* Metric 3: Delayed Activities */}
        <div style={{ flex: 1, padding: 'var(--space-20)', borderRight: '1px solid var(--border-light)', minWidth: '160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-danger)', letterSpacing: '0.05em' }}>
              DELAYED PACKAGES
            </span>
            <button
              onClick={() => toggleTooltip('delayed')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
              title="Click for explanation"
            >
              <HelpCircle size={13} />
            </button>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: delayedActivities.length > 0 ? 'var(--color-danger)' : 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
            {delayedActivities.length.toString().padStart(2, '0')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {delayedActivities.length === 0 ? 'Zero active bottlenecks' : 'Active progress variance'}
          </div>
          {activeTooltip === 'delayed' && (
            <div style={{ marginTop: '8px', padding: '6px 8px', background: 'var(--bg-canvas)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              Activities whose physically verified progress is significantly behind scheduled milestones.
            </div>
          )}
        </div>

        {/* Metric 4: Downstream At Risk Successors */}
        <div style={{ flex: 1, padding: 'var(--space-20)', minWidth: '160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-warning-text)', letterSpacing: '0.05em' }}>
              EXPOSED SUCCESSORS
            </span>
            <button
              onClick={() => toggleTooltip('atrisk')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
              title="Click for explanation"
            >
              <HelpCircle size={13} />
            </button>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: atRiskActivities.length > 0 ? 'var(--color-warning-text)' : 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
            {atRiskActivities.length.toString().padStart(2, '0')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {atRiskActivities.length === 0 ? 'Successors insulated' : 'Dependency exposure'}
          </div>
          {activeTooltip === 'atrisk' && (
            <div style={{ marginTop: '8px', padding: '6px 8px', background: 'var(--bg-canvas)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              Downstream successor activities threatened because an upstream predecessor has slipped.
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          LEVEL 3: WHAT NEEDS ATTENTION? & WHAT CAN YOU DO?
          ============================================================ */}
      <div className="flex-row gap-24" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left: What Needs Attention Operational Action Feed */}
        <div className="flex-col gap-12" style={{ flex: 1.4, minWidth: '320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="var(--color-warning-text)" /> What Needs Attention
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Actionable operational flags
            </span>
          </div>

          <div className="flex-col gap-10">
            {/* 1. Delayed Bottlenecks */}
            {delayedActivities.map((act) => (
              <div
                key={act.id}
                className="surface"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span className="badge badge-danger" style={{ fontSize: '10px' }}>DELAYED</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {act.code} &mdash; {act.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Actual: <strong>{act.actualProgress}%</strong> vs Planned: <strong>{act.plannedProgress}%</strong> ({act.variance} pp variance)
                  </div>
                </div>

                <button
                  onClick={() => onSelectActivity(act.id)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Inspect Activity <ArrowUpRight size={13} />
                </button>
              </div>
            ))}

            {/* 2. Exposed Successors */}
            {atRiskActivities.map((act) => (
              <div
                key={act.id}
                className="surface"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>AT RISK</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {act.code} &mdash; {act.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Downstream dependency exposure. Buffer exhausted by upstream predecessor delay.
                  </div>
                </div>

                <button
                  onClick={() => onSelectActivity(act.id)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Inspect Exposure <ArrowUpRight size={13} />
                </button>
              </div>
            ))}

            {/* 3. Evidence Conflicts */}
            {conflictItems.map((conf) => (
              <div
                key={conf._id}
                className="surface"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid #B91C1C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span className="badge badge-danger" style={{ fontSize: '10px' }}>CONFLICT</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Multi-Source Discrepancy &bull; Logical Date {conf.logicalDate}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Contractor vs supervisor reports disagree. Resolve in Reconciliation Queue.
                  </div>
                </div>

                {onNavigateToView && (
                  <button
                    onClick={() => onNavigateToView('data-intake', 'reconciliation')}
                    className="btn btn-primary"
                    style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Resolve in Reconciliation <ArrowRight size={13} />
                  </button>
                )}
              </div>
            ))}

            {/* 4. Unmatched Signals in Review Queue */}
            {reviewItems.map((rev) => (
              <div
                key={rev._id || rev.id}
                className="surface"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid #D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>UNMATCHED SIGNAL</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      "{rev.extractedActivity || rev.rawText?.slice(0, 30) || 'Field Signal'}"
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Signal extracted from field report. Requires explicit engineer activity matching.
                  </div>
                </div>

                {onNavigateToView && (
                  <button
                    onClick={() => onNavigateToView('data-intake', 'review')}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Match in Review Queue <ArrowRight size={13} />
                  </button>
                )}
              </div>
            ))}

            {/* Clean state when 0 issues */}
            {delayedActivities.length === 0 &&
              atRiskActivities.length === 0 &&
              conflictItems.length === 0 &&
              reviewItems.length === 0 && (
                <div
                  className="surface"
                  style={{
                    padding: 'var(--space-24)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                  }}
                >
                  <CheckCircle2 size={24} color="var(--color-success-text)" style={{ margin: '0 auto var(--space-8)' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success-text)' }}>
                    No Critical Attention Items
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    All active WBS activities are tracking planned milestones and field evidence is reconciled.
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Right: What Can You Do? Action Shortcuts */}
        <div className="flex-col gap-12" style={{ flex: 1, minWidth: '280px' }}>
          <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--color-primary)" /> What Can You Do?
          </h3>

          <div
            className="surface flex-col gap-8"
            style={{ padding: 'var(--space-16)', borderRadius: 'var(--radius-md)' }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              PROTOTYPE WORKFLOW SHORTCUTS
            </div>

            {onNavigateToView && (
              <>
                <button
                  onClick={() => onNavigateToView('data-intake', 'capture')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileSpreadsheet size={15} color="var(--color-primary)" />
                    <span>Upload Document Evidence</span>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </button>

                <button
                  onClick={() => onNavigateToView('data-intake', 'capture')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={15} color="#047857" />
                    <span>Record Structured Field Update</span>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </button>

                <button
                  onClick={() => onNavigateToView('data-intake', 'review')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#B45309" />
                    <span>Review Unmatched Signals</span>
                  </div>
                  {reviewItems.length > 0 ? (
                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>{reviewItems.length}</span>
                  ) : (
                    <ChevronRight size={14} color="var(--text-muted)" />
                  )}
                </button>

                <button
                  onClick={() => onNavigateToView('data-intake', 'reconciliation')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Scale size={15} color="#B91C1C" />
                    <span>Resolve Evidence Conflicts</span>
                  </div>
                  {conflictItems.length > 0 ? (
                    <span className="badge badge-danger" style={{ fontSize: '10px' }}>{conflictItems.length}</span>
                  ) : (
                    <ChevronRight size={14} color="var(--text-muted)" />
                  )}
                </button>

                <button
                  onClick={() => onNavigateToView('risks-forecast')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GitFork size={15} color="var(--color-primary)" />
                    <span>View Dependency Risk &amp; Forecast</span>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </button>

                <button
                  onClick={() => onNavigateToView('schedule')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} color="var(--text-secondary)" />
                    <span>Open WBS Schedule Explorer</span>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          LEVEL 4 & 5: WHY IS IT HAPPENING? (SCHEDULE POSITION & CAUSALITY)
          ============================================================ */}
      <div className="flex-row gap-24" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Column: Dual-Track Schedule Position */}
        <div className="flex-col gap-24" style={{ flex: 1.3, minWidth: '320px' }}>
          <div className="surface" style={{ padding: 'var(--space-24)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-20)' }}>
              <div>
                <h3 className="section-title" style={{ margin: 0 }}>Schedule Position</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Planned baseline target vs. physically verified site progress
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: schedulePosition.variance < 0 ? 'var(--color-danger)' : 'var(--color-success)',
                  background: schedulePosition.variance < 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {schedulePosition.variance === 0
                  ? 'On Schedule'
                  : `${Math.abs(schedulePosition.variance)} pp ${schedulePosition.variance < 0 ? 'Behind Baseline' : 'Ahead of Baseline'}`}
              </span>
            </div>

            <div className="flex-col gap-20">
              {/* Planned Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
                <div style={{ width: '130px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  PLANNED BASELINE
                </div>
                <div style={{ flex: 1, position: 'relative', height: '14px' }}>
                  <div style={{ position: 'absolute', top: '6px', left: 0, right: 0, height: '2px', background: 'var(--border-medium)' }} />
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: `${Math.min(100, Math.max(0, schedulePosition.planned))}%`,
                      transform: 'translateX(-50%)',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--text-secondary)',
                    }}
                  />
                </div>
                <div style={{ width: '45px', textAlign: 'right', fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  {schedulePosition.planned}%
                </div>
              </div>

              {/* Actual Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
                <div style={{ width: '130px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                  VERIFIED ACTUAL
                </div>
                <div style={{ flex: 1, position: 'relative', height: '14px' }}>
                  <div style={{ position: 'absolute', top: '6px', left: 0, right: 0, height: '2px', background: 'var(--border-light)' }} />
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      left: 0,
                      width: `${Math.min(100, Math.max(0, schedulePosition.actual))}%`,
                      height: '2px',
                      background: 'var(--color-primary)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '1px',
                      left: `${Math.min(100, Math.max(0, schedulePosition.actual))}%`,
                      transform: 'translateX(-50%)',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      boxShadow: '0 0 0 3px var(--color-primary-soft)',
                    }}
                  />
                </div>
                <div style={{ width: '45px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {schedulePosition.actual}%
                </div>
              </div>

              {/* Interpretation Note */}
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-surface-subtle)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  lineHeight: 1.5,
                }}
              >
                {schedulePosition.actual === 0 && schedulePosition.planned === 100 ? (
                  <span>
                    <strong>Schedule Status:</strong> 100% of baseline planned scope was scheduled for completion by this reporting date, but physical evidence records 0% progress, indicating an uncommenced package.
                  </span>
                ) : schedulePosition.variance < 0 ? (
                  <span>
                    <strong>Schedule Status:</strong> Physical site execution is currently{' '}
                    <strong>{Math.abs(schedulePosition.variance)} percentage points behind</strong> the planned baseline milestone.
                  </span>
                ) : schedulePosition.variance > 0 ? (
                  <span>
                    <strong>Schedule Status:</strong> Physical site execution is currently tracking{' '}
                    <strong>{schedulePosition.variance} percentage points ahead</strong> of scheduled milestones.
                  </span>
                ) : (
                  <span>
                    <strong>Schedule Status:</strong> Execution progress matches scheduled baseline position exactly.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Execution Signals & Evidence Recency */}
          <div className="surface" style={{ padding: 'var(--space-20)', borderRadius: 'var(--radius-lg)' }}>
            <h3 className="section-title" style={{ marginBottom: 'var(--space-16)' }}>
              Execution Signals &amp; Evidence Provenance
            </h3>
            <div className="flex-col gap-14">
              {/* Evidence Health State */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--space-12)', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {evidenceHealth.icon}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Evidence State: {evidenceHealth.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {evidenceHealth.desc}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    color: evidenceHealth.color,
                    background: evidenceHealth.bg,
                  }}
                >
                  {evidenceHealth.status}
                </span>
              </div>

              {/* Latest Field Update Recency */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--space-12)', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={15} color="var(--color-primary)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Latest Field Update Recency
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {latestUpdate
                      ? `Report Date: ${formatDate(latestUpdate.reportDate)} via ${latestUpdate.sourceType} intake`
                      : 'No evidence updates recorded in project history yet'}
                  </div>
                </div>
                {latestUpdate && (
                  <span className="text-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {latestUpdate.actualProgress}% milestone
                  </span>
                )}
              </div>

              {/* Active WBS Execution Scope */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={15} color="var(--text-secondary)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Scope Allocation
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {completedCount} Completed &bull; {inProgressCount} In Progress &bull; {notStartedCount} Not Started
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  {data.activities.length} Packages
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Causal Dependency Impact Trace */}
        <div className="surface flex-col" style={{ flex: 1, padding: 'var(--space-24)', borderRadius: 'var(--radius-lg)', minWidth: '320px' }}>
          <div style={{ marginBottom: 'var(--space-16)' }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitFork size={16} color="var(--color-primary)" /> Causal Dependency Trace
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              How upstream slippage propagates downstream risk across the network
            </span>
          </div>

          {causalChain.hasChain && causalChain.root ? (
            <div className="flex-col gap-12">
              {/* Root Cause Node */}
              <div
                onClick={() => onSelectActivity(causalChain.root!.id)}
                className="surface"
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${causalChain.root.status === 'DELAYED' ? 'var(--color-danger)' : 'var(--border-medium)'}`,
                  borderLeft: `4px solid ${causalChain.root.status === 'DELAYED' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                  background: causalChain.root.status === 'DELAYED' ? 'var(--color-danger-bg)' : 'var(--bg-surface-subtle)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    ROOT DELAYED ACTIVITY
                  </span>
                  <span className={`badge badge-${causalChain.root.status === 'DELAYED' ? 'danger' : 'neutral'}`} style={{ fontSize: '10px' }}>
                    {causalChain.root.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {causalChain.root.code} &mdash; {causalChain.root.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Actual: <strong>{causalChain.root.actualProgress}%</strong> vs Planned: <strong>{causalChain.root.plannedProgress}%</strong> ({causalChain.root.variance} pp variance)
                </div>
              </div>

              {/* Relationship Link */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '16px' }}>
                <div style={{ width: '2px', height: '24px', background: 'var(--border-strong)' }} />
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  &darr; {causalChain.relationship} (Predecessor Delay Propagation)
                </div>
              </div>

              {/* Downstream Impact Node */}
              {causalChain.target && (
                <div
                  onClick={() => onSelectActivity(causalChain.target!.id)}
                  className="surface"
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${causalChain.target.dependencyRisk === 'AT_RISK' ? 'var(--color-warning)' : 'var(--border-medium)'}`,
                    borderLeft: `4px solid ${causalChain.target.dependencyRisk === 'AT_RISK' ? 'var(--color-warning)' : 'var(--color-primary)'}`,
                    background: causalChain.target.dependencyRisk === 'AT_RISK' ? 'var(--color-warning-bg)' : 'var(--bg-surface-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      DOWNSTREAM DEPENDENCY EXPOSURE
                    </span>
                    <span className={`badge badge-${causalChain.target.dependencyRisk === 'AT_RISK' ? 'warning' : 'neutral'}`} style={{ fontSize: '10px' }}>
                      {causalChain.target.dependencyRisk === 'AT_RISK' ? 'AT RISK' : causalChain.target.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {causalChain.target.code} &mdash; {causalChain.target.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Status: {causalChain.target.status.replace('_', ' ')} &bull; Progress: {causalChain.target.actualProgress}%
                  </div>
                </div>
              )}

              {/* Why This Matters Box */}
              <div
                style={{
                  marginTop: 'var(--space-8)',
                  padding: '12px',
                  background: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <strong>Why This Matters:</strong> {causalChain.reason} Click on any node above to open the comprehensive Activity Drawer with evidence history and forecast details.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-32)',
                background: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={28} color="var(--color-success)" style={{ marginBottom: 'var(--space-8)' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                No Active Downstream Dependency Risks
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '280px', marginTop: '4px' }}>
                Upstream activities are tracking within approved variance tolerances; no successor activities are exposed to dependency risk.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          LEVEL 6: HOW INFRA LINK OPERATES (COMPACT REVIEWER ORIENTATION)
          ============================================================ */}
      <div
        className="surface"
        style={{
          padding: 'var(--space-20)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-12)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            HOW INFRA LINK OPERATES &bull; THE M1&ndash;M8 ENGINE
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Deterministic End-to-End Pipeline
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: '#0F172A', color: '#fff', fontSize: '10px' }}>01</span>
            <strong>Schedule Baseline</strong>
          </div>
          <ChevronRight size={14} color="var(--text-muted)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: '#0F172A', color: '#fff', fontSize: '10px' }}>02</span>
            <strong>Evidence Intake</strong>
          </div>
          <ChevronRight size={14} color="var(--text-muted)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: '#0F172A', color: '#fff', fontSize: '10px' }}>03</span>
            <strong>Activity Match</strong>
          </div>
          <ChevronRight size={14} color="var(--text-muted)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: '#0F172A', color: '#fff', fontSize: '10px' }}>04</span>
            <strong>Reconciliation</strong>
          </div>
          <ChevronRight size={14} color="var(--text-muted)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: '#0F172A', color: '#fff', fontSize: '10px' }}>05</span>
            <strong>Dependency Impact</strong>
          </div>
          <ChevronRight size={14} color="var(--text-muted)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: '#0F172A', color: '#fff', fontSize: '10px' }}>06</span>
            <strong style={{ color: 'var(--color-primary)' }}>Velocity Forecast</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
