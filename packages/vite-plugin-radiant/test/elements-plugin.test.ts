import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';
import { radiantElements } from '../src/elements';
import { getResolvedRadiantVirtualModule } from '../src/elements/shared';

describe('radiantElements virtual modules', () => {
	test('generates registry modules for configured globs', async () => {
		const plugin = radiantElements({ componentDirectory: 'src/components' });
		const resolvedId = plugin.resolveId?.('virtual:radiant/components');
		expect(resolvedId).toBe(getResolvedRadiantVirtualModule('components'));

		const componentsModule = plugin.load?.(resolvedId!);
		expect(componentsModule).toContain('import.meta.glob');
		expect(componentsModule).toContain('/src/components/');

		const assetRegistryId = plugin.resolveId?.('virtual:radiant/ssr-asset-registry');
		const assetRegistryModule = plugin.load?.(assetRegistryId!);
		expect(assetRegistryModule).toContain('resolveRadiantSsrStyleAsset');

		const ssrRegistryId = plugin.resolveId?.('virtual:radiant/ssr-client-module-registry');
		const ssrRegistryModule = plugin.load?.(ssrRegistryId!);
		expect(ssrRegistryModule).toContain("import { getCustomElementTagName } from '@ecopages/jsx/jsx-runtime';");
		expect(ssrRegistryModule).toContain(
			'const tagName = component == null ? undefined : getCustomElementTagName(component);',
		);
	});
});

describe('radiantElements component style assets', () => {
	test('links the style files the browser build wrote once it has run', async () => {
		const root = mkdtempSync(join(tmpdir(), 'radiant-styles-'));
		mkdirSync(join(root, 'src/components'), { recursive: true });
		writeFileSync(join(root, 'src/components/card.css'), '.card { color: red; }');
		writeFileSync(join(root, 'src/components/card.script.ts'), '');
		onTestFinished(() => rmSync(root, { recursive: true, force: true }));

		const plugin = radiantElements({ componentDirectory: 'src/components' });
		callHook(plugin.configResolved, {}, { root });
		const assetRegistryId = plugin.resolveId?.('virtual:radiant/ssr-asset-registry');
		expect(plugin.load?.(assetRegistryId!)).toContain("query: '?url'");

		const emitted: { name: string; source: unknown }[] = [];
		const client = {
			environment: { config: { command: 'build', consumer: 'client', base: '/' } },
			emitFile: (file: { name: string; source: unknown }) => `ref-${emitted.push(file)}`,
			getFileName: (referenceId: string) => `assets/card-${referenceId}.css`,
		};
		await callHook(plugin.buildStart, client);
		callHook(plugin.generateBundle, client);

		expect(emitted.map((file) => file.name)).toEqual(['card.css']);
		const assetRegistryModule = plugin.load?.(assetRegistryId!);
		expect(assetRegistryModule).toContain('{"/src/components/card.css":"/assets/card-ref-1.css"}');
		expect(assetRegistryModule).not.toContain("query: '?url'");
	});

	test('emits nothing outside the browser build', async () => {
		const plugin = radiantElements({ componentDirectory: 'src/components' });
		callHook(plugin.configResolved, {}, { root: '/missing' });
		const emitFile = () => {
			throw new Error('emitFile must not run');
		};

		await callHook(plugin.buildStart, {
			environment: { config: { command: 'build', consumer: 'server' } },
			emitFile,
		});
		await callHook(plugin.buildStart, {
			environment: { config: { command: 'serve', consumer: 'client' } },
			emitFile,
		});
	});
});

/**
 * Calls a Vite plugin hook with a stand-in plugin context.
 *
 * @remarks Hooks can be a function or an object with a `handler`; the tests only need the context fields each hook reads.
 */
function callHook(hook: unknown, context: object, ...args: unknown[]): unknown {
	const handler =
		typeof hook === 'function' ? hook : (hook as { handler: (...values: unknown[]) => unknown }).handler;
	return handler.apply(context, args);
}
