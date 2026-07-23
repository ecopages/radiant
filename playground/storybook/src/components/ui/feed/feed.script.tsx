import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { prop } from '@ecopages/radiant/decorators/prop';

export type RuiFeedProps = {
	label?: string;
};

/**
 * `<rui-feed>` — a section that can load articles as the user scrolls.
 *
 * Implements the APG Feed pattern shell: `role="feed"` with article children.
 * Consumers own infinite-scroll loading; this host provides the landmark + labeling.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/feed/
 * @element rui-feed
 */
@customElement('rui-feed')
export class RuiFeed extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;

	override render() {
		return (
			<div class="rui-feed" role="feed" aria-label={this.label || undefined}>
				<slot></slot>
			</div>
		);
	}
}
