import { describe, it, expect } from 'vitest';
import { parseDuration } from '../duration';

describe('parseDuration', () => {
  it('parses minutes and seconds', () => {
    expect(parseDuration('PT3M45S')).toBe(225);
  });

  it('parses hours, minutes, and seconds', () => {
    expect(parseDuration('PT1H30M0S')).toBe(5400);
  });

  it('parses hours only', () => {
    expect(parseDuration('PT2H')).toBe(7200);
  });

  it('parses seconds only', () => {
    expect(parseDuration('PT45S')).toBe(45);
  });

  it('parses minutes only', () => {
    expect(parseDuration('PT5M')).toBe(300);
  });

  it('returns null for null input', () => {
    expect(parseDuration(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseDuration(undefined)).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parseDuration('not-a-duration')).toBeNull();
  });

  it('handles zero duration', () => {
    expect(parseDuration('PT0S')).toBe(0);
  });
});
