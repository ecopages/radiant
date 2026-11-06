import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { userEvent } from 'storybook/test';
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

describe('RuiSlider single thumb keyboard and pointer', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	async function mountSingle(value: number) {
		const { host, cleanup } = mount(<RuiSlider value={value} min={0} max={100} step={2} />);
		await settled();
		const slider = host.querySelector('rui-slider') as RuiSliderElement;
		const thumb = host.querySelector('[data-thumb]') as HTMLElement;
		return { host, slider, thumb, cleanup };
	}

	it('jumps to the bounds with Home and End', async () => {
		const { slider, thumb, cleanup } = await mountSingle(40);

		press(thumb, 'End');
		expect(slider.value).toEqual([100]);
		press(thumb, 'Home');
		expect(slider.value).toEqual([0]);
		cleanup();
	});

	it('moves ten steps with PageUp and PageDown and clamps at the bounds', async () => {
		const { slider, thumb, cleanup } = await mountSingle(40);

		press(thumb, 'PageUp');
		expect(slider.value).toEqual([60]);
		press(thumb, 'PageDown');
		press(thumb, 'PageDown');
		expect(slider.value).toEqual([20]);
		press(thumb, 'PageDown');
		press(thumb, 'PageDown');
		press(thumb, 'PageDown');
		expect(slider.value).toEqual([0]);
		cleanup();
	});

	it('drags the thumb along the track and emits rui-change', async () => {
		const { host, slider, thumb, cleanup } = await mountSingle(10);
		const track = host.querySelector('[data-ref="rangeTrack"]') as HTMLElement;
		const rect = track.getBoundingClientRect();
		const y = rect.top + rect.height / 2;
		const emissions: unknown[] = [];
		slider.addEventListener('rui-change', (event) => emissions.push((event as CustomEvent).detail));

		await userEvent.pointer([
			{ keys: '[MouseLeft>]', target: thumb, coords: { clientX: rect.left + rect.width * 0.1, clientY: y } },
			{ coords: { clientX: rect.left + rect.width * 0.8, clientY: y } },
			{ keys: '[/MouseLeft]' },
		]);

		expect(slider.value[0]).toBeGreaterThan(70);
		expect(emissions.length).toBeGreaterThan(0);
		cleanup();
	});
});
