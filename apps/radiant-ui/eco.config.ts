import path from 'node:path';
import { defineConfig } from '@ecopages/core/config';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { contentProcessorPlugin } from '@ecopages/content-processor/plugin';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor/plugin';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import { createDocsMdxPlugins } from './src/mdx/plugins';
import { componentDocsFrontmatterSchema } from './src/content/components';
import { configuredSiteOrigin } from './src/lib/docs/site-meta';

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
			extensions: ['.tsx'],
			mdx: {
				...createDocsMdxPlugins({
					rehypePrettyCode: {
						theme: {
							light: 'light-plus',
							dark: 'dark-plus',
						},
					},
				}),
			},
		}),
	],
	defaultMetadata: {
		title: 'Radiant UI',
		description: 'Accessible UI components for the web.',
		image: '/assets/images/default-og.png',
	},
	processors: [
		postcssProcessorPlugin(
			tailwindV4Preset({
				referencePath: path.resolve(import.meta.dirname, 'src/styles/tailwind.css'),
			}),
		),
		contentProcessorPlugin({
			options: {
				collections: {
					components: {
						contentDir: 'content/components',
						schema: componentDocsFrontmatterSchema,
						entryType: './src/content/components#ComponentDocsFrontmatter',
					},
				},
			},
		}),
	],
});
