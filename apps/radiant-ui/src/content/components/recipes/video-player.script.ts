import '@ecopages/radiant-ui/slider';
import type { RuiSliderChangeDetail, RuiSliderElement } from '@ecopages/radiant-ui/slider';
import { MediaController, type MediaState } from '@ecopages/radiant-ui/controllers';
import { cycleValue, formatMediaTime } from '@ecopages/radiant-ui/helpers';
import { mountExample } from '../../../components/primitive-example/mount-example';
import {
	Announcer,
	Captions,
	HIDE_CONTROLS_MS,
	RATES,
	bufferedSegments,
	seekFromKey,
	seekValueText,
	shortcutFor,
	stageState,
	type Shortcut,
} from './video-player.data';
import { fetchSource, releaseSource } from './video-player.loader';

export function mount(root: HTMLElement): () => void {
	const part = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
	const stage = part('[data-stage]');
	const video = part<HTMLVideoElement>('[data-video]');
	const controls = part('[data-controls]');
	const seek = part<RuiSliderElement>('[data-seek]');
	const seekThumb = seek.querySelector<HTMLElement>('[role="slider"]')!;
	const volume = part<RuiSliderElement>('[data-volume-input]');
	const playback = part('[data-playback]');
	const mute = part('[data-mute]');
	const rate = part('[data-rate]');
	const captions = part('[data-captions]');
	const fullscreen = part('[data-fullscreen]');
	const buffered = part('[data-buffered]');
	const status = part('[data-status]');
	const error = part('[data-error]');
	const listeners = new AbortController();
	const { signal } = listeners;
	const track = video.textTracks[0];

	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let pointer = 'mouse';
	let bufferedKey = '';
	let valueText = '';
	const announcer = new Announcer();
	const captionCues = new Captions();

	const media = new MediaController({
		getMedia: () => video,
		resolveSource: fetchSource,
		releaseSource,
		clearSourceOnDestroy: true,
		onState: render,
		onProgress: renderProgress,
	});

	/**
	 * Writes the clock, the seek thumb and the buffered bar.
	 *
	 * @remarks
	 * The slider repaints in a later update with its own `aria-valuetext`, a bare number of seconds, so the text is
	 * kept by the observer below and not only written here.
	 */
	function renderProgress(state: MediaState): void {
		const known = Number.isFinite(state.duration);
		if (known && seek.max !== state.duration) seek.max = state.duration;
		seek.value = [state.position];
		valueText = seekValueText(state.position, state.duration);
		keepValueText();
		part('[data-elapsed]').textContent = formatMediaTime(state.position);
		part('[data-duration]').textContent = formatMediaTime(state.duration);
		const segments = bufferedSegments(state.bufferedRanges, state.duration);
		const key = JSON.stringify(segments);
		if (key !== bufferedKey) {
			bufferedKey = key;
			buffered.replaceChildren(
				...segments.map(({ start, size }) => {
					const segment = document.createElement('i');
					segment.style.setProperty('--start', String(start));
					segment.style.setProperty('--size', String(size));
					return segment;
				}),
			);
		}
	}

	function keepValueText(): void {
		if (seekThumb.getAttribute('aria-valuetext') !== valueText) seekThumb.setAttribute('aria-valuetext', valueText);
	}

	function render(state: MediaState): void {
		const shown = stageState(state);
		const message = announcer.next(state);
		stage.dataset.state = shown;
		playback.setAttribute('aria-pressed', String(state.status === 'playing'));
		mute.setAttribute('aria-pressed', String(state.muted));
		volume.value = [state.muted ? 0 : state.volume];
		rate.textContent = `${state.rate}x`;
		rate.setAttribute('aria-label', `Speed ${state.rate}x`);
		seek.disabled = !state.seekable;
		if (state.seekable) captionCues.add(track);
		error.hidden = shown !== 'error';
		if (message !== '') say(message);
		renderProgress(state);
		wake();
	}

	/**
	 * Shows the controls and, while the video plays, hides them again after `HIDE_CONTROLS_MS` of quiet. They stay
	 * while the pointer is over them or a control has keyboard focus, so a reader who is aiming at one never loses it.
	 */
	function wake(): void {
		clearTimeout(hideTimer);
		stage.removeAttribute('data-controls-hidden');
		if (stage.dataset.state !== 'playing') return;
		hideTimer = setTimeout(() => {
			if (controls.matches(':hover') || controls.querySelector(':focus-visible')) return wake();
			stage.setAttribute('data-controls-hidden', '');
		}, HIDE_CONTROLS_MS);
	}

	function say(message: string): void {
		status.textContent = message;
	}

	function toggleCaptions(): void {
		track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
		captions.setAttribute('aria-pressed', String(track.mode === 'showing'));
		say(track.mode === 'showing' ? 'Captions on' : 'Captions off');
	}

	/**
	 * Both calls reject when the browser refuses (no user gesture, a sandboxed frame), and the player has nothing to
	 * show for it: the button only follows `fullscreenchange`.
	 */
	function toggleFullscreen(): void {
		const request = document.fullscreenElement === stage ? document.exitFullscreen() : stage.requestFullscreen();
		request.catch(() => undefined);
	}

	function run(shortcut: Shortcut): void {
		const state = media.getState();
		switch (shortcut.type) {
			case 'toggle':
				return void media.toggle();
			case 'skip':
				return media.skip(shortcut.seconds);
			case 'volume': {
				const next = Math.round((state.volume + shortcut.delta) * 100) / 100;
				if (shortcut.delta > 0 && state.muted) media.setMuted(false);
				media.setVolume(next);
				return say(`Volume ${Math.round(media.getState().volume * 100)}%`);
			}
			case 'mute':
				return media.toggleMuted();
			case 'captions':
				return toggleCaptions();
			case 'fullscreen':
				return toggleFullscreen();
			case 'jump':
				return media.seek(state.duration * shortcut.fraction);
			case 'start':
				return media.seek(0);
			case 'end':
				return media.seek(state.duration);
		}
	}

	stage.addEventListener(
		'keydown',
		(event) => {
			wake();
			const shortcut = shortcutFor(event);
			if (!shortcut) return;
			event.preventDefault();
			run(shortcut);
		},
		{ signal },
	);
	/**
	 * A touch on the video is a tap that shows or hides the controls, which the click handler below decides, so it is
	 * not activity here.
	 */
	const activity = (event: PointerEvent) => {
		if (event.target !== video || event.pointerType !== 'touch') wake();
	};
	for (const type of ['pointermove', 'pointerdown', 'pointerleave'] as const) {
		stage.addEventListener(type, activity, { signal });
	}

	video.addEventListener('pointerdown', (event) => (pointer = event.pointerType), { signal });
	video.addEventListener(
		'click',
		() => {
			if (pointer === 'touch' && stage.dataset.state === 'playing') {
				if (stage.hasAttribute('data-controls-hidden')) wake();
				else stage.setAttribute('data-controls-hidden', '');
			} else void media.toggle();
		},
		{ signal },
	);
	video.addEventListener('dblclick', toggleFullscreen, { signal });
	part('[data-big-play]').addEventListener('click', () => void media.toggle(), { signal });
	playback.addEventListener('click', () => void media.toggle(), { signal });
	mute.addEventListener('click', () => media.toggleMuted(), { signal });
	rate.addEventListener(
		'click',
		() => {
			media.setRate(Number(cycleValue(RATES, String(media.getState().rate))));
			say(`Speed ${media.getState().rate}x`);
		},
		{ signal },
	);
	captions.addEventListener('click', toggleCaptions, { signal });
	fullscreen.addEventListener('click', toggleFullscreen, { signal });
	part('[data-retry]').addEventListener('click', () => void media.retry(), { signal });

	seek.addEventListener(
		'rui-change',
		(event) => media.scrub((event as CustomEvent<RuiSliderChangeDetail>).detail.value[0]),
		{ signal },
	);

	/**
	 * The capture phase runs before the slider's own key handler, which this stops for the keys the player moves by
	 * whole seconds, so the slider's 0.01 s step never applies to an arrow key.
	 */
	seek.addEventListener(
		'keydown',
		(event) => {
			const seconds = seekFromKey(event.key);
			if (seconds === undefined) return;
			event.preventDefault();
			event.stopPropagation();
			wake();
			media.skip(seconds);
		},
		{ signal, capture: true },
	);
	volume.addEventListener(
		'rui-change',
		(event) => {
			const level = (event as CustomEvent<RuiSliderChangeDetail>).detail.value[0];
			media.setVolume(level);
			if (level > 0) media.setMuted(false);
		},
		{ signal },
	);
	document.addEventListener(
		'fullscreenchange',
		() => fullscreen.setAttribute('aria-pressed', String(document.fullscreenElement === stage)),
		{ signal },
	);

	const valueTextObserver = new MutationObserver(keepValueText);
	valueTextObserver.observe(seekThumb, { attributes: true, attributeFilter: ['aria-valuetext'] });
	fullscreen.hidden = !document.fullscreenEnabled;
	track.mode = 'hidden';
	captions.setAttribute('aria-pressed', 'false');
	captionCues.start(stage, controls);
	media.attach();
	void media.load(video.dataset.src!);
	return () => {
		listeners.abort();
		clearTimeout(hideTimer);
		valueTextObserver.disconnect();
		captionCues.stop();
		media.destroy();
	};
}

mountExample('video-player', mount);
