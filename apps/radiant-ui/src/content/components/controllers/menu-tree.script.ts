import { MenuTreeController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const menu = root.querySelector<HTMLElement>('[role="menu"]')!;
	const status = root.querySelector('[data-status]')!;

	const tree = new MenuTreeController({
		getRoot: () => root,
		getRootMenu: () => menu,
		onActivate: (item) => (status.textContent = `Chose ${item.textContent}`),
		onCloseRoot: () => tree.closeAll(),
	});
	tree.attach();
	tree.sync();

	menu.addEventListener('click', (event) => tree.handleClick(event));
	menu.addEventListener('keydown', (event) => tree.handleKeydown(event));
	return () => tree.destroy();
}

mountExample('menu-tree', mount);
