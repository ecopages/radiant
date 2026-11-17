import { afterEach, describe, expect, it, vi } from 'vitest';
import { bars } from './audio-visualizer-bars';
import type { AudioFrame } from './audio-visualizer-controller';
import { wave } from './audio-visualizer-wave';
import { frames } from './event.fixture';

function frame(level: number, fftSize = 1024): AudioFrame {
	return {
		frequency: new Uint8Array(fftSize / 2).fill(level),
		waveform: Uint8Array.from({ length: fftSize }, (_, index) => (index % 64 < 32 ? 255 : 0)),
		sampleRate: 44100,
		fftSize,
	};
}

function makeTarget(width = 120, height = 40): HTMLElement {
	const target = document.createElement('div');
	target.style.width = `${width}px`;
	target.style.height = `${height}px`;
	document.body.append(target);
	return target;
}

function pixel(canvas: HTMLCanvasElement, x: number, y: number): number[] {
	return [...canvas.getContext('2d')!.getImageData(x, y, 1, 1).data];
}

/** A media query that records which listeners are registered. */
class ResolutionQuery extends EventTarget {
	listeners = new Set<EventListenerOrEventListenerObject>();
	matches = true;
	constructor(readonly media: string) {
		super();
	}
	override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
		if (listener) this.listeners.add(listener);
		super.addEventListener(type, listener);
	}
	override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
		if (listener) this.listeners.delete(listener);
		super.removeEventListener(type, listener);
	}
}

afterEach(() => {
	vi.restoreAllMocks();
	document.body.replaceChildren();
	document.documentElement.removeAttribute('style');
	vi.unstubAllGlobals();
});

describe('bars, dom mode', () => {
	function barsOf(count: number): HTMLElement {
		const target = document.createElement('div');
		for (let index = 0; index < count; index++) {
			target.append(document.createElement('span'));
		}
		document.body.append(target);
		return target;
	}

	it('writes --level on the direct children and removes it on rest', () => {
		const target = barsOf(4);
		const preset = bars({ mode: 'dom' });
		preset.mount(target);

		preset.draw(frame(255));
		expect([...target.children].map((child) => (child as HTMLElement).style.getPropertyValue('--level'))).toEqual([
			'1.000',
			'1.000',
			'1.000',
			'1.000',
		]);

		preset.rest();
		expect([...target.children].every((child) => !(child as HTMLElement).style.getPropertyValue('--level'))).toBe(
			true,
		);
	});

	it('looks the bars up once per drawing session, not on every frame, and again after a rest', () => {
		const target = barsOf(3);
		const lookups = vi.spyOn(target, 'querySelectorAll');
		const preset = bars({ mode: 'dom', selector: 'span' });
		preset.mount(target);

		for (let index = 0; index < 5; index++) {
			preset.draw(frame(255));
		}
		expect(lookups).toHaveBeenCalledTimes(1);

		preset.rest();
		target.append(document.createElement('span'));
		preset.draw(frame(255));
		expect(target.children[3].getAttribute('style')).toContain('--level');
	});

	it('keeps the level at the floor for silence and honours a custom floor', () => {
		const target = barsOf(2);
		const preset = bars({ mode: 'dom', floor: 0.3 });
		preset.mount(target);
		preset.draw(frame(0));
		expect((target.children[0] as HTMLElement).style.getPropertyValue('--level')).toBe('0.300');

		const defaults = bars({ mode: 'dom' });
		defaults.mount(target);
		defaults.draw(frame(0));
		expect((target.children[0] as HTMLElement).style.getPropertyValue('--level')).toBe('0.120');
	});

	it('shapes the level with floorLevel, range and curve, and never goes under floor', () => {
		const target = barsOf(1);
		const level = () => (target.children[0] as HTMLElement).style.getPropertyValue('--level');
		const shaped = bars({ mode: 'dom', floor: 0, floorLevel: 0.2, range: 0.5, curve: 2 });
		shaped.mount(target);
		shaped.draw(frame(51));
		expect(level()).toBe('0.000');
		shaped.draw(frame(Math.round(0.45 * 255)));
		expect(Number(level())).toBeCloseTo(0.25, 1);
		shaped.draw(frame(255));
		expect(level()).toBe('1.000');
		shaped.rest();

		const floored = bars({ mode: 'dom', floor: 0.2, floorLevel: 0.2, range: 0.5 });
		floored.mount(target);
		floored.draw(frame(51));
		expect(level()).toBe('0.200');
	});

	it('scales to the running maximum with adapt, which a rest forgets', () => {
		const target = barsOf(1);
		const level = () => Number((target.children[0] as HTMLElement).style.getPropertyValue('--level'));
		const preset = bars({ mode: 'dom', floor: 0, floorLevel: 0.2, adapt: 0.1 });
		preset.mount(target);
		preset.draw(frame(128));
		expect(level()).toBe(1);
		preset.draw(frame(100));
		expect(level()).toBeLessThan(1);
		expect(level()).toBeGreaterThan(0);
		preset.rest();
		preset.draw(frame(100));
		expect(level()).toBe(1);
	});

	it('writes to the elements the selector matches and not to other children', () => {
		const target = barsOf(3);
		target.children[1].setAttribute('data-bar', '');
		const preset = bars({ mode: 'dom', selector: '[data-bar]' });
		preset.mount(target);
		preset.draw(frame(255));
		expect((target.children[0] as HTMLElement).style.getPropertyValue('--level')).toBe('');
		expect((target.children[1] as HTMLElement).style.getPropertyValue('--level')).toBe('1.000');
	});

	it('gives each element a band of its own when there are fewer or more elements than the default four', () => {
		for (const count of [2, 7]) {
			const target = barsOf(count);
			const preset = bars({ mode: 'dom' });
			preset.mount(target);
			preset.draw(frame(255));
			expect(
				[...target.children].every((child) => (child as HTMLElement).style.getPropertyValue('--level')),
			).toBe(true);
		}
	});

	it('removes a level an element had when it has no band', () => {
		const target = barsOf(3);
		(target.children[2] as HTMLElement).style.setProperty('--level', '0.9');
		const preset = bars({
			mode: 'dom',
			bands: [
				[100, 200],
				[200, 400],
			],
		});
		preset.mount(target);
		preset.draw(frame(255));
		expect((target.children[2] as HTMLElement).style.getPropertyValue('--level')).toBe('');
	});

	it('leaves elements beyond the given bands without a level, and reads elements added later', () => {
		const target = barsOf(3);
		const preset = bars({
			mode: 'dom',
			bands: [
				[100, 200],
				[200, 400],
			],
		});
		preset.mount(target);
		preset.draw(frame(255));
		expect((target.children[1] as HTMLElement).style.getPropertyValue('--level')).toBe('1.000');
		expect((target.children[2] as HTMLElement).style.getPropertyValue('--level')).toBe('');

		target.append(document.createElement('span'));
		preset.draw(frame(255));
		expect(target.children).toHaveLength(4);
	});

	it('reads each band from its own part of the spectrum', () => {
		const target = barsOf(2);
		const preset = bars({
			mode: 'dom',
			floor: 0,
			bands: [
				[0, 500],
				[5000, 6000],
			],
		});
		preset.mount(target);
		const loud = frame(0);
		loud.frequency.fill(255, 0, 10);
		preset.draw(loud);
		expect((target.children[0] as HTMLElement).style.getPropertyValue('--level')).toBe('1.000');
		expect((target.children[1] as HTMLElement).style.getPropertyValue('--level')).toBe('0.000');
	});

	it('rests and destroys without a target mounted', () => {
		const preset = bars({ mode: 'dom' });
		expect(() => {
			preset.rest();
			preset.destroy();
		}).not.toThrow();
	});
});

describe.each([
	['bars canvas', () => bars({ mode: 'canvas', count: 4, gap: 0, floor: 1, color: '--test-color' })],
	['wave', () => wave({ lineWidth: 6, color: '--test-color' })],
])('%s', (_name, create) => {
	it('creates an aria-hidden canvas in the target, clears on rest and removes it on destroy', () => {
		const target = makeTarget();
		const preset = create();
		document.documentElement.style.setProperty('--test-color', 'rgb(255, 0, 0)');
		preset.mount(target);
		const canvas = target.querySelector('canvas')!;
		expect(canvas.getAttribute('aria-hidden')).toBe('true');

		preset.draw(frame(255, preset.fftSize ?? 1024));
		const painted = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
		expect(painted.some((value) => value > 0)).toBe(true);

		preset.rest();
		const cleared = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
		expect(cleared.every((value) => value === 0)).toBe(true);

		preset.destroy();
		expect(target.querySelector('canvas')).toBeNull();
		expect(() => preset.destroy()).not.toThrow();
	});

	it('mounts again after destroy', () => {
		const target = makeTarget();
		const preset = create();
		preset.mount(target);
		preset.destroy();
		preset.mount(target);
		expect(target.querySelectorAll('canvas')).toHaveLength(1);
		preset.destroy();
	});

	it('follows the container size, to zero and back', async () => {
		const target = makeTarget(100, 40);
		const preset = create();
		preset.mount(target);
		const canvas = target.querySelector('canvas')!;
		const ratio = window.devicePixelRatio;
		expect(canvas.width).toBe(Math.round(100 * ratio));

		target.style.width = '60px';
		await frames();
		expect(canvas.width).toBe(Math.round(60 * ratio));

		target.style.height = '0px';
		await frames();
		expect(canvas.height).toBe(0);
		expect(() => preset.draw(frame(255, preset.fftSize ?? 1024))).not.toThrow();

		target.style.height = '30px';
		await frames();
		expect(canvas.height).toBe(Math.round(30 * ratio));
		preset.destroy();
	});

	it('draws nothing visible in a zero-size container without throwing', () => {
		const target = makeTarget(0, 0);
		const preset = create();
		preset.mount(target);
		expect(() => preset.draw(frame(255, preset.fftSize ?? 1024))).not.toThrow();
		preset.destroy();
	});

	it('sizes the bitmap from the canvas box, not from the padded target', async () => {
		const target = makeTarget(100, 40);
		target.style.padding = '10px';
		target.style.boxSizing = 'content-box';
		const preset = create();
		preset.mount(target);
		const canvas = target.querySelector('canvas')!;
		const box = canvas.getBoundingClientRect();
		expect(box.width).toBe(100);
		expect(canvas.width).toBe(Math.round(box.width * window.devicePixelRatio));
		expect(canvas.height).toBe(Math.round(box.height * window.devicePixelRatio));

		target.style.padding = '0px';
		await frames();
		expect(canvas.width).toBe(Math.round(100 * window.devicePixelRatio));
		preset.destroy();
	});

	it('refits when the device pixel ratio changes, and releases its listeners and observer on destroy', () => {
		const queries: ResolutionQuery[] = [];
		const realMatchMedia = window.matchMedia.bind(window);
		vi.stubGlobal('matchMedia', (query: string) => {
			if (!query.startsWith('(resolution')) {
				return realMatchMedia(query);
			}
			const fake = new ResolutionQuery(query);
			queries.push(fake);
			return fake;
		});
		const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect');
		vi.stubGlobal('devicePixelRatio', 1);
		const target = makeTarget(80, 20);
		const preset = create();
		preset.mount(target);
		const canvas = target.querySelector('canvas')!;
		expect(canvas.width).toBe(80);
		expect(queries.map((query) => query.media)).toEqual(['(resolution: 1dppx)']);

		vi.stubGlobal('devicePixelRatio', 2);
		queries[0].dispatchEvent(new Event('change'));
		expect(canvas.width).toBe(160);
		expect(canvas.height).toBe(40);
		expect(queries.map((query) => query.media)).toEqual(['(resolution: 1dppx)', '(resolution: 2dppx)']);
		expect(queries[0].listeners.size).toBe(0);
		expect(queries[1].listeners.size).toBe(1);

		preset.destroy();
		expect(queries[1].listeners.size).toBe(0);
		expect(disconnect).toHaveBeenCalledOnce();
	});

	it.each([1, 2])('sizes the canvas for a device pixel ratio of %d', (ratio) => {
		vi.stubGlobal('devicePixelRatio', ratio);
		const target = makeTarget(80, 20);
		const preset = create();
		preset.mount(target);
		const canvas = target.querySelector('canvas')!;
		expect(canvas.width).toBe(80 * ratio);
		expect(canvas.height).toBe(20 * ratio);
		preset.destroy();
	});

	it('reads the color at draw time, so a theme change shows on the next frame', async () => {
		const target = makeTarget(60, 40);
		const preset = create();
		document.documentElement.style.setProperty('--test-color', 'rgb(255, 0, 0)');
		preset.mount(target);
		const canvas = target.querySelector('canvas')!;
		const input = frame(255, preset.fftSize ?? 1024);

		preset.draw(input);
		const hue = (rgba: number[]) => (rgba[0] > rgba[2] ? 'red' : 'blue');
		const read = () => {
			const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
			for (let index = 0; index < data.length; index += 4) {
				if (data[index + 3] > 200) return hue([data[index], data[index + 1], data[index + 2]]);
			}
			return 'none';
		};
		expect(read()).toBe('red');

		document.documentElement.style.setProperty('--test-color', 'rgb(0, 0, 255)');
		await frames();
		preset.draw(input);
		expect(read()).toBe('blue');
		preset.destroy();
	});
});

describe('bars canvas', () => {
	it('draws a bar at the bottom of the container and accepts a plain CSS color', () => {
		const target = makeTarget(40, 40);
		const preset = bars({ mode: 'canvas', count: 1, floor: 1, color: 'rgb(0, 128, 0)' });
		preset.mount(target);
		preset.draw(frame(0));
		const canvas = target.querySelector('canvas')!;
		const [r, g, , a] = pixel(canvas, 5, canvas.height - 2);
		expect([r, g, a]).toEqual([0, 128, 255]);
		preset.destroy();
	});
});

describe('bars canvas look', () => {
	const coverage = (canvas: HTMLCanvasElement, x: number, ratio = window.devicePixelRatio) =>
		Array.from(
			{ length: canvas.height / ratio },
			(_, y) => pixel(canvas, Math.round(x * ratio), Math.round(y * ratio))[3] > 0,
		);

	it('draws LED segments with a gap between them, lit from the bottom up to the level', () => {
		const target = makeTarget(20, 40);
		const preset = bars({
			mode: 'canvas',
			count: 1,
			segments: 4,
			segmentGap: 2,
			color: 'rgb(0, 128, 0)',
		});
		preset.mount(target);
		preset.draw(frame(120));
		const rows = coverage(target.querySelector('canvas')!, 10);
		expect(rows.slice(0, 20).some(Boolean)).toBe(false);
		expect(rows[39]).toBe(true);
		expect(rows[33]).toBe(true);
		expect(rows[30]).toBe(false);
		expect(rows[25]).toBe(true);
		preset.destroy();
	});

	it('lights no segment for silence or for a level at the floor level, and draws no cap on an empty bar', () => {
		const painted = (level: number) => {
			const target = makeTarget(20, 40);
			const preset = bars({
				mode: 'canvas',
				count: 1,
				segments: 4,
				floorLevel: 0.3,
				peaks: {},
				color: 'rgb(0, 128, 0)',
			});
			preset.mount(target);
			preset.draw(frame(level));
			const rows = coverage(target.querySelector('canvas')!, 10);
			preset.destroy();
			return rows.filter(Boolean).length;
		};
		expect(painted(0)).toBe(0);
		expect(painted(Math.floor(0.3 * 255))).toBe(0);
		expect(painted(255)).toBeGreaterThan(0);
	});

	it('keeps the bars inside the padding', () => {
		const target = makeTarget(40, 40);
		const preset = bars({ mode: 'canvas', count: 1, floor: 1, padding: 10, color: 'rgb(0, 128, 0)' });
		preset.mount(target);
		preset.draw(frame(0));
		const canvas = target.querySelector('canvas')!;
		expect(coverage(canvas, 20).filter(Boolean)).toHaveLength(20);
		expect(pixel(canvas, 5 * window.devicePixelRatio, 20 * window.devicePixelRatio)[3]).toBe(0);
		expect(pixel(canvas, 35 * window.devicePixelRatio, 20 * window.devicePixelRatio)[3]).toBe(0);
		preset.destroy();
	});

	it('rounds the ends of a bar and leaves the corner of a square one filled', () => {
		const corner = (ends: 'round' | 'square') => {
			const target = makeTarget(20, 20);
			const preset = bars({ mode: 'canvas', count: 1, floor: 1, ends, color: 'rgb(0, 128, 0)' });
			preset.mount(target);
			preset.draw(frame(0));
			const alpha = pixel(target.querySelector('canvas')!, 0, 0)[3];
			preset.destroy();
			return alpha;
		};
		expect(corner('square')).toBe(255);
		expect(corner('round')).toBe(0);
	});

	it('fades from the color at the bottom to colorEnd at the top', () => {
		const target = makeTarget(20, 40);
		const preset = bars({
			mode: 'canvas',
			count: 1,
			floor: 1,
			color: 'rgb(255, 0, 0)',
			colorEnd: 'rgb(0, 0, 255)',
		});
		preset.mount(target);
		preset.draw(frame(0));
		const canvas = target.querySelector('canvas')!;
		const ratio = window.devicePixelRatio;
		const top = pixel(canvas, 10 * ratio, 1 * ratio);
		const bottom = pixel(canvas, 10 * ratio, 38 * ratio);
		expect(top[2]).toBeGreaterThan(top[0]);
		expect(bottom[0]).toBeGreaterThan(bottom[2]);
		preset.destroy();
	});

	it('holds a cap at the highest level, then lets it fall, while the bar drops', () => {
		let now = 1000;
		vi.spyOn(performance, 'now').mockImplementation(() => now);
		const target = makeTarget(20, 100);
		const preset = bars({
			mode: 'canvas',
			count: 1,
			floor: 0.1,
			peaks: { hold: 300, fall: 1 },
			color: 'rgb(0, 128, 0)',
		});
		preset.mount(target);
		preset.draw(frame(204));
		const canvas = target.querySelector('canvas')!;
		const capRows = () => coverage(canvas, 10);
		expect(capRows()[19]).toBe(true);

		now += 200;
		preset.draw(frame(0));
		expect(capRows()[19]).toBe(true);
		expect(capRows()[50]).toBe(false);

		now += 400;
		preset.draw(frame(0));
		const fallen = capRows();
		expect(fallen[19]).toBe(false);
		expect(fallen.findIndex(Boolean)).toBeGreaterThan(19);
		preset.destroy();
	});

	it('draws the bars at their floor on rest only when idle is floor', () => {
		const painted = (idle: 'clear' | 'floor') => {
			const target = makeTarget(20, 40);
			const preset = bars({ mode: 'canvas', count: 1, floor: 0.5, idle, color: 'rgb(0, 128, 0)' });
			preset.mount(target);
			preset.draw(frame(255));
			preset.rest();
			const rows = coverage(target.querySelector('canvas')!, 10);
			preset.destroy();
			return rows;
		};
		expect(painted('clear').some(Boolean)).toBe(false);
		const floor = painted('floor');
		expect(floor.filter(Boolean)).toHaveLength(20);
		expect(floor[39]).toBe(true);
	});

	it('rests segmented bars as one dim lowest segment, however high the floor is', () => {
		const target = makeTarget(20, 40);
		const preset = bars({
			mode: 'canvas',
			count: 1,
			floor: 0.9,
			segments: 4,
			segmentGap: 2,
			idle: 'floor',
			color: 'rgb(0, 128, 0)',
		});
		preset.mount(target);
		const canvas = target.querySelector('canvas')!;
		const rows = coverage(canvas, 10);
		expect(rows[39]).toBe(true);
		expect(rows.slice(0, 30).some(Boolean)).toBe(false);
		const alpha = pixel(canvas, 10 * window.devicePixelRatio, 39 * window.devicePixelRatio)[3];
		expect(alpha).toBeGreaterThan(0);
		expect(alpha).toBeLessThan(128);
		preset.draw(frame(255));
		preset.rest();
		expect(coverage(canvas, 10).slice(0, 30).some(Boolean)).toBe(false);
		preset.destroy();
	});

	it('shows the floor as soon as it is mounted when idle is floor, and nothing otherwise', () => {
		const painted = (idle: 'clear' | 'floor') => {
			const target = makeTarget(20, 40);
			const preset = bars({ mode: 'canvas', count: 1, floor: 0.5, idle, color: 'rgb(0, 128, 0)' });
			preset.mount(target);
			const rows = coverage(target.querySelector('canvas')!, 10);
			preset.destroy();
			return rows.filter(Boolean).length;
		};
		expect(painted('clear')).toBe(0);
		expect(painted('floor')).toBe(20);
	});

	it('draws the floor again after the canvas is resized while at rest', async () => {
		const target = makeTarget(40, 40);
		const preset = bars({ mode: 'canvas', count: 1, floor: 0.5, idle: 'floor', color: 'rgb(0, 128, 0)' });
		preset.mount(target);
		preset.rest();
		const canvas = target.querySelector('canvas')!;
		target.style.width = '60px';
		await frames();
		expect(canvas.width).toBe(Math.round(60 * window.devicePixelRatio));
		await frames();
		expect(coverage(target.querySelector('canvas')!, 30).filter(Boolean).length).toBeGreaterThan(0);
		preset.destroy();
	});
});

describe('wave', () => {
	it('draws a line from the waveform and a fill when asked', () => {
		const target = makeTarget(60, 40);
		const filled = wave({ fill: true, color: 'rgb(0, 0, 255)' });
		filled.mount(target);
		filled.draw(frame(0, 2048));
		const canvas = target.querySelector('canvas')!;
		const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
		expect(data.some((value) => value > 0)).toBe(true);
		filled.destroy();
	});

	it('draws a louder sample higher', () => {
		const target = makeTarget(60, 40);
		const preset = wave({ lineWidth: 2, color: 'rgb(0, 0, 255)' });
		preset.mount(target);
		const high = frame(0, 2048);
		high.waveform.fill(230);
		preset.draw(high);
		const canvas = target.querySelector('canvas')!;
		const ratio = window.devicePixelRatio;
		expect(pixel(canvas, 30 * ratio, 4 * ratio)[3]).toBeGreaterThan(0);
		expect(pixel(canvas, 30 * ratio, 36 * ratio)[3]).toBe(0);
		preset.destroy();
	});

	it('falls back to the canvas color for an undefined custom property', () => {
		const target = makeTarget(60, 40);
		target.style.color = 'rgb(0, 128, 0)';
		const preset = bars({ mode: 'canvas', count: 1, floor: 1, color: '--not-defined' });
		preset.mount(target);
		preset.draw(frame(0));
		const canvas = target.querySelector('canvas')!;
		const [, green] = pixel(canvas, 5, canvas.height - 2);
		expect(green).toBe(128);
		preset.destroy();
	});

	it('keeps the line inside its padding', () => {
		const target = makeTarget(60, 40);
		const preset = wave({ lineWidth: 2, padding: 10, color: 'rgb(0, 0, 255)' });
		preset.mount(target);
		const high = frame(0, 2048);
		high.waveform.fill(255);
		preset.draw(high);
		const canvas = target.querySelector('canvas')!;
		const ratio = window.devicePixelRatio;
		expect(pixel(canvas, 30 * ratio, 10 * ratio)[3]).toBeGreaterThan(0);
		expect(pixel(canvas, 30 * ratio, 5 * ratio)[3]).toBe(0);
		expect(pixel(canvas, 5 * ratio, 10 * ratio)[3]).toBe(0);
		preset.destroy();
	});

	it('takes fftSize and smoothing from its options', () => {
		expect(wave().fftSize).toBe(2048);
		const custom = wave({ fftSize: 512, smoothing: 0.3 });
		expect([custom.fftSize, custom.smoothing]).toEqual([512, 0.3]);
		const dom = bars({ mode: 'dom', fftSize: 128, smoothing: 0.1 });
		expect([dom.fftSize, dom.smoothing]).toEqual([128, 0.1]);
		const canvas = bars({ mode: 'canvas', fftSize: 256 });
		expect(canvas.fftSize).toBe(256);
		expect(bars({ mode: 'dom' }).fftSize).toBeUndefined();
	});

	it('draws a silent frame as a flat line without throwing', () => {
		const target = makeTarget(60, 40);
		const preset = wave();
		preset.mount(target);
		const silent = frame(0, 2048);
		silent.waveform.fill(128);
		expect(() => preset.draw(silent)).not.toThrow();
		preset.destroy();
	});
});

describe('bars variants', () => {
	const colorOf = 'rgb(0, 128, 0)';
	const mounted = (options: Parameters<typeof bars>[0] & { mode: 'canvas' }) => {
		const target = makeTarget(40, 100);
		const preset = bars(options);
		preset.mount(target);
		return { target, preset, canvas: target.querySelector('canvas')! };
	};
	const column = (canvas: HTMLCanvasElement, x: number) => {
		const ratio = window.devicePixelRatio;
		return Array.from(
			{ length: canvas.height / ratio },
			(_, y) => pixel(canvas, Math.round(x * ratio), Math.round(y * ratio))[3] > 0,
		);
	};
	const shaped = { floorLevel: 0.3, range: 0.5, color: colorOf, count: 1, gap: 0 } as const;

	it.each(['solid', 'line', 'mirror'] as const)(
		'draws nothing for a quiet band in %s, however high the floor is: no minimum height as the music starts',
		(variant) => {
			const { preset, canvas } = mounted({ mode: 'canvas', variant, floor: 0.5, ...shaped });
			preset.draw(frame(Math.floor(0.3 * 255)));
			expect(column(canvas, 20).some(Boolean)).toBe(false);
			preset.destroy();
		},
	);

	it('rises a solid bar from the bottom by the shaped level, with a rounded top', () => {
		const { preset, canvas } = mounted({ mode: 'canvas', variant: 'solid', ...shaped });
		preset.draw(frame(Math.round(0.55 * 255)));
		const rows = column(canvas, 20);
		expect(rows[99]).toBe(true);
		expect(rows.filter(Boolean).length).toBeGreaterThan(45);
		expect(rows.filter(Boolean).length).toBeLessThan(55);
		preset.draw(frame(255));
		expect(column(canvas, 0)[0] || pixel(canvas, 0, 0)[3] > 0).toBe(false);
		preset.destroy();
	});

	it('draws a line bar as a thin column in the middle of a wide slot', () => {
		const { preset, canvas } = mounted({ mode: 'canvas', variant: 'line', lineWidth: 2, ...shaped });
		preset.draw(frame(255));
		const ratio = window.devicePixelRatio;
		expect(pixel(canvas, 20 * ratio, 50 * ratio)[3]).toBeGreaterThan(0);
		expect(pixel(canvas, 5 * ratio, 50 * ratio)[3]).toBe(0);
		expect(pixel(canvas, 35 * ratio, 50 * ratio)[3]).toBe(0);
		preset.destroy();
	});

	it('draws a mirror bar around the middle line, equally up and down', () => {
		const { preset, canvas } = mounted({ mode: 'canvas', variant: 'mirror', ...shaped });
		preset.draw(frame(Math.round(0.55 * 255)));
		const rows = column(canvas, 20);
		const first = rows.indexOf(true);
		const last = rows.lastIndexOf(true);
		expect(Math.abs(first - (99 - last))).toBeLessThanOrEqual(1);
		expect(first).toBeGreaterThan(10);
		preset.destroy();
	});

	it('rests as nothing, or as one dim hairline with idle floor', () => {
		const clear = mounted({ mode: 'canvas', variant: 'solid', ...shaped });
		expect(column(clear.canvas, 20).some(Boolean)).toBe(false);
		clear.preset.destroy();
		const floor = mounted({ mode: 'canvas', variant: 'solid', idle: 'floor', ...shaped });
		const rows = column(floor.canvas, 20);
		expect(rows.filter(Boolean).length).toBeLessThanOrEqual(2);
		expect(rows[99]).toBe(true);
		const alpha = pixel(floor.canvas, 20 * window.devicePixelRatio, 99 * window.devicePixelRatio)[3];
		expect(alpha).toBeLessThan(128);
		floor.preset.destroy();
	});

	it('holds a cap above a solid bar and draws none while the band is off', () => {
		const { preset, canvas } = mounted({ mode: 'canvas', variant: 'solid', peaks: {}, ...shaped });
		preset.draw(frame(Math.floor(0.3 * 255)));
		expect(column(canvas, 20).some(Boolean)).toBe(false);
		preset.draw(frame(255));
		const rows = column(canvas, 20);
		expect(rows[0]).toBe(true);
		preset.destroy();
	});

	it('keeps the earlier look without a variant: a plain solid bar at its floor, square ends', () => {
		const { preset, canvas } = mounted({ mode: 'canvas', floor: 0.5, count: 1, gap: 0, color: colorOf });
		preset.draw(frame(0));
		expect(column(canvas, 20).filter(Boolean)).toHaveLength(50);
		preset.destroy();
	});

	it('lights segments for variant led without segments set', () => {
		const { preset, canvas } = mounted({ mode: 'canvas', variant: 'led', ...shaped, segmentGap: 2 });
		preset.draw(frame(255));
		const rows = column(canvas, 20);
		expect(rows.some((on, row) => !on && rows[row - 1] && rows[row + 1])).toBe(true);
		preset.destroy();
	});
});
