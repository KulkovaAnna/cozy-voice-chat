import { describe, it, expect } from 'vitest';
import { parseRangeHeader } from '../../src/utils/range';

describe('parseRangeHeader', () => {
  it('should return none without header', () => {
    expect(parseRangeHeader(undefined, 1000)).toEqual({ type: 'none' });
    expect(parseRangeHeader('', 1000)).toEqual({ type: 'none' });
  });

  it('should ignore unsupported formats', () => {
    expect(parseRangeHeader('items=0-1', 1000)).toEqual({ type: 'none' });
    expect(parseRangeHeader('bytes=0-1,5-6', 1000)).toEqual({ type: 'none' });
    expect(parseRangeHeader('bytes=abc-def', 1000)).toEqual({ type: 'none' });
    expect(parseRangeHeader('bytes=-', 1000)).toEqual({ type: 'none' });
  });

  it('should parse an explicit range', () => {
    expect(parseRangeHeader('bytes=100-199', 1000)).toEqual({
      type: 'satisfiable',
      range: { start: 100, end: 199 },
    });
  });

  it('should parse an open-ended range up to the file end', () => {
    expect(parseRangeHeader('bytes=900-', 1000)).toEqual({
      type: 'satisfiable',
      range: { start: 900, end: 999 },
    });
  });

  it('should send the whole file for bytes=0-', () => {
    expect(parseRangeHeader('bytes=0-', 1000)).toEqual({
      type: 'satisfiable',
      range: { start: 0, end: 999 },
    });
  });

  it('should clamp the end to the file size', () => {
    expect(parseRangeHeader('bytes=900-99999', 1000)).toEqual({
      type: 'satisfiable',
      range: { start: 900, end: 999 },
    });
  });

  it('should parse a suffix range', () => {
    expect(parseRangeHeader('bytes=-100', 1000)).toEqual({
      type: 'satisfiable',
      range: { start: 900, end: 999 },
    });
    expect(parseRangeHeader('bytes=-5000', 1000)).toEqual({
      type: 'satisfiable',
      range: { start: 0, end: 999 },
    });
  });

  it('should trim and lowercase the header', () => {
    expect(parseRangeHeader('  bytes=10-20  ', 1000)).toEqual({
      type: 'satisfiable',
      range: { start: 10, end: 20 },
    });
  });

  it('should mark ranges outside the file as unsatisfiable', () => {
    expect(parseRangeHeader('bytes=1000-', 1000)).toEqual({
      type: 'unsatisfiable',
    });
    expect(parseRangeHeader('bytes=200-100', 1000)).toEqual({
      type: 'unsatisfiable',
    });
    expect(parseRangeHeader('bytes=-0', 1000)).toEqual({
      type: 'unsatisfiable',
    });
    expect(parseRangeHeader('bytes=0-0', 0)).toEqual({
      type: 'unsatisfiable',
    });
  });
});
