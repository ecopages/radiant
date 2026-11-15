import { SortableController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const list = root.querySelector('ul')!;
	const status = root.querySelector('[data-status]')!;

	const sortable = new SortableController({
		getContainer: () => list,
		getItems: () => [...list.children] as HTMLElement[],
		announce: (message) => (status.textContent = message),
		onChange: ({ item, to }) => {
			const others = [...list.children].filter((child) => child !== item);
			list.insertBefore(item, others[to] ?? null);
			item.focus();
		},
	});
	sortable.attach();
	return () => sortable.destroy();
}

mountExample('sortable', mount);
