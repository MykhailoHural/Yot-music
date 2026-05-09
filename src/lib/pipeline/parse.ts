import { prisma } from '../prisma';
import { parseTitle } from '../parser';
import { aiParseTitle } from '../parser-ai';

export async function parseAllTracks(userId: string) {
  const tracks = await prisma.track.findMany({
    where: { userId, parsedArtist: null },
  });

  for (const track of tracks) {
    // 1. Regex parser
    const regexResult = parseTitle(track.title, track.channelTitle);

    if (regexResult.confidence >= 0.5) {
      // Confident enough with regex
      await prisma.track.update({
        where: { id: track.id },
        data: {
          parsedArtist: regexResult.artist,
          parsedSong: regexResult.song,
          parseConfidence: regexResult.confidence,
          parsedByAi: false,
        },
      });
    } else {
      // 2. AI fallback for low confidence
      try {
        const aiResult = await aiParseTitle(track.title, track.channelTitle);
        if (aiResult.confidence >= 0.3) {
          await prisma.track.update({
            where: { id: track.id },
            data: {
              parsedArtist: aiResult.artist,
              parsedSong: aiResult.song,
              parseConfidence: aiResult.confidence,
              parsedByAi: true,
            },
          });
        }
      } catch (err) {
        console.error(`AI parse failed for track ${track.id}:`, err);
      }
    }
  }
}
