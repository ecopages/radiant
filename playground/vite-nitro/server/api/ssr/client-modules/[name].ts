import { defineHandler } from 'nitro';
import { createSsrClientModuleResponse } from '../../../ssr-client-modules';

export default defineHandler(async (event) => {
	return createSsrClientModuleResponse(event.context.params?.name ?? '');
});