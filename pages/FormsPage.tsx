/**
 * FormsPage — صفحه فرم‌ها (Custom Forms, ISO, Contracts, Proposals, Education)
 *
 * این کامپوننت با React.lazy بارگذاری می‌شود.
 * ⚠️ در حال مهاجرت از renderForms() در App.tsx
 */

import { memo } from 'react';
import React from 'react';

const FormsPage = memo(function FormsPage({
  renderContent,
}: {
  renderContent: () => React.ReactNode;
}) {
  return <>{renderContent()}</>;
});

export default FormsPage;
