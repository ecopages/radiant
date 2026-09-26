import '@ecopages/radiant/server/install-ssr-runtime';
import '@ecopages/radiant/client/install-hydrator';
import { renderToString } from '@ecopages/jsx/server';
import {
	renderRadiantElementHostToString,
	withRadiantServerCustomElementRenderBridge,
} from '@ecopages/radiant/server/radiant-element-ssr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuiSidebar, RuiSidebarMenuButton } from './sidebar';
import { RuiSidebar as RuiSidebarElement } from './sidebar.script';

async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('RuiSidebar SSR boolean host attributes', () => {
	it('omits a false resizable attribute through the Radiant host SSR bridge and upgrades without a handle', async () => {
		const serverElement = new RuiSidebarElement();
		serverElement.id = 'primary-sidebar';
		serverElement.collapsible = 'off';
		serverElement.mobileBreakpoint = 0;
		serverElement.label = 'Primary';
		serverElement.resizable = false;
		serverElement.defaultOpen = true;

		const html = renderRadiantElementHostToString(serverElement, { mode: 'hydrate' });

		expect(html).not.toContain('resizable=');
		expect(html).not.toContain('data-ref="handle"');

		document.body.innerHTML = html;
		await customElements.whenDefined('rui-sidebar');
		await settled();

		const sidebar = document.querySelector('rui-sidebar') as RuiSidebarElement;
		expect(sidebar.resizable).toBe(false);
		expect(sidebar.querySelector('[data-ref="handle"]')).toBeNull();

		document.body.innerHTML = '';
	});
});

describe('RuiSidebar SSR active links', () => {
	it('marks the current link once server markup upgrades', async () => {
		const originalPath = window.location.pathname;
		history.replaceState(null, '', '/docs/installation');
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiSidebar id="docs-nav" matchActive mobileBreakpoint={0} label="Docs">
					<RuiSidebarMenuButton href="/docs/overview">Overview</RuiSidebarMenuButton>
					<RuiSidebarMenuButton href="/docs/installation">Installation</RuiSidebarMenuButton>
				</RuiSidebar>,
			),
		);
		expect(html).not.toContain('aria-current');

		document.body.innerHTML = html;
		await customElements.whenDefined('rui-sidebar');
		await settled();

		expect(document.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/docs/installation');

		document.body.innerHTML = '';
		history.replaceState(null, '', originalPath);
	});
});

describe('RuiSidebar SSR navigation listeners', () => {
	let documentAddSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		documentAddSpy = vi.spyOn(document, 'addEventListener');
	});

	afterEach(() => {
		documentAddSpy.mockRestore();
	});

	it('does not register navigationEvents listeners during SSR prop assignment', () => {
		for (let i = 0; i < 24; i++) {
			const sidebar = new RuiSidebarElement();
			sidebar.matchActive = true;
			sidebar.navigationEvents = 'eco:page-load,eco:after-swap';
			renderRadiantElementHostToString(sidebar, { mode: 'hydrate' });
		}

		expect(
			documentAddSpy.mock.calls.filter(
				(call: Parameters<Document['addEventListener']>) => call[0] === 'eco:page-load',
			),
		).toHaveLength(0);
		expect(
			documentAddSpy.mock.calls.filter(
				(call: Parameters<Document['addEventListener']>) => call[0] === 'eco:after-swap',
			),
		).toHaveLength(0);
	});
});
