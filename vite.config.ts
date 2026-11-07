import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const require = createRequire(import.meta.url);
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'distribution-notices',
      async generateBundle() {
        for (const fileName of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
          this.emitFile({
            type: 'asset',
            fileName,
            source: await readFile(resolve(__dirname, fileName), 'utf8'),
          });
        }
      },
    } satisfies Plugin,
  ],
  // The package's public browser condition requires document. Its public
  // worker/default entry is environment-independent, including module Workers.
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      {
        find: 'decode-named-character-reference',
        replacement: require.resolve('decode-named-character-reference'),
      },
    ],
  },
  // Worker-only dependencies must not trigger a dev-server full reload on first use.
  optimizeDeps: {
    include: [
      'mdast-util-from-markdown',
      'mdast-util-gfm-footnote',
      'micromark-extension-gfm-footnote',
      'decode-named-character-reference',
    ],
  },
  build: {
    target: 'chrome111',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        trusted: resolve(__dirname, 'trusted.html'),
      },
      output: {
        manualChunks: {
          editor: ['@codemirror/view', '@codemirror/state', '@codemirror/lang-markdown'],
          canvas: ['@xyflow/react'],
          graph: ['d3'],
          markdown: ['markdown-it', 'katex', 'dompurify'],
        },
      },
    },
  },
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.mjs'] },
} as any);
