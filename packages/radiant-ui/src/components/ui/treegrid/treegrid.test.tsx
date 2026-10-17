import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable, type JsxRoot } from '@ecopages/jsx';
import { RuiTreegrid } from './treegrid';
import './treegrid.css';

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.append(host);
	const root: JsxRoot = createRoot(host);
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
	await Promise.resolve();
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('RuiTreegrid depth styling metadata', () => {
	it('derives arbitrary nesting depth for authored light-DOM rows', async () => {
		const { host, cleanup } = mount(
			<RuiTreegrid label="Files">
				<div role="row" data-row-id="root">
					<div role="gridcell">root</div>
				</div>
				<div role="rowgroup">
					<div role="row" data-row-id="child">
						<div role="gridcell">child</div>
					</div>
					<div role="rowgroup">
						<div role="row" data-row-id="grandchild">
							<div role="gridcell">grandchild</div>
						</div>
					</div>
				</div>
			</RuiTreegrid>,
		);

		await settled();

		const rows = ['root', 'child', 'grandchild'].map(
			(id) => host.querySelector(`[data-row-id="${id}"]`) as HTMLElement,
		);
		expect(rows.map((row) => row.dataset.depth)).toEqual(['0', '1', '2']);
		expect(rows.map((row) => row.style.getPropertyValue('--rui-treegrid-depth'))).toEqual(['0', '1', '2']);

		cleanup();
	});
});
