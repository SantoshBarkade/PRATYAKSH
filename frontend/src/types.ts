export type ActivityStatus = 'NOT_STARTED' | 'ON_TRACK' | 'DELAYED' | 'COMPLETED';
export type DependencyRisk = 'NONE' | 'AT_RISK' | 'POTENTIAL_RISK';
export type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DashboardSummary {
  totalActivities: number;
  completed: number;
  onTrack: number;
  atRisk: number;
  delayed: number;
  notStarted: number;
}

export interface RiskSummary {
  activeRiskCount: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  affectedActivityCount: number;
}

export interface ProjectActivity {
  id: string;
  code: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  plannedProgress: number;
  actualProgress: number;
  variance: number;
  status: ActivityStatus;
  dependencyRisk: DependencyRisk;
}

export interface ProjectDependency {
  source: string;
  target: string;
  relationship: string;
}

export interface ProjectRisk {
  id?: string;
  _id?: string;
  sourceActivityId?: string;
  activityId?: string;
  targetActivityId: string;
  severity: RiskSeverity;
  status: string;
  distance: number;
  path: string[];
  reason: string;
}

export interface ExecutionUpdate {
  id: string;
  _id?: string;
  activityId: string | null;
  extractedActivity: string | null;
  reportDate: string;
  actualProgress: number;
  matchingStatus: string | null;
  processingStatus: string;
  matchingDecision?: string;
  sourceType: string;
  rawText: string;
  extractedStatus: string | null;
  matchCandidates?: Array<{ activityId: string; activityCode: string; name: string; matchScore: number }>;
}

export interface DashboardPayload {
  project: {
    id: string;
    name: string;
    plannedStart: string;
    plannedEnd: string;
  };
  summary: DashboardSummary;
  dependencyRiskSummary: RiskSummary;
  activities: ProjectActivity[];
  dependencies: ProjectDependency[];
  risks: ProjectRisk[];
  recentExecutionUpdates: ExecutionUpdate[];
  graphWarnings: any[];
}

export interface ExplainabilityPoint {
  type: 'INFO' | 'MATH' | 'M4_CONSTRAINT' | 'EVIDENCE_POINT';
  message: string;
  formula?: string;
  predecessorId?: string;
  date?: string;
  progress?: number;
}

export interface ForecastResult {
  activityId: string;
  forecastedStartDate: string | null;
  forecastedEndDate: string | null;
  velocityPerDay: number | null;
  status: 'NOT_STARTED' | 'FORECASTED' | 'STALLED' | 'COMPLETED' | 'INSUFFICIENT_DATA';
  explanation: ExplainabilityPoint[];
}
