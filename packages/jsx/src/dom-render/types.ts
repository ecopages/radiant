import type { BindingKind } from '../factory/template-shape.ts';
import type { JsxKey, SignalLike, SubscribableJsxValue } from '../types/index.ts';

/**
 * Discriminated union that describes the kind and name of a single dynamic binding
 * inside a compiled template.
 *
 * - `{ kind: 'child' }` — a dynamic child slot with no associated name.
 * - `{ kind: BindingKind; name: string }` — an attribute-style binding with a
 *   specific kind (attr / bool / event / prop) and the resolved attribute name.
 */
export type BindingDescriptor =
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
export type DeferredPropertyBinding = {
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
export type AttributeTemplatePart = {
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
export type ChildTemplatePart = {
	endPath: number[];
	index: number;
	startPath: number[];
	type: 'child';
};

/** Union of all static template part descriptors produced during compilation. */
export type TemplatePart = AttributeTemplatePart | ChildTemplatePart;

/**
 * Runtime state for a dynamic attribute binding attached to a live DOM element.
 *
 * Caches the previous value so identity-stable updates (events, properties) can skip
 * redundant work and so attribute strings are only written to the DOM when they differ.
 */
export type LiveAttributePart = {
	binding: Exclude<BindingDescriptor, { kind: 'child' }>;
	element: Element;
	index: number;
	previousValue?: unknown;
	rootTarget: HTMLElement;
	/**
	 * Currently bound reactive source for this attribute part, when the binding value is subscribable.
	 *
	 * Ownership is attached to the live part instance, not to the source object. Rebinding the same
	 * DOM slot to a different source replaces this reference and invalidates callbacks captured by the
	 * previous subscription epoch.
	 */
	source?: ReactiveAttributeSource;
	/**
	 * Monotonic ownership epoch for the current reactive subscription attached to this part.
	 *
	 * The renderer increments this value whenever it subscribes, rebinds, or disposes the part.
	 * Each callback closes over the epoch that created it and exits early when the part has advanced
	 * since then. This prevents stale notifications from a previous source from mutating a DOM slot
	 * that now belongs to a newer binding.
	 */
	subscriptionSerial: number;
	type: 'attribute';
	unsubscribe?: () => void;
};

/**
 * Runtime state for a dynamic child slot bounded by two empty text nodes.
 *
 * The `startMarker` and `endMarker` text nodes delimit the exclusive range owned by this
 * part. `mounted` tracks the structural shape of the current content so subsequent updates
 * can reconcile in place rather than replacing the whole range.
 */
export type LiveChildPart = {
	endMarker: Text;
	index: number;
	mounted: MountedRangeContent;
	startMarker: Text;
	type: 'child';
};

/** Union of all live template part state records attached to a mounted template instance. */
export type LiveTemplatePart = LiveAttributePart | LiveChildPart;

export type ReactiveAttributeSource = ReactiveChildSource;

/** Static template blueprint plus path-based metadata for every dynamic part. */
export type CompiledTemplate = {
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
export type TemplateInstance = {
	compiled: CompiledTemplate;
	parts: readonly LiveTemplatePart[];
	rootTarget: HTMLElement;
	rootNodes: readonly Node[];
	update: (values: readonly unknown[], deferredProperties: DeferredPropertyBinding[]) => void;
};

/** Mounted state for a child range that currently contains no DOM nodes. */
export type MountedEmpty = {
	kind: 'empty';
};

/**
 * Mounted state for a child range that contains an arbitrary flat list of DOM nodes.
 *
 * Used as the fallback when content cannot be tracked as a template, text node, or list.
 */
export type MountedNodes = {
	kind: 'nodes';
	nodes: readonly Node[];
};

/**
 * Mounted state for a child range that contains exactly one text node.
 *
 * Kept as a dedicated variant so primitive text updates can mutate `node.data`
 * directly instead of replacing DOM nodes.
 */
export type MountedText = {
	kind: 'text';
	node: Text;
};

/**
 * A self-contained range record that owns a slice of the DOM between two boundary text
 * nodes for use inside keyed and indexed list representations.
 */
export type MountedRangeRecord = {
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
export type MountedIndexedList = {
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
export type MountedKeyedList = {
	kind: 'keyed-list';
	records: Map<JsxKey, MountedRangeRecord>;
};

/**
 * Mounted state for a child range that contains the nodes produced by a single
 * {@link TemplateInstance}.
 *
 * Keeping strong reference to the instance allows follow-up renders to update
 * the existing parts rather than replacing the DOM subtree.
 */
export type MountedTemplate = {
	instance: TemplateInstance;
	kind: 'template';
};

/**
 * Mounted state for a child range driven by a subscribable wrapper or a plain
 * signal-like value.
 *
 * The `unsubscribe` callback is invoked when the subscription source is replaced or the
 * range is torn down. `mounted` holds the structural shape of the current child content
 * emitted by the subscription so range updates can reconcile efficiently.
 */
export type MountedSubscription = {
	kind: 'subscription';
	mounted: MountedRangeContent;
	source: ReactiveChildSource;
	/**
	 * Monotonic ownership epoch for the child-range subscription currently attached to this record.
	 *
	 * Child subscriptions can outlive the source that originally created them because unsubscribe is
	 * asynchronous from the renderer's point of view: a stale callback may still fire after a rebind,
	 * keyed move, or disposal. Incrementing this epoch lets the callback prove it still owns the range
	 * before applying an update.
	 */
	subscriptionSerial: number;
	unsubscribe: () => void;
};

export type ReactiveChildSource = SignalLike | SubscribableJsxValue;

/**
 * Mounted representation for the content inside a dynamic child range.
 *
 * The renderer tracks ranges structurally instead of only keeping raw nodes so
 * it can reconcile templates, keyed lists, indexed lists, text nodes, and
 * subscribable values using the same update entrypoint.
 */
export type MountedRangeContent =
	| MountedEmpty
	| MountedIndexedList
	| MountedKeyedList
	| MountedNodes
	| MountedSubscription
	| MountedTemplate
	| MountedText;

/** Mounted representation for the current render root. */
export type MountedRoot =
	| {
			instance: TemplateInstance;
			kind: 'template';
	  }
	| {
			kind: 'value';
	  };
