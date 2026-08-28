import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs, type RuiTabsVariant } from '@ecopages/radiant-ui/tabs';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type TabsArgs = {
	variant: RuiTabsVariant;
	value: string;
	automatic: boolean;
	label: string;
};

export const meta = {
	args: {
		variant: 'boxed',
		value: 'account',
		automatic: true,
		label: 'Settings',
	},
	argTypes: {
		variant: {
			control: { type: 'radio' },
			options: ['boxed', 'ghost'] as const satisfies readonly RuiTabsVariant[],
		},
		value: { control: { type: 'text' } },
		automatic: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiTabs variant={args.variant} value={args.value} automatic={args.automatic} label={args.label}>
			<RuiTabList>
				<RuiTab id="account">Account</RuiTab>
				<RuiTab id="security">Security</RuiTab>
			</RuiTabList>
			<RuiTabPanels>
				<RuiTabPanel id="account">Account settings</RuiTabPanel>
				<RuiTabPanel id="security">Security settings</RuiTabPanel>
			</RuiTabPanels>
		</RuiTabs>
	),
} satisfies DocsMeta<TabsArgs>;

type Story = DocsStory<TabsArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'tabs/default' } } });

export const Ghost: Story = docsStory(meta, {
	args: { variant: 'ghost' },
	parameters: { docs: { id: 'tabs/ghost' } },
});

export const Manual: Story = docsStory(meta, {
	args: { automatic: false },
	parameters: { docs: { id: 'tabs/manual' } },
});
