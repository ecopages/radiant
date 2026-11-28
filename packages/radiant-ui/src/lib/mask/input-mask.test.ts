import { describe, expect, it } from 'vitest';
import {
	applyInputMask,
	extractMaskInput,
	extractUnmaskedValue,
	formatUnmaskedValue,
	formatWithMask,
	maskToPlaceholder,
	parseMaskPattern,
} from './input-mask';

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

describe('extractMaskInput', () => {
	it('returns the slot characters only, so the fixed text of an infix mask is not part of it', () => {
		const tokens = parseMaskPattern('0{5}0');
		expect(extractMaskInput('152', tokens)).toBe('12');
		expect(formatWithMask('152', tokens)).toBe('155');
	});
});

describe('extractUnmaskedValue and formatUnmaskedValue', () => {
	it.each([
		{ name: 'fixed prefix', mask: '+{7} 000', display: '+7 123', unmasked: '7123' },
		{ name: 'fixed prefix, partial', mask: '+{7} 000', display: '+7 1', unmasked: '71' },
		{ name: 'infix fixed text', mask: '0{5}0', display: '152', unmasked: '152' },
		{ name: 'fixed text before a literal', mask: '{AB}-00', display: 'AB-12', unmasked: 'AB12' },
		{ name: 'empty', mask: '{AB}-00', display: '', unmasked: '' },
		{ name: 'optional section absent', mask: '000[-00]', display: '123', unmasked: '123' },
		{ name: 'optional section present', mask: '000[-00]', display: '123-45', unmasked: '12345' },
	])('round-trips $name: $mask, "$display" and "$unmasked"', ({ mask, display, unmasked }) => {
		const tokens = parseMaskPattern(mask);
		expect(extractUnmaskedValue(display, tokens)).toBe(unmasked);
		expect(formatUnmaskedValue(unmasked, tokens)).toBe(display);
		expect(formatUnmaskedValue(extractUnmaskedValue(display, tokens), tokens)).toBe(display);
	});

	it('shows the fixed text of a value that does not carry it', () => {
		expect(formatUnmaskedValue('123', parseMaskPattern('+{7} 000'))).toBe('+7 123');
	});
});

describe('applyInputMask', () => {
	it('keeps every slot character when one is inserted in the middle', () => {
		expect(applyInputMask('(5595) 123-4567', '(000) 000-0000')).toBe('(559) 512-3456');
	});

	it('skips characters that fit no slot instead of stopping at them', () => {
		expect(applyInputMask('555-123-4567', '(000) 000-0000')).toBe('(555) 123-4567');
		expect(applyInputMask('5551234567999', '(000) 000-0000')).toBe('(555) 123-4567');
	});

	it('takes the definitions it is given', () => {
		expect(applyInputMask('G1A2B34', 'XX-00', { X: /[A-F]/ })).toBe('AB-34');
	});

	it('shows an optional literal only when the optional section is entered', () => {
		expect(applyInputMask('123', '000[-00]')).toBe('123');
		expect(applyInputMask('1234', '000[-00]')).toBe('123-4');
	});
});
