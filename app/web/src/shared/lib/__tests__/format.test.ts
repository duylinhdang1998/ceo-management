import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  truncate,
  capitalize,
  formatRole,
} from '../format';

describe('formatBytes', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes with decimals', () => {
    expect(formatBytes(1_572_864, 1)).toBe('1.5 MB');
  });
});

describe('truncate', () => {
  it('returns the string unchanged when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis when over limit', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });

  it('returns empty string for empty input', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('capitalize', () => {
  it('uppercases the first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles already-capitalised strings', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});

describe('formatRole', () => {
  it('formats super_admin', () => {
    expect(formatRole('super_admin')).toBe('Super Admin');
  });

  it('formats employee', () => {
    expect(formatRole('employee')).toBe('Employee');
  });

  it('capitalises unknown roles', () => {
    expect(formatRole('manager')).toBe('Manager');
  });
});
