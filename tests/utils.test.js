import { describe, it, expect } from 'vitest';
import {
  esc,
  hex2rgba,
  daysBetween,
  parseJSON,
  fmtDate,
  buildMessages,
  encodeShareData,
  decodeShareData,
  TRIP_META,
  BUDGET_META,
} from '../src/utils.js';

// ── esc ──────────────────────────────────────────────────────────────────────

describe('esc', () => {
  it('escapes ampersands', () => expect(esc('a & b')).toBe('a &amp; b'));
  it('escapes less-than', () => expect(esc('<b>')).toBe('&lt;b&gt;'));
  it('escapes double quotes', () => expect(esc('"hello"')).toBe('&quot;hello&quot;'));
  it('returns empty string for null', () => expect(esc(null)).toBe(''));
  it('returns empty string for undefined', () => expect(esc(undefined)).toBe(''));
  it('coerces numbers to string', () => expect(esc(42)).toBe('42'));
  it('does not double-escape existing entities', () =>
    expect(esc('&amp;')).toBe('&amp;amp;'));
  it('handles a typical XSS payload', () =>
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

// ── hex2rgba ─────────────────────────────────────────────────────────────────

describe('hex2rgba', () => {
  it('converts a hex color to rgba', () =>
    expect(hex2rgba('#a78bfa', 0.5)).toBe('rgba(167,139,250,0.5)'));
  it('handles black', () =>
    expect(hex2rgba('#000000', 1)).toBe('rgba(0,0,0,1)'));
  it('handles white with zero alpha', () =>
    expect(hex2rgba('#ffffff', 0)).toBe('rgba(255,255,255,0)'));
  it('handles a primary brand color', () =>
    expect(hex2rgba('#60a5fa', 0.13)).toBe('rgba(96,165,250,0.13)'));
});

// ── daysBetween ───────────────────────────────────────────────────────────────

describe('daysBetween', () => {
  it('returns 0 for the same date', () =>
    expect(daysBetween('2025-06-01', '2025-06-01')).toBe(0));
  it('returns 7 for one week apart', () =>
    expect(daysBetween('2025-06-01', '2025-06-08')).toBe(7));
  it('returns 1 for consecutive days', () =>
    expect(daysBetween('2025-06-01', '2025-06-02')).toBe(1));
  it('returns a negative value when b is before a', () =>
    expect(daysBetween('2025-06-08', '2025-06-01')).toBe(-7));
  it('handles month boundaries', () =>
    expect(daysBetween('2025-01-28', '2025-02-04')).toBe(7));
});

// ── parseJSON ─────────────────────────────────────────────────────────────────

describe('parseJSON', () => {
  it('parses plain JSON', () =>
    expect(parseJSON('{"a":1}')).toEqual({ a: 1 }));

  it('strips ```json code fence', () =>
    expect(parseJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 }));

  it('strips plain ``` code fence', () =>
    expect(parseJSON('```\n{"a":1}\n```')).toEqual({ a: 1 }));

  it('handles leading/trailing whitespace', () =>
    expect(parseJSON('  {"a":1}  ')).toEqual({ a: 1 }));

  it('handles fence with extra whitespace', () =>
    expect(parseJSON('```json   \n{"a":1}\n   ```')).toEqual({ a: 1 }));

  it('parses a realistic itinerary-shaped object', () => {
    const obj = { destination: 'Paris, France', days: [], theme: { flag: '🇫🇷' } };
    expect(parseJSON(JSON.stringify(obj))).toEqual(obj);
  });

  it('throws SyntaxError on malformed JSON', () =>
    expect(() => parseJSON('{bad json}')).toThrow(SyntaxError));

  it('throws on empty string', () =>
    expect(() => parseJSON('')).toThrow());

  it('throws on JSON with trailing comma (invalid)', () =>
    expect(() => parseJSON('{"a":1,}')).toThrow(SyntaxError));
});

// ── fmtDate ───────────────────────────────────────────────────────────────────

describe('fmtDate', () => {
  it('returns empty string for empty input', () =>
    expect(fmtDate('')).toBe(''));
  it('returns empty string for null', () =>
    expect(fmtDate(null)).toBe(''));
  it('returns empty string for undefined', () =>
    expect(fmtDate(undefined)).toBe(''));
  it('contains the year for a valid date', () =>
    expect(fmtDate('2025-06-15')).toContain('2025'));
  it('contains a month abbreviation', () =>
    expect(fmtDate('2025-06-15')).toMatch(/Jun/i));
  it('contains the day number', () =>
    expect(fmtDate('2025-06-15')).toContain('15'));
});

// ── buildMessages ─────────────────────────────────────────────────────────────

describe('buildMessages', () => {
  const base = ['France', 'Paris', '2025-06-01', '10:00', '2025-06-04', '15:00', 'medium', ['solo']];

  it('returns an object with system and user strings', () => {
    const { system, user } = buildMessages(...base);
    expect(typeof system).toBe('string');
    expect(typeof user).toBe('string');
  });

  it('user message includes the destination city and country', () => {
    const { user } = buildMessages(...base);
    expect(user).toContain('Paris');
    expect(user).toContain('France');
  });

  it('user message contains the correct night count', () => {
    const { user } = buildMessages(...base); // Jun 1 → Jun 4 = 3 nights
    expect(user).toContain('3-night');
  });

  it('system message includes the selected budget tier', () => {
    const { system } = buildMessages(...base);
    expect(system).toContain('Medium Budget');
  });

  it('omits city prefix when city is blank', () => {
    const { user } = buildMessages('Japan', '', '2025-07-01', '09:00', '2025-07-05', '18:00', 'high', ['historical']);
    expect(user).toContain('Japan');
    expect(user).not.toContain(', Japan');
  });

  it('includes all selected trip types in the system prompt', () => {
    const { system } = buildMessages('Italy', 'Rome', '2025-08-01', '12:00', '2025-08-03', '12:00', 'low', ['solo', 'historical']);
    expect(system).toContain('Solo');
    expect(system).toContain('Historical');
  });

  it('falls back to medium budget for an unknown tier', () => {
    const { system } = buildMessages('Spain', '', '2025-09-01', '12:00', '2025-09-03', '12:00', 'unknown_tier', ['solo']);
    expect(system).toContain('Medium Budget');
  });

  it('system message instructs JSON-only response', () => {
    const { system } = buildMessages(...base);
    expect(system).toContain('Respond ONLY with valid JSON');
  });
});

// ── share link ────────────────────────────────────────────────────────────────

describe('encodeShareData / decodeShareData', () => {
  const sample = {
    destination: 'Paris, France',
    summary: 'A wonderful trip',
    theme: { primary: '#a78bfa', flag: '🇫🇷', vibe: 'Romantic' },
    days: [],
    budgetTier: 'medium',
    tripTypes: ['solo'],
  };

  it('encodes trip data to a non-empty string', () => {
    const encoded = encodeShareData(sample);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('roundtrips trip data without loss', () => {
    expect(decodeShareData(encodeShareData(sample))).toEqual(sample);
  });

  it('decodeShareData accepts a hash string with a leading #', () => {
    const encoded = encodeShareData(sample);
    expect(decodeShareData('#' + encoded)).toEqual(sample);
  });

  it('preserves unicode characters in destination names', () => {
    const unicodeTrip = { ...sample, destination: '京都, 日本' };
    expect(decodeShareData(encodeShareData(unicodeTrip)).destination).toBe('京都, 日本');
  });

  it('preserves emoji in theme data', () => {
    const emojiTrip = { ...sample, theme: { ...sample.theme, flag: '🇯🇵' } };
    expect(decodeShareData(encodeShareData(emojiTrip)).theme.flag).toBe('🇯🇵');
  });

  it('throws when decoding an invalid string', () => {
    expect(() => decodeShareData('not!!valid!!base64')).toThrow();
  });

  it('throws when decoding valid base64 that is not JSON', () => {
    expect(() => decodeShareData(btoa('this is not json'))).toThrow();
  });
});

// ── TRIP_META ─────────────────────────────────────────────────────────────────

describe('TRIP_META', () => {
  const expectedTypes = ['solo', 'romantic', 'historical', 'family', 'active'];

  it('contains all expected trip types', () => {
    expectedTypes.forEach(t => expect(TRIP_META).toHaveProperty(t));
  });

  it('each entry has label, emoji, and desc', () => {
    Object.values(TRIP_META).forEach(v => {
      expect(v).toHaveProperty('label');
      expect(v).toHaveProperty('emoji');
      expect(v).toHaveProperty('desc');
    });
  });

  it('no unknown keys are present', () => {
    expect(Object.keys(TRIP_META).sort()).toEqual(expectedTypes.sort());
  });
});

// ── BUDGET_META ───────────────────────────────────────────────────────────────

describe('BUDGET_META', () => {
  const expectedTiers = ['low', 'medium', 'high', 'unlimited'];

  it('contains all expected budget tiers', () => {
    expectedTiers.forEach(t => expect(BUDGET_META).toHaveProperty(t));
  });

  it('each tier has label, range, color, and desc', () => {
    Object.values(BUDGET_META).forEach(v => {
      expect(v).toHaveProperty('label');
      expect(v).toHaveProperty('range');
      expect(v).toHaveProperty('color');
      expect(v).toHaveProperty('desc');
    });
  });

  it('all color values are valid hex strings', () => {
    Object.values(BUDGET_META).forEach(v => {
      expect(v.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('no unknown tiers are present', () => {
    expect(Object.keys(BUDGET_META).sort()).toEqual(expectedTiers.sort());
  });
});
