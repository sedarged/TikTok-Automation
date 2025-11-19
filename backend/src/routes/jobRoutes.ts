import { Router } from 'express';
import { createJob, getJobStatus } from '../controllers/jobController';

const router = Router();

/**
 * Create a new job
 * POST /jobs
 */
router.post('/jobs', createJob);

/**
 * Get job status
 * GET /jobs/:id
 */
router.get('/jobs/:id', getJobStatus);

export default router;
