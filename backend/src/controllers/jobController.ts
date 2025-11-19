import { Request, Response, NextFunction } from 'express';
import jobQueue from '../services/jobQueue';
import { CreateJobRequest } from '../types';
import logger from '../utils/logger';
import { AppError } from '../utils/errorHandler';

/**
 * Job controller - handles job creation and status requests
 */

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Creates a new video generation job
 */
export const createJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const jobRequest: CreateJobRequest = req.body;

  // Validate request
  if (!jobRequest.type) {
    throw new AppError(400, 'Job type is required');
  }

  // Create job in queue
  const job = jobQueue.createJob(jobRequest.type);

  logger.info('Job created via API', { jobId: job.id, type: jobRequest.type });

  // TODO: Start actual job processing
  // - Queue job for background processing
  // - Trigger story generation workflow
  // - Return immediately with job ID
  
  res.status(201).json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    },
  });
});

/**
 * Gets the status of a job
 */
export const getJobStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const job = jobQueue.getJob(id);

  if (!job) {
    throw new AppError(404, 'Job not found');
  }

  res.json({
    success: true,
    data: job,
  });
});
