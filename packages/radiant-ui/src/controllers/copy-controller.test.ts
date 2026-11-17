import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ControllerHost } from './controller';
import { CopyController, createCopyController, type CopyControllerConfig } from './copy-controller';

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => (resolve = res));
	return { promise, resolve };
}

describe('CopyController', () => {
	const controllers: CopyController[] = [];

	afterEach(() => {
		controllers.splice(0).forEach((controller) => controller.destroy());
		document.body.replaceChildren();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	function mount(config: Partial<CopyControllerConfig> = {}, writeText = vi.fn().mockResolvedValue(undefined)) {
		vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
		const button = document.createElement('button');
		document.body.append(button);
		const copied = deferred();
		const controller = new CopyController({
			getText: 'hello',
			getTrigger: () => button,
			...config,
			onCopy: (text) => {
				config.onCopy?.(text);
				copied.resolve();
			},
		});
		controllers.push(controller);
		controller.attach();
		return { button, controller, writeText, copied: copied.promise };
	}

	function withoutAsyncClipboard(): void {
		vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(undefined as unknown as Clipboard);
	}

	it('writes the text to the clipboard on click and shows the copied state', async () => {
		const onCopy = vi.fn();
		const { button, controller, writeText, copied } = mount({ onCopy });

		button.click();
		await copied;
		expect(button.getAttribute('data-copy-state')).toBe('copied');

		expect(writeText).toHaveBeenCalledWith('hello');
		expect(controller.getState()).toBe('copied');
		expect(onCopy).toHaveBeenCalledWith('hello');
	});

	it('reads the text at copy time, awaiting an async getter', async () => {
		let value = 'first';
		const { controller, writeText } = mount({ getText: async () => value });

		value = 'second';
		const outcome = await controller.copy();

		expect(writeText).toHaveBeenCalledWith('second');
		expect(outcome).toEqual({ state: 'copied', text: 'second' });
	});

	it('reports a rejected write as the error state without throwing', async () => {
		const failure = new Error('denied');
		const onError = vi.fn();
		const { button, controller } = mount({ onError }, vi.fn().mockRejectedValue(failure));

		const outcome = await controller.copy();

		expect(outcome).toEqual({ state: 'error', error: failure });
		expect(button.getAttribute('data-copy-state')).toBe('error');
		expect(onError).toHaveBeenCalledWith(failure);
	});

	it('reports a throwing text getter as the error state', async () => {
		const { controller } = mount({
			getText: () => {
				throw new Error('no text');
			},
		});

		expect((await controller.copy()).state).toBe('error');
	});

	it('returns to idle after resetDelay', async () => {
		vi.useFakeTimers();
		const { button, controller } = mount({ resetDelay: 500 });

		await controller.copy();
		expect(controller.getState()).toBe('copied');
		vi.advanceTimersByTime(499);
		expect(controller.getState()).toBe('copied');
		vi.advanceTimersByTime(1);
		expect(controller.getState()).toBe('idle');
		expect(button.hasAttribute('data-copy-state')).toBe(false);
	});

	it('restarts the reset timer when copying again while copied', async () => {
		vi.useFakeTimers();
		const { controller } = mount({ resetDelay: 1000 });

		await controller.copy();
		vi.advanceTimersByTime(800);
		await controller.copy();
		vi.advanceTimersByTime(800);
		expect(controller.getState()).toBe('copied');
		vi.advanceTimersByTime(200);
		expect(controller.getState()).toBe('idle');
	});

	it('announces the result through the announce callback', async () => {
		const announce = vi.fn();
		const { controller } = mount({ announce });

		await controller.copy();

		expect(announce).toHaveBeenCalledWith('Copied');
	});

	it('writes the state to the feedback target instead of the trigger', async () => {
		const label = document.createElement('span');
		document.body.append(label);
		const { button, controller } = mount({ getFeedbackTarget: () => label });

		await controller.copy();

		expect(label.getAttribute('data-copy-state')).toBe('copied');
		expect(button.hasAttribute('data-copy-state')).toBe(false);
	});

	it('copies for the matching descendant a delegated selector finds', async () => {
		const root = document.createElement('div');
		root.innerHTML = '<button data-copy="a"><b>A</b></button><button data-copy="b">B</button><p>none</p>';
		document.body.append(root);
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		const copied = deferred();
		const controller = new CopyController({
			getRoot: () => root,
			selector: '[data-copy]',
			getText: (trigger) => trigger!.dataset.copy!,
			onCopy: copied.resolve,
		});
		controllers.push(controller);
		controller.attach();

		root.querySelector('p')!.click();
		expect(writeText).not.toHaveBeenCalled();

		root.querySelector('b')!.click();
		await copied.promise;
		expect(writeText).toHaveBeenCalledWith('a');
		expect(root.querySelector('[data-copy="a"]')!.getAttribute('data-copy-state')).toBe('copied');
		expect(root.querySelector('[data-copy="b"]')!.hasAttribute('data-copy-state')).toBe(false);
	});

	it('falls back to a hidden textarea and execCommand when the async API is missing', async () => {
		withoutAsyncClipboard();
		let copied = '';
		const exec = vi.spyOn(document, 'execCommand').mockImplementation(() => {
			copied = document.querySelector('textarea')!.value;
			return true;
		});
		const button = document.createElement('button');
		document.body.append(button);
		button.focus();
		const controller = new CopyController({ getText: 'plain', getTrigger: () => button });
		controllers.push(controller);
		controller.attach();

		const outcome = await controller.copy();

		expect(exec).toHaveBeenCalledWith('copy');
		expect(copied).toBe('plain');
		expect(outcome.state).toBe('copied');
		expect(document.querySelector('textarea')).toBeNull();
		expect(document.activeElement).toBe(button);
	});

	it('restores the page selection and mounts the fallback textarea inside a modal', async () => {
		withoutAsyncClipboard();
		const dialog = document.createElement('div');
		dialog.setAttribute('aria-modal', 'true');
		const button = document.createElement('button');
		const paragraph = document.createElement('p');
		paragraph.textContent = 'selected prose';
		dialog.append(button);
		document.body.append(dialog, paragraph);
		const selection = document.getSelection()!;
		selection.selectAllChildren(paragraph);
		let parent: Element | null = null;
		vi.spyOn(document, 'execCommand').mockImplementation(() => {
			parent = document.querySelector('textarea')!.parentElement;
			return true;
		});
		const controller = new CopyController({ getText: 'clipboard text', getTrigger: () => button });
		controllers.push(controller);
		controller.attach();

		await controller.copy();

		expect(parent).toBe(dialog);
		expect(selection.rangeCount).toBe(1);
		expect(selection.toString()).toBe('selected prose');
	});

	it('reports a refused execCommand as the error state', async () => {
		withoutAsyncClipboard();
		vi.spyOn(document, 'execCommand').mockReturnValue(false);
		const button = document.createElement('button');
		document.body.append(button);
		const controller = new CopyController({ getText: 'x', getTrigger: () => button });
		controllers.push(controller);
		controller.attach();

		expect((await controller.copy()).state).toBe('error');
		expect(document.querySelector('textarea')).toBeNull();
	});

	it('does nothing after destroy, and clears the attribute and the pending reset', async () => {
		vi.useFakeTimers();
		const { button, controller, writeText } = mount();
		await controller.copy();

		controller.destroy();
		expect(button.hasAttribute('data-copy-state')).toBe(false);
		expect(controller.getState()).toBe('idle');
		expect(vi.getTimerCount()).toBe(0);

		writeText.mockClear();
		button.click();
		expect(await controller.copy()).toEqual({ state: 'idle' });
		expect(writeText).not.toHaveBeenCalled();
		expect(button.hasAttribute('data-copy-state')).toBe(false);
	});

	it('ignores a copy that finishes after destroy', async () => {
		let release: () => void = () => {};
		const { button, controller } = mount(
			{},
			vi.fn(() => new Promise<void>((resolve) => (release = resolve))),
		);

		const pending = controller.copy();
		controller.destroy();
		release();

		expect(await pending).toEqual({ state: 'idle' });
		expect(button.hasAttribute('data-copy-state')).toBe(false);
	});

	it('listens once after destroy and attach again', async () => {
		const { button, controller, writeText, copied } = mount();

		controller.destroy();
		controller.attach();
		button.click();
		await copied;

		expect(writeText).toHaveBeenCalledTimes(1);
	});

	it('lets a newer copy win over an older one that finishes later', async () => {
		const releases: Array<() => void> = [];
		const onCopy = vi.fn();
		const { button, controller } = mount(
			{ onCopy },
			vi.fn(() => new Promise<void>((resolve) => releases.push(resolve))),
		);
		const older = controller.copy(button);
		const newer = controller.copy(button);

		releases[1]();
		expect(await newer).toMatchObject({ state: 'copied' });
		releases[0]();

		expect(await older).toEqual({ state: 'idle' });
		expect(controller.getState()).toBe('copied');
		expect(onCopy).toHaveBeenCalledTimes(1);
	});

	it('is bound to a host through createCopyController', async () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host: ControllerHost = {
			registerConnectedCallback: (callback) => connected.push(callback),
			registerCleanupCallback: (callback) => cleanup.push(callback),
		};
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		const button = document.createElement('button');
		document.body.append(button);

		const copied = deferred();
		const bound = createCopyController(host, { getText: 'x', getTrigger: () => button, onCopy: copied.resolve });
		controllers.push(bound);
		button.click();
		expect(writeText).not.toHaveBeenCalled();

		connected.forEach((callback) => callback());
		button.click();
		await copied.promise;
		expect(bound.getState()).toBe('copied');

		cleanup.forEach((callback) => callback());
		expect(bound.getState()).toBe('idle');
	});
});
