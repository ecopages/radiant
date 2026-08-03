import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const indexPath = path.join(import.meta.dirname, '..', 'dist', 'index.js');
const browserIsServerPath = path.join(import.meta.dirname, '..', 'dist', 'is-server.js');

const externalPackages = ['@ecopages/jsx', '@ecopages/jsx/*'];

try {
	await esbuild.build({
		absWorkingDir: path.join(import.meta.dirname, '..'),
		bundle: true,
		entryPoints: [indexPath],
		external: externalPackages,
		format: 'esm',
		logLevel: 'silent',
		platform: 'browser',
		write: false,
	});
} catch (error) {
	console.error('[@ecopages/radiant] dist/index.js failed export verification (esbuild bundle):');
	console.error(error);
	process.exit(1);
}

const { isServer: nodeIsServer } = await import('@ecopages/radiant/is-server');
const { isServer: browserIsServer } = await import(pathToFileURL(browserIsServerPath).href);

if (!nodeIsServer || browserIsServer) {
	console.error('[@ecopages/radiant] is-server conditional export verification failed.');
	process.exit(1);
}
