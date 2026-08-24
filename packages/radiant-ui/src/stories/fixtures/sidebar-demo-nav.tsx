import {
	RuiSidebarTrigger,
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
} from '../../components/ui/sidebar';

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
	chart: ['M3 3v18h18', 'M7 16l4-4 4 4 5-6'],
	file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
	pen: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
	image: [
		'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
		'M8 14l2-2 3 3 5-5 3 3',
		'M9 8h.01',
	],
	layers: ['M12 2 2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
	menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
	arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
	shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
	mail: ['M4 4h16v16H4z', 'M22 6l-10 7L2 6'],
	plus: 'M5 12h14M12 5v14',
	user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 0 1 0-8 4 4 0 0 1 0 8'],
	settings: [
		'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
		'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
	],
} as const;

type IconKey = keyof typeof ICONS;
const NavIcon = ({ name }: { name: IconKey }) => icon(ICONS[name]);

type DemoNavAction =
	{ kind: 'link'; label: string; icon: IconKey; href: string } | { kind: 'button'; label: string; icon: IconKey };

type DemoNavGroup = {
	id: string;
	label: string;
	items: Array<{ href: string; label: string; icon: IconKey }>;
	actions?: DemoNavAction[];
};

export const DEMO_NAV_GROUPS: DemoNavGroup[] = [
	{
		id: 'overview',
		label: 'Overview',
		items: [
			{ href: '/', label: 'Dashboard', icon: 'home' },
			{ href: '/analytics', label: 'Analytics', icon: 'chart' },
			{ href: '/reports', label: 'Reports', icon: 'file' },
		],
	},
	{
		id: 'content',
		label: 'Content',
		items: [
			{ href: '/content/pages', label: 'Pages', icon: 'file' },
			{ href: '/content/posts', label: 'Posts', icon: 'pen' },
			{ href: '/content/media', label: 'Media', icon: 'image' },
		],
		actions: [{ kind: 'link', label: 'New page', icon: 'plus', href: '/content/pages/new' }],
	},
	{
		id: 'structure',
		label: 'Structure',
		items: [
			{ href: '/structure/collections', label: 'Collections', icon: 'layers' },
			{ href: '/structure/navigation', label: 'Navigation', icon: 'menu' },
			{ href: '/structure/redirects', label: 'Redirects', icon: 'arrow' },
		],
	},
	{
		id: 'users',
		label: 'Users',
		items: [
			{ href: '/users/members', label: 'Members', icon: 'user' },
			{ href: '/users/roles', label: 'Roles', icon: 'shield' },
			{ href: '/users/invitations', label: 'Invitations', icon: 'mail' },
		],
		actions: [{ kind: 'button', label: 'Invite member', icon: 'plus' }],
	},
];

export function renderDemoSidebarContent({
	currentPath = '/',
	onAction,
	controlsId = 'primary-sidebar',
	headerTriggerLabel = 'Collapse sidebar',
}: {
	currentPath?: string;
	onAction?: (label: string) => void;
	controlsId?: string;
	headerTriggerLabel?: string;
} = {}) {
	return (
		<>
			<RuiSidebarHeader aria-label="Application header">
				<a
					href="/"
					class="rui-sidebar__brand flex min-w-0 flex-1 items-center gap-2 truncate text-base font-semibold"
				>
					<span class="rui-sidebar__brand-mark grid size-6 shrink-0 place-items-center rounded-md bg-primary text-on-primary text-xs font-bold">
						R
					</span>
					<span class="rui-sidebar__brand-text">Radiant</span>
				</a>
				<RuiSidebarTrigger placement="header" controls={controlsId} triggerLabel={headerTriggerLabel} />
			</RuiSidebarHeader>

			<RuiSidebarContent aria-label="Primary navigation">
				{DEMO_NAV_GROUPS.map((group, index) => (
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
							{group.actions?.length ? (
								<div class="rui-sidebar__group-actions mt-1 flex flex-col gap-0.5 border-t border-border pt-1.5">
									{group.actions.map((action) => {
										const content = (
											<>
												<NavIcon name={action.icon} />
												<span>{action.label}</span>
											</>
										);

										if (action.kind === 'link') {
											return (
												<RuiSidebarMenuAction
													key={action.label}
													as="a"
													href={action.href}
													tooltip={action.label}
												>
													{content}
												</RuiSidebarMenuAction>
											);
										}

										return (
											<RuiSidebarMenuAction
												key={action.label}
												as="button"
												tooltip={action.label}
												onClick={onAction ? () => onAction(action.label) : undefined}
											>
												{content}
											</RuiSidebarMenuAction>
										);
									})}
								</div>
							) : null}
						</RuiSidebarGroup>
						{index < DEMO_NAV_GROUPS.length - 1 ? (
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
