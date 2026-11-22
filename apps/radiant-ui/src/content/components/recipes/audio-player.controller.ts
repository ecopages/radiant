import { RadiantController, bindTo, controller, onEvent, query, state, queryAll } from '@ecopages/radiant';
import {
	createAudioVisualizerController,
	createMediaController,
	createRovingController,
	createSortableController,
	type MediaState,
} from '@ecopages/radiant-ui/controllers';
import '@ecopages/radiant-ui/slider';
import '@ecopages/radiant-ui/toolbar';
import type { RuiSliderElement } from '@ecopages/radiant-ui/slider';
import { formatMediaTime, reorder } from '@ecopages/radiant-ui/helpers';
import {
	PLAYLIST_HINT,
	PlaybackOrder,
	SEEK_KEYS,
	ValueText,
	VOLUME,
	blobUrlOf,
	createVisualizers,
	loopLabel,
	nextLoopMode,
	seekValueText,
	shuffleAnnouncement,
	volumeValueText,
	type LoopMode,
	type VisualizerName,
} from './audio-player.data';

type Track = { element: HTMLElement; src: string; title: string; artist: string; length: string };

/**
 * @remarks
 * The authored rows are read once into `tracks`, which holds the order from then on. The text that follows the player
 * (title, artist, clock, status), the toggle and the seek bar are `@state` fields that `@bindTo` copies onto the
 * authored markup, so the controller never writes to those nodes itself.
 *
 * `createMediaController(this, ...)`, `createAudioVisualizerController(this, ...)`, `createRovingController(this,
 * ...)` and `createSortableController(this, ...)` accept a `RadiantController` as their host, because it has the
 * `registerConnectedCallback` and `registerCleanupCallback` they need: they attach when the registry connects the
 * host and are destroyed when it disconnects. The controller never listens to the `audio` element and runs no
 * animation frame loop; what stays here is the playlist: the order, which track is current, going on to the next
 * one when a track ends, and the buttons.
 */
@controller('audio-player')
export class AudioPlayerController extends RadiantController {
	@query('[data-audio]') private audio!: HTMLAudioElement;
	@query('[data-cover]') private cover!: HTMLElement;
	@query('[data-tracks]') private list!: HTMLElement;
	@query('[data-seek]') private seek!: RuiSliderElement;
	@query('[data-volume-input]') private volume!: RuiSliderElement;
	@query('[data-seek] [role="slider"]') private seekThumb!: HTMLElement;
	@query('[data-volume-input] [role="slider"]') private volumeThumb!: HTMLElement;
	@queryAll('[data-track]') private rows!: HTMLElement[];
	@queryAll('[data-name]') private names!: HTMLElement[];
	@queryAll('[data-length]') private lengths!: HTMLElement[];
	@queryAll('[data-number]') private numbers!: HTMLElement[];

	@state
	@bindTo({ selector: '[data-title]', text: true })
	heading = '';

	@state
	@bindTo({ selector: '[data-artist]', text: true })
	artist = '';

	@state
	@bindTo({ selector: '[data-elapsed]', text: true })
	elapsed = '0:00';

	@state
	@bindTo({ selector: '[data-total]', text: true })
	total = '';

	@state
	@bindTo({ selector: '[data-status]', text: true })
	status = PLAYLIST_HINT;

	@state
	@bindTo({ selector: '[data-seek]', bool: 'disabled', invert: true })
	seekable = false;

	@state
	@bindTo({ selector: '[data-playback]', attr: 'aria-pressed', map: (playing) => String(playing) })
	playing = false;

	@state
	@bindTo({ selector: '[data-loop]', attr: 'data-mode' })
	loopMode: LoopMode = 'off';

	@state
	@bindTo({ selector: '[data-loop]', attr: 'aria-label' })
	loopName = loopLabel('off');

	@state
	@bindTo({ selector: '[data-shuffle]', attr: 'aria-pressed', map: (on) => String(on) })
	shuffled = false;

	private tracks: Track[] = [];
	private current!: Track;
	private order!: PlaybackOrder<Track>;
	private readonly presets = createVisualizers();
	private readonly seekText = new ValueText();
	private readonly volumeText = new ValueText();

	private readonly media = createMediaController(this, {
		getMedia: () => this.audio,
		resolveSource: blobUrlOf,
		releaseSource: (url) => URL.revokeObjectURL(url),
		clearSourceOnDestroy: true,
		onState: (state) => this.renderState(state),
		onProgress: (state) => this.renderProgress(state),
		onError: () => (this.status = `Could not load ${this.heading}`),
	});

	private readonly visualizer = createAudioVisualizerController(this, {
		getMedia: () => this.audio,
		getTarget: () => this.cover,
		preset: this.presets.led,
	});

	private readonly roving = createRovingController(this, {
		getItems: () => this.tracks.map((track) => track.element),
		getTarget: () => this.list,
		orientation: 'vertical',
		getEnabled: () => this.sortable.getState() === null,
	});

	private readonly sortable = createSortableController(this, {
		preview: true,
		liftKeys: [' '],
		createPlaceholder: () => document.createElement('li'),
		getContainer: () => this.list,
		getItems: () => this.tracks.map((track) => track.element),
		announce: (message) => (this.status = message),
		onChange: ({ item, from, to }) => {
			this.tracks = reorder(this.tracks, from, to);
			this.order.setItems(this.tracks);
			this.list.append(...this.tracks.map((track) => track.element));
			this.numbers.forEach((number, index) => (number.textContent = String(index + 1)));
			this.roving.focus(item);
		},
	});

	constructor(host: Element) {
		super(host);
		this.registerCleanupCallback(() => {
			this.seekText.stop();
			this.volumeText.stop();
		});
	}

	override connect(): void {
		super.connect();
		this.seekText.watch(this.seekThumb);
		this.volumeText.watch(this.volumeThumb);
		this.volumeText.set(volumeValueText(VOLUME));
		this.tracks = this.rows.map((element, index) => ({
			element,
			src: element.dataset.src!,
			title: this.names[index].textContent!,
			artist: element.dataset.artist!,
			length: this.lengths[index].textContent!,
		}));
		this.order = new PlaybackOrder(this.tracks, this.tracks[0]);
		this.loopMode = 'off';
		this.loopName = loopLabel('off');
		this.shuffled = false;
		this.roving.sync();
		this.media.setVolume(VOLUME);
		this.status = PLAYLIST_HINT;
		this.load(this.tracks[0], false);
	}

	/**
	 * The one place the media state reaches the page. A track that was playing and is now `ended` is the cue for the
	 * order to say what follows: seeking a paused track to its end reports `ended` too, and must not start another
	 * track.
	 */
	private renderState(state: MediaState): void {
		const playing = state.status === 'playing';
		const finished = state.status === 'ended' && this.playing;
		if (playing && !this.playing) this.status = `Playing ${this.heading}`;
		this.playing = playing;
		this.seekable = state.seekable && state.status !== 'error';
		if (Number.isFinite(state.duration)) {
			this.seek.max = state.duration;
			this.total = formatMediaTime(state.duration);
		}
		this.renderSeekText();
		if (finished) {
			const following = this.order.ended();
			if (following === undefined) this.status = 'End of the playlist';
			else if (following === this.current) this.restart(true);
			else this.load(following, true);
		}
	}

	/** The controller reports the pending scrub target as the position, so the thumb and the clock never jump back. */
	private renderProgress(state: MediaState): void {
		this.seek.value = [state.position];
		this.elapsed = formatMediaTime(state.position);
		this.renderSeekText();
	}

	private renderSeekText(): void {
		this.seekText.set(seekValueText(this.elapsed, this.total));
	}

	/** The slider works in seconds and dispatches `input` only for the reader, never for a position written to it. */
	@onEvent({ selector: '[data-seek]', type: 'input' })
	scrub(): void {
		this.media.scrub(this.seek.value[0]);
	}

	/**
	 * Delegated in the capture phase, which runs before the slider's own key handler and lets this stop it for the
	 * keys the player moves by whole seconds.
	 */
	@onEvent({ selector: '[data-seek]', type: 'keydown', options: { capture: true } })
	scrubWithKey(event: Event): void {
		const key = event as KeyboardEvent;
		const distance = SEEK_KEYS[key.key];
		if (distance === undefined) return;
		key.preventDefault();
		key.stopPropagation();
		this.media.skip(distance);
	}

	@onEvent({ selector: '[data-volume-input]', type: 'input' })
	setVolume(): void {
		const level = this.volume.value[0];
		this.media.setVolume(level);
		this.volumeText.set(volumeValueText(level));
	}

	/**
	 * The toolbar stops a click on a toggle in its own capture handler, so this is delegated in the capture phase on
	 * the element above it. A click on the pressed button is stopped here, which keeps one of the two pressed.
	 */
	@onEvent({ selector: '[data-visualizer]', type: 'click', options: { capture: true } })
	pickVisualizer(event: Event): void {
		const button = (event.target as Element).closest<HTMLElement>('[data-visualizer]')!;
		if (button.getAttribute('aria-pressed') === 'true') event.stopPropagation();
		else this.visualizer.setPreset(this.presets[button.dataset.visualizer as VisualizerName]);
	}

	@onEvent({ selector: '[data-playback]', type: 'click' })
	togglePlayback(): void {
		this.choose(this.current);
	}

	@onEvent({ selector: '[data-previous]', type: 'click' })
	previous(): void {
		const step = this.order.previous(this.media.getState().position);
		if (step.restart) this.restart(false);
		else this.load(step.track, this.keepsPlaying());
	}

	@onEvent({ selector: '[data-next]', type: 'click' })
	next(): void {
		this.load(this.order.next(), this.keepsPlaying());
	}

	@onEvent({ selector: '[data-loop]', type: 'click' })
	cycleLoop(): void {
		this.order.loop = nextLoopMode(this.order.loop);
		this.loopMode = this.order.loop;
		this.loopName = loopLabel(this.order.loop);
		this.status = this.loopName;
	}

	@onEvent({ selector: '[data-shuffle]', type: 'click' })
	toggleShuffle(): void {
		this.order.setShuffle(!this.order.shuffle);
		this.shuffled = this.order.shuffle;
		this.status = shuffleAnnouncement(this.shuffled);
	}

	@onEvent({ selector: '[data-track]', type: 'click' })
	pick(event: Event): void {
		this.choose(this.trackOf(event));
	}

	@onEvent({ selector: '[data-track]', type: 'keydown' })
	pickWithKey(event: Event): void {
		if ((event as KeyboardEvent).key === 'Enter') this.choose(this.trackOf(event));
	}

	private trackOf(event: Event): Track {
		const row = (event.target as Element).closest('[data-track]');
		return this.tracks.find((track) => track.element === row)!;
	}

	private load(track: Track, autoplay: boolean): void {
		this.current = track;
		this.heading = track.title;
		this.artist = track.artist;
		this.elapsed = '0:00';
		this.total = track.length;
		this.seek.value = [0];
		this.tracks.forEach((candidate) => candidate.element.setAttribute('aria-current', String(candidate === track)));
		void this.media.load(track.src, { autoplay });
	}

	/** Plays the current track again from its start, or leaves it paused there. */
	private restart(play: boolean): void {
		this.media.seek(0);
		if (play) void this.media.play();
	}

	/**
	 * A track that is still loading counts as playing, so Next pressed twice while the first one loads keeps the
	 * playlist going.
	 */
	private keepsPlaying(): boolean {
		return ['playing', 'loading'].includes(this.media.getState().status);
	}

	private choose(track: Track): void {
		this.visualizer.resume();
		if (track !== this.current || this.media.getState().status === 'error') {
			this.order.select(track);
			this.load(track, true);
		} else void this.media.toggle();
	}
}
