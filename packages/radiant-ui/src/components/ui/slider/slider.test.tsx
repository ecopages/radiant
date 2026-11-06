import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiSlider } from './slider';
import { RuiSlider as RuiSliderElement } from './slider.script';
void RuiSliderElement;

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
	await customElements.whenDefined('rui-slider');
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

function press(thumb: Element, key: string): void {
	thumb.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('RuiSlider range keyboard', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('stops End on the minimum thumb at minDistance and Home on the maximum thumb', async () => {
		const { host, cleanup } = mount(
			<RuiSlider variant="range" value={[10, 30]} min={0} max={50} step={5} minDistance={7} />,
		);
		await settled();

		const slider = host.querySelector('rui-slider') as RuiSliderElement;
		const minThumb = host.querySelector('[data-thumb="min"]')!;
		const maxThumb = host.querySelector('[data-thumb="max"]')!;

		press(minThumb, 'End');
		expect(slider.value).toEqual([20, 30]);

		press(maxThumb, 'Home');
		expect(slider.value).toEqual([20, 30]);
		cleanup();
	});
});
