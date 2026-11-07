import { waitFor } from '@testing-library/dom';
import { setDevWarningsEnabled } from '@ecopages/jsx/jsx-dev-runtime';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { commands } from 'vitest/browser';

type MountFrame = (tag: string, container: HTMLElement) => HTMLElement;
type DistApp = { mountFrame: MountFrame; mountLateFrame: MountFrame };

async function loadDistApp(mode: 'development' | 'production'): Promise<DistApp> {
	const code = await commands.bundleDistApp(mode);
	const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));

	try {
		return (await import(/* @vite-ignore */ url)) as DistApp;
	} finally {
		URL.revokeObjectURL(url);
	}
}

function mountContainer(): HTMLElement {
	const container = document.createElement('div');
	document.body.append(container);
	return container;
}

describe('published dist development warnings in a browser', () => {
	afterEach(() => {
		setDevWarningsEnabled(undefined);
		vi.restoreAllMocks();
		document.body.innerHTML = '';
	});

	test('A development build of an app renders the children a view passes to a host without warning', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const app = await loadDistApp('development');

		const frame = app.mountFrame('dist-dev-frame', mountContainer());
		await waitFor(() => expect(frame.querySelector('main > h2')?.textContent).toBe('Title'));

		expect(warn).not.toHaveBeenCalled();
	});

	test('A development build of an app warns when a tag is defined after a view rendered it', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const app = await loadDistApp('development');

		const frame = app.mountLateFrame('dist-dev-late-frame', mountContainer());
		await waitFor(() => expect(frame.querySelector('main > p')?.textContent).toBe('Body'));

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('<dist-dev-late-frame> was defined after a JSX view rendered it'),
		);
	});

	test('A production build of the same app logs no Radiant development warning', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const app = await loadDistApp('production');
		const frame = app.mountFrame('dist-prod-frame', mountContainer());
		const lateFrame = app.mountLateFrame('dist-prod-late-frame', mountContainer());
		await waitFor(() => expect(frame.querySelector('main > h2')?.textContent).toBe('Title'));
		await waitFor(() => expect(lateFrame.querySelector('main > p')?.textContent).toBe('Body'));

		expect(warn).not.toHaveBeenCalled();
	});

	test('A development build honors the JSX development-warning switch', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const app = await loadDistApp('development');
		setDevWarningsEnabled(false);

		const lateFrame = app.mountLateFrame('dist-disabled-late-frame', mountContainer());
		await waitFor(() => expect(lateFrame.querySelector('main > p')?.textContent).toBe('Body'));

		expect(warn).not.toHaveBeenCalled();
	});
});
