import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { envConfig } from '../config/env';
import { NicheProfile } from '../types/niche';
import logger from '../utils/logger';
import { ensureDirectory } from '../utils/fileUtils';

/**
 * TTS Engine Interface
 */
export interface TTSEngine {
  /**
   * Synthesize speech from text
   */
  synthesize(options: TTSSynthesizeOptions): Promise<string>;
  
  /**
   * Check if the engine is available
   */
  isAvailable(): boolean;
}

export interface TTSSynthesizeOptions {
  text: string;
  jobId: string;
  voiceId: string;
  speed?: number;
  format?: 'mp3' | 'wav';
  nicheProfile?: NicheProfile;
}

/**
 * OpenAI TTS Engine Implementation
 */
export class OpenAITTSEngine implements TTSEngine {
  private client: OpenAI | null = null;

  private audioDir: string;

  constructor() {
    this.audioDir = path.join(envConfig.assetsDir, 'audio');
    
    if (envConfig.openai.apiKey) {
      this.client = new OpenAI({
        apiKey: envConfig.openai.apiKey,
      });
      logger.info('OpenAI TTS Engine initialized');
    } else {
      logger.warn('OpenAI TTS Engine not initialized - OPENAI_API_KEY not provided');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async synthesize(options: TTSSynthesizeOptions): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI TTS Engine not available - OPENAI_API_KEY not configured');
    }

    const { text, jobId, voiceId, speed = 1.0, format = 'mp3' } = options;

    await ensureDirectory(this.audioDir);

    const fileName = `narration_${jobId}_${Date.now()}.${format}`;
    const outputPath = path.join(this.audioDir, fileName);

    logger.info('Synthesizing speech with OpenAI TTS', {
      jobId,
      voiceId,
      speed,
      textLength: text.length,
      model: envConfig.tts.model,
    });

    try {
      const response = await this.client!.audio.speech.create({
        model: envConfig.tts.model,
        voice: voiceId as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
        speed,
        response_format: format === 'wav' ? 'wav' : 'mp3',
      });

      // Save the audio to a file
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(outputPath, buffer);

      logger.info('Speech synthesized successfully', {
        jobId,
        outputPath,
        sizeKB: Math.round(buffer.length / 1024),
      });

      return outputPath;
    } catch (error) {
      logger.error('Failed to synthesize speech with OpenAI TTS', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Mock TTS Engine (for testing/development)
 */
export class MockTTSEngine implements TTSEngine {
  private audioDir: string;

  constructor() {
    this.audioDir = path.join(envConfig.assetsDir, 'audio');
  }

  isAvailable(): boolean {
    return true;
  }

  async synthesize(options: TTSSynthesizeOptions): Promise<string> {
    const { text, jobId } = options;
    
    await ensureDirectory(this.audioDir);

    // Estimate duration from text
    const words = text.trim().split(/\s+/).length;
    const duration = Math.max((words / 155) * 60, 10);
    
    const fileName = `narration_${jobId}_mock_${Date.now()}.wav`;
    const outputPath = path.join(this.audioDir, fileName);
    const freq = 140 + Math.floor(Math.random() * 30);

    logger.info('Synthesizing placeholder narration (mock)', {
      jobId,
      duration,
      outputPath,
    });

    // Generate a placeholder audio using ffmpeg
    const { runCommand } = await import('../utils/command');
    
    await runCommand('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `sine=frequency=${freq}:duration=${duration}:sample_rate=44100`,
      '-f',
      'lavfi',
      '-i',
      `anoisesrc=color=pink:amplitude=0.04:duration=${duration}`,
      '-filter_complex',
      '[0:a]volume=0.25,apulsator=mode=sine:amount=0.03[a0];[1:a]volume=0.15[a1];[a0][a1]amix=inputs=2:duration=longest,afade=t=in:ss=0:d=1.5,afade=t=out:st=' +
        `${Math.max(duration - 1.5, 0)}:d=1.5`,
      '-ar',
      '44100',
      '-ac',
      '1',
      outputPath,
    ], { logLabel: 'mock-tts' });

    return outputPath;
  }
}

/**
 * TTS Engine Factory
 * Returns the appropriate TTS engine based on configuration
 */
export const createTTSEngine = (): TTSEngine => {
  const provider = envConfig.tts.provider;

  switch (provider) {
    case 'openai':
      return new OpenAITTSEngine();
    case 'mock':
    default:
      return new MockTTSEngine();
  }
};

// Export singleton instance
export const ttsEngine = createTTSEngine();
