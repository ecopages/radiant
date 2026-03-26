import {
	isKeyedJsxValue,
	isSubscribableJsxValue,
	type JsxKey,
	type JsxNodeLike,
	type JsxRenderable,
	type KeyedJsxValue,
	type SubscribableJsxValue,
	type TemplateResultLike,
} from './jsx-runtime.ts';
import {
	ATTRIBUTE_BINDING_PREFIX,
	type BindingKind,
	collectHydrationBindings,
	getTemplateInterpolationParts,
	parseBindingDescriptor,
} from './hydration-bindings.ts';

/** Comment marker prefix that denotes the start of a dynamic child range in a compiled template blueprint. */
const CHILD_BINDING_START_PREFIX = 'radiant-jsx-child-start:';
/** Comment marker prefix that denotes the end of a dynamic child range in a compiled template blueprint. */
const CHILD_BINDING_END_PREFIX = 'radiant-jsx-child-end:';
/**
 * Per-root render state used to decide whether a subsequent render can update
 * an existing template instance in place or must dispose and remount.
 */
const ROOT_RENDER_STATE = new WeakMap<HTMLElement, MountedRoot>();
/**
 * Template cache keyed by the static string shape.
 *
 * The cache stores the parsed blueprint and part metadata so repeated renders
 * of the same template shape only need to clone and bind live nodes.
 */
const TEMPLATE_CACHE = new WeakMap<readonly string[], CompiledTemplate>();
/**
 * Secondary template cache keyed by a deterministic string derived from the static string shapes.
 *
 * This cache bridges the object-identity gap that occurs when the same logical template is
 * re-evaluated after a hot-module reload, allowing the blueprint to be reused across
 * module boundary resets where `TemplateStringsArray` identity would otherwise be lost.
 */
const TEMPLATE_CACHE_BY_KEY = new Map<string, CompiledTemplate>();

/**
 * Discriminated union that describes the kind and name of a single dynamic binding
 * inside a compiled template.
 *
 * - `{ kind: 'child' }` — a dynamic child slot with no associated name.
 * - `{ kind: BindingKind; name: string }` — an attribute-style binding with a
 *   specific kind (attr / bool / event / prop) and the resolved attribute name.
 */
type BindingDescriptor =
	| { kind: 'child' }
	| {
			kind: BindingKind;
			name: string;
	  };

/**
 * A property assignment that has been deferred until the DOM structure for the
 * current render pass is fully stable.
 *
 * Property writes are collected here rather than applied immediately so that
 * custom elements see their final DOM shape (including children) before
 * receiving bound property values.
 */
type DeferredPropertyBinding = {
	element: Element;
	name: string;
	value: unknown;
};

/**
 * Static metadata for a dynamic attribute binding inside a compiled template blueprint.
 *
 * Stores the binding descriptor, value index, original marker attribute name, and the
 * child-index path from the fragment root to the host element so the part can be resolved
 * in both freshly cloned fragments and existing SSR DOM.
 */
type AttributeTemplatePart = {
	binding: Exclude<BindingDescriptor, { kind: 'child' }>;
	index: number;
	markerName: string;
	path: number[];
	type: 'attribute';
};

/**
 * Static metadata for a dynamic child slot inside a compiled template blueprint.
 *
 * Stores the child-index paths to both the start and end comment markers as well as the
 * value index, allowing the renderer to locate and rewire the boundary markers in any tree
 * that shares the same structural shape as the blueprint.
 */
type ChildTemplatePart = {
	endPath: number[];
	index: number;
	startPath: number[];
	type: 'child';
};

/** Union of all static template part descriptors produced during compilation. */
type TemplatePart = AttributeTemplatePart | ChildTemplatePart;

/**
 * Runtime state for a dynamic attribute binding attached to a live DOM element.
 *
 * Caches the previous value so identity-stable updates (events, properties) can skip
 * redundant work and so attribute strings are only written to the DOM when they differ.
 */
type LiveAttributePart = {
	binding: Exclude<BindingDescriptor, { kind: 'child' }>;
	element: Element;
	index: number;
	previousValue?: unknown;
	type: 'attribute';
};

/**
 * Runtime state for a dynamic child slot bounded by two empty text nodes.
 *
 * The `startMarker` and `endMarker` text nodes delimit the exclusive range owned by this
 * part. `mounted` tracks the structural shape of the current content so subsequent updates
 * can reconcile in place rather than replacing the whole range.
 */
type LiveChildPart = {
	endMarker: Text;
	index: number;
	mounted: MountedRangeContent;
	startMarker: Text;
	type: 'child';
};

/** Union of all live template part state records attached to a mounted template instance. */
type LiveTemplatePart = LiveAttributePart | LiveChildPart;

/** Static template blueprint plus path-based metadata for every dynamic part. */
type CompiledTemplate = {
	blueprint: HTMLTemplateElement;
	parts: readonly TemplatePart[];
};

/**
 * Live cloned template state attached to a mounted DOM subtree.
 *
 * A template instance mirrors the compiled part metadata with concrete DOM
 * references so future updates can patch only the affected attributes or child
 * ranges.
 */
type TemplateInstance = {
	compiled: CompiledTemplate;
	parts: readonly LiveTemplatePart[];
	rootNodes: readonly Node[];
	update: (values: readonly unknown[], deferredProperties: DeferredPropertyBinding[]) => void;
};

/** Mounted state for a child range that currently contains no DOM nodes. */
type MountedEmpty = {
	kind: 'empty';
};

/**
 * Mounted state for a child range that contains an arbitrary flat list of DOM nodes.
 *
 * Used as the fallback when content cannot be tracked as a template, text node, or list.
 */
type MountedNodes = {
	kind: 'nodes';
	nodes: readonly Node[];
};

/**
 * Mounted state for a child range that contains exactly one text node.
 *
 * Kept as a dedicated variant so primitive text updates can mutate `node.data`
 * directly instead of replacing DOM nodes.
 */
type MountedText = {
	kind: 'text';
	node: Text;
};

/**
 * A self-contained range record that owns a slice of the DOM between two boundary text
 * nodes for use inside keyed and indexed list representations.
 */
type MountedRangeRecord = {
	end: Text;
	mounted: MountedRangeContent;
	start: Text;
};

/**
 * Mounted state for a child range that contains an ordered, position-stable list of
 * sub-ranges.
 *
 * Positions are reconciled by index, so DOM ownership tracks slot position rather than
 * child identity. Extra records are removed when the list shrinks.
 */
type MountedIndexedList = {
	kind: 'indexed-list';
	records: MountedRangeRecord[];
};

/**
 * Mounted state for a child range that contains a keyed list of sub-ranges.
 *
 * Each entry in `records` is owned by the child that produced a matching key.
 * When the key order changes the renderer moves existing records without
 * destroying their internal state, preserving any nested subscriptions or
 * template instances.
 */
type MountedKeyedList = {
	kind: 'keyed-list';
	order: readonly JsxKey[];
	records: Map<JsxKey, MountedRangeRecord>;
};

/**
 * Mounted state for a child range that contains the nodes produced by a single
 * {@link TemplateInstance}.
 *
 * Keeping strong reference to the instance allows follow-up renders to update
 * the existing parts rather than replacing the DOM subtree.
 */
type MountedTemplate = {
	instance: TemplateInstance;
	kind: 'template';
};

/**
 * Mounted state for a child range driven by a {@link SubscribableJsxValue}.
 *
 * The `unsubscribe` callback is invoked when the subscription source is replaced or the
 * range is torn down. `mounted` holds the structural shape of the current child content
 * emitted by the subscription so range updates can reconcile efficiently.
 */
type MountedSubscription = {
	kind: 'subscription';
	mounted: MountedRangeContent;
	source: SubscribableJsxValue;
	unsubscribe: () => void;
};

/**
 * Mounted representation for the content inside a dynamic child range.
 *
 * The renderer tracks ranges structurally instead of only keeping raw nodes so
 * it can reconcile templates, keyed lists, indexed lists, text nodes, and
 * subscribable values using the same update entrypoint.
 */
type MountedRangeContent =
	| MountedEmpty
	| MountedIndexedList
	| MountedKeyedList
	| MountedNodes
	| MountedSubscription
	| MountedTemplate
	| MountedText;

/** Mounted representation for the current render root. */
type MountedRoot =
	| {
			instance: TemplateInstance;
			kind: 'template';
	  }
	| {
			kind: 'value';
	  };

/**
 * Selection and active-element snapshot captured before render work that might
 * replace DOM nodes.
 */
type FocusSnapshot = {
	path: number[];
	selectionStart?: number | null;
	selectionEnd?: number | null;
	selectionDirection?: 'backward' | 'forward' | 'none' | null;
};

/**
 * Structural duck-type accepted by path-resolution helpers.
 *
 * Both real DOM `Node` instances and lightweight SSR root shims expose a
 * `childNodes` collection, so helpers that only need to walk child-index paths
 * can accept either without importing DOM globals.
 */
type NodePathContainer = Node | { childNodes: ArrayLike<Node> };

/**
 * Imperative handle returned by {@link createRoot} for managing a mounted JSX tree.
 *
 * Provides `render`, `hydrate`, and `unmount` methods so application entry-points can
 * drive the renderer without importing the lower-level `render`/`hydrate` functions
 * directly.
 */
export interface JsxRoot {
	render: (element: JsxRenderable) => void;
	hydrate: (element: JsxRenderable) => void;
	unmount: () => void;
}

/**
 * Renders a JSX value into a target element.
 *
 * Template results now keep a live instance when the template shape is stable,
 * allowing repeated renders to patch existing parts instead of replacing the
 * whole subtree.
 */
export function render(element: JsxRenderable, target: HTMLElement): void {
	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const nextValue = unwrapKeyedValue(element);
	const currentRenderState = ROOT_RENDER_STATE.get(target);

	if (isTemplateResultLike(nextValue)) {
		const compiledTemplate = getCompiledTemplate(nextValue);

		if (currentRenderState?.kind === 'template' && currentRenderState.instance.compiled === compiledTemplate) {
			currentRenderState.instance.update(nextValue.values, deferredProperties);
		} else {
			if (currentRenderState) {
				disposeMountedRoot(currentRenderState);
			}

			const instance = createTemplateInstance(nextValue, deferredProperties);
			target.replaceChildren(...instance.rootNodes);
			ROOT_RENDER_STATE.set(target, { instance, kind: 'template' });
		}
	} else {
		if (currentRenderState) {
			disposeMountedRoot(currentRenderState);
		}

		target.replaceChildren(...createNodesFromValue(nextValue, deferredProperties));
		ROOT_RENDER_STATE.set(target, { kind: 'value' });
	}

	flushDeferredProperties(deferredProperties);

	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Hydrates an SSR-rendered JSX subtree by attaching event and property bindings in place.
 */
export function hydrate(element: JsxRenderable, target: HTMLElement): void {
	const currentRenderState = ROOT_RENDER_STATE.get(target);

	if (currentRenderState) {
		disposeMountedRoot(currentRenderState);
	}

	ROOT_RENDER_STATE.delete(target);

	if (!hasHydrationMarkers(target)) {
		render(element, target);
		return;
	}

	const nextValue = unwrapKeyedValue(element);

	if (isTemplateResultLike(nextValue)) {
		const focusSnapshot = captureFocusSnapshot(target);
		const deferredProperties: DeferredPropertyBinding[] = [];
		const instance = hydrateTemplateInstance(nextValue, target, deferredProperties);

		if (!instance) {
			render(element, target);
			return;
		}

		ROOT_RENDER_STATE.set(target, { instance, kind: 'template' });
		flushDeferredProperties(deferredProperties);
		restoreFocusSnapshot(target, focusSnapshot);
		return;
	}

	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const bindings = collectHydrationBindings(element);

	for (const hydratedElement of collectElements(target)) {
		const attributes = Array.from(hydratedElement.attributes);

		for (const attribute of attributes) {
			if (!attribute.name.startsWith(ATTRIBUTE_BINDING_PREFIX)) {
				continue;
			}

			const index = Number(attribute.name.slice(ATTRIBUTE_BINDING_PREFIX.length));
			const parsedBinding = parseBindingDescriptor(attribute.value);
			hydratedElement.removeAttribute(attribute.name);

			if (!parsedBinding) {
				continue;
			}

			const binding = bindings.get(index);

			if (!binding) {
				continue;
			}

			applyAttributeBinding(hydratedElement, parsedBinding, binding.value, deferredProperties);
		}
	}

	flushDeferredProperties(deferredProperties);

	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Returns `true` when `target` contains at least one element with a hydration-binding
 * attribute marker.
 *
 * Used by {@link hydrate} to decide whether the DOM was produced by an SSR pass that
 * embedded binding descriptors, or whether a full client render is needed instead.
 *
 * @param target Root element to inspect.
 */
export function hasHydrationMarkers(target: HTMLElement): boolean {
	for (const element of collectElements(target)) {
		for (const attribute of Array.from(element.attributes)) {
			if (attribute.name.startsWith(ATTRIBUTE_BINDING_PREFIX)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Creates a small root API for imperative mounting from plain application entrypoints.
 */
export function createRoot(target: HTMLElement): JsxRoot {
	return {
		render(element: JsxRenderable) {
			render(element, target);
		},
		hydrate(element: JsxRenderable) {
			hydrate(element, target);
		},
		unmount() {
			const currentRenderState = ROOT_RENDER_STATE.get(target);

			if (currentRenderState) {
				disposeMountedRoot(currentRenderState);
			}

			ROOT_RENDER_STATE.delete(target);
			target.replaceChildren();
		},
	};
}

/**
 * Clones a compiled template blueprint and creates the live part records used
 * for incremental updates after the initial mount.
 */
function createTemplateInstance(
	template: TemplateResultLike,
	deferredProperties: DeferredPropertyBinding[],
): TemplateInstance {
	const compiledTemplate = getCompiledTemplate(template);
	const fragment = compiledTemplate.blueprint.content.cloneNode(true) as DocumentFragment;
	const parts = createLiveTemplateParts(fragment, compiledTemplate.parts);
	const rootNodes = Array.from(fragment.childNodes);

	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootNodes,
		update(values, nextDeferredProperties) {
			for (const part of parts) {
				if (part.type === 'attribute') {
					updateLiveAttributePart(part, values[part.index], nextDeferredProperties);
					continue;
				}

				part.mounted = updateRangeContent(
					part.startMarker,
					part.endMarker,
					values[part.index],
					part.mounted,
					nextDeferredProperties,
				);
			}
		},
	};

	instance.update(template.values, deferredProperties);
	return instance;
}

/**
 * Reconstructs a live template instance around existing SSR DOM.
 *
 * Hydration succeeds only when the DOM shape still matches the compiled
 * blueprint closely enough to recover every dynamic part. Callers fall back to
 * a full client render when any required part cannot be recovered.
 */
function hydrateTemplateInstance(
	template: TemplateResultLike,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): TemplateInstance | undefined {
	const compiledTemplate = getCompiledTemplate(template);
	const childParts = compiledTemplate.parts.filter((part): part is ChildTemplatePart => part.type === 'child');
	const hydratedChildRanges = collectHydratedChildRanges(
		compiledTemplate.blueprint.content,
		childParts,
		template.values,
	);
	const parts = createHydratedLiveTemplateParts(
		target,
		compiledTemplate.blueprint.content,
		compiledTemplate.parts,
		template.values,
		hydratedChildRanges,
	);

	if (parts.length !== compiledTemplate.parts.length) {
		return undefined;
	}

	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootNodes: Array.from(target.childNodes),
		update(values, nextDeferredProperties) {
			for (const part of parts) {
				if (part.type === 'attribute') {
					updateLiveAttributePart(part, values[part.index], nextDeferredProperties);
					continue;
				}

				part.mounted = updateRangeContent(
					part.startMarker,
					part.endMarker,
					values[part.index],
					part.mounted,
					nextDeferredProperties,
				);
			}
		},
	};

	for (const part of parts) {
		if (part.type === 'attribute') {
			updateLiveAttributePart(part, template.values[part.index], deferredProperties);
		}
	}

	return instance;
}

/**
 * Returns the compiled metadata for a template shape, compiling and caching it
 * on first use.
 */
function getCompiledTemplate(template: TemplateResultLike): CompiledTemplate {
	const templateStrings = template.strings as unknown as readonly string[];
	const cachedTemplate = TEMPLATE_CACHE.get(templateStrings);

	if (cachedTemplate) {
		return cachedTemplate;
	}

	const cacheKey = getTemplateCacheKey(template.strings);
	const cachedTemplateByKey = TEMPLATE_CACHE_BY_KEY.get(cacheKey);

	if (cachedTemplateByKey) {
		TEMPLATE_CACHE.set(templateStrings, cachedTemplateByKey);
		return cachedTemplateByKey;
	}

	const htmlParts: string[] = [];
	const bindings = new Map<number, BindingDescriptor>();
	const interpolationParts = getTemplateInterpolationParts(template.strings);

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];

		if (interpolationPart?.type === 'attribute') {
			htmlParts.push(
				interpolationPart.leading,
				interpolationPart.whitespace,
				`${ATTRIBUTE_BINDING_PREFIX}${index}="${interpolationPart.kind}:${interpolationPart.name}"`,
			);
			bindings.set(index, { kind: interpolationPart.kind, name: interpolationPart.name });
			continue;
		}

		htmlParts.push(
			interpolationPart?.string ?? template.strings[index] ?? '',
			`<!--${CHILD_BINDING_START_PREFIX}${index}-->`,
			`<!--${CHILD_BINDING_END_PREFIX}${index}-->`,
		);
		bindings.set(index, { kind: 'child' });
	}

	htmlParts.push(template.strings[template.strings.length - 1] ?? '');

	const blueprint = document.createElement('template');
	blueprint.innerHTML = htmlParts.join('');

	const compiledTemplate = {
		blueprint,
		parts: collectTemplateParts(blueprint.content, bindings),
	};

	TEMPLATE_CACHE.set(templateStrings, compiledTemplate);
	TEMPLATE_CACHE_BY_KEY.set(cacheKey, compiledTemplate);
	return compiledTemplate;
}

/**
 * Derives a stable string cache key from a `TemplateStringsArray`.
 *
 * The key encodes both the length and content of each string segment so two
 * templates that happen to produce equal concatenated HTML but differ in where
 * the interpolation boundaries lie — and therefore have different binding
 * positions — always produce distinct keys.
 *
 * @param strings Static string segments from a template result.
 * @returns A deterministic cache key string.
 */
function getTemplateCacheKey(strings: readonly string[]): string {
	return strings.map((part) => `${part.length}:${part}`).join('|');
}

/**
 * Walks a compiled template blueprint and records where every dynamic
 * attribute and child binding lives relative to the fragment root.
 */
function collectTemplateParts(
	fragment: DocumentFragment,
	bindings: ReadonlyMap<number, BindingDescriptor>,
): TemplatePart[] {
	const parts: TemplatePart[] = [];
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

			if (!binding || binding.kind === 'child') {
				continue;
			}

			parts.push({
				binding,
				index,
				markerName: attribute.name,
				path: getNodePath(fragment, element),
				type: 'attribute',
			});
		}

		currentNode = walker.nextNode();
	}

	const childMarkers = new Map<number, Partial<ChildTemplatePart>>();
	const commentWalker = document.createTreeWalker(fragment, NodeFilter.SHOW_COMMENT);
	let commentNode = commentWalker.nextNode();

	while (commentNode) {
		const comment = commentNode as Comment;

		if (comment.data.startsWith(CHILD_BINDING_START_PREFIX)) {
			const index = Number(comment.data.slice(CHILD_BINDING_START_PREFIX.length));
			const marker = childMarkers.get(index) ?? { index, type: 'child' };
			marker.startPath = getNodePath(fragment, comment);
			childMarkers.set(index, marker);
		}

		if (comment.data.startsWith(CHILD_BINDING_END_PREFIX)) {
			const index = Number(comment.data.slice(CHILD_BINDING_END_PREFIX.length));
			const marker = childMarkers.get(index) ?? { index, type: 'child' };
			marker.endPath = getNodePath(fragment, comment);
			childMarkers.set(index, marker);
		}

		commentNode = commentWalker.nextNode();
	}

	for (const [index, marker] of childMarkers) {
		const binding = bindings.get(index);

		if (binding?.kind !== 'child' || !marker.startPath || !marker.endPath) {
			continue;
		}

		parts.push({
			endPath: marker.endPath,
			index,
			startPath: marker.startPath,
			type: 'child',
		});
	}

	return parts;
}

/**
 * Resolves blueprint part metadata into live DOM references for a freshly
 * cloned fragment.
 */
function createLiveTemplateParts(fragment: DocumentFragment, parts: readonly TemplatePart[]): LiveTemplatePart[] {
	const liveParts: LiveTemplatePart[] = [];

	for (const part of parts) {
		if (part.type === 'attribute') {
			const targetNode = getNodeAtPath(fragment, part.path);

			if (!(targetNode instanceof Element)) {
				continue;
			}

			targetNode.removeAttribute(part.markerName);
			liveParts.push({
				binding: part.binding,
				element: targetNode,
				index: part.index,
				type: 'attribute',
			});
			continue;
		}

		const startNode = getNodeAtPath(fragment, part.startPath);
		const endNode = getNodeAtPath(fragment, part.endPath);

		if (!(startNode instanceof Comment) || !(endNode instanceof Comment)) {
			continue;
		}

		const startMarker = createBoundaryMarker();
		const endMarker = createBoundaryMarker();
		startNode.replaceWith(startMarker);
		endNode.replaceWith(endMarker);

		liveParts.push({
			endMarker,
			index: part.index,
			mounted: { kind: 'empty' },
			startMarker,
			type: 'child',
		});
	}

	return liveParts;
}

/**
 * Resolves blueprint part metadata against already-existing SSR DOM.
 *
 * Child parts are wrapped with boundary markers inserted around the hydrated
 * content so later updates can treat hydrated and freshly mounted ranges the
 * same way.
 */
function createHydratedLiveTemplateParts(
	target: HTMLElement,
	blueprint: DocumentFragment,
	parts: readonly TemplatePart[],
	values: readonly unknown[],
	hydratedChildRanges: ReadonlyMap<number, HydratedChildRange>,
): LiveTemplatePart[] {
	const liveParts = new Map<number, LiveTemplatePart>();
	const childPartEntries = parts
		.map((part, partIndex) => ({ part, partIndex }))
		.filter((entry): entry is { part: ChildTemplatePart; partIndex: number } => entry.part.type === 'child')
		.sort((left, right) => {
			const leftRange = hydratedChildRanges.get(left.part.index);
			const rightRange = hydratedChildRanges.get(right.part.index);

			if (!leftRange || !rightRange) {
				return 0;
			}

			const parentKeyOrder = getPathKey(leftRange.parentPath).localeCompare(getPathKey(rightRange.parentPath));

			if (parentKeyOrder !== 0) {
				return parentKeyOrder;
			}

			return rightRange.actualStartIndex - leftRange.actualStartIndex;
		});

	for (const [partIndex, part] of parts.entries()) {
		if (part.type === 'attribute') {
			const targetNode = getNodeAtPath(target, part.path);

			if (!(targetNode instanceof Element)) {
				continue;
			}

			targetNode.removeAttribute(part.markerName);
			liveParts.set(partIndex, {
				binding: part.binding,
				element: targetNode,
				index: part.index,
				type: 'attribute',
			});
		}
	}

	for (const { part, partIndex } of childPartEntries) {
		const hydratedRange = hydratedChildRanges.get(part.index);

		if (!hydratedRange) {
			continue;
		}

		const parentNode = getNodeAtPath(target, hydratedRange.parentPath);

		if (!parentNode) {
			continue;
		}

		isolateHydratedTextRange(parentNode, blueprint, hydratedRange, values[part.index]);

		const existingNodes = Array.from(parentNode.childNodes).slice(
			hydratedRange.actualStartIndex,
			hydratedRange.actualStartIndex + hydratedRange.nodeCount,
		);
		const startMarker = createBoundaryMarker();
		const endMarker = createBoundaryMarker();

		if (existingNodes.length === 0) {
			const referenceNode = parentNode.childNodes[hydratedRange.actualStartIndex] ?? null;
			if (referenceNode) {
				referenceNode.before(startMarker, endMarker);
			} else {
				parentNode.insertBefore(startMarker, null);
				parentNode.insertBefore(endMarker, null);
			}
		} else {
			existingNodes[0]?.before(startMarker);
			existingNodes[existingNodes.length - 1]?.after(endMarker);
		}

		liveParts.set(partIndex, {
			endMarker,
			index: part.index,
			mounted: hydrateMountedRangeContent(startMarker, endMarker, values[part.index], existingNodes),
			startMarker,
			type: 'child',
		});
	}

	return parts.map((_, index) => liveParts.get(index)).filter((part): part is LiveTemplatePart => part !== undefined);
}

/** Mapping between a compiled child binding and the concrete node slice found in hydrated DOM. */
type HydratedChildRange = {
	actualStartIndex: number;
	blueprintStartIndex: number;
	nodeCount: number;
	parentPath: number[];
};

/**
 * Computes the DOM slice that each child binding should own after SSR.
 *
 * The blueprint still includes synthetic comment markers that do not exist in
 * final HTML, so hydration has to translate blueprint indexes into the actual
 * runtime node indexes produced by the resolved child values.
 */
function collectHydratedChildRanges(
	blueprint: DocumentFragment,
	childParts: readonly ChildTemplatePart[],
	values: readonly unknown[],
): Map<number, HydratedChildRange> {
	const ranges = new Map<number, HydratedChildRange>();
	const childPartsByParent = new Map<string, ChildTemplatePart[]>();

	for (const part of childParts) {
		const parentPath = part.startPath.slice(0, -1);
		const parentKey = getPathKey(parentPath);
		const partsForParent = childPartsByParent.get(parentKey) ?? [];
		partsForParent.push(part);
		childPartsByParent.set(parentKey, partsForParent);
	}

	for (const [parentKey, partsForParent] of childPartsByParent) {
		const parentPath = parentKey === '' ? [] : parentKey.split('.').map((segment) => Number(segment));
		const parentNode = getNodeAtPath(blueprint, parentPath);

		if (!parentNode) {
			continue;
		}

		const partByStartIndex = new Map(
			partsForParent.map((part) => [part.startPath[part.startPath.length - 1] ?? -1, part]),
		);
		let actualIndex = 0;

		for (let blueprintIndex = 0; blueprintIndex < parentNode.childNodes.length; blueprintIndex += 1) {
			const part = partByStartIndex.get(blueprintIndex);

			if (!part) {
				actualIndex += getHydratedNodeContribution(parentNode.childNodes[blueprintIndex]);
				continue;
			}

			const nodeCount = countHydratedRangeNodes(values[part.index]);
			ranges.set(part.index, {
				actualStartIndex: actualIndex,
				blueprintStartIndex: part.startPath[part.startPath.length - 1] ?? 0,
				nodeCount,
				parentPath,
			});
			actualIndex += nodeCount;
			blueprintIndex += 1;
		}
	}

	return ranges;
}

/**
 * Returns the number of real DOM nodes a single blueprint child node contributes
 * to the hydrated tree.
 *
 * Synthetic comment markers written by the compiler (`radiant-jsx-child-*`) are
 * omitted from the final HTML, so they contribute zero nodes. Every other node
 * contributes exactly one.
 *
 * @param node Blueprint child node to evaluate.
 */
function getHydratedNodeContribution(node: Node | undefined): number {
	if (
		node instanceof Comment &&
		(node.data.startsWith(CHILD_BINDING_START_PREFIX) || node.data.startsWith(CHILD_BINDING_END_PREFIX))
	) {
		return 0;
	}

	return node ? 1 : 0;
}

/**
 * Counts the number of real DOM nodes that `value` would produce when mounted.
 *
 * Used during hydration planning to slice the correct portion of the existing
 * DOM for each child binding without actually mounting new nodes.
 *
 * @param value JSX value whose node count should be estimated.
 */
function countHydratedRangeNodes(value: unknown): number {
	return createNodesFromValue(value, []).length;
}

/**
 * Splits merged text nodes around a hydrated child binding when the browser has
 * collapsed adjacent static and dynamic text into a single text node.
 *
 * Without this normalization, later text updates would overwrite surrounding
 * static content that happened to share the same DOM text node after HTML
 * parsing.
 */
function isolateHydratedTextRange(
	parentNode: Node,
	blueprint: DocumentFragment,
	hydratedRange: HydratedChildRange,
	value: unknown,
): void {
	const resolvedValue = resolveHydratedRangeValue(value);

	if (!canRenderAsTextNode(resolvedValue) || hydratedRange.nodeCount !== 1) {
		return;
	}

	if (parentNode.childNodes[hydratedRange.actualStartIndex] instanceof Text) {
		return;
	}

	const blueprintParentNode = getNodeAtPath(blueprint, hydratedRange.parentPath);

	if (!blueprintParentNode) {
		return;
	}

	const prefixNode = blueprintParentNode.childNodes[hydratedRange.blueprintStartIndex - 1];
	const suffixNode = blueprintParentNode.childNodes[hydratedRange.blueprintStartIndex + 2];
	const prefix = prefixNode instanceof Text ? prefixNode.data : '';
	const suffix = suffixNode instanceof Text ? suffixNode.data : '';
	let candidateNode = parentNode.childNodes[hydratedRange.actualStartIndex];

	if (!(candidateNode instanceof Text) && hydratedRange.actualStartIndex > 0) {
		candidateNode = parentNode.childNodes[hydratedRange.actualStartIndex - 1];
	}

	if (!(candidateNode instanceof Text)) {
		return;
	}

	let dynamicNode = candidateNode;

	if (prefix && dynamicNode.data.startsWith(prefix)) {
		dynamicNode = dynamicNode.splitText(prefix.length);
	}

	if (suffix && dynamicNode.data.endsWith(suffix)) {
		dynamicNode.splitText(dynamicNode.data.length - suffix.length);
	}
}

/**
 * Unwraps a JSX value to its concrete leaf for hydration planning purposes.
 *
 * Strips keyed wrappers and resolves subscribable values to their current snapshot
 * so helpers that only need the concrete shape (e.g. node-count estimation) do not
 * need to handle wrapper types explicitly.
 *
 * @param value Raw value from a template's `values` array.
 * @returns The unwrapped concrete value.
 */
function resolveHydratedRangeValue(value: unknown): unknown {
	const nextValue = unwrapKeyedValue(value);
	return isSubscribableJsxValue(nextValue) ? unwrapKeyedValue(nextValue.getValue()) : nextValue;
}

/**
 * Rebuilds mounted range bookkeeping around hydrated nodes.
 *
 * The goal is to preserve SSR DOM identity where possible while still restoring
 * the richer runtime structures needed for subscriptions, grouped children, and
 * nested template updates.
 */
function hydrateMountedRangeContent(
	startMarker: Text,
	endMarker: Text,
	value: unknown,
	existingNodes: readonly Node[],
): MountedRangeContent {
	const nextValue = unwrapKeyedValue(value);

	if (isSubscribableJsxValue(nextValue)) {
		const mountedSubscription: MountedSubscription = {
			kind: 'subscription',
			mounted: hydrateMountedRangeContent(startMarker, endMarker, nextValue.getValue(), existingNodes),
			source: nextValue,
			unsubscribe: () => undefined,
		};

		mountedSubscription.unsubscribe = nextValue.subscribe((nextChildValue) => {
			const nextDeferredProperties: DeferredPropertyBinding[] = [];
			mountedSubscription.mounted = updateRangeContent(
				startMarker,
				endMarker,
				nextChildValue,
				mountedSubscription.mounted,
				nextDeferredProperties,
			);
			flushDeferredProperties(nextDeferredProperties);
		});

		return mountedSubscription;
	}

	if (isTemplateResultLike(nextValue)) {
		const hydratedTemplateInstance = hydrateStaticTemplateRange(nextValue, existingNodes, startMarker, endMarker);

		if (hydratedTemplateInstance) {
			const nextDeferredProperties: DeferredPropertyBinding[] = [];
			hydratedTemplateInstance.update(nextValue.values, nextDeferredProperties);
			flushDeferredProperties(nextDeferredProperties);
			return { instance: hydratedTemplateInstance, kind: 'template' };
		}
	}

	const iterableChildren = getIterableChildren(nextValue);

	if (iterableChildren) {
		const keyedChildren = getKeyedChildren(iterableChildren);

		if (keyedChildren) {
			const hydratedKeyedState = hydrateKeyedRangeContent(endMarker, keyedChildren, existingNodes);

			if (hydratedKeyedState) {
				return hydratedKeyedState;
			}
		}

		const hydratedIndexedState = hydrateIndexedRangeContent(endMarker, iterableChildren, existingNodes);

		if (hydratedIndexedState) {
			return hydratedIndexedState;
		}
	}

	if (isTemplateResultLike(nextValue) || isIterableValue(nextValue)) {
		const nextDeferredProperties: DeferredPropertyBinding[] = [];
		const mounted = updateRangeContent(
			startMarker,
			endMarker,
			nextValue,
			existingNodes.length === 0 ? { kind: 'empty' } : { kind: 'nodes', nodes: existingNodes },
			nextDeferredProperties,
		);
		flushDeferredProperties(nextDeferredProperties);
		return mounted;
	}

	if (nextValue === undefined || nextValue === null || nextValue === false) {
		return { kind: 'empty' };
	}

	if (existingNodes.length === 1 && existingNodes[0] instanceof Text && canRenderAsTextNode(nextValue)) {
		return { kind: 'text', node: existingNodes[0] };
	}

	return existingNodes.length === 0 ? { kind: 'empty' } : { kind: 'nodes', nodes: existingNodes };
}

/**
 * Attempts to reconstruct a {@link TemplateInstance} from an existing SSR node slice
 * that has only attribute parts (no child slots).
 *
 * Attribute-only templates can be hydrated in place because there are no child node
 * boundaries to locate. Returns `undefined` when the template has child parts, causing
 * the caller to fall back to a full re-mount.
 *
 * @param template Template result whose shape to match against existing nodes.
 * @param existingNodes SSR nodes that should correspond to the template root.
 * @param startMarker Boundary start marker already inserted around `existingNodes`.
 * @param endMarker Boundary end marker already inserted around `existingNodes`.
 */
function hydrateStaticTemplateRange(
	template: TemplateResultLike,
	existingNodes: readonly Node[],
	startMarker: Text,
	endMarker: Text,
): TemplateInstance | undefined {
	const compiledTemplate = getCompiledTemplate(template);
	const attributeParts = compiledTemplate.parts.filter(
		(part): part is AttributeTemplatePart => part.type === 'attribute',
	);

	if (attributeParts.length !== compiledTemplate.parts.length) {
		return undefined;
	}

	const templateRoot = createHydratedRangeRoot(existingNodes, startMarker, endMarker);
	const parts: LiveAttributePart[] = [];

	for (const part of attributeParts) {
		const targetNode = getNodeAtPath(templateRoot, part.path);

		if (!(targetNode instanceof Element)) {
			return undefined;
		}

		targetNode.removeAttribute(part.markerName);
		parts.push({
			binding: part.binding,
			element: targetNode,
			index: part.index,
			type: 'attribute',
		});
	}

	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootNodes: existingNodes,
		update(values, deferredProperties) {
			for (const part of parts) {
				updateLiveAttributePart(part, values[part.index], deferredProperties);
			}
		},
	};

	return instance;
}

/**
 * Reconstructs a {@link MountedIndexedList} from an existing SSR node slice.
 *
 * Each child's expected node count is computed and used to slice the existing nodes
 * into per-child groups. Returns `undefined` when the total node count does not match,
 * signalling that a fresh mount is needed.
 *
 * @param endMarker End boundary marker of the parent range.
 * @param children Positional children from the current render pass.
 * @param existingNodes SSR nodes owned by the parent range.
 */
function hydrateIndexedRangeContent(
	endMarker: Text,
	children: readonly unknown[],
	existingNodes: readonly Node[],
): MountedIndexedList | undefined {
	const records: MountedRangeRecord[] = [];
	let nextNodeIndex = 0;

	for (const child of children) {
		const childNodeCount = countHydratedRangeNodes(child);
		const childNodes = existingNodes.slice(nextNodeIndex, nextNodeIndex + childNodeCount);

		if (childNodes.length !== childNodeCount) {
			return undefined;
		}

		const record = createHydratedRangeRecord(
			childNodes,
			existingNodes[nextNodeIndex + childNodeCount] ?? endMarker,
		);
		record.mounted = hydrateMountedRangeContent(record.start, record.end, child, childNodes);
		records.push(record);
		nextNodeIndex += childNodeCount;
	}

	if (nextNodeIndex !== existingNodes.length) {
		return undefined;
	}

	return { kind: 'indexed-list', records };
}

/**
 * Reconstructs a {@link MountedKeyedList} from an existing SSR node slice.
 *
 * Each keyed child's expected node count is used to slice `existingNodes` in order.
 * Returns `undefined` when the total node count does not match the SSR output.
 *
 * @param endMarker End boundary marker of the parent range.
 * @param children Keyed children from the current render pass.
 * @param existingNodes SSR nodes owned by the parent range.
 */
function hydrateKeyedRangeContent(
	endMarker: Text,
	children: readonly KeyedJsxValue[],
	existingNodes: readonly Node[],
): MountedKeyedList | undefined {
	const records = new Map<JsxKey, MountedRangeRecord>();
	const order: JsxKey[] = [];
	let nextNodeIndex = 0;

	for (const child of children) {
		const childNodeCount = countHydratedRangeNodes(child.value);
		const childNodes = existingNodes.slice(nextNodeIndex, nextNodeIndex + childNodeCount);

		if (childNodes.length !== childNodeCount) {
			return undefined;
		}

		const record = createHydratedRangeRecord(
			childNodes,
			existingNodes[nextNodeIndex + childNodeCount] ?? endMarker,
		);
		record.mounted = hydrateMountedRangeContent(record.start, record.end, child.value, childNodes);
		records.set(child.key, record);
		order.push(child.key);
		nextNodeIndex += childNodeCount;
	}

	if (nextNodeIndex !== existingNodes.length) {
		return undefined;
	}

	return { kind: 'keyed-list', order, records };
}

/**
 * Builds a synthetic root object whose `childNodes` spans the nodes between two
 * boundary markers inside their shared parent.
 *
 * Used by {@link hydrateStaticTemplateRange} so path-resolution helpers can walk
 * child-index paths relative to a hydrated range without needing to work from the
 * true document root.
 *
 * @param existingNodes Nodes expected to sit between `startMarker` and `endMarker`.
 * @param startMarker Start boundary marker.
 * @param endMarker End boundary marker.
 */
function createHydratedRangeRoot(
	existingNodes: readonly Node[],
	startMarker: Text,
	endMarker: Text,
): { childNodes: readonly Node[] } {
	if (existingNodes.length === 0) {
		return { childNodes: [] };
	}

	const parentNode = existingNodes[0]?.parentNode;

	if (!parentNode) {
		return { childNodes: [] };
	}

	const childNodes = Array.from(parentNode.childNodes).slice(
		Array.prototype.indexOf.call(parentNode.childNodes, startMarker) + 1,
		Array.prototype.indexOf.call(parentNode.childNodes, endMarker),
	);

	return { childNodes };
}

/**
 * Serializes a child-index path to a dot-separated string for use as a `Map` key.
 *
 * An empty path (fragment root) serializes to `''`.
 *
 * @param path Array of child indices produced by {@link getNodePath}.
 */
function getPathKey(path: readonly number[]): string {
	return path.join('.');
}

/**
 * Applies a single dynamic attribute binding to an already-located live DOM
 * element.
 */
function updateLiveAttributePart(
	part: LiveAttributePart,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
): void {
	switch (part.binding.kind) {
		case 'attr': {
			if (value === undefined || value === null) {
				part.element.removeAttribute(part.binding.name);
				part.previousValue = value;
				return;
			}

			const nextValue = String(value);

			if (part.previousValue !== value || part.element.getAttribute(part.binding.name) !== nextValue) {
				part.element.setAttribute(part.binding.name, nextValue);
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
 * Reconciles the content between two boundary markers against the next child
 * value.
 *
 * This is the main child-part update engine. It handles subscriptions, keyed
 * iterables, indexed iterables, nested template instances, primitive text, and
 * generic node content through a single structural state machine.
 */
function updateRangeContent(
	startMarker: Text,
	endMarker: Text,
	value: unknown,
	current: MountedRangeContent,
	deferredProperties: DeferredPropertyBinding[],
): MountedRangeContent {
	const nextValue = unwrapKeyedValue(value);
	let currentContent = current;

	if (currentContent.kind === 'subscription') {
		if (isSubscribableJsxValue(nextValue) && currentContent.source === nextValue) {
			return currentContent;
		}

		currentContent.unsubscribe();
		currentContent = currentContent.mounted;
	}

	if (isSubscribableJsxValue(nextValue)) {
		return mountSubscribableValue(startMarker, endMarker, nextValue, currentContent, deferredProperties);
	}

	const iterableChildren = getIterableChildren(nextValue);

	if (iterableChildren) {
		const keyedChildren = getKeyedChildren(iterableChildren);

		if (keyedChildren) {
			return updateKeyedChildren(startMarker, endMarker, keyedChildren, currentContent, deferredProperties);
		}

		return updateIndexedChildren(startMarker, endMarker, iterableChildren, currentContent, deferredProperties);
	}

	if (isTemplateResultLike(nextValue)) {
		if (currentContent.kind === 'template' && currentContent.instance.compiled === getCompiledTemplate(nextValue)) {
			currentContent.instance.update(nextValue.values, deferredProperties);
			return currentContent;
		}

		disposeMountedRangeContent(currentContent);
		clearRangeBetween(startMarker, endMarker);
		const instance = createTemplateInstance(nextValue, deferredProperties);
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

	const nodes = createNodesFromValue(nextValue, deferredProperties);
	insertNodesBefore(endMarker, nodes);
	return { kind: 'nodes', nodes };
}

/**
 * Reconciles a child range as an ordered keyed collection, preserving per-key
 * DOM ownership when the order changes.
 */
function updateKeyedChildren(
	startMarker: Text,
	endMarker: Text,
	children: readonly KeyedJsxValue[],
	current: MountedRangeContent,
	deferredProperties: DeferredPropertyBinding[],
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
		record.mounted = updateRangeContent(record.start, record.end, child.value, record.mounted, deferredProperties);
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

/**
 * Reconciles a child range as an ordered non-keyed collection.
 *
 * Positions are stable by index, so DOM ownership follows slot position rather
 * than child identity.
 */
function updateIndexedChildren(
	startMarker: Text,
	endMarker: Text,
	children: readonly unknown[],
	current: MountedRangeContent,
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

/**
 * Mounts a subscribable child source and keeps the enclosed range synced to its
 * latest value.
 */
function mountSubscribableValue(
	startMarker: Text,
	endMarker: Text,
	source: SubscribableJsxValue,
	current: MountedRangeContent,
	deferredProperties: DeferredPropertyBinding[],
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
			nextDeferredProperties,
		);
		flushDeferredProperties(nextDeferredProperties);
	};

	mountedSubscription.unsubscribe = source.subscribe((nextValue) => {
		applyValue(nextValue);
	});

	applyValue(source.getValue());
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
function createHydratedRangeRecord(existingNodes: readonly Node[], referenceNode: Node): MountedRangeRecord {
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

/**
 * Removes all DOM nodes that sit between `startMarker` and `endMarker` (exclusive).
 *
 * The boundary markers themselves are left in place so the range remains bookmarked
 * for future content.
 *
 * @param startMarker Start boundary text node.
 * @param endMarker End boundary text node.
 */
function clearRangeBetween(startMarker: Text, endMarker: Text): void {
	const parentNode = startMarker.parentNode;

	if (parentNode && parentNode === endMarker.parentNode) {
		const range = document.createRange();
		range.setStartAfter(startMarker);
		range.setEndBefore(endMarker);
		range.deleteContents();
		return;
	}

	let currentNode = startMarker.nextSibling;

	while (currentNode && currentNode !== endMarker) {
		const nextNode = currentNode.nextSibling;
		currentNode.remove();
		currentNode = nextNode;
	}
}

/**
 * Inserts `nodes` into the DOM immediately before `referenceNode` using a single
 * `DocumentFragment` so that the insertion triggers at most one layout.
 *
 * No-ops when `nodes` is empty.
 *
 * @param referenceNode Node before which the new nodes are inserted.
 * @param nodes Nodes to insert.
 */
function insertNodesBefore(referenceNode: Node, nodes: readonly Node[]): void {
	if (nodes.length === 0) {
		return;
	}

	const fragment = document.createDocumentFragment();

	for (const node of nodes) {
		fragment.append(node);
	}

	referenceNode.parentNode?.insertBefore(fragment, referenceNode);
}

/**
 * Moves the entire node range `[start, end]` (inclusive) to immediately before
 * `referenceNode` in a single fragment operation.
 *
 * No-ops when `referenceNode` is already `start` or falls within the range, preventing
 * accidental self-moves in the keyed reconciler.
 *
 * @param start Start boundary text node of the range to move.
 * @param end End boundary text node of the range to move.
 * @param referenceNode Target reference node.
 */
function moveRangeBefore(start: Text, end: Text, referenceNode: Node): void {
	if (referenceNode === start || isNodeWithinRange(referenceNode, start, end)) {
		return;
	}

	const nodes: Node[] = [];
	let currentNode: Node | null = start;

	while (currentNode) {
		nodes.push(currentNode);

		if (currentNode === end) {
			break;
		}

		currentNode = currentNode.nextSibling;
	}

	if (nodes.length > 0) {
		const parentNode = referenceNode.parentNode;

		if (!parentNode) {
			return;
		}

		const fragment = document.createDocumentFragment();

		for (const node of nodes) {
			fragment.append(node);
		}

		parentNode.insertBefore(fragment, referenceNode);
	}
}

/**
 * Returns `true` when `target` sits within the sibling range `[start, end]` (inclusive).
 *
 * Used by {@link moveRangeBefore} to guard against moves where the reference node is
 * already inside the range being moved.
 *
 * @param target Node to test.
 * @param start Start boundary of the range.
 * @param end End boundary of the range.
 */
function isNodeWithinRange(target: Node, start: Text, end: Text): boolean {
	let currentNode: Node | null = start;

	while (currentNode) {
		if (currentNode === target) {
			return true;
		}

		if (currentNode === end) {
			return false;
		}

		currentNode = currentNode.nextSibling;
	}

	return false;
}

/**
 * Creates an empty text node used as a lightweight, invisible boundary marker.
 *
 * Empty text nodes are chosen over comment nodes because they have zero visible
 * rendering cost and are easy to distinguish from user-authored content.
 */
function createBoundaryMarker(): Text {
	return document.createTextNode('');
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

/**
 * Flushes property assignments after the DOM structure for the current pass is stable.
 *
 * Property writes are deferred so custom elements or other property-sensitive
 * nodes see the final DOM shape before receiving their bound values.
 */
function flushDeferredProperties(bindings: DeferredPropertyBinding[]): void {
	for (const binding of bindings) {
		(binding.element as unknown as Record<string, unknown>)[binding.name] = binding.value;
	}
}

/**
 * Collects all descendant elements of `target` in document order, stopping at
 * custom-element boundaries.
 *
 * Custom elements (tag names containing a hyphen) are treated as opaque hydration
 * islands: their attributes are harvested but their descendants are skipped, since any
 * inner DOM belongs to the custom element's own shadow or light-DOM lifecycle.
 *
 * @param target Root element to walk.
 * @returns Flat array of elements including `target` itself.
 */
function collectElements(target: HTMLElement): Element[] {
	const elements: Element[] = [];

	const visit = (element: Element, allowDescendIntoChildren: boolean) => {
		elements.push(element);

		if (!allowDescendIntoChildren) {
			return;
		}

		for (const child of Array.from(element.children)) {
			visit(child, !isOpaqueHydrationIsland(child));
		}
	};

	visit(target, true);
	return elements;
}

/**
 * Returns `true` when `element` is a custom element that should be treated as an
 * opaque hydration island.
 *
 * Custom elements manage their own internal DOM; the hydrator should not descend
 * into their children to avoid double-applying bindings.
 *
 * @param element Element to test.
 */
function isOpaqueHydrationIsland(element: Element): boolean {
	return element.tagName.includes('-');
}

/**
 * Materializes an arbitrary JSX child value into concrete DOM nodes.
 *
 * This is the escape hatch used when the renderer cannot update in place or
 * when it needs an exact node-count estimate for hydration planning.
 */
function createNodesFromValue(value: unknown, deferredProperties: DeferredPropertyBinding[]): Node[] {
	const nextValue = unwrapKeyedValue(value);

	if (nextValue === undefined || nextValue === null || nextValue === false || nextValue === true) {
		return [];
	}

	if (isSubscribableJsxValue(nextValue)) {
		return createNodesFromValue(nextValue.getValue(), deferredProperties);
	}

	if (isTemplateResultLike(nextValue)) {
		return [...createTemplateInstance(nextValue, deferredProperties).rootNodes];
	}

	if (isJsxNodeLike(nextValue)) {
		return createNodesFromJsxNodeLike(nextValue);
	}

	if (nextValue instanceof Node) {
		return [nextValue];
	}

	if (isIterableValue(nextValue)) {
		const nodes: Node[] = [];

		for (const child of nextValue) {
			nodes.push(...createNodesFromValue(child, deferredProperties));
		}

		return nodes;
	}

	return [document.createTextNode(String(nextValue))];
}

/**
 * Type guard that narrows `value` to the `EventListenerObject` interface.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is an object with a `handleEvent` method.
 */
function isEventListenerObject(value: unknown): value is EventListenerObject {
	return typeof value === 'object' && value !== null && 'handleEvent' in value;
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
function canRenderAsTextNode(value: unknown): value is bigint | boolean | number | string {
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
function getKeyedChildren(children: readonly unknown[]): KeyedJsxValue[] | undefined {
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
function getIterableChildren(value: unknown): unknown[] | undefined {
	if (!isIterableValue(value)) {
		return undefined;
	}

	return Array.from(value);
}

/**
 * Returns `true` when `value` is a non-string iterable object.
 *
 * Strings are excluded because they are iterable by character but must be
 * treated as atomic text nodes by the renderer.
 *
 * @param value Value to test.
 */
function isIterableValue(value: unknown): value is Iterable<unknown> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

/**
 * Type guard that narrows `value` to {@link TemplateResultLike}.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is a valid Radiant template result.
 */
function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { ['_$rType$']?: unknown })['_$rType$'] === 1 &&
		'strings' in value &&
		'values' in value
	);
}

/**
 * Type guard that narrows `value` to {@link JsxNodeLike}.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is an object with a `nodeType` property.
 */
function isJsxNodeLike(value: unknown): value is JsxNodeLike {
	return typeof value === 'object' && value !== null && 'nodeType' in value;
}

/**
 * Converts a {@link JsxNodeLike} into real DOM nodes.
 *
 * Preference order:
 * 1. `outerHTML` — parsed via a temporary `<template>` element.
 * 2. `nodeType === Node.TEXT_NODE` — creates a text node from `textContent`.
 * 3. `childNodes` array — each child is recursively converted and flattened.
 * 4. `textContent` — single text node fallback.
 *
 * @param value Node-like value to materialize.
 * @returns Array of concrete DOM nodes.
 */
function createNodesFromJsxNodeLike(value: JsxNodeLike): Node[] {
	if (typeof value.outerHTML === 'string') {
		const template = document.createElement('template');
		template.innerHTML = value.outerHTML;
		return Array.from(template.content.childNodes);
	}

	if (value.nodeType === Node.TEXT_NODE) {
		return [document.createTextNode(value.textContent ?? '')];
	}

	if (Array.isArray(value.childNodes)) {
		return value.childNodes.flatMap((child) => createNodesFromJsxNodeLike(child));
	}

	return value.textContent ? [document.createTextNode(value.textContent)] : [];
}

/**
 * Releases runtime state associated with a root-level mounted tree.
 *
 * Currently only template-mounted roots carry disposable state (event listeners and
 * subscriptions held in live parts).
 *
 * @param root Mounted root descriptor stored in {@link ROOT_RENDER_STATE}.
 */
function disposeMountedRoot(root: MountedRoot): void {
	if (root.kind === 'template') {
		disposeTemplateInstance(root.instance);
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
function disposeTemplateInstance(instance: TemplateInstance): void {
	for (const part of instance.parts) {
		if (part.type === 'child') {
			disposeMountedRangeContent(part.mounted);
		}
	}
}

/**
 * Recursively releases runtime bookkeeping for a mounted child range.
 *
 * Disposal is intentionally structural: subscriptions are unsubscribed and
 * nested range state is torn down even when the DOM nodes themselves are about
 * to be removed separately.
 */
function disposeMountedRangeContent(mounted: MountedRangeContent): void {
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
 * Captures the currently focused descendant and selection state so rerenders can
 * preserve editing continuity when possible.
 */
function captureFocusSnapshot(target: HTMLElement): FocusSnapshot | undefined {
	const activeElement = document.activeElement;

	if (!(activeElement instanceof HTMLElement) || !target.contains(activeElement)) {
		return undefined;
	}

	return {
		path: getNodePath(target, activeElement),
		selectionDirection: isSelectableInput(activeElement) ? activeElement.selectionDirection : undefined,
		selectionEnd: isSelectableInput(activeElement) ? activeElement.selectionEnd : undefined,
		selectionStart: isSelectableInput(activeElement) ? activeElement.selectionStart : undefined,
	};
}

/** Restores the focus snapshot captured before render work. */
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

/**
 * Computes a stable child-index path from `root` to `target`.
 *
 * Compiled templates store part locations as paths so cloned and hydrated trees
 * can resolve the same logical part without relying on object identity.
 */
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

/** Resolves a previously recorded child-index path back to a concrete node. */
function getNodeAtPath(root: NodePathContainer, path: number[]): Node | undefined {
	let currentContainer: NodePathContainer = root;
	let currentNode: Node | undefined;

	for (const index of path) {
		currentNode = currentContainer.childNodes[index];

		if (!currentNode) {
			return undefined;
		}

		currentContainer = currentNode;
	}

	return currentNode;
}

/** Removes keyed-child wrapper metadata so downstream logic can work with the raw child value. */
function unwrapKeyedValue(value: unknown): unknown {
	return isKeyedJsxValue(value) ? value.value : value;
}

/**
 * Narrows `element` to the subset of `HTMLElement` subtypes that expose
 * `setSelectionRange`, `selectionStart`, `selectionEnd`, and `selectionDirection`.
 *
 * @param element Element to test.
 */
function isSelectableInput(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement {
	return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}
