import { RadiantElement, customElement, onEvent, prop } from '@ecopages/radiant';
import { queryFocusableCandidates } from '../../../lib/focusable-elements';
import { applyRovingTabindex, navigateRovingTabindex } from '../../../lib/roving-tabindex';

export type RuiToolbarProps = {
	label?: string;
	/** When true, only one toggle button in the toolbar can stay pressed at a time. */
	exclusiveToggles?: boolean;
};

type RuiToolbarBindings = {
	label: string;
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
export class RuiToolbar extends RadiantElement<RuiToolbarBindings> {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) exclusiveToggles: boolean;

	private readonly resolvedAriaLabel = this.$.label.map((label) => label || undefined);

	private getItems(): HTMLElement[] {
		return queryFocusableCandidates(this);
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

	// Captures ahead of the button's own inline toggle handler (see `RuiButton`'s
	// `on:click`) so this reads pre-click state and stays the single source of truth
	// for `aria-pressed` when a toggle button lives in a toolbar.
	@onEvent({ type: 'click', selector: 'button[data-toggle][aria-pressed]', options: { capture: true } })
	onToggleButtonClick(event: Event): void {
		const button = (event.target as HTMLElement).closest(
			'button[data-toggle][aria-pressed]',
		) as HTMLButtonElement | null;
		if (!button || button.disabled) {
			return;
		}

		event.stopImmediatePropagation();

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
			<div class="rui-toolbar" role="toolbar" aria-label={this.resolvedAriaLabel}>
				<slot></slot>
			</div>
		);
	}
}
