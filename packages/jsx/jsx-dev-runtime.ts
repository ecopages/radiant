export { Fragment, jsx, jsxs } from './jsx-runtime';

import { jsx, type JsxComponent, type JsxComponentProps, type JsxElement, type JsxFragment } from './jsx-runtime';

/**
 * Development runtime entrypoint required by the automatic JSX transform.
 */
export function jsxDEV<Props extends JsxComponentProps>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxElement {
	return jsx(type, props);
}
