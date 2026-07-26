import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, fireEvent, userEvent } from 'storybook/test';
import { RuiTreegrid } from './treegrid';

const fileRows = [
	{
		id: 'src',
		cells: ['src', '—'],
		expanded: true,
		children: [
			{ id: 'index', cells: ['index.ts', '2.1 KB'] },
			{ id: 'app', cells: ['app.ts', '4.8 KB'] },
		],
	},
	{ id: 'readme', cells: ['README.md', '1.2 KB'] },
];

const orgRows = [
	{
		id: 'ceo',
		cells: ['Alex Rivera', 'CEO'],
		expanded: true,
		children: [
			{
				id: 'eng',
				cells: ['Engineering', 'Department'],
				expanded: true,
				children: [
					{ id: 'platform', cells: ['Platform', 'Team'] },
					{ id: 'product', cells: ['Product', 'Team'] },
				],
			},
			{ id: 'ops', cells: ['Operations', 'Department'] },
		],
	},
];

const meta = {
	title: 'Components/Treegrid',
	component: RuiTreegrid,
	args: {
		label: 'Files',
		columns: ['Name', 'Size'],
		rows: fileRows,
	},
} satisfies Meta<typeof RuiTreegrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const getCells = (canvas: HTMLElement) =>
	Array.from(canvas.querySelectorAll('[role="gridcell"][tabindex]')) as HTMLElement[];

export const FileBrowser: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-treegrid') as HTMLElement;
		const cells = getCells(canvasElement);

		await step('ArrowRight moves within a row even when the row is expandable', async () => {
			cells[0].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(cells[1]);
		});

		await step('ArrowLeft on a non-first cell moves left instead of collapsing', async () => {
			await userEvent.keyboard('{ArrowLeft}');
			await expect(document.activeElement).toBe(cells[0]);
			const srcRow = canvasElement.querySelector('[data-row-id="src"]') as HTMLElement;
			await expect(srcRow).toHaveAttribute('aria-expanded', 'true');
		});

		await step('ArrowDown moves to the same column in the next row', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toBe(cells[2]);
		});

		await step('Enter selects the focused row', async () => {
			fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter', code: 'Enter' });
			await expect(host).toHaveAttribute('value', 'index');
		});

		await step('ArrowLeft on the first cell of an expanded row collapses it', async () => {
			cells[0].focus();
			fireEvent.keyDown(cells[0], { key: 'ArrowLeft', code: 'ArrowLeft' });
			const srcRow = canvasElement.querySelector('[data-row-id="src"]') as HTMLElement;
			await expect(srcRow).toHaveAttribute('aria-expanded', 'false');
		});

		await step('clicking the first cell of a collapsed row expands it and selects', async () => {
			const srcRow = canvasElement.querySelector('[data-row-id="src"]') as HTMLElement;
			await userEvent.click(cells[0]);
			await expect(srcRow).toHaveAttribute('aria-expanded', 'true');
			await expect(host).toHaveAttribute('value', 'src');
		});

		await step('setting .value programmatically updates aria-selected and roving tabindex', async () => {
			(host as HTMLElement & { value: string }).value = 'readme';
			const readmeRowCells = Array.from(
				canvasElement.querySelectorAll('[data-row-id="readme"] [role="gridcell"]'),
			) as HTMLElement[];
			const indexCell = canvasElement.querySelector('[data-row-id="index"] [role="gridcell"]') as HTMLElement;
			for (const cell of readmeRowCells) {
				await expect(cell).toHaveAttribute('aria-selected', 'true');
			}
			await expect(indexCell).toHaveAttribute('aria-selected', 'false');
			await expect(readmeRowCells.some((cell) => cell.getAttribute('tabindex') === '0')).toBe(true);
		});
	},
};

export const OrgChart: Story = {
	args: {
		label: 'Organization',
		columns: ['Name', 'Role'],
		rows: orgRows,
	},
	play: async ({ canvasElement, step }) => {
		await step('ArrowLeft collapses an expanded parent row', async () => {
			const engCell = canvasElement.querySelector('[data-row-id="eng"] [role="gridcell"]') as HTMLElement;
			engCell.focus();
			fireEvent.keyDown(engCell, { key: 'ArrowLeft', code: 'ArrowLeft' });
			const engRow = canvasElement.querySelector('[data-row-id="eng"]') as HTMLElement;
			await expect(engRow).toHaveAttribute('aria-expanded', 'false');
		});
	},
};
