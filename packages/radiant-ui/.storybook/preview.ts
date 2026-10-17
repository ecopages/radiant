import type { Preview } from '@ecopages/storybook-radiant-vite';
import { isCommonAssetRequest } from 'msw';
import { setupWorker } from 'msw/browser';
import { mswLoader } from 'msw-storybook-addon/csf3';
import '../src/styles/tailwind.css';
import './fonts.css';
import { applyDesignTokens, registerDesignTokenGlobalsSync, type DesignTokenGlobals } from './apply-design-tokens';
import { radiantUiTheme } from './theme.ts';
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
		ruiTheme: {
			name: 'Theme',
			defaultValue: 'rui-default',
			toolbar: {
				icon: 'paintbrush',
				items: [
					{ value: 'rui-default', title: 'Radiant Default' },
					{ value: 'github', title: 'GitHub' },
					{ value: 'cloudflare', title: 'Cloudflare' },
					{ value: 'vscode', title: 'VS Code' },
					{ value: 'material', title: 'Material Design' },
					{ value: 'vercel', title: 'Vercel' },
					{ value: 'high-contrast', title: 'High Contrast' },
					{ value: 'windows95', title: 'Windows 95' },
					{ value: 'macos-classic', title: 'Mac OS Classic' },
					{ value: 'macos', title: 'macOS' },
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
			applyDesignTokens(context.globals as DesignTokenGlobals);
			return Story();
		},
		clearStylesheetsDecorator,
	],
	parameters: {
		docs: {
			theme: radiantUiTheme,
		},
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
