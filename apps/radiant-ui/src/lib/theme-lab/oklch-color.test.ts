import { describe, expect, it } from 'vitest';
import { hexToHue, hexToOklch, oklchToHex } from './oklch-color';

describe('hexToOklch', () => {
	it('matches reference OKLCH values for the sRGB primaries', () => {
		expect(hexToOklch('#ff0000')?.hue).toBeCloseTo(29.23, 0);
		expect(hexToOklch('#00ff00')?.hue).toBeCloseTo(142.5, 0);
		expect(hexToOklch('#0000ff')?.hue).toBeCloseTo(264.05, 0);
		expect(hexToOklch('#ffffff')?.lightness).toBeCloseTo(1, 2);
	});

	it('reads shorthand and a missing hash, and rejects anything else', () => {
		expect(hexToOklch('#f00')?.hue).toBeCloseTo(29.23, 0);
		expect(hexToOklch('00f')?.hue).toBeCloseTo(264.05, 0);
		expect(hexToOklch('red')).toBeUndefined();
		expect(hexToOklch('#12345')).toBeUndefined();
	});
});

describe('hexToHue', () => {
	it('returns whole degrees', () => {
		expect(hexToHue('#0000ff')).toBe(264);
	});

	it('has no hue for greys', () => {
		expect(hexToHue('#808080')).toBeUndefined();
		expect(hexToHue('#ffffff')).toBeUndefined();
	});
});

describe('oklchToHex', () => {
	it('round-trips an in-gamut color', () => {
		const color = hexToOklch('#3b5bdb');
		expect(color).toBeDefined();
		expect(oklchToHex(color!)).toBe('#3b5bdb');
	});

	it('clips out-of-gamut chroma into valid hex', () => {
		expect(oklchToHex({ lightness: 0.7, chroma: 0.4, hue: 150 })).toMatch(/^#[0-9a-f]{6}$/);
	});
});
