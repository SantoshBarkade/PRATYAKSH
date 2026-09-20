import { Activity, IActivity } from '../models/Activity';
import { ExecutionUpdate } from '../models/ExecutionUpdate';
import { ActivityStatus } from '../types';

export class ProgressService {
  /**
   * Updates an Activity based on a matched ExecutionUpdate.
   * Maintains history order (only the latest report updates the current snapshot).
   */
  async processExecutionUpdate(activityId: string, executionUpdateId: string) {
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error(`Activity ${activityId} not found`);
    }

    const update = await ExecutionUpdate.findById(executionUpdateId);
    if (!update || update.progress === null || !update.reportDate) {
      return null; // Cannot process without progress or date
    }

    // 1. Determine if this is the latest valid snapshot for this activity
    // We query for any report that is newer (by reportDate, tie-breaking by createdAt)
    const newerReport = await ExecutionUpdate.findOne({
      projectId: activity.projectId,
      activityId: activity._id,
      progress: { $ne: null },
      reportDate: { $ne: null },
      $or: [
        { reportDate: { $gt: update.reportDate } },
        { 
          reportDate: update.reportDate,
          createdAt: { $gt: update.createdAt }
        }
      ]
    });

    if (newerReport) {
      // An out-of-order older report arrived. We store it but don't overwrite current state.
      return {
        activityUpdated: false,
        activityId: activity._id.toString(),
        activityCode: activity.activityCode,
        activityName: activity.name,
        message: 'Out-of-order report logged. Current activity state preserved.',
      };
    }

    // 2. Calculate planned progress at the report date
    const plannedAtDate = this.calculatePlannedProgress(activity.plannedStart, activity.plannedEnd, update.reportDate);

    // 3. Calculate variance
    const variance = update.progress - plannedAtDate;

    // 4. Calculate Activity Status
    const status = this.calculateActivityStatus(update.progress, plannedAtDate, update.reportDate, activity.plannedEnd);

    // 5. Update the Activity snapshot
    activity.actualProgress = update.progress;
    activity.activityStatus = status;

    // Actual Start / End Date logic
    if (update.progress > 0 && (!activity.actualStart || update.reportDate < activity.actualStart)) {
      activity.actualStart = update.reportDate;
    }
    if (update.progress >= 100 && (!activity.actualEnd || update.reportDate > activity.actualEnd)) {
      activity.actualEnd = update.reportDate;
    }

    await activity.save();

    return {
      activityUpdated: true,
      activityId: activity._id.toString(),
      activityCode: activity.activityCode,
      activityName: activity.name,
      plannedProgress: plannedAtDate,
      actualProgress: update.progress,
      variance,
      activityStatus: status,
      dependencyRisk: activity.dependencyRisk
    };
  }

  /**
   * Linear deterministic calculation of planned progress.
   */
  public calculatePlannedProgress(plannedStart: Date, plannedEnd: Date, reportDate: Date): number {
    const tStart = plannedStart.getTime();
    const tEnd = plannedEnd.getTime();
    const tReport = reportDate.getTime();

    if (tReport < tStart) return 0;
    if (tReport >= tEnd) return 100;

    const totalDuration = tEnd - tStart;
    if (totalDuration <= 0) return 100; // Zero duration task

    const elapsed = tReport - tStart;
    const progress = (elapsed / totalDuration) * 100;
    
    return Math.min(Math.max(Math.round(progress), 0), 100);
  }

  /**
   * Deterministic logic for activity status based on M3 specs.
   */
  public calculateActivityStatus(actual: number, planned: number, reportDate: Date, plannedEnd: Date): ActivityStatus {
    if (actual >= 100) return 'COMPLETED';
    if (reportDate.getTime() > plannedEnd.getTime() && actual < 100) return 'DELAYED';
    if (actual < planned) return 'DELAYED'; // Variance is negative inside window
    if (actual === 0) return 'NOT_STARTED';
    return 'ON_TRACK';
  }
}

export const progressService = new ProgressService();
