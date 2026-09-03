import path from 'node:path';
import { ConfigBuilder } from '@ecopages/core/config-builder';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { contentProcessorPlugin } from '@ecopages/content-processor/plugin';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor/plugin';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import { createDocsMdxPlugins } from './src/mdx/plugins';
import { componentDocsFrontmatterSchema } from './src/content/components';
import { configuredSiteOrigin } from './src/lib/docs/site-meta';

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
			extensions: ['.tsx'],
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
		title: 'Radiant UI',
		description: 'Accessible UI components for the web.',
		image: '/assets/images/default-og.png',
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
					components: {
						contentDir: 'content/components',
						schema: componentDocsFrontmatterSchema,
						entryType: './src/content/components#ComponentDocsFrontmatter',
					},
				},
			},
		}),
	])
	.build();

export default config;
