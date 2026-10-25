import { jsx } from '@ecopages/jsx';
import { RadiantElement } from '../../../src/core/radiant-element';
import { customElement } from '../../../src/decorators/custom-element';
import { state } from '../../../src/decorators/state';

/** The tag prefix the server fixture renders with; browser tests swap it for a fresh one per test. */
export const LIFECYCLE_PREFIX = 'hydrated-lifecycle';

export type LifecycleChild = RadiantElement<{ flag: string }> & { flag: string };
export type LifecycleParent = RadiantElement<{ inside: string }> & { inside: string };

/**
 * Defines a nested host that records its lifecycle into `log`, under `<prefix>-child`.
 *
 * @remarks A factory, so each browser test can define the pair under its own tags, in the order it needs, over
 * markup that is already parsed.
 */
export function defineLifecycleChild(prefix: string, log: string[]): void {
	@customElement(`${prefix}-child`)
	class Child extends RadiantElement<{ flag: string }> {
		@state flag = 'f0';

		override connectedCallback() {
			log.push('child:connected');
			super.connectedCallback();
		}

		override render() {
			log.push('child:render');
			return (
				<div class="child">
					<em>{this.$.flag}</em>
					<slot />
				</div>
			);
		}

		protected override onConnected() {
			log.push(`child:onConnected hydrated=${!this.innerHTML.includes('data-radiant-jsx-bind-')}`);
		}

		protected override updated() {
			log.push('child:updated');
		}
	}

	void Child;
}

/** Defines the host whose view renders `<prefix>-child` with JSX children, under `<prefix>-parent`. */
export function defineLifecycleParent(prefix: string, log: string[]): new () => LifecycleParent {
	@customElement(`${prefix}-parent`)
	class Parent extends RadiantElement<{ inside: string }> {
		@state inside = 'inside-0';

		override render() {
			log.push('parent:render');
			return (
				<div>
					{jsx(`${prefix}-child`, { children: <b title={this.$.inside}>B</b> })}
					<i>after</i>
				</div>
			);
		}
	}

	return Parent;
}
