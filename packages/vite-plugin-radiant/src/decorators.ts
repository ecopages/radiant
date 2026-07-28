import type { Plugin } from 'vite';

export function createRadiantDecoratorBabelPreset() {
	return {
		preset: () => ({
			presets: ['@babel/preset-typescript'],
			plugins: [['@babel/plugin-proposal-decorators', { version: '2023-11' }]],
		}),
		rolldown: {
			filter: {
				code: '@',
			},
		},
	};
}

/**
 * Lower ECMAScript decorators via `@rolldown/plugin-babel` (Vite 8+ / Rolldown).
 *
 * Peer deps: `@rolldown/plugin-babel`, `@babel/core`, `@babel/plugin-proposal-decorators`
 */
export async function createRadiantDecoratorBabelPlugin(): Promise<Plugin> {
	const { default: babel } = await import('@rolldown/plugin-babel');
	const plugin = await babel({
		presets: [createRadiantDecoratorBabelPreset()],
	});

	return plugin as Plugin;
}
