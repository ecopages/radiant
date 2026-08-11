import {
	RuiMenuButton,
	RuiMenuButtonContent,
	RuiMenuButtonItem,
	RuiMenuButtonTrigger,
} from '@ecopages/radiant-ui/menu-button';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type MenuButtonArgs = {
	open: boolean;
	placement: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
	children: string;
};

export const meta = {
	args: {
		open: false,
		placement: 'bottom-start',
		children: 'Actions',
	},
	argTypes: {
		open: { control: { type: 'boolean' } },
		placement: {
			control: { type: 'select' },
			options: [
				'bottom-start',
				'bottom-end',
				'top-start',
				'top-end',
			] as const satisfies readonly MenuButtonArgs['placement'][],
		},
		children: { control: { type: 'text' } },
	},
	render: (args) => (
		<div class="playground-menu-button-demo">
			<RuiMenuButton open={args.open} placement={args.placement}>
				<RuiMenuButtonTrigger>{args.children}</RuiMenuButtonTrigger>
				<RuiMenuButtonContent>
					<RuiMenuButtonItem value="edit">Edit</RuiMenuButtonItem>
					<RuiMenuButtonItem value="duplicate">Duplicate</RuiMenuButtonItem>
					<RuiMenuButtonItem value="delete">Delete</RuiMenuButtonItem>
				</RuiMenuButtonContent>
			</RuiMenuButton>
		</div>
	),
} satisfies DocsMeta<MenuButtonArgs>;

type Story = DocsStory<MenuButtonArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'menu-button/default' } } });
