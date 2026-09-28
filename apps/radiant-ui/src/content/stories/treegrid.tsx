import { RuiTreegrid } from '@ecopages/radiant-ui/treegrid';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

const TREEGRID_DEMO_ROWS = [
	{
		id: 'src',
		cells: ['src', 'folder'],
		expanded: true,
		children: [
			{
				id: 'components',
				cells: ['components', 'folder'],
				expanded: true,
				children: [
					{ id: 'button', cells: ['button.tsx', '4.2 KB'] },
					{ id: 'dialog', cells: ['dialog.tsx', '6.8 KB'] },
					{ id: 'sidebar', cells: ['sidebar.tsx', '12.1 KB'] },
				],
			},
			{
				id: 'lib',
				cells: ['lib', 'folder'],
				expanded: true,
				children: [
					{ id: 'utils', cells: ['utils.ts', '2.4 KB'] },
					{ id: 'hooks', cells: ['hooks.ts', '3.1 KB'] },
				],
			},
			{ id: 'index', cells: ['index.ts', '1.1 KB'] },
		],
	},
	{
		id: 'public',
		cells: ['public', 'folder'],
		children: [{ id: 'favicon', cells: ['favicon.ico', '15 KB'] }],
	},
	{ id: 'package', cells: ['package.json', '1.8 KB'] },
	{ id: 'readme', cells: ['README.md', '3.4 KB'] },
];

export type TreegridArgs = {
	value: string;
	label: string;
};

export const meta = {
	args: {
		value: 'button',
		label: 'Repository',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiTreegrid value={args.value} label={args.label} columns={['Name', 'Size']} rows={TREEGRID_DEMO_ROWS} />
	),
} satisfies DocsMeta<TreegridArgs>;

type Story = DocsStory<TreegridArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'treegrid/default' } } });
