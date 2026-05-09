import { PrismaClient } from '@prisma/client';
import { GENRE_TAXONOMY, ALL_GENRES } from '../src/data/genre-taxonomy';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying DB connection and schema...\n');

  // Verify all 7 tables exist by running a count on each
  const counts = await Promise.all([
    prisma.user.count().then(n => ({ table: 'User', count: n })),
    prisma.playlist.count().then(n => ({ table: 'Playlist', count: n })),
    prisma.track.count().then(n => ({ table: 'Track', count: n })),
    prisma.playlistItem.count().then(n => ({ table: 'PlaylistItem', count: n })),
    prisma.trackEnrichment.count().then(n => ({ table: 'TrackEnrichment', count: n })),
    prisma.trackGenre.count().then(n => ({ table: 'TrackGenre', count: n })),
    prisma.generatedPlaylist.count().then(n => ({ table: 'GeneratedPlaylist', count: n })),
  ]);

  console.log('Tables found:');
  for (const { table, count } of counts) {
    console.log(`  ✓ ${table.padEnd(20)} ${count} rows`);
  }

  console.log(`\nGenre taxonomy loaded: ${ALL_GENRES.length} genres across ${Object.keys(GENRE_TAXONOMY).length} categories`);
  for (const [category, genres] of Object.entries(GENRE_TAXONOMY)) {
    console.log(`  ${category.padEnd(12)} → ${genres.join(', ')}`);
  }

  console.log('\n✅ DB is ready. Run the pipeline via the dashboard to populate data.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
