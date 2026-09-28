import { RuiDisclosure } from '@ecopages/radiant-ui/disclosure';
import {
	RuiNavigationMenu,
	RuiNavigationMenuBar,
	RuiNavigationMenuLink,
	RuiNavigationMenuPanel,
	RuiNavigationMenuPanels,
	RuiNavigationMenuTrigger,
} from '@ecopages/radiant-ui/navigation-menu';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

const NAVIGATION_MENU_PRODUCT_LINKS = [
	{ href: '/analytics', label: 'Analytics' },
	{ href: '/automation', label: 'Automation' },
	{ href: '/integrations', label: 'Integrations' },
	{ href: '/support', label: 'Support plans' },
	{ href: '/training', label: 'Training' },
	{ href: '/security', label: 'Security center' },
];

const NAVIGATION_MENU_INDUSTRY_LINKS = [
	{ href: '/healthcare', label: 'Healthcare' },
	{ href: '/finance', label: 'Finance' },
	{ href: '/retail', label: 'Retail' },
];

const NAVIGATION_MENU_TEAM_LINKS = [
	{ href: '/design', label: 'Design' },
	{ href: '/engineering', label: 'Engineering' },
	{ href: '/operations', label: 'Operations' },
];

export type NavigationMenuArgs = {
	label: string;
};

export const meta = {
	args: {
		label: 'Main',
	},
	argTypes: {
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<div class="playground-navigation-menu">
			<RuiNavigationMenu label={args.label}>
				<RuiNavigationMenuBar>
					<RuiNavigationMenuTrigger value="products">Products</RuiNavigationMenuTrigger>
					<RuiNavigationMenuTrigger value="solutions">Solutions</RuiNavigationMenuTrigger>
					<RuiNavigationMenuLink href="/pricing">Pricing</RuiNavigationMenuLink>
				</RuiNavigationMenuBar>

				<RuiNavigationMenuPanels>
					<RuiNavigationMenuPanel value="products">
						<nav aria-label="Products">
							<ul class="rui-navigation-menu__link-list">
								{NAVIGATION_MENU_PRODUCT_LINKS.map((link) => (
									<li>
										<a href={link.href}>{link.label}</a>
									</li>
								))}
							</ul>
						</nav>
					</RuiNavigationMenuPanel>

					<RuiNavigationMenuPanel value="solutions" class="rui-navigation-menu__megamenu">
						<div class="rui-navigation-menu__link-columns">
							<nav aria-label="By industry">
								<p class="rui-navigation-menu__link-group-label">By industry</p>
								<ul class="rui-navigation-menu__link-list">
									{NAVIGATION_MENU_INDUSTRY_LINKS.map((link) => (
										<li>
											<a href={link.href}>{link.label}</a>
										</li>
									))}
								</ul>
							</nav>
							<nav aria-label="By team">
								<p class="rui-navigation-menu__link-group-label">By team</p>
								<ul class="rui-navigation-menu__link-list">
									{NAVIGATION_MENU_TEAM_LINKS.map((link) => (
										<li>
											<a href={link.href}>{link.label}</a>
										</li>
									))}
								</ul>
							</nav>
						</div>
						<RuiDisclosure trigger="Why these solutions?">
							<p class="rui-navigation-menu__disclosure-copy">
								Decorative supporting copy — starter kits, migration guides, and customer stories.
							</p>
						</RuiDisclosure>
					</RuiNavigationMenuPanel>
				</RuiNavigationMenuPanels>
			</RuiNavigationMenu>
		</div>
	),
} satisfies DocsMeta<NavigationMenuArgs>;

type Story = DocsStory<NavigationMenuArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'navigation-menu/default' } } });
