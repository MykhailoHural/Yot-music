interface ParsedTitle {
  artist: string | null;
  song: string | null;
  confidence: number; // 0..1
}

const NOISE_PATTERNS = [
  // English
  /\(official\s+(audio|video|music\s+video|lyric\s+video)\)/gi,
  /\[official\s+(audio|video|music\s+video|lyric\s+video)\]/gi,
  /\(lyrics?\)/gi,
  /\[lyrics?\]/gi,
  /\(hd\)/gi,
  /\(4k\)/gi,
  /\[hd\]/gi,
  /\[4k\]/gi,
  /\(prod\.?\s+by[^)]*\)/gi,
  /\(feat\.?[^)]*\)/gi,
  /\(ft\.?[^)]*\)/gi,
  /\(remaster(ed)?\s*\d*\)/gi,
  /\(live\s*(at|in|@)?[^)]*\)/gi,
  /\[live\s*(at|in|@)?[^)]*\]/gi,
  // Year tags: (2017), [2020]
  /[\(\[]\s*(19|20)\d{2}\s*[\)\]]/g,
  // Cyrillic
  /\(оф[іи]ц[іи]йн[ае]\s+(в[іи]део|аудіо|кліп)\)/gi,
  /\[оф[іи]ц[іи]йн[ае]\s+(в[іи]део|аудіо|кліп)\]/gi,
  /\(прем\W?[єе]ра\)/gi,
  /\[прем\W?[єе]ра\]/gi,
  /\(текст\s+п[іи]сн[іи]\)/gi,
  /\(л[іи]рика\)/gi,
];

function clean(s: string): string {
  let result = s;
  for (const pattern of NOISE_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

const CHANNEL_NOISE = /(VEVO|Records|Music|Topic|Channel|Official|Records|Entertainment)/i;

export function parseTitle(rawTitle: string, channelTitle: string): ParsedTitle {
  const cleaned = clean(rawTitle);

  // Strategy 1: "Artist - Song" (supports different dashes)
  const dashMatch = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return { artist: dashMatch[1].trim(), song: dashMatch[2].trim(), confidence: 0.85 };
  }

  // Strategy 2: "Artist. Song" or "Artist: Song"
  const dotColonMatch = cleaned.match(/^([^.:]{2,40})[.:]\s*(.+)$/);
  if (dotColonMatch) {
    return { artist: dotColonMatch[1].trim(), song: dotColonMatch[2].trim(), confidence: 0.6 };
  }

  // Strategy 3: channel title looks like artist
  if (channelTitle && !CHANNEL_NOISE.test(channelTitle)) {
    return { artist: channelTitle.trim(), song: cleaned, confidence: 0.5 };
  }

  // Strategy 4: low confidence - fallback to AI
  return { artist: null, song: cleaned, confidence: 0.0 };
}
