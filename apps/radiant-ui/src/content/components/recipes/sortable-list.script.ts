import { RovingController, SortableController } from '@ecopages/radiant-ui/controllers';
import { reorder } from '@ecopages/radiant-ui/helpers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const list = root.querySelector('ul')!;
	const status = root.querySelector('[data-status]')!;

	let items = [...list.children] as HTMLElement[];

	const roving = new RovingController({
		getItems: () => items,
		getTarget: () => list,
		orientation: 'vertical',
		getEnabled: () => sortable.getState() === null,
	});

	const sortable = new SortableController({
		preview: true,
		createPlaceholder: () => document.createElement('li'),
		getContainer: () => list,
		getItems: () => items,
		announce: (message) => (status.textContent = message),
		onChange: ({ item, from, to }) => {
			items = reorder(items, from, to);
			list.append(...items);
			roving.focus(item);
		},
	});

	sortable.attach();
	roving.attach();
	roving.sync();
	return () => {
		sortable.destroy();
		roving.destroy();
	};
}

mountExample('sortable-list', mount);
