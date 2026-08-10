import { RuiMenubar } from '@ecopages/radiant-ui/menubar';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type MenubarArgs = {
	label: string;
};

export const meta = {
	args: {
		label: 'Application menu',
	},
	argTypes: {
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiMenubar
			label={args.label}
			items={[
				{
					id: 'file',
					label: 'File',
					items: [
						{ id: 'new', label: 'New' },
						{ id: 'open', label: 'Open' },
					],
				},
				{
					id: 'edit',
					label: 'Edit',
					items: [{ id: 'undo', label: 'Undo' }],
				},
			]}
		/>
	),
} satisfies DocsMeta<MenubarArgs>;

type Story = DocsStory<MenubarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'menubar/default' } } });
