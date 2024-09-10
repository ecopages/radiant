import type { EcoPagesConfig } from '@ecopages/core';
import { kitajsPlugin } from '@ecopages/kitajs';
import { mdxPlugin } from '@ecopages/mdx';

const config: EcoPagesConfig = {
  rootDir: import.meta.dir,
  baseUrl: import.meta.env.ECOPAGES_BASE_URL as string,
  integrations: [kitajsPlugin(), mdxPlugin()],
  defaultMetadata: {
    title: 'Radiant | Docs',
    description: 'Radiant is a minimalist web component library designed for simplicity and flexibility.',
    image: 'public/assets/images/default-og.webp',
    keywords: ['typescript', 'framework', 'static'],
  },
  includesTemplates: {
    head: 'head.kita.tsx',
    html: 'html.kita.tsx',
    seo: 'seo.kita.tsx',
  },
  error404Template: '404.kita.tsx',
};

export default config;
