import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { renderPlaygroundPreview } from './playground-previews';
import { emptyPlaygroundContext, playgroundContext, type PlaygroundContextValue } from './playground-context';

/**
 * Preview stage for the docs playground.
 *
 * @remarks
 * Subscribes to playground context so prop edits update the preview without
 * re-rendering the parent controls panel (which would remount `RuiSelect`).
 */
@customElement('radiant-playground-stage')
export class PlaygroundStageElement extends RadiantElement {
	@contextSelector({ context: playgroundContext })
	playground: PlaygroundContextValue = emptyPlaygroundContext;

	override render() {
		const { slug, props, children } = this.playground;
		if (!slug) {
			return <p class="workbench__fallback">Unknown component playground.</p>;
		}
		return renderPlaygroundPreview(slug, props, children);
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-playground-stage': JsxCustomElementAttributes<PlaygroundStageElement>;
	}
}
