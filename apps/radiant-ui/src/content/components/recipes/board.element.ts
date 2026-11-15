import { RadiantElement, customElement, query } from '@ecopages/radiant';
import { SortableGroup, createSortableController } from '@ecopages/radiant-ui/controllers';

@customElement('recipe-board')
export class RecipeBoard extends RadiantElement {
	@query({ selector: 'ul', all: true }) private lists!: HTMLElement[];
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	private readonly group = new SortableGroup();

	private readonly sortables = Array.from({ length: 3 }, (_, column) =>
		createSortableController(this, {
			group: this.group,
			preview: true,
			createPlaceholder: () => document.createElement('li'),
			getContainer: () => this.lists[column] ?? null,
			getItems: () => [...this.lists[column].children] as HTMLElement[],
			announce: (message) => (this.status.textContent = message),
			onChange: ({ item, to, toContainer }) => {
				const others = [...toContainer.children].filter((child) => child !== item);
				toContainer.insertBefore(item, others[to] ?? null);
				item.focus();
			},
		}),
	);
}
