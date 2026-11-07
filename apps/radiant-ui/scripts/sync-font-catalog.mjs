import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_URL = 'https://api.fontsource.org/v1/fonts';
const outputPath = path.resolve(import.meta.dirname, '../src/public/assets/font-catalog.json');

/**
 * Writes the Fontsource catalog the theme lab searches, as `[id, family, category, variable]` rows sorted by family.
 *
 * @remarks
 * The result is committed so builds work offline and stay reproducible. Run `pnpm run sync:font-catalog` to refresh it.
 * Icon fonts are dropped because they cannot style text.
 */
const response = await fetch(API_URL);
if (!response.ok) throw new Error(`Fontsource API answered ${response.status}`);
const fonts = await response.json();

const rows = fonts
	.filter((font) => font.category !== 'icons')
	.map((font) => [font.id, font.family, font.category, font.variable ? 1 : 0])
	.sort((a, b) => a[1].localeCompare(b[1]));

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(rows)}\n`);
console.log(`[font-catalog] wrote ${rows.length} fonts to ${path.relative(process.cwd(), outputPath)}`);
