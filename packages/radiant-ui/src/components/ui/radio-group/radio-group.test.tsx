import { afterEach, describe, expect, it } from 'vitest';
import { RuiRadioGroup as RuiRadioGroupElement } from './radio-group.script';
void RuiRadioGroupElement;

afterEach(() => {
	document.body.innerHTML = '';
});

describe('RuiRadioGroup taking over server markup', () => {
	it('names every radio and keeps exactly the server-checked one checked when the group connects', async () => {
		document.body.innerHTML =
			'<form method="get">' +
			'<rui-radio-group name="sort" value="price-asc">' +
			'<div data-radio-group-root role="radiogroup">' +
			'<label><input type="radio" value="relevance" /></label>' +
			'<label><input type="radio" value="price-asc" checked /></label>' +
			'<label><input type="radio" value="price-desc" /></label>' +
			'</div>' +
			'</rui-radio-group>' +
			'</form>';

		await customElements.whenDefined('rui-radio-group');
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

		const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
		expect(radios.map((radio) => radio.name)).toEqual(['sort', 'sort', 'sort']);
		expect(radios.filter((radio) => radio.checked).map((radio) => radio.value)).toEqual(['price-asc']);
		expect(new FormData(document.querySelector('form') as HTMLFormElement).getAll('sort')).toEqual(['price-asc']);
	});
});
