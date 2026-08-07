import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type SidebarArgs = {
	collapsible: string;
	side: string;
	defaultOpen: boolean;
	resizable: boolean;
	defaultWidth: number;
};

export const meta = {
	component: 'sidebar',
	exportName: 'RuiSidebar',
	args: {
		collapsible: 'off',
		side: 'left',
		defaultOpen: true,
		resizable: false,
		defaultWidth: 256,
	},
	argTypes: {
		collapsible: { control: { type: 'select' }, options: ['off', 'icon', 'full'] as const },
		side: { control: { type: 'select' }, options: ['left', 'right'] as const },
		defaultOpen: { control: { type: 'boolean' } },
		resizable: { control: { type: 'boolean' } },
		defaultWidth: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiSidebar', 'sidebar', args),
	render: (args) => renderPlaygroundPreview('sidebar', args),
} satisfies DocsMeta<SidebarArgs>;

type Story = DocsStory<SidebarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'sidebar/default' } } });
