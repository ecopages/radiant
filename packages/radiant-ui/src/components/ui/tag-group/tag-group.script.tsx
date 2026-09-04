import { RadiantElement, customElement, event, onEvent, onUpdated, prop, state } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { createRuiIconX } from '@/lib/icons/x';
import { navigateRovingTabindex } from '@/lib/roving-tabindex';
import { uniqueId } from '@/lib/unique-id';
import { parseMultiValue, serializeMultiValue } from '../shared/multi-value';

export type RuiTagGroupSelectionMode = 'single' | 'multiple';
export type RuiTagGroupItem = { value: string; label: string };

export type RuiTagGroupProps = {
	value?: string;
	label?: string;
	disabled?: boolean;
	selectionMode?: RuiTagGroupSelectionMode;
	/** Disables selection when the parent component owns the selected values. */
	embedded?: boolean;
};

export type RuiTagGroupChangeDetail = { value: string };
export type RuiTagGroupRemoveDetail = { value: string };

/**
 * `<rui-tag-group>` — a focusable list of tags with optional selection and removal.
 *
 * The custom element is a behavior host: it does not render tag markup. Import the
 * script and place any light-DOM children that match the contract below, or use
 * `RuiTagGroup` / `RuiTagList` / `RuiTag`, which stamp the same targets.
 *
 * Use inside `RuiSelectValue` for multi-select chips. Set `embedded` so this host
 * does not toggle selection; the parent owns `value`.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-tag-list]` — list container. Host sets `id`, `role="list"`, `aria-label`
 *   (from `label`, fallback `Tags`), and `aria-disabled` when `disabled`.
 * - `[data-tag]` — one item, descendant of the list. Host sets `id` when missing,
 *   `role="listitem"`, `aria-selected`, and roving `tabIndex`.
 *
 * Per tag:
 * - `[data-value]` — selection and remove identity. Falls back to trimmed text.
 * - `[data-label]` — used in the remove control's accessible name. Falls back to trimmed text.
 *
 * Optional:
 * - `[data-tag-remove]` — control inside a tag. Host sets `type="button"`,
 *   `tabIndex="-1"`, and `aria-label="Remove {label}"`. Omit for a non-removable tag.
 * - `[data-ref="root"]` — wrapper required only when calling `setItems()`.
 *
 * Author `hidden` or `aria-disabled="true"` on a tag to exclude it from keyboard
 * movement; `aria-disabled` also blocks selection. Do not set `role`,
 * `aria-selected`, or `tabIndex` on tags — the host owns those.
 *
 * Nested hosts: none. Parent hosts (`rui-select`) query `rui-tag-group` by tag name.
 *
 * @see https://react-aria.adobe.com/TagGroup
 * @element rui-tag-group
 * @attr {string} value - Comma-separated selected values.
 * @attr {string} label - Accessible name for the tag list.
 * @attr {boolean} disabled - Disable selection and removal. Default: `false`.
 * @attr {('single'|'multiple')} selection-mode - Allow one or many selected tags. Default: `multiple`.
 * @attr {boolean} embedded - Disables selection when the parent component owns the selected values. Default: `false`.
 * @fires rui-change - Emitted when the selected `value` changes; `detail.value` is the comma-separated value.
 * @fires rui-remove - Emitted when a tag is removed; `detail.value` is the removed tag's value.
 *
 * @remarks
 * Minimum tree: `[data-tag-list]` > `[data-tag][data-value][data-label]` with optional
 * `[data-tag-remove]` inside. `setItems()` switches to a Derived Tree: it hides the
 * authored list and paints chips into `[data-rui-managed-list]` (do not author that
 * marker). `resync()` re-reads authored children after in-place mutations.
 * BEM classes live on the view helpers; the host never queries them.
 */
@customElement('rui-tag-group')
export class RuiTagGroup extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, attribute: 'selection-mode', defaultValue: 'multiple' })
	selectionMode: RuiTagGroupSelectionMode;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) embedded: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTagGroupChangeDetail>;

	@event({ name: 'rui-remove', bubbles: true, composed: true })
	removeEvent: EventEmitter<RuiTagGroupRemoveDetail>;

	private readonly uid = uniqueId('rui-tag-group');
	/**
	 * CE-owned chip list. `null` means the view still owns Authored Children;
	 * an array (including empty) means `setItems` has taken over as a Derived Tree.
	 */
	@state private derivedItems: RuiTagGroupItem[] | null = null;

	private isMultiple(): boolean {
		return this.selectionMode === 'multiple';
	}

	private getSelectedValues(): string[] {
		if (!this.value) {
			return [];
		}
		return parseMultiValue(this.value);
	}

	private setSelectedValues(values: string[]): void {
		this.value = serializeMultiValue(values);
	}

	private getList(): HTMLElement | null {
		const managed = this.querySelector<HTMLElement>('[data-rui-managed-list]');
		if (managed) {
			return managed;
		}
		if (this.derivedItems != null) {
			return null;
		}

		return this.querySelector<HTMLElement>('[data-tag-list]');
	}

	private getTags(): HTMLElement[] {
		const list = this.getList();
		if (!list) {
			return [];
		}

		return Array.from(list.querySelectorAll<HTMLElement>('[data-tag]'));
	}

	private getVisibleTags(): HTMLElement[] {
		return this.getTags().filter((tag) => !tag.hidden && tag.getAttribute('aria-disabled') !== 'true');
	}

	private getTagValue(tag: HTMLElement): string {
		return tag.getAttribute('data-value') || tag.textContent?.trim() || '';
	}

	private getTagLabel(tag: HTMLElement): string {
		return tag.getAttribute('data-label') || tag.textContent?.trim() || '';
	}

	private ensureTagIds(): void {
		this.getTags().forEach((tag, index) => {
			if (!tag.id) {
				tag.id = `${this.uid}-tag-${index}`;
			}
		});
	}

	private syncList(): void {
		const list = this.getList();
		if (!list) {
			return;
		}

		if (!list.id) {
			list.id = `${this.uid}-list`;
		}

		list.setAttribute('role', 'list');
		list.setAttribute('aria-label', this.label || 'Tags');

		if (this.disabled) {
			list.setAttribute('aria-disabled', 'true');
		} else {
			list.removeAttribute('aria-disabled');
		}
	}

	private syncTags(): void {
		const selected = new Set(this.getSelectedValues());
		const tags = this.getTags();

		tags.forEach((tag, index) => {
			tag.setAttribute('role', 'listitem');
			const value = this.getTagValue(tag);
			const isSelected = selected.has(value);
			tag.setAttribute('aria-selected', String(isSelected));
			tag.tabIndex = index === 0 ? 0 : -1;

			const removeButton = tag.querySelector<HTMLButtonElement>('[data-tag-remove]');
			if (removeButton) {
				removeButton.type = 'button';
				removeButton.tabIndex = -1;
				removeButton.setAttribute('aria-label', `Remove ${this.getTagLabel(tag)}`);
			}
		});
	}

	private selectTag(tag: HTMLElement): void {
		if (this.disabled || this.embedded || tag.getAttribute('aria-disabled') === 'true') {
			return;
		}

		const tagValue = this.getTagValue(tag);

		if (this.isMultiple()) {
			const selected = new Set(this.getSelectedValues());
			if (selected.has(tagValue)) {
				selected.delete(tagValue);
			} else {
				selected.add(tagValue);
			}
			this.setSelectedValues([...selected]);
		} else {
			this.value = tagValue;
		}

		this.syncTags();
		this.changeEvent.emit({ value: this.value });
	}

	private removeTag(tag: HTMLElement): void {
		const tagValue = this.getTagValue(tag);
		const selected = new Set(this.getSelectedValues());
		selected.delete(tagValue);
		this.setSelectedValues([...selected]);
		this.syncTags();
		this.removeEvent.emit({ value: tagValue });
		this.changeEvent.emit({ value: this.value });
	}

	private initialize(): void {
		this.syncManagedList();
		this.ensureTagIds();
		this.syncList();
		this.syncTags();
	}

	protected override onConnected(): void {
		this.initialize();
	}

	@onUpdated(['value', 'label', 'disabled', 'selectionMode', 'embedded', 'derivedItems'])
	onPropsUpdated(): void {
		this.syncManagedList();
		this.syncList();
		this.syncTags();
	}

	/**
	 * Re-read authored `[data-tag]` children after the parent mutates them in place.
	 */
	resync(): void {
		this.ensureTagIds();
		this.syncList();
		this.syncTags();
	}

	/**
	 * Replace authored tags with a CE-owned list. Requires `[data-ref="root"]`.
	 *
	 * @remarks Hides the authored `[data-tag-list]` and sets `value` to every
	 * item. Pass `[]` to clear the managed list.
	 */
	setItems(items: RuiTagGroupItem[]): void {
		this.derivedItems = items;
		this.value = serializeMultiValue(items.map((item) => item.value));
	}

	/**
	 * Imperative twin of the view's `RuiTag` / `RuiTagRemove` markup for
	 * CE-managed items (same `data-*` hooks, classes, and remove icon).
	 */
	private createManagedTag(item: RuiTagGroupItem): HTMLElement {
		const tag = document.createElement('span');
		tag.setAttribute('data-tag', '');
		tag.setAttribute('data-value', item.value);
		tag.setAttribute('data-label', item.label);
		tag.className = 'rui-tag';
		tag.textContent = item.label;

		const remove = document.createElement('button');
		remove.type = 'button';
		remove.setAttribute('data-tag-remove', '');
		remove.className = 'rui-tag__remove';
		remove.setAttribute('aria-label', `Remove ${item.label}`);

		remove.append(createRuiIconX());
		tag.append(remove);

		return tag;
	}

	private syncManagedList(): void {
		const root = this.querySelector<HTMLElement>('[data-ref="root"]');
		if (!root || this.derivedItems == null) {
			return;
		}

		const authored = root.querySelector<HTMLElement>('[data-tag-list]:not([data-rui-managed-list])');
		authored?.toggleAttribute('hidden', true);

		let managed = root.querySelector<HTMLElement>('[data-rui-managed-list]');
		if (this.derivedItems.length === 0) {
			managed?.remove();
			return;
		}

		if (!managed) {
			managed = document.createElement('div');
			managed.setAttribute('data-tag-list', '');
			managed.setAttribute('data-rui-managed-list', '');
			managed.className = 'rui-tag-group__list';
			root.appendChild(managed);
		}

		managed.replaceChildren(...this.derivedItems.map((item) => this.createManagedTag(item)));

		this.ensureTagIds();
		this.syncList();
		this.syncTags();
	}

	@onEvent({ selector: '[data-tag]', type: 'click' })
	onTagClick(event: Event): void {
		const target = event.target as HTMLElement;
		if (target.closest('[data-tag-remove]')) {
			return;
		}

		const tag = target.closest<HTMLElement>('[data-tag]');
		if (tag && this.contains(tag)) {
			this.selectTag(tag);
		}
	}

	@onEvent({ selector: '[data-tag-remove]', type: 'click' })
	onRemoveClick(event: Event): void {
		event.stopPropagation();
		const button = event.target as HTMLElement;
		const tag = button.closest<HTMLElement>('[data-tag]');
		if (tag && this.contains(tag)) {
			this.removeTag(tag);
		}
	}

	@onEvent({ selector: '[data-tag]', type: 'keydown' })
	onTagKeydown(event: KeyboardEvent): void {
		const tags = this.getVisibleTags();
		const current = (event.target as HTMLElement).closest<HTMLElement>('[data-tag]');
		if (!current) {
			return;
		}

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (!this.embedded) {
				this.selectTag(current);
			}
			return;
		}

		if (event.key === 'Backspace' || event.key === 'Delete') {
			const removeButton = current.querySelector('[data-tag-remove]');
			if (removeButton) {
				event.preventDefault();
				this.removeTag(current);
			}
			return;
		}

		const result = navigateRovingTabindex({
			items: tags,
			current,
			key: event.key,
			orientation: 'horizontal',
		});
		if (result.handled) {
			event.preventDefault();
		}
	}
}
