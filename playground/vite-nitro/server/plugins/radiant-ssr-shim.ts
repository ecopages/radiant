import { radiantSsrRuntimeInstalled } from '@ecopages/radiant/server/install-ssr-runtime';
import { definePlugin } from 'nitro';

void radiantSsrRuntimeInstalled;

/**
 * Boot step 1 of the Radiant adapter install narrative: install the SSR runtime
 * (light-DOM shim + scope adapters) before request handlers import
 * `@ecopages/radiant`. Required when `@ecopages/*` packages stay external
 * (see `ecopages-ssr-external.ts`).
 */
export default definePlugin(() => undefined);
