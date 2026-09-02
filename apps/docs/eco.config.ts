import path from 'node:path';
import { ConfigBuilder } from '@ecopages/core/config-builder';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor/plugin';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { contentProcessorPlugin } from '@ecopages/content-processor/plugin';
import { compareEntriesByField } from '@ecopages/content-processor';
import { createDocsMdxPlugins } from './src/mdx/plugins';
import { docsFrontmatterSchema } from './src/content/docs';
import { configuredSiteOrigin } from './src/lib/docs/site-meta';
import { devToolbar } from '@ecopages/dev-toolbar/config';

const config = await new ConfigBuilder()
	.setRootDir(import.meta.dirname)
	.setBaseUrl(configuredSiteOrigin())
	.setSitemap({
		enabled: true,
		extraUrls: ['/llms.txt', '/skill.txt'],
		exclude: ['/404', '/500'],
	})
	.setIntegrations([
		ecopagesJsxPlugin({
			mdx: {
				enabled: true,
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
	])
	.setDefaultMetadata({
		title: 'Radiant | Docs',
		description: 'Radiant is a minimalist web component library designed for simplicity and flexibility.',
		image: '/assets/images/default-og.png',
		keywords: ['typescript', 'framework', 'static'],
	})
	.setProcessors([
		postcssProcessorPlugin(
			tailwindV4Preset({
				referencePath: path.resolve(import.meta.dirname, 'src/styles/tailwind.css'),
			}),
		),
		contentProcessorPlugin({
			options: {
				collections: {
					docs: {
						contentDir: 'content/docs',
						orderBy: compareEntriesByField('order'),
						schema: docsFrontmatterSchema,
						entryType: './src/content/docs#DocsFrontmatter',
					},
				},
			},
		}),
	])
	.setAdditionalWatchPaths(['src/data', 'src/content'])
	.setDevToolbar(devToolbar())
	.build();

export default config;
