import { render, type TemplateResultLike } from '@ecopages/jsx';

/**
 * Renders a JSX template result into a target element by replacing its children.
 */
export function renderJsxTemplate(template: TemplateResultLike, target: HTMLElement): void {
	render(template, target);
}
