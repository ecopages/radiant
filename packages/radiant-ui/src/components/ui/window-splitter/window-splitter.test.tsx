import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiWindowSplitter } from './window-splitter';
import { RuiWindowSplitter as RuiWindowSplitterElement } from './window-splitter.script';
void RuiWindowSplitterElement;

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
	await Promise.resolve();
	await customElements.whenDefined('rui-window-splitter');
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

describe('RuiWindowSplitter value clamping', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it.each([
		[95, 80],
		[5, 20],
	])('clamps a written value of %i to %i everywhere', async (written, expected) => {
		const { host, cleanup } = mount(<RuiWindowSplitter primary="A" secondary="B" />);
		await settled();

		const splitter = host.querySelector('rui-window-splitter') as RuiWindowSplitterElement;
		const separator = host.querySelector('[data-ref="separator"]') as HTMLElement;
		const primary = host.querySelector('[data-ref="primary"]') as HTMLElement;

		splitter.value = written;
		await settled();

		expect(splitter.value).toBe(expected);
		expect(splitter.getAttribute('value')).toBe(String(expected));
		expect(separator.getAttribute('aria-valuenow')).toBe(String(expected));
		expect(primary.style.width).toBe(`${expected}%`);

		cleanup();
	});

	it('clamps an out-of-range initial value', async () => {
		const { host, cleanup } = mount(<RuiWindowSplitter primary="A" secondary="B" value={95} />);
		await settled();

		const separator = host.querySelector('[data-ref="separator"]') as HTMLElement;
		expect((host.querySelector('rui-window-splitter') as RuiWindowSplitterElement).value).toBe(80);
		expect(separator.getAttribute('aria-valuenow')).toBe('80');

		cleanup();
	});
});
