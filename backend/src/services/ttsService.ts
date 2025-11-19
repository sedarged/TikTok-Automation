import fs from 'fs/promises';
import path from 'path';
import config from '../config/config';
import { NicheProfile } from '../types/niche';
import logger from '../utils/logger';
import { ensureDirectory } from '../utils/fileUtils';
import { runCommand } from '../utils/command';
import { ttsEngine } from '../clients/ttsEngine';

export interface TTSOptions {
  text: string;
  voiceId?: string;
  nicheProfile?: NicheProfile;
}

const AUDIO_DIR = path.join(config.assetsDir, 'audio');

/**
 * Synthesize speech using the configured TTS engine
 */
export const synthesizeSpeech = async (
  text: string, 
  voiceId?: string,
  nicheProfile?: NicheProfile
): Promise<string> => {
  await ensureDirectory(AUDIO_DIR);
  const narration = text.trim();
  if (!narration) {
    throw new Error('Cannot synthesize empty narration');
  }

  // Use niche profile voice settings if available
  const effectiveVoiceId = nicheProfile?.voice.voiceId || voiceId || config.tts.voiceId;
  const speed = nicheProfile?.voice.speed || 1.0;
  const jobId = `job_${Date.now()}`;

  logger.info('Synthesizing speech', {
    provider: ttsEngine.isAvailable() ? 'configured' : 'mock',
    voiceId: effectiveVoiceId,
    textLength: narration.length,
    nicheId: nicheProfile?.id,
  });

  try {
    const audioPath = await ttsEngine.synthesize({
      text: narration,
      jobId,
      voiceId: effectiveVoiceId,
      speed,
      nicheProfile,
    });

    return audioPath;
  } catch (error) {
    logger.error('Speech synthesis failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const getAudioDuration = async (audioPath: string): Promise<number> => {
  await fs.access(audioPath);
  const { stdout } = await runCommand('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ]);
  return parseFloat(stdout.trim());
};
