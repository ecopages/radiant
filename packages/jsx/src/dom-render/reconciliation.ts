import type { JsxKey, KeyedJsxValue, TemplateResultLike } from '../jsx-runtime.ts';
import { clearRangeBetween, createBoundaryMarker, insertNodesBefore, moveRangeBefore } from './dom-operations.ts';
import {
	attachEventBindingListener,
	clearDelegationRoot,
	detachEventBindingListener,
	isEventListenerObject,
} from './event-delegation.ts';
import { getElementAttributeValue, removeElementAttribute, setElementAttributeValue } from './namespaces.ts';
import {
	canRenderAsTextNode,
	createNodesFromValue,
	flushDeferredProperties,
	getIterableChildren,
	getKeyedChildren,
	isReactiveAttributeSource,
	isReactiveChildSource,
	isTemplateResultLike,
	readReactiveChildSourceValue,
	resolveReactiveSnapshot,
	subscribeToReactiveChildSource,
	unwrapKeyedValue,
} from './runtime-helpers.ts';
import type {
	CompiledTemplate,
	DeferredPropertyBinding,
	LiveAttributePart,
	MountedRangeContent,
	MountedRangeRecord,
	MountedRoot,
	MountedSubscription,
	ReactiveChildSource,
	TemplateInstance,
	BindingDescriptor,
} from './types.ts';

export type ReconciliationRuntime = {
	createTemplateInstance: (
		template: TemplateResultLike,
		rootTarget: HTMLElement,
		deferredProperties: DeferredPropertyBinding[],
		contextParent?: Node | null,
	) => TemplateInstance;
	getCompiledTemplate: (template: TemplateResultLike) => CompiledTemplate;
};

/**
 * Releases runtime state associated with a root-level mounted tree.
 *
 * Currently only template-mounted roots carry disposable state (event listeners and
 * subscriptions held in live parts).
 *
 * @param root Mounted root descriptor stored in the root render state.
 */
export function disposeMountedRoot(root: MountedRoot): void {
	if (root.kind === 'template') {
		disposeTemplateInstance(root.instance);
		clearDelegationRoot(root.instance.rootTarget);
	}
}

/**
 * Releases all disposable live parts within a {@link TemplateInstance}.
 *
 * Walks every child part and delegates to {@link disposeMountedRangeContent} so
 * subscriptions are cancelled and nested template instances are torn down recursively.
 *
 * @param instance Template instance to dispose.
 */
export function disposeTemplateInstance(instance: TemplateInstance): void {
	for (const part of instance.parts) {
		if (part.type === 'attribute') {
			disposeLiveAttributePart(part);
			continue;
		}

		if (part.type === 'child') {
			disposeMountedRangeContent(part.mounted);
		}
	}
}

export function disposeLiveAttributePart(part: LiveAttributePart): void {
	part.unsubscribe?.();
	part.unsubscribe = undefined;
	part.source = undefined;

	if (
		!part.previousValue ||
		(!isEventListenerObject(part.previousValue) && typeof part.previousValue !== 'function')
	) {
		part.previousValue = undefined;
		return;
	}

	if (part.binding.kind === 'event') {
		detachEventBindingListener(
			part.rootTarget,
			part.element,
			part.binding.name,
			part.previousValue as EventListenerOrEventListenerObject,
		);
	}

	if (part.binding.kind === 'native-event') {
		part.element.removeEventListener(part.binding.name, part.previousValue as EventListenerOrEventListenerObject);
	}

	part.previousValue = undefined;
}

/**
 * Recursively releases runtime bookkeeping for a mounted child range.
 *
 * Disposal is intentionally structural: subscriptions are unsubscribed and
 * nested range state is torn down even when the DOM nodes themselves are about
 * to be removed separately.
 */
export function disposeMountedRangeContent(mounted: MountedRangeContent): void {
	switch (mounted.kind) {
		case 'subscription':
			mounted.unsubscribe();
			disposeMountedRangeContent(mounted.mounted);
			return;

		case 'template':
			disposeTemplateInstance(mounted.instance);
			return;

		case 'indexed-list':
			for (const record of mounted.records) {
				disposeMountedRangeContent(record.mounted);
			}
			return;

		case 'keyed-list':
			for (const record of mounted.records.values()) {
				disposeMountedRangeContent(record.mounted);
			}
			return;

		case 'empty':
		case 'nodes':
		case 'text':
			return;
	}
}

/**
 * Applies a single dynamic attribute binding to an already-located live DOM
 * element.
 */
export function updateLiveAttributePart(
	part: LiveAttributePart,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
	_runtime: ReconciliationRuntime,
): void {
	if (part.source) {
		if (isReactiveAttributeSource(value) && part.source === value) {
			return;
		}

		part.unsubscribe?.();
		part.source = undefined;
		part.unsubscribe = undefined;
	}

	if (isReactiveAttributeSource(value)) {
		part.source = value;
		part.unsubscribe = subscribeToReactiveChildSource(value, (nextValue) => {
			const nextDeferredProperties: DeferredPropertyBinding[] = [];
			applyResolvedAttributeBinding(part, resolveReactiveSnapshot(nextValue), nextDeferredProperties);
			flushDeferredProperties(nextDeferredProperties);
		});
		applyResolvedAttributeBinding(
			part,
			resolveReactiveSnapshot(readReactiveChildSourceValue(value)),
			deferredProperties,
		);
		return;
	}

	applyResolvedAttributeBinding(part, resolveReactiveSnapshot(value), deferredProperties);
}

function applyResolvedAttributeBinding(
	part: LiveAttributePart,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
): void {
	switch (part.binding.kind) {
		case 'attr': {
			if (value === undefined || value === null) {
				removeElementAttribute(part.element, part.binding.name);
				part.previousValue = value;
				return;
			}

			const nextValue = String(value);

			if (
				part.previousValue !== value ||
				getElementAttributeValue(part.element, part.binding.name) !== nextValue
			) {
				setElementAttributeValue(part.element, part.binding.name, nextValue);
			}

			part.previousValue = value;
			return;
		}

		case 'bool': {
			if (value) {
				part.element.setAttribute(part.binding.name, '');
			} else {
				part.element.removeAttribute(part.binding.name);
			}

			part.previousValue = value;
			return;
		}

		case 'event': {
			if (part.previousValue === value) {
				return;
			}

			if (
				part.previousValue &&
				(typeof part.previousValue === 'function' || isEventListenerObject(part.previousValue))
			) {
				detachEventBindingListener(
					part.rootTarget,
					part.element,
					part.binding.name,
					part.previousValue as EventListenerOrEventListenerObject,
				);
			}

			if (typeof value === 'function' || isEventListenerObject(value)) {
				attachEventBindingListener(
					part.rootTarget,
					part.element,
					part.binding.name,
					value as EventListenerOrEventListenerObject,
				);
			}

			part.previousValue = value;
			return;
		}

		case 'native-event': {
			if (part.previousValue === value) {
				return;
			}

			if (
				part.previousValue &&
				(typeof part.previousValue === 'function' || isEventListenerObject(part.previousValue))
			) {
				part.element.removeEventListener(
					part.binding.name,
					part.previousValue as EventListenerOrEventListenerObject,
				);
			}

			if (typeof value === 'function' || isEventListenerObject(value)) {
				part.element.addEventListener(part.binding.name, value as EventListenerOrEventListenerObject);
			}

			part.previousValue = value;
			return;
		}

		case 'prop': {
			deferredProperties.push({ element: part.element, name: part.binding.name, value });
			part.previousValue = value;
			return;
		}
	}
}

/**
 * Applies a single attribute binding during non-incremental hydration of a flat JSX value.
 *
 * This is a simplified variant of {@link updateLiveAttributePart} used when the renderer
 * is reconnecting event and property bindings to existing SSR attributes without building
 * a full live template instance.
 *
 * @param element Target element.
 * @param binding Parsed binding descriptor from the hydration marker attribute.
 * @param value Current binding value from the JSX tree.
 * @param deferredProperties Accumulator for property assignments to flush after this pass.
 */
export function applyAttributeBinding(
	element: Element,
	binding: Exclude<BindingDescriptor, { kind: 'child' }>,
	value: unknown,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): void {
	const resolvedValue = resolveReactiveSnapshot(value);

	switch (binding.kind) {
		case 'attr':
			if (resolvedValue === undefined || resolvedValue === null) {
				return;
			}
			setElementAttributeValue(element, binding.name, String(resolvedValue));
			return;

		case 'bool':
			if (resolvedValue) {
				element.setAttribute(binding.name, '');
			}
			return;

		case 'event':
			if (typeof resolvedValue === 'function' || isEventListenerObject(resolvedValue)) {
				attachEventBindingListener(
					rootTarget,
					element,
					binding.name,
					resolvedValue as EventListenerOrEventListenerObject,
				);
			}
			return;

		case 'native-event':
			if (typeof resolvedValue === 'function' || isEventListenerObject(resolvedValue)) {
				element.addEventListener(binding.name, resolvedValue as EventListenerOrEventListenerObject);
			}
			return;

		case 'prop':
			deferredProperties.push({ element, name: binding.name, value: resolvedValue });
			return;
	}
}

/**
 * Reconciles the content between two boundary markers against the next child
 * value.
 *
 * This is the main child-part update engine. It handles subscriptions, keyed
 * iterables, indexed iterables, nested template instances, primitive text, and
 * generic node content through a single structural state machine.
 */
export function updateRangeContent(
	startMarker: Text,
	endMarker: Text,
	value: unknown,
	current: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	runtime: ReconciliationRuntime,
): MountedRangeContent {
	const nextValue = unwrapKeyedValue(value);
	let currentContent = current;

	if (currentContent.kind === 'subscription') {
		if (isReactiveChildSource(nextValue) && currentContent.source === nextValue) {
			return currentContent;
		}

		currentContent.unsubscribe();
		currentContent = currentContent.mounted;
	}

	if (isReactiveChildSource(nextValue)) {
		return mountReactiveChildSource(
			startMarker,
			endMarker,
			nextValue,
			currentContent,
			rootTarget,
			deferredProperties,
			runtime,
		);
	}

	const iterableChildren = getIterableChildren(nextValue);

	if (iterableChildren) {
		const keyedChildren = getKeyedChildren(iterableChildren);

		if (keyedChildren) {
			return updateKeyedChildren(
				startMarker,
				endMarker,
				keyedChildren,
				currentContent,
				rootTarget,
				deferredProperties,
				runtime,
			);
		}

		return updateIndexedChildren(
			startMarker,
			endMarker,
			iterableChildren,
			currentContent,
			rootTarget,
			deferredProperties,
			runtime,
		);
	}

	if (isTemplateResultLike(nextValue)) {
		if (
			currentContent.kind === 'template' &&
			currentContent.instance.compiled === runtime.getCompiledTemplate(nextValue)
		) {
			currentContent.instance.update(nextValue.values, deferredProperties);
			return currentContent;
		}

		disposeMountedRangeContent(currentContent);
		clearRangeBetween(startMarker, endMarker);
		const instance = runtime.createTemplateInstance(
			nextValue,
			rootTarget,
			deferredProperties,
			endMarker.parentNode,
		);
		insertNodesBefore(endMarker, instance.rootNodes);
		return { instance, kind: 'template' };
	}

	if (nextValue === undefined || nextValue === null || nextValue === false || nextValue === true) {
		disposeMountedRangeContent(currentContent);
		clearRangeBetween(startMarker, endMarker);
		return { kind: 'empty' };
	}

	if (currentContent.kind === 'text' && canRenderAsTextNode(nextValue)) {
		const nextText = String(nextValue);

		if (currentContent.node.data !== nextText) {
			currentContent.node.data = nextText;
		}

		return currentContent;
	}

	disposeMountedRangeContent(currentContent);
	clearRangeBetween(startMarker, endMarker);

	if (canRenderAsTextNode(nextValue)) {
		const textNode = document.createTextNode(String(nextValue));
		insertNodesBefore(endMarker, [textNode]);
		return { kind: 'text', node: textNode };
	}

	const nodes = createNodesFromValue(
		nextValue,
		rootTarget,
		deferredProperties,
		runtime.createTemplateInstance,
		endMarker.parentNode,
	);
	insertNodesBefore(endMarker, nodes);
	return { kind: 'nodes', nodes };
}

function updateKeyedChildren(
	startMarker: Text,
	endMarker: Text,
	children: readonly KeyedJsxValue[],
	current: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	runtime: ReconciliationRuntime,
): MountedRangeContent {
	const keyedState =
		current.kind === 'keyed-list'
			? current
			: {
					kind: 'keyed-list' as const,
					order: [],
					records: new Map<JsxKey, MountedRangeRecord>(),
				};

	if (current.kind !== 'keyed-list') {
		disposeMountedRangeContent(current);
		clearRangeBetween(startMarker, endMarker);
	}

	const nextOrder: JsxKey[] = [];
	const nextKeys = new Set<JsxKey>();
	let insertionPoint: Node = endMarker;

	for (let index = children.length - 1; index >= 0; index -= 1) {
		const child = children[index];

		if (!child) {
			continue;
		}

		nextOrder.unshift(child.key);
		nextKeys.add(child.key);

		let record = keyedState.records.get(child.key);

		if (!record) {
			record = createRangeRecord(endMarker);
			keyedState.records.set(child.key, record);
		}

		moveRangeBefore(record.start, record.end, insertionPoint);
		record.mounted = updateRangeContent(
			record.start,
			record.end,
			child.value,
			record.mounted,
			rootTarget,
			deferredProperties,
			runtime,
		);
		insertionPoint = record.start;
	}

	for (const [key, record] of [...keyedState.records]) {
		if (nextKeys.has(key)) {
			continue;
		}

		disposeMountedRangeContent(record.mounted);
		clearRangeBetween(record.start, record.end);
		record.start.remove();
		record.end.remove();
		keyedState.records.delete(key);
	}

	keyedState.order = nextOrder;
	return keyedState;
}

function updateIndexedChildren(
	startMarker: Text,
	endMarker: Text,
	children: readonly unknown[],
	current: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	runtime: ReconciliationRuntime,
): MountedRangeContent {
	const indexedState =
		current.kind === 'indexed-list'
			? current
			: {
					kind: 'indexed-list' as const,
					records: [],
				};

	if (current.kind !== 'indexed-list') {
		disposeMountedRangeContent(current);
		clearRangeBetween(startMarker, endMarker);
	}

	let insertionPoint: Node = endMarker;

	for (let index = children.length - 1; index >= 0; index -= 1) {
		let record = indexedState.records[index];

		if (!record) {
			record = createRangeRecord(endMarker);
			indexedState.records[index] = record;
		}

		moveRangeBefore(record.start, record.end, insertionPoint);
		record.mounted = updateRangeContent(
			record.start,
			record.end,
			children[index],
			record.mounted,
			rootTarget,
			deferredProperties,
			runtime,
		);
		insertionPoint = record.start;
	}

	while (indexedState.records.length > children.length) {
		const record = indexedState.records.pop();

		if (!record) {
			break;
		}

		disposeMountedRangeContent(record.mounted);
		clearRangeBetween(record.start, record.end);
		record.start.remove();
		record.end.remove();
	}

	return indexedState;
}

function mountReactiveChildSource(
	startMarker: Text,
	endMarker: Text,
	source: ReactiveChildSource,
	current: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	runtime: ReconciliationRuntime,
): MountedSubscription {
	const mountedSubscription: MountedSubscription = {
		kind: 'subscription',
		mounted: current,
		source,
		unsubscribe: () => undefined,
	};

	const applyValue = (nextValue: unknown) => {
		const nextDeferredProperties: DeferredPropertyBinding[] = [];
		mountedSubscription.mounted = updateRangeContent(
			startMarker,
			endMarker,
			nextValue,
			mountedSubscription.mounted,
			rootTarget,
			nextDeferredProperties,
			runtime,
		);
		flushDeferredProperties(nextDeferredProperties);
	};

	mountedSubscription.unsubscribe = subscribeToReactiveChildSource(source, (nextValue) => {
		applyValue(nextValue);
	});

	applyValue(readReactiveChildSourceValue(source));
	flushDeferredProperties(deferredProperties);

	return mountedSubscription;
}

/**
 * Allocates a new empty {@link MountedRangeRecord} with fresh boundary markers
 * inserted immediately before `referenceNode`.
 *
 * @param referenceNode Node before which the new boundary pair is inserted.
 */
function createRangeRecord(referenceNode: Text): MountedRangeRecord {
	const start = createBoundaryMarker();
	const end = createBoundaryMarker();
	referenceNode.before(start, end);
	return {
		end,
		mounted: { kind: 'empty' },
		start,
	};
}

/**
 * Wraps an existing slice of SSR DOM nodes in a {@link MountedRangeRecord} by
 * inserting boundary markers around them.
 *
 * When `existingNodes` is empty, both markers are inserted before `referenceNode`.
 * Otherwise, the start marker is placed before the first node and the end marker after
 * the last node.
 *
 * @param existingNodes SSR nodes to enclose.
 * @param referenceNode Fallback reference node used for empty slices.
 */
export function createHydratedRangeRecord(existingNodes: readonly Node[], referenceNode: Node): MountedRangeRecord {
	const start = createBoundaryMarker();
	const end = createBoundaryMarker();
	const parentNode = (existingNodes[0] ?? referenceNode).parentNode;

	if (!parentNode) {
		return {
			end,
			mounted: { kind: 'empty' },
			start,
		};
	}

	if (existingNodes.length === 0) {
		parentNode.insertBefore(start, referenceNode);
		parentNode.insertBefore(end, referenceNode);
	} else {
		parentNode.insertBefore(start, existingNodes[0] ?? null);
		parentNode.insertBefore(
			end,
			(existingNodes[existingNodes.length - 1]?.nextSibling ?? referenceNode) as ChildNode | null,
		);
	}

	return {
		end,
		mounted: { kind: 'empty' },
		start,
	};
}
