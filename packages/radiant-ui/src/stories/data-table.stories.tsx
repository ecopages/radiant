import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, fireEvent, spyOn, userEvent, waitFor, within } from 'storybook/test';
import { RuiDataTable } from './fixtures/data-table';
import './fixtures/data-table';
import { createHandlers } from './fixtures/handlers.msw';

const meta = {
	title: 'Examples/Data Table',
	parameters: {
		radiant: {
			cssImports: [
				'../styles/styles.css',
				'./fixtures/data-table.css',
				'../components/ui/input-group/input-group.css',
				'../components/ui/pagination/pagination.css',
				'../components/ui/checkbox/checkbox.css',
				'../components/ui/button/button.css',
				'../components/ui/dialog/dialog.css',
				'../components/ui/table/table.css',
				'../components/ui/menu-button/menu-button.css',
				'../components/ui/popover/popover.css',
			],
		},
	},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function watchRangeDriftWarnings() {
	const warnings: string[] = [];
	const spy = spyOn(console, 'warn').mockImplementation((message) => {
		if (String(message).includes('mutated outside Radiant JSX control')) {
			warnings.push(String(message));
		}
	});
	return {
		assertClean: () => expect(warnings).toEqual([]),
		restore: () => spy.mockRestore(),
	};
}

export const Default: Story = {
	beforeEach({ msw }) {
		msw.use(...createHandlers());
	},
	render: () => <rui-data-table />,
	play: async ({ canvasElement, step }) => {
		const drift = watchRangeDriftWarnings();
		const canvas = within(canvasElement);
		await step('loads the mock inventory', async () => {
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(5));
			await expect(canvasElement).toHaveTextContent('1–5 of 26 cheeses');
			await expect(canvasElement.querySelector('.rui-input-group [data-table-search]')).toBeInTheDocument();
			await expect(canvas.getByRole('button', { name: 'Go to page 6' })).toBeVisible();
		});

		await step('paginates through multiple server-backed pages with a header loading state', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Go to next page' }));
			await expect(canvasElement.querySelector('[data-table-refreshing]')).not.toHaveAttribute('hidden');
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(5));
			await expect(canvasElement).toHaveTextContent('6–10 of 26 cheeses');
			await userEvent.click(canvas.getByRole('button', { name: 'Go to previous page' }));
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(5));
			await waitFor(() =>
				expect(canvasElement.querySelector('[data-table-refreshing]')).toHaveAttribute('hidden'),
			);
		});

		await step('changes the number of server-backed entries shown per page', async () => {
			await userEvent.click(canvas.getByRole('combobox', { name: 'Cheeses per page' }));
			await userEvent.click(within(document.body).getByRole('option', { name: '10' }));
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(10));
			await expect(canvasElement).toHaveTextContent('1–10 of 26 cheeses');
		});

		await step('search and filters show the no-results state', async () => {
			const search = canvas.getByLabelText('Search cheeses');
			await userEvent.type(search, 'brie');
			await waitFor(() =>
				expect((canvasElement.querySelector('rui-data-table') as RuiDataTable).filters.search).toBe('brie'),
			);
			expect(canvas.getByLabelText('Search cheeses')).toBe(search);
			await expect(search).toHaveFocus();
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(1));
			await expect(canvas.getByText('Brie')).toBeVisible();
			await userEvent.click(canvas.getByRole('button', { name: 'Filters' }));
			await userEvent.click(within(document.body).getByRole('checkbox', { name: 'Sheep' }));
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(0));
			await expect(canvas.getByText('No cheeses match the active filters.')).toBeVisible();
			await expect(canvasElement).toHaveTextContent('0–0 of 0 cheeses');
		});

		await step('clear filters resets search, checkbox filters, and pagination', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }));
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(10));
			await expect(canvas.getByLabelText('Search cheeses')).toHaveValue('');
			await expect(canvas.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
		});

		await step('sorts the server-backed collection', async () => {
			await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[data-table-sort="name"]')!);
			await expect(canvasElement.querySelector('[data-table-column="name"]')).toHaveAttribute(
				'aria-sort',
				'descending',
			);
			await waitFor(() =>
				expect(canvasElement.querySelector('[data-table-refreshing]')).toHaveAttribute('hidden'),
			);
			await expect(
				Array.from(canvasElement.querySelectorAll('[data-table-row]')).map((row) =>
					row.getAttribute('data-table-row'),
				),
			).toEqual([
				'taleggio',
				'stilton',
				'roquefort',
				'reblochon',
				'raclette',
				'pecorino',
				'parmigiano',
				'mozzarella',
				'mimolette',
				'manchego',
			]);
		});

		await step('adds a cheese and refreshes the current server page', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Add cheese' }));
			const name = within(document.body).getByPlaceholderText('Cheese name');
			await userEvent.type(name, 'Tomme de Savoie');
			await userEvent.click(within(document.body).getByRole('button', { name: 'Create cheese' }));
			await waitFor(() => expect(canvasElement).toHaveTextContent('1–10 of 27 cheeses'));
			const search = canvas.getByLabelText('Search cheeses');
			await userEvent.type(search, 'tomme de savoie');
			await waitFor(() => expect(canvasElement).toHaveTextContent('Tomme de Savoie'));
		});

		await step('edits and deletes through mock endpoints', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Actions for Tomme de Savoie' }));
			await userEvent.click(within(document.body).getByRole('menuitem', { name: 'Edit' }));
			await waitFor(() =>
				expect(within(document.body).getByRole('dialog', { name: 'Edit cheese' })).toBeVisible(),
			);
			const editorDialog = within(document.body).getByRole('dialog', { name: 'Edit cheese' });
			const editorName = within(editorDialog).getByPlaceholderText('Cheese name');
			await userEvent.clear(editorName);
			fireEvent.input(editorName, { target: { value: 'Tomme de Bauges' } });
			await userEvent.click(within(editorDialog).getByRole('button', { name: 'Save changes' }));
			await waitFor(() => expect(canvas.getByText('No cheeses match the active filters.')).toBeVisible());
			await userEvent.clear(canvas.getByLabelText('Search cheeses'));
			await waitFor(() => expect(canvasElement).toHaveTextContent('Tomme de Bauges'));

			await userEvent.click(canvas.getByRole('button', { name: 'Actions for Tomme de Bauges' }));
			await userEvent.click(within(document.body).getByRole('menuitem', { name: 'Delete' }));
			await userEvent.click(within(document.body).getByRole('button', { name: 'Delete' }));
			await waitFor(() => expect(canvasElement).not.toHaveTextContent('Tomme de Bauges'));
		});

		drift.assertClean();
		drift.restore();
	},
};

export const Loading: Story = {
	beforeEach({ msw }) {
		msw.use(...createHandlers(250));
	},
	render: () => <rui-data-table />,
	play: async ({ canvasElement, step }) => {
		await step('announces the initial loading state before data arrives', async () => {
			await expect(canvasElement.querySelector('[role="grid"]')).toHaveAttribute('aria-busy', 'true');
			await expect(within(canvasElement).getByText('Loading cheeses…')).toBeVisible();
		});
	},
};

export const ExternalFilters: Story = {
	beforeEach({ msw }) {
		msw.use(...createHandlers());
	},
	render: () => <rui-data-table filters={{ milk: 'Sheep', texture: 'Soft' }} />,
	play: async ({ canvasElement, step }) => {
		const demo = canvasElement.querySelector('rui-data-table') as RuiDataTable;

		await step('initializes from an externally supplied filters object', async () => {
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(1));
			await expect(canvasElement).toHaveTextContent('Feta');
		});

		await step('accepts externally replaced filters without local state hydration', async () => {
			demo.filters = { origin: 'Switzerland' };
			await waitFor(() => expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(4));
			await expect(canvasElement).toHaveTextContent('Emmental');
		});
	},
};
