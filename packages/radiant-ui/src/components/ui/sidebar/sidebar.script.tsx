import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query, state } from '@ecopages/radiant';
import { isServer } from '@ecopages/radiant/is-server';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { parseCommaSeparated } from '@/lib/comma-separated';

export type RuiSidebarVariant = 'sidebar' | 'inset';
export type RuiSidebarSide = 'left' | 'right';
export type RuiSidebarCollapsible = 'off' | 'icon' | 'full';
export type RuiSidebarState = 'expanded' | 'collapsed';
export type RuiSidebarMatchMode = 'pathname' | 'prefix';

export type RuiSidebarProps = {
	/** Visual treatment. `sidebar` is the default bordered pane; `inset` floats inside a card. Default: `sidebar`. */
	variant?: RuiSidebarVariant;
	/** Which edge the sidebar sits on. Default: `left`. */
	side?: RuiSidebarSide;
	/** Collapse behavior. `off` keeps the pane open; `icon` collapses to an icon rail; `full` collapses fully. Default: `off`. */
	collapsible?: RuiSidebarCollapsible;
	/** Initial open state when uncontrolled. Default: `true`. */
	defaultOpen?: boolean;
	/**
	 * Open state below `mobileBreakpoint` when uncontrolled. Applied on connect
	 * and when the viewport crosses into mobile. Ignored when `open` is set.
	 * Default: `false`.
	 */
	mobileDefaultOpen?: boolean;
	/**
	 * Controlled open state. Viewport crossings do not override this; listen to
	 * `rui-sidebar-mobile-change` if the parent needs to react.
	 */
	open?: boolean;
	/** Initial width in pixels when uncontrolled. Default: `256`. */
	defaultWidth?: number;
	/** Controlled width in pixels. */
	width?: number;
	/** Minimum width in pixels when resizing. Default: `200`. */
	minWidth?: number;
	/** Maximum width in pixels when resizing. Default: `480`. */
	maxWidth?: number;
	/** Show a drag/keyboard resize handle on desktop. Default: `false`. */
	resizable?: boolean;
	/** Hide on viewports below this width. Default: `768`. */
	mobileBreakpoint?: number;
	/** Accessible name announced by the pane landmark and triggers. Default: `Sidebar`. */
	label?: string;
	/**
	 * When `true`, syncs `rui-sidebar__menu-button--active` and `aria-current="page"`
	 * on descendant menu links whose URL matches the current location.
	 */
	matchActive?: boolean;
	/** How link URLs are compared to `location.pathname`. Default: `pathname`. */
	matchMode?: RuiSidebarMatchMode;
	/** Scroll the active link into view on first connect. */
	scrollActiveOnMount?: boolean;
	/**
	 * Comma-separated document event names that re-sync after SPA navigation,
	 * e.g. `eco:page-load,eco:after-swap`.
	 */
	navigationEvents?: string;
};

export type RuiSidebarToggleDetail = { open: boolean; state: RuiSidebarState };
export type RuiSidebarResizeDetail = { width: number };

const DEFAULT_WIDTH = 256;
const ICON_WIDTH = 48;
const DEFAULT_MIN_WIDTH = 200;
const DEFAULT_MAX_WIDTH = 480;
const DEFAULT_MOBILE_BREAKPOINT = 768;
const KEYBOARD_SHORTCUT = 'b';
const KEYBOARD_STEP = 8;
const KEYBOARD_STEP_LARGE = 32;
const MENU_LINK_SELECTOR = 'a.rui-sidebar__menu-button';

function isModifierPressed(event: KeyboardEvent): boolean {
	return event.metaKey || event.ctrlKey;
}

function isMediaQuerySupported(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function isHorizontalSide(side: RuiSidebarSide): boolean {
	return side === 'left' || side === 'right';
}

/**
 * `<rui-sidebar>` — a resizable, collapsible side panel.
 *
 * The custom element is a behavior host: it does not render pane content.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiSidebar*` view helpers which stamp the same targets.
 *
 * When `collapsible="off"` (the default), the pane stays open and exposes
 * a draggable resize handle. When `collapsible="icon"`, the pane collapses
 * to a narrow rail. When `collapsible="full"`, the pane is hidden until
 * toggled, and shown as an overlay drawer below the mobile breakpoint.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="root"]` — inner shell. Host mirrors `data-state`, `data-collapsible`,
 *   `data-variant`, `data-side`, and `data-mobile` on the shell and the host.
 * - `[data-ref="pane"]` — pane landmark. Host sets `aria-label`, `inert`, and
 *   `data-side` / `data-variant`.
 *
 * Optional:
 * - `[data-ref="scrim"]` — mobile overlay dismiss control. Host toggles `hidden`.
 * - `[data-ref="handle"]` — resize handle (`role="separator"`). Host toggles `hidden`
 *   and sets `aria-orientation`, `aria-valuenow` / `min` / `max`, and `aria-label`.
 * - `a.rui-sidebar__menu-button` — menu links. When `matchActive` is set, host
 *   toggles `rui-sidebar__menu-button--active` and `aria-current="page"`.
 *
 * Host-owned on `<rui-sidebar>`: `role="complementary"`, `aria-label`, `data-state`,
 * `data-collapsible`, `data-variant`, `data-side`, `data-mobile`, `data-pane-width`.
 *
 * Do not set `inert` on the pane or `aria-expanded` on the handle — the host owns those.
 *
 * Nested hosts: none. `rui-sidebar-trigger` controls this host via `toggle()`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/
 * @element rui-sidebar
 * @fires rui-sidebar-toggle - Emitted on every open/closed transition; `detail` is `{ open, state }`.
 * @fires rui-sidebar-resize - Emitted on every width change; `detail` is `{ width }`.
 * @fires rui-sidebar-mobile-change - Emitted when the host flips between mobile drawer and inline mode; `detail` is `{ mobile: boolean }`.
 *
 * @remarks
 * Public methods: `toggle()`, `syncActiveLinks()`. BEM classes live on the view helpers.
 */
@customElement('rui-sidebar')
export class RuiSidebar extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: 'sidebar' }) variant: RuiSidebarVariant;
	@prop({ type: String, reflect: true, defaultValue: 'left' }) side: RuiSidebarSide;
	@prop({ type: String, reflect: true, defaultValue: 'off' }) collapsible: RuiSidebarCollapsible;
	@prop({ type: Number, defaultValue: DEFAULT_WIDTH }) defaultWidth: number;
	@prop({ type: Number, reflect: true, attribute: 'width' }) width: number | undefined;
	@prop({ type: Number, defaultValue: DEFAULT_MIN_WIDTH }) minWidth: number;
	@prop({ type: Number, defaultValue: DEFAULT_MAX_WIDTH }) maxWidth: number;
	@prop({ type: Boolean, defaultValue: false }) resizable: boolean;
	@prop({ type: Boolean, defaultValue: true }) defaultOpen: boolean;
	@prop({ type: Boolean, defaultValue: false }) mobileDefaultOpen: boolean;
	@prop({ type: Boolean, attribute: 'open' }) open: boolean | undefined;
	@prop({ type: Number, defaultValue: DEFAULT_MOBILE_BREAKPOINT }) mobileBreakpoint: number;
	@prop({ type: String, defaultValue: 'Sidebar' }) label: string;
	@prop({ type: Boolean, reflect: true, attribute: 'match-active' }) matchActive = false;
	@prop({ type: String, defaultValue: 'pathname' }) matchMode: RuiSidebarMatchMode;
	@prop({ type: Boolean, attribute: 'scroll-active-on-mount' }) scrollActiveOnMount = false;
	@prop({ type: String, attribute: 'navigation-events', defaultValue: '' }) navigationEvents = '';

	@query({ ref: 'root' }) rootTarget: HTMLElement;
	@query({ ref: 'pane' }) paneTarget: HTMLElement;
	@query({ ref: 'handle' }) handleTarget: HTMLElement;
	@query({ ref: 'scrim' }) scrimTarget: HTMLButtonElement;

	@event({ name: 'rui-sidebar-toggle', bubbles: true, composed: true })
	toggleEvent: EventEmitter<RuiSidebarToggleDetail>;

	@event({ name: 'rui-sidebar-resize', bubbles: true, composed: true })
	resizeEvent: EventEmitter<RuiSidebarResizeDetail>;

	@event({ name: 'rui-sidebar-mobile-change', bubbles: true, composed: true })
	mobileChangeEvent: EventEmitter<{ mobile: boolean }>;

	@state isMobile = false;
	private mediaQuery: MediaQueryList | null = null;
	private readonly mediaListener = (event: MediaQueryListEvent): void => this.setMobile(event.matches);

	private dragging = false;
	private dragStartCoord = 0;
	private dragStartSize = 0;
	private navigationCleanups: Array<() => void> = [];

	/** @remarks Remains `false` until a projected active link has been scrolled. */
	private didScrollActiveOnMount = false;

	/**
	 * @remarks Captured once before defaults are applied. `setOpen` later assigns
	 * `open`, which must not be mistaken for a controlled binding.
	 */
	private openControlled = false;

	/**
	 * @remarks Viewport policy must not run until connect has snapshotted
	 * `open` and applied defaults. Deferred JSX props can update
	 * `mobileBreakpoint` before that microtask.
	 */
	private mobileReady = false;

	override connectedCallback(): void {
		super.connectedCallback();

		this.ensureWidthInitialized();

		this.setAttribute('role', 'complementary');
		this.setAttribute('aria-label', this.label);
		this.syncPresentation();
		this.attachNavigationListeners();
	}

	protected override onConnected(): void {
		this.ensureWidthInitialized();
		this.openControlled = this.open !== undefined;
		this.bindMobileMediaQuery();
		if (!this.openControlled) {
			this.open = this.isMobile ? this.mobileDefaultOpen : this.defaultOpen;
		}

		this.syncPresentation();
		this.syncPaneWidthVar();
		this.syncActiveLinksAfterRender(true);
		this.mobileReady = true;
	}

	/**
	 * @remarks Light-DOM hydrate/update can recreate menu links after the connect
	 * microtask sync. Re-apply active classes once the render commits.
	 */
	override hydrate(): void {
		super.hydrate();
		this.syncActiveLinksAfterRender(true);
	}

	override update(): void {
		super.update();
		this.syncActiveLinksAfterRender(false);
	}

	override requestUpdate(): void {
		super.requestUpdate();
		queueMicrotask(() => {
			this.syncActiveLinksAfterRender(false);
		});
	}

	override disconnectedCallback(): void {
		this.endDrag();
		this.unbindMobileMediaQuery();
		this.detachNavigationListeners();
		this.mobileReady = false;
		super.disconnectedCallback();
	}

	private syncActiveLinksAfterRender(allowScrollOnMount: boolean): void {
		const shouldScroll = allowScrollOnMount && this.scrollActiveOnMount && !this.didScrollActiveOnMount;
		this.syncActiveLinks(shouldScroll);
		if (shouldScroll) {
			this.didScrollActiveOnMount = true;
		}
	}

	/**
	 * Keep host and inner shell `data-*` in sync. Host attrs drive
	 * `:has(> rui-sidebar[...])`; inner `.rui-sidebar` drives visual styles.
	 */
	private syncPresentation(): void {
		const horizontal = isHorizontalSide(this.side);
		const open = this.isOpen();
		const paneState: RuiSidebarState = open ? 'expanded' : 'collapsed';
		const showHandle = this.resizable && this.collapsible === 'off' && open && !this.isMobile;
		const paneInert = !(open || (!this.isMobile && this.collapsible === 'icon'));
		const paneWidth = this.paneWidth();

		this.setAttribute('data-state', paneState);
		this.setAttribute('data-collapsible', this.collapsible);
		this.setAttribute('data-variant', this.variant);
		this.setAttribute('data-side', this.side);
		this.setAttribute('data-mobile', String(this.isMobile));
		this.setAttribute('data-pane-width', String(paneWidth));

		const root = this.rootTarget;
		if (root) {
			root.dataset.state = paneState;
			root.dataset.collapsible = this.collapsible;
			root.dataset.variant = this.variant;
			root.dataset.side = this.side;
			root.dataset.mobile = String(this.isMobile);
		}

		const scrim = this.scrimTarget;
		if (scrim) {
			scrim.toggleAttribute('hidden', !(this.isMobile && open));
		}

		const pane = this.paneTarget;
		if (pane) {
			pane.dataset.side = this.side;
			pane.dataset.variant = this.variant;
			pane.setAttribute('aria-label', this.label);
			if (paneInert) {
				pane.setAttribute('inert', '');
			} else {
				pane.removeAttribute('inert');
			}
		}

		const handle = this.handleTarget;
		if (handle) {
			handle.toggleAttribute('hidden', !showHandle);
			if (showHandle) {
				handle.setAttribute('aria-orientation', horizontal ? 'vertical' : 'horizontal');
				handle.setAttribute('aria-valuenow', String(paneWidth));
				handle.setAttribute('aria-valuemin', String(this.minWidth));
				handle.setAttribute('aria-valuemax', String(this.maxWidth));
				handle.setAttribute('aria-label', `${this.label} resize handle`);
			}
		}
	}

	private isOpen(): boolean {
		return this.open !== undefined ? this.open : this.defaultOpen;
	}

	/**
	 * Optional `Number` props initialize to `0` when no attribute/default is set
	 * (`defaultValueForType(Number)`). Treat that unset `0` as “use defaultWidth”.
	 */
	private ensureWidthInitialized(): void {
		if (this.hasAttribute('width')) return;
		if (this.width === undefined || this.width === 0) {
			this.width = this.defaultWidth;
		}
	}

	@onUpdated([
		'open',
		'collapsible',
		'variant',
		'side',
		'width',
		'defaultWidth',
		'defaultOpen',
		'minWidth',
		'maxWidth',
		'isMobile',
		'resizable',
		'label',
	])
	onStateUpdated(): void {
		this.syncPresentation();
		this.syncPaneWidthVar();
	}

	@onUpdated(['mobileBreakpoint'])
	onMobileBreakpointUpdated(): void {
		this.bindMobileMediaQuery();
	}

	@onUpdated(['matchActive', 'matchMode', 'navigationEvents'])
	onMatchSettingsUpdated(): void {
		this.detachNavigationListeners();
		this.attachNavigationListeners();
		this.syncActiveLinks(false);
	}

	/** Re-applies active classes on descendant menu links from the current URL. */
	syncActiveLinks(scrollActiveIntoView = false): boolean {
		if (!this.matchActive || typeof window === 'undefined' || typeof window.location === 'undefined') {
			return false;
		}

		const currentPath = window.location.pathname;
		let didScrollActiveLink = false;
		for (const link of this.querySelectorAll<HTMLAnchorElement>(MENU_LINK_SELECTOR)) {
			const active = this.isLinkActive(link, currentPath);
			link.classList.toggle('rui-sidebar__menu-button--active', active);
			if (active) {
				link.setAttribute('aria-current', 'page');
				if (scrollActiveIntoView && !didScrollActiveLink) {
					link.scrollIntoView({ block: 'nearest' });
					didScrollActiveLink = true;
				}
			} else {
				link.removeAttribute('aria-current');
			}
		}

		return didScrollActiveLink;
	}

	private isLinkActive(link: HTMLAnchorElement, currentPath: string): boolean {
		const linkPath = link.pathname;
		if (this.matchMode === 'prefix') {
			return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
		}
		return linkPath === currentPath;
	}

	private attachNavigationListeners(): void {
		if (isServer || !this.isConnected) {
			return;
		}

		if (!this.matchActive || typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
			return;
		}

		const handler = () => this.syncActiveLinks(false);
		window.addEventListener('popstate', handler);
		this.navigationCleanups.push(() => window.removeEventListener('popstate', handler));

		if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
			for (const eventName of parseCommaSeparated(this.navigationEvents)) {
				document.addEventListener(eventName, handler);
				this.navigationCleanups.push(() => document.removeEventListener(eventName, handler));
			}
		}
	}

	private detachNavigationListeners(): void {
		for (const cleanup of this.navigationCleanups) {
			cleanup();
		}
		this.navigationCleanups = [];
	}

	private unbindMobileMediaQuery(): void {
		this.mediaQuery?.removeEventListener('change', this.mediaListener);
		this.mediaQuery = null;
	}

	private bindMobileMediaQuery(): void {
		this.unbindMobileMediaQuery();

		if (this.mobileBreakpoint <= 0 || !isMediaQuerySupported()) {
			this.setMobile(false);
			return;
		}

		this.mediaQuery = window.matchMedia(`(max-width: ${this.mobileBreakpoint - 1}px)`);
		this.mediaQuery.addEventListener('change', this.mediaListener);
		this.setMobile(this.mediaQuery.matches);
	}

	/**
	 * Flip between mobile drawer and inline layout.
	 *
	 * @remarks
	 * After connect, entering mobile applies `mobileDefaultOpen` so a
	 * desktop-open pane does not become an overlay drawer. Leaving mobile while
	 * closed with `collapsible="off"` reopens — desktop hides reopen triggers for
	 * that mode, so a closed drawer would otherwise stick at width 0. Controlled
	 * `open` is left alone; other collapsible modes keep the consumer's open
	 * state when leaving mobile.
	 */
	private setMobile(next: boolean): void {
		if (next === this.isMobile) return;
		const leavingMobile = this.isMobile && !next;
		const enteringMobile = !this.isMobile && next;
		this.isMobile = next;
		const applyPolicy = this.mobileReady && !this.openControlled;
		if (applyPolicy && leavingMobile && this.collapsible === 'off' && !this.isOpen()) {
			this.setOpen(true);
		} else if (applyPolicy && enteringMobile) {
			this.setOpen(this.mobileDefaultOpen);
		} else {
			this.syncPaneWidthVar();
		}
		this.mobileChangeEvent.emit({ mobile: next });
	}

	private clampWidth(next: number): number {
		return Math.min(this.maxWidth, Math.max(this.minWidth, next));
	}

	/**
	 * @remarks Mobile is always a full drawer — never leave an icon rail when closed.
	 */
	private paneWidth(): number {
		if (!this.isOpen()) {
			if (this.isMobile) return 0;
			return this.collapsible === 'icon' ? ICON_WIDTH : 0;
		}
		const configured = this.width && this.width > 0 ? this.width : this.defaultWidth;
		return configured;
	}

	/** Drive layout through the CSS variable only — never set inline pane width. */
	private syncPaneWidthVar(width = this.paneWidth()): void {
		const root = this.rootTarget;
		if (root) {
			root.style.setProperty('--rui-sidebar-pane-width', `${width}px`);
		}
		if (this.paneTarget) {
			this.paneTarget.style.removeProperty('width');
			this.paneTarget.style.removeProperty('height');
		}
		this.setAttribute('data-pane-width', String(width));
	}

	private applyWidth(next: number, emit: boolean): void {
		const clamped = this.clampWidth(next);
		this.width = clamped;
		this.syncPaneWidthVar(clamped);
		if (emit) {
			this.resizeEvent.emit({ width: clamped });
		}
	}

	toggle(): void {
		this.setOpen(!this.isOpen());
	}

	setOpen(next: boolean): void {
		const wasOpen = this.isOpen();
		if (next === wasOpen) {
			this.syncPresentation();
			this.syncPaneWidthVar();
			return;
		}
		this.open = next;
		const paneState: RuiSidebarState = next ? 'expanded' : 'collapsed';
		this.syncPresentation();
		this.syncPaneWidthVar();
		this.toggleEvent.emit({ open: next, state: paneState });
	}

	private beginDrag(event: PointerEvent): void {
		if (event.button !== 0) return;
		if (this.collapsible !== 'off') return;
		this.dragging = true;
		const horizontal = isHorizontalSide(this.side);
		this.dragStartCoord = horizontal ? event.clientX : event.clientY;
		this.dragStartSize = this.paneWidth();
		this.handleTarget?.setPointerCapture(event.pointerId);
		document.addEventListener('pointermove', this.onPointerMove);
		document.addEventListener('pointerup', this.onPointerUp);
		document.addEventListener('pointercancel', this.onPointerUp);
	}

	private endDrag(): void {
		if (!this.dragging) return;
		this.dragging = false;
		document.removeEventListener('pointermove', this.onPointerMove);
		document.removeEventListener('pointerup', this.onPointerUp);
		document.removeEventListener('pointercancel', this.onPointerUp);
	}

	@bound
	private onPointerMove(event: PointerEvent): void {
		if (!this.dragging) return;
		const horizontal = isHorizontalSide(this.side);
		const coord = horizontal ? event.clientX : event.clientY;
		const delta = this.side === 'right' ? this.dragStartCoord - coord : coord - this.dragStartCoord;
		this.applyWidth(this.dragStartSize + delta, true);
	}

	@bound
	private onPointerUp(): void {
		this.endDrag();
	}

	@onEvent({ ref: 'handle', type: 'pointerdown' })
	onHandlePointerDown(event: Event): void {
		event.preventDefault();
		this.beginDrag(event as PointerEvent);
	}

	@onEvent({ ref: 'handle', type: 'keydown' })
	onHandleKeydown(event: Event): void {
		const keyboardEvent = event as KeyboardEvent;
		const current = this.paneWidth();
		const horizontal = isHorizontalSide(this.side);
		const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
		const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
		let next = current;

		if (keyboardEvent.key === prevKey) {
			next = current - (keyboardEvent.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP);
		} else if (keyboardEvent.key === nextKey) {
			next = current + (keyboardEvent.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP);
		} else if (keyboardEvent.key === 'Home') {
			next = this.minWidth;
		} else if (keyboardEvent.key === 'End') {
			next = this.maxWidth;
		} else {
			return;
		}

		event.preventDefault();
		this.applyWidth(next, true);
	}

	@onEvent({ ref: 'scrim', type: 'click' })
	onScrimClick(): void {
		if (this.isMobile) {
			this.setOpen(false);
		}
	}

	@onEvent({ selector: MENU_LINK_SELECTOR, type: 'click' })
	onMenuLinkClick(): void {
		if (this.isMobile) {
			this.setOpen(false);
		}
	}

	@onEvent({ document: true, type: 'keydown' })
	onHostKeydown(event: Event): void {
		const keyboardEvent = event as KeyboardEvent;
		if (keyboardEvent.key === 'Escape' && this.isMobile && this.isOpen()) {
			keyboardEvent.preventDefault();
			this.setOpen(false);
			return;
		}

		if (isModifierPressed(keyboardEvent) && keyboardEvent.key.toLowerCase() === KEYBOARD_SHORTCUT) {
			keyboardEvent.preventDefault();
			this.toggle();
		}
	}
}
