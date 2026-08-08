import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type MenuButtonArgs = {
	open: boolean;
	placement: string;
	children: string;
};

export const meta = {
	component: 'menu-button',
	exportName: 'RuiMenuButton',
	args: {
		open: false,
		placement: 'bottom-start',
		children: 'Actions',
	},
	argTypes: {
		open: { control: { type: 'boolean' } },
		placement: {
			control: { type: 'select' },
			options: ['bottom-start', 'bottom-end', 'top-start', 'top-end'] as const,
		},
		children: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiMenuButton', 'menu-button', args, args.children),
	render: (args) => renderPlaygroundPreview('menu-button', args, args.children),
} satisfies DocsMeta<MenuButtonArgs>;

type Story = DocsStory<MenuButtonArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'menu-button/default' } } });
