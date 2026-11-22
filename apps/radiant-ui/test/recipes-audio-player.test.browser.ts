import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/audio-player.css';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { barsFollow, barsRest, coverage, describeAudioPlayerForm, playToEnd } from './audio-player-shared';
import { mountForm, trackListeners } from './mount-recipe';
import { until, untilFrame, once } from './until';

type Slider = HTMLElement & { value: number[]; disabled: boolean };

/** Moves a slider the way a pointer does: it takes the new position and dispatches `input`. */
function drag(slider: Slider, value: number): void {
	slider.value = [value];
	slider.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
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

describe('audio player (plain)', () => {
	test('loads the first track, paused, with the clock and title filled in', async () => {
		const root = await mountForm('audio-player', 'plain');

		await until(() => expect(root.querySelector<Slider>('[data-seek]')!.disabled).toBe(false));
		expect(current(root)).toBe('Morning Light');
		expect(root.querySelector('[data-title]')!.textContent).toBe('Morning Light');
		expect(audio(root).paused).toBe(true);
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-pressed')).toBe('false');
	});

	test('Play starts the track and mirrors it into the button, the status and the clock', async () => {
		const root = await mountForm('audio-player', 'plain');

		await userEvent.click(root.querySelector('[data-playback]')!);

		await until(() => expect(audio(root).paused).toBe(false));
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-label')).toBe('Play');
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-pressed')).toBe('true');
		expect(root.querySelector('[data-status]')!.textContent).toBe('Playing Morning Light');
		await userEvent.click(root.querySelector('[data-playback]')!);
		await until(() => expect(audio(root).paused).toBe(true));
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-label')).toBe('Play');
	});

	test('choosing a track with a click or Enter plays it, and Next and Previous wrap', async () => {
		const root = await mountForm('audio-player', 'plain');

		await userEvent.click(track(root, 'Neon Rain'));
		await until(() => expect(current(root)).toBe('Neon Rain'));
		await until(() => expect(audio(root).paused).toBe(false));

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
		const root = await mountForm('audio-player', 'plain');
		await userEvent.click(track(root, 'Morning Light'));
		await until(() => expect(audio(root).paused).toBe(false));

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
		const root = await mountForm('audio-player', 'plain');

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
		const root = await mountForm('audio-player', 'plain');
		const seek = root.querySelector<Slider>('[data-seek]')!;
		await until(() => expect(seek.disabled).toBe(false));

		drag(seek, audio(root).duration / 2);
		const volume = root.querySelector<Slider>('[data-volume-input]')!;
		drag(volume, 0.3);

		await until(() => expect(audio(root).currentTime).toBeCloseTo(audio(root).duration / 2, 0));
		expect(audio(root).volume).toBeCloseTo(0.3);
	});

	test('removes every listener and stops the sound when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		try {
			const root = await mountForm('audio-player', 'plain');
			await userEvent.click(root.querySelector('[data-playback]')!);
			await until(() => expect(audio(root).paused).toBe(false));
			const player = audio(root);

			root.remove();
			syncExamples();

			await until(() => expect(player.paused).toBe(true), player);
			await until(() => expect(player.hasAttribute('src')).toBe(false), player);
			expect(tracker.live(player, document, window)).toEqual([]);
		} finally {
			tracker.stop();
		}
		const again = await mountForm('audio-player', 'plain');
		await until(() => expect(current(again)).toBe('Morning Light'));
	});
	test('when a track ends the next one starts, and the last one stops the playlist', async () => {
		const root = await mountForm('audio-player', 'plain');
		await userEvent.click(track(root, 'Paper Planes'));
		await until(() => expect(audio(root).paused).toBe(false));

		await playToEnd(audio(root));
		await until(() => expect(root.querySelector('[data-status]')!.textContent).toBe('End of the playlist'));
		expect(current(root)).toBe('Paper Planes');

		await userEvent.click(track(root, 'Low Tide'));
		await until(() => expect(audio(root).paused).toBe(false));
		await playToEnd(audio(root));
		await until(() => expect(current(root)).toBe('Neon Rain'));
		await until(() => expect(audio(root).paused).toBe(false));
	});
	test('a burst of seek input applies one seek, to the last value, and the clock follows at once', async () => {
		const root = await mountForm('audio-player', 'plain');
		const seek = root.querySelector<Slider>('[data-seek]')!;
		await until(() => expect(seek.disabled).toBe(false));
		let seeks = 0;
		audio(root).addEventListener('seeking', () => (seeks += 1));
		const seeked = once(audio(root), 'seeked');

		for (const value of ['0.1', '0.3', '0.5', '0.75']) {
			drag(seek, Number(value) * audio(root).duration);
		}

		expect(root.querySelector('[data-elapsed]')!.textContent).toBe('0:06');
		expect(audio(root).currentTime).toBe(0);
		await seeked;
		expect(audio(root).currentTime).toBeCloseTo(audio(root).duration * 0.75, 0);
		expect(seeks).toBe(1);
	});
	test('the cover bars follow the sound while it plays and return to rest when it pauses', async () => {
		const root = await mountForm('audio-player', 'plain');
		await until(() => expect(root.querySelector('[data-cover] canvas')).not.toBeNull());
		await untilFrame(() => expect(coverage(root)).toBeGreaterThan(0));
		const rest = coverage(root);

		await userEvent.click(root.querySelector('[data-playback]')!);
		await barsFollow(root, rest);

		await userEvent.click(root.querySelector('[data-playback]')!);
		await barsRest(root, rest);
	});
	test('plays each clip from a blob so seeking works on servers without range support', async () => {
		const root = await mountForm('audio-player', 'plain');
		await until(() => expect(audio(root).src).toMatch(/^blob:/));
		const first = audio(root).src;

		await userEvent.click(track(root, 'Neon Rain'));

		await until(() => expect(audio(root).src).not.toBe(first));
		expect(audio(root).src).toMatch(/^blob:/);
		await until(() => expect(root.querySelector<Slider>('[data-seek]')!.disabled).toBe(false));
		expect(audio(root).seekable.end(0)).toBeCloseTo(audio(root).duration, 0);
	});
});

describeAudioPlayerForm('plain', {
	mount: () => mountForm('audio-player', 'plain'),
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
