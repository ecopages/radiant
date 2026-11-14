import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type JsxRenderable, type JsxRoot } from '@ecopages/jsx';
import { RuiToaster, toast, TOAST_COLLAPSED_PEEK, TOAST_EXIT_MS, TOAST_GAP, TOAST_POSITIONS } from './index';
import { collapsedStackHeight } from './stack-layout';
import { RuiToast } from './toast.script';
import { resetToastDeadlines } from './toast.script';
import { RuiToaster as RuiToasterScript } from './toaster.script';
void RuiToast;
void RuiToasterScript;

const cleanups: Array<() => void> = [];

function mount(element: JsxRenderable): { host: HTMLElement } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root: JsxRoot = createRoot(host);
	root.render(element);
	cleanups.push(() => {
		root.unmount();
		host.remove();
	});
	return { host };
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await customElements.whenDefined('rui-toaster');
	await customElements.whenDefined('rui-toast');
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

async function settledToasts(host: ParentNode): Promise<void> {
	await settled();
	await vi.waitFor(() => {
		expect(toastElements(host).every((element) => element.dataset.mounted === 'true')).toBe(true);
	});
}

function toastElements(host: ParentNode): HTMLElement[] {
	return [...host.querySelectorAll('rui-toast')] as HTMLElement[];
}

async function expectAnnouncement(host: ParentNode, text: string): Promise<void> {
	await vi.waitFor(() => {
		expect(host.querySelector('.rui-toaster-announcer')?.textContent).toBe(text);
	});
}

describe('rui-toaster', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		toast.dismiss();
		toast.clear();
		resetToastDeadlines();
		for (const cleanup of cleanups.splice(0)) cleanup();
	});

	describe('swipe to dismiss', () => {
		const pointer = (target: EventTarget, type: string, x: number, y = 0) =>
			target.dispatchEvent(
				new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX: x, clientY: y }),
			);

		async function mountToast() {
			const { host } = mount(<RuiToaster />);
			await settled();
			toast('Swipe me');
			await settledToasts(host);
			return toastElements(host)[0];
		}

		it('follows the pointer past the dead zone and dismisses past the threshold', async () => {
			const element = await mountToast();

			pointer(element, 'pointerdown', 0);
			pointer(document, 'pointermove', 4);
			expect(element.style.getPropertyValue('--rui-toast-swipe-x')).toBe('');
			pointer(document, 'pointermove', 60);
			expect(element.style.getPropertyValue('--rui-toast-swipe-x')).toBe('60px');
			expect(element.dataset.swiping).toBe('true');

			pointer(document, 'pointerup', 60);
			expect(element.dataset.swipeOut).toBe('true');
			expect(element.dataset.swipeDirection).toBe('right');
		});

		it('springs back when released short and slow', async () => {
			const element = await mountToast();
			let now = 1_000;
			vi.spyOn(Date, 'now').mockImplementation(() => (now += 1_000));

			pointer(element, 'pointerdown', 0);
			pointer(document, 'pointermove', 20);
			pointer(document, 'pointerup', 20);

			expect(element.dataset.swipeOut).toBe('false');
			expect(element.style.getPropertyValue('--rui-toast-swipe-x')).toBe('0px');
			expect(element.dataset.swiping).toBe('false');
		});

		it('does not start from a button inside the toast', async () => {
			const element = await mountToast();
			const button = element.appendChild(document.createElement('button'));

			pointer(button, 'pointerdown', 0);
			pointer(document, 'pointermove', 80);
			pointer(document, 'pointerup', 80);

			expect(element.dataset.swipeOut).toBe('false');
		});
	});

	it('exports every supported toast position in display order', () => {
		expect(TOAST_POSITIONS).toEqual([
			'top-start',
			'top-center',
			'top-end',
			'bottom-start',
			'bottom-center',
			'bottom-end',
		]);
	});

	it('renders a toast from the imperative API', async () => {
		const { host } = mount(<RuiToaster position="bottom-end" closeButton />);
		await settled();

		toast.success('Profile saved');
		await settled();

		const title = host.querySelector('rui-toast [data-title]');
		expect(title?.textContent).toContain('Profile saved');
		expect(host.querySelector('.rui-toaster-announcer')?.getAttribute('aria-live')).toBe('polite');
		await expectAnnouncement(host, 'Profile saved');
	});

	function watchAnnouncer(host: ParentNode): string[] {
		const announcer = host.querySelector('.rui-toaster-announcer') as HTMLElement;
		const seen: string[] = [];
		new MutationObserver(() => seen.push(announcer.textContent ?? '')).observe(announcer, {
			childList: true,
			characterData: true,
			subtree: true,
		});
		return seen;
	}

	it('announces an identical message again by clearing the live region first', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();
		const seen = watchAnnouncer(host);

		toast('Saved');
		await expectAnnouncement(host, 'Saved');
		toast('Saved');
		await vi.waitFor(() => expect(seen.filter((text) => text === 'Saved')).toHaveLength(2));

		expect(seen).toEqual(['Saved', '', 'Saved']);
	});

	it('announces toasts created in the same tick together', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();

		toast('First saved');
		toast.success('Second saved');

		await expectAnnouncement(host, 'First saved. Second saved');
	});

	it('does not double the period when joining announcements', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();

		toast('Saved.', { description: 'All good' });
		toast('Synced!');

		await expectAnnouncement(host, 'Saved. All good. Synced!');
	});

	it('announces a toast updated in place, as toast.promise does', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();
		let resolve: (value: string) => void = () => {};

		toast.promise(new Promise<string>((done) => (resolve = done)), {
			loading: 'Saving',
			success: (name) => `${name} saved`,
			error: 'Save failed',
		});
		await expectAnnouncement(host, 'Saving');
		resolve('Profile');

		await expectAnnouncement(host, 'Profile saved');
	});

	it('announces a toast updated in place to error from the assertive region', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();
		let reject: (reason: unknown) => void = () => {};

		toast.promise(new Promise<string>((_, fail) => (reject = fail)), {
			loading: 'Saving',
			success: 'Saved',
			error: 'Save failed',
		});
		await expectAnnouncement(host, 'Saving');
		reject(new Error('offline'));

		await vi.waitFor(() => {
			expect(host.querySelector('.rui-toaster-announcer[data-assertive]')?.textContent).toBe('Save failed');
		});
		expect(host.querySelector('.rui-toaster-announcer[data-assertive]')?.getAttribute('aria-live')).toBe(
			'assertive',
		);
	});

	it('leaves a new error toast to its own alert role', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();

		toast.error('Sync failed');
		toast('Profile saved');
		await expectAnnouncement(host, 'Profile saved');

		expect(host.querySelector('.rui-toaster-announcer[data-assertive]')?.textContent).toBe('');
	});

	it('announces a toast shown again with the same id', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();
		const seen = watchAnnouncer(host);

		toast('Saved', { id: 'save' });
		await expectAnnouncement(host, 'Saved');
		toast('Saved', { id: 'save' });

		await vi.waitFor(() => expect(seen.filter((text) => text === 'Saved')).toHaveLength(2));
	});

	it('announces the supplied announcement text instead of the title', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();

		toast('Saved', { announcement: 'Your profile was saved' });

		await expectAnnouncement(host, 'Your profile was saved');
	});

	it('names the close button from closeLabel and defaults to Close toast', async () => {
		const { host } = mount(<RuiToaster closeButton />);
		await settled();

		toast('Default label');
		toast('Custom label', { closeLabel: 'Fermer' });
		await settledToasts(host);

		const labels = [...host.querySelectorAll('[data-toast-close]')].map((b) => b.getAttribute('aria-label'));
		expect(labels.sort()).toEqual(['Close toast', 'Fermer']);
	});

	it('renders an error toast as an assertive alert and other variants as status', async () => {
		const { host } = mount(<RuiToaster position="bottom-end" />);
		await settled();

		toast.error('Save failed');
		toast.success('Profile saved');
		await settledToasts(host);

		const surfaceOf = (text: string) =>
			toastElements(host)
				.find((element) => element.textContent?.includes(text))
				?.querySelector('[data-ref="toast"]') as HTMLElement;
		const error = surfaceOf('Save failed');
		expect(error.getAttribute('role')).toBe('alert');
		expect(error.getAttribute('aria-live')).toBe('assertive');
		expect(error.getAttribute('aria-atomic')).toBe('true');
		const success = surfaceOf('Profile saved');
		expect(success.getAttribute('role')).toBe('status');
		expect(success.getAttribute('aria-live')).toBe('off');
		expect(error.closest('[aria-live="polite"]')).toBeNull();
		await expectAnnouncement(host, 'Profile saved');
	});

	it('dismisses all toasts', async () => {
		const { host } = mount(<RuiToaster />);
		await settled();

		toast('One');
		toast('Two');
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBeGreaterThan(0);

		toast.dismiss();
		await new Promise((resolve) => setTimeout(resolve, 250));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
	});

	it('positions against a container selector instead of the viewport', async () => {
		const stage = document.createElement('div');
		stage.className = 'toast-stage';
		document.body.appendChild(stage);
		const root = createRoot(stage);
		root.render(<RuiToaster container=".toast-stage" position="bottom-end" />);
		await settled();

		const toaster = stage.querySelector('rui-toaster') as HTMLElement | null;
		expect(toaster).not.toBeNull();
		expect(toaster?.dataset.contained).toBe('true');
		expect(getComputedStyle(stage).position).toBe('relative');
		expect(getComputedStyle(toaster!).position).toBe('absolute');

		root.unmount();
		stage.remove();
	});

	it('limits mounted toasts to visibleToasts and keeps the newest', async () => {
		const { host } = mount(<RuiToaster visibleToasts={3} position="bottom-end" duration={60_000} />);
		await settled();

		toast('A');
		toast('B');
		toast('C');
		toast('D');
		await settled();
		await settled();

		const titles = toastElements(host).map((el) => el.querySelector('[data-title]')?.textContent);
		expect(titles).toEqual(['D', 'C', 'B']);
	});

	it('auto-dismisses after duration when not hovered', async () => {
		const { host } = mount(<RuiToaster position="bottom-end" duration={400} />);
		await settled();

		toast('Will expire');
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 700));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
	});

	it('auto-dismisses stacked toasts without resetting sibling timers', async () => {
		const { host } = mount(<RuiToaster position="bottom-end" duration={500} />);
		await settled();

		toast('First');
		toast('Second');
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(2);

		await new Promise((resolve) => setTimeout(resolve, 900));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
	});

	it('keeps lifetime running when expand prop is true', async () => {
		const { host } = mount(<RuiToaster expand position="bottom-end" duration={400} />);
		await settled();

		toast('Expanded still expires');
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 700));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
	});

	it('preserves toast element identity when a newer toast is prepended', async () => {
		const { host } = mount(<RuiToaster position="bottom-end" duration={60_000} />);
		await settled();

		toast('First');
		await settled();
		const first = host.querySelector('rui-toast') as RuiToast | null;
		expect(first).not.toBeNull();
		const firstId = first!.toastId;

		toast('Second');
		await settled();
		await settled();

		const els = toastElements(host) as RuiToast[];
		expect(els).toHaveLength(2);
		expect(els.find((el) => el.toastId === firstId)).toBe(first);
		expect(first!.dataset.mounted).toBe('true');
		expect(els[0]?.toastId).not.toBe(firstId);
		expect(els[0]?.dataset.front).toBe('true');
		expect(first!.dataset.front).toBe('false');
	});

	it('resumes leftover lifetime after a remount instead of restarting duration', async () => {
		const { host } = mount(<RuiToaster position="bottom-end" duration={800} />);
		await settled();

		toast('Remount me');
		await settledToasts(host);

		const el = host.querySelector('rui-toast') as RuiToast | null;
		expect(el).not.toBeNull();

		await new Promise((resolve) => setTimeout(resolve, 300));
		el!.disconnectedCallback();
		el!.connectedCallback();
		await settledToasts(host);

		await new Promise((resolve) => setTimeout(resolve, 650 + TOAST_EXIT_MS));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
	});

	it('keeps collapsed peeks to three', async () => {
		const { host } = mount(
			<RuiToaster expand={false} visibleToasts={6} gap={TOAST_GAP} position="bottom-end" duration={60_000} />,
		);
		await settled();

		for (let i = 0; i < 6; i += 1) {
			toast(`Toast ${i}`);
		}
		await settled();
		await settled();

		const toaster = host.querySelector('rui-toaster') as HTMLElement;
		const list = toaster.querySelector('[data-ref="list"]') as HTMLElement;
		const els = toastElements(toaster);
		expect(els.length).toBe(6);

		const visible = els.filter((el) => el.dataset.visible !== 'false');
		expect(visible.length).toBe(TOAST_COLLAPSED_PEEK);
		expect(els[3]?.dataset.visible).toBe('false');

		const frontHeight = Number.parseFloat(els[0]?.style.height || '0');
		expect(list.style.height).toBe(`${collapsedStackHeight(frontHeight, TOAST_COLLAPSED_PEEK, TOAST_GAP)}px`);
	});

	it('reveals every mounted toast when expanded', async () => {
		const { host } = mount(
			<RuiToaster expand visibleToasts={5} gap={TOAST_GAP} position="bottom-end" duration={60_000} />,
		);
		await settled();

		for (let i = 0; i < 5; i += 1) {
			toast(`Toast ${i}`);
		}
		await settled();
		await settled();

		const toaster = host.querySelector('rui-toaster') as HTMLElement;
		const els = toastElements(toaster);
		expect(els.length).toBe(5);
		expect(els.every((el) => el.dataset.visible === 'true')).toBe(true);
		expect(toaster.dataset.expanded).toBe('true');
	});

	it('expands mixed-height toasts with cumulative offsets', async () => {
		const { host } = mount(<RuiToaster expand gap={TOAST_GAP} position="bottom-end" duration={60_000} />);
		await settled();

		toast('Short');
		toast('Tall toast with a longer description that wraps to more lines', {
			description: 'Extra body copy so this toast is taller than the short one above.',
		});
		toast('Medium\nwith\nline breaks');
		await settled();
		await settled();

		const els = toastElements(host);
		expect(els.length).toBe(3);

		const heights = els.map((el) => {
			const inner = el.querySelector('[data-ref="toast"]');
			return Math.round(inner instanceof HTMLElement ? inner.offsetHeight : el.offsetHeight);
		});

		expect(heights[1]).toBeGreaterThan(heights[0]!);

		for (let index = 0; index < els.length; index += 1) {
			const el = els[index]!;
			expect(el.dataset.expanded).toBe('true');
			expect(el.style.height).toBe(`${heights[index]}px`);

			let heightBefore = 0;
			for (let i = 0; i < index; i += 1) heightBefore += heights[i] ?? 0;
			const expectedOffset = heightBefore + index * TOAST_GAP;
			expect(el.style.getPropertyValue('--rui-toast-offset')).toBe(`${expectedOffset}px`);
			expect(el.style.getPropertyValue('--rui-toast-y')).toBe(`translateY(${-expectedOffset}px)`);
		}
	});

	it('pauses lifetime on hover and resumes leftover time after leave', async () => {
		const { host } = mount(<RuiToaster position="bottom-end" duration={600} />);
		await settled();

		toast('Held on hover');
		await settledToasts(host);

		await new Promise((resolve) => setTimeout(resolve, 200));

		const toaster = host.querySelector('rui-toaster') as unknown as {
			interacting: boolean;
			syncPauseState: () => void;
		};

		toaster.interacting = true;
		toaster.syncPauseState();

		await new Promise((resolve) => setTimeout(resolve, 900));
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(1);

		toaster.interacting = false;
		toaster.syncPauseState();

		await new Promise((resolve) => setTimeout(resolve, 250));
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 700));
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(0);
	});
});
