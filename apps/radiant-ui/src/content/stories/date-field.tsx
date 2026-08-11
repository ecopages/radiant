import { RuiDateField } from '@ecopages/radiant-ui/date-field';
import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type DateFieldArgs = {
	value: string;
	dateStyle: 'short' | 'medium' | 'long' | 'full';
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
	render: (args) => (
		<RuiDateField
			label="Start date"
			value={args.value}
			dateStyle={args.dateStyle}
			disabled={args.disabled}
			readOnly={args.readOnly}
			masked={args.masked}
		/>
	),
} satisfies DocsMeta<DateFieldArgs>;

type Story = DocsStory<DateFieldArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'date-field/default' } } });
