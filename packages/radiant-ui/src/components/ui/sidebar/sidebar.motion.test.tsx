import { afterEach, describe, expect, it } from 'vitest';
import { cdp } from 'vitest/browser';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import '../../../styles/radiant-ui.css';
import './sidebar.css';
import { RuiSidebar, RuiSidebarInset, RuiSidebarProvider } from './sidebar';

type SidebarEl = HTMLElement & {
	setOpen: (next: boolean) => void;
	mobileBreakpoint: number;
};

const cleanups: Array<() => void> = [];

afterEach(async () => {
	cleanups.splice(0).forEach((cleanup) => cleanup());
	await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: '' }] });
});

function frame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function mount(element: JsxRenderable): HTMLElement {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	root.render(element);
	cleanups.push(() => {
		root.unmount();
		host.remove();
	});
	return host;
}

interface Drawer {
	sidebar: SidebarEl;
	shell: HTMLElement;
	pane: HTMLElement;
	scrim: HTMLElement;
}

/** Mounts a mobile drawer and waits until transitions are armed (`data-motion`). */
async function mountDrawer(options: { open: boolean; side?: 'left' | 'right'; breakpoint?: number }): Promise<Drawer> {
	const host = mount(
		<RuiSidebarProvider
			sidebar={
				<RuiSidebar
					id="drawer"
					collapsible="full"
					side={options.side ?? 'left'}
					open={options.open}
					mobileBreakpoint={options.breakpoint ?? 100_000}
					label="Drawer"
				>
					<span>Nav</span>
				</RuiSidebar>
			}
		>
			<RuiSidebarInset id="main">
				<p>Content</p>
			</RuiSidebarInset>
		</RuiSidebarProvider>,
	);
	const sidebar = host.querySelector('rui-sidebar') as SidebarEl;
	const shell = host.querySelector('[data-ref="root"]') as HTMLElement;
	await waitUntil(() => shell.hasAttribute('data-motion'));
	return {
		sidebar,
		shell,
		pane: host.querySelector('[data-ref="pane"]') as HTMLElement,
		scrim: host.querySelector('[data-ref="scrim"]') as HTMLElement,
	};
}

async function waitUntil(check: () => boolean): Promise<void> {
	for (let i = 0; i < 100; i += 1) {
		if (check()) return;
		await frame();
	}
	throw new Error('Timed out waiting for the condition.');
}

function translateX(element: HTMLElement): number {
	return new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
}

interface Sample {
	t: number;
	x: number;
	width: number;
	opacity: number;
	visibility: string;
	left: number;
}

/** Records the pane and scrim every frame for `ms`. */
async function record(drawer: Drawer, ms: number): Promise<Sample[]> {
	const samples: Sample[] = [];
	const start = performance.now();
	while (performance.now() - start < ms) {
		samples.push({
			t: performance.now() - start,
			x: translateX(drawer.pane),
			width: drawer.pane.getBoundingClientRect().width,
			left: drawer.pane.getBoundingClientRect().left,
			opacity: Number(getComputedStyle(drawer.scrim).opacity),
			visibility: getComputedStyle(drawer.shell).visibility,
		});
		await frame();
	}
	return samples;
}

describe('mobile drawer motion', () => {
	it('slides the pane in from the left with a fixed width and fades the scrim in', async () => {
		const drawer = await mountDrawer({ open: false });
		const paneWidth = drawer.pane.getBoundingClientRect().width;
		expect(paneWidth).toBeGreaterThan(0);
		expect(translateX(drawer.pane)).toBeCloseTo(-paneWidth, 0);

		drawer.sidebar.setOpen(true);
		const samples = await record(drawer, 450);

		const early = samples.find((s) => s.t > 40)!;
		expect(early.x).toBeLessThan(-1);
		expect(early.x).toBeGreaterThan(-paneWidth + 1);
		expect(samples.at(-1)!.x).toBe(0);
		expect(new Set(samples.map((s) => s.width))).toEqual(new Set([paneWidth]));
		expect(early.opacity).toBeGreaterThan(0);
		expect(early.opacity).toBeLessThan(1);
		expect(samples.at(-1)!.opacity).toBe(1);
	});

	it('keeps the drawer visible and on screen while it slides out, then hides it', async () => {
		const drawer = await mountDrawer({ open: true });
		const paneWidth = drawer.pane.getBoundingClientRect().width;

		drawer.sidebar.setOpen(false);
		expect(getComputedStyle(drawer.shell).pointerEvents).toBe('none');
		expect(drawer.pane.hasAttribute('inert')).toBe(true);
		const samples = await record(drawer, 450);

		const mid = samples.find((s) => s.t > 60 && s.t < 120)!;
		expect(mid.visibility).toBe('visible');
		expect(mid.left).toBeGreaterThan(-paneWidth + 1);
		expect(mid.x).toBeLessThan(0);
		expect(mid.opacity).toBeGreaterThan(0);
		expect(mid.opacity).toBeLessThan(1);
		const last = samples.at(-1)!;
		expect(last.visibility).toBe('hidden');
		expect(last.x).toBeCloseTo(-paneWidth, 0);
		expect(last.opacity).toBe(0);
		expect(new Set(samples.map((s) => s.width))).toEqual(new Set([paneWidth]));
	});

	it('takes longer to enter than to exit', async () => {
		const drawer = await mountDrawer({ open: false });
		drawer.sidebar.setOpen(true);
		const entering = await record(drawer, 450);
		drawer.sidebar.setOpen(false);
		const leaving = await record(drawer, 450);

		const settledAt = (samples: Sample[], done: (s: Sample) => boolean) => samples.find(done)!.t;
		const enter = settledAt(entering, (s) => s.x === 0);
		const exit = settledAt(leaving, (s) => s.visibility === 'hidden');
		expect(enter).toBeGreaterThan(exit);
		expect(exit).toBeGreaterThan(150);
		expect(exit).toBeLessThan(260);
	});

	it('slides the right-side drawer in from the right', async () => {
		const drawer = await mountDrawer({ open: false, side: 'right' });
		const paneWidth = drawer.pane.getBoundingClientRect().width;
		expect(translateX(drawer.pane)).toBeCloseTo(paneWidth, 0);

		drawer.sidebar.setOpen(true);
		await wait(80);
		const x = translateX(drawer.pane);
		expect(x).toBeGreaterThan(1);
		expect(x).toBeLessThan(paneWidth);
	});

	it('reverses from the current position when toggled mid-transition', async () => {
		const drawer = await mountDrawer({ open: false });
		drawer.sidebar.setOpen(true);
		await wait(100);
		const before = translateX(drawer.pane);
		drawer.sidebar.setOpen(false);
		await frame();
		const after = translateX(drawer.pane);
		expect(before).toBeLessThan(0);
		expect(Math.abs(after - before)).toBeLessThan(40);
		await wait(40);
		expect(translateX(drawer.pane)).toBeLessThan(after);
	});

	it('does not play an animation on first paint', async () => {
		const host = mount(
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar id="first" collapsible="full" defaultOpen mobileBreakpoint={100_000} label="First">
						<span>Nav</span>
					</RuiSidebar>
				}
			>
				<RuiSidebarInset id="main">
					<p>Content</p>
				</RuiSidebarInset>
			</RuiSidebarProvider>,
		);
		const shell = host.querySelector('[data-ref="root"]') as HTMLElement;
		expect(getComputedStyle(shell).visibility).toBe('visible');
		await waitUntil(() => shell.getAttribute('data-mobile') === 'true');
		const pane = host.querySelector('[data-ref="pane"]') as HTMLElement;
		const seen = new Set<string>();
		for (let i = 0; i < 8; i += 1) {
			seen.add(`${getComputedStyle(shell).visibility}:${translateX(pane)}`);
			await frame();
		}
		expect(seen.size).toBe(1);
		expect([...seen][0]).toMatch(/^hidden:-\d/);
	});

	it('does not animate when the viewport crosses the breakpoint', async () => {
		const drawer = await mountDrawer({ open: false, breakpoint: 100_000 });
		const host = drawer.sidebar;
		host.mobileBreakpoint = 1;
		await frame();
		await frame();
		const shell = drawer.shell;
		expect(shell.getAttribute('data-mobile')).not.toBe('true');
		await waitUntil(() => shell.hasAttribute('data-motion'));

		host.mobileBreakpoint = 100_000;
		await frame();
		expect(shell.getAttribute('data-mobile')).toBe('true');
		expect(shell.hasAttribute('data-motion')).toBe(false);
		const paneWidth = drawer.pane.getBoundingClientRect().width;
		expect(translateX(drawer.pane)).toBeCloseTo(-paneWidth, 0);
		expect(getComputedStyle(drawer.shell).visibility).toBe('hidden');
		await waitUntil(() => shell.hasAttribute('data-motion'));
	});

	it('fades instead of sliding when reduced motion is requested', async () => {
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
		});
		const drawer = await mountDrawer({ open: false });
		expect(translateX(drawer.pane)).toBe(0);

		drawer.sidebar.setOpen(true);
		const samples = await record(drawer, 300);
		expect(new Set(samples.map((s) => s.x))).toEqual(new Set([0]));
		expect(samples.at(-1)!.opacity).toBe(1);
		expect(Number(getComputedStyle(drawer.pane).opacity)).toBe(1);
	});

	it('takes the scrim out of the accessibility tree once closed', async () => {
		const drawer = await mountDrawer({ open: true });
		expect(getComputedStyle(drawer.scrim).visibility).toBe('visible');
		drawer.sidebar.setOpen(false);
		await wait(350);
		expect(getComputedStyle(drawer.scrim).visibility).toBe('hidden');
		drawer.scrim.focus();
		expect(document.activeElement).not.toBe(drawer.scrim);
	});
});
