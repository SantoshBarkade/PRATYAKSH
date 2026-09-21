import { ArrowRight, ChevronRight, Activity, GitFork, CheckCircle2 } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="hero-heading">
      <div className="landing-container">
        <div className="hero-grid">
          {/* Left Column: Editorial & Value Proposition */}
          <div className="hero-content">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-badge">SIH 2026 &bull; PS 26122</span>
              <span>Infrastructure Execution Intelligence</span>
            </div>

            <h1 id="hero-heading" className="landing-h1">
              See what is actually happening on the project.
            </h1>

            <p className="landing-lead">
              INFRA LINK connects approved project schedules with field execution evidence to reveal actual progress, dependency impact,
              execution risk, and deterministic completion forecasts.
            </p>

            <div className="hero-actions">
              <a href="/app" className="landing-btn landing-btn-primary">
                Open Command Center <ArrowRight size={15} />
              </a>
              <a href="#how-it-works" className="landing-btn landing-btn-secondary">
                Explore how it works
              </a>
            </div>

            <div className="hero-meta-strip">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="#047857" />
                <span>Deterministic M1–M8 Architecture</span>
              </div>
              <span>&bull;</span>
              <div>No Black-Box Hallucinations</div>
              <span>&bull;</span>
              <div>Field Evidence Grounded</div>
            </div>
          </div>

          {/* Right Column: Miniature Command Center Product Visual */}
          <div className="hero-product-surface" aria-label="Conceptual Product Interface Preview">
            {/* Header */}
            <div className="hero-product-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  Pune Ring Road Expansion &mdash; Package 02
                </span>
              </div>
              <span className="landing-meta">PRR-PKG02</span>
            </div>

            <div className="hero-product-body">
              {/* Metric Row */}
              <div className="hero-metric-grid">
                <div className="hero-metric-card">
                  <span className="hero-metric-label">Baseline Schedule</span>
                  <span className="hero-metric-value">72%</span>
                  <span className="hero-metric-sub" style={{ color: '#64748B' }}>
                    Planned to date
                  </span>
                </div>

                <div className="hero-metric-card" style={{ borderLeft: '3px solid #EF4444' }}>
                  <span className="hero-metric-label">Actual Progress</span>
                  <span className="hero-metric-value" style={{ color: '#B91C1C' }}>
                    58%
                  </span>
                  <span className="hero-metric-sub" style={{ color: '#B91C1C' }}>
                    &minus;14 pp variance
                  </span>
                </div>

                <div className="hero-metric-card" style={{ borderLeft: '3px solid #F59E0B' }}>
                  <span className="hero-metric-label">M8 Forecast</span>
                  <span className="hero-metric-value" style={{ color: '#0F172A', fontSize: '16px' }}>
                    18 Jun 2026
                  </span>
                  <span className="hero-metric-sub" style={{ color: '#B45309' }}>
                    +8 days schedule delay
                  </span>
                </div>
              </div>

              {/* Root Delayed Activity */}
              <div
                style={{
                  border: '1px solid #FECACA',
                  borderLeft: '4px solid #EF4444',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  background: '#FEF2F2',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} color="#B91C1C" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B' }}>
                      P002 &mdash; Earthworks &amp; Subgrade
                    </span>
                  </div>
                  <span className="badge-semantic delayed">DELAYED</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7F1D1D', marginBottom: '6px' }}>
                  <span>Verified: 42% (Planned: 70%)</span>
                  <strong>&minus;28 pp variance</strong>
                </div>

                {/* Split progress bar */}
                <div style={{ height: '6px', width: '100%', background: '#FEE2E2', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: '42%', background: '#EF4444' }} />
                  {/* Planned marker */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: '70%',
                      width: '2px',
                      background: '#0F172A',
                    }}
                    title="Planned baseline: 70%"
                  />
                </div>
              </div>

              {/* Downstream Dependency Impact */}
              <div
                style={{
                  border: '1px solid #FDE68A',
                  borderLeft: '4px solid #F59E0B',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  background: '#FFFBEB',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitFork size={14} color="#B45309" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                      P003 &mdash; Granular Sub-Base Paving
                    </span>
                  </div>
                  <span className="badge-semantic at-risk">AT RISK</span>
                </div>
                <div style={{ fontSize: '11px', color: '#92400E' }}>
                  Impact: Finish-to-Start successor exposed to upstream Earthworks delay.
                </div>
              </div>

              {/* Visual Causal Pipeline Trace */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  border: '1px solid #E2E8F0',
                  marginTop: '4px',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Deterministic Execution Chain
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', flexWrap: 'wrap' }}>
                  <span>Field Evidence</span>
                  <ChevronRight size={12} color="#94A3B8" />
                  <span>Activity Match</span>
                  <ChevronRight size={12} color="#94A3B8" />
                  <span style={{ color: '#B91C1C', fontWeight: 600 }}>Variance (-28 pp)</span>
                  <ChevronRight size={12} color="#94A3B8" />
                  <span style={{ color: '#B45309', fontWeight: 600 }}>Dependency Risk</span>
                  <ChevronRight size={12} color="#94A3B8" />
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>Velocity Forecast</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
