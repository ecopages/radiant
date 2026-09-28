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
	visibleMonths: number;
	disabled: boolean;
	readOnly: boolean;
	locale: string;
};

export const meta = {
	args: {
		value: '2026-08-07',
		visibleMonths: 1,
		disabled: false,
		readOnly: false,
		locale: 'en-US',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		visibleMonths: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		readOnly: { control: { type: 'boolean' } },
		locale: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiDateField
			label="Start date"
			value={args.value}
			locale={args.locale}
			visibleMonths={args.visibleMonths}
			disabled={args.disabled}
			readOnly={args.readOnly}
		>
			<RuiDateFieldControl>
				<RuiDateFieldInput
					value={args.value}
					label="Start date"
					locale={args.locale}
					disabled={args.disabled}
					readOnly={args.readOnly}
				/>
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
