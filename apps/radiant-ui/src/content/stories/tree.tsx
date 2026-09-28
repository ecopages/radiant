import { RuiTree } from '@ecopages/radiant-ui/tree';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

const TREE_DEMO_NODES = [
	{
		id: 'src',
		label: 'src',
		expanded: true,
		children: [
			{
				id: 'components',
				label: 'components',
				expanded: true,
				children: [
					{ id: 'button', label: 'button.tsx' },
					{ id: 'dialog', label: 'dialog.tsx' },
					{ id: 'sidebar', label: 'sidebar.tsx' },
				],
			},
			{
				id: 'lib',
				label: 'lib',
				expanded: true,
				children: [
					{ id: 'utils', label: 'utils.ts' },
					{ id: 'hooks', label: 'hooks.ts' },
				],
			},
			{ id: 'index', label: 'index.ts' },
		],
	},
	{ id: 'public', label: 'public', children: [{ id: 'favicon', label: 'favicon.ico' }] },
	{ id: 'package', label: 'package.json' },
	{ id: 'readme', label: 'README.md' },
];

export type TreeArgs = {
	value: string;
	label: string;
};

export const meta = {
	args: {
		value: 'button',
		label: 'Project files',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		label: { control: { type: 'text' } },
	},
	render: (args) => <RuiTree value={args.value} label={args.label} nodes={TREE_DEMO_NODES} />,
} satisfies DocsMeta<TreeArgs>;

type Story = DocsStory<TreeArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'tree/default' } } });
