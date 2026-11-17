import { RadiantElement, customElement, onEvent, query, state } from '@ecopages/radiant';
import {
	createCaptionsController,
	createHotkeyController,
	createMediaController,
	type MediaState,
} from '@ecopages/radiant-ui/controllers';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { cycleValue, formatMediaTime } from '@ecopages/radiant-ui/helpers';
import { RuiSlider } from '@ecopages/radiant-ui/slider';
import type { RuiSliderChangeDetail, RuiSliderElement } from '@ecopages/radiant-ui/slider';
import { createStore } from '@ecopages/signals';

import {
	Announcer,
	CAPTIONS,
	HIDE_CONTROLS_MS,
	RATES,
	SEEK_KEYS,
	SHORTCUTS,
	VIDEO,
	bufferedSegments,
	isOwnedByControl,
	seekValueText,
	stageState,
	type Shortcut,
	type StageState,
} from './video-player-store.data';
import { fetchSource, releaseSource } from './video-player-store.loader';

const HELP =
	'Space or K plays and pauses, J and L skip 10 seconds, the arrows seek 5 seconds or change the volume, M mutes, C toggles captions, F toggles fullscreen, 0 to 9 jump through the video, Home and End go to its start and end';

/**
 * Passes a binding through `RuiButton`'s `pressed` prop, which is typed as a snapshot.
 *
 * @remarks The helper writes that value onto a native `aria-pressed`. A binding there patches
 * the attribute without a parent render. Accessors would not remove this: the view still types
 * the prop as `boolean`.
 */
const pressedBinding = (value: unknown) => value as boolean;

/**
 * The media snapshot the player paints from. Path writes through `this.$.media.*` patch nodes without
 * re-running `render()`.
 *
 * @remarks
 * `stage` is written from the controller's status, waiting and error in the same callback as the rest of
 * the snapshot: a binding follows one path, and `data-state` is that path. Accessor positions would not
 * remove it. `muted ? 0 : volume` and the thumb's time text are computed in that callback and written to
 * the slider by hand; they are not JSX positions on this host.
 */
export type PlayerMedia = {
	stage: StageState;
	playing: boolean;
	muted: boolean;
	seekable: boolean;
	captionsOn: boolean;
	fullscreenAvailable: boolean;
	fullscreen: boolean;
	rate: number;
	status: string;
	position: number;
	duration: number;
	volume: number;
	controlsHidden: boolean;
};

const INITIAL_MEDIA: PlayerMedia = {
	stage: 'idle',
	playing: false,
	muted: false,
	seekable: false,
	captionsOn: false,
	fullscreenAvailable: false,
	fullscreen: false,
	rate: 1,
	status: '',
	position: 0,
	duration: Number.NaN,
	volume: 1,
	controlsHidden: false,
};

/**
 * @remarks
 * One `createStore` holds the snapshot. Hot paths (`position`, `muted`, `playing`, `rate`, the clock) are
 * `this.$.media.*` bindings, so a playing clip patches nodes without redrawing the stage. `RuiSlider` snapshots
 * `max` and `disabled` in its view helper: those are private fields `render()` reads, and `requestUpdate()` runs
 * once when they change. Writing the host properties is not enough. Per-frame `value` still goes to the host by
 * hand, as do the buffered layer and the thumb's `aria-valuetext`.
 */
@customElement('video-player-store-app')
export class VideoPlayerStoreApp extends RadiantElement<{ media: PlayerMedia }> {
	@state media: PlayerMedia = createStore({ ...INITIAL_MEDIA });

	@query('[data-stage]') private stageNode!: HTMLElement;
	@query('[data-video]') private video!: HTMLVideoElement;
	@query('[data-controls]') private controls!: HTMLElement;
	@query('[data-seek]') private seek!: RuiSliderElement;
	@query('[data-volume-input]') private volume!: RuiSliderElement;

	private hideTimer: ReturnType<typeof setTimeout> | undefined;
	private pointer = 'mouse';
	private seekMax = 1;
	private seekable = false;
	private bufferedKey = '';
	private readonly announcer = new Announcer();
	private thumb: HTMLElement | null = null;
	private readonly thumbObserver = new MutationObserver(() => this.keepValueText());

	private readonly captions = createCaptionsController(this, {
		getMedia: () => this.video,
		getAvoid: () => this.controls,
		tracks: [{ language: 'en', label: 'English', cues: CAPTIONS }],
		onState: (state) => {
			this.media.captionsOn = state.enabled;
		},
	});

	private readonly playback = createMediaController(this, {
		getMedia: () => this.video,
		resolveSource: fetchSource,
		releaseSource,
		clearSourceOnDestroy: true,
		onState: (state) => this.writeState(state),
		onProgress: (state) => this.writeProgress(state),
	});

	private readonly stageKeys = createHotkeyController(this, {
		getTarget: () => this.stageNode,
		hotkeys: Array.from(SHORTCUTS, ([keys, shortcut]) => ({
			keys,
			handler: (event: KeyboardEvent) => (isOwnedByControl(event) ? false : this.run(shortcut)),
		})),
	});

	private readonly seekKeys = createHotkeyController(this, {
		getTarget: () => this.seek,
		capture: true,
		hotkeys: Array.from(SEEK_KEYS, ([keys, seconds]) => ({
			keys,
			handler: (event: KeyboardEvent) => {
				event.stopPropagation();
				this.wake();
				this.playback.skip(seconds);
			},
		})),
	});

	constructor() {
		super();
		this.registerCleanupCallback(() => {
			clearTimeout(this.hideTimer);
			this.thumbObserver.disconnect();
			this.thumb = null;
		});
	}

	/**
	 * Starts the player paused on the clip, each time the element connects.
	 *
	 * @remarks
	 * It runs after the render, so the `video` element exists. The controllers attached when the element
	 * connected, before the first render, when there was no media yet, so the media controller attaches again here and
	 * the captions controller refreshes. The cleanup is
	 * registered once in the constructor, because one registered here would be added again on every reconnect.
	 */
	override onConnected(): void {
		this.captions.refresh();
		this.captions.disable();
		this.media.fullscreenAvailable = document.fullscreenEnabled;
		this.announcer.reset();
		this.playback.attach();
		this.stageKeys.attach();
		this.seekKeys.attach();
		void this.playback.load(this.video.dataset.src!);
	}

	@onEvent({ document: true, type: 'fullscreenchange' })
	followFullscreen(): void {
		this.media.fullscreen = document.fullscreenElement === this.stageNode;
	}

	/**
	 * Adds the buffered layer to the seek track and watches the seek thumb after each render.
	 *
	 * @remarks
	 * The slider repaints in a later update with its own `aria-valuetext`, a bare number of seconds, so the observer
	 * puts the player's text back. A render that replaced the track would drop the layer, which is added again here.
	 */
	protected override updated(): void {
		const track = this.seek.querySelector<HTMLElement>('[data-ref="rangeTrack"]')!;
		if (!track.querySelector('[data-buffered]')) {
			const layer = document.createElement('div');
			layer.setAttribute('data-buffered', '');
			layer.setAttribute('aria-hidden', 'true');
			track.prepend(layer);
			this.bufferedKey = '';
		}
		const thumb = this.seek.querySelector<HTMLElement>('[role="slider"]')!;
		if (thumb !== this.thumb) {
			this.thumbObserver.disconnect();
			this.thumb = thumb;
			this.thumbObserver.observe(thumb, { attributes: true, attributeFilter: ['aria-valuetext'] });
		}
	}

	private writeState(state: MediaState): void {
		const media = this.media;
		const message = this.announcer.next(state);
		media.stage = stageState(state);
		media.playing = state.status === 'playing';
		media.muted = state.muted;
		media.rate = state.rate;
		media.seekable = state.seekable;
		media.volume = state.volume;
		if (message !== '') media.status = message;
		if (Number.isFinite(state.duration)) this.seekMax = state.duration;
		if (state.seekable !== this.seekable) {
			this.seekable = state.seekable;
			this.requestUpdate();
		}
		this.seek.max = this.seekMax;
		this.seek.disabled = !this.seekable;
		this.volume.value = [state.muted ? 0 : state.volume];
		this.writeProgress(state);
		this.wake();
	}

	/** The controller reports the pending scrub target as the position, so the thumb and the clock never jump back. */
	private writeProgress(state: MediaState): void {
		const media = this.media;
		media.position = state.position;
		media.duration = state.duration;
		media.volume = state.volume;
		this.seek.value = [state.position];
		this.keepValueText();
		const segments = bufferedSegments(state.bufferedRanges, state.duration);
		const key = JSON.stringify(segments);
		const layer = this.seek.querySelector('[data-buffered]');
		if (layer && key !== this.bufferedKey) {
			this.bufferedKey = key;
			layer.replaceChildren(
				...segments.map(({ start, size }) => {
					const segment = document.createElement('i');
					segment.style.setProperty('--start', String(start));
					segment.style.setProperty('--size', String(size));
					return segment;
				}),
			);
		}
	}

	private keepValueText(): void {
		const thumb = this.thumb;
		const valueText = seekValueText(this.media.position, this.media.duration);
		if (thumb && valueText !== '' && thumb.getAttribute('aria-valuetext') !== valueText) {
			thumb.setAttribute('aria-valuetext', valueText);
		}
	}

	/**
	 * Shows the controls and, while the video plays, hides them again after `HIDE_CONTROLS_MS` of quiet. They stay
	 * while the pointer is over them or a control has keyboard focus, so a reader who is aiming at one never loses it.
	 */
	private wake(): void {
		clearTimeout(this.hideTimer);
		this.hideControls(false);
		if (this.media.stage !== 'playing') return;
		this.hideTimer = setTimeout(() => {
			if (this.controls.matches(':hover') || this.controls.querySelector(':focus-visible')) return this.wake();
			this.hideControls(true);
		}, HIDE_CONTROLS_MS);
	}

	/**
	 * Writes `controlsHidden` on the store so the `data-controls-hidden` binding patches in the same turn.
	 *
	 * @remarks
	 * A render is deferred, and a touch tap or a pointer move must show the result immediately. The path write
	 * notifies the binding without waiting for a render.
	 */
	private hideControls(hidden: boolean): void {
		this.media.controlsHidden = hidden;
	}

	private toggleCaptions(): void {
		this.captions.toggle();
		this.media.status = this.media.captionsOn ? 'Captions on' : 'Captions off';
	}

	/**
	 * Both calls reject when the browser refuses (no user gesture, a sandboxed frame), and the player has nothing to
	 * show for it: the button only follows `fullscreenchange`.
	 */
	private toggleFullscreen(): void {
		const request =
			document.fullscreenElement === this.stageNode
				? document.exitFullscreen()
				: this.stageNode.requestFullscreen();
		request.catch(() => undefined);
	}

	private run(shortcut: Shortcut): void {
		const state = this.playback.getState();
		switch (shortcut.type) {
			case 'toggle':
				return void this.playback.toggle();
			case 'skip':
				return this.playback.skip(shortcut.seconds);
			case 'volume': {
				const next = Math.round((state.volume + shortcut.delta) * 100) / 100;
				if (shortcut.delta > 0 && state.muted) this.playback.setMuted(false);
				this.playback.setVolume(next);
				this.media.status = `Volume ${Math.round(this.playback.getState().volume * 100)}%`;
				return;
			}
			case 'mute':
				return this.playback.toggleMuted();
			case 'captions':
				return this.toggleCaptions();
			case 'fullscreen':
				return this.toggleFullscreen();
			case 'jump':
				return this.playback.seek(state.duration * shortcut.fraction);
			case 'start':
				return this.playback.seek(0);
			case 'end':
				return this.playback.seek(state.duration);
		}
	}

	/**
	 * A touch on the video is a tap that shows or hides the controls, which the click handler decides, so it is not
	 * activity here.
	 */
	private onActivity(event: PointerEvent): void {
		if (event.target !== this.video || event.pointerType !== 'touch') this.wake();
	}

	private onVideoClick(): void {
		if (this.pointer === 'touch' && this.media.stage === 'playing') {
			if (this.media.controlsHidden) this.wake();
			else this.hideControls(true);
		} else void this.playback.toggle();
	}

	private cycleRate(): void {
		this.playback.setRate(Number(cycleValue(RATES, String(this.playback.getState().rate))));
		this.media.status = `Speed ${this.playback.getState().rate}x`;
	}

	/** The slider works in seconds and reports `rui-change` only for the reader, never for the position written to it. */
	private onSeek(event: Event): void {
		this.playback.scrub((event as CustomEvent<RuiSliderChangeDetail>).detail.value[0]);
	}

	private onVolume(event: Event): void {
		const level = (event as CustomEvent<RuiSliderChangeDetail>).detail.value[0];
		this.playback.setVolume(level);
		if (level > 0) this.playback.setMuted(false);
	}

	override render() {
		const media = this.$.media;
		return (
			<>
				<div
					data-stage
					data-state={media.stage}
					data-controls-hidden={media.controlsHidden.map((hidden) => (hidden ? '' : undefined))}
					role="group"
					aria-label="Video player"
					aria-describedby="video-player-store-app-help"
					tabindex="0"
					on:keydown={() => this.wake()}
					on:pointermove={(event: PointerEvent) => this.onActivity(event)}
					on:pointerdown={(event: PointerEvent) => this.onActivity(event)}
					on:pointerleave={(event: PointerEvent) => this.onActivity(event)}
				>
					<video
						data-video
						data-src={VIDEO.src}
						poster={VIDEO.poster}
						preload="metadata"
						playsinline
						on:pointerdown={(event: PointerEvent) => (this.pointer = event.pointerType)}
						on:click={() => this.onVideoClick()}
						on:dblclick={() => this.toggleFullscreen()}
					></video>
					<RuiButton
						size="lg"
						square
						data-big-play
						aria-hidden="true"
						tabindex="-1"
						on:click={() => void this.playback.toggle()}
					>
						<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
							<path d="M8 5v14l11-7z" fill="currentColor" />
						</svg>
					</RuiButton>
					<span data-spinner aria-hidden="true"></span>
					<div data-error hidden={media.stage.map((stage) => stage !== 'error')}>
						<p data-error-message>Could not load the video</p>
						<RuiButton size="sm" data-retry on:click={() => void this.playback.retry()}>
							Retry
						</RuiButton>
					</div>
					<div data-controls>
						<RuiButton
							variant="ghost"
							square
							data-playback
							aria-label="Play"
							pressed={pressedBinding(media.playing)}
							on:click={() => void this.playback.toggle()}
						>
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								aria-hidden="true"
								focusable="false"
								data-icon="play"
							>
								<path d="M8 5v14l11-7z" fill="currentColor" />
							</svg>
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								aria-hidden="true"
								focusable="false"
								data-icon="pause"
							>
								<path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
							</svg>
						</RuiButton>
						<div data-scrub>
							<span data-elapsed>{media.position.map(formatMediaTime)}</span>
							<RuiSlider
								data-seek
								label="Seek"
								min={0}
								max={this.seekMax}
								step={0.01}
								value={0}
								disabled={!this.seekable}
								on:rui-change={(event: Event) => this.onSeek(event)}
							/>
							<span data-duration>{media.duration.map(formatMediaTime)}</span>
						</div>
						<RuiButton
							variant="ghost"
							square
							data-mute
							aria-label="Mute"
							pressed={pressedBinding(media.muted)}
							on:click={() => this.playback.toggleMuted()}
						>
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								aria-hidden="true"
								focusable="false"
								data-icon="volume"
							>
								<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
								<path
									d="M16 9a4 4 0 0 1 0 6"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								aria-hidden="true"
								focusable="false"
								data-icon="muted"
							>
								<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
								<path
									d="M16.5 9.5l5 5M21.5 9.5l-5 5"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</RuiButton>
						<div data-volume>
							<RuiSlider
								data-volume-input
								label="Volume"
								min={0}
								max={1}
								step={0.05}
								value={1}
								on:rui-change={(event: Event) => this.onVolume(event)}
							/>
						</div>
						<RuiButton
							variant="ghost"
							data-rate
							aria-label={media.rate.map((rate) => `Speed ${rate}x`)}
							on:click={() => this.cycleRate()}
						>
							{media.rate.map((rate) => `${rate}x`)}
						</RuiButton>
						<RuiButton
							variant="ghost"
							square
							data-captions
							aria-label="Captions"
							pressed={pressedBinding(media.captionsOn)}
							on:click={() => this.toggleCaptions()}
						>
							<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
								<rect
									x="3"
									y="5"
									width="18"
									height="14"
									rx="2"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								/>
								<path
									d="M10.5 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</RuiButton>
						<RuiButton
							variant="ghost"
							square
							data-fullscreen
							aria-label="Fullscreen"
							hidden={media.fullscreenAvailable.map((available) => !available)}
							pressed={pressedBinding(media.fullscreen)}
							on:click={() => this.toggleFullscreen()}
						>
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								aria-hidden="true"
								focusable="false"
								data-icon="enter"
							>
								<path
									d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								aria-hidden="true"
								focusable="false"
								data-icon="exit"
							>
								<path
									d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</RuiButton>
					</div>
					<p data-status aria-live="polite">
						{media.status}
					</p>
				</div>
				<span data-help hidden id="video-player-store-app-help">
					{HELP}
				</span>
			</>
		);
	}
}
