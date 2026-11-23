import { afterEach, describe, expect, it } from 'vitest';
import { RadiantElement, bindTo, customElement, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiCombobox } from '../combobox';
import { RuiCombobox as RuiComboboxElement } from '../combobox/combobox.script';
import { RuiDateField } from '../date-field';
import { RuiDateField as RuiDateFieldElement } from '../date-field/date-field.script';
import { fieldAria, fieldAriaBindings } from '../field/field-aria';
import { fieldContext, type FieldContextValue } from '../field/field-context';
import { RuiField } from '../field';
import { RuiField as RuiFieldElement } from '../field/field.script';
import { RuiListbox } from '../listbox';
import { RuiListbox as RuiListboxElement } from '../listbox/listbox.script';
import { RuiNumberField } from '../number-field';
import { RuiNumberField as RuiNumberFieldElement } from '../number-field/number-field.script';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '../select';
import { RuiSelect as RuiSelectElement } from '../select/select.script';
import { registerFieldControl } from '@/lib/form/control-protocol';
void RuiFieldElement;
void RuiComboboxElement;
void RuiSelectElement;
void RuiDateFieldElement;
void RuiListboxElement;
void RuiNumberFieldElement;

const OPTIONS = [
	{ value: 'de', label: 'Germany' },
	{ value: 'it', label: 'Italy' },
];

/**
 * Hosts that wrap one Radiant UI control and paint the field's ARIA onto its target. `x-nested-select` owns a
 * `render()` tree and spreads `fieldAria`; the others keep authored DOM and bind `fieldAriaBindings`.
 */
@customElement('x-nested-select')
class NestedSelect extends RadiantElement {
	@contextSelector({ context: fieldContext })
	@state
	field?: FieldContextValue = undefined;

	override render() {
		return (
			<RuiSelect label="Fallback">
				<RuiSelectControl>
					<RuiSelectTrigger {...fieldAria(this.field)}>
						<RuiSelectValue>Country</RuiSelectValue>
					</RuiSelectTrigger>
					<RuiSelectToggle />
				</RuiSelectControl>
				<RuiSelectListbox>
					<RuiListbox embedded options={OPTIONS} />
				</RuiSelectListbox>
			</RuiSelect>
		);
	}
}

@customElement('x-nested-combobox')
class NestedCombobox extends RadiantElement {
	@contextSelector({ context: fieldContext })
	@bindTo(fieldAriaBindings('[data-combobox-input]'))
	@state
	field?: FieldContextValue = undefined;
}

@customElement('x-nested-number-field')
class NestedNumberField extends RadiantElement {
	@contextSelector({ context: fieldContext })
	@bindTo(fieldAriaBindings('[data-number-field-input]'))
	@state
	field?: FieldContextValue = undefined;
}

@customElement('x-nested-date-field')
class NestedDateField extends RadiantElement {
	@contextSelector({ context: fieldContext })
	@bindTo(fieldAriaBindings('[data-date-field-input]'))
	@state
	field?: FieldContextValue = undefined;
}

@customElement('x-nested-listbox')
class NestedListbox extends RadiantElement {
	@contextSelector({ context: fieldContext })
	@bindTo(fieldAriaBindings('[role="listbox"]'))
	@state
	field?: FieldContextValue = undefined;
}

for (const tag of [
	'x-nested-select',
	'x-nested-combobox',
	'x-nested-number-field',
	'x-nested-date-field',
	'x-nested-listbox',
]) {
	registerFieldControl(tag, {
		read: (host) => Reflect.get(host.firstElementChild ?? host, 'value') ?? '',
		write: (host, value) => {
			Reflect.set(host.firstElementChild ?? host, 'value', value);
		},
	});
}

const CASES = [
	{
		name: 'rui-select (render host, fieldAria)',
		targetSelector: '[data-select-trigger]',
		inner: 'rui-select',
		view: () => <NestedSelect data-rui-aria-target="[data-select-trigger]" />,
	},
	{
		name: 'rui-combobox (authored DOM, fieldAriaBindings)',
		targetSelector: '[data-combobox-input]',
		inner: 'rui-combobox',
		view: () => (
			<NestedCombobox data-rui-aria-target="[data-combobox-input]">
				<RuiCombobox options={OPTIONS} label="Fallback" />
			</NestedCombobox>
		),
	},
	{
		name: 'rui-number-field',
		targetSelector: '[data-number-field-input]',
		inner: 'rui-number-field',
		view: () => (
			<NestedNumberField data-rui-aria-target="[data-number-field-input]">
				<RuiNumberField label="Fallback" />
			</NestedNumberField>
		),
	},
	{
		name: 'rui-date-field',
		targetSelector: '[data-date-field-input]',
		inner: 'rui-date-field',
		view: () => (
			<NestedDateField data-rui-aria-target="[data-date-field-input]">
				<RuiDateField label="Fallback" />
			</NestedDateField>
		),
	},
	{
		name: 'rui-listbox',
		targetSelector: '[role="listbox"]',
		inner: 'rui-listbox',
		view: () => (
			<NestedListbox data-rui-aria-target='[role="listbox"]'>
				<RuiListbox options={OPTIONS} label="Fallback" />
			</NestedListbox>
		),
	},
] as const;

void NestedSelect;
void NestedCombobox;
void NestedNumberField;
void NestedDateField;
void NestedListbox;

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await Promise.all(
		['rui-select', 'rui-combobox', 'rui-listbox', 'rui-number-field', 'rui-date-field'].map((tag) =>
			customElements.whenDefined(tag),
		),
	);
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

describe.each(CASES)('a registered host wrapping $name', ({ targetSelector, inner, view }) => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	function mountField() {
		return mount(
			<RuiField name="country">
				<label data-rui-field-label>Country</label>
				{view()}
				<p data-rui-field-error />
			</RuiField>,
		);
	}

	it('keeps the field label, and no stale aria-label, on the inner target after connect', async () => {
		const { host, cleanup } = mountField();
		await settled();

		const target = host.querySelector<HTMLElement>(targetSelector)!;
		const label = host.querySelector('label')!;
		expect(label.id).toBeTruthy();
		expect(target.getAttribute('aria-labelledby')).toBe(label.id);
		expect(target.hasAttribute('aria-label')).toBe(false);
		expect(target.hasAttribute('data-rui-field-managed')).toBe(true);
		expect(label.htmlFor).toBe(target.id);
		cleanup();
	});

	it('keeps the label when the inner control syncs its own state again', async () => {
		const { host, cleanup } = mountField();
		await settled();

		const control = host.querySelector(inner) as HTMLElement & { label: string };
		control.label = 'Pick one';
		await settled();

		const target = host.querySelector<HTMLElement>(targetSelector)!;
		expect(target.getAttribute('aria-labelledby')).toBe(host.querySelector('label')!.id);
		expect(target.hasAttribute('aria-label')).toBe(false);
		cleanup();
	});
});

describe('a control outside a registered host', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('still looks up its own label', async () => {
		const { host, cleanup } = mount(
			<div>
				<label>Country</label>
				<RuiSelect options={OPTIONS} placeholder="Country" />
			</div>,
		);
		await settled();

		const trigger = host.querySelector<HTMLElement>('[data-select-trigger]')!;
		const label = host.querySelector('label')!;
		expect(label.id).toBeTruthy();
		expect(trigger.getAttribute('aria-labelledby')).toBe(label.id);
		expect(trigger.hasAttribute('data-rui-field-managed')).toBe(false);
		cleanup();
	});
});
