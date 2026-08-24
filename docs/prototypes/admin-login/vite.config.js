import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'src',
  plugins: [tailwindcss()],
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
