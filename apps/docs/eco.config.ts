import path from 'node:path';
import { defineConfig } from '@ecopages/core/config';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { contentProcessorPlugin } from '@ecopages/content-processor/plugin';
import { lightningCssProcessorPlugin } from '@ecopages/lightningcss-processor';
import { suffixNesting } from '@ecopages/lightningcss-processor/plugins/suffix-nesting';
import { tailwindV4Preset } from '@ecopages/lightningcss-processor/presets/tailwind-v4';
import { createDocsMdxPlugins } from './src/mdx/plugins';
import { remarkMermaid } from './src/lib/remark-mermaid';
import { compareDocsEntries, docsFrontmatterSchema } from './src/content/docs';
import { configuredSiteOrigin } from './src/lib/docs/site-meta';
import { devToolbar } from '@ecopages/dev-toolbar/config';

export default defineConfig({
	rootDir: import.meta.dirname,
	baseUrl: configuredSiteOrigin(),
	sitemap: {
		enabled: true,
		extraUrls: ['/llms.txt', '/skill.txt'],
		exclude: ['/404', '/500'],
	},
	integrations: [
		ecopagesJsxPlugin({
			mdx: {
				...createDocsMdxPlugins({ remarkPlugins: [remarkMermaid] }),
			},
		}),
	],
	defaultMetadata: {
		title: 'Radiant | Docs',
		description: 'Radiant is a minimalist web component library designed for simplicity and flexibility.',
		image: '/assets/images/default-og.png',
		keywords: ['typescript', 'framework', 'static'],
	},
	processors: [
		lightningCssProcessorPlugin({
			...tailwindV4Preset({
				referencePath: path.resolve(import.meta.dirname, 'src/styles/tailwind.css'),
			}),
			targets: ['chrome >= 111', 'safari >= 16.4', 'firefox >= 128'],
			plugins: [suffixNesting()],
		}),
		contentProcessorPlugin({
			options: {
				collections: {
					docs: {
						contentDir: 'content/docs',
						orderBy: compareDocsEntries,
						schema: docsFrontmatterSchema,
						entryType: './src/content/docs#DocsFrontmatter',
					},
				},
			},
		}),
	],
	additionalWatchPaths: ['src/data', 'src/content'],
	devToolbar: devToolbar(),
});
