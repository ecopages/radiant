import path from 'node:path';
import { ConfigBuilder } from '@ecopages/core/config-builder';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor/plugin';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';

const config = await new ConfigBuilder()
	.setRootDir(import.meta.dirname)
	.setBaseUrl(process.env.ECOPAGES_BASE_URL ?? 'http://localhost:3000')
	.setIntegrations([ecopagesJsxPlugin({ extensions: ['.tsx'] })])
	.setDefaultMetadata({
		title: 'Radiant UI',
		description: 'Accessible UI components for the web.',
	})
	.setProcessors([
		postcssProcessorPlugin(
			tailwindV4Preset({ referencePath: path.resolve(import.meta.dirname, 'src/styles/global.css') }),
		),
	])
	.build();

export default config;
