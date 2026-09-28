import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RadiantAccordionProps } from './components/accordion/accordion.script';
import type { RadiantDropdownProps } from './components/dropdown/dropdown.script';
import type { RadiantCounterProps } from './components/radiant-counter/radiant-counter.script';
import type { RadiantTodoAppProps, RadiantTodoProps } from './components/radiant-todo-app/radiant-todo-app.script';
import type { RadiantValueTesterProps } from './components/value-tester/value-tester.script';

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-accordion': JsxCustomElementAttributes<HTMLElement, RadiantAccordionProps>;
		'radiant-counter': JsxCustomElementAttributes<HTMLElement, RadiantCounterProps>;
		'radiant-dropdown': JsxCustomElementAttributes<HTMLElement, RadiantDropdownProps>;
		'radiant-event-emitter': JsxCustomElementAttributes<HTMLElement>;
		'radiant-event-listener': JsxCustomElementAttributes<HTMLElement>;
		'radiant-keyboard-keys': JsxCustomElementAttributes<HTMLElement>;
		'radiant-refs': JsxCustomElementAttributes<HTMLElement>;
		'radiant-sizer': JsxCustomElementAttributes<HTMLElement>;
		'radiant-tester': JsxCustomElementAttributes<HTMLElement, RadiantValueTesterProps>;
		'radiant-todo-app': JsxCustomElementAttributes<HTMLElement, RadiantTodoAppProps>;
		'radiant-todo-item': JsxCustomElementAttributes<HTMLElement, RadiantTodoProps>;
	}
}
