import { describe, it, expect } from 'vitest';
import { parseTitle } from '../parser';

describe('parseTitle', () => {
  describe('Strategy 1 — "Artist - Song" dash formats', () => {
    it('parses standard hyphen', () => {
      const r = parseTitle('Radiohead - Creep', '');
      expect(r).toMatchObject({ artist: 'Radiohead', song: 'Creep', confidence: 0.85 });
    });

    it('parses en-dash (–)', () => {
      const r = parseTitle('The Cure – Boys Don\'t Cry', '');
      expect(r).toMatchObject({ artist: 'The Cure', song: 'Boys Don\'t Cry', confidence: 0.85 });
    });

    it('parses em-dash (—)', () => {
      const r = parseTitle('Portishead — Glory Box', '');
      expect(r).toMatchObject({ artist: 'Portishead', song: 'Glory Box', confidence: 0.85 });
    });
  });

  describe('Noise pattern removal', () => {
    it('strips "(Official Video)"', () => {
      const r = parseTitle('Nirvana - Smells Like Teen Spirit (Official Video)', '');
      expect(r.song).toBe('Smells Like Teen Spirit');
    });

    it('strips "[Official Audio]"', () => {
      const r = parseTitle('Billie Eilish - bad guy [Official Audio]', '');
      expect(r.song).toBe('bad guy');
    });

    it('strips "(Lyrics)"', () => {
      const r = parseTitle('Coldplay - Yellow (Lyrics)', '');
      expect(r.song).toBe('Yellow');
    });

    it('strips "(Remastered 2011)"', () => {
      const r = parseTitle('David Bowie - Heroes (Remastered 2011)', '');
      expect(r.song).toBe('Heroes');
    });

    it('strips year tags like (2017)', () => {
      const r = parseTitle('Arcade Fire - Rebellion (Lies) (2004)', '');
      expect(r.song).toBe('Rebellion (Lies)');
    });

    it('strips Ukrainian noise "(Офіційне відео)"', () => {
      const r = parseTitle('Океан Ельзи - Обійми (Офіційне відео)', '');
      expect(r.song).toBe('Обійми');
    });
  });

  describe('Strategy 2 — "Artist: Song" and "Artist. Song"', () => {
    it('parses colon separator', () => {
      const r = parseTitle('Pink Floyd: Wish You Were Here', '');
      expect(r).toMatchObject({ artist: 'Pink Floyd', song: 'Wish You Were Here', confidence: 0.6 });
    });
  });

  describe('Strategy 3 — channel name as artist fallback', () => {
    it('uses channel title when no separator found', () => {
      const r = parseTitle('Creep', 'Radiohead');
      expect(r).toMatchObject({ artist: 'Radiohead', song: 'Creep', confidence: 0.5 });
    });

    it('ignores channel with VEVO noise', () => {
      const r = parseTitle('SomeSong', 'ArtistVEVO');
      expect(r.artist).toBeNull();
      expect(r.confidence).toBe(0.0);
    });
  });

  describe('Strategy 4 — low confidence fallback', () => {
    it('returns null artist and 0 confidence for unknown format', () => {
      const r = parseTitle('just a title with no artist info', '');
      expect(r.artist).toBeNull();
      expect(r.confidence).toBe(0.0);
    });
  });
});
