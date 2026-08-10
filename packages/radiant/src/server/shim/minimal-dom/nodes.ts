import { serializeHtmlAttribute } from '../../../utils/serialize-html-attribute';
import { toDataAttributeName, toDatasetPropertyName } from './dataset';
import * as selectors from './selectors';

type MinimalParentNode = Node & ParentNode;

type HtmlParsers = {
	parseHtmlToNodes: (html: string, ownerDocument: Document | null) => Node[];
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

	public childNodes: Node[] = [];
	public ownerDocument: Document | null;
	public parentNode: MinimalParentNode | null = null;

	constructor(
		public readonly nodeType: number,
		ownerDocument: Document | null = null,
	) {
		super();
		this.ownerDocument = ownerDocument;
	}

	append(...nodes: Array<Node | string>): void {
		for (const node of nodes) {
			this.appendChild(typeof node === 'string' ? createTextNode(node) : node);
		}
	}

	appendChild<TNode extends Node>(node: TNode): TNode {
		if ('parentNode' in node && node.parentNode && 'removeChild' in node.parentNode) {
			(node.parentNode as Node & { removeChild(node: Node): Node }).removeChild(node);
		}

		this.childNodes.push(node);
		(node as Node & { ownerDocument: Document | null }).ownerDocument =
			this.nodeType === MinimalNode.DOCUMENT_NODE ? (this as unknown as Document) : this.ownerDocument;
		(node as Node & { parentNode: MinimalParentNode | null }).parentNode = this as unknown as MinimalParentNode;
		return node;
	}

	removeChild<TNode extends Node>(node: TNode): TNode {
		const nodeIndex = this.childNodes.indexOf(node);

		if (nodeIndex === -1) {
			return node;
		}

		this.childNodes.splice(nodeIndex, 1);
		(node as Node & { parentNode: MinimalParentNode | null }).parentNode = null;
		return node;
	}

	replaceChildren(...nodes: Array<Node | string>): void {
		for (const child of this.childNodes) {
			(child as Node & { parentNode: MinimalParentNode | null }).parentNode = null;
		}

		this.childNodes = [];
		this.append(...nodes);
	}

	get textContent(): string | null {
		return this.childNodes.map((child) => child.textContent ?? '').join('');
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
	constructor(
		private value: string,
		ownerDocument: Document | null = getInstalledDocumentLike(),
	) {
		super(MinimalNode.TEXT_NODE, ownerDocument);
	}

	override get textContent(): string {
		return this.value;
	}

	override set textContent(value: string | null) {
		this.value = value ?? '';
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
	private fragmentHtml?: string;
	private fragmentInnerHtml?: string;
	private fragmentText?: string;

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
		this.clearFragmentCache();
		this.#attributeStore.set(name, String(value));
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
		this.clearFragmentCache();
		this.#attributeStore.delete(name);
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

	materializeChildren(): void {
		if (this.fragmentInnerHtml === undefined) {
			return;
		}

		const innerHtml = this.fragmentInnerHtml;
		this.clearFragmentCache();
		this.replaceChildren(...ensureHtmlParsers().parseHtmlToNodes(innerHtml, this.ownerDocument));
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

	private clearFragmentCache(): void {
		this.fragmentHtml = undefined;
		this.fragmentInnerHtml = undefined;
	}

	get outerHTML(): string {
		if (this.fragmentHtml !== undefined) {
			return this.fragmentHtml;
		}

		const attributes = Array.from(this.#attributeStore.entries())
			.map(([name, value]) => serializeHtmlAttribute(name, value))
			.join('');

		return `<${this.localName}${attributes}>${this.innerHTML}</${this.localName}>`;
	}

	get innerHTML(): string {
		return this.childNodes.map((child) => ensureHtmlParsers().serializeNodeHtml(child)).join('');
	}

	set innerHTML(html: string) {
		this.clearFragmentCache();
		this.fragmentText = undefined;
		this.replaceChildren(...ensureHtmlParsers().parseHtmlToNodes(html, this.ownerDocument));
	}

	override get textContent(): string {
		return this.fragmentText ?? super.textContent ?? '';
	}

	override set textContent(value: string | null) {
		this.clearFragmentCache();
		this.fragmentText = value ?? '';
		super.textContent = value;
	}

	setSerializedFragment(
		fragmentHtml: string,
		fragmentText: string,
		attributes: Record<string, string>,
		innerHtml = '',
	): void {
		this.fragmentHtml = fragmentHtml;
		this.fragmentInnerHtml = innerHtml;
		this.fragmentText = fragmentText;
		this.#attributeStore = new Map(Object.entries(attributes));
		this.replaceChildren();
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
	public isConnected = false;

	constructor(tagName = 'div', ownerDocument: Document | null = getInstalledDocumentLike()) {
		super(tagName, ownerDocument);
	}

	insertAdjacentHTML(_position: InsertPosition, html: string): void {
		this.append(...ensureHtmlParsers().parseHtmlToNodes(html, this.ownerDocument));
	}

	connectedCallback?(): void;
	attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
	disconnectedCallback?(): void;
}

export class MinimalHtmlScriptElement extends MinimalHTMLElement {
	constructor(ownerDocument: Document | null = getInstalledDocumentLike()) {
		super('script', ownerDocument);
	}
}

export function createTextNode(value: string): Node {
	return new MinimalTextNode(value, getInstalledDocumentLike()) as unknown as Node;
}

export function getInstalledDocumentLike(): Document | null {
	return ((globalThis as typeof globalThis & { document?: Document }).document ?? null) as Document | null;
}
