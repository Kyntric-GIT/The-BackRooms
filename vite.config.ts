import { defineConfig } from 'vite';

// Relative asset URLs keep the game working on GitHub Pages project paths
// and on any custom domain without hard-coding the repository name.
export default defineConfig({
  base: './',
});
