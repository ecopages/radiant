import type { StorybookConfig } from '../types';

export type { FrameworkOptions, StorybookConfig } from '../types';

/** Identity helper for typed `.storybook/main.ts` configs. */
export function defineMain(config: StorybookConfig): StorybookConfig {
	return config;
}
