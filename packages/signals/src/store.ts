import { State } from './state';
import { peek } from './tracking';
import type { SignalStore } from './types';

const STORE_BRANCH_SYMBOL = Symbol.for('@ecopages/signals.store-branch');
const STORE_ABSENT = Symbol.for('@ecopages/signals.store-absent');

type StoreBranch = {
	readonly [STORE_BRANCH_SYMBOL]: true;
	readonly node: StoreNode<any>;
};

type StoreEntryValue = StoreBranch | typeof STORE_ABSENT | unknown;

type StoreNode<Value extends object> = {
	entries: Map<PropertyKey, State<StoreEntryValue>>;
	proxy: Value;
	shape: State<number>;
	target: Value;
	valueType: 'array' | 'object';
};

const storeNodeLookup = new WeakMap<object, StoreNode<object>>();
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Returns `true` when `value` is a deep reactive store created by this package.
 *
 * This is useful for adapters that need to accept either plain objects or
 * signal-backed store proxies.
 */
export function isStore(value: unknown): value is SignalStore<object> {
	return typeof value === 'object' && value !== null && storeNodeLookup.has(value);
}

/**
 * Creates a deep reactive store backed by nested state signals.
 *
 * Plain object and array branches are wrapped recursively so property reads,
 * keyed access, and structural changes can participate in dependency tracking.
 */
export function createStore<Value extends object>(initialValue: Value): SignalStore<Value> {
	return createStoreNode(initialValue).proxy;
}

/**
 * Materializes the current plain snapshot of a signal store or nested store
 * value.
 *
 * The returned value is detached from the reactive proxy graph, making it safe
 * to serialize or compare outside the live store.
 */
export function snapshot<Value>(value: Value): Value {
	if (isStore(value)) {
		return snapshotStoreNode(getStoreNode(value)) as Value;
	}

	return snapshotNestedValue(value);
}

function createStoreBranch(value: object): StoreBranch {
	return {
		[STORE_BRANCH_SYMBOL]: true,
		node: createStoreNode(value),
	};
}

function createStoreEntryValue(value: unknown): StoreEntryValue {
	const normalizedValue = isStore(value) ? snapshot(value) : value;

	if (isStoreBranchValue(normalizedValue)) {
		return createStoreBranch(normalizedValue);
	}

	return normalizedValue;
}

function createStoreNode<Value extends object>(initialValue: Value): StoreNode<Value> {
	const valueType = Array.isArray(initialValue) ? 'array' : 'object';
	const target = (valueType === 'array' ? [] : {}) as Value;
	const node: StoreNode<Value> = {
		entries: new Map(),
		proxy: undefined as unknown as Value,
		shape: new State(0),
		target,
		valueType,
	};

	for (const key of Reflect.ownKeys(initialValue)) {
		const entry = new State<StoreEntryValue>(
			createStoreEntryValue((initialValue as Record<PropertyKey, unknown>)[key]),
		);
		node.entries.set(key, entry);
		Reflect.set(target as object, key, unwrapStoreEntryValue(peek(entry)));
	}

	if (Array.isArray(initialValue)) {
		(target as unknown as any[]).length = initialValue.length;
	}

	node.proxy = new Proxy(target, createStoreProxyHandler(node));
	storeNodeLookup.set(node.proxy as object, node as StoreNode<object>);
	return node;
}

function createStoreProxyHandler<Value extends object>(node: StoreNode<Value>): ProxyHandler<Value> {
	return {
		defineProperty(target, key, descriptor) {
			if ('value' in descriptor) {
				return applyStoreSet(node, key, descriptor.value);
			}

			const result = Reflect.defineProperty(target, key, descriptor);

			if (result) {
				node.shape.update((value) => value + 1);
			}

			return result;
		},

		deleteProperty(_target, key) {
			return deleteStoreProperty(node, key);
		},

		get(target, key, receiver) {
			if (node.valueType === 'array' && key === 'length') {
				node.shape.get();
				return Reflect.get(target, key, receiver);
			}

			if (hasOwnProperty.call(target, key)) {
				const entry = ensureStoreEntry(node, key);
				const value = entry.get();

				if (value === STORE_ABSENT) {
					return undefined;
				}

				return unwrapStoreEntryValue(value);
			}

			return Reflect.get(target, key, receiver);
		},

		getOwnPropertyDescriptor(target, key) {
			node.shape.get();
			return Reflect.getOwnPropertyDescriptor(target, key);
		},

		has(target, key) {
			node.shape.get();
			return Reflect.has(target, key);
		},

		ownKeys(target) {
			node.shape.get();
			return Reflect.ownKeys(target);
		},

		set(_target, key, value) {
			return applyStoreSet(node, key, value);
		},
	};
}

function getStoreNode(value: object): StoreNode<object> {
	const node = storeNodeLookup.get(value);

	if (!node) {
		throw new Error('Value is not a signal store.');
	}

	return node;
}

function applyStoreSet<Value extends object>(node: StoreNode<Value>, key: PropertyKey, value: unknown): boolean {
	if (node.valueType === 'array' && key === 'length') {
		return setStoreArrayLength(node as StoreNode<any[]>, value);
	}

	const entry = ensureStoreEntry(node, key);
	const hadOwn = hasOwnProperty.call(node.target, key);
	const previousLength = node.valueType === 'array' ? (node.target as unknown as any[]).length : undefined;
	const nextEntryValue = createStoreEntryValue(value);
	entry.set(nextEntryValue);
	Reflect.set(node.target as object, key, unwrapStoreEntryValue(nextEntryValue));

	if (!hadOwn) {
		node.shape.update((current) => current + 1);
	}

	if (node.valueType === 'array') {
		const nextLength = (node.target as unknown as any[]).length;

		if (previousLength !== nextLength) {
			node.shape.update((current) => current + 1);
		}
	}

	return true;
}

function deleteStoreProperty<Value extends object>(node: StoreNode<Value>, key: PropertyKey): boolean {
	if (!hasOwnProperty.call(node.target, key)) {
		return true;
	}

	const entry = ensureStoreEntry(node, key);
	entry.set(STORE_ABSENT);
	Reflect.deleteProperty(node.target as object, key);
	if (node.valueType === 'array' && key === 'length') {
		(node.target as unknown as any[]).length = 0;
	}
	node.shape.update((current) => current + 1);
	return true;
}

function ensureStoreEntry<Value extends object>(node: StoreNode<Value>, key: PropertyKey): State<StoreEntryValue> {
	let entry = node.entries.get(key);

	if (!entry) {
		entry = new State<StoreEntryValue>(STORE_ABSENT);
		node.entries.set(key, entry);
	}

	return entry;
}

function isStoreBranch(value: unknown): value is StoreBranch {
	return typeof value === 'object' && value !== null && STORE_BRANCH_SYMBOL in value;
}

function isStoreBranchValue(value: unknown): value is object {
	if (value === null || typeof value !== 'object') {
		return false;
	}

	if (Array.isArray(value)) {
		return true;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function setStoreArrayLength(node: StoreNode<any[]>, value: unknown): boolean {
	const nextLength = Number(value);

	if (!Number.isInteger(nextLength) || nextLength < 0) {
		throw new RangeError('Invalid array length.');
	}

	const target = node.target as unknown as any[];
	const previousLength = target.length;

	if (nextLength < previousLength) {
		for (let index = previousLength - 1; index >= nextLength; index -= 1) {
			deleteStoreProperty(node, String(index));
		}
	}

	target.length = nextLength;

	if (previousLength !== nextLength) {
		node.shape.update((current) => current + 1);
	}

	return true;
}

function snapshotNestedValue<Value>(value: Value): Value {
	if (Array.isArray(value)) {
		return value.map((item) => snapshotNestedValue(item)) as Value;
	}

	if (isStore(value)) {
		return snapshot(value);
	}

	if (isStoreBranchValue(value)) {
		const result: Record<PropertyKey, unknown> = {};

		for (const key of Reflect.ownKeys(value)) {
			result[key] = snapshotNestedValue((value as Record<PropertyKey, unknown>)[key]);
		}

		return result as Value;
	}

	return value;
}

function snapshotStoreNode<Value extends object>(node: StoreNode<Value>): Value {
	const result = (node.valueType === 'array' ? [] : {}) as Value;

	for (const key of Reflect.ownKeys(node.target)) {
		const entry = ensureStoreEntry(node, key);
		const value = peek(entry);

		if (value === STORE_ABSENT) {
			continue;
		}

		Reflect.set(result as object, key, snapshotNestedValue(unwrapStoreEntryValue(value)));
	}

	if (node.valueType === 'array') {
		(result as unknown as any[]).length = (node.target as unknown as any[]).length;
	}

	return result;
}

function unwrapStoreEntryValue(value: StoreEntryValue): unknown {
	if (value === STORE_ABSENT) {
		return undefined;
	}

	if (isStoreBranch(value)) {
		return value.node.proxy;
	}

	return value;
}
