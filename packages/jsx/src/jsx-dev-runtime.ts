import { installDefaultDevWarningFormatter } from './warnings/jsx-dev-warnings.ts';
import { Fragment, jsx, jsxs } from './jsx-runtime.ts';

export { Fragment, jsx, jsxs, jsx as jsxDEV };

export { areDevWarningsEnabled, resetRuntimeWarningsForTests, setDevWarningsEnabled } from './warnings/jsx-dev-warnings.ts';

installDefaultDevWarningFormatter();
