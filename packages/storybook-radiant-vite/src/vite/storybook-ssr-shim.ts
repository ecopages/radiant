import type { Plugin } from 'vite';

const STORYBOOK_TEST_PREAMBLE = `
const __STORYBOOK_MODULE_TEST__ = {
  expect: () =>
    new Proxy(async function radiantStorybookExpect() {}, {
      get: () => __STORYBOOK_MODULE_TEST__.expect(),
      apply: () => __STORYBOOK_MODULE_TEST__.expect(),
    }),
  userEvent: {
    setup() {
      return this;
    },
    click: async () => {},
    keyboard: async () => {},
    type: async () => {},
  },
  fn: () => async () => {},
  spyOn: () => ({ mockImplementation: () => ({}) }),
  within: () => ({ getByRole: () => ({}) }),
};
`;

function isStoryModule(id: string): boolean {
	const file = id.split('?')[0] ?? id;
	return /\.stories\.(?:tsx?|jsx?)$/.test(file) && !file.includes('node_modules');
}

/**
 * Storybook CSF files compile `storybook/test` imports to `__STORYBOOK_MODULE_TEST__`.
 * Provide that binding when story modules are evaluated through Vite SSR.
 */
export function radiantStorybookSsrShimPlugin(): Plugin {
	return {
		name: 'ecopages:radiant-storybook-ssr-shim',
		enforce: 'post',
		transform(code, id, options) {
			if (!options?.ssr || !isStoryModule(id)) {
				return null;
			}

			if (
				!code.includes('__STORYBOOK_MODULE_TEST__') &&
				!code.includes("from 'storybook/test'") &&
				!code.includes('from "storybook/test"')
			) {
				return null;
			}

			if (code.includes('radiantStorybookExpect')) {
				return null;
			}

			return {
				code: `${STORYBOOK_TEST_PREAMBLE}\n${code}`,
				map: null,
			};
		},
	};
}
