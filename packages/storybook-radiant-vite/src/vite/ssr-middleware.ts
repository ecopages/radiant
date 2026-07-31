import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import { RADIANT_SSR_ENDPOINT, type RadiantSsrRequestBody, type RadiantSsrResponseBody } from '../constants';
import { renderStorybookSsrPayload } from '../storybook-ssr';

function readJsonBody(req: IncomingMessage): Promise<RadiantSsrRequestBody> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => {
			chunks.push(chunk);
		});
		req.on('end', () => {
			try {
				const raw = Buffer.concat(chunks).toString('utf8');
				resolve(raw ? (JSON.parse(raw) as RadiantSsrRequestBody) : ({} as RadiantSsrRequestBody));
			} catch (error) {
				reject(error);
			}
		});
		req.on('error', reject);
	});
}

function sendJson(res: ServerResponse, status: number, body: RadiantSsrResponseBody | { error: string }): void {
	res.statusCode = status;
	res.setHeader('content-type', 'application/json; charset=utf-8');
	res.end(JSON.stringify(body));
}

async function handleSsrRequest(
	server: ViteDevServer,
	req: IncomingMessage,
	res: ServerResponse,
	options: { globalStyleModules?: readonly string[] },
): Promise<void> {
	try {
		const body = await readJsonBody(req);
		if (body.kind !== 'jsx' && !body.ssrModule && !body.viewModule) {
			sendJson(res, 400, { error: 'Missing ssrModule or viewModule in request body' });
			return;
		}

		const rendered = await renderStorybookSsrPayload(server, body, options);

		sendJson(res, 200, {
			markup: rendered.markup,
			tagName: rendered.tagName,
			assets: rendered.assets,
			clientModuleSrc: rendered.clientModuleSrc,
			generatedAt: rendered.generatedAt,
		});
	} catch (error) {
		const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
		server.config.logger.error(`[radiant-ssr] ${message}`);
		sendJson(res, 500, { error: message });
	}
}

/**
 * Vite plugin:
 * - serves `POST /__radiant_ssr` for Storybook preview SSR mounts via `@ecopages/vite-plugin-radiant/ssr`
 */
export function radiantStorybookSsrPlugin(options: { globalStyleModules?: readonly string[] } = {}): Plugin {
	return {
		name: 'ecopages:storybook-radiant-ssr',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (!req.url?.startsWith(RADIANT_SSR_ENDPOINT) || req.method !== 'POST') {
					next();
					return;
				}
				void handleSsrRequest(server, req, res, options);
			});
		},
	};
}
