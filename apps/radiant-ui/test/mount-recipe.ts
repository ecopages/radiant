import { startControllers, stopControllers } from '@ecopages/radiant/controller-registry';
import { syncExamples } from '../src/components/primitive-example/mount-example';

const markup = import.meta.glob('../src/content/components/recipes/*.html', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const markupOf = (slug: string, pattern: 'plain' | 'element' | 'controller') =>
	markup[`../src/content/components/recipes/${slug}.${pattern}.html`]!;
const scripts = import.meta.glob('../src/content/components/recipes/*.script.ts');
const elements = import.meta.glob('../src/content/components/recipes/*.element.ts');
const components = import.meta.glob('../src/content/components/recipes/*.component.tsx');
const controllers = import.meta.glob('../src/content/components/recipes/*.controller.ts');

/** Mounts the plain markup of a recipe and runs its script. */
export async function mountRecipe(slug: string): Promise<HTMLElement> {
	document.body.innerHTML = markupOf(slug, 'plain');
	await scripts[`../src/content/components/recipes/${slug}.script.ts`]!();
	syncExamples();
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

export type Form = 'plain' | 'radiant';

/**
 * Mounts one form of a recipe: the plain form is `<slug>.plain.html` plus the `mount` script, the
 * Radiant form is `<slug>.element.html` plus the element script, which needs no mount call. Returns the element the
 * recipe's parts sit under.
 */
export async function mountForm(slug: string, form: Form): Promise<HTMLElement> {
	if (form === 'plain') {
		return mountRecipe(slug);
	}
	document.body.innerHTML = markupOf(slug, 'element');
	await elements[`../src/content/components/recipes/${slug}.element.ts`]!();
	return document.querySelector<HTMLElement>(`${slug}-element`)!;
}

/**
 * Mounts the all-in-one component of a recipe: the `<slug-app>` tag alone, and the
 * `.component.tsx` module. Returns the element, which draws its own markup once the module has registered it.
 */
export async function mountComponent(slug: string): Promise<HTMLElement> {
	document.body.innerHTML = `<${slug}-app></${slug}-app>`;
	await components[`../src/content/components/recipes/${slug}.component.tsx`]!();
	return document.querySelector<HTMLElement>(`${slug}-app`)!;
}

/**
 * Mounts the Radiant controller form of a recipe: `<slug>.controller.html`, which is markup carrying
 * `data-controller="<slug>"`, and the `.controller.ts` module whose `@controller` registers the class. A registry
 * runs over the document, as on the docs site, and any earlier one is stopped so controllers are not started twice.
 * Returns the element the controller is attached to.
 */
export async function mountController(slug: string): Promise<HTMLElement> {
	stopControllers();
	document.body.innerHTML = markupOf(slug, 'controller');
	await controllers[`../src/content/components/recipes/${slug}.controller.ts`]!();
	startControllers(document);
	return document.querySelector<HTMLElement>(`[data-controller="${slug}"]`)!;
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
