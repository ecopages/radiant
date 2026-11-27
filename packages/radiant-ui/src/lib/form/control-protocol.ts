import type { PropTransform } from '@ecopages/radiant';
import type { FieldControlValidity } from './types';
import { multiValueTransform, numberArrayTransform } from '../multi-value';

export const RUI_CONTROL_ATTR = 'data-rui-control';
export const RUI_FIELD_MANAGED_ATTR = 'data-rui-field-managed';
export const RUI_FIELD_LABEL_ATTR = 'data-rui-field-label';
export const RUI_FIELD_DESCRIPTION_ATTR = 'data-rui-field-description';
export const RUI_FIELD_ERROR_ATTR = 'data-rui-field-error';
export const RUI_FIELD_WARNING_ATTR = 'data-rui-field-warning';

/**
 * Bubbling, composed event a control host dispatches on itself when it connects.
 *
 * @remarks A `rui-field` listens for it to seed a control that appeared after the field
 * registered, from the value the form holds, and to report its validity. Every Radiant
 * control host dispatches it from `onConnected`, and a third-party host registered with
 * `registerFieldControl` must dispatch it too (call {@link announceControlConnect}). A
 * native `<input>`, `<select>` or `<textarea>` marked `data-rui-control` announces nothing,
 * so it must already be inside its field when the field connects; one inserted later is
 * picked up on the field's next sync.
 */
export const RUI_CONTROL_CONNECT_EVENT = 'rui-control-connect';

/** Dispatch {@link RUI_CONTROL_CONNECT_EVENT} from a control host that just connected. */
export function announceControlConnect(host: HTMLElement): void {
	host.dispatchEvent(new CustomEvent(RUI_CONTROL_CONNECT_EVENT, { bubbles: true, composed: true }));
}
export const RUI_FIELD_ERROR_CONTROLLED_ATTR = 'data-rui-field-error-controlled';
export const RUI_FIELD_DEFAULT_VALUE_ATTR = 'data-default-value';
export const RUI_FORM_DEFAULT_VALUES_ATTR = 'data-default-values';
export const RUI_ARIA_TARGET_ATTR = 'data-rui-aria-target';
export const RUI_ARIA_TARGETS_ATTR = 'data-rui-aria-targets';
const FIELD_COLUMN_SELECTOR = '[data-ref="field"]';

function fieldControlSelector(): string {
	return `[${RUI_CONTROL_ATTR}], ${hostControlSelector()}`;
}

function hostControlSelector(): string {
	return Array.from(CONTROL_VALUE_ADAPTERS.keys()).join(', ');
}

function isEmbeddedListbox(node: HTMLElement): boolean {
	return (
		node.localName === 'rui-listbox' && (node.hasAttribute('embedded') || Reflect.get(node, 'embedded') === true)
	);
}

const ARIA_TARGET_SELECTORS: Readonly<Record<string, string>> = {
	'rui-combobox': '[data-combobox-input]',
	'rui-select': '[data-select-trigger]',
	'rui-tag-group': '[data-tag-list]',
	'rui-number-field': '[data-number-field-input], input',
	'rui-knob': '[data-knob-control]',
	'rui-checkbox': 'input',
	'rui-checkbox-group': '[data-checkbox-group-root]',
	'rui-switch': 'input',
};

/**
 * Presentational text controls (`RuiInput` / `RuiTextarea`) are real `<input>` / `<textarea>`
 * nodes marked with `data-rui-control`. Detect by tag name — never `instanceof HTMLInputElement`,
 * which is undefined under Radiant's Node light-DOM SSR shim.
 */
export function isNativeTextControl(node: Element): node is HTMLInputElement | HTMLTextAreaElement {
	return node.localName === 'input' || node.localName === 'textarea';
}

function isNativeInput(node: Element): node is HTMLInputElement {
	return node.localName === 'input';
}

function isNativeTextarea(node: Element): node is HTMLTextAreaElement {
	return node.localName === 'textarea';
}

function isNativeSelect(node: Element): node is HTMLSelectElement {
	return node.localName === 'select';
}

/** True when the constructor opted into the form-associated custom element lifecycle. */
export function isFormAssociatedHost(host: HTMLElement): boolean {
	return Reflect.get(host.constructor, 'formAssociated') === true;
}

type FieldSlotHost = HTMLElement & { slottedElements?: Element[] };

type ControlValueAdapter = {
	read: (host: HTMLElement) => unknown;
	write: (host: HTMLElement, value: unknown) => void;
};

export type FieldControlAdapter = ControlValueAdapter & {
	/**
	 * The control's own validity. Defaults, for a form-associated host, to its `validity.valid`
	 * and `validationMessage` properties; a host without them reports `undefined`.
	 */
	validity?: (host: HTMLElement) => FieldControlValidity | undefined;
	/** Where a native text target gets its submission name. Defaults to `native`. */
	submission?: 'host' | 'native' | 'none';
	/**
	 * Which element dispatches the value events the field listens to. `host` (the default) is a
	 * control that dispatches `input` and `change` on itself after updating `value`. `members` is a
	 * wrapper or group whose own native inputs dispatch them, as `rui-checkbox` does.
	 */
	events?: 'host' | 'members';
};

const stringValueAdapter: ControlValueAdapter = {
	read: (host) => {
		const value = Reflect.get(host, 'value');
		return typeof value === 'string' ? value : (host.getAttribute('value') ?? '');
	},
	write: (host, value) => {
		const next = value == null ? '' : String(value);
		host.setAttribute('value', next);
		if ('value' in host) {
			Reflect.set(host, 'value', next);
		}
	},
};

const numberValueAdapter: ControlValueAdapter = {
	read: (host) => {
		const value = Reflect.get(host, 'value');
		if (typeof value === 'number') {
			return value;
		}
		const raw = host.getAttribute('value');
		return raw == null || raw === '' ? '' : Number(raw);
	},
	write: (host, value) => {
		const next = value == null ? '' : String(value);
		host.setAttribute('value', next);
		if ('value' in host) {
			Reflect.set(host, 'value', value);
		}
	},
};

const booleanValueAdapter: ControlValueAdapter = {
	read: (host) => {
		const input = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
		return input?.checked ?? host.hasAttribute('checked');
	},
	write: (host, value) => {
		if (value) {
			host.setAttribute('checked', '');
		} else {
			host.removeAttribute('checked');
		}
	},
};

function readHostValue<T>(host: HTMLElement, transform: PropTransform<T>): T {
	const value = Reflect.get(host, 'value');
	if (value !== undefined && transform.fromProperty) {
		return transform.fromProperty(value);
	}
	if (transform.fromAttribute) {
		return transform.fromAttribute(host.getAttribute('value'));
	}
	return value as T;
}

function writeHostValue(host: HTMLElement, value: unknown): void {
	Reflect.set(host, 'value', value);
}

const stringArrayValueAdapter: ControlValueAdapter = {
	read: (host) => readHostValue(host, multiValueTransform),
	write: writeHostValue,
};

const sliderValueAdapter: ControlValueAdapter = {
	read: (host) => readHostValue(host, numberArrayTransform),
	write: writeHostValue,
};

const CONTROL_VALUE_ADAPTERS = new Map<string, FieldControlAdapter>([
	['rui-checkbox', { ...booleanValueAdapter, events: 'members' }],
	['rui-switch', { ...booleanValueAdapter, events: 'members' }],
	['rui-combobox', { ...stringArrayValueAdapter, submission: 'none' }],
	['rui-date-field', stringValueAdapter],
	['rui-date-input', { ...stringValueAdapter, submission: 'host' }],
	['rui-date-range-picker', stringValueAdapter],
	['rui-select', { ...stringArrayValueAdapter, submission: 'none' }],
	['rui-radio-group', { ...stringValueAdapter, events: 'members' }],
	['rui-checkbox-group', { ...stringArrayValueAdapter, events: 'members' }],
	['rui-listbox', stringArrayValueAdapter],
	['rui-tag-group', stringArrayValueAdapter],
	['rui-slider', { ...sliderValueAdapter, submission: 'host' }],
	['rui-knob', { ...numberValueAdapter, submission: 'host' }],
	['rui-number-field', { ...numberValueAdapter, submission: 'host' }],
]);

/** Search authored field content, including nodes Radiant has moved for hydration. */
function forEachFieldContentNode(root: HTMLElement, visit: (node: Element) => void): void {
	const slotHost = root as FieldSlotHost;
	const visited = new Set<Element>();
	const safeVisit = (node: Element) => {
		if (visited.has(node)) {
			return;
		}
		visited.add(node);
		visit(node);
	};

	for (const node of slotHost.slottedElements ?? []) {
		safeVisit(node);
	}

	const renderRoot = root.querySelector(FIELD_COLUMN_SELECTOR) ?? root;
	for (const child of Array.from(renderRoot.children)) {
		safeVisit(child);
	}
	for (const node of renderRoot.querySelectorAll('*')) {
		safeVisit(node);
	}

	for (const child of Array.from(root.children)) {
		safeVisit(child);
	}

	const shadow = root.shadowRoot;
	if (shadow) {
		for (const child of Array.from(shadow.children)) {
			safeVisit(child);
		}
	}
}

function queryFieldContent(root: HTMLElement, selector: string): HTMLElement | null {
	let found: HTMLElement | null = null;
	forEachFieldContentNode(root, (node) => {
		if (found || !(node instanceof HTMLElement)) {
			return;
		}
		if (node.matches(selector)) {
			found = node;
			return;
		}
		found = node.querySelector<HTMLElement>(selector);
	});
	return found;
}

function pickPrimaryFieldControl(candidates: HTMLElement[]): HTMLElement | null {
	const eligibleCandidates = candidates.filter((candidate) => !isEmbeddedListbox(candidate));
	if (eligibleCandidates.length === 0) {
		return null;
	}

	return (
		eligibleCandidates.find(
			(candidate) =>
				!eligibleCandidates.some((ancestor) => ancestor !== candidate && ancestor.contains(candidate)),
		) ?? null
	);
}

function collectFieldControls(root: HTMLElement): HTMLElement[] {
	const candidates: HTMLElement[] = [];
	forEachFieldContentNode(root, (node) => {
		if (node instanceof HTMLElement && node.matches(fieldControlSelector())) {
			candidates.push(node);
		}
	});
	return candidates;
}

function listFieldControlsInRenderTree(root: HTMLElement): HTMLElement[] {
	const renderRoot = root.querySelector(FIELD_COLUMN_SELECTOR);
	if (!(renderRoot instanceof HTMLElement)) {
		return [];
	}
	return Array.from(renderRoot.querySelectorAll<HTMLElement>(fieldControlSelector())).filter((el) =>
		root.contains(el),
	);
}

/**
 * The field control is the outermost matching node. An embedded `rui-listbox` is
 * never eligible; a host such as `rui-select` wins over inner `[data-rui-control]`
 * markers and nested hosts.
 */
export function findFieldControl(root: HTMLElement): HTMLElement | null {
	const fromRenderTree = pickPrimaryFieldControl(listFieldControlsInRenderTree(root));
	if (fromRenderTree) {
		return fromRenderTree;
	}

	return pickPrimaryFieldControl(collectFieldControls(root));
}

/** Tags registered through {@link registerFieldControl}, as opposed to the catalog hosts built into the protocol. */
const REGISTERED_CONTROL_TAGS = new Set<string>();

/**
 * Register a custom host for `RuiField` discovery, value access, and name wiring.
 *
 * @remarks Call `setValidity` before dispatching `input` and `change`, so change-time validation sees the new state.
 * `submission` chooses where a native text target gets its name. A host
 * with `submission: 'host'` must implement FACE itself; registration only connects
 * it to the `RuiForm` store.
 *
 * A registered host that declares `data-rui-aria-target` or `data-rui-aria-targets` paints the field's ARIA
 * state onto its own target (`fieldAria` in a `render()` tree, `fieldAriaBindings` with `@bindTo`); the field no longer writes it (see {@link paintsOwnFieldAria}).
 * Both helpers also set {@link RUI_FIELD_MANAGED_ATTR} on the target, so a catalog control nested in the host never
 * relabels it.
 */
export function registerFieldControl(tagName: string, adapter: FieldControlAdapter): void {
	const tag = tagName.toLowerCase();
	CONTROL_VALUE_ADAPTERS.set(tag, adapter);
	REGISTERED_CONTROL_TAGS.add(tag);
}

/**
 * Whether a control host paints the field's ARIA state onto its own target instead of receiving it from the field.
 *
 * @remarks True for a host registered with {@link registerFieldControl} that declares an ARIA target. The target
 * may not exist yet (the host renders it later), so the field cannot write to it; the host binds it from
 * `fieldContext` instead. Catalog hosts and native inputs keep the field's direct writes.
 */
export function paintsOwnFieldAria(host: HTMLElement): boolean {
	return (
		REGISTERED_CONTROL_TAGS.has(host.localName) &&
		(host.hasAttribute(RUI_ARIA_TARGET_ATTR) || host.hasAttribute(RUI_ARIA_TARGETS_ATTR))
	);
}

/** The ARIA targets a host declares that are rendered now. Unlike {@link getAriaControlTargets} it never falls back to the host. */
export function getDeclaredAriaTargets(control: HTMLElement): HTMLElement[] {
	return resolveDeclaredAriaTargets(control);
}

/**
 * Whether a bubbling `input` or `change` event is the value event of this field's control.
 *
 * @remarks A host control (the default) dispatches the events on itself, so only an event
 * whose `target` is the host counts. A wrapper or group (`events: 'members'`, such as
 * `rui-checkbox`) leaves them to its member native inputs, so a native input inside it
 * counts. Anything else is an inner part or a nested host, such as a date segment, a
 * combobox query input or a tag group inside a select. Light DOM cannot hide inner events
 * from a capture listener, so this check, not propagation, is the rule every consumer applies.
 */
export function isFieldValueEvent(root: HTMLElement, event: Event): boolean {
	const control = findFieldControl(root);
	const target = event.target;
	if (!control || !(target instanceof Element)) {
		return false;
	}
	if (CONTROL_VALUE_ADAPTERS.get(control.localName)?.events !== 'members') {
		return target === control;
	}
	if (!control.contains(target) || !isNativeFormMember(target)) {
		return false;
	}
	const nestedHost = target.closest(hostControlSelector());
	return nestedHost === null || CONTROL_VALUE_ADAPTERS.get(nestedHost.localName)?.events === 'members';
}

function isNativeFormMember(node: Element): boolean {
	return isNativeInput(node) || isNativeTextarea(node) || isNativeSelect(node);
}

export function readControlValue(control: HTMLElement): unknown {
	if (isNativeInput(control)) {
		const host = resolveControlHost(control);
		const adapter = host === control ? undefined : CONTROL_VALUE_ADAPTERS.get(host.localName);
		if (adapter) {
			return adapter.read(host);
		}
		if (control.type === 'checkbox') {
			return control.checked;
		}
		if (control.type === 'number' || control.type === 'range') {
			return control.value === '' ? '' : Number(control.value);
		}
		return control.value;
	}

	if (isNativeTextarea(control)) {
		return control.value;
	}

	if (isNativeSelect(control)) {
		return control.multiple ? Array.from(control.selectedOptions, (option) => option.value) : control.value;
	}

	const host = resolveControlHost(control);
	return CONTROL_VALUE_ADAPTERS.get(host.localName)?.read(host) ?? host.getAttribute('value') ?? '';
}

/**
 * Reads the control's validity through its adapter, or from the native element or form-associated host.
 *
 * @remarks Reads properties, never `checkValidity()`, which fires an `invalid` event.
 * Returns `undefined` when the host exposes no validity, such as on the server.
 */
export function readControlValidity(control: HTMLElement): FieldControlValidity | undefined {
	const host = resolveControlHost(control);
	const adapter = CONTROL_VALUE_ADAPTERS.get(host.localName);
	if (adapter?.validity) {
		return adapter.validity(host);
	}
	const native = NATIVE_VALIDATED.has(host.localName);
	if (!native && !isFormAssociatedHost(host)) {
		return undefined;
	}
	if (native && Reflect.get(host, 'willValidate') === false) {
		return { valid: true };
	}
	const validity: unknown = Reflect.get(host, 'validity');
	if (typeof validity !== 'object' || validity === null) {
		return undefined;
	}
	const valid = Reflect.get(validity, 'valid');
	if (typeof valid !== 'boolean') {
		return undefined;
	}
	const message = Reflect.get(host, 'validationMessage');
	const text = typeof message === 'string' ? message : undefined;
	if (valid) {
		return { valid, message: text };
	}
	const type = failingFlag(validity);
	return { valid, type, params: native ? constraintParams(host, type) : undefined, message: text };
}

/**
 * The constraint a native control failed, so a message can say "at least 8 characters"
 * without parsing the browser's own text.
 *
 * @remarks `min`, `max` and `step` are numbers on number and range inputs and the attribute
 * text on other types, such as dates, whose bounds are not numbers. `step="any"` cannot
 * produce `stepMismatch`, so it never reaches a fact.
 */
function constraintParams(host: HTMLElement, flag: string): Record<string, unknown> | undefined {
	const read = (key: string): unknown => Reflect.get(host, key);
	const constraint = (key: 'min' | 'max' | 'step'): unknown => {
		const value = read(key);
		const numeric = read('type') === 'number' || read('type') === 'range';
		return numeric && typeof value === 'string' && value !== '' ? Number(value) : value;
	};
	switch (flag) {
		case 'tooShort':
			return { minLength: read('minLength') };
		case 'tooLong':
			return { maxLength: read('maxLength') };
		case 'rangeUnderflow':
			return { min: constraint('min') };
		case 'rangeOverflow':
			return { max: constraint('max') };
		case 'patternMismatch':
			return { pattern: read('pattern') };
		case 'stepMismatch':
			return { step: constraint('step') };
		case 'typeMismatch':
			return { inputType: read('type') };
		default:
			return undefined;
	}
}

/** Detected by tag name, like the other native controls, so it works where the DOM globals do not exist. */
const NATIVE_VALIDATED: ReadonlySet<string> = new Set(['input', 'textarea', 'select']);

const VALIDITY_FLAGS = [
	'valueMissing',
	'typeMismatch',
	'patternMismatch',
	'tooLong',
	'tooShort',
	'rangeUnderflow',
	'rangeOverflow',
	'stepMismatch',
	'badInput',
	'customError',
] as const;

function failingFlag(validity: object): string {
	return VALIDITY_FLAGS.find((flag) => Reflect.get(validity, flag) === true) ?? 'customError';
}

const FOCUSABLE =
	'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Move focus into a field's control.
 *
 * @remarks Focuses the ARIA target, or, when that is a container that cannot take
 * focus such as a checkbox or radio group, its first enabled focusable descendant.
 */
export function focusFieldControl(control: HTMLElement): void {
	const target = getAriaControlTarget(control);
	const focusable = target.matches(FOCUSABLE) ? target : target.querySelector<HTMLElement>(FOCUSABLE);
	(focusable ?? target).focus();
}

/** A multiple select takes a list of values, or one value as a list of one; a single select takes one. */
function writeSelectValue(control: HTMLSelectElement, value: unknown): void {
	if (!control.multiple) {
		control.value = value == null ? '' : String(value);
		return;
	}
	const chosen = new Set(
		Array.isArray(value) ? value.map(String) : value == null || value === '' ? [] : [String(value)],
	);
	for (const option of control.options) {
		option.selected = chosen.has(option.value);
	}
}

export function writeControlValue(control: HTMLElement, value: unknown): void {
	if (isNativeInput(control)) {
		const host = resolveControlHost(control);
		const adapter = host === control ? undefined : CONTROL_VALUE_ADAPTERS.get(host.localName);
		if (adapter) {
			adapter.write(host, value);
			return;
		}
		if (control.type === 'checkbox') {
			control.checked = Boolean(value);
			const ce = control.closest('rui-checkbox, rui-switch');
			if (ce) {
				if (value) {
					ce.setAttribute('checked', '');
				} else {
					ce.removeAttribute('checked');
				}
			}
			return;
		}
		control.value = value == null ? '' : String(value);
		return;
	}

	if (isNativeTextarea(control)) {
		control.value = value == null ? '' : String(value);
		return;
	}

	if (isNativeSelect(control)) {
		writeSelectValue(control, value);
		return;
	}

	const host = resolveControlHost(control);
	CONTROL_VALUE_ADAPTERS.get(host.localName)?.write(host, value);
}

function resolveControlHost(control: HTMLElement): HTMLElement {
	if (control.hasAttribute(RUI_CONTROL_ATTR)) {
		const host = control.closest(hostControlSelector()) as HTMLElement | null;
		return host ?? control;
	}
	return control;
}

export function findFieldLabel(root: HTMLElement): HTMLLabelElement | null {
	return queryFieldContent(root, `[${RUI_FIELD_LABEL_ATTR}]`) as HTMLLabelElement | null;
}

export function findFieldDescription(root: HTMLElement): HTMLElement | null {
	return queryFieldContent(root, `[${RUI_FIELD_DESCRIPTION_ATTR}]`);
}

export function findFieldError(root: HTMLElement): HTMLElement | null {
	const all = findFieldErrorElements(root);
	return all[0] ?? null;
}

function isControlledFieldError(node: HTMLElement): boolean {
	return node.hasAttribute(RUI_FIELD_ERROR_CONTROLLED_ATTR);
}

/** The regions that show a field's warning, in document order. */
export function findFieldWarningElements(root: HTMLElement): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(`[${RUI_FIELD_WARNING_ATTR}]`));
}

/**
 * Every error region the field owns (handles duplicate copies of slotted content).
 *
 * @remarks Skips controlled regions, whose content and visibility belong to their author; see
 * {@link findControlledFieldErrors}.
 */
export function findFieldErrorElements(root: HTMLElement): HTMLElement[] {
	return collectFieldErrorRegions(root).filter((node) => !isControlledFieldError(node));
}

/** Error regions in the field whose content the author controls with `RuiFieldError`'s `error` prop. */
export function findControlledFieldErrors(root: HTMLElement): HTMLElement[] {
	return collectFieldErrorRegions(root).filter(isControlledFieldError);
}

function collectFieldErrorRegions(root: HTMLElement): HTMLElement[] {
	const renderRoot = root.querySelector(FIELD_COLUMN_SELECTOR);
	if (renderRoot instanceof HTMLElement) {
		const inRender = Array.from(renderRoot.querySelectorAll<HTMLElement>(`[${RUI_FIELD_ERROR_ATTR}]`));
		if (inRender.length > 0) {
			return inRender;
		}
	}
	const fromDom = Array.from(root.querySelectorAll<HTMLElement>(`[${RUI_FIELD_ERROR_ATTR}]`));
	if (fromDom.length > 0) {
		return fromDom;
	}
	const single = queryFieldContent(root, `[${RUI_FIELD_ERROR_ATTR}]`);
	return single ? [single] : [];
}

/**
 * Copies `name` onto the listed node.
 *
 * Form-associated hosts submit themselves — inner inputs stay unnamed.
 * Checkbox, switch, and radio groups list through inner natives.
 * Store-only hosts (select, combobox) do not name an inner textbox.
 */
export function wireFieldControlName(
	controlHost: HTMLElement | null,
	ariaTarget: HTMLElement | null,
	name: string,
): void {
	if (ariaTarget && isNativeTextControl(ariaTarget)) {
		const submission = controlHost && CONTROL_VALUE_ADAPTERS.get(controlHost.localName)?.submission;
		const namesInner =
			controlHost == null ||
			controlHost === ariaTarget ||
			(!isFormAssociatedHost(controlHost) && submission !== 'host' && submission !== 'none');
		if (namesInner && name) {
			ariaTarget.name = name;
		} else {
			ariaTarget.removeAttribute('name');
		}
	}

	if (controlHost && CONTROL_VALUE_ADAPTERS.has(controlHost.localName)) {
		Reflect.set(controlHost, 'name', name);
		if (name) controlHost.setAttribute('name', name);
		else controlHost.removeAttribute('name');
	}
}

/** The native members a control host names on the client, by host tag, which the server markup must name too. */
const NAMED_MEMBER_SELECTORS: Readonly<Record<string, string>> = {
	'rui-radio-group': 'input[type="radio"]',
	'rui-number-field': '[data-number-field-input]',
};

/**
 * Writes `name` onto the native members a control host would name itself, in server markup.
 *
 * @remarks
 * A host serializes with its own name, so it names its members then. A field supplies its name only after the host
 * is serialized, and calls this to name them in the markup a form posts before the host connects.
 */
export function nameControlMembersForServer(controlHost: HTMLElement, name: string): void {
	const selector = NAMED_MEMBER_SELECTORS[controlHost.localName];
	if (!selector) {
		return;
	}
	for (const member of controlHost.querySelectorAll(selector)) {
		member.setAttribute('name', name);
	}
}

/**
 * Whether a radio is selected, in the browser and under the minimal SSR DOM.
 *
 * @remarks
 * The minimal SSR DOM rejects pseudo-classes, so `input:checked` throws a `SyntaxError`
 * server-side, and it has no `checked` property — state lives only on the attribute.
 * In the browser the property is authoritative: after a user selects a different radio the
 * `checked` attribute still marks the originally-rendered one, so the property must win.
 * Read via `Reflect.get` so the missing SSR property is an explicit `undefined`, not a
 * typed-as-boolean that happens to be nullish.
 *
 * @see `packages/radiant/src/server/README.md` — SSR gap registry (selector post-filters).
 */
function isChecked(input: HTMLInputElement): boolean {
	const checked = Reflect.get(input, 'checked');
	return typeof checked === 'boolean' ? checked : input.hasAttribute('checked');
}

function resolveDeclaredAriaTarget(control: HTMLElement): HTMLElement | null {
	const multi = control.getAttribute(RUI_ARIA_TARGETS_ATTR);
	if (multi) {
		const firstSelector = multi.split(',')[0]?.trim();
		if (firstSelector) {
			return control.querySelector<HTMLElement>(firstSelector);
		}
	}

	const single = control.getAttribute(RUI_ARIA_TARGET_ATTR);
	if (single) {
		return control.querySelector<HTMLElement>(single);
	}

	return null;
}

function resolveDeclaredAriaTargets(control: HTMLElement): HTMLElement[] {
	const multi = control.getAttribute(RUI_ARIA_TARGETS_ATTR);
	if (multi) {
		return multi
			.split(',')
			.map((selector) => selector.trim())
			.filter((selector) => selector !== '')
			.map((selector) => control.querySelector<HTMLElement>(selector))
			.filter((node): node is HTMLElement => node != null);
	}

	const single = control.getAttribute(RUI_ARIA_TARGET_ATTR);
	if (single) {
		const target = control.querySelector<HTMLElement>(single);
		return target ? [target] : [];
	}

	return [];
}

/** Element that receives `id`, `aria-invalid`, and `aria-describedby` from Field. */
export function getAriaControlTarget(control: HTMLElement): HTMLElement {
	if (isNativeTextControl(control)) {
		return control;
	}

	const declared = resolveDeclaredAriaTarget(control);
	if (declared) {
		return declared;
	}

	if (control.hasAttribute(RUI_CONTROL_ATTR)) {
		return control;
	}

	if (control.localName === 'rui-slider') {
		const thumb = Array.from(control.querySelectorAll<HTMLElement>('[data-thumb]')).find(
			(node) => !node.hasAttribute('hidden'),
		);
		return thumb ?? control;
	}

	const marked = control.querySelector<HTMLElement>(`[${RUI_CONTROL_ATTR}]`);
	if (marked) {
		return marked;
	}

	if (control.localName === 'rui-radio-group') {
		return getSelectedRadio(control) ?? control;
	}

	const selector = ARIA_TARGET_SELECTORS[control.localName];
	return selector ? (control.querySelector<HTMLElement>(selector) ?? control) : control;
}

function getSelectedRadio(control: HTMLElement): HTMLInputElement | undefined {
	const radios = control.querySelectorAll<HTMLInputElement>('input[type="radio"]');
	return Array.from(radios).find(isChecked) ?? radios[0];
}

/** Focusable surfaces that Field should wire `aria-invalid` / `aria-describedby` onto. */
export function getAriaControlTargets(control: HTMLElement): HTMLElement[] {
	const declared = resolveDeclaredAriaTargets(control);
	if (declared.length > 0) {
		return declared;
	}

	if (control.localName === 'rui-slider') {
		const thumbs = Array.from(control.querySelectorAll<HTMLElement>('[data-thumb]')).filter(
			(node) => !node.hasAttribute('hidden'),
		);
		return thumbs.length > 0 ? thumbs : [control];
	}
	return [getAriaControlTarget(control)];
}
