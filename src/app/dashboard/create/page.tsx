'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Music2 } from 'lucide-react';

interface Genre {
  name: string;
  count: number;
}

interface CreateResult {
  quotaUsed: number;
  stoppedAt: { genre: string; trackIndex: number } | null;
}

export default function CreatePage() {
  const { status } = useSession();
  const router = useRouter();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [maxTracks, setMaxTracks] = useState<number>(100);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    else if (status === 'authenticated') fetchGenres();
  }, [status, router]);

  const fetchGenres = async () => {
    try {
      const res = await fetch('/api/genres');
      if (!res.ok) throw new Error('Failed to load genres');
      setGenres(await res.json());
    } catch {
      toast.error('Could not load genres. Run the Classify step first.');
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === genres.length ? new Set() : new Set(genres.map(g => g.name)));
  };

  const totalTracks = genres
    .filter(g => selected.has(g.name))
    .reduce((sum, g) => sum + g.count, 0);

  const handleCreate = async () => {
    setCreating(true);
    setResult(null);
    try {
      const res = await fetch('/api/pipeline/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genres: Array.from(selected), maxTracksPerPlaylist: maxTracks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setResult(data);
      if (data.stoppedAt) {
        toast.warning(`Quota limit reached at "${data.stoppedAt.genre}". Run again tomorrow to continue.`);
      } else {
        toast.success('All playlists created successfully!');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Create Genre Playlists</h1>
      </div>

      {genres.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No classified genres yet.{' '}
            <Link href="/dashboard" className="underline hover:text-foreground">
              Run the Classify step first.
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Tracks per playlist</CardTitle>
              <CardDescription>
                Only the top N tracks by confidence score will be added to each playlist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxTracks}
                  onChange={e => setMaxTracks(Math.max(1, Math.min(500, Number(e.target.value))))}
                  className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground">
                  tracks max per playlist
                  {totalTracks > 0 && selected.size > 0 && (
                    <> · est. <strong>{Math.min(maxTracks, Math.round(totalTracks / selected.size))}</strong> avg per playlist</>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Genres</CardTitle>
              <CardDescription>
                A new private YouTube playlist will be created for each selected genre.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selected.size} of {genres.length} genres · {totalTracks} tracks
                </span>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selected.size === genres.length ? 'Deselect all' : 'Select all'}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {genres.map(genre => {
                  const isSelected = selected.has(genre.name);
                  return (
                    <button
                      key={genre.name}
                      onClick={() => toggleGenre(genre.name)}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="font-medium">{genre.name}</span>
                      <Badge variant={isSelected ? 'default' : 'secondary'}>
                        {genre.count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200">
            <strong>YouTube quota:</strong> Adding each track costs 50 units. Daily limit: 6,000 units (~120 tracks total).
            If stopped early — progress is saved, run again tomorrow to continue.
          </div>

          <Button
            onClick={handleCreate}
            disabled={selected.size === 0 || creating}
            className="w-full"
            size="lg"
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creating
              ? 'Creating playlists...'
              : `Create ${selected.size} playlist${selected.size !== 1 ? 's' : ''}`}
          </Button>

          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="h-5 w-5" />
                  Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Quota used: <strong>{result.quotaUsed}</strong> / 6,000 units</p>
                {result.stoppedAt ? (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    Stopped at <strong>"{result.stoppedAt.genre}"</strong> (track {result.stoppedAt.trackIndex}).
                    Run again tomorrow to continue.
                  </p>
                ) : (
                  <p className="text-green-600 dark:text-green-400">
                    All selected playlists created successfully.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
