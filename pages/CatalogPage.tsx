/**
 * CatalogPage — صفحه کاتالوگ آنلاین
 *
 * این کامپوننت با React.lazy بارگذاری می‌شود.
 * ⚠️ در حال مهاجرت از renderCatalog() در App.tsx
 */

import { memo } from 'react';
import React from 'react';

const CatalogPage = memo(function CatalogPage({
  renderContent,
}: {
  renderContent: () => React.ReactNode;
}) {
  return <>{renderContent()}</>;
});

export default CatalogPage;
