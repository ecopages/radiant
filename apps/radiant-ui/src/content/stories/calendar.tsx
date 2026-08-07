import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type CalendarArgs = {
	selectionMode: string;
	disabled: boolean;
	visibleMonths: number;
	pageBehavior: string;
};

export const meta = {
	component: 'calendar',
	exportName: 'RuiCalendar',
	args: {
		selectionMode: 'single',
		disabled: false,
		visibleMonths: 1,
		pageBehavior: 'visible',
	},
	argTypes: {
		selectionMode: { control: { type: 'select' }, options: ['single', 'multiple', 'range'] as const },
		disabled: { control: { type: 'boolean' } },
		visibleMonths: { control: { type: 'text' } },
		pageBehavior: { control: { type: 'select' }, options: ['visible', 'single'] as const },
	},
	exampleCode: (args) => buildExampleCode('RuiCalendar', 'calendar', args),
	render: (args) => renderPlaygroundPreview('calendar', args),
} satisfies DocsMeta<CalendarArgs>;

type Story = DocsStory<CalendarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'calendar/default' } } });
