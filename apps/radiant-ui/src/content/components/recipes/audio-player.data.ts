import { bars, wave } from '@ecopages/radiant-ui/controllers';

export type Track = { id: string; title: string; artist: string; src: string; length: string };

export const tracks: readonly Track[] = [
	{
		id: 'morning-light',
		title: 'Morning Light',
		artist: 'Radiant Demo',
		src: '/assets/audio/morning-light.wav',
		length: '0:08',
	},
	{ id: 'low-tide', title: 'Low Tide', artist: 'Radiant Demo', src: '/assets/audio/low-tide.wav', length: '0:08' },
	{ id: 'neon-rain', title: 'Neon Rain', artist: 'Radiant Demo', src: '/assets/audio/neon-rain.wav', length: '0:09' },
	{
		id: 'paper-planes',
		title: 'Paper Planes',
		artist: 'Radiant Demo',
		src: '/assets/audio/paper-planes.wav',
		length: '0:07',
	},
];

export type VisualizerName = 'bars' | 'wave';

/**
 * The two ways to show the sound, both drawn on a canvas that the visualizer adds to the cover: LED-style bars with
 * peak caps, and a waveform that runs edge to edge.
 *
 * @remarks
 * A preset keeps the element it is mounted on, so each player builds its own. Both take the cover's colors from the
 * theme's custom properties: `--on-primary` is readable on the cover's gradient in every theme. The bars keep a
 * padding and draw at rest, so the cover still shows them under `prefers-reduced-motion`, when the controller never
 * draws a frame; the wave has no padding, and the cover's own rounded corners clip it.
 */
export const createVisualizers = () => ({
	bars: bars({
		mode: 'canvas',
		count: 40,
		gap: 2,
		padding: 12,
		segments: 14,
		segmentGap: 2,
		ends: 'square',
		color: '--on-primary',
		colorEnd: '--secondary-container',
		peaks: { hold: 450, fall: 1.2 },
		idle: 'floor',
	}),
	wave: wave({ color: '--on-primary', fill: true, padding: 0 }),
});

export const VOLUME = 0.8;

/**
 * Seconds each key moves the seek slider by.
 *
 * @remarks
 * The slider works in seconds with a step of 0.01, fine enough that the per-frame position write is not rounded to
 * whole seconds and the thumb glides. A step that fine would make an arrow key inaudible, so the arrows and the page
 * keys are handled by the player with these distances, and the slider keeps Home and End.
 */
export const SEEK_KEYS: Readonly<Record<string, number>> = {
	ArrowRight: 1,
	ArrowUp: 1,
	ArrowLeft: -1,
	ArrowDown: -1,
	PageUp: 10,
	PageDown: -10,
};

/**
 * Fetches a clip into a `Blob` and returns an object URL for it, which is the `resolveSource` of the media
 * controller; `URL.revokeObjectURL` is its `releaseSource`.
 *
 * @remarks
 * A media element can only seek in a file whose server answers range requests, and many development and preview
 * servers do not. The clips here are short, so each is played from memory, which always seeks. For long media serve
 * the file with range support and load its URL directly.
 */
export async function blobUrlOf(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
	return URL.createObjectURL(await response.blob());
}

/** The `aria-valuetext` of the seek thumb, such as `1:15 of 4:00`, from the clock and the total as they are shown. */
export function seekValueText(elapsed: string, total: string): string {
	return `${elapsed} of ${total}`;
}

/** The `aria-valuetext` of the volume thumb, such as `80%`. */
export function volumeValueText(level: number): string {
	return `${Math.round(level * 100)}%`;
}

/**
 * Keeps a text as the `aria-valuetext` of a slider thumb.
 *
 * @remarks
 * The slider writes its own `aria-valuetext`, the bare value, whenever it repaints, which is a later update than the
 * one that changed the value. A single write would be overwritten with "12.31" seconds or "0.80", so a
 * `MutationObserver` puts the text back. The media controller reports its first state when it attaches, which can be
 * before the player has a thumb to watch, so `set()` keeps the text and `watch()` writes it; call `watch()` again
 * when a render has replaced the thumb.
 */
export class ValueText {
	private text = '';
	private thumb: HTMLElement | undefined;
	private readonly observer = new MutationObserver(() => this.apply());

	watch(thumb: HTMLElement): void {
		this.observer.disconnect();
		this.thumb = thumb;
		this.observer.observe(thumb, { attributes: true, attributeFilter: ['aria-valuetext'] });
		this.apply();
	}

	set(text: string): void {
		this.text = text;
		this.apply();
	}

	stop(): void {
		this.observer.disconnect();
	}

	private apply(): void {
		if (this.thumb && this.thumb.getAttribute('aria-valuetext') !== this.text) {
			this.thumb.setAttribute('aria-valuetext', this.text);
		}
	}
}

/** The status the player starts with, until a track is picked. */
export const PLAYLIST_HINT = 'Pick a track, or drag one to reorder the playlist';

/** What the playlist rows are described by, so a screen reader user learns the keys the rows answer to. */
export const PLAYLIST_HELP = 'Enter plays, Space picks up to reorder';

export type LoopMode = 'off' | 'all' | 'one';

const LOOP_CYCLE: Readonly<Record<LoopMode, LoopMode>> = { off: 'all', all: 'one', one: 'off' };

/** The loop mode after `mode`: off, all, one and back to off. */
export function nextLoopMode(mode: LoopMode): LoopMode {
	return LOOP_CYCLE[mode];
}

/**
 * The accessible name of the loop button, which changes with the mode, such as `Loop: all`, and is also the polite
 * announcement of the change.
 *
 * @remarks
 * The button has three states, so it carries no `aria-pressed`: a pressed state can say only two.
 */
export function loopLabel(mode: LoopMode): string {
	return `Loop: ${mode}`;
}

/** The announcement of the shuffle toggle; its accessible name stays `Shuffle`. */
export function shuffleAnnouncement(on: boolean): string {
	return on ? 'Shuffle on' : 'Shuffle off';
}

/** Seconds a track must have played for Previous to restart it instead of moving to the one before. */
export const RESTART_AFTER = 3;

/** Where Previous goes: `restart` means to the start of `track`, which is the current one, and not to another. */
export type Step<T> = { track: T; restart: boolean };

/**
 * The order the player steps through: the list order, or a shuffle, with a loop mode.
 *
 * @remarks
 * Tracks are held by identity, never by index, so reordering the list with `setItems` keeps a shuffle's bag and
 * history pointing at the same tracks. The shuffle is a bag: every track is played once before any is played
 * again, and the track that just played is never drawn first from the next bag. `random` returns a number from 0
 * up to but not including 1, as `Math.random` does, so a test can supply a fixed sequence. The tracks are the same
 * set for the life of the order; `setItems` takes the same tracks in a new order.
 *
 * The `next` and `previous` of a person's click always move and wrap; `ended` is the end of a track, which stops
 * at the end of the playlist unless the loop mode is `all`, and repeats the track when it is `one`.
 */
export class PlaybackOrder<T> {
	loop: LoopMode = 'off';
	private items: readonly T[];
	private bag: T[] = [];
	private history: T[] = [];
	private forward: T[] = [];
	private shuffled = false;

	constructor(
		items: readonly T[],
		public current: T,
		private readonly random: () => number = Math.random,
	) {
		this.items = items;
	}

	get shuffle(): boolean {
		return this.shuffled;
	}

	/** Turns the shuffle on, with a full bag of the tracks that are not the current one, or off, to list order. */
	setShuffle(on: boolean): void {
		this.shuffled = on;
		this.history = [];
		this.forward = [];
		this.bag = on ? this.items.filter((item) => item !== this.current) : [];
	}

	/** Takes the same tracks in a new order; the bag and history keep the tracks they held. */
	setItems(items: readonly T[]): void {
		this.items = items;
	}

	/** A track the person chose: it becomes the current one and leaves the bag, as a track that has been played. */
	select(track: T): void {
		if (track === this.current) return;
		this.history.push(this.current);
		this.forward = [];
		this.bag = this.bag.filter((item) => item !== track);
		this.current = track;
	}

	/** The track a click on Next moves to, which is now the current one. */
	next(): T {
		const to = this.shuffled ? (this.forward.pop() ?? this.draw()) : this.neighbour(1);
		this.advance(to);
		return to;
	}

	/**
	 * What a click on Previous does, given the seconds the current track has played: past `RESTART_AFTER` it
	 * restarts the track, else it moves to the one before in the list, or to the one played before in a shuffle,
	 * and restarts when a shuffle has none. The track a shuffle steps back from is kept, so Next returns to it before
	 * drawing a new one.
	 */
	previous(played: number): Step<T> {
		if (played > RESTART_AFTER) return { track: this.current, restart: true };
		if (!this.shuffled) {
			this.current = this.neighbour(-1);
			return { track: this.current, restart: false };
		}
		const before = this.history.pop();
		if (before === undefined) return { track: this.current, restart: true };
		this.forward.push(this.current);
		this.current = before;
		return { track: before, restart: false };
	}

	/**
	 * The track that follows one that played to its end, `undefined` at the end of the playlist: the last track in
	 * list order, or the last of a bag, with the loop mode `off`.
	 */
	ended(): T | undefined {
		if (this.loop === 'one') return this.current;
		if (this.loop === 'off' && this.isLast()) return undefined;
		return this.next();
	}

	private isLast(): boolean {
		return this.shuffled
			? this.forward.length === 0 && this.unplayed().length === 0
			: this.items.indexOf(this.current) === this.items.length - 1;
	}

	private neighbour(direction: 1 | -1): T {
		const index = this.items.indexOf(this.current);
		return this.items[(index + direction + this.items.length) % this.items.length];
	}

	private unplayed(): T[] {
		return this.bag.filter((item) => item !== this.current);
	}

	private draw(): T {
		if (this.unplayed().length === 0) this.bag = [...this.items];
		const other = this.unplayed();
		const choices = other.length > 0 ? other : this.bag;
		const pick = choices[Math.floor(this.random() * choices.length)];
		this.bag.splice(this.bag.indexOf(pick), 1);
		return pick;
	}

	private advance(to: T): void {
		if (to === this.current) return;
		if (this.shuffled) this.history.push(this.current);
		this.current = to;
	}
}
