import path from 'path';
import config from '../config/config';
import { NicheProfile } from '../types/niche';
import { ensureDirectory } from '../utils/fileUtils';
import logger from '../utils/logger';
import { imageGenerator } from '../clients/imageGenerator';

const IMAGE_DIR = path.join(config.assetsDir, 'images');

/**
 * Generate a scene image using the configured image generator
 */
export const generateSceneImage = async (
  prompt: string,
  sceneIndex: number,
  nicheProfile?: NicheProfile,
  jobId?: string
): Promise<string> => {
  await ensureDirectory(IMAGE_DIR);

  const effectiveJobId = jobId || `job_${Date.now()}`;

  logger.info('Generating scene visual', {
    sceneIndex,
    prompt: prompt.substring(0, 100),
    nicheId: nicheProfile?.id,
  });

  try {
    const imagePath = await imageGenerator.generateImage({
      prompt,
      sceneIndex,
      jobId: effectiveJobId,
      nicheProfile,
    });

    return imagePath;
  } catch (error) {
    logger.error('Failed to generate scene visual', {
      sceneIndex,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Generate visuals for all scenes
 */
export const generateVisualsForScenes = async (
  prompts: string[],
  nicheProfile?: NicheProfile,
  jobId?: string
): Promise<string[]> => {
  const results: string[] = [];
  for (let i = 0; i < prompts.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const image = await generateSceneImage(prompts[i], i, nicheProfile, jobId);
    results.push(image);
  }
  return results;
};
