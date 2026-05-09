import { youtube_v3 } from 'googleapis';
import { getYoutubeClient } from '../youtube';
import { prisma } from '../prisma';

export async function extractUserPlaylists(userId: string) {
  const yt = await getYoutubeClient(userId);
  const startedAt = new Date();

  // 1. Fetch all user playlists
  const playlists: youtube_v3.Schema$Playlist[] = [];
  let pageToken: string | undefined;
  
  do {
    const res = await yt.playlists.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
      maxResults: 50,
      pageToken,
    });
    if (res.data.items) {
      playlists.push(...res.data.items);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  // 2. For each playlist — fetch tracks
  for (const pl of playlists) {
    if (!pl.id) continue;

    const existing = await prisma.playlist.findUnique({
      where: { userId_ytPlaylistId: { userId, ytPlaylistId: pl.id } },
    });

    // Resumability: Skip if fully extracted and item count hasn't changed
    if (existing?.fullyExtracted && existing.itemCount === (pl.contentDetails?.itemCount ?? 0)) {
      await prisma.playlist.update({
        where: { id: existing.id },
        data: { lastSeenAt: startedAt },
      });
      continue;
    }

    const dbPlaylist = await prisma.playlist.upsert({
      where: { userId_ytPlaylistId: { userId, ytPlaylistId: pl.id } },
      create: {
        userId,
        ytPlaylistId: pl.id,
        title: pl.snippet?.title ?? 'Untitled',
        description: pl.snippet?.description,
        itemCount: pl.contentDetails?.itemCount ?? 0,
        fullyExtracted: false,
      },
      update: {
        title: pl.snippet?.title ?? 'Untitled',
        itemCount: pl.contentDetails?.itemCount ?? 0,
        extractedAt: startedAt,
        lastSeenAt: startedAt,
        fullyExtracted: false,
      },
    });

    // 3. Fetch tracks from the playlist
    const videoIds: string[] = [];
    let itemPageToken: string | undefined;
    let position = 0;

    do {
      const res = await yt.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: pl.id,
        maxResults: 50,
        pageToken: itemPageToken,
      });

      if (res.data.items) {
        for (const item of res.data.items) {
          const videoId = item.contentDetails?.videoId;
          if (!videoId) continue;
          videoIds.push(videoId);

          const track = await prisma.track.upsert({
            where: { userId_ytVideoId: { userId, ytVideoId: videoId } },
            create: {
              userId,
              ytVideoId: videoId,
              title: item.snippet?.title ?? 'Unknown',
              channelTitle: item.snippet?.videoOwnerChannelTitle ?? '',
            },
            update: {
              title: item.snippet?.title ?? 'Unknown',
              channelTitle: item.snippet?.videoOwnerChannelTitle ?? '',
            },
          });

          await prisma.playlistItem.upsert({
            where: { playlistId_trackId: { playlistId: dbPlaylist.id, trackId: track.id } },
            create: { playlistId: dbPlaylist.id, trackId: track.id, position },
            update: { position },
          });

          position++;
        }
      }

      itemPageToken = res.data.nextPageToken ?? undefined;
    } while (itemPageToken);

    // 4. Batch request categories and duration for all tracks (50 IDs per request = 1 unit)
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const videosRes = await yt.videos.list({
        part: ['snippet', 'contentDetails'],
        id: batch,
      });

      if (videosRes.data.items) {
        for (const v of videosRes.data.items) {
          if (!v.id) continue;
          await prisma.track.update({
            where: { userId_ytVideoId: { userId, ytVideoId: v.id } },
            data: {
              ytCategoryId: v.snippet?.categoryId ?? null,
              durationSec: parseDuration(v.contentDetails?.duration),
            },
          });
        }
      }
    }

    // 5. Mark as fully extracted
    await prisma.playlist.update({
      where: { id: dbPlaylist.id },
      data: { fullyExtracted: true },
    });
  }

  // 6. Soft-delete: Identify playlists not seen in this run
  const stalePlaylistsCount = await prisma.playlist.count({
    where: { userId, lastSeenAt: { lt: startedAt } },
  });

  return {
    playlistCount: playlists.length,
    stalePlaylistsCount,
  };
}

// ISO 8601 duration to seconds (PT3M45S -> 225)
function parseDuration(iso?: string | null): number | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const [, h, m, s] = match;
  return (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0);
}
