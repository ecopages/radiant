import { RadiantElement, customElement, onEvent, prop } from '@ecopages/radiant';
import { queryRovingTabindexItems } from '@/lib/focusable-elements';
import { applyRovingTabindex, navigateRovingTabindex } from '@/lib/roving-tabindex';

export type RuiToolbarProps = {
	label?: string;
	/** When true, only one toggle button in the toolbar can stay pressed at a time. */
	exclusiveToggles?: boolean;
};

/**
 * `<rui-toolbar>` — horizontal control group with roving keyboard navigation.
 *
 * The custom element is a behavior host: it does not render toolbar chrome. Import
 * the script and place focusable controls as light-DOM descendants, or use
 * `RuiToolbar`, which stamps `[role="toolbar"]`.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - Focusable descendants — `button`, `a[href]`, `input`, `select`, `textarea`, or
 *   `[tabindex]`. Host sets roving `tabIndex` among non-`disabled` matches.
 *
 * Optional:
 * - `button[data-toggle][aria-pressed]` — toggle button. Host toggles `aria-pressed`
 *   on click (capture phase, before child handlers). With `exclusive-toggles`, only
 *   one pressed toggle stays active.
 *
 * Author `disabled` on controls to exclude them from roving focus. Author initial
 * `aria-pressed` on toggles; the host owns updates after click.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 * @element rui-toolbar
 * @attr {string} label - Accessible name for the `role="toolbar"` region.
 * @attr {boolean} exclusive-toggles - Only one toggle button stays pressed at a time. Default: `false`.
 *
 * @remarks
 * The view stamps `[role="toolbar"]` with `data-ref="root"`. Arrow keys navigate
 * among focusable descendants anywhere under `<rui-toolbar>`.
 */
@customElement('rui-toolbar')
export class RuiToolbar extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) exclusiveToggles: boolean;

	private getItems(): HTMLElement[] {
		return queryRovingTabindexItems(this);
	}

	protected override onConnected(): void {
		applyRovingTabindex(this.getItems(), 0);
	}

	@onEvent({ type: 'keydown', selector: 'button, a[href], input, select, [tabindex]' })
	onKeydown(event: KeyboardEvent): void {
		const items = this.getItems();
		const current = (event.target as HTMLElement).closest(
			'button, a[href], input, select, [tabindex]',
		) as HTMLElement | null;
		const result = navigateRovingTabindex({
			items,
			current,
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

	/**
	 * @remarks Capture phase runs ahead of `RuiButton`'s `on:click` toggle handler so this
	 * reads pre-click state and stays the single source of truth for `aria-pressed`.
	 */
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
}
