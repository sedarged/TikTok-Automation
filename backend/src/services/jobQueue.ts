import { JobStatus, JobStatusType } from '../types';
import logger from '../utils/logger';

/**
 * Simple in-memory job queue
 * TODO: Replace with persistent queue (Redis, BullMQ) for production
 */

interface JobData {
  id: string;
  type: string;
  status: JobStatusType;
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

class JobQueue {
  private jobs: Map<string, JobData> = new Map();

  /**
   * Creates a new job in the queue
   */
  createJob(type: string): JobStatus {
    const id = this.generateJobId();
    const now = new Date();

    const job: JobData = {
      id,
      type,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(id, job);
    logger.info('Job created', { jobId: id, type });

    return job;
  }

  /**
   * Gets a job by ID
   */
  getJob(id: string): JobStatus | null {
    const job = this.jobs.get(id);
    return job || null;
  }

  /**
   * Updates a job's status
   */
  updateJob(id: string, updates: Partial<JobData>): void {
    const job = this.jobs.get(id);
    if (!job) {
      logger.warn('Attempted to update non-existent job', { jobId: id });
      return;
    }

    Object.assign(job, updates, { updatedAt: new Date() });
    this.jobs.set(id, job);
    logger.info('Job updated', { jobId: id, status: job.status });
  }

  /**
   * Marks a job as completed
   */
  completeJob(id: string, result: any): void {
    this.updateJob(id, {
      status: 'completed',
      progress: 100,
      result,
      completedAt: new Date(),
    });
  }

  /**
   * Marks a job as failed
   */
  failJob(id: string, error: string): void {
    this.updateJob(id, {
      status: 'failed',
      error,
      completedAt: new Date(),
    });
  }

  /**
   * Generates a unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default new JobQueue();
