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

	test('A development build of an app warns when a render-owning host receives a JSX child marked slot="header"', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const app = await loadDistApp('development');

		const frame = app.mountFrame('dist-dev-frame', mountContainer());
		await waitFor(() => expect(frame.querySelector('main > h2')?.textContent).toBe('Title'));

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('slot="header"; pass it as the header property'));
	});

	test('A development build of an app warns when a node is appended to a host fed by a view', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const app = await loadDistApp('development');
		const frame = app.mountFrame('dist-dev-append-frame', mountContainer());
		await waitFor(() => expect(frame.querySelector('main > h2')).not.toBeNull());

		frame.append(document.createElement('i'));

		await waitFor(() =>
			expect(warn).toHaveBeenCalledWith(
				expect.stringContaining('<dist-dev-append-frame> ignores appended nodes'),
			),
		);
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

		frame.append(document.createElement('i'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(warn).not.toHaveBeenCalled();
	});

	test('A development build honors the JSX development-warning switch', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const app = await loadDistApp('development');
		setDevWarningsEnabled(false);

		const frame = app.mountFrame('dist-disabled-frame', mountContainer());
		await waitFor(() => expect(frame.querySelector('main > h2')?.textContent).toBe('Title'));
		frame.append(document.createElement('i'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(warn).not.toHaveBeenCalled();
	});
});
