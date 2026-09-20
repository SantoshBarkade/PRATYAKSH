import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';
import type { DashboardPayload } from '../types';
import { ActivitiesWorkspace } from './ActivitiesWorkspace';
import { API_BASE } from '../lib/api';

interface ScheduleWorkspaceProps {
  projectId: string;
  data: DashboardPayload;
  selectedActivityId: string | null;
  onSelectActivity: (id: string | null) => void;
  onScheduleImported: () => void;
}

export const ScheduleWorkspace: React.FC<ScheduleWorkspaceProps> = ({
  projectId,
  data,
  selectedActivityId,
  onSelectActivity,
  onScheduleImported
}) => {
  const hasActivities = data.summary.totalActivities > 0;
  const [activeTab, setActiveTab] = useState<'list' | 'import'>(hasActivities ? 'list' : 'import');
  
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/schedule/upload`, {
        method: 'POST',
        body: formData
      });
      
      const resData = await res.json();
      if (resData.success) {
        setStatus('success');
        setResult(resData.data);
      } else {
        setStatus('error');
        setErrorMsg(resData.message || 'Upload failed');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Network error');
    }
  };

  return (
    <div className="flex-col" style={{ flex: 1, height: '100%', width: '100%' }}>
      <div className="page-container" style={{ paddingBottom: 0, paddingRight: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="flex-row justify-between items-center" style={{ marginBottom: 'var(--space-24)', paddingRight: 'var(--space-40)' }}>
          <div className="flex-col">
            <div className="page-eyebrow">Project Controls</div>
            <h1 className="page-title">Schedule & Activities</h1>
            <p className="page-description">
              Manage the project baseline and track execution progress.
            </p>
          </div>
          
          {hasActivities && (
            <div className="flex-row items-center" style={{ background: 'var(--bg-surface-subtle)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <button 
                onClick={() => setActiveTab('list')}
                className="btn"
                style={{ 
                  background: activeTab === 'list' ? 'var(--bg-surface)' : 'transparent', 
                  color: activeTab === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'list' ? 'var(--shadow-sm)' : 'none',
                  border: activeTab === 'list' ? '1px solid var(--border-light)' : '1px solid transparent',
                  height: '32px'
                }}
              >
                Schedule Register
              </button>
              <button 
                onClick={() => setActiveTab('import')}
                className="btn"
                style={{ 
                  background: activeTab === 'import' ? 'var(--bg-surface)' : 'transparent', 
                  color: activeTab === 'import' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'import' ? 'var(--shadow-sm)' : 'none',
                  border: activeTab === 'import' ? '1px solid var(--border-light)' : '1px solid transparent',
                  height: '32px'
                }}
              >
                Import Schedule
              </button>
            </div>
          )}
        </div>

        {activeTab === 'import' ? (
          <div className="surface" style={{ padding: 'var(--space-48)', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <h3 className="section-title">Import Baseline Schedule</h3>
            <p className="page-description" style={{ marginBottom: 'var(--space-24)' }}>Upload your project schedule (XLSX). This establishes the baseline activities, planned dates, and network dependencies.</p>
            
            <div 
              style={{ 
                border: '2px dashed var(--border-medium)', 
                borderRadius: 'var(--radius-md)', 
                padding: 'var(--space-48) var(--space-24)', 
                textAlign: 'center',
                background: 'var(--bg-surface-subtle)',
                marginBottom: 'var(--space-24)'
              }}
            >
              <FileSpreadsheet size={32} color="var(--text-muted)" style={{ marginBottom: 'var(--space-16)' }} />
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
              
              {file ? (
                <div>
                  <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>{(file.size / 1024).toFixed(1)} KB</div>
                  <button className="btn btn-secondary" style={{ marginTop: 'var(--space-16)' }} onClick={() => fileInputRef.current?.click()}>
                    Change File
                  </button>
                </div>
              ) : (
                <div>
                  <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud size={16} /> Select Schedule File
                  </button>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-12)' }}>
                    Supported formats: XLSX, XLS
                  </div>
                </div>
              )}
            </div>
            
            <button 
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center' }}
              disabled={!file || status === 'uploading'}
              onClick={handleUpload}
            >
              {status === 'uploading' ? 'Processing Schedule...' : 'Establish Baseline'}
            </button>

            {status === 'error' && (
              <div className="flex-row items-center" style={{ marginTop: 'var(--space-16)', padding: 'var(--space-12)', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', gap: '8px' }}>
                <AlertTriangle size={16} /> {errorMsg}
              </div>
            )}
            
            {status === 'success' && (
              <div className="flex-col" style={{ marginTop: 'var(--space-24)', padding: 'var(--space-16)', background: 'var(--color-success-soft)', color: 'var(--color-success-text)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex-row items-center" style={{ gap: '8px', fontWeight: 600, marginBottom: '8px' }}>
                  <CheckCircle size={16} /> Baseline Established Successfully
                </div>
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  Processed {result?.processedCount || 0} activities.
                </div>
                <button 
                  className="btn" 
                  style={{ marginTop: 'var(--space-12)', background: '#FFFFFF', color: 'var(--color-success-text)', border: '1px solid var(--color-success)' }}
                  onClick={() => {
                    onScheduleImported();
                    setActiveTab('list');
                  }}
                >
                  View Schedule Register
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`schedule-table-container invisible-scrollbar-x ${selectedActivityId ? 'schedule-drawer-active' : ''}`}>
            <ActivitiesWorkspace 
              activities={data.activities} 
              dependencies={data.dependencies}
              risks={data.risks}
              selectedActivityId={selectedActivityId} 
              onSelectActivity={onSelectActivity} 
            />
          </div>
        )}
      </div>
    </div>
  );
};
