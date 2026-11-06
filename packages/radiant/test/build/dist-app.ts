import path from 'node:path';
import * as esbuild from 'esbuild';
import type { BrowserCommand } from 'vitest/node';
import { assertFreshDist } from './dist-freshness.js';

const packageRoot = path.resolve(import.meta.dirname, '../..');

/** The built package, as `publishConfig.directory` publishes it. */
export const distRoot = path.join(packageRoot, 'dist');

/**
 * A consumer app that renders a render-owning host from a JSX view: `mountFrame` passes a child marked
 * `slot="header"` to a defined host, and `mountLateFrame` defines the tag only after the view rendered it.
 *
 * @remarks Each call defines its own tag, so a development and a production bundle can load in one page.
 */
const consumerApp = `
import { render } from '@ecopages/jsx';
import { RadiantElement } from '@ecopages/radiant';

function defineFrame(tag) {
	class Frame extends RadiantElement {
		render() {
			return <div><header /><main><slot /></main></div>;
		}
	}
	customElements.define(tag, Frame);
}

export function mountFrame(tag, container) {
	const Tag = tag;
	defineFrame(tag);
	render(<Tag><h2 slot="header">Title</h2></Tag>, container);

	return container.querySelector(tag);
}

export function mountLateFrame(tag, container) {
	const Tag = tag;
	render(<Tag><p>Body</p></Tag>, container);
	defineFrame(tag);

	return container.querySelector(tag);
}
`;

/**
 * Bundles {@link consumerApp} against the built dist, resolved through its `package.json` exports, as an app's
 * bundler would in the given mode.
 */
export async function bundleDistApp(mode: 'development' | 'production'): Promise<string> {
	assertFreshDist();

	const result = await esbuild.build({
		stdin: { contents: consumerApp, loader: 'jsx', resolveDir: distRoot },
		bundle: true,
		define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
		format: 'esm',
		jsx: 'automatic',
		jsxImportSource: '@ecopages/jsx',
		logLevel: 'silent',
		minify: mode === 'production',
		platform: 'browser',
		write: false,
	});

	return result.outputFiles?.[0]?.text ?? '';
}

/** Vitest browser command: lets a Chromium test load {@link bundleDistApp}'s output. */
export const bundleDistAppCommand: BrowserCommand<['development' | 'production']> = (_context, mode) =>
	bundleDistApp(mode);

declare module 'vitest/browser' {
	interface BrowserCommands {
		bundleDistApp: (mode: 'development' | 'production') => Promise<string>;
	}
}
