import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { Activity } from '../models/Activity';
import { Dependency } from '../models/Dependency';
import { Risk } from '../models/Risk';
import { ExecutionUpdate } from '../models/ExecutionUpdate';

export class DashboardService {
  /**
   * Generates a comprehensive, read-only dashboard snapshot for a project.
   */
  async getProjectDashboard(projectId: string) {
    const pid = new Types.ObjectId(projectId);

    // 1. Fetch Project Details
    const project = await Project.findById(pid).lean();
    if (!project) {
      throw new Error('Project not found');
    }

    // 2. Fetch all Activities (Nodes)
    const activities = await Activity.find({ projectId: pid }).lean();

    // 3. Aggregate Activity Summary
    const activitySummary = {
      totalActivities: activities.length,
      completed: 0,
      onTrack: 0,
      atRisk: 0,
      delayed: 0,
      notStarted: 0,
    };

    const dashboardActivities = activities.map(act => {
      // Tally status
      switch (act.activityStatus) {
        case 'COMPLETED': activitySummary.completed++; break;
        case 'ON_TRACK': activitySummary.onTrack++; break;
        case 'DELAYED': activitySummary.delayed++; break;
        case 'NOT_STARTED': activitySummary.notStarted++; break;
      }

      // Format for dashboard
      return {
        id: act._id.toString(),
        code: act.activityCode,
        name: act.name,
        plannedStart: act.plannedStart,
        plannedEnd: act.plannedEnd,
        actualStart: act.actualStart,
        actualEnd: act.actualEnd,
        plannedProgress: act.plannedProgress,
        actualProgress: act.actualProgress,
        variance: act.actualProgress - act.plannedProgress,
        status: act.activityStatus,
        dependencyRisk: act.dependencyRisk,
      };
    });

    // 4. Fetch Dependencies (Edges)
    const dependencies = await Dependency.find({ projectId: pid }).lean();
    const dashboardDependencies = dependencies.map(dep => ({
      source: dep.predecessorActivityId.toString(),
      target: dep.successorActivityId.toString(),
      relationship: dep.relationship,
    }));

    // 5. Fetch Open Risks
    const openRisks = await Risk.find({ projectId: pid, status: 'OPEN' })
      .sort({ severity: 1, distance: 1 }) // HIGH -> LOW, shortest distance
      .lean();

    // 6. Aggregate Risk Summary
    const riskSummary = {
      activeRiskCount: openRisks.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      affectedActivityCount: new Set(openRisks.map(r => r.targetActivityId.toString())).size,
    };

    const dashboardRisks = openRisks.map(risk => {
      // Tally severity
      switch (risk.severity) {
        case 'HIGH': riskSummary.high++; break;
        case 'MEDIUM': riskSummary.medium++; break;
        case 'LOW': riskSummary.low++; break;
      }

      return {
        id: risk._id.toString(),
        sourceActivityId: risk.activityId.toString(),
        targetActivityId: risk.targetActivityId.toString(),
        severity: risk.severity,
        status: risk.status,
        distance: risk.distance,
        path: risk.path,
        reason: risk.reason,
        sourceStatus: risk.sourceActivityStatus || null,
        sourceVariance: risk.sourceVariance || null,
        sourceActualProgress: risk.sourceActualProgress || null,
        sourcePlannedProgress: risk.sourcePlannedProgressAtReportDate || null,
        sourceReportDate: risk.sourceReportDate || null,
      };
    });

    // 7. Fetch Recent Execution Updates
    const updates = await ExecutionUpdate.find({ projectId: pid })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const recentExecutionUpdates = updates.map(update => ({
      id: update._id.toString(),
      activityId: update.activityId?.toString() || null,
      extractedActivity: update.extractedActivity,
      reportDate: update.reportDate,
      actualProgress: update.progress,
      matchingStatus: update.matchingDecision,
      processingStatus: update.processingStatus,
      sourceType: update.sourceType,
    }));

    return {
      project: {
        id: project._id.toString(),
        name: project.name,
        plannedStart: project.plannedStartDate,
        plannedEnd: project.plannedEndDate,
      },
      summary: activitySummary,
      dependencyRiskSummary: riskSummary,
      activities: dashboardActivities,
      dependencies: dashboardDependencies,
      risks: dashboardRisks,
      recentExecutionUpdates,
      graphWarnings: [], 
    };
  }
}

export const dashboardService = new DashboardService();
