import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	numberControl,
	selectControl,
	textControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'date-range-picker',
	title: 'Date Range Picker',
	exportName: 'RuiDateRangePicker',
	category: 'Forms',
	lede: 'Date range pickers collect a start and end date in one control — ideal for bookings, reporting periods, and availability filters.',
	usage: {
		intro: 'Pass `value` as `start/end` ISO dates. Increase `visibleMonths` to show two months side by side for range selection.',
		example: `import { RuiDateRangePicker } from '@ecopages/radiant-ui/date-range-picker';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiField name="tripDates">
  <RuiLabel>Trip dates</RuiLabel>
  <RuiDateRangePicker value="2026-08-01/2026-08-14" visibleMonths={2} />
</RuiField>`,
	},
	guidance: [
		{
			id: 'two-month-view',
			title: 'Two-month view',
			paragraphs: [
				'Set `visibleMonths` to `2` so users can span month boundaries without extra navigation clicks.',
			],
		},
		{
			id: 'separate-names',
			title: 'Separate form names',
			paragraphs: [
				'Use `startName` and `endName` when the backend expects discrete fields instead of a combined range value.',
			],
		},
	],
	accessibility: [
		'Label both start and end inputs — placeholders alone are not sufficient.',
		'Selected range endpoints are announced when focus moves between segments.',
		'Surface validation errors for incomplete ranges before form submission.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'value',
						label: 'Value (start/end)',
						defaultValue: '2026-08-01/2026-08-14',
					}),
					selectControl({
						prop: 'dateStyle',
						label: 'Date style',
						defaultValue: 'medium',
						options: [
							{
								value: 'short',
								label: 'Short',
							},
							{
								value: 'medium',
								label: 'Medium',
							},
							{
								value: 'long',
								label: 'Long',
							},
							{
								value: 'full',
								label: 'Full',
							},
						],
					}),
					numberControl({
						prop: 'visibleMonths',
						label: 'Visible months',
						defaultValue: 2,
						min: 1,
						max: 2,
						step: 1,
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'readOnly',
						label: 'Read only',
						defaultValue: false,
					}),
				],
			}),
		],
	}),
});
