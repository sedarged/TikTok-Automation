import { Router, Request, Response } from 'express';
import { HealthResponse } from '../types';
import config from '../config/config';
import jobQueue from '../services/jobQueue';
import { runCommand } from '../utils/command';

const router = Router();

const checkFfmpeg = async () => {
  try {
    const { stdout } = await runCommand('ffmpeg', ['-version']);
    return { available: true, version: stdout.split('\n')[0] };
  } catch (error) {
    return { available: false, version: (error as Error).message };
  }
};

router.get('/health', async (_req: Request, res: Response) => {
  const ffmpeg = await checkFfmpeg();
  const response: HealthResponse = {
    status: ffmpeg.available ? 'ok' : 'degraded',
    version: config.version,
    timestamp: new Date(),
    ffmpeg,
    jobs: jobQueue.getStats(),
  };

  res.json(response);
});

export default router;
