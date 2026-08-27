import baseConfig from '@ecopages/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	plugins: ['oxc'],
	rules: {
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						group: [
							'@ecopages/radiant/core/*',
							'@ecopages/radiant/decorators/*',
							'@ecopages/radiant/controller-registry',
						],
						message:
							"Import RadiantElement/RadiantController, @customElement/@controller, and host decorators from the root '@ecopages/radiant' entrypoint instead of a deep sub-path. Context APIs stay under '@ecopages/radiant/context', SSR helpers under '@ecopages/radiant/server/*', and client bootstrap entrypoints under '@ecopages/radiant/client/*' — none of those are re-exported from root.",
					},
				],
			},
		],
	},
});
