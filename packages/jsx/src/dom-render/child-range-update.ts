import type { JsxKey, KeyedJsxValue } from '../types/index.ts';
import { clearRangeBetween, insertNodesBefore, moveRangeBefore } from './dom-operations.ts';
import { disposeMountedRangeContent, releaseMountedSubscription } from './mounted-disposal.ts';
import { createRangeRecord } from './range-records.ts';
import { getCompiledTemplate } from './template-compiler.ts';
import { createTemplateInstance } from './template-instance.ts';
import {
	canRenderAsTextNode,
	createNodesFromValue,
	flushDeferredProperties,
	getIterableChildren,
	getKeyedChildren,
	isReactiveChildSource,
	isTemplateResultLike,
	readReactiveChildSourceValue,
	subscribeToReactiveChildSource,
	unwrapKeyedValue,
} from './runtime-helpers.ts';
import type {
	DeferredPropertyBinding,
	MountedRangeContent,
	MountedRangeRecord,
	MountedSubscription,
	ReactiveChildSource,
	TemplateInstance,
} from './types.ts';

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
	if (current.kind === 'subscription' && isReactiveChildSource(nextValue) && current.source === nextValue)
		return current;
	const currentContent = current.kind === 'subscription' ? releaseMountedSubscription(current) : current;
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
	const nextKind = classifyChildValue(nextValue);

	if (nextKind === 'iterable') {
		const iterableChildren = getIterableChildren(nextValue)!;
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

	return updateSingleChildContent(
		startMarker,
		endMarker,
		nextValue,
		nextKind,
		currentContent,
		rootTarget,
		deferredProperties,
	);
}

function updateSingleChildContent(
	startMarker: Text,
	endMarker: Text,
	nextValue: unknown,
	nextKind: 'empty' | 'nodes' | 'template' | 'text',
	currentContent: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): MountedRangeContent {
	if (nextKind === 'template' && isTemplateResultLike(nextValue)) {
		if (currentContent.kind === 'template' && currentContent.instance.compiled === getCompiledTemplate(nextValue)) {
			currentContent.instance.update(nextValue.values, deferredProperties);
			return currentContent;
		}

		const instance = createTemplateInstance(nextValue, rootTarget, deferredProperties, endMarker.parentNode);
		return replaceMountedRangeWithTemplate(startMarker, endMarker, currentContent, instance);
	}

	if (nextKind === 'empty') {
		return replaceMountedRangeWithEmpty(startMarker, endMarker, currentContent);
	}

	if (nextKind === 'text' && currentContent.kind === 'text') {
		const nextText = String(nextValue);

		if (currentContent.node.data !== nextText) {
			currentContent.node.data = nextText;
		}

		return currentContent;
	}

	if (nextKind === 'text') {
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

function classifyChildValue(value: unknown): 'empty' | 'iterable' | 'template' | 'text' | 'nodes' {
	if (getIterableChildren(value)) return 'iterable';
	if (isTemplateResultLike(value)) return 'template';
	if (value === undefined || value === null || value === false || value === true) return 'empty';
	return canRenderAsTextNode(value) ? 'text' : 'nodes';
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

export function mountReactiveChildSource(
	startMarker: Text,
	endMarker: Text,
	source: ReactiveChildSource,
	current: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): MountedSubscription {
	const subscriptionSerial = 1;
	const mountedSubscription: MountedSubscription = {
		kind: 'subscription',
		mounted: current,
		source,
		subscriptionSerial,
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
