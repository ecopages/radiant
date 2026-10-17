import { serializeHtmlAttribute } from '../../../utils/serialize-html-attribute';
import { MINIMAL_DOM_ELEMENT } from '../../../core/minimal-dom-identity';
import { leadingNewlineElementNames, voidElementNames } from '../../html/html-parser';
import { toDataAttributeName, toDatasetPropertyName } from './dataset';
import * as selectors from './selectors';

type MinimalParentNode = Node & ParentNode;

type HtmlParsers = {
	parseHtmlToNodes: (
		html: string,
		ownerDocument: Document | null,
		contextTagName?: string,
		followsStartTag?: boolean,
	) => Node[];
	serializeNodeHtml: (node: Node) => string;
};

let htmlParsers: HtmlParsers | undefined;

/**
 * EventTarget captured when the minimal-DOM module is evaluated.
 *
 * @remarks The installer restores this exact constructor after global replacement so
 * MinimalNode instances remain compatible with `instanceof EventTarget` checks even
 * when a foreign runtime changes globals after module evaluation.
 */
export const MinimalEventTarget = EventTarget;

/**
 * Registers HTML parse/serialize helpers from `./html` to break a circular import.
 * Import `./html` (or the light-DOM install entry) before using `innerHTML`.
 */
export function registerMinimalDomHtmlParsers(parsers: HtmlParsers): void {
	htmlParsers = parsers;
}

function ensureHtmlParsers(): HtmlParsers {
	if (!htmlParsers) {
		throw new Error(
			'Minimal DOM HTML parsers are not registered. Import @ecopages/radiant/server/install-ssr-runtime (or ./html) before using innerHTML.',
		);
	}

	return htmlParsers;
}

/**
 * Builds an `HTMLCollection`-shaped view over element children.
 *
 * @remarks
 * Plain arrays lack `.item()`, which hydration marker walks and other DOM code call.
 */
function createMinimalHtmlCollection(elements: MinimalHTMLElement[]): HTMLCollection {
	const collection = elements as unknown as MinimalHTMLElement[] & HTMLCollection;
	collection.item = (index: number): Element | null => (elements[index] as unknown as Element | undefined) ?? null;
	return collection;
}

function createMinimalStyle(onChange: (value: string) => void): CSSStyleDeclaration {
	const values = new Map<string, string>();
	const commit = () => onChange([...values].map(([name, value]) => `${name}: ${value}`).join('; '));
	const style = {
		getPropertyValue(name: string): string {
			return values.get(name) ?? '';
		},
		removeProperty(name: string): string {
			const previous = values.get(name) ?? '';
			values.delete(name);
			commit();
			return previous;
		},
		setProperty(name: string, value: string): void {
			values.set(name, value);
			commit();
		},
	};

	return new Proxy(style, {
		get(target, property) {
			if (typeof property === 'string' && property in target) {
				return target[property as keyof typeof target];
			}
			return typeof property === 'string' ? (values.get(property) ?? '') : undefined;
		},
		set(_target, property, value) {
			if (typeof property !== 'string') {
				return false;
			}
			values.set(property, String(value));
			commit();
			return true;
		},
	}) as CSSStyleDeclaration;
}

export class MinimalNode extends MinimalEventTarget {
	static readonly DOCUMENT_NODE = 9;
	static readonly ELEMENT_NODE = 1;
	static readonly TEXT_NODE = 3;
	static readonly COMMENT_NODE = 8;

	public ownerDocument: Document | null;
	public parentNode: MinimalParentNode | null = null;
	private childNodeList: Node[] = [];

	constructor(
		public readonly nodeType: number,
		ownerDocument: Document | null = null,
	) {
		super();
		this.ownerDocument = ownerDocument;
	}

	/**
	 * @remarks Parsed elements build their children lazily, on first read of this list.
	 */
	get childNodes(): Node[] {
		this.ensureChildNodes();
		return this.childNodeList;
	}

	append(...nodes: Array<Node | string>): void {
		for (const node of nodes) {
			this.appendChild(typeof node === 'string' ? createTextNode(node) : node);
		}
	}

	prepend(...nodes: Array<Node | string>): void {
		const reference = this.firstChild;
		for (const node of nodes) this.insertBefore(toNode(node), reference);
	}

	get firstChild(): Node | null {
		return this.childNodes[0] ?? null;
	}

	get lastChild(): Node | null {
		return this.childNodes[this.childNodes.length - 1] ?? null;
	}

	get nextSibling(): Node | null {
		return this.siblingAt(1);
	}

	get previousSibling(): Node | null {
		return this.siblingAt(-1);
	}

	before(...nodes: Array<Node | string>): void {
		const parent = this.parentNode as unknown as MinimalNode | null;
		for (const node of nodes) parent?.insertBefore(toNode(node), this as unknown as Node);
	}

	after(...nodes: Array<Node | string>): void {
		const parent = this.parentNode as unknown as MinimalNode | null;
		const reference = this.nextSibling;
		for (const node of nodes) parent?.insertBefore(toNode(node), reference);
	}

	replaceWith(...nodes: Array<Node | string>): void {
		this.before(...nodes);
		this.remove();
	}

	remove(): void {
		(this.parentNode as unknown as MinimalNode | null)?.removeChild(this as unknown as Node);
	}

	private siblingAt(offset: number): Node | null {
		const siblings = (this.parentNode as unknown as MinimalNode | null)?.childNodes;
		if (!siblings) return null;
		return siblings[siblings.indexOf(this as unknown as Node) + offset] ?? null;
	}

	appendChild<TNode extends Node>(node: TNode): TNode {
		return this.insertBefore(node, null);
	}

	insertBefore<TNode extends Node>(node: TNode, reference: Node | null): TNode {
		this.ensureChildNodes();

		if ('parentNode' in node && node.parentNode && 'removeChild' in node.parentNode) {
			(node.parentNode as Node & { removeChild(node: Node): Node }).removeChild(node);
		}

		const index = reference ? this.childNodeList.indexOf(reference) : this.childNodeList.length;

		if (index === -1) {
			throw new Error('insertBefore: the reference node is not a child of this node.');
		}

		this.attachChild(node, index);
		this.invalidateSerialization();
		return node;
	}

	removeChild<TNode extends Node>(node: TNode): TNode {
		const nodeIndex = this.childNodes.indexOf(node);

		if (nodeIndex === -1) {
			return node;
		}

		this.childNodeList.splice(nodeIndex, 1);
		(node as Node & { parentNode: MinimalParentNode | null }).parentNode = null;
		this.invalidateSerialization();
		return node;
	}

	replaceChildren(...nodes: Array<Node | string>): void {
		for (const child of this.childNodes) {
			(child as Node & { parentNode: MinimalParentNode | null }).parentNode = null;
		}

		this.childNodeList = [];
		this.append(...nodes);
		this.invalidateSerialization();
	}

	/**
	 * Drops cached serialization on this node and every ancestor after a mutation.
	 *
	 * @remarks Parsed elements serialize from their source HTML until something under them changes.
	 */
	invalidateSerialization(): void {
		const parent = this.parentNode;

		if (parent instanceof MinimalNode) {
			parent.invalidateSerialization();
		}
	}

	protected ensureChildNodes(): void {}

	/** Adds a child without invalidating serialization; used when materializing parsed children. */
	protected attachChild(node: Node, index = this.childNodeList.length): void {
		this.childNodeList.splice(index, 0, node);
		(node as Node & { ownerDocument: Document | null }).ownerDocument =
			this.nodeType === MinimalNode.DOCUMENT_NODE ? (this as unknown as Document) : this.ownerDocument;
		(node as Node & { parentNode: MinimalParentNode | null }).parentNode = this as unknown as MinimalParentNode;
	}

	/**
	 * @remarks Comments are skipped, as in the DOM.
	 */
	get textContent(): string | null {
		return this.childNodes
			.map((child) => (child.nodeType === MinimalNode.COMMENT_NODE ? '' : (child.textContent ?? '')))
			.join('');
	}

	set textContent(value: string | null) {
		this.replaceChildren(value ?? '');
	}

	getRootNode(): Node {
		let current: Node = this as unknown as Node;

		while ('parentNode' in current && current.parentNode) {
			current = current.parentNode;
		}

		return current;
	}
}

export class MinimalTextNode extends MinimalNode {
	/**
	 * @param sourceHtml The text as written in parsed HTML. It is serialized unchanged until the text is set,
	 * so entities the decoder does not know survive a round trip.
	 */
	constructor(
		private value: string,
		ownerDocument: Document | null = getInstalledDocumentLike(),
		public sourceHtml?: string,
	) {
		super(MinimalNode.TEXT_NODE, ownerDocument);
	}

	override get textContent(): string {
		return this.value;
	}

	override set textContent(value: string | null) {
		this.value = value ?? '';
		this.sourceHtml = undefined;
		this.invalidateSerialization();
	}
}

export class MinimalCommentNode extends MinimalNode {
	constructor(
		private value: string,
		ownerDocument: Document | null = getInstalledDocumentLike(),
	) {
		super(MinimalNode.COMMENT_NODE, ownerDocument);
	}

	get data(): string {
		return this.value;
	}

	set data(value: string) {
		this.value = value;
		this.invalidateSerialization();
	}

	override get textContent(): string {
		return this.value;
	}

	override set textContent(value: string | null) {
		this.data = value ?? '';
	}
}

class MinimalClassList {
	constructor(private readonly element: MinimalElement) {}

	add(...tokens: string[]): void {
		const nextTokens = new Set(this.readTokens());

		for (const token of tokens) {
			if (token !== '') {
				nextTokens.add(token);
			}
		}

		this.writeTokens([...nextTokens]);
	}

	remove(...tokens: string[]): void {
		const nextTokens = new Set(this.readTokens());

		for (const token of tokens) {
			nextTokens.delete(token);
		}

		this.writeTokens([...nextTokens]);
	}

	toggle(token: string, force?: boolean): boolean {
		const hasToken = this.contains(token);
		const shouldAdd = force ?? !hasToken;

		if (shouldAdd) {
			this.add(token);
			return true;
		}

		this.remove(token);
		return false;
	}

	contains(token: string): boolean {
		return this.readTokens().includes(token);
	}

	toString(): string {
		return this.value;
	}

	get value(): string {
		return this.element.getAttribute('class') ?? '';
	}

	private readTokens(): string[] {
		return this.value
			.split(/\s+/)
			.map((token) => token.trim())
			.filter((token) => token.length > 0);
	}

	private writeTokens(tokens: string[]): void {
		if (tokens.length === 0) {
			this.element.removeAttribute('class');
			return;
		}

		this.element.setAttribute('class', tokens.join(' '));
	}
}

export class MinimalElement extends MinimalNode {
	/**
	 * @remarks
	 * Must not be named `attributes`: TypeScript `private` is erased at runtime, and
	 * a field of that name would collide with the DOM `attributes` NamedNodeMap that
	 * hydration marker walks expect. A `Map` there makes `Array.from(el.attributes)`
	 * yield `[name, value]` tuples and crash on `.name.startsWith(...)`.
	 */
	#attributeStore = new Map<string, string>();
	private classListValue?: MinimalClassList;
	private datasetValue?: DOMStringMap;
	private styleValue?: CSSStyleDeclaration;
	/** Source open tag of a parsed element; valid until an attribute changes. */
	private openTagHtml?: string;
	/** Source inner HTML of a parsed element; valid until anything under the element changes. */
	private innerHtmlSource?: string;
	/** Parsed inner HTML not yet built into child nodes. */
	private pendingChildHtml?: string;

	public readonly localName: string;
	public readonly tagName: string;

	constructor(tagName = 'div', ownerDocument: Document | null = getInstalledDocumentLike()) {
		super(MinimalNode.ELEMENT_NODE, ownerDocument);
		this.localName = tagName.toLowerCase();
		this.tagName = this.localName.toUpperCase();
	}

	get id(): string {
		return this.getAttribute('id') ?? '';
	}

	set id(value: string) {
		if (value === '') {
			this.removeAttribute('id');
			return;
		}

		this.setAttribute('id', value);
	}

	get classList(): DOMTokenList {
		this.classListValue ??= new MinimalClassList(this);
		return this.classListValue as unknown as DOMTokenList;
	}

	get style(): CSSStyleDeclaration {
		this.styleValue ??= createMinimalStyle((value) => {
			if (value === '') {
				this.removeAttribute('style');
				return;
			}
			this.setAttribute('style', value);
		});
		return this.styleValue;
	}

	get dataset(): DOMStringMap {
		this.datasetValue ??= new Proxy(
			{},
			{
				deleteProperty: (_target, property) => {
					if (typeof property !== 'string') {
						return false;
					}

					this.removeAttribute(toDataAttributeName(property));
					return true;
				},
				get: (_target, property) => {
					if (typeof property !== 'string') {
						return undefined;
					}

					return this.getAttribute(toDataAttributeName(property)) ?? undefined;
				},
				getOwnPropertyDescriptor: (_target, property) => {
					if (typeof property !== 'string') {
						return undefined;
					}

					return {
						configurable: true,
						enumerable: true,
						value: this.getAttribute(toDataAttributeName(property)) ?? undefined,
						writable: true,
					};
				},
				has: (_target, property) => {
					return typeof property === 'string' && this.hasAttribute(toDataAttributeName(property));
				},
				ownKeys: () => {
					return this.getAttributeNames()
						.filter((name) => name.startsWith('data-'))
						.map((name) => toDatasetPropertyName(name.slice(5)));
				},
				set: (_target, property, value) => {
					if (typeof property !== 'string') {
						return false;
					}

					this.setAttribute(toDataAttributeName(property), String(value));
					return true;
				},
			},
		) as DOMStringMap;

		return this.datasetValue;
	}

	hasAttribute(name: string): boolean {
		return this.#attributeStore.has(name);
	}

	getAttribute(name: string): string | null {
		return this.#attributeStore.get(name) ?? null;
	}

	getAttributeNames(): string[] {
		return Array.from(this.#attributeStore.keys());
	}

	setAttribute(name: string, value: unknown): void {
		this.#attributeStore.set(name, String(value));
		this.invalidateOpenTag();
	}

	toggleAttribute(name: string, force?: boolean): boolean {
		const shouldHaveAttribute = force ?? !this.hasAttribute(name);

		if (shouldHaveAttribute) {
			this.setAttribute(name, '');
			return true;
		}

		this.removeAttribute(name);
		return false;
	}

	removeAttribute(name: string): void {
		this.#attributeStore.delete(name);
		this.invalidateOpenTag();
	}

	get parentElement(): MinimalElement | null {
		const parent = this.parentNode;
		return parent instanceof MinimalElement ? parent : null;
	}

	get children(): HTMLCollection {
		const elements = Array.from(this.childNodes ?? []).filter(
			(node) => node.nodeType === MinimalNode.ELEMENT_NODE,
		) as unknown as MinimalHTMLElement[];

		return createMinimalHtmlCollection(elements);
	}

	get childElementCount(): number {
		return this.children.length;
	}

	get firstElementChild(): Element | null {
		return (this.children[0] as Element | undefined) ?? null;
	}

	get lastElementChild(): Element | null {
		return (this.children[this.children.length - 1] as Element | undefined) ?? null;
	}

	get nextElementSibling(): Element | null {
		return this.elementSiblingAt(1);
	}

	get previousElementSibling(): Element | null {
		return this.elementSiblingAt(-1);
	}

	private elementSiblingAt(offset: number): Element | null {
		const siblings = this.parentElement?.children;
		if (!siblings) return null;
		const elements = Array.from(siblings as ArrayLike<Element>);
		return elements[elements.indexOf(this as unknown as Element) + offset] ?? null;
	}

	/**
	 * Builds child nodes from the parsed inner HTML, if not done yet.
	 *
	 * @remarks Reading does not invalidate the source cache, so a parsed subtree that is only queried still
	 * serializes byte for byte as written.
	 */
	materializeChildren(): void {
		if (this.pendingChildHtml === undefined) {
			return;
		}

		const html = this.pendingChildHtml;
		this.pendingChildHtml = undefined;

		for (const node of ensureHtmlParsers().parseHtmlToNodes(html, this.ownerDocument, this.localName, true)) {
			this.attachChild(node);
		}
	}

	override invalidateSerialization(): void {
		this.innerHtmlSource = undefined;
		super.invalidateSerialization();
	}

	protected override ensureChildNodes(): void {
		this.materializeChildren();
	}

	private invalidateOpenTag(): void {
		this.openTagHtml = undefined;
		super.invalidateSerialization();
	}

	private parseChildHtml(html: string): Node[] {
		return ensureHtmlParsers().parseHtmlToNodes(html, this.ownerDocument, this.localName);
	}

	querySelector(selector: string): MinimalHTMLElement | null {
		return selectors.querySelector(this, selector) as MinimalHTMLElement | null;
	}

	querySelectorAll(selector: string): MinimalHTMLElement[] {
		return selectors.querySelectorAll(this, selector) as MinimalHTMLElement[];
	}

	closest(selector: string): MinimalHTMLElement | null {
		return selectors.closest(this, selector) as MinimalHTMLElement | null;
	}

	contains(other: MinimalNode | null): boolean {
		return selectors.contains(this, other);
	}

	matches(selector: string): boolean {
		return selectors.matches(this, selector);
	}

	/**
	 * @remarks Zero-sized no-op. `@onUpdated` runs during SSR preparation, so
	 * catalog hosts can read geometry without throwing. Hydration owns real layout.
	 */
	getBoundingClientRect(): DOMRect {
		return {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
			toJSON() {
				return this;
			},
		} as DOMRect;
	}

	/**
	 * @remarks Returns the same zero rect as `getBoundingClientRect()`.
	 */
	getClientRects(): DOMRectList {
		const rect = this.getBoundingClientRect();
		return Object.assign([rect], {
			item: (index: number) => (index === 0 ? rect : null),
		}) as unknown as DOMRectList;
	}

	/**
	 * @remarks Void elements (`input`, `img`, …) must not emit a closing tag.
	 * `</input>` in serialized SSR HTML makes the fragment splitter close ancestor
	 * `<div>`s too early.
	 */
	get outerHTML(): string {
		const openTag =
			this.openTagHtml ??
			`<${this.localName}${Array.from(this.#attributeStore.entries())
				.map(([name, value]) => serializeHtmlAttribute(name, value))
				.join('')}>`;

		if (voidElementNames.has(this.localName)) {
			return openTag;
		}

		return `${openTag}${this.innerHtmlSource ?? `${this.leadingNewline()}${this.serializeChildNodes()}`}</${this.localName}>`;
	}

	/**
	 * @remarks `pre`, `listing` and `textarea` serialize from child nodes: their source can hold a newline the
	 * parser dropped, which a fragment parse of `innerHTML` would keep. Like browsers, `innerHTML` adds no
	 * newline; `outerHTML` does, see {@link leadingNewline}.
	 */
	get innerHTML(): string {
		const source = leadingNewlineElementNames.has(this.localName) ? undefined : this.innerHtmlSource;
		return source ?? this.serializeChildNodes();
	}

	/**
	 * @remarks The parser drops a newline right after a `pre`, `listing` or `textarea` start tag, so markup that
	 * includes the start tag needs one more when the text itself starts with a newline.
	 */
	private leadingNewline(): string {
		const first = this.childNodes[0];
		const startsWithNewline = first?.nodeType === MinimalNode.TEXT_NODE && first.textContent?.startsWith('\n');
		return leadingNewlineElementNames.has(this.localName) && startsWithNewline ? '\n' : '';
	}

	private serializeChildNodes(): string {
		return this.childNodes.map((child) => ensureHtmlParsers().serializeNodeHtml(child)).join('');
	}

	set innerHTML(html: string) {
		this.pendingChildHtml = undefined;
		this.replaceChildren(...this.parseChildHtml(html));
	}

	/**
	 * @remarks Built from child nodes, which materializes a parsed element. A shortcut over the source HTML
	 * cannot tell `script` content or a `>` inside an attribute value from markup.
	 */
	override get textContent(): string {
		return super.textContent ?? '';
	}

	override set textContent(value: string | null) {
		this.pendingChildHtml = undefined;
		super.textContent = value;
	}

	/**
	 * Backs a parsed element with its source HTML, building child nodes only when they are read.
	 *
	 * @param attributes Entity-decoded attribute values.
	 * @param keepInnerSource Whether `innerHtml` is also serialized verbatim. Pass `false` when it is not a
	 * faithful spelling of the parsed children, so they are serialized from the nodes instead.
	 */
	setSerializedFragment(
		openTagHtml: string,
		attributes: Record<string, string>,
		innerHtml = '',
		keepInnerSource = true,
	): void {
		this.replaceChildren();
		this.#attributeStore = new Map(Object.entries(attributes));
		this.openTagHtml = openTagHtml;
		this.innerHtmlSource = keepInnerSource ? innerHtml : undefined;
		this.pendingChildHtml = innerHtml;
	}
}

export class MinimalEvent {
	public readonly bubbles: boolean;
	public readonly cancelable: boolean;
	public readonly composed: boolean;
	public readonly type: string;

	constructor(type: string, eventInitDict: EventInit = {}) {
		this.type = type;
		this.bubbles = eventInitDict.bubbles ?? false;
		this.cancelable = eventInitDict.cancelable ?? false;
		this.composed = eventInitDict.composed ?? false;
	}
}

export class MinimalCustomEvent<T = unknown> extends MinimalEvent {
	public readonly detail: T;

	constructor(type: string, eventInitDict: CustomEventInit<T> = {}) {
		super(type, eventInitDict);
		this.detail = eventInitDict.detail as T;
	}
}

export class MinimalHTMLElement extends MinimalElement {
	readonly [MINIMAL_DOM_ELEMENT] = true;
	public isConnected = false;

	constructor(tagName = 'div', ownerDocument: Document | null = getInstalledDocumentLike()) {
		super(tagName, ownerDocument);
	}

	/**
	 * @remarks `beforebegin` / `afterend` need a parent, as in the DOM. HTML is parsed in the context of the
	 * element it lands in.
	 */
	insertAdjacentHTML(position: InsertPosition, html: string): void {
		const parent = this.parentNode instanceof MinimalElement ? this.parentNode : null;
		const outside = position === 'beforebegin' || position === 'afterend';

		if (outside && !parent) {
			throw new Error(`insertAdjacentHTML('${position}') requires the element to have a parent element.`);
		}

		const target: MinimalElement = outside ? (parent as MinimalElement) : this;
		const self = this as unknown as Node;
		const reference =
			position === 'beforebegin'
				? self
				: position === 'afterbegin'
					? (this.childNodes[0] ?? null)
					: position === 'afterend'
						? (target.childNodes[target.childNodes.indexOf(self) + 1] ?? null)
						: null;
		const nodes = ensureHtmlParsers().parseHtmlToNodes(html, this.ownerDocument, target.localName);

		for (const node of nodes) {
			target.insertBefore(node, reference);
		}
	}

	/**
	 * @remarks No-op on the SSR DOM. `@onUpdated` (and microtasks it queues) run
	 * during server preparation, so catalog hosts can call `focus()` without
	 * throwing. Real focus is a client concern.
	 */
	focus(): void {}

	/**
	 * @remarks No-op on the SSR DOM. Same rationale as `focus()`.
	 */
	blur(): void {}

	connectedCallback?(): void;
	attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
	disconnectedCallback?(): void;
}

export class MinimalHtmlScriptElement extends MinimalHTMLElement {
	constructor(ownerDocument: Document | null = getInstalledDocumentLike()) {
		super('script', ownerDocument);
	}
}

function toNode(node: Node | string): Node {
	return typeof node === 'string' ? createTextNode(node) : node;
}

export function createTextNode(value: string): Node {
	return new MinimalTextNode(value, getInstalledDocumentLike()) as unknown as Node;
}

export function getInstalledDocumentLike(): Document | null {
	return ((globalThis as typeof globalThis & { document?: Document }).document ?? null) as Document | null;
}
