import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuTreeController } from './menu-tree';

function keyEvent(key: string, target: HTMLElement): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
	Object.defineProperty(event, 'target', { get: () => target });
	return event;
}

function clickEvent(target: HTMLElement): MouseEvent {
	const event = new MouseEvent('click', { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'target', { get: () => target });
	return event;
}

function pointerEvent(type: 'pointerover' | 'pointerout', target: HTMLElement, related?: Node | null): PointerEvent {
	const event = new PointerEvent(type, { bubbles: true, relatedTarget: related ?? null });
	Object.defineProperty(event, 'target', { get: () => target });
	return event;
}

function createTree() {
	const root = document.createElement('div');
	root.innerHTML = `
		<div role="menu" data-ref="root-menu">
			<button type="button" role="menuitem" data-value="edit">Edit</button>
			<button type="button" role="menuitem" data-value="share">Share</button>
			<div role="menu" hidden>
				<button type="button" role="menuitem" data-value="email">Email</button>
				<button type="button" role="menuitem" data-value="copy">Copy</button>
			</div>
			<button type="button" role="menuitem" data-value="print">Print</button>
			<div role="menu" hidden>
				<button type="button" role="menuitem" data-value="pdf">PDF</button>
			</div>
			<button type="button" role="menuitem" data-value="delete" aria-disabled="true">Delete</button>
		</div>
	`;
	document.body.append(root);

	const rootMenu = root.querySelector('[data-ref="root-menu"]') as HTMLElement;
	const share = root.querySelector('[data-value="share"]') as HTMLElement;
	const submenu = share.nextElementSibling as HTMLElement;
	const print = root.querySelector('[data-value="print"]') as HTMLElement;
	const printMenu = print.nextElementSibling as HTMLElement;
	const onActivate = vi.fn();
	const onCloseRoot = vi.fn();
	const tree = new MenuTreeController({
		root,
		getRootMenu: () => rootMenu,
		onActivate,
		onCloseRoot,
	});
	tree.sync();

	return {
		root,
		rootMenu,
		share,
		submenu,
		print,
		printMenu,
		tree,
		onActivate,
		onCloseRoot,
		cleanup: () => {
			tree.destroy();
			root.remove();
		},
	};
}

describe('MenuTreeController', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('links branch items to sibling menus and skips disabled items', () => {
		const { share, submenu, rootMenu, tree, cleanup } = createTree();

		expect(share.getAttribute('aria-haspopup')).toBe('menu');
		expect(share.getAttribute('aria-expanded')).toBe('false');
		expect(share.getAttribute('aria-controls')).toBe(submenu.id);
		expect(submenu.id.startsWith('rui-submenu-')).toBe(true);
		expect(tree.getFocusableItems(rootMenu).map((item) => item.getAttribute('data-value'))).toEqual([
			'edit',
			'share',
			'print',
		]);

		cleanup();
	});

	it('opens a submenu on ArrowRight and closes it on ArrowLeft', () => {
		const { share, submenu, tree, cleanup } = createTree();
		const email = submenu.querySelector('[data-value="email"]') as HTMLElement;

		expect(tree.handleKeydown(keyEvent('ArrowRight', share))).toBe(true);
		expect(share.getAttribute('aria-expanded')).toBe('true');
		expect(submenu.hidden).toBe(false);
		expect(document.activeElement).toBe(email);

		expect(tree.handleKeydown(keyEvent('ArrowLeft', email))).toBe(true);
		expect(share.getAttribute('aria-expanded')).toBe('false');
		expect(submenu.hidden).toBe(true);
		expect(document.activeElement).toBe(share);

		cleanup();
	});

	it('activates a leaf and does not activate a branch', () => {
		const { root, share, tree, onActivate, cleanup } = createTree();
		const edit = root.querySelector('[data-value="edit"]') as HTMLElement;

		expect(tree.handleKeydown(keyEvent('Enter', share))).toBe(true);
		expect(onActivate).not.toHaveBeenCalled();
		expect(share.getAttribute('aria-expanded')).toBe('true');

		expect(tree.handleClick(clickEvent(edit))).toBe(true);
		expect(onActivate).toHaveBeenCalledWith(edit);

		cleanup();
	});

	it('closes the current branch when a sibling opens', () => {
		const { share, submenu, print, printMenu, tree, cleanup } = createTree();

		tree.handleKeydown(keyEvent('ArrowRight', share));
		tree.handleKeydown(keyEvent('ArrowRight', print));

		expect(share.getAttribute('aria-expanded')).toBe('false');
		expect(submenu.hidden).toBe(true);
		expect(print.getAttribute('aria-expanded')).toBe('true');
		expect(printMenu.hidden).toBe(false);

		cleanup();
	});

	it('opens a submenu after the hover delay without moving focus', () => {
		vi.useFakeTimers();
		const { share, submenu, tree, cleanup } = createTree();
		const active = document.createElement('button');
		document.body.append(active);
		active.focus();

		tree.handlePointerOver(pointerEvent('pointerover', share));
		expect(submenu.hidden).toBe(true);

		vi.advanceTimersByTime(200);
		expect(submenu.hidden).toBe(false);
		expect(document.activeElement).toBe(active);

		active.remove();
		cleanup();
	});

	it('cancels a pending hover open when the pointer leaves', () => {
		vi.useFakeTimers();
		const { share, submenu, tree, cleanup } = createTree();

		tree.handlePointerOver(pointerEvent('pointerover', share));
		tree.handlePointerOut(pointerEvent('pointerout', share));
		vi.advanceTimersByTime(200);

		expect(submenu.hidden).toBe(true);

		cleanup();
	});

	it('asks the host to close the root on Escape and destroy tears down open menus', () => {
		const { share, submenu, tree, onCloseRoot, cleanup } = createTree();

		tree.handleKeydown(keyEvent('ArrowRight', share));
		expect(tree.handleKeydown(keyEvent('Escape', share))).toBe(true);
		expect(onCloseRoot).toHaveBeenCalledWith(true);

		tree.closeAll();
		expect(submenu.hidden).toBe(true);
		tree.destroy();
		expect(share.getAttribute('aria-expanded')).toBe('false');

		cleanup();
	});
});
