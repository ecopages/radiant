import { RadiantElement, customElement, query } from '@ecopages/radiant';
import { createRovingController, createSortableController } from '@ecopages/radiant-ui/controllers';
import { reorder } from '@ecopages/radiant-ui/helpers';

@customElement('recipe-sortable-list')
export class RecipeSortableList extends RadiantElement {
	@query({ selector: 'ul' }) private list!: HTMLElement;
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	private items: HTMLElement[] = [];

	private readonly roving = createRovingController(this, {
		getItems: () => this.items,
		getTarget: () => this.list,
		orientation: 'vertical',
		getEnabled: () => this.sortable.getState() === null,
	});

	private readonly sortable = createSortableController(this, {
		preview: true,
		createPlaceholder: () => document.createElement('li'),
		getContainer: () => this.list,
		getItems: () => this.items,
		announce: (message) => (this.status.textContent = message),
		onChange: ({ item, from, to }) => {
			this.items = reorder(this.items, from, to);
			this.list.append(...this.items);
			this.roving.focus(item);
		},
	});

	override onConnected(): void {
		this.items = [...this.list.children] as HTMLElement[];
		this.roving.sync();
	}
}
