import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/audio-player.css';
import { barsFollow, barsRest, coverage, describeAudioPlayerForm, playToEnd } from './audio-player-shared';
import { mountComponent, trackListeners } from './mount-recipe';
import { until, untilFrame } from './until';

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
const ready = async (root: HTMLElement) => {
	await until(() => expect(root.querySelectorAll('[data-track]').length).toBe(4));
	await until(() => expect(root.querySelector<Slider>('[data-seek]')!.disabled).toBe(false));
	return root;
};

afterEach(() => {
	document.body.innerHTML = '';
});

describe('audio player (component)', () => {
	test('draws the playlist, loads the first track paused, and fills in the clock and title', async () => {
		const root = await ready(await mountComponent('audio-player'));

		expect(names(root)).toEqual(['Morning Light', 'Low Tide', 'Neon Rain', 'Paper Planes']);
		expect(current(root)).toBe('Morning Light');
		expect(root.querySelector('[data-title]')!.textContent).toBe('Morning Light');
		expect(audio(root).paused).toBe(true);
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-pressed')).toBe('false');
	});

	test('Play starts the track and mirrors it into the button and the status', async () => {
		const root = await ready(await mountComponent('audio-player'));

		await userEvent.click(root.querySelector('[data-playback]')!);

		await until(() => expect(audio(root).paused).toBe(false));
		await until(() => expect(root.querySelector('[data-playback]')!.getAttribute('aria-label')).toBe('Play'));
		expect(root.querySelector('[data-playback]')!.getAttribute('aria-pressed')).toBe('true');
		await until(() => expect(root.querySelector('[data-status]')!.textContent).toBe('Playing Morning Light'));
		await userEvent.click(root.querySelector('[data-playback]')!);
		await until(() => expect(audio(root).paused).toBe(true));
		await until(() => expect(root.querySelector('[data-playback]')!.getAttribute('aria-label')).toBe('Play'));
	});

	test('choosing a track with a click or Enter plays it, and Next and Previous wrap', async () => {
		const root = await ready(await mountComponent('audio-player'));

		await userEvent.click(track(root, 'Neon Rain'));
		await until(() => expect(current(root)).toBe('Neon Rain'));
		await until(() => expect(audio(root).paused).toBe(false));

		await userEvent.click(root.querySelector('[data-next]')!);
		await until(() => expect(current(root)).toBe('Paper Planes'));
		await userEvent.click(root.querySelector('[data-next]')!);
		await until(() => expect(current(root)).toBe('Morning Light'));
		await userEvent.click(root.querySelector('[data-previous]')!);
		await until(() => expect(current(root)).toBe('Paper Planes'));

		track(root, 'Low Tide').focus();
		await userEvent.keyboard('{Enter}');
		await until(() => expect(current(root)).toBe('Low Tide'));
	});

	test('the keyboard lifts a track, moves it and renumbers the list while the current track keeps playing', async () => {
		const root = await ready(await mountComponent('audio-player'));
		await userEvent.click(track(root, 'Morning Light'));
		await until(() => expect(audio(root).paused).toBe(false));

		track(root, 'Low Tide').focus();
		await userEvent.keyboard(' {ArrowUp} ');

		await until(() => expect(names(root)).toEqual(['Low Tide', 'Morning Light', 'Neon Rain', 'Paper Planes']));
		expect([...root.querySelectorAll('[data-number]')].map((node) => node.textContent)).toEqual([
			'1',
			'2',
			'3',
			'4',
		]);
		expect(current(root)).toBe('Morning Light');
		expect(audio(root).paused).toBe(false);
		await until(() => expect(document.activeElement).toBe(track(root, 'Low Tide')));
	});

	test('a pointer drag reorders the playlist', async () => {
		const root = await ready(await mountComponent('audio-player'));

		await userEvent.dragAndDrop(track(root, 'Morning Light'), track(root, 'Paper Planes'));

		await until(() => expect(names(root).indexOf('Morning Light')).toBeGreaterThan(0));
		expect(names(root)).toHaveLength(4);
		expect([...root.querySelectorAll('[data-number]')].map((node) => node.textContent)).toEqual([
			'1',
			'2',
			'3',
			'4',
		]);
		expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();
	});

	test('seeking previews the clock at once and moves the playback position after the input goes quiet', async () => {
		const root = await ready(await mountComponent('audio-player'));
		const seek = root.querySelector<Slider>('[data-seek]')!;
		const volume = root.querySelector<Slider>('[data-volume-input]')!;

		drag(seek, audio(root).duration / 2);
		drag(volume, 0.3);

		await until(() => expect(root.querySelector('[data-elapsed]')!.textContent).not.toBe('0:00'));
		expect(audio(root).currentTime).toBe(0);
		await until(() => expect(audio(root).currentTime).toBeCloseTo(audio(root).duration / 2, 0));
		expect(audio(root).volume).toBeCloseTo(0.3);
	});

	test('rapid seek input applies one seek, to the last value, and timeupdate does not undo the preview', async () => {
		const root = await ready(await mountComponent('audio-player'));
		const seek = root.querySelector<Slider>('[data-seek]')!;
		const applied: number[] = [];
		audio(root).addEventListener('seeking', () => applied.push(audio(root).currentTime));

		for (const value of ['0.2', '0.4', '0.6', '0.8']) {
			drag(seek, Number(value) * audio(root).duration);
		}
		audio(root).dispatchEvent(new Event('timeupdate'));

		expect(seek.value[0]).toBeCloseTo(0.8 * audio(root).duration, 1);
		await until(() => expect(applied.length).toBe(1));
		expect(applied[0]).toBeCloseTo(audio(root).duration * 0.8, 0);
	});

	test('stops the sound, cancels a pending seek and leaves no listener on the document or window when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		try {
			const root = await ready(await mountComponent('audio-player'));
			await userEvent.click(root.querySelector('[data-playback]')!);
			await until(() => expect(audio(root).paused).toBe(false));
			const player = audio(root);
			const half = player.duration / 2;
			const seek = root.querySelector<Slider>('[data-seek]')!;
			drag(seek, audio(root).duration / 2);
			root.remove();
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(player.currentTime).toBeLessThan(half - 1);
			expect(player.paused).toBe(true);
			expect(player.hasAttribute('src')).toBe(false);
			expect(tracker.live(document, window)).toEqual([]);
		} finally {
			tracker.stop();
		}
		const again = await ready(await mountComponent('audio-player'));
		expect(current(again)).toBe('Morning Light');
	});
	test('when a track ends the next one starts, and the last one stops the playlist', async () => {
		const root = await mountComponent('audio-player');
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
	test('the cover bars follow the sound while it plays and return to rest when it pauses', async () => {
		const root = await mountComponent('audio-player');
		await until(() => expect(root.querySelector('[data-cover] canvas')).not.toBeNull());
		await untilFrame(() => expect(coverage(root)).toBeGreaterThan(0));
		const rest = coverage(root);

		await userEvent.click(root.querySelector('[data-playback]')!);
		await barsFollow(root, rest);

		await userEvent.click(root.querySelector('[data-playback]')!);
		await barsRest(root, rest);
	});
	test('plays each clip from a Blob so seeking works without range support', async () => {
		const root = await ready(await mountComponent('audio-player'));
		await until(() => expect(audio(root).src).toMatch(/^blob:/));
		const seek = root.querySelector<Slider>('[data-seek]')!;

		drag(seek, audio(root).duration / 2);

		await until(() => expect(audio(root).currentTime).toBeCloseTo(audio(root).duration / 2, 0));
		expect(audio(root).seekable.end(0)).toBeCloseTo(audio(root).duration, 0);
	});
	test('the slider follows the playback position every frame while playing and stops on pause', async () => {
		const root = await mountComponent('audio-player');
		await until(() => expect(root.querySelector('[data-seek] [role="slider"]')).not.toBeNull());
		const position = () => root.querySelector('[data-seek] [role="slider"]')!.getAttribute('aria-valuenow');
		await until(() => expect(root.querySelector<HTMLElement>('[data-seek]')!.hasAttribute('disabled')).toBe(false));

		await userEvent.click(root.querySelector('[data-playback]')!);
		await until(() => expect(audio(root).paused).toBe(false));
		const seen = new Set<string | null>();
		const start = performance.now();
		await new Promise<void>((resolve) => {
			const sample = () => {
				seen.add(position());
				if (performance.now() - start > 1000) resolve();
				else requestAnimationFrame(sample);
			};
			sample();
		});

		expect(seen.size).toBeGreaterThanOrEqual(15);

		await userEvent.click(root.querySelector('[data-playback]')!);
		await until(() => expect(audio(root).paused).toBe(true));
		const settled = position();
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(position()).toBe(settled);
	});
});

describeAudioPlayerForm('component', {
	mount: async () => {
		const root = await mountComponent('audio-player');
		await until(() => expect(root.querySelectorAll('[data-track]').length).toBe(4));
		return root;
	},
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
