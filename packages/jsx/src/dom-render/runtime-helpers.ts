import {
	isIterableRenderable,
	isJsxNodeLike,
	isKeyedJsxValue,
	isSignalLikeValue,
	isSubscribableJsxValue,
	isTemplateResultLike,
} from '../types/renderable-guards.ts';
import type { KeyedJsxValue, TemplateResultLike } from '../types/index.ts';
import { createNodesFromJsxNodeLike } from './dom-operations.ts';
import { materializeIterableChildren } from '../hydration/iterable-snapshot.ts';
import type {
	DeferredPropertyBinding,
	DeferredRunBinding,
	ReactiveAttributeSource,
	ReactiveChildSource,
} from './types.ts';

export {
	isIterableRenderable,
	isJsxNodeLike,
	isSignalLikeValue,
	isTemplateResultLike,
	resolveReactiveSnapshot,
} from '../types/renderable-guards.ts';
import { isEmptyChild } from '../warnings/dev-warnings.ts';

type TemplateMount = (
	template: TemplateResultLike,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	contextParent?: Node | null,
) => { rootNodes: readonly Node[] };

let activePass: DeferredPropertyBinding[] | undefined;

/**
 * Runs `mount` with the deferred queue of one render or hydrate pass and flushes it once `mount` returns.
 *
 * @param shouldFlush Called with the result; returns `false` to drop the queue, as when hydration fell back to a
 * client render and its nodes were discarded.
 *
 * @remarks Ranges mounted inside `mount` that need a queue of their own join this one through {@link runRangePass},
 * so the whole pass flushes once, after its nodes are in the page. A root pass always starts its own queue, even when
 * it runs inside another pass (a custom element rendering from `connectedCallback`), because its caller expects its
 * refs and properties to be applied when it returns.
 */
export function runRootPass<T>(
	mount: (deferredProperties: DeferredPropertyBinding[]) => T,
	shouldFlush: (result: T) => boolean = () => true,
): T {
	const deferredProperties: DeferredPropertyBinding[] = [];
	const outerPass = activePass;
	let result: T;

	activePass = deferredProperties;

	try {
		result = mount(deferredProperties);
	} finally {
		activePass = outerPass;
	}

	if (shouldFlush(result)) flushDeferredProperties(deferredProperties);
	return result;
}

/**
 * Runs `mount` for a range with the queue of the pass that is already running, or a pass of its own when none is.
 *
 * @remarks A signal child updating on its own, later, has no pass running and flushes by itself.
 */
export function runRangePass<T>(mount: (deferredProperties: DeferredPropertyBinding[]) => T): T {
	return activePass ? mount(activePass) : runRootPass(mount);
}

/**
 * Runs `mount` with `queue` when that queue is the one of the pass that is running, and in a pass of its own otherwise.
 *
 * @remarks A later update of a range may join only the pass that mounted it, whose queue still holds its earlier
 * writes in order. Any other running pass is unrelated and flushes at its own time, so the update flushes by itself.
 */
export function runPassOf<T>(
	queue: DeferredPropertyBinding[],
	mount: (deferredProperties: DeferredPropertyBinding[]) => T,
): T {
	return activePass === queue ? mount(queue) : runRootPass(mount);
}

/**
 * Flushes property assignments and `run` entries (`ref` attaches) after the DOM structure for the current pass is stable.
 *
 * Property writes are deferred so custom elements or other property-sensitive
 * nodes see the final DOM shape before receiving their bound values.
 *
 * @remarks
 * Every property write comes first, in queue order, so a `ref` sees its node with all bound properties set.
 * `ref` attaches then run child before parent, siblings in document order, as in React 19: when a parent's callback
 * runs, every ref in its subtree is attached. The queue is not always in document order, since keyed and mixed
 * lists update last to first, so the attaches are sorted by document position and a stack of open ancestors turns
 * that order into the post-order. `contains` does not cross a shadow root, so a `ref` inside a shadow tree attaches after its
 * host; a shadow tree is rendered by its own root, with its own flush.
 */
export function flushDeferredProperties(bindings: DeferredPropertyBinding[]): void {
	let attaches: DeferredRunBinding[] | undefined;

	for (const binding of bindings) {
		if ('run' in binding) (attaches ??= []).push(binding);
		else Reflect.set(binding.element, binding.name, binding.value);
	}

	if (!attaches) return;

	attaches.sort((a, b) => (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

	const open: DeferredRunBinding[] = [];

	const closeAncestors = (element?: Element): void => {
		for (let top = open.at(-1); top && !top.element.contains(element ?? null); top = open.at(-1)) {
			open.pop();
			top.run();
		}
	};

	for (const attach of attaches) {
		closeAncestors(attach.element);
		open.push(attach);
	}

	closeAncestors();
}

/** Removes keyed-child wrapper metadata so downstream logic can work with the raw child value. */
export function unwrapKeyedValue(value: unknown): unknown {
	return isKeyedJsxValue(value) ? value.value : value;
}

/**
 * Materializes an arbitrary JSX child value into concrete DOM nodes.
 *
 * This is the escape hatch used when the renderer cannot update in place or
 * when it needs an exact node-count estimate for hydration planning.
 *
 * Recursive work is collected into a single local array so iterable children
 * and reactive unwraps do not allocate intermediate `Node[]` instances.
 *
 * @param value JSX value to materialize.
 * @param rootTarget Nearest mounted root element, used as event delegation root.
 * @param deferredProperties Accumulator for property assignments to flush after the DOM is stable.
 * @param mountTemplate Factory that mounts a {@link TemplateResultLike} and returns its root nodes.
 * @param contextParent Optional parent node for template context; defaults to `rootTarget`.
 * @returns Flat array of materialized DOM nodes.
 */
export function createNodesFromValue(
	value: unknown,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	mountTemplate: TemplateMount,
	contextParent: Node | null = rootTarget,
): Node[] {
	const nodes: Node[] = [];

	const collectNodes = (nextValue: unknown): void => {
		const resolvedValue = unwrapKeyedValue(nextValue);

		if (isEmptyChild(resolvedValue)) {
			return;
		}

		if (isSubscribableJsxValue(resolvedValue)) {
			collectNodes(resolvedValue.getValue());
			return;
		}

		if (isTemplateResultLike(resolvedValue)) {
			const rootNodes = mountTemplate(resolvedValue, rootTarget, deferredProperties, contextParent).rootNodes;

			for (let index = 0; index < rootNodes.length; index += 1) {
				const node = rootNodes[index];

				if (node) {
					nodes.push(node);
				}
			}

			return;
		}

		if (resolvedValue instanceof Node) {
			nodes.push(resolvedValue);
			return;
		}

		// Real DOM nodes are caught above and reused as-is. This branch only ever
		// sees the framework's synthetic markup stand-ins (e.g. `createMarkupNodeLike`),
		// which share the `nodeType`/`outerHTML` shape but aren't real `Node` instances —
		// those must be parsed into fresh nodes since they carry no live identity to preserve.
		if (isJsxNodeLike(resolvedValue)) {
			const childNodes = createNodesFromJsxNodeLike(resolvedValue);

			for (let index = 0; index < childNodes.length; index += 1) {
				const childNode = childNodes[index];

				if (childNode) {
					nodes.push(childNode);
				}
			}

			return;
		}

		if (isIterableRenderable(resolvedValue)) {
			for (const child of resolvedValue) {
				collectNodes(child);
			}

			return;
		}

		nodes.push(document.createTextNode(String(resolvedValue)));
	};

	collectNodes(value);
	return nodes;
}

/**
 * Returns `true` when `value` can be rendered as a single DOM text node.
 *
 * Primitive types that have a meaningful string representation qualify;
 * `false` intentionally does NOT qualify — it renders as nothing, not the
 * string `"false"`. `true` is excluded because JSX child semantics treat it as
 * an empty render, matching the SSR serializer.
 *
 * @param value Value to test.
 */
export function canRenderAsTextNode(value: unknown): value is bigint | boolean | number | string {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint';
}

/**
 * Returns the value as an array of {@link KeyedJsxValue} entries when every element of
 * an iterable carries a key, otherwise returns `undefined`.
 *
 * A single non-keyed child in an otherwise keyed list uses mixed reconciliation,
 * which keeps keyed entries matched by key while positional entries stay in place.
 *
 * @param children Materialized iterable children to inspect.
 */
export function getKeyedChildren(children: readonly unknown[]): KeyedJsxValue[] | undefined {
	const keyedChildren: KeyedJsxValue[] = [];

	for (const child of children) {
		if (!isKeyedJsxValue(child)) {
			return undefined;
		}

		keyedChildren.push(child);
	}

	return keyedChildren;
}

/**
 * Returns the value materialised as a plain array when it is an iterable,
 * otherwise returns `undefined`.
 *
 * @remarks Callers that only need to know whether a value is iterable must use
 * {@link isIterableRenderable}. One-shot iterators are snapshotted by
 * {@link materializeIterableChildren} for the lifetime of that iterator object.
 *
 * @param value Value to inspect.
 */
export function getIterableChildren(value: unknown): unknown[] | undefined {
	if (!isIterableRenderable(value)) {
		return undefined;
	}

	return materializeIterableChildren(value);
}

export function isReactiveAttributeSource(value: unknown): value is ReactiveAttributeSource {
	return isReactiveChildSource(value);
}

export function isReactiveChildSource(value: unknown): value is ReactiveChildSource {
	return isSubscribableJsxValue(value) || isSignalLikeValue(value);
}

export function readReactiveChildSourceValue(source: ReactiveChildSource): unknown {
	return isSubscribableJsxValue(source) ? source.getValue() : source.get();
}

type RootSubscription = {
	readonly source: ReactiveChildSource;
	readonly notify: (value: unknown) => void;
	/** The value the binding showed when its root paused, kept until it resumes. */
	delivered?: unknown;
	release?: () => void;
};

/** The subscriptions of the bindings mounted into a target, and whether {@link pauseSubscriptions} paused them. */
type RootSubscriptions = { paused: boolean; subscriptions: Set<RootSubscription> };

const ROOT_SUBSCRIPTIONS = new WeakMap<HTMLElement, RootSubscriptions>();

function rootSubscriptionsOf(rootTarget: HTMLElement): RootSubscriptions {
	let root = ROOT_SUBSCRIPTIONS.get(rootTarget);

	if (!root) {
		root = { paused: false, subscriptions: new Set() };
		ROOT_SUBSCRIPTIONS.set(rootTarget, root);
	}

	return root;
}

function openSubscription(subscription: RootSubscription): void {
	const { notify, source } = subscription;
	subscription.release = isSubscribableJsxValue(source)
		? source.subscribe((value) => notify(value))
		: source.subscribe(notify);
}

/**
 * Subscribes a binding mounted into `rootTarget` to its source, unless {@link pauseSubscriptions} paused that target.
 *
 * @returns Releases the subscription and forgets it.
 */
export function subscribeToReactiveChildSource(
	source: ReactiveChildSource,
	notify: (value: unknown) => void,
	rootTarget: HTMLElement,
): () => void {
	const root = rootSubscriptionsOf(rootTarget);
	const subscription: RootSubscription = { notify, source };
	root.subscriptions.add(subscription);

	if (!root.paused) {
		openSubscription(subscription);
	}

	return () => {
		root.subscriptions.delete(subscription);
		const release = subscription.release;
		subscription.release = undefined;
		release?.();
	};
}

/**
 * Releases the source subscriptions of every binding mounted into `target`, and keeps the bindings.
 *
 * @remarks For a host that leaves the document: a signal or binding its view reads, such as a module-level store,
 * no longer holds the detached tree or patches it. {@link resumeSubscriptions} subscribes them again.
 */
export function pauseSubscriptions(target: HTMLElement): void {
	const root = ROOT_SUBSCRIPTIONS.get(target);

	if (!root || root.paused) {
		return;
	}

	root.paused = true;

	for (const subscription of root.subscriptions) {
		const release = subscription.release;

		if (release) {
			subscription.delivered = readReactiveChildSourceValue(subscription.source);
			subscription.release = undefined;
			release();
		}
	}
}

/**
 * Subscribes the bindings {@link pauseSubscriptions} paused again, and applies the value of each one whose source
 * changed meanwhile.
 *
 * @remarks An applied value can replace part of the tree: a binding that it removes is skipped, and one that it
 * mounts subscribes as it mounts.
 */
export function resumeSubscriptions(target: HTMLElement): void {
	const root = ROOT_SUBSCRIPTIONS.get(target);

	if (!root?.paused) {
		return;
	}

	root.paused = false;

	for (const subscription of [...root.subscriptions]) {
		if (root.paused || subscription.release || !root.subscriptions.has(subscription)) {
			continue;
		}

		openSubscription(subscription);
		const value = readReactiveChildSourceValue(subscription.source);
		const delivered = subscription.delivered;
		subscription.delivered = undefined;

		if (!Object.is(value, delivered)) {
			subscription.notify(value);
		}
	}
}
