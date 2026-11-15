import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/video-player.css';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { mountController, trackListeners } from './mount-recipe';
import { describeVideoPlayerForm } from './video-player-shared';

type Slider = HTMLElement & { disabled: boolean };

const video = (root: HTMLElement) => root.querySelector<HTMLVideoElement>('[data-video]')!;
const ready = (root: HTMLElement) => expect.poll(() => root.querySelector<Slider>('[data-seek]')!.disabled).toBe(false);
const macrotask = (milliseconds = 0) => new Promise((resolve) => setTimeout(resolve, milliseconds));

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

describe('video player (controller)', () => {
	test('removes every listener, the timer and the sound when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		try {
			const root = await mountController('video-player');
			await ready(root);
			await userEvent.click(root.querySelector('[data-playback]')!);
			await expect.poll(() => video(root).paused).toBe(false);
			const player = video(root);
			const stage = root.querySelector('[data-stage]')!;

			root.remove();
			await macrotask(50);

			expect(player.paused).toBe(true);
			expect(player.hasAttribute('src')).toBe(false);
			expect(tracker.live(player, root, stage, document, window)).toEqual([]);
		} finally {
			tracker.stop();
		}
		const again = await mountController('video-player');
		await ready(again);
	});

	test('stops the auto-hide timer when the element leaves while the controls are about to hide', async () => {
		const root = await mountController('video-player');
		await ready(root);
		await userEvent.click(root.querySelector('[data-playback]')!);
		await expect.poll(() => video(root).paused).toBe(false);
		const stage = root.querySelector('[data-stage]')!;
		await userEvent.hover(video(root), { position: { x: 8, y: 8 } });

		root.remove();
		await macrotask(2800);

		expect(stage.hasAttribute('data-controls-hidden')).toBe(false);
	}, 10000);

	test('a move to another parent keeps one working player: it loads again and the listeners are not doubled', async () => {
		const root = await mountController('video-player');
		await ready(root);
		const holder = document.createElement('div');
		document.body.append(holder);

		holder.append(root);
		await macrotask(50);
		await ready(root);
		await expect.poll(() => video(root).src).toMatch(/^blob:/);
		const toggles: boolean[] = [];
		video(root).addEventListener('play', () => toggles.push(true));
		video(root).addEventListener('pause', () => toggles.push(false));
		await userEvent.click(root.querySelector('[data-playback]')!);

		await expect.poll(() => video(root).paused).toBe(false);
		expect(toggles).toEqual([true]);
		expect(root.querySelector('[data-stage]')!.getAttribute('data-state')).toBe('playing');
	});
});

describeVideoPlayerForm('controller', {
	mount: () => mountController('video-player'),
	relocate: async (root) => {
		const holder = document.createElement('div');
		document.body.append(holder);
		holder.append(root);
		await macrotask(50);
	},
	remove: async (root) => {
		root.remove();
		await macrotask();
	},
});
