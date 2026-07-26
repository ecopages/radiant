import { describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable, type JsxRoot } from '@ecopages/jsx';
import { userEvent } from 'storybook/test';
import {
	RuiSidebar,
	RuiSidebarTrigger,
	RuiSidebarProvider,
	RuiSidebarHeader,
	RuiSidebarContent,
	RuiSidebarFooter,
	RuiSidebarSeparator,
	RuiSidebarGroup,
	RuiSidebarGroupLabel,
	RuiSidebarGroupAction,
	RuiSidebarMenu,
	RuiSidebarMenuItem,
	RuiSidebarMenuButton,
	RuiSidebarInset,
} from './sidebar';

type SidebarEl = HTMLElement & {
	toggle: () => void;
	setOpen: (next: boolean) => void;
	isMobile: boolean;
};

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

function tick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Wait for deferred JSX props + sidebar microtask setup. */
async function settled(): Promise<void> {
	await Promise.resolve();
	await tick();
}

function paneWidthVar(host: HTMLElement): string {
	return (host.querySelector('[data-ref="root"]') as HTMLElement).style.getPropertyValue('--rui-sidebar-pane-width');
}

/** Desktop shell — disable matchMedia mobile so tests are viewport-independent. */
function mountDesktopSidebar(
	sidebar: JsxRenderable,
	inset?: JsxRenderable,
): { host: HTMLElement; cleanup: () => void } {
	return mount(
		<RuiSidebarProvider sidebar={sidebar}>
			{inset ?? (
				<RuiSidebarInset id="main">
					<p>Content</p>
				</RuiSidebarInset>
			)}
		</RuiSidebarProvider>,
	);
}

/** Force mobile via a breakpoint larger than any realistic viewport. */
function mountMobileSidebar(props: {
	collapsible?: 'off' | 'icon' | 'full';
	open?: boolean;
	children?: JsxRenderable;
}): { host: HTMLElement; sidebar: SidebarEl; cleanup: () => void } {
	const { host, cleanup } = mount(
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar
					id="primary-sidebar"
					collapsible={props.collapsible ?? 'icon'}
					open={props.open ?? true}
					mobileBreakpoint={10_000}
					label="Primary"
				>
					{props.children ?? <span>Nav item</span>}
				</RuiSidebar>
			}
		>
			<RuiSidebarInset id="main">
				<p>Content</p>
				<RuiSidebarTrigger placement="inset" controls="primary-sidebar" triggerLabel="Toggle sidebar" />
			</RuiSidebarInset>
		</RuiSidebarProvider>,
	);
	const sidebar = host.querySelector('rui-sidebar') as SidebarEl;
	return { host, sidebar, cleanup };
}

describe('RuiSidebar composition', () => {
	it('renders header, content, footer, and groups', async () => {
		const { host, cleanup } = mountDesktopSidebar(
			<RuiSidebar id="primary-sidebar" mobileBreakpoint={0} label="Primary">
				<RuiSidebarHeader aria-label="Header">
					<span>Brand</span>
				</RuiSidebarHeader>
				<RuiSidebarContent aria-label="Main">
					<RuiSidebarGroup aria-label="Workspace">
						<RuiSidebarGroupLabel>Workspace</RuiSidebarGroupLabel>
						<RuiSidebarMenu aria-label="Workspace links">
							<RuiSidebarMenuItem>
								<RuiSidebarMenuButton as="a" href="/" isActive tooltip="Dashboard">
									<span>Dashboard</span>
								</RuiSidebarMenuButton>
							</RuiSidebarMenuItem>
						</RuiSidebarMenu>
						<RuiSidebarSeparator aria-label="Section divider" />
						<RuiSidebarGroupAction aria-label="Add">
							<span>+</span>
						</RuiSidebarGroupAction>
					</RuiSidebarGroup>
				</RuiSidebarContent>
				<RuiSidebarFooter>
					<span>Footer</span>
				</RuiSidebarFooter>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar')!;
		const header = host.querySelector('.rui-sidebar__header')!;
		const content = host.querySelector('.rui-sidebar__content')!;
		const footer = host.querySelector('.rui-sidebar__footer')!;
		const group = host.querySelector('.rui-sidebar__group')!;
		const menu = host.querySelector('.rui-sidebar__menu')!;
		const link = host.querySelector('a')!;
		const inset = host.querySelector('main')!;

		expect(sidebar.getAttribute('role')).toBe('complementary');
		expect(sidebar.id).toBe('primary-sidebar');
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
		expect(header.textContent).toContain('Brand');
		expect(content.querySelector('.rui-sidebar__group-label')?.textContent).toBe('Workspace');
		expect(group.getAttribute('aria-label')).toBe('Workspace');
		expect(menu.tagName.toLowerCase()).toBe('ul');
		expect(link.getAttribute('aria-current')).toBe('page');
		expect(link.getAttribute('title')).toBe('Dashboard');
		expect(footer.textContent).toContain('Footer');
		expect(inset.id).toBe('main');

		cleanup();
	});

	it('keeps pane content visible when expanded', async () => {
		const { host, cleanup } = mountDesktopSidebar(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<span data-testid="nav-label">Dashboard</span>
			</RuiSidebar>,
			<RuiSidebarInset id="main">
				<p data-testid="main-copy">Main content</p>
			</RuiSidebarInset>,
		);

		await settled();

		const nav = host.querySelector('[data-testid="nav-label"]') as HTMLElement;
		const main = host.querySelector('[data-testid="main-copy"]') as HTMLElement;
		const pane = host.querySelector('[data-ref="pane"]') as HTMLElement;

		expect(nav.isConnected).toBe(true);
		expect(nav.textContent).toBe('Dashboard');
		expect(main.isConnected).toBe(true);
		expect(pane.hasAttribute('inert')).toBe(false);
		expect(paneWidthVar(host)).not.toBe('0px');
		expect(host.querySelector('rui-sidebar')?.getAttribute('data-mobile')).toBe('false');

		cleanup();
	});

	it('toggles data-state via toggle() when collapsible', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<span>content</span>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar') as SidebarEl;
		const root = host.querySelector('[data-ref="root"]') as HTMLElement;
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
		expect(root.getAttribute('data-state')).toBe('expanded');

		sidebar.toggle();
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect(root.getAttribute('data-state')).toBe('collapsed');
		sidebar.toggle();
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
		expect(root.getAttribute('data-state')).toBe('expanded');

		cleanup();
	});

	it('setOpen collapses icon mode to the icon rail width', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" defaultWidth={256} mobileBreakpoint={0} label="Primary">
				<span>content</span>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar') as SidebarEl;

		sidebar.setOpen(false);
		await settled();

		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect(paneWidthVar(host)).toBe('48px');
		expect(sidebar.getAttribute('data-pane-width')).toBe('48');

		sidebar.setOpen(true);
		await settled();
		expect(paneWidthVar(host)).toBe('256px');

		cleanup();
	});

	it('setOpen fully hides the pane when collapsible is full', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="full" open={true} mobileBreakpoint={0} label="Primary">
				<span>content</span>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar') as SidebarEl;

		sidebar.setOpen(false);
		await settled();

		const pane = host.querySelector('[data-ref="pane"]') as HTMLElement;
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect(paneWidthVar(host)).toBe('0px');
		expect(pane.hasAttribute('inert')).toBe(true);

		cleanup();
	});

	it('updates pane width var on keyboard resize', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="off" defaultWidth={220} mobileBreakpoint={0} label="Primary">
				<span>content</span>
			</RuiSidebar>,
		);

		await settled();

		const handle = host.querySelector('[data-ref="handle"]') as HTMLElement;
		expect(handle).not.toBeNull();
		const before = paneWidthVar(host);

		handle.focus();
		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

		const after = paneWidthVar(host);
		expect(Number.parseFloat(after)).toBeGreaterThan(Number.parseFloat(before));

		cleanup();
	});

	it('reflects the right-side orientation', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" side="right" mobileBreakpoint={0} label="Primary">
				<span>content</span>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar')!;
		expect(sidebar.getAttribute('data-side')).toBe('right');

		cleanup();
	});

	it('emits rui-sidebar-toggle with detail { open, state }', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<span>content</span>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar') as SidebarEl;
		const emissions: Array<{ open: boolean; state: string }> = [];
		sidebar.addEventListener('rui-sidebar-toggle', (event) => {
			emissions.push((event as CustomEvent<{ open: boolean; state: string }>).detail);
		});

		sidebar.toggle();
		sidebar.toggle();

		expect(emissions).toEqual([
			{ open: false, state: 'collapsed' },
			{ open: true, state: 'expanded' },
		]);

		expect(sidebar.getAttribute('data-state')).toBe('expanded');

		cleanup();
	});

	it('keyboard resizes the pane on the handle', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="off" defaultWidth={220} mobileBreakpoint={0} label="Primary">
				<span>content</span>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar') as HTMLElement;
		const handle = host.querySelector('[data-ref="handle"]') as HTMLElement;
		expect(handle).not.toBeNull();
		const before = Number(sidebar.getAttribute('data-pane-width') ?? '0');

		handle.focus();
		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

		const after = Number(sidebar.getAttribute('data-pane-width') ?? '0');
		expect(after).toBeGreaterThan(before);

		cleanup();
	});

	it('Cmd/Ctrl+B toggles open state', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<span>content</span>
			</RuiSidebar>,
		);

		await settled();

		const sidebar = host.querySelector('rui-sidebar') as HTMLElement;
		expect(sidebar.getAttribute('data-state')).toBe('expanded');

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true, bubbles: true }));
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('expanded');

		cleanup();
	});
});

describe('RuiSidebar mobile drawer', () => {
	it('enters mobile mode when the viewport is below the breakpoint', async () => {
		const { host, sidebar, cleanup } = mountMobileSidebar({ collapsible: 'icon' });
		await settled();

		expect(sidebar.getAttribute('data-mobile')).toBe('true');
		expect(host.querySelector('[data-ref="root"]')?.getAttribute('data-mobile')).toBe('true');

		cleanup();
	});

	it('places the scrim before the pane so the backdrop cannot cover content', async () => {
		const { host, cleanup } = mountMobileSidebar({ collapsible: 'full', open: true });
		await settled();

		const root = host.querySelector('[data-ref="root"]') as HTMLElement;
		const children = Array.from(root.children);
		const scrimIndex = children.findIndex((el) => el.getAttribute('data-ref') === 'scrim');
		const paneIndex = children.findIndex((el) => el.getAttribute('data-ref') === 'pane');

		expect(scrimIndex).toBeGreaterThanOrEqual(0);
		expect(paneIndex).toBeGreaterThan(scrimIndex);

		cleanup();
	});

	it('shows the scrim when the mobile drawer is open', async () => {
		const { host, sidebar, cleanup } = mountMobileSidebar({ collapsible: 'full', open: true });
		await settled();

		const scrim = host.querySelector('[data-ref="scrim"]') as HTMLButtonElement;
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
		expect(scrim.hidden).toBe(false);

		cleanup();
	});

	it('hides the scrim and zeros pane width when the mobile drawer closes', async () => {
		const { host, sidebar, cleanup } = mountMobileSidebar({ collapsible: 'icon', open: true });
		await settled();

		sidebar.setOpen(false);
		await settled();

		const pane = host.querySelector('[data-ref="pane"]') as HTMLElement;
		const scrim = host.querySelector('[data-ref="scrim"]') as HTMLButtonElement;

		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect(paneWidthVar(host)).toBe('0px');
		expect(sidebar.getAttribute('data-pane-width')).toBe('0');
		expect(scrim.hidden).toBe(true);
		expect(pane.hasAttribute('inert')).toBe(true);

		cleanup();
	});

	it('reopens the mobile drawer and reveals the scrim again', async () => {
		const { host, sidebar, cleanup } = mountMobileSidebar({ collapsible: 'icon', open: false });
		await settled();

		const scrim = host.querySelector('[data-ref="scrim"]') as HTMLButtonElement;
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect(scrim.hidden).toBe(true);

		sidebar.setOpen(true);
		await settled();

		const openScrim = host.querySelector('[data-ref="scrim"]') as HTMLButtonElement;
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
		expect(openScrim.hidden).toBe(false);
		expect(paneWidthVar(host)).not.toBe('0px');

		cleanup();
	});

	it('closes the mobile drawer when the scrim is clicked', async () => {
		const { host, sidebar, cleanup } = mountMobileSidebar({ collapsible: 'full', open: true });
		await settled();

		const scrim = host.querySelector('[data-ref="scrim"]') as HTMLButtonElement;
		scrim.click();
		await settled();

		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect((host.querySelector('[data-ref="scrim"]') as HTMLButtonElement).hidden).toBe(true);

		cleanup();
	});

	it('closes the mobile drawer on Escape', async () => {
		const { sidebar, cleanup } = mountMobileSidebar({ collapsible: 'full', open: true });
		await settled();

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settled();

		expect(sidebar.getAttribute('data-state')).toBe('collapsed');

		cleanup();
	});

	it('does not render a resize handle in mobile mode', async () => {
		const { host, cleanup } = mountMobileSidebar({ collapsible: 'off', open: true });
		await settled();

		expect(host.querySelector('[data-ref="handle"]')).toBeNull();

		cleanup();
	});

	it('trigger toggles the mobile drawer open and closed', async () => {
		const { host, sidebar, cleanup } = mountMobileSidebar({ collapsible: 'icon', open: true });
		await settled();

		const trigger = host.querySelector('rui-sidebar-trigger button') as HTMLButtonElement;
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
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
			<rui-sidebar-trigger buttonLabel="Collapse sidebar" controls="x"></rui-sidebar-trigger>,
		);
		await settled();
		const triggerHost = host.querySelector('rui-sidebar-trigger') as HTMLElement & { buttonLabel: string };
		expect(triggerHost.buttonLabel).toBe('Collapse sidebar');
		cleanup();
	});

	it('maps triggerLabel through the JSX view when nested in the sidebar', async () => {
		const { host, cleanup } = mount(
			<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={0} label="Primary">
				<RuiSidebarHeader aria-label="Header">
					<rui-sidebar-trigger attr:data-button-label="Collapse sidebar" />
				</RuiSidebarHeader>
			</RuiSidebar>,
		);
		await settled();
		const triggerHost = host.querySelector('rui-sidebar-trigger') as HTMLElement;
		expect(triggerHost.getAttribute('data-button-label')).toBe('Collapse sidebar');
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

		expect(headerTrigger.getAttribute('aria-controls')).toBe('primary-sidebar');
		expect(headerTrigger.getAttribute('aria-label')).toBe('Collapse sidebar');

		await userEvent.click(headerTrigger);
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		expect(headerTrigger.getAttribute('aria-expanded')).toBe('false');

		const expandTrigger = host.querySelector('.rui-sidebar__inset rui-sidebar-trigger button') as HTMLButtonElement;
		await userEvent.click(expandTrigger);
		await settled();
		expect(sidebar.getAttribute('data-state')).toBe('expanded');

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
