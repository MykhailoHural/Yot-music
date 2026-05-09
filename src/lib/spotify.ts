import { SpotifyApi } from '@spotify/web-api-ts-sdk';

const sdk = SpotifyApi.withClientCredentials(
  process.env.SPOTIFY_CLIENT_ID!,
  process.env.SPOTIFY_CLIENT_SECRET!
);

export async function searchSpotifyTrack(artist: string, song: string) {
  type SpotifyTrack = NonNullable<Awaited<ReturnType<typeof tryExactSearch>>>;
  let track: SpotifyTrack | null = await tryExactSearch(artist, song);

  if (!track) track = await tryTrackOnlySearch(artist, song);
  if (!track) track = await tryFreeFormSearch(artist, song);

  if (!track) return null;

  // Fetch artist data to get genres (Spotify stores genres on the artist)
  const artistData = await sdk.artists.get(track.artists[0].id);
  
  return {
    spotifyTrackId: track.id,
    spotifyArtistId: track.artists[0].id,
    spotifyGenres: artistData.genres,
  };
}

async function tryExactSearch(artist: string, song: string) {
  const query = `track:"${escape(song)}" artist:"${escape(artist)}"`;
  const results = await sdk.search(query, ['track'], undefined, 1);
  return results.tracks.items[0] ?? null;
}

async function tryTrackOnlySearch(artist: string, song: string) {
  const query = `track:"${escape(song)}"`;
  const results = await sdk.search(query, ['track'], undefined, 5);
  const lowerArtist = artist.toLowerCase();
  
  return results.tracks.items.find(t =>
    t.artists.some(a => 
      a.name.toLowerCase().includes(lowerArtist) ||
      lowerArtist.includes(a.name.toLowerCase())
    )
  ) ?? null;
}

async function tryFreeFormSearch(artist: string, song: string) {
  const results = await sdk.search(`${artist} ${song}`, ['track'], undefined, 1);
  return results.tracks.items[0] ?? null;
}

function escape(s: string): string {
  return s.replace(/["\\]/g, '');
}
