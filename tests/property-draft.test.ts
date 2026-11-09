import { describe, expect, it } from 'vitest';
import { parsePropertyDraft, propertyDraft } from '../src/properties';

describe('safe scalar property drafts', () => {
  it.each(['', ' ', '\t'])('keeps empty number %j empty rather than zero', (draft) => {
    expect(parsePropertyDraft(draft, 'number')).toBeNull();
    expect(propertyDraft(null, 'number')).toBe('');
  });
  it.each(['1e', '1e999', 'Infinity', '-Infinity', 'NaN'])('rejects %s', (draft) => {
    expect(() => parsePropertyDraft(draft, 'number')).toThrow('finite number');
  });
  it.each([
    ['0', 0],
    ['-12.5', -12.5],
    ['1e2', 100],
  ])('keeps finite number %s', (draft, value) => {
    expect(parsePropertyDraft(String(draft), 'number')).toBe(value);
  });
  it('keeps empty date/datetime null without stripping whitespace from text', () => {
    expect(parsePropertyDraft('', 'date')).toBeNull();
    expect(parsePropertyDraft('', 'datetime')).toBeNull();
    expect(parsePropertyDraft('  literal text  ', 'text')).toBe('  literal text  ');
  });
});
