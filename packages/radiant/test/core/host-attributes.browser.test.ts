import { afterEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';

@customElement('host-attributes-landmark-test', { hostAttributes: { role: 'complementary', 'data-kind': 'pane' } })
class HostAttributesLandmark extends RadiantElement {
	roleAtConnected: string | null = null;

	protected override onConnected(): void {
		this.roleAtConnected = this.getAttribute('role');
	}
}

@customElement('host-attributes-subclass-test', { hostAttributes: { 'data-kind': 'drawer' } })
class HostAttributesSubclass extends HostAttributesLandmark {}

describe('@customElement hostAttributes', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('writes the declared attributes at connect, before onConnected', async () => {
		const element = document.createElement('host-attributes-landmark-test') as HostAttributesLandmark;
		expect(element.hasAttribute('role')).toBe(false);

		document.body.append(element);

		expect(element.getAttribute('role')).toBe('complementary');
		expect(element.getAttribute('data-kind')).toBe('pane');
		await element.updateComplete;
		expect(element.roleAtConnected).toBe('complementary');
	});

	test('keeps an attribute the author wrote', () => {
		document.body.innerHTML = '<host-attributes-landmark-test role="region"></host-attributes-landmark-test>';
		const element = document.body.firstElementChild as HostAttributesLandmark;

		expect(element.getAttribute('role')).toBe('region');
		expect(element.getAttribute('data-kind')).toBe('pane');
	});

	test('a subclass inherits the base attributes and overrides them by name', () => {
		const element = document.createElement('host-attributes-subclass-test') as HostAttributesSubclass;
		document.body.append(element);

		expect(element.getAttribute('role')).toBe('complementary');
		expect(element.getAttribute('data-kind')).toBe('drawer');
	});
});
