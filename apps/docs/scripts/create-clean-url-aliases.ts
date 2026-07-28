import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve(import.meta.dirname, '..', 'dist');

async function collectHtmlFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const htmlFiles: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			htmlFiles.push(...(await collectHtmlFiles(fullPath)));
			continue;
		}

		if (entry.isFile() && entry.name.endsWith('.html')) {
			htmlFiles.push(fullPath);
		}
	}

	return htmlFiles;
}

async function createAlias(htmlFilePath: string): Promise<void> {
	const relativePath = path.relative(distDir, htmlFilePath);

	if (relativePath === 'index.html' || relativePath === '404.html') {
		return;
	}

	const aliasDirectory = path.join(distDir, relativePath.replace(/\.html$/, ''));
	const aliasIndexPath = path.join(aliasDirectory, 'index.html');
	const html = await readFile(htmlFilePath, 'utf8');

	await mkdir(aliasDirectory, { recursive: true });
	await writeFile(aliasIndexPath, html);
}

const htmlFiles = await collectHtmlFiles(distDir);

for (const htmlFile of htmlFiles) {
	await createAlias(htmlFile);
}
