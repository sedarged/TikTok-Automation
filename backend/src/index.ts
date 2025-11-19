import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from './config/config';
import healthRoutes from './routes/healthRoutes';
import jobRoutes from './routes/jobRoutes';
import { errorHandler } from './utils/errorHandler';
import logger from './utils/logger';
import { initializeJobPipeline } from './services/pipelineService';

/**
 * Initialize and configure Express application
 */
const createApp = (): Express => {
  initializeJobPipeline();
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });

  // Routes
  app.use('/', healthRoutes);
  app.use('/', jobRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found',
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Start the server
 */
const startServer = (): void => {
  const app = createApp();

  app.listen(config.port, () => {
    logger.info('Server started', {
      port: config.port,
      env: process.env.NODE_ENV || 'development',
    });
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
  });
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export for testing
export { createApp, startServer };
export default createApp;
