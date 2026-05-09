import { prisma } from '../prisma';
import { classifyTrack } from '../llm';

const MAX_COST_USD = 10; // Hard cap safety
const CONCURRENCY = 3;

export async function classifyAllTracks(userId: string) {
  const tracks = await prisma.track.findMany({
    where: {
      userId,
      genres: { none: {} }, // Only those not yet classified
      parsedArtist: { not: null },
    },
    include: { enrichment: true },
  });

  let totalCostUsd = 0;
  let done = 0;
  let failed = 0;

  for (let i = 0; i < tracks.length; i += CONCURRENCY) {
    // Budget check BEFORE each batch
    if (totalCostUsd >= MAX_COST_USD) {
      console.error(`Budget cap reached: $${totalCostUsd.toFixed(2)} >= $${MAX_COST_USD}. Stopping.`);
      break;
    }

    const batch = tracks.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(async (track) => {
      const result = await classifyTrack({
        artist: track.parsedArtist ?? '',
        song: track.parsedSong ?? track.title,
        spotifyGenres: track.enrichment?.spotifyGenres ?? [],
        lastfmTags: track.enrichment?.lastfmTopTags ?? [],
      });

      // Save to DB in a transaction
      await prisma.$transaction(
        result.genres.map((g, idx) =>
          prisma.trackGenre.create({
            data: {
              trackId: track.id,
              genre: g.name,
              confidence: g.confidence,
              isPrimary: idx === 0,
              modelUsed: 'claude-sonnet-4-6',
            },
          })
        )
      );

      return result;
    }));

    for (const r of results) {
      if (r.status === 'fulfilled') {
        done++;
        totalCostUsd += r.value.costUsd;
      } else {
        failed++;
        console.error('Classification failed for a track:', r.reason);
      }
    }

    console.log(
      `Progress: [${done + failed}/${tracks.length}] cost: $${totalCostUsd.toFixed(4)} ` +
      `(cap: $${MAX_COST_USD})`
    );
  }

  return { done, failed, totalCostUsd };
}
