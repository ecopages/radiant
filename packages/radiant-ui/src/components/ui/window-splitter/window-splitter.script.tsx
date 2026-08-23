import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiWindowSplitterProps = {
	/** Primary pane size as a percentage. Default: `50`. */
	value?: number;
	/** Orientation of the split. Default: `horizontal` (left/right panes). */
	orientation?: 'horizontal' | 'vertical';
	label?: string;
};

export type RuiWindowSplitterChangeDetail = { value: number };

type RuiWindowSplitterBindings = {
	value: number;
	label: string;
	orientation: NonNullable<RuiWindowSplitterProps['orientation']>;
};

/**
 * `<rui-window-splitter>` — a movable separator between two panes.
 *
 * Implements the APG Window Splitter pattern with a focusable separator that
 * adjusts pane size via arrow keys and pointer drag. `value` and `orientation`
 * are reactive props.
 *
 * @summary Resizable two-pane split with keyboard and pointer control.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/
 *
 * @element rui-window-splitter
 *
 * @attr {number} value - Primary pane size as a percentage (clamped 20–80). Default: `50`.
 * @attr {('horizontal'|'vertical')} orientation - Split axis. Default: `horizontal`.
 * @attr {string} label - Accessible name for the separator. Default: `Split view`.
 *
 * @fires rui-splitter-change - Emitted with `{ value }` when the separator moves.
 *
 * @cssclass rui-window-splitter - Root surface.
 * @cssclass rui-window-splitter--horizontal - Side-by-side panes.
 * @cssclass rui-window-splitter--vertical - Stacked panes.
 * @cssclass rui-window-splitter__pane - A pane region.
 * @cssclass rui-window-splitter__separator - Focusable separator (`role="separator"`).
 */
@customElement('rui-window-splitter')
export class RuiWindowSplitter extends RadiantElement<RuiWindowSplitterBindings> {
	@prop({ type: Number, reflect: true, defaultValue: 50 }) value: number;
	@prop({ type: String, defaultValue: 'horizontal' }) orientation: NonNullable<RuiWindowSplitterProps['orientation']>;
	@prop({ type: String, defaultValue: 'Split view' }) label: string;

	@query({ ref: 'primary' }) primaryTarget: HTMLElement;
	@query({ ref: 'separator' }) separatorTarget: HTMLElement;

	@event({ name: 'rui-splitter-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiWindowSplitterChangeDetail>;

	private dragging = false;

	protected override onConnected(): void {
		this.syncSeparatorPresentation();
		this.applySize();
	}

	override disconnectedCallback(): void {
		document.removeEventListener('pointermove', this.onPointerMove);
		document.removeEventListener('pointerup', this.onPointerUp);
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'orientation', 'label'])
	onPropsUpdated(): void {
		this.syncSeparatorPresentation();
		this.applySize();
	}

	private syncSeparatorPresentation(): void {
		const separator = this.separatorTarget;
		const root = this.querySelector<HTMLElement>('[data-ref="root"]');
		if (!separator || !root) {
			return;
		}

		const horizontal = this.orientation !== 'vertical';
		root.classList.toggle('rui-window-splitter--horizontal', horizontal);
		root.classList.toggle('rui-window-splitter--vertical', !horizontal);
		separator.setAttribute('aria-orientation', horizontal ? 'vertical' : 'horizontal');
		separator.setAttribute('aria-valuenow', String(this.value));
		separator.setAttribute('aria-valuemin', '20');
		separator.setAttribute('aria-valuemax', '80');
		separator.setAttribute('aria-label', this.label);
	}

	private applySize(): void {
		if (!this.primaryTarget) return;
		const size = `${Math.min(80, Math.max(20, this.value))}%`;
		if (this.orientation === 'vertical') {
			this.primaryTarget.style.height = size;
			this.primaryTarget.style.width = '';
		} else {
			this.primaryTarget.style.width = size;
			this.primaryTarget.style.height = '';
		}
	}

	@onEvent({ ref: 'separator', type: 'keydown' })
	onKeydown(event: KeyboardEvent): void {
		const delta = event.shiftKey ? 10 : 2;
		const horizontal = this.orientation !== 'vertical';
		if ((horizontal && event.key === 'ArrowLeft') || (!horizontal && event.key === 'ArrowUp')) {
			event.preventDefault();
			this.updateValue(Math.max(20, this.value - delta));
		} else if ((horizontal && event.key === 'ArrowRight') || (!horizontal && event.key === 'ArrowDown')) {
			event.preventDefault();
			this.updateValue(Math.min(80, this.value + delta));
		} else if (event.key === 'Home') {
			event.preventDefault();
			this.updateValue(20);
		} else if (event.key === 'End') {
			event.preventDefault();
			this.updateValue(80);
		}
	}

	private updateValue(next: number): void {
		if (next === this.value) return;
		this.value = next;
		this.changeEvent.emit({ value: next });
	}

	@onEvent({ ref: 'separator', type: 'pointerdown' })
	onPointerDown(event: PointerEvent): void {
		this.dragging = true;
		this.separatorTarget.setPointerCapture(event.pointerId);
		document.addEventListener('pointermove', this.onPointerMove);
		document.addEventListener('pointerup', this.onPointerUp);
	}

	@bound
	onPointerMove(event: PointerEvent): void {
		if (!this.dragging) return;
		const rect = this.getBoundingClientRect();
		if (this.orientation === 'vertical') {
			this.updateValue(Math.min(80, Math.max(20, ((event.clientY - rect.top) / rect.height) * 100)));
		} else {
			this.updateValue(Math.min(80, Math.max(20, ((event.clientX - rect.left) / rect.width) * 100)));
		}
	}

	@bound
	onPointerUp(): void {
		this.dragging = false;
		document.removeEventListener('pointermove', this.onPointerMove);
		document.removeEventListener('pointerup', this.onPointerUp);
	}
}
