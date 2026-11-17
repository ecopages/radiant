import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createWaiters, nothingFollows } from './event.fixture';
import { AudioVisualizerController, type AudioFrame, type AudioVisualizerPreset } from './audio-visualizer-controller';

/**
 * Runs with Chromium's fake capture device (`--use-fake-device-for-media-stream`), which answers `getUserMedia` with
 * a repeating beep and needs no permission.
 */

type Recorder = AudioVisualizerPreset & {
	calls: string[];
	loudest: number;
	reached: (predicate: () => boolean) => Promise<void>;
};

/**
 * A preset whose `reached` resolves from its own calls, re-checking `predicate` on each one.
 *
 * @remarks A controller that is running draws every frame, and one that went idle calls `rest`, so a state
 * change shows in the preset's calls without polling the controller.
 */
function recorder(): Recorder {
	const calls: string[] = [];
	const { notify, until: reached } = createWaiters();
	const record = (call: string) => {
		calls.push(call);
		notify();
	};
	const preset: Recorder = {
		calls,
		loudest: 0,
		mount: () => record('mount'),
		draw(frame: AudioFrame) {
			preset.loudest = Math.max(preset.loudest, ...frame.frequency);
			record('draw');
		},
		rest: () => record('rest'),
		destroy: () => record('destroy'),
		reached,
	};
	return preset;
}

const microphone = () => navigator.mediaDevices.getUserMedia({ audio: true });
const gesture = async () => {
	const button = document.createElement('button');
	document.body.append(button);
	await userEvent.click(button);
};

const streams: MediaStream[] = [];
async function open(): Promise<MediaStream> {
	const stream = await microphone();
	streams.push(stream);
	return stream;
}

afterEach(() => {
	vi.restoreAllMocks();
	streams.splice(0).forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
	document.body.replaceChildren();
});

describe('AudioVisualizerController with a MediaStream', () => {
	it('draws frames that follow a microphone stream', async () => {
		const stream = await open();
		const preset = recorder();
		const controller = new AudioVisualizerController({
			getStream: () => stream,
			getTarget: () => document.body,
			preset,
		});
		await gesture();
		controller.attach();
		controller.resume();

		await preset.reached(() => controller.getState() === 'running');
		await preset.reached(() => preset.loudest > 20);
		await preset.reached(() => preset.calls.filter((call) => call === 'draw').length > 3);
		controller.destroy();
	});

	it('connects the stream source to the analyser and never to the speakers', async () => {
		const stream = await open();
		const connected: Array<{ from: unknown; to: unknown }> = [];
		const connect = AudioNode.prototype.connect;
		vi.spyOn(AudioNode.prototype, 'connect').mockImplementation(function (this: AudioNode, ...args: unknown[]) {
			connected.push({ from: this, to: args[0] });
			return (connect as (...parameters: unknown[]) => unknown).apply(this, args) as AudioNode;
		} as typeof connect);
		const sources: AudioNode[] = [];
		const create = AudioContext.prototype.createMediaStreamSource;
		vi.spyOn(AudioContext.prototype, 'createMediaStreamSource').mockImplementation(function (
			this: AudioContext,
			input: MediaStream,
		) {
			const node = create.call(this, input);
			sources.push(node);
			return node;
		});
		const preset = recorder();
		const controller = new AudioVisualizerController({
			getStream: () => stream,
			getTarget: () => document.body,
			preset,
		});
		await gesture();
		controller.attach();
		controller.resume();
		await preset.reached(() => controller.getState() === 'running');

		expect(sources).toHaveLength(1);
		const fromSource = connected.filter((link) => link.from === sources[0]);
		expect(fromSource).toHaveLength(1);
		expect(fromSource[0].to).toBeInstanceOf(AnalyserNode);
		expect(connected.some((link) => link.to instanceof AudioDestinationNode)).toBe(false);
		controller.destroy();
	});

	it('switches to a replacement stream on refresh, and disconnects the old source', async () => {
		const first = await open();
		const second = await open();
		let current: MediaStream | null = first;
		const made: Array<{ input: MediaStream; node: AudioNode }> = [];
		const create = AudioContext.prototype.createMediaStreamSource;
		vi.spyOn(AudioContext.prototype, 'createMediaStreamSource').mockImplementation(function (
			this: AudioContext,
			input: MediaStream,
		) {
			const node = create.call(this, input);
			vi.spyOn(node, 'disconnect');
			made.push({ input, node });
			return node;
		});
		const preset = recorder();
		const controller = new AudioVisualizerController({
			getStream: () => current,
			getTarget: () => document.body,
			preset,
		});
		await gesture();
		controller.attach();
		controller.resume();
		await preset.reached(() => controller.getState() === 'running');

		current = second;
		controller.refresh();

		await preset.reached(() => made.length === 2);
		expect(made.map((entry) => entry.input)).toEqual([first, second]);
		expect(made[0].node.disconnect).toHaveBeenCalled();
		expect(preset.calls).toContain('rest');
		await preset.reached(() => controller.getState() === 'running');
		controller.destroy();
	});

	it('shows the preset at rest while the getter returns null, and starts when a stream arrives', async () => {
		let current: MediaStream | null = null;
		const preset = recorder();
		const controller = new AudioVisualizerController({
			getStream: () => current,
			getTarget: () => document.body,
			preset,
		});
		await gesture();
		controller.attach();
		controller.resume();

		expect(controller.getState()).toBe('idle');
		expect(preset.calls).toEqual(['mount']);

		current = await open();
		controller.refresh();
		controller.resume();
		await preset.reached(() => controller.getState() === 'running');

		current = null;
		controller.refresh();

		expect(controller.getState()).toBe('idle');
		expect(preset.calls.at(-1)).toBe('rest');
		const drawn = preset.calls.filter((call) => call === 'draw').length;
		await nothingFollows('a draw after the loop stopped');
		expect(preset.calls.filter((call) => call === 'draw')).toHaveLength(drawn);
		controller.destroy();
	});

	it('leaves the tracks live and the shared context running when it is destroyed', async () => {
		const stream = await open();
		const close = vi.spyOn(AudioContext.prototype, 'close');
		const preset = recorder();
		const controller = new AudioVisualizerController({
			getStream: () => stream,
			getTarget: () => document.body,
			preset,
		});
		await gesture();
		controller.attach();
		controller.resume();
		await preset.reached(() => controller.getState() === 'running');

		controller.destroy();

		expect(controller.getState()).toBe('idle');
		expect(stream.getTracks().length).toBeGreaterThan(0);
		expect(stream.getTracks().every((track) => track.readyState === 'live')).toBe(true);
		expect(close).not.toHaveBeenCalled();
	});

	it('stops the loop and reports idle once the host stopped the tracks, and starts again with a live stream', async () => {
		const stopped = await open();
		const preset = recorder();
		let current: MediaStream | null = stopped;
		const states: string[] = [];
		const controller = new AudioVisualizerController({
			getStream: () => current,
			getTarget: () => document.body,
			preset,
			onState: (state) => states.push(state),
		});
		await gesture();
		controller.attach();
		controller.resume();
		await preset.reached(() => controller.getState() === 'running');

		stopped.getTracks().forEach((track) => track.stop());
		await preset.reached(() => controller.getState() === 'idle');
		const drawn = preset.calls.filter((call) => call === 'draw').length;
		await nothingFollows('a draw after the loop stopped');
		expect(preset.calls.filter((call) => call === 'draw')).toHaveLength(drawn);
		controller.refresh();
		expect(controller.getState()).toBe('idle');

		current = await open();
		controller.refresh();
		await preset.reached(() => controller.getState() === 'running');
		expect(states).toEqual(['running', 'idle', 'running']);
		controller.destroy();
	});

	it('reports idle and builds no source for a stream without an audio track', async () => {
		const create = vi.spyOn(AudioContext.prototype, 'createMediaStreamSource');
		const controller = new AudioVisualizerController({
			getStream: () => new MediaStream(),
			getTarget: () => document.body,
			preset: recorder(),
		});
		await gesture();
		controller.attach();
		controller.resume();
		controller.refresh();
		await nothingFollows('a source built for a stream with no audio track');

		expect(controller.getState()).toBe('idle');
		expect(create).not.toHaveBeenCalled();
		controller.destroy();
	});

	it('refuses a configuration with both a media element and a stream when it is compiled', () => {
		const config = {
			getTarget: () => document.body,
			preset: recorder(),
		};
		// @ts-expect-error one source only
		new AudioVisualizerController({ ...config, getMedia: () => null, getStream: () => null });
		// @ts-expect-error one source at least
		new AudioVisualizerController({ ...config });
	});
});

describe('AudioVisualizerController with a media element, unchanged', () => {
	it('still routes the element to the speakers and an analyser of its own', async () => {
		const connected: Array<{ from: unknown; to: unknown }> = [];
		const connect = AudioNode.prototype.connect;
		vi.spyOn(AudioNode.prototype, 'connect').mockImplementation(function (this: AudioNode, ...args: unknown[]) {
			connected.push({ from: this, to: args[0] });
			return (connect as (...parameters: unknown[]) => unknown).apply(this, args) as AudioNode;
		} as typeof connect);
		const audio = document.createElement('audio');
		audio.loop = true;
		const context = new AudioContext();
		const destination = context.createMediaStreamDestination();
		const oscillator = context.createOscillator();
		oscillator.connect(destination);
		oscillator.start();
		audio.srcObject = destination.stream;
		document.body.append(audio);
		const preset = recorder();
		const controller = new AudioVisualizerController({
			getMedia: () => audio,
			getTarget: () => document.body,
			preset,
		});
		await gesture();
		controller.attach();
		controller.resume();
		await audio.play();

		await preset.reached(() => controller.getState() === 'running');
		expect(connected.some((link) => link.to instanceof AudioDestinationNode)).toBe(true);
		expect(connected.some((link) => link.to instanceof AnalyserNode)).toBe(true);
		controller.destroy();
		oscillator.stop();
		await context.close();
	});
});
