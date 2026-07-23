import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
import { applyRovingTabindex, navigateRovingTabindex } from '../../../lib/roving-tabindex';

export type RuiToolbarProps = {
	label?: string;
	/** When true, only one toggle button in the toolbar can stay pressed at a time. */
	exclusiveToggles?: boolean;
};

/**
 * `<rui-toolbar>` — a container for grouping controls.
 *
 * Implements the APG Toolbar pattern with left/right arrow navigation among
 * focusable descendants.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 * @element rui-toolbar
 */
@customElement('rui-toolbar')
export class RuiToolbar extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) exclusiveToggles: boolean;

	private getItems(): HTMLElement[] {
		return Array.from(
			this.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex]:not([tabindex="-1"])'),
		).filter((el) => !el.hasAttribute('disabled'));
	}

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => applyRovingTabindex(this.getItems(), 0));
	}

	@onEvent({ type: 'keydown', selector: 'button, a[href], input, select, [tabindex]' })
	onKeydown(event: KeyboardEvent): void {
		const items = this.getItems();
		const result = navigateRovingTabindex({
			items,
			current: event.target as HTMLElement,
			key: event.key,
			orientation: 'horizontal',
		});
		if (!result.handled) return;
		event.preventDefault();
	}

	private getToggleButtons(): HTMLButtonElement[] {
		return Array.from(this.querySelectorAll<HTMLButtonElement>('button[data-toggle][aria-pressed]')).filter(
			(button) => !button.disabled,
		);
	}

	@onEvent({ type: 'click', selector: 'button[data-toggle][aria-pressed]' })
	onToggleButtonClick(event: Event): void {
		const button = (event.target as HTMLElement).closest(
			'button[data-toggle][aria-pressed]',
		) as HTMLButtonElement | null;
		if (!button || button.disabled) {
			return;
		}

		const wasPressed = button.getAttribute('aria-pressed') === 'true';

		if (this.exclusiveToggles) {
			for (const toggle of this.getToggleButtons()) {
				toggle.setAttribute('aria-pressed', 'false');
			}

			if (!wasPressed) {
				button.setAttribute('aria-pressed', 'true');
			}
			return;
		}

		button.setAttribute('aria-pressed', String(!wasPressed));
	}

	override render() {
		return (
			<div class="rui-toolbar" role="toolbar" aria-label={this.label || undefined}>
				<slot></slot>
			</div>
		);
	}
}
