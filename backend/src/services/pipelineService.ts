import config from '../config/config';
import { getNicheProfile } from '../config/nicheLoader';
import { generateStory, buildStoryFromInput, StoryGenerationOptions, validateStory } from './storyService';
import { ensureStoryIsSafe } from './contentFilter';
import { generateSceneImage } from './visualService';
import { synthesizeSpeech, getAudioDuration } from './ttsService';
import { generateCaptions, saveCaptionsToFile } from './captionService';
import { renderVideo } from './renderService';
import { getPublicUrl, saveToOutput } from './storageService';
import jobQueue, { JobPayload } from './jobQueue';
import { CreateJobRequest, JobResultData, Scene, StoryResult } from '../types';
import { NicheProfile } from '../types/niche';
import logger from '../utils/logger';
import { ensureDirectory } from '../utils/fileUtils';

const wordCount = (text: string): number => {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
};

const allocateDurations = (scenes: Scene[], targetDuration: number): number[] => {
  const weights = scenes.map(scene => Math.max(wordCount(scene.narration), 1));
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map(weight => parseFloat(((weight / total) * targetDuration).toFixed(2)));
};

const buildDescription = (story: StoryResult, nicheProfile: NicheProfile): string => {
  const hook = story.scenes[0]?.narration.split('.').slice(0, 1).join('.');
  const ctaPhrase = nicheProfile.hashtagsAndMetadata.ctaPhrases?.[0] || 'Stay tuned';
  return `${story.title} — ${hook} #${ctaPhrase}`;
};

const buildHashtags = (nicheProfile: NicheProfile): string[] => {
  return nicheProfile.hashtagsAndMetadata.defaultHashtags;
};

const prepareStory = async (request: CreateJobRequest, nicheProfile: NicheProfile): Promise<StoryResult> => {
  if (request.story) {
    return buildStoryFromInput(request.story);
  }
  const storyOptions: StoryGenerationOptions = {
    prompt: request.prompt,
    maxScenes: config.maxScenes,
    targetDurationSeconds: config.maxVideoDurationSeconds,
    nicheProfile,
  };
  return generateStory(storyOptions);
};

const ensureSafeStory = async (story: StoryResult, allowRetry: boolean, nicheProfile: NicheProfile): Promise<StoryResult> => {
  let current = story;
  for (let attempt = 0; attempt < (allowRetry ? 2 : 1); attempt += 1) {
    const { safe, story: sanitized, flagged } = ensureStoryIsSafe(current);
    if (safe && validateStory(sanitized)) {
      return sanitized;
    }
    if (!allowRetry) break;
    current = await generateStory({ 
      prompt: sanitized.title, 
      maxScenes: config.maxScenes,
      nicheProfile,
    });
    logger.warn('Regenerating story due to moderation flags', { flagged });
  }
  throw new Error('Story failed moderation or validation checks');
};

const attachVisuals = async (story: StoryResult, nicheProfile: NicheProfile, jobId: string): Promise<StoryResult> => {
  const scenes = [...story.scenes];
  for (let i = 0; i < scenes.length; i += 1) {
    const prompt = scenes[i].imagePrompt || scenes[i].description;
    // eslint-disable-next-line no-await-in-loop
    const imagePath = await generateSceneImage(prompt, i, nicheProfile, jobId);
    scenes[i] = { ...scenes[i], assetPath: imagePath };
  }
  return { ...story, scenes };
};

const buildRenderScenes = (scenes: Scene[]): { imagePath: string; duration: number; caption: string }[] => {
  return scenes.map(scene => ({
    imagePath: scene.assetPath || scene.imageUrl || '',
    duration: scene.duration || 6,
    caption: scene.narration,
  }));
};

const processJob = async (jobId: string, payload: JobPayload): Promise<JobResultData> => {
  const request = payload.request;
  
  // Determine niche profile (default to 'horror' for backward compatibility)
  const nicheId = request.nicheId || 'horror';
  const nicheProfile = getNicheProfile(nicheId);
  
  logger.info('Starting job pipeline', { 
    jobId, 
    nicheId, 
    stage: 'INIT',
    type: request.type,
  });

  await ensureDirectory(config.assetsDir);
  jobQueue.registerProgress(jobId, 5, 'INIT');

  const storyDraft = await prepareStory(request, nicheProfile);
  const story = await ensureSafeStory(storyDraft, !request.story, nicheProfile);

  logger.info('Story ready', { jobId, nicheId, stage: 'STORY', scenes: story.scenes.length });
  jobQueue.registerProgress(jobId, 20, 'STORY_READY');

  const narrationText = story.scenes.map(scene => scene.narration).join(' ');
  const narrationPath = await synthesizeSpeech(narrationText, undefined, nicheProfile);
  const narrationDuration = await getAudioDuration(narrationPath);
  jobQueue.registerProgress(jobId, 35, 'TTS_READY');

  const durations = allocateDurations(story.scenes, narrationDuration);
  const scenesWithDurations = story.scenes.map((scene, index) => ({
    ...scene,
    duration: durations[index],
  }));
  const storyWithDurations: StoryResult = { ...story, scenes: scenesWithDurations };

  const storyWithVisuals = await attachVisuals(storyWithDurations, nicheProfile, jobId);
  jobQueue.registerProgress(jobId, 55, 'VISUALS_READY');

  const captions = generateCaptions(storyWithVisuals.scenes);
  const subtitlesPath = await saveCaptionsToFile(captions, jobId);
  jobQueue.registerProgress(jobId, 65, 'CAPTIONS_READY');

  const renderResult = await renderVideo({
    jobId,
    scenes: buildRenderScenes(storyWithVisuals.scenes),
    narrationAudioPath: narrationPath,
    narrationDuration,
    subtitlesPath,
    options: request.options,
  });
  jobQueue.registerProgress(jobId, 95, 'RENDER_COMPLETE');

  const savedVideoPath = await saveToOutput(renderResult.videoPath);
  const videoUrl = getPublicUrl(savedVideoPath);

  return {
    videoPath: savedVideoPath,
    videoUrl,
    subtitlePath: subtitlesPath,
    description: buildDescription(storyWithVisuals, nicheProfile),
    hashtags: buildHashtags(nicheProfile),
    metadata: {
      durationSeconds: renderResult.duration,
      numberOfScenes: storyWithVisuals.scenes.length,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      outputPath: savedVideoPath,
    },
    story: storyWithVisuals,
    assets: {
      narrationAudio: narrationPath,
      sceneImages: storyWithVisuals.scenes.map(scene => scene.assetPath || ''),
      captionsFile: subtitlesPath,
    },
  };
};

let initialized = false;

export const initializeJobPipeline = (): void => {
  if (initialized) return;
  jobQueue.registerProcessor(async (job, payload) => processJob(job.id, payload));
  initialized = true;
};

export { processJob };
