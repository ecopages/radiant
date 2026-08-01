export const cx = (...classes: (string | undefined)[]) => {
	return classes.filter(Boolean).join(' ');
};
