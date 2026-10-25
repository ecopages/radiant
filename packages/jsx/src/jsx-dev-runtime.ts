import { installDefaultDevWarningFormatter } from './warnings/jsx-dev-warnings.ts';
import { Fragment, jsx, jsxDEV, jsxs } from './jsx-runtime.ts';

export { Fragment, jsx, jsxDEV, jsxs };

export {
	areDevWarningsEnabled,
	resetRuntimeWarningsForTests,
	setDevWarningsEnabled,
} from './warnings/jsx-dev-warnings.ts';

installDefaultDevWarningFormatter();
