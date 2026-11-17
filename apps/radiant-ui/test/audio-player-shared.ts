import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { until, untilFrame, fakeTimers, settle } from './until';
import '@ecopages/radiant-ui/button/styles.css';
import '@ecopages/radiant-ui/slider/styles.css';
import '@ecopages/radiant-ui/toolbar/styles.css';

type Slider = HTMLElement & { value: number[]; disabled: boolean };

/** What differs between the four forms of the recipe: how to start one, and how to take it off the page and back. */
export interface AudioPlayerForm {
	/** Mounts a player and resolves once it has drawn its playlist. */
	mount: () => Promise<HTMLElement>;
	/** Takes the player off the page and puts it back, which is how a router or a reparenting reconnects it. */
	relocate: (root: HTMLElement) => Promise<void>;
	/** Takes the player off the page and lets its cleanup run. */
	remove: (root: HTMLElement) => Promise<void>;
}

const audio = (root: HTMLElement) => root.querySelector<HTMLAudioElement>('[data-audio]')!;
const seek = (root: HTMLElement) => root.querySelector<Slider>('[data-seek]')!;
const thumb = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-seek] [role="slider"]')!;
const toggle = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-playback]')!;
const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
const current = (root: HTMLElement) => root.querySelector('[data-track][aria-current="true"] [data-name]')?.textContent;
const track = (root: HTMLElement, name: string) =>
	[...root.querySelectorAll<HTMLElement>('[data-track]')].find((row) => row.textContent?.includes(name))!;
const canvas = (root: HTMLElement) => root.querySelector<HTMLCanvasElement>('[data-cover] canvas');
const visualizer = (root: HTMLElement, name: string) => root.querySelector<HTMLElement>(`[data-visualizer="${name}"]`)!;
const pressed = (root: HTMLElement) =>
	[...root.querySelectorAll<HTMLElement>('[data-visualizer]')].map((button) => button.getAttribute('aria-pressed'));
const drawn = (element: HTMLCanvasElement) =>
	element
		.getContext('2d')!
		.getImageData(0, 0, element.width, element.height)
		.data.some((byte) => byte !== 0);

/**
 * The share of the cover's canvas that is painted, from 0 to 1.
 *
 * @remarks
 * The bars show their lowest level at rest, so the cover is never empty and "the bars follow the sound" is a
 * coverage above what the same cover shows at rest, which is measured before the track plays.
 */
export const coverage = (root: HTMLElement): number => {
	const element = canvas(root)!;
	const { data } = element.getContext('2d')!.getImageData(0, 0, element.width, element.height);
	let lit = 0;
	for (let index = 3; index < data.length; index += 4) if (data[index] !== 0) lit += 1;
	return lit / (element.width * element.height);
};
/** Waits for the bars to be drawn above their resting coverage, which is what a playing track makes of them. */
export const barsFollow = async (root: HTMLElement, rest: number) =>
	untilFrame(() => expect(coverage(root)).toBeGreaterThan(rest * 1.3));
export const barsRest = async (root: HTMLElement, rest: number) =>
	untilFrame(() => expect(Math.abs(coverage(root) - rest)).toBeLessThan(0.002));
const volumeThumb = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-volume-input] [role="slider"]')!;
const seekable = async (root: HTMLElement) => {
	await until(() => expect(seek(root).disabled).toBe(false));
	return root;
};

const loop = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-loop]')!;
const shuffle = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-shuffle]')!;
const next = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-next]')!;
const previous = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-previous]')!;
const rowNames = (root: HTMLElement) =>
	[...root.querySelectorAll('[data-track] [data-name]')].map((node) => node.textContent);
const LOOP_CYCLE = ['Loop: off', 'Loop: all', 'Loop: one'];
/** Clicks the loop button once per step of the cycle (off, all, one) and asserts the name after each click. */
const clickLoopTo = async (root: HTMLElement, name: string) => {
	const from = LOOP_CYCLE.indexOf(loop(root).getAttribute('aria-label')!);
	const clicks = (LOOP_CYCLE.indexOf(name) - from + LOOP_CYCLE.length) % LOOP_CYCLE.length;
	for (let click = 1; click <= clicks; click++) {
		await userEvent.click(loop(root));
		await until(() =>
			expect(loop(root).getAttribute('aria-label')).toBe(LOOP_CYCLE[(from + click) % LOOP_CYCLE.length]),
		);
	}
	expect(loop(root).getAttribute('aria-label')).toBe(name);
};

/** Fixes what a shuffle draws, so the order a test sees is the same on every run. */
function fixedRandom(...values: number[]) {
	let index = 0;
	return vi.spyOn(Math, 'random').mockImplementation(() => values[index++ % values.length]);
}

/** Seeks a track that is loaded to `seconds` and waits for the clock to show it. */
const seekTo = async (root: HTMLElement, seconds: number) => {
	await seekable(root);
	audio(root).currentTime = seconds;
	await until(() => expect(root.querySelector('[data-elapsed]')!.textContent).toBe(`0:0${seconds}`));
};

/** The `primitive-example` frame the docs page gives, on what the stylesheet scopes to. */
function frame(root: HTMLElement): HTMLElement {
	document.body.classList.remove('primitive-example');
	(root.matches('[data-example]') ? root : root.parentElement!).classList.add('primitive-example');
	return root;
}

const pixel = (color: string): [number, number, number, number] => {
	const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	return [...context.getImageData(0, 0, 1, 1).data] as [number, number, number, number];
};
const luminance = ([red, green, blue]: number[]) =>
	[red, green, blue]
		.map((value) => value / 255)
		.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
		.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

/** The contrast ratio of the text of `node` against the first opaque background above it; its opacity must be 1. */
function contrastOf(node: HTMLElement): number {
	for (let ancestor: HTMLElement | null = node; ancestor; ancestor = ancestor.parentElement) {
		expect(getComputedStyle(ancestor).opacity, `opacity of ${ancestor.localName}`).toBe('1');
	}
	let background = node.parentElement;
	while (pixel(getComputedStyle(background!).backgroundColor)[3] === 0) background = background!.parentElement;
	const [lighter, darker] = [
		luminance(pixel(getComputedStyle(node).color)),
		luminance(pixel(getComputedStyle(background!).backgroundColor)),
	].sort((a, b) => b - a);
	return (lighter + 0.05) / (darker + 0.05);
}

/** Moves a playing track to a moment before its end, so the browser ends it the way it ends one that was played. */
export async function playToEnd(player: HTMLAudioElement): Promise<void> {
	await until(() => expect(player.duration).toBeGreaterThan(0));
	player.currentTime = player.duration - 0.3;
}

/**
 * Replaces `fetch` for the urls containing `match`. A handler that returns a promise holds the request until it
 * settles; one that returns nothing lets the request through.
 */
function interceptFetch(match: string, handler: (url: string) => Promise<Response | undefined> | Response | undefined) {
	const real = window.fetch;
	const requests: string[] = [];
	window.fetch = async (input, init) => {
		const url = String(input);
		if (!url.includes(match)) return real(input, init);
		requests.push(url);
		return (await handler(url)) ?? real(input, init);
	};
	return { requests, restore: () => (window.fetch = real) };
}

/** A promise that settles when `open()` is called, to hold a request until the test says so. */
function gate() {
	let open!: () => void;
	const opened = new Promise<void>((resolve) => (open = resolve));
	return { opened, open };
}

/** Records the object URLs the page makes and revokes, so a test can tell which are still alive. */
function trackObjectUrls() {
	const create = URL.createObjectURL;
	const revoke = URL.revokeObjectURL;
	const created: string[] = [];
	const revoked: string[] = [];
	URL.createObjectURL = (object) => {
		const url = create(object);
		created.push(url);
		return url;
	};
	URL.revokeObjectURL = (url) => {
		revoked.push(url);
		revoke(url);
	};
	return {
		alive: () => created.filter((url) => !revoked.includes(url)),
		stop: () => {
			URL.createObjectURL = create;
			URL.revokeObjectURL = revoke;
		},
	};
}

/**
 * The behaviour every form of the audio player recipe shares and the fixes the review of it asked for, run against
 * one form.
 */
export function describeAudioPlayerForm(name: string, form: AudioPlayerForm): void {
	describe(`audio player lifecycle and input (${name})`, () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		test('keeps the authored status hint when it connects', async () => {
			const root = await form.mount();

			expect(status(root)).toBe('Pick a track, or drag one to reorder the playlist');
		});

		test('the play button keeps its name and reports the state with aria-pressed only', async () => {
			const root = await seekable(await form.mount());

			expect(toggle(root).getAttribute('aria-label')).toBe('Play');
			await userEvent.click(toggle(root));
			await until(() => expect(toggle(root).getAttribute('aria-pressed')).toBe('true'));
			expect(toggle(root).getAttribute('aria-label')).toBe('Play');
			await userEvent.click(toggle(root));
			await until(() => expect(toggle(root).getAttribute('aria-pressed')).toBe('false'));
			expect(toggle(root).getAttribute('aria-label')).toBe('Play');
		});

		test('every playlist row is described by the keyboard instructions', async () => {
			const root = await seekable(await form.mount());
			const rows = [...root.querySelectorAll<HTMLElement>('[data-track]')];

			expect(rows).toHaveLength(4);
			for (const row of rows) {
				const description = document.getElementById(row.getAttribute('aria-describedby')!);
				expect(description?.textContent).toBe('Enter plays, Space picks up to reorder');
			}
		});

		test('the keyboard help is hidden from browsing, so a screen reader reads it once, as a description', async () => {
			const root = await seekable(await form.mount());
			const row = root.querySelector<HTMLElement>('[data-track]')!;
			const help = document.getElementById(row.getAttribute('aria-describedby')!)!;

			expect(help.hidden).toBe(true);
			expect(help.hasAttribute('data-help')).toBe(true);
		});

		test('a click between the rows, on the list itself, chooses nothing and throws nothing', async () => {
			const root = await seekable(await form.mount());
			const errors: string[] = [];
			const onError = (event: ErrorEvent) => {
				errors.push(event.message);
				event.preventDefault();
			};
			window.addEventListener('error', onError);
			try {
				root.querySelector('[data-tracks]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
				await settle(100);
			} finally {
				window.removeEventListener('error', onError);
			}

			expect(errors).toEqual([]);
			expect(current(root)).toBe('Morning Light');
			expect(audio(root).paused).toBe(true);
		});

		test('the seek thumb announces the clock and the volume thumb a percentage, and both keep it', async () => {
			fakeTimers();
			const root = await seekable(await form.mount());
			const text = (node: HTMLElement) => node.getAttribute('aria-valuetext');
			await until(() => expect(text(thumb(root))).toBe('0:00 of 0:08'));
			expect(text(volumeThumb(root))).toBe('80%');

			thumb(root).focus();
			await userEvent.keyboard('{ArrowRight}{ArrowRight}');
			await until(() => expect(text(thumb(root))).toBe('0:02 of 0:08'));
			await settle(150);
			expect(text(thumb(root))).toBe('0:02 of 0:08');

			volumeThumb(root).focus();
			await userEvent.keyboard('{ArrowLeft}');
			await until(() => expect(text(volumeThumb(root))).toMatch(/^[0-9]+%$/));
			await settle(150);
			expect(text(volumeThumb(root))).toBe(`${Math.round(audio(root).volume * 100)}%`);
			expect(audio(root).volume).toBeLessThan(0.8);

			await userEvent.click(toggle(root));
			await until(() => expect(audio(root).currentTime).toBeGreaterThan(2.3));
			const elapsed = root.querySelector('[data-elapsed]')!.textContent;
			expect(text(thumb(root))).toBe(`${elapsed} of 0:08`);
		});

		test('the seek thumb reads the total of the new track after Next, and the duration of a track once it is known', async () => {
			const root = await seekable(await form.mount());

			await userEvent.click(root.querySelector('[data-next]')!);
			await until(() => expect(current(root)).toBe('Low Tide'));
			await seekable(root);
			await until(() => expect(thumb(root).getAttribute('aria-valuetext')).toBe('0:00 of 0:08'));
			await userEvent.click(root.querySelector('[data-next]')!);
			await until(() => expect(current(root)).toBe('Neon Rain'));
			await until(() => expect(thumb(root).getAttribute('aria-valuetext')).toBe('0:00 of 0:09'));
		});

		test('the text of the player keeps a contrast of 4.5 or more, and no row is dimmed with opacity', async () => {
			const root = frame(await seekable(await form.mount()));
			const rows = [...root.querySelectorAll<HTMLElement>('[data-track]')];
			const now = root.querySelector<HTMLElement>('[data-track][aria-current="true"]')!;
			const other = rows.find((row) => row !== now)!;

			const texts = {
				status: root.querySelector<HTMLElement>('[data-status]')!,
				elapsed: root.querySelector<HTMLElement>('[data-elapsed]')!,
				total: root.querySelector<HTMLElement>('[data-total]')!,
				artist: root.querySelector<HTMLElement>('[data-meta] > [data-artist]')!,
				currentName: now.querySelector<HTMLElement>('[data-name]')!,
				currentNumber: now.querySelector<HTMLElement>('[data-number]')!,
				currentLength: now.querySelector<HTMLElement>('[data-length]')!,
				otherName: other.querySelector<HTMLElement>('[data-name]')!,
				otherNumber: other.querySelector<HTMLElement>('[data-number]')!,
				otherLength: other.querySelector<HTMLElement>('[data-length]')!,
			};
			for (const [name, node] of Object.entries(texts)) {
				expect(contrastOf(node), name).toBeGreaterThanOrEqual(4.5);
			}
		});

		test('Next while playing and then Pause leaves the bars at rest, and the new track plays', async () => {
			const root = await seekable(await form.mount());
			const rest = coverage(root);
			expect(rest).toBeGreaterThan(0);
			await userEvent.click(toggle(root));
			await barsFollow(root, rest);

			await userEvent.click(root.querySelector('[data-next]')!);
			await until(() => expect(current(root)).toBe('Low Tide'));
			await until(() => expect(audio(root).paused).toBe(false));
			await until(() => expect(audio(root).readyState).toBeGreaterThan(0));
			await userEvent.click(toggle(root));
			await until(() => expect(audio(root).paused).toBe(true));
			await barsRest(root, rest);

			await settle(200);
			expect(Math.abs(coverage(root) - rest)).toBeLessThan(0.002);
		});

		test('the arrow keys on the seek thumb move the playback by whole seconds', async () => {
			const root = await seekable(await form.mount());
			const seeks: number[] = [];
			audio(root).addEventListener('seeking', () => seeks.push(audio(root).currentTime));

			thumb(root).focus();
			await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');

			await until(() => expect(audio(root).currentTime).toBeCloseTo(3, 1));
			await until(() => expect(root.querySelector('[data-elapsed]')!.textContent).toBe('0:03'));
			expect(seek(root).value[0]).toBeCloseTo(3, 1);

			await userEvent.keyboard('{ArrowLeft}');
			await until(() => expect(audio(root).currentTime).toBeCloseTo(2, 1));
			await userEvent.keyboard('{PageUp}');
			await until(() => expect(audio(root).currentTime).toBeCloseTo(Math.min(12, audio(root).duration), 1));
			await userEvent.keyboard('{Home}');
			await until(() => expect(audio(root).currentTime).toBeCloseTo(0, 1));
			expect(current(root)).toBe('Morning Light');
			expect(audio(root).paused).toBe(true);
			expect(seeks.length).toBeGreaterThan(0);
		});

		test('the arrow keys keep adding up while the track plays', async () => {
			const root = await seekable(await form.mount());
			await userEvent.click(toggle(root));
			await until(() => expect(audio(root).paused).toBe(false));

			thumb(root).focus();
			await userEvent.keyboard('{ArrowRight}{ArrowRight}');

			await until(() => expect(audio(root).currentTime).toBeGreaterThan(2));
		});

		test('Next while a seek is pending does not apply it to the next track', async () => {
			fakeTimers();
			const root = await seekable(await form.mount());
			await userEvent.click(track(root, 'Low Tide'));
			await until(() => expect(audio(root).paused).toBe(false));
			await userEvent.click(track(root, 'Morning Light'));
			await until(() => expect(current(root)).toBe('Morning Light'));
			await until(() => expect(audio(root).paused).toBe(false));
			audio(root).pause();
			await seekable(root);
			const seeks: number[] = [];
			audio(root).addEventListener('seeking', () => seeks.push(audio(root).currentTime));

			thumb(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
			next(root).click();
			await until(() => expect(current(root)).toBe('Low Tide'));
			await settle(400);

			expect(audio(root).currentTime).toBeLessThan(1);
			expect(seeks.every((position) => position < 1)).toBe(true);
		});

		test('moving the player to another parent while paused starts it again from the first track', async () => {
			const root = await seekable(await form.mount());
			const rest = coverage(root);
			await userEvent.click(track(root, 'Neon Rain'));
			await until(() => expect(current(root)).toBe('Neon Rain'));
			await until(() => expect(audio(root).paused).toBe(false));
			audio(root).pause();
			await until(() => expect(toggle(root).getAttribute('aria-pressed')).toBe('false'));

			await form.relocate(root);

			await until(() => expect(current(root)).toBe('Morning Light'));
			await seekable(root);
			expect(audio(root).src).toMatch(/^blob:/);
			expect(toggle(root).getAttribute('aria-pressed')).toBe('false');
			expect(status(root)).toBe('Pick a track, or drag one to reorder the playlist');
			await userEvent.click(toggle(root));
			await until(() => expect(audio(root).paused).toBe(false));
			await barsFollow(root, rest);
		});

		test('moving the player to another parent while it plays stops it, and Play works again', async () => {
			const root = await seekable(await form.mount());
			const rest = coverage(root);
			await userEvent.click(toggle(root));
			await until(() => expect(audio(root).paused).toBe(false));
			const source = audio(root).src;

			await form.relocate(root);

			await until(() => expect(audio(root).paused).toBe(true));
			await seekable(root);
			expect(audio(root).src).toMatch(/^blob:/);
			expect(audio(root).src).not.toBe(source);
			expect(toggle(root).getAttribute('aria-pressed')).toBe('false');
			await untilFrame(() => expect(coverage(root)).toBeLessThan(rest * 1.2));
			const back = coverage(root);
			await userEvent.click(toggle(root));
			await until(() => expect(audio(root).paused).toBe(false));
			await barsFollow(root, back);
			expect(audio(root).currentTime).toBeLessThan(2);
		});

		test('choosing a track again while an earlier fetch of it runs plays it once', async () => {
			const held = gate();
			const fetches = interceptFetch('neon-rain', () => held.opened.then(() => undefined));
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(track(root, 'Neon Rain'));
				await userEvent.click(track(root, 'Low Tide'));
				await userEvent.click(track(root, 'Neon Rain'));
				const plays: number[] = [];
				audio(root).addEventListener('play', () => plays.push(plays.length));

				held.open();

				await until(() => expect(audio(root).src).toMatch(/^blob:/));
				await until(() => expect(audio(root).paused).toBe(false));
				await settle(200);
				expect(plays).toHaveLength(1);
				expect(current(root)).toBe('Neon Rain');
			} finally {
				fetches.restore();
			}
		});

		test('a track chosen before an earlier fetch resolves keeps its own source', async () => {
			const held = gate();
			const fetches = interceptFetch('neon-rain', () => held.opened.then(() => undefined));
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(track(root, 'Neon Rain'));
				await userEvent.click(track(root, 'Low Tide'));
				await until(() => expect(audio(root).paused).toBe(false));
				const source = audio(root).src;

				held.open();
				await settle(300);

				expect(current(root)).toBe('Low Tide');
				expect(audio(root).src).toBe(source);
			} finally {
				fetches.restore();
			}
		});

		test('removing the player before a fetch resolves sets no source and leaves no object URL alive', async () => {
			const held = gate();
			const fetches = interceptFetch('morning-light', () => held.opened.then(() => undefined));
			const urls = trackObjectUrls();
			try {
				const root = await form.mount();
				await until(() => expect(fetches.requests).toHaveLength(1));
				const player = audio(root);

				await form.remove(root);
				held.open();
				await settle(300);

				expect(player.hasAttribute('src')).toBe(false);
				expect(urls.alive()).toEqual([]);
			} finally {
				fetches.restore();
				urls.stop();
			}
		});

		test.each([
			['a missing file', () => new Response('not found', { status: 404 })],
			['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
		])('%s reports the track and leaves the player usable, and choosing it again retries', async (_label, fail) => {
			const fetches = interceptFetch('low-tide', async () => fail());
			let root!: HTMLElement;
			try {
				root = await seekable(await form.mount());

				await userEvent.click(track(root, 'Low Tide'));

				await until(() => expect(status(root)).toBe('Could not load Low Tide'));
				expect(current(root)).toBe('Low Tide');
				expect(seek(root).disabled).toBe(true);

				await userEvent.click(track(root, 'Neon Rain'));
				await until(() => expect(audio(root).paused).toBe(false));
				await seekable(root);
			} finally {
				fetches.restore();
			}

			await userEvent.click(track(root, 'Low Tide'));
			await until(() => expect(current(root)).toBe('Low Tide'));
			await seekable(root);
			expect(audio(root).paused).toBe(false);
			expect(status(root)).toBe('Playing Low Tide');
		});

		test('choosing the track that failed to load loads it again and plays it', async () => {
			let failing = true;
			const fetches = interceptFetch('low-tide', async () =>
				failing ? new Response('not found', { status: 404 }) : undefined,
			);
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(track(root, 'Low Tide'));
				await until(() => expect(status(root)).toBe('Could not load Low Tide'));
				failing = false;

				await userEvent.click(track(root, 'Low Tide'));

				await until(() => expect(status(root)).toBe('Playing Low Tide'));
				await seekable(root);
				expect(audio(root).paused).toBe(false);
			} finally {
				fetches.restore();
			}
		});
	});

	describe(`audio player order (${name})`, () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		test('the loop button has an icon, no text, a name that follows the mode and no pressed state', async () => {
			const root = await seekable(await form.mount());
			const names: (string | null)[] = [];

			expect(loop(root).textContent!.trim()).toBe('');
			for (let press = 0; press < 4; press++) {
				names.push(loop(root).getAttribute('aria-label'));
				expect(loop(root).hasAttribute('aria-pressed')).toBe(false);
				expect(loop(root).querySelector('svg')).not.toBeNull();
				await userEvent.click(loop(root));
				await until(() => expect(loop(root).getAttribute('aria-label')).not.toBe(names.at(-1)));
				expect(status(root)).toBe(loop(root).getAttribute('aria-label'));
			}

			expect(names).toEqual(['Loop: off', 'Loop: all', 'Loop: one', 'Loop: off']);
		});

		test('the shuffle button keeps one name and reports its state with aria-pressed, and announces it', async () => {
			const root = await seekable(await form.mount());

			expect(shuffle(root).textContent!.trim()).toBe('');
			expect(shuffle(root).getAttribute('aria-label')).toBe('Shuffle');
			expect(shuffle(root).getAttribute('aria-pressed')).toBe('false');
			await userEvent.click(shuffle(root));
			await until(() => expect(shuffle(root).getAttribute('aria-pressed')).toBe('true'));
			expect(shuffle(root).getAttribute('aria-label')).toBe('Shuffle');
			expect(status(root)).toBe('Shuffle on');
			await userEvent.click(shuffle(root));
			await until(() => expect(shuffle(root).getAttribute('aria-pressed')).toBe('false'));
			expect(status(root)).toBe('Shuffle off');
		});

		test('the loop and shuffle buttons are drawn centred in their buttons', async () => {
			const root = frame(await seekable(await form.mount()));

			for (const button of [loop(root), shuffle(root)]) {
				const box = button.getBoundingClientRect();
				const icon = button.querySelector('svg')!.getBoundingClientRect();
				expect(Math.abs(box.left + box.width / 2 - (icon.left + icon.width / 2))).toBeLessThan(0.6);
				expect(Math.abs(box.top + box.height / 2 - (icon.top + icon.height / 2))).toBeLessThan(0.6);
			}
		});

		test('with the loop off the last track ends the playlist, and Next still wraps to the first', async () => {
			const root = await seekable(await form.mount());
			await userEvent.click(track(root, 'Paper Planes'));
			await until(() => expect(audio(root).paused).toBe(false));

			await playToEnd(audio(root));

			await until(() => expect(status(root)).toBe('End of the playlist'));
			expect(current(root)).toBe('Paper Planes');
			await userEvent.click(next(root));
			await until(() => expect(current(root)).toBe('Morning Light'));
		});

		test('loop all wraps the last track to the first when it ends', async () => {
			const root = await seekable(await form.mount());
			await clickLoopTo(root, 'Loop: all');
			await userEvent.click(track(root, 'Paper Planes'));
			await until(() => expect(audio(root).paused).toBe(false));

			await playToEnd(audio(root));

			await until(() => expect(current(root)).toBe('Morning Light'));
			await until(() => expect(audio(root).paused).toBe(false));
			expect(status(root)).not.toBe('End of the playlist');
		});

		test('loop one starts the same track again when it ends, and Next still moves on', async () => {
			const root = await seekable(await form.mount());
			await userEvent.click(track(root, 'Low Tide'));
			await until(() => expect(audio(root).paused).toBe(false));
			await clickLoopTo(root, 'Loop: one');
			let ends = 0;
			audio(root).addEventListener('ended', () => (ends += 1));

			await playToEnd(audio(root));

			await until(() => expect(ends).toBe(1));
			await until(() => expect(audio(root).currentTime).toBeLessThan(audio(root).duration - 1));
			expect(audio(root).paused).toBe(false);
			expect(current(root)).toBe('Low Tide');

			await userEvent.click(next(root));
			await until(() => expect(current(root)).toBe('Neon Rain'));
			await until(() => expect(audio(root).paused).toBe(false));
		});

		test('loop one on the last track repeats it instead of ending the playlist', async () => {
			const root = await seekable(await form.mount());
			await userEvent.click(track(root, 'Paper Planes'));
			await until(() => expect(audio(root).paused).toBe(false));
			await clickLoopTo(root, 'Loop: one');

			await playToEnd(audio(root));

			await until(() => expect(audio(root).currentTime).toBeLessThan(audio(root).duration - 1));
			expect(status(root)).not.toBe('End of the playlist');
			expect(current(root)).toBe('Paper Planes');
		});

		test('a paused track sought to its end does not move on, in any loop mode', async () => {
			fakeTimers();
			const root = await seekable(await form.mount());
			await clickLoopTo(root, 'Loop: all');
			await seekable(root);

			thumb(root).focus();
			await userEvent.keyboard('{End}');
			await settle(500);

			expect(current(root)).toBe('Morning Light');
			expect(audio(root).paused).toBe(true);
		});

		test('after the playlist is reordered Next follows the new order', async () => {
			const root = await seekable(await form.mount());
			track(root, 'Low Tide').focus();
			await userEvent.keyboard(' {ArrowUp} ');
			await until(() =>
				expect(rowNames(root)).toEqual(['Low Tide', 'Morning Light', 'Neon Rain', 'Paper Planes']),
			);

			await userEvent.click(next(root));

			await until(() => expect(current(root)).toBe('Neon Rain'));
		});

		test('Previous restarts a track that has played for more than 3 seconds, and moves back before that', async () => {
			const root = await seekable(await form.mount());
			await userEvent.click(track(root, 'Low Tide'));
			await until(() => expect(audio(root).paused).toBe(false));
			audio(root).pause();
			await seekTo(root, 4);

			await userEvent.click(previous(root));

			expect(current(root)).toBe('Low Tide');
			await until(() => expect(audio(root).currentTime).toBeLessThan(1));
			await userEvent.click(previous(root));
			await until(() => expect(current(root)).toBe('Morning Light'));
		});

		test('shuffle plays every track once before any repeats, and never the same track twice in a row', async () => {
			const random = fixedRandom(0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.6, 0.4);
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(shuffle(root));
				const played = [current(root)];

				for (let press = 0; press < 11; press++) {
					const before = current(root);
					await userEvent.click(next(root));
					await until(() => expect(current(root)).not.toBe(before));
					played.push(current(root));
				}

				for (const pass of [played.slice(0, 4), played.slice(4, 8), played.slice(8, 12)]) {
					expect([...pass].sort()).toEqual(['Low Tide', 'Morning Light', 'Neon Rain', 'Paper Planes']);
				}
			} finally {
				random.mockRestore();
			}
		});

		test('shuffle draws from the random source: another source gives another order', async () => {
			const orders: (string | null | undefined)[][] = [];
			for (const values of [
				[0, 0, 0],
				[0.99, 0.99, 0.99],
			]) {
				const random = fixedRandom(...values);
				try {
					const root = await seekable(await form.mount());
					await userEvent.click(shuffle(root));
					const played = [];
					for (let press = 0; press < 3; press++) {
						const before = current(root);
						await userEvent.click(next(root));
						await until(() => expect(current(root)).not.toBe(before));
						played.push(current(root));
					}
					orders.push(played);
				} finally {
					random.mockRestore();
				}
			}

			expect(orders[0]).not.toEqual(orders[1]);
		});

		test('Previous in a shuffle walks back through the tracks played', async () => {
			const random = fixedRandom(0.9, 0.1, 0.5);
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(shuffle(root));
				const played = [current(root)];
				for (let press = 0; press < 2; press++) {
					const before = current(root);
					await userEvent.click(next(root));
					await until(() => expect(current(root)).not.toBe(before));
					played.push(current(root));
				}

				await userEvent.click(previous(root));
				await until(() => expect(current(root)).toBe(played[1]));
				await userEvent.click(previous(root));
				await until(() => expect(current(root)).toBe(played[0]));
			} finally {
				random.mockRestore();
			}
		});

		test('Next after Previous in a shuffle returns to the track that was left', async () => {
			const random = fixedRandom(0.9, 0.1, 0.5);
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(shuffle(root));
				const played = [current(root)];
				for (let press = 0; press < 2; press++) {
					const before = current(root);
					await userEvent.click(next(root));
					await until(() => expect(current(root)).not.toBe(before));
					played.push(current(root));
				}

				await userEvent.click(previous(root));
				await until(() => expect(current(root)).toBe(played[1]));
				await userEvent.click(next(root));
				await until(() => expect(current(root)).toBe(played[2]));
			} finally {
				random.mockRestore();
			}
		});

		test('Previous in a shuffle restarts a track played for more than 3 seconds, and stays on it', async () => {
			const random = fixedRandom(0.9);
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(shuffle(root));
				await userEvent.click(next(root));
				await until(() => expect(current(root)).not.toBe('Morning Light'));
				const now = current(root);
				await seekable(root);
				await userEvent.click(toggle(root));
				await until(() => expect(audio(root).paused).toBe(false));
				audio(root).pause();
				await seekTo(root, 4);

				await userEvent.click(previous(root));

				expect(current(root)).toBe(now);
				await until(() => expect(audio(root).currentTime).toBeLessThan(1));
			} finally {
				random.mockRestore();
			}
		});

		test('turning the shuffle off continues in list order from the track that plays', async () => {
			const random = fixedRandom(0.9);
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(shuffle(root));
				await userEvent.click(next(root));
				await until(() => expect(current(root)).not.toBe('Morning Light'));
				const now = rowNames(root).indexOf(current(root)!);

				await userEvent.click(shuffle(root));
				await userEvent.click(next(root));

				await until(() => expect(current(root)).toBe(rowNames(root)[(now + 1) % 4]));
			} finally {
				random.mockRestore();
			}
		});

		test('reordering the playlist while shuffled keeps every track in the pass', async () => {
			const random = fixedRandom(0.1, 0.6, 0.3);
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(shuffle(root));
				track(root, 'Low Tide').focus();
				await userEvent.keyboard(' {ArrowUp} ');
				await until(() => expect(rowNames(root)[0]).toBe('Low Tide'));

				const played = [current(root)];
				for (let press = 0; press < 3; press++) {
					const before = current(root);
					await userEvent.click(next(root));
					await until(() => expect(current(root)).not.toBe(before));
					played.push(current(root));
				}

				expect([...played].sort()).toEqual(['Low Tide', 'Morning Light', 'Neon Rain', 'Paper Planes']);
			} finally {
				random.mockRestore();
			}
		});

		test('shuffle in a playlist that ends with the loop off stops after every track has played', async () => {
			const random = fixedRandom(0.9, 0.1, 0.5);
			try {
				const root = await seekable(await form.mount());
				await userEvent.click(shuffle(root));
				for (let press = 0; press < 3; press++) {
					const before = current(root);
					const source = audio(root).src;
					await userEvent.click(next(root));
					await until(() => expect(current(root)).not.toBe(before));
					await until(() =>
						expect(
							audio(root).src !== source && audio(root).readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
						).toBe(true),
					);
				}
				await userEvent.click(toggle(root));
				await until(() => expect(audio(root).paused).toBe(false));

				await playToEnd(audio(root));

				await until(() => expect(status(root)).toBe('End of the playlist'));
			} finally {
				random.mockRestore();
			}
		});

		test('Play asks the visualizer to resume from the click, before any play event', async () => {
			const root = await seekable(await form.mount());
			const watched: string[] = [];
			const listen = EventTarget.prototype.addEventListener;
			EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: never[]) {
				if (this instanceof BaseAudioContext) watched.push(type);
				return (listen as (...args: unknown[]) => void).call(this, type, ...rest);
			} as typeof listen;
			try {
				toggle(root).click();

				expect(watched).toContain('statechange');
			} finally {
				EventTarget.prototype.addEventListener = listen;
			}
		});
	});

	describe(`audio player visualizer (${name})`, () => {
		test('the selector shows LED pressed, the LED bars are drawn at rest, and a click on the pressed button keeps it pressed', async () => {
			const root = await seekable(await form.mount());

			expect(pressed(root)).toEqual(['true', 'false', 'false']);
			expect(canvas(root)!.getAttribute('aria-hidden')).toBe('true');
			expect(coverage(root)).toBeGreaterThan(0);
			const bars = canvas(root);
			await userEvent.click(visualizer(root, 'led'));

			expect(pressed(root)).toEqual(['true', 'false', 'false']);
			expect(canvas(root)).toBe(bars);
		});

		test('Wave replaces the bars canvas with its own, which is empty at rest, and LED brings the bars back', async () => {
			const root = await seekable(await form.mount());
			const bars = canvas(root);

			await userEvent.click(visualizer(root, 'wave'));

			await untilFrame(() => expect(canvas(root)).not.toBe(bars));
			expect(root.querySelectorAll('[data-cover] canvas')).toHaveLength(1);
			expect(canvas(root)!.getAttribute('aria-hidden')).toBe('true');
			expect(coverage(root)).toBe(0);
			expect(pressed(root)).toEqual(['false', 'false', 'true']);

			await userEvent.click(visualizer(root, 'led'));

			await untilFrame(() => expect(coverage(root)).toBeGreaterThan(0));
			expect(root.querySelectorAll('[data-cover] canvas')).toHaveLength(1);
			expect(pressed(root)).toEqual(['true', 'false', 'false']);
		});

		test('the three buttons say what they draw, and Bars switches to solid bars that rest as a hairline and follow the sound', async () => {
			const root = await seekable(await form.mount());
			const labels = [...root.querySelectorAll('[data-visualizer]')].map((button) => [
				button.getAttribute('data-visualizer'),
				button.getAttribute('aria-label'),
				button.textContent!.trim(),
			]);
			expect(labels).toEqual([
				['led', 'LED bars', 'LED'],
				['solid', 'Solid bars', 'Bars'],
				['wave', 'Waveform', 'Wave'],
			]);
			const ledRest = coverage(root);
			const led = canvas(root)!;

			await userEvent.click(visualizer(root, 'solid'));

			await untilFrame(() => expect(canvas(root)).not.toBe(led));
			expect(led.isConnected).toBe(false);
			expect(root.querySelectorAll('[data-cover] canvas')).toHaveLength(1);
			expect(pressed(root)).toEqual(['false', 'true', 'false']);
			const rest = coverage(root);
			expect(rest).toBeGreaterThan(0);
			expect(rest).toBeLessThan(ledRest);

			await userEvent.click(toggle(root));
			await barsFollow(root, rest);
			expect(audio(root).paused).toBe(false);

			await userEvent.click(visualizer(root, 'wave'));
			await until(() => expect(pressed(root)).toEqual(['false', 'false', 'true']));
			expect(root.querySelectorAll('[data-cover] canvas')).toHaveLength(1);
		});

		test('switching while the track plays keeps it playing and the new preset draws', async () => {
			const root = await seekable(await form.mount());
			const rest = coverage(root);
			await userEvent.click(toggle(root));
			await barsFollow(root, rest);

			await userEvent.click(visualizer(root, 'wave'));

			await untilFrame(() => expect(drawn(canvas(root)!)).toBe(true));
			expect(audio(root).paused).toBe(false);

			await userEvent.click(visualizer(root, 'led'));

			await barsFollow(root, rest);
			expect(audio(root).paused).toBe(false);
		});

		test('the wave runs edge to edge of the cover, and the bars keep a margin', async () => {
			const root = frame(await seekable(await form.mount()));
			await userEvent.click(toggle(root));
			await until(() => expect(audio(root).paused).toBe(false));
			const extent = (element: HTMLCanvasElement) => {
				const { data } = element.getContext('2d')!.getImageData(0, 0, element.width, element.height);
				const lit = Array.from({ length: element.width }, (_, x) =>
					Array.from({ length: element.height }, (_, y) => data[(y * element.width + x) * 4 + 3]).some(
						Boolean,
					),
				);
				return { first: lit.indexOf(true), last: lit.lastIndexOf(true), width: element.width };
			};
			const margin = 12 * window.devicePixelRatio;

			await untilFrame(() => expect(extent(canvas(root)!).first).toBeGreaterThanOrEqual(margin - 1));
			expect(extent(canvas(root)!).last).toBeLessThanOrEqual(extent(canvas(root)!).width - margin);
			expect(canvas(root)!.getBoundingClientRect().width).toBe(
				root.querySelector('[data-cover]')!.getBoundingClientRect().width,
			);

			await userEvent.click(visualizer(root, 'wave'));
			await untilFrame(() => expect(extent(canvas(root)!).first).toBe(0));
			expect(extent(canvas(root)!).last).toBe(extent(canvas(root)!).width - 1);
		});

		test('the cover has no border, and its corners are rounded and clip the canvas', async () => {
			const root = frame(await seekable(await form.mount()));
			const style = getComputedStyle(root.querySelector('[data-cover]')!);

			expect(style.borderTopWidth).toBe('0px');
			expect(style.borderTopStyle).toBe('none');
			expect(style.outlineStyle).toBe('none');
			expect(style.overflow).toBe('hidden');
			expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(0);
			expect(style.boxShadow).toBe('none');
		});

		test('the wave stays selected on the next track, and leaves no canvas when the player is removed', async () => {
			const root = await seekable(await form.mount());
			await userEvent.click(visualizer(root, 'wave'));
			await userEvent.click(root.querySelector('[data-next]')!);
			await until(() => expect(current(root)).toBe('Low Tide'));
			expect(canvas(root)).not.toBeNull();
			expect(pressed(root)).toEqual(['false', 'false', 'true']);

			await form.remove(root);

			expect(canvas(root)).toBeNull();
		});
	});
}
