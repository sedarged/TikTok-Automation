import { Router, Request, Response } from 'express';
import { HealthResponse } from '../types';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date(),
  };

  res.json(response);
});

export default router;
