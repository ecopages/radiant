import { RadiantElement, bound, customElement, onUpdated, prop, state } from '@ecopages/radiant';
import { isServer } from '@ecopages/radiant/is-server';
import { parseCommaSeparated } from '@/lib/comma-separated';
import {
	ensureUniqueHeadingId,
	querySelectorAllSafe,
	querySelectorSafe,
	scrollHeadingIntoView,
	trackingLineY,
} from './toc-helpers';

export type RuiTocProps = {
	/** CSS selector for the content root that contains headings. */
	target?: string;
	/** Selector for headings to include. Default: `h2,h3`. */
	headingSelector?: string;
	/** Visible label above the link list. Default: `On this page`. */
	label?: string;
	/** Pixel offset from the viewport top when tracking the active section. Default: `120`. */
	scrollOffset?: number;
	/**
	 * Extra document event names (comma-separated) that trigger a rebuild, e.g.
	 * `eco:page-load,eco:after-swap`.
	 */
	navigationEvents?: string;
};

type RuiTocEntry = {
	id: string;
	label: string;
	depth: number;
};

type RuiTocBindings = {
	label: string;
};

/**
 * `<rui-toc>` — table of contents that tracks in-page headings and highlights the
 * section currently in view while scrolling.
 *
 * @remarks
 * Resolves the nearest overflow scroll ancestor of the target (not always
 * `window`) so nested layout scrollers — e.g. docs inset content — drive
 * active-section tracking correctly.
 *
 * @element rui-toc
 * @attr {string} target - CSS selector for the content root that contains headings. Default: the parent element.
 * @attr {string} heading-selector - Selector for headings to include. Default: `h2,h3`.
 * @attr {string} label - Visible label above the link list. Default: `On this page`.
 * @attr {number} scroll-offset - Pixel offset from the viewport top when tracking the active section. Default: `120`.
 * @attr {string} navigation-events - Extra document event names (comma-separated) that trigger a rebuild, e.g. `eco:page-load,eco:after-swap`.
 * @cssclass rui-toc - Root `nav` landmark.
 * @cssclass rui-toc__label - Section label above the list.
 * @cssclass rui-toc__list - Link list.
 * @cssclass rui-toc__item - List item.
 * @cssclass rui-toc__item--depth-3 - Indented item for `h3` headings.
 * @cssclass rui-toc__link - Heading jump link.
 * @cssclass rui-toc__link--active - Link for the section currently in view.
 */
@customElement('rui-toc')
export class RuiToc extends RadiantElement<RuiTocBindings> {
	@prop({ type: String, attribute: 'target', defaultValue: '' }) target = '';
	@prop({ type: String, attribute: 'heading-selector', defaultValue: 'h2,h3' }) headingSelector = 'h2,h3';
	@prop({ type: String, defaultValue: 'On this page' }) label = 'On this page';
	@prop({ type: Number, attribute: 'scroll-offset', defaultValue: 120 }) scrollOffset = 120;
	@prop({ type: String, attribute: 'navigation-events', defaultValue: '' }) navigationEvents = '';

	@state private entries: RuiTocEntry[] = [];
	@state private activeId: string | null = null;

	private headings: HTMLElement[] = [];
	private scrollRoot: HTMLElement | Window | null = null;
	private scrollCleanup: (() => void) | null = null;
	private navigationCleanups: Array<() => void> = [];
	private pendingScrollTargetId: string | null = null;
	private scrollRafPending = false;
	private readonly scrollOffsetTolerance = 4;

	private readConfiguredProp(propValue: string, attributeName: string): string {
		return propValue.trim() || this.getAttribute(attributeName)?.trim() || '';
	}

	private readConfiguredNumber(propValue: number, attributeName: string, fallback: number): number {
		if (Number.isFinite(propValue) && propValue !== 0) {
			return propValue;
		}

		const fromAttribute = Number(this.getAttribute(attributeName));
		return Number.isFinite(fromAttribute) ? fromAttribute : fallback;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.attachNavigationListeners();
	}

	protected override onConnected(): void {
		this.rebuild();
	}

	override disconnectedCallback(): void {
		this.detachScrollListener();
		this.detachNavigationListeners();
		super.disconnectedCallback();
	}

	@onUpdated(['target', 'headingSelector', 'scrollOffset', 'navigationEvents'])
	onScanSettingsUpdated(): void {
		this.detachNavigationListeners();
		this.attachNavigationListeners();
		this.rebuild();
	}

	private rebuild(): void {
		this.detachScrollListener();
		this.headings = [];
		this.entries = [];
		this.activeId = null;
		this.pendingScrollTargetId = null;
		this.scrollRoot = null;

		const root = this.resolveTarget();
		if (!root) {
			return;
		}

		const headings = querySelectorAllSafe(
			root,
			this.readConfiguredProp(this.headingSelector, 'heading-selector') || 'h2,h3',
		);
		if (headings.length === 0) {
			return;
		}

		const usedIds = new Set<string>();
		const entries: RuiTocEntry[] = headings.map((heading) => {
			const id = ensureUniqueHeadingId(heading, usedIds);
			return {
				id,
				label: (heading.textContent || '').trim(),
				depth: this.headingDepth(heading),
			};
		});

		this.headings = headings;
		this.entries = entries;
		this.scrollRoot = this.resolveScrollRoot(root);
		this.attachScrollListener();
		this.updateActiveHeading();
	}

	private resolveTarget(): HTMLElement | null {
		const selector = this.readConfiguredProp(this.target, 'target');
		if (selector) {
			return querySelectorSafe(document, selector);
		}
		return this.parentElement;
	}

	private resolvedScrollOffset(): number {
		return this.readConfiguredNumber(this.scrollOffset, 'scroll-offset', 120);
	}

	/**
	 * Nearest ancestor (including the target) that scrolls vertically, else `window`.
	 */
	private resolveScrollRoot(from: HTMLElement): HTMLElement | Window {
		let node: HTMLElement | null = from;
		while (node && node !== document.documentElement && node !== document.body) {
			const overflowY = getComputedStyle(node).overflowY;
			if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
				return node;
			}
			node = node.parentElement;
		}
		return window;
	}

	private headingDepth(heading: HTMLElement): number {
		const level = Number.parseInt(heading.tagName.slice(1), 10);
		return Number.isFinite(level) ? level : 2;
	}

	private attachNavigationListeners(): void {
		if (isServer || !this.isConnected) {
			return;
		}

		const handler = () => this.rebuild();
		for (const eventName of parseCommaSeparated(
			this.readConfiguredProp(this.navigationEvents, 'navigation-events'),
		)) {
			document.addEventListener(eventName, handler);
			this.navigationCleanups.push(() => document.removeEventListener(eventName, handler));
		}
	}

	private detachNavigationListeners(): void {
		for (const cleanup of this.navigationCleanups) {
			cleanup();
		}
		this.navigationCleanups = [];
	}

	private attachScrollListener(): void {
		if (isServer || !this.isConnected) {
			return;
		}

		const onScroll = () => {
			if (this.scrollRafPending) {
				return;
			}
			this.scrollRafPending = true;
			requestAnimationFrame(() => {
				this.updateActiveHeading();
				this.scrollRafPending = false;
			});
		};

		const root = this.scrollRoot ?? window;
		if (root === window) {
			window.addEventListener('scroll', onScroll, { passive: true });
			this.scrollCleanup = () => window.removeEventListener('scroll', onScroll);
			return;
		}

		root.addEventListener('scroll', onScroll, { passive: true });
		this.scrollCleanup = () => root.removeEventListener('scroll', onScroll);
	}

	private detachScrollListener(): void {
		this.scrollCleanup?.();
		this.scrollCleanup = null;
	}

	private isScrollAtBottom(): boolean {
		const root = this.scrollRoot ?? window;
		if (!(root instanceof HTMLElement)) {
			const scrollHeight = document.documentElement.scrollHeight;
			const viewport = window.innerHeight;
			if (scrollHeight <= viewport + 1) {
				return false;
			}
			return window.scrollY + viewport >= scrollHeight - 10;
		}

		if (root.scrollHeight <= root.clientHeight + 1) {
			return false;
		}
		return root.scrollTop + root.clientHeight >= root.scrollHeight - 10;
	}

	private activeLineY(): number {
		return trackingLineY(this.scrollRoot ?? window, this.resolvedScrollOffset() + this.scrollOffsetTolerance);
	}

	private updateActiveHeading(): void {
		if (this.headings.length === 0) {
			return;
		}

		if (this.isScrollAtBottom()) {
			this.pendingScrollTargetId = null;
			const lastId = this.headings[this.headings.length - 1]?.id;
			if (lastId) {
				this.setActiveId(lastId);
			}
			return;
		}

		if (this.pendingScrollTargetId) {
			const pendingHeading = this.findHeadingById(this.pendingScrollTargetId);
			if (!pendingHeading) {
				this.pendingScrollTargetId = null;
			} else if (!this.hasPendingScrollReachedTarget(pendingHeading)) {
				this.setActiveId(this.pendingScrollTargetId);
				return;
			} else {
				this.pendingScrollTargetId = null;
			}
		}

		const lineY = this.activeLineY();
		let activeId: string | null = null;

		for (const heading of this.headings) {
			if (heading.getBoundingClientRect().top <= lineY) {
				activeId = heading.id;
			} else {
				break;
			}
		}

		this.setActiveId(activeId ?? this.headings[0]!.id);
	}

	private setActiveId(id: string): void {
		if (this.activeId === id) {
			return;
		}
		this.activeId = id;
	}

	private findHeadingById(id: string): HTMLElement | null {
		return this.headings.find((heading) => heading.id === id) ?? null;
	}

	private hasPendingScrollReachedTarget(heading: HTMLElement): boolean {
		return heading.getBoundingClientRect().top <= this.activeLineY();
	}

	@bound
	private onLinkClick(event: Event, id: string): void {
		const mouseEvent = event as MouseEvent;
		if (
			mouseEvent.metaKey ||
			mouseEvent.ctrlKey ||
			mouseEvent.shiftKey ||
			mouseEvent.altKey ||
			mouseEvent.button !== 0
		) {
			return;
		}

		const heading = this.findHeadingById(id);
		if (!heading) {
			return;
		}

		event.preventDefault();
		this.pendingScrollTargetId = id;
		this.setActiveId(id);
		this.scrollToHeading(id, heading);
	}

	private scrollToHeading(id: string, heading: HTMLElement): void {
		const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
		window.history.replaceState(
			window.history.state,
			'',
			`${window.location.pathname}${window.location.search}#${id}`,
		);
		scrollHeadingIntoView(heading, this.scrollRoot ?? window, this.resolvedScrollOffset(), behavior);
	}

	override render() {
		if (this.entries.length === 0) {
			return null;
		}

		return (
			<nav class="rui-toc" aria-label={this.$.label}>
				{this.label ? <p class="rui-toc__label">{this.$.label}</p> : null}
				<ul class="rui-toc__list">
					{this.entries.map((entry) => (
						<li class={entry.depth >= 3 ? 'rui-toc__item rui-toc__item--depth-3' : 'rui-toc__item'}>
							<a
								href={`#${entry.id}`}
								class={
									entry.id === this.activeId ? 'rui-toc__link rui-toc__link--active' : 'rui-toc__link'
								}
								on:click={(event: Event) => this.onLinkClick(event, entry.id)}
							>
								{entry.label}
							</a>
						</li>
					))}
				</ul>
			</nav>
		);
	}
}
