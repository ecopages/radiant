import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { RuiPagination } from './pagination';
import { RuiPagination as RuiPaginationElement } from './pagination.script';

const meta = {
	title: 'Components/Pagination',
	component: RuiPagination,
	parameters: {
		radiant: {
			element: RuiPaginationElement,
			cssImports: ['../../../styles/primitives.css', '../button/button.css', './pagination.css'],
		},
	},
} satisfies Meta<typeof RuiPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <RuiPagination label="Search result pages" page={4} pageCount={12} />,
	play: async ({ canvasElement, step }) => {
		const pagination = canvasElement.querySelector('rui-pagination') as HTMLElement & { page: number };
		const changes: number[] = [];
		pagination.addEventListener('rui-page-change', (event) => {
			changes.push((event as CustomEvent<{ page: number }>).detail.page);
		});

		await step('announces the current page and compresses distant page ranges', async () => {
			await expect(canvasElement.querySelector('nav')).toHaveAttribute('aria-label', 'Search result pages');
			await expect(canvasElement.querySelector('[aria-current="page"]')).toHaveTextContent('4');
			await expect(canvasElement.querySelectorAll('.rui-pagination__ellipsis')).toHaveLength(2);
		});

		await step('next and page controls emit the requested controlled page', async () => {
			await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]')!);
			await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[aria-label="Go to page 1"]')!);
			await expect(changes).toEqual([5, 1]);
		});
	},
};

export const Disabled: Story = {
	render: () => <RuiPagination page={1} pageCount={3} disabled />,
	play: async ({ canvasElement, step }) => {
		await step('disables unavailable and temporarily locked page navigation', async () => {
			await expect(canvasElement.querySelector('[aria-label="Go to previous page"]')).toBeDisabled();
			await expect(canvasElement.querySelector('[aria-label="Go to next page"]')).toBeDisabled();
		});
	},
};

/**
 * Previous / page position / next. Same chrome as viewports below 40rem.
 */
export const Compact: Story = {
	render: () => <RuiPagination class="rui-pagination--compact" label="Search result pages" page={4} pageCount={12} />,
	play: async ({ canvasElement, step }) => {
		await step('announces the compact page position politely', async () => {
			const status = canvasElement.querySelector('.rui-pagination__status') as HTMLElement;
			await expect(status.getAttribute('aria-live')).toBe('polite');
			await expect(status.textContent?.trim()).toBe('Page 4 of 12');
		});
		await step('requests navigation while preserving the controlled page', async () => {
			const pagination = canvasElement.querySelector('rui-pagination') as HTMLElement;
			const change = new Promise<number>((resolve) => {
				pagination.addEventListener(
					'rui-page-change',
					(event) => resolve((event as CustomEvent<{ page: number }>).detail.page),
					{ once: true },
				);
			});
			await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]')!);
			await expect(await change).toBe(5);
			await waitFor(() => expect(pagination.getAttribute('page')).toBe('4'));
		});
	},
};

/**
 * Each page control is a link to its address: it works without JavaScript and a router can prefetch it.
 */
export const Links: Story = {
	render: () => (
		<RuiPagination
			label="Search result pages"
			page={2}
			pageCount={5}
			getHref={(target) => `/list/page/${target}`}
		/>
	),
	play: async ({ canvasElement, step }) => {
		await step('renders each page control as a link to its page', async () => {
			const links = Array.from(canvasElement.querySelectorAll<HTMLAnchorElement>('a[data-pagination-page]'));
			await expect(links.map((link) => link.getAttribute('href'))).toEqual([
				'/list/page/1',
				'/list/page/1',
				'/list/page/2',
				'/list/page/3',
				'/list/page/4',
				'/list/page/5',
				'/list/page/3',
			]);
			await expect(canvasElement.querySelector('[aria-current="page"]')).toHaveAttribute('href', '/list/page/2');
		});
	},
};
