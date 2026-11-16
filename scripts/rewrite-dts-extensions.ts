import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DECLARATION_FILE = /\.d\.[cm]?ts$/;
const EXPLICIT_EXTENSION = /\.(?:js|mjs|cjs|json|css)$/;
const SOURCE_EXTENSION = /\.(?:ts|tsx)$/;

export function declarationFiles(directory: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const entryPath = join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...declarationFiles(entryPath));
		} else if (DECLARATION_FILE.test(entry.name)) {
			files.push(entryPath);
		}
	}
	return files;
}

export interface SpecifierLiteral {
	/** Offset of the first character after the opening quote. */
	start: number;
	/** Offset of the closing quote. */
	end: number;
	text: string;
}

function skipString(content: string, from: number): number {
	let i = from + 1;
	while (i < content.length && content[i] !== content[from]) i += content[i] === '\\' ? 2 : 1;
	return i + 1;
}

function skipTemplate(content: string, from: number): number {
	let i = from + 1;
	while (i < content.length && content[i] !== '`') {
		if (content[i] === '\\') i += 2;
		else if (content[i] === '$' && content[i + 1] === '{') i = skipBraces(content, i + 1);
		else i++;
	}
	return i + 1;
}

function skipBraces(content: string, from: number): number {
	let depth = 0;
	let i = from;
	while (i < content.length) {
		const char = content[i];
		if (char === '`') i = skipTemplate(content, i);
		else if (char === '"' || char === "'") i = skipString(content, i);
		else if (char === '}' && --depth === 0) return i + 1;
		else {
			if (char === '{') depth++;
			i++;
		}
	}
	return i;
}

function skipComment(content: string, index: number): number | undefined {
	if (content[index] !== '/') return undefined;
	if (content[index + 1] === '/') {
		const newline = content.indexOf('\n', index);
		return newline === -1 ? content.length : newline;
	}
	if (content[index + 1] === '*') {
		const close = content.indexOf('*/', index + 2);
		return close === -1 ? content.length : close + 2;
	}
	return undefined;
}

function isSpecifierPosition(previous: string, beforePrevious: string): boolean {
	if (previous === 'from') return true;
	if (previous === 'import') return beforePrevious !== '.';
	return previous === '(' && (beforePrevious === 'import' || beforePrevious === 'require');
}

/**
 * Returns every relative module specifier in a declaration file: `from '...'`, side-effect
 * `import '...'`, `import('...')` types and `require('...')`.
 *
 * @remarks
 * TypeScript 7 ships no JavaScript compiler API, so this is a small lexer that skips comments,
 * strings and template literals. Import-like text inside them is never reported.
 */
export function moduleSpecifiers(content: string): SpecifierLiteral[] {
	const found: SpecifierLiteral[] = [];
	let previous = '';
	let beforePrevious = '';
	let index = 0;
	const push = (token: string) => {
		beforePrevious = previous;
		previous = token;
	};

	while (index < content.length) {
		const char = content[index];
		const afterComment = skipComment(content, index);
		if (afterComment !== undefined) {
			index = afterComment;
		} else if (/\s/.test(char)) {
			index++;
		} else if (char === '`') {
			index = skipTemplate(content, index);
			push('`');
		} else if (char === '"' || char === "'") {
			const end = skipString(content, index);
			const text = content.slice(index + 1, end - 1);
			if (isSpecifierPosition(previous, beforePrevious) && /^\.\.?\//.test(text)) {
				found.push({ start: index + 1, end: end - 1, text });
			}
			index = end;
			push('"');
		} else {
			const word = /^[A-Za-z_$][\w$]*/.exec(content.slice(index, index + 64))?.[0] ?? char;
			index += word.length;
			push(word);
		}
	}
	return found;
}

/**
 * Maps a relative specifier to the explicit-extension form that exists in the emitted declarations.
 *
 * @remarks
 * Throws when nothing in the output matches, because guessing would ship a specifier that
 * `moduleResolution: node16`/`nodenext` consumers cannot resolve.
 */
export function resolveSpecifier(specifier: string, file: string): string {
	if (EXPLICIT_EXTENSION.test(specifier)) return specifier;
	if (SOURCE_EXTENSION.test(specifier)) return specifier.replace(SOURCE_EXTENSION, '.js');

	const target = resolve(dirname(file), specifier);
	const base = specifier.replace(/\/$/, '');
	if (existsSync(`${target}.d.ts`)) return `${base}.js`;
	if (existsSync(join(target, 'index.d.ts'))) return `${base}/index.js`;

	throw new Error(
		`Cannot resolve relative specifier '${specifier}' in ${file}: neither ${specifier}.d.ts nor ${specifier}/index.d.ts exists.`,
	);
}

export function rewriteDeclaration(file: string): boolean {
	const content = readFileSync(file, 'utf8');
	const edits = moduleSpecifiers(content)
		.map((literal) => ({ literal, next: resolveSpecifier(literal.text, file) }))
		.filter(({ literal, next }) => next !== literal.text);

	if (edits.length === 0) return false;

	let output = content;
	for (const { literal, next } of edits.sort((a, b) => b.literal.start - a.literal.start)) {
		output = `${output.slice(0, literal.start)}${next}${output.slice(literal.end)}`;
	}
	writeFileSync(file, output);
	return true;
}

export function rewriteDeclarationExtensions(directory: string): string[] {
	return declarationFiles(directory).filter((file) => rewriteDeclaration(file));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	const directory = resolve(process.argv[2] ?? 'dist');
	rewriteDeclarationExtensions(directory);
}
