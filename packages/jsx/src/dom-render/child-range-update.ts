import type { JsxKey, KeyedJsxValue } from '../types/index.ts';
import { isKeyedJsxValue } from '../types/renderable-guards.ts';
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
	isIterableRenderable,
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
	MountedMixedList,
	MountedSubscription,
	ReactiveChildSource,
	TemplateInstance,
} from './types.ts';

/**
 * Reconciles the content between two boundary markers against the next child
 * value.
 *
 * This is the main child-part update engine. It handles subscriptions, keyed
 * iterables, mixed iterables, nested template instances, primitive text, and
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
			const keyedCurrent =
				currentContent.kind === 'mixed-list' ? migrateMixedListToKeyed(currentContent) : currentContent;

			return updateKeyedChildren(
				startMarker,
				endMarker,
				keyedChildren,
				keyedCurrent,
				rootTarget,
				deferredProperties,
			);
		}

		return updateMixedChildren(
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

function migrateMixedListToKeyed(current: MountedMixedList): MountedRangeContent {
	const keyedRecords = new Map<JsxKey, MountedRangeRecord>();

	for (const entry of current.entries) {
		if (entry.key !== undefined) {
			keyedRecords.set(entry.key, entry.record);
		}
	}

	const retainedRecords = new Set(keyedRecords.values());
	for (const entry of current.entries) {
		if (!retainedRecords.has(entry.record)) {
			removeRangeRecord(entry.record);
		}
	}

	return { kind: 'keyed-list', records: keyedRecords };
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

/**
 * @remarks Uses {@link isIterableRenderable} rather than materializing the value.
 * {@link getIterableChildren} then snapshots one-shot iterators by identity.
 */
function classifyChildValue(value: unknown): 'empty' | 'iterable' | 'template' | 'text' | 'nodes' {
	if (isIterableRenderable(value)) return 'iterable';
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

function updateMixedChildren(
	startMarker: Text,
	endMarker: Text,
	children: readonly unknown[],
	current: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): MountedMixedList {
	if (current.kind !== 'mixed-list' && current.kind !== 'keyed-list') {
		disposeMountedRangeContent(current);
		clearRangeBetween(startMarker, endMarker);
	}

	const previousEntries = current.kind === 'mixed-list' ? current.entries : [];
	const keyedRecords = getMixedKeyedRecords(current, previousEntries);
	const nextEntries: MountedMixedList['entries'] = [];
	const usedRecords = new Set<MountedRangeRecord>();

	for (const [index, child] of children.entries()) {
		const keyedChild = isKeyedJsxValue(child) ? child : undefined;
		const record =
			findMixedRecord(keyedChild, index, previousEntries, keyedRecords) ?? createRangeRecord(endMarker);

		nextEntries.push({ key: keyedChild?.key, record });
		usedRecords.add(record);
	}

	updateMixedRecords(nextEntries, children, endMarker, rootTarget, deferredProperties);
	removeUnusedMixedRecords(current, usedRecords);

	return { entries: nextEntries, kind: 'mixed-list' };
}

function getMixedKeyedRecords(
	current: MountedRangeContent,
	previousEntries: MountedMixedList['entries'],
): Map<JsxKey, MountedRangeRecord> {
	if (current.kind === 'keyed-list') {
		return current.records;
	}

	const keyedRecords = new Map<JsxKey, MountedRangeRecord>();
	for (const entry of previousEntries) {
		if (entry.key !== undefined) {
			keyedRecords.set(entry.key, entry.record);
		}
	}

	return keyedRecords;
}

function findMixedRecord(
	keyedChild: KeyedJsxValue | undefined,
	index: number,
	previousEntries: MountedMixedList['entries'],
	keyedRecords: Map<JsxKey, MountedRangeRecord>,
): MountedRangeRecord | undefined {
	if (keyedChild) {
		return keyedRecords.get(keyedChild.key);
	}

	const previousEntry = previousEntries[index];
	return previousEntry && previousEntry.key === undefined ? previousEntry.record : undefined;
}

function updateMixedRecords(
	entries: MountedMixedList['entries'],
	children: readonly unknown[],
	endMarker: Text,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): void {
	let insertionPoint: Node = endMarker;
	for (let index = children.length - 1; index >= 0; index -= 1) {
		const entry = entries[index]!;
		moveRangeBefore(entry.record.start, entry.record.end, insertionPoint);
		entry.record.mounted = updateRangeContent(
			entry.record.start,
			entry.record.end,
			children[index],
			entry.record.mounted,
			rootTarget,
			deferredProperties,
		);
		insertionPoint = entry.record.start;
	}
}

function removeUnusedMixedRecords(current: MountedRangeContent, usedRecords: Set<MountedRangeRecord>): void {
	const previousRecords =
		current.kind === 'mixed-list'
			? current.entries.map((entry) => entry.record)
			: current.kind === 'keyed-list'
				? [...current.records.values()]
				: [];

	for (const record of previousRecords) {
		if (!usedRecords.has(record)) {
			removeRangeRecord(record);
		}
	}
}

function removeRangeRecord(record: MountedRangeRecord): void {
	disposeMountedRangeContent(record.mounted);
	clearRangeBetween(record.start, record.end);
	record.start.remove();
	record.end.remove();
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
