import { RuiCalendar, type RuiCalendarPageBehavior } from '@ecopages/radiant-ui/calendar';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type CalendarArgs = {
	selectionMode: 'single' | 'multiple' | 'range';
	disabled: boolean;
	visibleMonths: number;
	pageBehavior: RuiCalendarPageBehavior;
};

export const meta = {
	args: {
		selectionMode: 'single',
		disabled: false,
		visibleMonths: 1,
		pageBehavior: 'visible',
	},
	argTypes: {
		selectionMode: {
			control: { type: 'select' },
			options: ['single', 'multiple', 'range'] as const satisfies readonly CalendarArgs['selectionMode'][],
		},
		disabled: { control: { type: 'boolean' } },
		visibleMonths: { control: { type: 'number' } },
		pageBehavior: {
			control: { type: 'radio' },
			options: ['visible', 'single'] as const satisfies readonly RuiCalendarPageBehavior[],
		},
	},
	render: (args) => (
		<RuiCalendar
			selectionMode={args.selectionMode}
			disabled={args.disabled}
			visibleMonths={args.visibleMonths}
			pageBehavior={args.pageBehavior}
			value="2026-08-07"
		/>
	),
} satisfies DocsMeta<CalendarArgs>;

type Story = DocsStory<CalendarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'calendar/default' } } });

export const Range: Story = docsStory(meta, {
	args: { selectionMode: 'range' },
	render: (args) => (
		<RuiCalendar
			selectionMode="range"
			disabled={args.disabled}
			visibleMonths={2}
			pageBehavior={args.pageBehavior}
			value="2026-08-07/2026-08-12"
		/>
	),
	parameters: { docs: { id: 'calendar/range' } },
});

export const Multiple: Story = docsStory(meta, {
	args: { selectionMode: 'multiple' },
	render: (args) => (
		<RuiCalendar
			selectionMode="multiple"
			disabled={args.disabled}
			visibleMonths={args.visibleMonths}
			pageBehavior={args.pageBehavior}
			value="2026-08-07,2026-08-11,2026-08-19"
		/>
	),
	parameters: { docs: { id: 'calendar/multiple' } },
});
