import { bindController, type Controller, type ControllerHost } from './controller';
import { bufferedEnd, clampSeek } from './media-time';

/** Where a media element is in its life, derived from its own properties. */
export type MediaStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

/** A snapshot of the media element, as returned by `getState()` and passed to the callbacks. */
export type MediaState = {
	status: MediaStatus;
	/** Seconds. The pending `scrub` target while one is waiting, otherwise `currentTime`. */
	position: number;
	/** Seconds. `NaN` before metadata, `Infinity` for a live stream. */
	duration: number;
	/**
	 * `seek` and `scrub` do something: metadata is known, no `resolveSource` is pending or rejected and, for a live
	 * stream, the element reports a seekable window.
	 */
	seekable: boolean;
	/** The duration is `Infinity`. */
	live: boolean;
	/** End, in seconds, of the buffered range containing `position`; 0 when none does. */
	buffered: number;
	/** Every buffered range as `[start, end]` seconds, for a segmented progress bar. */
	bufferedRanges: Array<[number, number]>;
	/** The window `media.seekable` reports, from its first start to its last end; `null` when there is none. */
	seekableRange: [number, number] | null;
	/** The `currentSrc` of the element: the source it actually plays, `''` when it has none. */
	currentSrc: string;
	volume: number;
	muted: boolean;
	rate: number;
	loop: boolean;
	/** Playback started and `readyState` is below `HAVE_FUTURE_DATA`. */
	waiting: boolean;
	seeking: boolean;
	/** The last `play()` was refused by the autoplay policy; the status is `paused`. */
	blocked: boolean;
	error: MediaError | Error | null;
};

/** Options of `MediaController.load`. */
export type MediaLoadOptions = {
	/** Start playing as soon as the element can. */
	autoplay?: boolean;
	/** Start position in seconds. `position` reports it from the `load()` call until the element has metadata. */
	startAt?: number;
};

/** The element, source hook, callbacks and options of a `MediaController`. */
export type MediaControllerConfig = {
	/** Resolved on every `attach()`. `null` leaves the controller inert until the next `attach()`. */
	getMedia: () => HTMLMediaElement | null;
	/**
	 * Turns the URL given to `load()` into the one the element gets, for hosts that must load through a Blob.
	 *
	 * @remarks
	 * A newer `load()` or a `destroy()` makes a pending resolution a no-op. A rejection puts the state in `error`.
	 */
	resolveSource?: (url: string) => Promise<string>;
	/**
	 * Called with a URL `resolveSource` returned once the element no longer uses it: it arrived after a newer
	 * `load()` or a `destroy()`, a later `load()` replaced it with another URL, or the controller was destroyed for
	 * good with `clearSourceOnDestroy`. Revoke object URLs here. Each URL is released once.
	 *
	 * @remarks
	 * Never called for the URL the element is using, so a `resolveSource` that caches and returns the same URL again
	 * is safe. On `destroy()` it runs in a microtask, only with `clearSourceOnDestroy` and only when no controller
	 * is attached to the element any more, so moving the element in the DOM (cleanup, then connect) keeps the
	 * source. Without `clearSourceOnDestroy` the element keeps `src` and the URL stays alive.
	 */
	releaseSource?: (url: string) => void;
	/**
	 * Called when something other than `position`, `buffered`, `bufferedRanges` or `seekableRange` changed, and once
	 * on `attach()`.
	 */
	onState?: (state: MediaState) => void;
	/**
	 * Called with the latest state: once per animation frame while playing; on `timeupdate` while playing and the
	 * document is hidden (animation frames stop in a background tab); on `timeupdate`, `seeked` and `progress`
	 * otherwise; on `visibilitychange`; on `attach()`; and when a `scrub` starts and when its seek is applied.
	 */
	onProgress?: (state: MediaState) => void;
	/** Called once for each error the state enters, from the element or from a rejected `play()` or `resolveSource`. */
	onError?: (error: MediaError | Error) => void;
	/** Quiet time, in milliseconds, before `scrub` seeks. Default 120. */
	seekDebounce?: number;
	/**
	 * Pause when the controller is destroyed for good. Default `true`.
	 *
	 * @remarks
	 * `destroy()` waits a microtask and does nothing if a controller attached to the element again by then, which
	 * is what moving the element in the DOM does. It also does nothing while another controller is attached.
	 */
	pauseOnDestroy?: boolean;
	/** Remove `src` and call `load()` when the controller is destroyed for good. Default `false`. */
	clearSourceOnDestroy?: boolean;
};

const EVENTS = [
	'loadstart',
	'loadedmetadata',
	'loadeddata',
	'canplay',
	'canplaythrough',
	'play',
	'playing',
	'pause',
	'ended',
	'waiting',
	'stalled',
	'suspend',
	'seeking',
	'seeked',
	'timeupdate',
	'durationchange',
	'progress',
	'volumechange',
	'ratechange',
	'emptied',
	'abort',
	'error',
] as const;

const NETWORK_EMPTY = 0;
const NETWORK_IDLE = 1;
const NETWORK_NO_SOURCE = 3;
const HAVE_METADATA = 1;
const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;
const MIN_RATE = 0.0625;
const MAX_RATE = 16;

/**
 * Whether the element has anything to load: a `src`, a `srcObject` or a `<source>` child.
 *
 * @remarks `currentSrc` cannot tell: it still holds the old URL when `emptied` fires after the host removed `src`.
 */
const hasSource = (media: HTMLMediaElement) =>
	media.hasAttribute('src') || media.srcObject !== null || media.querySelector('source') !== null;

/** Whether the element has never loaded anything or the host emptied it: `deriveStatus` reports `idle` for it. */
const isEmpty = (media: HTMLMediaElement) =>
	media.networkState === NETWORK_EMPTY || (media.networkState === NETWORK_NO_SOURCE && !hasSource(media));

const IDLE_STATE: MediaState = {
	status: 'idle',
	position: 0,
	duration: Number.NaN,
	seekable: false,
	live: false,
	buffered: 0,
	bufferedRanges: [],
	seekableRange: null,
	currentSrc: '',
	volume: 1,
	muted: false,
	rate: 1,
	loop: false,
	waiting: false,
	seeking: false,
	blocked: false,
	error: null,
};

/** Fields whose change calls `onState`; the position and range fields go through `onProgress`. */
const STATE_KEYS = [
	'status',
	'duration',
	'seekable',
	'live',
	'currentSrc',
	'volume',
	'muted',
	'rate',
	'loop',
	'waiting',
	'seeking',
	'blocked',
	'error',
] as const satisfies readonly (keyof MediaState)[];

type ProgressMode = 'always' | 'unless-playing' | 'never';

const attachedCounts = new WeakMap<HTMLMediaElement, number>();

/**
 * The URL `resolveSource` returned for an element and the `releaseSource` that goes with it.
 *
 * @remarks
 * Kept per element, not per controller, so the last controller destroyed on a shared element releases the URL
 * exactly once, whichever controller loaded it.
 */
const resolvedSources = new WeakMap<HTMLMediaElement, { url: string; release: ((url: string) => void) | undefined }>();

/** URLs already handed to `releaseSource` for an element, so a late resolution of the same URL does not release it again. */
const releasedSources = new WeakMap<HTMLMediaElement, Set<string>>();

function releaseOnce(media: HTMLMediaElement, url: string, release: ((url: string) => void) | undefined): void {
	const released = releasedSources.get(media) ?? new Set<string>();
	releasedSources.set(media, released);
	if (!released.has(url)) {
		released.add(url);
		release?.(url);
	}
}

function releaseResolved(media: HTMLMediaElement): void {
	const resolved = resolvedSources.get(media);
	if (resolved) {
		resolvedSources.delete(media);
		releaseOnce(media, resolved.url, resolved.release);
	}
}

function isDomError(error: unknown, name: string): boolean {
	return error instanceof DOMException && error.name === name;
}

function rangesOf(ranges: { length: number; start(index: number): number; end(index: number): number }) {
	const list: Array<[number, number]> = [];
	for (let index = 0; index < ranges.length; index++) {
		list.push([ranges.start(index), ranges.end(index)]);
	}
	return list;
}

/**
 * Playback core for an `HTMLAudioElement` or `HTMLVideoElement`: one state snapshot, the methods that change it,
 * and the events the host never has to listen to.
 *
 * @remarks
 * The snapshot is read from the element's own properties (`readyState`, `networkState`, `paused`, `ended`,
 * `error`, `played`, `buffered`, `seekable`) on every media event. The controller holds only what the element
 * cannot answer: a pending `scrub` target, a `resolveSource` in flight, a `play()` the autoplay policy refused
 * (`blocked`), whether playback was ever started (`played` stays empty until time advances) and a failure that has
 * no `MediaError` (a rejected `resolveSource` or `play()`, a last `source` child that failed). They are cleared when
 * the element is emptied or loads again (a rejected `resolveSource` stays until the next `load()`), but they are flags, so a host that changes the element behind the
 * controller's back can see them lag until the next media event.
 *
 * Media events do not bubble, so listeners sit on the element itself. In Chromium, setting `src` while playing
 * fires `abort`, `emptied`, `loadstart` and `canplay` with no `pause` and no `play`, and `paused` turns true, so
 * nothing here counts events. `loop` has no event: it is read on every refresh. Keyboard shortcuts, fullscreen,
 * picture-in-picture, captions and all ARIA belong to the host. Several controllers may share an element: they
 * only read it and call its methods, and the last one destroyed is the one that pauses it.
 */
export class MediaController implements Controller {
	private media: HTMLMediaElement | null = null;
	private listeners: AbortController | null = null;
	private frame: number | null = null;
	private scrubTarget: number | null = null;
	private scrubTimer: ReturnType<typeof setTimeout> | null = null;
	private loadToken = 0;
	private resolving = false;
	private selfLoading = false;
	private autoplayPending = false;
	private blocked = false;
	private started = false;
	private failure: Error | null = null;
	private resolveFailure: Error | null = null;
	private startAt: number | null = null;
	private reportedError: MediaError | Error | null = null;
	private lastState: MediaState | null = null;
	private lastLoad: { url: string; options: MediaLoadOptions } | null = null;

	constructor(private readonly config: MediaControllerConfig) {}

	/**
	 * Resolves `getMedia` and starts listening. Calling it again picks up an element that was not there before.
	 *
	 * @remarks
	 * Does nothing when the element is the one already attached. A different element, or `null`, ends the session on
	 * the old one first, with the rules of `destroy()`: it is paused and its resolved source released, unless
	 * another controller still uses it. Unlike `AudioVisualizerController`, there is no `refresh()`: `attach()` is it.
	 */
	attach(): void {
		const media = this.config.getMedia();
		if (media && media === this.media) {
			return;
		}
		if (this.media) {
			this.destroy();
		}
		if (!media) {
			return;
		}
		this.media = media;
		attachedCounts.set(media, (attachedCounts.get(media) ?? 0) + 1);
		const listeners = new AbortController();
		this.listeners = listeners;
		const { signal } = listeners;
		for (const type of EVENTS) {
			media.addEventListener(type, this.handleEvent, { signal });
		}
		media.addEventListener('error', this.handleSourceError, { signal, capture: true });
		document.addEventListener('visibilitychange', this.handleVisibility, { signal });
		this.refresh('always');
	}

	/**
	 * Ends the session at once and, in a microtask, pauses and releases what the element held.
	 *
	 * @remarks
	 * The microtask does nothing when a controller attached to the same element again by then (moving the element
	 * in the DOM runs cleanup, then connect) or when another controller is still attached. Otherwise it pauses
	 * unless `pauseOnDestroy` is `false`, with `clearSourceOnDestroy` removes `src`, calls `load()`
	 * and calls `releaseSource` once with the resolved source. Without it the element keeps `src`, so the resolved
	 * source stays alive and the next `load()` that replaces it releases it.
	 */
	destroy(): void {
		const media = this.media;
		this.detach();
		if (!media) {
			return;
		}
		queueMicrotask(() => {
			if ((attachedCounts.get(media) ?? 0) > 0) {
				return;
			}
			if (this.config.pauseOnDestroy !== false && !media.paused) {
				media.pause();
			}
			if (this.config.clearSourceOnDestroy) {
				media.removeAttribute('src');
				media.load();
				releaseResolved(media);
			}
		});
	}

	getState(): MediaState {
		return this.snapshot();
	}

	/**
	 * Replaces the source and, with `autoplay`, starts playing.
	 *
	 * @remarks
	 * Cancels a pending scrub and an earlier `load()`. Resolves once the element has the new source, which is
	 * after `resolveSource` when one is configured; it never rejects, a failure is the `error` state. With
	 * `resolveSource` the element is paused while the source resolves. `autoplay` calls `play()` right after the
	 * source is set, so it also works for `preload="none"`, where the element would never fetch data on its own.
	 * `startAt` is applied as the element's default playback position, before any data is there. An element that was
	 * ever visualized by an `AudioVisualizerController` must keep same-origin or CORS sources.
	 */
	async load(url: string, options: MediaLoadOptions = {}): Promise<void> {
		const media = this.media;
		if (!media) {
			return;
		}
		const token = ++this.loadToken;
		this.lastLoad = { url, options };
		this.cancelScrub();
		this.failure = null;
		this.resolveFailure = null;
		this.blocked = false;
		this.started = false;
		this.autoplayPending = false;
		this.startAt =
			options.startAt !== undefined && Number.isFinite(options.startAt) && options.startAt > 0
				? options.startAt
				: null;
		const { resolveSource } = this.config;
		if (!resolveSource) {
			this.resolving = false;
			this.applySource(media, url, null, options, options.autoplay === true);
			return;
		}
		this.resolving = true;
		this.autoplayPending = options.autoplay === true;
		if (!media.paused) {
			media.pause();
		}
		this.refresh('never');
		let resolved: string;
		try {
			resolved = await resolveSource(url);
		} catch (error) {
			if (token === this.loadToken) {
				this.resolving = false;
				this.autoplayPending = false;
				this.resolveFailure = error instanceof Error ? error : new Error(String(error));
				this.refresh('never');
			}
			return;
		}
		if (token !== this.loadToken) {
			if (resolved !== resolvedSources.get(media)?.url) {
				releaseOnce(media, resolved, this.config.releaseSource);
			}
			return;
		}
		this.resolving = false;
		this.applySource(media, resolved, resolved, options, this.autoplayPending);
	}

	/** Loads the last URL given to `load()` again with the same options, to recover from an `error`, a rejected `resolveSource` included. */
	retry(): Promise<void> {
		return this.lastLoad ? this.load(this.lastLoad.url, this.lastLoad.options) : Promise.resolve();
	}

	/**
	 * Starts playback.
	 *
	 * @remarks
	 * Never rejects, and does nothing while the state is `idle`, because an element with no source never settles
	 * the promise of its own `play()`, and while a rejected `resolveSource` holds the `error` state, so the track
	 * the element still has is not played by mistake: `load()` or `retry()` recovers. An `AbortError`, which a newer `load()` or a `pause()` causes, is quiet. A
	 * `NotAllowedError` sets `blocked` and leaves the status `paused`. Any other rejection is the `error` state. A
	 * rejection that arrives after `destroy()` or a newer `load()` is dropped. While `resolveSource` is pending it
	 * plays once the source has loaded.
	 */
	async play(): Promise<void> {
		const media = this.media;
		if (!media) {
			return;
		}
		if (this.resolveFailure) {
			return;
		}
		this.failure = null;
		this.blocked = false;
		if (this.resolving) {
			this.autoplayPending = true;
			return;
		}
		if (isEmpty(media)) {
			return;
		}
		const token = this.loadToken;
		const wasStarted = this.started;
		this.started = true;
		try {
			await media.play();
		} catch (error) {
			if (token !== this.loadToken) {
				return;
			}
			if (isDomError(error, 'NotAllowedError')) {
				this.blocked = true;
			} else {
				if (isDomError(error, 'AbortError')) {
					return;
				}
				this.started = wasStarted;
				this.failure = error instanceof Error ? error : new Error(String(error));
			}
			this.refresh('never');
		}
	}

	pause(): void {
		this.autoplayPending = false;
		this.blocked = false;
		if (this.media) {
			if (!this.media.paused) {
				this.media.pause();
			}
			this.refresh('never');
		}
	}

	/**
	 * Pauses when the element is playing or a play is waiting on a source, otherwise plays.
	 *
	 * @remarks
	 * An element that is `loading` but not paused counts as playing, so the pressed state of a toggle button is
	 * `status === 'playing'` or `status === 'loading'` with the element unpaused, not the status alone.
	 */
	toggle(): Promise<void> {
		if (this.media && (!this.media.paused || this.autoplayPending)) {
			this.pause();
			return Promise.resolve();
		}
		return this.play();
	}

	/**
	 * Seeks now, clamped to the duration, or to the seekable window of a live stream.
	 *
	 * @remarks
	 * Ignored while the state is not `seekable` and for a value that is not finite. Cancels a pending scrub. The
	 * element reports the move on `seeked`, which reaches `onProgress`.
	 */
	seek(seconds: number): void {
		const media = this.media;
		if (!media || !Number.isFinite(seconds)) {
			return;
		}
		this.cancelScrub();
		if (this.snapshot().seekable) {
			media.currentTime = this.clampTarget(media, seconds);
		}
	}

	/**
	 * Seeks after `seekDebounce` ms without another `scrub`; a burst is one seek, to the last target.
	 *
	 * @remarks
	 * `position` shows the target from the call on and `onProgress` runs at once, so a range input does not jump
	 * back. `load()`, `seek()`, `destroy()` and a source change on the element cancel the pending seek. Ignored
	 * while not `seekable` and for a value that is not finite.
	 */
	scrub(seconds: number): void {
		const media = this.media;
		if (!media || !Number.isFinite(seconds) || !this.snapshot().seekable) {
			return;
		}
		this.scrubTarget = this.clampTarget(media, seconds);
		if (this.scrubTimer !== null) {
			clearTimeout(this.scrubTimer);
		}
		this.scrubTimer = setTimeout(() => this.flushScrub(), this.config.seekDebounce ?? 120);
		this.refresh('always');
	}

	/** Seeks `delta` seconds from the pending scrub target, or from the position when none is pending. */
	skip(delta: number): void {
		const media = this.media;
		if (media && Number.isFinite(delta)) {
			this.seek((this.scrubTarget ?? media.currentTime) + delta);
		}
	}

	/** Seeks to the end of the seekable window of a live stream; does nothing for anything else. */
	goLive(): void {
		const media = this.media;
		const range = media && this.seekableRange(media);
		if (media && range && media.duration === Number.POSITIVE_INFINITY && this.snapshot().seekable) {
			this.cancelScrub();
			media.currentTime = range[1];
		}
	}

	/** Sets the volume, clamped to 0..1. Ignores a value that is not finite. */
	setVolume(volume: number): void {
		if (this.media && Number.isFinite(volume)) {
			this.media.volume = Math.min(1, Math.max(0, volume));
		}
	}

	setMuted(muted: boolean): void {
		if (this.media) {
			this.media.muted = muted;
		}
	}

	toggleMuted(): void {
		if (this.media) {
			this.media.muted = !this.media.muted;
		}
	}

	/** Sets the playback rate, clamped to 0.0625..16, the range browsers support. Ignores a value that is not finite. */
	setRate(rate: number): void {
		if (this.media && Number.isFinite(rate)) {
			this.media.playbackRate = Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
		}
	}

	setLoop(loop: boolean): void {
		if (this.media) {
			this.media.loop = loop;
			this.refresh('never');
		}
	}

	private readonly handleEvent = (event: Event): void => {
		switch (event.type) {
			case 'play':
				this.started = true;
				break;
			case 'emptied':
				this.cancelScrub();
				if (!this.selfLoading) {
					this.blocked = false;
					this.failure = null;
					this.started = false;
					this.startAt = null;
				}
				break;
			case 'loadstart':
				this.selfLoading = false;
				break;
		}
		const reports = event.type === 'timeupdate' || event.type === 'seeked' || event.type === 'progress';
		if (event.type === 'timeupdate' && document.hidden) {
			this.refresh('always');
		} else {
			this.refresh(reports ? 'unless-playing' : 'never');
		}
	};

	private readonly handleSourceError = (event: Event): void => {
		const media = this.media;
		if (!media || event.target === media) {
			return;
		}
		const sources = media.querySelectorAll('source');
		if (sources[sources.length - 1] === event.target) {
			this.failure = new Error('No supported source');
			this.refresh('never');
		}
	};

	private readonly handleVisibility = (): void => this.refresh('always');

	private readonly tick = (): void => {
		this.frame = null;
		this.refresh('always');
	};

	private detach(): void {
		this.loadToken++;
		this.listeners?.abort();
		this.listeners = null;
		this.cancelFrame();
		this.cancelScrub();
		if (this.media) {
			attachedCounts.set(this.media, (attachedCounts.get(this.media) ?? 1) - 1);
		}
		this.resolving = false;
		this.selfLoading = false;
		this.autoplayPending = false;
		this.blocked = false;
		this.started = false;
		this.failure = null;
		this.resolveFailure = null;
		this.startAt = null;
		this.reportedError = null;
		this.lastState = null;
		this.media = null;
	}

	private applySource(
		media: HTMLMediaElement,
		source: string,
		resolved: string | null,
		options: MediaLoadOptions,
		play: boolean,
	) {
		const previous = resolvedSources.get(media);
		this.selfLoading = true;
		media.src = source;
		if (options.startAt !== undefined && Number.isFinite(options.startAt) && options.startAt > 0) {
			media.currentTime = options.startAt;
		}
		if (resolved === null) {
			resolvedSources.delete(media);
		} else if (previous?.url !== resolved) {
			resolvedSources.set(media, { url: resolved, release: this.config.releaseSource });
			releasedSources.get(media)?.delete(resolved);
		}
		if (previous && previous.url !== resolved) {
			releaseOnce(media, previous.url, previous.release);
		}
		this.autoplayPending = false;
		this.refresh('never');
		if (play) {
			void this.play();
		}
	}

	private cancelFrame(): void {
		if (this.frame !== null) {
			cancelAnimationFrame(this.frame);
			this.frame = null;
		}
	}

	private cancelScrub(): void {
		if (this.scrubTimer !== null) {
			clearTimeout(this.scrubTimer);
			this.scrubTimer = null;
		}
		this.scrubTarget = null;
	}

	private flushScrub(): void {
		const media = this.media;
		const target = this.scrubTarget;
		this.scrubTimer = null;
		this.scrubTarget = null;
		if (media && target !== null && this.snapshot().seekable) {
			media.currentTime = target;
		}
		this.refresh('always');
	}

	private seekableRange(media: HTMLMediaElement): [number, number] | null {
		const { seekable } = media;
		return seekable.length > 0 ? [seekable.start(0), seekable.end(seekable.length - 1)] : null;
	}

	private clampTarget(media: HTMLMediaElement, seconds: number): number {
		const range = this.seekableRange(media);
		if (media.duration === Number.POSITIVE_INFINITY && range) {
			return Math.min(range[1], Math.max(range[0], seconds));
		}
		return clampSeek(seconds, media.duration);
	}

	private snapshot(): MediaState {
		const media = this.media;
		if (!media) {
			return { ...IDLE_STATE, bufferedRanges: [] };
		}
		const { duration, readyState } = media;
		const live = duration === Number.POSITIVE_INFINITY;
		const startAt = this.resolving || readyState < HAVE_METADATA ? this.startAt : null;
		const position = this.scrubTarget ?? startAt ?? media.currentTime;
		const error = this.resolving ? null : (media.error ?? this.failure ?? this.resolveFailure);
		const status = this.deriveStatus(media, error);
		const seekableRange = this.seekableRange(media);
		return {
			status,
			position,
			duration,
			seekable:
				!this.resolving &&
				!this.resolveFailure &&
				readyState >= HAVE_METADATA &&
				(!live || seekableRange !== null),
			live,
			buffered: bufferedEnd(media.buffered, position),
			bufferedRanges: rangesOf(media.buffered),
			seekableRange,
			currentSrc: media.currentSrc,
			volume: media.volume,
			muted: media.muted,
			rate: media.playbackRate,
			loop: media.loop,
			waiting: status === 'playing' && readyState < HAVE_FUTURE_DATA,
			seeking: media.seeking,
			blocked: this.blocked,
			error,
		};
	}

	private deriveStatus(media: HTMLMediaElement, error: MediaError | Error | null): MediaStatus {
		if (error) {
			return 'error';
		}
		if (this.resolving) {
			return 'loading';
		}
		if (isEmpty(media)) {
			return 'idle';
		}
		if (media.ended) {
			return 'ended';
		}
		if (!media.paused) {
			return media.readyState === 0 ? 'loading' : 'playing';
		}
		if (media.networkState !== NETWORK_IDLE && media.readyState < HAVE_CURRENT_DATA) {
			return 'loading';
		}
		return this.started || media.played.length > 0 ? 'paused' : 'ready';
	}

	private refresh(progress: ProgressMode): void {
		let state = this.snapshot();
		if (state.status === 'playing') {
			this.frame ??= requestAnimationFrame(this.tick);
		} else {
			this.cancelFrame();
		}
		const previous = this.lastState;
		const entered = state.error;
		this.lastState = state;
		if (!previous || STATE_KEYS.some((key) => !Object.is(previous[key], state[key]))) {
			this.config.onState?.(state);
			if (!this.lastState) {
				return;
			}
		}
		this.reportError(entered);
		if (!this.lastState) {
			return;
		}
		state = this.lastState;
		if (progress === 'always' || (progress === 'unless-playing' && state.status !== 'playing')) {
			this.config.onProgress?.(state);
		}
	}

	private reportError(error: MediaError | Error | null): void {
		if (error && error !== this.reportedError) {
			this.reportedError = error;
			this.config.onError?.(error);
		} else if (!error) {
			this.reportedError = null;
		}
	}
}

/**
 * Creates a `MediaController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * private readonly media = createMediaController(this, {
 *   getMedia: () => this.querySelector('audio'),
 *   onState: (state) => this.render(state),
 *   onProgress: (state) => this.renderProgress(state),
 * });
 * ```
 */
export function createMediaController(host: ControllerHost, config: MediaControllerConfig): MediaController {
	return bindController(host, new MediaController(config));
}
