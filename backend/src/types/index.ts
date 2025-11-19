/**
 * Type definitions for the horror TikTok video pipeline
 */

export interface Scene {
  id: string;
  order: number;
  description: string;
  narration: string;
  imagePrompt?: string;
  imageUrl?: string;
  assetPath?: string;
  duration?: number;
}

export interface StorySceneInput {
  description: string;
  narration: string;
  imagePrompt?: string;
  duration?: number;
}

export interface StoryInput {
  title?: string;
  description?: string;
  scenes: StorySceneInput[];
}

export interface StoryResult {
  id: string;
  title: string;
  description: string;
  scenes: Scene[];
  totalDuration: number;
  createdAt: Date;
  wordCount: number;
}

export type JobStatusType = 'pending' | 'running' | 'completed' | 'failed';

export interface JobMetadata {
  durationSeconds: number;
  numberOfScenes: number;
  createdAt: string;
  completedAt?: string;
  outputPath: string;
}

export interface JobResultData {
  videoPath: string;
  videoUrl: string;
  subtitlePath: string;
  description: string;
  hashtags: string[];
  metadata: JobMetadata;
  story: StoryResult;
  assets: {
    narrationAudio: string;
    sceneImages: string[];
    captionsFile: string;
  };
}

export interface JobStatus {
  id: string;
  type: string;
  status: JobStatusType;
  progress: number; // 0-100
  result?: JobResultData;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
  includeCaptions: boolean;
  includeMusic: boolean;
  darkGrade: boolean;
  vignette: boolean;
  glitchTransitions: boolean;
  musicVolume: number;
}

export interface CreateJobRequest {
  type: string;
  prompt?: string;
  story?: StoryInput;
  options?: Partial<RenderOptions>;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: Date;
  ffmpeg?: {
    available: boolean;
    version?: string;
  };
  jobs?: {
    total: number;
    completed: number;
    failed: number;
    running: number;
  };
}

export interface CaptionSegment {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface RenderSceneInput {
  imagePath: string;
  duration: number;
  caption: string;
}

export interface RenderResult {
  videoPath: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
}
