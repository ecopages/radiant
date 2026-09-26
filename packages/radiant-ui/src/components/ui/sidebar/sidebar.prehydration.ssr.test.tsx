// @vitest-environment node
import '@ecopages/radiant/server/install-ssr-runtime';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JsxRenderable } from '@ecopages/jsx';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiSidebar, RuiSidebarInset, RuiSidebarProvider, RuiSidebarTrigger } from './sidebar';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '__snapshots__/sidebar.prehydration');

function render(name: string, node: JsxRenderable): string {
	const html = withRadiantServerCustomElementRenderBridge(() => renderToString(node));
	mkdirSync(fixtureDir, { recursive: true });
	writeFileSync(join(fixtureDir, `${name}.html`), html);
	return html;
}

function trigger(html: string, testId: string): string {
	const match = html.match(new RegExp(`<rui-sidebar-trigger\\b[^>]*data-testid="${testId}"[^>]*>`));
	expect(match, testId).not.toBeNull();
	return match?.[0] ?? '';
}

function sidebarTag(html: string, id: string): string {
	const match = html.match(new RegExp(`<rui-sidebar(?!-)[^>]*\\bid="${id}"[^>]*>`));
	expect(match, id).not.toBeNull();
	return match?.[0] ?? '';
}

describe('sidebar pre-hydration SSR fixtures', () => {
	it('writes the layouts the browser visibility test paints', () => {
		const off = render(
			'off',
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar id="primary" label="Primary">
						<RuiSidebarTrigger data-testid="s-header" placement="header" controls="primary" />
					</RuiSidebar>
				}
			>
				<RuiSidebarInset>
					<RuiSidebarTrigger data-testid="s-inset" placement="inset" controls="primary" />
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);
		const iconExpanded = render(
			'icon-expanded',
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar id="primary" collapsible="icon" label="Primary">
						<RuiSidebarTrigger data-testid="s-header" placement="header" controls="primary" />
					</RuiSidebar>
				}
			>
				<RuiSidebarInset>
					<RuiSidebarTrigger data-testid="s-inset" placement="inset" controls="primary" />
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);
		const docsOff = render(
			'docs-off',
			<RuiSidebarProvider
				layout="docs"
				siteHeader={
					<>
						<RuiSidebarTrigger data-testid="s-site-header" placement="header" controls="site" />
						<RuiSidebarTrigger data-testid="s-site-inset" placement="inset" controls="site" />
					</>
				}
				sidebar={
					<RuiSidebar id="site" label="Site">
						<RuiSidebarTrigger data-testid="s-header" placement="header" controls="site" />
					</RuiSidebar>
				}
			>
				<RuiSidebarInset>
					<RuiSidebarTrigger data-testid="s-inset" placement="inset" controls="site" />
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);
		const docsCollapsed = render(
			'docs-icon-collapsed',
			<RuiSidebarProvider
				layout="docs"
				siteHeader={
					<>
						<RuiSidebarTrigger data-testid="s-site-header" placement="header" controls="site" />
						<RuiSidebarTrigger data-testid="s-site-inset" placement="inset" controls="site" />
					</>
				}
				sidebar={
					<RuiSidebar id="site" collapsible="icon" defaultOpen={false} label="Site">
						<RuiSidebarTrigger data-testid="s-header" placement="header" controls="site" />
					</RuiSidebar>
				}
			>
				<RuiSidebarInset>
					<RuiSidebarTrigger data-testid="s-inset" placement="inset" controls="site" />
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);
		const nested = render(
			'nested',
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar id="outer" label="Outer">
						<RuiSidebarTrigger data-testid="outer-header" placement="header" controls="outer" />
					</RuiSidebar>
				}
			>
				<RuiSidebarInset>
					<RuiSidebarTrigger data-testid="outer-inset" placement="inset" controls="outer" />
					<RuiSidebarProvider
						sidebar={
							<RuiSidebar id="inner" collapsible="icon" defaultOpen={false} label="Inner">
								<RuiSidebarTrigger data-testid="inner-header" placement="header" controls="inner" />
							</RuiSidebar>
						}
					>
						<RuiSidebarInset>
							<RuiSidebarTrigger data-testid="inner-inset" placement="inset" controls="inner" />
						</RuiSidebarInset>
					</RuiSidebarProvider>
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);
		const two = render(
			'two-sidebars',
			<RuiSidebarProvider
				sidebar={
					<>
						<RuiSidebar id="left" label="Left">
							<RuiSidebarTrigger data-testid="left-header" placement="header" controls="left" />
						</RuiSidebar>
						<RuiSidebar id="right" collapsible="icon" label="Right">
							<RuiSidebarTrigger data-testid="right-header" placement="header" controls="right" />
						</RuiSidebar>
					</>
				}
			>
				<RuiSidebarInset>
					<RuiSidebarTrigger data-testid="left-inset" placement="inset" controls="left" />
					<RuiSidebarTrigger data-testid="right-inset" placement="inset" controls="right" />
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);

		for (const html of [off, iconExpanded, docsOff, docsCollapsed, nested, two]) {
			for (const tag of html.match(/<rui-sidebar-trigger\b[^>]*>/g) ?? []) {
				expect(tag).toContain('placement=');
				expect(tag).not.toContain('data-sidebar-mobile');
			}
			for (const tag of html.match(/<rui-sidebar(?!-)[^>]*>/g) ?? []) {
				expect(tag).toMatch(/collapsible="|data-collapsible="/);
				expect(tag).toContain('data-state=');
				expect(tag).toContain('data-mobile=');
			}
		}

		expect(sidebarTag(docsCollapsed, 'site')).toContain('data-state="collapsed"');
		expect(sidebarTag(iconExpanded, 'primary')).toContain('data-state="expanded"');
		expect(trigger(off, 's-header')).toContain('placement="header"');
		expect(trigger(two, 'right-header')).toContain('data-sidebar-state=');
	});
});
