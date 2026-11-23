import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiField as RuiFieldElement } from './field.script';
import { RuiForm as RuiFormElement } from '../form/form.script';
import { RUI_CONTROL_CONNECT_EVENT, announceControlConnect, registerFieldControl } from '@/lib/form/control-protocol';
import type { FormStateStore, FormStateStoreSnapshot } from '@/lib/form/form-state-store';
import type { FormContextValue } from '@/lib/form/form-context';
import { FormStore } from '@/lib/form/form-store';
import '../checkbox/checkbox.script';
import '../switch/switch.script';
import '../combobox/combobox.script';
import '../date-field/date-field.script';
import '../date-input/date-input.script';
import '../date-range-picker/date-range-picker.script';
import '../select/select.script';
import '../radio-group/radio-group.script';
import '../checkbox-group/checkbox-group.script';
import '../listbox/listbox.script';
import '../tag-group/tag-group.script';
import '../slider/slider.script';
import '../knob/knob.script';
import '../number-field/number-field.script';

void RuiFieldElement;
void RuiFormElement;

const HOSTS = [
	'rui-checkbox',
	'rui-switch',
	'rui-combobox',
	'rui-date-field',
	'rui-date-input',
	'rui-date-range-picker',
	'rui-select',
	'rui-radio-group',
	'rui-checkbox-group',
	'rui-listbox',
	'rui-tag-group',
	'rui-slider',
	'rui-knob',
	'rui-number-field',
];

const cleanup: Array<() => void> = [];

afterEach(() => {
	for (const dispose of cleanup.splice(0)) {
		dispose();
	}
});

async function settle(): Promise<void> {
	await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

class LateHost extends HTMLElement {
	value = '';
	connectedCallback(): void {
		announceControlConnect(this);
	}
}

function defineLateHost(): void {
	if (!customElements.get('x-late-host')) {
		customElements.define('x-late-host', LateHost);
	}
	registerFieldControl('x-late-host', {
		read: (host) => (host as LateHost).value,
		write: (host, value) => {
			(host as LateHost).value = value == null ? '' : String(value);
		},
	});
}

function hostStore(initial: Record<string, unknown>) {
	const snapshot: FormStateStoreSnapshot = { values: initial, errors: {}, warnings: {} };
	const reportNative = vi.fn();
	const store: FormStateStore = {
		getValue: (path) => initial[path],
		setValue() {},
		blur() {},
		getSnapshot: () => snapshot,
		subscribe: () => () => {},
		reset() {},
		async validate() {
			return { outcome: 'passed' };
		},
		reportNative,
	};
	return { store, reportNative };
}

async function mountEmptyField(connect: (form: RuiFormElement) => void) {
	const host = document.createElement('div');
	host.innerHTML = '<rui-form><form data-ref="form"><rui-field name="x"></rui-field></form></rui-form>';
	document.body.append(host);
	cleanup.push(() => host.remove());
	const form = host.querySelector('rui-form') as RuiFormElement;
	connect(form);
	await customElements.whenDefined('rui-field');
	await settle();
	return { form, field: host.querySelector('rui-field') as RuiFieldElement };
}

describe('control connect event', () => {
	it('is announced by every Radiant control host when it connects', async () => {
		for (const tag of HOSTS) {
			const seen: Element[] = [];
			const listener = (event: Event) => {
				if (event.target instanceof Element) seen.push(event.target);
			};
			document.addEventListener(RUI_CONTROL_CONNECT_EVENT, listener);
			const element = document.createElement(tag);
			document.body.append(element);
			await settle();

			expect(seen, tag).toContain(element);
			document.removeEventListener(RUI_CONTROL_CONNECT_EVENT, listener);
			element.remove();
		}
	});

	it('seeds a custom control inserted after the field registered, and reports its fact', async () => {
		defineLateHost();
		const { store, reportNative } = hostStore({ x: 'stored' });
		const { field } = await mountEmptyField((form) => void form.connect(store));
		reportNative.mockClear();

		const late = document.createElement('x-late-host') as LateHost;
		field.append(late);
		await settle();

		expect(late.value).toBe('stored');
		expect(reportNative).toHaveBeenCalledWith({ x: null });
	});

	it('picks a late native input up on the next sync, not before', async () => {
		const { field, form } = await mountEmptyField(() => {});
		const store = (
			form as unknown as { formProvider: { getContext(): FormContextValue } }
		).formProvider.getContext().store;
		if (!(store instanceof FormStore)) {
			throw new Error('expected the form to own a FormStore');
		}
		store.setValue('x', 'first');
		const input = document.createElement('input');
		input.setAttribute('data-rui-control', '');
		field.append(input);
		await settle();
		expect(input.value).toBe('');

		store.setValue('x', 'second');
		await settle();

		expect(input.value).toBe('second');
	});

	it('leaves no mutation observer on the field', async () => {
		const observe = vi.spyOn(MutationObserver.prototype, 'observe');
		const { field } = await mountEmptyField((form) => void form.connect(hostStore({ x: 'v' }).store));
		const late = document.createElement('input');
		field.append(late);
		await settle();

		expect(observe.mock.calls.filter(([target]) => field.contains(target) || target === field)).toHaveLength(0);
		observe.mockRestore();
	});
});
