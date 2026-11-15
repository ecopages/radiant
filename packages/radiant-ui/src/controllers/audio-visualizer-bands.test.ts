import { describe, expect, it } from 'vitest';
import { bandPeak, litSegments, logBands, segmentBounds, stepPeak, type Peak } from './audio-visualizer-bands';

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
