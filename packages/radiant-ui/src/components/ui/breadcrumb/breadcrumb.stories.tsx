import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import {
	RuiBreadcrumb,
	RuiBreadcrumbEllipsis,
	RuiBreadcrumbItem,
	RuiBreadcrumbLink,
	RuiBreadcrumbList,
	RuiBreadcrumbPage,
	RuiBreadcrumbSeparator,
} from './breadcrumb';
import { RuiBreadcrumb as RuiBreadcrumbElement } from './breadcrumb.script';

const HomeIcon = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
		<path d="M9 22V12h6v10" />
	</svg>
);

const meta = {
	title: 'Components/Breadcrumb',
	component: RuiBreadcrumb,
	args: {
		label: 'Breadcrumb',
		separator: '/',
	},
};
radiantMeta(meta, { element: RuiBreadcrumbElement, stylesheets: ['./breadcrumb.css'] });

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<RuiBreadcrumb {...args}>
			<RuiBreadcrumbList>
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/">Home</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/products">Products</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbPage>Radiant UI</RuiBreadcrumbPage>
				</RuiBreadcrumbItem>
			</RuiBreadcrumbList>
		</RuiBreadcrumb>
	),
	play: async ({ canvasElement, step }) => {
		await step('exposes a navigation landmark labeled Breadcrumb', async () => {
			const nav = canvasElement.querySelector('nav');
			await expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
		});

		await step('marks the current page with aria-current=page', async () => {
			const current = canvasElement.querySelector('[aria-current="page"]');
			await expect(current).toHaveTextContent('Radiant UI');
		});

		await step('ancestor crumbs are links', async () => {
			const links = canvasElement.querySelectorAll('a');
			await expect(links).toHaveLength(2);
			await expect(links[0]).toHaveAttribute('href', '/');
			await expect(links[1]).toHaveAttribute('href', '/products');
		});
	},
};

export const WithEllipsis: Story = {
	args: {
		separator: '/',
	},
	render: (args) => (
		<RuiBreadcrumb {...args}>
			<RuiBreadcrumbList>
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/">Home</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbEllipsis />
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/components">Components</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbPage>Breadcrumb</RuiBreadcrumbPage>
				</RuiBreadcrumbItem>
			</RuiBreadcrumbList>
		</RuiBreadcrumb>
	),
};

export const ChevronSeparator: Story = {
	args: {
		separator: '>',
	},
	render: (args) => (
		<RuiBreadcrumb {...args}>
			<RuiBreadcrumbList>
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/">Home</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/docs">Docs</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbPage>Breadcrumb</RuiBreadcrumbPage>
				</RuiBreadcrumbItem>
			</RuiBreadcrumbList>
		</RuiBreadcrumb>
	),
};

/** Icon-only home link — shows free composition inside `RuiBreadcrumbLink`. */
export const WithHomeIcon: Story = {
	render: (args) => (
		<RuiBreadcrumb {...args}>
			<RuiBreadcrumbList>
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/" aria-label="Home">
						<HomeIcon />
					</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/products">Products</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbPage>Radiant UI</RuiBreadcrumbPage>
				</RuiBreadcrumbItem>
			</RuiBreadcrumbList>
		</RuiBreadcrumb>
	),
};
