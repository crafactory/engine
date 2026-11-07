import { describe, it, expect } from 'vitest';
import { ownedSource, structureIssues } from '../scripts/structure.mjs';

const policy = {
  maxLines: 3,
  legacyLimits: { 'src/App.tsx': 5 },
  legacyRootFiles: ['src/App.tsx'],
  sourceDirectories: ['components', 'services'],
  maxSourcePathSegments: 5,
};
describe('source structure budgets', () => {
  it('checks owned source but never generated assets or upstream plugin bundles', () => {
    for (const file of [
      'src/components/ui/button.tsx',
      'src/components/ui/control.jsx',
      'src/services/module.mts',
      'src/services/module.cts',
      'bin/engine.mjs',
      'vite.config.ts',
      'index.html',
      'scripts/android-fixtures/Probe.java',
      'android/app/src/main/java/com/crafactory/engine/MainActivity.java',
    ])
      expect(ownedSource(file)).toBe(true);
    for (const file of [
      '.compat-corpus/plugin/main.js',
      'examples/plugins/sample/main.js',
      'android/app/src/main/assets/public/assets/App.js',
      'docs/compatibility/features.json',
    ])
      expect(ownedSource(file)).toBe(false);
  });
  it('enforces the default and exact-path legacy ceilings, including blank lines', () => {
    expect(structureIssues('src/services/new.ts', 'a\n\nb\nc\n', policy)).toHaveLength(1);
    expect(structureIssues('src/App.tsx', 'a\nb\nc\nd\ne\n', policy)).toEqual([]);
    expect(structureIssues('src/App.tsx', 'a\nb\nc\nd\ne\nf\n', policy)).toHaveLength(1);
    expect(structureIssues('src/services/new.ts', 'a\r\nb\r\nc\r\n', policy)).toEqual([]);
  });
  it('does not extend a legacy exception to a similarly named new file', () => {
    expect(structureIssues('src/services/App.tsx', 'a\nb\nc\nd\n', policy)).toHaveLength(1);
  });
  it('rejects new flat source files, unknown domains and excessive nesting', () => {
    expect(structureIssues('src/New.ts', 'x', policy)).toHaveLength(1);
    expect(ownedSource('src/New.jsx')).toBe(true);
    expect(structureIssues('src/New.jsx', 'x', policy)).toHaveLength(1);
    expect(structureIssues('src/components/ui/control.jsx', 'a\nb\nc\nd\n', policy)).toHaveLength(
      1,
    );
    expect(structureIssues('src/new-domain/file.ts', 'x', policy)).toHaveLength(1);
    expect(structureIssues('src/components/a/b/c/file.ts', 'x', policy)).toHaveLength(1);
    expect(structureIssues('src/components/ui/button.tsx', 'x', policy)).toEqual([]);
  });
});
