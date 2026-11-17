import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/video-player.css';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { mountForm, trackListeners } from './mount-recipe';
import { describeVideoPlayerForm } from './video-player-shared';
import { until } from './until';

type Slider = HTMLElement & { disabled: boolean };

const video = (root: HTMLElement) => root.querySelector<HTMLVideoElement>('[data-video]')!;
const seek = (root: HTMLElement) => root.querySelector<Slider>('[data-seek]')!;
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

describe('video player (element)', () => {
	test('removes every listener, the timer and the sound when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		try {
			const root = await mountForm('video-player', 'radiant');
			await until(() => expect(seek(root).disabled).toBe(false));
			await userEvent.click(root.querySelector('[data-playback]')!);
			await until(() => expect(video(root).paused).toBe(false));
			const player = video(root);

			root.remove();
			await wait(50);

			expect(player.paused).toBe(true);
			expect(player.hasAttribute('src')).toBe(false);
			expect(tracker.live(player, document, window, root.querySelector('[data-stage]')!, root)).toEqual([]);
		} finally {
			tracker.stop();
		}
		const again = await mountForm('video-player', 'radiant');
		await until(() => expect(seek(again).disabled).toBe(false));
	});

	test('stops the auto-hide timer when the element leaves while the controls are about to hide', async () => {
		const root = await mountForm('video-player', 'radiant');
		await until(() => expect(seek(root).disabled).toBe(false));
		await userEvent.click(root.querySelector('[data-playback]')!);
		await until(() => expect(video(root).paused).toBe(false));
		const stage = root.querySelector('[data-stage]')!;
		await userEvent.hover(video(root), { position: { x: 8, y: 8 } });

		root.remove();
		await wait(2800);

		expect(stage.hasAttribute('data-controls-hidden')).toBe(false);
	}, 10000);

	test('moving the element keeps the clip loaded and the same video element, and playback restarts paused', async () => {
		const root = await mountForm('video-player', 'radiant');
		await until(() => expect(seek(root).disabled).toBe(false));
		await userEvent.click(root.querySelector('[data-playback]')!);
		await until(() => expect(video(root).paused).toBe(false));
		const player = video(root);

		const holder = document.createElement('div');
		document.body.append(holder);
		holder.append(root);
		await wait(100);

		await until(() => expect(seek(root).disabled).toBe(false));
		expect(video(root)).toBe(player);
		expect(player.src).toMatch(/^blob:/);
		expect(root.querySelector('[data-stage]')!.getAttribute('data-state')).toBe('paused');
	});
});

const relocate = async (root: HTMLElement) => {
	const holder = document.createElement('div');
	document.body.append(holder);
	holder.append(root);
	await wait(0);
};
describeVideoPlayerForm('element', {
	mount: () => mountForm('video-player', 'radiant'),
	relocate,
	remove: async (root) => {
		root.remove();
		await wait(0);
	},
});
