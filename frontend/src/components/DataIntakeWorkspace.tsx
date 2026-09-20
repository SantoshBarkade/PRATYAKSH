import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, File as FileIcon, ShieldCheck, CheckCircle, AlertCircle, RefreshCw, Layers, ListFilter, GitMerge } from 'lucide-react';
import { API_BASE } from '../lib/api';
import type { ProjectActivity, ActivityStatus } from '../types';
import { ReviewQueue } from './ReviewQueue';
import { ReconciliationQueue } from './ReconciliationQueue';

interface DataIntakeWorkspaceProps {
  projectId: string;
  activities: ProjectActivity[];
  onDataChanged: () => void;
  initialTab?: 'capture' | 'review' | 'reconciliation';
}

type TabType = 'capture' | 'review' | 'reconciliation';
type UploadStage = 'IDLE' | 'UPLOADING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export const DataIntakeWorkspace: React.FC<DataIntakeWorkspaceProps> = ({
  projectId,
  activities,
  onDataChanged,
  initialTab = 'capture',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [captureMode, setCaptureMode] = useState<'DOCUMENT' | 'STRUCTURED'>('DOCUMENT');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Counts for tabs
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [conflictCount, setConflictCount] = useState<number>(0);

  // Form states
  const [activityCode, setActivityCode] = useState('');
  const [progress, setProgress] = useState('');
  const [status, setStatus] = useState<ActivityStatus | ''>('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualResult, setManualResult] = useState<{ success: boolean; message: string } | null>(null);

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>('IDLE');
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    details?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch queue counts
  const fetchCounts = async () => {
    try {
      // Review queue count
      const revRes = await fetch(`${API_BASE}/projects/${projectId}/execution-events/review`);
      if (revRes.ok) {
        const revData = await revRes.json();
        if (revData.success && Array.isArray(revData.data)) {
          setReviewCount(revData.data.length);
        }
      }

      // Reconciliation conflicts count
      const recRes = await fetch(`${API_BASE}/projects/${projectId}/reconciliations`);
      if (recRes.ok) {
        const recData = await recRes.json();
        if (recData.success && Array.isArray(recData.reconciliations)) {
          const conflicts = recData.reconciliations.filter((r: any) => r.status === 'CONFLICT');
          setConflictCount(conflicts.length);
        }
      }
    } catch {
      // Soft ignore count errors
    }
  };

  // Reset inputs and refresh counts upon project change (Project Isolation)
  useEffect(() => {
    setActivityCode('');
    setProgress('');
    setStatus('');
    setRemarks('');
    setSelectedFile(null);
    setUploadStage('IDLE');
    setUploadResult(null);
    setManualResult(null);

    fetchCounts();
  }, [projectId]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityCode || !progress) return;

    setSubmittingManual(true);
    setManualResult(null);

    try {
      const selectedAct = activities.find((a) => a.code === activityCode);
      const actName = selectedAct ? selectedAct.name : '';

      // Deterministic structured text formatting (H1.11)
      const lines: (string | null)[] = [
        `Activity Code: ${activityCode}`,
        actName ? `Activity Name: ${actName}` : null,
        `Progress: ${progress}%`,
        status ? `Status: ${status}` : null,
        `Date: ${reportDate}`,
        remarks ? `Remarks: ${remarks}` : null,
      ];
      const deterministicText = lines.filter(Boolean).join('\n');

      const payload = {
        text: deterministicText,
        reportDate: reportDate,
      };

      const res = await fetch(`${API_BASE}/projects/${projectId}/execution-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setManualResult({
          success: true,
          message: `Execution event recorded successfully. Match decision: ${data.event?.matchingDecision || 'PROCESSED'}.`,
        });
        setActivityCode('');
        setProgress('');
        setStatus('');
        setRemarks('');
        onDataChanged();
        fetchCounts();
      } else {
        setManualResult({
          success: false,
          message: data.error || data.message || 'Failed to submit execution evidence.',
        });
      }
    } catch (err: any) {
      setManualResult({
        success: false,
        message: err.message || 'Network error occurred.',
      });
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploadStage('UPLOADING');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('reporterId', 'user-001');

    try {
      // Step 1: Uploading
      setUploadStage('PROCESSING');

      const endpoint = `${API_BASE}/projects/${projectId}/evidence/import`;
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setUploadStage('SUCCESS');
        const count = data.importedRows !== undefined ? data.importedRows : data.result?.events?.length || 0;
        setUploadResult({
          success: true,
          title: 'Evidence Ingested Successfully',
          message: `Extracted ${count} execution signal${count === 1 ? '' : 's'} from ${selectedFile.name}.`,
          details: data.warnings && data.warnings.length > 0 ? data.warnings : undefined,
        });
        setSelectedFile(null);
        onDataChanged();
        fetchCounts();
      } else {
        setUploadStage('ERROR');
        const errorMessage =
          data.details && Array.isArray(data.details)
            ? `${data.error || 'Validation error'}: ${data.details.join(' ')}`
            : data.error || data.message || 'Extraction failed.';
        setUploadResult({
          success: false,
          title: 'Evidence Ingestion Error',
          message: errorMessage,
        });
      }
    } catch (err: any) {
      setUploadStage('ERROR');
      setUploadResult({
        success: false,
        title: 'Communication Failure',
        message: err.message || 'Network request failed during evidence ingestion.',
      });
    }
  };

  return (
    <div className="page-container flex-col" style={{ gap: 'var(--space-24)' }}>
      {/* Page Header */}
      <div className="flex-row items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-16)' }}>
        <div className="flex-col">
          <div className="page-eyebrow">Evidence Operations</div>
          <h1 className="page-title">Data Intake &amp; Reconciliation</h1>
          <p className="page-description">
            Capture, verify, and reconcile raw execution evidence before it mutates trusted schedule and forecast state.
          </p>
        </div>

        {/* Workflow Pipeline Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-12)',
            background: 'var(--bg-surface)',
            padding: 'var(--space-8) var(--space-16)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-8)',
              color: activeTab === 'capture' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: activeTab === 'capture' ? 'var(--color-primary)' : 'var(--border-medium)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
              }}
            >
              1
            </div>
            CAPTURE
          </div>
          <div style={{ width: '24px', height: '1px', background: 'var(--border-medium)' }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-8)',
              color: activeTab === 'review' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: activeTab === 'review' ? 'var(--color-primary)' : 'var(--border-medium)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
              }}
            >
              2
            </div>
            REVIEW
          </div>
          <div style={{ width: '24px', height: '1px', background: 'var(--border-medium)' }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-8)',
              color: activeTab === 'reconciliation' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            <ShieldCheck size={16} />
            RECONCILE
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs (H1.8) */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-8)',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: 'var(--space-8)',
        }}
      >
        <button
          onClick={() => setActiveTab('capture')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-8)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'capture' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'capture' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'capture' ? 600 : 500,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            boxShadow: activeTab === 'capture' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Layers size={16} />
          Capture Evidence
        </button>

        <button
          onClick={() => setActiveTab('review')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-8)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'review' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'review' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'review' ? 600 : 500,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            boxShadow: activeTab === 'review' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <ListFilter size={16} />
          Review Queue
          {reviewCount > 0 && (
            <span
              style={{
                fontSize: 'var(--text-micro)',
                background: 'var(--color-warning)',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 700,
              }}
            >
              {reviewCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-8)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'reconciliation' ? 'var(--bg-surface)' : 'transparent',
            color: activeTab === 'reconciliation' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'reconciliation' ? 600 : 500,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            boxShadow: activeTab === 'reconciliation' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <GitMerge size={16} />
          Reconciliation
          {conflictCount > 0 && (
            <span
              style={{
                fontSize: 'var(--text-micro)',
                background: 'var(--color-danger)',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 700,
              }}
            >
              {conflictCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CAPTURE EVIDENCE */}
      {activeTab === 'capture' && (
        <div className="flex-col gap-24" style={{ maxWidth: '860px', width: '100%' }}>
          {/* Two Clear Choices Selector */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-12)' }}>
              Choose how you want to provide execution evidence:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-16)' }}>
              {/* Choice 1: Document Evidence */}
              <div
                onClick={() => setCaptureMode('DOCUMENT')}
                style={{
                  padding: 'var(--space-16) var(--space-20)',
                  borderRadius: 'var(--radius-lg)',
                  background: captureMode === 'DOCUMENT' ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)',
                  border: `2px solid ${captureMode === 'DOCUMENT' ? 'var(--color-primary)' : 'var(--border-light)'}`,
                  cursor: 'pointer',
                  boxShadow: captureMode === 'DOCUMENT' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UploadCloud size={18} color="var(--color-primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Document Evidence</span>
                  </div>
                  {captureMode === 'DOCUMENT' && (
                    <span className="badge badge-primary">Active</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Upload contractor reports, engineer notes, or multi-activity execution spreadsheets (PDF, TXT, XLSX).
                </div>
                <div style={{ marginTop: '2px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                  {captureMode === 'DOCUMENT' ? 'Ready to upload ↓' : 'Choose Document →'}
                </div>
              </div>

              {/* Choice 2: Structured Field Update */}
              <div
                onClick={() => setCaptureMode('STRUCTURED')}
                style={{
                  padding: 'var(--space-16) var(--space-20)',
                  borderRadius: 'var(--radius-lg)',
                  background: captureMode === 'STRUCTURED' ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)',
                  border: `2px solid ${captureMode === 'STRUCTURED' ? 'var(--color-primary)' : 'var(--border-light)'}`,
                  cursor: 'pointer',
                  boxShadow: captureMode === 'STRUCTURED' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="var(--color-primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Structured Field Update</span>
                  </div>
                  {captureMode === 'STRUCTURED' && (
                    <span className="badge badge-primary">Active</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Record direct site observations with specific activity codes, actual progress percentages, and status.
                </div>
                <div style={{ marginTop: '2px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                  {captureMode === 'STRUCTURED' ? 'Ready to record ↓' : 'Record Update →'}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow 1: Document Evidence Ingestion */}
          {captureMode === 'DOCUMENT' && (
            <div className="surface" style={{ padding: 'var(--space-24)', borderRadius: 'var(--radius-lg)', width: '100%' }}>
              <div style={{ marginBottom: 'var(--space-16)' }}>
                <h3 className="section-title">Document Evidence Ingestion</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Upload site evidence files. Extracted text is parsed and deterministically matched against schedule activities.
                </p>
              </div>

              <div
                style={{
                  border: '2px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-32)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-canvas)',
                  cursor: !selectedFile ? 'pointer' : 'default',
                  transition: 'border-color 0.2s ease',
                }}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                onMouseEnter={(e) => {
                  if (!selectedFile) e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  if (!selectedFile) e.currentTarget.style.borderColor = 'var(--border-medium)';
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.txt,.xlsx"
                  onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                />

                {!selectedFile ? (
                  <>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 'var(--space-16)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <UploadCloud size={24} color="var(--color-primary)" />
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Drop site evidence here
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-12)' }}>
                      PDF &bull; TXT &bull; XLSX (Supported site reports and spreadsheets)
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      style={{ fontSize: '12px', height: '32px', padding: '0 16px' }}
                    >
                      Choose File
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <FileIcon size={36} color="var(--color-primary)" style={{ margin: '0 auto var(--space-12)' }} />
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-16)' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type || 'Document'}
                    </div>

                    <div className="flex-row gap-12" style={{ justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setUploadResult(null);
                          setUploadStage('IDLE');
                        }}
                        disabled={uploadStage === 'UPLOADING' || uploadStage === 'PROCESSING'}
                        style={{ height: '34px', fontSize: '12px' }}
                      >
                        Remove File
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileUpload();
                        }}
                        disabled={uploadStage === 'UPLOADING' || uploadStage === 'PROCESSING'}
                        style={{ height: '34px', fontSize: '12px' }}
                      >
                        {uploadStage === 'UPLOADING'
                          ? 'Uploading...'
                          : uploadStage === 'PROCESSING'
                          ? 'Extracting Signals...'
                          : 'Extract & Ingest Evidence'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ingestion Processing Stages Indicator */}
              {(uploadStage === 'UPLOADING' || uploadStage === 'PROCESSING') && (
                <div
                  style={{
                    marginTop: 'var(--space-16)',
                    padding: 'var(--space-14)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-8)' }}>
                    Processing Pipeline:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--text-xs)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success-text)' }}>
                      <CheckCircle size={14} /> 1. Uploaded payload to intake service
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: uploadStage === 'PROCESSING' ? 'var(--color-primary)' : 'var(--text-muted)',
                      }}
                    >
                      <RefreshCw size={14} className={uploadStage === 'PROCESSING' ? 'animate-spin' : ''} /> 2. Parsing document &amp; extracting progress signals
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <span style={{ width: '14px', textAlign: 'center' }}>&bull;</span> 3. Running deterministic WBS matching &amp; reconciliation
                    </div>
                  </div>
                </div>
              )}

              {/* Ingestion Results / Errors */}
              {uploadResult && (
                <div
                  style={{
                    marginTop: 'var(--space-16)',
                    padding: 'var(--space-12)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    background: uploadResult.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    border: `1px solid ${uploadResult.success ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    color: uploadResult.success ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: '4px' }}>
                    {uploadResult.title}
                  </div>
                  <div>{uploadResult.message}</div>
                  {uploadResult.details && (
                    <ul style={{ marginTop: '6px', paddingLeft: '16px' }}>
                      {uploadResult.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Workflow 2: Structured Field Update */}
          {captureMode === 'STRUCTURED' && (
            <div className="surface" style={{ padding: 'var(--space-24)', borderRadius: 'var(--radius-lg)', width: '100%' }}>
              <div style={{ marginBottom: 'var(--space-20)' }}>
                <h3 className="section-title">Structured Field Update</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Direct observations submitted by site engineers. Deterministically formatted and matched to schedule activities.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Row 1: Activity & Report Date */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>
                      Activity *
                    </label>
                    <select
                      className="input-field"
                      value={activityCode}
                      onChange={(e) => setActivityCode(e.target.value)}
                      required
                      style={{ height: '38px', width: '100%' }}
                    >
                      <option value="">Select Activity...</option>
                      {activities.map((a) => (
                        <option key={a.id} value={a.code}>
                          {a.code} &mdash; {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>
                      Report Date *
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      required
                      style={{ height: '38px', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Row 2: Observed Progress & Field Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>
                      Observed Progress (%) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input-field"
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
                      placeholder="e.g. 65"
                      required
                      style={{ height: '38px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>
                      Field Status
                    </label>
                    <select
                      className="input-field"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      style={{ height: '38px', width: '100%' }}
                    >
                      <option value="">Select Status...</option>
                      <option value="ON_TRACK">On Track</option>
                      <option value="DELAYED">Delayed</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Field Remarks / Observations */}
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>
                    Field Remarks / Observations
                  </label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '90px', padding: 'var(--space-12)', width: '100%', height: 'auto' }}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Earthwork hindered by waterlogging following heavy precipitation..."
                  />
                </div>

                {manualResult && (
                  <div
                    style={{
                      padding: 'var(--space-12)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      background: manualResult.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                      border: `1px solid ${manualResult.success ? 'var(--color-success)' : 'var(--color-danger)'}`,
                      color: manualResult.success ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {manualResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {manualResult.message}
                  </div>
                )}

                {/* Row 4: Submit Button */}
                <div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingManual || !activityCode || !progress}
                    style={{ height: '38px', padding: '0 20px', fontSize: '13px', fontWeight: 600 }}
                  >
                    {submittingManual ? 'Recording Evidence...' : 'Submit Execution Evidence'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REVIEW QUEUE */}
      {activeTab === 'review' && (
        <div className="flex-col gap-16">
          <ReviewQueue
            projectId={projectId}
            activities={activities}
            onEventResolved={() => {
              onDataChanged();
              fetchCounts();
            }}
          />
        </div>
      )}

      {/* TAB 3: RECONCILIATION QUEUE */}
      {activeTab === 'reconciliation' && (
        <div className="flex-col gap-16">
          <ReconciliationQueue
            projectId={projectId}
            activities={activities}
            onConflictResolved={() => {
              onDataChanged();
              fetchCounts();
            }}
          />
        </div>
      )}
    </div>
  );
};
