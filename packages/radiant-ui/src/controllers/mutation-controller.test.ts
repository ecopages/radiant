import { afterEach, describe, expect, it, vi } from 'vitest';
import { MutationController, createMutationController } from './mutation-controller';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('MutationController', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('reports mutations between attach and destroy and nothing after', async () => {
		const target = document.createElement('div');
		const onMutate = vi.fn();
		const controller = new MutationController({
			getTarget: () => target,
			options: { childList: true },
			onMutate,
		});

		target.append(document.createElement('span'));
		await flush();
		expect(onMutate).not.toHaveBeenCalled();

		controller.attach();
		target.append(document.createElement('span'));
		await flush();
		expect(onMutate).toHaveBeenCalledTimes(1);

		controller.destroy();
		target.append(document.createElement('span'));
		await flush();
		expect(onMutate).toHaveBeenCalledTimes(1);
	});

	it('keeps one observer across repeated attach and survives repeated destroy', async () => {
		const target = document.createElement('div');
		const onMutate = vi.fn();
		const controller = new MutationController({ getTarget: () => target, options: { childList: true }, onMutate });

		controller.attach();
		controller.attach();
		target.append(document.createElement('span'));
		await flush();
		expect(onMutate).toHaveBeenCalledTimes(1);

		controller.destroy();
		controller.destroy();
		controller.attach();
		target.append(document.createElement('span'));
		await flush();
		expect(onMutate).toHaveBeenCalledTimes(2);
		controller.destroy();
	});

	it('moves to a new target when attached again', async () => {
		let target = document.createElement('div');
		const first = target;
		const second = document.createElement('div');
		const onMutate = vi.fn();
		const controller = new MutationController({ getTarget: () => target, options: { childList: true }, onMutate });

		controller.attach();
		target = second;
		controller.attach();
		first.append(document.createElement('span'));
		await flush();
		expect(onMutate).not.toHaveBeenCalled();

		second.append(document.createElement('span'));
		await flush();
		expect(onMutate).toHaveBeenCalledTimes(1);
		controller.destroy();
	});

	it('attaches to nothing without a target', async () => {
		const onMutate = vi.fn();
		const controller = new MutationController({ getTarget: () => null, options: { childList: true }, onMutate });

		expect(() => controller.attach()).not.toThrow();
		expect(() => controller.destroy()).not.toThrow();
		expect(onMutate).not.toHaveBeenCalled();
	});

	it('is bound to a host by its factory', async () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const target = document.createElement('div');
		const onMutate = vi.fn();
		createMutationController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{ getTarget: () => target, options: { childList: true }, onMutate },
		);

		connected.forEach((callback) => callback());
		target.append(document.createElement('span'));
		await flush();
		expect(onMutate).toHaveBeenCalledTimes(1);

		cleanup.forEach((callback) => callback());
		target.append(document.createElement('span'));
		await flush();
		expect(onMutate).toHaveBeenCalledTimes(1);
	});
});
