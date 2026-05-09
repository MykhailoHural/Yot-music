const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

export async function getLastFmTags(artist: string, song: string) {
  const url = new URL(LASTFM_BASE);
  url.searchParams.set('method', 'track.getTopTags');
  url.searchParams.set('artist', artist);
  url.searchParams.set('track', song);
  url.searchParams.set('api_key', process.env.LASTFM_API_KEY!);
  url.searchParams.set('format', 'json');

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    const tags = data?.toptags?.tag;
    
    if (!Array.isArray(tags)) return null;

    return tags.slice(0, 10).map((t: any) => t.name.toLowerCase());
  } catch (err) {
    console.error(`Last.fm request failed for ${artist} - ${song}:`, err);
    return null;
  }
}
