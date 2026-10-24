import { RadiantElement } from '../../../src/core/radiant-element';
import { customElement } from '../../../src/decorators/custom-element';

/** Kept out of `components.tsx` so the browser test can define it after its parent hydrated. */
@customElement('hydrated-late-child-test')
export class HydratedLateChild extends RadiantElement {
	override render() {
		return (
			<div class="child">
				<slot />
			</div>
		);
	}
}
