import { Request, Response, NextFunction } from 'express';
import jobQueue from '../services/jobQueue';
import { hasNicheProfile, getAvailableNicheIds, getAllNicheProfiles } from '../config/nicheLoader';
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
 * List available niche profiles
 */
export const listNiches = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const niches = getAllNicheProfiles();
  
  res.json({
    success: true,
    data: {
      niches: niches.map(niche => ({
        id: niche.id,
        name: niche.name,
        description: niche.description,
      })),
    },
  });
});

/**
 * Creates a new video generation job
 */
export const createJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const jobRequest: CreateJobRequest = {
    type: req.body.type || 'video',
    nicheId: req.body.nicheId || req.body.niche,
    prompt: req.body.prompt,
    story: req.body.story,
    options: req.body.options,
  };

  // Validate nicheId if provided
  if (jobRequest.nicheId) {
    if (!hasNicheProfile(jobRequest.nicheId)) {
      const available = getAvailableNicheIds().join(', ');
      throw new AppError(
        400,
        `Unknown niche: "${jobRequest.nicheId}". Available niches: ${available}`
      );
    }
  } else {
    // Default to 'horror' for backward compatibility
    jobRequest.nicheId = 'horror';
    logger.info('No nicheId provided, defaulting to "horror"');
  }

  if (!jobRequest.prompt && !jobRequest.story) {
    throw new AppError(400, 'Provide either a prompt or a full story payload');
  }

  const job = jobQueue.createJob(jobRequest);

  logger.info('Job created via API', { 
    jobId: job.id, 
    type: jobRequest.type,
    nicheId: jobRequest.nicheId,
  });

  res.status(201).json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status,
      nicheId: jobRequest.nicheId,
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
