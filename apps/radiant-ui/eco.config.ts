import path from 'node:path';
import { ConfigBuilder } from '@ecopages/core/config-builder';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { contentProcessorPlugin } from '@ecopages/content-processor/plugin';
import { withContentMdxPlugins } from '@ecopages/content-processor/mdx';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor/plugin';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import rehypePrettyCode from 'rehype-pretty-code';
import { componentDocsFrontmatterSchema } from './src/content/components';

const config = await new ConfigBuilder()
	.setRootDir(import.meta.dirname)
	.setBaseUrl(process.env.ECOPAGES_BASE_URL ?? 'http://localhost:3000')
	.setIntegrations([
		ecopagesJsxPlugin({
			extensions: ['.tsx'],
			mdx: {
				enabled: true,
				...withContentMdxPlugins({
					rehypePlugins: [[rehypePrettyCode, { theme: { light: 'light-plus', dark: 'dark-plus' } }]],
				}),
			},
		}),
	])
	.setDefaultMetadata({
		title: 'Radiant UI',
		description: 'Accessible UI components for the web.',
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
