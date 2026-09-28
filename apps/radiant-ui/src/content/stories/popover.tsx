import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiPopover, RuiPopoverContent, RuiPopoverTrigger } from '@ecopages/radiant-ui/popover';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type PopoverArgs = {
	open: boolean;
	placement: 'bottom' | 'bottom-start' | 'top' | 'right';
	portal: boolean;
	matchAnchorWidth: boolean;
	offset: number;
};

export const meta = {
	args: {
		open: false,
		placement: 'bottom-start',
		portal: true,
		matchAnchorWidth: false,
		offset: 8,
	},
	argTypes: {
		open: { control: { type: 'boolean' } },
		placement: {
			control: { type: 'select' },
			options: ['bottom', 'bottom-start', 'top', 'right'] as const satisfies readonly PopoverArgs['placement'][],
		},
		portal: { control: { type: 'boolean' } },
		matchAnchorWidth: { control: { type: 'boolean' } },
		offset: { control: { type: 'number' } },
	},
	render: (args) => (
		<RuiPopoverTrigger
			{...(args.open ? { open: true } : {})}
			trigger={<RuiButton variant="outline">Filter</RuiButton>}
		>
			<RuiPopover
				placement={args.placement}
				portal={args.portal}
				matchAnchorWidth={args.matchAnchorWidth}
				offset={args.offset}
			>
				<RuiPopoverContent>
					<p>Show items from the last 7 days.</p>
				</RuiPopoverContent>
			</RuiPopover>
		</RuiPopoverTrigger>
	),
} satisfies DocsMeta<PopoverArgs>;

type Story = DocsStory<PopoverArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'popover/default' } } });
