import { hasHydrationMarkers, hydrate as hydrateJsx, render as renderJsx, type JsxRenderable } from '@ecopages/jsx';
import { isMinimalDomElement } from './minimal-dom-identity';
import { areJsxDevWarningsEnabled } from '../helpers/dev-warnings';
import {
	createReactiveComputed,
	createReactiveWatcher,
	type ReactiveComputed,
	type ReactiveWatcher,
} from './reactivity-adapter';
import {
	captureSlottedNodes,
	collectAuthoredHydrationScriptMarkup,
	createSlottedBounds,
	projectForeignSlotted,
	serializeSlottedMarkup,
	takeServerSlotted,
	type ForeignSlottedProjector,
} from './slotted-content';

export type RenderRuntimeHost = HTMLElement & {
	render(): JsxRenderable;
	requestUpdate(): void;
};

/**
 * Owns a render-owning host's render and its slotted content.
 *
 * @remarks Slotted content has one of two sources. A host that a JSX view creates receives the view's children on
 * every render ({@link setSlotted}). Any other host captures its child nodes once, at first render, or adopts the
 * slotted content the server rendered for it; nodes appended to the host later are not slotted.
 */
export class RenderRuntime {
	#host: RenderRuntimeHost;
	#slotted: JsxRenderable = null;
	#hasViewSlotted = false;
	#capturedSlotted = false;
	#slottedBounds?: [Text, Text];
	#renderSignal?: ReactiveComputed<JsxRenderable>;
	readonly #renderWatcher: ReactiveWatcher;
	#hasMounted = false;

	constructor(host: RenderRuntimeHost) {
		this.#host = host;
		this.#renderWatcher = createReactiveWatcher(() => {
			this.#host.requestUpdate();
		});
	}

	/**
	 * @remarks True after the first client `hydrate`/`render` into this host. Used to avoid re-hydrating across
	 * disconnect/reconnect when SSR markers may still remain under slotted light-DOM content.
	 */
	get hasMounted(): boolean {
		return this.#hasMounted;
	}

	/** Whether the host slots child nodes it captured, rather than children a view passes. */
	get hasCapturedSlotted(): boolean {
		this.ensureSlotted();
		return this.#capturedSlotted && !isEmptySlotted(this.#slotted);
	}

	/**
	 * The host's slotted content for its view, or `null` when there is none.
	 *
	 * @remarks While connected, the content is wrapped in two empty text nodes this runtime keeps, so
	 * {@link getSlottedElements} can find what it rendered to; place it once per render. On the server, captured
	 * content is wrapped in the comments the client adopts it by (see {@link takeServerSlotted}), and content a view
	 * passed is returned as it is; {@link projectForeignSlotted} finds the entries of either.
	 */
	getSlotted(): JsxRenderable {
		this.ensureSlotted();

		if (isEmptySlotted(this.#slotted)) {
			return null;
		}

		if (!this.#host.isConnected) {
			if (!this.#capturedSlotted) return this.#slotted;
			const [start, end] = createSlottedBounds();
			return [start, this.#slotted, end];
		}

		const [start, end] = (this.#slottedBounds ??= [document.createTextNode(''), document.createTextNode('')]);
		return [start, this.#slotted, end];
	}

	/** The top-level elements the slotted content rendered to; empty before the first client render. */
	getSlottedElements<T extends Element = Element>(): T[] {
		const elements: T[] = [];
		const [start, end] = this.#slottedBounds ?? [];

		for (let node = start?.nextSibling; node && node !== end; node = node.nextSibling) {
			if (node instanceof Element) elements.push(node as T);
		}

		return elements;
	}

	/**
	 * The markup of the host's captured slotted content, for a server render whose view did not place it, or
	 * `undefined` when the host captured nothing.
	 */
	getSlottedMarkup(): string | undefined {
		this.ensureSlotted();
		if (!this.#capturedSlotted) return undefined;
		return Array.isArray(this.#slotted) ? serializeSlottedMarkup(this.#slotted) : '';
	}

	getAuthoredHydrationScriptMarkup(): string | undefined {
		return collectAuthoredHydrationScriptMarkup(this.#host) ?? undefined;
	}

	hydrate(renderTarget: HTMLElement): void {
		this.commit(hydrateJsx, renderTarget);
	}

	render(renderTarget: HTMLElement): void {
		this.commit(renderJsx, renderTarget);
	}

	holdsSlotted(value: JsxRenderable): boolean {
		return this.#hasViewSlotted && this.#slotted === value;
	}

	/** Makes `value` the host's slotted content, as a JSX view passed it. From then on the host captures nothing. */
	setSlotted(value: JsxRenderable): void {
		this.#hasViewSlotted = true;
		this.#capturedSlotted = false;
		this.#slotted = value;
	}

	disconnectRenderWatcher(): void {
		if (!this.#renderSignal) {
			return;
		}

		this.#renderWatcher.unwatch(this.#renderSignal);
		this.#renderSignal = undefined;
	}

	/**
	 * @param projectForeign Passed by the server only; see {@link projectForeignSlotted}.
	 * @remarks Captures slotted content before every render, even one whose view does not place it yet, so a host
	 * that shows its content only later still takes the child nodes or server content it held at first render.
	 */
	resolveTrackedRenderOutput(projectForeign?: ForeignSlottedProjector): { value: JsxRenderable } {
		this.ensureSlotted();
		const nextRenderSignal = createReactiveComputed(() => {
			const value = this.#host.render();
			return projectForeign ? projectForeignSlotted(value, this.getSlotted(), projectForeign) : value;
		});
		const value = nextRenderSignal.get();

		if (this.#host.isConnected) {
			if (this.#renderSignal) {
				this.#renderWatcher.unwatch(this.#renderSignal);
			}

			this.#renderSignal = nextRenderSignal;
			this.#renderWatcher.watch(nextRenderSignal);
		}

		return { value };
	}

	dispose(): void {
		this.disconnectRenderWatcher();
	}

	/**
	 * Captures the host's child nodes as its slotted content once, before its first render.
	 *
	 * @remarks Prefers the slotted content the server rendered for the host ({@link takeServerSlotted}), whose nodes
	 * are adopted where they are. Otherwise child nodes count as slotted content only while `#hasMounted` is false:
	 * after the first render they are the host's own output. A server-rendered host also holds its markup while the
	 * flag is false, so {@link hasHydrationMarkers} skips capture on the client; in the minimal SSR DOM the children
	 * are authored and carry no markers yet. A host whose view passed its children before its first render removes
	 * the server's comments or template unread: the view's children replace that content.
	 */
	private ensureSlotted(): void {
		if (this.#hasViewSlotted && !this.#hasMounted && this.#host.isConnected) {
			takeServerSlotted(this.#host);
		}

		if (this.#hasViewSlotted || this.#capturedSlotted) {
			return;
		}

		const serverSlotted = this.#host.isConnected && !this.#hasMounted ? takeServerSlotted(this.#host) : undefined;

		if (serverSlotted) {
			this.#slotted = serverSlotted;
			this.#capturedSlotted = true;
			return;
		}

		if (this.holdsAuthoredChildNodes()) {
			try {
				if (process.env.NODE_ENV !== 'production' && areJsxDevWarningsEnabled()) {
					warnLateDefinition(this.#host);
				}
			} catch {}

			this.#slotted = captureSlottedNodes(this.#host);
			this.#capturedSlotted = true;
		}
	}

	/** Whether the host's child nodes are still authored, not its own output: see {@link ensureSlotted}. */
	private holdsAuthoredChildNodes(): boolean {
		return (
			!this.#hasMounted &&
			this.#host.childNodes.length > 0 &&
			(isMinimalDomElement(this.#host) || !hasHydrationMarkers(this.#host))
		);
	}

	private commit(mount: (value: JsxRenderable, target: HTMLElement) => void, renderTarget: HTMLElement): void {
		try {
			mount(this.resolveTrackedRenderOutput().value, renderTarget);
		} finally {
			this.#hasMounted = true;
		}
	}
}

function isEmptySlotted(value: JsxRenderable): boolean {
	return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

const issuedWarnings = new Set<string>();

/**
 * @remarks
 * Development-only: callers wrap the call in `try { if (process.env.NODE_ENV !== 'production') { ... } } catch {}`,
 * so the app's bundler drops it in production and a page without `process` does not throw (see the package README).
 */
function warnOnce(host: HTMLElement, message: string): void {
	const warning = `[@ecopages/radiant] <${host.localName}> ${message}`;

	if (!issuedWarnings.has(warning)) {
		issuedWarnings.add(warning);
		console.warn(warning);
	}
}

/**
 * @remarks A JSX renderer leaves empty text nodes around the ranges it owns, and the HTML parser never creates one, so
 * finding one at capture means a view rendered the children before the tag was defined. The server's light DOM is
 * skipped: it builds an empty text node for an empty string child.
 */
function warnLateDefinition(host: HTMLElement): void {
	if (
		!isMinimalDomElement(host) &&
		Array.from(host.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && !node.textContent)
	) {
		warnOnce(host, 'was defined after a JSX view rendered it, so it slots its children as captured nodes.');
	}
}
