import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type PopoverArgs = {
	open: boolean;
	placement: string;
	portal: boolean;
	matchAnchorWidth: boolean;
	offset: number;
};

export const meta = {
	component: 'popover',
	exportName: 'RuiPopover',
	args: {
		open: false,
		placement: 'bottom-start',
		portal: true,
		matchAnchorWidth: false,
		offset: 8,
	},
	argTypes: {
		open: { control: { type: 'boolean' } },
		placement: { control: { type: 'select' }, options: ['bottom', 'bottom-start', 'top', 'right'] as const },
		portal: { control: { type: 'boolean' } },
		matchAnchorWidth: { control: { type: 'boolean' } },
		offset: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiPopover', 'popover', args),
	render: (args) => renderPlaygroundPreview('popover', args),
} satisfies DocsMeta<PopoverArgs>;

type Story = DocsStory<PopoverArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'popover/default' } } });
