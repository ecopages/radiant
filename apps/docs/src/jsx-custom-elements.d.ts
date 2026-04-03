import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RadiantCounterProps } from '@/components/radiant-counter/radiant-component-counter.script';
import type { RadiantElementCounterProps } from '@/components/radiant-counter/radiant-element-counter.script';
import type { RadiantTodoProps } from '@/components/radiant-todo-app/radiant-todo-item.script';
import type { RadiantSwitchProps } from '@/components/switch/switch.script';
import type { InstallPackageOptions } from 'typescript';
import type { RadiantInstallCmdProps } from './components/home-install-cmd.script';

type DocsGlobalCustomElementAttributes<Props extends object = {}> = Partial<Props> & {
	children?: unknown;
	[key: string]: unknown;
};

interface DocsGlobalIntrinsicElements {
	'radiant-burger': DocsGlobalCustomElementAttributes;
	'radiant-install-cmd': DocsGlobalCustomElementAttributes<{ packages?: string }>;
	'radiant-counter': DocsGlobalCustomElementAttributes<RadiantCounterProps>;
	'radiant-element-counter': DocsGlobalCustomElementAttributes<RadiantElementCounterProps>;
	'radiant-navigation': DocsGlobalCustomElementAttributes;
	'radiant-switch': DocsGlobalCustomElementAttributes<RadiantSwitchProps>;
	'radiant-todo-app': DocsGlobalCustomElementAttributes;
	'radiant-todo-item': DocsGlobalCustomElementAttributes<RadiantTodoProps>;
	'radiant-weather-app': DocsGlobalCustomElementAttributes;
	'radiant-weather-summary': DocsGlobalCustomElementAttributes;
	'theme-toggle': DocsGlobalCustomElementAttributes<RadiantSwitchProps>;
	'radiant-docs-pagination': DocsGlobalCustomElementAttributes;
	'radiant-toc': DocsGlobalCustomElementAttributes;
}

interface DocsRadiantJsxIntrinsicElements {
	'radiant-burger': JsxCustomElementAttributes<HTMLElement>;
	'radiant-install-cmd': JsxCustomElementAttributes<HTMLElement, RadiantInstallCmdProps>;
	'radiant-counter': JsxCustomElementAttributes<HTMLElement, RadiantCounterProps>;
	'radiant-element-counter': JsxCustomElementAttributes<HTMLElement, RadiantElementCounterProps>;
	'radiant-navigation': JsxCustomElementAttributes<HTMLElement>;
	'radiant-switch': JsxCustomElementAttributes<HTMLElement, RadiantSwitchProps>;
	'radiant-todo-app': JsxCustomElementAttributes<HTMLElement>;
	'radiant-todo-item': JsxCustomElementAttributes<HTMLElement, RadiantTodoProps>;
	'radiant-weather-app': JsxCustomElementAttributes<HTMLElement>;
	'radiant-weather-summary': JsxCustomElementAttributes<HTMLElement>;
	'theme-toggle': JsxCustomElementAttributes<HTMLElement, RadiantSwitchProps>;
	'radiant-docs-pagination': JsxCustomElementAttributes<HTMLElement>;
	'radiant-toc': JsxCustomElementAttributes<HTMLElement>;
}

declare global {
	namespace JSX {
		interface IntrinsicElements extends DocsGlobalIntrinsicElements {}
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements extends DocsRadiantJsxIntrinsicElements {}
}
