import { useEffect, useState } from 'react';
import { Activity as ActivityIcon, AlertCircle } from 'lucide-react';
import type { DashboardPayload } from './types';
import { CommandCenter } from './components/CommandCenter';
import { ScheduleWorkspace } from './components/ScheduleWorkspace';
import { DataIntakeWorkspace } from './components/DataIntakeWorkspace';
import { RisksForecastWorkspace } from './components/RisksForecastWorkspace';
import { ActivityDetailWorkspace } from './components/ActivityDetailWorkspace';
import { DemoGuideModal } from './components/DemoGuideModal';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { API_BASE } from './lib/api';
import './index.css';

function App() {
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);
  const [intakeTab, setIntakeTab] = useState<'capture' | 'review' | 'reconciliation'>('capture');

  const handleNavigateToView = (view: string, tab?: 'capture' | 'review' | 'reconciliation') => {
    setSelectedActivityId(null);
    if (tab) {
      setIntakeTab(tab);
    }
    setCurrentView(view);
  };

  const fetchProjects = async (newActiveProjectId?: string) => {
    try {
      const projectsRes = await fetch(`${API_BASE}/projects`);
      const projectsData = await projectsRes.json();
      if (projectsData.success && projectsData.data.length > 0) {
        const sanitized = projectsData.data.map((p: any) => ({
          ...p,
          name: p.name ? p.name.replace(/PRATYAKSH/gi, 'INFRA LINK') : '',
          description: p.description ? p.description.replace(/PRATYAKSH/gi, 'INFRA LINK') : ''
        }));
        setProjects(sanitized);
        if (newActiveProjectId) {
          setActiveProjectId(newActiveProjectId);
        } else if (!activeProjectId) {
          setActiveProjectId(sanitized[0]._id);
        }
      } else {
        setProjects([]);
        setActiveProjectId(null);
        setLoading(false);
      }
    } catch (err: any) {
      setError('Failed to fetch projects');
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    if (!activeProjectId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projects/${activeProjectId}/dashboard`);
      const data = await res.json();
      
      if (data.success) {
        if (data.data?.project?.name) {
          data.data.project.name = data.data.project.name.replace(/PRATYAKSH/gi, 'INFRA LINK');
        }
        setDashboardData(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let isActive = true;

    if (activeProjectId) {
      setDashboardData(null);
      setSelectedActivityId(null);
      
      // Inline fetch to avoid race condition
      setLoading(true);
      fetch(`${API_BASE}/projects/${activeProjectId}/dashboard`)
        .then(res => res.json())
        .then(data => {
          if (!isActive) return;
          if (data.success) {
            setDashboardData(data.data);
            setError(null);
          } else {
            setError(data.message || 'Failed to fetch dashboard');
          }
        })
        .catch(err => {
          if (!isActive) return;
          setError(err.message || 'Network error');
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });

      setCurrentView('dashboard');
    }

    return () => { isActive = false; };
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeProjectId]);

  const handleProjectCreated = (newId: string) => {
    fetchProjects(newId);
  };

  if (loading && !dashboardData && projects.length === 0) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <div className="pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <ActivityIcon size={48} color="var(--accent-primary)" />
          <h2>Initializing Command Center...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        currentView={currentView} 
        onViewChange={(v) => {
          setCurrentView(v);
          setSelectedActivityId(null);
        }} 
      />
      
      <div className="main-wrapper">
        <Header 
          currentView={currentView}
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectChange={(id) => {
            setActiveProjectId(id);
            setSelectedActivityId(null);
          }}
          onRefresh={fetchDashboard}
          onProjectCreated={handleProjectCreated}
          onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
          loading={loading}
        />
        
        <main className="content-area">
          {error && !dashboardData && (
             <div className="card" style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px' }}>
                <AlertCircle size={48} color="var(--status-danger)" style={{ marginBottom: '16px' }} />
                <h2 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>Unable to load project intelligence</h2>
                <p style={{ color: 'var(--text-secondary)' }}>We couldn't retrieve the latest project data. {error}</p>
                <button 
                  onClick={() => fetchProjects()}
                  className="btn btn-primary"
                  style={{ marginTop: '24px' }}
                >
                  Retry Connection
                </button>
             </div>
          )}

          {selectedActivityId && dashboardData ? (
            <ActivityDetailWorkspace
              projectId={activeProjectId!}
              activityId={selectedActivityId}
              activities={dashboardData.activities || []}
              previousViewName={
                currentView === 'dashboard'
                  ? 'Command Center'
                  : currentView === 'schedule'
                  ? 'Schedule & Activities'
                  : currentView === 'risks-forecast'
                  ? 'Risk & Forecast Intelligence'
                  : 'Workspace'
              }
              onBack={() => setSelectedActivityId(null)}
              onSelectActivity={(id) => setSelectedActivityId(id)}
            />
          ) : (
            <>
              {currentView === 'dashboard' && (
                <>
                  {dashboardData ? (
                    <CommandCenter 
                      projectId={activeProjectId!}
                      data={dashboardData}
                      loading={loading}
                      onRefresh={fetchDashboard}
                      selectedActivityId={selectedActivityId}
                      onSelectActivity={setSelectedActivityId}
                      onNavigateToView={handleNavigateToView}
                      onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
                    />
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Loading Project Intelligence...
                      </div>
                    </div>
                  )}
                </>
              )}

              {currentView === 'data-intake' && dashboardData && (
                <DataIntakeWorkspace 
                  projectId={activeProjectId || ''}
                  activities={dashboardData.activities || []}
                  onDataChanged={fetchDashboard}
                  initialTab={intakeTab}
                />
              )}

              {currentView === 'schedule' && dashboardData && (
                <ScheduleWorkspace 
                  projectId={activeProjectId!}
                  data={dashboardData} 
                  selectedActivityId={selectedActivityId} 
                  onSelectActivity={setSelectedActivityId}
                  onScheduleImported={() => {
                    fetchDashboard();
                  }}
                />
              )}

              {currentView === 'risks-forecast' && dashboardData && (
                <RisksForecastWorkspace 
                  projectId={activeProjectId!} 
                  activities={dashboardData.activities} 
                  selectedActivityId={selectedActivityId}
                  onSelectActivity={setSelectedActivityId}
                />
              )}
            </>
          )}

        </main>
      </div>

      <DemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id: string) => {
          setActiveProjectId(id);
        }}
        onNavigateToView={handleNavigateToView}
      />
    </div>
  );
}

export default App;
