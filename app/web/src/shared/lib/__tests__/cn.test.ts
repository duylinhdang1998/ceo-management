import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('joins multiple classes', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('handles conditional classes (falsy values ignored)', () => {
    expect(cn('base', false && 'skip', undefined, null, 'end')).toBe('base end');
  });

  it('resolves Tailwind conflicts (last wins via tailwind-merge)', () => {
    // tailwind-merge should deduplicate conflicting utilities
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('handles object syntax from clsx', () => {
    expect(cn({ 'bg-navy': true, 'bg-white': false })).toBe('bg-navy');
  });

  it('handles array syntax from clsx', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });
});
