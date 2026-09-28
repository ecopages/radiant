import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiSeparator } from '@ecopages/radiant-ui/separator';
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
			<RuiButton toggle variant="ghost" square aria-label="Bold">
				<strong aria-hidden="true">B</strong>
			</RuiButton>
			<RuiButton toggle variant="ghost" square aria-label="Italic">
				<em aria-hidden="true">I</em>
			</RuiButton>
			<RuiSeparator orientation="vertical" />
			<RuiButton toggle variant="ghost" square aria-label="Underline">
				<u aria-hidden="true">U</u>
			</RuiButton>
			<RuiButton toggle variant="ghost" square aria-label="Strikethrough">
				<s aria-hidden="true">S</s>
			</RuiButton>
		</RuiToolbar>
	),
} satisfies DocsMeta<ToolbarArgs>;

type Story = DocsStory<ToolbarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toolbar/default' } } });
