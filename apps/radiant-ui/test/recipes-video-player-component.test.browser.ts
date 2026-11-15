import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/video-player.css';
import { mountComponent, trackListeners } from './mount-recipe';
import { describeVideoPlayerForm } from './video-player-shared';

type Slider = HTMLElement & { value: number[]; disabled: boolean };

const part = <T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string) =>
	root.querySelector<T>(selector)!;
const video = (root: HTMLElement) => part<HTMLVideoElement>(root, '[data-video]');
const mount = async () => {
	const root = await mountComponent('video-player');
	await expect.poll(() => root.querySelector('[data-stage]')).not.toBeNull();
	return root;
};
const ready = async (root: HTMLElement) => {
	await expect.poll(() => part<Slider>(root, '[data-seek]').disabled).toBe(false);
	return root;
};

const jsxTypes = new Set(['click', 'keydown', 'pointerdown', 'pointermove', 'pointerleave', 'dblclick', 'rui-change']);

afterEach(() => {
	document.body.innerHTML = '';
});

describe('video player (component)', () => {
	test('draws the stage once with the controls from the helpers, and a buffered layer inside the seek track', async () => {
		const root = await ready(await mount());

		expect(part(root, '[data-seek] .rui-slider__range-track [data-buffered]')).not.toBeNull();
		expect(part(root, '[data-seek] [role="slider"]').getAttribute('aria-label')).toBe('Seek');
		expect(part(root, '[data-volume] [data-volume-input] [role="slider"]')).not.toBeNull();
		expect(part(root, '[data-playback]').hasAttribute('data-toggle')).toBe(false);
		expect(part(root, '[data-stage]').hasAttribute('data-controls-hidden')).toBe(false);
	});

	test('the controls are not redrawn by the frames of a playing video, only the clock and the slider change', async () => {
		const root = await ready(await mount());
		const buttons = ['[data-playback]', '[data-mute]', '[data-rate]', '[data-captions]', '[data-fullscreen]'];
		const nodes = buttons.map((selector) => part(root, selector));
		await userEvent.click(part(root, '[data-playback]'));
		await expect.poll(() => part(root, '[data-stage]').getAttribute('data-state')).toBe('playing');
		await new Promise((resolve) => setTimeout(resolve, 50));
		const records: MutationRecord[] = [];
		const observer = new MutationObserver((batch) => records.push(...batch));
		for (const node of nodes) observer.observe(node, { attributes: true, childList: true, subtree: true });
		observer.observe(part(root, '[data-stage]'), { attributes: true });
		const before = part(root, '[data-elapsed]').textContent;

		await expect.poll(() => part(root, '[data-elapsed]').textContent, { timeout: 8000 }).not.toBe(before);
		observer.disconnect();

		expect(records).toEqual([]);
		expect(buttons.map((selector) => part(root, selector))).toEqual(nodes);
	});

	test('state changes redraw the pressed buttons, the speed and the stage in place', async () => {
		const root = await ready(await mount());
		const captions = part(root, '[data-captions]');
		const rate = part(root, '[data-rate]');
		const stage = part(root, '[data-stage]');

		await userEvent.click(captions);
		await userEvent.click(rate);
		await userEvent.click(part(root, '[data-mute]'));

		await expect.poll(() => captions.getAttribute('aria-pressed')).toBe('true');
		await expect.poll(() => rate.textContent).toBe('1.25x');
		await expect.poll(() => part(root, '[data-mute]').getAttribute('aria-pressed')).toBe('true');
		expect(part(root, '[data-captions]')).toBe(captions);
		expect(part(root, '[data-rate]')).toBe(rate);
		expect(part(root, '[data-stage]')).toBe(stage);
		expect(part(root, '[data-seek]').hasAttribute('disabled')).toBe(false);
		expect(part(root, '[data-buffered]').children.length).toBeGreaterThan(0);
	});

	test('a redraw keeps the seek position, the thumb text and the buffered bar', async () => {
		const root = await ready(await mount());
		stageFocus(root);
		await userEvent.keyboard('5');
		await expect.poll(() => video(root).currentTime).toBeCloseTo(6, 0);
		await userEvent.click(part(root, '[data-rate]'));
		await expect.poll(() => part(root, '[data-rate]').textContent).toBe('1.25x');

		expect(part<Slider>(root, '[data-seek]').value[0]).toBeCloseTo(6, 0);
		expect(part(root, '[data-seek] [role="slider"]').getAttribute('aria-valuetext')).toBe('0:06 of 0:12');
		expect(part(root, '[data-buffered]').children.length).toBeGreaterThan(0);
	});

	test('registers its cleanup once when it is created, however often it is moved', async () => {
		const root = await ready(await mount());
		const register = vi.spyOn(
			root as unknown as { registerCleanupCallback: () => void },
			'registerCleanupCallback',
		);

		for (let move = 0; move < 3; move += 1) {
			const holder = document.createElement('div');
			document.body.append(holder);
			holder.append(root);
			await new Promise((resolve) => setTimeout(resolve));
		}

		await ready(root);
		expect(register).not.toHaveBeenCalled();
	});

	test('does not read the document while it renders, so a render on the server works', async () => {
		const root = await ready(await mount());
		const fullscreen = vi.spyOn(document, 'fullscreenEnabled', 'get');

		part(root, '[data-rate]').click();
		await expect.poll(() => part(root, '[data-rate]').textContent).toBe('1.25x');

		expect(fullscreen).not.toHaveBeenCalled();
	});

	test('leaves no listener on the document or window, and only the JSX handlers on the nodes it drew', async () => {
		const tracker = trackListeners();
		try {
			const root = await ready(await mount());
			await userEvent.click(part(root, '[data-playback]'));
			await expect.poll(() => video(root).paused).toBe(false);
			const player = video(root);

			root.remove();
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(player.paused).toBe(true);
			expect(player.hasAttribute('src')).toBe(false);
			expect(tracker.live(document, window)).toEqual([]);
			const leftOnNodes = new Set(tracker.live().map((entry) => entry.split('|')[1]));
			expect([...leftOnNodes].filter((type) => !jsxTypes.has(type))).toEqual([]);
		} finally {
			tracker.stop();
		}
		const again = await ready(await mount());
		expect(part(again, '[data-stage]')).not.toBeNull();
	});
});

function stageFocus(root: HTMLElement): void {
	part(root, '[data-stage]').focus();
}

describeVideoPlayerForm('component', {
	mount,
	relocate: async (root) => {
		const holder = document.createElement('div');
		document.body.append(holder);
		holder.append(root);
		await new Promise((resolve) => setTimeout(resolve));
	},
	remove: async (root) => {
		root.remove();
		await new Promise((resolve) => setTimeout(resolve));
	},
});
