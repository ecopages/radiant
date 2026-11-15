import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ControllerHost } from './controller';
import {
	MediaRecorderController,
	createMediaRecorderController,
	type MediaRecorderControllerConfig,
	type MediaRecorderSnapshot,
} from './media-recorder-controller';

/** Runs in the `media` vitest project, whose Chromium has a fake microphone and camera and auto-grants the prompt. */
describe('MediaRecorderController', () => {
	const controllers: MediaRecorderController[] = [];

	afterEach(() => {
		controllers.splice(0).forEach((controller) => controller.destroy());
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	function create(config: MediaRecorderControllerConfig = {}): MediaRecorderController {
		const controller = new MediaRecorderController(config);
		controllers.push(controller);
		controller.attach();
		return controller;
	}

	function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	it('records, then stop resolves with a playable result and stops every track', async () => {
		const onStop = vi.fn();
		const controller = create({ onStop });

		await controller.start();
		expect(controller.getState().status).toBe('recording');
		const stream = controller.getStream()!;
		expect(stream.getAudioTracks()).toHaveLength(1);
		await sleep(300);

		const result = (await controller.stop())!;

		expect(controller.getState().status).toBe('stopped');
		expect(result.blob.size).toBeGreaterThan(0);
		expect(result.url.startsWith('blob:')).toBe(true);
		expect(result.mimeType).toContain('audio/');
		expect(result.duration).toBeGreaterThanOrEqual(0.25);
		expect(onStop).toHaveBeenCalledWith(result);
		expect(stream.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
		expect(controller.getStream()).toBeNull();
	});

	it('resolves the first supported mime type of the preference list', async () => {
		const controller = create({ mimeTypes: ['video/x-not-a-format', 'audio/webm', 'audio/ogg'] });

		await controller.start();

		expect(controller.getState().mimeType).toContain('audio/webm');
	});

	it('falls back to the browser default when no listed mime type is supported', async () => {
		const controller = create({ mimeTypes: ['video/x-not-a-format'] });

		await controller.start();

		expect(controller.getState().status).toBe('recording');
		await sleep(200);
		const result = (await controller.stop())!;
		expect(result.mimeType).toContain('audio/');
		expect(controller.getState().mimeType).toBe(result.mimeType);
	});

	it('records video when the constraints ask for it, read from a getter on each start', async () => {
		const constraints = vi.fn(() => ({ audio: false, video: true }));
		const controller = create({ constraints });

		await controller.start();

		expect(constraints).toHaveBeenCalledTimes(1);
		expect(controller.getStream()!.getVideoTracks()).toHaveLength(1);
		expect(controller.getStream()!.getAudioTracks()).toHaveLength(0);
	});

	it('pauses and resumes, without counting paused time in the duration', async () => {
		const states: string[] = [];
		const controller = create({ onState: (snapshot) => states.push(snapshot.status) });
		await controller.start();
		await sleep(200);

		controller.pause();
		expect(controller.getState().status).toBe('paused');
		const frozen = controller.getState().duration;
		await sleep(300);
		expect(controller.getState().duration).toBe(frozen);

		controller.resume();
		expect(controller.getState().status).toBe('recording');
		await sleep(200);
		expect(controller.getState().duration).toBeGreaterThan(frozen);

		const result = (await controller.stop())!;
		expect(result.duration).toBeLessThan(0.65);
		expect(states).toEqual(expect.arrayContaining(['requesting', 'recording', 'paused', 'stopped']));
	});

	it('advances the duration through onState while recording', async () => {
		const durations: number[] = [];
		const controller = create({ onState: (snapshot) => durations.push(snapshot.duration) });
		await controller.start();

		await sleep(450);

		expect(durations.length).toBeGreaterThanOrEqual(4);
		expect(durations.at(-1)!).toBeGreaterThan(durations[1]);
	});

	it('delivers timesliced chunks to onData', async () => {
		const chunks: Blob[] = [];
		const controller = create({ timeslice: 100, onData: (chunk) => chunks.push(chunk) });
		await controller.start();

		await sleep(450);
		await controller.stop();

		expect(chunks.length).toBeGreaterThanOrEqual(2);
	});

	it('ignores a second start while recording and keeps the same stream', async () => {
		const getUserMedia = vi.fn((constraints: MediaStreamConstraints) =>
			navigator.mediaDevices.getUserMedia(constraints),
		);
		const controller = create({ getUserMedia });
		await controller.start();
		const stream = controller.getStream();

		await controller.start();

		expect(getUserMedia).toHaveBeenCalledTimes(1);
		expect(controller.getStream()).toBe(stream);
	});

	it('ignores a second start while the permission request is pending', async () => {
		const getUserMedia = vi.fn((constraints: MediaStreamConstraints) =>
			navigator.mediaDevices.getUserMedia(constraints),
		);
		const controller = create({ getUserMedia });

		const first = controller.start();
		const second = controller.start();
		await Promise.all([first, second]);

		expect(getUserMedia).toHaveBeenCalledTimes(1);
	});

	it('discards a recording: tracks stop, no result, back to idle', async () => {
		const onStop = vi.fn();
		const controller = create({ onStop });
		await controller.start();
		const stream = controller.getStream()!;

		controller.discard();

		expect(controller.getState()).toMatchObject({ status: 'idle', duration: 0 });
		expect(stream.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
		await sleep(100);
		expect(onStop).not.toHaveBeenCalled();
	});

	it('revokes the result url on discard, and on a new start', async () => {
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		const controller = create();
		await controller.start();
		const first = (await controller.stop())!;

		controller.discard();
		expect(revoke).toHaveBeenCalledWith(first.url);

		await controller.start();
		const second = (await controller.stop())!;
		revoke.mockClear();
		await controller.start();
		expect(revoke).toHaveBeenCalledWith(second.url);
	});

	it('revokes the result url and stops the device on destroy', async () => {
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		const controller = create();
		await controller.start();
		const result = (await controller.stop())!;
		await controller.start();
		const stream = controller.getStream()!;

		controller.destroy();

		expect(revoke).toHaveBeenCalledWith(result.url);
		expect(stream.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
		expect(controller.getState().status).toBe('idle');
	});

	it('stops the tracks when the host disconnects', async () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host: ControllerHost = {
			registerConnectedCallback: (callback) => connected.push(callback),
			registerCleanupCallback: (callback) => cleanup.push(callback),
		};
		const bound = createMediaRecorderController(host);
		controllers.push(bound);
		connected.forEach((callback) => callback());
		await bound.start();
		const stream = bound.getStream()!;

		cleanup.forEach((callback) => callback());

		expect(stream.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
	});

	it('is the denied state, not an exception, when the permission is refused', async () => {
		const onError = vi.fn();
		const controller = create({
			onError,
			getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
		});

		await expect(controller.start()).resolves.toBeUndefined();

		expect(controller.getState().status).toBe('denied');
		expect(controller.getStream()).toBeNull();
		expect(onError).not.toHaveBeenCalled();
	});

	it('is the error state with onError for any other getUserMedia failure', async () => {
		const failure = new DOMException('No device', 'NotFoundError');
		const onError = vi.fn();
		const controller = create({ onError, getUserMedia: () => Promise.reject(failure) });

		await controller.start();

		expect(controller.getState()).toMatchObject({ status: 'error', error: failure });
		expect(onError).toHaveBeenCalledWith(failure);
	});

	it('can start again after a denial', async () => {
		let allow = false;
		const controller = create({
			getUserMedia: (constraints) =>
				allow
					? navigator.mediaDevices.getUserMedia(constraints)
					: Promise.reject(new DOMException('no', 'NotAllowedError')),
		});
		await controller.start();
		expect(controller.getState().status).toBe('denied');

		allow = true;
		await controller.start();

		expect(controller.getState().status).toBe('recording');
	});

	it('is the unsupported state without MediaRecorder', async () => {
		vi.stubGlobal('MediaRecorder', undefined);
		const getUserMedia = vi.fn();
		const controller = create({ getUserMedia });

		await controller.start();

		expect(controller.getState().status).toBe('unsupported');
		expect(getUserMedia).not.toHaveBeenCalled();
	});

	it('stops by itself after maxDuration', async () => {
		const onStop = vi.fn();
		const controller = create({ maxDuration: 0.3, onStop });
		await controller.start();

		await vi.waitFor(() => expect(controller.getState().status).toBe('stopped'), { timeout: 2000 });

		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onStop.mock.calls[0][0].duration).toBeGreaterThanOrEqual(0.29);
		expect(onStop.mock.calls[0][0].duration).toBeLessThan(0.8);
	});

	it('does not count paused time toward maxDuration', async () => {
		const controller = create({ maxDuration: 0.5 });
		await controller.start();
		await sleep(150);
		controller.pause();
		await sleep(600);
		expect(controller.getState().status).toBe('paused');

		controller.resume();
		await sleep(150);
		expect(controller.getState().status).toBe('recording');

		await vi.waitFor(() => expect(controller.getState().status).toBe('stopped'), { timeout: 2000 });
	});

	it('keeps the state of two controllers apart', async () => {
		const first = create();
		const second = create();

		await first.start();

		expect(first.getState().status).toBe('recording');
		expect(second.getState().status).toBe('idle');
		expect(second.getStream()).toBeNull();

		await second.start();
		await first.stop();
		expect(first.getState().status).toBe('stopped');
		expect(second.getState().status).toBe('recording');
		expect(
			second
				.getStream()!
				.getTracks()
				.every((track) => track.readyState === 'live'),
		).toBe(true);
	});

	it('stops a stream that arrives after destroy during requesting', async () => {
		let deliver: (stream: MediaStream) => void = () => {};
		const controller = create({ getUserMedia: () => new Promise<MediaStream>((resolve) => (deliver = resolve)) });
		const pending = controller.start();
		expect(controller.getState().status).toBe('requesting');

		controller.destroy();
		const late = await navigator.mediaDevices.getUserMedia({ audio: true });
		deliver(late);
		await pending;

		expect(late.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
		expect(controller.getState().status).toBe('idle');
	});

	it('stops a stream that arrives after stop() cancelled the request', async () => {
		let deliver: (stream: MediaStream) => void = () => {};
		const controller = create({ getUserMedia: () => new Promise<MediaStream>((resolve) => (deliver = resolve)) });
		const pending = controller.start();

		await expect(controller.stop()).resolves.toBeNull();
		const late = await navigator.mediaDevices.getUserMedia({ audio: true });
		deliver(late);
		await pending;

		expect(late.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
		expect(controller.getState().status).toBe('idle');
	});

	it('does not start before attach or after destroy', async () => {
		const getUserMedia = vi.fn();
		const controller = new MediaRecorderController({ getUserMedia });
		controllers.push(controller);

		await controller.start();
		expect(getUserMedia).not.toHaveBeenCalled();

		controller.attach();
		controller.destroy();
		await controller.start();
		expect(getUserMedia).not.toHaveBeenCalled();
	});

	it('reports snapshots to onState with a status for every change', async () => {
		const snapshots: MediaRecorderSnapshot[] = [];
		const controller = create({ onState: (snapshot) => snapshots.push(snapshot) });

		await controller.start();
		await controller.stop();

		const statuses = snapshots.map((snapshot) => snapshot.status);
		expect(statuses[0]).toBe('requesting');
		expect(statuses).toContain('recording');
		expect(statuses.at(-1)).toBe('stopped');
	});

	describe('with a caller-provided AudioContext', () => {
		const contexts: AudioContext[] = [];

		async function context(): Promise<AudioContext> {
			const created = new AudioContext();
			await created.resume();
			contexts.push(created);
			return created;
		}

		afterEach(async () => {
			await Promise.all(contexts.splice(0).map((created) => created.close().catch(() => undefined)));
		});

		it('has no analyser and a zero level without the option', async () => {
			const controller = create();

			await controller.start();
			await sleep(300);

			expect(controller.getAnalyser()).toBeNull();
			expect(controller.getState().level).toBe(0);
		});

		it('exposes an analyser only while recording, and a level above zero from the fake microphone', async () => {
			const audio = await context();
			const controller = create({ getAudioContext: () => audio });
			expect(controller.getAnalyser()).toBeNull();

			await controller.start();
			expect(controller.getAnalyser()).toBeInstanceOf(AnalyserNode);

			await vi.waitFor(() => expect(controller.getState().level).toBeGreaterThan(0), { timeout: 3000 });
			expect(controller.getState().level).toBeLessThanOrEqual(1);

			await controller.stop();
			expect(controller.getAnalyser()).toBeNull();
			expect(controller.getState().level).toBe(0);
		});

		it('never connects anything to the destination', async () => {
			const audio = await context();
			const connections: unknown[] = [];
			const original = AudioNode.prototype.connect;
			vi.spyOn(AudioNode.prototype, 'connect').mockImplementation(function (this: AudioNode, target: never) {
				connections.push(target);
				return original.call(this, target);
			} as never);
			const controller = create({ getAudioContext: () => audio });

			await controller.start();
			await sleep(300);
			await controller.stop();

			expect(connections.length).toBeGreaterThan(0);
			expect(connections).not.toContain(audio.destination);
		});

		it('disconnects the source and analyser after stop, discard and destroy', async () => {
			const audio = await context();
			const disconnect = vi.spyOn(AudioNode.prototype, 'disconnect');
			const controller = create({ getAudioContext: () => audio });

			await controller.start();
			await controller.stop();
			expect(disconnect).toHaveBeenCalledTimes(2);

			disconnect.mockClear();
			await controller.start();
			controller.discard();
			expect(disconnect).toHaveBeenCalledTimes(2);

			disconnect.mockClear();
			await controller.start();
			controller.destroy();
			expect(disconnect).toHaveBeenCalledTimes(2);
		});

		it('leaves a context it did not create open after destroy, with the tracks stopped once', async () => {
			const audio = await context();
			const controller = create({ getAudioContext: () => audio });
			await controller.start();
			const stream = controller.getStream()!;
			const stops = stream.getTracks().map((track) => vi.spyOn(track, 'stop'));

			controller.destroy();

			expect(audio.state).toBe('running');
			expect(stops.every((stop) => stop.mock.calls.length === 1)).toBe(true);
		});

		it('reports a zero level while paused', async () => {
			const audio = await context();
			const controller = create({ getAudioContext: () => audio });
			await controller.start();
			await vi.waitFor(() => expect(controller.getState().level).toBeGreaterThan(0), { timeout: 3000 });

			controller.pause();

			expect(controller.getState().level).toBe(0);
		});
	});

	describe('when the recording ends without stop()', () => {
		function captureRecorder(): { current: () => MediaRecorder } {
			const start = vi.spyOn(MediaRecorder.prototype, 'start');
			return { current: () => start.mock.contexts[0] as MediaRecorder };
		}

		function endAll(stream: MediaStream): void {
			stream.getTracks().forEach((track) => track.dispatchEvent(new Event('ended')));
		}

		it('finishes with a result when every track ends, and can start again', async () => {
			const onStop = vi.fn();
			const controller = create({ onStop });
			await controller.start();
			await sleep(200);
			const stream = controller.getStream()!;

			endAll(stream);

			await vi.waitFor(() => expect(controller.getState().status).toBe('stopped'));
			expect(onStop).toHaveBeenCalledTimes(1);
			expect(onStop.mock.calls[0][0].blob.size).toBeGreaterThan(0);
			expect(controller.getStream()).toBeNull();
			expect(stream.getTracks().every((track) => track.readyState === 'ended')).toBe(true);

			await controller.start();
			expect(controller.getState().status).toBe('recording');
		});

		it('keeps recording while one of two tracks is still live', async () => {
			const controller = create({ constraints: { audio: true, video: true } });
			await controller.start();
			const [first] = controller.getStream()!.getTracks();

			first.dispatchEvent(new Event('ended'));
			await sleep(200);

			expect(controller.getState().status).toBe('recording');
		});

		it('finishes with a result when the browser stops the recorder itself', async () => {
			const recorder = captureRecorder();
			const onStop = vi.fn();
			const controller = create({ onStop });
			await controller.start();
			await sleep(200);

			recorder.current().stop();

			await vi.waitFor(() => expect(controller.getState().status).toBe('stopped'));
			expect(onStop).toHaveBeenCalledTimes(1);
			expect(controller.getStream()).toBeNull();
		});

		it('ignores pause and resume on a recorder that is already inactive', async () => {
			const recorder = captureRecorder();
			const controller = create();
			await controller.start();
			recorder.current().stop();

			expect(() => controller.pause()).not.toThrow();
			expect(() => controller.resume()).not.toThrow();

			await vi.waitFor(() => expect(controller.getState().status).toBe('stopped'));
		});

		it('does not hang or keep a rejected promise when recorder.stop() throws', async () => {
			const onError = vi.fn();
			const controller = create({ onError });
			await controller.start();
			const stream = controller.getStream()!;
			vi.spyOn(MediaRecorder.prototype, 'stop').mockImplementationOnce(() => {
				throw new DOMException('not recording', 'InvalidStateError');
			});

			await expect(controller.stop()).resolves.toBeNull();

			expect(controller.getState().status).toBe('error');
			expect(onError).toHaveBeenCalledTimes(1);
			expect(stream.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
			await expect(controller.stop()).resolves.toBeNull();
			await controller.start();
			expect(controller.getState().status).toBe('recording');
		});

		it('releases everything when starting fails after the stream arrived', async () => {
			const audio = new AudioContext();
			vi.spyOn(audio, 'createMediaStreamSource').mockImplementation(() => {
				throw new DOMException('closed', 'InvalidStateError');
			});
			const onError = vi.fn();
			let stream: MediaStream | null = null;
			const controller = create({
				onError,
				getAudioContext: () => audio,
				getUserMedia: async (constraints) => (stream = await navigator.mediaDevices.getUserMedia(constraints)),
			});

			await controller.start();

			expect(controller.getState().status).toBe('error');
			expect(onError).toHaveBeenCalledTimes(1);
			expect(controller.getStream()).toBeNull();
			expect(controller.getAnalyser()).toBeNull();
			expect(stream!.getTracks().every((track) => track.readyState === 'ended')).toBe(true);
			await audio.close();
		});
	});
});
