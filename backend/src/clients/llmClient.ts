import OpenAI from 'openai';
import { z } from 'zod';
import { envConfig } from '../config/env';
import { NicheProfile } from '../types/niche';
import logger from '../utils/logger';

/**
 * Schema for a single scene in the generated story
 */
const SceneSchema = z.object({
  description: z.string().describe('Brief description of the scene'),
  narration: z.string().describe('Narration text for the scene'),
  imagePrompt: z.string().describe('AI image generation prompt for the scene visual'),
  sfxHint: z.string().optional().describe('Optional sound effect hint'),
});

/**
 * Schema for the complete structured story
 */
const StructuredStorySchema = z.object({
  title: z.string().describe('Engaging title for the story'),
  hook: z.string().describe('Opening hook (first 3 seconds) to grab attention'),
  scenes: z.array(SceneSchema).min(3).max(6),
  description: z.string().describe('Meta description for the video'),
  hashtags: z.array(z.string()).min(3).max(10),
});

export type StructuredStory = z.infer<typeof StructuredStorySchema>;
export type SceneData = z.infer<typeof SceneSchema>;

export interface StoryGenerationOptions {
  prompt: string;
  nicheProfile: NicheProfile;
  maxScenes?: number;
  targetDurationSeconds?: number;
}

/**
 * OpenAI LLM Client for structured story generation
 */
export class LLMClient {
  private client: OpenAI | null = null;

  private isInitialized = false;

  constructor() {
    if (envConfig.openai.apiKey) {
      this.client = new OpenAI({
        apiKey: envConfig.openai.apiKey,
      });
      this.isInitialized = true;
      logger.info('LLM Client initialized', { model: envConfig.openai.model });
    } else {
      logger.warn('LLM Client not initialized - OPENAI_API_KEY not provided');
    }
  }

  /**
   * Check if the LLM client is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Generate a structured story using OpenAI's GPT models
   */
  async generateStructuredStory(
    options: StoryGenerationOptions
  ): Promise<StructuredStory> {
    if (!this.isAvailable()) {
      throw new Error('LLM Client not available - OPENAI_API_KEY not configured');
    }

    const { prompt, nicheProfile, maxScenes, targetDurationSeconds } = options;
    
    const numScenes = maxScenes || nicheProfile.visuals.numScenes;
    const targetWords = this.calculateTargetWords(
      targetDurationSeconds || nicheProfile.storyStyle.defaultLengthSeconds,
      nicheProfile
    );

    const systemPrompt = this.buildSystemPrompt(nicheProfile);
    const userPrompt = this.buildUserPrompt(prompt, nicheProfile, numScenes, targetWords);

    logger.info('Generating story with LLM', {
      nicheId: nicheProfile.id,
      prompt,
      numScenes,
      targetWords,
      model: envConfig.openai.model,
    });

    try {
      const completion = await this.client!.chat.completions.create({
        model: envConfig.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from LLM');
      }

      const parsed = JSON.parse(content);
      const validated = StructuredStorySchema.parse(parsed);

      logger.info('Story generated successfully', {
        nicheId: nicheProfile.id,
        title: validated.title,
        scenes: validated.scenes.length,
      });

      return validated;
    } catch (error) {
      logger.error('Failed to generate story with LLM', {
        nicheId: nicheProfile.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Story generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate target word count based on duration
   */
  private calculateTargetWords(durationSeconds: number, nicheProfile: NicheProfile): number {
    // Assume average speaking rate of 155 words per minute
    const wordsPerSecond = 155 / 60;
    const targetWords = Math.round(durationSeconds * wordsPerSecond);
    
    // Clamp to niche profile limits
    return Math.max(
      nicheProfile.storyStyle.targetWordCount.min,
      Math.min(targetWords, nicheProfile.storyStyle.targetWordCount.max)
    );
  }

  /**
   * Build system prompt based on niche profile
   */
  private buildSystemPrompt(nicheProfile: NicheProfile): string {
    return `You are an expert ${nicheProfile.name} content creator specializing in viral TikTok videos.

Your task is to create engaging, ${nicheProfile.storyStyle.tone} short-form content optimized for TikTok's algorithm.

Story Structure: ${nicheProfile.storyStyle.structureTemplate.join(' → ')}

Key Requirements:
1. Hook: The first 1-3 seconds MUST grab attention immediately. Use intrigue, mystery, or shock value.
2. Pacing: Keep it fast-paced and engaging throughout. Every sentence should add value.
3. Retention: Structure the story to maintain viewer attention until the very end.
4. Visual Prompts: Each scene needs a detailed visual prompt for AI image generation in this style: "${nicheProfile.visuals.baseStylePrompt}"
5. Platform: Optimize for TikTok - short, punchy, and designed for mobile viewing.

Visual Style: ${nicheProfile.visuals.baseStylePrompt}

Output Format:
Return ONLY a valid JSON object with this structure:
{
  "title": "Engaging title for the video",
  "hook": "First sentence that grabs attention instantly",
  "scenes": [
    {
      "description": "Scene description",
      "narration": "The narration text for this scene",
      "imagePrompt": "Detailed AI image prompt for this scene, including: ${nicheProfile.visuals.baseStylePrompt}",
      "sfxHint": "Optional sound effect hint"
    }
  ],
  "description": "TikTok video description (brief, engaging)",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;
  }

  /**
   * Build user prompt with specific requirements
   */
  private buildUserPrompt(
    seedPrompt: string,
    nicheProfile: NicheProfile,
    numScenes: number,
    targetWords: number
  ): string {
    return `Create a ${nicheProfile.name} video based on this concept:

"${seedPrompt}"

Requirements:
- Create exactly ${numScenes} scenes
- Total narration should be approximately ${targetWords} words (${targetWords - 20} to ${targetWords + 20})
- Tone: ${nicheProfile.storyStyle.tone}
- Include hashtags from these categories: ${nicheProfile.hashtagsAndMetadata.defaultHashtags.join(', ')}
- Make it highly engaging and optimized for TikTok's algorithm
- Ensure the hook is EXTREMELY compelling to prevent scroll-away

Remember: Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Generate story with retry logic
   */
  async generateWithRetry(
    options: StoryGenerationOptions,
    maxRetries: number = 2
  ): Promise<StructuredStory> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        return await this.generateStructuredStory(options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('Story generation attempt failed', {
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
        });
        
        if (attempt < maxRetries - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Story generation failed after retries');
  }
}

// Export singleton instance
export const llmClient = new LLMClient();
