import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiGrid } from './grid';
import { RuiGrid as RuiGridElement } from './grid.script';

const meta = {
	title: 'Components/Grid',
	component: RuiGrid,
	args: {
		label: 'Schedule',
		rows: [
			['Mon', 'Tue', 'Wed'],
			['A', 'B', 'C'],
		],
	},
};
radiantMeta(meta, { element: RuiGridElement, stylesheets: ['./grid.css'] });

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const cells = Array.from(canvasElement.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		await step('ArrowRight moves within a row', async () => {
			cells[0].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(cells[1]);
		});
	},
};
