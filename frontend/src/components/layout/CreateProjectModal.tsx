import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../lib/api';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProjectId: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setOrganization('');
      setDescription('');
      setPlannedStartDate('');
      setPlannedEndDate('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !organization.trim() || !plannedStartDate || !plannedEndDate) {
      setError('Please fill in all required fields.');
      return;
    }
    
    if (new Date(plannedEndDate) < new Date(plannedStartDate)) {
      setError('Planned end date must be on or after the planned start date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          organization: organization.trim(),
          description: description.trim(),
          plannedStartDate,
          plannedEndDate
        })
      });

      const data = await res.json();
      
      if (data.success && data.data) {
        onSuccess(data.data._id);
      } else {
        setError(data.message || data.error || 'Unable to create project. Please check the details and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--space-16)'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-modal-title"
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 10px 15px -5px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 id="create-project-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Create New Project
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Start a new infrastructure project and define its baseline.
            </span>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              margin: '-6px -6px 0 0',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(90vh - 150px)', backgroundColor: '#FFFFFF' }}>
            
            {error && (
              <div style={{ 
                padding: '12px 14px', 
                backgroundColor: 'var(--color-danger-bg)', 
                border: '1px solid var(--color-danger)', 
                borderRadius: 'var(--radius-md)', 
                display: 'flex',
                gap: '10px', 
                alignItems: 'center' 
              }}>
                <AlertCircle size={16} color="var(--color-danger-text)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-danger-text)' }}>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Project Name <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input 
                type="text" 
                className="input-field"
                placeholder="e.g. Pune Metro Phase 2" 
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                required
                style={{ height: '38px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Organization <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input 
                type="text" 
                className="input-field"
                placeholder="e.g. MMRDA" 
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                required
                style={{ height: '38px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Description
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Optional</span>
              </div>
              <textarea 
                className="input-field"
                placeholder="Briefly describe the infrastructure project..." 
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ minHeight: '84px', height: 'auto', padding: '8px 12px', resize: 'vertical', lineHeight: '1.5' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Planned Start <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input 
                  type="date" 
                  className="input-field"
                  value={plannedStartDate}
                  onChange={e => setPlannedStartDate(e.target.value)}
                  required
                  style={{ height: '38px', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Planned End <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input 
                  type="date" 
                  className="input-field"
                  value={plannedEndDate}
                  onChange={e => setPlannedEndDate(e.target.value)}
                  required
                  style={{ height: '38px', width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-surface-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ height: '36px', fontSize: '13px', padding: '0 16px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ height: '36px', fontSize: '13px', padding: '0 18px', fontWeight: 600 }}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />
    </div>
  );
};
