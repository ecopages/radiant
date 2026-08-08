import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type SelectArgs = {
	value: string;
	placeholder: string;
	disabled: boolean;
	selectionMode: string;
};

export const meta = {
	component: 'select',
	exportName: 'RuiSelect',
	args: {
		value: 'cat',
		placeholder: 'Select an animal',
		disabled: false,
		selectionMode: 'single',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		placeholder: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		selectionMode: { control: { type: 'select' }, options: ['single', 'multiple'] as const },
	},
	exampleCode: (args) => buildExampleCode('RuiSelect', 'select', args),
	render: (args) => renderPlaygroundPreview('select', args),
} satisfies DocsMeta<SelectArgs>;

type Story = DocsStory<SelectArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'select/default' } } });
