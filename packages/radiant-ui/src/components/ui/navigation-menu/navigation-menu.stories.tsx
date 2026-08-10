import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, fireEvent, userEvent } from 'storybook/test';
import { RuiDisclosure } from '../disclosure/disclosure';
import {
	RuiNavigationMenu,
	RuiNavigationMenuLink,
	RuiNavigationMenuPanel,
	RuiNavigationMenuTrigger,
} from './navigation-menu';
import { RuiNavigationMenu as RuiNavigationMenuElement } from './navigation-menu.script';

const meta = {
	title: 'Components/Navigation Menu',
	component: RuiNavigationMenu,
	parameters: { radiant: { element: RuiNavigationMenuElement, cssImports: ['./navigation-menu.css'] } },
	args: {
		label: 'Main',
	},
} satisfies Meta<typeof RuiNavigationMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const getTriggers = (canvas: HTMLElement) =>
	Array.from(canvas.querySelectorAll('[data-navigation-trigger]')) as HTMLElement[];

const productLinks = [
	{ href: '/analytics', label: 'Analytics' },
	{ href: '/automation', label: 'Automation' },
	{ href: '/integrations', label: 'Integrations' },
	{ href: '/support', label: 'Support plans' },
	{ href: '/training', label: 'Training' },
	{ href: '/security', label: 'Security center' },
];

const industryLinks = [
	{ href: '/healthcare', label: 'Healthcare' },
	{ href: '/finance', label: 'Finance' },
	{ href: '/retail', label: 'Retail' },
];

const teamLinks = [
	{ href: '/design', label: 'Design' },
	{ href: '/engineering', label: 'Engineering' },
	{ href: '/operations', label: 'Operations' },
];

export const MegamenuNavigation: Story = {
	render: (args) => (
		<div class="max-w-5xl">
			<RuiNavigationMenu label={args.label}>
				<RuiNavigationMenuTrigger value="products">Products</RuiNavigationMenuTrigger>
				<RuiNavigationMenuTrigger value="solutions">Solutions</RuiNavigationMenuTrigger>
				<RuiNavigationMenuLink href="/pricing">Pricing</RuiNavigationMenuLink>

				<RuiNavigationMenuPanel value="products">
					<nav aria-label="Products">
						<ul class="rui-navigation-menu__link-list">
							{productLinks.map((link) => (
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
								{industryLinks.map((link) => (
									<li>
										<a href={link.href}>{link.label}</a>
									</li>
								))}
							</ul>
						</nav>
						<nav aria-label="By team">
							<p class="rui-navigation-menu__link-group-label">By team</p>
							<ul class="rui-navigation-menu__link-list">
								{teamLinks.map((link) => (
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
			</RuiNavigationMenu>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		const triggers = getTriggers(canvasElement);
		const productsPanel = canvasElement.querySelector(
			'[data-navigation-panel][data-value="products"]',
		) as HTMLElement;
		const productLinksInPanel = Array.from(productsPanel.querySelectorAll('a')) as HTMLAnchorElement[];

		await step('opens the products megamenu panel', async () => {
			await userEvent.click(triggers[0]);
			await expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
			await expect(productsPanel).not.toHaveAttribute('hidden');
		});

		await step('focus moves to the first navigation link in the panel', async () => {
			await expect(productLinksInPanel[0]).toHaveFocus();
		});

		await step('ArrowDown navigates links inside the open panel', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(productLinksInPanel[1]).toHaveFocus();
			await userEvent.keyboard('{ArrowDown}');
			await expect(productLinksInPanel[2]).toHaveFocus();
		});

		await step('ArrowUp on the first link returns focus to the trigger', async () => {
			await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
			await expect(triggers[0]).toHaveFocus();
		});

		await step('ArrowDown from the trigger opens and focuses the panel', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(productLinksInPanel[0]).toHaveFocus();
		});

		await step('switching triggers closes the previous panel exclusively', async () => {
			const solutionsPanel = canvasElement.querySelector(
				'[data-navigation-panel][data-value="solutions"]',
			) as HTMLElement;
			await userEvent.click(triggers[1]);
			await expect(productsPanel).toHaveAttribute('hidden');
			await expect(solutionsPanel).not.toHaveAttribute('hidden');
			const firstSolutionsLink = solutionsPanel.querySelector('a') as HTMLAnchorElement;
			await expect(firstSolutionsLink).toHaveFocus();
		});

		await step('Escape closes the open panel', async () => {
			const solutionsTrigger = getTriggers(canvasElement)[1];
			const solutionsPanel = canvasElement.querySelector(
				'[data-navigation-panel][data-value="solutions"]',
			) as HTMLElement;
			solutionsTrigger.focus();
			fireEvent.keyDown(solutionsTrigger, { key: 'Escape', code: 'Escape' });
			await expect(solutionsTrigger).toHaveAttribute('aria-expanded', 'false');
			await expect(solutionsPanel).toHaveAttribute('hidden');
		});

		await step('arrow keys move from triggers to plain bar links', async () => {
			const solutionsTrigger = getTriggers(canvasElement)[1];
			const pricingLink = canvasElement.querySelector('a[href="/pricing"]') as HTMLAnchorElement;
			solutionsTrigger.focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(pricingLink).toHaveFocus();
		});

		await step('disclosures inside an open panel expand without closing the menu', async () => {
			await userEvent.click(getTriggers(canvasElement)[1]);
			const solutionsPanel = canvasElement.querySelector(
				'[data-navigation-panel][data-value="solutions"]',
			) as HTMLElement;
			const disclosureButton = canvasElement.querySelector(
				'[data-navigation-panel][data-value="solutions"] rui-disclosure button',
			) as HTMLButtonElement;
			const disclosurePanel = canvasElement.querySelector(
				'[data-navigation-panel][data-value="solutions"] rui-disclosure [data-ref="panel"]',
			) as HTMLElement;
			disclosureButton.focus();
			await userEvent.keyboard('{Enter}');
			await expect(disclosurePanel).not.toHaveAttribute('hidden');
			await expect(solutionsPanel).not.toHaveAttribute('hidden');
		});
	},
};

export const MixedLinksAndPanels: Story = {
	render: (args) => (
		<div class="max-w-3xl">
			<RuiNavigationMenu label={args.label}>
				<RuiNavigationMenuTrigger value="learn">Learn</RuiNavigationMenuTrigger>
				<RuiNavigationMenuLink href="/docs">Docs</RuiNavigationMenuLink>
				<RuiNavigationMenuPanel value="learn">
					<nav aria-label="Learn">
						<ul class="rui-navigation-menu__link-list">
							<li>
								<a href="/guides">Guides</a>
							</li>
							<li>
								<a href="/tutorials">Tutorials</a>
							</li>
							<li>
								<a href="/reference">API reference</a>
							</li>
						</ul>
					</nav>
				</RuiNavigationMenuPanel>
			</RuiNavigationMenu>
		</div>
	),
};

export const DecorativePanelAccent: Story = {
	render: (args) => (
		<div class="max-w-3xl">
			<RuiNavigationMenu label={args.label}>
				<RuiNavigationMenuTrigger value="resources">Resources</RuiNavigationMenuTrigger>
				<RuiNavigationMenuPanel value="resources">
					<nav aria-label="Resources">
						<ul class="rui-navigation-menu__link-list">
							<li>
								<a href="/blog">Blog</a>
							</li>
							<li>
								<a href="/events">Events</a>
							</li>
							<li>
								<a href="/community">Community</a>
							</li>
						</ul>
					</nav>
					<RuiDisclosure trigger="About this section">
						<p class="rui-navigation-menu__disclosure-copy">
							Optional decorative copy for context — the primary path is still the links above.
						</p>
					</RuiDisclosure>
				</RuiNavigationMenuPanel>
			</RuiNavigationMenu>
		</div>
	),
};
