import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx';
import { RuiInput, type RuiInputProps } from './input';

function mount(props: RuiInputProps): HTMLInputElement {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(<RuiInput {...props} />);
	return host.querySelector('input') as HTMLInputElement;
}

async function focusAt(input: HTMLInputElement, caret: number): Promise<void> {
	input.focus();
	input.setSelectionRange(caret, caret);
}

/**
 * Inserts text through the browser's own editing path, which fires the same `beforeinput` and `input`
 * events a paste does, without the clipboard permission a real paste needs.
 */
function insertText(text: string): void {
	document.execCommand('insertText', false, text);
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('RuiInput mask editing', () => {
	const phone = '(000) 000-0000';
	const shown = '(555) 123-4567';

	it('keeps every digit and the caret when one is typed in the middle', async () => {
		const input = mount({ mask: phone, value: shown });
		await focusAt(input, '(55'.length);
		await userEvent.keyboard('9');
		expect(input.value).toBe('(559) 512-3456');
		expect(input.selectionStart).toBe('(559'.length);
	});

	it('deletes the digit before a literal on Backspace over it', async () => {
		const input = mount({ mask: phone, value: shown });
		await focusAt(input, '(555) '.length);
		await userEvent.keyboard('{Backspace}');
		expect(input.value).toBe('(551) 234-567');
		expect(input.selectionStart).toBe('(55'.length);
	});

	it('deletes the digit after a literal on Delete before it', async () => {
		const input = mount({ mask: phone, value: shown });
		await focusAt(input, '(555) 123'.length);
		await userEvent.keyboard('{Delete}');
		expect(input.value).toBe('(555) 123-567');
		expect(input.selectionStart).toBe('(555) 123'.length);
	});

	it('deletes the digit before the caret on Backspace as usual', async () => {
		const input = mount({ mask: phone, value: shown });
		await focusAt(input, '(555'.length);
		await userEvent.keyboard('{Backspace}');
		expect(input.value).toBe('(551) 234-567');
		expect(input.selectionStart).toBe('(55'.length);
	});

	it('formats pasted text and puts the caret at the end', async () => {
		const input = mount({ mask: phone });
		await focusAt(input, 0);
		insertText('555-123-4567');
		expect(input.value).toBe(shown);
		expect(input.selectionStart).toBe(shown.length);
	});

	it('drops the overflow of a paste', async () => {
		const input = mount({ mask: phone });
		await focusAt(input, 0);
		insertText('5551234567999');
		expect(input.value).toBe(shown);
		expect(input.selectionStart).toBe(shown.length);
	});

	it('keeps the case of letter slots', async () => {
		const input = mount({ mask: 'aa00 0000' });
		await focusAt(input, 0);
		await userEvent.keyboard('es121234');
		expect(input.value).toBe('es12 1234');
		expect(input.selectionStart).toBe('es12 1234'.length);
	});

	it('takes definitions and ignores characters no slot accepts', async () => {
		const input = mount({ mask: 'XX-00', definitions: { X: /[A-F]/ } });
		await focusAt(input, 0);
		await userEvent.keyboard('G1A2B34');
		expect(input.value).toBe('AB-34');
		expect(input.selectionStart).toBe('AB-34'.length);
	});
});

describe('RuiInput mask attributes', () => {
	it('shows the authored placeholder over the mask placeholder', () => {
		expect(mount({ mask: '00-00', placeholder: 'Code' }).placeholder).toBe('Code');
	});

	it('derives the placeholder from the mask when none is authored', () => {
		expect(mount({ mask: '00-00' }).placeholder).toBe('__-__');
	});

	it('shows the numeric keyboard only when every slot is a digit', () => {
		expect(mount({ mask: '00-00' }).getAttribute('inputmode')).toBe('numeric');
		expect(mount({ mask: 'aa00' }).hasAttribute('inputmode')).toBe(false);
	});

	it('keeps an explicit inputmode, with or without a mask', () => {
		expect(mount({ mask: '00-00', inputmode: 'text' }).getAttribute('inputmode')).toBe('text');
		expect(mount({ inputmode: 'decimal' }).getAttribute('inputmode')).toBe('decimal');
	});
});
