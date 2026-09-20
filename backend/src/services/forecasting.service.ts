import { Types } from 'mongoose';
import { Activity, IActivity } from '../models/Activity';
import { ExecutionUpdate, IExecutionUpdate } from '../models/ExecutionUpdate';
import { Dependency, IDependency } from '../models/Dependency';

export type ForecastStatus = 'INSUFFICIENT_DATA' | 'FORECASTED' | 'COMPLETED' | 'STALLED';

export interface ExplainabilityPoint {
  type: 'EVIDENCE_POINT' | 'MATH' | 'M4_CONSTRAINT' | 'INFO';
  message: string;
  date?: string;
  progress?: number;
  formula?: string;
  predecessorId?: string;
}

export interface ForecastResult {
  activityId: string;
  forecastedStartDate: Date | null;
  forecastedEndDate: Date | null;
  velocityPerDay: number | null;
  status: ForecastStatus;
  explanation: ExplainabilityPoint[];
}

export class ForecastingService {
  /**
   * Generates a forecast for a single activity.
   */
  static async getForecastForActivity(
    projectId: string | Types.ObjectId,
    activityId: string | Types.ObjectId
  ): Promise<ForecastResult> {
    const activities = await Activity.find({ projectId }).lean();
    const updates = await ExecutionUpdate.find({
      projectId,
      processingStatus: 'PROCESSED'
    }).sort({ logicalDate: 1 }).lean();
    const dependencies = await Dependency.find({ projectId }).lean();

    const result = this.calculateForecast(
      activityId.toString(),
      activities,
      updates,
      dependencies,
      new Set<string>()
    );

    return result;
  }

  /**
   * Generates forecasts for all activities in a project in an N+1 safe manner.
   */
  static async getProjectForecast(projectId: string | Types.ObjectId): Promise<ForecastResult[]> {
    const activities = await Activity.find({ projectId }).lean();
    const updates = await ExecutionUpdate.find({
      projectId,
      processingStatus: 'PROCESSED'
    }).sort({ logicalDate: 1 }).lean();
    const dependencies = await Dependency.find({ projectId }).lean();

    const results: ForecastResult[] = [];
    const memo = new Map<string, ForecastResult>();

    for (const activity of activities) {
      const actId = activity._id.toString();
      const res = this.calculateForecast(actId, activities, updates, dependencies, new Set<string>(), memo);
      results.push(res);
      memo.set(actId, res);
    }

    return results;
  }

  /**
   * Core forecasting logic. Recursively resolves predecessor forecasts if needed.
   */
  private static calculateForecast(
    activityId: string,
    allActivities: any[],
    allUpdates: any[],
    allDependencies: any[],
    visited: Set<string>,
    memo: Map<string, ForecastResult> = new Map()
  ): ForecastResult {
    if (memo.has(activityId)) {
      return memo.get(activityId)!;
    }

    const activity = allActivities.find((a) => a._id.toString() === activityId);
    if (!activity) {
      throw new Error(`Activity ${activityId} not found`);
    }

    // Cycle protection
    if (visited.has(activityId)) {
      return {
        activityId,
        forecastedStartDate: null,
        forecastedEndDate: null,
        velocityPerDay: null,
        status: 'INSUFFICIENT_DATA',
        explanation: [{ type: 'INFO', message: 'Cycle detected in dependency graph.' }]
      };
    }
    visited.add(activityId);

    const explanation: ExplainabilityPoint[] = [];

    // 1. Completed Activity
    if (activity.activityStatus === 'COMPLETED' || activity.actualProgress === 100) {
      explanation.push({
        type: 'INFO',
        message: `Activity mathematically reached 100% on ${activity.actualEnd ? activity.actualEnd.toISOString().split('T')[0] : 'unknown date'}.`
      });
      const result: ForecastResult = {
        activityId,
        forecastedStartDate: activity.actualStart || activity.plannedStart,
        forecastedEndDate: activity.actualEnd || activity.plannedEnd,
        velocityPerDay: null,
        status: 'COMPLETED',
        explanation
      };
      visited.delete(activityId);
      return result;
    }

    // Filter updates for this activity
    const myUpdates = allUpdates.filter((u) => u.activityId?.toString() === activityId);

    // Deduplicate by logicalDate, keeping the latest one inserted for that date (though usually there should just be one PROCESSED per date)
    // Since we sorted by logicalDate asc in DB, we can just reduce. If multiple same dates exist, the last one wins.
    const dedupedMap = new Map<string, any>();
    for (const u of myUpdates) {
      if (u.logicalDate && u.progress !== null && u.progress !== undefined) {
        dedupedMap.set(u.logicalDate, u);
      }
    }
    const validUpdates = Array.from(dedupedMap.values()).sort((a, b) => {
      return new Date(a.logicalDate).getTime() - new Date(b.logicalDate).getTime();
    });

    let velocityPerDay: number | null = null;
    let daysRemaining: number | null = null;
    let forecastEndDate: Date | null = null;
    let latestReferenceDate: Date | null = null;
    let hasInsufficientData = false;

    // 2. Velocity Calculation
    if (validUpdates.length >= 2) {
      const earliest = validUpdates[0];
      const latest = validUpdates[validUpdates.length - 1];

      // Check monotonicity
      let isMonotonic = true;
      for (let i = 1; i < validUpdates.length; i++) {
        if (validUpdates[i].progress < validUpdates[i - 1].progress) {
          isMonotonic = false;
          break;
        }
      }

      if (!isMonotonic) {
        hasInsufficientData = true;
        explanation.push({
          type: 'INFO',
          message: 'Historical evidence contradicts a monotonic forecast model (progress dipped).'
        });
      } else {
        const timeDiffMs = new Date(latest.logicalDate).getTime() - new Date(earliest.logicalDate).getTime();
        const daysDiff = timeDiffMs / (1000 * 60 * 60 * 24);

        if (daysDiff <= 0) {
          hasInsufficientData = true;
          explanation.push({
            type: 'INFO',
            message: 'Insufficient time elapsed between updates to calculate velocity.'
          });
        } else {
          velocityPerDay = (latest.progress - earliest.progress) / daysDiff;
          
          explanation.push({
            type: 'EVIDENCE_POINT',
            date: earliest.logicalDate,
            progress: earliest.progress,
            message: `Earliest valid progress: ${earliest.progress}% on ${earliest.logicalDate}`
          });
          explanation.push({
            type: 'EVIDENCE_POINT',
            date: latest.logicalDate,
            progress: latest.progress,
            message: `Latest valid progress: ${latest.progress}% on ${latest.logicalDate}`
          });
          explanation.push({
            type: 'MATH',
            formula: `(${latest.progress} - ${earliest.progress}) / ${daysDiff.toFixed(2)} days = ${velocityPerDay.toFixed(2)}%/day`,
            message: `Calculated execution velocity`
          });

          if (velocityPerDay === 0) {
            // STALLED
            explanation.push({
              type: 'INFO',
              message: 'Activity has 0 velocity. Forecasted completion is infinity.'
            });
          } else {
            const remainingProgress = 100 - latest.progress;
            daysRemaining = remainingProgress / velocityPerDay;
            latestReferenceDate = new Date(latest.logicalDate);
            
            // Start from the reference date (latest evidence date)
            forecastEndDate = new Date(latestReferenceDate.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
            
            explanation.push({
              type: 'MATH',
              formula: `${remainingProgress}% remaining / ${velocityPerDay.toFixed(2)}%/day = ${daysRemaining.toFixed(2)} days`,
              message: `Days remaining from reference date ${latest.logicalDate}`
            });
          }
        }
      }
    } else if (validUpdates.length === 1) {
      hasInsufficientData = true;
      explanation.push({
        type: 'INFO',
        message: 'Insufficient evidence (only 1 valid point). Cannot calculate velocity.'
      });
    } else {
      hasInsufficientData = true;
      explanation.push({
        type: 'INFO',
        message: 'No valid historical progress evidence found.'
      });
    }

    // 3. Not Started & Predecessor Topology
    let forecastStartDate: Date | null = activity.actualStart || activity.plannedStart;

    if (activity.activityStatus === 'NOT_STARTED' && activity.actualProgress === 0 && validUpdates.length === 0) {
      // Look at M4 Predecessors
      const predecessors = allDependencies.filter((d) => d.successorActivityId.toString() === activityId);
      
      let maxPredecessorEndDate: Date | null = null;
      let missingConstraint = false;

      for (const dep of predecessors) {
        const predId = dep.predecessorActivityId.toString();
        const predForecast = this.calculateForecast(predId, allActivities, allUpdates, allDependencies, visited, memo);
        
        if (predForecast.status === 'INSUFFICIENT_DATA') {
          missingConstraint = true;
          const isCycle = predForecast.explanation.some(e => e.message && e.message.includes('Cycle'));
          explanation.push({
            type: 'M4_CONSTRAINT',
            predecessorId: predId,
            message: isCycle 
              ? `Missing constraint: Cycle detected involving predecessor ${predId}.` 
              : `Missing constraint: Predecessor ${predId} lacks sufficient data to forecast end date.`
          });
        } else if (predForecast.status === 'STALLED') {
          missingConstraint = true;
          explanation.push({
            type: 'M4_CONSTRAINT',
            predecessorId: predId,
            message: `Missing constraint: Predecessor ${predId} is stalled.`
          });
        } else if (predForecast.forecastedEndDate) {
          if (!maxPredecessorEndDate || predForecast.forecastedEndDate > maxPredecessorEndDate) {
            maxPredecessorEndDate = predForecast.forecastedEndDate;
          }
        }
      }

      if (missingConstraint) {
        // Can't push start reliably if we are missing constraints
        // Wait, M8 requirement 9: "Predecessor with insufficient forecast data: explicitly report the missing constraint rather than inventing a date."
      } else if (maxPredecessorEndDate) {
        // If our planned start is earlier than max predecessor end, we must push out
        if (new Date(activity.plannedStart).getTime() < maxPredecessorEndDate.getTime()) {
          forecastStartDate = maxPredecessorEndDate;
          explanation.push({
            type: 'M4_CONSTRAINT',
            message: `Forecasted start date pushed to ${maxPredecessorEndDate.toISOString().split('T')[0]} by predecessor constraint.`
          });
        }
      }
    }

    let status: ForecastStatus = 'FORECASTED';
    if (hasInsufficientData) {
      status = 'INSUFFICIENT_DATA';
    } else if (velocityPerDay === 0) {
      status = 'STALLED';
    }

    // If activity has delayed forecast end date
    if (status === 'FORECASTED' && forecastEndDate && forecastEndDate.getTime() > new Date(activity.plannedEnd).getTime()) {
      const delayDays = (forecastEndDate.getTime() - new Date(activity.plannedEnd).getTime()) / (1000 * 60 * 60 * 24);
      explanation.push({
        type: 'INFO',
        message: `Progressing at ${velocityPerDay?.toFixed(2)}% per day. Remaining requires ${daysRemaining?.toFixed(2)} days, pushing completion past baseline by ${delayDays.toFixed(2)} days.`
      });
    }

    const result: ForecastResult = {
      activityId,
      forecastedStartDate: forecastStartDate,
      forecastedEndDate: status === 'FORECASTED' ? forecastEndDate : null,
      velocityPerDay: status === 'INSUFFICIENT_DATA' ? null : velocityPerDay,
      status,
      explanation
    };

    visited.delete(activityId);
    return result;
  }
}
