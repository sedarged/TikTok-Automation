import fs from 'fs/promises';
import path from 'path';
import config from '../config/config';
import logger from '../utils/logger';
import { ensureDirectory } from '../utils/fileUtils';

export const saveToOutput = async (sourcePath: string): Promise<string> => {
  await ensureDirectory(config.outputDir);
  const fileName = path.basename(sourcePath);
  const destination = path.join(config.outputDir, fileName);
  if (sourcePath !== destination) {
    await fs.copyFile(sourcePath, destination);
  }
  logger.info('Asset persisted to output directory', { destination });
  return destination;
};

export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    logger.warn('Unable to delete file', { filePath, error: (error as Error).message });
  }
};

export const getPublicUrl = (absolutePath: string): string => {
  if (!absolutePath) return '';
  const relative = path.relative(process.cwd(), absolutePath);
  if (config.storageBaseUrl.startsWith('http')) {
    return `${config.storageBaseUrl.replace(/\/$/, '')}/${relative}`;
  }
  return `file://${absolutePath}`;
};
