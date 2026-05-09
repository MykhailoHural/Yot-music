export const GENRE_TAXONOMY = {
  rock: ['Rock', 'Indie Rock', 'Alternative Rock', 'Hard Rock', 'Punk Rock', 'Post-Rock'],
  pop: ['Pop', 'Indie Pop', 'Synth-Pop', 'Dream Pop', 'K-Pop'],
  electronic: ['Electronic', 'House', 'Techno', 'Ambient', 'Drum and Bass', 'Synthwave'],
  hip_hop: ['Hip-Hop', 'Trap', 'Conscious Rap', 'Old School Hip-Hop'],
  metal: ['Metal', 'Heavy Metal', 'Death Metal', 'Black Metal', 'Doom Metal'],
  jazz: ['Jazz', 'Smooth Jazz', 'Bebop', 'Fusion'],
  classical: ['Classical', 'Baroque', 'Romantic', 'Modern Classical'],
  folk: ['Folk', 'Indie Folk', 'Folk Rock', 'Country'],
  rnb: ['R&B', 'Soul', 'Funk', 'Neo-Soul'],
  ambient: ['Ambient', 'Drone', 'Lo-fi'],
  ukrainian: ['Ukrainian Pop', 'Ukrainian Rock', 'Ukrainian Folk'],
} as const;

export const ALL_GENRES = Object.values(GENRE_TAXONOMY).flat();
