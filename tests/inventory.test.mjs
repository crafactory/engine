import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { normalizeText, parseParityLedger, readExportList } from '../scripts/inventory-model.mjs';
const ledger = fs.readFileSync(new URL('../docs/PARITY.md', import.meta.url), 'utf8');
const core = 'https://help.obsidian.md/plugins',
  api = 'https://docs.obsidian.md/Reference/TypeScript+API/index';
describe('formatter-independent export inventory', () => {
  it('accepts compact, formatted, CRLF and quoted export arrays', () => {
    for (const text of [
      "const supportedExports=['App','Plugin'] as const;",
      'const supportedExports = [\r\n  "App",\r\n  "Plugin",\r\n] as const;',
    ])
      expect(readExportList(text, 'supportedExports')).toEqual(['App', 'Plugin']);
  });
  it('fails closed when a named list is missing or invalid', () => {
    expect(() => readExportList('const other = [];', 'supportedExports')).toThrow(
      'Missing export list',
    );
    expect(() => readExportList('', '.*')).toThrow('Invalid export list name');
    expect(() =>
      readExportList("const supportedExports = ['App', runtimeName] as const;", 'supportedExports'),
    ).toThrow('Invalid export list');
    expect(() =>
      readExportList("const supportedExports = ['App']\nas const;", 'supportedExports'),
    ).toThrow('Invalid export list');
  });
  it('stops at the named array despite comments before the const assertion', () => {
    const source = `
      const supportedExports = ['App', 'Plugin'] /* retained boundary */ as const;
      const other = ['must not leak', 'Plugin'] as const;
    `;
    expect(readExportList(source, 'supportedExports')).toEqual(['App', 'Plugin']);
  });
  it('ignores commented declarations and elements without corrupting quoted strings', () => {
    const source = `
      // const supportedExports = ['wrong'] as const;
      /* const supportedExports = ['also wrong'] as const; */
      const supportedExports = [
        'App', // "Plugin" is not another element
        /* 'fake' */ "Plugin", 'https://example.test/a/*literal*/',
      ] /* comment between the array and its assertion */ as const;
    `;
    expect(readExportList(source, 'supportedExports')).toEqual([
      'App',
      'Plugin',
      'https://example.test/a/*literal*/',
    ]);
  });
});
describe('cross-platform inventory line endings', () => {
  it('keeps explicit partial core rows rather than silently dropping a documented gap', () => {
    const parsed = parseParityLedger(
      '## Core plugins\n| Bases | Partial | Table subset | Formula/query gaps |\n',
      core,
      api,
    );
    expect(parsed).toEqual([
      {
        id: 'CORE-bases',
        section: 'Core plugins',
        title: 'Bases',
        status: 'partial',
        reference: core,
        implemented: 'Table subset',
        remaining: 'Formula/query gaps',
        evidence: [],
      },
    ]);
  });
  it('CRLF parses all 29 core rows exactly like LF without losing the final table cell', () => {
    const lf = normalizeText(ledger),
      windows = lf.replace(/\n/g, '\r\n');
    const expected = parseParityLedger(lf, core, api),
      actual = parseParityLedger(windows, core, api);
    expect(actual).toEqual(expected);
    expect(actual.filter((i) => i.id.startsWith('CORE-'))).toHaveLength(29);
    expect(actual.every((i) => i.remaining && !i.remaining.endsWith('|'))).toBe(true);
    expect(
      actual.filter((i) => i.id.startsWith('CORE-')).every((i) => i.implemented !== i.remaining),
    ).toBe(true);
  });
  it('generated Markdown compares identically in a Windows CRLF checkout', () => {
    const markdown = normalizeText(
      fs.readFileSync(new URL('../docs/FEATURE-CHECKLIST.md', import.meta.url), 'utf8'),
    );
    expect(normalizeText(markdown.replace(/\n/g, '\r\n'))).toBe(markdown);
  });
  it('normalization preserves Unicode, lone CR and content outside CRLF sequences', () => {
    expect(normalizeText('中文\r\nemoji 😀\rkept\n')).toBe('中文\nemoji 😀\rkept\n');
  });
});
