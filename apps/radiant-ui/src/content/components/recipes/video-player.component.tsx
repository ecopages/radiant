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
} from './video-player.data';
import { fetchSource, releaseSource } from './video-player.loader';

const HELP =
	'Space or K plays and pauses, J and L skip 10 seconds, the arrows seek 5 seconds or change the volume, M mutes, C toggles captions, F toggles fullscreen, 0 to 9 jump through the video, Home and End go to its start and end';

/**
 * @remarks
 * What changes the markup is `@state`: the stage state, the pressed buttons, the speed and whether the seek bar is
 * enabled. Whether the controls are hidden and whether it is full screen are fields that are also written to the DOM
 * at once, because a touch tap or a `fullscreenchange` must show in the same turn. What changes every frame never
 * goes through `render()`: the clock and the status are bound with `this.$`, and the seek position, the volume, the thumb's `aria-valuetext` and the
 * buffered bar are written to the DOM by hand, from `onProgress`.
 *
 * Playback is a `MediaController` created with the element as its host, so the `video` element has no media
 * listener. The buffered layer is the one node `RuiSlider` has no region for: it is added to the seek track after
 * each render that lacks it.
 */
@customElement('video-player-app')
export class VideoPlayerApp extends RadiantElement<{ status: string; elapsed: string; total: string }> {
	@state stage: StageState = 'idle';
	@state playing = false;
	@state muted = false;
	@state ready = false;
	@state captionsOn = false;
	@state fullscreenAvailable = false;
	@state rate = 1;
	@state status = '';
	@state elapsed = '0:00';
	@state total = '0:00';

	@query({ selector: '[data-stage]' }) private stageNode!: HTMLElement;
	@query({ selector: '[data-video]' }) private video!: HTMLVideoElement;
	@query({ selector: '[data-controls]' }) private controls!: HTMLElement;
	@query({ selector: '[data-seek]' }) private seek!: RuiSliderElement;
	@query({ selector: '[data-fullscreen]' }) private fullscreenButton!: HTMLElement;
	@query({ selector: '[data-volume-input]' }) private volume!: RuiSliderElement;

	private controlsHidden = false;
	private fullscreen = false;
	private hideTimer: ReturnType<typeof setTimeout> | undefined;
	private pointer = 'mouse';
	private position = 0;
	private seekMax = 1;
	private level = 1;
	private bufferedKey = '';
	private valueText = '';
	private readonly announcer = new Announcer();
	private thumb: HTMLElement | null = null;
	private readonly thumbObserver = new MutationObserver(() => this.keepValueText());

	private readonly captions = createCaptionsController(this, {
		getMedia: () => this.video,
		getAvoid: () => this.controls,
		tracks: [{ language: 'en', label: 'English', cues: CAPTIONS }],
		onState: (state) => {
			this.captionsOn = state.enabled;
		},
	});

	private readonly media = createMediaController(this, {
		getMedia: () => this.video,
		resolveSource: fetchSource,
		releaseSource,
		clearSourceOnDestroy: true,
		onState: (state) => this.renderState(state),
		onProgress: (state) => this.renderProgress(state),
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
				this.media.skip(seconds);
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
		this.fullscreenAvailable = document.fullscreenEnabled;
		this.announcer.reset();
		this.media.attach();
		this.stageKeys.attach();
		this.seekKeys.attach();
		void this.media.load(this.video.dataset.src!);
	}

	/**
	 * @remarks
	 * A document-level `@onEvent` is removed with the element. The button's `aria-pressed` is written here at once,
	 * and `render()` reads the same field, so a render caused by another change does not undo it.
	 */
	@onEvent({ document: true, type: 'fullscreenchange' })
	followFullscreen(): void {
		this.fullscreen = document.fullscreenElement === this.stageNode;
		this.fullscreenButton.setAttribute('aria-pressed', String(this.fullscreen));
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

	private renderState(state: MediaState): void {
		const shown = stageState(state);
		const message = this.announcer.next(state);
		this.stage = shown;
		this.playing = state.status === 'playing';
		this.muted = state.muted;
		this.rate = state.rate;
		this.ready = state.seekable;
		this.level = state.muted ? 0 : state.volume;
		this.volume.value = [this.level];
		if (message !== '') this.status = message;
		this.renderProgress(state);
		this.wake();
	}

	/** The controller reports the pending scrub target as the position, so the thumb and the clock never jump back. */
	private renderProgress(state: MediaState): void {
		if (Number.isFinite(state.duration) && this.seekMax !== state.duration) {
			this.seekMax = state.duration;
			this.seek.max = state.duration;
		}
		this.position = state.position;
		this.seek.value = [state.position];
		this.valueText = seekValueText(state.position, state.duration);
		this.keepValueText();
		this.elapsed = formatMediaTime(state.position);
		this.total = formatMediaTime(state.duration);
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
		if (thumb && this.valueText !== '' && thumb.getAttribute('aria-valuetext') !== this.valueText) {
			thumb.setAttribute('aria-valuetext', this.valueText);
		}
	}

	/**
	 * Shows the controls and, while the video plays, hides them again after `HIDE_CONTROLS_MS` of quiet. They stay
	 * while the pointer is over them or a control has keyboard focus, so a reader who is aiming at one never loses it.
	 */
	private wake(): void {
		clearTimeout(this.hideTimer);
		this.hideControls(false);
		if (this.stage !== 'playing') return;
		this.hideTimer = setTimeout(() => {
			if (this.controls.matches(':hover') || this.controls.querySelector(':focus-visible')) return this.wake();
			this.hideControls(true);
		}, HIDE_CONTROLS_MS);
	}

	/**
	 * Writes `data-controls-hidden` at once and keeps it in a field that `render()` reads, instead of `@state`.
	 *
	 * @remarks
	 * A render is deferred, and a touch tap or a pointer move must show the result in the same turn. The field keeps
	 * a render caused by another change from undoing it.
	 */
	private hideControls(hidden: boolean): void {
		this.controlsHidden = hidden;
		this.stageNode.toggleAttribute('data-controls-hidden', hidden);
	}

	private toggleCaptions(): void {
		this.captions.toggle();
		this.status = this.captionsOn ? 'Captions on' : 'Captions off';
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
		const state = this.media.getState();
		switch (shortcut.type) {
			case 'toggle':
				return void this.media.toggle();
			case 'skip':
				return this.media.skip(shortcut.seconds);
			case 'volume': {
				const next = Math.round((state.volume + shortcut.delta) * 100) / 100;
				if (shortcut.delta > 0 && state.muted) this.media.setMuted(false);
				this.media.setVolume(next);
				this.status = `Volume ${Math.round(this.media.getState().volume * 100)}%`;
				return;
			}
			case 'mute':
				return this.media.toggleMuted();
			case 'captions':
				return this.toggleCaptions();
			case 'fullscreen':
				return this.toggleFullscreen();
			case 'jump':
				return this.media.seek(state.duration * shortcut.fraction);
			case 'start':
				return this.media.seek(0);
			case 'end':
				return this.media.seek(state.duration);
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
		if (this.pointer === 'touch' && this.stage === 'playing') {
			if (this.controlsHidden) this.wake();
			else this.hideControls(true);
		} else void this.media.toggle();
	}

	private cycleRate(): void {
		this.media.setRate(Number(cycleValue(RATES, String(this.media.getState().rate))));
		this.status = `Speed ${this.media.getState().rate}x`;
	}

	/** The slider works in seconds and reports `rui-change` only for the reader, never for the position written to it. */
	private onSeek(event: Event): void {
		this.media.scrub((event as CustomEvent<RuiSliderChangeDetail>).detail.value[0]);
	}

	private onVolume(event: Event): void {
		const level = (event as CustomEvent<RuiSliderChangeDetail>).detail.value[0];
		this.media.setVolume(level);
		if (level > 0) this.media.setMuted(false);
	}

	override render() {
		return (
			<>
				<div
					data-stage
					data-state={this.stage}
					data-controls-hidden={this.controlsHidden ? '' : undefined}
					role="group"
					aria-label="Video player"
					aria-describedby="video-player-app-help"
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
						on:click={() => void this.media.toggle()}
					>
						<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
							<path d="M8 5v14l11-7z" fill="currentColor" />
						</svg>
					</RuiButton>
					<span data-spinner aria-hidden="true"></span>
					<div data-error hidden={this.stage !== 'error'}>
						<p data-error-message>Could not load the video</p>
						<RuiButton size="sm" data-retry on:click={() => void this.media.retry()}>
							Retry
						</RuiButton>
					</div>
					<div data-controls>
						<RuiButton
							variant="ghost"
							square
							data-playback
							aria-label="Play"
							pressed={this.playing}
							on:click={() => void this.media.toggle()}
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
							<span data-elapsed>{this.$.elapsed}</span>
							<RuiSlider
								data-seek
								label="Seek"
								min={0}
								max={this.seekMax}
								step={0.01}
								value={this.position}
								disabled={!this.ready}
								on:rui-change={(event: Event) => this.onSeek(event)}
							/>
							<span data-duration>{this.$.total}</span>
						</div>
						<RuiButton
							variant="ghost"
							square
							data-mute
							aria-label="Mute"
							pressed={this.muted}
							on:click={() => this.media.toggleMuted()}
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
								value={this.level}
								on:rui-change={(event: Event) => this.onVolume(event)}
							/>
						</div>
						<RuiButton
							variant="ghost"
							data-rate
							aria-label={`Speed ${this.rate}x`}
							on:click={() => this.cycleRate()}
						>
							{`${this.rate}x`}
						</RuiButton>
						<RuiButton
							variant="ghost"
							square
							data-captions
							aria-label="Captions"
							pressed={this.captionsOn}
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
							hidden={!this.fullscreenAvailable}
							pressed={this.fullscreen}
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
						{this.$.status}
					</p>
				</div>
				<span data-help hidden id="video-player-app-help">
					{HELP}
				</span>
			</>
		);
	}
}
