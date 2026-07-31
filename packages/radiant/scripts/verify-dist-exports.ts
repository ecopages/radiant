import path from 'node:path';
import * as esbuild from 'esbuild';

const indexPath = path.join(import.meta.dirname, '..', 'dist', 'index.js');

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
