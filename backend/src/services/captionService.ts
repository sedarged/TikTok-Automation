import fs from 'fs/promises';
import path from 'path';
import { CaptionSegment, Scene } from '../types';
import config from '../config/config';
import logger from '../utils/logger';
import { ensureDirectory } from '../utils/fileUtils';

const splitIntoSentences = (text: string): string[] => {
  const sanitized = text.replace(/\s+/g, ' ').trim();
  const matches = sanitized.match(/[^.!?]+[.!?]?/g);
  return matches ? matches.map(sentence => sentence.trim()) : [sanitized];
};

const wordCount = (text: string): number => {
  if (!text) return 0;
  return text.split(/\s+/).length;
};

const wrapCaption = (text: string, maxLineLength = 36): string => {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  words.forEach(word => {
    if ((current + word).length <= maxLineLength) {
      current = current ? `${current} ${word}` : word;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines.join('\n');
};

export const generateCaptions = (scenes: Scene[]): CaptionSegment[] => {
  const captions: CaptionSegment[] = [];
  let cursor = 0;

  scenes.forEach(scene => {
    const sceneDuration = scene.duration || 6;
    const sentences = splitIntoSentences(scene.narration);
    const totalWords = sentences.reduce((total, sentence) => total + wordCount(sentence), 0) || 1;
    let localCursor = cursor;

    sentences.forEach(sentence => {
      const portion = wordCount(sentence) / totalWords;
      const captionDuration = sceneDuration * (portion || 1 / sentences.length);
      const caption: CaptionSegment = {
        index: captions.length + 1,
        startTime: parseFloat(localCursor.toFixed(2)),
        endTime: parseFloat((localCursor + captionDuration).toFixed(2)),
        text: wrapCaption(sentence),
      };
      captions.push(caption);
      localCursor += captionDuration;
    });

    cursor += sceneDuration;
  });

  return captions;
};

const formatTimestamp = (seconds: number): string => {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss},${ms}`;
};

export const captionsToSrt = (captions: CaptionSegment[]): string => {
  return captions
    .map(caption => {
      return `${caption.index}\n${formatTimestamp(caption.startTime)} --> ${formatTimestamp(caption.endTime)}\n${caption.text}\n`;
    })
    .join('\n');
};

export const saveCaptionsToFile = async (
  captions: CaptionSegment[],
  jobId: string
): Promise<string> => {
  await ensureDirectory(config.outputDir);
  const filePath = path.join(config.outputDir, `${jobId}.srt`);
  await fs.writeFile(filePath, captionsToSrt(captions), 'utf-8');
  logger.info('Saved captions', { filePath });
  return filePath;
};
