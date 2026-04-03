import { describe, expect, test, vi } from 'vitest';
import { asyncState, state } from '../index';

function flushMicrotasks(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function createFetcher<T>(value: T, delay = 0) {
	return vi.fn(({ signal }: { signal: AbortSignal }) => {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => resolve(value), delay);
			signal.addEventListener('abort', () => {
				clearTimeout(timer);
				reject(new DOMException('Aborted', 'AbortError'));
			});
		});
	});
}

function createSourcedFetcher<S, T>(map: (source: S) => T, delay = 0) {
	return vi.fn((source: S, { signal }: { signal: AbortSignal }) => {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => resolve(map(source)), delay);
			signal.addEventListener('abort', () => {
				clearTimeout(timer);
				reject(new DOMException('Aborted', 'AbortError'));
			});
		});
	});
}

describe('asyncState', () => {
	describe('unsourced (manual)', () => {
		test('fetches immediately and transitions idle → pending → success', async () => {
			const query = asyncState({ fetcher: createFetcher('hello') });

			expect(query.status.get()).toBe('pending');
			expect(query.data.get()).toBeUndefined();

			await flushMicrotasks();

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('hello');
			expect(query.error.get()).toBeUndefined();

			query.dispose();
		});

		test('uses initialValue before first resolution', async () => {
			const query = asyncState({ fetcher: createFetcher('resolved'), initialValue: 'seed' });

			expect(query.data.get()).toBe('seed');
			expect(query.status.get()).toBe('pending');

			await flushMicrotasks();

			expect(query.data.get()).toBe('resolved');

			query.dispose();
		});

		test('transitions to error on rejection', async () => {
			const error = new Error('boom');
			const fetcher = vi.fn(() => Promise.reject(error));
			const query = asyncState({ fetcher });

			await flushMicrotasks();

			expect(query.status.get()).toBe('error');
			expect(query.error.get()).toBe(error);
			expect(query.data.get()).toBeUndefined();

			query.dispose();
		});

		test('refetch re-executes and aborts the previous request', async () => {
			const fetcher = createFetcher('first', 50);
			const query = asyncState({ fetcher });

			expect(fetcher).toHaveBeenCalledTimes(1);

			query.refetch();

			expect(fetcher).toHaveBeenCalledTimes(2);
			expect(query.status.get()).toBe('pending');

			await flushMicrotasks();
			await new Promise((r) => setTimeout(r, 60));

			expect(query.status.get()).toBe('success');

			query.dispose();
		});

		test('abort cancels in-flight request', async () => {
			const fetcher = createFetcher('value', 100);
			const query = asyncState({ fetcher });

			expect(query.status.get()).toBe('pending');

			query.abort();

			await flushMicrotasks();

			expect(query.status.get()).toBe('pending');
			expect(query.data.get()).toBeUndefined();

			query.dispose();
		});

		test('retains last successful data while refetching', async () => {
			let callCount = 0;
			const fetcher = vi.fn(({ signal }: { signal: AbortSignal }) => {
				callCount++;
				return new Promise<string>((resolve, reject) => {
					const timer = setTimeout(() => resolve(`result-${callCount}`), 0);
					signal.addEventListener('abort', () => {
						clearTimeout(timer);
						reject(new DOMException('Aborted', 'AbortError'));
					});
				});
			});

			const query = asyncState({ fetcher });

			await flushMicrotasks();
			expect(query.data.get()).toBe('result-1');

			query.refetch();
			expect(query.status.get()).toBe('pending');
			expect(query.data.get()).toBe('result-1');

			await flushMicrotasks();
			expect(query.data.get()).toBe('result-2');

			query.dispose();
		});

		test('dispose aborts pending request and cleans up', async () => {
			const fetcher = createFetcher('value', 100);
			const query = asyncState({ fetcher });

			query.dispose();

			await new Promise((r) => setTimeout(r, 120));
			expect(query.status.get()).toBe('pending');
			expect(query.data.get()).toBeUndefined();
		});
	});

	describe('sourced (reactive)', () => {
		test('fetches when source emits a truthy value', async () => {
			const cityId = state<string | false>('venice');
			const fetcher = createSourcedFetcher((id: string) => `weather:${id}`);

			const query = asyncState({ source: () => cityId.get(), fetcher });

			await flushMicrotasks();

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('weather:venice');
			expect(fetcher).toHaveBeenCalledTimes(1);

			query.dispose();
		});

		test('stays idle when source returns false', async () => {
			const trigger = state<string | false>(false);
			const fetcher = createSourcedFetcher((id: string) => id);

			const query = asyncState({ source: () => trigger.get(), fetcher });

			await flushMicrotasks();

			expect(query.status.get()).toBe('idle');
			expect(fetcher).not.toHaveBeenCalled();

			query.dispose();
		});

		test('refetches when source changes', async () => {
			const cityId = state('venice');
			const fetcher = createSourcedFetcher((id: string) => `weather:${id}`);

			const query = asyncState({ source: () => cityId.get(), fetcher });

			await flushMicrotasks();
			expect(query.data.get()).toBe('weather:venice');

			cityId.set('madrid');
			await flushMicrotasks();
			await flushMicrotasks();

			expect(query.data.get()).toBe('weather:madrid');
			expect(fetcher).toHaveBeenCalledTimes(2);

			query.dispose();
		});

		test('aborts previous request when source changes rapidly', async () => {
			const cityId = state('venice');
			const calls: string[] = [];
			const fetcher = vi.fn((id: string, { signal }: { signal: AbortSignal }) => {
				calls.push(id);
				return new Promise<string>((resolve, reject) => {
					const timer = setTimeout(() => resolve(`weather:${id}`), 50);
					signal.addEventListener('abort', () => {
						clearTimeout(timer);
						reject(new DOMException('Aborted', 'AbortError'));
					});
				});
			});

			const query = asyncState({ source: () => cityId.get(), fetcher });

			await flushMicrotasks();

			cityId.set('madrid');
			await flushMicrotasks();

			cityId.set('barcelona');
			await flushMicrotasks();

			await new Promise((r) => setTimeout(r, 60));

			expect(query.data.get()).toBe('weather:barcelona');

			query.dispose();
		});

		test('transitions from idle when source goes from falsy to truthy', async () => {
			const trigger = state<string | false>(false);
			const fetcher = createSourcedFetcher((id: string) => `data:${id}`);

			const query = asyncState({ source: () => trigger.get(), fetcher });

			await flushMicrotasks();
			expect(query.status.get()).toBe('idle');

			trigger.set('active');
			await flushMicrotasks();
			await flushMicrotasks();

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('data:active');

			query.dispose();
		});

		test('refetch uses current source value', async () => {
			const cityId = state('venice');
			const fetcher = createSourcedFetcher((id: string) => `weather:${id}`);

			const query = asyncState({ source: () => cityId.get(), fetcher });

			await flushMicrotasks();
			expect(query.data.get()).toBe('weather:venice');

			cityId.set('tokio');
			query.refetch();

			await flushMicrotasks();
			await flushMicrotasks();

			expect(query.data.get()).toBe('weather:tokio');

			query.dispose();
		});

		test('refetch is a no-op when source is falsy', async () => {
			const trigger = state<string | false>(false);
			const fetcher = createSourcedFetcher((id: string) => id);

			const query = asyncState({ source: () => trigger.get(), fetcher });

			await flushMicrotasks();
			query.refetch();
			await flushMicrotasks();

			expect(query.status.get()).toBe('idle');
			expect(fetcher).not.toHaveBeenCalled();

			query.dispose();
		});

		test('dispose stops source observation', async () => {
			const cityId = state('venice');
			const fetcher = createSourcedFetcher((id: string) => `weather:${id}`);

			const query = asyncState({ source: () => cityId.get(), fetcher });

			await flushMicrotasks();
			query.dispose();

			cityId.set('madrid');
			await flushMicrotasks();

			expect(fetcher).toHaveBeenCalledTimes(1);
			expect(query.data.get()).toBe('weather:venice');
		});
	});

	describe('staleTime', () => {
		test('serves cached value without refetching when data is still fresh', async () => {
			const cityId = state('venice');
			const fetcher = createSourcedFetcher((id: string) => `weather:${id}`);

			const query = asyncState({ source: () => cityId.get(), fetcher, staleTime: 5_000 });

			await flushMicrotasks();
			expect(query.data.get()).toBe('weather:venice');
			expect(fetcher).toHaveBeenCalledTimes(1);

			cityId.set('madrid');
			await flushMicrotasks();
			await flushMicrotasks();
			expect(query.data.get()).toBe('weather:madrid');
			expect(fetcher).toHaveBeenCalledTimes(2);

			cityId.set('venice');
			await flushMicrotasks();
			await flushMicrotasks();
			expect(query.data.get()).toBe('weather:venice');
			expect(fetcher).toHaveBeenCalledTimes(2);

			query.dispose();
		});

		test('refetches after staleTime expires', async () => {
			const cityId = state('venice');
			const fetcher = createSourcedFetcher((id: string) => `weather:${id}`);

			const query = asyncState({ source: () => cityId.get(), fetcher, staleTime: 50 });

			await flushMicrotasks();
			expect(fetcher).toHaveBeenCalledTimes(1);

			await new Promise((r) => setTimeout(r, 60));

			cityId.set('madrid');
			await flushMicrotasks();
			await flushMicrotasks();

			cityId.set('venice');
			await flushMicrotasks();
			await flushMicrotasks();

			expect(fetcher).toHaveBeenCalledTimes(3);

			query.dispose();
		});

		test('cache hit sets status to success synchronously', async () => {
			const cityId = state('venice');
			const fetcher = createSourcedFetcher((id: string) => `weather:${id}`, 10);

			const query = asyncState({ source: () => cityId.get(), fetcher, staleTime: 5_000 });

			await flushMicrotasks();
			await new Promise((r) => setTimeout(r, 15));
			expect(query.status.get()).toBe('success');

			cityId.set('madrid');
			await flushMicrotasks();
			await new Promise((r) => setTimeout(r, 15));

			cityId.set('venice');
			await flushMicrotasks();
			await flushMicrotasks();

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('weather:venice');

			query.dispose();
		});

		test('does not cache unsourced refetches', async () => {
			let callCount = 0;
			const fetcher = vi.fn(({ signal }: { signal: AbortSignal }) => {
				callCount += 1;

				return new Promise<string>((resolve, reject) => {
					const timer = setTimeout(() => resolve(`result-${callCount}`), 0);
					signal.addEventListener('abort', () => {
						clearTimeout(timer);
						reject(new DOMException('Aborted', 'AbortError'));
					});
				});
			});

			const query = asyncState({ fetcher, staleTime: 5_000 });

			await flushMicrotasks();
			expect(query.data.get()).toBe('result-1');

			query.refetch();
			await flushMicrotasks();

			expect(fetcher).toHaveBeenCalledTimes(2);
			expect(query.data.get()).toBe('result-2');

			query.dispose();
		});

		test('cache hit aborts an older in-flight request', async () => {
			const cityId = state('venice');
			const fetcher = vi.fn((id: string, { signal }: { signal: AbortSignal }) => {
				const delay = id === 'madrid' ? 50 : 0;

				return new Promise<string>((resolve, reject) => {
					const timer = setTimeout(() => resolve(`weather:${id}`), delay);
					signal.addEventListener('abort', () => {
						clearTimeout(timer);
						reject(new DOMException('Aborted', 'AbortError'));
					});
				});
			});

			const query = asyncState({ source: () => cityId.get(), fetcher, staleTime: 5_000 });

			await flushMicrotasks();
			expect(query.data.get()).toBe('weather:venice');

			cityId.set('madrid');
			await flushMicrotasks();

			cityId.set('venice');
			await flushMicrotasks();
			await flushMicrotasks();

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('weather:venice');
			expect(fetcher).toHaveBeenCalledTimes(2);

			await new Promise((resolve) => setTimeout(resolve, 60));

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('weather:venice');

			query.dispose();
		});
	});

	describe('pendingDelay', () => {
		test('skips pending state when response arrives before delay', async () => {
			const statuses: string[] = [];

			const query = asyncState({ fetcher: createFetcher('fast', 0), pendingDelay: 200 });

			statuses.push(query.status.get());

			await flushMicrotasks();

			statuses.push(query.status.get());

			expect(statuses).toEqual(['idle', 'success']);

			query.dispose();
		});

		test('transitions to pending after delay when response is slow', async () => {
			const query = asyncState({ fetcher: createFetcher('slow', 200), pendingDelay: 30 });

			expect(query.status.get()).toBe('idle');

			await new Promise((r) => setTimeout(r, 50));

			expect(query.status.get()).toBe('pending');

			await new Promise((r) => setTimeout(r, 200));

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('slow');

			query.dispose();
		});

		test('clears pending timer on dispose', async () => {
			const query = asyncState({ fetcher: createFetcher('value', 200), pendingDelay: 50 });

			expect(query.status.get()).toBe('idle');

			query.dispose();

			await new Promise((r) => setTimeout(r, 80));

			expect(query.status.get()).toBe('idle');
		});

		test('clears pending timer when refetch resolves before delay', async () => {
			let callCount = 0;
			const fetcher = vi.fn(({ signal }: { signal: AbortSignal }) => {
				callCount++;
				const delay = callCount === 1 ? 0 : 0;
				return new Promise<string>((resolve, reject) => {
					const timer = setTimeout(() => resolve(`result-${callCount}`), delay);
					signal.addEventListener('abort', () => {
						clearTimeout(timer);
						reject(new DOMException('Aborted', 'AbortError'));
					});
				});
			});

			const query = asyncState({ fetcher, pendingDelay: 200 });

			await flushMicrotasks();
			expect(query.status.get()).toBe('success');

			query.refetch();
			await flushMicrotasks();

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('result-2');

			query.dispose();
		});

		test('works with sourced queries', async () => {
			const cityId = state('venice');
			const fetcher = createSourcedFetcher((id: string) => `weather:${id}`, 0);

			const query = asyncState({ source: () => cityId.get(), fetcher, pendingDelay: 200 });

			await flushMicrotasks();
			await flushMicrotasks();

			expect(query.status.get()).toBe('success');
			expect(query.data.get()).toBe('weather:venice');

			query.dispose();
		});
	});
});
