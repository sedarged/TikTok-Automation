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
  const jobRequest: CreateJobRequest = {
    type: req.body.type || 'horror_video',
    prompt: req.body.prompt,
    story: req.body.story,
    options: req.body.options,
  };

  if (jobRequest.type !== 'horror_video') {
    throw new AppError(400, 'Only horror_video jobs are supported at the moment');
  }

  if (!jobRequest.prompt && !jobRequest.story) {
    throw new AppError(400, 'Provide either a prompt or a full story payload');
  }

  const job = jobQueue.createJob(jobRequest);

  logger.info('Job created via API', { jobId: job.id, type: jobRequest.type });

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
