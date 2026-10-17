import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const sourceDirectory = resolve(scriptDirectory, '../../../packages/radiant-themes/dist/compiled/themes');
const destinationDirectory = resolve(scriptDirectory, '../src/public/assets/themes');
const files = (await readdir(sourceDirectory)).filter((file) => file.endsWith('.css'));

await rm(destinationDirectory, { recursive: true, force: true });
await mkdir(destinationDirectory, { recursive: true });

for (const file of files) {
	await copyFile(resolve(sourceDirectory, file), resolve(destinationDirectory, file));
}
