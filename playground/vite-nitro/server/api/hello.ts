import { defineHandler } from 'nitro';

export default defineHandler(() => {
	return {
		message: 'Hello from Nitro',
		runtime: 'Vite + Nitro kitchen sink',
		generatedAt: new Date().toISOString(),
	};
});
