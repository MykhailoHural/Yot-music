import 'dotenv/config';

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const BASE = 'https://www.googleapis.com/youtube/v3';

async function getAllPlaylists() {
  const playlists = [];
  let pageToken = '';

  do {
    const url = `${BASE}/playlists?part=snippet,contentDetails&channelId=${CHANNEL_ID}&maxResults=50&pageToken=${pageToken}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.error('API Error:', data.error.message);
      process.exit(1);
    }

    playlists.push(...data.items);
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return playlists;
}

async function getPlaylistVideos(playlistId) {
  const videos = [];
  let pageToken = '';

  do {
    const url = `${BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${pageToken}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.error('API Error:', data.error.message);
      process.exit(1);
    }

    videos.push(...data.items);
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return videos;
}

async function main() {
  console.log('Fetching all playlists...\n');

  const playlists = await getAllPlaylists();
  console.log(`Found ${playlists.length} playlists\n`);

  for (const pl of playlists) {
    console.log(`=== ${pl.snippet.title} | ID: ${pl.id} | ${pl.contentDetails.itemCount} tracks ===`);

    const videos = await getPlaylistVideos(pl.id);
    videos.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.snippet.title}`);
    });

    console.log('');
  }
}

main();