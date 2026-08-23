import { RadiantElement, customElement, onEvent, prop } from '@ecopages/radiant';
import { queryRovingTabindexItems } from '@/lib/focusable-elements';
import { applyRovingTabindex, navigateRovingTabindex } from '@/lib/roving-tabindex';

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
 * @attr {string} label - Accessible name for the `role="toolbar"` region.
 * @attr {boolean} exclusive-toggles - Only one toggle button stays pressed at a time. Default: `false`.
 * @cssclass rui-toolbar - Toolbar surface (`role="toolbar"`).
 */
@customElement('rui-toolbar')
export class RuiToolbar extends RadiantElement<RuiToolbarBindings> {
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
