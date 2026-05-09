import { prisma } from '../prisma';
import { searchSpotifyTrack } from '../spotify';
import { getLastFmTags } from '../lastfm';

const CONCURRENCY = 5;

export async function enrichAllTracks(userId: string) {
  const tracks = await prisma.track.findMany({
    where: {
      userId,
      enrichment: null,
      parsedArtist: { not: null },
    },
  });

  for (let i = 0; i < tracks.length; i += CONCURRENCY) {
    const batch = tracks.slice(i, i + CONCURRENCY);
    
    await Promise.allSettled(batch.map(async (track) => {
      const artist = track.parsedArtist!;
      const song = track.parsedSong ?? track.title;

      const [spotifyData, lastfmTags] = await Promise.all([
        searchSpotifyTrack(artist, song),
        getLastFmTags(artist, song),
      ]);

      await prisma.trackEnrichment.create({
        data: {
          trackId: track.id,
          spotifyTrackId: spotifyData?.spotifyTrackId,
          spotifyArtistId: spotifyData?.spotifyArtistId,
          spotifyGenres: spotifyData?.spotifyGenres ?? [],
          spotifyMatched: !!spotifyData,
          lastfmTopTags: lastfmTags ?? [],
          lastfmMatched: !!lastfmTags,
        },
      });
    }));
  }

  return { enrichedCount: tracks.length };
}
