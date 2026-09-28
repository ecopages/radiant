import { afterEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { createEventListener } from '../../src/helpers/create-event-listener';

class BlurListenerElement extends RadiantElement {}

customElements.define('non-bubbling-blur-element', BlurListenerElement);

function mountBlurListenerHost(): BlurListenerElement {
	const host = new BlurListenerElement();
	const input = document.createElement('input');
	input.setAttribute('data-input', '');
	host.appendChild(input);
	document.body.appendChild(host);
	return host;
}

describe('createEventListener non-bubbling delegation warning', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		document.body.innerHTML = '';
	});

	test('warns when a delegated listener subscribes to a non-bubbling event', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const host = mountBlurListenerHost();

		createEventListener(host, { selector: '[data-input]', type: 'blur' }, () => {});

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain('"blur"');
		expect(warn.mock.calls[0]?.[0]).toContain('focusout');
	});

	test('stays silent for bubbling types and for capture-phase non-bubbling types', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const host = mountBlurListenerHost();

		createEventListener(host, { selector: '[data-input]', type: 'blur', options: { capture: true } }, () => {});
		createEventListener(host, { selector: '[data-input]', type: 'focusout' }, () => {});

		expect(warn).not.toHaveBeenCalled();
	});

	test('stays silent in production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const host = mountBlurListenerHost();

		createEventListener(host, { selector: '[data-input]', type: 'mouseenter' }, () => {});

		expect(warn).not.toHaveBeenCalled();
	});
});
