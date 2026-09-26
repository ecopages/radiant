import { RuiDateInput } from '@ecopages/radiant-ui/date-input';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type DateInputArgs = {
	value: string;
	locale: string;
	disabled: boolean;
	readOnly: boolean;
	min: string;
	max: string;
};

export const meta = {
	args: {
		value: '2026-08-20',
		locale: 'en-US',
		disabled: false,
		readOnly: false,
		min: '',
		max: '',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		locale: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		readOnly: { control: { type: 'boolean' } },
		min: { control: { type: 'text' } },
		max: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiDateInput
			label="Date"
			name="when"
			value={args.value}
			locale={args.locale}
			disabled={args.disabled}
			readOnly={args.readOnly}
			min={args.min}
			max={args.max}
		/>
	),
} satisfies DocsMeta<DateInputArgs>;

type Story = DocsStory<DateInputArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'date-input/default' } } });

export const Locale: Story = docsStory(meta, {
	args: { locale: 'ja-JP' },
	parameters: { docs: { id: 'date-input/locale' } },
});
