import type { JsxKey, KeyedJsxValue } from '../jsx-runtime.ts';
import { getCompiledTemplate } from './template-compiler.ts';
import { createTemplateInstance } from './template-instance.ts';
import { clearRangeBetween, createBoundaryMarker, insertNodesBefore, moveRangeBefore } from './dom-operations.ts';
import {
	attachEventBindingListener,
	clearDelegationRoot,
	detachEventBindingListener,
	isEventListenerObject,
} from './event-delegation.ts';
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
	releaseLiveAttributeSubscription(part);

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
 * Ends the current reactive ownership epoch for a live attribute part.
 *
 * Bumping `subscriptionSerial` before running `unsubscribe` ensures that any queued callback from
 * the previous source becomes a no-op even if it fires after teardown. This keeps ownership scoped
 * to the DOM part instance rather than to whichever source happened to subscribe first.
 */
function releaseLiveAttributeSubscription(part: LiveAttributePart): void {
	const unsubscribe = part.unsubscribe;
	part.subscriptionSerial += 1;
	part.unsubscribe = undefined;
	part.source = undefined;
	unsubscribe?.();
}

/**
 * Ends the current child-range subscription epoch and returns the last mounted child state.
 *
 * The returned `mounted` subtree remains structurally owned by the same DOM range and can be
 * reconciled in place against the next value. Only the reactive source ownership is released.
 */
function releaseMountedSubscription(mounted: MountedSubscription): MountedRangeContent {
	const unsubscribe = mounted.unsubscribe;
	mounted.subscriptionSerial += 1;
	mounted.unsubscribe = () => undefined;
	unsubscribe();
	return mounted.mounted;
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
			disposeMountedRangeContent(releaseMountedSubscription(mounted));
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
): void {
	if (part.source) {
		if (isReactiveAttributeSource(value) && part.source === value) {
			return;
		}

		releaseLiveAttributeSubscription(part);
	}

	if (isReactiveAttributeSource(value)) {
		const subscriptionSerial = part.subscriptionSerial + 1;
		part.subscriptionSerial = subscriptionSerial;
		part.source = value;
		part.unsubscribe = subscribeToReactiveChildSource(value, (nextValue) => {
			if (part.subscriptionSerial !== subscriptionSerial || part.source !== value) {
				return;
			}

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

import { applyAttributeBinding, applyResolvedAttributeBinding } from './bindings.ts';

export { applyAttributeBinding } from './bindings.ts';
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
): MountedRangeContent {
	const nextValue = unwrapKeyedValue(value);
	let currentContent = current;

	if (currentContent.kind === 'subscription') {
		if (isReactiveChildSource(nextValue) && currentContent.source === nextValue) {
			return currentContent;
		}

		currentContent = releaseMountedSubscription(currentContent);
	}

	if (isReactiveChildSource(nextValue)) {
		return mountReactiveChildSource(
			startMarker,
			endMarker,
			nextValue,
			currentContent,
			rootTarget,
			deferredProperties,
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
			);
		}

		return updateIndexedChildren(
			startMarker,
			endMarker,
			iterableChildren,
			currentContent,
			rootTarget,
			deferredProperties,
		);
	}

	if (isTemplateResultLike(nextValue)) {
		if (currentContent.kind === 'template' && currentContent.instance.compiled === getCompiledTemplate(nextValue)) {
			currentContent.instance.update(nextValue.values, deferredProperties);
			return currentContent;
		}

		const instance = createTemplateInstance(nextValue, rootTarget, deferredProperties, endMarker.parentNode);
		return replaceMountedRangeWithTemplate(startMarker, endMarker, currentContent, instance);
	}

	if (nextValue === undefined || nextValue === null || nextValue === false || nextValue === true) {
		return replaceMountedRangeWithEmpty(startMarker, endMarker, currentContent);
	}

	if (currentContent.kind === 'text' && canRenderAsTextNode(nextValue)) {
		const nextText = String(nextValue);

		if (currentContent.node.data !== nextText) {
			currentContent.node.data = nextText;
		}

		return currentContent;
	}

	if (canRenderAsTextNode(nextValue)) {
		const textNode = document.createTextNode(String(nextValue));
		return replaceMountedRangeWithText(startMarker, endMarker, currentContent, textNode);
	}

	const nodes = createNodesFromValue(
		nextValue,
		rootTarget,
		deferredProperties,
		createTemplateInstance,
		endMarker.parentNode,
	);
	return replaceMountedRangeWithNodes(startMarker, endMarker, currentContent, nodes);
}

function replaceMountedRangeWithEmpty(
	startMarker: Text,
	endMarker: Text,
	current: MountedRangeContent,
): MountedRangeContent {
	disposeMountedRangeContent(current);
	clearRangeBetween(startMarker, endMarker);
	return { kind: 'empty' };
}

function replaceMountedRangeWithTemplate(
	startMarker: Text,
	endMarker: Text,
	current: MountedRangeContent,
	instance: TemplateInstance,
): MountedRangeContent {
	disposeMountedRangeContent(current);
	clearRangeBetween(startMarker, endMarker);
	insertNodesBefore(endMarker, instance.rootNodes);
	return { instance, kind: 'template' };
}

function replaceMountedRangeWithText(
	startMarker: Text,
	endMarker: Text,
	current: MountedRangeContent,
	textNode: Text,
): MountedRangeContent {
	disposeMountedRangeContent(current);
	clearRangeBetween(startMarker, endMarker);
	insertNodesBefore(endMarker, [textNode]);
	return { kind: 'text', node: textNode };
}

function replaceMountedRangeWithNodes(
	startMarker: Text,
	endMarker: Text,
	current: MountedRangeContent,
	nodes: readonly Node[],
): MountedRangeContent {
	disposeMountedRangeContent(current);
	clearRangeBetween(startMarker, endMarker);
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
): MountedRangeContent {
	const keyedState =
		current.kind === 'keyed-list'
			? current
			: {
					kind: 'keyed-list' as const,
					records: new Map<JsxKey, MountedRangeRecord>(),
				};

	if (current.kind !== 'keyed-list') {
		disposeMountedRangeContent(current);
		clearRangeBetween(startMarker, endMarker);
	}

	const nextKeys = new Set<JsxKey>();
	let insertionPoint: Node = endMarker;

	for (let index = children.length - 1; index >= 0; index -= 1) {
		const child = children[index];

		if (!child) {
			continue;
		}

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

	return keyedState;
}

function updateIndexedChildren(
	startMarker: Text,
	endMarker: Text,
	children: readonly unknown[],
	current: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
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
): MountedSubscription {
	const mountedSubscription: MountedSubscription = {
		kind: 'subscription',
		mounted: current,
		source,
		subscriptionSerial: 0,
		unsubscribe: () => undefined,
	};
	const subscriptionSerial = mountedSubscription.subscriptionSerial + 1;
	mountedSubscription.subscriptionSerial = subscriptionSerial;

	const applyValue = (nextValue: unknown) => {
		const nextDeferredProperties: DeferredPropertyBinding[] = [];
		mountedSubscription.mounted = updateRangeContent(
			startMarker,
			endMarker,
			nextValue,
			mountedSubscription.mounted,
			rootTarget,
			nextDeferredProperties,
		);
		flushDeferredProperties(nextDeferredProperties);
	};

	mountedSubscription.unsubscribe = subscribeToReactiveChildSource(source, (nextValue) => {
		if (mountedSubscription.subscriptionSerial !== subscriptionSerial || mountedSubscription.source !== source) {
			return;
		}

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
