import { fileURLToPath } from 'node:url';
import type { Plugin, UserConfig } from 'vite';
import { transformWithOxc } from 'vite';
type ClassPropertyPath = {
	node: { definite?: boolean; declare?: boolean; value?: unknown };
	remove: () => void;
};

type LegacyTsConfig = {
	compilerOptions: Record<string, unknown>;
};

function eraseDeclareFieldsWithoutInitializer() {
	return {
		name: 'radiant-vitest-erase-declare-fields',
		visitor: {
			ClassProperty(path: ClassPropertyPath) {
				if (path.node.declare && path.node.value == null) {
					path.remove();
				}
			},
		},
	};
}

function stripTypeOnlyFieldMarkersWithInitializer() {
	return {
		name: 'radiant-vitest-strip-type-only-field-markers',
		visitor: {
			ClassProperty(path: ClassPropertyPath) {
				if (path.node.value == null) {
					return;
				}
				path.node.definite = false;
				path.node.declare = false;
			},
		},
	};
}

function createRadiantJsxConfig(): Plugin {
	return {
		name: 'radiant-vitest-jsx',
		config(_config, env) {
			return {
				oxc: {
					jsx: {
						runtime: 'automatic',
						importSource: '@ecopages/jsx',
						development: env.mode !== 'production',
					},
				},
			};
		},
	};
}

async function createRadiantDecoratorBabelPlugin(): Promise<Plugin> {
	const { default: babel } = await import('@rolldown/plugin-babel');
	const plugins: Array<string | [string, Record<string, unknown>] | (() => object)> = [
		['@babel/plugin-syntax-typescript', { isTSX: true }],
		eraseDeclareFieldsWithoutInitializer,
		['@babel/plugin-proposal-decorators', { version: '2023-11' }],
		stripTypeOnlyFieldMarkersWithInitializer,
	];
	const plugin = await babel({
		presets: [
			{
				preset: () => ({ plugins }),
				rolldown: { filter: { code: '@' } },
			},
		],
	});

	return plugin as Plugin;
}

export function isRadiantLegacyVitestLane(): boolean {
	return process.argv.includes('--legacy');
}

function createRadiantLegacyOxcPlugin(legacyTsconfig: LegacyTsConfig): Plugin {
	return {
		name: 'radiant-vitest-legacy-oxc',
		enforce: 'pre',
		async transform(code, id) {
			if (id.includes('\0') || id.includes('node_modules') || !/\.[cm]?tsx?$/.test(id)) {
				return;
			}

			const result = await transformWithOxc(code, id, {
				tsconfig: legacyTsconfig,
				jsx: {
					runtime: 'automatic',
					importSource: '@ecopages/jsx',
					development: true,
				},
			});

			return {
				code: result.code,
				map: result.map ?? null,
			};
		},
	};
}

async function createRadiantVitestPlugins(legacyTsconfig: LegacyTsConfig): Promise<Plugin[]> {
	if (isRadiantLegacyVitestLane()) {
		return [createRadiantLegacyOxcPlugin(legacyTsconfig)];
	}

	return [createRadiantJsxConfig(), await createRadiantDecoratorBabelPlugin()];
}

export type CreateRadiantVitestBaseOptions = {
	signalsEntry: URL;
	legacyTsconfig: LegacyTsConfig;
};

/**
 * Shared Vite configuration for Radiant's standard and legacy test lanes.
 *
 * @remarks
 * The helper is package-local because these settings are test infrastructure for Radiant,
 * not a repository-wide Vite abstraction.
 */
export async function createRadiantVitestBase(options: CreateRadiantVitestBaseOptions): Promise<UserConfig> {
	const legacy = isRadiantLegacyVitestLane();

	return {
		plugins: await createRadiantVitestPlugins(options.legacyTsconfig),
		...(legacy
			? {
					oxc: false as const,
					optimizeDeps: {
						include: ['@oxc-project/runtime/helpers/decorate'],
					},
				}
			: {}),
		define: {
			__LEGACY_ENVIRONMENT__: JSON.stringify(legacy),
		},
		resolve: {
			alias: {
				'@ecopages/signals': fileURLToPath(options.signalsEntry),
			},
		},
	};
}
