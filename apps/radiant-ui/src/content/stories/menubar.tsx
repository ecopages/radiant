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
		<div class="playground-menubar">
			<RuiMenubar
				label={args.label}
				items={[
					{
						id: 'file',
						label: 'File',
						items: [
							{ value: 'new', label: 'New' },
							{ type: 'separator', id: 'sharing-actions' },
							{
								value: 'share',
								label: 'Share',
								items: [
									{ value: 'email', label: 'Email' },
									{ value: 'copy-link', label: 'Copy link' },
								],
							},
						],
					},
					{
						id: 'edit',
						label: 'Edit',
						items: [{ value: 'undo', label: 'Undo' }],
					},
				]}
			/>
		</div>
	),
} satisfies DocsMeta<MenubarArgs>;

type Story = DocsStory<MenubarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'menubar/default' } } });
