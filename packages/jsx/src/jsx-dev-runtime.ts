import { CLASS_NAME_ATTRIBUTE_WARNING, warnFunctionPosition, warnRuntime } from './warnings/dev-warnings.ts';
import { installDefaultDevWarningFormatter } from './warnings/jsx-dev-warnings.ts';
import { Fragment, jsx, jsxDEV as createDevElement, jsxs } from './jsx-runtime.ts';

export { Fragment, jsx, jsxs };

export {
	areDevWarningsEnabled,
	resetRuntimeWarningsForTests,
	setDevWarningsEnabled,
} from './warnings/jsx-dev-warnings.ts';

/**
 * Development JSX entrypoint: the production `jsxDEV`, plus warnings that would cost the production runtime bytes.
 *
 * @remarks Warns once per tag when a native element gets `className`, which the factory skips because it is not an
 * HTML attribute. Also warns once per tag when `class` or `classes` is a function, which the class list drops; the
 * factory warns about the other positions where a function is skipped.
 */
export const jsxDEV: typeof createDevElement = (type, props, key, isStaticChildren) => {
	if (typeof type === 'string' && !type.includes('-') && (props as { className?: unknown }).className !== undefined) {
		warnRuntime(CLASS_NAME_ATTRIBUTE_WARNING, type, { code: `class-name-attribute:${type}` });
	}

	if (typeof type === 'string') {
		for (const name of ['class', 'classes'] as const) {
			if (typeof (props as Record<string, unknown>)[name] === 'function') {
				warnFunctionPosition(`<${type} ${name}>`);
			}
		}
	}

	return createDevElement(type, props, key, isStaticChildren);
};

installDefaultDevWarningFormatter();
