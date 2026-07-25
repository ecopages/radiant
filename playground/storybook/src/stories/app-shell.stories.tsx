import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
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
} from '../components/ui/sidebar';

const icon = (path: string) => (
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.75"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d={path} />
	</svg>
);

const ICONS = {
	home: 'M3 12 12 3l9 9M5 10v10h14V10',
	sparkles: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M16.4 7.6l2-2M5.6 18.4l2-2',
	message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
	bot: 'M12 8V4H8M16 8h-5a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h5M9 22h6M12 17v5',
	building: 'M3 21h18M5 21V7l8-4 8 4v14M9 9h.01M9 12h.01M9 15h.01M14 9h.01M14 12h.01M14 15h.01',
	plus: 'M12 5v14M5 12h14',
	user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
	settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
	bug: 'M8 2 5 5M19 2l3 3M8 22l-3-3M19 22l3-3M12 22V8M8 6h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4zM4 12H2M22 12h-2M4 18H2M22 18h-2',
	folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9v8',
	git: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
	bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M14 21a2 2 0 0 1-4 0',
};

type IconKey = keyof typeof ICONS;
const NavIcon = ({ name }: { name: IconKey }) => icon(ICONS[name]);

const GROUPS = [
	{
		id: 'workspace',
		label: 'Workspace',
		items: [{ href: '/', label: 'Dashboard', icon: 'home' as IconKey }],
	},
	{
		id: 'skills',
		label: 'Skills',
		items: [{ href: '/skills', label: 'All skills', icon: 'sparkles' as IconKey }],
		actions: [{ label: 'Create new skill', icon: 'plus' as IconKey, href: '/skills/create' }],
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
			{ label: 'New DM', icon: 'plus' as IconKey, kind: 'button' as const },
			{ label: 'New group', icon: 'plus' as IconKey, kind: 'button' as const },
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
	{
		id: 'issues',
		label: 'Issues',
		items: [
			{ href: '/issues', label: 'Issues', icon: 'bug' as IconKey },
			{ href: '/projects', label: 'Projects', icon: 'folder' as IconKey },
			{ href: '/repositories', label: 'Repositories', icon: 'git' as IconKey },
			{ href: '/notifications', label: 'Notifications', icon: 'bell' as IconKey },
		],
	},
] as const;

const meta = {
	title: 'Examples/App Shell',
	parameters: { layout: 'fullscreen' },
	tags: ['test'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function renderShellBody(currentPath: string) {
	return (
		<>
			<RuiSidebarHeader aria-label="Workspace header">
				<a href="/" class="flex min-w-0 flex-1 items-center gap-2 truncate text-base font-semibold">
					<span class="grid size-6 place-items-center rounded-md bg-primary text-on-primary text-xs font-bold">
						R
					</span>
					<span>Radiant</span>
				</a>
				<RuiSidebarTrigger placement="header" controls="primary-sidebar" triggerLabel="Toggle sidebar" />
			</RuiSidebarHeader>

			<RuiSidebarContent aria-label="Primary navigation">
				{GROUPS.map((group, index) => (
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
								<div class="mt-1 flex flex-col gap-0.5 border-t border-border pt-1.5">
									{group.actions.map((action) => (
										<RuiSidebarMenuAction
											key={action.label}
											as={'kind' in action && action.kind === 'button' ? 'button' : 'a'}
											href={'href' in action ? action.href : undefined}
											tooltip={action.label}
										>
											<NavIcon name={action.icon} />
											<span>{action.label}</span>
										</RuiSidebarMenuAction>
									))}
								</div>
							) : null}
						</RuiSidebarGroup>
						{index < GROUPS.length - 1 ? <RuiSidebarSeparator aria-label="Section divider" /> : null}
					</>
				))}
			</RuiSidebarContent>

			<RuiSidebarFooter>
				<RuiSidebarMenu aria-label="Account">
					<RuiSidebarMenuItem>
						<RuiSidebarMenuButton as="a" href="/profile" tooltip="Profile">
							<NavIcon name="user" />
							<span>Profile</span>
						</RuiSidebarMenuButton>
					</RuiSidebarMenuItem>
					<RuiSidebarMenuItem>
						<RuiSidebarMenuButton as="a" href="/settings" tooltip="Settings">
							<NavIcon name="settings" />
							<span>Settings</span>
						</RuiSidebarMenuButton>
					</RuiSidebarMenuItem>
				</RuiSidebarMenu>
			</RuiSidebarFooter>
		</>
	);
}

function renderShell({
	currentPath,
	variant = 'sidebar',
	side = 'left',
	collapsible = 'icon',
}: {
	currentPath: string;
	variant?: 'sidebar' | 'inset';
	side?: 'left' | 'right';
	collapsible?: 'off' | 'icon' | 'full';
}) {
	return (
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar
					id="primary-sidebar"
					variant={variant}
					side={side}
					collapsible={collapsible}
					label="Primary"
				>
					{renderShellBody(currentPath)}
				</RuiSidebar>
			}
		>
			<RuiSidebarInset id="main-content">
				<header class="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6 lg:px-8">
					<div class="flex items-center gap-3">
						<RuiSidebarTrigger placement="inset" controls="primary-sidebar" triggerLabel="Open sidebar" />
						<span class="text-sm font-medium">App shell</span>
					</div>
					<span class="text-xs text-on-surface">Cmd/Ctrl+B toggles the sidebar</span>
				</header>
				<div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
					<h1 class="text-2xl font-semibold">Welcome back</h1>
					<p class="mt-2 max-w-prose text-sm text-on-surface">
						This is a composable application shell. The sidebar exposes six labelled groups with per-group
						actions, a footer with the user/account shortcuts, and a resizable + collapsible pane that
						responds to keyboard navigation, pointer drag, and the <kbd>Cmd/Ctrl+B</kbd> shortcut.
					</p>
				</div>
			</RuiSidebarInset>
		</RuiSidebarProvider>
	);
}

export const Default: Story = {
	render: () => renderShell({ currentPath: '/' }),
};

export const Inset: Story = {
	render: () => (
		<div class="h-full w-full bg-surface p-4">{renderShell({ currentPath: '/chat', variant: 'inset' })}</div>
	),
};

export const Right: Story = {
	render: () => renderShell({ currentPath: '/admin/organizations', side: 'right' }),
};
