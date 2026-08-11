import {
	RuiDateRangePicker,
	RuiDateRangePickerCalendar,
	RuiDateRangePickerControl,
	RuiDateRangePickerEndInput,
	RuiDateRangePickerInputs,
	RuiDateRangePickerPopover,
	RuiDateRangePickerSeparator,
	RuiDateRangePickerStartInput,
	RuiDateRangePickerToggle,
} from '@ecopages/radiant-ui/date-range-picker';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type DateRangePickerArgs = {
	value: string;
	dateStyle: 'short' | 'medium' | 'long' | 'full';
	visibleMonths: number;
	disabled: boolean;
	readOnly: boolean;
};

export const meta = {
	args: {
		value: '2026-08-01/2026-08-14',
		dateStyle: 'medium',
		visibleMonths: 2,
		disabled: false,
		readOnly: false,
	},
	argTypes: {
		value: { control: { type: 'text' } },
		dateStyle: {
			control: { type: 'select' },
			options: ['short', 'medium', 'long', 'full'] as const satisfies readonly DateRangePickerArgs['dateStyle'][],
		},
		visibleMonths: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		readOnly: { control: { type: 'boolean' } },
	},
	render: (args) => (
		<RuiField name="trip" rules={{ required: 'Pick trip dates' }}>
			<RuiLabel>Trip dates</RuiLabel>
			<RuiDateRangePicker
				value={args.value}
				dateStyle={args.dateStyle}
				visibleMonths={args.visibleMonths}
				disabled={args.disabled}
				readOnly={args.readOnly}
			>
				<RuiDateRangePickerControl>
					<RuiDateRangePickerInputs>
						<RuiDateRangePickerStartInput aria-label="Start date" />
						<RuiDateRangePickerSeparator />
						<RuiDateRangePickerEndInput aria-label="End date" />
					</RuiDateRangePickerInputs>
					<RuiDateRangePickerToggle />
				</RuiDateRangePickerControl>
				<RuiDateRangePickerPopover>
					<RuiDateRangePickerCalendar />
				</RuiDateRangePickerPopover>
			</RuiDateRangePicker>
		</RuiField>
	),
} satisfies DocsMeta<DateRangePickerArgs>;

type Story = DocsStory<DateRangePickerArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'date-range-picker/default' } } });

export const WithCalendar: Story = docsStory(meta, {
	args: {
		value: '',
		visibleMonths: 2,
	},
	parameters: { docs: { id: 'date-range-picker/with-calendar' } },
});
