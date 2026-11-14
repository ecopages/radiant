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

describe('RuiWindowSplitter input handling', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	async function mountSplitter(props: Record<string, unknown> = {}) {
		const view = mount(<RuiWindowSplitter primary="A" secondary="B" {...props} />);
		await settled();
		return {
			...view,
			splitter: view.host.querySelector('rui-window-splitter') as RuiWindowSplitterElement,
			separator: view.host.querySelector('[data-ref="separator"]') as HTMLElement,
			primary: view.host.querySelector('[data-ref="primary"]') as HTMLElement,
		};
	}

	it('falls back to 50 when value is not a number', async () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		host.innerHTML =
			'<rui-window-splitter value="abc"><div data-ref="root"><div data-ref="primary"></div><div data-ref="separator"></div><div data-ref="secondary"></div></div></rui-window-splitter>';
		await settled();

		const splitter = host.querySelector('rui-window-splitter') as RuiWindowSplitterElement;
		expect(splitter.value).toBe(50);
		expect(host.querySelector('[data-ref="separator"]')?.getAttribute('aria-valuenow')).toBe('50');
		expect((host.querySelector('[data-ref="primary"]') as HTMLElement).style.width).toBe('50%');
	});

	it('moves with arrow keys, Shift and Home/End in a horizontal split', async () => {
		const { splitter, separator, cleanup } = await mountSplitter();
		const press = (key: string, shiftKey = false) =>
			separator.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));

		press('ArrowRight');
		expect(splitter.value).toBe(52);
		press('ArrowLeft', true);
		expect(splitter.value).toBe(42);
		press('End');
		expect(splitter.value).toBe(80);
		press('Home');
		expect(splitter.value).toBe(20);
		cleanup();
	});

	it('uses Up/Down arrows in a vertical split and sizes by height', async () => {
		const { splitter, separator, primary, cleanup } = await mountSplitter({ orientation: 'vertical' });
		separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
		await settled();
		expect(splitter.value).toBe(52);
		expect(primary.style.height).toBe('52%');
		expect(primary.style.width).toBe('');
		separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		expect(splitter.value).toBe(52);
		cleanup();
	});

	it('clamps pointer drag and emits rui-splitter-change', async () => {
		const { splitter, separator, cleanup } = await mountSplitter();
		const details: number[] = [];
		splitter.addEventListener('rui-splitter-change', (e) => details.push((e as CustomEvent).detail.value));
		const rect = splitter.getBoundingClientRect();
		separator.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
		document.dispatchEvent(
			new PointerEvent('pointermove', { pointerId: 1, clientX: rect.left + rect.width * 0.65 }),
		);
		expect(splitter.value).toBeCloseTo(65, 0);
		document.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: rect.left + rect.width * 2 }));
		expect(splitter.value).toBe(80);
		document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
		expect(details.at(-1)).toBe(80);
		document.dispatchEvent(
			new PointerEvent('pointermove', { pointerId: 1, clientX: rect.left + rect.width * 0.3 }),
		);
		expect(splitter.value).toBe(80);
		cleanup();
	});

	it.each(['replaced', 'removed and added back later'])(
		'drags a separator that is %s after connect',
		async (change) => {
			const { splitter, separator, cleanup } = await mountSplitter();
			const fresh = separator.cloneNode(true) as HTMLElement;
			if (change === 'replaced') {
				separator.replaceWith(fresh);
			} else {
				const marker = document.createComment('');
				separator.replaceWith(marker);
				await settled();
				marker.replaceWith(fresh);
			}

			const rect = splitter.getBoundingClientRect();
			fresh.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
			document.dispatchEvent(
				new PointerEvent('pointermove', { pointerId: 1, clientX: rect.left + rect.width * 0.7 }),
			);
			document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));

			expect(splitter.value).toBeCloseTo(70, 0);
			cleanup();
		},
	);

	it('drags a separator that arrives after the host connected', async () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		root.render(<RuiWindowSplitter primary="A" secondary="B" />);
		await settled();
		const splitter = container.querySelector('rui-window-splitter') as RuiWindowSplitterElement;
		const children = [...splitter.childNodes];
		splitter.replaceChildren();
		document.body.append(splitter);
		splitter.append(...children);
		await settled();

		const separator = splitter.querySelector('[data-ref="separator"]') as HTMLElement;
		const rect = splitter.getBoundingClientRect();
		separator.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
		document.dispatchEvent(
			new PointerEvent('pointermove', { pointerId: 1, clientX: rect.left + rect.width * 0.7 }),
		);
		document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));

		expect(splitter.value).toBeCloseTo(70, 0);
		root.unmount();
	});
});
