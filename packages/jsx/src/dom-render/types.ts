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
	name: PropertyKey;
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

/**
 * Static metadata for a child binding that maps to an element's character data.
 *
 * Used for `textarea`, `title`, `style`, and `script`, where HTML comments are not
 * parsed as comment nodes and therefore cannot bookend a child range.
 */
export type TextContentTemplatePart = {
	index: number;
	path: number[];
	type: 'text-content';
};

/** Union of all static template part descriptors produced during compilation. */
export type TemplatePart = AttributeTemplatePart | ChildTemplatePart | TextContentTemplatePart;

/**
 * Child slot metadata for {@link CompiledTemplate.clientContent}, where a slot may have no marker on either side.
 *
 * @remarks A `null` path means that bound is the parent's first or last child (see {@link ChildRange}); `ownerPath`
 * locates the parent when both are `null`.
 */
export type ClientChildTemplatePart = {
	endPath: number[] | null;
	index: number;
	ownerPath: number[] | null;
	startPath: number[] | null;
	type: 'child';
};

/** Part metadata for {@link CompiledTemplate.clientContent}. */
export type ClientTemplatePart = AttributeTemplatePart | ClientChildTemplatePart | TextContentTemplatePart;

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
	/** The wrapper a `native-event` part registered on its element, which calls the handler. */
	nativeListener?: EventListener;
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
 * Bounds of a child slot's content: the nodes strictly between `start` and `end` in their parent.
 *
 * @remarks A missing `start` means the content begins at the parent's first child, and a missing `end` that it runs
 * to the parent's last child. The parent is read from whichever bound exists, so a slot follows its markers when a
 * fragment is inserted into the page; `owner` names the parent when neither exists, which is only valid for a slot
 * that is its element's only child.
 */
export type ChildRange = {
	readonly end: ChildNode | null;
	readonly owner?: ParentNode;
	readonly start: ChildNode | null;
};

/**
 * Runtime state for a dynamic child slot.
 *
 * `start` and `end` bound the content as a {@link ChildRange}. `mounted` tracks the structural shape of the current
 * content so subsequent updates can reconcile in place rather than replacing the whole range.
 */
export type LiveChildPart = {
	end: ChildNode | null;
	index: number;
	mounted: MountedRangeContent;
	owner?: ParentNode;
	start: ChildNode | null;
	type: 'child';
};

/**
 * Runtime state for a child binding that writes an element's character data.
 *
 * `committedText` is the last stringified snapshot for this slot so multiple
 * text-content parts on the same element can concatenate without rereading DOM.
 */
export type LiveTextContentPart = {
	committedText: string;
	element: Element;
	index: number;
	source?: ReactiveChildSource;
	subscriptionSerial: number;
	type: 'text-content';
	unsubscribe?: () => void;
};

/** Union of all live template part state records attached to a mounted template instance. */
export type LiveTemplatePart = LiveAttributePart | LiveChildPart | LiveTextContentPart;

export type ReactiveAttributeSource = ReactiveChildSource;

/** Static template blueprint plus path-based metadata for every dynamic part. */
export type CompiledTemplate = {
	blueprint: HTMLTemplateElement;
	/**
	 * The blueprint's content prepared for client mounts to clone: attribute markers removed, and child comment
	 * markers replaced by as few text markers as the slots need.
	 *
	 * @remarks In an element whose children are only child slots, adjacent slots share one marker and the first and
	 * last slots use the element's edges, so one slot needs no marker at all. Anywhere else each comment becomes one
	 * text marker. Hydration keeps reading {@link CompiledTemplate.blueprint}, which keeps the comments.
	 */
	clientContent: DocumentFragment;
	/** Part metadata located in {@link CompiledTemplate.clientContent}. */
	clientParts: readonly ClientTemplatePart[];
	parts: readonly TemplatePart[];
	/**
	 * Identifies a factory template by its tag and child slots alone, so two shapes that differ only in which
	 * attributes they bind share it. Absent for transported templates.
	 */
	structureKey?: string;
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
	/**
	 * The value a keyed list last rendered into this record.
	 *
	 * @remarks The same value again is skipped: a template result is not changed after creation, so rendering it
	 * twice changes nothing.
	 */
	value?: unknown;
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

/** A positional list entry whose keyed children can still be matched by key on later passes. */
export type MountedMixedListEntry = {
	key?: JsxKey;
	record: MountedRangeRecord;
};

/**
 * Mounted state for a list that mixes keyed and positional children.
 *
 * Positional entries keep their slot record, while keyed entries are matched by
 * their key even when a positional sibling appears or disappears around them.
 */
export type MountedMixedList = {
	entries: MountedMixedListEntry[];
	/** Whether an entry has a key, so the next update must match entries by key. */
	keyed?: boolean;
	kind: 'mixed-list';
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
	| MountedKeyedList
	| MountedMixedList
	| MountedNodes
	| MountedSubscription
	| MountedTemplate
	| MountedText;

/**
 * Mounted representation for the current render root.
 *
 * A root is a {@link MountedRangeRecord} that spans its whole host, plus the host
 * itself so disposal can release root-scoped delegated listeners. Modelling it as a
 * range is what lets every value shape — templates, keyed lists, text, and reactive
 * sources — behave the same at the root as inside a template.
 */
export type MountedRoot = MountedRangeRecord & {
	rootTarget: HTMLElement;
};
