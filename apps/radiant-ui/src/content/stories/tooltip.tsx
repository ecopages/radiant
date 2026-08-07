import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type TooltipArgs = {
	content: string;
	placement: string;
	delay: number;
};

export const meta = {
	component: 'tooltip',
	exportName: 'RuiTooltip',
	args: {
		content: 'Download report',
		placement: 'top',
		delay: 200,
	},
	argTypes: {
		content: { control: { type: 'text' } },
		placement: { control: { type: 'select' }, options: ['top', 'bottom', 'left', 'right'] as const },
		delay: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiTooltip', 'tooltip', args),
	render: (args) => renderPlaygroundPreview('tooltip', args),
} satisfies DocsMeta<TooltipArgs>;

type Story = DocsStory<TooltipArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'tooltip/default' } } });
