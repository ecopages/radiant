import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type RadioGroupArgs = {
	value: string;
	disabled: boolean;
	label: string;
};

export const meta = {
	component: 'radio-group',
	exportName: 'RuiRadioGroup',
	args: {
		value: 'pro',
		disabled: false,
		label: 'Plan',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiRadioGroup', 'radio-group', args),
	render: (args) => renderPlaygroundPreview('radio-group', args),
} satisfies DocsMeta<RadioGroupArgs>;

type Story = DocsStory<RadioGroupArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'radio-group/default' } } });
