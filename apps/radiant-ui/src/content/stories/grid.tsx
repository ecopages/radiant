import { RuiGrid } from '@ecopages/radiant-ui/grid';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type GridArgs = {
	label: string;
};

export const meta = {
	args: {
		label: 'Team members',
	},
	argTypes: {
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiGrid
			label={args.label}
			rows={[
				['Name', 'Role'],
				['Jane Cooper', 'Engineer'],
				['Alex Rivera', 'Designer'],
			]}
		/>
	),
} satisfies DocsMeta<GridArgs>;

type Story = DocsStory<GridArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'grid/default' } } });
