import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/video-player.css';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { mountForm, trackListeners } from './mount-recipe';
import { describeVideoPlayerForm } from './video-player-shared';
import { until } from './until';

const video = (root: HTMLElement) => root.querySelector<HTMLVideoElement>('[data-video]')!;

afterEach(() => {
	vi.useRealTimers();
	document.body.innerHTML = '';
	syncExamples();
});

describe('video player (plain)', () => {
	test('removes every listener, the timer and the sound when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		try {
			const root = await mountForm('video-player', 'plain');
			await until(() =>
				expect(root.querySelector<HTMLElement & { disabled: boolean }>('[data-seek]')!.disabled).toBe(false),
			);
			await userEvent.click(root.querySelector('[data-playback]')!);
			await until(() => expect(video(root).paused).toBe(false));
			const player = video(root);

			root.remove();
			syncExamples();
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(player.paused).toBe(true);
			expect(player.hasAttribute('src')).toBe(false);
			expect(tracker.live(player, document, window, root.querySelector('[data-stage]')!)).toEqual([]);
		} finally {
			tracker.stop();
		}
		const again = await mountForm('video-player', 'plain');
		await until(() =>
			expect(again.querySelector<HTMLElement & { disabled: boolean }>('[data-seek]')!.disabled).toBe(false),
		);
	});

	test('stops the auto-hide timer when the element leaves while the controls are about to hide', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const root = await mountForm('video-player', 'plain');
		await until(() =>
			expect(root.querySelector<HTMLElement & { disabled: boolean }>('[data-seek]')!.disabled).toBe(false),
		);
		await userEvent.click(root.querySelector('[data-playback]')!);
		await until(() => expect(video(root).paused).toBe(false));
		const stage = root.querySelector('[data-stage]')!;
		await userEvent.hover(video(root), { position: { x: 8, y: 8 } });

		root.remove();
		syncExamples();
		vi.advanceTimersByTime(2800);

		expect(stage.hasAttribute('data-controls-hidden')).toBe(false);
	});
});

describeVideoPlayerForm('plain', {
	mount: () => mountForm('video-player', 'plain'),
	relocate: async (root) => {
		root.remove();
		syncExamples();
		document.body.append(root);
		syncExamples();
	},
	remove: async (root) => {
		root.remove();
		syncExamples();
	},
});
