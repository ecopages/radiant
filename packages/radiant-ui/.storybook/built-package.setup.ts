import { beforeAll, inject } from 'vitest';

beforeAll(() => {
	const problem = inject('builtPackageProblem');

	if (problem) {
		throw new Error(problem);
	}
});
