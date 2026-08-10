import { RuiMenuButton } from '@ecopages/radiant-ui/menu-button';
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
			options: ['bottom-start', 'bottom-end', 'top-start', 'top-end'] as const satisfies readonly MenuButtonArgs['placement'][],
		},
		children: { control: { type: 'text' } },
	},
	render: (args) => (
		<div class="playground-menu-button-demo">
			<RuiMenuButton
				{...(args.open ? { open: true } : {})}
				placement={args.placement}
				trigger={args.children}
				items={[
					{ value: 'edit', label: 'Edit' },
					{ value: 'duplicate', label: 'Duplicate' },
					{ value: 'delete', label: 'Delete' },
				]}
			/>
		</div>
	),
} satisfies DocsMeta<MenuButtonArgs>;

type Story = DocsStory<MenuButtonArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'menu-button/default' } } });
