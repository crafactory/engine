import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {normalizeText,parseParityLedger} from '../scripts/inventory-model.mjs';
const ledger=fs.readFileSync(new URL('../docs/PARITY.md',import.meta.url),'utf8');
const core='https://help.obsidian.md/plugins',api='https://docs.obsidian.md/Reference/TypeScript+API/index';
describe('cross-platform inventory line endings',()=>{
  it('CRLF parses all 29 core rows exactly like LF without losing the final table cell',()=>{
    const lf=normalizeText(ledger),windows=lf.replace(/\n/g,'\r\n');
    const expected=parseParityLedger(lf,core,api),actual=parseParityLedger(windows,core,api);
    expect(actual).toEqual(expected);expect(actual.filter(i=>i.id.startsWith('CORE-'))).toHaveLength(29);
    expect(actual.every(i=>i.remaining&&!i.remaining.endsWith('|'))).toBe(true);
  });
  it('generated Markdown compares identically in a Windows CRLF checkout',()=>{
    const markdown=normalizeText(fs.readFileSync(new URL('../docs/FEATURE-CHECKLIST.md',import.meta.url),'utf8'));
    expect(normalizeText(markdown.replace(/\n/g,'\r\n'))).toBe(markdown);
  });
  it('normalization preserves Unicode, lone CR and content outside CRLF sequences',()=>{
    expect(normalizeText('中文\r\nemoji 😀\rkept\n')).toBe('中文\nemoji 😀\rkept\n');
  });
});
