import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/audio-player.css';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { barsFollow, barsRest, coverage, describeAudioPlayerForm, playToEnd } from './audio-player-shared';
import { mountController, trackListeners } from './mount-recipe';

type Slider = HTMLElement & { value: number[]; disabled: boolean };

/** Moves a slider the way a pointer does: it takes the new position and reports it with `rui-change`. */
function drag(slider: Slider, value: number): void {
	slider.value = [value];
	slider.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, composed: true, detail: { value: [value] } }));
}

const names = (root: HTMLElement) =>
	[...root.querySelectorAll('[data-track] [data-name]')].map((node) => node.textContent);
const audio = (root: HTMLElement) => root.querySelector<HTMLAudioElement>('[data-audio]')!;
const current = (root: HTMLElement) => root.querySelector('[data-track][aria-current="true"] [data-name]')?.textContent;
const track = (root: HTMLElement, name: string) =>
	[...root.querySelectorAll<HTMLElement>('[data-track]')].find((row) => row.textContent?.includes(name))!;

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

describe('audio player (controller)', () => {
	test('loads the first track, paused, with the clock and title filled in', async () => {
		const root = await mountController('audio-player');

		await expect.poll(() => root.querySelector<Slider>('[data-seek]')!.disabled).toBe(false);
		expect(current(root)).toBe('Morning Light');
		expect(root.querySelector('[data-title]')!.textContent).toBe('Morning Light');
		expect(audio(root).paused).toBe(true);
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-pressed')).toBe('false');
	});

	test('Play starts the track and mirrors it into the button, the status and the clock', async () => {
		const root = await mountController('audio-player');

		await userEvent.click(root.querySelector('[data-playback]')!);

		await expect.poll(() => audio(root).paused).toBe(false);
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-label')).toBe('Play');
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-pressed')).toBe('true');
		expect(root.querySelector('[data-status]')!.textContent).toBe('Playing Morning Light');
		await userEvent.click(root.querySelector('[data-playback]')!);
		await expect.poll(() => audio(root).paused).toBe(true);
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-label')).toBe('Play');
	});

	test('choosing a track with a click or Enter plays it, and Next and Previous wrap', async () => {
		const root = await mountController('audio-player');

		await userEvent.click(track(root, 'Neon Rain'));
		await expect.poll(() => current(root)).toBe('Neon Rain');
		await expect.poll(() => audio(root).paused).toBe(false);

		await userEvent.click(root.querySelector('[data-next]')!);
		expect(current(root)).toBe('Paper Planes');
		await userEvent.click(root.querySelector('[data-next]')!);
		expect(current(root)).toBe('Morning Light');
		await userEvent.click(root.querySelector('[data-previous]')!);
		expect(current(root)).toBe('Paper Planes');

		track(root, 'Low Tide').focus();
		await userEvent.keyboard('{Enter}');
		expect(current(root)).toBe('Low Tide');
	});

	test('the keyboard lifts a track, moves it and renumbers the list while the current track keeps playing', async () => {
		const root = await mountController('audio-player');
		await userEvent.click(track(root, 'Morning Light'));
		await expect.poll(() => audio(root).paused).toBe(false);

		track(root, 'Low Tide').focus();
		await userEvent.keyboard(' {ArrowUp} ');

		expect(names(root)).toEqual(['Low Tide', 'Morning Light', 'Neon Rain', 'Paper Planes']);
		expect([...root.querySelectorAll('[data-number]')].map((node) => node.textContent)).toEqual([
			'1',
			'2',
			'3',
			'4',
		]);
		expect(current(root)).toBe('Morning Light');
		expect(audio(root).paused).toBe(false);
		expect(document.activeElement).toBe(track(root, 'Low Tide'));
	});

	test('a pointer drag reorders the playlist', async () => {
		const root = await mountController('audio-player');

		await userEvent.dragAndDrop(track(root, 'Morning Light'), track(root, 'Paper Planes'));

		expect(names(root)).toHaveLength(4);
		expect(names(root).indexOf('Morning Light')).toBeGreaterThan(0);
		expect([...root.querySelectorAll('[data-number]')].map((node) => node.textContent)).toEqual([
			'1',
			'2',
			'3',
			'4',
		]);
		expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();
	});

	test('seeking moves the playback position and the volume input sets the volume', async () => {
		const root = await mountController('audio-player');
		const seek = root.querySelector<Slider>('[data-seek]')!;
		await expect.poll(() => seek.disabled).toBe(false);

		drag(seek, audio(root).duration / 2);
		const volume = root.querySelector<Slider>('[data-volume-input]')!;
		drag(volume, 0.3);

		await expect.poll(() => audio(root).currentTime).toBeCloseTo(audio(root).duration / 2, 0);
		expect(audio(root).volume).toBeCloseTo(0.3);
	});

	test('rapid seek input previews the clock at once and applies one seek, to the last value, after it idles', async () => {
		const root = await mountController('audio-player');
		const seek = root.querySelector<Slider>('[data-seek]')!;
		const elapsed = root.querySelector('[data-elapsed]')!;
		await expect.poll(() => seek.disabled).toBe(false);
		const seeks: number[] = [];
		audio(root).addEventListener('seeking', () => seeks.push(audio(root).currentTime));

		for (const value of ['0.2', '0.4', '0.6', '0.75']) {
			drag(seek, Number(value) * audio(root).duration);
		}

		expect(elapsed.textContent).toBe(`0:0${Math.floor(0.75 * audio(root).duration)}`);
		expect(seeks).toEqual([]);
		audio(root).dispatchEvent(new Event('timeupdate'));
		expect(seek.value[0]).toBeCloseTo(0.75 * audio(root).duration, 1);
		expect(elapsed.textContent).toBe(`0:0${Math.floor(0.75 * audio(root).duration)}`);

		await expect.poll(() => seeks.length).toBe(1);
		expect(seeks[0]).toBeCloseTo(0.75 * audio(root).duration, 0);
	});

	test('cancels a pending seek when the element leaves the page', async () => {
		const root = await mountController('audio-player');
		const seek = root.querySelector<Slider>('[data-seek]')!;
		await expect.poll(() => seek.disabled).toBe(false);
		const player = audio(root);
		const seeks: number[] = [];
		player.addEventListener('seeking', () => seeks.push(player.currentTime));

		drag(seek, audio(root).duration / 2);
		root.remove();
		await new Promise((resolve) => setTimeout(resolve, 250));

		expect(seeks).toEqual([]);
	});

	test('removes every listener and stops the sound when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		try {
			const root = await mountController('audio-player');
			await userEvent.click(root.querySelector('[data-playback]')!);
			await expect.poll(() => audio(root).paused).toBe(false);
			const player = audio(root);

			root.remove();
			await new Promise((resolve) => setTimeout(resolve));

			expect(player.paused).toBe(true);
			expect(player.hasAttribute('src')).toBe(false);
			expect(tracker.live(player, root, document, window)).toEqual([]);
		} finally {
			tracker.stop();
		}
		const again = await mountController('audio-player');
		await expect.poll(() => current(again)).toBe('Morning Light');
	});
	test('revokes the blob URLs and removes the cover canvas when the element leaves the page', async () => {
		const revoked: string[] = [];
		const revoke = URL.revokeObjectURL;
		URL.revokeObjectURL = (url) => {
			revoked.push(url);
			revoke(url);
		};
		try {
			const root = await mountController('audio-player');
			await expect.poll(() => audio(root).src).toMatch(/^blob:/);
			const source = audio(root).src;
			await userEvent.click(root.querySelector('[data-playback]')!);
			await expect.poll(() => audio(root).paused).toBe(false);
			await expect.poll(() => root.querySelector('[data-cover] canvas')).not.toBeNull();

			root.remove();
			await new Promise((resolve) => setTimeout(resolve));

			expect(revoked).toContain(source);
			expect(root.querySelector('[data-cover] canvas')).toBeNull();
		} finally {
			URL.revokeObjectURL = revoke;
		}
	});
	test('when a track ends the next one starts, and the last one stops the playlist', async () => {
		const root = await mountController('audio-player');
		await userEvent.click(track(root, 'Paper Planes'));
		await expect.poll(() => audio(root).paused).toBe(false);

		await playToEnd(audio(root));
		await expect.poll(() => root.querySelector('[data-status]')!.textContent).toBe('End of the playlist');
		expect(current(root)).toBe('Paper Planes');

		await userEvent.click(track(root, 'Low Tide'));
		await expect.poll(() => audio(root).paused).toBe(false);
		await playToEnd(audio(root));
		await expect.poll(() => current(root)).toBe('Neon Rain');
		await expect.poll(() => audio(root).paused).toBe(false);
	});
	test('the cover bars follow the sound while it plays and return to rest when it pauses', async () => {
		const root = await mountController('audio-player');
		await expect.poll(() => root.querySelector('[data-cover] canvas')).not.toBeNull();
		await expect.poll(() => coverage(root)).toBeGreaterThan(0);
		const rest = coverage(root);

		await userEvent.click(root.querySelector('[data-playback]')!);
		await barsFollow(root, rest);

		await userEvent.click(root.querySelector('[data-playback]')!);
		await barsRest(root, rest);
	});
	test('plays from a blob so seeking works without range support, and seeks on the first track', async () => {
		const root = await mountController('audio-player');
		const seek = root.querySelector<Slider>('[data-seek]')!;

		await expect.poll(() => audio(root).src).toMatch(/^blob:/);
		await expect.poll(() => seek.disabled).toBe(false);
		drag(seek, audio(root).duration / 2);

		await expect.poll(() => audio(root).currentTime).toBeCloseTo(audio(root).duration / 2, 0);
	});
	test('the seek position follows the playback on every frame, and stops moving when paused', async () => {
		const root = await mountController('audio-player');
		const seek = root.querySelector<Slider>('[data-seek]')!;
		await expect.poll(() => seek.disabled).toBe(false);
		const positions = new Set<number>();
		const sample = async (milliseconds: number) => {
			const end = performance.now() + milliseconds;
			while (performance.now() < end) {
				positions.add(seek.value[0]);
				await new Promise((resolve) => requestAnimationFrame(resolve));
			}
		};

		await userEvent.click(root.querySelector('[data-playback]')!);
		await expect.poll(() => audio(root).paused).toBe(false);
		await sample(1000);

		expect(positions.size).toBeGreaterThanOrEqual(15);

		await userEvent.click(root.querySelector('[data-playback]')!);
		await expect.poll(() => audio(root).paused).toBe(true);
		positions.clear();
		await sample(300);

		expect(positions.size).toBeLessThanOrEqual(1);
	});
});

describeAudioPlayerForm('controller', {
	mount: () => mountController('audio-player'),
	relocate: async (root) => {
		const holder = document.createElement('div');
		document.body.append(holder);
		holder.append(root);
		await new Promise((resolve) => setTimeout(resolve, 50));
	},
	remove: async (root) => {
		root.remove();
		await new Promise((resolve) => setTimeout(resolve));
	},
});
