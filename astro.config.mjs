import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://optctools.top',
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
});
