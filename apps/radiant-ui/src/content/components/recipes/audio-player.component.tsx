import { RadiantElement, customElement, onEvent, query, state } from '@ecopages/radiant';
import {
	createAudioVisualizerController,
	createMediaController,
	createRovingController,
	createSortableController,
	type MediaState,
} from '@ecopages/radiant-ui/controllers';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { formatMediaTime, reorder } from '@ecopages/radiant-ui/helpers';
import { RuiSlider } from '@ecopages/radiant-ui/slider';
import type { RuiSliderChangeDetail, RuiSliderElement } from '@ecopages/radiant-ui/slider';
import { RuiToolbar } from '@ecopages/radiant-ui/toolbar';

import {
	PLAYLIST_HELP,
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
	tracks,
	type LoopMode,
	type Track,
	type VisualizerName,
	volumeValueText,
} from './audio-player.data';

/**
 * @remarks
 * The order, the current track, whether it plays and the chosen visualizer are `@state`, so a reorder, a new track
 * or a new visualizer is a render. The clock, the status and the seek position change several times a second, so
 * they never go through the list: the clock and the status are bound with `this.$` and the seek position is
 * written to the slider, which keeps a lifted track from being re-rendered under the pointer.
 *
 * Playback is a `MediaController` and the cover is an `AudioVisualizerController`, both created with the element as
 * their host: the element never listens to the `audio` element and runs no animation frame loop. What stays here is
 * the playlist: the order, which track is current, going on to the next one when a track ends, and the buttons.
 */
@customElement('audio-player-app')
export class AudioPlayerApp extends RadiantElement<{ status: string; elapsed: string; total: string }> {
	@state order = tracks.map((track) => track.id);
	@state current = tracks[0].id;
	@state playing = false;
	@state ready = false;
	@state view: VisualizerName = 'bars';
	@state loop: LoopMode = 'off';
	@state shuffled = false;
	@state elapsed = '0:00';
	@state total = tracks[0].length;
	@state duration = 1;
	@state status = PLAYLIST_HINT;

	@query({ selector: '[data-audio]' }) private audio!: HTMLAudioElement;
	@query({ selector: '[data-cover]' }) private cover!: HTMLElement;
	@query({ selector: '[data-seek]' }) private seek!: RuiSliderElement;
	@query({ selector: '[data-volume-input]' }) private volume!: RuiSliderElement;
	@query({ selector: '[data-tracks]' }) private list!: HTMLElement;
	@query({ selector: '[data-track]', all: true }) private rows!: HTMLElement[];

	private focusTrack: string | null = null;
	private playback = new PlaybackOrder(this.order, this.current);
	private level = VOLUME;
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
		onError: () => (this.status = `Could not load ${this.track(this.current).title}`),
	});

	private readonly visualizer = createAudioVisualizerController(this, {
		getMedia: () => this.audio,
		getTarget: () => this.cover,
		preset: this.presets.bars,
	});

	private readonly roving = createRovingController(this, {
		getItems: () => this.rows,
		getTarget: () => this.list,
		orientation: 'vertical',
		getEnabled: () => this.sortable.getState() === null,
	});

	private readonly sortable = createSortableController(this, {
		preview: true,
		liftKeys: [' '],
		createPlaceholder: () => document.createElement('li'),
		getContainer: () => this.list,
		getItems: () => this.rows,
		announce: (message) => (this.status = message),
		onChange: ({ item, from, to }) => {
			this.focusTrack = item.dataset.track!;
			this.order = reorder(this.order, from, to);
			this.playback.setItems(this.order);
		},
	});

	private track(id: string): Track {
		return tracks.find((candidate) => candidate.id === id)!;
	}

	private load(id: string, autoplay: boolean): void {
		const track = this.track(id);
		this.current = id;
		this.elapsed = '0:00';
		this.total = track.length;
		this.seek.value = [0];
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

	private next(): void {
		this.load(this.playback.next(), this.keepsPlaying());
	}

	private previous(): void {
		const step = this.playback.previous(this.media.getState().position);
		if (step.restart) this.restart(false);
		else this.load(step.track, this.keepsPlaying());
	}

	private cycleLoop(): void {
		this.playback.loop = nextLoopMode(this.playback.loop);
		this.loop = this.playback.loop;
		this.status = loopLabel(this.loop);
	}

	private toggleShuffle(): void {
		this.playback.setShuffle(!this.playback.shuffle);
		this.shuffled = this.playback.shuffle;
		this.status = shuffleAnnouncement(this.shuffled);
	}

	private choose(id: string): void {
		this.visualizer.resume();
		if (id !== this.current || this.media.getState().status === 'error') {
			this.playback.select(id);
			this.load(id, true);
		} else void this.media.toggle();
	}

	/**
	 * Starts the player on the first track of the current order, paused, each time the element connects.
	 *
	 * @remarks
	 * It runs after the render, so the `audio` element and the cover exist, and again when the element is moved to
	 * another parent. The controllers attach when the element connects, before the first render, when there is no
	 * media yet, so they attach again here.
	 */
	constructor() {
		super();
		this.registerCleanupCallback(() => {
			this.seekText.stop();
			this.volumeText.stop();
		});
	}

	override onConnected(): void {
		this.media.attach();
		this.visualizer.refresh();
		this.media.setVolume(VOLUME);
		this.volumeText.set(volumeValueText(VOLUME));
		this.status = PLAYLIST_HINT;
		this.playback = new PlaybackOrder(this.order, this.order[0]);
		this.loop = 'off';
		this.shuffled = false;
		this.load(this.order[0], false);
	}

	/**
	 * Attaches both list controllers to the list the render produced and focuses the track that was just moved.
	 *
	 * @remarks
	 * The controllers attach when the element connects, before the first render, when no list exists yet; the
	 * `attach()` again resolves the list each controller listens on, and `sync()` gives the roving controller the
	 * rows of the committed list. Every row renders `tabindex="-1"` and the roving controller moves the one tab stop:
	 * a row with no `tabindex` attribute reports `-1` already, so `sync()` would leave it unfocusable. The keyed rows
	 * keep their nodes across renders, so the moved track is the same node, found by its id.
	 */
	protected override updated(): void {
		this.seekText.watch(this.seek.querySelector<HTMLElement>('[role="slider"]')!);
		this.volumeText.watch(this.volume.querySelector<HTMLElement>('[role="slider"]')!);
		this.renderSeekText();
		this.volumeText.set(volumeValueText(this.level));
		this.sortable.attach();
		this.roving.attach();
		this.roving.sync();
		if (this.focusTrack) {
			this.roving.focus(this.rows.find((row) => row.dataset.track === this.focusTrack)!);
			this.focusTrack = null;
		}
	}

	/**
	 * The one place the media state reaches the page. A track that was playing and is now `ended` is the cue for the
	 * order to say what follows: seeking a paused track to its end reports `ended` too, and must not start another
	 * track.
	 */
	private renderState(state: MediaState): void {
		const playing = state.status === 'playing';
		const finished = state.status === 'ended' && this.playing;
		if (playing && !this.playing) this.status = `Playing ${this.track(this.current).title}`;
		this.playing = playing;
		this.ready = state.seekable && state.status !== 'error';
		if (Number.isFinite(state.duration)) {
			this.duration = state.duration;
			this.total = formatMediaTime(state.duration);
		}
		this.renderSeekText();
		if (finished) {
			const following = this.playback.ended();
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

	/**
	 * @remarks
	 * The slider works in seconds and reports `rui-change` only for the reader (a pointer, Home or End), never for the
	 * position `renderProgress` writes to it.
	 */
	private onSeek(event: Event): void {
		this.media.scrub((event as CustomEvent<RuiSliderChangeDetail>).detail.value[0]);
	}

	/**
	 * @remarks
	 * The one handler that is not a JSX `on:*` attribute: it is delegated in the capture phase, which runs before the
	 * slider's own key handler and lets this stop it for the keys the player moves by whole seconds.
	 */
	@onEvent({ selector: '[data-seek]', type: 'keydown', options: { capture: true } })
	onSeekKey(event: KeyboardEvent): void {
		const distance = SEEK_KEYS[event.key];
		if (distance === undefined) return;
		event.preventDefault();
		event.stopPropagation();
		this.media.skip(distance);
	}

	private onVolume(event: Event): void {
		this.level = (event as CustomEvent<RuiSliderChangeDetail>).detail.value[0];
		this.media.setVolume(this.level);
		this.volumeText.set(volumeValueText(this.level));
	}

	private show(view: VisualizerName): void {
		this.view = view;
		this.visualizer.setPreset(this.presets[view]);
	}

	override render() {
		const now = this.track(this.current);
		return (
			<>
				<audio data-audio preload="auto"></audio>
				<div data-now>
					<span data-cover aria-hidden="true"></span>
					<div data-meta>
						<strong data-title>{now.title}</strong>
						<span data-artist>{now.artist}</span>
						<RuiToolbar label="Visualizer">
							<RuiButton
								variant="ghost"
								size="sm"
								data-visualizer="bars"
								pressed={this.view === 'bars'}
								on:click={() => this.show('bars')}
							>
								Bars
							</RuiButton>
							<RuiButton
								variant="ghost"
								size="sm"
								data-visualizer="wave"
								pressed={this.view === 'wave'}
								on:click={() => this.show('wave')}
							>
								Wave
							</RuiButton>
						</RuiToolbar>
					</div>
				</div>
				<div data-scrub>
					<output data-elapsed>{this.$.elapsed}</output>
					<RuiSlider
						data-seek
						label="Seek"
						min={0}
						max={this.duration}
						step={0.01}
						value={0}
						disabled={!this.ready}
						on:rui-change={(event: Event) => this.onSeek(event)}
					/>
					<output data-total>{this.$.total}</output>
				</div>
				<div data-controls>
					<RuiButton
						variant="ghost"
						square
						data-previous
						aria-label="Previous track"
						on:click={() => this.previous()}
					>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
							<path d="M5 5h2v14H5zM19 5v14L8 12z" fill="currentColor" />
						</svg>
					</RuiButton>
					<RuiButton
						variant="filled"
						size="lg"
						square
						data-playback
						aria-label="Play"
						pressed={this.playing}
						on:click={() => this.choose(this.current)}
					>
						<svg
							viewBox="0 0 24 24"
							width="16"
							height="16"
							aria-hidden="true"
							focusable="false"
							data-icon="play"
						>
							<path d="M8 5v14l10-7z" fill="currentColor" />
						</svg>
						<svg
							viewBox="0 0 24 24"
							width="16"
							height="16"
							aria-hidden="true"
							focusable="false"
							data-icon="pause"
						>
							<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" />
						</svg>
					</RuiButton>
					<RuiButton variant="ghost" square data-next aria-label="Next track" on:click={() => this.next()}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
							<path d="M17 5h2v14h-2zM5 5v14l11-7z" fill="currentColor" />
						</svg>
					</RuiButton>
					<RuiButton
						variant="ghost"
						square
						data-loop
						data-mode={this.loop}
						aria-label={loopLabel(this.loop)}
						on:click={() => this.cycleLoop()}
					>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
							<path
								d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
								fill="currentColor"
							/>
							<path d="M13 15V9h-1l-2 1v1h1.5v4H13z" fill="currentColor" data-one />
						</svg>
					</RuiButton>
					<RuiButton
						variant="ghost"
						square
						data-shuffle
						aria-label="Shuffle"
						pressed={this.shuffled}
						on:click={() => this.toggleShuffle()}
					>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
							<path
								d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
								fill="currentColor"
							/>
						</svg>
					</RuiButton>
					<div data-volume>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
							<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
							<path
								d="M16 9a4 4 0 0 1 0 6"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
						<RuiSlider
							data-volume-input
							label="Volume"
							min={0}
							max={1}
							step={0.05}
							value={this.level}
							on:rui-change={(event: Event) => this.onVolume(event)}
						/>
					</div>
				</div>
				<ol data-tracks aria-label="Playlist">
					{this.order.map((id, index) => {
						const track = this.track(id);
						return (
							<li
								key={id}
								data-track={id}
								aria-current={id === this.current}
								aria-describedby="audio-player-app-help"
								tabindex="-1"
								on:click={() => this.choose(id)}
								on:keydown={(event: KeyboardEvent) => event.key === 'Enter' && this.choose(id)}
							>
								<span data-number>{index + 1}</span>
								<span data-name>{track.title}</span>
								<span data-length>{track.length}</span>
							</li>
						);
					})}
				</ol>
				<span data-help hidden id="audio-player-app-help">
					{PLAYLIST_HELP}
				</span>
				<p data-status aria-live="polite">
					{this.$.status}
				</p>
			</>
		);
	}
}
