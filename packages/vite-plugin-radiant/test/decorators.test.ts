import { createServer } from 'vite';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createRadiantDecoratorBabelPlugin } from '../src/decorators';

describe('createRadiantDecoratorBabelPlugin', () => {
	test('erases declare JSX props and preserves decorated field initialization', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'radiant-declare-props-'));
		const filename = path.join(root, 'fixture.tsx');
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
		await writeFile(filename, source);

		const server = await createServer({
			appType: 'custom',
			configFile: false,
			logLevel: 'silent',
			plugins: [await createRadiantDecoratorBabelPlugin()],
			root,
			server: { middlewareMode: true },
		});

		try {
			const result = await server.transformRequest(filename);
			const code = result?.code ?? '';
			expect(code).not.toContain('JSX_PROPS');
			expect(code).toContain('variant = (_initProto(this), _init_variant(this, "info"))');

			const executableCode = code.replace(/\nexport \{\};?\s*$/, '');
			const jsxProps = Symbol('jsx-props');
			const RuiAlert = new Function(
				'RadiantElement',
				'customElement',
				'prop',
				'bound',
				'JSX_PROPS',
				`${executableCode}\nreturn RuiAlert;`,
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
		} finally {
			await server.close();
			await rm(root, { recursive: true, force: true });
		}
	});
});
