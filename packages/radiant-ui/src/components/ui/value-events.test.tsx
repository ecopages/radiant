import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { userEvent } from 'storybook/test';
import { RuiForm } from './form';
import { RuiForm as RuiFormElement } from './form/form.script';
import { RuiField } from './field';
import { RuiCheckbox } from './checkbox';
import { RuiCheckbox as RuiCheckboxElement } from './checkbox/checkbox.script';
import { RuiCheckboxGroup, RuiCheckboxGroupControl } from './checkbox-group';
import { RuiCheckboxGroup as RuiCheckboxGroupElement } from './checkbox-group/checkbox-group.script';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from './radio-group';
import { RuiRadioGroup as RuiRadioGroupElement } from './radio-group/radio-group.script';
import { RuiSwitch } from './switch';
import { RuiSwitch as RuiSwitchElement } from './switch/switch.script';
import { RuiSlider } from './slider';
import { RuiSlider as RuiSliderElement } from './slider/slider.script';
import { RuiKnob } from './knob';
import { RuiKnob as RuiKnobElement } from './knob/knob.script';
import { RuiNumberField } from './number-field';
import { RuiNumberField as RuiNumberFieldElement } from './number-field/number-field.script';
import { RuiDateInput } from './date-input';
import { RuiDateInput as RuiDateInputElement } from './date-input/date-input.script';
import { RuiDateField } from './date-field';
import { RuiSelect } from './select';
import { RuiCombobox } from './combobox';
import { RuiListbox } from './listbox';
import { RuiTag, RuiTagGroup, RuiTagList } from './tag-group';
import { RuiDateRangePicker } from './date-range-picker';
import { FormStore } from '@/lib/form/form-store';
import { RuiDateField as RuiDateFieldElement } from './date-field/date-field.script';
import type { FormStateStore } from '@/lib/form/form-state-store';
import { registerFieldControl } from '@/lib/form/control-protocol';

void RuiFormElement;

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
	document.body.innerHTML = '';
});

async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

async function mount(content: JsxRenderable): Promise<HTMLDivElement> {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	root.render(content);
	cleanups.push(() => {
		root.unmount();
		host.remove();
	});
	await settle();
	return host;
}

/** What a bubble listener on an ancestor sees: the event type, its target, and a value read when it fires. */
type Seen = { type: string; target: Element | null; value: unknown };

function listen(root: HTMLElement, read: () => unknown): Seen[] {
	const seen: Seen[] = [];
	for (const type of ['input', 'change']) {
		root.addEventListener(type, (event) => {
			seen.push({ type, target: event.target instanceof Element ? event.target : null, value: read() });
		});
	}
	return seen;
}

function query<T extends Element>(root: ParentNode, selector: string): T {
	const element = root.querySelector<T>(selector);
	if (!element) {
		throw new Error(`missing ${selector}`);
	}
	return element;
}

function recordingStore(initial: Record<string, unknown>) {
	let values = initial;
	let snapshot = { values, errors: {}, warnings: {} };
	const listeners = new Set<() => void>();
	const writes: Array<[string, unknown]> = [];
	const store: FormStateStore = {
		getValue: (path) => values[path],
		setValue(path, value) {
			writes.push([path, value]);
			values = { ...values, [path]: value };
			snapshot = { values, errors: {}, warnings: {} };
			for (const listener of [...listeners]) listener();
		},
		blur() {},
		reportNative() {},
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset() {},
		async validate() {
			return { outcome: 'passed' };
		},
	};
	return { store, writes };
}

async function mountInField(content: JsxRenderable, store: FormStateStore, name: string) {
	return mount(
		<RuiForm ref={(form) => (form ? form.connect(store) : undefined)}>
			<RuiField name={name}>{content}</RuiField>
		</RuiForm>,
	);
}

describe('form value events: the native input and change, in one sequence per interaction', () => {
	it('checkbox: the input fires input then change, the host dispatches nothing, and checked is fresh', async () => {
		const container = await mount(<RuiCheckbox>Agree</RuiCheckbox>);
		const host = query<RuiCheckboxElement>(container, 'rui-checkbox');
		const input = query<HTMLInputElement>(host, 'input');
		const seen = listen(container, () => host.checked);

		await userEvent.click(input);

		expect(seen).toEqual([
			{ type: 'input', target: input, value: true },
			{ type: 'change', target: input, value: true },
		]);
	});

	it('switch: the input fires input then change and checked is fresh', async () => {
		const container = await mount(<RuiSwitch>Dark</RuiSwitch>);
		const host = query<RuiSwitchElement>(container, 'rui-switch');
		const input = query<HTMLInputElement>(host, 'input');
		const seen = listen(container, () => host.checked);

		await userEvent.click(input);

		expect(seen).toEqual([
			{ type: 'input', target: input, value: true },
			{ type: 'change', target: input, value: true },
		]);
	});

	it('radio group: the checked radio fires input then change and the group value is fresh', async () => {
		const container = await mount(
			<RuiRadioGroup name="plan" value="a">
				<RuiRadioGroupControl>
					<RuiRadio value="a">A</RuiRadio>
					<RuiRadio value="b">B</RuiRadio>
				</RuiRadioGroupControl>
			</RuiRadioGroup>,
		);
		const host = query<RuiRadioGroupElement>(container, 'rui-radio-group');
		const radio = query<HTMLInputElement>(host, 'input[value="b"]');
		const seen = listen(container, () => host.value);

		await userEvent.click(radio);

		expect(seen).toEqual([
			{ type: 'input', target: radio, value: 'b' },
			{ type: 'change', target: radio, value: 'b' },
		]);
	});

	it('checkbox group: one toggle is one change from the toggled input and the group value is fresh', async () => {
		const container = await mount(
			<RuiCheckboxGroup name="topics" value="news">
				<RuiCheckboxGroupControl>
					<RuiCheckbox value="news">News</RuiCheckbox>
					<RuiCheckbox value="travel">Travel</RuiCheckbox>
				</RuiCheckboxGroupControl>
			</RuiCheckboxGroup>,
		);
		const group = query<RuiCheckboxGroupElement>(container, 'rui-checkbox-group');
		const input = query<HTMLInputElement>(group, 'input[value="travel"]');
		const seen = listen(container, () => [...group.value]);

		await userEvent.click(input);

		expect(seen.filter((entry) => entry.type === 'change')).toEqual([
			{ type: 'change', target: input, value: ['news', 'travel'] },
		]);
		expect(seen.every((entry) => entry.target === input)).toBe(true);
	});

	it('slider: a key fires input then change on the host with value already updated', async () => {
		const container = await mount(<RuiSlider value={20} min={0} max={100} />);
		const host = query<RuiSliderElement>(container, 'rui-slider');
		const seen = listen(container, () => [...host.value]);
		const thumb = query<HTMLElement>(host, '[data-thumb]');

		thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

		expect(seen).toEqual([
			{ type: 'input', target: host, value: [21] },
			{ type: 'change', target: host, value: [21] },
		]);
	});

	it('slider: a drag fires input on each move and one change on release, and a cancel fires input only', async () => {
		const container = await mount(<RuiSlider value={20} min={0} max={100} />);
		const host = query<RuiSliderElement>(container, 'rui-slider');
		const track = query<HTMLElement>(host, '[data-ref="rangeTrack"]');
		const rect = track.getBoundingClientRect();
		const init = { bubbles: true, pointerId: 1, button: 0, clientY: rect.top + rect.height / 2 };
		const seen = listen(container, () => [...host.value]);

		track.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: rect.left + rect.width * 0.5 }));
		document.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: rect.left + rect.width * 0.7 }));
		document.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: rect.left + rect.width * 0.7 }));

		expect(seen.map((entry) => entry.type)).toEqual(['input', 'input', 'change']);
		expect(seen.every((entry) => entry.target === host)).toBe(true);
		expect(seen.at(-1)?.value).toEqual([...host.value]);
		seen.length = 0;

		track.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: rect.left + rect.width * 0.1 }));
		document.dispatchEvent(new PointerEvent('pointercancel', { ...init, clientX: rect.left + rect.width * 0.1 }));

		expect(seen.map((entry) => entry.type)).toEqual(['input', 'input']);
		expect(host.value[0]).toBeGreaterThan(60);
	});

	it('knob: a key fires input then change, and a drag fires input per move and change on release', async () => {
		const container = await mount(<RuiKnob value={40} min={0} max={100} />);
		const host = query<RuiKnobElement>(container, 'rui-knob');
		const control = query<HTMLElement>(host, '[data-ref="control"]');
		const seen = listen(container, () => host.value);

		control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		expect(seen).toEqual([
			{ type: 'input', target: host, value: 41 },
			{ type: 'change', target: host, value: 41 },
		]);
		seen.length = 0;

		const rect = control.getBoundingClientRect();
		const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		const init = { bubbles: true, pointerId: 1, button: 0 };
		control.dispatchEvent(
			new PointerEvent('pointerdown', {
				...init,
				clientX: center.x - rect.width / 2,
				clientY: center.y + rect.height / 2,
			}),
		);
		document.dispatchEvent(
			new PointerEvent('pointermove', {
				...init,
				clientX: center.x + rect.width / 2,
				clientY: center.y + rect.height / 2,
			}),
		);
		document.dispatchEvent(new PointerEvent('pointerup', init));

		expect(seen.map((entry) => entry.type)).toEqual(['input', 'input', 'change']);
		expect(seen.every((entry) => entry.target === host)).toBe(true);
	});

	it('number field: draft typing fires nothing on the host; leaving for a stepper commits it, then the step commits again', async () => {
		const container = await mount(<RuiNumberField name="qty" value={3} />);
		const host = query<RuiNumberFieldElement>(container, 'rui-number-field');
		const input = query<HTMLInputElement>(host, '[data-number-field-input]');
		const seen = listen(container, () => host.value);

		input.focus();
		input.value = '7';
		input.dispatchEvent(new InputEvent('input', { bubbles: true }));
		expect(seen).toEqual([]);

		await userEvent.click(query<HTMLElement>(host, '[data-number-field-action="increment"]'));
		expect(seen).toEqual([
			{ type: 'input', target: host, value: 7 },
			{ type: 'change', target: host, value: 7 },
			{ type: 'input', target: host, value: 8 },
			{ type: 'change', target: host, value: 8 },
		]);
	});

	it('number field: committing a draft on blur fires input then change on the host', async () => {
		const container = await mount(<RuiNumberField name="qty" value={3} />);
		const host = query<RuiNumberFieldElement>(container, 'rui-number-field');
		const input = query<HTMLInputElement>(host, '[data-number-field-input]');
		const seen = listen(container, () => host.value);

		input.focus();
		input.value = '9';
		input.dispatchEvent(new InputEvent('input', { bubbles: true }));
		input.blur();
		await settle();

		expect(seen).toEqual([
			{ type: 'input', target: host, value: 9 },
			{ type: 'change', target: host, value: 9 },
		]);
	});

	it('date input: a typed full date fires input then change on the host; segments fire nothing on it', async () => {
		const container = await mount(<RuiDateInput name="when" locale="en-US" />);
		const host = query<RuiDateInputElement>(container, 'rui-date-input');
		const seen = listen(container, () => Reflect.get(host, 'value'));

		await userEvent.click(query<HTMLElement>(host, '[data-date-segment][data-type="month"]'));
		await userEvent.keyboard('08202026');
		await settle();

		expect(seen.map((entry) => entry.type)).toEqual(['input', 'change']);
		expect(seen.every((entry) => entry.target === host)).toBe(true);
		expect(seen.at(-1)?.value).toBe('2026-08-20');
	});

	it('date field: the nested date input and calendar events do not reach the field', async () => {
		const container = await mount(<RuiDateField name="when" locale="en-US" />);
		const host = query<RuiDateFieldElement>(container, 'rui-date-field');
		const seen = listen(container, () => Reflect.get(host, 'value'));

		await userEvent.click(query<HTMLElement>(host, '[data-date-segment][data-type="month"]'));
		await userEvent.keyboard('08202026');
		await settle();

		expect(seen.map((entry) => entry.type)).toEqual(['input', 'change']);
		expect(seen.every((entry) => entry.target === host)).toBe(true);
	});
});

describe('programmatic writes dispatch nothing', () => {
	it.each([
		['checkbox', () => <RuiCheckbox>Agree</RuiCheckbox>, 'rui-checkbox', 'checked', true],
		['switch', () => <RuiSwitch>Dark</RuiSwitch>, 'rui-switch', 'checked', true],
		['slider', () => <RuiSlider value={20} min={0} max={100} />, 'rui-slider', 'value', [50]],
		['knob', () => <RuiKnob value={20} min={0} max={100} />, 'rui-knob', 'value', 50],
		['number field', () => <RuiNumberField value={3} />, 'rui-number-field', 'value', 8],
		['date input', () => <RuiDateInput locale="en-US" />, 'rui-date-input', 'value', '2026-08-20'],
	])('%s: a property write fires no input or change', async (_name, view, tag, prop, next) => {
		const container = await mount(view());
		const host = query<HTMLElement>(container, tag);
		const seen = listen(container, () => undefined);

		Reflect.set(host, prop, next);
		await settle();

		expect(seen).toEqual([]);
	});

	it('slider: a form state restore and a reset fire nothing', async () => {
		const container = await mount(
			<form>
				<RuiSlider name="level" value={20} min={0} max={100} />
			</form>,
		);
		const host = query<RuiSliderElement>(container, 'rui-slider');
		host.value = [60];
		await settle();
		const seen = listen(container, () => undefined);

		host.formStateRestoreCallback('30', 'restore');
		query<HTMLFormElement>(container, 'form').reset();
		await settle();

		expect(seen).toEqual([]);
	});
});

describe('rui-field acts only on the control host events', () => {
	it('writes one value for one native checkbox toggle, though it fires input then change', async () => {
		const { store, writes } = recordingStore({ agree: false });
		const container = await mountInField(<RuiCheckbox>Agree</RuiCheckbox>, store, 'agree');
		writes.length = 0;

		await userEvent.click(query<HTMLInputElement>(container, 'input[type="checkbox"]'));
		await settle();

		expect(writes).toEqual([['agree', true]]);
	});

	it('writes one value for one checkbox group toggle', async () => {
		const { store, writes } = recordingStore({ topics: ['news'] });
		const container = await mountInField(
			<RuiCheckboxGroup name="topics" value="news">
				<RuiCheckboxGroupControl>
					<RuiCheckbox value="news">News</RuiCheckbox>
					<RuiCheckbox value="travel">Travel</RuiCheckbox>
				</RuiCheckboxGroupControl>
			</RuiCheckboxGroup>,
			store,
			'topics',
		);
		writes.length = 0;

		await userEvent.click(query<HTMLInputElement>(container, 'input[value="travel"]'));
		await settle();

		expect(writes).toEqual([['topics', ['news', 'travel']]]);
	});

	it('writes a radio group value from the checked radio', async () => {
		const { store, writes } = recordingStore({ plan: 'a' });
		const container = await mountInField(
			<RuiRadioGroup name="plan" value="a">
				<RuiRadioGroupControl>
					<RuiRadio value="a">A</RuiRadio>
					<RuiRadio value="b">B</RuiRadio>
				</RuiRadioGroupControl>
			</RuiRadioGroup>,
			store,
			'plan',
		);
		writes.length = 0;

		await userEvent.click(query<HTMLInputElement>(container, 'input[value="b"]'));
		await settle();

		expect(writes).toEqual([['plan', 'b']]);
	});

	it('writes a date field value once and ignores its nested date input events', async () => {
		const { store, writes } = recordingStore({ when: '' });
		const container = await mountInField(<RuiDateField locale="en-US" />, store, 'when');
		writes.length = 0;

		await userEvent.click(query<HTMLElement>(container, '[data-date-segment][data-type="month"]'));
		await userEvent.keyboard('08202026');
		await settle();

		expect(writes).toEqual([['when', '2026-08-20']]);
	});

	it('updates the store from a registered host that dispatches input, and not from an input bubbling through it', async () => {
		if (!customElements.get('x-value-host')) {
			customElements.define('x-value-host', class extends HTMLElement {});
		}
		registerFieldControl('x-value-host', {
			read: (host) => host.getAttribute('data-value') ?? '',
			write: (host, value) => host.setAttribute('data-value', String(value ?? '')),
		});
		const { store, writes } = recordingStore({ custom: '' });
		const container = await mountInField(
			<x-value-host>
				<input data-part />
			</x-value-host>,
			store,
			'custom',
		);
		const host = query<HTMLElement>(container, 'x-value-host');
		writes.length = 0;

		query<HTMLInputElement>(host, 'input').dispatchEvent(new InputEvent('input', { bubbles: true }));
		await settle();
		expect(writes).toEqual([]);

		host.setAttribute('data-value', 'typed');
		host.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
		await settle();
		expect(writes).toEqual([['custom', 'typed']]);
	});

	it('writes the store exactly once for one native toggle that fires input then change', async () => {
		const { store } = recordingStore({ agree: false });
		const setValue = vi.spyOn(store, 'setValue');
		const container = await mountInField(<RuiCheckbox>Agree</RuiCheckbox>, store, 'agree');
		await settle();
		setValue.mockClear();

		await userEvent.click(query<HTMLInputElement>(container, 'input[type="checkbox"]'));
		await settle();

		expect(setValue).toHaveBeenCalledTimes(1);
	});

	it('validates the built-in store once for one native toggle', async () => {
		const validate = vi.spyOn(FormStore.prototype, 'validateField');
		const container = await mount(
			<RuiForm mode="onChange">
				<RuiField name="agree">
					<RuiCheckbox>Agree</RuiCheckbox>
				</RuiField>
			</RuiForm>,
		);
		await settle();
		validate.mockClear();

		await userEvent.click(query<HTMLInputElement>(container, 'input[type="checkbox"]'));
		await settle();

		expect(validate).toHaveBeenCalledTimes(1);
		validate.mockRestore();
	});

	it('writes nothing when the combobox query is typed, and one value when a select chip is removed', async () => {
		const { store, writes } = recordingStore({ pets: [], tags: ['cat', 'dog'] });
		const container = await mount(
			<RuiForm ref={(form) => (form ? form.connect(store) : undefined)}>
				<RuiField name="pets">
					<RuiCombobox options={PET_OPTIONS} label="Pets" />
				</RuiField>
				<RuiField name="tags">
					<RuiSelect options={PET_OPTIONS} label="Tags" selectionMode="multiple" value={['cat', 'dog']} />
				</RuiField>
			</RuiForm>,
		);
		await settle();
		writes.length = 0;
		const input = query<HTMLInputElement>(container, '[data-combobox-input]');
		input.focus();
		input.value = 'ca';
		input.dispatchEvent(new InputEvent('input', { bubbles: true }));
		await settle();
		expect(writes).toEqual([]);

		const select = query<HTMLElement>(container, 'rui-select');
		const seen = listen(container, () => Reflect.get(select, 'value'));
		await userEvent.click(query<HTMLElement>(select, '[data-tag-remove]'));
		await settle();

		const changes = seen.filter((entry) => entry.type === 'change');
		expect(changes).toHaveLength(1);
		expect(changes[0]?.target).toBe(select);
		expect(writes).toEqual([['tags', ['dog']]]);
	});
});

const PET_OPTIONS = [
	{ value: 'cat', label: 'Cat' },
	{ value: 'dog', label: 'Dog' },
];

describe('every value host stays silent for programmatic changes', () => {
	const hosts: Array<[string, () => JsxRenderable, string, string, unknown]> = [
		['select', () => <RuiSelect options={PET_OPTIONS} label="Pet" />, 'rui-select', 'value', ['dog']],
		['combobox', () => <RuiCombobox options={PET_OPTIONS} label="Pet" />, 'rui-combobox', 'value', ['dog']],
		['listbox', () => <RuiListbox options={PET_OPTIONS} label="Pet" />, 'rui-listbox', 'value', ['dog']],
		[
			'tag group',
			() => (
				<RuiTagGroup value={['cat']}>
					<RuiTagList>
						<RuiTag value="cat" label="Cat">
							Cat
						</RuiTag>
						<RuiTag value="dog" label="Dog">
							Dog
						</RuiTag>
					</RuiTagList>
				</RuiTagGroup>
			),
			'rui-tag-group',
			'value',
			['dog'],
		],
		[
			'date range picker',
			() => <RuiDateRangePicker value="2026-08-01/2026-08-14" locale="en-US" />,
			'rui-date-range-picker',
			'value',
			'2026-09-01/2026-09-09',
		],
		[
			'radio group',
			() => (
				<RuiRadioGroup name="plan" value="a">
					<RuiRadioGroupControl>
						<RuiRadio value="a">A</RuiRadio>
						<RuiRadio value="b">B</RuiRadio>
					</RuiRadioGroupControl>
				</RuiRadioGroup>
			),
			'rui-radio-group',
			'value',
			'b',
		],
		[
			'checkbox group',
			() => (
				<RuiCheckboxGroup name="topics" value="news">
					<RuiCheckboxGroupControl>
						<RuiCheckbox value="news">News</RuiCheckbox>
						<RuiCheckbox value="travel">Travel</RuiCheckbox>
					</RuiCheckboxGroupControl>
				</RuiCheckboxGroup>
			),
			'rui-checkbox-group',
			'value',
			['travel'],
		],
	];

	it.each(hosts)('%s: a property write fires no input or change', async (_name, view, tag, prop, next) => {
		const container = await mount(view());
		const host = query<HTMLElement>(container, tag);
		const seen = listen(document.body, () => undefined);

		Reflect.set(host, prop, next);
		await settle();

		expect(seen).toEqual([]);
	});

	it('a store write, a form reset and a restore dispatch nothing from any host', async () => {
		const { store, writes } = recordingStore({
			pet: ['cat'],
			tags: ['cat'],
			level: [20],
			gain: 40,
			qty: 3,
			when: '2026-08-20',
			agree: false,
			plan: 'a',
		});
		const container = await mount(
			<RuiForm ref={(form) => (form ? form.connect(store) : undefined)}>
				<RuiField name="pet">
					<RuiCombobox options={PET_OPTIONS} label="Pet" value={['cat']} />
				</RuiField>
				<RuiField name="tags">
					<RuiSelect options={PET_OPTIONS} label="Tags" value={['cat']} />
				</RuiField>
				<RuiField name="level">
					<RuiSlider value={20} min={0} max={100} />
				</RuiField>
				<RuiField name="gain">
					<RuiKnob value={40} min={0} max={100} />
				</RuiField>
				<RuiField name="qty">
					<RuiNumberField value={3} />
				</RuiField>
				<RuiField name="when">
					<RuiDateInput value="2026-08-20" locale="en-US" />
				</RuiField>
				<RuiField name="agree">
					<RuiSwitch>Agree</RuiSwitch>
				</RuiField>
				<RuiField name="plan">
					<RuiRadioGroup name="plan" value="a">
						<RuiRadioGroupControl>
							<RuiRadio value="a">A</RuiRadio>
							<RuiRadio value="b">B</RuiRadio>
						</RuiRadioGroupControl>
					</RuiRadioGroup>
				</RuiField>
			</RuiForm>,
		);
		await settle();
		const seen = listen(document.body, () => undefined);

		store.setValue('pet', ['dog']);
		store.setValue('tags', ['dog']);
		store.setValue('level', [60]);
		store.setValue('gain', 70);
		store.setValue('qty', 9);
		store.setValue('when', '2026-09-09');
		store.setValue('agree', true);
		store.setValue('plan', 'b');
		await settle();
		query<HTMLFormElement>(container, 'form').reset();
		await settle();
		for (const host of container.querySelectorAll<HTMLElement>(
			'rui-slider, rui-knob, rui-number-field, rui-date-input',
		)) {
			const restore = Reflect.get(host, 'formStateRestoreCallback');
			if (typeof restore === 'function') {
				restore.call(host, '1', 'restore');
			}
		}
		await settle();

		expect(writes.length).toBeGreaterThan(0);
		expect(seen).toEqual([]);
	});
});

describe('labels outside a field', () => {
	it.each([
		['slider', <RuiSlider id="host" name="s" value={20} min={0} max={100} />, '[data-thumb]'],
		['knob', <RuiKnob id="host" name="k" value={20} min={0} max={100} />, '[data-ref="control"]'],
		['number field', <RuiNumberField id="host" name="n" value={3} />, '[data-number-field-input]'],
		['date input', <RuiDateInput id="host" name="d" locale="en-US" />, '[data-ref="root"]'],
	])('%s: a label for the host names the inner part', async (_name, view, partSelector) => {
		const container = await mount(
			<form>
				<label id="outside" for="host">
					Outside label
				</label>
				{view}
			</form>,
		);

		const part = query<HTMLElement>(container, partSelector);

		expect(part.getAttribute('aria-labelledby')).toContain('outside');
	});

	it('number field: a label that is both previous sibling and host label names the input once', async () => {
		const container = await mount(
			<form>
				<label id="outside" for="host">
					Age
				</label>
				<RuiNumberField id="host" name="n" value={3} />
			</form>,
		);
		const input = query<HTMLElement>(container, '[data-number-field-input]');

		expect(input.getAttribute('aria-labelledby')?.split(' ')).toEqual(['outside']);
	});

	it('number field: the outside label survives a value change', async () => {
		const container = await mount(
			<form>
				<label id="outside" for="host">
					Outside label
				</label>
				<RuiNumberField id="host" name="n" value={3} />
			</form>,
		);
		const host = query<RuiNumberFieldElement>(container, 'rui-number-field');
		const input = query<HTMLElement>(host, '[data-number-field-input]');
		expect(input.getAttribute('aria-labelledby')).toContain('outside');

		host.value = 8;
		await settle();

		expect(input.getAttribute('aria-labelledby')).toContain('outside');
	});

	it('range slider: each thumb keeps its own name next to the outside label', async () => {
		const container = await mount(
			<form>
				<label id="outside" for="host">
					Price
				</label>
				<RuiSlider id="host" name="price" variant="range" value={[10, 30]} min={0} max={100} />
			</form>,
		);
		const [low, high] = Array.from(
			container.querySelectorAll<HTMLElement>('[data-thumb="min"], [data-thumb="max"]'),
		);

		for (const thumb of [low, high]) {
			const names = (thumb?.getAttribute('aria-labelledby') ?? '').split(' ');
			expect(names).toContain('outside');
			expect(names).toContain(thumb?.id);
			expect(thumb?.id).not.toBe('');
		}
		expect(low?.id).not.toBe(high?.id);
		expect(low?.getAttribute('aria-label')).not.toBe(high?.getAttribute('aria-label'));
	});

	it('a label inserted after connect is picked up on the next focus', async () => {
		const container = await mount(
			<form>
				<RuiKnob id="host" name="k" value={20} min={0} max={100} />
			</form>,
		);
		const control = query<HTMLElement>(container, '[data-ref="control"]');
		expect(control.getAttribute('aria-labelledby')).toBeNull();
		const label = document.createElement('label');
		label.id = 'late';
		label.htmlFor = 'host';
		label.textContent = 'Late label';
		query<HTMLFormElement>(container, 'form').prepend(label);

		control.focus();
		await settle();

		expect(control.getAttribute('aria-labelledby')).toContain('late');
	});
});
