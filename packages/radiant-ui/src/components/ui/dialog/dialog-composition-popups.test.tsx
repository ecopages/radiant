import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx';
import { RuiSelect } from '../select/select';
import { RuiSelect as RuiSelectScript } from '../select/select.script';
import { RuiPopover, RuiPopoverTrigger } from '../popover/popover';
import {
	RuiPopover as RuiPopoverScript,
	RuiPopoverTrigger as RuiPopoverTriggerScript,
} from '../popover/popover.script';
import { RuiHoverCard, RuiHoverCardContent, RuiHoverCardTrigger } from '../hover-card/hover-card';
import { RuiHoverCard as RuiHoverCardScript } from '../hover-card/hover-card.script';
import { animationsFinished } from '../../../controllers/exit-transition.fixture';
import { describeHit, isReachable, mountOpenDialog, settled, type Page } from './dialog-composition.harness';
void [RuiSelectScript, RuiPopoverScript, RuiPopoverTriggerScript, RuiHoverCardScript];

const PETS = [
	{ value: 'cat', label: 'Cat' },
	{ value: 'dog', label: 'Dog' },
];

let page: Page;
let extra: HTMLElement | null = null;

afterEach(() => {
	page?.cleanup();
	extra?.remove();
	extra = null;
});

function popoverContent() {
	return (
		<RuiPopoverTrigger trigger={<button type="button">Open popover</button>}>
			<RuiPopover>
				<button type="button" data-inside-popover>
					Inside popover
				</button>
			</RuiPopover>
		</RuiPopoverTrigger>
	);
}

const entered = (popup: Element) => animationsFinished(popup);

function backdropOf(target: Page): HTMLElement {
	return target.dialog.querySelector('[data-ref="backdrop"]') as HTMLElement;
}

async function clickBackdrop(target: Page): Promise<void> {
	const backdrop = backdropOf(target);
	await userEvent.click(backdrop, { position: { x: 4, y: backdrop.getBoundingClientRect().height - 4 } });
	await settled();
}

/** The gap a popup leaves under its anchor, so a wrong containing block shows as a large offset. */
function gapUnder(anchor: Element, popup: Element): number {
	return popup.getBoundingClientRect().top - anchor.getBoundingClientRect().bottom;
}

describe('popup position inside a rui-dialog that is still animating in', () => {
	it('places a rui-popover under its trigger while the surface scales in and after the transition ends', async () => {
		page = await mountOpenDialog(popoverContent(), { enterDuration: '4s' });
		const trigger = page.dialog.querySelector('[data-popover-trigger] button') as HTMLElement;
		trigger.focus();
		await userEvent.keyboard('{Enter}');
		await settled();
		const surface = document.querySelector('[data-ref="surface"].rui-popover') as HTMLElement;
		expect(surface.hidden).toBe(false);
		await entered(surface);
		expect(page.surface.getAnimations().length, 'the dialog is still animating').toBeGreaterThan(0);
		expect(Math.abs(gapUnder(trigger, surface) - 8)).toBeLessThanOrEqual(1);

		await animationsFinished(page.surface);
		await settled();
		expect(Math.abs(gapUnder(trigger, surface) - 8)).toBeLessThanOrEqual(1);
	});

	it('places a rui-select list under its trigger while the surface scales in and after the transition ends', async () => {
		page = await mountOpenDialog(<RuiSelect label="Pets" options={PETS} />, { enterDuration: '4s' });
		const trigger = page.dialog.querySelector('[data-select-trigger]') as HTMLElement;
		trigger.focus();
		await userEvent.keyboard('{ArrowDown}');
		await settled();
		const list = page.dialog.querySelector('[data-select-listbox]') as HTMLElement;
		expect(list.hidden).toBe(false);
		await entered(list);
		expect(page.surface.getAnimations().length, 'the dialog is still animating').toBeGreaterThan(0);
		const gapDuring = gapUnder(trigger, list);

		await animationsFinished(page.surface);
		await settled();
		const gapAfter = gapUnder(trigger, list);
		expect(gapAfter).toBeGreaterThanOrEqual(0);
		expect(gapAfter).toBeLessThanOrEqual(16);
		expect(Math.abs(gapDuring - gapAfter)).toBeLessThanOrEqual(1);
	});
});

describe('popups in a consumer modal', () => {
	it('places a rui-popover under its trigger inside an aria-modal container centred with transform', async () => {
		extra = document.createElement('div');
		document.body.append(extra);
		createRoot(extra).render(
			<div
				id="consumer-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Consumer modal"
				style="position: fixed; left: 50%; top: 50%; width: 260px; padding: 24px; transform: translate(-50%, -50%); background: white; z-index: 60"
			>
				{popoverContent()}
			</div>,
		);
		await settled();
		const modal = extra.querySelector('#consumer-modal') as HTMLElement;
		const trigger = modal.querySelector('[data-popover-trigger] button') as HTMLElement;
		await userEvent.click(trigger);
		await settled();
		const surface = document.querySelector('[data-ref="surface"].rui-popover') as HTMLElement;
		expect(surface.parentElement).toBe(modal);
		await entered(surface);
		expect(Math.abs(gapUnder(trigger, surface) - 8)).toBeLessThanOrEqual(1);
		const item = surface.querySelector('[data-inside-popover]') as HTMLElement;
		expect(isReachable(item), `the pointer reaches ${describeHit(item)}`).toBe(true);
	});

	it('shows a rui-popover above a native modal dialog, which sets no aria-modal and uses the top layer', async () => {
		extra = document.createElement('div');
		document.body.append(extra);
		createRoot(extra).render(<dialog id="native-modal">{popoverContent()}</dialog>);
		await settled();
		const dialog = extra.querySelector('#native-modal') as HTMLDialogElement;
		dialog.showModal();
		try {
			const trigger = dialog.querySelector('[data-popover-trigger] button') as HTMLElement;
			await userEvent.click(trigger);
			await settled();
			const surface = document.querySelector('[data-ref="surface"].rui-popover') as HTMLElement;
			expect(surface.parentElement).toBe(dialog);
			const item = surface.querySelector('[data-inside-popover]') as HTMLElement;
			expect(isReachable(item), `the pointer reaches ${describeHit(item)}`).toBe(true);
		} finally {
			dialog.close();
		}
	});
});

describe('backdrop clicks with popups open in a rui-dialog', () => {
	it('closes the dialog on a backdrop click although a combobox in it stays expanded', async () => {
		page = await mountOpenDialog(
			<>
				<input role="combobox" aria-expanded="true" aria-controls="palette-list" aria-label="Command" />
				<div id="palette-list" role="listbox" aria-label="Commands">
					<div role="option" aria-selected="false">
						Open file
					</div>
				</div>
			</>,
		);
		await clickBackdrop(page);
		expect(page.dialog.open).toBe(false);
	});

	it('closes the dialog on a backdrop click although a disclosure in it is expanded', async () => {
		page = await mountOpenDialog(
			<button type="button" aria-expanded="true" aria-controls="panel">
				More
			</button>,
		);
		await clickBackdrop(page);
		expect(page.dialog.open).toBe(false);
	});

	it('closes a select with the first backdrop click and the dialog with the second', async () => {
		page = await mountOpenDialog(<RuiSelect label="Pets" options={PETS} />);
		const trigger = page.dialog.querySelector('[data-select-trigger]') as HTMLElement;
		await userEvent.click(trigger);
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('true');

		await clickBackdrop(page);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(page.dialog.open).toBe(true);

		await clickBackdrop(page);
		expect(page.dialog.open).toBe(false);
	});

	it('closes a popover with the first backdrop click and the dialog with the second', async () => {
		page = await mountOpenDialog(popoverContent());
		const trigger = page.dialog.querySelector('[data-popover-trigger] button') as HTMLElement;
		await userEvent.click(trigger);
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('true');

		await clickBackdrop(page);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(page.dialog.open).toBe(true);

		await clickBackdrop(page);
		expect(page.dialog.open).toBe(false);
	});

	it('does not keep a recorded press from swallowing a later backdrop click without a press', async () => {
		page = await mountOpenDialog(<RuiSelect label="Pets" options={PETS} />);
		const trigger = page.dialog.querySelector('[data-select-trigger]') as HTMLElement;
		await userEvent.click(trigger);
		await settled();
		const backdrop = backdropOf(page);

		backdrop.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
		await settled();
		expect(trigger.getAttribute('aria-expanded'), 'the press closed the select').toBe('false');
		backdrop.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, composed: true }));

		backdrop.click();
		await settled();
		expect(page.dialog.open).toBe(false);
	});

	it('does not keep a press that ended elsewhere from swallowing a later backdrop click', async () => {
		page = await mountOpenDialog(<RuiSelect label="Pets" options={PETS} />);
		const trigger = page.dialog.querySelector('[data-select-trigger]') as HTMLElement;
		await userEvent.click(trigger);
		await settled();
		const backdrop = backdropOf(page);

		backdrop.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
		await settled();
		await userEvent.click(page.surface, { position: { x: 4, y: 4 } });
		await settled();

		backdrop.click();
		await settled();
		expect(page.dialog.open).toBe(false);
	});

	it('closes the dialog on a backdrop click while a hover card is open, because a press does not close a hover card', async () => {
		page = await mountOpenDialog(
			<RuiHoverCard delay={0} closeDelay={5000}>
				<RuiHoverCardTrigger>
					<button type="button" id="card-trigger">
						Profile
					</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await userEvent.hover(page.dialog.querySelector('#card-trigger') as HTMLElement);
		await settled();
		const trigger = page.dialog.querySelector('#card-trigger') as HTMLElement;
		expect(trigger.getAttribute('aria-expanded')).toBe('true');

		await clickBackdrop(page);
		expect(page.dialog.open).toBe(false);
	});
});
