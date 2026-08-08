import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type NumberFieldArgs = {
	value: number;
	minValue: number;
	maxValue: number;
	step: number;
	disabled: boolean;
	wheelDisabled: boolean;
};

export const meta = {
	component: 'number-field',
	exportName: 'RuiNumberField',
	args: {
		value: 3,
		minValue: 0,
		maxValue: 10,
		step: 1,
		disabled: false,
		wheelDisabled: false,
	},
	argTypes: {
		value: { control: { type: 'number' } },
		minValue: { control: { type: 'number' } },
		maxValue: { control: { type: 'number' } },
		step: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		wheelDisabled: { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiNumberField', 'number-field', args),
	render: (args) => renderPlaygroundPreview('number-field', args),
} satisfies DocsMeta<NumberFieldArgs>;

type Story = DocsStory<NumberFieldArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'number-field/default' } } });
