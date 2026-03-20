/// <reference path="../../node_modules/@ecopages/scripts-injector/types.d.ts" />

interface EcopagesEnv {
	ECOPAGES_BASE_URL: string;
	ECOPAGES_HOSTNAME: string;
	ECOPAGES_PORT: string;
	ECOPAGES_LOGGER_DEBUG: 'true' | 'false';
}

declare global {
	namespace NodeJS {
		interface ProcessEnv extends EcopagesEnv {}
	}

	namespace Bun {
		interface Env extends EcopagesEnv {}
	}

	interface ImportMetaEnv extends EcopagesEnv {}
}

declare module '*.css' {
	const styles: string;
	export default styles;
}

declare module '*.mdx' {
	const MDXComponent: (props: any) => JSX.Element;
	export default MDXComponent;
}
