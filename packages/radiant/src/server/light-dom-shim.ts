import { collectTopLevelHtmlFragments, parseHtmlTagToken, type ParsedHtmlTag } from './html-parser';

type MinimalCustomElementRegistry = {
	define(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions): void;
	get(name: string): CustomElementConstructor | undefined;
};

type MinimalCssNamespace = {
	escape(value: string): string;
};

/**
 * Minimal window-like runtime surface exposed by the SSR light-DOM shim.
 *
 * This is intentionally much smaller than a browser `window`; it only includes
 * the constructors and registry access that Radiant SSR currently needs.
 */
export type LightDomShimWindow = {
	/** Event constructor exposed to SSR-created components. */
	CustomEvent: typeof CustomEvent;
	/** Document constructor exposed to SSR-created components. */
	Document: typeof Document;
	/** Element constructor exposed to SSR-created components. */
	Element: typeof Element;
	/** Event constructor exposed to SSR-created components. */
	Event: typeof Event;
	/** EventTarget constructor exposed to SSR-created components. */
	EventTarget: typeof EventTarget;
	/** HTMLScriptElement constructor used by slot projection payload parsing. */
	HTMLScriptElement: typeof HTMLScriptElement;
	/** HTMLElement constructor exposed to SSR-created components. */
	HTMLElement: typeof HTMLElement;
	/** Node constructor exposed to SSR-created components. */
	Node: typeof Node;
	/** Minimal document instance exposed to SSR-created components. */
	document: Document;
	/** Minimal CSS namespace exposed to SSR-created components. */
	CSS: MinimalCssNamespace;
	/** Custom element registry used while rendering in SSR. */
	customElements: MinimalCustomElementRegistry;
};

/** Host preparation options accepted by the server render environment. */
export type PrepareServerRenderHostOptions = {
	/** Serialized light-DOM content to attach to the host before SSR. */
	authoredContent?: string;
};

/** Reusable SSR environment used to prepare component hosts before rendering. */
export type ServerRenderEnvironment = {
	/** Prepares the host instance for rendering, including authored light-DOM content. */
	prepareHost(host: HTMLElement, options?: PrepareServerRenderHostOptions): void;
};

type MinimalParentNode = Node & ParentNode;

class MinimalNode extends EventTarget {
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

class MinimalTextNode extends MinimalNode {
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

class MinimalElement extends MinimalNode {
	private attributes = new Map<string, string>();
	private classListValue?: MinimalClassList;
	private datasetValue?: DOMStringMap;
	private fragmentHtml?: string;
	private fragmentText?: string;

	public readonly localName: string;
	public readonly tagName: string;

	constructor(tagName = 'div', ownerDocument: Document | null = getInstalledDocumentLike()) {
		super(MinimalNode.ELEMENT_NODE, ownerDocument);
		this.localName = tagName.toLowerCase();
		this.tagName = this.localName.toUpperCase();
	}

	get classList(): DOMTokenList {
		this.classListValue ??= new MinimalClassList(this);
		return this.classListValue as unknown as DOMTokenList;
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
		return this.attributes.has(name);
	}

	getAttribute(name: string): string | null {
		return this.attributes.get(name) ?? null;
	}

	getAttributeNames(): string[] {
		return Array.from(this.attributes.keys());
	}

	setAttribute(name: string, value: unknown): void {
		this.fragmentHtml = undefined;
		this.attributes.set(name, String(value));
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
		this.fragmentHtml = undefined;
		this.attributes.delete(name);
	}

	querySelector(): Element | null {
		return null;
	}

	querySelectorAll(): Element[] {
		return [];
	}

	matches(): boolean {
		return false;
	}

	get outerHTML(): string {
		if (this.fragmentHtml !== undefined) {
			return this.fragmentHtml;
		}

		const attributes = Array.from(this.attributes.entries())
			.map(([name, value]) => ` ${name}="${escapeHtmlAttribute(value)}"`)
			.join('');

		return `<${this.localName}${attributes}>${this.innerHTML}</${this.localName}>`;
	}

	get innerHTML(): string {
		return this.childNodes.map((child) => serializeNodeHtml(child)).join('');
	}

	set innerHTML(html: string) {
		this.fragmentHtml = undefined;
		this.fragmentText = undefined;
		this.replaceChildren(...parseHtmlToNodes(html, this.ownerDocument));
	}

	override get textContent(): string {
		return this.fragmentText ?? super.textContent ?? '';
	}

	override set textContent(value: string | null) {
		this.fragmentHtml = undefined;
		this.fragmentText = value ?? '';
		super.textContent = value;
	}

	setSerializedFragment(fragmentHtml: string, fragmentText: string, attributes: Record<string, string>): void {
		this.fragmentHtml = fragmentHtml;
		this.fragmentText = fragmentText;
		this.attributes = new Map(Object.entries(attributes));
		this.replaceChildren();
	}
}

class MinimalEvent {
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

class MinimalCustomEvent<T = unknown> extends MinimalEvent {
	public readonly detail: T;

	constructor(type: string, eventInitDict: CustomEventInit<T> = {}) {
		super(type, eventInitDict);
		this.detail = eventInitDict.detail as T;
	}
}

class MinimalHTMLElement extends MinimalElement {
	public isConnected = false;

	constructor(tagName = 'div', ownerDocument: Document | null = getInstalledDocumentLike()) {
		super(tagName, ownerDocument);
	}

	insertAdjacentHTML(_position: InsertPosition, html: string): void {
		this.append(...parseHtmlToNodes(html, this.ownerDocument));
	}

	connectedCallback?(): void;
	attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
	disconnectedCallback?(): void;
}

class MinimalHtmlScriptElement extends MinimalHTMLElement {
	constructor(ownerDocument: Document | null = getInstalledDocumentLike()) {
		super('script', ownerDocument);
	}
}

class MinimalDocument extends MinimalNode {
	constructor() {
		super(MinimalNode.DOCUMENT_NODE);
	}

	createElement(tagName: string): HTMLElement {
		return (tagName.toLowerCase() === 'script'
			? new MinimalHtmlScriptElement(this as unknown as Document)
			: new MinimalHTMLElement(tagName, this as unknown as Document)) as unknown as HTMLElement;
	}

	createTextNode(value: string): Text {
		return new MinimalTextNode(value, this as unknown as Document) as unknown as Text;
	}

	querySelector(): Element | null {
		return null;
	}

	querySelectorAll(): Element[] {
		return [];
	}
}

class MinimalCustomElementsRegistry implements MinimalCustomElementRegistry {
	private definitions = new Map<string, CustomElementConstructor>();

	define(name: string, constructor: CustomElementConstructor): void {
		if (this.definitions.has(name)) {
			return;
		}

		this.definitions.set(name, constructor);
	}

	get(name: string): CustomElementConstructor | undefined {
		return this.definitions.get(name);
	}
}

let installedWindow: LightDomShimWindow | undefined;

const minimalCssNamespace: MinimalCssNamespace = {
	escape(value: string): string {
		return escapeCssIdentifier(String(value));
	},
};

function createTextNode(value: string): Node {
	return new MinimalTextNode(value, getInstalledDocumentLike()) as unknown as Node;
}

function getInstalledDocumentLike(): Document | null {
	return ((globalThis as typeof globalThis & { document?: Document }).document ?? null) as Document | null;
}

function getExistingWindowLike(): LightDomShimWindow | undefined {
	const globalScope = globalThis as typeof globalThis & {
		CSS?: MinimalCssNamespace;
		CustomEvent?: typeof CustomEvent;
		Document?: typeof Document;
		Element?: typeof Element;
		Event?: typeof Event;
		EventTarget?: typeof EventTarget;
		HTMLScriptElement?: typeof HTMLScriptElement;
		HTMLElement?: typeof HTMLElement;
		Node?: typeof Node;
		document?: Document;
		customElements?: MinimalCustomElementRegistry;
		window?: LightDomShimWindow;
	};
	const existingCustomElements = globalScope.customElements;

	if (
		typeof globalScope.Node === 'undefined' ||
		typeof globalScope.Document === 'undefined' ||
		typeof globalScope.Element === 'undefined' ||
		typeof globalScope.HTMLElement === 'undefined' ||
		typeof globalScope.document === 'undefined' ||
		!existingCustomElements ||
		typeof existingCustomElements.define !== 'function' ||
		typeof existingCustomElements.get !== 'function'
	) {
		return undefined;
	}

	return (
		globalScope.window ?? {
			CSS: globalScope.CSS ?? minimalCssNamespace,
			CustomEvent: (globalScope.CustomEvent ?? MinimalCustomEvent) as typeof CustomEvent,
			Document: globalScope.Document,
			Element: globalScope.Element,
			Event: (globalScope.Event ?? MinimalEvent) as typeof Event,
			EventTarget: (globalScope.EventTarget ?? EventTarget) as typeof EventTarget,
			HTMLScriptElement: (globalScope.HTMLScriptElement ?? globalScope.HTMLElement) as typeof HTMLScriptElement,
			HTMLElement: globalScope.HTMLElement,
			Node: globalScope.Node,
			document: globalScope.document,
			customElements: existingCustomElements,
		}
	);
}

/** Ensures that a minimal window-like SSR runtime is available and returns it. */
export function ensureLightDomShim(): LightDomShimWindow {
	const existingWindow = getExistingWindowLike();

	if (existingWindow) {
		return existingWindow;
	}

	return installLightDomShim();
}

/**
 * Creates a reusable SSR environment that can prepare a component host with
 * authored light-DOM content before rendering.
 *
 * Adapters can reuse a single environment across multiple render calls when
 * they want a single host-preparation entrypoint backed by the installed shim.
 */

export function createServerRenderEnvironment(): ServerRenderEnvironment {
	ensureLightDomShim();

	return {
		prepareHost(host: HTMLElement, options: PrepareServerRenderHostOptions = {}): void {
			if (options.authoredContent !== undefined) {
				host.innerHTML = options.authoredContent;
			}
		},
	};
}

/**
 * Installs the smallest global surface needed to instantiate Radiant custom elements during SSR.
 */
export function installLightDomShim(): LightDomShimWindow {
	const existingWindow = getExistingWindowLike();

	if (existingWindow) {
		return existingWindow;
	}

	if (installedWindow) {
		return installedWindow;
	}

	const customElements = new MinimalCustomElementsRegistry();
	const document = new MinimalDocument() as unknown as Document;
	const EventConstructor = (globalThis.Event ?? MinimalEvent) as typeof Event;
	const CustomEventConstructor = (globalThis.CustomEvent ?? MinimalCustomEvent) as typeof CustomEvent;
	const DocumentConstructor = MinimalDocument as unknown as typeof Document;
	const EventTargetConstructor = (globalThis.EventTarget ?? EventTarget) as typeof EventTarget;
	installedWindow = {
		CSS: (globalThis.CSS as MinimalCssNamespace | undefined) ?? minimalCssNamespace,
		CustomEvent: CustomEventConstructor,
		Document: DocumentConstructor,
		Element: MinimalElement as unknown as typeof Element,
		Event: EventConstructor,
		EventTarget: EventTargetConstructor,
		HTMLScriptElement: MinimalHtmlScriptElement as unknown as typeof HTMLScriptElement,
		HTMLElement: MinimalHTMLElement as unknown as typeof HTMLElement,
		Node: MinimalNode as unknown as typeof Node,
		document,
		customElements,
	};

	Object.assign(globalThis, {
		CSS: (globalThis.CSS as MinimalCssNamespace | undefined) ?? minimalCssNamespace,
		CustomEvent: CustomEventConstructor,
		Document: DocumentConstructor,
		Element: MinimalElement,
		Event: EventConstructor,
		EventTarget: EventTargetConstructor,
		HTMLScriptElement: MinimalHtmlScriptElement,
		HTMLElement: MinimalHTMLElement,
		Node: MinimalNode,
		document,
		customElements,
		window: installedWindow,
	});

	return installedWindow;
}

function createElementFromFragment(fragment: string, tag: ParsedHtmlTag, ownerDocument: Document | null): Node {
	const element =
		tag.tagName === 'script'
			? (new MinimalHtmlScriptElement(ownerDocument) as MinimalElement)
			: new MinimalHTMLElement(tag.tagName, ownerDocument);

	element.setSerializedFragment(fragment, extractTextContent(tag.innerHtml), tag.attributes);
	return element as unknown as Node;
}

function escapeHtmlAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractTextContent(html: string): string {
	return html.replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, '');
}

function parseHtmlToNodes(html: string, ownerDocument: Document | null = getInstalledDocumentLike()): Node[] {
	return collectTopLevelHtmlFragments(html).map((fragment) => {
		if (!fragment.startsWith('<')) {
			return new MinimalTextNode(fragment, ownerDocument) as unknown as Node;
		}

		const tag = parseHtmlTagToken(fragment, 0);

		if (!tag || tag.type !== 'open') {
			return new MinimalTextNode(fragment, ownerDocument) as unknown as Node;
		}

		return createElementFromFragment(fragment, tag, ownerDocument);
	});
}

function toDataAttributeName(property: string): string {
	return `data-${property.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

function toDatasetPropertyName(attributeName: string): string {
	return attributeName.replace(/-([a-z])/g, (_match, character: string) => character.toUpperCase());
}

function escapeCssIdentifier(value: string): string {
	let escaped = '';

	for (let index = 0; index < value.length; index += 1) {
		const character = value[index] ?? '';
		const codePoint = character.codePointAt(0) ?? 0;

		if (codePoint === 0) {
			escaped += '\uFFFD';
			continue;
		}

		const isControlCharacter = (codePoint >= 0x0001 && codePoint <= 0x001f) || codePoint === 0x007f;
		const startsWithDigit = index === 0 && codePoint >= 0x0030 && codePoint <= 0x0039;
		const startsWithHyphenDigit =
			index === 1 && codePoint >= 0x0030 && codePoint <= 0x0039 && (value[0] ?? '') === '-';
		const isSingleHyphen = index === 0 && character === '-' && value.length === 1;

		if (isControlCharacter || startsWithDigit || startsWithHyphenDigit) {
			escaped += `\\${codePoint.toString(16)} `;
			continue;
		}

		if (
			codePoint >= 0x0080 ||
			character === '-' ||
			character === '_' ||
			(codePoint >= 0x0030 && codePoint <= 0x0039) ||
			(codePoint >= 0x0041 && codePoint <= 0x005a) ||
			(codePoint >= 0x0061 && codePoint <= 0x007a)
		) {
			escaped += isSingleHyphen ? `\\${character}` : character;
			continue;
		}

		escaped += `\\${character}`;
	}

	return escaped;
}

function serializeNodeHtml(node: Node): string {
	if (node.nodeType === MinimalNode.TEXT_NODE) {
		return node.textContent ?? '';
	}

	return 'outerHTML' in node && typeof node.outerHTML === 'string' ? node.outerHTML : (node.textContent ?? '');
}
