import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiForm } from '../form';
import { RuiForm as RuiFormElement } from '../form/form.script';
import { RuiField } from '../field';
import { RuiSlider } from './slider';
import { RuiSlider as RuiSliderElement } from './slider.script';
import type { FormStateStore } from '@/lib/form/form-state-store';
import type { FormContextValue } from '@/lib/form/form-context';
import { FormStore } from '@/lib/form/form-store';

void RuiFormElement;

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

/** A minimal injected store that records the values written to it. */
function recordingStore(): { store: FormStateStore; written: () => unknown } {
	let values: Record<string, unknown> = { level: [20] };
	let snapshot = { values, errors: {}, warnings: {} };
	const listeners = new Set<() => void>();
	const store: FormStateStore = {
		getValue: (path) => values[path],
		setValue(path, value) {
			values = { ...values, [path]: value };
			snapshot = { values, errors: {}, warnings: {} };
			for (const listener of [...listeners]) listener();
		},
		blur() {},
		reportNative() {},
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset() {},
		async validate() {
			return true;
		},
	};
	return { store, written: () => values.level };
}

async function settle(): Promise<void> {
	await customElements.whenDefined('rui-slider');
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

async function mountSlider(injected: boolean) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const { store, written } = recordingStore();
	root.render(
		<RuiForm defaultValues={{ level: [20] }} ref={(form) => (form && injected ? form.connect(store) : undefined)}>
			<RuiField name="level">
				<RuiSlider value={20} min={0} max={100} step={1} />
			</RuiField>
		</RuiForm>,
	);
	cleanups.push(() => {
		root.unmount();
		host.remove();
	});
	await settle();
	const form = host.querySelector('rui-form') as RuiFormElement;
	const slider = host.querySelector('rui-slider') as RuiSliderElement;
	const context = (form as unknown as { formProvider: { getContext(): FormContextValue } }).formProvider.getContext();
	const builtIn = context.store instanceof FormStore ? context.store : undefined;
	return { slider, stored: () => (injected ? written() : builtIn?.values.level) };
}

const modes: Array<[string, boolean]> = [
	['the built-in store', false],
	['an injected store', true],
];

describe.each(modes)('rui-slider in a rui-field with %s', (_label, injected) => {
	it('writes the new value after a keyboard step', async () => {
		const { slider, stored } = await mountSlider(injected);
		const thumb = slider.querySelector('[data-thumb]') as HTMLElement;

		thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		await settle();

		expect(slider.value).toEqual([21]);
		expect(stored()).toEqual([21]);
	});

	it('writes the released value after a drag', async () => {
		const { slider, stored } = await mountSlider(injected);
		const track = slider.querySelector('[data-ref="rangeTrack"]') as HTMLElement;
		const rect = track.getBoundingClientRect();
		const init = { bubbles: true, pointerId: 1, button: 0, clientY: rect.top + rect.height / 2 };

		track.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: rect.left + rect.width * 0.8 }));
		document.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: rect.left + rect.width * 0.8 }));
		await settle();

		expect(slider.value[0]).toBeGreaterThan(70);
		expect(stored()).toEqual(slider.value);
	});

	it('already holds the new value inside the rui-change listener', async () => {
		const { slider } = await mountSlider(injected);
		const seen: number[][] = [];
		slider.addEventListener('rui-change', () => seen.push([...slider.value]));
		const thumb = slider.querySelector('[data-thumb]') as HTMLElement;

		thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

		expect(seen).toEqual([[21]]);
	});

	it('restores the value and the store when a drag is cancelled', async () => {
		const { slider, stored } = await mountSlider(injected);
		const seen: number[][] = [];
		slider.addEventListener('rui-change', () => seen.push([...slider.value]));
		const track = slider.querySelector('[data-ref="rangeTrack"]') as HTMLElement;
		const rect = track.getBoundingClientRect();
		const init = { bubbles: true, pointerId: 1, button: 0, clientY: rect.top + rect.height / 2 };

		track.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: rect.left + rect.width * 0.8 }));
		expect(slider.value[0]).toBeGreaterThan(70);
		document.dispatchEvent(new PointerEvent('pointercancel', { ...init, clientX: rect.left + rect.width * 0.8 }));
		await settle();

		expect(slider.value).toEqual([20]);
		expect(seen.at(-1)).toEqual([20]);
		expect(stored()).toEqual([20]);
	});
});
