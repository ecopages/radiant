import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiMenuButton } from './menu-button';
import { RuiMenuButton as RuiMenuButtonScript } from './menu-button.script';
import { expectPopupFoundAcrossPortalCycle } from '../../../controllers/exit-transition.fixture';
import { mountOpenDialog, settled, type Page } from '../dialog/dialog-composition.harness';
void RuiMenuButtonScript;

const menu = (
	<RuiMenuButton
		trigger="Actions"
		items={[
			{ value: 'alpha', label: 'Alpha' },
			{ type: 'separator' },
			{ value: 'beta', label: 'Beta', disabled: true },
			{ value: 'gamma', label: 'Gamma' },
		]}
	/>
);

type Setup = {
	root: HTMLElement;
	outside: HTMLElement;
	cleanup: () => void;
};

async function mountPlain(content: JsxRenderable): Promise<Setup> {
	const root = document.createElement('div');
	document.body.append(root);
	createRoot(root).render(
		<>
			{content}
			<button type="button" id="outside">
				Outside
			</button>
		</>,
	);
	await settled();
	return { root, outside: root.querySelector('#outside') as HTMLElement, cleanup: () => root.remove() };
}

describe.each([
	{ place: 'on the page', inDialog: false },
	{ place: 'in a rui-dialog', inDialog: true },
])('rui-menu-button $place', ({ inDialog }) => {
	let setup: Setup;
	let page: Page | null = null;

	afterEach(() => {
		page?.cleanup();
		page = null;
		if (!inDialog) setup?.cleanup();
	});

	async function mountOpen() {
		let root: HTMLElement;
		let outside: HTMLElement;
		if (inDialog) {
			page = await mountOpenDialog(menu);
			root = page.dialog;
			outside = page.surface;
		} else {
			setup = await mountPlain(menu);
			root = setup.root;
			outside = setup.outside;
		}
		const trigger = root.querySelector('[data-ref="trigger"]') as HTMLElement;
		const popup = root.querySelector('[role="menu"]') as HTMLElement;
		await userEvent.click(trigger);
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		return { root, trigger, popup, outside };
	}

	it('gives the menu a tabindex of -1 so a press inside it keeps focus inside', async () => {
		const { popup } = await mountOpen();
		expect(popup.getAttribute('tabindex')).toBe('-1');
	});

	it('stays open when a separator is pressed', async () => {
		const { popup, trigger } = await mountOpen();
		await userEvent.click(popup.querySelector('[role="separator"], .rui-separator') as HTMLElement);
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		expect(popup.contains(document.activeElement)).toBe(true);
	});

	it('stays open when the menu padding is pressed', async () => {
		const { popup, trigger } = await mountOpen();
		await userEvent.click(popup, { position: { x: 2, y: 2 } });
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
	});

	it('stays open when a disabled item is pressed', async () => {
		const { popup, trigger } = await mountOpen();
		await userEvent.click(popup.querySelector('[role="menuitem"][data-value="beta"]') as HTMLElement, {
			force: true,
		});
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
	});

	it('closes when something outside the menu is pressed', async () => {
		const { trigger, outside } = await mountOpen();
		await userEvent.click(outside, { position: { x: 4, y: 4 } });
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
	});

	it('closes when Tab moves focus out of the menu', async () => {
		const { popup, trigger } = await mountOpen();
		expect(popup.contains(document.activeElement)).toBe(true);
		await userEvent.tab();
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
	});
});

describe('rui-menu-button reads its menu from the popover controller', () => {
	it('finds the current menu while open, during its exit, and after a reopen with a new node', async () => {
		const { root, cleanup } = await mountPlain(menu);
		const button = root.querySelector('rui-menu-button') as RuiMenuButtonScript;
		const popup = root.querySelector('[role="menu"]') as HTMLElement;
		const controller = Reflect.get(button, 'popoverController') as { getFloatingElement(): HTMLElement | null };

		await expectPopupFoundAcrossPortalCycle({
			popup,
			portaled: false,
			find: () => controller.getFloatingElement(),
			open: async () => {
				button.open = true;
				await settled();
			},
			close: async () => {
				button.open = false;
				await settled();
			},
		});

		cleanup();
	});
});
