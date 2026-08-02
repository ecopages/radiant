import { describe, expect, it } from 'vitest';
import { applyInputMask, formatWithMask, maskToPlaceholder, parseMaskPattern } from './input-mask';

describe('parseMaskPattern', () => {
	it('parses fixed segments and digit slots', () => {
		const tokens = parseMaskPattern('+{7}(000)000-00-00');
		expect(tokens.filter((token) => token.type === 'input')).toHaveLength(10);
		expect(tokens.find((token) => token.type === 'fixed')).toEqual({ type: 'fixed', value: '7' });
	});

	it('parses optional sections', () => {
		const tokens = parseMaskPattern('0[00]');
		expect(tokens).toEqual([
			{ type: 'input', definition: '0', kind: 'digit', optional: false },
			{ type: 'input', definition: '0', kind: 'digit', optional: true },
			{ type: 'input', definition: '0', kind: 'digit', optional: true },
		]);
	});

	it('parses escaped literals', () => {
		const tokens = parseMaskPattern('\\0');
		expect(tokens).toEqual([{ type: 'literal', value: '0' }]);
	});
});

describe('applyInputMask', () => {
	it('formats a Russian phone number', () => {
		expect(applyInputMask('9123456789', '+{7}(000)000-00-00')).toBe('+7(912)345-67-89');
	});

	it('returns empty for no digits', () => {
		expect(applyInputMask('', '+{7}(000)000-00-00')).toBe('');
	});

	it('ignores the fixed country code when reformatting', () => {
		expect(applyInputMask('+7(912)345-67-897', '+{7}(000)000-00-00')).toBe('+7(912)345-67-89');
		expect(applyInputMask('+7(777)777-77-777', '+{7}(000)000-00-00')).toBe('+7(777)777-77-77');
	});

	it('starts formatting from the first user digit', () => {
		expect(applyInputMask('9', '+{7}(000)000-00-00')).toBe('+7(9');
	});
});

describe('maskToPlaceholder', () => {
	it('replaces digit slots with underscores', () => {
		expect(maskToPlaceholder('+{7}(000)000-00-00')).toBe('+7(___)___-__-__');
	});
});

describe('formatWithMask', () => {
	it('formats IMask digit slots', () => {
		const tokens = parseMaskPattern('00/00/0000');
		expect(formatWithMask('08212002', tokens)).toBe('08/21/2002');
	});
});
