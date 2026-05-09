import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { classifyAllTracks } from '@/lib/pipeline/classify';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await classifyAllTracks((session.user as any).id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Classify failed:', err);
    return NextResponse.json({ error: err.message || 'Classify failed' }, { status: 500 });
  }
}
