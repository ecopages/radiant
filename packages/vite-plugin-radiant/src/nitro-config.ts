import { fileURLToPath } from 'node:url';
import { defineNitroConfig } from 'nitro/config';
import type { NitroConfig } from 'nitro/types';
import type { ExternalOption } from 'rollup';
import { RADIANT_SSR_EXTERNAL } from './ssr-externals';

const radiantNitroSsrShimPlugin = fileURLToPath(new URL('./nitro/ssr-shim-plugin.js', import.meta.url));

function mergeRollupExternals(config: NitroConfig): NitroConfig['rollupConfig'] {
	const existing = config.rollupConfig?.external;
	const merged: ExternalOption[] = [...RADIANT_SSR_EXTERNAL];

	if (Array.isArray(existing)) {
		merged.push(...existing);
	} else if (existing) {
		merged.push(existing);
	}

	return {
		...config.rollupConfig,
		external: merged as NitroConfig['rollupConfig'] extends { external?: infer T } ? T : never,
	};
}

function mergeNitroPlugins(config: NitroConfig): NitroConfig['plugins'] {
	const plugins = [...(config.plugins ?? [])];

	if (!plugins.includes(radiantNitroSsrShimPlugin)) {
		plugins.unshift(radiantNitroSsrShimPlugin);
	}

	return plugins;
}

/**
 * Merge Radiant SSR externals and the SSR runtime shim into a Nitro config.
 */
export function mergeRadiantNitroConfig(config: NitroConfig = {}): NitroConfig {
	return {
		...config,
		plugins: mergeNitroPlugins(config),
		rollupConfig: mergeRollupExternals(config),
	};
}

/**
 * `defineNitroConfig` with Radiant SSR externals and runtime shim pre-wired.
 */
export function defineRadiantNitroConfig(config: NitroConfig = {}): NitroConfig {
	return defineNitroConfig(mergeRadiantNitroConfig(config));
}
