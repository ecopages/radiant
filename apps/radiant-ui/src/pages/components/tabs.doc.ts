import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	selectControl,
	textControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'tabs',
	title: 'Tabs',
	exportName: 'RuiTabs',
	category: 'Navigation',
	lede: 'Tabs organize related content into panels where only one is visible at a time — settings sections, product details, or dashboards.',
	usage: {
		intro: 'Compose `RuiTabList`, `RuiTab`, `RuiTabPanels`, and `RuiTabPanel`. Set `value` to control the active tab.',
		example: `import { RuiTabs, RuiTabList, RuiTab, RuiTabPanels, RuiTabPanel } from '@ecopages/radiant-ui/tabs';

<RuiTabs value="account" variant="boxed">
  <RuiTabList>
    <RuiTab id="account">Account</RuiTab>
    <RuiTab id="security">Security</RuiTab>
  </RuiTabList>
  <RuiTabPanels>
    <RuiTabPanel id="account">Account settings</RuiTabPanel>
    <RuiTabPanel id="security">Security settings</RuiTabPanel>
  </RuiTabPanels>
</RuiTabs>`,
	},
	guidance: [
		{
			id: 'tab-variants',
			title: 'Boxed or ghost',
			paragraphs: [
				'`boxed` tabs have a contained background — good for settings panels. `ghost` tabs sit flush with the page header.',
			],
		},
		{
			id: 'manual-activation',
			title: 'Manual activation',
			paragraphs: ['Set `automatic={false}` when switching tabs should require an explicit Enter/Space press.'],
		},
	],
	accessibility: [
		'Tab list exposes `role="tablist"` with `aria-selected` on the active tab.',
		'Arrow keys move between tabs; activation follows the `automatic` setting.',
		'Each panel is labelled by its corresponding tab via `aria-labelledby`.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					selectControl({
						prop: 'variant',
						label: 'Variant',
						defaultValue: 'boxed',
						options: [
							{
								value: 'boxed',
								label: 'Boxed',
							},
							{
								value: 'ghost',
								label: 'Ghost',
							},
						],
					}),
					textControl({
						prop: 'value',
						label: 'Active tab',
						defaultValue: 'account',
					}),
					booleanControl({
						prop: 'automatic',
						label: 'Automatic activation',
						defaultValue: true,
					}),
					textControl({
						prop: 'label',
						label: 'Accessible name',
						defaultValue: 'Settings',
					}),
				],
			}),
		],
	}),
});
