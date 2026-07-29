export const RUI_CONTROL_ATTR = 'data-rui-control';
export const RUI_FIELD_MANAGED_ATTR = 'data-rui-field-managed';
export const RUI_FIELD_LABEL_ATTR = 'data-rui-field-label';
export const RUI_FIELD_DESCRIPTION_ATTR = 'data-rui-field-description';
export const RUI_FIELD_ERROR_ATTR = 'data-rui-field-error';
export const RUI_FIELD_DEFAULT_VALUE_ATTR = 'data-default-value';
export const RUI_FORM_DEFAULT_VALUES_ATTR = 'data-default-values';

const HOST_CONTROL_TAGS = new Set([
	'rui-combobox',
	'rui-checkbox',
	'rui-switch',
	'rui-radio-group',
	'rui-slider',
	'rui-spinbutton',
	'rui-listbox',
]);

const CONTROL_SELECTOR = `[${RUI_CONTROL_ATTR}], ${Array.from(HOST_CONTROL_TAGS).join(', ')}, input, textarea`;

type FieldSlotHost = HTMLElement & { getSlotElements?: (name?: string) => Element[] };

/** Radiant slot projection moves authored children into the render tree; search projected nodes first. */
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

	const renderRoot = root.querySelector('.rui-field') ?? root;
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
	if (candidates.length === 0) {
		return null;
	}
	if (candidates.length === 1) {
		return candidates[0];
	}

	const active = document.activeElement;
	if (active instanceof HTMLElement) {
		for (const candidate of candidates) {
			if (candidate === active || candidate.contains(active)) {
				return candidate;
			}
		}
	}

	const visible = candidates.filter(
		(el) => el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden],[aria-hidden="true"]'),
	);
	const pool = visible.length > 0 ? visible : candidates.filter((el) => el.isConnected);
	return pool[pool.length - 1] ?? candidates[candidates.length - 1];
}

function listFieldControlsInRenderTree(root: HTMLElement): HTMLElement[] {
	const renderRoot = root.querySelector('.rui-field');
	if (!(renderRoot instanceof HTMLElement)) {
		return [];
	}
	return Array.from(renderRoot.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).filter((el) => root.contains(el));
}

export function findFieldControl(root: HTMLElement): HTMLElement | null {
	const fromRenderTree = pickPrimaryFieldControl(listFieldControlsInRenderTree(root));
	if (fromRenderTree) {
		return fromRenderTree;
	}

	let found: HTMLElement | null = null;
	forEachFieldContentNode(root, (node) => {
		if (found) {
			return;
		}
		const match = findControlInSubtree(node);
		if (match) {
			found = match;
		}
	});
	if (found) {
		return found;
	}
	const renderRoot = root.querySelector('.rui-field') ?? root;
	return findControlInSubtree(renderRoot);
}

function findControlInSubtree(node: Element): HTMLElement | null {
	if (!(node instanceof HTMLElement)) {
		return null;
	}
	if (node.matches(`[${RUI_CONTROL_ATTR}]`)) {
		return node;
	}
	if (HOST_CONTROL_TAGS.has(node.localName)) {
		return node;
	}
	if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
		return node;
	}
	const nested = node.querySelector<HTMLElement>(CONTROL_SELECTOR);
	return nested;
}

export function readControlValue(control: HTMLElement): unknown {
	if (control instanceof HTMLInputElement) {
		if (control.type === 'checkbox') {
			return control.checked;
		}
		if (control.type === 'number' || control.type === 'range') {
			return control.value === '' ? '' : Number(control.value);
		}
		return control.value;
	}

	if (control instanceof HTMLTextAreaElement) {
		return control.value;
	}

	const host = resolveControlHost(control);

	if (host.localName === 'rui-checkbox' || host.localName === 'rui-switch') {
		const input = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
		if (input) {
			return input.checked;
		}
		return host.hasAttribute('checked');
	}

	if (host.localName === 'rui-combobox' || host.localName === 'rui-radio-group' || host.localName === 'rui-listbox') {
		return (host as HTMLElement & { value?: string }).value ?? host.getAttribute('value') ?? '';
	}

	if (host.localName === 'rui-slider' || host.localName === 'rui-spinbutton') {
		const propValue = (host as HTMLElement & { value?: number }).value;
		if (typeof propValue === 'number') {
			return propValue;
		}
		const raw = host.getAttribute('value');
		return raw == null || raw === '' ? '' : Number(raw);
	}

	return host.getAttribute('value') ?? '';
}

export function writeControlValue(control: HTMLElement, value: unknown): void {
	if (control instanceof HTMLInputElement) {
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

	if (control instanceof HTMLTextAreaElement) {
		control.value = value == null ? '' : String(value);
		return;
	}

	const host = resolveControlHost(control);

	if (host.localName === 'rui-checkbox' || host.localName === 'rui-switch') {
		if (value) {
			host.setAttribute('checked', '');
		} else {
			host.removeAttribute('checked');
		}
		return;
	}

	host.setAttribute('value', value == null ? '' : String(value));
}

function resolveControlHost(control: HTMLElement): HTMLElement {
	if (control.hasAttribute(RUI_CONTROL_ATTR)) {
		const host = control.closest(Array.from(HOST_CONTROL_TAGS).join(',')) as HTMLElement | null;
		return host ?? control;
	}
	return control;
}

export function findFieldLabel(root: HTMLElement): HTMLLabelElement | null {
	return queryFieldContent(root, `[${RUI_FIELD_LABEL_ATTR}], label.rui-label`) as HTMLLabelElement | null;
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
	const renderRoot = root.querySelector('.rui-field');
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

	if (ariaTarget instanceof HTMLInputElement || ariaTarget instanceof HTMLTextAreaElement) {
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

/** Element that receives `id`, `aria-invalid`, and `aria-describedby` from Field. */
export function getAriaControlTarget(control: HTMLElement): HTMLElement {
	if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
		return control;
	}

	if (control.hasAttribute(RUI_CONTROL_ATTR)) {
		return control;
	}

	const marked = control.querySelector<HTMLElement>(`[${RUI_CONTROL_ATTR}]`);
	if (marked) {
		return marked;
	}

	if (control.localName === 'rui-combobox') {
		return control.querySelector<HTMLElement>('[data-combobox-input]') ?? control;
	}

	if (control.localName === 'rui-spinbutton') {
		return control.querySelector<HTMLElement>('[data-spinbutton-input], input') ?? control;
	}

	if (control.localName === 'rui-slider') {
		return control.querySelector<HTMLElement>('input[type="range"]') ?? control;
	}

	if (control.localName === 'rui-checkbox' || control.localName === 'rui-switch') {
		return control.querySelector<HTMLElement>('input') ?? control;
	}

	if (control.localName === 'rui-radio-group') {
		const checked = control.querySelector<HTMLInputElement>('input[type="radio"]:checked');
		const first = control.querySelector<HTMLInputElement>('input[type="radio"]');
		return checked ?? first ?? control;
	}

	return control;
}
