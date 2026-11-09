import '@ecopages/content-processor/types';
import '@ecopages/core/declarations';
import '@ecopages/core/env';

declare global {
	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
