import type { MediaState } from '@ecopages/radiant-ui/controllers';
import { formatMediaTime } from '@ecopages/radiant-ui/helpers';

/** The sample clip and its poster, made by `scripts/generate-video-player-assets.mjs`. */
export const VIDEO = {
	src: '/assets/video/radiant-reel.webm',
	poster: '/assets/video/radiant-reel.jpg',
} as const;

/** The English captions of the clip, one for each of its five scenes, in seconds. */
export const CAPTIONS: readonly { start: number; end: number; text: string }[] = [
	{ start: 0.2, end: 2.3, text: 'Scene one: a slow start' },
	{ start: 2.6, end: 4.7, text: 'Scene two: the shapes arrive' },
	{ start: 5, end: 7.1, text: 'Scene three: everything turns' },
	{ start: 7.4, end: 9.5, text: 'Scene four: the light moves on' },
	{ start: 9.8, end: 11.9, text: 'Scene five: and it settles' },
];

/** Where the bottom of a caption sits, as a percentage of the video height, until the controls have been measured. */
const DEFAULT_CAPTION_LINE = 64;

/**
 * The captions of the clip as cues on a captions track, kept above the controls.
 *
 * @remarks
 * The usual source of a track is a `.vtt` file named by the `track` element's `src`. The ecopages dev and preview
 * servers answer only a fixed list of file extensions, and `.vtt` is not on it, so the track would never load here.
 * The cues are data and `addCue` works the same in every browser. A track's `cues` are `null` while its mode is
 * `disabled`, so set it to `hidden` first. Loading a source empties the track again, so call `add()` once the
 * metadata of each source is known (the first state that is `seekable`), not at mount; it adds nothing when the cues
 * are there.
 *
 * A browser puts a caption at the bottom of the video, which is where the controls are, and the controls grow to two
 * rows on a narrow stage. The cues are therefore placed by line, as a percentage of the stage height, from the
 * measured top of the controls, and placed again whenever the stage or the controls change size.
 */
export class Captions {
	private line = DEFAULT_CAPTION_LINE;
	private cues: VTTCue[] = [];
	private stage!: HTMLElement;
	private controls!: HTMLElement;
	private readonly observer = new ResizeObserver(() => this.place());

	start(stage: HTMLElement, controls: HTMLElement): void {
		this.stage = stage;
		this.controls = controls;
		this.observer.observe(stage);
		this.observer.observe(controls);
	}

	stop(): void {
		this.observer.disconnect();
	}

	add(track: TextTrack): void {
		if (track.cues!.length) return;
		this.cues = CAPTIONS.map(({ start, end, text }) => {
			const cue = new VTTCue(start, end, text);
			cue.snapToLines = false;
			cue.lineAlign = 'end';
			cue.line = this.line;
			return cue;
		});
		for (const cue of this.cues) track.addCue(cue);
	}

	/**
	 * @remarks
	 * A stage that is not displayed (a closed tab) has no height to measure; the observer reports again when it is
	 * shown.
	 */
	private place(): void {
		const height = this.stage.clientHeight;
		if (height === 0) return;
		this.line = (100 * (height - this.controls.offsetHeight)) / height;
		for (const cue of this.cues) cue.line = this.line;
	}
}

/**
 * The playback rates the speed button cycles through, as the strings `cycleValue` works on, and the value the
 * button shows with an `x`.
 */
export const RATES: readonly string[] = ['1', '1.25', '1.5', '2', '0.5'];

/** Seconds the arrow keys move the playback by, on the seek thumb and on the player. */
export const SEEK_STEP = 5;

/** Seconds `J`, `L`, Page Up and Page Down move the playback by. */
export const LONG_SEEK_STEP = 10;

/** The fraction of the full volume the arrow keys change it by. */
export const VOLUME_STEP = 0.1;

/** Milliseconds without a pointer or key event after which the controls hide while the video plays. */
export const HIDE_CONTROLS_MS = 2500;

/** What the stage shows: `data-state` on `[data-stage]` carries one of these and the stylesheet draws from it. */
export type StageState = 'idle' | 'buffering' | 'playing' | 'paused' | 'error';

/** What a shortcut asks the player to do. */
export type Shortcut =
	| { type: 'toggle' }
	| { type: 'skip'; seconds: number }
	| { type: 'volume'; delta: number }
	| { type: 'mute' }
	| { type: 'captions' }
	| { type: 'fullscreen' }
	| { type: 'jump'; fraction: number }
	| { type: 'start' }
	| { type: 'end' };

const SHORTCUTS = new Map<string, Shortcut>([
	[' ', { type: 'toggle' }],
	['k', { type: 'toggle' }],
	['j', { type: 'skip', seconds: -LONG_SEEK_STEP }],
	['l', { type: 'skip', seconds: LONG_SEEK_STEP }],
	['ArrowLeft', { type: 'skip', seconds: -SEEK_STEP }],
	['ArrowRight', { type: 'skip', seconds: SEEK_STEP }],
	['ArrowUp', { type: 'volume', delta: VOLUME_STEP }],
	['ArrowDown', { type: 'volume', delta: -VOLUME_STEP }],
	['m', { type: 'mute' }],
	['c', { type: 'captions' }],
	['f', { type: 'fullscreen' }],
	['Home', { type: 'start' }],
	['End', { type: 'end' }],
	...Array.from({ length: 10 }, (_, digit): [string, Shortcut] => [
		String(digit),
		{ type: 'jump', fraction: digit / 10 },
	]),
]);

const SLIDER_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * The shortcut a key event asks for, or `undefined` when the player must leave it alone.
 *
 * @remarks
 * A key that carries Ctrl, Alt or Meta belongs to the browser. A button owns Space and Enter, which activate it. A
 * slider thumb owns the arrows, Home, End and the page keys, which move it; the letters and digits still reach the
 * player. The target is the element the key was pressed on, which a `keydown` listener on the stage always has.
 */
export function shortcutFor(
	event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'target'>,
): Shortcut | undefined {
	if (event.ctrlKey || event.altKey || event.metaKey) return undefined;
	const target = event.target as Element;
	if (target.closest('button') && (event.key === ' ' || event.key === 'Enter')) return undefined;
	if (target.closest('[role="slider"]') && SLIDER_KEYS.has(event.key)) return undefined;
	return SHORTCUTS.get(event.key.length === 1 ? event.key.toLowerCase() : event.key);
}

const SEEK_KEYS = new Map([
	['ArrowRight', SEEK_STEP],
	['ArrowUp', SEEK_STEP],
	['ArrowLeft', -SEEK_STEP],
	['ArrowDown', -SEEK_STEP],
	['PageUp', LONG_SEEK_STEP],
	['PageDown', -LONG_SEEK_STEP],
]);

/**
 * Seconds a key moves the seek slider by, or `undefined` for any other key.
 *
 * @remarks
 * The slider works in seconds with a step of 0.01, fine enough that the per-frame position write is not rounded and
 * the thumb glides. A step that fine would make an arrow key inaudible, so the player handles these keys and the
 * slider keeps Home and End.
 */
export function seekFromKey(key: string): number | undefined {
	return SEEK_KEYS.get(key);
}

/** The state of the stage for a snapshot of the media element. */
export function stageState(state: Pick<MediaState, 'status' | 'waiting' | 'error'>): StageState {
	if (state.error) return 'error';
	if (state.waiting || state.status === 'loading') return 'buffering';
	if (state.status === 'idle') return 'idle';
	return state.status === 'playing' ? 'playing' : 'paused';
}

/** The text a snapshot is worth in the polite live region, `''` while there is nothing to say. */
export function statusMessage(state: Pick<MediaState, 'status' | 'waiting' | 'error' | 'blocked'>): string {
	if (state.blocked) return 'Playback was blocked, press Play to start';
	switch (stageState(state)) {
		case 'error':
			return 'Could not load the video';
		case 'buffering':
			return 'Buffering';
		case 'playing':
			return 'Playing';
		case 'paused':
			return state.status === 'ended' ? 'Ended' : 'Paused';
		default:
			return '';
	}
}

/**
 * Decides what the polite live region says.
 *
 * @remarks
 * The player says nothing while the clip loads on its own: "Buffering" and "Paused" at page load, or after the
 * player was moved, are noise to a reader who has done nothing yet. It starts to report once the clip has played,
 * and a failure ("Could not load", "Playback was blocked") is always reported, because it answers an action or
 * leaves the player unusable. A message is said once until it changes.
 */
export class Announcer {
	private spoken = '';
	private started = false;

	/** Forgets what was said and silences the player again, for a clip that loads from the start. */
	reset(): void {
		this.spoken = '';
		this.started = false;
	}

	/** The message to say for this snapshot, or `''` when there is nothing new to say. */
	next(state: Pick<MediaState, 'status' | 'waiting' | 'error' | 'blocked'>): string {
		if (state.status === 'playing') this.started = true;
		const message = this.started || state.error || state.blocked ? statusMessage(state) : '';
		if (message === this.spoken) return '';
		this.spoken = message;
		return message;
	}
}

/** The `aria-valuetext` of the seek thumb, such as `1:15 of 4:00`. */
export function seekValueText(position: number, duration: number): string {
	return `${formatMediaTime(position)} of ${formatMediaTime(duration)}`;
}

/** One buffered range as the percentages the stylesheet draws it with. */
export type BufferedSegment = { start: number; size: number };

/** The buffered ranges as percentages of the duration, empty until the duration is known. */
export function bufferedSegments(ranges: readonly (readonly [number, number])[], duration: number): BufferedSegment[] {
	if (!Number.isFinite(duration) || duration <= 0) return [];
	return ranges.map(([from, to]) => ({
		start: (from / duration) * 100,
		size: ((Math.min(to, duration) - from) / duration) * 100,
	}));
}
