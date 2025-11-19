import fs from 'fs/promises';
import path from 'path';
import config from '../config/config';
import { RenderOptions, RenderResult, RenderSceneInput } from '../types';
import { ensureDirectory } from '../utils/fileUtils';
import { runCommand } from '../utils/command';

export interface RenderRequest {
  jobId: string;
  scenes: RenderSceneInput[];
  narrationAudioPath: string;
  narrationDuration: number;
  subtitlesPath?: string;
  options?: Partial<RenderOptions>;
}

const JOB_DIR = path.join(config.assetsDir, 'jobs');

const mergeOptions = (options?: Partial<RenderOptions>): RenderOptions => ({
  ...config.render,
  ...(options || {}),
});

const createSceneSegment = async (
  scene: RenderSceneInput,
  segmentPath: string,
  options: RenderOptions
): Promise<void> => {
  const filters = [
    `scale=${options.width}:${options.height}:force_original_aspect_ratio=cover`,
    `crop=${options.width}:${options.height}`,
    'format=yuv420p',
  ];
  if (options.darkGrade) {
    filters.push('eq=brightness=-0.08:saturation=0.92');
  }
  if (options.vignette) {
    filters.push('vignette=PI/6');
  }

  await runCommand('ffmpeg', [
    '-y',
    '-loop',
    '1',
    '-i',
    scene.imagePath,
    '-t',
    scene.duration.toFixed(2),
    '-r',
    options.fps.toString(),
    '-vf',
    filters.join(','),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-an',
    segmentPath,
  ], { logLabel: 'scene-segment' });
};

const createGlitchSegment = async (
  glitchPath: string,
  options: RenderOptions,
  duration = 0.4
): Promise<void> => {
  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `rgbtestsrc=size=${options.width}x${options.height}:rate=${options.fps}`,
    '-vf',
    "format=yuv420p,hue=s=2,tblend=all_mode='xor'",
    '-t',
    duration.toString(),
    glitchPath,
  ], { logLabel: 'glitch-transition' });
};

const concatSegments = async (segments: string[], outputPath: string): Promise<void> => {
  const concatFile = `${outputPath}.txt`;
  const content = segments
    .map(segment => `file '${segment.replace(/'/g, "'\\''")}'`)
    .join('\n');
  await fs.writeFile(concatFile, content, 'utf-8');
  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatFile,
    '-c',
    'copy',
    outputPath,
  ], { logLabel: 'concat' });
};

const createAmbientBed = async (audioPath: string, duration: number, volume: number): Promise<void> => {
  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `anoisesrc=color=brown:amplitude=0.04:duration=${duration}`,
    '-filter:a',
    `volume=${volume}`,
    audioPath,
  ], { logLabel: 'ambient-bed' });
};

const escapeSubtitlePath = (filePath: string): string => {
  return filePath.replace(/:/g, '\\:');
};

const probeVideo = async (videoPath: string): Promise<RenderResult> => {
  const { stdout } = await runCommand('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,r_frame_rate',
    '-show_entries',
    'format=duration',
    '-of',
    'json',
    videoPath,
  ]);
  const metadata = JSON.parse(stdout);
  const stream = metadata.streams[0];
  const duration = parseFloat(metadata.format.duration);
  const [num, den] = stream.r_frame_rate.split('/').map(Number);
  const fps = den ? num / den : config.render.fps;
  return {
    videoPath,
    duration,
    width: stream.width,
    height: stream.height,
    fps,
  };
};

export const renderVideo = async (request: RenderRequest): Promise<RenderResult> => {
  const options = mergeOptions(request.options);
  await ensureDirectory(JOB_DIR);
  const jobDir = path.join(JOB_DIR, request.jobId);
  await ensureDirectory(jobDir);

  const segmentPaths: string[] = [];
  for (let index = 0; index < request.scenes.length; index += 1) {
    const scene = request.scenes[index];
    const safeName = `scene_${index + 1}`;
    const segmentPath = path.join(jobDir, `${safeName}.mp4`);
    await createSceneSegment(scene, segmentPath, options);
    segmentPaths.push(segmentPath);
    if (options.glitchTransitions && index < request.scenes.length - 1) {
      const glitchPath = path.join(jobDir, `${safeName}_glitch.mp4`);
      await createGlitchSegment(glitchPath, options);
      segmentPaths.push(glitchPath);
    }
  }

  const mergedVisualPath = path.join(jobDir, `${request.jobId}_visuals.mp4`);
  await concatSegments(segmentPaths, mergedVisualPath);

  let ambientPath: string | undefined;
  if (options.includeMusic) {
    ambientPath = path.join(jobDir, `${request.jobId}_ambient.wav`);
    await createAmbientBed(ambientPath, request.narrationDuration, options.musicVolume);
  }

  await ensureDirectory(config.outputDir);
  const finalVideoPath = path.join(config.outputDir, `${request.jobId}.mp4`);

  const args = ['-y', '-i', mergedVisualPath, '-i', request.narrationAudioPath];
  if (ambientPath) {
    args.push('-i', ambientPath);
  }

  if (ambientPath) {
    args.push(
      '-filter_complex',
      `[1:a]volume=1[a1];[2:a]volume=${options.musicVolume}[a2];[a1][a2]amix=inputs=2:duration=first[aout]`,
      '-map',
      '0:v:0',
      '-map',
      '[aout]'
    );
  } else {
    args.push('-map', '0:v:0', '-map', '1:a:0');
  }

  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest');

  if (options.includeCaptions && request.subtitlesPath) {
    args.push('-vf', `subtitles=${escapeSubtitlePath(request.subtitlesPath)}`);
  }

  args.push(finalVideoPath);

  await runCommand('ffmpeg', args, { logLabel: 'final-render' });

  return probeVideo(finalVideoPath);
};
