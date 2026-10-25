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
	MountedMixedListEntry,
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

/**
 * @remarks A nested keyed group, which a list keeps nested only while an unkeyed sibling is filled (see `toChildSlot`
 * in the JSX factory), hands its records up: the list's flat keyed items then keep their nodes, and only the group's
 * own boundary markers go.
 */
function migrateMixedListToKeyed(current: MountedMixedList): MountedRangeContent {
	const keyedRecords = new Map<JsxKey, MountedRangeRecord>();

	for (const entry of current.entries) {
		const { mounted } = entry.record;

		if (entry.key !== undefined) {
			keyedRecords.set(entry.key, entry.record);
		} else if (mounted.kind === 'keyed-list') {
			for (const [key, record] of mounted.records) {
				if (keyedRecords.has(key)) {
					removeRangeRecord(record);
				} else {
					keyedRecords.set(key, record);
				}
			}

			entry.record.start.remove();
			entry.record.end.remove();
		} else {
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

/**
 * Reconciles a list that is not all keyed: unkeyed entries by position, keyed entries by key.
 *
 * @remarks A keyed entry keeps its record whatever unkeyed siblings come and go around it. As in a keyed list, a
 * key that appears twice is rendered once, at its first position. A list with no keyed entry, now or before, takes
 * the positional path, which updates its records in place.
 */
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

	const state: MountedMixedList = current.kind === 'mixed-list' ? current : { entries: [], kind: 'mixed-list' };

	if (current.kind === 'keyed-list' || state.keyed || children.some(isKeyedJsxValue)) {
		return updateKeyedMixedChildren(endMarker, children, current, state.entries, rootTarget, deferredProperties);
	}

	const entries = state.entries;
	let insertionPoint: Node = endMarker;

	for (let index = children.length - 1; index >= 0; index -= 1) {
		const record = (entries[index] ??= { record: createRangeRecord(endMarker) }).record;
		insertionPoint = updateRecordBefore(record, children[index], insertionPoint, rootTarget, deferredProperties);
	}

	while (entries.length > children.length) {
		removeRangeRecord(entries.pop()!.record);
	}

	return state;
}

function updateKeyedMixedChildren(
	endMarker: Text,
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
	const lentRecords: MountedRangeRecord[] = [];

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

		if (!record) {
			record = createRangeRecord(endMarker);

			if (key === undefined) {
				lentRecords.push(...lendKeyedRecords(record, child, keyedRecords));
			}
		}

		entries.push({ key, record });
		values.push(child);
	}

	let insertionPoint: Node = endMarker;

	for (let index = entries.length - 1; index >= 0; index -= 1) {
		insertionPoint = updateRecordBefore(
			entries[index]!.record,
			values[index],
			insertionPoint,
			rootTarget,
			deferredProperties,
		);
	}

	const usedRecords = new Set([...entries.map((entry) => entry.record), ...lentRecords]);
	const previousRecords =
		current.kind === 'keyed-list' ? current.records.values() : previousEntries.map((entry) => entry.record);

	for (const record of previousRecords) {
		if (!usedRecords.has(record)) {
			removeRangeRecord(record);
		}
	}

	return { entries, keyed: usedKeys.size > 0, kind: 'mixed-list' };
}

/**
 * Gives a new record for a nested keyed group the records its keys had in the list, moved inside it.
 *
 * @remarks A list flattens a keyed group into its own keyed items while every filled item is keyed, and keeps the
 * group nested once an unkeyed sibling is filled (see `toChildSlot` in the JSX factory). Lending the records keeps
 * the group's nodes across that switch. The keys leave `keyedRecords`, so no sibling can take them too.
 */
function lendKeyedRecords(
	record: MountedRangeRecord,
	child: unknown,
	keyedRecords: Map<JsxKey, MountedRangeRecord>,
): MountedRangeRecord[] {
	const groupChildren = getIterableChildren(child);
	const keyedChildren = groupChildren && getKeyedChildren(groupChildren);
	const records = new Map<JsxKey, MountedRangeRecord>();

	for (const { key } of keyedChildren ?? []) {
		const lent = keyedRecords.get(key);

		if (lent) {
			keyedRecords.delete(key);
			records.set(key, lent);
			moveRangeBefore(lent.start, lent.end, record.end);
		}
	}

	if (records.size > 0) {
		record.mounted = { kind: 'keyed-list', records };
	}

	return [...records.values()];
}

/** Moves `record` before `insertionPoint`, renders `value` into it, and returns its start as the next point. */
function updateRecordBefore(
	record: MountedRangeRecord,
	value: unknown,
	insertionPoint: Node,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): Node {
	moveRangeBefore(record.start, record.end, insertionPoint);
	record.mounted = updateRangeContent(
		record.start,
		record.end,
		value,
		record.mounted,
		rootTarget,
		deferredProperties,
	);
	return record.start;
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
