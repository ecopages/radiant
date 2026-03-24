import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RadiantCounterProps } from '@/components/radiant-counter/radiant-counter.script';
import type { RadiantTodoProps } from '@/components/radiant-todo-app/radiant-todo-app.script';
import type { RadiantSwitchProps } from '@/components/switch/switch.script';

type DocsGlobalCustomElementAttributes<Props extends object = {}> = Partial<Props> & {
	children?: unknown;
	[key: string]: unknown;
};

interface DocsGlobalIntrinsicElements {
	'radiant-burger': DocsGlobalCustomElementAttributes;
	'radiant-counter': DocsGlobalCustomElementAttributes<RadiantCounterProps>;
	'radiant-navigation': DocsGlobalCustomElementAttributes;
	'radiant-switch': DocsGlobalCustomElementAttributes<RadiantSwitchProps>;
	'radiant-todo-app': DocsGlobalCustomElementAttributes;
	'radiant-todo-item': DocsGlobalCustomElementAttributes<RadiantTodoProps>;
	'theme-toggle': DocsGlobalCustomElementAttributes<RadiantSwitchProps>;
}

interface DocsRadiantJsxIntrinsicElements {
	'radiant-burger': JsxCustomElementAttributes<HTMLElement>;
	'radiant-counter': JsxCustomElementAttributes<HTMLElement, RadiantCounterProps>;
	'radiant-navigation': JsxCustomElementAttributes<HTMLElement>;
	'radiant-switch': JsxCustomElementAttributes<HTMLElement, RadiantSwitchProps>;
	'radiant-todo-app': JsxCustomElementAttributes<HTMLElement>;
	'radiant-todo-item': JsxCustomElementAttributes<HTMLElement, RadiantTodoProps>;
	'theme-toggle': JsxCustomElementAttributes<HTMLElement, RadiantSwitchProps>;
}

declare global {
	namespace JSX {
		interface IntrinsicElements extends DocsGlobalIntrinsicElements {}
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements extends DocsRadiantJsxIntrinsicElements {}
}