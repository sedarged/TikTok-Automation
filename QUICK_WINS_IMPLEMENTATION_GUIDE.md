# Quick Wins Implementation Guide

This guide provides ready-to-implement code for the highest-priority recommendations from the comprehensive audit.

## Table of Contents
1. [API Authentication & Rate Limiting](#1-api-authentication--rate-limiting)
2. [BullMQ Job Queue Migration](#2-bullmq-job-queue-migration)
3. [Pexels Stock Media Integration](#3-pexels-stock-media-integration)
4. [TikTok Publishing Setup](#4-tiktok-publishing-setup)
5. [Docker Containerization](#5-docker-containerization)
6. [New Niche Profiles](#6-new-niche-profiles)

---

## 1. API Authentication & Rate Limiting

### Step 1: Install Dependencies
```bash
cd backend
npm install express-rate-limit uuid
npm install --save-dev @types/uuid
```

### Step 2: Create Auth Middleware

**File: `backend/src/middleware/auth.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Simple API key store (replace with database in production)
const validApiKeys = new Map<string, { userId: string; quota: number; usedQuota: number }>();

// Initialize with a default API key for development
validApiKeys.set('dev_key_12345', {
  userId: 'dev_user',
  quota: 100,
  usedQuota: 0
});

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    apiKey: string;
    quota: number;
    usedQuota: number;
  };
}

export const apiKeyAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    logger.warn('Request without API key', { path: req.path, ip: req.ip });
    return res.status(401).json({
      status: 'error',
      message: 'API key required. Include X-API-Key header.'
    });
  }

  const keyData = validApiKeys.get(apiKey);
  
  if (!keyData) {
    logger.warn('Invalid API key attempt', { apiKey: apiKey.substring(0, 8) + '...', ip: req.ip });
    return res.status(401).json({
      status: 'error',
      message: 'Invalid API key'
    });
  }

  // Check quota
  if (keyData.usedQuota >= keyData.quota) {
    logger.warn('Quota exceeded', { userId: keyData.userId });
    return res.status(429).json({
      status: 'error',
      message: 'Quota exceeded',
      quota: keyData.quota,
      used: keyData.usedQuota
    });
  }

  req.user = {
    userId: keyData.userId,
    apiKey,
    quota: keyData.quota,
    usedQuota: keyData.usedQuota
  };

  next();
};

export const incrementQuota = (apiKey: string) => {
  const keyData = validApiKeys.get(apiKey);
  if (keyData) {
    keyData.usedQuota++;
  }
};

// Helper to generate new API keys (for admin use)
export const generateApiKey = (userId: string, quota: number = 100): string => {
  const apiKey = `tk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  validApiKeys.set(apiKey, { userId, quota, usedQuota: 0 });
  return apiKey;
};
```

### Step 3: Create Rate Limiter

**File: `backend/src/middleware/rateLimiter.ts`**
```typescript
import rateLimit from 'express-rate-limit';

export const jobCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 job creations per 15-minute window per IP
  message: {
    status: 'error',
    message: 'Too many job requests from this IP. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key if available, otherwise IP
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  }
});

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    status: 'error',
    message: 'Too many requests. Please slow down.'
  }
});
```

### Step 4: Update Routes

**File: `backend/src/routes/jobRoutes.ts`**
```typescript
import { Router } from 'express';
import { createJob, getJobStatus } from '../controllers/jobController';
import { apiKeyAuth } from '../middleware/auth';
import { jobCreationLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and rate limiting
router.post('/', apiKeyAuth, jobCreationLimiter, createJob);
router.get('/:id', apiKeyAuth, getJobStatus);

export default router;
```

### Step 5: Update .env.example

```bash
# Authentication
DEFAULT_API_KEY=dev_key_12345
API_KEY_QUOTA_LIMIT=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10
```

---

## 2. BullMQ Job Queue Migration

### Step 1: Install Dependencies
```bash
cd backend
npm install bullmq ioredis
npm install --save-dev @bull-board/express @bull-board/api
```

### Step 2: Create Queue Configuration

**File: `backend/src/config/queue.ts`**
```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Create job queue
export const videoJobQueue = new Queue('video-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
});

// Queue events for monitoring
const queueEvents = new QueueEvents('video-jobs', { connection });

queueEvents.on('completed', ({ jobId }) => {
  logger.info('Job completed', { jobId });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Job failed', { jobId, failedReason });
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.info('Job progress', { jobId, progress: data });
});

export { connection };
```

### Step 3: Create Worker

**File: `backend/src/workers/videoWorker.ts`**
```typescript
import { Worker, Job } from 'bullmq';
import { connection } from '../config/queue';
import { pipelineService } from '../services/pipelineService';
import { logger } from '../utils/logger';
import { JobRequest } from '../types';

export const videoWorker = new Worker(
  'video-jobs',
  async (job: Job<JobRequest>) => {
    logger.info('Processing job', { jobId: job.id, data: job.data });

    try {
      // Update progress callback
      const updateProgress = async (progress: number, stage: string) => {
        await job.updateProgress(progress);
        logger.info('Job progress', { jobId: job.id, progress, stage });
      };

      // Run pipeline
      const result = await pipelineService.runPipeline(
        job.id!,
        job.data.type,
        job.data.prompt,
        job.data.story,
        job.data.nicheId,
        job.data.options,
        updateProgress
      );

      return result;
    } catch (error) {
      logger.error('Job processing failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 jobs concurrently
    limiter: {
      max: 10,
      duration: 60000 // Max 10 jobs per minute
    }
  }
);

videoWorker.on('completed', (job) => {
  logger.info('Worker completed job', { jobId: job.id });
});

videoWorker.on('failed', (job, err) => {
  logger.error('Worker failed job', {
    jobId: job?.id,
    error: err.message
  });
});
```

### Step 4: Update Job Controller

**File: `backend/src/controllers/jobController.ts`** (modifications)
```typescript
import { videoJobQueue } from '../config/queue';

export const createJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, prompt, story, nicheId, options } = req.body;

    // Add job to queue
    const job = await videoJobQueue.add('create-video', {
      type,
      prompt,
      story,
      nicheId: nicheId || 'horror',
      options,
      userId: req.user?.userId
    }, {
      jobId: `job_${Date.now()}_${Math.random().toString(36).substring(7)}`
    });

    logger.info('Job queued', { jobId: job.id, type, userId: req.user?.userId });

    res.status(201).json({
      success: true,
      data: {
        jobId: job.id,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to create job', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create job'
    });
  }
};

export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await videoJobQueue.getJob(id);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;

    res.json({
      success: true,
      data: {
        id: job.id,
        status: state,
        progress,
        result: state === 'completed' ? result : undefined,
        createdAt: new Date(job.timestamp).toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get job status', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get job status'
    });
  }
};
```

### Step 5: Start Worker in Separate Process

**File: `backend/src/worker.ts`**
```typescript
import 'dotenv/config';
import { videoWorker } from './workers/videoWorker';
import { logger } from './utils/logger';

logger.info('Starting video worker...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await videoWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker...');
  await videoWorker.close();
  process.exit(0);
});
```

**Update package.json:**
```json
{
  "scripts": {
    "worker": "ts-node src/worker.ts",
    "worker:dev": "ts-node-dev --respawn src/worker.ts"
  }
}
```

---

## 3. Pexels Stock Media Integration

### Step 1: Install Dependencies
```bash
cd backend
npm install pexels
npm install --save-dev @types/pexels
```

### Step 2: Get Pexels API Key
1. Go to https://www.pexels.com/api/
2. Sign up and get your API key
3. Add to `.env`: `PEXELS_API_KEY=your_key_here`

### Step 3: Create Pexels Client

**File: `backend/src/clients/pexelsClient.ts`**
```typescript
import { createClient, Videos, Photos } from 'pexels';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export class PexelsClient {
  private client: ReturnType<typeof createClient>;

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
  }

  async searchVideos(query: string, orientation: 'portrait' | 'landscape' = 'portrait') {
    try {
      const result = await this.client.videos.search({
        query,
        orientation,
        per_page: 5
      }) as { videos: Videos[] };

      logger.info('Pexels video search', { query, count: result.videos.length });
      return result.videos;
    } catch (error) {
      logger.error('Pexels video search failed', { query, error });
      throw error;
    }
  }

  async searchPhotos(query: string, orientation: 'portrait' | 'landscape' = 'portrait') {
    try {
      const result = await this.client.photos.search({
        query,
        orientation,
        per_page: 5
      }) as { photos: Photos[] };

      logger.info('Pexels photo search', { query, count: result.photos.length });
      return result.photos;
    } catch (error) {
      logger.error('Pexels photo search failed', { query, error });
      throw error;
    }
  }

  async downloadMedia(url: string, outputPath: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
      
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
      
      logger.info('Media downloaded', { outputPath });
      return outputPath;
    } catch (error) {
      logger.error('Media download failed', { url, error });
      throw error;
    }
  }

  async getVideoForScene(scene: any, outputDir: string): Promise<string> {
    const videos = await this.searchVideos(scene.imagePrompt);
    
    if (videos.length === 0) {
      throw new Error('No videos found for query');
    }

    // Get the highest quality portrait video
    const video = videos[0];
    const videoFile = video.video_files.find(
      (f: any) => f.width === 1080 && f.height === 1920
    ) || video.video_files[0];

    const outputPath = path.join(outputDir, `scene_${scene.id}.mp4`);
    return await this.downloadMedia(videoFile.link, outputPath);
  }
}

// Singleton instance
let pexelsClient: PexelsClient | null = null;

export const getPexelsClient = (): PexelsClient => {
  if (!pexelsClient && process.env.PEXELS_API_KEY) {
    pexelsClient = new PexelsClient(process.env.PEXELS_API_KEY);
  }
  if (!pexelsClient) {
    throw new Error('Pexels client not initialized - PEXELS_API_KEY required');
  }
  return pexelsClient;
};
```

### Step 4: Update Visual Service

**File: `backend/src/services/visualService.ts`** (add option for video)
```typescript
import { getPexelsClient } from '../clients/pexelsClient';

export const visualService = {
  async generateSceneVisuals(scenes: Scene[], nicheId: string): Promise<SceneVisual[]> {
    const profile = getNicheProfile(nicheId);
    const useVideo = profile.visual?.preferVideo || false;

    if (useVideo && process.env.PEXELS_API_KEY) {
      return await this.generateVideoVisuals(scenes, nicheId);
    }
    return await this.generateImageVisuals(scenes, nicheId);
  },

  async generateVideoVisuals(scenes: Scene[], nicheId: string): Promise<SceneVisual[]> {
    const pexels = getPexelsClient();
    const outputDir = config.assetsDir;

    const visuals = await Promise.all(
      scenes.map(async (scene) => {
        try {
          const videoPath = await pexels.getVideoForScene(scene, outputDir);
          return {
            sceneId: scene.id,
            type: 'video' as const,
            path: videoPath
          };
        } catch (error) {
          logger.warn('Failed to get Pexels video, falling back to image', {
            sceneId: scene.id,
            error
          });
          // Fallback to generated image
          return await this.generateSingleImage(scene, nicheId);
        }
      })
    );

    return visuals;
  }
};
```

---

## 4. TikTok Publishing Setup

### Step 1: Create TikTok Publisher Service

**File: `backend/src/services/tiktokPublisher.ts`**
```typescript
import { logger } from '../utils/logger';
import FormData from 'form-data';
import fs from 'fs';

interface TikTokPublishOptions {
  title: string;
  description: string;
  hashtags: string[];
  privacyLevel: 'PUBLIC' | 'MUTUAL_FOLLOW' | 'SELF_ONLY';
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
}

export class TikTokPublisher {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async initializeUpload() {
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: 0, // Will be updated
          chunk_size: 10485760, // 10MB chunks
          total_chunk_count: 1
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize upload: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.upload_id;
  }

  async uploadVideo(videoPath: string, uploadId: string) {
    const fileBuffer = fs.readFileSync(videoPath);
    
    const formData = new FormData();
    formData.append('video', fileBuffer, {
      filename: 'video.mp4',
      contentType: 'video/mp4'
    });

    const response = await fetch(
      `https://open.tiktokapis.com/v2/post/publish/inbox/video/upload/?upload_id=${uploadId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          ...formData.getHeaders()
        },
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to upload video: ${response.statusText}`);
    }

    return await response.json();
  }

  async publishVideo(uploadId: string, options: TikTokPublishOptions) {
    const caption = `${options.title}\n\n${options.description}\n\n${options.hashtags.join(' ')}`;

    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        post_info: {
          title: options.title,
          privacy_level: options.privacyLevel,
          disable_comment: !options.allowComments,
          disable_duet: !options.allowDuet,
          disable_stitch: !options.allowStitch,
          video_cover_timestamp_ms: 1000
        },
        source_info: {
          source: 'FILE_UPLOAD',
          upload_id: uploadId
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to publish video: ${response.statusText}`);
    }

    const data = await response.json();
    logger.info('Video published to TikTok', { publishId: data.data.publish_id });
    return data;
  }

  async publishVideoComplete(videoPath: string, options: TikTokPublishOptions) {
    try {
      // Step 1: Initialize upload
      const uploadId = await this.initializeUpload();
      logger.info('TikTok upload initialized', { uploadId });

      // Step 2: Upload video
      await this.uploadVideo(videoPath, uploadId);
      logger.info('Video uploaded to TikTok', { uploadId });

      // Step 3: Publish
      const result = await this.publishVideo(uploadId, options);
      logger.info('Video publishing initiated', { result });

      return result;
    } catch (error) {
      logger.error('TikTok publishing failed', { error });
      throw error;
    }
  }
}

// Note: You'll need to implement OAuth flow separately
// See: https://developers.tiktok.com/doc/login-kit-web/
```

**File: `backend/src/routes/publishRoutes.ts`**
```typescript
import { Router } from 'express';
import { TikTokPublisher } from '../services/tiktokPublisher';
import { apiKeyAuth } from '../middleware/auth';

const router = Router();

router.post('/tiktok', apiKeyAuth, async (req, res) => {
  try {
    const { videoPath, title, description, hashtags, accessToken } = req.body;

    const publisher = new TikTokPublisher(accessToken);
    
    const result = await publisher.publishVideoComplete(videoPath, {
      title,
      description,
      hashtags,
      privacyLevel: 'PUBLIC',
      allowComments: true,
      allowDuet: true,
      allowStitch: true
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Publishing failed'
    });
  }
});

export default router;
```

---

## 5. Docker Containerization

### Create Dockerfile

**File: `backend/Dockerfile`**
```dockerfile
FROM node:20-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["npm", "start"]
```

**File: `web/Dockerfile`**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**File: `web/nginx.conf`**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Compose

**File: `docker-compose.yml`**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PEXELS_API_KEY=${PEXELS_API_KEY}
    depends_on:
      - redis
    volumes:
      - ./backend/output:/app/output
      - ./backend/assets:/app/assets
    restart: unless-stopped

  worker:
    build: ./backend
    command: npm run worker
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PEXELS_API_KEY=${PEXELS_API_KEY}
    depends_on:
      - redis
    volumes:
      - ./backend/output:/app/output
      - ./backend/assets:/app/assets
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  web:
    build: ./web
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  redis_data:
```

### Usage

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## 6. New Niche Profiles

### Add to `backend/src/config/niches.ts`

```typescript
export const NICHE_PROFILES: Record<string, NicheProfile> = {
  // ... existing niches ...

  motivation: {
    id: 'motivation',
    name: 'Motivational & Inspirational',
    description: 'Uplifting quotes and success stories',
    style: {
      tone: 'uplifting, energetic, empowering, inspiring',
      structure: 'hook → relatable struggle → transformation → call-to-action',
      wordCount: {
        min: 100,
        max: 150
      },
      hook: 'Start with relatable struggle or question',
      ending: 'End with empowering call-to-action'
    },
    voice: {
      provider: 'openai',
      voiceId: 'nova',
      speed: 1.1,
      model: 'tts-1'
    },
    visual: {
      style: 'bright, energetic, success imagery, mountain peaks, sunrise, achievement',
      imageSize: '1024x1792',
      mode: 'standard',
      preferVideo: true
    },
    captions: {
      fontFamily: 'Impact',
      fontSize: 72,
      fontColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 3,
      position: 'center',
      highlightKeywords: true
    },
    music: {
      genre: 'uplifting, energetic, inspiring',
      volume: 0.2,
      enabled: true
    },
    hashtags: ['#motivation', '#success', '#inspiration', '#mindset', '#grind', '#hustle'],
    metadata: {
      duration: { min: 30, max: 60 },
      numberOfScenes: { min: 3, max: 4 }
    }
  },

  true_crime: {
    id: 'true_crime',
    name: 'True Crime Stories',
    description: 'Mysterious unsolved cases and crime stories',
    style: {
      tone: 'mysterious, investigative, suspenseful, factual',
      structure: 'hook → backstory → crime details → mystery/twist',
      wordCount: {
        min: 150,
        max: 200
      },
      hook: 'Start with shocking fact or mysterious question',
      ending: 'End with unresolved mystery or chilling detail'
    },
    voice: {
      provider: 'openai',
      voiceId: 'onyx',
      speed: 0.95,
      model: 'tts-1'
    },
    visual: {
      style: 'dark, cinematic, crime scene, investigation, noir lighting, documentary style',
      imageSize: '1024x1792',
      mode: 'standard',
      preferVideo: true
    },
    captions: {
      fontFamily: 'Arial',
      fontSize: 64,
      fontColor: '#FFFFFF',
      strokeColor: '#8B0000',
      strokeWidth: 2,
      position: 'bottom',
      highlightKeywords: true
    },
    music: {
      genre: 'dark ambient, suspenseful, crime documentary',
      volume: 0.15,
      enabled: true
    },
    hashtags: ['#truecrime', '#mystery', '#unsolved', '#crimestory', '#investigation'],
    metadata: {
      duration: { min: 45, max: 75 },
      numberOfScenes: { min: 4, max: 5 }
    }
  },

  business: {
    id: 'business',
    name: 'Business & Startup Tips',
    description: 'Quick business insights and startup advice',
    style: {
      tone: 'professional, informative, actionable, confident',
      structure: 'problem → solution → actionable steps → results',
      wordCount: {
        min: 120,
        max: 160
      },
      hook: 'Start with relatable business problem',
      ending: 'End with clear action step'
    },
    voice: {
      provider: 'openai',
      voiceId: 'echo',
      speed: 1.05,
      model: 'tts-1'
    },
    visual: {
      style: 'professional, office, technology, graphs, success, modern workspace',
      imageSize: '1024x1792',
      mode: 'standard',
      preferVideo: true
    },
    captions: {
      fontFamily: 'Helvetica',
      fontSize: 68,
      fontColor: '#FFFFFF',
      strokeColor: '#1E40AF',
      strokeWidth: 2,
      position: 'center',
      highlightKeywords: true
    },
    music: {
      genre: 'corporate, upbeat, professional',
      volume: 0.18,
      enabled: true
    },
    hashtags: ['#business', '#entrepreneur', '#startup', '#hustle', '#success', '#businesstips'],
    metadata: {
      duration: { min: 35, max: 55 },
      numberOfScenes: { min: 3, max: 4 }
    }
  }
};
```

---

## Quick Start Checklist

- [ ] Install authentication middleware
- [ ] Install BullMQ and Redis
- [ ] Set up Pexels API key
- [ ] Create Docker configuration
- [ ] Add new niche profiles
- [ ] Update environment variables
- [ ] Test locally with Docker Compose
- [ ] Run security audit
- [ ] Deploy to staging environment

## Testing Each Feature

```bash
# Test authentication
curl -H "X-API-Key: dev_key_12345" http://localhost:3000/niches

# Test job creation (requires Redis running)
curl -X POST http://localhost:3000/jobs \
  -H "X-API-Key: dev_key_12345" \
  -H "Content-Type: application/json" \
  -d '{"nicheId": "motivation", "prompt": "Never give up on your dreams"}'

# Test with Docker
docker-compose up -d
docker-compose logs -f backend

# Check Redis queue
docker-compose exec redis redis-cli
> KEYS *
> LLEN bull:video-jobs:wait
```

---

## Next Steps

After implementing these quick wins:

1. Set up monitoring (DataDog, New Relic, or self-hosted Grafana)
2. Configure CI/CD pipeline
3. Add comprehensive error tracking (Sentry)
4. Implement analytics dashboard
5. Add more advanced features from the comprehensive audit

For detailed explanations and strategic recommendations, see `COMPREHENSIVE_AUDIT_2025.md`.
