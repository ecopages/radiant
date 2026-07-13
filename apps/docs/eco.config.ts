import path from 'node:path';
import '@ecopages/radiant/server/install-light-dom-shim';
import { ConfigBuilder } from '@ecopages/core/config-builder';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor/plugin';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';
import { rehypeSimpleTableWrapper } from './src/plugins/rehype-simple-table-wrapper';
import { contentRemarkPlugins } from './src/plugins/content-remark';

const config = await new ConfigBuilder()
	.setRootDir(import.meta.dir)
	.setBaseUrl(process.env.ECOPAGES_BASE_URL ?? 'http://localhost:3000')
	.setIntegrations([
		ecopagesJsxPlugin({
			mdx: {
				enabled: true,
				remarkPlugins: contentRemarkPlugins,
				rehypePlugins: [
					[
						rehypePrettyCode,
						{
							theme: {
								light: 'light-plus',
								dark: 'dark-plus',
							},
						},
					],
					rehypeSimpleTableWrapper,
				],
			},
		}),
	])
	.setDefaultMetadata({
		title: 'Radiant | Docs',
		description: 'Radiant is a minimalist web component library designed for simplicity and flexibility.',
		image: 'public/assets/images/default-og.webp',
		keywords: ['typescript', 'framework', 'static'],
	})
	.setProcessors([
		postcssProcessorPlugin(
			tailwindV4Preset({
				referencePath: path.resolve(import.meta.dir, 'src/styles/tailwind.css'),
			}),
		),
	])
	.setAdditionalWatchPaths(['src/data', 'src/content'])
	.build();

export default config;
