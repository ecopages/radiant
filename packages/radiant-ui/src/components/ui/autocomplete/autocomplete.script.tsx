import { RadiantElement, customElement, onEvent, onUpdated, prop } from '@ecopages/radiant';
import { textContains, type TextFilterSensitivity } from '@/lib/text-filter';

export type RuiAutocompleteProps = {
	/** Filter sensitivity. Default: `base` (case-insensitive contains). */
	sensitivity?: TextFilterSensitivity;
	/** Controlled filter query. When unset, reads from the composed input. */
	inputValue?: string;
};

/**
 * `<rui-autocomplete>` — filters a composed collection from a text input.
 *
 * The custom element is a behavior host: it does not render filter markup.
 * Import the script and place light-DOM children that match the contract below,
 * or use `RuiAutocomplete` and its helpers, which stamp the same targets.
 *
 * ## Light-DOM contract
 *
 * Required (one of):
 * - `[data-autocomplete-input]` — search field inside this host. Host listens for `input`.
 * - External `[data-autocomplete-input]` on an ancestor `rui-combobox` or `rui-select`
 *   when this host does not contain the input.
 *
 * Collection (one of):
 * - `[data-autocomplete-collection]` — wrapper around filterable items.
 * - The host element itself — when no collection wrapper is provided.
 *
 * Per item inside the collection:
 * - `[role="option"]`, `[role="menuitem"]`, or `[data-tag]` — filterable rows. Host
 *   toggles `hidden` based on the query. Text match uses `data-label` or trimmed
 *   `textContent`.
 *
 * Optional:
 * - `[data-autocomplete-empty]` — no-results state. Host toggles `hidden` when matches exist.
 * - `[data-label]` on items — filter text; falls back to trimmed `textContent`.
 *
 * Nested hosts: filterable items are often `rui-listbox` options or `rui-tag` chips;
 * this host only queries the role / data-tag selectors above, not listbox internals.
 *
 * @remarks When nested in `rui-combobox`, the combobox input acts as the filter
 * field. `rui-select` uses a dedicated search input inside the popup instead.
 *
 * @see https://react-aria.adobe.com/Autocomplete
 *
 * @element rui-autocomplete
 *
 * @attr {string} sensitivity - Filter sensitivity: `base` (case-insensitive contains), `case`, or `accent`. Default: `base`.
 * @attr {string} input-value - Controlled filter query; when unset, reads from the composed input. Default: `''`.
 *
 * @remarks
 * `[data-ref="root"]` on the view is presentation only; the host does not query it.
 * BEM classes live on the view; the host never queries them.
 */
@customElement('rui-autocomplete')
export class RuiAutocomplete extends RadiantElement {
	@prop({ type: String, defaultValue: 'base' }) sensitivity: TextFilterSensitivity;
	@prop({ type: String, attribute: 'input-value', defaultValue: '' }) inputValue: string;

	private externalInput: HTMLInputElement | null = null;
	private readonly onExternalInput = (): void => {
		this.applyFilter();
	};

	private getInput(): HTMLInputElement | null {
		const local = this.querySelector<HTMLInputElement>('[data-autocomplete-input]');
		if (local) {
			return local;
		}

		const host = this.closest('rui-combobox, rui-select');
		return host?.querySelector<HTMLInputElement>('[data-autocomplete-input]') ?? null;
	}

	private bindExternalInput(): void {
		this.unbindExternalInput();
		const input = this.getInput();
		if (!input || this.contains(input)) {
			return;
		}

		this.externalInput = input;
		input.addEventListener('input', this.onExternalInput);
	}

	private unbindExternalInput(): void {
		this.externalInput?.removeEventListener('input', this.onExternalInput);
		this.externalInput = null;
	}

	syncFilter(): void {
		this.applyFilter();
	}

	private getCollection(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-autocomplete-collection]') ?? this;
	}

	private getFilterableItems(): HTMLElement[] {
		const collection = this.getCollection();
		if (!collection) {
			return [];
		}

		const options = Array.from(
			collection.querySelectorAll<HTMLElement>('[role="option"], [data-tag], [role="menuitem"]'),
		);
		return options.filter((item) => this.contains(item) || collection.contains(item));
	}

	private getItemText(item: HTMLElement): string {
		return item.getAttribute('data-label') || item.textContent?.trim() || '';
	}

	private getQuery(): string {
		if (this.inputValue) {
			return this.inputValue;
		}

		return this.getInput()?.value ?? '';
	}

	private applyFilter(): void {
		const query = this.getQuery();
		const items = this.getFilterableItems();
		let visibleCount = 0;

		for (const item of items) {
			const matches = textContains(this.getItemText(item), query, this.sensitivity);
			item.hidden = !matches;
			if (matches) {
				visibleCount += 1;
			}
		}

		const emptyState = this.querySelector<HTMLElement>('[data-autocomplete-empty]');
		if (emptyState) {
			emptyState.toggleAttribute('hidden', visibleCount > 0);
		}
	}

	private initialize(): void {
		this.applyFilter();
	}

	protected override onConnected(): void {
		this.bindExternalInput();
		this.initialize();
	}

	override disconnectedCallback(): void {
		this.unbindExternalInput();
		super.disconnectedCallback();
	}

	@onUpdated(['sensitivity', 'inputValue'])
	onPropsUpdated(): void {
		this.applyFilter();
	}

	@onEvent({ selector: '[data-autocomplete-input]', type: 'input' })
	onInput(): void {
		this.applyFilter();
	}
}
