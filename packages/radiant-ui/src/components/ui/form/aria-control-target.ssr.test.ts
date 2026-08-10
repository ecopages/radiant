// @vitest-environment node
/**
 * Runs in plain Node so `install-ssr-runtime` installs Radiant's minimal DOM rather than
 * detecting an existing happy-dom. happy-dom implements `:checked`; the minimal DOM
 * rejects every pseudo-class, so only this environment reproduces the SSR failure.
 */
import { describe, expect, it } from 'vitest';
import '@ecopages/radiant/server/install-ssr-runtime';
import { getAriaControlTarget } from './control-protocol';

function radioGroup(html: string): HTMLElement {
	const host = document.createElement('rui-radio-group');
	host.innerHTML = html;
	return host as unknown as HTMLElement;
}

describe('getAriaControlTarget under the minimal SSR DOM', () => {
	it('targets the radio carrying the checked attribute', () => {
		const host = radioGroup(`
			<input type="radio" value="free" />
			<input type="radio" value="pro" checked />
		`);

		const target = getAriaControlTarget(host) as HTMLInputElement;

		expect(target.localName).toBe('input');
		expect(target.getAttribute('value')).toBe('pro');
	});

	it('falls back to the first radio when none is checked', () => {
		const host = radioGroup(`
			<input type="radio" value="free" />
			<input type="radio" value="pro" />
		`);

		expect((getAriaControlTarget(host) as HTMLInputElement).getAttribute('value')).toBe('free');
	});

	it('falls back to the host when the group renders no radios', () => {
		const host = radioGroup('<span>no controls yet</span>');

		expect(getAriaControlTarget(host)).toBe(host);
	});

	it('never sends a pseudo-class selector to the minimal DOM', () => {
		const host = radioGroup('<input type="radio" value="free" checked />');

		expect(() => getAriaControlTarget(host)).not.toThrow(SyntaxError);
	});
});
