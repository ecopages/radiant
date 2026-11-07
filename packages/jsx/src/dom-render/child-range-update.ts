import type { JsxKey, KeyedJsxValue } from '../types/index.ts';
import { isKeyedJsxValue } from '../types/renderable-guards.ts';
import { clearRange, getRangeFirstNode, getRangeParent, insertIntoRange } from './child-range.ts';
import { moveRangeBefore } from './dom-operations.ts';
import { disposeMountedRangeContent, releaseMountedSubscription } from './mounted-disposal.ts';
import { createRangeRecord } from './range-records.ts';
import { getCompiledTemplate } from './template-compiler.ts';
import { createTemplateInstance, updateTemplateInstance } from './template-instance.ts';
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
	ChildRange,
	DeferredPropertyBinding,
	MountedRangeContent,
	MountedRangeRecord,
	MountedMixedList,
	MountedMixedListEntry,
	MountedSubscription,
	ReactiveChildSource,
	TemplateInstance,
} from './types.ts';

/**
 * Reconciles the content of a child range against the next child value.
 *
 * This is the main child-part update engine. It handles subscriptions, keyed
 * iterables, mixed iterables, nested template instances, primitive text, and
 * generic node content through a single structural state machine.
 */
export function updateRangeContent(
	range: ChildRange,
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
		return mountReactiveChildSource(range, nextValue, currentContent, rootTarget);
	}
	const nextKind = classifyChildValue(nextValue);

	if (nextKind === 'iterable') {
		const iterableChildren = getIterableChildren(nextValue)!;
		const keyedChildren = getKeyedChildren(iterableChildren);
		if (keyedChildren) {
			const keyedCurrent =
				currentContent.kind === 'mixed-list' ? migrateMixedListToKeyed(currentContent) : currentContent;

			return updateKeyedChildren(range, keyedChildren, keyedCurrent, rootTarget, deferredProperties);
		}

		return updateMixedChildren(range, iterableChildren, currentContent, rootTarget, deferredProperties);
	}

	return updateSingleChildContent(range, nextValue, nextKind, currentContent, rootTarget, deferredProperties);
}

/** Keeps the keyed entries of a mixed list as a keyed list's records and removes the positional ones. */
function migrateMixedListToKeyed(current: MountedMixedList): MountedRangeContent {
	const keyedRecords = new Map<JsxKey, MountedRangeRecord>();

	for (const entry of current.entries) {
		if (entry.key === undefined) {
			removeRangeRecord(entry.record);
		} else {
			keyedRecords.set(entry.key, entry.record);
		}
	}

	return { kind: 'keyed-list', records: keyedRecords };
}

function updateSingleChildContent(
	range: ChildRange,
	nextValue: unknown,
	nextKind: 'empty' | 'nodes' | 'template' | 'text',
	currentContent: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): MountedRangeContent {
	if (nextKind === 'template' && isTemplateResultLike(nextValue)) {
		if (currentContent.kind === 'template' && currentContent.instance.compiled === getCompiledTemplate(nextValue)) {
			updateTemplateInstance(currentContent.instance, nextValue.values, deferredProperties);
			return currentContent;
		}

		const instance = createTemplateInstance(nextValue, rootTarget, deferredProperties, getRangeParent(range));
		return replaceMountedRangeWithTemplate(range, currentContent, instance);
	}

	if (nextKind === 'empty') {
		return replaceMountedRangeWithEmpty(range, currentContent);
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
		return replaceMountedRangeWithText(range, currentContent, textNode);
	}

	const nodes = createNodesFromValue(
		nextValue,
		rootTarget,
		deferredProperties,
		createTemplateInstance,
		getRangeParent(range),
	);
	return replaceMountedRangeWithNodes(range, currentContent, nodes);
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

function replaceMountedRangeWithEmpty(range: ChildRange, current: MountedRangeContent): MountedRangeContent {
	disposeMountedRangeContent(current);
	clearRange(range);
	return { kind: 'empty' };
}

function replaceMountedRangeWithTemplate(
	range: ChildRange,
	current: MountedRangeContent,
	instance: TemplateInstance,
): MountedRangeContent {
	disposeMountedRangeContent(current);
	clearRange(range);
	insertIntoRange(range, instance.rootNodes);
	return { instance, kind: 'template' };
}

function replaceMountedRangeWithText(
	range: ChildRange,
	current: MountedRangeContent,
	textNode: Text,
): MountedRangeContent {
	disposeMountedRangeContent(current);
	clearRange(range);
	insertIntoRange(range, [textNode]);
	return { kind: 'text', node: textNode };
}

function replaceMountedRangeWithNodes(
	range: ChildRange,
	current: MountedRangeContent,
	nodes: readonly Node[],
): MountedRangeContent {
	disposeMountedRangeContent(current);
	clearRange(range);
	insertIntoRange(range, nodes);
	return { kind: 'nodes', nodes };
}

/**
 * @remarks Keeps the longest run of existing rows that are already in order and moves only the others, so swapping
 * two rows moves two ranges rather than every row between them. The previous order is read from the DOM between the
 * markers, so the state needs no extra field. Walks the children from last to first, placing each record before the
 * one that follows it; a new record is created at that insertion point, so creating or appending rows moves no nodes.
 * A key that appears twice is rendered once, at its first position.
 */
function updateKeyedChildren(
	range: ChildRange,
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
		clearRange(range);
	}

	const nextKeys = new Set<JsxKey>();
	const uniqueChildren: KeyedJsxValue[] = [];

	for (const child of children) {
		if (child && !nextKeys.has(child.key)) {
			nextKeys.add(child.key);
			uniqueChildren.push(child);
		}
	}

	if (keyedState.records.size > 0 && !keepsAnyRecord(keyedState.records, nextKeys)) {
		for (const record of keyedState.records.values()) disposeMountedRangeContent(record.mounted);
		keyedState.records.clear();
		clearRange(range);
	}

	const previousIndices = readKeyedOrder(range, keyedState.records);
	const keep = markLongestIncreasingRun(uniqueChildren.map((child) => previousIndices.get(child.key) ?? -1));
	const parent = getRangeParent(range);
	let insertionPoint: ChildNode | null = range.end;

	if (!parent) {
		return keyedState;
	}

	for (let index = uniqueChildren.length - 1; index >= 0; index -= 1) {
		const child = uniqueChildren[index]!;
		let record = keyedState.records.get(child.key);

		if (!record) {
			record = createRangeRecord(parent, insertionPoint);
			keyedState.records.set(child.key, record);
		} else if (!keep[index]) {
			moveRangeBefore(record.start, record.end, insertionPoint, parent);
		}

		updateKeyedRecord(record, child.value, rootTarget, deferredProperties);
		insertionPoint = record.start;
	}

	for (const [key, record] of [...keyedState.records]) {
		if (nextKeys.has(key)) {
			continue;
		}

		disposeMountedRangeContent(record.mounted);
		clearRange(record);
		record.start.remove();
		record.end.remove();
		keyedState.records.delete(key);
	}

	return keyedState;
}

/**
 * @remarks A record that receives the same value object it rendered last is left alone: a template result does not
 * change after creation, so rendering it again would change nothing. A new object with equal values is applied in
 * full, which re-applies property bindings and keeps controlled inputs in sync.
 */
function updateKeyedRecord(
	record: MountedRangeRecord,
	value: unknown,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): void {
	if (record.value === value && value !== undefined) return;
	record.mounted = updateRangeContent(record, value, record.mounted, rootTarget, deferredProperties);
	record.value = value;
}

/**
 * @remarks When no record survives, as on a clear or a full replace, the caller empties the whole range at once
 * rather than removing each record and its markers.
 */
function keepsAnyRecord(records: ReadonlyMap<JsxKey, MountedRangeRecord>, nextKeys: ReadonlySet<JsxKey>): boolean {
	for (const key of records.keys()) {
		if (nextKeys.has(key)) return true;
	}
	return false;
}

/** Maps each key to its record's current position within `range`. */
function readKeyedOrder(range: ChildRange, records: ReadonlyMap<JsxKey, MountedRangeRecord>): Map<JsxKey, number> {
	const indices = new Map<JsxKey, number>();

	if (records.size === 0) {
		return indices;
	}

	const keysByStart = new Map<Node, JsxKey>();
	for (const [key, record] of records) keysByStart.set(record.start, key);

	let position = 0;
	for (let node = getRangeFirstNode(range); node && node !== range.end; node = node.nextSibling) {
		const key = keysByStart.get(node);
		if (key !== undefined) indices.set(key, position++);
	}

	return indices;
}

/**
 * Marks the positions of one longest strictly increasing run of `values`, skipping negative entries.
 *
 * @remarks Patience sorting with back-pointers, `O(n log n)`. An already sorted input marks every non-negative entry.
 */
function markLongestIncreasingRun(values: readonly number[]): boolean[] {
	const keep = new Array<boolean>(values.length).fill(false);
	const tails: number[] = [];
	const previous = new Array<number>(values.length).fill(-1);

	for (let index = 0; index < values.length; index += 1) {
		const value = values[index]!;

		if (value < 0) {
			continue;
		}

		let low = 0;
		let high = tails.length;

		while (low < high) {
			const middle = (low + high) >> 1;
			if (values[tails[middle]!]! < value) low = middle + 1;
			else high = middle;
		}

		previous[index] = low > 0 ? tails[low - 1]! : -1;
		tails[low] = index;
	}

	for (let index = tails.length > 0 ? tails[tails.length - 1]! : -1; index >= 0; index = previous[index]!) {
		keep[index] = true;
	}

	return keep;
}

/**
 * Reconciles a list that is not all keyed: unkeyed entries by position, keyed entries by key.
 *
 * @remarks A keyed entry keeps its record whatever unkeyed siblings come and go around it. As in a keyed list, a
 * key that appears twice is rendered once, at its first position. A list with no keyed entry, now or before, takes
 * the positional path, which updates its records in place.
 */
function updateMixedChildren(
	range: ChildRange,
	children: readonly unknown[],
	current: MountedRangeContent,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): MountedMixedList {
	if (current.kind !== 'mixed-list' && current.kind !== 'keyed-list') {
		disposeMountedRangeContent(current);
		clearRange(range);
	}

	const state: MountedMixedList = current.kind === 'mixed-list' ? current : { entries: [], kind: 'mixed-list' };

	if (current.kind === 'keyed-list' || state.keyed || children.some(isKeyedJsxValue)) {
		return updateKeyedMixedChildren(range, children, current, state.entries, rootTarget, deferredProperties);
	}

	const entries = state.entries;
	const parent = getRangeParent(range);
	let insertionPoint: ChildNode | null = range.end;

	if (!parent) {
		return state;
	}

	for (let index = children.length - 1; index >= 0; index -= 1) {
		const record = (entries[index] ??= { record: createRangeRecord(parent, insertionPoint) }).record;
		insertionPoint = updateRecordBefore(
			record,
			children[index],
			insertionPoint,
			parent,
			rootTarget,
			deferredProperties,
		);
	}

	while (entries.length > children.length) {
		removeRangeRecord(entries.pop()!.record);
	}

	return state;
}

function updateKeyedMixedChildren(
	range: ChildRange,
	children: readonly unknown[],
	current: MountedRangeContent,
	previousEntries: MountedMixedListEntry[],
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): MountedMixedList {
	const keyedRecords =
		current.kind === 'keyed-list'
			? current.records
			: new Map(previousEntries.flatMap((entry) => (entry.key === undefined ? [] : [[entry.key, entry.record]])));
	const entries: MountedMixedListEntry[] = [];
	const values: unknown[] = [];
	const usedKeys = new Set<JsxKey>();
	const parent = getRangeParent(range);

	if (!parent) {
		return { entries: [], keyed: false, kind: 'mixed-list' };
	}

	for (const child of children) {
		const key = isKeyedJsxValue(child) ? child.key : undefined;
		let record: MountedRangeRecord | undefined;

		if (key === undefined) {
			const previousEntry = previousEntries[entries.length];
			record = previousEntry?.key === undefined ? previousEntry?.record : undefined;
		} else if (usedKeys.has(key)) {
			continue;
		} else {
			usedKeys.add(key);
			record = keyedRecords.get(key);
		}

		entries.push({ key, record: record ?? createRangeRecord(parent, range.end) });
		values.push(child);
	}

	let insertionPoint: ChildNode | null = range.end;

	for (let index = entries.length - 1; index >= 0; index -= 1) {
		insertionPoint = updateRecordBefore(
			entries[index]!.record,
			values[index],
			insertionPoint,
			parent,
			rootTarget,
			deferredProperties,
		);
	}

	const usedRecords = new Set(entries.map((entry) => entry.record));
	const previousRecords =
		current.kind === 'keyed-list' ? current.records.values() : previousEntries.map((entry) => entry.record);

	for (const record of previousRecords) {
		if (!usedRecords.has(record)) {
			removeRangeRecord(record);
		}
	}

	return { entries, keyed: usedKeys.size > 0, kind: 'mixed-list' };
}

/** Moves `record` before `insertionPoint`, renders `value` into it, and returns its start as the next point. */
function updateRecordBefore(
	record: MountedRangeRecord,
	value: unknown,
	insertionPoint: ChildNode | null,
	parent: ParentNode,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): ChildNode {
	moveRangeBefore(record.start, record.end, insertionPoint, parent);
	record.mounted = updateRangeContent(record, value, record.mounted, rootTarget, deferredProperties);
	return record.start;
}

function removeRangeRecord(record: MountedRangeRecord): void {
	disposeMountedRangeContent(record.mounted);
	clearRange(record);
	record.start.remove();
	record.end.remove();
}

/**
 * Mounts a signal-like child source and keeps the range in sync with it.
 *
 * @remarks Only the source's own content is flushed here, through a local queue per value. It takes no caller queue:
 * whoever created that queue flushes it once the DOM is in place, and flushing it here too re-applied every queued
 * property once per signal child, so a list whose rows each hold one was quadratic.
 */
export function mountReactiveChildSource(
	range: ChildRange,
	source: ReactiveChildSource,
	current: MountedRangeContent,
	rootTarget: HTMLElement,
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
			range,
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

	return mountedSubscription;
}
