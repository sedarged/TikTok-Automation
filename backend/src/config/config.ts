import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  outputDir: string;
  assetsDir: string;
  storageBaseUrl: string;
  maxScenes: number;
  maxVideoDurationSeconds: number;
  logLevel: string;
  // TODO: Add TTS configuration when integrating TTS provider
  // tts: {
  //   apiUrl: string;
  //   apiKey: string;
  //   voiceId: string;
  // };
  // TODO: Add image generation configuration
  // imageGen: {
  //   apiUrl: string;
  //   apiKey: string;
  // };
  // TODO: Add content moderation configuration
  // contentModeration: {
  //   enabled: boolean;
  //   apiKey: string;
  // };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  outputDir: process.env.OUTPUT_DIR || './output',
  assetsDir: process.env.ASSETS_DIR || './assets',
  storageBaseUrl: process.env.STORAGE_BASE_URL || 'http://localhost:3000',
  maxScenes: parseInt(process.env.MAX_SCENES || '8', 10),
  maxVideoDurationSeconds: parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || '70', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
