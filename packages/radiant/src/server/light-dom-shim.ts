type MinimalCustomElementRegistry = {
	define(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions): void;
	get(name: string): CustomElementConstructor | undefined;
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

type ParsedHtmlTag = {
	attributes: Record<string, string>;
	end: number;
	innerHtml: string;
	selfClosing: boolean;
	tagName: string;
	type: 'open';
};

type ParsedHtmlToken =
	| ParsedHtmlTag
	| {
			end: number;
			type: 'close';
	  }
	| {
			end: number;
			type: 'comment' | 'declaration';
	  };

type MinimalParentNode = Node & ParentNode;

class MinimalNode extends EventTarget {
	static readonly ELEMENT_NODE = 1;
	static readonly TEXT_NODE = 3;

	public childNodes: Node[] = [];
	public parentNode: MinimalParentNode | null = null;

	constructor(public readonly nodeType: number) {
		super();
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
}

class MinimalTextNode extends MinimalNode {
	constructor(private value: string) {
		super(MinimalNode.TEXT_NODE);
	}

	override get textContent(): string {
		return this.value;
	}

	override set textContent(value: string | null) {
		this.value = value ?? '';
	}
}

class MinimalElement extends MinimalNode {
	private attributes = new Map<string, string>();
	private fragmentHtml?: string;
	private fragmentText?: string;

	public readonly localName: string;
	public readonly tagName: string;

	constructor(tagName = 'div') {
		super(MinimalNode.ELEMENT_NODE);
		this.localName = tagName.toLowerCase();
		this.tagName = this.localName.toUpperCase();
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
		this.replaceChildren(...parseHtmlToNodes(html));
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

	constructor(tagName = 'div') {
		super(tagName);
	}

	insertAdjacentHTML(_position: InsertPosition, html: string): void {
		this.append(...parseHtmlToNodes(html));
	}

	connectedCallback?(): void;
	attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
	disconnectedCallback?(): void;
}

class MinimalHtmlScriptElement extends MinimalHTMLElement {
	constructor() {
		super('script');
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

function createTextNode(value: string): Node {
	return new MinimalTextNode(value) as unknown as Node;
}

function getExistingWindowLike(): LightDomShimWindow | undefined {
	const globalScope = globalThis as typeof globalThis & {
		CustomEvent?: typeof CustomEvent;
		Element?: typeof Element;
		Event?: typeof Event;
		EventTarget?: typeof EventTarget;
		HTMLScriptElement?: typeof HTMLScriptElement;
		HTMLElement?: typeof HTMLElement;
		Node?: typeof Node;
		customElements?: MinimalCustomElementRegistry;
		window?: LightDomShimWindow;
	};
	const existingCustomElements = globalScope.customElements;

	if (
		typeof globalScope.Node === 'undefined' ||
		typeof globalScope.Element === 'undefined' ||
		typeof globalScope.HTMLElement === 'undefined' ||
		!existingCustomElements ||
		typeof existingCustomElements.define !== 'function' ||
		typeof existingCustomElements.get !== 'function'
	) {
		return undefined;
	}

	return (
		globalScope.window ?? {
			CustomEvent: (globalScope.CustomEvent ?? MinimalCustomEvent) as typeof CustomEvent,
			Element: globalScope.Element,
			Event: (globalScope.Event ?? MinimalEvent) as typeof Event,
			EventTarget: (globalScope.EventTarget ?? EventTarget) as typeof EventTarget,
			HTMLScriptElement: (globalScope.HTMLScriptElement ?? globalScope.HTMLElement) as typeof HTMLScriptElement,
			HTMLElement: globalScope.HTMLElement,
			Node: globalScope.Node,
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
	const EventConstructor = (globalThis.Event ?? MinimalEvent) as typeof Event;
	const CustomEventConstructor = (globalThis.CustomEvent ?? MinimalCustomEvent) as typeof CustomEvent;
	const EventTargetConstructor = (globalThis.EventTarget ?? EventTarget) as typeof EventTarget;
	installedWindow = {
		CustomEvent: CustomEventConstructor,
		Element: MinimalElement as unknown as typeof Element,
		Event: EventConstructor,
		EventTarget: EventTargetConstructor,
		HTMLScriptElement: MinimalHtmlScriptElement as unknown as typeof HTMLScriptElement,
		HTMLElement: MinimalHTMLElement as unknown as typeof HTMLElement,
		Node: MinimalNode as unknown as typeof Node,
		customElements,
	};

	Object.assign(globalThis, {
		CustomEvent: CustomEventConstructor,
		Element: MinimalElement,
		Event: EventConstructor,
		EventTarget: EventTargetConstructor,
		HTMLScriptElement: MinimalHtmlScriptElement,
		HTMLElement: MinimalHTMLElement,
		Node: MinimalNode,
		customElements,
		window: installedWindow,
	});

	return installedWindow;
}

function collectTopLevelHtmlFragments(html: string): string[] {
	const fragments: string[] = [];
	let index = 0;

	while (index < html.length) {
		const fragmentStart = index;

		if (html.startsWith('<!--', index)) {
			const commentEnd = html.indexOf('-->', index + 4);
			index = commentEnd === -1 ? html.length : commentEnd + 3;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		if (html[index] !== '<') {
			const nextTagIndex = html.indexOf('<', index);
			index = nextTagIndex === -1 ? html.length : nextTagIndex;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		const token = parseHtmlTagToken(html, index);

		if (!token) {
			fragments.push(html.slice(fragmentStart));
			break;
		}

		if (token.type !== 'open' || token.selfClosing || voidElementNames.has(token.tagName)) {
			index = token.end;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		index = token.end;
		let depth = 1;

		while (index < html.length && depth > 0) {
			const nextTagIndex = html.indexOf('<', index);

			if (nextTagIndex === -1) {
				index = html.length;
				break;
			}

			const nestedToken = parseHtmlTagToken(html, nextTagIndex);

			if (!nestedToken) {
				index = html.length;
				break;
			}

			index = nestedToken.end;

			if (nestedToken.type === 'comment' || nestedToken.type === 'declaration') {
				continue;
			}

			if (nestedToken.type === 'open' && !nestedToken.selfClosing && !voidElementNames.has(nestedToken.tagName)) {
				depth += 1;
				continue;
			}

			if (nestedToken.type === 'close') {
				depth -= 1;
			}
		}

		fragments.push(html.slice(fragmentStart, index));
	}

	return fragments.filter((fragment) => fragment !== '');
}

function createElementFromFragment(fragment: string, tag: ParsedHtmlTag): Node {
	const element =
		tag.tagName === 'script'
			? (new MinimalHtmlScriptElement() as MinimalElement)
			: new MinimalHTMLElement(tag.tagName);

	element.setSerializedFragment(fragment, extractTextContent(tag.innerHtml), tag.attributes);
	return element as unknown as Node;
}

function escapeHtmlAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractTextContent(html: string): string {
	return html.replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, '');
}

function findHtmlTagEnd(html: string, startIndex: number): number {
	let quote: '"' | "'" | undefined;

	for (let index = startIndex + 1; index < html.length; index += 1) {
		const character = html[index];

		if (quote) {
			if (character === quote) {
				quote = undefined;
			}
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}

		if (character === '>') {
			return index + 1;
		}
	}

	return html.length;
}

function parseAttributes(rawAttributes: string): Record<string, string> {
	const attributes: Record<string, string> = {};
	const attributePattern = /([:^@A-Za-z0-9_.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;

	for (const match of rawAttributes.matchAll(attributePattern)) {
		const [, name, doubleQuoted, singleQuoted, bareValue] = match;

		if (!name) {
			continue;
		}

		attributes[name] = doubleQuoted ?? singleQuoted ?? bareValue ?? '';
	}

	return attributes;
}

function parseHtmlTagToken(html: string, startIndex: number): ParsedHtmlToken | undefined {
	if (html.startsWith('<!--', startIndex)) {
		const endIndex = html.indexOf('-->', startIndex + 4);
		return {
			end: endIndex === -1 ? html.length : endIndex + 3,
			type: 'comment',
		};
	}

	const endIndex = findHtmlTagEnd(html, startIndex);
	const rawToken = html.slice(startIndex + 1, endIndex - 1).trim();

	if (rawToken === '') {
		return undefined;
	}

	if (rawToken.startsWith('!') || rawToken.startsWith('?')) {
		return {
			end: endIndex,
			type: 'declaration',
		};
	}

	if (rawToken.startsWith('/')) {
		return {
			end: endIndex,
			type: 'close',
		};
	}

	const selfClosing = /\/\s*$/.test(rawToken);
	const tagBody = selfClosing ? rawToken.replace(/\/\s*$/, '').trim() : rawToken;
	const tagName = tagBody.split(/[\s/>]/, 1)[0]?.toLowerCase() ?? '';
	const attributesStart = tagName.length;
	const rawAttributes = tagBody.slice(attributesStart).trim();
	const innerHtml = selfClosing || voidElementNames.has(tagName)
		? ''
		: extractInnerHtmlFragment(html, startIndex, endIndex, tagName);

	return {
		attributes: parseAttributes(rawAttributes),
		end: endIndex,
		innerHtml,
		selfClosing,
		tagName,
		type: 'open',
	};
}

function extractInnerHtmlFragment(html: string, startIndex: number, tagEndIndex: number, tagName: string): string {
	let index = tagEndIndex;
	let depth = 1;

	while (index < html.length && depth > 0) {
		const nextTagIndex = html.indexOf('<', index);

		if (nextTagIndex === -1) {
			return html.slice(tagEndIndex);
		}

		const nextTag = parseHtmlTagToken(html, nextTagIndex);

		if (!nextTag) {
			return html.slice(tagEndIndex);
		}

		if (nextTag.type === 'open' && nextTag.tagName === tagName && !nextTag.selfClosing && !voidElementNames.has(tagName)) {
			depth += 1;
		}

		if (nextTag.type === 'close') {
			const closingName = html.slice(nextTagIndex + 2, nextTag.end - 1).trim().toLowerCase();

			if (closingName === tagName) {
				depth -= 1;

				if (depth === 0) {
					return html.slice(tagEndIndex, nextTagIndex);
				}
			}
		}

		index = nextTag.end;
	}

	return html.slice(tagEndIndex);
}

function parseHtmlToNodes(html: string): Node[] {
	return collectTopLevelHtmlFragments(html).map((fragment) => {
		if (!fragment.startsWith('<')) {
			return createTextNode(fragment);
		}

		const tag = parseHtmlTagToken(fragment, 0);

		if (!tag || tag.type !== 'open') {
			return createTextNode(fragment);
		}

		return createElementFromFragment(fragment, tag);
	});
}

function serializeNodeHtml(node: Node): string {
	if (node.nodeType === MinimalNode.TEXT_NODE) {
		return node.textContent ?? '';
	}

	return 'outerHTML' in node && typeof node.outerHTML === 'string' ? node.outerHTML : node.textContent ?? '';
}

const voidElementNames = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);
