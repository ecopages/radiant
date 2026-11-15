import { syncExamples } from '../src/components/primitive-example/mount-example';

const pages = import.meta.glob('../src/content/components/recipes/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const scripts = import.meta.glob('../src/content/components/recipes/*.script.ts');
const elements = import.meta.glob('../src/content/components/recipes/*.element.ts');
const components = import.meta.glob('../src/content/components/recipes/*.component.tsx');

/** Mounts the markup a recipe page documents and runs the script it documents. */
export async function mountRecipe(slug: string): Promise<HTMLElement> {
	const page = pages[`../src/content/components/recipes/${slug}.mdx`]!;
	document.body.innerHTML = page.match(/```html\n([\s\S]*?)\n```/)![1];
	await scripts[`../src/content/components/recipes/${slug}.script.ts`]!();
	syncExamples();
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

export type Form = 'plain' | 'radiant';

/**
 * Mounts one form of a recipe from its page: the plain form is the first `html` fence plus the `mount` script, the
 * Radiant form is the second `html` fence plus the element script, which needs no mount call. Returns the element the
 * recipe's parts sit under.
 */
export async function mountForm(slug: string, form: Form): Promise<HTMLElement> {
	if (form === 'plain') {
		return mountRecipe(slug);
	}
	const page = pages[`../src/content/components/recipes/${slug}.mdx`]!;
	document.body.innerHTML = [...page.matchAll(/```html\n([\s\S]*?)\n```/g)][1]![1];
	await elements[`../src/content/components/recipes/${slug}.element.ts`]!();
	return document.querySelector<HTMLElement>(`recipe-${slug}`)!;
}

/**
 * Mounts the all-in-one component a recipe page documents: its third `html` fence, which is the tag alone, and the
 * `.component.tsx` module. Returns the element, which draws its own markup once the module has registered it.
 */
export async function mountComponent(slug: string): Promise<HTMLElement> {
	const page = pages[`../src/content/components/recipes/${slug}.mdx`]!;
	document.body.innerHTML = [...page.matchAll(/```html\n([\s\S]*?)\n```/g)][2]![1];
	await components[`../src/content/components/recipes/${slug}.component.tsx`]!();
	return document.querySelector<HTMLElement>(`recipe-${slug}-app`)!;
}

export interface ListenerTracker {
	/**
	 * Descriptions (`target|type|listener|capture`) of the listeners added and not yet gone, on `targets` only when
	 * some are given.
	 */
	live: (...targets: EventTarget[]) => string[];
	stop: () => void;
}

/**
 * Records every `EventTarget` listener that is added and not yet gone, so a test can tell what a removed element left
 * behind. A listener is gone after a `removeEventListener` with the same capture flag (a boolean or `{ capture }`),
 * after it fired with `once`, or when its `signal` aborts, so a recipe may clean up any of those ways.
 */
export function trackListeners(): ListenerTracker {
	const add = EventTarget.prototype.addEventListener;
	const remove = EventTarget.prototype.removeEventListener;
	const live = new Map<string, EventTarget>();
	const ids = new WeakMap<object, number>();
	const id = (value: unknown) => {
		if (typeof value !== 'object' && typeof value !== 'function') return String(value);
		const object = value as object;
		return String(ids.get(object) ?? ids.set(object, ids.size).get(object));
	};
	const capture = (options?: boolean | EventListenerOptions) =>
		typeof options === 'boolean' ? options : Boolean(options?.capture);
	const key = (target: EventTarget, type: string, listener: unknown, options?: boolean | EventListenerOptions) =>
		[id(target), type, id(listener), capture(options)].join('|');

	EventTarget.prototype.addEventListener = function (type, listener, options) {
		const entry = key(this, type, listener, options);
		const { signal, once } = typeof options === 'object' && options !== null ? options : {};
		if (!signal?.aborted) {
			live.set(entry, this);
			if (signal) add.call(signal, 'abort', () => live.delete(entry), { once: true });
			if (once) add.call(this, type, () => live.delete(entry), { once: true, capture: capture(options) });
		}
		return add.call(this, type, listener, options);
	};
	EventTarget.prototype.removeEventListener = function (type, listener, options) {
		live.delete(key(this, type, listener, options));
		return remove.call(this, type, listener, options);
	};
	return {
		live: (...targets) =>
			[...live].filter(([, on]) => !targets.length || targets.includes(on)).map(([entry]) => entry),
		stop: () => {
			EventTarget.prototype.addEventListener = add;
			EventTarget.prototype.removeEventListener = remove;
		},
	};
}
