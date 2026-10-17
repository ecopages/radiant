import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import {
	renderRadiantElementHostToString,
	withRadiantServerCustomElementRenderBridge,
} from '@ecopages/radiant/server/radiant-element-ssr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuiSidebar, RuiSidebarMenuButton } from './sidebar';
import { RuiSidebar as RuiSidebarElement } from './sidebar.script';

describe('RuiSidebar SSR boolean host attributes', () => {
	it('omits a false resizable attribute through the Radiant host SSR bridge', async () => {
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
		await expect(html).toMatchFileSnapshot('./__snapshots__/sidebar.hydration/resizable-false.html');
	});
});

describe('RuiSidebar SSR active links', () => {
	it('leaves the current link unmarked in server markup', async () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiSidebar id="docs-nav" matchActive mobileBreakpoint={0} label="Docs">
					<RuiSidebarMenuButton href="/docs/overview">Overview</RuiSidebarMenuButton>
					<RuiSidebarMenuButton href="/docs/installation">Installation</RuiSidebarMenuButton>
				</RuiSidebar>,
			),
		);

		expect(html).not.toContain('aria-current');
		await expect(html).toMatchFileSnapshot('./__snapshots__/sidebar.hydration/active-links.html');
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
