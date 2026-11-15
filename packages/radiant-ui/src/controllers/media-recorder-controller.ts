import { bindController, type Controller, type ControllerHost } from './controller';

/**
 * Where a recording is. `denied` is a refused permission, `unsupported` is a browser without `MediaRecorder` or
 * `getUserMedia`, and `error` is anything else that stopped it.
 */
export type MediaRecorderStatus =
	'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'denied' | 'unsupported' | 'error';

/** What `onState` and `getState()` report. */
export type MediaRecorderSnapshot = {
	status: MediaRecorderStatus;
	/** Seconds recorded, advancing while `recording` and not while `paused`. */
	duration: number;
	/** The MIME type the recorder uses. Without a supported `mimeTypes` entry it is known once the first data arrives. */
	mimeType: string | null;
	/**
	 * Smoothed loudness from 0 to 1, updated with `duration`. Always 0 without `getAudioContext`, and while paused.
	 */
	level: number;
	/** What ended the recording in `error`, otherwise `null`. */
	error: unknown;
};

/** A finished recording. */
export type MediaRecordingResult = {
	blob: Blob;
	/**
	 * An object URL the controller owns. It is revoked on `discard()`, on the next `start()` and on `destroy()`,
	 * so an `audio` element that plays it must be cleared before a new recording starts. Keep the `blob` to
	 * outlive it, and create your own URL from that.
	 */
	url: string;
	mimeType: string;
	/** Seconds recorded, excluding paused time. */
	duration: number;
};

/** The constraints, format, limits and callbacks of a `MediaRecorderController`. */
export type MediaRecorderControllerConfig = {
	/** What to capture, or a getter read on each `start()`. Defaults to `{ audio: true }`. */
	constraints?: MediaStreamConstraints | (() => MediaStreamConstraints);
	/** MIME types in order of preference. The first one `MediaRecorder.isTypeSupported` accepts is used, else the browser default. */
	mimeTypes?: readonly string[];
	/** Milliseconds between `onData` chunks. Without it the data arrives once, when the recording stops. */
	timeslice?: number;
	/** Seconds after which the recording stops by itself. Paused time does not count. */
	maxDuration?: number;
	/**
	 * The `AudioContext` to measure the stream with. Only when given does the controller build a source and an
	 * analyser, so `getAnalyser()` and `level` work; it never creates or closes a context. Read on each `start()`.
	 */
	getAudioContext?: () => AudioContext;
	/** Replaces `navigator.mediaDevices.getUserMedia`, for tests or a stream the page already has. */
	getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
	onState?: (snapshot: MediaRecorderSnapshot) => void;
	onData?: (chunk: Blob) => void;
	onStop?: (result: MediaRecordingResult) => void;
	onError?: (error: unknown) => void;
};

const DURATION_TICK_MS = 100;
const LEVEL_SMOOTHING = 0.5;

/**
 * Records the microphone or camera with `getUserMedia` and `MediaRecorder`, as a small state machine.
 *
 * @remarks
 * `start()` asks for permission and records. A refused permission is the `denied` state, not an exception, and a
 * browser without the APIs is `unsupported`; any other failure is `error` with `onError`. The methods never
 * reject.
 *
 * The controller owns what it creates. Every track is stopped when the recording ends, is discarded, or the
 * controller is destroyed, so the browser's recording indicator goes off. A stream that arrives after `stop()`,
 * `discard()` or `destroy()` during `requesting` is stopped on arrival. The object URL of a result is revoked on
 * `discard()`, on the next `start()` and on `destroy()`, so keep the blob if it must outlive them.
 *
 * A recording can also end without `stop()`: when every track ends (the device is unplugged or the permission
 * revoked) or the browser stops the recorder, it finishes as if stopped, with a result and `onStop`, and the
 * state is `stopped`. If the recorder itself fails, the state is `error` with `onError`. `denied` is reported
 * through `onState` and `getState()` only, never through `onError`.
 *
 * With `getAudioContext`, the stream is also measured: a `MediaStreamAudioSourceNode` feeds an `AnalyserNode`
 * that is connected to nothing else, never to `context.destination`, so there is no speaker output or feedback.
 * `destroy()`, `discard()` and the end of a recording disconnect both nodes and leave the context open, since
 * the caller owns it. A suspended context reads silence, so `level` stays 0 until the caller resumes it from a
 * user gesture.
 *
 * `getStream()` returns the live stream while `recording` or `paused`, for another controller to analyse. Do not
 * connect it to the speakers: that feeds the microphone back. `onState` fires on every status change and about
 * every 100 ms while `recording` so a timer can follow `duration`.
 *
 * Supported MIME types differ by browser (Safari records `audio/mp4`, Chromium and Firefox `audio/webm`), so list
 * several in `mimeTypes` and read `mimeType` from the result rather than assuming one.
 *
 * @example
 * ```ts
 * const recorder = new MediaRecorderController({
 *   mimeTypes: ['audio/webm;codecs=opus', 'audio/mp4'],
 *   maxDuration: 60,
 *   onState: ({ status, duration }) => render(status, duration),
 *   onStop: ({ url }) => (player.src = url),
 * });
 * recorder.attach();
 * await recorder.start(); // asks for the microphone
 * await recorder.stop(); // fires onStop
 * ```
 */
export class MediaRecorderController implements Controller {
	private status: MediaRecorderStatus = 'idle';
	private error: unknown = null;
	private attached = false;
	private token = 0;
	private stream: MediaStream | null = null;
	private recorder: MediaRecorder | null = null;
	private chunks: Blob[] = [];
	private mimeType: string | null = null;
	private elapsedMs = 0;
	private resumedAt = 0;
	private counting = false;
	private tick: ReturnType<typeof setInterval> | undefined;
	private limit: ReturnType<typeof setTimeout> | undefined;
	private result: MediaRecordingResult | null = null;
	private stopping: Promise<MediaRecordingResult | null> | null = null;
	private analyser: AnalyserNode | null = null;
	private source: MediaStreamAudioSourceNode | null = null;
	private level = 0;
	private settleStop: ((result: MediaRecordingResult | null) => void) | null = null;
	private trackListeners: Array<{ track: MediaStreamTrack; listener: () => void }> = [];

	constructor(private readonly config: MediaRecorderControllerConfig = {}) {}

	attach(): void {
		this.attached = true;
	}

	destroy(): void {
		if (!this.attached) {
			return;
		}
		this.attached = false;
		this.release();
		this.revoke();
		this.status = 'idle';
		this.elapsedMs = 0;
		this.error = null;
		this.mimeType = null;
	}

	getState(): MediaRecorderSnapshot {
		return {
			status: this.status,
			duration: this.elapsedSeconds(),
			level: this.level,
			mimeType: this.mimeType,
			error: this.error,
		};
	}

	/** The live stream while recording or paused, otherwise `null`. */
	getStream(): MediaStream | null {
		return this.stream;
	}

	/** The analyser fed by the stream while recording or paused, and `null` otherwise or without `getAudioContext`. */
	getAnalyser(): AnalyserNode | null {
		return this.analyser;
	}

	/** Asks for the device and records. Does nothing while `requesting`, `recording` or `paused`. */
	async start(): Promise<void> {
		if (!this.attached || this.status === 'requesting' || this.status === 'recording' || this.status === 'paused') {
			return;
		}
		this.revoke();
		this.error = null;
		this.mimeType = null;
		this.elapsedMs = 0;
		const getUserMedia = this.config.getUserMedia ?? this.deviceGetUserMedia();
		if (typeof MediaRecorder === 'undefined' || !getUserMedia) {
			this.setStatus('unsupported');
			return;
		}
		const token = (this.token += 1);
		this.setStatus('requesting');
		let stream: MediaStream;
		try {
			const { constraints = { audio: true } } = this.config;
			stream = await getUserMedia(typeof constraints === 'function' ? constraints() : constraints);
		} catch (error) {
			if (token === this.token) {
				this.fail(error);
			}
			return;
		}
		if (token !== this.token) {
			stopTracks(stream);
			return;
		}
		try {
			this.begin(stream);
		} catch (error) {
			this.release();
			this.fail(error);
		}
	}

	pause(): void {
		if (this.status !== 'recording' || this.recorder?.state !== 'recording') {
			return;
		}
		this.recorder.pause();
		this.freezeElapsed();
		this.level = 0;
		this.setStatus('paused');
	}

	resume(): void {
		if (this.status !== 'paused' || this.recorder?.state !== 'paused') {
			return;
		}
		this.recorder.resume();
		this.resumedAt = performance.now();
		this.counting = true;
		this.setStatus('recording');
		this.startTimers();
	}

	/**
	 * Ends the recording and resolves with the result, or `null` when nothing was recording. Stopping while
	 * `requesting` cancels the request.
	 */
	stop(): Promise<MediaRecordingResult | null> {
		if (this.stopping) {
			return this.stopping;
		}
		if (this.status === 'requesting') {
			this.token += 1;
			this.setStatus('idle');
			return Promise.resolve(null);
		}
		const recorder = this.recorder;
		if (!recorder || (this.status !== 'recording' && this.status !== 'paused')) {
			return Promise.resolve(this.result);
		}
		const pending = new Promise<MediaRecordingResult | null>((resolve) => {
			this.settleStop = resolve;
		});
		this.stopping = pending;
		this.freezeElapsed();
		try {
			if (recorder.state !== 'inactive') {
				recorder.stop();
			}
		} catch (error) {
			this.release();
			this.fail(error);
		}
		return pending;
	}

	/** Drops the recording in progress and the last result, stops the device and goes back to `idle`. */
	discard(): void {
		this.release();
		this.revoke();
		this.elapsedMs = 0;
		this.error = null;
		this.mimeType = null;
		if (this.status !== 'idle') {
			this.setStatus('idle');
		}
	}

	private deviceGetUserMedia(): ((constraints: MediaStreamConstraints) => Promise<MediaStream>) | null {
		const devices = navigator.mediaDevices;
		return devices ? (constraints) => devices.getUserMedia(constraints) : null;
	}

	private begin(stream: MediaStream): void {
		const { mimeTypes = [], timeslice } = this.config;
		this.stream = stream;
		const preferred = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
		const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
		this.recorder = recorder;
		this.chunks = [];
		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				this.mimeType ||= event.data.type || null;
				this.chunks.push(event.data);
				this.config.onData?.(event.data);
			}
		};
		recorder.onerror = (event) => {
			this.release();
			this.fail((event as Event & { error?: unknown }).error ?? event);
		};
		recorder.onstop = () => this.finish(recorder);
		this.watchTracks(stream);
		recorder.start(timeslice);
		this.connectAnalyser(stream);
		this.mimeType = recorder.mimeType || preferred || null;
		this.elapsedMs = 0;
		this.resumedAt = performance.now();
		this.counting = true;
		this.setStatus('recording');
		this.startTimers();
	}

	/**
	 * Finishes a recording whose recorder stopped, whether `stop()` asked for it or the browser did. It is the one
	 * place a result is built.
	 */
	private finish(recorder: MediaRecorder): void {
		this.freezeElapsed();
		const duration = this.elapsedSeconds();
		const mimeType = recorder.mimeType || this.mimeType || '';
		const blob = new Blob(this.chunks, { type: mimeType });
		const result = { blob, url: URL.createObjectURL(blob), mimeType, duration };
		const settle = this.settleStop;
		this.settleStop = null;
		this.release();
		this.result = result;
		this.setStatus('stopped');
		this.config.onStop?.(result);
		settle?.(result);
	}

	/**
	 * A stream whose every track has ended has no device left to record, and the platform does not say so through
	 * the recorder in every browser, so the last track to end stops the recording.
	 */
	private watchTracks(stream: MediaStream): void {
		const tracks = stream.getTracks();
		const ended = new Set<MediaStreamTrack>();
		for (const track of tracks) {
			const listener = () => {
				ended.add(track);
				if (ended.size === tracks.length) {
					void this.stop();
				}
			};
			track.addEventListener('ended', listener);
			this.trackListeners.push({ track, listener });
		}
	}

	private startTimers(): void {
		this.clearTimers();
		this.tick = setInterval(() => {
			this.measure();
			this.config.onState?.(this.getState());
		}, DURATION_TICK_MS);
		const { maxDuration } = this.config;
		if (maxDuration !== undefined) {
			const remaining = Math.max(0, maxDuration * 1000 - this.elapsedMs);
			this.limit = setTimeout(() => void this.stop(), remaining);
		}
	}

	private connectAnalyser(stream: MediaStream): void {
		const context = this.config.getAudioContext?.();
		if (!context) {
			return;
		}
		this.analyser = context.createAnalyser();
		this.source = context.createMediaStreamSource(stream);
		this.source.connect(this.analyser);
	}

	private measure(): void {
		if (!this.analyser) {
			return;
		}
		const samples = new Float32Array(this.analyser.fftSize);
		this.analyser.getFloatTimeDomainData(samples);
		let sum = 0;
		for (const sample of samples) {
			sum += sample * sample;
		}
		const rms = Math.min(1, Math.sqrt(sum / samples.length));
		this.level = this.level * LEVEL_SMOOTHING + rms * (1 - LEVEL_SMOOTHING);
	}

	private clearTimers(): void {
		clearInterval(this.tick);
		clearTimeout(this.limit);
	}

	private freezeElapsed(): void {
		if (this.counting) {
			this.elapsedMs += performance.now() - this.resumedAt;
			this.counting = false;
		}
		this.clearTimers();
	}

	private elapsedSeconds(): number {
		const live = this.counting ? performance.now() - this.resumedAt : 0;
		return (this.elapsedMs + live) / 1000;
	}

	/**
	 * Stops the recorder without reporting a result, then every track, and invalidates a pending request. A
	 * `stop()` waiting on the recorder resolves with `null`.
	 */
	private release(): void {
		this.token += 1;
		this.clearTimers();
		this.counting = false;
		if (this.recorder) {
			this.recorder.ondataavailable = null;
			this.recorder.onerror = null;
			this.recorder.onstop = null;
			if (this.recorder.state !== 'inactive') {
				this.recorder.stop();
			}
			this.recorder = null;
		}
		this.source?.disconnect();
		this.analyser?.disconnect();
		this.source = null;
		this.analyser = null;
		this.level = 0;
		for (const { track, listener } of this.trackListeners) {
			track.removeEventListener('ended', listener);
		}
		this.trackListeners = [];
		if (this.stream) {
			stopTracks(this.stream);
			this.stream = null;
		}
		this.chunks = [];
		this.stopping = null;
		this.settleStop?.(null);
		this.settleStop = null;
	}

	private revoke(): void {
		if (this.result) {
			URL.revokeObjectURL(this.result.url);
			this.result = null;
		}
	}

	private fail(error: unknown): void {
		const denied =
			error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
		this.error = denied ? null : error;
		this.setStatus(denied ? 'denied' : 'error');
		if (!denied) {
			this.config.onError?.(error);
		}
	}

	private setStatus(status: MediaRecorderStatus): void {
		this.status = status;
		this.config.onState?.(this.getState());
	}
}

function stopTracks(stream: MediaStream): void {
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

/**
 * Creates a `MediaRecorderController` that is active while `host` is connected and releases the device when it
 * disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * this.recorder = createMediaRecorderController(this, { onStop: ({ url }) => (this.src = url) });
 * ```
 */
export function createMediaRecorderController(
	host: ControllerHost,
	config?: MediaRecorderControllerConfig,
): MediaRecorderController {
	return bindController(host, new MediaRecorderController(config));
}
