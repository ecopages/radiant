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
import type { DeferredPropertyBinding, ReactiveAttributeSource, ReactiveChildSource } from './types.ts';

export {
	isIterableRenderable as isIterableValue,
	isJsxNodeLike,
	isSignalLikeValue,
	isTemplateResultLike,
	resolveReactiveSnapshot,
} from '../types/renderable-guards.ts';

type TemplateMount = (
	template: TemplateResultLike,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	contextParent?: Node | null,
) => { rootNodes: readonly Node[] };

/**
 * Flushes property assignments after the DOM structure for the current pass is stable.
 *
 * Property writes are deferred so custom elements or other property-sensitive
 * nodes see the final DOM shape before receiving their bound values.
 */
export function flushDeferredProperties(bindings: DeferredPropertyBinding[]): void {
	for (const binding of bindings) {
		(binding.element as unknown as Record<string, unknown>)[binding.name] = binding.value;
	}
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

		if (resolvedValue == null || typeof resolvedValue === 'boolean') {
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
 * A single non-keyed child in an otherwise keyed list causes the whole list to be
 * downgraded to indexed mode.
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
 * @param value Value to inspect.
 */
export function getIterableChildren(value: unknown): unknown[] | undefined {
	if (!isIterableRenderable(value)) {
		return undefined;
	}

	return Array.from(value);
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

export function subscribeToReactiveChildSource(
	source: ReactiveChildSource,
	notify: (value: unknown) => void,
): () => void {
	return isSubscribableJsxValue(source) ? source.subscribe((value) => notify(value)) : source.subscribe(notify);
}
