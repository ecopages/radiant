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
	visibleMonths: number;
	disabled: boolean;
	readOnly: boolean;
	locale: string;
};

export const meta = {
	args: {
		value: '2026-08-01/2026-08-14',
		visibleMonths: 2,
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
	render: (args) => {
		const range = args.value ? args.value.split('/') : ['', ''];
		const [start = '', end = ''] = range;

		return (
			<RuiField name="trip" rules={{ required: 'Pick trip dates' }}>
				<RuiLabel>Trip dates</RuiLabel>
				<RuiDateRangePicker
					value={args.value}
					locale={args.locale}
					visibleMonths={args.visibleMonths}
					disabled={args.disabled}
					readOnly={args.readOnly}
				>
					<RuiDateRangePickerControl>
						<RuiDateRangePickerInputs>
							<RuiDateRangePickerStartInput
								aria-label="Start date"
								value={start}
								locale={args.locale}
								disabled={args.disabled}
								readOnly={args.readOnly}
							/>
							<RuiDateRangePickerSeparator />
							<RuiDateRangePickerEndInput
								aria-label="End date"
								value={end}
								locale={args.locale}
								disabled={args.disabled}
								readOnly={args.readOnly}
							/>
						</RuiDateRangePickerInputs>
						<RuiDateRangePickerToggle />
					</RuiDateRangePickerControl>
					<RuiDateRangePickerPopover>
						<RuiDateRangePickerCalendar />
					</RuiDateRangePickerPopover>
				</RuiDateRangePicker>
			</RuiField>
		);
	},
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
