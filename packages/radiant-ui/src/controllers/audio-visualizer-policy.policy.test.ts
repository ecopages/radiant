import { afterEach, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { AudioVisualizerController } from './audio-visualizer-controller';

/**
 * Runs in a Chromium started with `--autoplay-policy=document-user-activation-required` (the `autoplay-policy`
 * project in `vite.config.ts`), the default of a real browser: an `AudioContext` stays suspended until the user
 * has interacted with the page.
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
	vi.restoreAllMocks();
});

it('leaves a muted autoplaying video on its native output while the context is blocked, and starts on a play that follows a user gesture', async () => {
	const create = vi.spyOn(AudioContext.prototype, 'createMediaElementSource');
	const video = document.createElement('video');
	video.muted = true;
	video.loop = true;
	video.src = toneUrl();
	document.body.append(video);
	const target = document.createElement('div');
	document.body.append(target);
	const draw = vi.fn();
	const controller = new AudioVisualizerController({
		getMedia: () => video,
		getTarget: () => target,
		preset: { mount() {}, draw, rest() {}, destroy() {} },
	});
	controller.attach();

	await video.play();
	await new Promise((resolve) => setTimeout(resolve, 600));
	expect(video.paused).toBe(false);
	expect(controller.getState()).toBe('idle');
	expect(create).not.toHaveBeenCalled();
	expect(draw).not.toHaveBeenCalled();

	const toggle = document.createElement('button');
	toggle.textContent = 'Restart';
	toggle.addEventListener('click', () => {
		video.pause();
		void video.play();
	});
	document.body.append(toggle);
	await userEvent.click(toggle);
	await vi.waitFor(() => expect(controller.getState()).toBe('running'), { timeout: 5000 });
	expect(create).toHaveBeenCalledOnce();
	expect(video.paused).toBe(false);
	controller.destroy();
});
