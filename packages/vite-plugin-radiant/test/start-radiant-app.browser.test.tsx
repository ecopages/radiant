/// <reference types="vite/client" />
/** @jsxImportSource @ecopages/jsx */
import { jsx, type JsxRenderable } from '@ecopages/jsx';
import { RadiantElement } from '@ecopages/radiant';
import { afterEach, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
	loadRadiantDomModules: vi.fn(),
	startControllers: vi.fn(),
}));

/** Resolves once `selector` matches under `root`, re-checked on every DOM mutation there, which is how the hydrated view appears. */
function untilMatched(root: Element, selector: string): Promise<void> {
	return new Promise((resolve) => {
		const observer = new MutationObserver(() => attempt());
		const attempt = () => {
			if (root.querySelector(selector)) {
				observer.disconnect();
				resolve();
			}
		};
		observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
		onTestFinished(() => observer.disconnect());
		attempt();
	});
}

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
				<div>{this.slotted}</div>
			</section>
		);
	}
}

function renderPage(): JsxRenderable {
	return jsx('main', {
		title: 'page',
		children: jsx(tagName, {
			children: [jsx('h2', { children: 'Title' }), jsx('p', { children: 'Body' })],
		}),
	});
}

function renderServerMarkup(): string {
	return `<main data-radiant-jsx-bind-0="attr:title" title="page"><${tagName} data-radiant-slotted data-radiant-ssr><section><div><!--radiant-slotted--><h2>Title</h2><p>Body</p><!--/radiant-slotted--></div></section></${tagName}></main>`;
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

		await untilMatched(root, `${tagName} div > h2`);
		expect(root.querySelector(tagName)).toBe(serverHost);
		expect(root.querySelector(`${tagName} div > h2`)?.textContent).toBe('Title');
		expect(root.querySelector(`${tagName} div > p`)?.textContent).toBe('Body');
		expect(warn).not.toHaveBeenCalled();
	});
});
