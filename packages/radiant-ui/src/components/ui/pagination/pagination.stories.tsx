import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
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
 * Previous / `{page} / {count}` / next. Same chrome as viewports below 40rem.
 */
export const Compact: Story = {
	render: () => <RuiPagination class="rui-pagination--compact" label="Search result pages" page={4} pageCount={12} />,
};
