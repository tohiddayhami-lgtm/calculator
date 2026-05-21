/**
 * InvoicePage — صفحه پروفرما / فاکتور خدمات
 *
 * این کامپوننت با React.lazy بارگذاری می‌شود.
 * کد از renderInvoice() در App.tsx استخراج شده است.
 *
 * ⚠️ در حال مهاجرت: محتوای renderInvoice() باید به‌تدریج
 *    از App.tsx به اینجا منتقل شود.
 */

import { memo } from 'react';
import React from 'react';

const InvoicePage = memo(function InvoicePage({
  renderContent,
}: {
  renderContent: () => React.ReactNode;
}) {
  return <>{renderContent()}</>;
});

export default InvoicePage;
