import { build } from 'esbuild';
import { resolve } from 'node:path';
import { resolveProjectRoot } from '@ecopages/radiant/server/project-root';

const ssrClientModuleCache = new Map<string, string>();
const playgroundRoot = resolveProjectRoot({
	packageName: 'playground-vite-nitro',
	requiredPaths: ['src/components', 'server', 'package.json'],
	startDirectories: [process.cwd(), import.meta.dirname],
});

export function getSsrClientModuleRoutePath(modulePath: string): string {
	return `/api/ssr/client-modules/${encodeSsrClientModulePath(modulePath)}`;
}

export function getSsrClientModuleEntryPoint(modulePath: string): string {
	assertSsrClientModulePath(modulePath);
	return resolve(playgroundRoot, modulePath.replace(/^\.\.\//, ''));
}

export async function createSsrClientModuleResponse(encodedModulePath: string): Promise<Response> {
	let modulePath: string;

	try {
		modulePath = decodeSsrClientModulePath(encodedModulePath);
	} catch {
		return new Response(`Invalid SSR client module token: ${encodedModulePath}`, {
			status: 404,
			headers: {
				'content-type': 'text/plain; charset=utf-8',
			},
		});
	}

	const entryPoint = getSsrClientModuleEntryPoint(modulePath);

	const source = await bundleSsrClientModule(modulePath, entryPoint);

	return new Response(source, {
		headers: {
			'cache-control': import.meta.dev ? 'no-store' : 'public, max-age=0, must-revalidate',
			'content-type': 'text/javascript; charset=utf-8',
		},
	});
}

async function bundleSsrClientModule(modulePath: string, entryPoint: string): Promise<string> {
	const cachedSource = ssrClientModuleCache.get(modulePath);

	if (cachedSource) {
		return cachedSource;
	}

	const result = await build({
		absWorkingDir: playgroundRoot,
		bundle: true,
		entryPoints: [entryPoint],
		format: 'esm',
		logLevel: 'silent',
		platform: 'browser',
		sourcemap: false,
		target: ['es2022'],
		treeShaking: true,
		write: false,
	});

	const source = result.outputFiles[0]?.text;

	if (!source) {
		throw new Error(`Failed to bundle SSR client module for ${modulePath}.`);
	}

	ssrClientModuleCache.set(modulePath, source);
	return source;
}

function assertSsrClientModulePath(modulePath: string): void {
	if (!/^\.\.\/src\/components\/[A-Za-z0-9./_-]+\.script\.tsx$/.test(modulePath)) {
		throw new Error(`Unsupported SSR client module path: ${modulePath}`);
	}
}

function encodeSsrClientModulePath(modulePath: string): string {
	assertSsrClientModulePath(modulePath);
	return Buffer.from(modulePath, 'utf8').toString('base64url');
}

function decodeSsrClientModulePath(encodedModulePath: string): string {
	const modulePath = Buffer.from(encodedModulePath, 'base64url').toString('utf8');
	assertSsrClientModulePath(modulePath);
	return modulePath;
}
