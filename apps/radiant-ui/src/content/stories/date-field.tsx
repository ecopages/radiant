import {
	RuiDateField,
	RuiDateFieldCalendar,
	RuiDateFieldControl,
	RuiDateFieldInput,
	RuiDateFieldPopover,
	RuiDateFieldToggle,
} from '@ecopages/radiant-ui/date-field';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type DateFieldArgs = {
	value: string;
	dateStyle: 'short' | 'medium' | 'long' | 'full';
	visibleMonths: number;
	disabled: boolean;
	readOnly: boolean;
	masked: boolean;
};

export const meta = {
	args: {
		value: '2026-08-07',
		dateStyle: 'medium',
		visibleMonths: 1,
		disabled: false,
		readOnly: false,
		masked: true,
	},
	argTypes: {
		value: { control: { type: 'text' } },
		dateStyle: {
			control: { type: 'select' },
			options: ['short', 'medium', 'long', 'full'] as const satisfies readonly DateFieldArgs['dateStyle'][],
		},
		visibleMonths: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		readOnly: { control: { type: 'boolean' } },
		masked: { control: { type: 'boolean' } },
	},
	render: (args) => (
		<RuiDateField
			label="Start date"
			value={args.value}
			dateStyle={args.dateStyle}
			visibleMonths={args.visibleMonths}
			disabled={args.disabled}
			readOnly={args.readOnly}
			masked={args.masked}
		>
			<RuiDateFieldControl>
				<RuiDateFieldInput />
				<RuiDateFieldToggle />
			</RuiDateFieldControl>
			<RuiDateFieldPopover>
				<RuiDateFieldCalendar />
			</RuiDateFieldPopover>
		</RuiDateField>
	),
} satisfies DocsMeta<DateFieldArgs>;

type Story = DocsStory<DateFieldArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'date-field/default' } } });

export const WithCalendar: Story = docsStory(meta, {
	args: {
		value: '',
		visibleMonths: 2,
	},
	parameters: { docs: { id: 'date-field/with-calendar' } },
});
