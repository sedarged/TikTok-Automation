import path from 'path';
import fs from 'fs/promises';
import OpenAI from 'openai';
import { envConfig } from '../config/env';
import { NicheProfile } from '../types/niche';
import logger from '../utils/logger';
import { ensureDirectory } from '../utils/fileUtils';
import { runCommand } from '../utils/command';

/**
 * Image Generator Interface
 */
export interface ImageGenerator {
  /**
   * Generate an image from a text prompt
   */
  generateImage(options: ImageGenerationOptions): Promise<string>;
  
  /**
   * Check if the generator is available
   */
  isAvailable(): boolean;
}

export interface ImageGenerationOptions {
  prompt: string;
  sceneIndex: number;
  jobId: string;
  nicheProfile?: NicheProfile;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
}

/**
 * OpenAI Image Generator (DALL-E)
 */
export class OpenAIImageGenerator implements ImageGenerator {
  private client: OpenAI | null = null;

  private imageDir: string;

  constructor() {
    this.imageDir = path.join(envConfig.assetsDir, 'images');
    
    if (envConfig.openai.apiKey) {
      this.client = new OpenAI({
        apiKey: envConfig.openai.apiKey,
      });
      logger.info('OpenAI Image Generator initialized', {
        model: envConfig.openai.imageModel,
      });
    } else {
      logger.warn('OpenAI Image Generator not initialized - OPENAI_API_KEY not provided');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async generateImage(options: ImageGenerationOptions): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI Image Generator not available - OPENAI_API_KEY not configured');
    }

    const { prompt, sceneIndex, jobId, nicheProfile } = options;
    
    // Determine image size from niche profile or default
    const size = nicheProfile?.visuals.imageSize || '1024x1792';

    await ensureDirectory(this.imageDir);

    // Enhance prompt with niche style if available
    const enhancedPrompt = nicheProfile
      ? `${prompt}, ${nicheProfile.visuals.baseStylePrompt}`
      : prompt;

    const fileName = `scene_${sceneIndex + 1}_${jobId}_${Date.now()}.png`;
    const outputPath = path.join(this.imageDir, fileName);

    logger.info('Generating image with DALL-E', {
      jobId,
      sceneIndex,
      model: envConfig.openai.imageModel,
      size,
      promptLength: enhancedPrompt.length,
    });

    try {
      const response = await this.client!.images.generate({
        model: envConfig.openai.imageModel,
        prompt: enhancedPrompt,
        n: 1,
        size,
        quality: envConfig.openai.imageQuality,
        response_format: 'url',
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E');
      }

      // Download the image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(outputPath, buffer);

      logger.info('Image generated successfully', {
        jobId,
        sceneIndex,
        outputPath,
        sizeKB: Math.round(buffer.length / 1024),
      });

      return outputPath;
    } catch (error) {
      logger.error('Failed to generate image with DALL-E', {
        jobId,
        sceneIndex,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Mock Image Generator (for testing/development)
 * Creates simple placeholder images using ffmpeg
 */
export class MockImageGenerator implements ImageGenerator {
  private imageDir: string;

  constructor() {
    this.imageDir = path.join(envConfig.assetsDir, 'images');
  }

  isAvailable(): boolean {
    return true;
  }

  async generateImage(options: ImageGenerationOptions): Promise<string> {
    const { prompt, sceneIndex, jobId } = options;
    
    await ensureDirectory(this.imageDir);
    
    const fileName = `scene_${sceneIndex + 1}_${jobId}_mock_${Date.now()}.png`;
    const outputPath = path.join(this.imageDir, fileName);

    // Sanitize prompt for drawtext
    const sanitizeForDrawtext = (text: string): string => {
      return text
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
    };

    const shorten = (text: string, maxLength: number): string => {
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength - 3)}...`;
    };

    const safePrompt = sanitizeForDrawtext(shorten(prompt, 120));
    const safeTitle = sanitizeForDrawtext(`Scene ${sceneIndex + 1}`);

    const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

    const drawFilters = [
      `drawbox=x=0:y=0:w=${envConfig.render.width}:h=${envConfig.render.height}:color=0x03030a@1:t=fill`,
      "geq=r='r(X,Y)+random(1)*2':g='g(X,Y)+random(2)*3':b='b(X,Y)+random(3)*4'",
      `drawtext=fontfile=${FONT_PATH}:fontsize=80:fontcolor=0xeeeeee:text='${safeTitle}':x=(w-text_w)/2:y=200`,
      `drawtext=fontfile=${FONT_PATH}:fontsize=46:fontcolor=0xb7b7ff:text='${safePrompt}':x=(w-text_w)/2:y=h-420:wrap=1:line_spacing=14`,
    ];

    logger.info('Generating placeholder visual (mock)', {
      jobId,
      sceneIndex,
      outputPath,
    });

    await runCommand('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=0x05050a:size=${envConfig.render.width}x${envConfig.render.height}:duration=1`,
      '-vf',
      drawFilters.join(','),
      '-frames:v',
      '1',
      outputPath,
    ], { logLabel: 'scene-image' });

    return outputPath;
  }
}

/**
 * Image Generator Factory
 * Returns the appropriate image generator based on configuration
 */
export const createImageGenerator = (): ImageGenerator => {
  const provider = envConfig.image.provider;

  switch (provider) {
    case 'openai':
      return new OpenAIImageGenerator();
    case 'mock':
    default:
      return new MockImageGenerator();
  }
};

// Export singleton instance
export const imageGenerator = createImageGenerator();
