/**
 * CommunityPage — صفحه Community Hub
 *
 * این کامپوننت با React.lazy بارگذاری می‌شود.
 * ⚠️ در حال مهاجرت از renderCommunity() در App.tsx
 */

import { memo } from 'react';
import React from 'react';

const CommunityPage = memo(function CommunityPage({
  renderContent,
}: {
  renderContent: () => React.ReactNode;
}) {
  return <>{renderContent()}</>;
});

export default CommunityPage;
