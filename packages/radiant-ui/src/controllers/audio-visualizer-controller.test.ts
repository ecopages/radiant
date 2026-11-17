import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	AudioVisualizerController,
	createAudioVisualizerController,
	type AudioFrame,
	type AudioVisualizerPreset,
	type AudioVisualizerState,
} from './audio-visualizer-controller';
import { bars } from './audio-visualizer-bars';
import { createWaiters, frames, once, type Waiters } from './event.fixture';
import { wave } from './audio-visualizer-wave';

function toneUrl(seconds = 1): string {
	const sampleRate = 8000;
	const samples = sampleRate * seconds;
	const buffer = new ArrayBuffer(44 + samples * 2);
	const view = new DataView(buffer);
	const text = (offset: number, value: string) =>
		[...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
	text(0, 'RIFF');
	view.setUint32(4, 36 + samples * 2, true);
	text(8, 'WAVEfmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	text(36, 'data');
	view.setUint32(40, samples * 2, true);
	for (let index = 0; index < samples; index++) {
		view.setInt16(44 + index * 2, Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 12000, true);
	}
	return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

/** A preset whose `reached` and `called` resolve from its own `draw` and `rest` calls, without polling the mock. */
function spyPreset(options: { fftSize?: number; draw?: (frame: AudioFrame) => void } = {}) {
	const { notify: fire, until: reached } = createWaiters();
	const preset = {
		fftSize: options.fftSize,
		mount: vi.fn<AudioVisualizerPreset['mount']>(),
		draw: vi.fn<AudioVisualizerPreset['draw']>((frame) => {
			options.draw?.(frame);
			fire();
		}),
		rest: vi.fn<AudioVisualizerPreset['rest']>(fire),
		destroy: vi.fn<AudioVisualizerPreset['destroy']>(),
		reached,
		called: (method: 'draw' | 'rest') => preset.reached(() => preset[method].mock.calls.length > 0),
	};
	return preset;
}

const stateWaiters = new WeakMap<object, Waiters>();

/** Resolves once `predicate` holds, re-checked on every `onState` call of a controller built by `make`. */
function untilState(controller: object, predicate: () => boolean): Promise<void> {
	const waiters = stateWaiters.get(controller);
	if (!waiters) {
		throw new Error('untilState needs a controller built by make');
	}
	return waiters.until(predicate);
}

const whenState = (controller: { getState(): AudioVisualizerState }, state: AudioVisualizerState) =>
	untilState(controller, () => controller.getState() === state);

/** A media query whose `matches` is counted, so a listener that outlives its controller shows. */
class FakeMotionQuery extends EventTarget {
	reads = 0;
	private value: boolean;
	constructor(matches: boolean) {
		super();
		this.value = matches;
	}
	get matches() {
		this.reads++;
		return this.value;
	}
	set(matches: boolean) {
		this.value = matches;
		this.dispatchEvent(new Event('change'));
	}
}

class FakeAnalyser {
	fftSize = 2048;
	smoothingTimeConstant = 0;
	get frequencyBinCount() {
		return this.fftSize / 2;
	}
	getByteFrequencyData(buffer: Uint8Array) {
		buffer.fill(9);
	}
	getByteTimeDomainData(buffer: Uint8Array) {
		buffer.fill(128);
	}
}

type FakeSource = { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };

/** A context whose state and `resume()` the test decides, standing in for the autoplay policy. */
class FakeContext extends EventTarget {
	static initial = 'running';
	static resumeMode: 'run' | 'stay' | 'fail' | 'pend' = 'run';
	static failToCreate = false;
	static instances: FakeContext[] = [];
	state: string;
	sampleRate = 48000;
	destination = { kind: 'destination' };
	sources: FakeSource[] = [];
	analysers: FakeAnalyser[] = [];
	resumes = 0;
	pending: Array<() => void> = [];
	constructor() {
		super();
		if (FakeContext.failToCreate) {
			throw new Error('no audio');
		}
		this.state = FakeContext.initial;
		FakeContext.instances.push(this);
	}
	resume(): Promise<void> {
		this.resumes++;
		switch (FakeContext.resumeMode) {
			case 'run':
				this.setState('running');
				return Promise.resolve();
			case 'fail':
				return Promise.reject(new DOMException('blocked'));
			case 'pend':
				return new Promise((resolve) => this.pending.push(resolve));
			default:
				return Promise.resolve();
		}
	}
	setState(state: string) {
		this.state = state;
		this.dispatchEvent(new Event('statechange'));
	}
	createAnalyser() {
		const analyser = new FakeAnalyser();
		this.analysers.push(analyser);
		return analyser;
	}
	createMediaElementSource() {
		const source: FakeSource = { connect: vi.fn((node: unknown) => node), disconnect: vi.fn() };
		this.sources.push(source);
		return source;
	}
}

/**
 * The controller keeps its context and source nodes at module level, and the browser cannot reset a module, so a
 * query string loads a fresh copy of it for a test that needs a context of its own.
 */
let freshModules = 0;

async function loadWithFakeContext(initial: string, resumeMode: typeof FakeContext.resumeMode = 'run') {
	FakeContext.instances = [];
	FakeContext.initial = initial;
	FakeContext.resumeMode = resumeMode;
	FakeContext.failToCreate = false;
	vi.stubGlobal('AudioContext', FakeContext);
	freshModules++;
	return (await import(
		/* @vite-ignore */ `./audio-visualizer-controller.ts?fresh=${freshModules}`
	)) as typeof import('./audio-visualizer-controller');
}

describe('AudioVisualizerController', () => {
	const controllers: Array<{ destroy(): void }> = [];
	const media: HTMLMediaElement[] = [];

	afterEach(() => {
		controllers.splice(0).forEach((controller) => controller.destroy());
		media.splice(0).forEach((element) => element.pause());
		document.body.replaceChildren();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	function makeAudio(): HTMLAudioElement {
		const audio = new Audio();
		audio.loop = true;
		audio.src = toneUrl();
		document.body.append(audio);
		media.push(audio);
		return audio;
	}

	function makeTarget(): HTMLElement {
		const target = document.createElement('div');
		target.style.height = '40px';
		document.body.append(target);
		return target;
	}

	function make(
		audio: HTMLMediaElement,
		target: HTMLElement | null,
		preset: AudioVisualizerPreset,
		extra: { getEnabled?: () => boolean; onState?: (state: AudioVisualizerState) => void } = {},
		Controller: typeof AudioVisualizerController = AudioVisualizerController,
	) {
		const waiters = createWaiters();
		const controller = new Controller({
			getMedia: () => audio,
			getTarget: () => target,
			preset,
			...extra,
			onState: (state) => {
				extra.onState?.(state);
				waiters.notify();
			},
		});
		stateWaiters.set(controller, waiters);
		controllers.push(controller);
		return controller;
	}

	const drawCount = (preset: { draw: { mock: { calls: unknown[] } } }) => preset.draw.mock.calls.length;

	async function settled(preset: { draw: { mock: { calls: unknown[] } } }) {
		const before = drawCount(preset);
		await frames(3);
		return drawCount(preset) - before;
	}

	it('draws frames sized to the analyser once the media plays', async () => {
		const audio = makeAudio();
		const preset = spyPreset();
		const controller = make(audio, makeTarget(), preset);

		controller.attach();
		expect(controller.getState()).toBe('idle');
		expect(preset.mount).toHaveBeenCalledOnce();
		await audio.play();
		await preset.called('draw');

		const frame = preset.draw.mock.calls[0][0];
		expect(frame.fftSize).toBe(1024);
		expect(frame.frequency).toHaveLength(512);
		expect(frame.waveform).toHaveLength(1024);
		expect(frame.sampleRate).toBeGreaterThan(0);
		expect(controller.getState()).toBe('running');
	});

	it('carries the sound of the media in the frame', async () => {
		const audio = makeAudio();
		let loudest = 0;
		const preset = spyPreset({
			draw: (frame) => {
				loudest = Math.max(loudest, ...frame.frequency);
			},
		});
		make(audio, makeTarget(), preset).attach();
		await audio.play();
		await preset.reached(() => loudest > 0);
	});

	it('rests and stops the loop on pause and on ended, and runs again on play', async () => {
		const audio = makeAudio();
		const preset = spyPreset();
		const controller = make(audio, makeTarget(), preset);
		controller.attach();
		await audio.play();
		await preset.called('draw');

		audio.pause();
		await preset.reached(() => preset.rest.mock.calls.length === 1);
		expect(controller.getState()).toBe('idle');
		expect(await settled(preset)).toBe(0);

		await audio.play();
		await whenState(controller, 'running');
		audio.dispatchEvent(new Event('ended'));
		expect(preset.rest).toHaveBeenCalledTimes(2);
		expect(await settled(preset)).toBe(0);
	});

	it('starts at once when attached while the media is already playing, on one source node', async () => {
		const audio = makeAudio();
		await audio.play();
		const create = vi.spyOn(AudioContext.prototype, 'createMediaElementSource');
		const preset = spyPreset();
		const controller = make(audio, makeTarget(), preset);

		controller.attach();
		await whenState(controller, 'running');
		await preset.called('draw');
		expect(create).toHaveBeenCalledOnce();
	});

	it('removes its listeners and cancels the loop on destroy, even while running', async () => {
		const audio = makeAudio();
		const preset = spyPreset();
		const controller = make(audio, makeTarget(), preset);
		controller.attach();
		await audio.play();
		await preset.called('draw');

		controller.destroy();
		expect(preset.rest).toHaveBeenCalled();
		expect(preset.destroy).toHaveBeenCalledOnce();
		expect(controller.getState()).toBe('idle');
		expect(await settled(preset)).toBe(0);

		const analysers = vi.spyOn(AudioContext.prototype, 'createAnalyser');
		audio.dispatchEvent(new Event('play'));
		audio.dispatchEvent(new Event('volumechange'));
		await frames(2);
		expect(analysers).not.toHaveBeenCalled();
		expect(await settled(preset)).toBe(0);
		expect(() => controller.destroy()).not.toThrow();
		expect(preset.destroy).toHaveBeenCalledOnce();
	});

	it('is idempotent to attach and can attach again after destroy', async () => {
		const audio = makeAudio();
		const preset = spyPreset();
		const controller = make(audio, makeTarget(), preset);
		controller.attach();
		controller.attach();
		expect(preset.mount).toHaveBeenCalledOnce();
		controller.destroy();
		controller.attach();
		expect(preset.mount).toHaveBeenCalledTimes(2);

		await audio.play();
		await preset.called('draw');
	});

	it('attaches nothing while getMedia is null and attaches when called again', async () => {
		const audio = makeAudio();
		let current: HTMLMediaElement | null = null;
		const preset = spyPreset();
		const controller = new AudioVisualizerController({
			getMedia: () => current,
			getTarget: () => makeTarget(),
			preset,
		});
		controllers.push(controller);

		controller.attach();
		expect(preset.mount).not.toHaveBeenCalled();

		current = audio;
		controller.attach();
		expect(preset.mount).toHaveBeenCalledOnce();
		await audio.play();
		await preset.called('draw');
	});

	it('mounts into a target that was null at attach on the next play, and rests while it is still null', async () => {
		const audio = makeAudio();
		let target: HTMLElement | null = null;
		const preset = spyPreset();
		const controller = new AudioVisualizerController({ getMedia: () => audio, getTarget: () => target, preset });
		controllers.push(controller);
		controller.attach();
		expect(preset.mount).not.toHaveBeenCalled();

		await audio.play();
		await preset.called('rest');
		expect(preset.draw).not.toHaveBeenCalled();
		expect(controller.getState()).toBe('idle');

		target = makeTarget();
		audio.pause();
		await audio.play();
		await preset.called('draw');
		expect(preset.mount).toHaveBeenCalledWith(target);
	});

	it('re-resolves the getters on attach: a new target gets the preset', () => {
		const audio = makeAudio();
		const first = makeTarget();
		const second = makeTarget();
		let current = first;
		const preset = spyPreset();
		const controller = new AudioVisualizerController({ getMedia: () => audio, getTarget: () => current, preset });
		controllers.push(controller);
		controller.attach();
		current = second;
		controller.attach();
		expect(preset.destroy).toHaveBeenCalledOnce();
		expect(preset.mount.mock.calls.map(([element]) => element)).toEqual([first, second]);
	});

	describe('getEnabled and refresh', () => {
		it('draws nothing while getEnabled is false and runs on the next play once it is true', async () => {
			const audio = makeAudio();
			let enabled = false;
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset, { getEnabled: () => enabled });
			controller.attach();
			await audio.play();
			await frames(3);
			expect(preset.draw).not.toHaveBeenCalled();
			expect(controller.getState()).toBe('idle');

			enabled = true;
			audio.pause();
			await audio.play();
			await preset.called('draw');

			enabled = false;
			await whenState(controller, 'idle');
		});

		it('starts on attach() or refresh() when getEnabled turns true while the media plays', async () => {
			const audio = makeAudio();
			let enabled = true;
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset, { getEnabled: () => enabled });
			controller.attach();
			await audio.play();
			await whenState(controller, 'running');
			enabled = false;
			await whenState(controller, 'idle');

			enabled = true;
			controller.attach();
			await whenState(controller, 'running');

			enabled = false;
			controller.refresh();
			expect(controller.getState()).toBe('idle');
			const drawn = drawCount(preset);
			await frames(3);
			expect(drawCount(preset)).toBe(drawn);

			enabled = true;
			controller.refresh();
			await whenState(controller, 'running');
		});

		it('picks up a media element and a target the host rendered late', async () => {
			const audio = makeAudio();
			let renderedMedia: HTMLMediaElement | null = null;
			let renderedTarget: HTMLElement | null = null;
			const preset = spyPreset();
			const controller = new AudioVisualizerController({
				getMedia: () => renderedMedia,
				getTarget: () => renderedTarget,
				preset,
			});
			controllers.push(controller);
			controller.attach();
			controller.refresh();
			expect(preset.mount).not.toHaveBeenCalled();

			renderedMedia = audio;
			renderedTarget = makeTarget();
			await audio.play();
			controller.refresh();
			expect(preset.mount).toHaveBeenCalledWith(renderedTarget);
			await preset.called('draw');
			expect(controller.getState()).toBe('running');
		});
	});

	describe('onState', () => {
		it('is called on transitions only: play, pause, emptied and resume, never per frame', async () => {
			const audio = makeAudio();
			const seen: AudioVisualizerState[] = [];
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset, { onState: (state) => seen.push(state) });
			controller.attach();
			expect(seen).toEqual([]);

			await audio.play();
			await untilState(controller, () => JSON.stringify(seen) === JSON.stringify(['running']));
			const drawn = await settled(preset);
			expect(drawn).toBeGreaterThan(1);
			expect(seen).toEqual(['running']);

			audio.dispatchEvent(new Event('emptied'));
			expect(seen).toEqual(['running', 'idle']);

			audio.dispatchEvent(new Event('play'));
			await untilState(controller, () => JSON.stringify(seen) === JSON.stringify(['running', 'idle', 'running']));
			audio.pause();
			await untilState(
				controller,
				() => JSON.stringify(seen) === JSON.stringify(['running', 'idle', 'running', 'idle']),
			);
		});

		it('is called when a suspended context is resumed from a gesture', async () => {
			const module = await loadWithFakeContext('suspended', 'stay');
			const audio = makeAudio();
			const seen: AudioVisualizerState[] = [];
			const controller = make(
				audio,
				makeTarget(),
				spyPreset(),
				{ onState: (state) => seen.push(state) },
				module.AudioVisualizerController,
			);
			controller.attach();
			audio.play().catch(() => undefined);
			await frames(3);
			expect(seen).toEqual([]);

			FakeContext.instances[0].setState('running');
			await untilState(controller, () => JSON.stringify(seen) === JSON.stringify(['running']));
		});

		it('is called with reduced when the preference turns on', async () => {
			const query = new FakeMotionQuery(false);
			vi.stubGlobal('matchMedia', () => query);
			const seen: AudioVisualizerState[] = [];
			const controller = make(makeAudio(), makeTarget(), spyPreset(), { onState: (state) => seen.push(state) });
			controller.attach();

			query.set(true);

			expect(seen).toEqual(['reduced']);
		});
	});

	describe('lifecycle', () => {
		it('refresh() after destroy() does not attach again, so a later play draws nothing and no listener lives on', async () => {
			const audio = makeAudio();
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset);
			controller.attach();
			controller.destroy();
			expect(preset.mount).toHaveBeenCalledOnce();

			controller.refresh();
			await audio.play();
			await frames(3);

			expect(controller.getState()).toBe('idle');
			expect(preset.mount).toHaveBeenCalledOnce();
			expect(preset.draw).not.toHaveBeenCalled();
		});

		it('refresh() before the first attach() does nothing, and a destroyed controller attaches again with attach()', async () => {
			const audio = makeAudio();
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset);
			controller.refresh();
			expect(preset.mount).not.toHaveBeenCalled();

			controller.attach();
			controller.destroy();
			controller.attach();
			await audio.play();
			await whenState(controller, 'running');
		});
	});

	describe('routing', () => {
		it('reports opaque when an element visualized before gets a cross-origin source without CORS', async () => {
			const audio = makeAudio();
			const preset = spyPreset();
			const seen: AudioVisualizerState[] = [];
			const controller = make(audio, makeTarget(), preset, { onState: (state) => seen.push(state) });
			controller.attach();
			await audio.play();
			await whenState(controller, 'running');

			seen.length = 0;
			audio.pause();
			audio.src = 'http://127.0.0.1:1/next.wav';
			audio.play().catch(() => undefined);
			await untilState(controller, () => seen.includes('opaque'));

			audio.pause();
			audio.src = toneUrl();
			audio.play().catch(() => undefined);
			await whenState(controller, 'running');
		});

		it('reports opaque for a silent cross-origin element even when there is no target to draw into', async () => {
			const opaque = new Audio();
			opaque.src = 'http://127.0.0.1:1/tone.wav';
			media.push(opaque);
			const controller = make(opaque, null, spyPreset());
			controller.attach();
			opaque.play().catch(() => undefined);

			await whenState(controller, 'opaque');
		});

		it('connects the source straight to the speakers and keeps it there when the last controller is destroyed', async () => {
			const audio = makeAudio();
			const create = vi.spyOn(AudioContext.prototype, 'createMediaElementSource');
			const connect = vi.spyOn(MediaElementAudioSourceNode.prototype, 'connect');
			const disconnect = vi.spyOn(MediaElementAudioSourceNode.prototype, 'disconnect');
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset);
			controller.attach();
			await audio.play();
			await whenState(controller, 'running');

			const context = create.mock.contexts[0] as AudioContext;
			expect(connect.mock.calls.some(([node]) => (node as unknown) === context.destination)).toBe(true);

			controller.destroy();
			expect(context.state).toBe('running');
			expect(audio.paused).toBe(false);
			expect(disconnect.mock.calls.every(([node]) => node instanceof AnalyserNode)).toBe(true);
			await frames(3);
			expect(context.state).toBe('running');
		});

		it('gives each controller its own analyser, shares one context and one source, and releases only its own', async () => {
			const audio = makeAudio();
			const create = vi.spyOn(AudioContext.prototype, 'createMediaElementSource');
			const analysers = vi.spyOn(AudioContext.prototype, 'createAnalyser');
			const disconnect = vi.spyOn(MediaElementAudioSourceNode.prototype, 'disconnect');
			const first = spyPreset();
			const second = spyPreset();
			const a = make(audio, makeTarget(), first);
			const b = make(audio, makeTarget(), second);
			a.attach();
			b.attach();
			await audio.play();
			await first.called('draw');
			await second.called('draw');
			expect(create).toHaveBeenCalledOnce();
			expect(analysers).toHaveBeenCalledTimes(2);
			const context = create.mock.contexts[0] as AudioContext;

			a.destroy();
			expect(disconnect).toHaveBeenCalledOnce();
			expect(context.state).toBe('running');
			expect(await settled(second)).toBeGreaterThan(0);

			b.destroy();
			expect(disconnect).toHaveBeenCalledTimes(2);
			expect(context.state).toBe('running');

			const c = make(audio, makeTarget(), spyPreset());
			c.attach();
			await whenState(c, 'running');
			expect(create).toHaveBeenCalledOnce();
		});

		it('keeps one source node when the element moves to another parent', async () => {
			const audio = makeAudio();
			const create = vi.spyOn(AudioContext.prototype, 'createMediaElementSource');
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset);
			controller.attach();
			await audio.play();
			await preset.called('draw');

			const elsewhere = document.createElement('section');
			document.body.append(elsewhere);
			elsewhere.append(audio);
			await frames(3);
			expect(controller.getState()).toBe('running');

			audio.remove();
			await whenState(controller, 'idle');
			elsewhere.append(audio);
			await audio.play();
			await whenState(controller, 'running');
			expect(create).toHaveBeenCalledOnce();
		});

		it('stays idle when the element already has a source node from other code', async () => {
			const audio = makeAudio();
			new AudioContext().createMediaElementSource(audio);
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset);
			controller.attach();
			await audio.play();
			await frames(2);
			expect(controller.getState()).toBe('idle');
			expect(preset.draw).not.toHaveBeenCalled();
		});

		it('builds no graph for cross-origin media without crossorigin, and does with it', async () => {
			const create = vi.spyOn(AudioContext.prototype, 'createMediaElementSource');
			const remote = 'http://127.0.0.1:1/tone.wav';

			const opaque = new Audio();
			opaque.src = remote;
			media.push(opaque);
			const opaquePreset = spyPreset();
			const opaqueController = make(opaque, makeTarget(), opaquePreset);
			opaqueController.attach();
			opaque.play().catch(() => undefined);
			await frames(5);
			expect(create).not.toHaveBeenCalled();
			expect(opaqueController.getState()).toBe('opaque');
			expect(opaquePreset.draw).not.toHaveBeenCalled();

			const cors = new Audio();
			cors.crossOrigin = 'anonymous';
			cors.src = remote;
			media.push(cors);
			const corsController = make(cors, makeTarget(), spyPreset());
			corsController.attach();
			const played = once(cors, 'play');
			cors.play().catch(() => undefined);
			await played;
			expect(create).toHaveBeenCalledOnce();
		});

		it('treats a data URL as same-origin', async () => {
			const create = vi.spyOn(AudioContext.prototype, 'createMediaElementSource');
			const audio = new Audio();
			audio.src = 'data:audio/wav;base64,AAAA';
			media.push(audio);
			make(audio, makeTarget(), spyPreset()).attach();
			const played = once(audio, 'play');
			audio.play().catch(() => undefined);
			await played;
			expect(create).toHaveBeenCalledOnce();
		});
	});

	describe('context states', () => {
		async function withFake(initial: string, mode: typeof FakeContext.resumeMode = 'run') {
			const mod = await loadWithFakeContext(initial, mode);
			const audio = makeAudio();
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset, {}, mod.AudioVisualizerController);
			controller.attach();
			return { audio, preset, controller, context: () => FakeContext.instances[0] };
		}

		it('stays idle and builds no source while the context does not start, leaving the media playing', async () => {
			const { audio, preset, controller, context } = await withFake('suspended', 'pend');
			await audio.play();
			await frames(3);
			expect(context().resumes).toBe(1);
			expect(controller.getState()).toBe('idle');
			expect(context().sources).toHaveLength(0);
			expect(preset.draw).not.toHaveBeenCalled();
			expect(audio.paused).toBe(false);

			context().setState('running');
			await whenState(controller, 'running');
			expect(context().sources).toHaveLength(1);
			expect(context().sources[0].connect).toHaveBeenCalledWith(context().destination);
		});

		it('stays idle when resume() resolves without running, and tries again on the next play', async () => {
			const { audio, controller, context } = await withFake('suspended', 'stay');
			await audio.play();
			await frames(3);
			expect(controller.getState()).toBe('idle');
			expect(context().sources).toHaveLength(0);
			expect(context().resumes).toBe(1);

			audio.pause();
			await audio.play();
			await frames(3);
			expect(context().resumes).toBe(2);
		});

		it('stays idle when resume() rejects, without throwing, and tries again on the next play', async () => {
			const { audio, controller, context } = await withFake('suspended', 'fail');
			await audio.play();
			await frames(3);
			expect(controller.getState()).toBe('idle');
			expect(context().sources).toHaveLength(0);

			FakeContext.resumeMode = 'run';
			audio.pause();
			await audio.play();
			await whenState(controller, 'running');
		});

		it('asks the context to resume on volumechange even while an earlier resume never settled, as Chrome leaves one before a gesture', async () => {
			const { audio, controller, context } = await withFake('suspended', 'pend');
			await audio.play();
			await frames(2);
			expect(context().resumes).toBe(1);

			audio.dispatchEvent(new Event('volumechange'));
			await frames(2);
			expect(context().resumes).toBe(2);
			expect(controller.getState()).toBe('idle');

			context().state = 'running';
			context().pending.forEach((resolve) => resolve());
			audio.dispatchEvent(new Event('volumechange'));
			await whenState(controller, 'running');
		});

		it('starts the loop when resume() is called from a gesture, and builds nothing before', async () => {
			const { audio, controller, context } = await withFake('suspended', 'pend');
			await audio.play();
			await frames(2);
			expect(context().sources).toHaveLength(0);

			controller.resume();
			expect(context().resumes).toBe(2);
			context().state = 'running';
			context().pending.forEach((resolve) => resolve());
			await whenState(controller, 'running');
			expect(context().sources).toHaveLength(1);
		});

		it('resume() before the media plays creates and resumes the context, so a later play can start at once', async () => {
			const { audio, controller, context } = await withFake('suspended', 'run');
			controller.resume();
			expect(context().resumes).toBe(1);
			await audio.play();
			await whenState(controller, 'running');
			expect(context().resumes).toBe(1);
		});

		it('resume() does nothing after destroy()', async () => {
			const { controller, context } = await withFake('suspended', 'run');
			controller.destroy();
			controller.resume();
			expect(context()).toBeUndefined();
		});

		it('asks the context to resume again on a new play even while an earlier resume is still pending', async () => {
			const { audio, controller, context } = await withFake('suspended', 'pend');
			await audio.play();
			await frames(2);
			expect(context().resumes).toBe(1);

			audio.pause();
			await audio.play();
			await frames(2);
			expect(context().resumes).toBe(2);
			expect(controller.getState()).toBe('idle');

			context().setState('running');
			await whenState(controller, 'running');
		});

		it('stops the loop when the context is suspended or interrupted and restarts when it runs again', async () => {
			const { audio, preset, controller, context } = await withFake('running');
			await audio.play();
			await whenState(controller, 'running');

			context().setState('suspended');
			expect(controller.getState()).toBe('idle');
			expect(preset.rest).toHaveBeenCalled();
			expect(await settled(preset)).toBe(0);

			context().setState('running');
			await whenState(controller, 'running');
			expect(context().sources).toHaveLength(1);

			context().setState('interrupted');
			expect(controller.getState()).toBe('idle');
		});

		it('does not restart on a state change while the media is paused', async () => {
			const { audio, controller, context } = await withFake('running');
			await audio.play();
			await whenState(controller, 'running');
			audio.pause();
			await whenState(controller, 'idle');

			context().setState('suspended');
			context().setState('running');
			expect(controller.getState()).toBe('idle');
		});

		it('ignores a late resume after destroy', async () => {
			const { audio, preset, controller, context } = await withFake('suspended', 'pend');
			await audio.play();
			await frames(2);
			controller.destroy();

			context().state = 'running';
			context().pending.forEach((resolve) => resolve());
			context().setState('running');
			await frames(3);
			expect(context().sources).toHaveLength(0);
			expect(preset.draw).not.toHaveBeenCalled();
		});

		it('stops listening to the context state after destroy', async () => {
			const { audio, controller, context } = await withFake('running');
			await audio.play();
			await whenState(controller, 'running');
			controller.destroy();
			context().setState('suspended');
			context().setState('running');
			expect(context().analysers).toHaveLength(1);
		});

		it('stays idle without throwing when the context cannot be created, and tries again on the next play', async () => {
			const mod = await loadWithFakeContext('running');
			FakeContext.failToCreate = true;
			const audio = makeAudio();
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset, {}, mod.AudioVisualizerController);
			controller.attach();
			await audio.play();
			await frames(3);
			expect(controller.getState()).toBe('idle');
			expect(preset.draw).not.toHaveBeenCalled();

			FakeContext.failToCreate = false;
			audio.pause();
			await audio.play();
			await whenState(controller, 'running');
		});
	});

	it('rests, stops, and runs one loop again after the source changes while playing', async () => {
		const audio = makeAudio();
		const preset = spyPreset();
		const controller = make(audio, makeTarget(), preset);
		controller.attach();
		await audio.play();
		await preset.called('draw');

		audio.removeAttribute('src');
		audio.load();
		await whenState(controller, 'idle');
		expect(preset.rest).toHaveBeenCalled();
		expect(await settled(preset)).toBe(0);

		audio.src = toneUrl();
		await audio.play();
		await whenState(controller, 'running');
	});

	it('keeps one loop for the event order play, abort, emptied, play', async () => {
		const audio = makeAudio();
		const preset = spyPreset();
		make(audio, makeTarget(), preset).attach();
		await audio.play();
		await preset.called('draw');

		for (const type of ['play', 'abort', 'emptied', 'play']) {
			audio.dispatchEvent(new Event(type));
		}
		await preset.called('rest');
		const drawn = await settled(preset);
		expect(drawn).toBeGreaterThan(0);
		expect(drawn).toBeLessThanOrEqual(4);
	});

	it('works with a video element and with media that has no audio track', async () => {
		const video = document.createElement('video');
		video.loop = true;
		video.src = toneUrl();
		document.body.append(video);
		media.push(video);
		const preset = spyPreset();
		make(video, makeTarget(), preset).attach();
		await video.play();
		await preset.called('draw');

		const canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 16;
		canvas.getContext('2d')!.fillRect(0, 0, 4, 4);
		const silent = document.createElement('video');
		silent.muted = true;
		silent.srcObject = canvas.captureStream(10);
		document.body.append(silent);
		media.push(silent);
		const silentPreset = spyPreset();
		make(silent, makeTarget(), silentPreset).attach();
		await silent.play();
		await silentPreset.called('draw');
		const frame = silentPreset.draw.mock.calls[0][0];
		expect(frame.frequency.every((value) => value === 0)).toBe(true);
	});

	describe('setPreset', () => {
		it('swaps while running: the old preset is rested and destroyed once, the new one mounted and drawn', async () => {
			const audio = makeAudio();
			const target = makeTarget();
			const first = spyPreset();
			const second = spyPreset({ fftSize: 2048 });
			const controller = make(audio, target, first);
			controller.attach();
			await audio.play();
			await first.called('draw');

			controller.setPreset(second);
			expect(first.destroy).toHaveBeenCalledOnce();
			expect(second.mount).toHaveBeenCalledWith(target);
			await second.called('draw');
			const frame = second.draw.mock.calls.at(-1)![0];
			expect(frame.fftSize).toBe(2048);
			expect(frame.frequency).toHaveLength(1024);
			const firstDraws = drawCount(first);
			await frames(3);
			expect(drawCount(first)).toBe(firstDraws);
		});

		it('swaps at rest without drawing, and before attach only chooses the preset', () => {
			const audio = makeAudio();
			const first = spyPreset();
			const second = spyPreset();
			const third = spyPreset();
			const controller = make(audio, makeTarget(), first);
			controller.setPreset(second);
			expect(first.destroy).not.toHaveBeenCalled();
			expect(second.mount).not.toHaveBeenCalled();

			controller.attach();
			expect(first.mount).not.toHaveBeenCalled();
			expect(second.mount).toHaveBeenCalledOnce();
			controller.setPreset(third);
			expect(second.destroy).toHaveBeenCalledOnce();
			expect(third.mount).toHaveBeenCalledOnce();
			expect(third.draw).not.toHaveBeenCalled();
			controller.setPreset(third);
			expect(third.mount).toHaveBeenCalledOnce();
		});

		it('leaves one canvas and releases the observer after rapid swaps, and none after destroy', async () => {
			const audio = makeAudio();
			const target = makeTarget();
			const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect');
			const controller = make(audio, target, wave());
			controller.attach();
			await audio.play();
			await whenState(controller, 'running');

			for (let round = 0; round < 6; round++) {
				controller.setPreset(round % 2 ? wave({ fill: true }) : bars({ mode: 'canvas' }));
				expect(target.querySelectorAll('canvas')).toHaveLength(1);
			}
			expect(disconnect).toHaveBeenCalledTimes(6);
			controller.destroy();
			expect(target.querySelectorAll('canvas')).toHaveLength(0);
			expect(disconnect).toHaveBeenCalledTimes(7);
		});

		it('gives two controllers with different presets on one element their own frame size and smoothing', async () => {
			const audio = makeAudio();
			const small = spyPreset({ fftSize: 512 });
			const large = spyPreset({ fftSize: 2048 });
			const plain = spyPreset();
			make(audio, makeTarget(), small).attach();
			make(audio, makeTarget(), large).attach();
			make(audio, makeTarget(), plain).attach();
			await audio.play();
			for (const preset of [small, large, plain]) {
				await preset.called('draw');
			}
			await frames(3);

			const sizes = [small, large, plain].map((preset) => {
				const frame = preset.draw.mock.calls.at(-1)![0];
				expect(frame.frequency).toHaveLength(frame.fftSize / 2);
				expect(frame.waveform).toHaveLength(frame.fftSize);
				return frame.fftSize;
			});
			expect(sizes).toEqual([512, 2048, 1024]);
		});

		it('applies the fftSize and smoothing a preset option sets', async () => {
			const audio = makeAudio();
			const analysers = vi.spyOn(AudioContext.prototype, 'createAnalyser');
			const controller = make(audio, makeTarget(), bars({ mode: 'dom', fftSize: 256, smoothing: 0.2 }));
			controller.attach();
			await audio.play();
			await whenState(controller, 'running');
			const analyser = analysers.mock.results[0].value as AnalyserNode;
			expect(analyser.fftSize).toBe(256);
			expect(analyser.smoothingTimeConstant).toBeCloseTo(0.2);
		});
	});

	describe('reduced motion', () => {
		function stubMotion(matches: boolean) {
			const query = new FakeMotionQuery(matches);
			vi.stubGlobal('matchMedia', () => query);
			return query;
		}

		it('never starts the loop or the graph and keeps the preset at rest', async () => {
			stubMotion(true);
			const create = vi.spyOn(AudioContext.prototype, 'createMediaElementSource');
			const audio = makeAudio();
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset);
			controller.attach();
			expect(controller.getState()).toBe('reduced');
			await audio.play();
			await frames(3);
			expect(preset.draw).not.toHaveBeenCalled();
			expect(preset.rest).toHaveBeenCalled();
			expect(create).not.toHaveBeenCalled();
			expect(controller.getState()).toBe('reduced');
		});

		it('follows the preference while attached', async () => {
			const query = stubMotion(false);
			const audio = makeAudio();
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset);
			controller.attach();
			await audio.play();
			await whenState(controller, 'running');

			query.set(true);
			expect(controller.getState()).toBe('reduced');
			expect(await settled(preset)).toBe(0);

			query.set(false);
			await whenState(controller, 'running');
		});

		it('shows reduced over opaque for a silent cross-origin element', async () => {
			stubMotion(true);
			const opaque = new Audio();
			opaque.src = 'http://127.0.0.1:1/tone.wav';
			media.push(opaque);
			const controller = make(opaque, makeTarget(), spyPreset());
			controller.attach();
			opaque.play().catch(() => undefined);
			await frames(5);

			expect(controller.getState()).toBe('reduced');
		});

		it('stops listening to the preference after destroy', async () => {
			const query = stubMotion(false);
			const audio = makeAudio();
			const preset = spyPreset();
			const controller = make(audio, makeTarget(), preset);
			controller.attach();
			await audio.play();
			await whenState(controller, 'running');
			controller.destroy();

			const reads = query.reads;
			query.set(true);
			query.set(false);
			expect(query.reads).toBe(reads);
		});
	});

	describe('construction', () => {
		it('touches no getter, window API or audio API until attach', () => {
			const getMedia = vi.fn(() => {
				throw new Error('getMedia');
			});
			const getTarget = vi.fn(() => {
				throw new Error('getTarget');
			});
			const context = vi.spyOn(window, 'AudioContext');
			const query = vi.spyOn(window, 'matchMedia');
			const connected: Array<() => void> = [];
			const cleanup: Array<() => void> = [];

			const controller = createAudioVisualizerController(
				{
					registerConnectedCallback: (callback) => connected.push(callback),
					registerCleanupCallback: (callback) => cleanup.push(callback),
				},
				{ getMedia, getTarget, preset: spyPreset() },
			);

			expect(controller.getState()).toBe('idle');
			expect(getMedia).not.toHaveBeenCalled();
			expect(getTarget).not.toHaveBeenCalled();
			expect(context).not.toHaveBeenCalled();
			expect(query).not.toHaveBeenCalled();
			expect(connected).toHaveLength(1);
			expect(cleanup).toHaveLength(1);
			expect(() => cleanup[0]()).not.toThrow();
		});

		it('is bound to a host by its factory', async () => {
			const audio = makeAudio();
			const preset = spyPreset();
			const connected: Array<() => void> = [];
			const cleanup: Array<() => void> = [];
			createAudioVisualizerController(
				{
					registerConnectedCallback: (callback) => connected.push(callback),
					registerCleanupCallback: (callback) => cleanup.push(callback),
				},
				{ getMedia: () => audio, getTarget: () => makeTarget(), preset },
			);
			connected.forEach((callback) => callback());
			await audio.play();
			await preset.called('draw');
			cleanup.forEach((callback) => callback());
			expect(preset.destroy).toHaveBeenCalledOnce();
		});
	});

	it('survives a preset whose target is removed from the document while running', async () => {
		const audio = makeAudio();
		const target = makeTarget();
		const controller = make(audio, target, wave());
		controller.attach();
		await audio.play();
		await whenState(controller, 'running');
		target.remove();
		await frames(3);
		expect(controller.getState()).toBe('running');
		expect(() => controller.destroy()).not.toThrow();
		expect(target.querySelectorAll('canvas')).toHaveLength(0);
	});
});
