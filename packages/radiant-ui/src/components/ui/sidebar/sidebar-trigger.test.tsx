import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import './sidebar.css';
import { createRoot, type JsxRenderable, type JsxRoot } from '@ecopages/jsx';
import { userEvent } from 'storybook/test';
import { RuiSidebar, RuiSidebarHeader, RuiSidebarInset, RuiSidebarProvider, RuiSidebarTrigger } from './sidebar';

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root: JsxRoot = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('RuiSidebarTrigger', () => {
	it('wires aria-controls and toggles the sidebar', async () => {
		const { host, cleanup } = mount(
			<>
				<RuiSidebarTrigger controls="primary-sidebar" triggerLabel="Open sidebar" />
				<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
					<span>content</span>
				</RuiSidebar>
			</>,
		);

		await settled();

		const trigger = host.querySelector('rui-sidebar-trigger button') as HTMLButtonElement;
		const sidebar = host.querySelector('rui-sidebar') as HTMLElement;

		expect(trigger.getAttribute('aria-controls')).toBe('primary-sidebar');
		expect(trigger.getAttribute('aria-expanded')).toBe('true');

		await userEvent.click(trigger);
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect(trigger.getAttribute('aria-expanded')).toBe('false');

		await userEvent.click(trigger);
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
		expect(trigger.getAttribute('aria-expanded')).toBe('true');

		cleanup();
	});

	it('renders a panel glyph by default', async () => {
		const { host, cleanup } = mount(<RuiSidebarTrigger controls="primary-sidebar" triggerLabel="Open sidebar" />);

		await settled();

		expect(host.querySelector('.rui-sidebar__trigger-glyph')).not.toBeNull();

		cleanup();
	});

	it('applies button-label on the trigger host', async () => {
		const { host, cleanup } = mount(
			<rui-sidebar-trigger prop:buttonLabel="Collapse sidebar" controls="x"></rui-sidebar-trigger>,
		);
		await settled();
		const triggerHost = host.querySelector('rui-sidebar-trigger') as HTMLElement & { buttonLabel: string };
		expect(triggerHost.buttonLabel).toBe('Collapse sidebar');
		cleanup();
	});

	it('reads the accessible name from button-label only', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<RuiSidebarHeader aria-label="Header">
					<rui-sidebar-trigger attr:button-label="Collapse sidebar" attr:data-button-label="Ignored">
						<button data-ref="button" type="button"></button>
					</rui-sidebar-trigger>
				</RuiSidebarHeader>
			</RuiSidebar>,
		);
		await settled();
		expect(host.querySelector('[data-ref="button"]')?.getAttribute('aria-label')).toBe('Collapse sidebar');
		cleanup();
	});

	it('attaches one sidebar observer per trigger on connect', async () => {
		const observe = vi.spyOn(MutationObserver.prototype, 'observe');
		const { host, cleanup } = mount(
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
						<RuiSidebarHeader aria-label="Header">
							<RuiSidebarTrigger placement="header" controls="primary-sidebar" />
						</RuiSidebarHeader>
					</RuiSidebar>
				}
			>
				<RuiSidebarInset id="main">
					<RuiSidebarTrigger placement="inset" controls="primary-sidebar" />
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);
		await settled();
		await new Promise((resolve) => requestAnimationFrame(resolve));

		const sidebar = host.querySelector('rui-sidebar');
		expect(observe.mock.calls.filter(([target]) => target === sidebar)).toHaveLength(2);
		cleanup();
	});

	it('relabels without rebuilding the sidebar observer', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<RuiSidebarHeader aria-label="Header">
					<RuiSidebarTrigger placement="header" triggerLabel="Collapse sidebar" />
				</RuiSidebarHeader>
			</RuiSidebar>,
		);
		await settled();
		const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
		const triggerHost = host.querySelector('rui-sidebar-trigger') as HTMLElement & { buttonLabel: string };

		triggerHost.buttonLabel = 'Hide navigation';
		await settled();

		expect(host.querySelector('[data-ref="button"]')?.getAttribute('aria-label')).toBe('Hide navigation');
		expect(disconnect).not.toHaveBeenCalled();
		cleanup();
	});

	it.each([
		{ placement: 'inset', state: 'collapsed' },
		{ placement: 'header', state: 'expanded' },
	] as const)('reports the SSR $placement guess while no sidebar resolves', async ({ placement, state }) => {
		const { host, cleanup } = mount(<RuiSidebarTrigger placement={placement} controls="missing-sidebar" />);
		await settled();

		const triggerHost = host.querySelector('rui-sidebar-trigger') as HTMLElement;
		expect(triggerHost.getAttribute('data-sidebar-state')).toBe(state);
		expect(triggerHost.hasAttribute('data-sidebar-mobile')).toBe(false);
		expect(host.querySelector('[data-ref="button"]')?.getAttribute('aria-expanded')).toBe(
			String(state === 'expanded'),
		);
		cleanup();
	});

	it('keeps the classes of a hand-written light-DOM button', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<RuiSidebarHeader aria-label="Header">
					<rui-sidebar-trigger controls="primary-sidebar" placement="header">
						<button data-ref="button" type="button" class="app-toggle">
							Menu
						</button>
					</rui-sidebar-trigger>
				</RuiSidebarHeader>
			</RuiSidebar>,
		);
		await settled();
		const triggerHost = host.querySelector('rui-sidebar-trigger') as HTMLElement & { variant: string };
		const button = host.querySelector('[data-ref="button"]') as HTMLButtonElement;
		expect(button.classList.contains('app-toggle')).toBe(true);

		triggerHost.variant = 'outline';
		await settled();

		expect(button.classList.contains('app-toggle')).toBe(true);
		expect(button.classList.contains('rui-button--outline')).toBe(true);
		expect(button.classList.contains('rui-button--ghost')).toBe(false);
		cleanup();
	});

	it('maps triggerLabel through the JSX view', async () => {
		const { host, cleanup } = mount(<RuiSidebarTrigger triggerLabel="Collapse sidebar" controls="x" />);
		await settled();
		const button = host.querySelector('button') as HTMLButtonElement;
		expect(button.getAttribute('aria-label')).toBe('Collapse sidebar');
		cleanup();
	});

	it('toggles the sidebar when rendered inside the sidebar header', async () => {
		const { host, cleanup } = mount(
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
						<RuiSidebarHeader aria-label="Header">
							<RuiSidebarTrigger
								placement="header"
								controls="primary-sidebar"
								triggerLabel="Collapse sidebar"
							/>
						</RuiSidebarHeader>
						<span>Nav</span>
					</RuiSidebar>
				}
			>
				<RuiSidebarInset id="main">
					<p>Content</p>
					<RuiSidebarTrigger placement="inset" controls="primary-sidebar" triggerLabel="Open sidebar" />
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar') as HTMLElement;
		const headerTrigger = host.querySelector(
			'.rui-sidebar__header rui-sidebar-trigger button',
		) as HTMLButtonElement;
		const headerHost = headerTrigger.closest('rui-sidebar-trigger') as HTMLElement;
		const insetHost = host.querySelector('.rui-sidebar__inset rui-sidebar-trigger') as HTMLElement;

		expect(headerTrigger.getAttribute('aria-controls')).toBe('primary-sidebar');
		expect(headerTrigger.getAttribute('aria-label')).toBe('Collapse sidebar');
		expect(headerHost.getAttribute('placement')).toBe('header');
		expect(headerHost.getAttribute('data-sidebar-state')).toBe('expanded');
		expect(headerHost.getAttribute('data-sidebar-mobile')).toBe('false');
		expect(insetHost.getAttribute('data-sidebar-state')).toBe('expanded');

		await page.viewport(600, 800);
		expect(getComputedStyle(headerHost).display).not.toBe('none');
		expect(getComputedStyle(insetHost).display).toBe('none');
		await page.viewport(1280, 800);

		await userEvent.click(headerTrigger);
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect(headerTrigger.getAttribute('aria-expanded')).toBe('false');
		expect(headerHost.getAttribute('data-sidebar-state')).toBe('collapsed');
		expect(insetHost.getAttribute('data-sidebar-state')).toBe('collapsed');

		const expandTrigger = host.querySelector('.rui-sidebar__inset rui-sidebar-trigger button') as HTMLButtonElement;
		await userEvent.click(expandTrigger);
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
		expect(insetHost.getAttribute('data-sidebar-state')).toBe('expanded');

		cleanup();
	});

	it('toggles via closest rui-sidebar when controls is omitted inside the pane', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<RuiSidebarHeader aria-label="Header">
					<RuiSidebarTrigger triggerLabel="Collapse sidebar" />
				</RuiSidebarHeader>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar') as HTMLElement;
		const headerTrigger = host.querySelector('rui-sidebar-trigger button') as HTMLButtonElement;

		expect(headerTrigger.getAttribute('aria-controls')).toBe('primary-sidebar');

		await userEvent.click(headerTrigger);
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');

		cleanup();
	});
});
