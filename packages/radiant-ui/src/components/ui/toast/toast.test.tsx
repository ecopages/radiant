import { describe, expect, it, afterEach } from 'vitest';
import { createRoot, type JsxRenderable, type JsxRoot } from '@ecopages/jsx';
import { RuiToaster, toast, TOAST_COLLAPSED_PEEK, TOAST_GAP } from './index';
import { collapsedStackHeight } from './stack-layout';
import type { RuiToast } from './toast.script';
import { resetToastDeadlines } from './toast.script';
import './toast.script';
import './toaster.script';

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root: JsxRoot = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await customElements.whenDefined('rui-toaster');
	await customElements.whenDefined('rui-toast');
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

function toastElements(host: ParentNode): HTMLElement[] {
	return [...host.querySelectorAll('rui-toast')] as HTMLElement[];
}

describe('rui-toaster', () => {
	afterEach(() => {
		toast.dismiss();
		toast.clear();
		resetToastDeadlines();
	});

	it('renders a toast from the imperative API', async () => {
		const { host, cleanup } = mount(<RuiToaster position="bottom-end" closeButton />);
		await settled();

		toast.success('Profile saved');
		await settled();

		const title = host.querySelector('rui-toast [data-title]');
		expect(title?.textContent).toContain('Profile saved');
		expect(host.querySelector('.rui-toaster-region')?.getAttribute('aria-live')).toBe('polite');

		cleanup();
	});

	it('dismisses all toasts', async () => {
		const { host, cleanup } = mount(<RuiToaster />);
		await settled();

		toast('One');
		toast('Two');
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBeGreaterThan(0);

		toast.dismiss();
		await new Promise((resolve) => setTimeout(resolve, 250));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
		cleanup();
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
		const { host, cleanup } = mount(<RuiToaster visibleToasts={3} position="bottom-end" duration={60_000} />);
		await settled();

		toast('A');
		toast('B');
		toast('C');
		toast('D');
		await settled();
		await settled();

		const titles = toastElements(host).map((el) => el.querySelector('[data-title]')?.textContent);
		expect(titles).toEqual(['D', 'C', 'B']);

		cleanup();
	});

	it('auto-dismisses after duration when not hovered', async () => {
		const { host, cleanup } = mount(<RuiToaster position="bottom-end" duration={400} />);
		await settled();

		toast('Will expire');
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 700));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
		cleanup();
	});

	it('auto-dismisses stacked toasts without resetting sibling timers', async () => {
		const { host, cleanup } = mount(<RuiToaster position="bottom-end" duration={500} />);
		await settled();

		toast('First');
		toast('Second');
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(2);

		await new Promise((resolve) => setTimeout(resolve, 900));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
		cleanup();
	});

	it('keeps lifetime running when expand prop is true', async () => {
		const { host, cleanup } = mount(<RuiToaster expand position="bottom-end" duration={400} />);
		await settled();

		toast('Expanded still expires');
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 700));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
		cleanup();
	});

	it('preserves toast element identity when a newer toast is prepended', async () => {
		const { host, cleanup } = mount(<RuiToaster position="bottom-end" duration={60_000} />);
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

		cleanup();
	});

	it('resumes leftover lifetime after a remount instead of restarting duration', async () => {
		const { host, cleanup } = mount(<RuiToaster position="bottom-end" duration={800} />);
		await settled();

		toast('Remount me');
		await settled();

		const el = host.querySelector('rui-toast') as RuiToast | null;
		expect(el).not.toBeNull();

		await new Promise((resolve) => setTimeout(resolve, 300));
		el!.disconnectedCallback();
		el!.connectedCallback();
		await settled();

		await new Promise((resolve) => setTimeout(resolve, 650));
		await settled();

		expect(host.querySelectorAll('rui-toast').length).toBe(0);
		cleanup();
	});

	it('keeps collapsed peeks to three', async () => {
		const { host, cleanup } = mount(
			<RuiToaster expand={false} visibleToasts={6} gap={TOAST_GAP} position="bottom-end" duration={60_000} />,
		);
		await settled();

		for (let i = 0; i < 6; i += 1) {
			toast(`Toast ${i}`);
		}
		await settled();
		await settled();

		const toaster = host.querySelector('rui-toaster') as HTMLElement;
		const list = toaster.querySelector('.rui-toaster') as HTMLElement;
		const els = toastElements(toaster);
		expect(els.length).toBe(6);

		const visible = els.filter((el) => el.dataset.visible !== 'false');
		expect(visible.length).toBe(TOAST_COLLAPSED_PEEK);
		expect(els[3]?.dataset.visible).toBe('false');

		const frontHeight = Number.parseFloat(els[0]?.style.height || '0');
		expect(list.style.height).toBe(`${collapsedStackHeight(frontHeight, TOAST_COLLAPSED_PEEK, TOAST_GAP)}px`);

		cleanup();
	});

	it('reveals every mounted toast when expanded', async () => {
		const { host, cleanup } = mount(
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

		cleanup();
	});

	it('expands mixed-height toasts with cumulative offsets', async () => {
		const { host, cleanup } = mount(<RuiToaster expand gap={TOAST_GAP} position="bottom-end" duration={60_000} />);
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
			const inner = el.querySelector('.rui-toast');
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
			expect(el.style.getPropertyValue('--offset')).toBe(`${expectedOffset}px`);
			expect(el.style.getPropertyValue('--y')).toBe(`translateY(${-expectedOffset}px)`);
		}

		cleanup();
	});

	it('pauses lifetime on hover and resumes leftover time after leave', async () => {
		const { host, cleanup } = mount(<RuiToaster position="bottom-end" duration={600} />);
		await settled();

		toast('Held on hover');
		await settled();

		await new Promise((resolve) => setTimeout(resolve, 200));

		const toaster = host.querySelector('rui-toaster') as unknown as {
			interacting: boolean;
			expanded: boolean;
			syncPauseState: () => void;
		};

		toaster.expanded = true;
		toaster.syncPauseState();

		await new Promise((resolve) => setTimeout(resolve, 900));
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(1);

		toaster.expanded = false;
		toaster.syncPauseState();

		await new Promise((resolve) => setTimeout(resolve, 250));
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(1);

		await new Promise((resolve) => setTimeout(resolve, 700));
		await settled();
		expect(host.querySelectorAll('rui-toast').length).toBe(0);

		cleanup();
	});
});
