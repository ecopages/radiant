import { radiantSsrRuntimeInstalled } from '@ecopages/radiant/server/install-ssr-runtime';
import { definePlugin } from 'nitro';

void radiantSsrRuntimeInstalled;

/**
 * Boot step for Radiant SSR: install the light-DOM shim and scope adapters before
 * request handlers import `@ecopages/radiant`.
 */
export default definePlugin(() => undefined);
