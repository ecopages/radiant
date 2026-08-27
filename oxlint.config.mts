import { defineConfig } from 'oxlint';
import { config as baseConfig, ignorePatterns } from '@ecopages/oxlint-config/base';

export default defineConfig({
	extends: [baseConfig],
	plugins: [],
	ignorePatterns,
});
