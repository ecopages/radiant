import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { BurgerEvents } from '@/components/burger/burger.events';

/**
 * Sidebar navigation element that highlights the active nav link based on the
 * current page path and toggles visibility in response to burger-menu events.
 */
@customElement('radiant-navigation')
export class RadiantCounter extends RadiantElement {
	override connectedCallback(): void {
		super.connectedCallback();
		this.highlightActiveLink({ scrollToActiveLink: true });
	}

	@onEvent({ document: true, type: 'eco:page-load' })
	onPageLoad(): void {
		this.highlightActiveLink();
	}

	@onEvent({ document: true, type: 'eco:after-swap' })
	onAfterSwap(): void {
		this.highlightActiveLink();
	}

	/**
	 * Marks the nav link whose `pathname` matches the current page as active,
	 * removing the class from all other links.
	 *
	 * @param options.scrollToActiveLink - When `true`, scrolls the active link
	 *   into view so it is visible in the sidebar without manual scrolling.
	 */
	highlightActiveLink(options?: { scrollToActiveLink?: boolean }): void {
		const links = this.querySelectorAll<HTMLAnchorElement>('[data-nav-link]');
		const currentPath = window.location.pathname;
		const shouldScroll = options?.scrollToActiveLink ?? false;

		links.forEach((link) => {
			if (link.pathname === currentPath) {
				link.classList.add('active');
				if (shouldScroll) {
					link.scrollIntoView({ block: 'nearest' });
				}
			} else {
				link.classList.remove('active');
			}
		});
	}

	@onEvent({ window: true, type: BurgerEvents.TOGGLE_MENU })
	toggleNavigation(): void {
		this.classList.toggle('hidden');
	}

	@onEvent({ window: true, type: BurgerEvents.CLOSE_MENU })
	closeNavigation(): void {
		this.classList.add('hidden');
	}
}

/**
 * Previous / Next pagination element that renders navigation links from the
 * ordered list of nav links found inside `radiant-navigation`.
 */
@customElement('radiant-docs-pagination')
export class RadiantDocsPagination extends RadiantElement {
	@onEvent({ document: true, type: 'eco:page-load' })
	onPageLoad(): void {
		this.requestUpdate();
	}

	@onEvent({ document: true, type: 'eco:after-swap' })
	onAfterSwap(): void {
		this.requestUpdate();
	}

	private getPaginationLinks() {
		const nav = document.querySelector('radiant-navigation');
		if (!nav) {
			return null;
		}

		const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));
		const currentPath = window.location.pathname;
		const currentIndex = links.findIndex((link) => link.pathname === currentPath);

		if (currentIndex === -1) {
			return null;
		}

		return {
			prevLink: currentIndex > 0 ? links[currentIndex - 1] : null,
			nextLink: currentIndex < links.length - 1 ? links[currentIndex + 1] : null,
		};
	}

	override render() {
		const paginationLinks = this.getPaginationLinks();
		if (!paginationLinks) {
			return null;
		}

		const { prevLink, nextLink } = paginationLinks;
		const prevTitle = prevLink?.textContent?.trim() || '';
		const nextTitle = nextLink?.textContent?.trim() || '';

		return (
			<>
				{prevLink ? (
					<a href={prevLink.pathname} class="group prev" aria-label={prevTitle}>
						<span class="pagination-label" aria-hidden="true">
							Previous
						</span>
						<span class="pagination-title">{prevTitle}</span>
					</a>
				) : (
					<div></div>
				)}
				{nextLink ? (
					<a href={nextLink.pathname} class="group next" aria-label={nextTitle}>
						<span class="pagination-label" aria-hidden="true">
							Next
						</span>
						<span class="pagination-title">{nextTitle}</span>
					</a>
				) : null}
			</>
		);
	}
}

/**
 * Table of Contents element that dynamically builds a `<ul>` of in-page
 * heading anchors and highlights the currently visible section as the user
 * scrolls.
 */
@customElement('radiant-toc')
export class RadiantToc extends RadiantElement {
	private observer: IntersectionObserver | null = null;
	private pendingScrollTargetId: string | null = null;
	private readonly scrollOffset = 120;
	private readonly scrollOffsetTolerance = 4;

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderToc();
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.observer?.disconnect();
	}

	@onEvent({ document: true, type: 'eco:page-load' })
	onPageLoad(): void {
		this.renderToc();
	}

	@onEvent({ document: true, type: 'eco:after-swap' })
	onAfterSwap(): void {
		this.renderToc();
	}

	/**
	 * Queries all `h2` / `h3` headings inside `.docs-layout__content`, builds
	 * the TOC markup, injects it into this element, and wires up the scroll
	 * observer via {@link setupObserver}.
	 *
	 * Auto-generates an `id` from the heading text when one is absent.
	 */
	renderToc(): void {
		const content = document.querySelector('.docs-layout__content');
		if (!content) return;

		const headings = Array.from(content.querySelectorAll<HTMLElement>('h2, h3'));
		if (headings.length === 0) {
			this.innerHTML = '';
			return;
		}

		let html = '<h3>On this page</h3><ul>';

		headings.forEach((heading) => {
			if (!heading.id) {
				heading.id = (heading.textContent || '')
					.trim()
					.toLowerCase()
					.replace(/\s+/g, '-')
					.replace(/[^\w-]/g, '');
			}

			const isH3 = heading.tagName.toLowerCase() === 'h3';
			const label = (heading.textContent || '').trim();
			html += `
                <li>
                    <a href="#${heading.id}" data-toc-link="${heading.id}" class="${isH3 ? 'toc-depth-3' : ''}" safe>
                        ${label}
                    </a>
                </li>
            `;
		});

		html += '</ul>';
		this.innerHTML = html;

		this.setupObserver(headings);
	}

	private scrollToHeading(id: string, heading: HTMLElement): void {
		const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

		window.history.replaceState(
			window.history.state,
			'',
			`${window.location.pathname}${window.location.search}#${id}`,
		);
		heading.scrollIntoView({ behavior, block: 'start' });
	}

	private hasPendingScrollReachedTarget(heading: HTMLElement): boolean {
		return heading.getBoundingClientRect().top <= this.scrollOffset + this.scrollOffsetTolerance;
	}

	/**
	 * Attaches a scroll-position-based active-heading tracker to the window.
	 *
	 * The active heading is the last one whose top edge is at or above `OFFSET`
	 * pixels from the viewport top. When the page cannot scroll further (bottom
	 * of page), the last heading is force-activated — this handles the "dead
	 * zone" that an `IntersectionObserver` with a bottom `rootMargin` cannot
	 * reliably address.
	 *
	 * The raw scroll listener is throttled via `requestAnimationFrame` and
	 * stored on `this.observer` (cast as an `IntersectionObserver` shim) so
	 * that both `disconnectedCallback` and the next `renderToc` call can
	 * cleanly remove it via `observer.disconnect()`.
	 *
	 * @param headings - Ordered list of heading elements to track.
	 */
	setupObserver(headings: HTMLElement[]): void {
		this.observer?.disconnect();
		this.observer = null;

		const tocLinks = this.querySelectorAll<HTMLAnchorElement>('[data-toc-link]');
		let currentActiveId: string | null = null;
		let rafPending = false;

		const setActive = (id: string) => {
			if (id === currentActiveId) return;
			currentActiveId = id;
			tocLinks.forEach((link) => {
				link.classList.toggle('toc-active', link.getAttribute('data-toc-link') === id);
			});
		};

		const findHeadingById = (id: string) => headings.find((heading) => heading.id === id) ?? null;

		const updateActive = () => {
			if (headings.length === 0) return;

			const isAtBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10;

			if (isAtBottom) {
				this.pendingScrollTargetId = null;
				const lastId = headings[headings.length - 1].id;
				if (lastId) setActive(lastId);
				return;
			}

			if (this.pendingScrollTargetId) {
				const pendingHeading = findHeadingById(this.pendingScrollTargetId);
				if (!pendingHeading) {
					this.pendingScrollTargetId = null;
				} else if (!this.hasPendingScrollReachedTarget(pendingHeading)) {
					setActive(this.pendingScrollTargetId);
					return;
				} else {
					this.pendingScrollTargetId = null;
				}
			}

			let activeId: string | null = null;
			for (const heading of headings) {
				if (heading.getBoundingClientRect().top <= this.scrollOffset + this.scrollOffsetTolerance) {
					activeId = heading.id;
				} else {
					break;
				}
			}

			if (activeId) setActive(activeId);
		};

		/**
		 * Immediately highlights the clicked TOC link without waiting for the
		 * next scroll event to fire.
		 */
		tocLinks.forEach((link) => {
			link.addEventListener('click', (event) => {
				if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
					return;
				}

				const id = link.getAttribute('data-toc-link');
				if (!id) return;

				const heading = findHeadingById(id);
				if (!heading) return;

				event.preventDefault();
				this.pendingScrollTargetId = id;
				setActive(id);
				this.scrollToHeading(id, heading);
			});
		});

		const onScroll = () => {
			if (rafPending) return;
			rafPending = true;
			requestAnimationFrame(() => {
				updateActive();
				rafPending = false;
			});
		};

		window.addEventListener('scroll', onScroll, { passive: true });

		/**
		 * Store cleanup on the observer slot so `disconnectedCallback` and the
		 * next `renderToc` call can both remove the scroll listener via
		 * `observer.disconnect()`.
		 */
		this.observer = {
			disconnect: () => window.removeEventListener('scroll', onScroll),
			observe: () => {},
			unobserve: () => {},
			takeRecords: () => [],
			root: null,
			rootMargin: '',
			thresholds: [],
		};

		/** Run immediately so a heading is always highlighted on first render. */
		updateActive();
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-navigation': JsxCustomElementAttributes<RadiantCounter>;
		'radiant-docs-pagination': JsxCustomElementAttributes<RadiantDocsPagination>;
		'radiant-toc': JsxCustomElementAttributes<RadiantToc>;
	}
}
