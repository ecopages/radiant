import { defineComponentDoc, definePlayground, defineScenario, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'navigation-menu',
	title: 'Navigation Menu',
	exportName: 'RuiNavigationMenu',
	category: 'Navigation',
	lede: 'Navigation menus organize site sections with optional dropdown panels for nested links.',
	usage: {
		intro: 'Compose triggers, links, and panels with the sub-components. Use `RuiNavigationMenuTrigger` for sections with flyout content.',
		example: `import {
  RuiNavigationMenu,
  RuiNavigationMenuTrigger,
  RuiNavigationMenuLink,
  RuiNavigationMenuPanel,
} from '@ecopages/radiant-ui/navigation-menu';

<RuiNavigationMenu label="Main">
  <RuiNavigationMenuTrigger>Products</RuiNavigationMenuTrigger>
  <RuiNavigationMenuPanel>
    <RuiNavigationMenuLink href="/widgets">Widgets</RuiNavigationMenuLink>
  </RuiNavigationMenuPanel>
  <RuiNavigationMenuLink href="/pricing">Pricing</RuiNavigationMenuLink>
</RuiNavigationMenu>`,
	},
	guidance: [
		{
			id: 'site-nav',
			title: 'Site-wide navigation',
			paragraphs: ['Keep top-level items to five or fewer. Move secondary links into panels or the footer.'],
		},
	],
	accessibility: [
		'The menu renders as a `nav` landmark with an accessible name from `label`.',
		'Expanded panels are associated with their triggers via `aria-controls`.',
		'Current page links should use `aria-current="page"`.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'label',
						label: 'Accessible name',
						defaultValue: 'Main',
					}),
				],
			}),
		],
	}),
});
