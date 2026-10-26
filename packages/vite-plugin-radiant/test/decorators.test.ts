import { createServer } from 'vite';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { contextSelector, createContext, onContextUpdate } from '@ecopages/radiant/context';
import { createRadiantDecoratorBabelPlugin, type RadiantDecoratorBabelOptions } from '../src/decorators';

/** Compiles `source` through the Babel decorator plugin and returns the transformed module code. */
async function transformWithDecoratorPlugin(source: string, options?: RadiantDecoratorBabelOptions): Promise<string> {
	const root = await mkdtemp(path.join(tmpdir(), 'radiant-decorators-'));
	const filename = path.join(root, 'fixture.tsx');
	await writeFile(filename, source);

	const server = await createServer({
		appType: 'custom',
		configFile: false,
		logLevel: 'silent',
		plugins: [await createRadiantDecoratorBabelPlugin(options)],
		root,
		server: { middlewareMode: true },
	});

	try {
		const result = await server.transformRequest(filename);
		return (result?.code ?? '').replace(/\nexport \{\};?\s*$/, '');
	} finally {
		await server.close();
		await rm(root, { recursive: true, force: true });
	}
}

describe('createRadiantDecoratorBabelPlugin', () => {
	test('erases declare JSX props and preserves decorated field initialization', async () => {
		const source = `
			import type { JSX_PROPS } from '@ecopages/jsx';
			type Props = { variant?: string };
			@customElement('rui-alert')
			class RuiAlert extends RadiantElement {
				declare readonly [JSX_PROPS]?: Props;
				@prop({ type: String }) variant: string = 'info';
				@bound dismiss(): void {}
			}
		`;
		const code = await transformWithDecoratorPlugin(source);

		expect(code).not.toContain('JSX_PROPS');
		expect(code).toContain('variant = (_initProto(this), _init_variant(this, "info"))');

		const jsxProps = Symbol('jsx-props');
		const RuiAlert = new Function(
			'RadiantElement',
			'customElement',
			'prop',
			'bound',
			'JSX_PROPS',
			`${code}\nreturn RuiAlert;`,
		)(
			class {},
			() => (target: unknown) => target,
			() => () => undefined,
			(method: unknown) => method,
			jsxProps,
		) as new () => { variant: string };
		const instance = new RuiAlert();

		expect(instance.variant).toBe('info');
		expect(jsxProps in instance).toBe(false);
	});

	describe("with version: 'legacy'", () => {
		const countContext = createContext<{ count: number }>(Symbol('babel-legacy-count'));
		const select = (value: { count: number }) => value.count;

		function defineClass(code: string, className: string): new () => Record<string, unknown> {
			return new Function('Base', 'contextSelector', 'onContextUpdate', 'countContext', 'select', `${code}\nreturn ${className};`)(
				class {},
				contextSelector,
				onContextUpdate,
				countContext,
				select,
			);
		}

		test('applies @contextSelector to a field, whose descriptor carries an initializer', async () => {
			const code = await transformWithDecoratorPlugin(
				`
				class FieldSelector extends Base {
					@contextSelector({ context: countContext, select }) count = -1;
					@onContextUpdate({ context: countContext, select }) onCount(_count: number): void {}
				}
			`,
				{ version: 'legacy' },
			);
			const FieldSelector = defineClass(code, 'FieldSelector');

			expect(new FieldSelector().count).toBe(-1);
			expect(Object.getOwnPropertySymbols(FieldSelector.prototype).map(String)).toContain(
				'Symbol(@ecopages/radiant.legacy-post-construction-initializers)',
			);
		});

		test('rejects @contextSelector on a method with a TypeError naming @onContextUpdate', async () => {
			const code = await transformWithDecoratorPlugin(
				`
				class MethodSelector extends Base {
					@contextSelector({ context: countContext, select }) onCount(_count: number): void {}
				}
			`,
				{ version: 'legacy' },
			);

			expect(() => defineClass(code, 'MethodSelector')).toThrow(TypeError);
			expect(() => defineClass(code, 'MethodSelector')).toThrow(/Use @onContextUpdate/);
		});
	});
});
