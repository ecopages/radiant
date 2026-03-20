import { renderPlaygroundResponse } from '../server/render-playground';

export default {
	async fetch() {
		return renderPlaygroundResponse();
	},
};
