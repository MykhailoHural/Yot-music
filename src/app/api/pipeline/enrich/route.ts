import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enrichAllTracks } from '@/lib/pipeline/enrich';
import { parseAllTracks } from '@/lib/pipeline/parse';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = (session.user as any).id;
    // Step 1: Parse titles if not already done
    await parseAllTracks(userId);
    // Step 2: Enrich with Spotify/Last.fm
    const result = await enrichAllTracks(userId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Enrich failed:', err);
    return NextResponse.json({ error: err.message || 'Enrich failed' }, { status: 500 });
  }
}
