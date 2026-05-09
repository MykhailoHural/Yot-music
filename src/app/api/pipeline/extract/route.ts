import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractUserPlaylists } from '@/lib/pipeline/extract';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await extractUserPlaylists((session.user as any).id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Extract failed:', err);
    return NextResponse.json({ error: err.message || 'Extract failed' }, { status: 500 });
  }
}
