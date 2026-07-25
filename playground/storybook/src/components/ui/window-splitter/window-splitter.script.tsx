import { onUpdated } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { bound } from '@ecopages/radiant/decorators/bound';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { event } from '@ecopages/radiant/decorators/event';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
import { query } from '@ecopages/radiant/decorators/query';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiWindowSplitterProps = {
	/** Primary pane size as a percentage. Default: `50`. */
	value?: number;
	/** Orientation of the split. Default: `horizontal` (left/right panes). */
	orientation?: 'horizontal' | 'vertical';
	label?: string;
};

export type RuiWindowSplitterChangeDetail = { value: number };

/**
 * `<rui-window-splitter>` — a movable separator between two panes.
 *
 * Implements the APG Window Splitter pattern with a focusable separator that
 * adjusts pane size via arrow keys and pointer drag. `value` and `orientation`
 * are reactive props.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/
 * @element rui-window-splitter
 */
@customElement('rui-window-splitter')
export class RuiWindowSplitter extends RadiantElement {
	@prop({ type: Number, reflect: true, defaultValue: 50 }) value: number;
	@prop({ type: String, defaultValue: 'horizontal' }) orientation: NonNullable<RuiWindowSplitterProps['orientation']>;
	@prop({ type: String, defaultValue: 'Split view' }) label: string;

	@query({ ref: 'primary' }) primaryTarget: HTMLElement;
	@query({ ref: 'separator' }) separatorTarget: HTMLElement;

	@event({ name: 'rui-splitter-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiWindowSplitterChangeDetail>;

	private dragging = false;

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.applySize());
	}

	override disconnectedCallback(): void {
		document.removeEventListener('pointermove', this.onPointerMove);
		document.removeEventListener('pointerup', this.onPointerUp);
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'orientation'])
	onPropsUpdated(): void {
		this.applySize();
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

	override render() {
		const horizontal = this.orientation !== 'vertical';
		return (
			<div class={`rui-window-splitter rui-window-splitter--${horizontal ? 'horizontal' : 'vertical'}`}>
				<div data-ref="primary" class="rui-window-splitter__pane">
					<slot name="primary"></slot>
				</div>
				<div
					data-ref="separator"
					class="rui-window-splitter__separator"
					role="separator"
					tabindex={0}
					aria-orientation={horizontal ? 'vertical' : 'horizontal'}
					aria-valuenow={this.value}
					aria-valuemin={20}
					aria-valuemax={80}
					aria-label={this.label}
				></div>
				<div class="rui-window-splitter__pane">
					<slot name="secondary"></slot>
				</div>
			</div>
		);
	}
}
