import { getActiveSsrScopeValue, withActiveSsrScopeValue } from '@ecopages/jsx/server';
import { installRadiantElementSsrScopeAdapters } from '../core/radiant-element-ssr-registry';

/** Side-effect import: wires core SSR runtime lookups to the Node JSX SSR render scope. */
installRadiantElementSsrScopeAdapters({
	get: getActiveSsrScopeValue,
	withValue: withActiveSsrScopeValue,
});
