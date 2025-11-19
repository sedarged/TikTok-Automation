import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import config from '../config/config';
import logger from './logger';
import { ensureDirectory } from './fileUtils';

export interface CommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  logLabel?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export const runCommand = (
  binary: string,
  args: string[],
  options: CommandOptions = {}
): Promise<CommandResult> => {
  if (process.env.MOCK_FFMPEG === 'true') {
    if (binary === 'ffmpeg') {
      return simulateFfmpeg(args);
    }
    if (binary === 'ffprobe') {
      return simulateFfprobe();
    }
  }

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      env: options.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('error', error => {
      logger.error('Command failed to spawn', {
        binary,
        args: args.join(' '),
        error: error.message,
      });
      reject(error);
    });

    child.on('close', code => {
      if (code !== 0) {
        const error = new Error(
          `${options.logLabel || binary} exited with code ${code}: ${stderr}`
        );
        logger.error('Command failed', {
          binary,
          args,
          code,
          stderr,
        });
        reject(error);
        return;
      }

      if (options.logLabel) {
        logger.debug(`${options.logLabel} completed`, { binary, args });
      }
      resolve({ stdout, stderr });
    });
  });
};

const simulateFfmpeg = async (args: string[]): Promise<CommandResult> => {
  const outputPath = args[args.length - 1];
  if (outputPath) {
    await ensureDirectory(path.dirname(outputPath));
    let content = 'mock';
    if (outputPath.endsWith('.json')) {
      content = '{}';
    }
    await fs.writeFile(outputPath, content);
  }
  return { stdout: '', stderr: '' };
};

const simulateFfprobe = async (): Promise<CommandResult> => {
  const mock = {
    streams: [
      {
        width: config.render.width,
        height: config.render.height,
        r_frame_rate: `${config.render.fps}/1`,
      },
    ],
    format: { duration: `${config.maxVideoDurationSeconds}` },
  };
  return { stdout: JSON.stringify(mock), stderr: '' };
};
