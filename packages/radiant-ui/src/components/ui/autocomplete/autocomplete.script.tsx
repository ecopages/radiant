import { RadiantElement, customElement, onEvent, onUpdated, prop } from '@ecopages/radiant';
import { textContains, type TextFilterSensitivity } from '@/lib/text-filter';

export type RuiAutocompleteProps = {
	/** Filter sensitivity. Default: `base` (case-insensitive contains). */
	sensitivity?: TextFilterSensitivity;
	/** Controlled filter query. When unset, reads from the slotted input. */
	inputValue?: string;
};

/**
 * `<rui-autocomplete>` — filters a slotted collection from a text input.
 *
 * Wrap a search field (`data-autocomplete-input`) and a collection
 * (`data-autocomplete-collection` or default slot) containing `[role="option"]`,
 * `[role="menuitem"]`, or `[data-tag]` items.
 *
 * @remarks When nested in `rui-combobox`, the combobox input acts as the filter
 * field. `rui-select` uses a dedicated search input inside the popup instead.
 *
 * @see https://react-aria.adobe.com/Autocomplete
 *
 * @element rui-autocomplete
 *
 * @attr {string} sensitivity - Filter sensitivity: `base` (case-insensitive contains), `case`, or `accent`. Default: `base`.
 * @attr {string} input-value - Controlled filter query; when unset, reads from the slotted input. Default: `''`.
 *
 * @slot input - Search field (`RuiAutocompleteInput`).
 * @slot - Filterable collection of `[role="option"]`, `[role="menuitem"]`, or `[data-tag]` items.
 *
 * @cssclass rui-autocomplete - Filter host.
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
			emptyState.hidden = visibleCount > 0;
		}
	}

	private initialize(): void {
		this.applyFilter();
	}

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			this.bindExternalInput();
			this.initialize();
		});
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

	override render() {
		return (
			<div class="rui-autocomplete" data-ref="root">
				<slot name="input"></slot>
				<slot></slot>
			</div>
		);
	}
}
