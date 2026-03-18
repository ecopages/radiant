import { defineHandler } from 'nitro';

export default defineHandler(() => {
	return {
		message: 'Hello from Nitro',
		runtime: 'Vite + Nitro playground',
		generatedAt: new Date().toISOString(),
	};
});
