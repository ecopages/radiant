import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type TabsArgs = {
	variant: string;
	value: string;
	automatic: boolean;
	label: string;
};

export const meta = {
	component: 'tabs',
	exportName: 'RuiTabs',
	args: {
		variant: 'boxed',
		value: 'account',
		automatic: true,
		label: 'Settings',
	},
	argTypes: {
		variant: { control: { type: 'select' }, options: ['boxed', 'ghost'] as const },
		value: { control: { type: 'text' } },
		automatic: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiTabs', 'tabs', args),
	render: (args) => renderPlaygroundPreview('tabs', args),
} satisfies DocsMeta<TabsArgs>;

type Story = DocsStory<TabsArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'tabs/default' } } });
