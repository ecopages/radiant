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
			control: { type: 'select' },
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
