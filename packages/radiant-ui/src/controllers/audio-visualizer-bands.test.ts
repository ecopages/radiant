import { describe, expect, it } from 'vitest';
import {
	bandPeak,
	barBounds,
	litSegments,
	logBands,
	segmentBounds,
	shapeLevel,
	stepGain,
	stepPeak,
	type Gain,
	type LevelShape,
	type Peak,
	type Rect,
} from './audio-visualizer-bands';

describe('logBands', () => {
	it('splits the range into contiguous bands of equal ratio', () => {
		const bands = logBands(2, 100, 10000);
		expect(bands[0][0]).toBeCloseTo(100);
		expect(bands[0][1]).toBeCloseTo(1000);
		expect(bands[1][0]).toBeCloseTo(1000);
		expect(bands[1][1]).toBeCloseTo(10000);
	});

	it('defaults to the speech and music range', () => {
		const bands = logBands(4);
		expect(bands).toHaveLength(4);
		expect(bands[0][0]).toBeCloseTo(60);
		expect(bands[3][1]).toBeCloseTo(8000);
	});
});

describe('bandPeak', () => {
	const frequency = new Uint8Array(512);
	frequency[10] = 51;
	frequency[100] = 255;

	it('reads the loudest bin in the band, as 0 to 1', () => {
		const hertzPerBin = 44100 / 1024;
		expect(bandPeak(frequency, 44100, 1024, [0, hertzPerBin * 200])).toBeCloseTo(1);
		expect(bandPeak(frequency, 44100, 1024, [hertzPerBin * 5, hertzPerBin * 20])).toBeCloseTo(0.2);
		expect(bandPeak(frequency, 44100, 1024, [hertzPerBin * 200, hertzPerBin * 300])).toBe(0);
	});

	it('reads one bin for a band narrower than a bin', () => {
		const hertzPerBin = 44100 / 1024;
		expect(bandPeak(frequency, 44100, 1024, [hertzPerBin * 100.2, hertzPerBin * 100.4])).toBe(1);
	});

	it('reads the last bin for a band above the Nyquist frequency of a low sample rate', () => {
		const low = new Uint8Array(512);
		low[511] = 255;
		expect(bandPeak(low, 8000, 1024, [6000, 20000])).toBe(1);
		expect(bandPeak(low, 8000, 1024, [30000, 40000])).toBe(1);
	});
});

describe('stepPeak', () => {
	const timing = { hold: 400, fall: 1 };

	it('raises the cap to a higher level and restarts the hold', () => {
		const peak: Peak = { value: 0.3, heldSince: 0 };
		stepPeak(peak, 0.8, 1000, 16, timing);
		expect(peak).toEqual({ value: 0.8, heldSince: 1000 });
	});

	it('holds the cap while the hold lasts, however far the level dropped', () => {
		const peak: Peak = { value: 0.8, heldSince: 1000 };
		stepPeak(peak, 0.1, 1400, 400, timing);
		expect(peak.value).toBe(0.8);
	});

	it('falls by `fall` bar heights per second once the hold is over', () => {
		const peak: Peak = { value: 0.8, heldSince: 1000 };
		stepPeak(peak, 0.1, 1500, 100, timing);
		expect(peak.value).toBeCloseTo(0.7);
	});

	it('never falls below the level', () => {
		const peak: Peak = { value: 0.8, heldSince: 0 };
		stepPeak(peak, 0.75, 5000, 1000, timing);
		expect(peak.value).toBe(0.75);
	});
});

describe('litSegments', () => {
	it('lights a segment as soon as the level enters it', () => {
		expect(litSegments(0.01, 10)).toBe(1);
		expect(litSegments(0.5, 10)).toBe(5);
		expect(litSegments(0.51, 10)).toBe(6);
	});

	it('stays within 0 and the number of segments', () => {
		expect(litSegments(0, 10)).toBe(0);
		expect(litSegments(1.4, 10)).toBe(10);
		expect(litSegments(-1, 10)).toBe(0);
	});
});

describe('segmentBounds', () => {
	it('stacks equal segments from the bottom of the bar, with the gap between them', () => {
		const first = segmentBounds(0, 4, 2, 10, 38);
		const last = segmentBounds(3, 4, 2, 10, 38);
		expect(first).toEqual({ y: 40, height: 8 });
		expect(last).toEqual({ y: 10, height: 8 });
		expect(segmentBounds(1, 4, 2, 10, 38).y).toBe(30);
	});
});

describe('shapeLevel', () => {
	const shape: LevelShape = { floorLevel: 0.3, range: 0.6, curve: 1 };

	it('is the identity with the defaults', () => {
		const identity: LevelShape = { floorLevel: 0, range: 1, curve: 1 };
		expect([0, 0.25, 1].map((level) => shapeLevel(level, identity))).toEqual([0, 0.25, 1]);
	});

	it('is off at and below the floor level and full at the end of the range', () => {
		expect(shapeLevel(0.3, shape)).toBe(0);
		expect(shapeLevel(0.1, shape)).toBe(0);
		expect(shapeLevel(0.6, shape)).toBeCloseTo(0.5);
		expect(shapeLevel(0.9, shape)).toBe(1);
		expect(shapeLevel(1, shape)).toBe(1);
	});

	it('pushes the middle down with a curve above 1 and keeps both ends', () => {
		const curved = { ...shape, curve: 2 };
		expect(shapeLevel(0.6, curved)).toBeCloseTo(0.25);
		expect(shapeLevel(0.3, curved)).toBe(0);
		expect(shapeLevel(0.9, curved)).toBe(1);
	});

	it('scales to a running maximum, never narrower than the minimum range', () => {
		expect(shapeLevel(0.45, shape, 0.6)).toBeCloseTo(0.5);
		expect(shapeLevel(0.31, shape, 0.3)).toBeCloseTo(0.01 / 0.15);
		expect(shapeLevel(0.2, shape, 0)).toBe(0);
	});
});

describe('stepGain', () => {
	it('rises to a louder band at once and falls by the decay per second', () => {
		const gain: Gain = { top: 0.4 };
		stepGain(gain, 0.9, 16, 0.2);
		expect(gain.top).toBe(0.9);
		stepGain(gain, 0.1, 1000, 0.2);
		expect(gain.top).toBeCloseTo(0.7);
		stepGain(gain, 0.8, 1000, 0.2);
		expect(gain.top).toBe(0.8);
	});
});

describe('the bars of the audio player over synthetic frames', () => {
	const SAMPLE_RATE = 44100;
	const FFT_SIZE = 2048;
	const SEGMENTS = 14;
	const bands = logBands(40, 80, 2400);
	const shape: LevelShape = { floorLevel: 0.32, range: 0.66, curve: 1.6 };

	/** A frame of `noise` (a byte) with a tone of `peak` (a byte) at `hertz` and a one-bin skirt. */
	function frame(noise: number, tone?: { hertz: number; peak: number }): Uint8Array {
		const bins = new Uint8Array(FFT_SIZE / 2);
		bins.forEach((_, bin) => (bins[bin] = Math.round(noise * (0.9 + (0.2 * ((bin * 7) % 5)) / 4))));
		if (tone) {
			const bin = Math.round(tone.hertz / (SAMPLE_RATE / FFT_SIZE));
			bins[bin] = tone.peak;
			bins[bin - 1] = Math.round(tone.peak * 0.8);
			bins[bin + 1] = Math.round(tone.peak * 0.8);
		}
		return bins;
	}
	const lit = (bins: Uint8Array, top?: number) =>
		bands.map((band) => litSegments(shapeLevel(bandPeak(bins, SAMPLE_RATE, FFT_SIZE, band), shape, top), SEGMENTS));

	it('lights nothing for silence and for the noise floor of the media', () => {
		expect(lit(frame(0)).every((count) => count === 0)).toBe(true);
		expect(lit(frame(60)).every((count) => count === 0)).toBe(true);
	});

	it('lights a quiet tone low and a loud tone to the top, and only where the tone is', () => {
		const quiet = lit(frame(55, { hertz: 440, peak: 125 }));
		const loud = lit(frame(55, { hertz: 440, peak: 255 }));
		expect(Math.max(...quiet)).toBeGreaterThan(0);
		expect(Math.max(...quiet)).toBeLessThanOrEqual(3);
		expect(Math.max(...loud)).toBe(SEGMENTS);
		expect(loud.filter((count) => count === 0).length).toBeGreaterThan(25);
		const peakBand = loud.indexOf(SEGMENTS);
		expect(loud[peakBand + 3]).toBeLessThan(loud[peakBand]);
	});

	it('gives adjacent bands different heights across a spread of tones', () => {
		const bins = frame(55, { hertz: 300, peak: 255 });
		for (const [hertz, peak] of [
			[600, 200],
			[900, 170],
			[1400, 150],
		] as const) {
			bins[Math.round(hertz / (SAMPLE_RATE / FFT_SIZE))] = peak;
		}
		const heights = lit(bins);
		const changes = heights.slice(1).filter((count, index) => count !== heights[index]).length;
		expect(changes).toBeGreaterThanOrEqual(10);
	});

	it('moves with a beat: a bass hit and the gap after it light different bars', () => {
		const hit = lit(frame(55, { hertz: 120, peak: 255 }));
		const gap = lit(frame(55, { hertz: 120, peak: 70 }));
		expect(Math.max(...hit)).toBe(SEGMENTS);
		expect(Math.max(...gap)).toBe(0);
	});

	it('stretches a quiet track to the full height when scaled to its own running maximum', () => {
		const quiet = frame(55, { hertz: 440, peak: 150 });
		const fixed = lit(quiet);
		const adaptive = lit(quiet, 150 / 255);
		expect(Math.max(...fixed)).toBeLessThan(SEGMENTS / 2);
		expect(Math.max(...adaptive)).toBe(SEGMENTS);
	});
});

describe('barBounds', () => {
	const out = (): Rect => ({ x: 0, y: 0, width: 0, height: 0 });

	it('rises a solid bar from the bottom of the area and fills the slot', () => {
		expect(barBounds(out(), 'solid', 0.5, 10, 8, 2, 4, 100)).toEqual({ x: 10, y: 54, width: 8, height: 50 });
	});

	it('centers a line bar in its slot and caps its width at the slot', () => {
		expect(barBounds(out(), 'line', 1, 10, 8, 2, 0, 100)).toEqual({ x: 13, y: 0, width: 2, height: 100 });
		expect(barBounds(out(), 'line', 1, 10, 1, 2, 0, 100)).toMatchObject({ x: 10, width: 1 });
	});

	it('grows a mirror bar both ways from the middle', () => {
		expect(barBounds(out(), 'mirror', 0.5, 0, 6, 2, 0, 100)).toEqual({ x: 0, y: 25, width: 6, height: 50 });
	});

	it('gives a level of 0 no height, so a bar has no minimum, in every shape', () => {
		for (const shape of ['solid', 'line', 'mirror'] as const) {
			expect(barBounds(out(), shape, 0, 0, 8, 2, 0, 100).height).toBe(0);
		}
	});

	it('writes into the rectangle it is given', () => {
		const target = out();
		expect(barBounds(target, 'solid', 1, 0, 4, 2, 0, 10)).toBe(target);
	});
});
