import { RadiantElement, bindTo, customElement, onEvent, query, state } from '@ecopages/radiant';
import {
	createCaptionsController,
	createHotkeyController,
	createMediaController,
	type MediaState,
} from '@ecopages/radiant-ui/controllers';
import '@ecopages/radiant-ui/slider';
import type { RuiSliderChangeDetail, RuiSliderElement } from '@ecopages/radiant-ui/slider';
import { cycleValue, formatMediaTime } from '@ecopages/radiant-ui/helpers';
import {
	Announcer,
	CAPTIONS,
	HIDE_CONTROLS_MS,
	RATES,
	SEEK_KEYS,
	SHORTCUTS,
	bufferedSegments,
	isOwnedByControl,
	seekValueText,
	stageState,
	type Shortcut,
	type StageState,
} from './video-player.data';
import { fetchSource, releaseSource } from './video-player.loader';

/**
 * @remarks
 * What the page shows that is a plain copy of the media state (the stage state, whether the controls are hidden, the
 * pressed buttons, the clock, the status, the speed, the error panel) is a `@state` field that `@bindTo` writes onto
 * the markup; the buffered bar and the slider values are written here because they are not a copy
 * of one value.
 *
 * `createMediaController(this, ...)` takes the element as its host and attaches and destroys with it, so the element
 * listens to no media event. The timer and the thumb observer are stopped by a callback
 * registered once in the constructor, because one registered in `onConnected()` would be added again on every
 * reconnect, and `onConnected()` starts the load again when the element is moved. Each pointer listener is
 * delegated on the host, and `pointerleave`, which does not bubble, is delegated in the capture phase.
 */
@customElement('video-player-element')
export class VideoPlayerElement extends RadiantElement {
	@query('[data-stage]') private stage!: HTMLElement;
	@query('[data-video]') private video!: HTMLVideoElement;
	@query('[data-controls]') private controls!: HTMLElement;
	@query('[data-seek]') private seek!: RuiSliderElement;
	@query('[data-seek] [role="slider"]') private seekThumb!: HTMLElement;
	@query('[data-volume-input]') private volume!: RuiSliderElement;
	@query('[data-buffered]') private buffered!: HTMLElement;
	@query('[data-fullscreen]') private fullscreen!: HTMLButtonElement;

	@state
	@bindTo({ selector: '[data-stage]', attr: 'data-state' })
	stageState: StageState = 'idle';

	@state
	@bindTo({ selector: '[data-stage]', bool: 'data-controls-hidden' })
	controlsHidden = false;

	@state
	@bindTo({ selector: '[data-playback]', attr: 'aria-pressed', map: (value) => String(value) })
	playing = false;

	@state
	@bindTo({ selector: '[data-mute]', attr: 'aria-pressed', map: (value) => String(value) })
	muted = false;

	@state
	@bindTo({ selector: '[data-captions]', attr: 'aria-pressed', map: (value) => String(value) })
	captionsOn = false;

	@state
	@bindTo({ selector: '[data-fullscreen]', attr: 'aria-pressed', map: (value) => String(value) })
	fullscreenOn = false;

	@state
	@bindTo([
		{ selector: '[data-rate]', text: true, map: (rate) => `${rate}x` },
		{ selector: '[data-rate]', attr: 'aria-label', map: (rate) => `Speed ${rate}x` },
	])
	rate = 1;

	@state
	@bindTo({ selector: '[data-elapsed]', text: true })
	elapsed = '0:00';

	@state
	@bindTo({ selector: '[data-duration]', text: true })
	total = '0:00';

	@state
	@bindTo({ selector: '[data-status]', text: true })
	status = '';

	@state
	@bindTo({ selector: '[data-seek]', bool: 'disabled', invert: true })
	seekable = false;

	@state
	@bindTo({ selector: '[data-error]', bool: 'hidden', invert: true })
	failed = false;

	private hideTimer: ReturnType<typeof setTimeout> | undefined;
	private pointer = 'mouse';
	private bufferedKey = '';
	private valueText = '';
	private readonly announcer = new Announcer();
	private readonly valueTextObserver = new MutationObserver(() => this.keepValueText());

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

	constructor() {
		super();
		createHotkeyController(this, {
			getTarget: () => this.stage,
			hotkeys: Array.from(SHORTCUTS, ([keys, shortcut]) => ({
				keys,
				handler: (event: KeyboardEvent) => (isOwnedByControl(event) ? false : this.run(shortcut)),
			})),
		});
		createHotkeyController(this, {
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
		this.registerCleanupCallback(() => {
			clearTimeout(this.hideTimer);
			this.valueTextObserver.disconnect();
		});
	}

	override onConnected(): void {
		this.valueTextObserver.observe(this.seekThumb, { attributes: true, attributeFilter: ['aria-valuetext'] });
		this.fullscreen.hidden = !document.fullscreenEnabled;
		this.captions.disable();
		this.announcer.reset();
		void this.media.load(this.video.dataset.src!);
	}

	/**
	 * Writes the clock, the seek thumb and the buffered bar.
	 *
	 * @remarks
	 * The slider repaints in a later update with its own `aria-valuetext`, a bare number of seconds, so the text is
	 * kept by the observer as well as written here.
	 */
	private renderProgress(state: MediaState): void {
		if (Number.isFinite(state.duration) && this.seek.max !== state.duration) this.seek.max = state.duration;
		this.seek.value = [state.position];
		this.valueText = seekValueText(state.position, state.duration);
		this.keepValueText();
		this.elapsed = formatMediaTime(state.position);
		this.total = formatMediaTime(state.duration);
		const segments = bufferedSegments(state.bufferedRanges, state.duration);
		const key = JSON.stringify(segments);
		if (key !== this.bufferedKey) {
			this.bufferedKey = key;
			this.buffered.replaceChildren(
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
		if (this.seekThumb.getAttribute('aria-valuetext') !== this.valueText) {
			this.seekThumb.setAttribute('aria-valuetext', this.valueText);
		}
	}

	private renderState(state: MediaState): void {
		const shown = stageState(state);
		const message = this.announcer.next(state);
		this.stageState = shown;
		this.playing = state.status === 'playing';
		this.muted = state.muted;
		this.volume.value = [state.muted ? 0 : state.volume];
		this.rate = state.rate;
		this.seekable = state.seekable;
		this.failed = shown === 'error';
		if (message !== '') this.status = message;
		this.renderProgress(state);
		this.wake();
	}

	/**
	 * Shows the controls and, while the video plays, hides them again after `HIDE_CONTROLS_MS` of quiet. They stay
	 * while the pointer is over them or a control has keyboard focus, so a reader who is aiming at one never loses it.
	 */
	private wake(): void {
		clearTimeout(this.hideTimer);
		this.controlsHidden = false;
		if (this.stageState !== 'playing') return;
		this.hideTimer = setTimeout(() => {
			if (this.controls.matches(':hover') || this.controls.querySelector(':focus-visible')) return this.wake();
			this.controlsHidden = true;
		}, HIDE_CONTROLS_MS);
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
			document.fullscreenElement === this.stage ? document.exitFullscreen() : this.stage.requestFullscreen();
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

	/** Every key on the stage shows the controls, a shortcut or not, so this listener is separate from the hotkeys. */
	@onEvent({ selector: '[data-stage]', type: 'keydown' })
	wakeOnKey(): void {
		this.wake();
	}

	/**
	 * A touch on the video is a tap that shows or hides the controls, which `tapVideo` decides, so it is not
	 * activity here.
	 */
	@onEvent({ selector: '[data-stage]', type: 'pointermove' })
	@onEvent({ selector: '[data-stage]', type: 'pointerdown' })
	@onEvent({ selector: '[data-stage]', type: 'pointerleave', options: { capture: true } })
	activity(event: Event): void {
		const { target, pointerType } = event as PointerEvent;
		if (target !== this.video || pointerType !== 'touch') this.wake();
	}

	@onEvent({ selector: '[data-video]', type: 'pointerdown' })
	rememberPointer(event: Event): void {
		this.pointer = (event as PointerEvent).pointerType;
	}

	@onEvent({ selector: '[data-video]', type: 'click' })
	tapVideo(): void {
		if (this.pointer === 'touch' && this.stageState === 'playing') {
			if (this.controlsHidden) this.wake();
			else this.controlsHidden = true;
		} else void this.media.toggle();
	}

	@onEvent({ selector: '[data-video]', type: 'dblclick' })
	@onEvent({ selector: '[data-fullscreen]', type: 'click' })
	enterFullscreen(): void {
		this.toggleFullscreen();
	}

	@onEvent({ selector: '[data-big-play]', type: 'click' })
	@onEvent({ selector: '[data-playback]', type: 'click' })
	togglePlayback(): void {
		void this.media.toggle();
	}

	@onEvent({ selector: '[data-mute]', type: 'click' })
	toggleMute(): void {
		this.media.toggleMuted();
	}

	@onEvent({ selector: '[data-rate]', type: 'click' })
	cycleRate(): void {
		this.media.setRate(Number(cycleValue(RATES, String(this.media.getState().rate))));
		this.status = `Speed ${this.media.getState().rate}x`;
	}

	@onEvent({ selector: '[data-captions]', type: 'click' })
	pressCaptions(): void {
		this.toggleCaptions();
	}

	@onEvent({ selector: '[data-retry]', type: 'click' })
	retry(): void {
		void this.media.retry();
	}

	@onEvent({ document: true, type: 'fullscreenchange' })
	followFullscreen(): void {
		this.fullscreenOn = document.fullscreenElement === this.stage;
	}

	/** The slider works in seconds and reports `rui-change` only for the reader, never for a position written to it. */
	@onEvent({ selector: '[data-seek]', type: 'rui-change' })
	scrub(event: Event): void {
		this.media.scrub((event as CustomEvent<RuiSliderChangeDetail>).detail.value[0]);
	}

	@onEvent({ selector: '[data-volume-input]', type: 'rui-change' })
	setVolume(event: Event): void {
		const level = (event as CustomEvent<RuiSliderChangeDetail>).detail.value[0];
		this.media.setVolume(level);
		if (level > 0) this.media.setMuted(false);
	}
}
