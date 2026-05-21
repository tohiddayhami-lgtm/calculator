/**
 * AdminPage — صفحه Master Dashboard
 *
 * این کامپوننت با React.lazy بارگذاری می‌شود.
 * ⚠️ در حال مهاجرت از renderAdminDashboard() در App.tsx
 */

import { memo } from 'react';
import React from 'react';

const AdminPage = memo(function AdminPage({
  renderContent,
}: {
  renderContent: () => React.ReactNode;
}) {
  return <>{renderContent()}</>;
});

export default AdminPage;
