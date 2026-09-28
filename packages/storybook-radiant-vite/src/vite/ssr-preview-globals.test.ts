import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Options } from 'storybook/internal/types';
import { globalPackages, globalsNameReferenceMap } from 'storybook/internal/preview/globals';
import { viteFinal } from './vite-final';
import {
	installStorybookPreviewGlobals,
	radiantSsrPreviewGlobalsPlugin,
	resolvePreviewPackage,
} from './ssr-preview-globals';

vi.mock('@ecopages/vite-plugin-radiant', () => ({
	default: async () => [{ name: 'ecopages:radiant-mock' }],
}));

type GlobalScope = typeof globalThis & Record<string, unknown>;

const previewGlobalNames = Object.values(globalsNameReferenceMap);
const docsBlocksSpecifier = '@storybook/addon-docs/blocks';
const docsBlocksGlobal = '__STORYBOOK_BLOCKS_EMPTY_MODULE__';

describe('resolvePreviewPackage', () => {
	it('uses the cwd path when the first require.resolve fails', () => {
		const cwdResolved = '/cwd/node_modules/storybook/test.js';
		const resolveImpl = vi.fn((specifier: string, options?: { paths?: string[] }) => {
			if (!options?.paths) {
				throw new Error(`Cannot find module '${specifier}'`);
			}
			expect(options.paths).toEqual([process.cwd()]);
			return cwdResolved;
		});

		expect(resolvePreviewPackage('storybook/test', resolveImpl)).toBe(cwdResolved);
		expect(resolveImpl).toHaveBeenCalledTimes(2);
		expect(resolveImpl).toHaveBeenNthCalledWith(1, 'storybook/test');
		expect(resolveImpl).toHaveBeenNthCalledWith(2, 'storybook/test', { paths: [process.cwd()] });
	});
});

describe('installStorybookPreviewGlobals', () => {
	afterEach(() => {
		for (const name of previewGlobalNames) {
			Reflect.deleteProperty(globalThis, name);
		}
	});

	it('assigns real preview modules on the given scope', async () => {
		const scope = Object.create(null) as GlobalScope;
		await installStorybookPreviewGlobals(scope);

		const testModule = scope.__STORYBOOK_MODULE_TEST__ as {
			expect?: unknown;
			userEvent?: { click?: unknown };
		};

		expect(typeof testModule.expect).toBe('function');
		expect(typeof testModule.userEvent?.click).toBe('function');
		expect(scope.__STORYBOOK_MODULE_ACTIONS__).toBeTypeOf('object');
		expect(scope.__STORYBOOK_MODULE_PREVIEW_API__).toBeTypeOf('object');
	});

	it('is idempotent when a global is already set', async () => {
		const scope = Object.create(null) as GlobalScope;
		const sentinel = { expect: () => undefined, userEvent: {} };
		scope.__STORYBOOK_MODULE_TEST__ = sentinel;

		await installStorybookPreviewGlobals(scope);

		expect(scope.__STORYBOOK_MODULE_TEST__).toBe(sentinel);
	});

	it('rejects when a required preview package cannot be resolved', async () => {
		const scope = Object.create(null) as GlobalScope;

		await expect(
			installStorybookPreviewGlobals(scope, () => {
				throw new Error('missing preview package');
			}),
		).rejects.toThrow('Could not install required Storybook preview global');
	});

	it('ignores builder-only globals added after the preview package list loads', async () => {
		const scope = Object.create(null) as GlobalScope;
		const previewGlobals = globalsNameReferenceMap as Record<string, string>;
		previewGlobals[docsBlocksSpecifier] = docsBlocksGlobal;
		const resolvePackage = vi.fn(resolvePreviewPackage);

		try {
			await installStorybookPreviewGlobals(scope, resolvePackage);
		} finally {
			Reflect.deleteProperty(previewGlobals, docsBlocksSpecifier);
		}

		expect(globalPackages).not.toContain(docsBlocksSpecifier);
		expect(resolvePackage).not.toHaveBeenCalledWith(docsBlocksSpecifier);
		expect(scope[docsBlocksGlobal]).toBeUndefined();
	});

	it('evaluates rewritten storybook/test bindings after install', async () => {
		await installStorybookPreviewGlobals();
		const mod = await import('./fixtures/rewritten-storybook-test-import');
		expect(typeof mod.expect).toBe('function');
	});
});

describe('radiantSsrPreviewGlobalsPlugin', () => {
	it('hooks Vite start without a transform', () => {
		const plugin = radiantSsrPreviewGlobalsPlugin();
		expect(plugin.name).toBe('ecopages:radiant-ssr-preview-globals');
		expect(plugin.transform).toBeUndefined();
		expect(plugin.configResolved).toBe(plugin.configureServer);
		expect(plugin.configureServer).toBe(plugin.buildStart);
	});
});

describe('viteFinal', () => {
	it('registers the preview globals plugin and not a transform shim', async () => {
		const config = await viteFinal({ plugins: [] }, {
			presets: {
				apply: async () => ({}),
			},
		} as unknown as Options);

		const names = (config.plugins ?? []).map((plugin) =>
			plugin && typeof plugin === 'object' && 'name' in plugin ? plugin.name : undefined,
		);
		expect(names).toContain('ecopages:radiant-ssr-preview-globals');
		expect(names).not.toContain('ecopages:radiant-storybook-ssr-shim');
	});
});
