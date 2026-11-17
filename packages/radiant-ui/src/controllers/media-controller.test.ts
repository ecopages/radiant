import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	MediaController,
	createMediaController,
	type MediaControllerConfig,
	type MediaState,
} from './media-controller';
import { createWaiters, fakeTimers, frames, nothingFollows, once } from './event.fixture';

const urls = new Set<string>();
const live = new Set<string>();
const controllers: MediaController[] = [];
const elements: HTMLMediaElement[] = [];

/** A silent 16-bit mono WAV of `seconds`, as an object URL the test revokes. */
function wav(seconds: number): string {
	const rate = 8000;
	const samples = Math.round(seconds * rate);
	const buffer = new ArrayBuffer(44 + samples * 2);
	const view = new DataView(buffer);
	const text = (offset: number, value: string) =>
		[...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
	text(0, 'RIFF');
	view.setUint32(4, 36 + samples * 2, true);
	text(8, 'WAVE');
	text(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, rate, true);
	view.setUint32(28, rate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	text(36, 'data');
	view.setUint32(40, samples * 2, true);
	const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
	urls.add(url);
	return url;
}

function brokenAudio(): string {
	const url = URL.createObjectURL(new Blob(['this is not audio'], { type: 'audio/wav' }));
	urls.add(url);
	return url;
}

/** Defines a getter on the instance that shadows the prototype's, until `restore`. */
function stub(media: HTMLMediaElement, property: string, value: unknown): void {
	Object.defineProperty(media, property, { configurable: true, get: () => value });
}

function restore(media: HTMLMediaElement, property: string): void {
	Reflect.deleteProperty(media, property);
}

/** Records every value written to `currentTime` and still performs the write. */
function spyCurrentTime(media: HTMLMediaElement): number[] {
	const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!;
	const writes: number[] = [];
	Object.defineProperty(media, 'currentTime', {
		configurable: true,
		get: () => descriptor.get!.call(media) as number,
		set: (value: number) => {
			writes.push(value);
			descriptor.set!.call(media, value);
		},
	});
	return writes;
}

function countEvents(media: HTMLMediaElement, type: string): { count: () => number } {
	let count = 0;
	media.addEventListener(type, () => count++);
	return { count: () => count };
}

const STATE_KEYS = [
	'status',
	'currentSrc',
	'duration',
	'seekable',
	'live',
	'volume',
	'muted',
	'rate',
	'loop',
	'waiting',
	'seeking',
	'blocked',
	'error',
] as const;

type Harness = {
	media: HTMLAudioElement;
	controller: MediaController;
	states: MediaState[];
	progress: MediaState[];
	errors: Array<MediaError | Error>;
	statuses: () => string[];
	until: (predicate: (state: MediaState) => boolean) => Promise<MediaState>;
};

function setup(config: Partial<MediaControllerConfig> = {}, media: HTMLAudioElement = new Audio()): Harness {
	document.body.append(media);
	elements.push(media);
	const states: MediaState[] = [];
	const progress: MediaState[] = [];
	const errors: Array<MediaError | Error> = [];
	const { notify, until: untilWaiter } = createWaiters();
	const { onState, onProgress, onError, ...rest } = config;
	const controller = new MediaController({
		getMedia: () => media,
		...rest,
		onState: (state) => {
			states.push(state);
			onState?.(state);
			notify();
		},
		onProgress: (state) => {
			progress.push(state);
			onProgress?.(state);
			notify();
		},
		onError: (error) => {
			errors.push(error);
			onError?.(error);
			notify();
		},
	});
	controllers.push(controller);
	return {
		until: async (predicate) => {
			let reached: MediaState | undefined;
			await untilWaiter(() => {
				const state = states.at(-1);
				if (!state || !predicate(state)) {
					return false;
				}
				reached = state;
				return true;
			});
			return reached!;
		},
		media,
		controller,
		states,
		progress,
		errors,
		statuses: () => states.map((state) => state.status).filter((status, i, all) => status !== all[i - 1]),
	};
}

async function ready(harness: Harness, seconds = 3): Promise<string> {
	const url = wav(seconds);
	harness.controller.attach();
	await harness.controller.load(url);
	await harness.until((state) => state.status === 'ready');
	return url;
}

async function playing(harness: Harness): Promise<void> {
	await harness.controller.play();
	await harness.until((state) => state.status === 'playing');
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

afterEach(() => {
	for (const controller of controllers.splice(0)) {
		controller.destroy();
	}
	for (const media of elements.splice(0)) {
		media.remove();
	}
	for (const url of urls) {
		URL.revokeObjectURL(url);
	}
	urls.clear();
	live.clear();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('MediaController attach and state', () => {
	it('attaching to a fresh element reports idle once and starts nothing', async () => {
		const { controller, states, progress, media } = setup();
		controller.attach();

		expect(states).toHaveLength(1);
		expect(states[0]).toMatchObject({
			status: 'idle',
			position: 0,
			seekable: false,
			live: false,
			buffered: 0,
			volume: 1,
			muted: false,
			rate: 1,
			loop: false,
			waiting: false,
			seeking: false,
			blocked: false,
			error: null,
		});
		expect(Number.isNaN(states[0]!.duration)).toBe(true);
		expect(progress).toHaveLength(1);
		await frames(3);
		expect(progress).toHaveLength(1);
		expect(media.paused).toBe(true);
	});

	it('moves to loading and then ready on load', async () => {
		const harness = setup();
		harness.controller.attach();
		const loaded = harness.controller.load(wav(1));

		expect(harness.controller.getState().status).toBe('loading');
		await loaded;
		await harness.until((state) => state.status === 'ready');
		expect(harness.statuses()).toEqual(['idle', 'loading', 'ready']);
		const state = harness.controller.getState();
		expect(state.duration).toBeCloseTo(1, 1);
		expect(state.seekable).toBe(true);
		expect(state.live).toBe(false);
	});

	it('goes ready, playing, paused and ended', async () => {
		const harness = setup();
		await ready(harness, 0.4);

		await playing(harness);
		harness.controller.pause();
		expect(harness.controller.getState().status).toBe('paused');

		await harness.controller.play();
		await harness.until((state) => state.status === 'ended');
		expect(harness.statuses()).toEqual(['idle', 'loading', 'ready', 'playing', 'paused', 'playing', 'ended']);
		expect(harness.controller.getState().status).toBe('ended');
		expect(harness.controller.getState().position).toBeCloseTo(0.4, 1);
	});

	it('keeps playing past the end with loop', async () => {
		const harness = setup();
		await ready(harness, 0.3);
		harness.controller.setLoop(true);
		expect(harness.controller.getState().loop).toBe(true);

		await playing(harness);
		await once(harness.media, 'seeked');

		expect(harness.controller.getState().status).toBe('playing');
		expect(harness.statuses()).not.toContain('ended');
	});

	it('syncs a media that is already playing when attached and starts the frame loop', async () => {
		const harness = setup();
		harness.media.src = wav(3);
		await harness.media.play();

		harness.controller.attach();
		expect(harness.states.at(-1)!.status).toBe('playing');
		const before = harness.progress.length;
		await frames(5);
		expect(harness.progress.length).toBeGreaterThanOrEqual(before + 3);
	});

	it('syncs a media that already has metadata when attached', async () => {
		const harness = setup();
		const canPlay = once(harness.media, 'canplay');
		harness.media.src = wav(1);
		await canPlay;

		harness.controller.attach();

		expect(harness.states[0]).toMatchObject({ status: 'ready', seekable: true });
		expect(harness.states[0]!.duration).toBeCloseTo(1, 1);
	});

	it('destroys and attaches again, syncing the current state', async () => {
		const harness = setup({ pauseOnDestroy: false });
		await ready(harness);
		await playing(harness);

		harness.controller.destroy();
		const countAfterDestroy = harness.progress.length;
		await frames(3);
		expect(harness.progress).toHaveLength(countAfterDestroy);

		harness.controller.attach();
		expect(harness.states.at(-1)!.status).toBe('playing');
		await frames(4);
		expect(harness.progress.length).toBeGreaterThan(countAfterDestroy + 1);
	});

	it('attach and destroy are idempotent', async () => {
		const harness = setup();
		harness.controller.attach();
		harness.controller.attach();
		expect(harness.states).toHaveLength(1);

		harness.controller.destroy();
		expect(() => harness.controller.destroy()).not.toThrow();
		harness.controller.attach();
		harness.controller.attach();
		expect(harness.states).toHaveLength(2);
	});

	it('re-resolves getMedia on attach and moves its listeners', async () => {
		const first = new Audio();
		const second = new Audio();
		document.body.append(second);
		elements.push(second);
		let current = first;
		const harness = setup({ getMedia: () => current }, first);
		harness.controller.attach();
		const base = harness.states.length;

		current = second;
		harness.controller.attach();
		expect(harness.states.length).toBe(base + 1);

		const silenced = once(first, 'volumechange');
		first.volume = 0.2;
		await silenced;
		expect(harness.states).toHaveLength(base + 1);
		second.volume = 0.4;
		await harness.until((state) => state.volume === 0.4);
	});

	it('stays inert when getMedia returns null and works after a later attach', async () => {
		let target: HTMLAudioElement | null = null;
		const harness = setup({ getMedia: () => target });
		harness.controller.attach();

		expect(harness.states).toHaveLength(0);
		expect(harness.controller.getState().status).toBe('idle');
		harness.controller.setVolume(0.5);
		harness.controller.seek(2);
		harness.controller.scrub(2);
		harness.controller.skip(2);
		harness.controller.pause();
		await harness.controller.play();
		await harness.controller.load(wav(1));
		expect(() => harness.controller.destroy()).not.toThrow();

		target = harness.media;
		harness.controller.attach();
		expect(harness.states).toHaveLength(1);
	});

	it('maps readyState and networkState combinations to a status', async () => {
		const harness = setup();
		harness.controller.attach();
		const { media } = harness;
		const status = () => {
			media.dispatchEvent(new Event('progress'));
			return harness.controller.getState().status;
		};

		stub(media, 'networkState', 0);
		stub(media, 'readyState', 0);
		expect(status()).toBe('idle');

		stub(media, 'networkState', 2);
		expect(status()).toBe('loading');
		stub(media, 'networkState', 3);
		expect(status()).toBe('idle');
		media.setAttribute('src', 'blob:pending');
		expect(status()).toBe('loading');
		media.removeAttribute('src');
		const child = media.appendChild(document.createElement('source'));
		expect(status()).toBe('loading');
		child.remove();
		stub(media, 'srcObject', new MediaStream());
		expect(status()).toBe('loading');
		stub(media, 'srcObject', null);
		expect(status()).toBe('idle');

		stub(media, 'networkState', 2);
		stub(media, 'readyState', 1);
		expect(status()).toBe('loading');

		stub(media, 'networkState', 1);
		expect(status()).toBe('ready');
		stub(media, 'readyState', 0);
		expect(status()).toBe('ready');

		stub(media, 'networkState', 2);
		stub(media, 'readyState', 2);
		expect(status()).toBe('ready');
		stub(media, 'readyState', 4);
		expect(status()).toBe('ready');

		stub(media, 'paused', false);
		expect(status()).toBe('playing');
		stub(media, 'readyState', 0);
		expect(status()).toBe('loading');

		stub(media, 'paused', true);
		stub(media, 'ended', true);
		stub(media, 'readyState', 4);
		expect(status()).toBe('ended');
		expect(harness.statuses()).toEqual([
			'idle',
			'loading',
			'idle',
			'loading',
			'idle',
			'loading',
			'ready',
			'playing',
			'loading',
			'ended',
		]);
	});

	it('reports metadata-only media as seekable with an unknown duration clamped at zero', async () => {
		const harness = setup();
		await ready(harness);
		const writes = spyCurrentTime(harness.media);
		stub(harness.media, 'duration', Number.NaN);
		harness.media.dispatchEvent(new Event('durationchange'));

		expect(harness.controller.getState()).toMatchObject({ seekable: true, live: false });
		harness.controller.seek(100);
		harness.controller.seek(-4);

		expect(writes).toEqual([100, 0]);
	});

	it('reports a live stream as live and not seekable and ignores seeks', async () => {
		const harness = setup();
		await ready(harness);
		const writes = spyCurrentTime(harness.media);
		stub(harness.media, 'duration', Number.POSITIVE_INFINITY);
		stub(harness.media, 'seekable', { length: 0, start: () => 0, end: () => 0 });
		harness.media.dispatchEvent(new Event('durationchange'));

		expect(harness.controller.getState()).toMatchObject({ live: true, seekable: false, seekableRange: null });
		expect(harness.states.at(-1)).toMatchObject({ live: true, seekable: false });
		fakeTimers();
		harness.controller.seek(5);
		harness.controller.scrub(5);
		harness.controller.skip(5);
		vi.advanceTimersByTime(200);

		expect(writes).toEqual([]);
		expect(harness.controller.getState().position).toBe(0);
	});

	it('reports unknown duration before metadata as not seekable', async () => {
		const harness = setup();
		harness.controller.attach();
		const writes = spyCurrentTime(harness.media);

		fakeTimers();
		harness.controller.seek(5);
		harness.controller.scrub(5);

		expect(Number.isNaN(harness.controller.getState().duration)).toBe(true);
		expect(harness.controller.getState().seekable).toBe(false);
		vi.advanceTimersByTime(200);
		expect(writes).toEqual([]);
	});

	it('computes buffered from the real ranges and from stubbed ones', async () => {
		const harness = setup();
		await ready(harness, 2);
		await harness.until((state) => Math.abs(state.buffered - 2) < 0.05);

		const buffered = {
			length: 2,
			start: (i: number) => [0, 30][i]!,
			end: (i: number) => [10, 50][i]!,
		};
		stub(harness.media, 'buffered', buffered);
		stub(harness.media, 'currentTime', 5);
		harness.media.dispatchEvent(new Event('progress'));
		expect(harness.controller.getState().buffered).toBe(10);

		stub(harness.media, 'currentTime', 20);
		expect(harness.controller.getState().buffered).toBe(0);
		stub(harness.media, 'currentTime', 35);
		expect(harness.controller.getState().buffered).toBe(50);
	});

	it('sets waiting when readyState drops below HAVE_FUTURE_DATA while playing and clears it on playing', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		expect(harness.controller.getState().waiting).toBe(false);

		stub(harness.media, 'readyState', 2);
		harness.media.dispatchEvent(new Event('waiting'));
		expect(harness.controller.getState().waiting).toBe(true);
		expect(harness.states.at(-1)!.waiting).toBe(true);
		restore(harness.media, 'readyState');
		harness.media.dispatchEvent(new Event('playing'));
		expect(harness.controller.getState().waiting).toBe(false);
		expect(harness.states.at(-1)!.waiting).toBe(false);
	});

	it('derives waiting from a readyState below HAVE_FUTURE_DATA while playing, not while paused', async () => {
		const harness = setup();
		await ready(harness);
		stub(harness.media, 'readyState', 2);
		harness.media.dispatchEvent(new Event('waiting'));
		expect(harness.controller.getState().waiting).toBe(false);
		restore(harness.media, 'readyState');

		await playing(harness);
		stub(harness.media, 'readyState', 2);
		expect(harness.controller.getState().waiting).toBe(true);
		restore(harness.media, 'readyState');
		harness.media.dispatchEvent(new Event('playing'));
		expect(harness.controller.getState().waiting).toBe(false);
	});

	it('reports seeking from the element', async () => {
		const harness = setup();
		await ready(harness);
		stub(harness.media, 'seeking', true);
		harness.media.dispatchEvent(new Event('seeking'));
		expect(harness.states.at(-1)!.seeking).toBe(true);
		restore(harness.media, 'seeking');
		harness.media.dispatchEvent(new Event('seeked'));
		expect(harness.states.at(-1)!.seeking).toBe(false);
	});

	it('works on a video element with no source and with an audio file', async () => {
		const video = document.createElement('video');
		const { controller, states, media, until } = setup(
			{ getMedia: () => video },
			video as unknown as HTMLAudioElement,
		);
		controller.attach();

		expect(states[0]).toMatchObject({ status: 'idle', seekable: false });
		controller.setVolume(0.5);
		controller.setMuted(true);
		await until((state) => state.volume === 0.5 && state.muted === true);
		controller.seek(3);
		expect(video.currentTime).toBe(0);

		await controller.load(wav(1));
		await until((state) => state.status === 'ready');
		expect(media).toBe(video);
	});
});

describe('MediaController progress and the frame loop', () => {
	it('calls onProgress once per frame while playing, not twice per frame', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);

		const before = harness.progress.length;
		let ticks = 0;
		const stop = performance.now() + 300;
		await new Promise<void>((resolve) => {
			const step = () => {
				ticks++;
				return performance.now() < stop ? requestAnimationFrame(step) : resolve();
			};
			requestAnimationFrame(step);
		});
		const calls = harness.progress.length - before;

		expect(calls).toBeGreaterThanOrEqual(ticks - 3);
		expect(calls).toBeLessThanOrEqual(ticks + 2);
	});

	it('calls onProgress exactly once per timeupdate, seeked and progress while not playing', async () => {
		const harness = setup();
		await ready(harness);
		await frames(2);
		harness.progress.length = 0;

		harness.media.dispatchEvent(new Event('timeupdate'));
		expect(harness.progress).toHaveLength(1);
		harness.media.dispatchEvent(new Event('seeked'));
		expect(harness.progress).toHaveLength(2);
		harness.media.dispatchEvent(new Event('progress'));
		expect(harness.progress).toHaveLength(3);
		harness.media.dispatchEvent(new Event('volumechange'));
		expect(harness.progress).toHaveLength(3);
		await frames(3);
		expect(harness.progress).toHaveLength(3);
	});

	it('leaves timeupdate to the frame loop while playing', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		const before = harness.progress.length;

		harness.media.dispatchEvent(new Event('timeupdate'));
		harness.media.dispatchEvent(new Event('seeked'));

		expect(harness.progress).toHaveLength(before);
	});

	it('stops the frame loop on pause', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		harness.controller.pause();
		await frames(2);
		const count = harness.progress.length;
		await frames(5);
		expect(harness.progress).toHaveLength(count);
	});

	it('stops the frame loop on ended', async () => {
		const harness = setup();
		await ready(harness, 0.3);
		await playing(harness);
		await harness.until((state) => state.status === 'ended');
		await frames(2);
		const count = harness.progress.length;
		await frames(5);
		expect(harness.progress).toHaveLength(count);
	});

	it('stops the frame loop on emptied', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		const emptied = once(harness.media, 'emptied');
		harness.media.removeAttribute('src');
		harness.media.load();
		await emptied;
		await frames(2);
		const count = harness.progress.length;
		await frames(5);
		expect(harness.progress).toHaveLength(count);
	});

	it('stops the frame loop on a media error', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		stub(harness.media, 'error', { code: 4, message: 'unsupported' });
		harness.media.dispatchEvent(new Event('error'));
		expect(harness.controller.getState().status).toBe('error');
		await frames(2);
		const count = harness.progress.length;
		await frames(5);
		expect(harness.progress).toHaveLength(count);
	});

	it('stops the frame loop when the media is no longer playing without an event', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		harness.media.pause();
		await frames(3);
		const count = harness.progress.length;
		await frames(5);
		expect(harness.progress).toHaveLength(count);
		expect(harness.controller.getState().status).toBe('paused');
	});
});

describe('MediaController destroy', () => {
	it('stops the loop, cancels a pending scrub and pauses by default', async () => {
		const harness = setup({ seekDebounce: 100 });
		await ready(harness);
		await playing(harness);
		const writes = spyCurrentTime(harness.media);
		fakeTimers();
		harness.controller.scrub(2);

		harness.controller.destroy();
		const count = harness.progress.length;
		await Promise.resolve();
		vi.advanceTimersByTime(250);

		expect(harness.media.paused).toBe(true);
		expect(writes).toEqual([]);
		expect(harness.progress).toHaveLength(count);
		expect(harness.media.getAttribute('src')).not.toBeNull();
	});

	it('does not pause with pauseOnDestroy false and still stops the loop', async () => {
		const harness = setup({ pauseOnDestroy: false });
		await ready(harness);
		await playing(harness);

		harness.controller.destroy();
		const count = harness.progress.length;
		await frames(5);

		expect(harness.media.paused).toBe(false);
		expect(harness.progress).toHaveLength(count);
	});

	it('does not report anything after destroy', async () => {
		const harness = setup();
		await ready(harness);
		harness.controller.destroy();
		const states = harness.states.length;

		const changed = once(harness.media, 'volumechange');
		harness.media.volume = 0.3;
		harness.media.dispatchEvent(new Event('timeupdate'));
		await changed;

		expect(harness.states).toHaveLength(states);
		expect(harness.controller.getState().status).toBe('idle');
	});

	it('keeps src by default and clears it with clearSourceOnDestroy, releasing the resolved source', async () => {
		const released: string[] = [];
		const harness = setup({
			clearSourceOnDestroy: true,
			resolveSource: async (url) => `${url}#resolved`,
			releaseSource: (url) => released.push(url),
		});
		harness.controller.attach();
		const url = wav(1);
		await harness.controller.load(url);
		expect(harness.media.getAttribute('src')).toBe(`${url}#resolved`);

		harness.controller.destroy();
		await Promise.resolve();

		expect(harness.media.hasAttribute('src')).toBe(false);
		expect(released).toEqual([`${url}#resolved`]);
	});
});

describe('MediaController load', () => {
	it('replaces a playing media: one frame loop, loading then playing, no state storm', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		const firstCount = harness.states.length;

		await harness.controller.load(wav(3), { autoplay: true });
		await harness.until((state) => state.status === 'playing');
		await nothingFollows('a second state change after the swap settled');

		expect(harness.statuses().slice(-3)).toEqual(['playing', 'loading', 'playing']);
		expect(harness.states.length - firstCount).toBeLessThan(8);
		for (let i = 1; i < harness.states.length; i++) {
			const changed = STATE_KEYS.some((key) => !Object.is(harness.states[i - 1]![key], harness.states[i]![key]));
			expect(changed).toBe(true);
		}
		const before = harness.progress.length;
		let ticks = 0;
		const stop = performance.now() + 250;
		await new Promise<void>((resolve) => {
			const step = () => {
				ticks++;
				return performance.now() < stop ? requestAnimationFrame(step) : resolve();
			};
			requestAnimationFrame(step);
		});
		expect(harness.progress.length - before).toBeLessThanOrEqual(ticks + 2);
	});

	it('replaces an earlier load with a later one', async () => {
		const harness = setup();
		harness.controller.attach();
		const first = wav(1);
		const second = wav(2);
		const firstLoad = harness.controller.load(first);
		const secondLoad = harness.controller.load(second);
		await Promise.all([firstLoad, secondLoad]);

		expect(harness.media.src).toBe(second);
		await harness.until((state) => state.status === 'ready');
		expect(harness.controller.getState().duration).toBeCloseTo(2, 1);
	});

	it('plays on ready only with autoplay', async () => {
		const harness = setup();
		harness.controller.attach();
		await harness.controller.load(wav(2));
		await harness.until((state) => state.status === 'ready');
		await nothingFollows('an autoplay that was not asked for');
		expect(harness.controller.getState().status).toBe('ready');

		await harness.controller.load(wav(2), { autoplay: true });
		await harness.until((state) => state.status === 'playing');
	});

	it('discards a pending scrub and applies it to neither the old nor the new source', async () => {
		const harness = setup({ seekDebounce: 100 });
		await ready(harness);
		const writes = spyCurrentTime(harness.media);
		fakeTimers();
		harness.controller.scrub(2);

		await harness.controller.load(wav(3));
		vi.advanceTimersByTime(250);

		expect(writes).toEqual([]);
		expect(harness.controller.getState().position).toBe(0);
	});

	it('discards a pending scrub at once when the new source is still resolving', async () => {
		const gate = deferred<string>();
		const harness = setup({
			seekDebounce: 80,
			resolveSource: (url) => (url === 'first' ? Promise.resolve(wav(3)) : gate.promise),
		});
		harness.controller.attach();
		await harness.controller.load('first');
		await harness.until((state) => state.status === 'ready');
		const writes = spyCurrentTime(harness.media);
		fakeTimers();
		harness.controller.scrub(2);

		const loaded = harness.controller.load('second');
		expect(harness.controller.getState().position).toBe(0);
		vi.advanceTimersByTime(200);

		expect(writes).toEqual([]);
		gate.resolve(wav(1));
		await loaded;
	});

	it('pauses the old source while resolveSource is pending and goes loading', async () => {
		const gate = deferred<string>();
		const harness = setup({ resolveSource: () => gate.promise });
		harness.controller.attach();
		harness.media.src = wav(3);
		await harness.media.play();

		const loaded = harness.controller.load('x');
		expect(harness.controller.getState().status).toBe('loading');
		expect(harness.media.paused).toBe(true);

		gate.resolve(wav(1));
		await loaded;
		await harness.until((state) => state.status === 'ready');
	});

	it('plays after resolveSource when play is called while it is pending', async () => {
		const gate = deferred<string>();
		const harness = setup({ resolveSource: () => gate.promise });
		harness.controller.attach();
		const loaded = harness.controller.load('x');
		await harness.controller.play();
		expect(harness.controller.getState().status).toBe('loading');

		gate.resolve(wav(2));
		await loaded;
		await harness.until((state) => state.status === 'playing');
	});

	it('pause during a pending autoplay load cancels the autoplay', async () => {
		const gate = deferred<string>();
		const harness = setup({ resolveSource: () => gate.promise });
		harness.controller.attach();
		const loaded = harness.controller.load('x', { autoplay: true });
		harness.controller.pause();

		gate.resolve(wav(2));
		await loaded;
		await harness.until((state) => state.status === 'ready');
		await nothingFollows('the autoplay that pause() cancelled');
		expect(harness.controller.getState().status).toBe('ready');
	});
});

describe('MediaController resolveSource', () => {
	function blobSource() {
		const created: string[] = [];
		return {
			created,
			resolveSource: async (url: string) => {
				const resolved = URL.createObjectURL(await (await fetch(url)).blob());
				created.push(resolved);
				live.add(resolved);
				return resolved;
			},
			releaseSource: (url: string) => {
				live.delete(url);
				URL.revokeObjectURL(url);
			},
		};
	}

	it('loads through the hook and releases the previous source on the next load', async () => {
		const source = blobSource();
		const harness = setup(source);
		harness.controller.attach();
		await harness.controller.load(wav(1));
		await harness.controller.load(wav(2));

		expect(source.created).toHaveLength(2);
		expect(harness.media.src).toBe(source.created[1]);
		expect([...live]).toEqual([source.created[1]]);
		await harness.until((state) => Math.abs(state.duration - 2) < 0.05);
	});

	it('ignores a stale resolution after a newer load and releases it', async () => {
		const first = deferred<string>();
		const second = deferred<string>();
		const pending = [first, second];
		const released: string[] = [];
		const harness = setup({
			resolveSource: () => pending.shift()!.promise,
			releaseSource: (url) => released.push(url),
		});
		harness.controller.attach();
		const staleUrl = wav(1);
		const freshUrl = wav(2);
		const firstLoad = harness.controller.load('a');
		const secondLoad = harness.controller.load('b');

		second.resolve(freshUrl);
		await secondLoad;
		first.resolve(staleUrl);
		await firstLoad;

		expect(harness.media.src).toBe(freshUrl);
		expect(released).toEqual([staleUrl]);
		await harness.until((state) => state.status === 'ready');
		expect(harness.controller.getState().duration).toBeCloseTo(2, 1);
	});

	it('ignores a resolution that arrives after destroy and releases it', async () => {
		const gate = deferred<string>();
		const released: string[] = [];
		const harness = setup({ resolveSource: () => gate.promise, releaseSource: (url) => released.push(url) });
		harness.controller.attach();
		const loaded = harness.controller.load('a');
		harness.controller.destroy();
		const late = wav(1);

		gate.resolve(late);
		await loaded;

		expect(harness.media.hasAttribute('src')).toBe(false);
		expect(released).toEqual([late]);
		expect(harness.states.at(-1)!.status).toBe('loading');
	});

	it('creates no object URL of its own and leaves none live after a race and a destroy', async () => {
		const create = vi.spyOn(URL, 'createObjectURL');
		const source = blobSource();
		const harness = setup({ ...source, clearSourceOnDestroy: true });
		harness.controller.attach();
		const created = create.mock.calls.length;

		const loads = [
			harness.controller.load(wav(1)),
			harness.controller.load(wav(1)),
			harness.controller.load(wav(1)),
		];
		await Promise.all(loads);
		expect(create.mock.calls.length - created).toBe(3 + 3);
		expect(live.size).toBe(1);

		harness.controller.destroy();
		await Promise.resolve();
		expect(live.size).toBe(0);
	});

	it('goes to error when resolveSource rejects, calls onError once and recovers on the next load', async () => {
		const boom = new Error('fetch failed');
		const harness = setup({
			resolveSource: async (url) => {
				if (url === 'bad') {
					throw boom;
				}
				return url;
			},
		});
		harness.controller.attach();
		await harness.controller.load('bad');

		expect(harness.controller.getState()).toMatchObject({ status: 'error', error: boom });
		expect(harness.errors).toEqual([boom]);
		expect(harness.media.hasAttribute('src')).toBe(false);

		await harness.controller.load(wav(1));
		await harness.until((state) => state.status === 'ready');
		expect(harness.controller.getState().error).toBeNull();
		expect(harness.errors).toHaveLength(1);
	});

	it('wraps a rejection that is not an Error', async () => {
		const harness = setup({ resolveSource: () => Promise.reject('nope') });
		harness.controller.attach();
		await harness.controller.load('x');

		expect(harness.controller.getState().error).toBeInstanceOf(Error);
		expect(harness.controller.getState().error!.message).toBe('nope');
	});

	it('does not report a rejection of a superseded load', async () => {
		const first = deferred<string>();
		const pending = [first];
		const harness = setup({ resolveSource: (url) => pending.shift()?.promise ?? Promise.resolve(url) });
		harness.controller.attach();
		const firstLoad = harness.controller.load('a');
		await harness.controller.load(wav(1));

		first.reject(new Error('late'));
		await firstLoad;

		expect(harness.errors).toEqual([]);
		await harness.until((state) => state.status === 'ready');
	});
});

describe('MediaController errors', () => {
	it('goes to error on a media error, calls onError once and recovers on a later load', async () => {
		const harness = setup();
		harness.controller.attach();
		await harness.controller.load(brokenAudio());
		await harness.until((state) => state.status === 'error');

		const { error } = harness.controller.getState();
		expect(error).toBe(harness.media.error);
		expect(harness.errors).toEqual([error]);
		harness.media.dispatchEvent(new Event('timeupdate'));
		harness.media.dispatchEvent(new Event('volumechange'));
		expect(harness.errors).toHaveLength(1);

		await harness.controller.load(wav(1));
		await harness.until((state) => state.status === 'ready');
		expect(harness.controller.getState().error).toBeNull();
		expect(harness.errors).toHaveLength(1);
	});

	it('reports a second error after recovery', async () => {
		const harness = setup();
		harness.controller.attach();
		await harness.controller.load(brokenAudio());
		await harness.until(() => harness.errors.length >= 1);
		await harness.controller.load(wav(1));
		await harness.until((state) => state.status === 'ready');
		await harness.controller.load(brokenAudio());
		await harness.until(() => harness.errors.length >= 2);
	});

	it('reports an error already present when attached', async () => {
		const harness = setup();
		const failed = once(harness.media, 'error');
		harness.media.src = brokenAudio();
		await failed;

		harness.controller.attach();

		expect(harness.states[0]!.status).toBe('error');
		expect(harness.errors).toEqual([harness.media.error]);
	});
});

describe('MediaController play', () => {
	it('resolves quietly on an AbortError', async () => {
		const harness = setup();
		await ready(harness);
		const count = harness.states.length;
		vi.spyOn(harness.media, 'play').mockRejectedValue(new DOMException('interrupted', 'AbortError'));

		await expect(harness.controller.play()).resolves.toBeUndefined();

		expect(harness.errors).toEqual([]);
		expect(harness.controller.getState()).toMatchObject({ error: null, blocked: false });
		expect(harness.states).toHaveLength(count);
	});

	function trackPlayRejections(media: HTMLMediaElement): string[] {
		const names: string[] = [];
		const play = media.play.bind(media);
		media.play = () => {
			const promise = play();
			promise.catch((error: DOMException) => names.push(error.name));
			return promise;
		};
		return names;
	}

	it('survives a real AbortError from a pause while the play promise is pending', async () => {
		const harness = setup();
		harness.controller.attach();
		harness.media.src = wav(3);
		const rejections = trackPlayRejections(harness.media);
		const started = harness.controller.play();
		harness.controller.pause();

		await expect(started).resolves.toBeUndefined();
		expect(rejections).toEqual(['AbortError']);
		expect(harness.errors).toEqual([]);
		expect(harness.controller.getState().error).toBeNull();
	});

	it('survives a real AbortError from a load while the play promise is pending', async () => {
		const harness = setup();
		harness.controller.attach();
		harness.media.src = wav(3);
		const rejections = trackPlayRejections(harness.media);
		const started = harness.controller.play();
		const reloaded = harness.controller.load(wav(1));

		await expect(started).resolves.toBeUndefined();
		await reloaded;
		expect(rejections).toEqual(['AbortError']);
		expect(harness.errors).toEqual([]);
		expect(harness.controller.getState().error).toBeNull();
	});

	it('reports blocked, status paused and no error on a NotAllowedError', async () => {
		const harness = setup();
		await ready(harness);
		vi.spyOn(harness.media, 'play').mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));

		await expect(harness.controller.play()).resolves.toBeUndefined();

		expect(harness.controller.getState()).toMatchObject({ status: 'paused', blocked: true, error: null });
		expect(harness.states.at(-1)!.blocked).toBe(true);
		expect(harness.errors).toEqual([]);
	});

	it('clears blocked on the next play and on pause and load', async () => {
		const harness = setup();
		await ready(harness);
		const play = vi.spyOn(harness.media, 'play').mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
		await harness.controller.play();
		expect(harness.controller.getState().blocked).toBe(true);

		play.mockRestore();
		await harness.controller.play();
		await harness.until((state) => state.status === 'playing' && state.blocked === false);

		vi.spyOn(harness.media, 'play').mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
		harness.controller.pause();
		await harness.controller.play();
		expect(harness.controller.getState().blocked).toBe(true);
		harness.controller.pause();
		expect(harness.controller.getState().blocked).toBe(false);
		await harness.controller.play();
		await harness.controller.load(wav(1));
		expect(harness.controller.getState().blocked).toBe(false);
	});

	it('goes to error on any other rejection and recovers on the next play', async () => {
		const harness = setup();
		await ready(harness);
		const failure = new DOMException('no sources', 'NotSupportedError');
		const play = vi.spyOn(harness.media, 'play').mockRejectedValue(failure);

		await expect(harness.controller.play()).resolves.toBeUndefined();

		expect(harness.controller.getState()).toMatchObject({ status: 'error', error: failure });
		expect(harness.errors).toEqual([failure]);

		play.mockRestore();
		await harness.controller.play();
		await harness.until((state) => state.status === 'playing');
		expect(harness.controller.getState().error).toBeNull();
		expect(harness.errors).toHaveLength(1);
	});

	it('wraps a rejection that is not an Error', async () => {
		const harness = setup();
		await ready(harness);
		vi.spyOn(harness.media, 'play').mockRejectedValue('weird');

		await harness.controller.play();

		expect(harness.controller.getState().error).toBeInstanceOf(Error);
	});

	it('does nothing when playing an element with no source', async () => {
		const harness = setup();
		harness.controller.attach();
		const play = vi.spyOn(harness.media, 'play');

		await harness.controller.play();
		await harness.controller.toggle();

		expect(play).not.toHaveBeenCalled();
		expect(harness.controller.getState().status).toBe('idle');
		expect(harness.errors).toEqual([]);
	});

	it('toggles between playing and paused', async () => {
		const harness = setup();
		await ready(harness);

		await harness.controller.toggle();
		await harness.until((state) => state.status === 'playing');
		await harness.controller.toggle();
		expect(harness.controller.getState().status).toBe('paused');
		await harness.controller.toggle();
		await harness.until((state) => state.status === 'playing');
	});

	it('treats a pending autoplay as playing for toggle', async () => {
		const gate = deferred<string>();
		const harness = setup({ resolveSource: () => gate.promise });
		harness.controller.attach();
		const loaded = harness.controller.load('x', { autoplay: true });

		await harness.controller.toggle();
		gate.resolve(wav(1));
		await loaded;
		await harness.until((state) => state.status === 'ready');
	});
});

describe('MediaController seek, scrub and skip', () => {
	it('applies a scrub burst as one seek to the last target after the debounce', async () => {
		const harness = setup({ seekDebounce: 80 });
		await ready(harness, 3);
		const writes = spyCurrentTime(harness.media);
		const seeking = countEvents(harness.media, 'seeking');
		harness.progress.length = 0;

		fakeTimers();
		harness.controller.scrub(1);
		expect(harness.controller.getState().position).toBe(1);
		expect(harness.progress.at(-1)!.position).toBe(1);
		vi.advanceTimersByTime(40);
		harness.controller.scrub(1.5);
		vi.advanceTimersByTime(40);
		harness.controller.scrub(2);
		expect(harness.controller.getState().position).toBe(2);
		expect(harness.media.currentTime).toBe(0);
		expect(writes).toEqual([]);

		const seeked = once(harness.media, 'seeked');
		vi.advanceTimersByTime(200);
		await seeked;

		expect(writes).toEqual([2]);
		expect(seeking.count()).toBe(1);
		expect(harness.media.currentTime).toBeCloseTo(2, 1);
		expect(harness.controller.getState().position).toBeCloseTo(2, 1);
	});

	it('uses a 120 ms debounce by default', async () => {
		const harness = setup();
		await ready(harness);
		const writes = spyCurrentTime(harness.media);

		fakeTimers();
		harness.controller.scrub(1);
		vi.advanceTimersByTime(60);
		expect(writes).toEqual([]);
		vi.advanceTimersByTime(150);
		expect(writes).toEqual([1]);
	});

	it('clamps a scrub target to the duration and zero', async () => {
		const harness = setup({ seekDebounce: 30 });
		await ready(harness, 2);
		const writes = spyCurrentTime(harness.media);

		fakeTimers();
		harness.controller.scrub(50);
		expect(harness.controller.getState().position).toBeCloseTo(2, 1);
		harness.controller.scrub(-5);
		expect(harness.controller.getState().position).toBe(0);
		vi.advanceTimersByTime(120);
		expect(writes).toEqual([0]);
	});

	it('does not let the frame loop overwrite the position of a pending scrub', async () => {
		const harness = setup({ seekDebounce: 300 });
		await ready(harness, 3);
		await playing(harness);

		fakeTimers();
		harness.controller.scrub(2.5);
		harness.progress.length = 0;
		await frames(6);

		expect(harness.progress.length).toBeGreaterThanOrEqual(4);
		expect(harness.progress.every((state) => state.position === 2.5)).toBe(true);
		expect(harness.media.currentTime).toBeLessThan(2);

		const seeked = once(harness.media, 'seeked');
		vi.advanceTimersByTime(300);
		await seeked;
		expect(harness.media.currentTime).toBeGreaterThanOrEqual(2.5);
	});

	it('cancels a pending scrub on seek', async () => {
		const harness = setup({ seekDebounce: 80 });
		await ready(harness);
		const writes = spyCurrentTime(harness.media);

		fakeTimers();
		harness.controller.scrub(2);
		harness.controller.seek(1);
		vi.advanceTimersByTime(200);

		expect(writes).toEqual([1]);
		expect(harness.controller.getState().position).toBeCloseTo(1, 1);
	});

	it('cancels a pending scrub when the element source changes behind its back', async () => {
		const harness = setup({ seekDebounce: 150 });
		await ready(harness);
		const writes = spyCurrentTime(harness.media);

		fakeTimers();
		harness.controller.scrub(2);
		harness.media.src = wav(3);
		vi.advanceTimersByTime(300);

		expect(writes).toEqual([]);
		expect(harness.controller.getState().position).toBe(0);
	});

	it('clamps seek below zero and above the duration', async () => {
		const harness = setup();
		await ready(harness, 2);
		const writes = spyCurrentTime(harness.media);

		harness.controller.seek(-5);
		harness.controller.seek(1000);
		harness.controller.seek(1);

		expect(writes).toHaveLength(3);
		expect(writes[0]).toBe(0);
		expect(writes[1]).toBeCloseTo(2, 1);
		expect(writes[2]).toBe(1);
	});

	it('seeks relative to the position and clamps skip', async () => {
		const harness = setup();
		await ready(harness, 3);
		const writes = spyCurrentTime(harness.media);

		harness.controller.seek(1);
		harness.controller.skip(0.5);
		harness.controller.skip(-5);

		expect(writes).toEqual([1, expect.closeTo(1.5, 5), 0]);
	});

	it('skips relative to the pending scrub target and consumes it', async () => {
		const harness = setup({ seekDebounce: 80 });
		await ready(harness, 3);
		const writes = spyCurrentTime(harness.media);

		fakeTimers();
		harness.controller.scrub(2);
		harness.controller.skip(0.5);
		vi.advanceTimersByTime(200);

		expect(writes).toEqual([2.5]);
	});

	it('reports a seek through seeked on onProgress when paused', async () => {
		const harness = setup();
		await ready(harness, 2);
		await frames(2);
		harness.progress.length = 0;

		harness.controller.seek(1);
		await harness.until(() => harness.progress.length > 0);

		expect(harness.progress.at(-1)!.position).toBeCloseTo(1, 1);
	});
});

describe('MediaController volume, mute, rate and loop', () => {
	it('round-trips volume, muted, rate and loop through the element and the state', async () => {
		const harness = setup();
		await ready(harness);

		harness.controller.setVolume(0.3);
		expect(harness.media.volume).toBeCloseTo(0.3, 5);
		harness.controller.setMuted(true);
		expect(harness.media.muted).toBe(true);
		harness.controller.setRate(1.5);
		expect(harness.media.playbackRate).toBe(1.5);
		harness.controller.setLoop(true);
		expect(harness.media.loop).toBe(true);

		await harness.until((state) => state.muted && state.rate === 1.5 && state.loop);
		expect(harness.states.at(-1)!.volume).toBeCloseTo(0.3, 5);

		harness.controller.toggleMuted();
		expect(harness.media.muted).toBe(false);
		await harness.until((state) => !state.muted);
		harness.controller.setLoop(false);
		expect(harness.states.at(-1)!.loop).toBe(false);
	});

	it('clamps volume to 0..1', async () => {
		const harness = setup();
		await ready(harness);

		harness.controller.setVolume(4);
		expect(harness.media.volume).toBe(1);
		harness.controller.setVolume(-2);
		expect(harness.media.volume).toBe(0);
	});

	it('follows changes made by someone else on the element', async () => {
		const harness = setup();
		await ready(harness);

		harness.media.volume = 0.25;
		harness.media.muted = true;
		harness.media.playbackRate = 2;

		await harness.until((state) => state.volume === 0.25 && state.muted && state.rate === 2);
	});

	it('does not call onState again when a volumechange changes nothing', async () => {
		const harness = setup();
		await ready(harness);
		const count = harness.states.length;

		harness.media.dispatchEvent(new Event('volumechange'));
		harness.media.dispatchEvent(new Event('ratechange'));

		expect(harness.states).toHaveLength(count);
	});
});

describe('MediaController source changes made by the host', () => {
	it('settles on playing after the play, abort, emptied, play sequence of a src change', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		const order: string[] = [];
		for (const type of ['play', 'abort', 'emptied', 'playing']) {
			harness.media.addEventListener(type, () => order.push(type));
		}

		harness.media.src = wav(3);
		expect(harness.controller.getState().status).not.toBe('playing');
		await harness.media.play();
		await harness.until((state) => state.status === 'playing');

		expect(order.indexOf('emptied')).toBeGreaterThanOrEqual(0);
		expect(order.indexOf('abort')).toBeLessThan(order.indexOf('emptied'));
		const before = harness.progress.length;
		await frames(4);
		expect(harness.progress.length - before).toBeLessThanOrEqual(6);
	});
});

describe('MediaController composition', () => {
	it('lets two controllers share an element without interfering', async () => {
		const first = setup({ pauseOnDestroy: false });
		const second = setup({ pauseOnDestroy: false }, first.media);
		await ready(first);
		second.controller.attach();
		expect(second.states.at(-1)!.status).toBe('ready');

		await second.controller.play();
		await first.until((state) => state.status === 'playing');
		expect(second.controller.getState().status).toBe('playing');

		first.controller.setVolume(0.4);
		await second.until((state) => Math.abs(state.volume - 0.4) < 1e-5);

		first.controller.destroy();
		const firstCount = first.progress.length;
		await frames(4);
		expect(first.progress).toHaveLength(firstCount);
		expect(second.controller.getState().status).toBe('playing');
		expect(second.progress.length).toBeGreaterThan(2);

		second.controller.pause();
		expect(second.controller.getState().status).toBe('paused');
	});

	it('does no DOM or media access at construction', () => {
		const getMedia = vi.fn(() => {
			throw new Error('getMedia must not run');
		});
		const controller = new MediaController({ getMedia });
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const bound = createMediaController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{ getMedia },
		);

		expect(getMedia).not.toHaveBeenCalled();
		expect(controller.getState().status).toBe('idle');
		expect(bound).toBeInstanceOf(MediaController);
		expect(connected).toHaveLength(1);
		expect(cleanup).toHaveLength(1);
	});

	it('attaches on connect and destroys on cleanup through the factory', async () => {
		const media = new Audio();
		document.body.append(media);
		elements.push(media);
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const states: MediaState[] = [];
		const bound = createMediaController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{ getMedia: () => media, onState: (state) => states.push(state) },
		);
		controllers.push(bound);

		connected[0]!();
		expect(states).toHaveLength(1);
		cleanup[0]!();
		const changed = once(media, 'volumechange');
		media.volume = 0.5;
		await changed;
		expect(states).toHaveLength(1);
	});
});

const noRanges = { length: 0, start: () => 0, end: () => 0 };
const rangesOf = (...pairs: Array<[number, number]>) => ({
	length: pairs.length,
	start: (index: number) => pairs[index]![0],
	end: (index: number) => pairs[index]![1],
});

describe('MediaController autoplay and toggle', () => {
	it('plays on load with autoplay for a preload none element that fetches nothing by itself', async () => {
		const audio = new Audio();
		audio.preload = 'none';
		const harness = setup({}, audio);
		harness.controller.attach();

		await harness.controller.load(wav(3), { autoplay: true });

		await harness.until((state) => state.status === 'playing');
	});

	it('calls play right after the source is set when autoplay is given', async () => {
		const harness = setup();
		harness.controller.attach();
		const play = vi.spyOn(harness.media, 'play');

		await harness.controller.load(wav(2), { autoplay: true });

		expect(play).toHaveBeenCalledTimes(1);
		expect(harness.media.paused).toBe(false);
	});

	it('keeps a blocked autoplay load blocked when the element then reports emptied and loadstart', async () => {
		const harness = setup();
		await ready(harness);
		vi.spyOn(harness.media, 'play').mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));

		const emptiedOnce = once(harness.media, 'emptied');
		const loadstartOnce = once(harness.media, 'loadstart');
		const canplayOnce = once(harness.media, 'canplay');
		await harness.controller.load(wav(2), { autoplay: true });
		await emptiedOnce;
		await loadstartOnce;
		await canplayOnce;

		expect(harness.controller.getState()).toMatchObject({ blocked: true, status: 'paused' });
	});

	it('pauses on toggle while a play is still waiting for data', async () => {
		const harness = setup();
		harness.controller.attach();
		await harness.controller.load(wav(3), { autoplay: true });
		expect(harness.controller.getState().status).not.toBe('ready');
		const pause = vi.spyOn(harness.media, 'pause');

		await harness.controller.toggle();

		expect(pause).toHaveBeenCalledTimes(1);
		await nothingFollows('the play that toggle() cancelled');
		expect(harness.media.paused).toBe(true);
		expect(harness.controller.getState().status).not.toBe('playing');
	});

	it('pauses on toggle when the element is unpaused with no data yet', async () => {
		const harness = setup();
		await ready(harness);
		stub(harness.media, 'paused', false);
		stub(harness.media, 'readyState', 0);
		const play = vi.spyOn(harness.media, 'play');
		const pause = vi.spyOn(harness.media, 'pause');

		await harness.controller.toggle();

		expect(harness.controller.getState().status).toBe('loading');
		expect(pause).toHaveBeenCalledTimes(1);
		expect(play).not.toHaveBeenCalled();
	});
});

describe('MediaController source handling', () => {
	it('does not release a URL that a cached resolveSource returns again', async () => {
		const released: string[] = [];
		const url = wav(2);
		const harness = setup({
			resolveSource: async () => url,
			releaseSource: (value) => released.push(value),
		});
		harness.controller.attach();

		await harness.controller.load('a');
		await harness.controller.load('a');

		expect(released).toEqual([]);
		await harness.until((state) => state.status === 'ready');
		expect(harness.controller.getState().error).toBeNull();
	});

	it('does not release the URL in use when a stale resolution returns the same URL', async () => {
		const released: string[] = [];
		const url = wav(2);
		const first = deferred<string>();
		const calls = [first, undefined];
		const harness = setup({
			resolveSource: () => calls.shift()?.promise ?? Promise.resolve(url),
			releaseSource: (value) => released.push(value),
		});
		harness.controller.attach();
		const stale = harness.controller.load('a');
		await harness.controller.load('b');

		first.resolve(url);
		await stale;

		expect(released).toEqual([]);
		await harness.until((state) => state.status === 'ready');
	});

	it('reports No supported source when the last source child fails and recovers on a later load', async () => {
		const audio = new Audio();
		const first = document.createElement('source');
		first.src = brokenAudio();
		first.type = 'audio/wav';
		const last = document.createElement('source');
		last.src = brokenAudio();
		last.type = 'audio/wav';
		audio.append(first, last);
		const harness = setup({}, audio);
		harness.controller.attach();

		audio.load();
		await harness.until((state) => state.status === 'error');

		expect(harness.controller.getState().error).toMatchObject({ message: 'No supported source' });
		expect(harness.errors).toHaveLength(1);
		await harness.controller.load(wav(1));
		await harness.until((state) => state.status === 'ready');
		expect(harness.controller.getState().error).toBeNull();
	});

	it('does not report an error while a later source child can still play', async () => {
		const audio = new Audio();
		const broken = document.createElement('source');
		broken.src = brokenAudio();
		broken.type = 'audio/wav';
		const good = document.createElement('source');
		good.src = wav(1);
		good.type = 'audio/wav';
		audio.append(broken, good);
		const harness = setup({}, audio);
		harness.controller.attach();

		audio.load();

		await harness.until((state) => state.status === 'ready');
		expect(harness.errors).toEqual([]);
		expect(harness.controller.getState().currentSrc).toBe(good.src);
	});

	it('applies startAt before any data is there and keeps it', async () => {
		const harness = setup();
		harness.controller.attach();
		harness.progress.length = 0;

		await harness.controller.load(wav(3), { startAt: 1.5 });

		expect(harness.controller.getState().position).toBeCloseTo(1.5, 1);
		await harness.until((state) => state.status === 'ready');
		expect(harness.controller.getState().position).toBeCloseTo(1.5, 1);
		expect(harness.progress.every((state) => state.position > 1)).toBe(true);
	});

	it('ignores a startAt that is not a positive finite number', async () => {
		const harness = setup();
		harness.controller.attach();
		const writes = spyCurrentTime(harness.media);

		await harness.controller.load(wav(1), { startAt: Number.NaN });
		await harness.controller.load(wav(1), { startAt: -3 });

		expect(writes).toEqual([]);
	});

	it('retries the last load with the same options', async () => {
		let attempts = 0;
		const harness = setup({
			resolveSource: async (url) => {
				attempts++;
				if (attempts === 1) {
					throw new Error('offline');
				}
				return url;
			},
		});
		harness.controller.attach();
		await harness.controller.retry();
		expect(attempts).toBe(0);

		await harness.controller.load(wav(2), { autoplay: true });
		expect(harness.controller.getState().status).toBe('error');

		await harness.controller.retry();
		await harness.until((state) => state.status === 'playing');
		expect(attempts).toBe(2);
		expect(harness.controller.getState().error).toBeNull();
	});

	it('reports the currentSrc of the element', async () => {
		const harness = setup();
		harness.controller.attach();
		expect(harness.controller.getState().currentSrc).toBe('');

		const url = await ready(harness, 1);

		expect(harness.controller.getState().currentSrc).toBe(url);
		expect(harness.states.at(-1)!.currentSrc).toBe(url);
	});

	it('ignores seek and scrub while a source resolves instead of seeking the old media', async () => {
		const gate = deferred<string>();
		const harness = setup({ resolveSource: (url) => (url === 'first' ? Promise.resolve(wav(3)) : gate.promise) });
		harness.controller.attach();
		await harness.controller.load('first');
		await harness.until((state) => state.status === 'ready');
		const writes = spyCurrentTime(harness.media);

		const loaded = harness.controller.load('second');
		expect(harness.controller.getState().seekable).toBe(false);
		fakeTimers();
		harness.controller.scrub(2);
		harness.controller.seek(2);
		harness.controller.skip(1);
		vi.advanceTimersByTime(250);

		expect(writes).toEqual([]);
		gate.resolve(wav(1));
		await loaded;
	});

	it('drops a pending scrub when the element stops being seekable before it is applied', async () => {
		const harness = setup({ seekDebounce: 60 });
		await ready(harness);
		const writes = spyCurrentTime(harness.media);

		fakeTimers();
		harness.controller.scrub(2);
		stub(harness.media, 'duration', Number.POSITIVE_INFINITY);
		stub(harness.media, 'seekable', noRanges);
		vi.advanceTimersByTime(200);

		expect(writes).toEqual([]);
	});

	it('reports idle on the emptied event itself when the host removes the source, not loading', async () => {
		const harness = setup();
		await ready(harness);
		const emptied = once(harness.media, 'emptied');

		harness.media.removeAttribute('src');
		harness.media.load();
		await emptied;

		expect(harness.states.at(-1)!.status).toBe('idle');
	});

	it('clears blocked, failure and started when the host empties the element', async () => {
		const harness = setup();
		await ready(harness);
		vi.spyOn(harness.media, 'play').mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
		await harness.controller.play();
		expect(harness.controller.getState().blocked).toBe(true);

		const emptied = once(harness.media, 'emptied');
		harness.media.removeAttribute('src');
		harness.media.load();
		await emptied;
		expect(harness.controller.getState()).toMatchObject({ status: 'idle', blocked: false });
	});

	it('clears a failure when the host empties the element', async () => {
		const harness = setup();
		await ready(harness);
		vi.spyOn(harness.media, 'play').mockRejectedValue(new DOMException('no sources', 'NotSupportedError'));
		await harness.controller.play();
		expect(harness.controller.getState().status).toBe('error');

		const emptied = once(harness.media, 'emptied');
		harness.media.removeAttribute('src');
		harness.media.load();
		await emptied;
		expect(harness.controller.getState()).toMatchObject({ status: 'idle', error: null });
	});

	it('goes back to ready, not paused, when the host replaces the source after a pause', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		harness.controller.pause();
		expect(harness.controller.getState().status).toBe('paused');

		harness.media.src = wav(2);

		await harness.until((state) => state.status === 'ready');
	});

	it('counts a play started by someone else as started, even before time advances', async () => {
		const harness = setup();
		await ready(harness);

		const started = harness.media.play();
		harness.media.pause();
		await started.catch(() => undefined);
		await harness.until((state) => state.status === 'paused');
	});

	it('reports paused for an element that already played when attached', async () => {
		const harness = setup();
		harness.media.src = wav(3);
		await harness.media.play();
		while (harness.media.currentTime <= 0.1) {
			await once(harness.media, 'timeupdate');
		}
		harness.media.pause();

		harness.controller.attach();

		expect(harness.states[0]!.status).toBe('paused');
	});

	it('drops a play rejection that arrives after destroy and attach', async () => {
		const harness = setup();
		await ready(harness);
		const late = deferred<void>();
		vi.spyOn(harness.media, 'play').mockReturnValue(late.promise);
		const started = harness.controller.play();

		harness.controller.destroy();
		harness.controller.attach();
		late.reject(new DOMException('no sources', 'NotSupportedError'));
		await started;

		expect(harness.controller.getState().error).toBeNull();
		expect(harness.errors).toEqual([]);
	});
});

describe('MediaController callbacks that call back in', () => {
	it('never hands onProgress a state older than the one a callback just caused', async () => {
		const seen: string[] = [];
		const gate = deferred<string>();
		let controller!: MediaController;
		const harness = setup({
			resolveSource: (url) => (url === 'next' ? gate.promise : Promise.resolve(url)),
			onState: (state) => {
				if (state.status === 'error') {
					void controller.load('next');
				}
			},
			onProgress: (state) => seen.push(state.status),
		});
		controller = harness.controller;
		await ready(harness);
		seen.length = 0;

		stub(harness.media, 'error', { code: 4, message: 'unsupported' });
		harness.media.dispatchEvent(new Event('timeupdate'));
		restore(harness.media, 'error');

		expect(controller.getState().status).toBe('loading');
		expect(seen).toEqual(['loading']);
		gate.resolve(wav(1));
	});

	it('never hands onProgress a state older than the one onError just caused', async () => {
		const seen: string[] = [];
		const gate = deferred<string>();
		let controller!: MediaController;
		const harness = setup({
			resolveSource: (url) => (url === 'next' ? gate.promise : Promise.resolve(url)),
			onError: () => void controller.load('next'),
			onProgress: (state) => seen.push(state.status),
		});
		controller = harness.controller;
		await ready(harness);
		seen.length = 0;

		stub(harness.media, 'error', { code: 4, message: 'unsupported' });
		harness.media.dispatchEvent(new Event('timeupdate'));
		restore(harness.media, 'error');

		expect(controller.getState().status).toBe('loading');
		expect(seen).toEqual(['loading']);
		gate.resolve(wav(1));
	});

	it('reports onError once even when onState retries from inside the callback', async () => {
		const errors: unknown[] = [];
		const reported = deferred<void>();
		const harness = setup({
			resolveSource: async (url) => url,
			onError: (error) => {
				errors.push(error);
				reported.resolve();
			},
		});
		harness.controller.attach();
		await harness.controller.load(brokenAudio());
		await reported.promise;
		await nothingFollows('a second onError from the retry');
		expect(errors).toHaveLength(1);
	});
});

describe('MediaController input that is not a number', () => {
	it('ignores NaN and Infinity and clamps the rate to what browsers support', async () => {
		const harness = setup();
		await ready(harness);
		const writes = spyCurrentTime(harness.media);

		expect(() => harness.controller.setRate(-1)).not.toThrow();
		expect(harness.media.playbackRate).toBe(0.0625);
		harness.controller.setRate(100);
		expect(harness.media.playbackRate).toBe(16);
		harness.controller.setRate(2);
		harness.controller.setRate(Number.NaN);
		harness.controller.setRate(Number.POSITIVE_INFINITY);
		expect(harness.media.playbackRate).toBe(2);

		harness.controller.setVolume(0.5);
		expect(() => harness.controller.setVolume(Number.NaN)).not.toThrow();
		harness.controller.setVolume(Number.POSITIVE_INFINITY);
		expect(harness.media.volume).toBe(0.5);

		fakeTimers();
		harness.controller.seek(Number.NaN);
		harness.controller.skip(Number.NaN);
		harness.controller.scrub(Number.NaN);
		harness.controller.seek(Number.POSITIVE_INFINITY);
		vi.advanceTimersByTime(250);
		expect(writes).toEqual([]);
	});

	it('does not cancel a pending scrub for a seek that is ignored', async () => {
		const harness = setup({ seekDebounce: 60 });
		await ready(harness);
		const writes = spyCurrentTime(harness.media);

		fakeTimers();
		harness.controller.scrub(2);
		harness.controller.seek(Number.NaN);
		vi.advanceTimersByTime(200);

		expect(writes).toEqual([2]);
	});
});

describe('MediaController destroy deferral and sharing', () => {
	it('keeps playing and keeps the source across a DOM move that destroys and attaches in one task', async () => {
		const released: string[] = [];
		const harness = setup({ resolveSource: async (url) => url, releaseSource: (url) => released.push(url) });
		harness.controller.attach();
		await harness.controller.load(wav(3), { autoplay: true });
		await harness.until((state) => state.status === 'playing');
		const src = harness.media.src;

		harness.controller.destroy();
		harness.controller.attach();
		await Promise.resolve();
		await nothingFollows('the deferred destroy running after the re-attach');

		expect(harness.media.paused).toBe(false);
		expect(harness.media.src).toBe(src);
		expect(released).toEqual([]);
		expect(harness.controller.getState().status).toBe('playing');
	});

	it('pauses and releases once, in a microtask, on a real removal', async () => {
		const released: string[] = [];
		const harness = setup({
			clearSourceOnDestroy: true,
			resolveSource: async (url) => url,
			releaseSource: (url) => released.push(url),
		});
		harness.controller.attach();
		const url = wav(3);
		await harness.controller.load(url, { autoplay: true });
		await harness.until((state) => state.status === 'playing');

		harness.controller.destroy();
		expect(harness.media.paused).toBe(false);
		expect(released).toEqual([]);
		await Promise.resolve();

		expect(harness.media.paused).toBe(true);
		expect(released).toEqual([url]);
		harness.controller.destroy();
		await Promise.resolve();
		expect(released).toEqual([url]);
	});

	it('does not pause or release while another controller is attached to the element, and does when the last goes', async () => {
		const released: string[] = [];
		const first = setup({
			clearSourceOnDestroy: true,
			resolveSource: async (url) => url,
			releaseSource: (url) => released.push(url),
		});
		const second = setup({ clearSourceOnDestroy: true }, first.media);
		first.controller.attach();
		second.controller.attach();
		const url = wav(3);
		await first.controller.load(url, { autoplay: true });
		await second.until((state) => state.status === 'playing');

		first.controller.destroy();
		await Promise.resolve();
		expect(first.media.paused).toBe(false);
		expect(released).toEqual([]);
		expect(second.controller.getState().status).toBe('playing');

		second.controller.destroy();
		await Promise.resolve();
		expect(first.media.paused).toBe(true);
		expect(released).toEqual([url]);
	});

	it('keeps the resolved source alive on the final destroy while src still points at it, and releases it on the next load', async () => {
		const released: string[] = [];
		const harness = setup({ resolveSource: async (url) => url, releaseSource: (url) => released.push(url) });
		harness.controller.attach();
		const url = wav(1);
		await harness.controller.load(url);

		harness.controller.destroy();
		await Promise.resolve();
		await Promise.resolve();

		expect(harness.media.getAttribute('src')).toBe(url);
		expect(released).toEqual([]);
		harness.controller.attach();
		await harness.controller.load(wav(2));
		expect(released).toEqual([url]);
	});

	it('releases a URL once when a stale resolution of the same URL settles after the destroy released it', async () => {
		const gate = deferred<string>();
		const url = wav(1);
		const results = [Promise.resolve(url), gate.promise];
		const released: string[] = [];
		const harness = setup({
			clearSourceOnDestroy: true,
			resolveSource: () => results.shift()!,
			releaseSource: (url) => released.push(url),
		});
		harness.controller.attach();
		await harness.controller.load('a');
		const stale = harness.controller.load('b');

		harness.controller.destroy();
		await Promise.resolve();
		await Promise.resolve();
		gate.resolve(url);
		await stale;

		expect(released).toEqual([url]);
	});

	it('is not seekable after a rejected resolveSource until load() recovers', async () => {
		const harness = setup({
			resolveSource: async (url) => {
				if (url === 'bad') {
					throw new Error('nope');
				}
				return url;
			},
		});
		await ready(harness);
		expect(harness.controller.getState().seekable).toBe(true);

		await harness.controller.load('bad');

		expect(harness.controller.getState()).toMatchObject({ status: 'error', seekable: false });
	});

	it('releases the source the first controller resolved exactly once when it and the controller sharing the element are destroyed', async () => {
		const released: string[] = [];
		const first = setup({
			clearSourceOnDestroy: true,
			resolveSource: async (url) => url,
			releaseSource: (url) => released.push(url),
		});
		const second = setup({ clearSourceOnDestroy: true, releaseSource: (url) => released.push(url) }, first.media);
		first.controller.attach();
		second.controller.attach();
		const url = wav(1);
		await first.controller.load(url);

		first.controller.destroy();
		await Promise.resolve();
		second.controller.destroy();
		await Promise.resolve();
		await Promise.resolve();

		expect(released).toEqual([url]);
	});

	it('leaves the element playing with pauseOnDestroy false even on the final destroy', async () => {
		const harness = setup({ pauseOnDestroy: false });
		await ready(harness);
		await playing(harness);

		harness.controller.destroy();
		await Promise.resolve();

		expect(harness.media.paused).toBe(false);
	});

	it('ends the session on the old element when attach() moves the controller to another element, as destroy() does', async () => {
		const released: string[] = [];
		const other = new Audio();
		document.body.append(other);
		elements.push(other);
		let current: HTMLAudioElement = new Audio();
		document.body.append(current);
		elements.push(current);
		const first = current;
		const harness = setup(
			{ getMedia: () => current, resolveSource: async (url) => url, releaseSource: (url) => released.push(url) },
			first,
		);
		harness.controller.attach();
		const url = wav(1);
		await harness.controller.load(url);

		await harness.controller.play();
		expect(first.paused).toBe(false);
		current = other;
		harness.controller.attach();
		expect(first.paused).toBe(false);
		await Promise.resolve();

		expect(first.paused).toBe(true);
		expect(released).toEqual([]);
		expect(first.getAttribute('src')).toBe(url);
		await harness.controller.load(wav(1));
		expect(released).toEqual([]);
	});

	it('keeps the old element playing and its source when attach() moves a controller off an element another controller still uses', async () => {
		const released: string[] = [];
		const other = new Audio();
		document.body.append(other);
		elements.push(other);
		let current: HTMLAudioElement = new Audio();
		const first = current;
		const harness = setup(
			{
				getMedia: () => current,
				clearSourceOnDestroy: true,
				resolveSource: async (url) => url,
				releaseSource: (url) => released.push(url),
			},
			first,
		);
		const sharing = setup({ clearSourceOnDestroy: true }, first);
		harness.controller.attach();
		sharing.controller.attach();
		const started = once(first, 'play');
		await harness.controller.load(wav(3), { autoplay: true });
		await started;

		current = other;
		harness.controller.attach();
		await harness.controller.load(wav(1));
		await Promise.resolve();

		expect(first.paused).toBe(false);
		expect(released).toEqual([]);
		sharing.controller.destroy();
		await Promise.resolve();
		expect(first.paused).toBe(true);
		expect(released).toHaveLength(1);
	});
});

describe('MediaController in a hidden tab', () => {
	afterEach(() => {
		Reflect.deleteProperty(document, 'hidden');
	});

	it('reports progress on timeupdate while playing and the document is hidden, and on visibilitychange', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);
		const before = harness.progress.length;

		harness.media.dispatchEvent(new Event('timeupdate'));
		expect(harness.progress).toHaveLength(before);

		Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
		harness.media.dispatchEvent(new Event('timeupdate'));
		expect(harness.progress).toHaveLength(before + 1);
		harness.media.dispatchEvent(new Event('timeupdate'));
		expect(harness.progress).toHaveLength(before + 2);

		const beforeVisibility = harness.progress.length;
		document.dispatchEvent(new Event('visibilitychange'));
		expect(harness.progress).toHaveLength(beforeVisibility + 1);
	});

	it('stops listening to visibilitychange after destroy', async () => {
		const harness = setup();
		await ready(harness);
		harness.controller.destroy();
		const count = harness.progress.length;

		document.dispatchEvent(new Event('visibilitychange'));

		expect(harness.progress).toHaveLength(count);
	});
});

describe('MediaController ranges, live window and loop', () => {
	it('reports every buffered range and the seekable window', async () => {
		const harness = setup();
		await ready(harness, 2);
		stub(harness.media, 'buffered', rangesOf([0, 10], [30, 50]));
		stub(harness.media, 'seekable', rangesOf([0, 5], [6, 60]));
		harness.media.dispatchEvent(new Event('progress'));

		expect(harness.progress.at(-1)).toMatchObject({
			bufferedRanges: [
				[0, 10],
				[30, 50],
			],
			seekableRange: [0, 60],
		});
	});

	it('seeks inside the seekable window of a live stream and clamps to it', async () => {
		const harness = setup({ seekDebounce: 30 });
		await ready(harness);
		const writes = spyCurrentTime(harness.media);
		stub(harness.media, 'duration', Number.POSITIVE_INFINITY);
		stub(harness.media, 'seekable', rangesOf([10, 50]));
		harness.media.dispatchEvent(new Event('durationchange'));

		expect(harness.controller.getState()).toMatchObject({ live: true, seekable: true, seekableRange: [10, 50] });
		fakeTimers();
		harness.controller.seek(5);
		harness.controller.seek(100);
		harness.controller.seek(30);
		harness.controller.scrub(0);
		expect(harness.controller.getState().position).toBe(10);
		vi.advanceTimersByTime(150);

		expect(writes).toEqual([10, 50, 30, 10]);
	});

	it('goes live to the end of the window, and does nothing when not live', async () => {
		const harness = setup();
		await ready(harness);
		const writes = spyCurrentTime(harness.media);

		harness.controller.goLive();
		expect(writes).toEqual([]);

		stub(harness.media, 'duration', Number.POSITIVE_INFINITY);
		stub(harness.media, 'seekable', rangesOf([10, 50]));
		harness.controller.goLive();
		expect(writes).toEqual([50]);
	});

	it('does not go live without a window', async () => {
		const harness = setup();
		await ready(harness);
		const writes = spyCurrentTime(harness.media);
		stub(harness.media, 'duration', Number.POSITIVE_INFINITY);
		stub(harness.media, 'seekable', noRanges);

		harness.controller.goLive();

		expect(writes).toEqual([]);
	});

	it('follows a loop change made directly on the element at the next event', async () => {
		const harness = setup();
		await ready(harness);

		harness.media.loop = true;
		harness.media.dispatchEvent(new Event('timeupdate'));

		expect(harness.states.at(-1)!.loop).toBe(true);
	});

	it('is not waiting after a stalled event while data is available', async () => {
		const harness = setup();
		await ready(harness);
		await playing(harness);

		harness.media.dispatchEvent(new Event('stalled'));
		await nothingFollows('a waiting state after stalled');

		expect(harness.controller.getState().waiting).toBe(false);
		expect(harness.states.at(-1)!.waiting).toBe(false);
	});
});

describe('MediaController with a real video', () => {
	async function webm(): Promise<string> {
		const { WEBM_BASE64 } = await import('./media-controller.fixture');
		const bytes = Uint8Array.from(atob(WEBM_BASE64), (char) => char.charCodeAt(0));
		const url = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
		urls.add(url);
		return url;
	}

	it('loads, seeks, plays to the end and skips back on a video element', async () => {
		const video = document.createElement('video');
		video.muted = true;
		document.body.append(video);
		elements.push(video);
		const { controller, until } = setup({ getMedia: () => video }, video as unknown as HTMLAudioElement);
		controller.attach();

		await controller.load(await webm());
		await until((state) => state.status === 'ready');
		expect(video.videoWidth).toBeGreaterThan(0);
		expect(controller.getState().duration).toBeGreaterThan(1);
		expect(controller.getState().seekable).toBe(true);

		const seeked = once(video, 'seeked');
		controller.seek(1);
		await seeked;
		await controller.play();
		await until((state) => state.status === 'ended');
		controller.skip(-0.5);
		await until((state) => state.status === 'paused');
	});
});

describe('MediaController play on an element with nothing to play', () => {
	it('play() after attach() and pause() on an empty element settles and stays idle', async () => {
		const harness = setup();
		harness.controller.attach();
		harness.controller.pause();

		await harness.controller.play();

		expect(harness.controller.getState().status).toBe('idle');
		expect(harness.media.networkState).toBe(HTMLMediaElement.NETWORK_EMPTY);
	});

	it('play() after a rejected resolveSource on an empty element settles and the status stays error', async () => {
		const harness = setup({
			resolveSource: async () => {
				throw new Error('fetch failed');
			},
		});
		harness.controller.attach();
		await harness.controller.load('next');

		await harness.controller.play();

		expect(harness.controller.getState()).toMatchObject({ status: 'error', currentSrc: '' });
	});
});

describe('MediaController play after the host emptied the element', () => {
	it('does not call the element play() and does not mark the controller started', async () => {
		const harness = setup();
		await ready(harness);
		const play = vi.spyOn(harness.media, 'play');
		const emptied = once(harness.media, 'emptied');
		harness.media.removeAttribute('src');
		harness.media.load();
		await emptied;

		await harness.controller.play();

		expect(play).not.toHaveBeenCalled();
		expect(harness.controller.getState().status).toBe('idle');
	});
});

describe('MediaController after a rejected resolveSource', () => {
	it('play() and toggle() do not play the previous track, and load() recovers', async () => {
		let fail = false;
		const first = wav(3);
		const harness = setup({
			resolveSource: async (url) => {
				if (fail) {
					throw new Error('fetch failed');
				}
				return url;
			},
		});
		harness.controller.attach();
		await harness.controller.load(first);
		await harness.until((state) => state.status === 'ready');
		fail = true;
		await harness.controller.load('next');
		expect(harness.controller.getState().status).toBe('error');

		await harness.controller.play();
		await harness.controller.toggle();
		await nothingFollows('a play of the previous track after the failed load');

		expect(harness.media.paused).toBe(true);
		expect(harness.controller.getState()).toMatchObject({ status: 'error' });

		fail = false;
		await harness.controller.load(wav(2), { autoplay: true });
		await harness.until((state) => state.status === 'playing');
		expect(harness.controller.getState().error).toBeNull();
	});

	it('retry() clears the failure and plays can follow', async () => {
		let fail = true;
		const harness = setup({
			resolveSource: async () => {
				if (fail) {
					throw new Error('fetch failed');
				}
				return wav(2);
			},
		});
		harness.controller.attach();
		await harness.controller.load('x');
		expect(harness.controller.getState().status).toBe('error');
		fail = false;
		await harness.controller.retry();
		await harness.controller.play();
		await harness.until((state) => state.status === 'playing');
	});
});

describe('MediaController onState that recovers from an error', () => {
	it('still reports onError for the error that onState replaced by calling load()', async () => {
		const errors: unknown[] = [];
		let skipped = false;
		const retried = deferred<void>();
		let controller!: MediaController;
		const harness = setup({
			onState: (state) => {
				if (state.status === 'error' && !skipped) {
					skipped = true;
					retried.resolve();
					void controller.load(wav(1));
				}
			},
			onError: (error) => errors.push(error),
		});
		controller = harness.controller;
		controller.attach();
		await controller.load(brokenAudio());
		await retried.promise;

		expect(errors).toHaveLength(1);
	});
});

describe('MediaController startAt', () => {
	it.each([false, true])(
		'reports startAt as the position until metadata arrives (resolveSource %s)',
		async (resolve) => {
			const positions: number[] = [];
			const harness = setup({
				...(resolve ? { resolveSource: async (url: string) => url } : {}),
				onState: (state) => positions.push(state.position),
				onProgress: (state) => positions.push(state.position),
			});
			harness.controller.attach();
			positions.length = 0;
			await harness.controller.load(wav(4), { startAt: 1.5 });
			expect(harness.controller.getState()).toMatchObject({ status: 'loading', position: 1.5 });
			await harness.until((state) => state.status === 'ready');

			expect(positions.every((position) => Math.abs(position - 1.5) < 0.1)).toBe(true);
			expect(harness.controller.getState().position).toBeCloseTo(1.5, 1);
		},
	);
});

describe('MediaController pause on an element that is not playing', () => {
	it('load() with resolveSource and pause() call the element pause() only while it is unpaused', async () => {
		const harness = setup({ resolveSource: async (url) => url });
		const pause = vi.spyOn(harness.media, 'pause');
		harness.controller.attach();

		await harness.controller.load(wav(1));
		harness.controller.pause();
		expect(pause).not.toHaveBeenCalled();

		await harness.controller.load(wav(3), { autoplay: true });
		await harness.until((state) => state.status === 'playing');
		harness.controller.pause();
		expect(pause).toHaveBeenCalledTimes(1);
	});
});
