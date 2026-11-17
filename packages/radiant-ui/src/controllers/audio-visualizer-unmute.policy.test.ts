import { afterEach, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { AudioVisualizerController } from './audio-visualizer-controller';
import { realWait } from './event.fixture';

/**
 * Own file because user activation is sticky for a page: nothing may click before the muted video plays here.
 * Chromium never settles an `AudioContext.resume()` made before a gesture, so the retry on `volumechange` has to
 * work with a `resume()` that is still pending.
 */

function toneUrl(): string {
	const sampleRate = 8000;
	const samples = sampleRate;
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

afterEach(() => {
	document.body.replaceChildren();
});

it('starts the visualizer when the user unmutes an autoplaying muted video with a click, after a resume() that never settled', async () => {
	const video = document.createElement('video');
	video.muted = true;
	video.loop = true;
	video.src = toneUrl();
	document.body.append(video);
	const target = document.createElement('div');
	document.body.append(target);
	let running!: () => void;
	const isRunning = new Promise<void>((resolve) => (running = resolve));
	const controller = new AudioVisualizerController({
		getMedia: () => video,
		getTarget: () => target,
		preset: { mount() {}, draw() {}, rest() {}, destroy() {} },
		onState: (state) => state === 'running' && running(),
	});
	controller.attach();

	await video.play();
	await realWait(
		500,
		'a negative assertion on the autoplay policy: the visualizer starting while the autoplaying video is muted, with nothing to signal it',
	);
	expect(controller.getState()).toBe('idle');

	const unmute = document.createElement('button');
	unmute.textContent = 'Unmute';
	unmute.addEventListener('click', () => {
		video.muted = false;
	});
	document.body.append(unmute);
	await userEvent.click(unmute);

	await isRunning;
	expect(video.paused).toBe(false);
	controller.destroy();
});
