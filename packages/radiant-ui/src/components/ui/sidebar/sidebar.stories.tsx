import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, within } from 'storybook/test';
import { withStylesheets } from '@sb/with-stylesheets';
import docsNavCss from './sidebar.docs.css?url';
import radiantPkg from '../../../../../radiant/package.json';
import {
	RuiSidebar,
	RuiSidebarTrigger,
	RuiSidebarProvider,
	RuiSidebarHeader,
	RuiSidebarContent,
	RuiSidebarSeparator,
	RuiSidebarGroup,
	RuiSidebarGroupHeader,
	RuiSidebarMenu,
	RuiSidebarMenuItem,
	RuiSidebarMenuButton,
	RuiSidebarInset,
} from './sidebar';
import { RuiSidebar as RuiSidebarElement } from './sidebar.script';
import { renderDemoSidebarContent } from '../../../stories/fixtures/sidebar-demo-nav';

const icon = (paths: string | readonly string[]) => {
	const d = Array.isArray(paths) ? paths : [paths];
	return (
		<svg
			class="rui-sidebar__icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{d.map((path) => (
				<path d={path} />
			))}
		</svg>
	);
};

type DocsNavGroup = {
	name: string;
	items: Array<{ title: string; href: string }>;
};

const DOCS_NAV_GROUPS: DocsNavGroup[] = [
	{
		name: 'Getting Started',
		items: [
			{ title: 'Introduction', href: '/docs/getting-started/introduction' },
			{ title: 'Installation', href: '/docs/getting-started/installation' },
		],
	},
	{
		name: 'Components',
		items: [
			{ title: 'Alert', href: '/docs/components/alert' },
			{ title: 'Sidebar', href: '/docs/components/sidebar' },
		],
	},
	{
		name: 'Tools',
		items: [{ title: 'CLI', href: '/docs/tools/cli' }],
	},
	{
		name: 'JSX',
		items: [{ title: 'Overview', href: '/docs/jsx/overview' }],
	},
	{
		name: 'Signals',
		items: [{ title: 'Introduction', href: '/docs/signals/introduction' }],
	},
];

const docsGroupIcon = (name: string) => {
	const paths: Record<string, string | readonly string[]> = {
		'Getting Started': ['M7 8l-4 4l4 4', 'M17 8l4 4l-4 4', 'M14 4l-4 16'],
		Components: [
			'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
			'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
		],
		Tools: 'M7 10h3v-3l-3.5-3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1-3 3l-6-6a6 6 0 0 1-8-8l3.5 3.5',
		JSX: ['M12 3l8 4.5v9l-8 4.5l-8-4.5v-9z', 'M12 12l8-4.5', 'M12 12v9', 'M12 12l-8-4.5'],
		Signals: 'M3 12h4l3 8l4-16l3 8h4',
	};
	const d = paths[name];
	if (!d) return null;
	return <span class="rui-sidebar__group-icon">{icon(d)}</span>;
};

function renderDocsNavigationContent({
	currentPath = '/docs/getting-started/introduction',
	showBrand = true,
}: {
	currentPath?: string;
	showBrand?: boolean;
} = {}) {
	return (
		<>
			{showBrand ? (
				<RuiSidebarHeader aria-label="Docs navigation header">
					<a href="/docs" class="rui-sidebar__brand">
						<span class="rui-sidebar__brand-text">Radiant</span>
					</a>
				</RuiSidebarHeader>
			) : null}

			<RuiSidebarContent aria-label="Docs navigation">
				{DOCS_NAV_GROUPS.map((group, index) => (
					<>
						<RuiSidebarGroup aria-label={group.name} key={group.name}>
							<RuiSidebarGroupHeader
								label={
									<>
										{docsGroupIcon(group.name)}
										<span>{group.name}</span>
									</>
								}
							/>
							<RuiSidebarMenu aria-label={`${group.name} links`}>
								{group.items.map((item) => (
									<RuiSidebarMenuItem key={item.href}>
										<RuiSidebarMenuButton
											as="a"
											href={item.href}
											isActive={currentPath === item.href}
										>
											<span>{item.title}</span>
										</RuiSidebarMenuButton>
									</RuiSidebarMenuItem>
								))}
							</RuiSidebarMenu>
						</RuiSidebarGroup>
						{index < DOCS_NAV_GROUPS.length - 1 ? (
							<RuiSidebarSeparator aria-label="Section divider" />
						) : null}
					</>
				))}
			</RuiSidebarContent>
		</>
	);
}

function renderRadiantLogo({ href = '/', title = 'Radiant' }: { href?: string; title?: string } = {}) {
	return (
		<a
			href={href}
			title={title}
			class="rui-sidebar-provider__site-header-brand flex items-center gap-1 text-2xl font-semibold font-heading"
		>
			<svg
				class="shrink-0"
				height="32"
				viewBox="0 0 35 42"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<path
					d="M8.95038 19.0355C8.73635 19.7972 10.4934 24.8245 18.2298 23.3884C25.3299 22.0704 24.7298 10.8884 18.2298 13.8884C14.2596 15.7208 12.2883 33.409 22.2298 31.8884C29.9216 30.7119 28.75 6.88572 31.434 1.38842C28.4393 4.49823 5.89504 5.06009 2.22981 17.8884C1.27183 21.2414 3.22979 26.8884 8.95036 28.3884L2.22981 38.3884"
					stroke="currentColor"
					stroke-width="4"
					stroke-linecap="round"
				/>
			</svg>
			radiant
		</a>
	);
}

function renderDocsSiteHeader({ controlsId }: { controlsId: string }) {
	return (
		<div class="rui-sidebar-provider__site-header-inner">
			<div class="rui-sidebar-provider__site-header-start">
				<RuiSidebarTrigger
					class="md:hidden"
					placement="header"
					controls={controlsId}
					triggerLabel="Close documentation navigation"
				/>
				<RuiSidebarTrigger
					class="md:hidden"
					placement="inset"
					controls={controlsId}
					triggerLabel="Open documentation navigation"
				/>
				{renderRadiantLogo()}
				<span class="rui-sidebar-provider__site-header-version">v {radiantPkg.version}</span>
			</div>
			<nav class="rui-sidebar-provider__site-header-nav" aria-label="Site">
				<a href="/docs" class="rui-sidebar-provider__site-header-link">
					Docs
				</a>
				<a href="https://github.com/ecopages/radiant" class="text-on-background" aria-label="GitHub repository">
					<svg viewBox="0 0 98 96" width="20" height="20" fill="currentColor" aria-hidden="true">
						<path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
					</svg>
				</a>
			</nav>
		</div>
	);
}

function renderInset({ title }: { title: string }) {
	return (
		<RuiSidebarInset id="main-content">
			<header class="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6 lg:px-8">
				<div class="flex items-center gap-3">
					<RuiSidebarTrigger placement="inset" controls="primary-sidebar" triggerLabel="Open sidebar" />
					<span class="text-sm font-medium">Page title</span>
				</div>
				<span class="text-xs text-on-surface">Light DOM · Resizable · Collapsible</span>
			</header>
			<div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
				<h1 class="text-2xl font-semibold">{title}</h1>
				<p class="mt-2 max-w-prose text-sm text-on-surface">
					This area is the main content. The sidebar on the left resizes with the keyboard (<kbd>←</kbd>/
					<kbd>→</kbd>) or pointer drag, collapses to an icon rail, and converts to a drawer below the
					configured mobile breakpoint.
				</p>
			</div>
		</RuiSidebarInset>
	);
}

/**
 * @remarks Vitest browser viewports are often &lt;768px; `mobileBreakpoint: 0` pins desktop unless a story opts in.
 */
const meta = {
	title: 'Components/Sidebar',
	component: RuiSidebar,
	parameters: { layout: 'fullscreen', radiant: { element: RuiSidebarElement, cssImports: ['./sidebar.css'] } },
	tags: ['test'],
	args: {
		id: 'primary-sidebar',
		variant: 'sidebar',
		side: 'left',
		collapsible: 'off',
		label: 'Primary',
		defaultWidth: 256,
		mobileBreakpoint: 0,
	},
} satisfies Meta<typeof RuiSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderDemoSidebarContent({ currentPath: '/' })}
				</RuiSidebar>
			}
		>
			{renderInset({ title: 'Default sidebar' })}
		</RuiSidebarProvider>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const sidebar = canvasElement.querySelector('rui-sidebar') as HTMLElement;

		expect(sidebar).toHaveAttribute('role', 'complementary');
		expect(sidebar.id).toBe('primary-sidebar');
		expect(sidebar).toHaveAttribute('data-state', 'expanded');
		expect(canvas.getByText('Content')).toBeInTheDocument();
		expect(canvas.getByText('Pages')).toBeInTheDocument();
		expect(canvas.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('aria-current', 'page');
	},
};

export const CollapsibleIcon: Story = {
	args: { collapsible: 'icon' },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderDemoSidebarContent({ currentPath: '/content/pages' })}
				</RuiSidebar>
			}
		>
			{renderInset({ title: 'Icon-collapsed sidebar' })}
		</RuiSidebarProvider>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const sidebar = canvasElement.querySelector('rui-sidebar') as HTMLElement;
		const collapseTrigger = canvas.getByRole('button', { name: 'Collapse sidebar' });

		await userEvent.click(collapseTrigger);
		expect(sidebar).toHaveAttribute('data-state', 'collapsed');

		const openTrigger = canvas.getByRole('button', { name: 'Open navigation' });
		await userEvent.click(openTrigger);
		expect(sidebar).toHaveAttribute('data-state', 'expanded');
	},
};

export const RightSide: Story = {
	args: { side: 'right', collapsible: 'off' },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderDemoSidebarContent({ currentPath: '/' })}
				</RuiSidebar>
			}
		>
			{renderInset({ title: 'Right-side sidebar' })}
		</RuiSidebarProvider>
	),
	play: async ({ canvasElement }) => {
		const sidebar = canvasElement.querySelector('rui-sidebar')!;
		expect(sidebar).toHaveAttribute('data-side', 'right');
	},
};

export const Inset: Story = {
	args: { variant: 'inset', collapsible: 'icon' },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderDemoSidebarContent({ currentPath: '/' })}
				</RuiSidebar>
			}
		>
			{renderInset({ title: 'Inset sidebar' })}
		</RuiSidebarProvider>
	),
};

export const TriggerToggle: Story = {
	args: { collapsible: 'icon' },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderDemoSidebarContent({ currentPath: '/' })}
				</RuiSidebar>
			}
		>
			{renderInset({ title: 'Trigger button' })}
		</RuiSidebarProvider>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const sidebar = canvasElement.querySelector('rui-sidebar') as HTMLElement;

		const collapseTrigger = canvas.getByRole('button', { name: 'Collapse sidebar' });
		await userEvent.click(collapseTrigger);
		expect(sidebar).toHaveAttribute('data-state', 'collapsed');

		const openTrigger = canvas.getByRole('button', { name: 'Open navigation' });
		await userEvent.click(openTrigger);
		expect(sidebar).toHaveAttribute('data-state', 'expanded');
	},
};

export const KeyboardShortcut: Story = {
	args: { collapsible: 'icon' },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderDemoSidebarContent({ currentPath: '/' })}
				</RuiSidebar>
			}
		>
			{renderInset({ title: 'Keyboard shortcut' })}
		</RuiSidebarProvider>
	),
	play: async ({ canvasElement }) => {
		const sidebar = canvasElement.querySelector('rui-sidebar') as HTMLElement;
		const host = canvasElement.ownerDocument.body;
		host.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
		expect(sidebar.getAttribute('data-state')).toBe('collapsed');
		host.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
		expect(sidebar.getAttribute('data-state')).toBe('expanded');
	},
};

export const ResizeHandle: Story = {
	args: { collapsible: 'off', defaultWidth: 220, resizable: true },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderDemoSidebarContent({ currentPath: '/' })}
				</RuiSidebar>
			}
		>
			{renderInset({ title: 'Resizable sidebar' })}
		</RuiSidebarProvider>
	),
	play: async ({ canvasElement }) => {
		const sidebar = canvasElement.querySelector('rui-sidebar') as HTMLElement;
		const handle = canvasElement.querySelector('.rui-sidebar__handle') as HTMLElement;

		expect(handle).toHaveAttribute('role', 'separator');
		expect(handle).toHaveAttribute('aria-valuemin', '200');
		expect(handle).toHaveAttribute('aria-valuemax', '480');

		const before = Number(sidebar.getAttribute('data-pane-width') ?? '0');
		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		const after = Number(sidebar.getAttribute('data-pane-width') ?? '0');
		expect(after).toBeGreaterThan(before);
	},
};

export const Responsive: Story = {
	render: () => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={10_000} label="Primary" open>
					{renderDemoSidebarContent({ currentPath: '/' })}
				</RuiSidebar>
			}
		>
			{renderInset({ title: 'Mobile drawer' })}
		</RuiSidebarProvider>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const sidebar = canvasElement.querySelector('rui-sidebar') as HTMLElement & {
			setOpen: (n: boolean) => void;
			toggle: () => void;
		};

		expect(sidebar).toHaveAttribute('data-mobile', 'true');
		expect(canvasElement.querySelector('[data-ref="root"]')).toHaveAttribute('data-mobile', 'true');

		const scrim = () => canvasElement.querySelector('[data-ref="scrim"]') as HTMLButtonElement;
		const root = () => canvasElement.querySelector('[data-ref="root"]') as HTMLElement;
		const pane = () => canvasElement.querySelector('[data-ref="pane"]') as HTMLElement;

		expect(scrim().hidden).toBe(false);
		expect(scrim().compareDocumentPosition(pane()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(canvas.getByText('Dashboard')).toBeInTheDocument();

		sidebar.setOpen(false);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(sidebar).toHaveAttribute('data-state', 'collapsed');
		expect(scrim().hidden).toBe(true);
		expect(root().style.getPropertyValue('--rui-sidebar-pane-width')).toBe('0px');

		const openTrigger = canvas.getByRole('button', { name: 'Open navigation' });
		await userEvent.click(openTrigger);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(sidebar).toHaveAttribute('data-state', 'expanded');
		expect(scrim().hidden).toBe(false);

		await userEvent.click(scrim());
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(sidebar).toHaveAttribute('data-state', 'collapsed');
		expect(scrim().hidden).toBe(true);
	},
};

export const DocsNavigation: Story = {
	args: {
		collapsible: 'off',
		defaultWidth: 250,
		mobileBreakpoint: 768,
		label: 'Docs navigation',
	},
	decorators: [withStylesheets([docsNavCss])],
	parameters: {
		layout: 'fullscreen',
		controls: { exclude: ['defaultWidth', 'width', 'resizable'] },
	},
	render: (args) => (
		<RuiSidebarProvider
			layout="docs"
			siteHeader={renderDocsSiteHeader({ controlsId: 'docs-sidebar' })}
			sidebar={
				<RuiSidebar {...args} id="docs-sidebar">
					{renderDocsNavigationContent({
						currentPath: '/docs/getting-started/introduction',
						showBrand: false,
					})}
				</RuiSidebar>
			}
		>
			<RuiSidebarInset id="docs-main-content">
				<div class="rui-sidebar-docs-page">
					<h1 class="text-2xl font-semibold">Introduction</h1>
					<p class="mt-2 max-w-prose text-sm text-on-surface">
						This story uses the docs navigation skin loaded via <code class="text-xs">withStylesheets</code>{' '}
						— not a side-effect CSS import in the story module.
					</p>
				</div>
			</RuiSidebarInset>
		</RuiSidebarProvider>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const sidebar = canvasElement.querySelector('rui-sidebar') as HTMLElement;
		const provider = canvasElement.querySelector('.rui-sidebar-provider') as HTMLElement;
		const triggers = Array.from(canvasElement.querySelectorAll('rui-sidebar-trigger'));

		expect(sidebar).toHaveAttribute('role', 'complementary');
		expect(provider).toHaveAttribute('data-layout', 'docs');
		expect(triggers[0]).toHaveClass('rui-sidebar-trigger-placement--header');
		expect(triggers[1]).toHaveClass('rui-sidebar-trigger-placement--inset');
		expect(canvasElement.querySelector('.rui-sidebar-provider__site-header')).toBeInTheDocument();
		expect(canvas.getByTitle('Radiant')).toBeInTheDocument();
		expect(canvas.getByText('Getting Started')).toBeInTheDocument();
		expect(canvas.getByText('Components')).toBeInTheDocument();
		expect(canvas.getByRole('link', { name: 'Introduction', current: 'page' })).toHaveAttribute(
			'href',
			'/docs/getting-started/introduction',
		);
		// The docs skin arrives via `withStylesheets`, not a side-effect import in this module.
		expect(
			document.head.querySelector(`link[data-storybook-stylesheet][href="${docsNavCss}"]`),
		).toBeInTheDocument();
	},
};
