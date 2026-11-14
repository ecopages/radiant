import { SortableController, SortableGroup } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const status = root.querySelector('[data-status]')!;
	const group = new SortableGroup();

	const sortables = [...root.querySelectorAll('ul')].map(
		(list) =>
			new SortableController({
				group,
				preview: true,
				createPlaceholder: () => document.createElement('li'),
				getContainer: () => list,
				getItems: () => [...list.children] as HTMLElement[],
				announce: (message) => (status.textContent = message),
				onChange: ({ item, to, toContainer }) => {
					const others = [...toContainer.children].filter((child) => child !== item);
					toContainer.insertBefore(item, others[to] ?? null);
					item.focus();
				},
			}),
	);

	sortables.forEach((sortable) => sortable.attach());
	return () => sortables.forEach((sortable) => sortable.destroy());
}

mountExample('board', mount);
