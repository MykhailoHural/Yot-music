import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing classify
vi.mock('@/lib/prisma', () => ({
  prisma: {
    track: {
      findMany: vi.fn(),
    },
    trackGenre: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/llm', () => ({
  classifyTrack: vi.fn(),
}));

import { classifyAllTracks } from '../classify';
import { prisma } from '@/lib/prisma';
import { classifyTrack } from '@/lib/llm';

const mockPrisma = prisma as unknown as {
  track: { findMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};
const mockClassify = classifyTrack as ReturnType<typeof vi.fn>;

function makeTrack(id: number) {
  return {
    id,
    userId: 'user-1',
    ytVideoId: `vid-${id}`,
    title: `Track ${id}`,
    channelTitle: 'Channel',
    parsedArtist: `Artist ${id}`,
    parsedSong: `Song ${id}`,
    enrichment: { spotifyGenres: [], lastfmTopTags: [] },
  };
}

const GENRE_RESULT = {
  genres: [{ name: 'Indie Rock', confidence: 0.9 }],
  inputTokens: 100,
  outputTokens: 50,
  costUsd: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockResolvedValue([]);
});

describe('classifyAllTracks — budget cap', () => {
  it('stops processing when $10 budget is exceeded', async () => {
    mockPrisma.track.findMany.mockResolvedValue([
      makeTrack(1), makeTrack(2), makeTrack(3),
      makeTrack(4), makeTrack(5), makeTrack(6),
    ]);

    // Each call costs $3.34 — after batch 1 (3 tracks) total = $10.02 → cap hit
    mockClassify.mockResolvedValue({ ...GENRE_RESULT, costUsd: 3.34 });

    const result = await classifyAllTracks('user-1');

    expect(result.done).toBe(3);
    expect(result.totalCostUsd).toBeCloseTo(10.02, 1);
    // Batch 2 (tracks 4-6) never runs
    expect(mockClassify).toHaveBeenCalledTimes(3);
  });

  it('processes all tracks when cost stays under budget', async () => {
    mockPrisma.track.findMany.mockResolvedValue([
      makeTrack(1), makeTrack(2), makeTrack(3),
    ]);

    mockClassify.mockResolvedValue({ ...GENRE_RESULT, costUsd: 0.01 });

    const result = await classifyAllTracks('user-1');

    expect(result.done).toBe(3);
    expect(result.failed).toBe(0);
    expect(mockClassify).toHaveBeenCalledTimes(3);
  });

  it('counts failed tracks when classifyTrack throws', async () => {
    mockPrisma.track.findMany.mockResolvedValue([makeTrack(1), makeTrack(2)]);

    mockClassify
      .mockResolvedValueOnce({ ...GENRE_RESULT, costUsd: 0.01 })
      .mockRejectedValueOnce(new Error('API error'));

    const result = await classifyAllTracks('user-1');

    expect(result.done).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('returns immediately when there are no unclassified tracks', async () => {
    mockPrisma.track.findMany.mockResolvedValue([]);

    const result = await classifyAllTracks('user-1');

    expect(result.done).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockClassify).not.toHaveBeenCalled();
  });
});
