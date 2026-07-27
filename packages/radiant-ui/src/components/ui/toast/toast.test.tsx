import { describe, expect, it, afterEach } from 'vitest';
import { createRoot, type JsxRenderable, type JsxRoot } from '@ecopages/jsx';
import { RuiToaster, toast } from './index';
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

describe('rui-toaster', () => {
	afterEach(() => {
		toast.dismiss();
		toast.clear();
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

	it('updates a promise toast from loading to success', async () => {
		const { host, cleanup } = mount(<RuiToaster />);
		await settled();

		let resolvePromise!: (value: string) => void;
		const pending = new Promise<string>((resolve) => {
			resolvePromise = resolve;
		});

		toast.promise(pending, {
			loading: 'Saving…',
			success: 'Saved',
			error: 'Failed',
		});
		await settled();
		expect(host.querySelector('rui-toast [data-title]')?.textContent).toContain('Saving…');

		resolvePromise('ok');
		await settled();
		await new Promise((resolve) => setTimeout(resolve, 0));
		await settled();

		expect(host.querySelector('rui-toast [data-title]')?.textContent).toContain('Saved');
		cleanup();
	});
});
