import type { Preview } from '@ecopages/storybook-radiant-vite';
import { isCommonAssetRequest } from 'msw';
import { setupWorker } from 'msw/browser';
import { mswLoader } from 'msw-storybook-addon/csf3';
import '../src/styles/tailwind.css';
import './fonts.css';
import { applyDesignTokens, registerDesignTokenGlobalsSync } from './apply-design-tokens';
import { clearStylesheetsDecorator } from './with-stylesheets';

registerDesignTokenGlobalsSync();

const setupMswWorker = async () => {
	const worker = setupWorker();

	await worker.start({
		quiet: true,
		onUnhandledRequest(request, print) {
			const url = new URL(request.url);
			if (
				isCommonAssetRequest(request) ||
				url.hostname === 'avatars.githubusercontent.com' ||
				/\.eot$|\.mdx$|sb-common-assets|__webpack_hmr|iframe.html|sb-vite|@vite|@react-refresh|\/virtual:|\.stories\./.test(
					request.url,
				) ||
				url.pathname === '/__radiant_ssr'
			) {
				return;
			}

			print.warning();
		},
	});

	return worker;
};

const preview: Preview = {
	loaders: [mswLoader(setupMswWorker)],
	globalTypes: {
		ruiColors: {
			name: 'Colors',
			description: 'Brand palette',
			defaultValue: 'glacier',
			toolbar: {
				icon: 'paintbrush',
				items: [
					{ value: 'glacier', title: 'Glacier (docs)' },
					{ value: 'aurora', title: 'Aurora' },
					{ value: 'basalt', title: 'Basalt' },
					{ value: 'ember', title: 'Ember' },
				],
				dynamicTitle: true,
			},
		},
		ruiSpacing: {
			name: 'Spacing',
			defaultValue: 'default',
			toolbar: {
				icon: 'component',
				items: [
					{ value: 'default', title: 'Default' },
					{ value: 'compact', title: 'Compact' },
					{ value: 'wide', title: 'Wide' },
				],
				dynamicTitle: true,
			},
		},
		ruiRadius: {
			name: 'Radius',
			defaultValue: 'default',
			toolbar: {
				icon: 'circlehollow',
				items: [
					{ value: 'default', title: 'Default' },
					{ value: 'soft', title: 'Soft' },
					{ value: 'sharp', title: 'Sharp' },
				],
				dynamicTitle: true,
			},
		},
		ruiColorMode: {
			name: 'Mode',
			defaultValue: 'light',
			toolbar: {
				icon: 'mirror',
				items: [
					{ value: 'light', title: 'Light' },
					{ value: 'dark', title: 'Dark' },
				],
				dynamicTitle: true,
			},
		},
	},
	decorators: [
		(Story, context) => {
			applyDesignTokens(context.globals as Record<string, string>);
			return Story();
		},
		clearStylesheetsDecorator,
	],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		a11y: {
			test: 'todo',
		},
		radiant: {
			renderMode: 'client',
		},
	},
};

export default preview;
