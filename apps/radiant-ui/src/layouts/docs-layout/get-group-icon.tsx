export const getGroupIcon = (name: string) => {
	switch (name) {
		case 'Getting started':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M7 8l-4 4l4 4" />
					<path d="M17 8l4 4l-4 4" />
					<path d="M14 4l-4 16" />
				</svg>
			);
		case 'Actions':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M15 15m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
					<path d="M6.5 6.5l11 11" />
					<path d="M21 3l-6 6" />
					<path d="M3 21l6 -6" />
				</svg>
			);
		case 'Forms':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M9 11l3 3l8 -8" />
					<path d="M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9" />
				</svg>
			);
		case 'Layout':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
					<path d="M9 4v16" />
				</svg>
			);
		case 'Navigation':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M4 6l16 0" />
					<path d="M4 12l16 0" />
					<path d="M4 18l16 0" />
				</svg>
			);
		case 'Overlays':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
					<path d="M12 8v4" />
					<path d="M12 16h.01" />
				</svg>
			);
		case 'Feedback':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M8 9h8" />
					<path d="M8 13h6" />
					<path d="M12 21l-3 -3h-5a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h14a3 3 0 0 1 3 3v5.5" />
				</svg>
			);
		case 'Data display':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M3 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
					<path d="M9 8m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
					<path d="M15 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
				</svg>
			);
		default:
			return null;
	}
};
