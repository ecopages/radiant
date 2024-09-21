import { DocsLayout } from '@/layouts/docs-layout';
import Introduction from '@/pages/docs/getting-started/introduction.mdx';
import type { EcoPage } from '@ecopages/core';

const HomePage: EcoPage = () => {
  return (
    <DocsLayout>
      <Introduction />
    </DocsLayout>
  );
};

HomePage.config = {
  importMeta: import.meta,
  dependencies: {
    components: [DocsLayout],
  },
};

export default HomePage;
