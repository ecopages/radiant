import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiGrid } from './grid';
import { RuiGrid as RuiGridElement } from './grid.script';
void RuiGridElement;

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-grid');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('RuiGrid', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	async function mountGrid() {
		const mounted = mount(
			<RuiGrid
				label="Schedule"
				rows={[
					['Mon', 'Tue', 'Wed'],
					['A', 'B', 'C'],
				]}
			/>,
		);
		await settled();
		const cells = Array.from(mounted.host.querySelectorAll<HTMLElement>('[role="gridcell"]'));
		return { ...mounted, cells };
	}

	const press = (target: HTMLElement, key: string) =>
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

	it('starts with the first cell as the only tab stop', async () => {
		const { cells, cleanup } = await mountGrid();

		expect(cells.map((cell) => cell.tabIndex)).toEqual([0, -1, -1, -1, -1, -1]);
		cleanup();
	});

	it('moves focus and the tab stop across rows and columns', async () => {
		const { cells, cleanup } = await mountGrid();

		cells[0].focus();
		press(cells[0], 'ArrowRight');
		expect(document.activeElement).toBe(cells[1]);
		press(cells[1], 'ArrowDown');
		expect(document.activeElement).toBe(cells[4]);
		press(cells[4], 'End');
		expect(document.activeElement).toBe(cells[5]);
		expect(cells.map((cell) => cell.tabIndex)).toEqual([-1, -1, -1, -1, -1, 0]);
		cleanup();
	});

	it('moves the tab stop to a cell focused without the keyboard', async () => {
		const { cells, cleanup } = await mountGrid();

		cells[3].focus();

		expect(cells.map((cell) => cell.tabIndex)).toEqual([-1, -1, -1, 0, -1, -1]);
		cleanup();
	});
});
