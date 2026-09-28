import '@ecopages/core/declarations';
import '@ecopages/core/env';
import '@ecopages/jsx/jsx-runtime';

declare global {
	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
