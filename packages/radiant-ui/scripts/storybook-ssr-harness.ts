export const SSR_TEST_PORT = 6012;

export const SSR_RENDER_MODES = ['client', 'ssr-static', 'ssr-hydrate'] as const;

export type SsrRenderMode = (typeof SSR_RENDER_MODES)[number];

/** Fixed PR smoke subset — one story per SSR pattern. */
export const SSR_SMOKE_STORY_IDS = [
	'components-button--variants',
	'components-alert--default',
	'components-tabs--default',
	'components-dialog--default',
	'components-combobox--default',
	'components-toast--default',
] as const;

/**
 * Stories that must render non-empty markup in `#storybook-root`.
 * Full matrix defaults to expecting a mount unless listed in `SSR_ALLOW_EMPTY_MOUNT_STORY_IDS`.
 */
export const SSR_EXPECTS_MOUNT_STORY_IDS = new Set<string>(SSR_SMOKE_STORY_IDS);

/**
 * Intentional empty mounts in the full matrix.
 * Add entries only with a comment and owner in this file.
 */
export const SSR_ALLOW_EMPTY_MOUNT_STORY_IDS = new Set<string>([]);

/**
 * Allowed `pageerror` messages in the full matrix.
 * Keep empty; add entries only with a comment and owner in this file.
 */
export const SSR_ALLOW_PAGE_ERROR_PATTERNS: readonly RegExp[] = [];

export type StoryIndex = {
	entries: Record<string, { title: string; type: string }>;
};

export type SsrHarnessOptions = {
	smoke: boolean;
};

export function parseHarnessOptions(argv: readonly string[] = process.argv): SsrHarnessOptions {
	return { smoke: argv.includes('--smoke') };
}

export function resolveStoryIds(index: StoryIndex, smoke: boolean): string[] {
	if (smoke) {
		return [...SSR_SMOKE_STORY_IDS];
	}

	return Object.entries(index.entries)
		.filter(([, entry]) => entry.type === 'story' && entry.title.startsWith('Components/'))
		.map(([id]) => id);
}

export function expectsMount(storyId: string, smoke: boolean): boolean {
	if (smoke) {
		return SSR_EXPECTS_MOUNT_STORY_IDS.has(storyId);
	}

	if (SSR_ALLOW_EMPTY_MOUNT_STORY_IDS.has(storyId)) {
		return false;
	}

	return true;
}

export function isAllowedPageError(message: string): boolean {
	return SSR_ALLOW_PAGE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export type SsrStoryFailureReason =
	| { kind: 'banner'; message: string }
	| { kind: 'pageerror'; message: string }
	| { kind: 'empty-mount' };

export function evaluateStoryResult(options: {
	banner: string | null;
	mount: string;
	pageErrors: readonly string[];
	storyId: string;
	smoke: boolean;
}): SsrStoryFailureReason | null {
	const { banner, mount, pageErrors, storyId, smoke } = options;

	if (banner) {
		return { kind: 'banner', message: banner };
	}

	const disallowedErrors = pageErrors.filter((message) => !isAllowedPageError(message));
	if (disallowedErrors.length > 0) {
		return { kind: 'pageerror', message: disallowedErrors.join('; ') };
	}

	if (expectsMount(storyId, smoke) && !mount.trim()) {
		return { kind: 'empty-mount' };
	}

	return null;
}

export function formatFailure(mode: SsrRenderMode, storyId: string, reason: SsrStoryFailureReason): string {
	const detail =
		reason.kind === 'empty-mount'
			? 'empty mount'
			: reason.kind === 'banner'
				? reason.message
				: reason.message;
	return `${mode} ${storyId}: ${detail}`;
}
