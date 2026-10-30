import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {target: 'es2022', rollupOptions: {input: {main: resolve(__dirname, 'index.html'), trusted: resolve(__dirname, 'trusted.html')}, output: {manualChunks: {
    editor: ['@codemirror/view', '@codemirror/state', '@codemirror/lang-markdown'],
    canvas: ['@xyflow/react'],
    graph: ['d3'],
    markdown: ['markdown-it', 'katex', 'dompurify']
  }}}},
  test: {include: ['tests/**/*.test.ts', 'tests/**/*.test.mjs']}
} as any);
