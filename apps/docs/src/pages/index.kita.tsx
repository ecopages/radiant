import type { EcoComponent } from '@ecopages/core';
import { DocsLayout } from '@/layouts/docs-layout';
import Introduction from '@/pages/docs/getting-started/introduction.mdx';

const HomePage: EcoComponent = () => {
	return (
		<DocsLayout>
			<Introduction />
		</DocsLayout>
	);
};

HomePage.config = {
	dependencies: {
		components: [DocsLayout],
	},
};

export default HomePage;
