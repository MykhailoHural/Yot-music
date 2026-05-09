'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">YouTube Music Auto-Classifier</h1>
        <p className="text-xl text-center max-w-2xl">
          Extract your YouTube playlists, classify tracks using AI, and create new genre-based playlists automatically.
        </p>
        
        <div className="flex gap-4">
          {session ? (
            <>
              <Link href="/dashboard" className={buttonVariants()}>Go to Dashboard</Link>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button onClick={() => signIn('google')}>
              Sign in with Google
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
