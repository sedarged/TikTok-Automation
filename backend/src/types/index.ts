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
  audioUrl?: string;
  duration?: number;
}

export interface StoryResult {
  id: string;
  title: string;
  description: string;
  scenes: Scene[];
  totalDuration: number;
  createdAt: Date;
}

export type JobStatusType = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobStatus {
  id: string;
  type: string;
  status: JobStatusType;
  progress: number; // 0-100
  result?: StoryResult | string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
  format: string;
  quality: string;
  includeCaptions: boolean;
  includeMusic: boolean;
}

export interface CreateJobRequest {
  type: string;
  prompt?: string;
  options?: Partial<RenderOptions>;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: Date;
}
