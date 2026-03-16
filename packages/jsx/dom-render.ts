import type { JsxElement, TemplateResultLike } from './jsx-runtime';

const ATTRIBUTE_BINDING_PREFIX = 'data-radiant-jsx-bind-';
const CHILD_BINDING_PREFIX = 'radiant-jsx-child:';
const ATTRIBUTE_BINDING_PATTERN = /^(.*?)(\s+)([@.?]?)([^\s"'<>/=`]+)=$/s;

type BindingKind = 'attr' | 'bool' | 'child' | 'event' | 'prop';

type BindingDescriptor =
	| { kind: 'child' }
	| {
			kind: Exclude<BindingKind, 'child'>;
			name: string;
	  };

type DeferredPropertyBinding = {
	element: Element;
	name: string;
	value: unknown;
};

type FocusSnapshot = {
	path: number[];
	selectionStart?: number | null;
	selectionEnd?: number | null;
	selectionDirection?: 'backward' | 'forward' | 'none' | null;
};

export interface JsxRoot {
	render: (element: JsxElement) => void;
	unmount: () => void;
}

/**
 * Renders a JSX value into a target element by replacing its children.
 */
export function render(element: JsxElement, target: HTMLElement): void {
	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	target.replaceChildren(...createNodesFromValue(element, deferredProperties));

	for (const binding of deferredProperties) {
		(binding.element as unknown as Record<string, unknown>)[binding.name] = binding.value;
	}

	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Creates a small root API for imperative mounting from plain application entrypoints.
 */
export function createRoot(target: HTMLElement): JsxRoot {
	return {
		render(element: JsxElement) {
			render(element, target);
		},
		unmount() {
			target.replaceChildren();
		},
	};
}

function createFragmentFromTemplate(
	template: TemplateResultLike,
	deferredProperties: DeferredPropertyBinding[],
): DocumentFragment {
	const htmlParts: string[] = [];
	const bindings = new Map<number, BindingDescriptor>();

	for (let index = 0; index < template.values.length; index += 1) {
		const stringPart = template.strings[index] ?? '';
		const attributeBinding = ATTRIBUTE_BINDING_PATTERN.exec(stringPart);

		if (attributeBinding) {
			const [, before, whitespace, prefix, name] = attributeBinding;
			htmlParts.push(
				before,
				whitespace,
				`${ATTRIBUTE_BINDING_PREFIX}${index}="${getBindingKind(prefix)}:${name}"`,
			);
			bindings.set(index, { kind: getBindingKind(prefix), name });
			continue;
		}

		htmlParts.push(stringPart, `<!--${CHILD_BINDING_PREFIX}${index}-->`);
		bindings.set(index, { kind: 'child' });
	}

	htmlParts.push(template.strings[template.strings.length - 1] ?? '');

	const templateElement = document.createElement('template');
	templateElement.innerHTML = htmlParts.join('');

	applyAttributeBindings(templateElement.content, template.values, bindings, deferredProperties);
	applyChildBindings(templateElement.content, template.values, bindings, deferredProperties);

	return templateElement.content;
}

function applyAttributeBindings(
	fragment: DocumentFragment,
	values: readonly unknown[],
	bindings: ReadonlyMap<number, BindingDescriptor>,
	deferredProperties: DeferredPropertyBinding[],
): void {
	const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
	let currentNode = walker.nextNode();

	while (currentNode) {
		const element = currentNode as Element;
		const attributes = Array.from(element.attributes);

		for (const attribute of attributes) {
			if (!attribute.name.startsWith(ATTRIBUTE_BINDING_PREFIX)) {
				continue;
			}

			const index = Number(attribute.name.slice(ATTRIBUTE_BINDING_PREFIX.length));
			const binding = bindings.get(index);
			element.removeAttribute(attribute.name);

			if (!binding || binding.kind === 'child') {
				continue;
			}

			applyAttributeBinding(element, binding, values[index], deferredProperties);
		}

		currentNode = walker.nextNode();
	}
}

function applyAttributeBinding(
	element: Element,
	binding: Exclude<BindingDescriptor, { kind: 'child' }>,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
): void {
	switch (binding.kind) {
		case 'attr':
			if (value === undefined || value === null) {
				return;
			}
			element.setAttribute(binding.name, String(value));
			return;

		case 'bool':
			if (value) {
				element.setAttribute(binding.name, '');
			}
			return;

		case 'event':
			if (typeof value === 'function' || isEventListenerObject(value)) {
				element.addEventListener(binding.name, value as EventListenerOrEventListenerObject);
			}
			return;

		case 'prop':
			deferredProperties.push({ element, name: binding.name, value });
			return;
	}
}

function applyChildBindings(
	fragment: DocumentFragment,
	values: readonly unknown[],
	bindings: ReadonlyMap<number, BindingDescriptor>,
	deferredProperties: DeferredPropertyBinding[],
): void {
	const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_COMMENT);
	const comments: Comment[] = [];
	let currentNode = walker.nextNode();

	while (currentNode) {
		comments.push(currentNode as Comment);
		currentNode = walker.nextNode();
	}

	for (const comment of comments) {
		if (!comment.data.startsWith(CHILD_BINDING_PREFIX)) {
			continue;
		}

		const index = Number(comment.data.slice(CHILD_BINDING_PREFIX.length));
		const binding = bindings.get(index);

		if (!binding || binding.kind !== 'child') {
			comment.remove();
			continue;
		}

		const nodes = createNodesFromValue(values[index], deferredProperties);
		comment.replaceWith(...nodes);
	}
}

function createNodesFromValue(value: unknown, deferredProperties: DeferredPropertyBinding[]): Node[] {
	if (value === undefined || value === null || value === false) {
		return [];
	}

	if (isTemplateResultLike(value)) {
		return Array.from(createFragmentFromTemplate(value, deferredProperties).childNodes);
	}

	if (value instanceof Node) {
		return [value];
	}

	if (isIterableValue(value)) {
		const nodes: Node[] = [];

		for (const child of value) {
			nodes.push(...createNodesFromValue(child, deferredProperties));
		}

		return nodes;
	}

	return [document.createTextNode(String(value))];
}

function getBindingKind(prefix: string): Exclude<BindingKind, 'child'> {
	switch (prefix) {
		case '@':
			return 'event';
		case '.':
			return 'prop';
		case '?':
			return 'bool';
		default:
			return 'attr';
	}
}

function isEventListenerObject(value: unknown): value is EventListenerObject {
	return typeof value === 'object' && value !== null && 'handleEvent' in value;
}

function isIterableValue(value: unknown): value is Iterable<unknown> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' && value !== null && '_$litType$' in value && 'strings' in value && 'values' in value
	);
}

function captureFocusSnapshot(target: HTMLElement): FocusSnapshot | undefined {
	const activeElement = document.activeElement;

	if (!(activeElement instanceof HTMLElement) || !target.contains(activeElement)) {
		return undefined;
	}

	return {
		path: getNodePath(target, activeElement),
		selectionStart: isSelectableInput(activeElement) ? activeElement.selectionStart : undefined,
		selectionEnd: isSelectableInput(activeElement) ? activeElement.selectionEnd : undefined,
		selectionDirection: isSelectableInput(activeElement) ? activeElement.selectionDirection : undefined,
	};
}

function restoreFocusSnapshot(target: HTMLElement, snapshot: FocusSnapshot | undefined): void {
	if (!snapshot) {
		return;
	}

	const nextFocusedNode = getNodeAtPath(target, snapshot.path);

	if (!(nextFocusedNode instanceof HTMLElement)) {
		return;
	}

	nextFocusedNode.focus({ preventScroll: true });

	if (isSelectableInput(nextFocusedNode)) {
		nextFocusedNode.setSelectionRange(
			snapshot.selectionStart ?? nextFocusedNode.value.length,
			snapshot.selectionEnd ?? nextFocusedNode.value.length,
			snapshot.selectionDirection ?? undefined,
		);
	}
}

function getNodePath(root: Node, target: Node): number[] {
	const path: number[] = [];
	let currentNode: Node | null = target;

	while (currentNode && currentNode !== root) {
		const parentNode: Node | null = currentNode.parentNode;

		if (!parentNode) {
			return path;
		}

		path.unshift(Array.prototype.indexOf.call(parentNode.childNodes, currentNode));
		currentNode = parentNode;
	}

	return path;
}

function getNodeAtPath(root: Node, path: number[]): Node | undefined {
	let currentNode: Node | undefined = root;

	for (const index of path) {
		currentNode = currentNode?.childNodes[index];

		if (!currentNode) {
			return undefined;
		}
	}

	return currentNode;
}

function isSelectableInput(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement {
	return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}
