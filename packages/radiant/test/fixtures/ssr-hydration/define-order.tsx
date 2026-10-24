import { RadiantElement } from '../../../src/core/radiant-element';
import { customElement } from '../../../src/decorators/custom-element';
import { state } from '../../../src/decorators/state';

/**
 * A parent and the nested host in its view, defined child first, as a parent module that imports its child does.
 *
 * @remarks Kept out of `components.tsx` so the browser test can define both over markup that is already parsed:
 * the child then upgrades, and queues its first-connect work, before the parent.
 */
@customElement('hydrated-order-child-test')
export class HydratedOrderChild extends RadiantElement {
	override render() {
		return (
			<div class="child">
				<slot />
			</div>
		);
	}
}

@customElement('hydrated-order-parent-test')
export class HydratedOrderParent extends RadiantElement<{ inside: string }> {
	@state inside = 'inside-0';

	override render() {
		return (
			<div>
				<hydrated-order-child-test>
					<b title={this.$.inside}>B</b>
				</hydrated-order-child-test>
			</div>
		);
	}
}
