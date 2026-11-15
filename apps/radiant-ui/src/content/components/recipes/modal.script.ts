import {
	DismissController,
	FocusTrapController,
	PortalController,
	ScrollLockController,
} from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const list = root.querySelector<HTMLElement>('[data-list]')!;
	const empty = root.querySelector<HTMLElement>('[data-empty]')!;
	const reset = root.querySelector<HTMLElement>('[data-reset]')!;
	const layer = root.querySelector<HTMLElement>('[data-layer]')!;
	const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;
	const heading = dialog.querySelector('h3')!;
	const status = root.querySelector('[data-status]')!;

	const rows = [...list.children] as HTMLElement[];
	const nameOf = (row: Element) => row.firstElementChild!.textContent;
	let pending: HTMLElement | null = null;
	let returnTo: HTMLElement | null = null;

	const portal = new PortalController({ getNode: () => layer, getContainer: () => root });
	const trap = new FocusTrapController({ getSurface: () => dialog, getReturnFocus: () => returnTo });
	const lock = new ScrollLockController({
		getTarget: () => root.closest<HTMLElement>('.docs-layout__content') ?? document.documentElement,
	});
	const dismiss = new DismissController({
		getSurface: () => dialog,
		triggers: ['pointer', 'escape'],
		onDismiss: () => close(`Kept ${nameOf(pending!)}`),
	});

	function open(row: HTMLElement): void {
		pending = row;
		heading.textContent = `Delete ${nameOf(row)}?`;
		layer.hidden = false;
		portal.attach();
		lock.attach();
		trap.attach();
		dismiss.attach();
		status.textContent = `Delete ${nameOf(row)}?`;
	}

	function release(): void {
		dismiss.destroy();
		layer.hidden = true;
		trap.destroy();
		returnTo = null;
		pending = null;
		lock.destroy();
		portal.destroy();
	}

	function close(message: string): void {
		release();
		status.textContent = message;
	}

	function confirm(): void {
		const row = pending!;
		const name = nameOf(row);
		const neighbour = row.nextElementSibling ?? row.previousElementSibling;
		row.remove();
		empty.hidden = list.children.length > 0;
		returnTo = neighbour?.querySelector<HTMLElement>('[data-delete]') ?? reset;
		close(`Deleted ${name}, ${list.children.length} left`);
	}

	list.addEventListener('click', (event) => {
		const button = (event.target as Element).closest('[data-delete]');
		if (button) open(button.closest('li')!);
	});
	reset.addEventListener('click', () => {
		list.replaceChildren(...rows);
		empty.hidden = true;
		list.querySelector<HTMLElement>('[data-delete]')!.focus();
		status.textContent = 'List restored';
	});
	dialog.querySelector('[data-confirm]')!.addEventListener('click', confirm);
	dialog.querySelector('[data-close]')!.addEventListener('click', () => close(`Kept ${nameOf(pending!)}`));
	return release;
}

mountExample('modal', mount);
