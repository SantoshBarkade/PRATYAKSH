import { LandingNavbar } from './LandingNavbar';
import { LandingHero } from './LandingHero';
import { ArrowRight, Clock, Check } from 'lucide-react';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing-page-root">
      {/* Navigation */}
      <LandingNavbar />

      {/* Hero Section */}
      <LandingHero />

      {/* SECTION 1: HOW IT WORKS / EXECUTION WORKFLOW */}
      <section id="how-it-works" className="landing-section" aria-labelledby="workflow-heading">
        <div className="landing-container">
          <div style={{ maxWidth: '680px', marginBottom: '16px' }}>
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-badge">Operational Architecture</span>
              <span>The INFRA LINK Pipeline</span>
            </div>
            <h2 id="workflow-heading" className="landing-h2">
              From raw field evidence to an explainable project state.
            </h2>
            <p className="landing-body" style={{ fontSize: '15px' }}>
              INFRA LINK implements a deterministic six-stage operational pipeline that converts disparate site updates
              into rigorous, verified project intelligence.
            </p>
          </div>

          {/* 6-Node Responsive Process Track */}
          <div className="workflow-track">
            {/* Node 1 */}
            <div className="workflow-node">
              <span className="workflow-num">01 / SCHEDULE</span>
              <div className="workflow-title">Baseline Import</div>
              <p className="workflow-desc">
                Ingest Primavera P6 or Excel schedule (XLSX). Establishes planned activities, baseline dates, durations, and dependency links.
              </p>
            </div>

            {/* Node 2 */}
            <div className="workflow-node">
              <span className="workflow-num">02 / CAPTURE</span>
              <div className="workflow-title">Evidence Intake</div>
              <p className="workflow-desc">
                Capture contractor reports, supervisor site diaries, and field engineer mobile submissions across PDF, TXT, and XLSX formats.
              </p>
            </div>

            {/* Node 3 */}
            <div className="workflow-node">
              <span className="workflow-num">03 / MATCH</span>
              <div className="workflow-title">Activity Matching</div>
              <p className="workflow-desc">
                Signals are matched to WBS activities via deterministic codes or presented in the Review Queue for explicit engineer confirmation.
              </p>
            </div>

            {/* Node 4 */}
            <div className="workflow-node">
              <span className="workflow-num">04 / COMPARE</span>
              <div className="workflow-title">Variance Analysis</div>
              <p className="workflow-desc">
                Compare verified physical progress against planned schedule milestones to identify true execution slippage.
              </p>
            </div>

            {/* Node 5 */}
            <div className="workflow-node">
              <span className="workflow-num">05 / TRACE</span>
              <div className="workflow-title">Dependency Risk</div>
              <p className="workflow-desc">
                Traverse network predecessors and successors to reveal downstream activities at risk before delays compound.
              </p>
            </div>

            {/* Node 6 */}
            <div className="workflow-node">
              <span className="workflow-num">06 / FORECAST</span>
              <div className="workflow-title">Deterministic Forecast</div>
              <p className="workflow-desc">
                Calculate expected completion dates using observed historical velocity and remaining scope &mdash; zero black-box guesswork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE DIFFERENTIATOR — DEPENDENCY PROPAGATION */}
      <section id="differentiator" className="landing-section-subtle" aria-labelledby="diff-heading">
        <div className="landing-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', alignItems: 'center' }}>
            {/* Left Narrative */}
            <div>
              <div className="landing-eyebrow">
                <span className="landing-eyebrow-badge">Core Differentiator</span>
                <span>Network Causality</span>
              </div>
              <h2 id="diff-heading" className="landing-h2">
                One delayed activity is rarely an isolated event.
              </h2>
              <p className="landing-lead" style={{ fontSize: '16px', marginBottom: '20px' }}>
                Traditional project reporting lists activities in silos. When earthwork falls behind by three weeks,
                standard dashboards merely turn that single row red.
              </p>
              <p className="landing-body" style={{ marginBottom: '24px' }}>
                INFRA LINK treats infrastructure as a connected execution system. It models Finish-to-Start,
                Start-to-Start, and Finish-to-Finish constraints to immediately expose downstream successors whose
                dependencies are exposed to upstream delay.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#334155' }}>
                  <Check size={16} color="#047857" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    <strong>Root Cause Identification:</strong> Pinpoints the exact bottleneck initiating the chain reaction.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#334155' }}>
                  <Check size={16} color="#047857" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    <strong>Downstream Risk Warning:</strong> Flags upcoming activities weeks before equipment mobilization begins.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#334155' }}>
                  <Check size={16} color="#047857" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    <strong>Actionable Dependency Analysis:</strong> Demonstrates whether downstream schedules are insulated from upstream delay.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Visual: Causal Propagation Card */}
            <div className="diff-card" style={{ boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.06)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                Dependency Impact Propagation Example
              </div>

              {/* Upstream Root */}
              <div
                style={{
                  border: '1px solid #FECACA',
                  borderLeft: '4px solid #EF4444',
                  borderRadius: '6px',
                  padding: '14px',
                  background: '#FEF2F2',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
                    W002 &mdash; Trenching &amp; Excavation
                  </span>
                  <span className="badge-semantic delayed">DELAYED</span>
                </div>
                <div style={{ fontSize: '12px', color: '#7F1D1D' }}>
                  Reported Progress: <strong>40%</strong> &bull; Baseline Planned: <strong>100%</strong> (&minus;60 pp)
                </div>
              </div>

              {/* Connector Link */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '24px', margin: '4px 0' }}>
                <div style={{ width: '2px', height: '24px', background: '#F59E0B' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#B45309', fontFamily: 'JetBrains Mono, monospace' }}>
                  Finish-to-Start (Lag: 0 days)
                </span>
              </div>

              {/* Downstream Impacted Successor */}
              <div
                style={{
                  border: '1px solid #FDE68A',
                  borderLeft: '4px solid #F59E0B',
                  borderRadius: '6px',
                  padding: '14px',
                  background: '#FFFBEB',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                    W003 &mdash; Main Pipe Laying
                  </span>
                  <span className="badge-semantic at-risk">AT RISK</span>
                </div>
                <div style={{ fontSize: '12px', color: '#92400E' }}>
                  Cause: Upstream predecessor W002 is delayed. Successor cannot commence without trench completion.
                </div>
              </div>

              {/* Summary Impact Pill */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  background: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Clock size={14} color="#0F172A" />
                <span>
                  Downstream Dependency Impact: <strong>+14 days</strong> anticipated successor delay.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: EVIDENCE & PROVENANCE PIPELINE */}
      <section id="evidence" className="landing-section" aria-labelledby="evidence-heading">
        <div className="landing-container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-badge">Data Integrity</span>
              <span>Evidence Provenance</span>
            </div>
            <h2 id="evidence-heading" className="landing-h2">
              The Provenance of Trust
            </h2>
            <p className="landing-body">
              How raw field documentation is verified, reconciled, and promoted to trusted project state without silent mutations.
            </p>
          </div>

          {/* Horizontal Linear Pipeline Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Step 1 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', background: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>STAGE 1</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Raw Field Evidence</h3>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                PDF inspection reports, contractor daily diary TXT files, and Excel spreadsheets.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', background: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>STAGE 2</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Signal Extraction</h3>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                Extraction of activity codes, physical progress percentages, observation dates, and remarks.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', background: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>STAGE 3</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>WBS Activity Match</h3>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                Deterministic mapping against schedule activities. Ambiguous events routed to Review Queue.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', background: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>STAGE 4</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Multi-Source Reconciliation</h3>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                Discrepancies (e.g. 90% contractor vs 40% supervisor) isolated for explicit decision.
              </p>
            </div>

            {/* Step 5 */}
            <div style={{ border: '2px solid #0F172A', borderRadius: '8px', padding: '20px', background: '#F8FAFC' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>STAGE 5</div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>Trusted State</h3>
              <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                Only verified, reconciled evidence mutates project actuals and updates execution velocities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: DETERMINISTIC FORECASTING */}
      <section id="forecast" className="landing-section-subtle" aria-labelledby="forecast-heading">
        <div className="landing-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '56px', alignItems: 'center' }}>
            {/* Left Narrative */}
            <div>
              <div className="landing-eyebrow">
                <span className="landing-eyebrow-badge">M8 Forecasting</span>
                <span>Deterministic Intelligence</span>
              </div>
              <h2 id="forecast-heading" className="landing-h2">
                Forecast from execution history, not guesswork.
              </h2>
              <p className="landing-lead" style={{ fontSize: '16px', marginBottom: '20px' }}>
                INFRA LINK rejects probabilistic hand-waving and arbitrary AI confidence percentages. Forecasting is
                deterministic, traceable, and grounded in audited velocity.
              </p>
              <p className="landing-body" style={{ marginBottom: '24px' }}>
                By evaluating the actual physical progress completed over elapsed calendar days between trusted evidence
                points, INFRA LINK calculates the true execution burn rate and derives completion dates mathematically.
              </p>

              <div
                style={{
                  background: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                  color: '#0F172A',
                }}
              >
                <div style={{ color: '#64748B', marginBottom: '4px' }}>// Deterministic Forecast Formula</div>
                <div>Velocity (v) = (Progress_latest - Progress_first) / Elapsed_days</div>
                <div>Remaining_days = (100 - Progress_latest) / v</div>
                <div>Forecast_Date = Report_Date + Remaining_days</div>
              </div>
            </div>

            {/* Right Card: Real M8 Calculation Breakdown (Flyover F001 Case) */}
            <div className="forecast-breakdown-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                  F001 &mdash; Pier Construction Phase
                </span>
                <span className="badge-semantic on-track">PREDICTABLE</span>
              </div>

              <div className="forecast-calc-row">
                <span style={{ color: '#64748B' }}>Baseline Planned Completion</span>
                <strong style={{ color: '#0F172A' }}>15 June 2026</strong>
              </div>

              <div className="forecast-calc-row">
                <span style={{ color: '#64748B' }}>Historical Evidence Milestones</span>
                <span className="landing-meta" style={{ color: '#0F172A' }}>
                  10% &rarr; 40% &rarr; 75% &rarr; 95%
                </span>
              </div>

              <div className="forecast-calc-row">
                <span style={{ color: '#64748B' }}>Observed Execution Velocity</span>
                <strong style={{ color: '#2563EB', fontFamily: 'JetBrains Mono, monospace' }}>0.92% / day</strong>
              </div>

              <div className="forecast-calc-row">
                <span style={{ color: '#64748B' }}>Remaining Work to 100%</span>
                <strong style={{ color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>5.0% (5.4 days)</strong>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Deterministic Completion
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>
                    20 June 2026
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#B45309' }}>Schedule Variance</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#B45309' }}>+5 days slip</div>
                </div>
              </div>

              <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748B' }}>
                Mathematical trace: (95% - 10%) over 92 days = 0.92%/day. Remaining 5% requires 5.4 days from 2026-06-15.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: TRUST & PRODUCT PRINCIPLES */}
      <section id="principles" className="landing-section" aria-labelledby="principles-heading">
        <div className="landing-container">
          <div style={{ maxWidth: '640px', marginBottom: '16px' }}>
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-badge">Design Foundations</span>
              <span>Engineering Integrity</span>
            </div>
            <h2 id="principles-heading" className="landing-h2">
              Five principles for high-trust project governance.
            </h2>
            <p className="landing-body">
              How INFRA LINK maintains operational reliability in mission-critical public and private infrastructure.
            </p>
          </div>

          <div className="principles-grid">
            {/* Principle 1 */}
            <div className="principle-item">
              <div className="principle-num">01 // GROUNDED EVIDENCE</div>
              <h3 className="landing-h3" style={{ fontSize: '16px' }}>Evidence-Backed Truth</h3>
              <p className="landing-body" style={{ fontSize: '13px' }}>
                Never relies on self-reported verbal assurances. Every percentage point in the system must map to a
                timestamped report, survey sheet, or photo log.
              </p>
            </div>

            {/* Principle 2 */}
            <div className="principle-item">
              <div className="principle-num">02 // DETERMINISTIC MATH</div>
              <h3 className="landing-h3" style={{ fontSize: '16px' }}>No Hallucinated Forecasts</h3>
              <p className="landing-body" style={{ fontSize: '13px' }}>
                No opaque neural network predictions. Schedules, variances, and forecast dates follow pure critical-path
                mathematics and observed burn velocity.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="principle-item">
              <div className="principle-num">03 // RECONCILIATION</div>
              <h3 className="landing-h3" style={{ fontSize: '16px' }}>Multi-Source Discrepancy Detection</h3>
              <p className="landing-body" style={{ fontSize: '13px' }}>
                When the EPC contractor reports 90% and the independent supervising engineer reports 40%, the platform
                flags the 50-point conflict for human engineering sign-off.
              </p>
            </div>

            {/* Principle 4 */}
            <div className="principle-item">
              <div className="principle-num">04 // CAUSAL TRACEABILITY</div>
              <h3 className="landing-h3" style={{ fontSize: '16px' }}>Explainable Risk Chain</h3>
              <p className="landing-body" style={{ fontSize: '13px' }}>
                Every activity marked At Risk displays its predecessor dependencies, explainability trace, and exact
                reasoning &mdash; eliminating mysterious alarms.
              </p>
            </div>

            {/* Principle 5 */}
            <div className="principle-item">
              <div className="principle-num">05 // STRICT ISOLATION</div>
              <h3 className="landing-h3" style={{ fontSize: '16px' }}>Project Package Boundary</h3>
              <p className="landing-body" style={{ fontSize: '13px' }}>
                Strict multi-project separation guarantees that evidence, WBS activities, and risk graphs remain completely
                isolated between contract packages.
              </p>
            </div>

            {/* Principle 6 */}
            <div className="principle-item">
              <div className="principle-num">06 // ZERO SILENT MUTATION</div>
              <h3 className="landing-h3" style={{ fontSize: '16px' }}>Explicit Governance</h3>
              <p className="landing-body" style={{ fontSize: '13px' }}>
                Unmatched evidence never silently attaches to the first activity in a list. Unmatched events remain in
                the Review Queue until manually confirmed or discarded.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL CTA */}
      <section className="landing-section-subtle" style={{ textAlign: 'center', padding: '96px 0' }}>
        <div className="landing-container">
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h2 className="landing-h2" style={{ marginBottom: '16px' }}>
              Turn project evidence into a clearer execution picture.
            </h2>
            <p className="landing-lead" style={{ fontSize: '16px', marginBottom: '32px' }}>
              Experience INFRA LINK with active infrastructure datasets across urban flyovers, municipal water pipelines,
              and ring road expansions.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <a href="/app" className="landing-btn landing-btn-primary" style={{ padding: '12px 28px', fontSize: '14px' }}>
                Open Command Center <ArrowRight size={16} />
              </a>
              <a href="#how-it-works" className="landing-btn landing-btn-secondary" style={{ padding: '12px 28px', fontSize: '14px' }}>
                View Operational Pipeline
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-inner">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>
                  INFRA LINK
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '320px', lineHeight: 1.5 }}>
                Infrastructure Execution Intelligence. Connect Plans. Track Progress. Predict Impact.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Platform
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <a href="/app" style={{ color: '#475569', textDecoration: 'none' }}>Command Center</a>
                  <a href="/app" style={{ color: '#475569', textDecoration: 'none' }}>Data Intake</a>
                  <a href="/app" style={{ color: '#475569', textDecoration: 'none' }}>Schedule &amp; WBS</a>
                  <a href="/app" style={{ color: '#475569', textDecoration: 'none' }}>Risks &amp; Forecast</a>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Architecture
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
                  <span>M1 Schedule Ingestion</span>
                  <span>M2 Document Extraction</span>
                  <span>M3 Activity Matching</span>
                  <span>M4 Dependency Propagation</span>
                  <span>M7 Reconciliation Engine</span>
                  <span>M8 Deterministic Velocity</span>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              Smart India Hackathon 2026 &bull; Problem Statement PS26122 &bull; Ministry of Road Transport and Highways (MoRTH)
            </div>
            <div>
              &copy; {new Date().getFullYear()} INFRA LINK. Infrastructure Execution Intelligence.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
