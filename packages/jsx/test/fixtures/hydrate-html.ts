/** Pre-rendered hydrate HTML for browser tests. Verified by `hydrate-html-fixtures.test.ts`. */

export const TRUE_CHILDREN_HTML = '<p>BeforeAfter</p>';

export const HYDRATE_NESTED_SVG_ICON_HTML =
	'<button><svg data-radiant-jsx-bind-0="attr:viewBox" viewBox="0 0 24 24"><use data-radiant-jsx-bind-1="attr:xlink:href" xlink:href="#alpha"></use><path data-radiant-jsx-bind-2="attr:d" d="M18 6 6 18"></path><foreignObject><span data-radiant-jsx-bind-3="attr:class" class="foreign-object-label">HTML</span></foreignObject></svg></button>';

export const HYDRATE_GRADIENT_ICON_HTML =
	'<div><svg data-radiant-jsx-bind-0="attr:viewBox" viewBox="0 0 100 100" data-radiant-jsx-bind-1="attr:xmlns" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient data-radiant-jsx-bind-2="attr:id" id="gradient"><stop data-radiant-jsx-bind-3="attr:offset" offset="0%" data-radiant-jsx-bind-4="attr:stop-color" stop-color="#000"></stop><stop data-radiant-jsx-bind-5="attr:offset" offset="100%" data-radiant-jsx-bind-6="attr:stop-color" stop-color="#fff"></stop></linearGradient><filter data-radiant-jsx-bind-7="attr:id" id="shadow"><feDropShadow data-radiant-jsx-bind-8="attr:dx" dx="0" data-radiant-jsx-bind-9="attr:dy" dy="2" data-radiant-jsx-bind-10="attr:stdDeviation" stdDeviation="2"></feDropShadow></filter></defs><rect data-radiant-jsx-bind-11="attr:width" width="100" data-radiant-jsx-bind-12="attr:height" height="100" data-radiant-jsx-bind-13="attr:fill" fill="url(#gradient)" data-radiant-jsx-bind-14="attr:filter" filter="url(#shadow)"></rect></svg></div>';

export const HYDRATE_ITERABLE_ROOT_HTML =
	'<button data-radiant-jsx-bind-0="event:click">Alpha</button><button data-radiant-jsx-bind-1="event:click">Beta</button>';

export const HYDRATE_ITERABLE_ROOT_SINGLE_HTML =
	'<button data-radiant-jsx-bind-0="attr:class" class="alpha" data-radiant-jsx-bind-1="event:click">Alpha</button>';

export const HYDRATE_BUTTON_ALPHA_HTML =
	'<button data-radiant-jsx-bind-0="attr:class" class="action" data-radiant-jsx-bind-1="bool:hidden" data-radiant-jsx-bind-2="event:click" data-radiant-jsx-bind-3="attr:title" title="Alpha">Alpha</button>';

export const HYDRATE_CARD_ALPHA_HTML = '<section><p>Count: alpha</p></section>';

export const PLAIN_BUTTON_ALPHA_HTML = '<button class="action">alpha</button>';

export const HYDRATE_ADJACENT_FIELDS_HTML =
	'<section><input data-radiant-jsx-bind-0="attr:aria-label" aria-label="Alpha" data-radiant-jsx-bind-1="attr:data-id" data-id="alpha" data-radiant-jsx-bind-2="bool:hidden" data-radiant-jsx-bind-3="attr:title" title="Alpha" data-radiant-jsx-bind-4="attr:type" type="text"><input data-radiant-jsx-bind-5="attr:aria-label" aria-label="Beta" data-radiant-jsx-bind-6="attr:data-id" data-id="beta" data-radiant-jsx-bind-7="bool:hidden" data-radiant-jsx-bind-8="attr:title" title="Beta" data-radiant-jsx-bind-9="attr:type" type="text"></section>';

export const HYDRATE_METRIC_HTML = '<p data-radiant-jsx-bind-0="attr:class" class="component-metric">Count: 15</p>';

export const HYDRATE_FRAGMENT_COUNTER_HTML =
	'<button data-radiant-jsx-bind-0="attr:id" id="dec">-</button><span data-radiant-jsx-bind-1="attr:id" id="metric">2</span><button data-radiant-jsx-bind-2="attr:id" id="inc">+</button>';

export const HYDRATE_TODO_ICON_BUTTON_HTML =
	'<label data-radiant-jsx-bind-0="attr:for" for="todo-1"><input data-radiant-jsx-bind-1="attr:id" id="todo-1" data-radiant-jsx-bind-2="attr:name" name="1" data-radiant-jsx-bind-3="attr:type" type="checkbox" data-radiant-jsx-bind-4="bool:checked">Task</label><button data-radiant-jsx-bind-5="attr:class" class="todo__item-remove" data-radiant-jsx-bind-6="attr:type" type="button" data-radiant-jsx-bind-7="attr:data-ref" data-ref="remove-todo" data-radiant-jsx-bind-8="attr:aria-label" aria-label="Remove todo: 1"><svg data-radiant-jsx-bind-9="attr:class" class="pointer-events-none" data-radiant-jsx-bind-10="attr:width" width="20" data-radiant-jsx-bind-11="attr:height" height="20" data-radiant-jsx-bind-12="attr:aria-hidden" aria-hidden="true" data-radiant-jsx-bind-13="attr:focusable" focusable="false" data-radiant-jsx-bind-14="attr:viewBox" viewBox="0 0 24 24" data-radiant-jsx-bind-15="attr:fill" fill="none" data-radiant-jsx-bind-16="attr:stroke" stroke="currentColor" data-radiant-jsx-bind-17="attr:stroke-width" stroke-width="2" data-radiant-jsx-bind-18="attr:stroke-linecap" stroke-linecap="round" data-radiant-jsx-bind-19="attr:stroke-linejoin" stroke-linejoin="round"><path data-radiant-jsx-bind-20="attr:d" d="M18 6 6 18"></path><path data-radiant-jsx-bind-21="attr:d" d="m6 6 12 12"></path></svg></button>';
