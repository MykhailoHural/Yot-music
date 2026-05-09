import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createGenrePlaylists } from '@/lib/pipeline/create';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { genres, maxTracksPerPlaylist } = await req.json();
    if (!genres || !Array.isArray(genres)) {
      return NextResponse.json({ error: 'Genres array is required' }, { status: 400 });
    }
    const limit = typeof maxTracksPerPlaylist === 'number' && maxTracksPerPlaylist > 0
      ? Math.min(maxTracksPerPlaylist, 500)
      : 100;

    const result = await createGenrePlaylists((session.user as any).id, genres, limit);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Create failed:', err);
    return NextResponse.json({ error: err.message || 'Create failed' }, { status: 500 });
  }
}
