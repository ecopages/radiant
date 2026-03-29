import { describe, expect, test, vi } from 'vitest';
import { Computed, State, computed, currentComputed, untrack } from '../index';

describe('Computed', () => {
	test('tracks dependencies lazily and caches until a source changes', () => {
		const count = new State(2);
		let runs = 0;
		const double = new Computed(() => {
			runs += 1;
			return count.get() * 2;
		});

		expect(double.get()).toBe(4);
		expect(double.get()).toBe(4);
		expect(runs).toBe(1);

		count.set(3);

		expect(double.get()).toBe(6);
		expect(runs).toBe(2);
	});

	test('subscribers are only notified when the derived value changes', () => {
		const count = new State(0);
		const parity = new Computed(() => ((count.get() & 1) === 0 ? 'even' : 'odd'));
		const notify = vi.fn();

		parity.subscribe(notify);

		expect(parity.get()).toBe('even');
		count.set(2);
		count.set(3);

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith('odd');
	});

	test('updates dependency subscriptions when the computed dependency set changes', () => {
		const usePrimary = new State(true);
		const primary = new State(1);
		const secondary = new State(10);
		const selected = new Computed(() => (usePrimary.get() ? primary.get() : secondary.get()));

		expect(selected.get()).toBe(1);

		usePrimary.set(false);
		expect(selected.get()).toBe(10);

		primary.set(2);
		expect(selected.get()).toBe(10);

		secondary.set(20);
		expect(selected.get()).toBe(20);
	});

	test('nested computed signals refresh through chained dependencies', () => {
		const count = new State(1);
		const doubled = new Computed(() => count.get() * 2);
		const label = new Computed(() => `value:${doubled.get()}`);

		expect(label.get()).toBe('value:2');
		count.update((value) => value + 2);
		expect(label.get()).toBe('value:6');
	});

	test('untrack excludes reads from computed dependencies', () => {
		const primary = new State(1);
		const secondary = new State(10);
		const total = new Computed(() => primary.get() + untrack(() => secondary.get()));

		expect(total.get()).toBe(11);
		secondary.set(20);
		expect(total.get()).toBe(11);
		primary.set(2);
		expect(total.get()).toBe(22);
	});

	test('currentComputed exposes the computed currently being evaluated', () => {
		let observedComputed: Computed<number> | null = null;
		const count = new State(2);
		const doubled = new Computed(function () {
			observedComputed = currentComputed() as Computed<number> | null;
			return count.get() * 2;
		});

		expect(doubled.get()).toBe(4);
		expect(observedComputed).toBe(doubled);
	});

	test('caches thrown errors until dependencies change and can recover across distinct failures', () => {
		const step = new State(0);
		let runs = 0;
		const failing = new Computed(() => {
			runs += 1;
			const currentStep = step.get();

			if (currentStep < 2) {
				throw new Error(`boom:${runs}`);
			}

			return currentStep;
		});

		expect(() => failing.get()).toThrow('boom:1');
		expect(() => failing.get()).toThrow('boom:1');
		expect(runs).toBe(1);

		step.set(1);
		expect(() => failing.get()).toThrow('boom:2');
		expect(runs).toBe(2);

		step.set(2);
		expect(failing.get()).toBe(2);
		expect(runs).toBe(3);
	});

	test('prevents recursive computed reads', () => {
		const recursive = new Computed(() => recursive.get());

		expect(() => recursive.get()).toThrow('Cannot read a computed signal recursively.');
	});

	test('factory helper creates computed signals', () => {
		const count = new State(2);
		const doubled = computed(() => count.get() * 2);

		expect(doubled).toBeInstanceOf(Computed);
		expect(doubled.get()).toBe(4);
	});

	test('equals callbacks receive the computed signal as this', () => {
		const contexts: unknown[] = [];
		const count = new State(1);
		const doubled = new Computed(
			function () {
				return count.get() * 2;
			},
			{
				equals(previousValue, nextValue) {
					contexts.push(this);
					return previousValue === nextValue;
				},
			},
		);

		expect(doubled.get()).toBe(2);
		count.set(2);
		expect(doubled.get()).toBe(4);

		expect(contexts).toEqual([doubled]);
	});
});
