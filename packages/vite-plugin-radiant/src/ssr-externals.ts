export type RadiantSsrExternal = string | RegExp;

const radiantSsrExternalPattern = /^@ecopages\/(jsx|radiant|signals)(?:\/|$)/;

/** True when an import id should stay external during SSR (ALS singleton safety). */
export function isRadiantSsrExternal(id: string): boolean {
	return radiantSsrExternalPattern.test(id);
}

/**
 * Package roots externalized during Vite SSR. Subpath imports are covered because
 * Vite treats `pkg` as matching `pkg` and `pkg/...`.
 */
export const RADIANT_SSR_EXTERNAL_PACKAGES = ['@ecopages/jsx', '@ecopages/radiant', '@ecopages/signals'] as const;

/**
 * Keep `@ecopages/*` as Node externals so SSR ambient state (ALS, adapters)
 * stays on one module instance.
 *
 * Regex entries are for Rollup/Nitro only. Vite 8 Rolldown rejects RegExp in
 * `resolve.external` — use {@link RADIANT_SSR_EXTERNAL_PACKAGES} for Vite SSR.
 */
export const RADIANT_SSR_EXTERNAL: readonly RadiantSsrExternal[] = [
	/^@ecopages\/jsx(?:\/|$)/,
	/^@ecopages\/radiant(?:\/|$)/,
	/^@ecopages\/signals(?:\/|$)/,
];
