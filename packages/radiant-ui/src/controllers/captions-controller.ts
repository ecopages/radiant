import { bindController, type Controller, type ControllerHost } from './controller';

/** One caption, in seconds of media time. */
export type CaptionCue = { start: number; end: number; text: string };

type CaptionTrackBase = {
	/** Unique among the tracks of one controller. Defaults to `${language}-${kind}`. */
	id?: string;
	/** BCP 47 language tag, such as `en` or `pt-BR`. Written to `srclang`. */
	language: string;
	/** What the viewer reads in a language menu. */
	label: string;
	/** Default `captions`. */
	kind?: 'captions' | 'subtitles';
};

/**
 * One track a `CaptionsController` adds to the media element.
 *
 * @remarks
 * Exactly one of `cues`, `vtt` and `src` is allowed, and the type enforces it. `vtt` is WebVTT text (it must start
 * with `WEBVTT`) that the browser parses through a Blob URL. `src` is a URL the controller fetches and treats as WebVTT
 * text, so a server that does not serve `.vtt` files, or a missing extension, does not matter.
 */
export type CaptionTrackSource = CaptionTrackBase &
	(
		| { cues: readonly CaptionCue[]; vtt?: never; src?: never }
		| { vtt: string; cues?: never; src?: never }
		| { src: string; cues?: never; vtt?: never }
	);

/** What `CaptionsController` reports about one track. */
export type CaptionTrackInfo = {
	id: string;
	language: string;
	label: string;
	kind: 'captions' | 'subtitles';
	/** `loading` until the cues are there, `error` when they could not be fetched or parsed. */
	status: 'loading' | 'ready' | 'error';
};

/** A snapshot of the controller, as returned by `getState()` and passed to `onState`. */
export type CaptionsState = {
	/** A track is selected and shown. */
	enabled: boolean;
	/** The language of the shown track, or `null` while captions are off. */
	language: string | null;
	tracks: readonly CaptionTrackInfo[];
	/** The text of the cues active now, one per line. Kept current by `cuechange` only with `render: 'overlay'`. */
	activeText: string;
};

type CaptionsSources =
	| { getTracks: () => readonly CaptionTrackSource[]; tracks?: never }
	| { tracks: readonly CaptionTrackSource[]; getTracks?: never }
	| { getTracks?: never; tracks?: never };

type CaptionsRender =
	| { render?: 'native'; getOverlay?: never }
	| {
			/** The controller keeps the track `hidden` and writes the active cue text into the element `getOverlay` returns. */
			render: 'overlay';
			getOverlay: () => HTMLElement;
	  };

/** The media element, the tracks, how the cues are drawn and the callbacks of a `CaptionsController`. */
export type CaptionsControllerConfig = {
	/** Resolved on every `attach()` and `refresh()`. `null` while the element is not rendered yet: the controller then has no tracks. */
	getMedia: () => HTMLMediaElement | null;
	/** Also take over the captions and subtitles tracks the media element already has, `<track>` children included. */
	adoptExisting?: boolean;
	/**
	 * The element native cues must stay above, such as a controls bar. Read on every placement; `null` means the
	 * bottom of the media element. Has no effect with `render: 'overlay'`.
	 */
	getAvoid?: () => HTMLElement | null;
	/**
	 * Called when the enabled flag, the language, the list of tracks or their statuses change, and once on `attach()`.
	 * With `render: 'overlay'` it is also called when the active cue text changes.
	 */
	onState?: (state: CaptionsState) => void;
	/** Called once for each track that failed to fetch or parse, with that track's info. Never thrown. */
	onError?: (error: Error, track: CaptionTrackInfo) => void;
} & CaptionsSources &
	CaptionsRender;

const DEFAULT_LINE = 64;
const LOADED = 2;

type Entry = {
	info: Omit<CaptionTrackInfo, 'status'>;
	source: CaptionTrackSource | null;
	track: TextTrack | null;
	loader: HTMLTrackElement | null;
	blobUrl: string | null;
	fetching: AbortController | null;
	pending: boolean;
	failed: boolean;
	adoptedMode: TextTrackMode | null;
};

/** Every text track some controller created or adopted, so two controllers on one element never take each other's. */
const claimed = new WeakSet<TextTrack>();

/** Tracks made with `addTextTrack` that a destroyed controller released; a `TextTrack` cannot be removed, so they are reused. */
const released = new WeakMap<HTMLMediaElement, TextTrack[]>();

function primary(language: string): string {
	return language.toLowerCase().split('-')[0];
}

function sameSource(a: CaptionTrackSource, b: CaptionTrackSource): boolean {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof CaptionTrackSource>;
	return [...keys].every((key) => a[key] === b[key]);
}

/**
 * Captions and subtitles for a media element: tracks from cue data, WebVTT text or a URL, one shown at a time,
 * drawn by the browser or into an element you own, and kept above your controls.
 *
 * @remarks
 * Every track the controller adds is its own. A `vtt` or `src` track is a `<track>` element appended to the media
 * element, with a Blob URL, and removed on `destroy()`. A `cues` track is made with `addTextTrack`, which a browser
 * cannot undo: on `destroy()` its cues are removed and it is set to `disabled`, and it stays in `textTracks` empty until a
 * controller on that element asks for the same kind, label and language, which reuses it, so repeated create and
 * destroy cycles do not pile tracks up. Every owned track is `disabled` except the selected one, which is `showing`
 * (`render: 'native'`) or `hidden` (`'overlay'`). A track still loading is `hidden`, because a browser loads a
 * disabled `<track>` never. Tracks the controller did not create are not touched unless `adoptExisting` is set,
 * and adopted ones get their previous mode back on `destroy()`. Adopt on one controller per element: the first claims the tracks and a second finds them taken.
 *
 * `destroy()` stops listening and observing at once and releases the tracks in a microtask, which a `attach()` in
 * between cancels: moving the element in the DOM runs cleanup, then connect, and keeps the tracks and the selection.
 * Captions start off; call `enable()`. Overlay text is the text content of the parsed cue (`getCueAsHTML().textContent`), so WebVTT markup such as `<i>`, `<v Name>` and timestamps is dropped and nothing is ever inserted as HTML.
 *
 * @example
 * ```ts
 * const captions = createCaptionsController(this, {
 *   getMedia: () => this.video,
 *   tracks: [{ language: 'en', label: 'English', cues: [{ start: 0, end: 2, text: 'Hello' }] }],
 *   getAvoid: () => this.controls,
 *   onState: (state) => this.button.setAttribute('aria-pressed', String(state.enabled)),
 * });
 * captions.toggle();
 * ```
 */
export class CaptionsController implements Controller {
	private media: HTMLMediaElement | null = null;
	private attached = false;
	private session: AbortController | null = null;
	private entries: Entry[] = [];
	private selectedId: string | null = null;
	private shown = false;
	private line = DEFAULT_LINE;
	private observer: ResizeObserver | null = null;
	private cueTarget: TextTrack | null = null;
	private cueAbort: AbortController | null = null;
	private written = '';
	private lastKey: string | null = null;

	constructor(private readonly config: CaptionsControllerConfig) {}

	attach(): void {
		if (this.attached) {
			this.refresh();
			return;
		}
		this.attached = true;
		this.session = new AbortController();
		this.observer = new ResizeObserver(() => {
			this.place();
		});
		for (const entry of this.entries) {
			this.bind(entry);
		}
		this.refresh();
	}

	/**
	 * Reads `getMedia` and the tracks again and reconciles: tracks that are gone are removed, new ones added, a track
	 * whose source object changed is made again. Call it when the tracks or the avoided element change, and once the
	 * media element exists when `getMedia` returned `null` before.
	 *
	 * @remarks
	 * While `getMedia` returns `null` the controller reports no tracks and does nothing else. When it returns an
	 * element later, or a different one, the tracks are made on it. `enable()` finds no track until then and returns `false`.
	 */
	refresh(): void {
		if (!this.attached) {
			return;
		}
		const media = this.config.getMedia();
		if (this.media && this.media !== media) {
			this.release();
		}
		this.media = media;
		if (media) {
			this.reconcile(media);
			this.observe(media);
		}
		this.apply();
		this.emit();
	}

	/**
	 * Stops at once and releases the tracks in a microtask, unless `attach()` runs again by then.
	 *
	 * @remarks
	 * A fetch in flight is aborted and never writes to the controller. Releasing removes the added `<track>`
	 * elements and revokes their Blob URLs, empties and disables the `addTextTrack` tracks, gives adopted tracks their
	 * previous mode and clears the overlay.
	 */
	destroy(): void {
		if (!this.attached) {
			return;
		}
		this.attached = false;
		this.session?.abort();
		this.session = null;
		this.observer?.disconnect();
		this.observer = null;
		this.cueAbort?.abort();
		this.cueAbort = null;
		this.cueTarget = null;
		for (const entry of this.entries) {
			entry.fetching?.abort();
			entry.fetching = null;
		}
		queueMicrotask(() => {
			if (!this.attached) {
				this.release();
				this.media = null;
				this.selectedId = null;
				this.shown = false;
				this.lastKey = null;
			}
		});
	}

	getState(): CaptionsState {
		const active = this.active();
		return {
			enabled: active !== undefined,
			language: active?.info.language ?? null,
			tracks: this.entries.map((entry) => this.infoOf(entry)),
			activeText: this.activeText(active),
		};
	}

	/**
	 * Shows a track, the first one when none was selected before, or the one `language` names, an id first, then a
	 * language tag (`pt` matches `pt-BR`). Returns whether a track was found; nothing changes when none was.
	 */
	enable(language?: string): boolean {
		const entry = language === undefined ? (this.find(this.selectedId) ?? this.entries[0]) : this.find(language);
		if (!entry) {
			return false;
		}
		this.selectedId = entry.info.id;
		this.shown = true;
		this.update();
		return true;
	}

	disable(): void {
		this.shown = false;
		this.update();
	}

	toggle(): void {
		if (this.active()) {
			this.disable();
		} else {
			this.enable();
		}
	}

	/**
	 * Selects the track for an id or a language tag. While captions are on it switches to it; while they are off the
	 * choice is kept for the next `enable()` and nothing is shown. Returns whether a track was found.
	 */
	setLanguage(language: string): boolean {
		const entry = this.find(language);
		if (!entry) {
			return false;
		}
		this.selectedId = entry.info.id;
		this.update();
		return true;
	}

	private active(): Entry | undefined {
		return this.shown ? this.find(this.selectedId) : undefined;
	}

	private find(key: string | null): Entry | undefined {
		if (key === null) {
			return undefined;
		}
		const lower = key.toLowerCase();
		return (
			this.entries.find((entry) => entry.info.id === key) ??
			this.entries.find((entry) => entry.info.language.toLowerCase() === lower) ??
			this.entries.find((entry) => primary(entry.info.language) === primary(lower))
		);
	}

	private update(): void {
		if (this.attached) {
			this.apply();
			this.emit();
		}
	}

	private reconcile(media: HTMLMediaElement): void {
		const sources = this.config.getTracks?.() ?? this.config.tracks ?? [];
		const wanted = sources.map((source) => {
			const kind = source.kind ?? 'captions';
			return { source, kind, id: source.id ?? `${source.language}-${kind}` };
		});
		const kept = new Map<string, Entry>();
		for (const entry of this.entries) {
			if (!entry.source) {
				continue;
			}
			const same = wanted.some(({ source, id }) => id === entry.info.id && sameSource(entry.source!, source));
			if (same) {
				kept.set(entry.info.id, entry);
			} else {
				this.dispose(entry);
			}
		}
		const adopted = this.entries.filter((entry) => !entry.source);
		if (this.config.adoptExisting) {
			adopted.push(...this.adopt(media, adopted));
		}
		this.entries = [
			...wanted.map(({ source, kind, id }) => kept.get(id) ?? this.create(media, source, id, kind)),
			...adopted,
		];
		for (const entry of this.entries) {
			if (entry.pending && !entry.fetching) {
				void this.fetchTrack(entry);
			}
		}
	}

	private create(
		media: HTMLMediaElement,
		source: CaptionTrackSource,
		id: string,
		kind: 'captions' | 'subtitles',
	): Entry {
		const entry: Entry = {
			info: { id, language: source.language, label: source.label, kind },
			source,
			track: null,
			loader: null,
			blobUrl: null,
			fetching: null,
			pending: false,
			failed: false,
			adoptedMode: null,
		};
		if (source.cues) {
			const track = this.acquire(media, kind, source.label, source.language);
			track.mode = 'hidden';
			for (const { start, end, text } of source.cues) {
				track.addCue(this.style(new VTTCue(start, end, text)));
			}
			entry.track = track;
		} else if (source.vtt !== undefined) {
			this.mountVtt(media, entry, source.vtt);
		} else {
			entry.pending = true;
		}
		return entry;
	}

	private acquire(
		media: HTMLMediaElement,
		kind: 'captions' | 'subtitles',
		label: string,
		language: string,
	): TextTrack {
		const pool = released.get(media) ?? [];
		const index = pool.findIndex(
			(track) => track.kind === kind && track.label === label && track.language === language,
		);
		if (index >= 0) {
			return pool.splice(index, 1)[0];
		}
		const track = media.addTextTrack(kind, label, language);
		claimed.add(track);
		return track;
	}

	private mountVtt(media: HTMLMediaElement, entry: Entry, vtt: string): void {
		const element = document.createElement('track');
		element.kind = entry.info.kind;
		element.label = entry.info.label;
		element.srclang = entry.info.language;
		entry.blobUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
		element.src = entry.blobUrl;
		media.append(element);
		claimed.add(element.track);
		element.track.mode = 'hidden';
		entry.track = element.track;
		entry.loader = element;
		entry.pending = false;
		this.bind(entry);
	}

	private async fetchTrack(entry: Entry): Promise<void> {
		const media = this.media!;
		const abort = new AbortController();
		entry.fetching = abort;
		let text: string;
		try {
			const response = await fetch(entry.source!.src!, { signal: abort.signal });
			if (!response.ok) {
				throw new Error(`${response.status} ${response.statusText}`);
			}
			text = await response.text();
		} catch (cause) {
			if (abort.signal.aborted) {
				return;
			}
			entry.fetching = null;
			entry.pending = false;
			entry.failed = true;
			this.fail(entry, new Error(`Could not fetch the captions "${entry.info.label}"`, { cause }));
			this.update();
			return;
		}
		if (abort.signal.aborted) {
			return;
		}
		entry.fetching = null;
		this.mountVtt(media, entry, text);
		this.update();
	}

	private adopt(media: HTMLMediaElement, adopted: Entry[]): Entry[] {
		const found: Entry[] = [];
		const ids = new Set([...this.entries, ...adopted].map((entry) => entry.info.id));
		const elements = [...media.querySelectorAll('track')];
		for (const track of media.textTracks) {
			if (claimed.has(track) || (track.kind !== 'captions' && track.kind !== 'subtitles')) {
				continue;
			}
			claimed.add(track);
			let id = track.id || `${track.language}-${track.kind}`;
			while (ids.has(id)) {
				id = `${id}-${ids.size}`;
			}
			ids.add(id);
			const entry: Entry = {
				info: { id, language: track.language, label: track.label, kind: track.kind },
				source: null,
				track,
				loader: elements.find((element) => element.track === track) ?? null,
				blobUrl: null,
				fetching: null,
				pending: false,
				failed: false,
				adoptedMode: track.mode,
			};
			this.bind(entry);
			found.push(entry);
		}
		return found;
	}

	private bind(entry: Entry): void {
		const { loader } = entry;
		if (!loader || !this.session) {
			return;
		}
		const { signal } = this.session;
		loader.addEventListener(
			'load',
			() => {
				this.update();
			},
			{ signal },
		);
		loader.addEventListener(
			'error',
			() => {
				entry.failed = true;
				this.fail(entry, new Error(`Could not read the captions "${entry.info.label}"`));
				this.update();
			},
			{ signal },
		);
	}

	private fail(entry: Entry, error: Error): void {
		this.config.onError?.(error, this.infoOf(entry));
	}

	private statusOf(entry: Entry): CaptionTrackInfo['status'] {
		if (entry.failed || entry.loader?.readyState === 3) {
			return 'error';
		}
		if (entry.pending || (entry.loader && entry.loader.readyState < LOADED)) {
			return 'loading';
		}
		return 'ready';
	}

	private infoOf(entry: Entry): CaptionTrackInfo {
		return { ...entry.info, status: this.statusOf(entry) };
	}

	private apply(): void {
		const overlay = this.config.render === 'overlay';
		const active = this.active();
		for (const entry of this.entries) {
			const { track } = entry;
			if (!track) {
				continue;
			}
			let mode: TextTrackMode = 'disabled';
			if (entry === active) {
				mode = overlay ? 'hidden' : 'showing';
			} else if (this.statusOf(entry) === 'loading') {
				mode = 'hidden';
			}
			if (track.mode !== mode) {
				track.mode = mode;
			}
		}
		this.bindCues(overlay ? (active?.track ?? null) : null);
		this.place();
		this.syncOverlay();
	}

	private bindCues(target: TextTrack | null): void {
		if (target === this.cueTarget) {
			return;
		}
		this.cueAbort?.abort();
		this.cueTarget = target;
		this.cueAbort = target ? new AbortController() : null;
		target?.addEventListener(
			'cuechange',
			() => {
				this.syncOverlay();
				this.emit();
			},
			{ signal: this.cueAbort!.signal },
		);
	}

	private activeText(active: Entry | undefined): string {
		return Array.from(active?.track?.activeCues ?? [], (cue) => (cue as VTTCue).getCueAsHTML().textContent).join(
			'\n',
		);
	}

	private syncOverlay(): void {
		if (this.config.render !== 'overlay') {
			return;
		}
		const text = this.activeText(this.active());
		if (text !== this.written) {
			this.written = text;
			this.config.getOverlay().textContent = text;
		}
	}

	private observe(media: HTMLMediaElement): void {
		if (!this.config.getAvoid || this.config.render === 'overlay') {
			return;
		}
		this.observer!.disconnect();
		this.observer!.observe(media);
		const avoid = this.config.getAvoid();
		if (avoid) {
			this.observer!.observe(avoid);
		}
	}

	private style(cue: VTTCue): VTTCue {
		if (this.config.getAvoid && this.config.render !== 'overlay') {
			cue.snapToLines = false;
			cue.lineAlign = 'end';
			cue.line = this.line;
		}
		return cue;
	}

	/**
	 * @remarks
	 * A media element that is not displayed has no height to measure; the observer reports again when it is shown, so the
	 * cues keep their last line until then.
	 */
	private place(): void {
		const { media } = this;
		if (!media || !this.config.getAvoid || this.config.render === 'overlay') {
			return;
		}
		const box = media.getBoundingClientRect();
		if (box.height === 0) {
			return;
		}
		const top = (this.config.getAvoid()?.getBoundingClientRect().top ?? box.bottom) - box.top;
		this.line = Math.min(100, Math.max(0, (100 * top) / box.height));
		for (const entry of this.entries) {
			for (const cue of Array.from(entry.track?.cues ?? []) as VTTCue[]) {
				this.style(cue);
			}
		}
	}

	private emit(): void {
		const state = this.getState();
		const overlay = this.config.render === 'overlay';
		const key = JSON.stringify([
			state.enabled,
			state.language,
			state.tracks.map(({ id, status }) => [id, status]),
			overlay ? state.activeText : '',
		]);
		if (key !== this.lastKey) {
			this.lastKey = key;
			this.config.onState?.(state);
		}
	}

	private dispose(entry: Entry): void {
		entry.fetching?.abort();
		entry.fetching = null;
		const { track, loader } = entry;
		if (loader && entry.source) {
			loader.remove();
			URL.revokeObjectURL(entry.blobUrl!);
		} else if (track && entry.source) {
			track.mode = 'hidden';
			for (const cue of Array.from(track.cues ?? [])) {
				track.removeCue(cue);
			}
			track.mode = 'disabled';
			const pool = released.get(this.media!) ?? [];
			pool.push(track);
			released.set(this.media!, pool);
		}
		if (track && entry.adoptedMode !== null) {
			track.mode = entry.adoptedMode;
		}
	}

	private release(): void {
		for (const entry of this.entries) {
			this.dispose(entry);
		}
		this.entries = [];
		if (this.config.render === 'overlay' && this.written !== '') {
			this.config.getOverlay().textContent = '';
		}
		this.written = '';
	}
}

/**
 * Creates a `CaptionsController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * private readonly captions = createCaptionsController(this, {
 *   getMedia: () => this.querySelector('video')!,
 *   getTracks: () => this.tracks,
 *   onState: (state) => this.render(state),
 * });
 * ```
 */
export function createCaptionsController(host: ControllerHost, config: CaptionsControllerConfig): CaptionsController {
	return bindController(host, new CaptionsController(config));
}
