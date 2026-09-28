import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiButtonGroup, type RuiButtonGroupOrientation } from '@ecopages/radiant-ui/button-group';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type ButtonGroupArgs = {
	orientation: RuiButtonGroupOrientation;
};

export const meta = {
	args: {
		orientation: 'horizontal',
	},
	argTypes: {
		orientation: {
			control: { type: 'radio' },
			options: ['horizontal', 'vertical'] as const satisfies readonly RuiButtonGroupOrientation[],
		},
	},
	render: (args) => (
		<RuiButtonGroup orientation={args.orientation}>
			<RuiButton variant="outline">Cancel</RuiButton>
			<RuiButton variant="filled">Save</RuiButton>
		</RuiButtonGroup>
	),
} satisfies DocsMeta<ButtonGroupArgs>;

type Story = DocsStory<ButtonGroupArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'button-group/default' } } });
