import '@ecopages/radiant-ui/slider';
import '@ecopages/radiant-ui/toolbar';
import type { RuiSliderChangeDetail, RuiSliderElement } from '@ecopages/radiant-ui/slider';
import {
	AudioVisualizerController,
	MediaController,
	RovingController,
	SortableController,
	type MediaState,
} from '@ecopages/radiant-ui/controllers';
import { formatMediaTime, reorder } from '@ecopages/radiant-ui/helpers';
import { mountExample } from '../../../components/primitive-example/mount-example';
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
	type VisualizerName,
} from './audio-player.data';

export function mount(root: HTMLElement): () => void {
	const part = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
	const audio = part<HTMLAudioElement>('[data-audio]');
	const list = part('[data-tracks]');
	const seek = part<RuiSliderElement>('[data-seek]');
	const volume = part<RuiSliderElement>('[data-volume-input]');
	const toggle = part('[data-playback]');
	const loopButton = part('[data-loop]');
	const shuffleButton = part('[data-shuffle]');
	const status = part('[data-status]');
	const [title, artist, elapsed, total] = ['[data-title]', '[data-artist]', '[data-elapsed]', '[data-total]'].map(
		(selector) => part(selector),
	);
	const seekText = new ValueText();
	const volumeText = new ValueText();
	const listeners = new AbortController();
	const { signal } = listeners;

	let tracks = [...list.children] as HTMLElement[];
	let current = tracks[0];
	let wasPlaying = false;
	const order = new PlaybackOrder(tracks, current);
	const presets = createVisualizers();

	const media = new MediaController({
		getMedia: () => audio,
		resolveSource: blobUrlOf,
		releaseSource: (url) => URL.revokeObjectURL(url),
		clearSourceOnDestroy: true,
		onState: renderState,
		onProgress: renderProgress,
		onError: () => (status.textContent = `Could not load ${title.textContent}`),
	});

	const visualizer = new AudioVisualizerController({
		getMedia: () => audio,
		getTarget: () => part('[data-cover]'),
		preset: presets.bars,
	});

	const roving = new RovingController({
		getItems: () => tracks,
		getTarget: () => list,
		orientation: 'vertical',
		getEnabled: () => sortable.getState() === null,
	});

	const sortable = new SortableController({
		preview: true,
		liftKeys: [' '],
		createPlaceholder: () => document.createElement('li'),
		getContainer: () => list,
		getItems: () => tracks,
		announce: (message) => (status.textContent = message),
		onChange: ({ item, from, to }) => {
			tracks = reorder(tracks, from, to);
			order.setItems(tracks);
			list.append(...tracks);
			tracks.forEach((track, index) => (track.querySelector('[data-number]')!.textContent = String(index + 1)));
			roving.focus(item);
		},
	});

	/**
	 * The one place the media state reaches the page. A track that was playing and is now `ended` is the cue for the
	 * order to say what follows: seeking a paused track to its end reports `ended` too, and must not start another
	 * track.
	 */
	function renderState(state: MediaState): void {
		const playing = state.status === 'playing';
		const finished = state.status === 'ended' && wasPlaying;
		toggle.setAttribute('aria-pressed', String(playing));
		if (playing && !wasPlaying) status.textContent = `Playing ${title.textContent}`;
		wasPlaying = playing;
		seek.disabled = !state.seekable || state.status === 'error';
		if (Number.isFinite(state.duration)) {
			seek.max = state.duration;
			total.textContent = formatMediaTime(state.duration);
		}
		renderSeekText();
		if (finished) {
			const following = order.ended();
			if (following === undefined) status.textContent = 'End of the playlist';
			else if (following === current) restart(true);
			else load(following, true);
		}
	}

	/** The controller reports the pending scrub target as the position, so the thumb and the clock never jump back. */
	function renderProgress(state: MediaState): void {
		seek.value = [state.position];
		elapsed.textContent = formatMediaTime(state.position);
		renderSeekText();
	}

	function renderSeekText(): void {
		seekText.set(seekValueText(elapsed.textContent!, total.textContent!));
	}

	function load(track: HTMLElement, autoplay: boolean): void {
		current = track;
		title.textContent = track.querySelector('[data-name]')!.textContent;
		artist.textContent = track.dataset.artist!;
		elapsed.textContent = '0:00';
		total.textContent = track.querySelector('[data-length]')!.textContent;
		seek.value = [0];
		tracks.forEach((candidate) => candidate.setAttribute('aria-current', String(candidate === track)));
		void media.load(track.dataset.src!, { autoplay });
	}

	/** Plays the current track again from its start, or leaves it paused there. */
	function restart(play: boolean): void {
		media.seek(0);
		if (play) void media.play();
	}

	/**
	 * A track that is still loading counts as playing, so Next pressed twice while the first one loads keeps the
	 * playlist going.
	 */
	const keepsPlaying = () => ['playing', 'loading'].includes(media.getState().status);

	function choose(track: HTMLElement): void {
		visualizer.resume();
		if (track !== current || media.getState().status === 'error') {
			order.select(track);
			load(track, true);
		} else void media.toggle();
	}

	function previous(): void {
		const step = order.previous(media.getState().position);
		if (step.restart) restart(false);
		else load(step.track, keepsPlaying());
	}

	function cycleLoop(): void {
		order.loop = nextLoopMode(order.loop);
		loopButton.dataset.mode = order.loop;
		loopButton.setAttribute('aria-label', loopLabel(order.loop));
		status.textContent = loopLabel(order.loop);
	}

	function toggleShuffle(): void {
		order.setShuffle(!order.shuffle);
		shuffleButton.setAttribute('aria-pressed', String(order.shuffle));
		status.textContent = shuffleAnnouncement(order.shuffle);
	}

	seek.addEventListener(
		'rui-change',
		(event) => media.scrub((event as CustomEvent<RuiSliderChangeDetail>).detail.value[0]),
		{ signal },
	);
	seek.addEventListener(
		'keydown',
		(event) => {
			const distance = SEEK_KEYS[event.key];
			if (distance === undefined) return;
			event.preventDefault();
			event.stopPropagation();
			media.skip(distance);
		},
		{ signal, capture: true },
	);
	volume.addEventListener(
		'rui-change',
		(event) => {
			const level = (event as CustomEvent<RuiSliderChangeDetail>).detail.value[0];
			media.setVolume(level);
			volumeText.set(volumeValueText(level));
		},
		{ signal },
	);

	/**
	 * The toolbar stops a click on a toggle in its own capture handler, so this listens higher up. A click on the
	 * pressed button is stopped here, which keeps one of the two pressed.
	 */
	root.addEventListener(
		'click',
		(event) => {
			const button = (event.target as Element).closest<HTMLElement>('[data-visualizer]');
			if (!button) return;
			if (button.getAttribute('aria-pressed') === 'true') event.stopPropagation();
			else visualizer.setPreset(presets[button.dataset.visualizer as VisualizerName]);
		},
		{ signal, capture: true },
	);
	toggle.addEventListener('click', () => choose(current), { signal });
	part('[data-previous]').addEventListener('click', previous, { signal });
	part('[data-next]').addEventListener('click', () => load(order.next(), keepsPlaying()), { signal });
	loopButton.addEventListener('click', cycleLoop, { signal });
	shuffleButton.addEventListener('click', toggleShuffle, { signal });
	list.addEventListener(
		'click',
		(event) => {
			const row = (event.target as Element).closest<HTMLElement>('[data-track]');
			if (row) choose(row);
		},
		{ signal },
	);
	list.addEventListener(
		'keydown',
		(event) => {
			if (event.key === 'Enter') choose((event.target as Element).closest<HTMLElement>('[data-track]')!);
		},
		{ signal },
	);

	seekText.watch(seek.querySelector<HTMLElement>('[role="slider"]')!);
	volumeText.watch(volume.querySelector<HTMLElement>('[role="slider"]')!);
	volumeText.set(volumeValueText(VOLUME));
	media.attach();
	visualizer.attach();
	media.setVolume(VOLUME);
	status.textContent = PLAYLIST_HINT;
	load(current, false);
	sortable.attach();
	roving.attach();
	roving.sync();
	return () => {
		listeners.abort();
		seekText.stop();
		volumeText.stop();
		media.destroy();
		visualizer.destroy();
		sortable.destroy();
		roving.destroy();
		loopButton.dataset.mode = 'off';
		loopButton.setAttribute('aria-label', loopLabel('off'));
		shuffleButton.setAttribute('aria-pressed', 'false');
		status.textContent = PLAYLIST_HINT;
	};
}

mountExample('audio-player', mount);
