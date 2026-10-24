import '../../../src/server/install-ssr-runtime';
import {
	renderRadiantElementHostToString,
	renderRadiantElementViewToString,
} from '../../../src/server/radiant-element-ssr';
import {
	DeferredHydratedCard,
	HydratedArrayPropCard,
	HydratedComplexSlotCard,
	HydratedCounter,
	HydratedCounterBinding,
	HydratedFragmentSlotParent,
	HydratedKeyedHostsParent,
	HydratedLateChildParent,
	HydratedMarkerSlotParent,
	HydratedNestedHostParent,
	HydratedRegionParent,
	HydratedRootSlotParent,
	HydratedStaticView,
	HydratedThirdPartyParent,
	HydratedSlotCard,
	NonHydratedCounter,
} from './components';
import { HydratedOrderParent } from './define-order';
import { LIFECYCLE_PREFIX, defineLifecycleChild, defineLifecycleParent } from './lifecycle-pair';
import './late-child';

defineLifecycleChild(LIFECYCLE_PREFIX, []);
const HydratedLifecycleParent = defineLifecycleParent(LIFECYCLE_PREFIX, []);

function withHost(tagName: string, viewMarkup: string): string {
	return `<${tagName}>${viewMarkup}</${tagName}>`;
}

/** Server renders, on the minimal DOM, of the markup each browser hydration test starts from. */
export const SSR_HYDRATION_CASES: Record<string, () => string> = {
	counter: () =>
		withHost('hydrated-counter-test', renderRadiantElementViewToString(new HydratedCounter(), { mode: 'hydrate' })),
	'slot-card': () => {
		const element = new HydratedSlotCard();
		element.innerHTML = '<h2 slot="header">SSR header</h2><p>SSR body</p>';
		return renderRadiantElementHostToString(element, { mode: 'hydrate' });
	},
	'marker-slot-parent': () => renderRadiantElementHostToString(new HydratedMarkerSlotParent(), { mode: 'hydrate' }),
	'root-slot-parent': () => renderRadiantElementHostToString(new HydratedRootSlotParent(), { mode: 'hydrate' }),
	'static-view': () => renderRadiantElementHostToString(new HydratedStaticView(), { mode: 'hydrate' }),
	'fragment-slot-parent': () =>
		renderRadiantElementHostToString(new HydratedFragmentSlotParent(), { mode: 'hydrate' }),
	'complex-slot-card': () => {
		const element = new HydratedComplexSlotCard();
		element.innerHTML =
			'<h2 slot="header" data-note="1 > 0">SSR header</h2><article data-kind="primary"><p>SSR body</p></article><radiant-component-counter count="4" label="Projected SSR counter"></radiant-component-counter><p slot="footer">SSR footer</p>';
		return renderRadiantElementHostToString(element, { mode: 'hydrate' });
	},
	'non-hydrated-counter': () =>
		withHost(
			'non-hydrated-counter-test',
			renderRadiantElementViewToString(new NonHydratedCounter(), { mode: 'hydrate' }),
		),
	'counter-binding': () =>
		withHost(
			'hydrated-counter-binding-test',
			renderRadiantElementViewToString(new HydratedCounterBinding(), { mode: 'hydrate' }),
		),
	'array-prop': () => {
		const element = new HydratedArrayPropCard();
		element.items = [{ label: 'first' }, { label: 'second' }];
		return renderRadiantElementHostToString(element, { mode: 'hydrate' });
	},
	'deferred-card': () =>
		withHost(
			'deferred-hydrated-card-test',
			renderRadiantElementViewToString(new DeferredHydratedCard(), { mode: 'hydrate' }),
		),
	'region-parent': () => renderRadiantElementHostToString(new HydratedRegionParent(), { mode: 'hydrate' }),
	'nested-host-parent': () => renderRadiantElementHostToString(new HydratedNestedHostParent(), { mode: 'hydrate' }),
	'keyed-hosts-parent': () => renderRadiantElementHostToString(new HydratedKeyedHostsParent(), { mode: 'hydrate' }),
	'third-party-parent': () => renderRadiantElementHostToString(new HydratedThirdPartyParent(), { mode: 'hydrate' }),
	'late-child-parent': () => renderRadiantElementHostToString(new HydratedLateChildParent(), { mode: 'hydrate' }),
	'define-order-parent': () => renderRadiantElementHostToString(new HydratedOrderParent(), { mode: 'hydrate' }),
	'lifecycle-parent': () => renderRadiantElementHostToString(new HydratedLifecycleParent(), { mode: 'hydrate' }),
};
