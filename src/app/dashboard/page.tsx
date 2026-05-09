'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Music, Search, Tag, Send } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    playlistCount: 0,
    trackCount: 0,
    enrichedCount: 0,
    classifiedCount: 0,
    generatedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/pipeline/status');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const runStage = async (stage: string) => {
    setProcessing(stage);
    const promise = fetch(`/api/pipeline/${stage}`, { method: 'POST' });
    
    toast.promise(promise, {
      loading: `Running ${stage}...`,
      success: (res) => {
        fetchStats();
        return `${stage} completed successfully!`;
      },
      error: (err) => `${stage} failed: ${err.message}`,
      finally: () => setProcessing(null),
    });
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Pipeline Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Playlists</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.playlistCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracks</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trackCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enriched</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enrichedCount}</div>
            <Progress value={(stats.enrichedCount / (stats.trackCount || 1)) * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generated</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.generatedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Extract</CardTitle>
            <CardDescription>Fetch playlists and tracks from your YouTube account.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => runStage('extract')} disabled={!!processing}>
              {processing === 'extract' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Extraction
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Enrich</CardTitle>
            <CardDescription>Search Spotify and Last.fm for metadata (genres, tags).</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => runStage('enrich')} disabled={!!processing || stats.trackCount === 0}>
              {processing === 'enrich' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Enrichment
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Classify</CardTitle>
            <CardDescription>Use Claude AI to categorize tracks into genres.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => runStage('classify')} disabled={!!processing || stats.enrichedCount === 0}>
              {processing === 'classify' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Classification
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 4: Create</CardTitle>
            <CardDescription>Create new genre-based playlists on YouTube.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              href="/dashboard/create"
              className={buttonVariants({ variant: 'default' })}
              aria-disabled={!!processing || stats.classifiedCount === 0}
            >
              Configure &amp; Create
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
