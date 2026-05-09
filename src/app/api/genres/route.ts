import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;

  const genres = await prisma.trackGenre.groupBy({
    by: ['genre'],
    where: { track: { userId } },
    _count: {
      trackId: true,
    },
    orderBy: {
      _count: {
        trackId: 'desc',
      },
    },
  });

  return NextResponse.json(genres.map(g => ({
    name: g.genre,
    count: g._count.trackId,
  })));
}
