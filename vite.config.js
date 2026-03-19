import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

function getHtmlEntries() {
  const pages = {};
  const files = fs.readdirSync(__dirname);

  files.forEach(file => {
    if (file.endsWith('.html')) {
      const name = file.replace('.html', '');
      pages[name] = resolve(__dirname, file);
    }
  });

  return pages;
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: getHtmlEntries(),
    },
    cssCodeSplit: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  optimizeDeps: {
    include: [],
  },
});
