import { NicheProfile, NicheProfileSchema } from '../types/niche';
import { horrorProfile, redditStoriesProfile } from './niches';
import logger from '../utils/logger';

/**
 * Registry of all available niche profiles
 */
const NICHE_PROFILES: Map<string, NicheProfile> = new Map();

/**
 * Initialize the niche profile registry
 */
export const initializeNicheProfiles = (): void => {
  const profiles = [horrorProfile, redditStoriesProfile];

  for (const profile of profiles) {
    try {
      // Validate profile against schema
      const validated = NicheProfileSchema.parse(profile);
      NICHE_PROFILES.set(validated.id, validated);
      logger.info('Niche profile loaded', {
        nicheId: validated.id,
        name: validated.name,
      });
    } catch (error) {
      logger.error('Failed to load niche profile', {
        nicheId: profile.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Invalid niche profile configuration: ${profile.id}`);
    }
  }

  logger.info('Niche profiles initialized', {
    count: NICHE_PROFILES.size,
    niches: Array.from(NICHE_PROFILES.keys()),
  });
};

/**
 * Get a niche profile by ID
 * @throws Error if niche profile not found
 */
export const getNicheProfile = (nicheId: string): NicheProfile => {
  const profile = NICHE_PROFILES.get(nicheId);
  if (!profile) {
    const available = Array.from(NICHE_PROFILES.keys()).join(', ');
    throw new Error(
      `Unknown niche profile: "${nicheId}". Available niches: ${available}`
    );
  }
  return profile;
};

/**
 * Get all available niche profiles
 */
export const getAllNicheProfiles = (): NicheProfile[] => {
  return Array.from(NICHE_PROFILES.values());
};

/**
 * Check if a niche profile exists
 */
export const hasNicheProfile = (nicheId: string): boolean => {
  return NICHE_PROFILES.has(nicheId);
};

/**
 * Get list of available niche IDs
 */
export const getAvailableNicheIds = (): string[] => {
  return Array.from(NICHE_PROFILES.keys());
};
