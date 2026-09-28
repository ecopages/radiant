import { RuiPagination } from '@ecopages/radiant-ui/pagination';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type PaginationArgs = {
	label: string;
	page: number;
	pageCount: number;
};

export const meta = {
	args: {
		label: 'Search result pages',
		page: 2,
		pageCount: 8,
	},
	argTypes: {
		label: { control: { type: 'text' } },
		page: { control: { type: 'number' } },
		pageCount: { control: { type: 'number' } },
	},
	render: (args) => <RuiPagination label={args.label} page={args.page} pageCount={args.pageCount} />,
} satisfies DocsMeta<PaginationArgs>;

type Story = DocsStory<PaginationArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'pagination/default' } } });
