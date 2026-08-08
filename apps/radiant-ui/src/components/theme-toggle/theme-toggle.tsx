import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { ThemeToggleProps } from './theme-toggle.script';
import './theme-toggle.script';

export type ThemeToggleViewProps = ThemeToggleProps & {
	label?: string;
	hiddenLabel?: boolean;
};

export const ThemeToggle = eco.component<ThemeToggleViewProps, JsxRenderable>({
	dependencies: { scripts: ['./theme-toggle.script.ts'] },
	render: ({ label = 'Theme', hiddenLabel = true, ...props }) => (
		<theme-toggle {...props}>{hiddenLabel ? <span class="sr-only">{label}</span> : label}</theme-toggle>
	),
});
