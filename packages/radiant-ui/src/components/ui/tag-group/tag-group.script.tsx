import { RadiantElement, customElement, event, onEvent, onUpdated, prop, state } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { navigateRovingTabindex } from '@/lib/roving-tabindex';
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
 * Compose with `data-tag` items and optional `data-tag-remove` buttons inside each tag.
 * Use inside `RuiSelectValue` to display multi-select chips.
 *
 * @see https://react-aria.adobe.com/TagGroup
 * @element rui-tag-group
 * @attr {string} value - Comma-separated selected values.
 * @attr {string} label - Accessible name for the tag list.
 * @attr {boolean} disabled - Disable selection and removal. Default: `false`.
 * @attr {('single'|'multiple')} selection-mode - Allow one or many selected tags. Default: `multiple`.
 * @attr {boolean} embedded - Disables selection when the parent component owns the selected values. Default: `false`.
 * @slot - Tag content. Compose `RuiTagList` / `RuiTag` / `RuiTagRemove`, or set items via `setItems()`.
 * @fires rui-change - Emitted when the selected `value` changes; `detail.value` is the comma-separated value.
 * @fires rui-remove - Emitted when a tag is removed; `detail.value` is the removed tag's value.
 * @cssclass rui-tag-group - Root wrapper around the tag list.
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

	private readonly uid = Math.random().toString(36).slice(2, 9);
	@state private managedItems: RuiTagGroupItem[] = [];

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
		const rendered = this.querySelector<HTMLElement>('[data-tag-list]');
		if (rendered) {
			return rendered;
		}

		return (
			this.getSlotElements<HTMLElement>().find(
				(element) => element.matches('[data-tag-list]') || element.querySelector('[data-tag-list]'),
			) ?? null
		);
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
				tag.id = `rui-tag-${this.uid}-${index}`;
			}
		});
	}

	private syncList(): void {
		const list = this.getList();
		if (!list) {
			return;
		}

		if (!list.id) {
			list.id = `rui-tag-list-${this.uid}`;
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
		this.ensureTagIds();
		this.syncList();
		this.syncTags();
	}

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.initialize());
	}

	@onUpdated(['value', 'label', 'disabled', 'selectionMode', 'embedded', 'managedItems'])
	onPropsUpdated(): void {
		this.syncList();
		this.syncTags();
	}

	resync(): void {
		this.ensureTagIds();
		this.syncList();
		this.syncTags();
	}

	setItems(items: RuiTagGroupItem[]): void {
		this.managedItems = items;
		this.value = serializeMultiValue(items.map((item) => item.value));
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

	override render() {
		return (
			<div class="rui-tag-group" data-ref="root">
				<slot></slot>
				{this.managedItems.length > 0 ? (
					<div data-tag-list data-rui-managed-list class="rui-tag-group__list">
						{this.managedItems.map((item) => (
							<span data-tag data-value={item.value} data-label={item.label} class="rui-tag">
								{item.label}
								<button
									type="button"
									data-tag-remove
									class="rui-tag__remove"
									aria-label={`Remove ${item.label}`}
								>
									<span aria-hidden="true">×</span>
								</button>
							</span>
						))}
					</div>
				) : null}
			</div>
		);
	}
}
