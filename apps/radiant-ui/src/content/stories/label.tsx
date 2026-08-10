import { RuiLabel } from '@ecopages/radiant-ui/label';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type LabelArgs = {
	htmlFor: string;
	children: string;
};

export const meta = {
	args: {
		htmlFor: '',
		children: 'Username',
	},
	argTypes: {
		htmlFor: { control: { type: 'text' } },
		children: { control: { type: 'text' } },
	},
	render: (args) => <RuiLabel htmlFor={args.htmlFor || undefined}>{args.children}</RuiLabel>,
} satisfies DocsMeta<LabelArgs>;

type Story = DocsStory<LabelArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'label/default' } } });
