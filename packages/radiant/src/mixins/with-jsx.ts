import type { JsxElement, TemplateResultLike } from '@ecopages/jsx';
import type { RadiantElement, RenderInsertPosition } from '../core/radiant-element';
import { renderJsxTemplate } from '../tools/render-jsx-template';

type Constructor<T> = new (...args: any[]) => T;

export type WithJsxTemplate = JsxElement | string;

export type WithJsxRenderTemplateProps = {
	target: HTMLElement;
	template: WithJsxTemplate;
	insert?: RenderInsertPosition;
};

export interface WithJsxMixin {
	render: (template: WithJsxTemplate, target?: HTMLElement) => void;
	renderTemplate: (props: WithJsxRenderTemplateProps) => void;
}

function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		((value as Partial<TemplateResultLike>)['_$rType$'] === 1 ||
			(value as { ['_$litType$']?: unknown })['_$litType$'] === 1) &&
		'strings' in value &&
		'values' in value
	);
}

/**
 * A mixin that renders `@ecopages/jsx` template results into the light DOM.
 */
export function WithJsx<T extends Constructor<RadiantElement>>(Base: T): T & Constructor<WithJsxMixin> {
	return class extends Base implements WithJsxMixin {
		public render(template: WithJsxTemplate, target: HTMLElement = this) {
			this.renderTemplate({ target, template, insert: 'replace' });
		}

		override renderTemplate({ target = this, template, insert = 'replace' }: WithJsxRenderTemplateProps) {
			if (typeof template === 'string' || !isTemplateResultLike(template)) {
				super.renderTemplate({ target, template: String(template), insert });
				return;
			}

			if (insert !== 'replace') {
				throw new Error(
					'Radiant JSX templates only support insert: "replace". Use string templates for other insertion modes.',
				);
			}

			renderJsxTemplate(template, target);
		}
	} as T & Constructor<WithJsxMixin>;
}
