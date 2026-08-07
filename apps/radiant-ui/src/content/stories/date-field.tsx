import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type DateFieldArgs = {
	value: string;
	dateStyle: string;
	disabled: boolean;
	readOnly: boolean;
	masked: boolean;
};

export const meta = {
	component: 'date-field',
	exportName: 'RuiDateField',
	args: {
		value: '2026-08-07',
		dateStyle: 'medium',
		disabled: false,
		readOnly: false,
		masked: true,
	},
	argTypes: {
		value: { control: { type: 'text' } },
		dateStyle: { control: { type: 'select' }, options: ['short', 'medium', 'long', 'full'] as const },
		disabled: { control: { type: 'boolean' } },
		readOnly: { control: { type: 'boolean' } },
		masked: { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiDateField', 'date-field', args),
	render: (args) => renderPlaygroundPreview('date-field', args),
} satisfies DocsMeta<DateFieldArgs>;

type Story = DocsStory<DateFieldArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'date-field/default' } } });
