import { formatMediaTime } from '@ecopages/radiant-ui/helpers';
import type {
	MediaRecorderControllerConfig,
	MediaRecorderSnapshot,
	MediaRecorderStatus,
	MediaRecordingResult,
} from '@ecopages/radiant-ui/controllers';

/** Seconds after which the recorder stops by itself. */
export const MAX_DURATION = 60;

export const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

const LIMIT_TEXT = formatMediaTime(MAX_DURATION);

/** What a form draws for one recorder snapshot, so every form shows the same thing. */
export type VoiceMemoView = {
	state: MediaRecorderStatus;
	status: string;
	elapsed: string;
	/** Loudness from 0 to 1. */
	level: number;
	record: boolean;
	pause: boolean;
	stop: boolean;
	discard: boolean;
	/** The recording is paused, so the pause button resumes. */
	paused: boolean;
	/** There is a recording to play and download. */
	result: boolean;
};

function statusText(snapshot: MediaRecorderSnapshot): string {
	switch (snapshot.status) {
		case 'idle':
			return `Press Record to start. It stops by itself after ${LIMIT_TEXT}.`;
		case 'requesting':
			return 'Waiting for permission to use the microphone.';
		case 'recording':
			return `Recording. It stops by itself at ${LIMIT_TEXT}.`;
		case 'paused':
			return 'Paused. Press Resume to go on, or Stop to finish.';
		case 'stopped':
			return snapshot.duration >= MAX_DURATION - 0.5
				? `Stopped at the ${LIMIT_TEXT} limit. Play it back, download it or discard it.`
				: `Recorded ${formatMediaTime(snapshot.duration)}. Play it back, download it or discard it.`;
		case 'denied':
			return 'Microphone access is blocked. Allow the microphone for this site in the browser settings, then press Record to try again.';
		case 'unsupported':
			return 'This browser cannot record audio.';
		case 'error':
			return 'Recording failed. Press Record to try again.';
	}
}

/** Maps a recorder snapshot to what the controls, the clock, the meter and the status line show. */
export function viewOf(snapshot: MediaRecorderSnapshot): VoiceMemoView {
	const { status } = snapshot;
	const live = status === 'recording' || status === 'paused';
	return {
		state: status,
		status: statusText(snapshot),
		elapsed: formatMediaTime(snapshot.duration),
		level: snapshot.level,
		record: status === 'idle' || status === 'stopped' || status === 'denied' || status === 'error',
		pause: live,
		stop: live,
		discard: live || status === 'stopped',
		paused: status === 'paused',
		result: status === 'stopped',
	};
}

function extensionOf(mimeType: string): string {
	const subtype = mimeType.split(';')[0].split('/')[1] ?? 'webm';
	return subtype === 'mp4' ? 'm4a' : subtype;
}

/**
 * The recorder's settings, shared by every form.
 *
 * @remarks
 * The level meter needs an `AudioContext`. `getAudioContext` runs inside `start()`, which a click calls, so the
 * context is created and resumed inside that gesture. The recorder only reads the stream into an analyser and never
 * connects it to the speakers.
 */
export function createRecorderConfig(
	context: MeterContext,
	config: Pick<MediaRecorderControllerConfig, 'onState' | 'onStop'>,
): MediaRecorderControllerConfig {
	return {
		mimeTypes: MIME_TYPES,
		maxDuration: MAX_DURATION,
		timeslice: 250,
		getAudioContext: () => context.get(),
		...config,
	};
}

/** One `AudioContext` for the life of a memo, created on first use and closed with it. */
export class MeterContext {
	private context: AudioContext | null = null;

	get(): AudioContext {
		this.context ??= new AudioContext();
		void this.context.resume();
		return this.context;
	}

	close(): void {
		void this.context?.close();
		this.context = null;
	}
}

/**
 * Draws a view into the markup of a plain, element or controller form: `data-state` on the root, the status line and
 * the meter (the stylesheet selects on the ones it styles), the clock and the four buttons.
 */
export function paint(root: HTMLElement, view: VoiceMemoView): void {
	const part = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
	root.dataset.state = view.state;
	part('[data-status]').textContent = view.status;
	part('[data-status]').dataset.state = view.state;
	part('[data-elapsed]').textContent = view.elapsed;
	part('[data-meter]').dataset.state = view.state;
	part('[data-meter]').style.setProperty('--level', view.level.toFixed(2));
	part<HTMLButtonElement>('[data-record]').disabled = !view.record;
	part<HTMLButtonElement>('[data-stop]').disabled = !view.stop;
	part<HTMLButtonElement>('[data-discard]').disabled = !view.discard;
	const pause = part<HTMLButtonElement>('[data-pause]');
	pause.disabled = !view.pause;
	pause.setAttribute('aria-label', view.paused ? 'Resume' : 'Pause');
	pause.toggleAttribute('data-paused', view.paused);
	part('[data-result]').hidden = !view.result;
}

/**
 * Points the player and the download link at a result, or clears them.
 *
 * @remarks
 * The recorder revokes the URL of a result on the next `start()`, on `discard()` and on `destroy()`, so the player
 * is cleared before any of them: its `src` is removed and `load()` drops the media.
 */
export function showResult(root: HTMLElement, result: MediaRecordingResult | null): void {
	const player = root.querySelector<HTMLAudioElement>('[data-player]')!;
	const link = root.querySelector<HTMLAnchorElement>('[data-download]')!;
	if (result) {
		player.src = result.url;
		link.href = result.url;
		link.download = `voice-memo.${extensionOf(result.mimeType)}`;
		return;
	}
	player.removeAttribute('src');
	player.load();
	link.removeAttribute('href');
}
