import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiToolbar } from '@ecopages/radiant-ui/toolbar';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type ToolbarArgs = {
	exclusiveToggles: boolean;
	label: string;
};

export const meta = {
	args: {
		exclusiveToggles: false,
		label: 'Text formatting',
	},
	argTypes: {
		exclusiveToggles: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiToolbar label={args.label} exclusiveToggles={args.exclusiveToggles}>
			<RuiButton toggle variant="ghost">
				Bold
			</RuiButton>
			<RuiButton toggle variant="ghost">
				Italic
			</RuiButton>
		</RuiToolbar>
	),
} satisfies DocsMeta<ToolbarArgs>;

type Story = DocsStory<ToolbarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toolbar/default' } } });
