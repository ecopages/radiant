import '@ecopages/bun-mdx-kitajs-loader';
import { ConfigBuilder } from '@ecopages/core';
import { kitajsPlugin } from '@ecopages/kitajs';
import { mdxPlugin } from '@ecopages/mdx';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor';

const config = await new ConfigBuilder()
  .setRootDir(import.meta.dir)
  .setBaseUrl(import.meta.env.ECOPAGES_BASE_URL)
  .setIntegrations([kitajsPlugin(), mdxPlugin()])
  .setIncludesTemplates({
    head: 'head.kita.tsx',
    html: 'html.kita.tsx',
    seo: 'seo.kita.tsx',
  })
  .setError404Template('404.kita.tsx')
  .setDefaultMetadata({
    title: 'Radiant | Docs',
    description: 'Radiant is a minimalist web component library designed for simplicity and flexibility.',
    image: 'public/assets/images/default-og.webp',
    keywords: ['typescript', 'framework', 'static'],
  })
  .setProcessors([postcssProcessorPlugin()])
  .setAdditionalWatchPaths(['src/data'])
  .build();

export default config;
