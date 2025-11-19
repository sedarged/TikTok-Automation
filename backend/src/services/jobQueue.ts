import { CreateJobRequest, JobResultData, JobStatus } from '../types';
import logger from '../utils/logger';

interface JobData extends JobStatus {}

interface QueueItem {
  jobId: string;
  payload: JobPayload;
}

export interface JobPayload {
  request: CreateJobRequest;
}

type JobProcessor = (job: JobData, payload: JobPayload) => Promise<JobResultData>;

class JobQueue {
  private jobs: Map<string, JobData> = new Map();

  private queue: QueueItem[] = [];

  private processor?: JobProcessor;

  private processing = false;

  private processedCount = 0;

  private failedCount = 0;

  registerProcessor(processor: JobProcessor): void {
    this.processor = processor;
  }

  createJob(request: CreateJobRequest): JobStatus {
    const jobId = this.generateJobId();
    const now = new Date();
    const job: JobData = {
      id: jobId,
      type: request.type,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(jobId, job);
    this.queue.push({ jobId, payload: { request } });
    logger.info('Job queued', { jobId, type: request.type });
    void this.processNext();
    return job;
  }

  getJob(id: string): JobStatus | null {
    return this.jobs.get(id) || null;
  }

  updateJob(id: string, updates: Partial<JobData>): void {
    const job = this.jobs.get(id);
    if (!job) return;
    Object.assign(job, updates, { updatedAt: new Date() });
    this.jobs.set(id, job);
  }

  completeJob(id: string, result: JobResultData): void {
    this.processedCount += 1;
    this.updateJob(id, {
      status: 'completed',
      progress: 100,
      result,
      completedAt: new Date(),
    });
  }

  failJob(id: string, error: string): void {
    this.failedCount += 1;
    this.updateJob(id, {
      status: 'failed',
      error,
      completedAt: new Date(),
    });
  }

  registerProgress(id: string, progress: number, stage: string): void {
    this.updateJob(id, { progress });
    logger.info('Job progress update', { jobId: id, progress, stage });
  }

  getStats() {
    let running = 0;
    let completed = 0;
    let failed = 0;
    this.jobs.forEach(job => {
      if (job.status === 'running') running += 1;
      if (job.status === 'completed') completed += 1;
      if (job.status === 'failed') failed += 1;
    });

    return {
      total: this.jobs.size,
      completed,
      failed,
      running,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    };
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    if (!this.processor) {
      logger.warn('No job processor registered');
      return;
    }
    const next = this.queue.shift();
    if (!next) return;
    const job = this.jobs.get(next.jobId);
    if (!job) return;

    this.processing = true;
    this.updateJob(job.id, { status: 'running', progress: 5 });

    try {
      const result = await this.processor(job, next.payload);
      this.completeJob(job.id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Job failed', { jobId: job.id, error: message });
      this.failJob(job.id, message);
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        void this.processNext();
      }
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export default new JobQueue();
