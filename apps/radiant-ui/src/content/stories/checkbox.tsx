import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type CheckboxArgs = {
	checked: boolean;
	indeterminate: boolean;
	disabled: boolean;
	value: string;
};

export const meta = {
	component: 'checkbox',
	exportName: 'RuiCheckbox',
	args: {
		checked: false,
		indeterminate: false,
		disabled: false,
		value: 'on',
	},
	argTypes: {
		checked: { control: { type: 'boolean' } },
		indeterminate: { control: { type: 'boolean' } },
		disabled: { control: { type: 'boolean' } },
		value: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiCheckbox', 'checkbox', args),
	render: (args) => renderPlaygroundPreview('checkbox', args),
} satisfies DocsMeta<CheckboxArgs>;

type Story = DocsStory<CheckboxArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'checkbox/default' } } });
