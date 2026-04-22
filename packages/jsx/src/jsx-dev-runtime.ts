export { Fragment, jsx, jsxs } from './jsx-runtime.ts';

import { jsx, type JsxComponent, type JsxFragment, type JsxRenderable } from './jsx-runtime.ts';

/**
 * Development runtime entrypoint required by the automatic JSX transform.
 */
export function jsxDEV<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxRenderable {
	return jsx(type, props);
}
