import '@ecopages/radiant/client/install-hydrator';
import { afterEach, describe, expect, it } from 'vitest';
import { RuiSidebar as RuiSidebarElement } from './sidebar.script';
void RuiSidebarElement;

/** Real SSR output written by `sidebar.ssr.test.tsx`. */
const fixtures = import.meta.glob<string>('./__snapshots__/sidebar.hydration/*.html', {
	query: '?raw',
	import: 'default',
	eager: true,
});

function paint(name: string): void {
	const html = fixtures[`./__snapshots__/sidebar.hydration/${name}.html`];
	if (!html) {
		throw new Error(`Missing SSR fixture "${name}". Run the ssr project to write it.`);
	}
	document.body.innerHTML = html;
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('RuiSidebar hydrating server markup', () => {
	const originalPath = window.location.pathname;

	afterEach(() => {
		document.body.innerHTML = '';
		history.replaceState(null, '', originalPath);
	});

	it('upgrades without a handle when resizable is false', async () => {
		paint('resizable-false');
		await customElements.whenDefined('rui-sidebar');
		await settled();

		const sidebar = document.querySelector('rui-sidebar') as RuiSidebarElement;
		expect(sidebar.resizable).toBe(false);
		expect(sidebar.querySelector('[data-ref="handle"]')).toBeNull();
	});

	it('marks the current link once server markup upgrades', async () => {
		history.replaceState(null, '', '/docs/installation');
		paint('active-links');
		await customElements.whenDefined('rui-sidebar');
		await settled();

		expect(document.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/docs/installation');
	});
});
