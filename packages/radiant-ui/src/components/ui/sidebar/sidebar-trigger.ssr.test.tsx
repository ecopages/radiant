// @vitest-environment node
import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiSidebarTrigger } from './sidebar-trigger';
import {
	initialSidebarStateForPlacement,
	SIDEBAR_TRIGGER_DEFAULT_LABEL,
	sidebarTriggerButtonClass,
} from './sidebar-trigger.script';

describe('sidebar-trigger helpers', () => {
	it('resolves initial state for placement', () => {
		expect(initialSidebarStateForPlacement('header')).toBe('expanded');
		expect(initialSidebarStateForPlacement('inset')).toBe('collapsed');
		expect(initialSidebarStateForPlacement('')).toBe('expanded');
		expect(initialSidebarStateForPlacement(undefined)).toBe('expanded');
	});

	it('computes trigger button classes', () => {
		expect(sidebarTriggerButtonClass({ variant: 'ghost', size: 'md' })).toBe(
			'rui-button rui-button--ghost rui-button--md rui-sidebar__trigger',
		);
		expect(sidebarTriggerButtonClass({ variant: 'outline', size: 'sm' })).toBe(
			'rui-button rui-button--outline rui-button--sm rui-sidebar__trigger',
		);
	});

	it('exports the default trigger label constant', () => {
		expect(SIDEBAR_TRIGGER_DEFAULT_LABEL).toBe('Toggle sidebar');
	});
});

describe('RuiSidebarTrigger SSR', () => {
	it('registers the host and paints the toggle button before hydration', () => {
		expect(customElements.get('rui-sidebar-trigger')).toBeTypeOf('function');

		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiSidebarTrigger
					placement="inset"
					controls="docs-sidebar"
					triggerLabel="Open documentation navigation"
				/>,
			),
		);

		const [hostTag, buttonTag] = html.match(/<[^>]+>/g) ?? [];

		expect(hostTag).toMatch(/^<rui-sidebar-trigger\b/);
		expect(hostTag).toContain('placement="inset"');
		expect(hostTag).toContain('data-sidebar-state="collapsed"');
		expect(hostTag).not.toContain('data-sidebar-mobile');
		expect(buttonTag).toContain('data-ref="button"');
		expect(buttonTag).not.toContain('data-sidebar-state');
		expect(buttonTag).not.toContain('rui-sidebar__trigger--');
		expect(html).toContain('aria-expanded="false"');
		expect(html).toContain('aria-controls="docs-sidebar"');
		expect(html).toContain('aria-label="Open documentation navigation"');
		expect(html).toContain('rui-sidebar__trigger-glyph--menu');
	});

	it('falls back to default label when triggerLabel is omitted', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiSidebarTrigger placement="header" controls="docs-sidebar" />),
		);

		expect(html).toContain('aria-label="Toggle sidebar"');
		expect(html).toContain('data-sidebar-state="expanded"');
		expect(html).toContain('aria-expanded="true"');
	});
});
