import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

for await (const filePath of glob('dist/**/*.d.ts')) {
	const content = readFileSync(filePath, 'utf8');
	const nextContent = content.replace(/(['"])(\.[^'"]*)\.tsx?\1/g, '$1$2.js$1');

	if (nextContent === content) {
		continue;
	}

	writeFileSync(filePath, nextContent);
}
