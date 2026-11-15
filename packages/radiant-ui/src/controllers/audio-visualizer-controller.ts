import { bindController, type Controller, type ControllerHost } from './controller';

/**
 * What a preset reads on each frame.
 *
 * @remarks
 * Both buffers are reused for every frame: a preset reads them inside `draw()` and must not keep a reference.
 * Values are the analyser's bytes, 0 to 255. `frequency` has `fftSize / 2` bins of `sampleRate / fftSize` Hz
 * each; `waveform` has `fftSize` samples centered on 128. Media with no audio gives a silent frame.
 */
export type AudioFrame = {
	frequency: Uint8Array<ArrayBuffer>;
	waveform: Uint8Array<ArrayBuffer>;
	sampleRate: number;
	fftSize: number;
};

/**
 * A way to show an `AudioFrame`, plugged into an `AudioVisualizerController`.
 *
 * @remarks
 * The controller calls `mount` once the preset is in use, `draw` for every animation frame while the media plays or a stream is set,
 * `rest` when it stops or motion is reduced, and `destroy` when the preset is replaced or the controller is
 * destroyed. `mount` can run again on the same object after `destroy`. A preset only draws: it sets no ARIA and
 * owns nothing outside the target it is given.
 */
export interface AudioVisualizerPreset {
	/** Analyser resolution, a power of two from 32 to 32768. Default 1024. */
	fftSize?: number;
	/** Analyser smoothing of the frequency data between frames, 0 to 1. Default 0.8. */
	smoothing?: number;
	mount(target: HTMLElement): void;
	draw(frame: AudioFrame): void;
	/** Show the idle state: the preset draws nothing until the next `draw()`. */
	rest(): void;
	destroy(): void;
}

/**
 * What an `AudioVisualizerController` is doing: `opaque` means the media plays a source that is cross-origin
 * without CORS, so nothing can be drawn and an element that was visualized before is silent too.
 */
export type AudioVisualizerState = 'idle' | 'running' | 'reduced' | 'opaque';

/**
 * What an `AudioVisualizerController` listens to: exactly one of a media element and a `MediaStream`. Giving both is a
 * compile error.
 */
export type AudioVisualizerSource =
	| {
			/** Resolved on every `attach()`; `null` attaches nothing. */
			getMedia: () => HTMLMediaElement | null;
			getStream?: undefined;
	  }
	| {
			/**
			 * The stream to visualize, such as a microphone's, resolved on every `attach()` and `refresh()`. `null` shows
			 * the preset at rest; a different stream replaces the old one. The host owns the stream: the controller never
			 * stops its tracks and never plays it to the speakers.
			 */
			getStream: () => MediaStream | null;
			getMedia?: undefined;
	  };

/** The source, the element a preset mounts into, the preset and an optional gate of an `AudioVisualizerController`. */
export type AudioVisualizerControllerConfig = AudioVisualizerSource & {
	/** Resolved on every `attach()` and again on a `play` while it was `null`, for a host that renders it late. Canvas presets want an empty target with a height. */
	getTarget: () => HTMLElement | null;
	preset: AudioVisualizerPreset;
	/** Checked each time playback starts and on every frame; `false` rests the preset until `refresh()` or, for a media element, the next `play`. */
	getEnabled?: () => boolean;
	/**
	 * Called with the new state each time `getState()` changes, never per frame. Not called for the state before
	 * `attach()`, which is `idle`.
	 */
	onState?: (state: AudioVisualizerState) => void;
};

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const DEFAULT_FFT_SIZE = 1024;
const DEFAULT_SMOOTHING = 0.8;

/**
 * The one `AudioContext` every controller uses, created on the first `play`.
 *
 * @remarks
 * Never suspended and never closed, on purpose: a media element that is routed through a context is silent
 * whenever the context is not running, so stopping it could mute a player the user is listening to. The cost is a
 * running audio thread for the life of the page once any media has been visualized.
 */
let sharedContext: AudioContext | null = null;

/**
 * One source node per media element, for the element's whole life: an element can feed a single
 * `MediaElementAudioSourceNode`, and a second one throws, and a node cannot give the element back to its native
 * output. It is connected straight to the destination, so the media is heard whether or not a controller is
 * attached.
 */
const sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

function routeMedia(media: HTMLMediaElement, context: AudioContext): MediaElementAudioSourceNode {
	let source = sources.get(media);
	if (!source) {
		source = context.createMediaElementSource(media);
		source.connect(context.destination);
		sources.set(media, source);
	}
	return source;
}

/**
 * Cross-origin media without CORS comes out of a source node as silence.
 *
 * @remarks
 * A redirect to another origin cannot be seen from here. Reads `src` when `currentSrc` is not chosen yet, so `audio.src = url; audio.play()` is judged right away. Media
 * whose URL comes from `<source>` children is only known once the browser has picked one.
 */
function isOpaque(media: HTMLMediaElement): boolean {
	const src = media.currentSrc || media.src;
	if (media.crossOrigin !== null || !src) {
		return false;
	}
	const url = new URL(src, location.href);
	return url.protocol.startsWith('http') && url.origin !== location.origin;
}

/** A stream whose audio tracks were stopped, or that has none, has nothing to analyse. */
function hasLiveAudio(stream: MediaStream): boolean {
	return stream.getAudioTracks().some((track) => track.readyState === 'live');
}

function createFrame(analyser: AnalyserNode, sampleRate: number): AudioFrame {
	return {
		frequency: new Uint8Array(analyser.frequencyBinCount),
		waveform: new Uint8Array(analyser.fftSize),
		sampleRate,
		fftSize: analyser.fftSize,
	};
}

type Run = {
	context: AudioContext;
	source: AudioNode;
	analyser: AnalyserNode;
	frame: AudioFrame;
	frameId: number;
};

/**
 * Feeds a preset the sound of a media element while it plays.
 *
 * @remarks
 * With `getStream` in place of `getMedia` it reads a `MediaStream` instead: the source node goes to the analyser
 * only, never to the speakers, the controller never stops the stream's tracks, `refresh()` picks up a new or `null`
 * stream, and the `opaque` state and CORS rules below do not apply.
 *
 * Listens to the media element's `play`, `pause`, `ended`, `emptied` and `volumechange` and runs one
 * animation-frame loop only while it plays; the host wires nothing else.
 *
 * The first time an element is visualized its source node is connected straight to the speakers of one shared
 * `AudioContext`, and that cannot be undone: from then on the element's sound goes through the Web Audio graph
 * for its whole life, whether or not a controller is attached. Each controller reads the sound through an
 * analyser of its own (its own `fftSize` and `smoothing`), which is disconnected when the controller stops or is
 * destroyed. The context is never suspended or closed, so the media keeps playing after the last controller is
 * destroyed; it keeps an audio thread running once any media was visualized.
 *
 * So the sound is unchanged only while a visualized element keeps same-origin or CORS-enabled sources
 * (`crossorigin` plus CORS headers), redirects included, for its whole life. Otherwise:
 * - a later source that is cross-origin without `crossorigin` is silent, because the source node turns it into
 *   zeros; the controller detects it by the URL and reports `opaque`, but a same-origin URL that redirects to
 *   another origin cannot be detected and is silent with no report;
 * - a context that is suspended or interrupted (iOS Safari on lock, a phone call) silences the media until it runs
 *   again; call `resume()` from a user gesture.
 *
 * The controller stays `idle`, builds no source node and leaves the media on its native output when it cannot do
 * that safely, and tries again on the next `play`, `volumechange`, `resume()` or change of the context's state:
 * - the context is not running and does not start when resumed (autoplay policy before a user gesture);
 * - the media is cross-origin and has no `crossorigin` attribute, which a source node would turn into silence.
 *   The state is `opaque` while it plays. Give such media `crossorigin` and a source that sends CORS headers;
 * - the context cannot be created, or the element already feeds a source node made by other code.
 *
 * If the context stops running while it draws (the browser suspends or interrupts it), the loop stops and the
 * state is `idle` until it runs again. `prefers-reduced-motion: reduce` keeps the preset at rest and starts no
 * loop and no graph.
 *
 * `destroy()` is synchronous, unlike `MediaController.destroy()`, which defers pausing to a microtask: a
 * visualizer owns nothing the media needs.
 *
 * `attach()` with a `null` media attaches nothing. After the host has rendered the element, or when
 * `getEnabled` changes, call `refresh()`.
 *
 * The visualization is decorative. The controller sets no ARIA; playback state, labels and live regions stay with
 * the host.
 */
export class AudioVisualizerController implements Controller {
	private preset: AudioVisualizerPreset;
	private abort: AbortController | null = null;
	private media: HTMLMediaElement | null = null;
	private stream: MediaStream | null = null;
	private target: HTMLElement | null = null;
	private reduced = false;
	private run: Run | null = null;
	private waiting = false;
	private watching = false;
	private attached = false;
	private opaque = false;
	private notified: AudioVisualizerState = 'idle';

	constructor(private readonly config: AudioVisualizerControllerConfig) {
		this.preset = config.preset;
	}

	attach(): void {
		const media = this.config.getMedia?.() ?? null;
		const stream = this.config.getStream?.() ?? null;
		const target = this.config.getTarget();
		if (this.abort && media === this.media && target === this.target) {
			if (stream !== this.stream) {
				this.stop();
				this.stream = stream;
			}
			this.startIfPlaying();
			return;
		}
		this.destroy();
		this.attached = true;
		if (!media && !this.config.getStream) {
			return;
		}
		const abort = new AbortController();
		const { signal } = abort;
		this.abort = abort;
		this.media = media;
		this.stream = stream;
		this.mountInto(target);

		const motion = matchMedia(REDUCED_MOTION);
		this.reduced = motion.matches;
		motion.addEventListener(
			'change',
			() => {
				this.reduced = motion.matches;
				if (this.reduced) {
					this.stop();
				} else {
					this.startIfPlaying();
				}
				this.notify();
			},
			{ signal },
		);
		media?.addEventListener(
			'play',
			() => {
				this.waiting = false;
				this.start();
			},
			{ signal },
		);
		media?.addEventListener(
			'volumechange',
			() => {
				this.waiting = false;
				this.startIfPlaying();
			},
			{ signal },
		);
		for (const type of ['pause', 'ended', 'emptied']) {
			media?.addEventListener(type, () => this.stop(), { signal });
		}
		this.startIfPlaying();
		this.notify();
	}

	destroy(): void {
		this.attached = false;
		if (!this.abort) {
			return;
		}
		this.abort.abort();
		this.abort = null;
		this.stop();
		if (this.target) {
			this.preset.destroy();
		}
		this.media = null;
		this.stream = null;
		this.target = null;
		this.waiting = false;
		this.watching = false;
		this.opaque = false;
		this.notify();
	}

	/**
	 * Resolves `getMedia`, `getTarget` and `getEnabled` again and starts or stops to match: a media element or
	 * target that was not there at `attach()` is picked up, and the loop starts when `getEnabled` is now `true`
	 * and the media is playing or the stream has a live audio track, or stops when it is `false`. Does nothing before `attach()` or after `destroy()`.
	 */
	refresh(): void {
		if (!this.attached) {
			return;
		}
		if (this.run && !this.canRun()) {
			this.stop();
		}
		this.attach();
	}

	/**
	 * Replaces the preset: the old one is rested and destroyed, the new one mounted and, if the media is playing,
	 * drawn from the next frame. Before `attach()` it only chooses the preset to mount.
	 */
	setPreset(preset: AudioVisualizerPreset): void {
		if (preset === this.preset) {
			return;
		}
		const previous = this.preset;
		this.preset = preset;
		if (!this.target) {
			return;
		}
		previous.rest();
		previous.destroy();
		preset.mount(this.target);
		if (this.run) {
			this.configure(this.run.analyser);
		}
	}

	/**
	 * Asks the context to run, for a host's click or keydown handler, and starts the loop once it does.
	 *
	 * @remarks
	 * Browsers let an `AudioContext` start only inside a user gesture, and `resume()` here runs inside the caller's
	 * stack, which a `play` event does not. WebKit (iOS and macOS Safari) is stricter than Chromium about it, and
	 * also leaves a context `interrupted` after a call or a lock, so call this from the handler of the play button
	 * and of any control the user taps after returning. That behaviour has not been verified on a device. Does
	 * nothing before `attach()`, under reduced motion or while `getEnabled` is `false`.
	 */
	resume(): void {
		if (!this.abort || !this.canRun()) {
			return;
		}
		const context = this.sharedContext();
		if (context) {
			this.watch(context);
			this.requestRun(context);
		}
	}

	/**
	 * `running` while the loop draws, `reduced` while attached and the user prefers reduced motion, `opaque` while
	 * the media plays a source that is cross-origin without CORS, else `idle`. `reduced` wins over `opaque`.
	 *
	 * @remarks
	 * On an element visualized before, `opaque` means the sound is silent too, not only that nothing is drawn.
	 */
	getState(): AudioVisualizerState {
		if (this.run) {
			return 'running';
		}
		if (this.abort && this.reduced) {
			return 'reduced';
		}
		return this.opaque ? 'opaque' : 'idle';
	}

	private notify(): void {
		const state = this.getState();
		if (state !== this.notified) {
			this.notified = state;
			this.config.onState?.(state);
		}
	}

	private mountInto(target: HTMLElement | null): void {
		if (target) {
			this.target = target;
			this.preset.mount(target);
		}
	}

	private configure(analyser: AnalyserNode): void {
		analyser.fftSize = this.preset.fftSize ?? DEFAULT_FFT_SIZE;
		analyser.smoothingTimeConstant = this.preset.smoothing ?? DEFAULT_SMOOTHING;
	}

	private canRun(): boolean {
		return !this.reduced && (this.config.getEnabled?.() ?? true);
	}

	private startIfPlaying(): void {
		if (this.stream ? hasLiveAudio(this.stream) : this.media && !this.media.paused && !this.media.ended) {
			this.start();
		}
	}

	private start(): void {
		this.startRun();
		this.notify();
	}

	private startRun(): void {
		const input = this.media ?? this.stream;
		if (!input || this.run || this.waiting) {
			return;
		}
		if (!this.target) {
			this.mountInto(this.config.getTarget());
		}
		this.opaque = this.media !== null && isOpaque(this.media);
		if (!this.target || !this.canRun()) {
			this.preset.rest();
			return;
		}
		if (this.opaque) {
			return;
		}
		const context = this.sharedContext();
		if (!context) {
			return;
		}
		this.watch(context);
		if (context.state === 'running') {
			this.begin(context, input);
			return;
		}
		this.requestRun(context);
	}

	private sharedContext(): AudioContext | null {
		try {
			sharedContext ??= new AudioContext();
			return sharedContext;
		} catch {
			return null;
		}
	}

	private requestRun(context: AudioContext): void {
		if (context.state === 'running') {
			this.startIfPlaying();
			return;
		}
		this.waiting = true;
		const settle = () => {
			this.waiting = false;
			if (context.state === 'running') {
				this.startIfPlaying();
			}
		};
		context.resume().then(settle, settle);
	}

	private watch(context: AudioContext): void {
		if (this.watching || !this.abort) {
			return;
		}
		this.watching = true;
		context.addEventListener(
			'statechange',
			() => {
				if (context.state === 'running') {
					this.waiting = false;
					this.startIfPlaying();
				} else {
					this.stop();
				}
			},
			{ signal: this.abort.signal },
		);
	}

	/**
	 * A stream's source goes to the analyser only: the element's source is also connected to the speakers, to keep the
	 * element audible, but a microphone played back is feedback.
	 */
	private begin(context: AudioContext, input: HTMLMediaElement | MediaStream): void {
		let source: AudioNode;
		try {
			source = input instanceof MediaStream ? context.createMediaStreamSource(input) : routeMedia(input, context);
		} catch {
			return;
		}
		const analyser = context.createAnalyser();
		this.configure(analyser);
		source.connect(analyser);
		this.run = {
			context,
			source,
			analyser,
			frame: createFrame(analyser, context.sampleRate),
			frameId: requestAnimationFrame(this.tick),
		};
	}

	private stop(): void {
		this.opaque = false;
		const run = this.run;
		if (run) {
			cancelAnimationFrame(run.frameId);
			run.source.disconnect(run.analyser);
			this.run = null;
			this.preset.rest();
		}
		this.notify();
	}

	private readonly tick = (): void => {
		const run = this.run;
		if (!run) {
			return;
		}
		if (!this.canRun() || (this.stream && !hasLiveAudio(this.stream))) {
			this.stop();
			return;
		}
		const { analyser } = run;
		if (run.frame.fftSize !== analyser.fftSize) {
			run.frame = createFrame(analyser, run.context.sampleRate);
		}
		analyser.getByteFrequencyData(run.frame.frequency);
		analyser.getByteTimeDomainData(run.frame.waveform);
		this.preset.draw(run.frame);
		run.frameId = requestAnimationFrame(this.tick);
	};
}

/**
 * Creates an `AudioVisualizerController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createAudioVisualizerController(this, {
 *   getMedia: () => this.querySelector('audio'),
 *   getTarget: () => this.querySelector('[data-bars]'),
 *   preset: bars({ mode: 'dom' }),
 * });
 * ```
 */
export function createAudioVisualizerController(
	host: ControllerHost,
	config: AudioVisualizerControllerConfig,
): AudioVisualizerController {
	return bindController(host, new AudioVisualizerController(config));
}
