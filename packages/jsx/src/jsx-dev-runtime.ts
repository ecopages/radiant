export { Fragment, jsx, jsxs } from './jsx-runtime.ts';

import { installDefaultDevWarningFormatter } from './jsx-dev-warnings.ts';
import { jsx, type JsxFragment, type JsxRenderable } from './jsx-runtime.ts';
import type { JsxComponent } from './types.ts';

export { areDevWarningsEnabled, resetRuntimeWarningsForTests, setDevWarningsEnabled } from './jsx-dev-warnings.ts';

installDefaultDevWarningFormatter();

/**
 * Development runtime entrypoint required by the automatic JSX transform.
 */
export function jsxDEV<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxRenderable {
	return jsx(type, props);
}
