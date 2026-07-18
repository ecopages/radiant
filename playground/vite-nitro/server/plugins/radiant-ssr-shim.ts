import { radiantSsrRuntimeInstalled } from '@ecopages/radiant/server/install-ssr-runtime';
import { definePlugin } from 'nitro';

void radiantSsrRuntimeInstalled;

/**
 * Install the Radiant SSR runtime (light-DOM shim + scope adapters) at server boot,
 * before request handlers import `@ecopages/radiant`. Required when `@ecopages/*`
 * packages stay external.
 */
export default definePlugin(() => undefined);
