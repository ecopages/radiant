import { getDomRenderer, type JsxRenderable } from '@ecopages/jsx';

export { getDomRenderer };

type TextView = string | number | bigint | boolean | null | undefined;

function isTextView(value: JsxRenderable): value is TextView {
	return value === null || (typeof value !== 'object' && typeof value !== 'function' && typeof value !== 'symbol');
}

/**
 * Mounts or hydrates a host's view into `target`.
 *
 * @remarks
 * Radiant never imports the JSX DOM renderer, so an app without JSX views does not ship it. `@ecopages/jsx` installs
 * it when `@ecopages/jsx/jsx-runtime` loads and on the first `jsx()` call, so it is in place by the time a JSX view,
 * written as syntax or by hand, reaches this function: look it up only after the view is built. Without it, a view
 * that is a plain value, such as `render() { return String(this.count); }`, is written as text, and a DOM node
 * replaces the target's children. Anything else needs the renderer, and throws naming the import that installs it.
 */
export function mountView(host: Element, mode: 'render' | 'hydrate', value: JsxRenderable, target: HTMLElement): void {
	const renderer = getDomRenderer();

	if (renderer) {
		renderer[mode](value, target);
		return;
	}

	if (isTextView(value)) {
		target.textContent = value === null || value === undefined || typeof value === 'boolean' ? '' : String(value);
		return;
	}

	if (value instanceof Node) {
		target.replaceChildren(value);
		return;
	}

	throw new Error(
		`[@ecopages/radiant] <${host.localName}> renders a view, but no JSX renderer is installed. Build the view with JSX, or import "@ecopages/jsx/jsx-runtime" once.`,
	);
}
