import { afterEach, describe, expect, test } from 'vitest';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { FormAssociatedElement, type FormValue } from '../../src/form-associated-element';

@customElement('fae-plain-dom')
class PlainDomControl extends FormAssociatedElement {
	@prop({ type: String, reflect: true, defaultValue: 'blue' }) value: string;

	get hasInternals(): boolean {
		return this.internals !== undefined;
	}

	protected override formValue(): FormValue {
		return this.value;
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = String(state);
	}
}

afterEach(() => {
	document.body.innerHTML = '';
});

/** happy-dom has no `attachInternals`, like the SSR DOM shim. */
describe('FormAssociatedElement without ElementInternals', () => {
	test('constructs without internals and still runs its update cycle', async () => {
		const host = document.createElement('fae-plain-dom') as PlainDomControl;
		document.body.append(host);
		await host.updateComplete;

		expect(host.hasInternals).toBe(false);
		host.value = 'green';
		await host.updateComplete;
		expect(host.getAttribute('value')).toBe('green');
	});

	test('falls back to its own disabled attribute for the effective state', async () => {
		const host = document.createElement('fae-plain-dom') as PlainDomControl;
		host.setAttribute('disabled', '');
		document.body.append(host);
		await host.updateComplete;

		expect(host.disabled).toBe(true);
		expect(host.effectiveDisabled).toBe(true);

		host.removeAttribute('disabled');
		expect(host.effectiveDisabled).toBe(false);
	});

	test('observes and reflects name and disabled alongside subclass props', () => {
		expect(Reflect.get(PlainDomControl, 'observedAttributes')).toEqual(
			expect.arrayContaining(['name', 'disabled', 'value']),
		);
	});
});
