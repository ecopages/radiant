/// <reference types="vite/client" />
/** @jsxImportSource @ecopages/jsx */
import { jsx, type JsxRenderable } from '@ecopages/jsx';
import { RadiantElement } from '@ecopages/radiant';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
	loadRadiantDomModules: vi.fn(),
	startControllers: vi.fn(),
}));

vi.mock('@ecopages/radiant', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@ecopages/radiant')>();

	return {
		...actual,
		startControllers: runtime.startControllers,
	};
});

const tagName = 'start-radiant-card-test';

type RadiantBrowserTestGlobals = typeof globalThis & {
	__radiantTestLoadRadiantDomModules?: (root: ParentNode) => Promise<string[]>;
};

const testGlobals = globalThis as RadiantBrowserTestGlobals;

class StartRadiantCard extends RadiantElement {
	override render() {
		return (
			<section>
				<header>
					<slot name="header" />
				</header>
				<div>
					<slot />
				</div>
			</section>
		);
	}
}

function renderPage(): JsxRenderable {
	return jsx('main', {
		title: 'page',
		children: jsx(tagName, {
			children: [jsx('h2', { slot: 'header', children: 'Title' }), jsx('p', { children: 'Body' })],
		}),
	});
}

function renderServerMarkup(): string {
	const projection = JSON.stringify({
		header: ['<h2 slot="header">Title</h2>'],
		'': ['<p>Body</p>'],
	}).replaceAll('<', '\\u003c');

	return `<main data-radiant-jsx-bind-0="attr:title" title="page"><${tagName} data-radiant-ssr="authored"><section><header><h2 slot="header">Title</h2></header><div><p>Body</p></div></section><script type="application/json" data-radiant-slot-projection>${projection}</script></${tagName}></main>`;
}

describe('startRadiantApp', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		document.body.innerHTML = '';
		runtime.loadRadiantDomModules.mockImplementation(async () => {
			if (!customElements.get(tagName)) {
				customElements.define(tagName, StartRadiantCard);
			}

			return [];
		});
		testGlobals.__radiantTestLoadRadiantDomModules = runtime.loadRadiantDomModules;
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		warn.mockRestore();
		runtime.loadRadiantDomModules.mockReset();
		runtime.startControllers.mockReset();
		delete testGlobals.__radiantTestLoadRadiantDomModules;
	});

	test('loads server page elements before the app JSX is created', async () => {
		const root = document.createElement('div');
		root.innerHTML = renderServerMarkup();
		document.body.append(root);
		const serverHost = root.querySelector(tagName);
		const { startRadiantApp } = await import('../src/runtime/start-radiant-app');

		await startRadiantApp({ app: renderPage, documentRoot: document, installHydrator: true, root });

		await vi.waitFor(() => expect(root.querySelector(`${tagName} header > h2`)).not.toBeNull());
		expect(root.querySelector(tagName)).toBe(serverHost);
		expect(root.querySelector(`${tagName} header > h2`)?.textContent).toBe('Title');
		expect(root.querySelector(`${tagName} div > p`)?.textContent).toBe('Body');
		expect(warn).not.toHaveBeenCalled();
	});
});
