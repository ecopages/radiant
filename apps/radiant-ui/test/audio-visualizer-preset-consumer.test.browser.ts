import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import {
	AudioVisualizerController,
	bandPeak,
	createCanvasSurface,
	litSegments,
	logBands,
	segmentBounds,
	stepPeak,
	type AudioFrame,
	type AudioVisualizerPreset,
	type CanvasSurface,
	type Peak,
} from '@ecopages/radiant-ui/controllers';

/**
 * A preset written the way a package that depends on `@ecopages/radiant-ui` would write it: it imports only from the
 * public `controllers` entry, so a pass here shows the exported surface is enough to build one.
 */
function ledMeter(log: string[], name: string, count = 8): AudioVisualizerPreset {
	const bands = logBands(count);
	const caps: Peak[] = bands.map(() => ({ value: 0, heldSince: 0 }));
	let surface: CanvasSurface | null = null;
	return {
		fftSize: 256,
		mount: (target) => {
			log.push(`${name}:mount`);
			surface = createCanvasSurface(target);
		},
		draw(frame: AudioFrame) {
			log.push(`${name}:draw`);
			const canvas = surface as CanvasSurface;
			canvas.clear();
			canvas.context.fillStyle = canvas.resolveColor('--primary');
			const now = performance.now();
			bands.forEach((band, index) => {
				const level = bandPeak(frame.frequency, frame.sampleRate, frame.fftSize, band);
				stepPeak(caps[index], level, now, 16, { hold: 200, fall: 1 });
				const lit = litSegments(level, 6);
				for (let segment = 0; segment < lit; segment++) {
					const { y, height } = segmentBounds(segment, 6, 1, 0, canvas.height);
					canvas.context.fillRect(index * 10, y, 8, height);
				}
			});
		},
		rest() {
			log.push(`${name}:rest`);
			surface?.clear();
		},
		destroy() {
			log.push(`${name}:destroy`);
			surface?.destroy();
			surface = null;
		},
	};
}

const sources: Array<() => void> = [];

async function playing(): Promise<HTMLAudioElement> {
	const context = new AudioContext();
	const destination = context.createMediaStreamDestination();
	const oscillator = context.createOscillator();
	oscillator.type = 'sawtooth';
	oscillator.connect(destination);
	oscillator.start();
	sources.push(() => {
		oscillator.stop();
		void context.close();
	});
	const audio = document.createElement('audio');
	audio.srcObject = destination.stream;
	document.body.append(audio);
	return audio;
}

afterEach(() => {
	sources.splice(0).forEach((stop) => stop());
	document.body.replaceChildren();
});

describe('a preset that imports only from @ecopages/radiant-ui/controllers', () => {
	it('is mounted, drawn, rested and destroyed in the documented order, and a swap destroys the old preset first', async () => {
		const log: string[] = [];
		const audio = await playing();
		const target = document.createElement('div');
		target.style.height = '40px';
		document.body.append(target);
		const controller = new AudioVisualizerController({
			getMedia: () => audio,
			getTarget: () => target,
			preset: ledMeter(log, 'first'),
		});
		const button = document.createElement('button');
		document.body.append(button);
		await userEvent.click(button);

		controller.attach();
		expect(log).toEqual(['first:mount']);
		controller.resume();
		await audio.play();
		await expect.poll(() => log.filter((entry) => entry === 'first:draw').length).toBeGreaterThan(2);
		expect(log.slice(0, 2)).toEqual(['first:mount', 'first:draw']);
		expect(target.querySelectorAll('canvas')).toHaveLength(1);

		audio.pause();
		await expect.poll(() => log.at(-1)).toBe('first:rest');

		await audio.play();
		await expect.poll(() => controller.getState()).toBe('running');
		controller.setPreset(ledMeter(log, 'second'));
		const swapped = log.slice(log.lastIndexOf('first:rest'));
		expect(swapped.filter((entry) => !entry.endsWith(':draw'))).toEqual([
			'first:rest',
			'first:destroy',
			'second:mount',
		]);
		await expect.poll(() => log.includes('second:draw')).toBe(true);
		expect(log.lastIndexOf('first:draw')).toBeLessThan(log.indexOf('second:mount'));
		expect(target.querySelectorAll('canvas')).toHaveLength(1);

		controller.destroy();
		expect(log.slice(-2)).toEqual(['second:rest', 'second:destroy']);
		expect(target.querySelector('canvas')).toBeNull();
	});
});
