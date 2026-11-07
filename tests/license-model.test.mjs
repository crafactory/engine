import { describe, it, expect } from 'vitest';
import { licenseClaims } from '../scripts/license-model.mjs';
describe('dependency license claim discrepancies', () => {
  it('flags ISC metadata with MIT text without selecting an authoritative license', () => {
    expect(
      licenseClaims('ISC', 'The MIT License\nPermission is hereby granted, free of charge'),
    ).toContain('neither is identified here as authoritative');
  });
  it('does not invent a conflict for matching or absent license text', () => {
    expect(licenseClaims('MIT', 'MIT License')).toBe('');
    expect(licenseClaims('ISC', 'Permission to use, copy, modify, and/or distribute')).toBe('');
    expect(licenseClaims('ISC', '')).toBe('');
  });
});
