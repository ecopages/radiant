import { afterEach, describe, expect, it } from 'vitest';
import { RuiAutocomplete } from './autocomplete.script';
import { RuiCombobox } from '../combobox/combobox.script';

void RuiAutocomplete;
void RuiCombobox;

const wait = () => new Promise((resolve) => setTimeout(resolve, 20));

const AUTOCOMPLETE = `<rui-autocomplete><input data-autocomplete-input="" type="text" value="" /><div data-autocomplete-collection=""><div role="option" data-label="Germany">Germany</div><div role="option" data-label="Italy">Italy</div></div></rui-autocomplete>`;

function visibleCount(scope: Element): number {
	return [...scope.querySelectorAll<HTMLElement>('[role="option"]')].filter((option) => !option.hidden).length;
}

async function filterTo(scope: Element, text: string): Promise<HTMLInputElement> {
	const input = scope.querySelector<HTMLInputElement>('[data-autocomplete-input], [data-combobox-input]')!;
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	await wait();
	return input;
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('autocomplete form reset', () => {
	it('shows every option again when its form is reset', async () => {
		document.body.innerHTML = `<form id="a">${AUTOCOMPLETE}</form>`;
		const form = document.querySelector('form')!;
		await wait();

		await filterTo(form, 'ita');
		expect(visibleCount(form)).toBe(1);

		form.reset();
		await wait();

		expect(visibleCount(form)).toBe(2);
	});

	it('does not re-filter a control that belongs to another form', async () => {
		document.body.innerHTML = `<form id="a"></form><form id="b">${AUTOCOMPLETE}</form>`;
		const [formA, formB] = document.querySelectorAll('form');
		await wait();

		await filterTo(formB, 'ita');
		formB.querySelector<HTMLInputElement>('input')!.value = 'ita';
		formA.reset();
		await wait();

		expect(visibleCount(formB)).toBe(1);
	});

	it('follows the form attribute of an input outside the form', async () => {
		document.body.innerHTML = `<form id="a"></form><rui-autocomplete><input data-autocomplete-input="" form="a" value="" /><div data-autocomplete-collection=""><div role="option" data-label="Germany">Germany</div><div role="option" data-label="Italy">Italy</div></div></rui-autocomplete>`;
		const scope = document.querySelector('rui-autocomplete')!;
		await wait();

		await filterTo(scope, 'ita');
		expect(visibleCount(scope)).toBe(1);

		document.querySelector('form')!.reset();
		await wait();

		expect(visibleCount(scope)).toBe(2);
	});
});

describe('combobox form reset', () => {
	it('shows every option again when its form is reset', async () => {
		document.body.innerHTML = `<form><rui-combobox><div data-ref="root"><input data-combobox-input="" value="" /><div data-combobox-listbox=""><rui-listbox embedded=""><div role="option" data-value="de" data-label="Germany">Germany</div><div role="option" data-value="it" data-label="Italy">Italy</div></rui-listbox></div></div></rui-combobox></form>`;
		const form = document.querySelector('form')!;
		await wait();

		await filterTo(form, 'ita');
		expect(visibleCount(form)).toBe(1);

		form.reset();
		await wait();

		expect(visibleCount(form)).toBe(2);
	});
});

describe('autocomplete with an input owned by a combobox', () => {
	it.each(['replaced', 'removed and added back later'])('filters from an input that is %s', async (change) => {
		document.body.innerHTML = `<rui-select><input data-autocomplete-input="" type="text" value="" /><rui-autocomplete><div data-autocomplete-collection=""><div role="option" data-label="Germany">Germany</div><div role="option" data-label="Italy">Italy</div></div></rui-autocomplete></rui-select>`;
		const scope = document.querySelector('rui-select')!;
		await wait();

		const input = scope.querySelector('input')!;
		const fresh = input.cloneNode(true) as HTMLInputElement;
		if (change === 'replaced') {
			input.replaceWith(fresh);
		} else {
			input.remove();
			await wait();
			scope.prepend(fresh);
		}
		await filterTo(scope, 'ita');

		expect(visibleCount(scope)).toBe(1);
	});
});
