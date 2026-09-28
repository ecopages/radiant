import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiTooltip } from '@ecopages/radiant-ui/tooltip';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type TooltipArgs = {
	content: string;
	placement: 'top' | 'bottom' | 'left' | 'right';
	delay: number;
};

export const meta = {
	args: {
		content: 'Download report',
		placement: 'top',
		delay: 200,
	},
	argTypes: {
		content: { control: { type: 'text' } },
		placement: {
			control: { type: 'select' },
			options: ['top', 'bottom', 'left', 'right'] as const satisfies readonly TooltipArgs['placement'][],
		},
		delay: { control: { type: 'number' } },
	},
	render: (args) => (
		<RuiTooltip content={args.content} placement={args.placement} delay={args.delay}>
			<RuiButton variant="ghost" aria-label="Download">
				↓
			</RuiButton>
		</RuiTooltip>
	),
} satisfies DocsMeta<TooltipArgs>;

type Story = DocsStory<TooltipArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'tooltip/default' } } });
