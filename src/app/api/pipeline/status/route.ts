import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;

  const [playlistCount, trackCount, enrichedCount, classifiedCount, generatedCount] = await Promise.all([
    prisma.playlist.count({ where: { userId } }),
    prisma.track.count({ where: { userId } }),
    prisma.trackEnrichment.count({ where: { track: { userId } } }),
    prisma.trackGenre.groupBy({ by: ['trackId'], where: { track: { userId } } }).then(r => r.length),
    prisma.generatedPlaylist.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    playlistCount,
    trackCount,
    enrichedCount,
    classifiedCount,
    generatedCount,
  });
}
