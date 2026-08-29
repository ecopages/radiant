export const RUI_CONTROL_ATTR = 'data-rui-control';
export const RUI_FIELD_MANAGED_ATTR = 'data-rui-field-managed';
export const RUI_FIELD_LABEL_ATTR = 'data-rui-field-label';
export const RUI_FIELD_DESCRIPTION_ATTR = 'data-rui-field-description';
export const RUI_FIELD_ERROR_ATTR = 'data-rui-field-error';
export const RUI_FIELD_DEFAULT_VALUE_ATTR = 'data-default-value';
export const RUI_FORM_DEFAULT_VALUES_ATTR = 'data-default-values';
const FIELD_COLUMN_SELECTOR = '[data-ref="field"]';

const HOST_CONTROL_TAGS = new Set([
	'rui-combobox',
	'rui-date-field',
	'rui-date-range-picker',
	'rui-select',
	'rui-tag-group',
	'rui-checkbox',
	'rui-checkbox-group',
	'rui-switch',
	'rui-radio-group',
	'rui-slider',
	'rui-knob',
	'rui-number-field',
	'rui-listbox',
]);

/** Library controls only — `data-rui-control` (e.g. RuiInput) or known host tags. */
export const FIELD_CONTROL_SELECTOR = `[${RUI_CONTROL_ATTR}], ${Array.from(HOST_CONTROL_TAGS).join(', ')}`;

const HOST_CONTROL_SELECTOR = Array.from(HOST_CONTROL_TAGS).join(', ');

function isEmbeddedListbox(node: HTMLElement): boolean {
	return (
		node.localName === 'rui-listbox' && (node.hasAttribute('embedded') || Reflect.get(node, 'embedded') === true)
	);
}

const ARIA_TARGET_SELECTORS: Readonly<Record<string, string>> = {
	'rui-combobox': '[data-combobox-input]',
	'rui-date-field': '[data-date-field-input]',
	'rui-date-range-picker': '[data-range-start]',
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

type FieldSlotHost = HTMLElement & { getSlotElements?: (name?: string) => Element[] };

type ControlValueAdapter = {
	read: (host: HTMLElement) => unknown;
	write: (host: HTMLElement, value: unknown) => void;
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

function readNumberProperty(host: HTMLElement, property: string, attribute: string): number | '' {
	const value = Reflect.get(host, property);
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	const raw = host.getAttribute(attribute);
	return raw == null || raw === '' ? '' : Number(raw);
}

function isRangeSlider(host: HTMLElement): boolean {
	const variant = Reflect.get(host, 'variant');
	return variant === 'range' || host.getAttribute('variant') === 'range';
}

const sliderValueAdapter: ControlValueAdapter = {
	read: (host) => {
		if (isRangeSlider(host)) {
			return [
				readNumberProperty(host, 'rangeMin', 'range-min'),
				readNumberProperty(host, 'rangeMax', 'range-max'),
			];
		}
		return numberValueAdapter.read(host);
	},
	write: (host, value) => {
		if (Array.isArray(value) && value.length >= 2) {
			host.setAttribute('variant', 'range');
			if ('variant' in host) {
				Reflect.set(host, 'variant', 'range');
			}
			host.setAttribute('range-min', String(value[0]));
			host.setAttribute('range-max', String(value[1]));
			if ('rangeMin' in host) {
				Reflect.set(host, 'rangeMin', value[0]);
			}
			if ('rangeMax' in host) {
				Reflect.set(host, 'rangeMax', value[1]);
			}
			return;
		}
		numberValueAdapter.write(host, value);
	},
};

const CONTROL_VALUE_ADAPTERS = new Map<string, ControlValueAdapter>([
	['rui-checkbox', booleanValueAdapter],
	['rui-switch', booleanValueAdapter],
	['rui-combobox', stringValueAdapter],
	['rui-date-field', stringValueAdapter],
	['rui-date-range-picker', stringValueAdapter],
	['rui-select', stringValueAdapter],
	['rui-radio-group', stringValueAdapter],
	['rui-checkbox-group', stringValueAdapter],
	['rui-listbox', stringValueAdapter],
	['rui-tag-group', stringValueAdapter],
	['rui-slider', sliderValueAdapter],
	['rui-knob', numberValueAdapter],
	['rui-number-field', numberValueAdapter],
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

	if (typeof slotHost.getSlotElements === 'function') {
		for (const node of slotHost.getSlotElements()) {
			safeVisit(node);
		}
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
		if (node instanceof HTMLElement && node.matches(FIELD_CONTROL_SELECTOR)) {
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
	return Array.from(renderRoot.querySelectorAll<HTMLElement>(FIELD_CONTROL_SELECTOR)).filter((el) =>
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

/**
 * Whether a bubbling `rui-change` belongs to this field's primary control, not a
 * nested host inside it.
 */
export function isPrimaryFieldControlEvent(root: HTMLElement, event: Event): boolean {
	const control = findFieldControl(root);
	if (!control || !(event.target instanceof Element)) {
		return false;
	}
	if (event.target !== control && !control.contains(event.target)) {
		return false;
	}
	const nestedHost = event.target.closest(HOST_CONTROL_SELECTOR);
	return nestedHost === control || nestedHost == null;
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

	const host = resolveControlHost(control);
	return CONTROL_VALUE_ADAPTERS.get(host.localName)?.read(host) ?? host.getAttribute('value') ?? '';
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

	const host = resolveControlHost(control);
	CONTROL_VALUE_ADAPTERS.get(host.localName)?.write(host, value);
}

function resolveControlHost(control: HTMLElement): HTMLElement {
	if (control.hasAttribute(RUI_CONTROL_ATTR)) {
		const host = control.closest(HOST_CONTROL_SELECTOR) as HTMLElement | null;
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

/** Every error region in the field (handles duplicate slot-projection copies). */
export function findFieldErrorElements(root: HTMLElement): HTMLElement[] {
	const renderRoot = root.querySelector(FIELD_COLUMN_SELECTOR);
	if (renderRoot instanceof HTMLElement) {
		const inRender = Array.from(renderRoot.querySelectorAll<HTMLElement>(`[${RUI_FIELD_ERROR_ATTR}]`));
		const visible = inRender.filter((el) => el.getClientRects().length > 0);
		if (visible.length > 0) {
			return visible;
		}
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

/** Syncs the field name onto the native control and custom-element hosts. */
export function wireFieldControlName(
	controlHost: HTMLElement | null,
	ariaTarget: HTMLElement | null,
	name: string,
): void {
	if (!name) {
		return;
	}

	if (ariaTarget && isNativeTextControl(ariaTarget)) {
		ariaTarget.name = name;
	}

	if (!controlHost) {
		return;
	}

	if (controlHost === ariaTarget) {
		return;
	}

	if (HOST_CONTROL_TAGS.has(controlHost.localName)) {
		controlHost.setAttribute('name', name);
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

/** Element that receives `id`, `aria-invalid`, and `aria-describedby` from Field. */
export function getAriaControlTarget(control: HTMLElement): HTMLElement {
	if (isNativeTextControl(control)) {
		return control;
	}

	if (control.hasAttribute(RUI_CONTROL_ATTR)) {
		return control;
	}

	if (control.localName === 'rui-slider') {
		return control.querySelector<HTMLElement>('[data-thumb]:not([hidden])') ?? control;
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
	if (control.localName === 'rui-slider') {
		const thumbs = Array.from(control.querySelectorAll<HTMLElement>('[data-thumb]:not([hidden])'));
		return thumbs.length > 0 ? thumbs : [control];
	}
	return [getAriaControlTarget(control)];
}
