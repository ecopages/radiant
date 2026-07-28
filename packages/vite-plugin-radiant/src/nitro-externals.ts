import type { Plugin } from 'vite';
import { RADIANT_SSR_EXTERNAL_PACKAGES } from './ssr-externals';

/**
 * Keep `@ecopages/*` external in Nitro's `nitro` / `ssr` Vite environments.
 *
 * Nitro sets `resolve.noExternal: true` there, which would inline workspace
 * packages and duplicate ALS-backed SSR state. Register after `nitro()`.
 *
 * Pair with `defineRadiantNitroConfig()` in `nitro.config.ts`.
 */
export function radiantNitro(): Plugin {
	return {
		name: 'ecopages:radiant-nitro',
		enforce: 'post',
		configEnvironment(name) {
			if (name !== 'nitro' && name !== 'ssr') {
				return;
			}

			return {
				resolve: {
					external: [...RADIANT_SSR_EXTERNAL_PACKAGES],
				},
			};
		},
	};
}

/** @deprecated Use {@link radiantNitro}. */
export const radiantNitroExternals = radiantNitro;
