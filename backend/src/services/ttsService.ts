import fs from 'fs/promises';
import path from 'path';
import config from '../config/config';
import logger from '../utils/logger';
import { ensureDirectory } from '../utils/fileUtils';
import { runCommand } from '../utils/command';

export interface TTSOptions {
  text: string;
  voiceId?: string;
}

const AUDIO_DIR = path.join(config.assetsDir, 'audio');

const estimateDurationFromText = (text: string): number => {
  const words = text.trim().split(/\s+/).length;
  const estimated = (words / 155) * 60;
  return Math.min(Math.max(estimated, 40), config.maxVideoDurationSeconds);
};

export const synthesizeSpeech = async (text: string, voiceId?: string): Promise<string> => {
  await ensureDirectory(AUDIO_DIR);
  const narration = text.trim();
  if (!narration) {
    throw new Error('Cannot synthesize empty narration');
  }

  const duration = estimateDurationFromText(narration);
  const fileName = `narration_${Date.now()}.wav`;
  const outputPath = path.join(AUDIO_DIR, fileName);
  const freq = 140 + Math.floor(Math.random() * 30);

  logger.info('Synthesizing placeholder narration', {
    voice: voiceId || config.tts.mockVoice,
    duration,
    outputPath,
  });

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
