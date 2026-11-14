import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuTreeController, createMenuTreeController } from './menu-tree-controller';

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
		getRoot: () => root,
		getRootMenu: () => rootMenu,
		onActivate,
		onCloseRoot,
	});
	tree.attach();
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

describe('MenuTreeController lifecycle on a plain element', () => {
	const observers: { disconnected: boolean }[] = [];

	class RecordingResizeObserver {
		record = { disconnected: false };
		constructor() {
			observers.push(this.record);
		}
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {
			this.record.disconnected = true;
		}
	}

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
		observers.length = 0;
	});

	it('releases open submenus and pending timers on destroy, and again on a second destroy', () => {
		vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
		vi.useFakeTimers();
		const { share, print, submenu, printMenu, tree, root } = createTree();

		tree.attach();
		tree.handleKeydown(keyEvent('ArrowRight', share));
		expect(share.getAttribute('aria-expanded')).toBe('true');
		expect(observers).toHaveLength(1);

		tree.handlePointerOver(pointerEvent('pointerover', print));
		tree.destroy();
		tree.destroy();

		expect(share.getAttribute('aria-expanded')).toBe('false');
		expect(submenu.hidden).toBe(true);
		expect(observers[0].disconnected).toBe(true);
		vi.advanceTimersByTime(1000);
		expect(print.getAttribute('aria-expanded')).toBe('false');
		expect(printMenu.hidden).toBe(true);
		expect(observers).toHaveLength(1);

		root.remove();
	});

	it('opens nothing for an event routed after destroy', () => {
		vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
		vi.useFakeTimers();
		const { share, print, submenu, tree, root } = createTree();

		tree.destroy();
		tree.handleClick(clickEvent(share));
		tree.handlePointerOver(pointerEvent('pointerover', print));
		vi.advanceTimersByTime(1000);

		expect(share.getAttribute('aria-expanded')).toBe('false');
		expect(submenu.hidden).toBe(true);
		expect(print.getAttribute('aria-expanded')).toBe('false');
		expect(observers).toHaveLength(0);

		root.remove();
	});

	it('opens submenus again after destroy and attach', () => {
		vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
		const { share, tree, root } = createTree();

		tree.attach();
		tree.destroy();
		tree.attach();
		tree.handleKeydown(keyEvent('ArrowRight', share));

		expect(share.getAttribute('aria-expanded')).toBe('true');
		expect(observers.at(-1)?.disconnected).toBe(false);

		tree.destroy();
		root.remove();
	});

	it('reads the root on every event, so an item outside the current root is ignored', () => {
		const first = document.createElement('div');
		const second = document.createElement('div');
		first.innerHTML = '<div role="menu"><button type="button" role="menuitem">One</button></div>';
		second.innerHTML = '<div role="menu"><button type="button" role="menuitem">Two</button></div>';
		document.body.append(first, second);
		const one = first.querySelector('button') as HTMLElement;
		const two = second.querySelector('button') as HTMLElement;
		let root = first;
		const onActivate = vi.fn();
		const tree = new MenuTreeController({
			getRoot: () => root,
			getRootMenu: () => root.querySelector('[role="menu"]'),
			onActivate,
			onCloseRoot: vi.fn(),
		});
		tree.attach();

		expect(tree.handleClick(clickEvent(two))).toBe(false);
		root = second;
		expect(tree.handleClick(clickEvent(two))).toBe(true);
		expect(tree.handleClick(clickEvent(one))).toBe(false);
		expect(onActivate).toHaveBeenCalledTimes(1);
		expect(onActivate).toHaveBeenCalledWith(two);

		tree.destroy();
		first.remove();
		second.remove();
	});

	it('createMenuTreeController attaches on connect and destroys on cleanup', () => {
		vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
		const connected: (() => void)[] = [];
		const cleanup: (() => void)[] = [];
		const root = document.createElement('div');
		root.innerHTML = `
			<div role="menu">
				<button type="button" role="menuitem">Share</button>
				<div role="menu" hidden><button type="button" role="menuitem">Email</button></div>
			</div>
		`;
		document.body.append(root);
		const share = root.querySelector('button') as HTMLElement;
		const tree = createMenuTreeController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{
				getRoot: () => root,
				getRootMenu: () => root.querySelector('[role="menu"]'),
				onActivate: vi.fn(),
				onCloseRoot: vi.fn(),
			},
		);
		tree.sync();

		connected.forEach((callback) => callback());
		tree.handleKeydown(keyEvent('ArrowRight', share));
		expect(share.getAttribute('aria-expanded')).toBe('true');

		cleanup.forEach((callback) => callback());
		expect(share.getAttribute('aria-expanded')).toBe('false');
		expect(observers[0].disconnected).toBe(true);

		root.remove();
	});
});
