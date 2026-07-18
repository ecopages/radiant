import { radiantLightDomShimInstalled } from '@ecopages/radiant/server/install-light-dom-shim';
import { definePlugin } from 'nitro';

void radiantLightDomShimInstalled;

/**
 * Install the light-DOM SSR shim at server boot, before request handlers import
 * `@ecopages/radiant`. Required when `@ecopages/*` packages stay external.
 */
export default definePlugin(() => undefined);
