import { MutationController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const list = root.querySelector('ul')!;
	const status = root.querySelector('[data-status]')!;

	const observer = new MutationController({
		getTarget: () => list,
		options: { childList: true },
		onMutate: () => (status.textContent = `${list.children.length} items`),
	});
	observer.attach();

	root.querySelector('button')!.addEventListener('click', () =>
		list.insertAdjacentHTML('beforeend', '<li>New item</li>'),
	);
	return () => observer.destroy();
}

mountExample('mutation', mount);
