import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

/**
 * Environment configuration schema with Zod validation
 */
const EnvSchema = z.object({
  // Server
  PORT: z.string().default('3000').transform(Number),
  APP_VERSION: z.string().default('0.3.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Storage paths
  OUTPUT_DIR: z.string().default('./output'),
  ASSETS_DIR: z.string().default('./assets'),
  STORAGE_BASE_URL: z.string().default('http://localhost:3000'),

  // Story generation
  MAX_SCENES: z.string().default('6').transform(Number),
  MAX_VIDEO_DURATION_SECONDS: z.string().default('70').transform(Number),
  MIN_STORY_WORD_COUNT: z.string().default('140').transform(Number),
  MAX_STORY_WORD_COUNT: z.string().default('185').transform(Number),

  // Rendering
  RENDER_WIDTH: z.string().default('1080').transform(Number),
  RENDER_HEIGHT: z.string().default('1920').transform(Number),
  RENDER_FPS: z.string().default('30').transform(Number),
  RENDER_INCLUDE_CAPTIONS: z.string().default('true').transform(val => val !== 'false'),
  RENDER_INCLUDE_MUSIC: z.string().default('true').transform(val => val !== 'false'),
  RENDER_DARK_GRADE: z.string().default('true').transform(val => val !== 'false'),
  RENDER_VIGNETTE: z.string().default('true').transform(val => val !== 'false'),
  RENDER_GLITCH_TRANSITIONS: z.string().default('true').transform(val => val !== 'false'),
  RENDER_MUSIC_VOLUME: z.string().default('0.18').transform(Number),

  // OpenAI (for LLM and TTS)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_IMAGE_MODEL: z.string().default('dall-e-3'),
  OPENAI_IMAGE_QUALITY: z.enum(['standard', 'hd']).default('standard'),

  // TTS Configuration
  TTS_PROVIDER: z.enum(['openai', 'elevenlabs', 'mock']).default('mock'),
  TTS_API_KEY: z.string().optional(),
  TTS_VOICE_ID: z.string().default('onyx'),
  TTS_MODEL: z.string().default('tts-1'),

  // ElevenLabs (optional)
  ELEVENLABS_API_KEY: z.string().optional(),

  // Image Generation
  IMAGE_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  IMAGE_API_KEY: z.string().optional(),

  // Storage (S3/R2)
  STORAGE_PROVIDER: z.enum(['local', 's3', 'r2']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),

  // Queue (Redis/BullMQ)
  QUEUE_PROVIDER: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().optional(),

  // Posting & Webhooks
  POSTING_WEBHOOK_URL: z.string().optional(),
  POSTING_WEBHOOK_SECRET: z.string().optional(),
});

type Env = z.infer<typeof EnvSchema>;

/**
 * Parse and validate environment variables
 */
let env: Env;

try {
  env = EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    console.error(JSON.stringify(error.issues, null, 2));
    process.exit(1);
  }
  throw error;
}

/**
 * Helper function to resolve paths
 */
const resolvePath = (relativePath: string): string => {
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(process.cwd(), relativePath);
};

/**
 * Validated and typed environment configuration
 */
export const envConfig = {
  // Server
  port: env.PORT,
  version: env.APP_VERSION,
  logLevel: env.LOG_LEVEL,

  // Storage
  outputDir: resolvePath(env.OUTPUT_DIR),
  assetsDir: resolvePath(env.ASSETS_DIR),
  storageBaseUrl: env.STORAGE_BASE_URL,

  // Story
  maxScenes: env.MAX_SCENES,
  maxVideoDurationSeconds: env.MAX_VIDEO_DURATION_SECONDS,
  minStoryWordCount: env.MIN_STORY_WORD_COUNT,
  maxStoryWordCount: env.MAX_STORY_WORD_COUNT,

  // Rendering
  render: {
    width: env.RENDER_WIDTH,
    height: env.RENDER_HEIGHT,
    fps: env.RENDER_FPS,
    includeCaptions: env.RENDER_INCLUDE_CAPTIONS,
    includeMusic: env.RENDER_INCLUDE_MUSIC,
    darkGrade: env.RENDER_DARK_GRADE,
    vignette: env.RENDER_VIGNETTE,
    glitchTransitions: env.RENDER_GLITCH_TRANSITIONS,
    musicVolume: env.RENDER_MUSIC_VOLUME,
  },

  // OpenAI
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    imageModel: env.OPENAI_IMAGE_MODEL,
    imageQuality: env.OPENAI_IMAGE_QUALITY,
  },

  // TTS
  tts: {
    provider: env.TTS_PROVIDER,
    apiKey: env.TTS_API_KEY,
    voiceId: env.TTS_VOICE_ID,
    model: env.TTS_MODEL,
  },

  // ElevenLabs
  elevenlabs: {
    apiKey: env.ELEVENLABS_API_KEY,
  },

  // Image Generation
  image: {
    provider: env.IMAGE_PROVIDER,
    apiKey: env.IMAGE_API_KEY,
  },

  // Storage
  storage: {
    provider: env.STORAGE_PROVIDER,
    s3: {
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      endpoint: env.S3_ENDPOINT,
    },
  },

  // Queue
  queue: {
    provider: env.QUEUE_PROVIDER,
    redisUrl: env.REDIS_URL,
  },

  // Posting
  posting: {
    webhookUrl: env.POSTING_WEBHOOK_URL,
    webhookSecret: env.POSTING_WEBHOOK_SECRET,
  },
} as const;

export type EnvConfig = typeof envConfig;
