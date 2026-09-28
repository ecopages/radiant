import {
	RuiBreadcrumb,
	RuiBreadcrumbItem,
	RuiBreadcrumbLink,
	RuiBreadcrumbList,
	RuiBreadcrumbPage,
	RuiBreadcrumbSeparator,
} from '@ecopages/radiant-ui/breadcrumb';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type BreadcrumbArgs = {
	label: string;
	separator: string;
};

export const meta = {
	args: {
		label: 'Breadcrumb',
		separator: '/',
	},
	argTypes: {
		label: { control: { type: 'text' } },
		separator: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiBreadcrumb label={args.label} separator={args.separator}>
			<RuiBreadcrumbList>
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/">Home</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/docs/button">Components</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbPage>Breadcrumb</RuiBreadcrumbPage>
				</RuiBreadcrumbItem>
			</RuiBreadcrumbList>
		</RuiBreadcrumb>
	),
} satisfies DocsMeta<BreadcrumbArgs>;

type Story = DocsStory<BreadcrumbArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'breadcrumb/default' } } });
