import type { Plugin } from 'vite';

export type RadiantDecoratorBabelVersion = '2023-11' | 'legacy';

export type RadiantDecoratorBabelOptions = {
	/**
	 * Decorator proposal revision for Babel.
	 *
	 * @remarks
	 * `'2023-11'` matches esbuild / TypeScript 5.4+ stage-3 lowering (Radiant default).
	 * `'legacy'` matches TypeScript `experimentalDecorators` for `--legacy` test lanes.
	 */
	version?: RadiantDecoratorBabelVersion;
};

type ClassPropertyPath = {
	node: { definite?: boolean; declare?: boolean; value?: unknown };
	remove: () => void;
};

/**
 * `@babel/plugin-proposal-decorators` requires `declare` fields to already be gone.
 * Erase ambient fields before decorators run — without touching decorated `field!: T`,
 * which full `@babel/plugin-transform-typescript` + `allowDeclareFields` would delete.
 */
function eraseDeclareFieldsWithoutInitializer() {
	return {
		name: 'radiant-erase-declare-fields',
		visitor: {
			ClassProperty(path: ClassPropertyPath) {
				if (path.node.declare && path.node.value == null) {
					path.remove();
				}
			},
		},
	};
}

/**
 * Stage-3 Babel decorator lowering can emit invalid hybrids Oxc rejects:
 * - `field!: T = init` (definite + initializer)
 * - `declare field: T = init` (ambient + initializer)
 * Clear those TypeScript-only markers when an initializer was inserted.
 */
function stripTypeOnlyFieldMarkersWithInitializer() {
	return {
		name: 'radiant-strip-type-only-field-markers-with-initializer',
		visitor: {
			ClassProperty(path: ClassPropertyPath) {
				if (path.node.value == null) {
					return;
				}
				if (path.node.definite) {
					path.node.definite = false;
				}
				if (path.node.declare) {
					path.node.declare = false;
				}
			},
		},
	};
}

export function createRadiantDecoratorBabelPreset(options: RadiantDecoratorBabelOptions = {}) {
	const version = options.version ?? '2023-11';
	const plugins: Array<string | [string, Record<string, unknown>] | (() => object)> = [
		['@babel/plugin-syntax-typescript', { isTSX: true }],
		eraseDeclareFieldsWithoutInitializer,
		['@babel/plugin-proposal-decorators', { version }],
	];

	if (version === 'legacy') {
		plugins.push(['@babel/plugin-transform-class-properties', { loose: true }]);
	}

	plugins.push(stripTypeOnlyFieldMarkersWithInitializer);

	return {
		preset: () => ({
			plugins,
		}),
		rolldown: {
			filter: {
				code: '@',
			},
		},
	};
}

/**
 * Lower TC39 decorators via `@rolldown/plugin-babel` (Vite 8+ / Rolldown).
 *
 * @remarks
 * Temporary workaround: Oxc does not lower TC39 decorators yet
 * ([oxc#9170](https://github.com/oxc-project/oxc/issues/9170)). Prefer
 * `experimentalDecorators: true` for Vite 8 apps when you can use Radiant's legacy
 * decorator path — no Babel required. Keep this option for TC39 authoring until Oxc ships.
 *
 * Babel only lowers decorators — Oxc still strips TypeScript / JSX.
 * Order: erase bare `declare` → lower decorators → strip leftover `!` / `declare` with init.
 *
 * Peer deps: `@rolldown/plugin-babel`, `@babel/core`, `@babel/plugin-proposal-decorators`,
 * `@babel/plugin-syntax-typescript`, and `@babel/plugin-transform-class-properties` when using `'legacy'`
 */
export async function createRadiantDecoratorBabelPlugin(options: RadiantDecoratorBabelOptions = {}): Promise<Plugin> {
	const { default: babel } = await import('@rolldown/plugin-babel');
	const plugin = await babel({
		presets: [createRadiantDecoratorBabelPreset(options)],
	});

	return plugin as Plugin;
}
