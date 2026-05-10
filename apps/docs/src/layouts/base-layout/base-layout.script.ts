import { createRouter } from '@ecopages/browser-router/client';
import '@ecopages/radiant/client/install-hydrator';
import { enableControllerReplacementForHmr } from '@/utils/radiant-browser-runtime';

const hot = (import.meta as ImportMeta & { hot?: unknown }).hot;

if (hot) {
	enableControllerReplacementForHmr();
}

createRouter();
