import { defineConfig } from 'oxlint';

export const ignorePatterns = ['node_modules', 'dist', 'out', 'coverage', '.nyc_output', '.vscode', '.env', '.eco'];

/** Shared lint rules for every workspace in this repository. */
export const config = defineConfig({
	plugins: ['typescript', 'react'],
	ignorePatterns,
	rules: {
		complexity: ['error', { max: 50 }],
		'no-param-reassign': 'error',
		'default-param-last': 'error',
		'no-else-return': 'error',
		'no-explicit-any': 'off',
		'no-empty-interface': 'off',
		'no-inferrable-types': 'off',
		'react/no-string-refs': 'off',
		'react/jsx-key': 'off',
		'typescript/triple-slash-reference': 'off',
	},
});

export default config;
