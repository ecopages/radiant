export const getGroupIcon = (name: string) => {
	switch (name) {
		case 'Getting Started':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-code"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M7 8l-4 4l4 4" />
					<path d="M17 8l4 4l-4 4" />
					<path d="M14 4l-4 16" />
				</svg>
			);
		case 'Components':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-settings"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
					<path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
				</svg>
			);
		case 'JSX':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-package"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9z" />
					<path d="M12 12l8 -4.5" />
					<path d="M12 12v9" />
					<path d="M12 12l-8 -4.5" />
				</svg>
			);
		case 'SSR':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-cloud-data-connection"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M5 9a5 5 0 0 1 9.438 -2.106a4.5 4.5 0 1 1 2.562 8.106h-10a4 4 0 0 1 -1.6 -7.667" />
					<path d="M8 15h8" />
					<path d="M12 12v6" />
				</svg>
			);
		case 'Signals':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-activity-heartbeat"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M3 12h4l3 8l4 -16l3 8h4" />
				</svg>
			);
		case 'Context':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-plug-connected"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M7 12l5 5l-1.5 1.5a3.536 3.536 0 1 1 -5 -5l1.5 -1.5z" />
					<path d="M17 12l-5 -5l1.5 -1.5a3.536 3.536 0 1 1 5 5l-1.5 1.5z" />
					<path d="M3 21l2.5 -2.5" />
					<path d="M18.5 5.5l2.5 -2.5" />
					<path d="M10 11l-2 2" />
					<path d="M13 14l-2 2" />
				</svg>
			);
		case 'Decorators':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-function"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M4 4m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h10.666a2.667 2.667 0 0 1 2.667 2.667v10.666a2.667 2.667 0 0 1 -2.667 2.667h-10.666a2.667 2.667 0 0 1 -2.667 -2.667z" />
					<path d="M9 15.5v.25c0 .69 .56 1.25 1.25 1.25c.71 0 1.304 -.538 1.374 -1.244l.752 -7.512a1.381 1.381 0 0 1 1.374 -1.244c.69 0 1.25 .56 1.25 1.25v.25" />
					<path d="M9 12h6" />
				</svg>
			);
		case 'Helpers':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-puzzle"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M4 7h3a1 1 0 0 0 1 -1v-1a2 2 0 0 1 4 0v1a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h1a2 2 0 0 1 0 4h-1a1 1 0 0 0 -1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-1a2 2 0 0 0 -4 0v1a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h1a2 2 0 0 0 0 -4h-1a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1" />
				</svg>
			);
		case 'Tools':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-tool"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5" />
				</svg>
			);
		case 'Examples':
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
					class="icon icon-tabler icons-tabler-outline icon-tabler-test-pipe"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M20 8.04l-12.122 12.124a2.857 2.857 0 1 1 -4.041 -4.04l12.122 -12.124" />
					<path d="M7 13h8" />
					<path d="M19 15l1.5 1.6a2 2 0 1 1 -3 0l1.5 -1.6z" />
					<path d="M15 3l6 6" />
				</svg>
			);
		default:
			return null;
	}
};
