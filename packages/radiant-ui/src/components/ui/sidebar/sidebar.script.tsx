import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query, state } from '@ecopages/radiant';
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
	/** Controlled open state. */
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

type RuiSidebarBindings = {
	label: string;
};

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
 * The sidebar hosts the pane content in the default slot. When the parent
 * supplies a `RuiSidebarRail` element (or the `collapsible` mode is not
 * `off`), the sidebar manages open/closed state, a focusable resize handle,
 * and keyboard navigation that follows the APG Window Splitter pattern.
 *
 * When `collapsible="off"` (the default), the pane stays open and exposes
 * a draggable resize handle. When `collapsible="icon"`, the pane collapses
 * to a narrow rail. When `collapsible="full"`, the pane is hidden until
 * toggled, and shown as an overlay drawer below the mobile breakpoint.
 *
 * The host reflects `data-state`, `data-collapsible`, `data-variant`,
 * `data-side`, and `data-mobile` so the stylesheet can drive every visual
 * mode without imperative JS.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/
 *
 * @element rui-sidebar
 * @slot - Pane content. Stack header, content, and footer inside.
 * @fires rui-sidebar-toggle - Emitted on every open/closed transition.
 *        `detail` is `{ open, state }`.
 * @fires rui-sidebar-resize - Emitted on every width change. `detail` is `{ width }`.
 * @fires rui-sidebar-mobile-change - Emitted when the host flips between
 *        mobile drawer mode and inline mode. `detail` is `{ mobile: boolean }`.
 */
@customElement('rui-sidebar')
export class RuiSidebar extends RadiantElement<RuiSidebarBindings> {
	@prop({ type: String, reflect: true, defaultValue: 'sidebar' }) variant: RuiSidebarVariant;
	@prop({ type: String, reflect: true, defaultValue: 'left' }) side: RuiSidebarSide;
	@prop({ type: String, reflect: true, defaultValue: 'off' }) collapsible: RuiSidebarCollapsible;
	@prop({ type: Number, defaultValue: DEFAULT_WIDTH }) defaultWidth: number;
	@prop({ type: Number, reflect: true, attribute: 'width' }) width: number | undefined;
	@prop({ type: Number, defaultValue: DEFAULT_MIN_WIDTH }) minWidth: number;
	@prop({ type: Number, defaultValue: DEFAULT_MAX_WIDTH }) maxWidth: number;
	@prop({ type: Boolean, defaultValue: false }) resizable: boolean;
	@prop({ type: Boolean, defaultValue: true }) defaultOpen: boolean;
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

	/**
	 * @remarks Uncontrolled open state is initialized after JSX flushes deferred
	 * property bindings, so `defaultOpen` is sampled once rather than becoming
	 * live state.
	 */
	override connectedCallback(): void {
		super.connectedCallback();

		this.ensureWidthInitialized();

		this.setAttribute('role', 'complementary');
		this.setAttribute('aria-label', this.label);
		this.syncHostAttributes();
		this.attachNavigationListeners();
		queueMicrotask(() => {
			if (this.open === undefined) {
				this.open = this.defaultOpen;
			}

			this.ensureWidthInitialized();
			this.syncHostAttributes();
			this.syncPaneWidthVar();
			this.bindMobileMediaQuery();
			this.syncActiveLinks(this.scrollActiveOnMount);
		});
	}

	override disconnectedCallback(): void {
		this.endDrag();
		this.unbindMobileMediaQuery();
		this.detachNavigationListeners();
		super.disconnectedCallback();
	}

	/**
	 * Keep host `data-*` in sync for `:has(> rui-sidebar[...])` and public API.
	 * Visual styles target the inner `.rui-sidebar` root (host is `display: contents`).
	 */
	private syncHostAttributes(): void {
		const paneState: RuiSidebarState = this.isOpen() ? 'expanded' : 'collapsed';
		this.setAttribute('data-state', paneState);
		this.setAttribute('data-collapsible', this.collapsible);
		this.setAttribute('data-variant', this.variant);
		this.setAttribute('data-side', this.side);
		this.setAttribute('data-mobile', String(this.isMobile));
		this.setAttribute('data-pane-width', String(this.paneWidth()));
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
	])
	onStateUpdated(): void {
		this.syncHostAttributes();
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
	syncActiveLinks(scrollActiveIntoView = false): void {
		if (!this.matchActive || typeof window === 'undefined' || typeof window.location === 'undefined') {
			return;
		}

		const currentPath = window.location.pathname;
		for (const link of this.querySelectorAll<HTMLAnchorElement>(MENU_LINK_SELECTOR)) {
			const active = this.isLinkActive(link, currentPath);
			link.classList.toggle('rui-sidebar__menu-button--active', active);
			if (active) {
				link.setAttribute('aria-current', 'page');
				if (scrollActiveIntoView) {
					link.scrollIntoView({ block: 'nearest' });
				}
			} else {
				link.removeAttribute('aria-current');
			}
		}
	}

	private isLinkActive(link: HTMLAnchorElement, currentPath: string): boolean {
		const linkPath = link.pathname;
		if (this.matchMode === 'prefix') {
			return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
		}
		return linkPath === currentPath;
	}

	private attachNavigationListeners(): void {
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
	 * Leaving mobile while closed with `collapsible="off"` reopens — desktop hides
	 * reopen triggers for that mode, so a closed drawer would otherwise stick at
	 * width 0. Other collapsible modes keep the consumer's open state.
	 */
	private setMobile(next: boolean): void {
		if (next === this.isMobile) return;
		const leavingMobile = this.isMobile && !next;
		this.isMobile = next;
		if (leavingMobile && this.collapsible === 'off' && !this.isOpen()) {
			this.setOpen(true);
		} else {
			this.syncPaneWidthVar();
		}
		this.mobileChangeEvent.emit({ mobile: next });
	}

	private clampWidth(next: number): number {
		return Math.min(this.maxWidth, Math.max(this.minWidth, next));
	}

	private paneWidth(): number {
		if (!this.isOpen()) {
			// Mobile is always a full drawer — never leave an icon rail when closed.
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
			this.syncPaneWidthVar();
			return;
		}
		this.open = next;
		const paneState: RuiSidebarState = next ? 'expanded' : 'collapsed';
		this.setAttribute('data-state', paneState);
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

	@bound
	private onHandlePointerDown(event: Event): void {
		event.preventDefault();
		this.beginDrag(event as PointerEvent);
	}

	@bound
	private onHandleKeydown(event: Event): void {
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

	@bound
	private onScrimClick(): void {
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

	/**
	 * Only the pane's `aria-label` is bound below. `data-state`/`data-collapsible`/
	 * `data-variant`/`data-side`/`data-mobile` and the handle's `aria-value*`/
	 * `aria-orientation` stay plain reads deliberately — this component's open/
	 * close, drag-resize, and mobile-detection paths are the same high-frequency
	 * interactive category where two sibling components in this migration
	 * (tooltip, menu-button) hit real regressions from binding conversion that
	 * weren't fully root-caused. Deferred as a follow-up rather than risking the
	 * same class of bug here under the same review budget.
	 */
	override render() {
		const horizontal = isHorizontalSide(this.side);
		const open = this.isOpen();
		const paneState: RuiSidebarState = open ? 'expanded' : 'collapsed';
		const showHandle = this.resizable && this.collapsible === 'off' && open && !this.isMobile;
		const widthVar = `${this.paneWidth()}px`;
		// Icon rail stays interactive when collapsed on desktop; mobile drawer does not.
		const paneInert = open || (!this.isMobile && this.collapsible === 'icon') ? undefined : '';

		return (
			<div
				class="rui-sidebar"
				style={{ '--rui-sidebar-pane-width': widthVar } as Record<string, string>}
				data-ref="root"
				data-state={paneState}
				data-collapsible={this.collapsible}
				data-variant={this.variant}
				data-side={this.side}
				data-mobile={String(this.isMobile)}
			>
				{/* Scrim first so it stacks under the pane (dialog pattern). */}
				<button
					data-ref="scrim"
					type="button"
					class="rui-sidebar__scrim"
					tabindex={-1}
					aria-label="Close sidebar"
					hidden={!this.isMobile || !open}
					on:click={this.onScrimClick}
				></button>
				<div
					data-ref="pane"
					class="rui-sidebar__pane"
					data-side={this.side}
					data-variant={this.variant}
					aria-label={this.$.label}
					inert={paneInert}
				>
					<slot></slot>
				</div>
				{showHandle ? (
					<div
						data-ref="handle"
						class="rui-sidebar__handle"
						role="separator"
						tabindex={0}
						aria-orientation={horizontal ? 'vertical' : 'horizontal'}
						aria-valuenow={this.paneWidth()}
						aria-valuemin={this.minWidth}
						aria-valuemax={this.maxWidth}
						aria-label={`${this.label} resize handle`}
						on:pointerdown={this.onHandlePointerDown}
						on:keydown={this.onHandleKeydown}
					>
						<span class="rui-sidebar__handle-grip" aria-hidden="true"></span>
					</div>
				) : null}
			</div>
		);
	}
}
