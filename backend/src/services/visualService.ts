import path from 'path';
import config from '../config/config';
import { ensureDirectory } from '../utils/fileUtils';
import logger from '../utils/logger';
import { runCommand } from '../utils/command';

const IMAGE_DIR = path.join(config.assetsDir, 'images');
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

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

export const generateSceneImage = async (
  prompt: string,
  sceneIndex: number
): Promise<string> => {
  await ensureDirectory(IMAGE_DIR);
  const filename = `scene_${sceneIndex + 1}_${Date.now()}.png`;
  const outputPath = path.join(IMAGE_DIR, filename);
  const safePrompt = sanitizeForDrawtext(shorten(prompt, 120));
  const safeTitle = sanitizeForDrawtext(`Scene ${sceneIndex + 1}`);

  const drawFilters = [
    `drawbox=x=0:y=0:w=${config.render.width}:h=${config.render.height}:color=0x03030a@1:t=fill`,
    "geq=r='r(X,Y)+random(1)*2':g='g(X,Y)+random(2)*3':b='b(X,Y)+random(3)*4'",
    `drawtext=fontfile=${FONT_PATH}:fontsize=80:fontcolor=0xeeeeee:text='${safeTitle}':x=(w-text_w)/2:y=200`,
    `drawtext=fontfile=${FONT_PATH}:fontsize=46:fontcolor=0xb7b7ff:text='${safePrompt}':x=(w-text_w)/2:y=h-420:wrap=1:line_spacing=14`,
  ];

  logger.info('Generating placeholder visual', {
    prompt,
    sceneIndex,
    outputPath,
  });

  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=0x05050a:size=${config.render.width}x${config.render.height}:duration=1`,
    '-vf',
    drawFilters.join(','),
    '-frames:v',
    '1',
    outputPath,
  ], { logLabel: 'scene-image' });

  return outputPath;
};

export const generateVisualsForScenes = async (
  prompts: string[]
): Promise<string[]> => {
  const results: string[] = [];
  for (let i = 0; i < prompts.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const image = await generateSceneImage(prompts[i], i);
    results.push(image);
  }
  return results;
};
