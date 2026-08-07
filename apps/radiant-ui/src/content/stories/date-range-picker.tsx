import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type DateRangePickerArgs = {
	value: string;
	dateStyle: string;
	visibleMonths: number;
	disabled: boolean;
	readOnly: boolean;
};

export const meta = {
	component: 'date-range-picker',
	exportName: 'RuiDateRangePicker',
	args: {
		value: '2026-08-01/2026-08-14',
		dateStyle: 'medium',
		visibleMonths: 2,
		disabled: false,
		readOnly: false,
	},
	argTypes: {
		value: { control: { type: 'text' } },
		dateStyle: { control: { type: 'select' }, options: ['short', 'medium', 'long', 'full'] as const },
		visibleMonths: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		readOnly: { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiDateRangePicker', 'date-range-picker', args),
	render: (args) => renderPlaygroundPreview('date-range-picker', args),
} satisfies DocsMeta<DateRangePickerArgs>;

type Story = DocsStory<DateRangePickerArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'date-range-picker/default' } } });
