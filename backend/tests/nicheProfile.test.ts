import { NicheProfileSchema } from '../src/types/niche';
import { horrorProfile, redditStoriesProfile } from '../src/config/niches';
import { 
  initializeNicheProfiles,
  getNicheProfile,
  hasNicheProfile,
  getAvailableNicheIds,
  getAllNicheProfiles,
} from '../src/config/nicheLoader';

describe('Niche Profile Validation', () => {
  beforeAll(() => {
    initializeNicheProfiles();
  });

  it('validates horror profile against schema', () => {
    expect(() => NicheProfileSchema.parse(horrorProfile)).not.toThrow();
  });

  it('validates reddit_stories profile against schema', () => {
    expect(() => NicheProfileSchema.parse(redditStoriesProfile)).not.toThrow();
  });

  it('has required fields in horror profile', () => {
    expect(horrorProfile.id).toBe('horror');
    expect(horrorProfile.name).toBeDefined();
    expect(horrorProfile.storyStyle).toBeDefined();
    expect(horrorProfile.visuals).toBeDefined();
    expect(horrorProfile.voice).toBeDefined();
    expect(horrorProfile.hashtagsAndMetadata).toBeDefined();
  });

  it('has required fields in reddit_stories profile', () => {
    expect(redditStoriesProfile.id).toBe('reddit_stories');
    expect(redditStoriesProfile.name).toBeDefined();
    expect(redditStoriesProfile.storyStyle).toBeDefined();
    expect(redditStoriesProfile.visuals).toBeDefined();
    expect(redditStoriesProfile.voice).toBeDefined();
    expect(redditStoriesProfile.hashtagsAndMetadata).toBeDefined();
  });
});

describe('Niche Profile Loader', () => {
  beforeAll(() => {
    initializeNicheProfiles();
  });

  it('loads all niche profiles', () => {
    const profiles = getAllNicheProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(2);
  });

  it('gets niche profile by ID', () => {
    const horror = getNicheProfile('horror');
    expect(horror.id).toBe('horror');
    expect(horror.name).toBe('Horror & Creepy Stories');
  });

  it('throws error for unknown niche', () => {
    expect(() => getNicheProfile('unknown_niche')).toThrow('Unknown niche profile');
  });

  it('checks if niche profile exists', () => {
    expect(hasNicheProfile('horror')).toBe(true);
    expect(hasNicheProfile('reddit_stories')).toBe(true);
    expect(hasNicheProfile('unknown')).toBe(false);
  });

  it('returns available niche IDs', () => {
    const ids = getAvailableNicheIds();
    expect(ids).toContain('horror');
    expect(ids).toContain('reddit_stories');
  });
});
