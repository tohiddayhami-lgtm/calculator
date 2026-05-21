/**
 * DashboardPage — صفحه داشبرد (محاسبه صادرات + مدیریت انبار)
 *
 * این کامپوننت با React.lazy بارگذاری می‌شود:
 *   const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
 *
 * کد این صفحه از renderDashboard() در App.tsx استخراج شده است.
 * تمام state از useAppContext() گرفته می‌شود.
 *
 * ⚠️ در حال مهاجرت: محتوای renderDashboard() باید به‌تدریج
 *    از App.tsx به اینجا منتقل شود.
 */

import React, { memo, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

// ── Lazy imports برای sub-components سنگین ──────────────────────────────────
// WarehousePanel از قبل در فایل جداگانه است و می‌تواند lazy شود
const WarehousePanel = React.lazy(() =>
  import('../warehouseUi').then((m) => ({ default: m.WarehousePanel }))
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );
}

/**
 * DashboardPage
 *
 * محتوای کامل از renderDashboard() در App.tsx اینجا می‌آید.
 * فعلاً این stub است تا مهاجرت تدریجی انجام شود.
 */
const DashboardPage = memo(function DashboardPage({
  renderContent,
}: {
  /** تابع renderDashboard از App.tsx — در مرحله مهاجرت */
  renderContent: () => React.ReactNode;
}) {
  return <>{renderContent()}</>;
});

export default DashboardPage;

/**
 * ExportWorkspace — بخش محاسبه صادرات (زیرصفحه workspace)
 *
 * این کامپوننت شامل:
 * - Config Bar (ارز خروجی، مبنا، نرخ‌ها)
 * - Tasks Panel
 * - Product Input Table
 * - Logistics Section
 * - Profit Config
 * - Results / Export Table
 */
export const ExportWorkspaceShell = memo(function ExportWorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="space-y-6">{children}</div>;
});

/**
 * WarehouseView — بخش مدیریت انبار (زیرصفحه warehouse)
 * از useAppContext برای گرفتن props استفاده می‌کند
 */
export function WarehouseView() {
  const {
    products, suppliers,
    warehouseLocations, setWarehouseLocations,
    warehouseMovements, setWarehouseMovements,
    warehouseProductSettings, setWarehouseProductSettings,
  } = useAppContext();

  return (
    <Suspense fallback={<PageLoader />}>
      <WarehousePanel
        products={products}
        suppliers={suppliers}
        locations={warehouseLocations}
        setLocations={setWarehouseLocations}
        movements={warehouseMovements}
        setMovements={setWarehouseMovements}
        productSettings={warehouseProductSettings}
        setProductSettings={setWarehouseProductSettings}
      />
    </Suspense>
  );
}
