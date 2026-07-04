import { describe, expect, it } from 'vitest';
import { sanitizeBody, sanitizePlainText } from './sanitize';

describe('sanitizeBody', () => {
  it('keeps allowlisted formatting tags', () => {
    expect(sanitizeBody('<b>bold</b> and <em>emphasis</em>')).toBe(
      '<b>bold</b> and <em>emphasis</em>'
    );
  });

  it('strips scripts and event handlers', () => {
    const result = sanitizeBody('<script>alert(1)</script><p onclick="evil()">hi</p>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('hi');
  });

  it('adds rel/target to links', () => {
    const result = sanitizeBody('<a href="https://example.com">link</a>');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });

  it('blocks non-http(s) link schemes', () => {
    const result = sanitizeBody('<a href="javascript:alert(1)">bad</a>');
    expect(result).not.toContain('javascript:');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeBody('  hello  ')).toBe('hello');
  });
});

describe('sanitizePlainText', () => {
  it('strips all HTML tags', () => {
    expect(sanitizePlainText('<b>bold</b> text')).toBe('bold text');
  });

  it('truncates to the max length', () => {
    expect(sanitizePlainText('a'.repeat(10), 5)).toBe('aaaaa');
  });
});
