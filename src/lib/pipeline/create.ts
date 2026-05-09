import { getYoutubeClient } from '../youtube';
import { prisma } from '../prisma';

const PLAYLIST_NAME_PREFIX = '🎵';
const PLAYLIST_NAME_SUFFIX = '(Auto)';

// Safety budget: Limit to 6,000 units per day (Total is 10,000)
const DAILY_QUOTA_BUDGET = 6000;
const QUOTA_PER_PLAYLIST_INSERT = 50;
const QUOTA_PER_ITEM_INSERT = 50;

export async function createGenrePlaylists(userId: string, genres: string[], maxTracksPerPlaylist = 100) {
  const yt = await getYoutubeClient(userId);
  let quotaUsed = 0;

  // 1. Prepare plan: group tracks by genre
  const plan = await Promise.all(genres.map(async (genre) => {
    const trackGenres = await prisma.trackGenre.findMany({
      where: { genre, track: { userId } },
      include: { track: true },
      orderBy: { confidence: 'desc' },
      take: maxTracksPerPlaylist,
    });
    return { genre, tracks: trackGenres };
  }));

  // 2. Process each genre
  for (const { genre, tracks } of plan) {
    if (tracks.length === 0) continue;

    // Quota check BEFORE starting a genre
    const estimatedCost = QUOTA_PER_PLAYLIST_INSERT + (tracks.length * QUOTA_PER_ITEM_INSERT);
    if (quotaUsed + estimatedCost > DAILY_QUOTA_BUDGET) {
      console.warn(`Quota budget reached. Skipping genre "${genre}". Run again later.`);
      break;
    }

    // 3. Check for existing (incomplete) generated playlist to resume
    let generatedPl = await prisma.generatedPlaylist.findFirst({
      where: { userId, genre, isComplete: false },
    });

    let ytPlaylistId: string;
    let startFrom: number;

    if (generatedPl) {
      ytPlaylistId = generatedPl.ytPlaylistId;
      startFrom = generatedPl.tracksAdded;
      console.log(`Resuming "${genre}" from track ${startFrom + 1}/${tracks.length}`);
    } else {
      // Create NEW playlist
      const playlistResp = await yt.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: `${PLAYLIST_NAME_PREFIX} ${genre} ${PLAYLIST_NAME_SUFFIX}`,
            description: `Automatically generated playlist for ${genre} genre. Created by yt-music-classifier.`,
          },
          status: { privacyStatus: 'private' },
        },
      });
      quotaUsed += QUOTA_PER_PLAYLIST_INSERT;
      ytPlaylistId = playlistResp.data.id!;
      startFrom = 0;

      generatedPl = await prisma.generatedPlaylist.create({
        data: {
          userId,
          ytPlaylistId,
          title: `${PLAYLIST_NAME_PREFIX} ${genre} ${PLAYLIST_NAME_SUFFIX}`,
          genre,
          trackCount: tracks.length,
          tracksAdded: 0,
          isComplete: false,
        },
      });
      console.log(`Created new playlist for "${genre}": ${ytPlaylistId}`);
    }

    // 4. Add tracks one by one
    for (let i = startFrom; i < tracks.length; i++) {
      if (quotaUsed + QUOTA_PER_ITEM_INSERT > DAILY_QUOTA_BUDGET) {
        console.warn(`Quota budget reached mid-playlist "${genre}". Stopping.`);
        return { quotaUsed, stoppedAt: { genre, trackIndex: i } };
      }

      try {
        await yt.playlistItems.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              playlistId: ytPlaylistId,
              resourceId: { kind: 'youtube#video', videoId: tracks[i].track.ytVideoId },
            },
          },
        });
        quotaUsed += QUOTA_PER_ITEM_INSERT;

        // Update progress in DB
        await prisma.generatedPlaylist.update({
          where: { id: generatedPl.id },
          data: { tracksAdded: i + 1 },
        });
      } catch (err: any) {
        if (err?.code === 403 && err?.message?.includes('quota')) {
          console.error('Quota exhausted by API response. Stopping.');
          return { quotaUsed, stoppedAt: { genre, trackIndex: i } };
        }
        console.error(`Failed to add track ${tracks[i].track.ytVideoId} to ${genre}:`, err);
        // Continue to next track on non-quota errors
      }
    }

    // 5. Mark as complete
    await prisma.generatedPlaylist.update({
      where: { id: generatedPl.id },
      data: { isComplete: true },
    });
    console.log(`Completed playlist for "${genre}" with ${tracks.length} tracks.`);
  }

  return { quotaUsed, stoppedAt: null };
}
