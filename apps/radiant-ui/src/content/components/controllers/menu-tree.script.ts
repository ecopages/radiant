import { MenuTreeController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector<HTMLElement>('[data-example="menu-tree"]')!;
const menu = root.querySelector<HTMLElement>('[role="menu"]')!;
const status = root.querySelector('[data-status]')!;

const tree = new MenuTreeController({
	root,
	getRootMenu: () => menu,
	onActivate: (item) => (status.textContent = `Chose ${item.textContent}`),
	onCloseRoot: () => tree.closeAll(),
});
tree.attach();
tree.sync();

menu.addEventListener('click', (event) => tree.handleClick(event));
menu.addEventListener('keydown', (event) => tree.handleKeydown(event));
