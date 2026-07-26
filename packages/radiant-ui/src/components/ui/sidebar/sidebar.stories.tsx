import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
	RuiSidebar,
	RuiSidebarTrigger,
	RuiSidebarProvider,
	RuiSidebarHeader,
	RuiSidebarContent,
	RuiSidebarFooter,
	RuiSidebarSeparator,
	RuiSidebarGroup,
	RuiSidebarGroupHeader,
	RuiSidebarGroupAction,
	RuiSidebarMenu,
	RuiSidebarMenuItem,
	RuiSidebarMenuButton,
	RuiSidebarMenuAction,
	RuiSidebarInset,
} from './sidebar';

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

const ICONS = {
	home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
	sparkles: [
		'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z',
		'M20 3v4',
		'M22 5h-4',
		'M4 17v2',
		'M5 18H3',
	],
	message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
	bot: ['M12 8V4H8', 'M16 16h6', 'M19 13v6', 'M16 8h-5a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h5', 'M9 22h6', 'M12 17v5'],
	building: [
		'M3 21h18',
		'M9 8h1',
		'M9 12h1',
		'M9 16h1',
		'M14 8h1',
		'M14 12h1',
		'M14 16h1',
		'M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16',
	],
	plus: 'M5 12h14M12 5v14',
	user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 0 1 0-8 4 4 0 0 1 0 8'],
	settings: [
		'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
		'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
	],
} as const;

type IconKey = keyof typeof ICONS;
const NavIcon = ({ name }: { name: IconKey }) => icon(ICONS[name]);

const SIDEBAR_GROUPS = [
	{
		id: 'workspace',
		label: 'Workspace',
		items: [{ href: '/', label: 'Dashboard', icon: 'home' as IconKey }],
	},
	{
		id: 'skills',
		label: 'Skills',
		items: [{ href: '/skills', label: 'All skills', icon: 'sparkles' as IconKey }],
		actions: [
			{ kind: 'link' as const, label: 'Create new skill', icon: 'plus' as IconKey, href: '/skills/create' },
		],
	},
	{
		id: 'admin',
		label: 'Admin',
		items: [{ href: '/admin/organizations', label: 'Organizations', icon: 'building' as IconKey }],
	},
	{
		id: 'chat',
		label: 'Chat',
		items: [
			{ href: '/chat', label: 'Chats', icon: 'message' as IconKey },
			{ href: '/chat/agent', label: 'Agent', icon: 'bot' as IconKey },
		],
		actions: [
			{ kind: 'button' as const, label: 'New DM', icon: 'plus' as IconKey },
			{ kind: 'button' as const, label: 'New group', icon: 'plus' as IconKey },
		],
	},
	{
		id: 'account',
		label: 'Account',
		items: [
			{ href: '/profile', label: 'Profile', icon: 'user' as IconKey },
			{ href: '/settings', label: 'Settings', icon: 'settings' as IconKey },
		],
	},
];

function renderSidebarContent({
	currentPath = '/',
	onAction,
}: {
	currentPath?: string;
	onAction?: (label: string) => void;
} = {}) {
	return (
		<>
			<RuiSidebarHeader aria-label="Workspace header">
				<a
					href="/"
					class="rui-sidebar__brand flex min-w-0 flex-1 items-center gap-2 truncate text-base font-semibold"
				>
					<span class="rui-sidebar__brand-mark grid size-6 shrink-0 place-items-center rounded-md bg-primary text-on-primary text-xs font-bold">
						R
					</span>
					<span class="rui-sidebar__brand-text">Radiant</span>
				</a>
				<RuiSidebarTrigger placement="header" controls="primary-sidebar" triggerLabel="Collapse sidebar" />
			</RuiSidebarHeader>

			<RuiSidebarContent aria-label="Primary navigation">
				{SIDEBAR_GROUPS.map((group, index) => (
					<>
						<RuiSidebarGroup aria-label={group.label} key={group.id}>
							<RuiSidebarGroupHeader
								label={group.label}
								action={
									<RuiSidebarGroupAction aria-label={`Add ${group.label.toLowerCase()}`}>
										<NavIcon name="plus" />
									</RuiSidebarGroupAction>
								}
							/>
							<RuiSidebarMenu aria-label={`${group.label} links`}>
								{group.items.map((item) => (
									<RuiSidebarMenuItem key={item.href}>
										<RuiSidebarMenuButton
											as="a"
											href={item.href}
											isActive={currentPath === item.href}
											tooltip={item.label}
										>
											<NavIcon name={item.icon} />
											<span>{item.label}</span>
										</RuiSidebarMenuButton>
									</RuiSidebarMenuItem>
								))}
							</RuiSidebarMenu>
							{'actions' in group && group.actions?.length ? (
								<div class="rui-sidebar__group-actions mt-1 flex flex-col gap-0.5 border-t border-border pt-1.5">
									{group.actions.map((action) => (
										<RuiSidebarMenuAction
											key={action.label}
											as={action.kind === 'link' ? 'a' : 'button'}
											href={action.kind === 'link' ? action.href : undefined}
											tooltip={action.label}
											onClick={
												action.kind === 'button' && onAction
													? () => onAction(action.label)
													: undefined
											}
										>
											{action.icon ? <NavIcon name={action.icon} /> : null}
											<span>{action.label}</span>
										</RuiSidebarMenuAction>
									))}
								</div>
							) : null}
						</RuiSidebarGroup>
						{index < SIDEBAR_GROUPS.length - 1 ? (
							<RuiSidebarSeparator aria-label="Section divider" />
						) : null}
					</>
				))}
			</RuiSidebarContent>

			<RuiSidebarFooter>
				<RuiSidebarMenu aria-label="Account">
					<RuiSidebarMenuItem>
						<RuiSidebarMenuButton as="a" href="/settings" tooltip="Settings">
							<NavIcon name="settings" />
							<span>Settings</span>
						</RuiSidebarMenuButton>
					</RuiSidebarMenuItem>
					<RuiSidebarMenuItem>
						<RuiSidebarMenuButton as="a" href="/profile" tooltip="Profile">
							<NavIcon name="user" />
							<span>Profile</span>
						</RuiSidebarMenuButton>
					</RuiSidebarMenuItem>
				</RuiSidebarMenu>
			</RuiSidebarFooter>
		</>
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

const meta = {
	title: 'Components/Sidebar',
	component: RuiSidebar,
	parameters: { layout: 'fullscreen' },
	tags: ['test'],
	args: {
		id: 'primary-sidebar',
		variant: 'sidebar',
		side: 'left',
		collapsible: 'off',
		label: 'Primary',
		defaultWidth: 256,
		// Vitest browser viewports are often <768px; pin desktop unless the story opts in.
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
					{renderSidebarContent({ currentPath: '/' })}
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
		expect(canvas.getByText('Workspace')).toBeInTheDocument();
		expect(canvas.getByText('Chat')).toBeInTheDocument();
		expect(canvas.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('aria-current', 'page');
	},
};

export const CollapsibleIcon: Story = {
	args: { collapsible: 'icon' },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderSidebarContent({ currentPath: '/chat' })}
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

		const openTrigger = canvas.getByRole('button', { name: 'Open sidebar' });
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
					{renderSidebarContent({ currentPath: '/' })}
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
		<div class="h-full w-full bg-surface p-4">
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar {...args} id="primary-sidebar">
						{renderSidebarContent({ currentPath: '/' })}
					</RuiSidebar>
				}
			>
				{renderInset({ title: 'Inset sidebar' })}
			</RuiSidebarProvider>
		</div>
	),
};

export const TriggerToggle: Story = {
	args: { collapsible: 'icon' },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderSidebarContent({ currentPath: '/' })}
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

		const openTrigger = canvas.getByRole('button', { name: 'Open sidebar' });
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
					{renderSidebarContent({ currentPath: '/' })}
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
	args: { collapsible: 'off', defaultWidth: 220 },
	render: (args) => (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar {...args} id="primary-sidebar">
					{renderSidebarContent({ currentPath: '/' })}
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
				<RuiSidebar id="primary-sidebar" collapsible="icon" mobileBreakpoint={10_000} label="Primary">
					{renderSidebarContent({ currentPath: '/' })}
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

		const openTrigger = canvas.getByRole('button', { name: 'Open sidebar' });
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
