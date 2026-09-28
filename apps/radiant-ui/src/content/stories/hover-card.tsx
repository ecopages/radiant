import { RuiAvatar } from '@ecopages/radiant-ui/avatar';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiHoverCard, RuiHoverCardContent, RuiHoverCardTrigger } from '@ecopages/radiant-ui/hover-card';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type HoverCardArgs = {
	placement: 'top' | 'bottom' | 'left' | 'right' | 'bottom-start';
	delay: number;
	closeDelay: number;
};

export const meta = {
	args: {
		placement: 'bottom-start',
		delay: 600,
		closeDelay: 200,
	},
	argTypes: {
		placement: {
			control: { type: 'select' },
			options: [
				'top',
				'bottom',
				'left',
				'right',
				'bottom-start',
			] as const satisfies readonly HoverCardArgs['placement'][],
		},
		delay: { control: { type: 'number' } },
		closeDelay: { control: { type: 'number' } },
	},
	render: (args) => (
		<RuiHoverCard placement={args.placement} delay={args.delay} closeDelay={args.closeDelay}>
			<RuiHoverCardTrigger>
				<RuiButton variant="link">Jane Cooper</RuiButton>
			</RuiHoverCardTrigger>
			<RuiHoverCardContent>
				<div class="flex gap-3">
					<RuiAvatar fallback="JC" alt="Jane Cooper" />
					<div class="flex flex-col gap-1">
						<p class="font-medium text-sm">Jane Cooper</p>
						<p class="text-on-surface text-xs opacity-80">Product designer on the Radiant team.</p>
					</div>
				</div>
			</RuiHoverCardContent>
		</RuiHoverCard>
	),
} satisfies DocsMeta<HoverCardArgs>;

type Story = DocsStory<HoverCardArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'hover-card/default' } } });
