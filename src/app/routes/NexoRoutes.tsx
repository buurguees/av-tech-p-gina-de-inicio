import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { createResponsivePage } from '@/pages/nexo_av/components/ResponsivePage';

const NexoLogin = lazy(() => import('@/pages/nexo_av/desktop/pages/Login'));
const ResponsiveLayout = lazy(() => import('@/pages/nexo_av/layouts/ResponsiveLayout'));
const NexoAccountSetup = lazy(() => import('@/pages/nexo_av/desktop/pages/AccountSetup'));
const NexoUsersPage = lazy(() => import('@/pages/nexo_av/desktop/pages/UsersPage'));
const NexoProductDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/ProductDetailPage'));
const NexoTaxDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/TaxDetailPage'));
const NexoAuditPage = lazy(() => import('@/pages/nexo_av/desktop/pages/AuditPage'));
const NexoAuditEventDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/AuditEventDetailPage'));
const NexoCalculatorPage = lazy(() => import('@/pages/nexo_av/desktop/pages/CalculatorPage'));
const NexoMapPage = lazy(() => import('@/pages/nexo_av/desktop/pages/MapPage'));
const ResponsiveCalendarPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/CalendarPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileCalendarPage')
);
const NexoAccountingPage = lazy(() => import('@/pages/nexo_av/desktop/pages/AccountingPage'));
const NexoMonthlyPyGDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/MonthlyPyGDetailPage'));
const NexoDeveloperPage = lazy(() => import('@/pages/nexo_av/desktop/pages/DeveloperPage'));
const NexoNewPurchaseInvoicePage = lazy(() => import('@/pages/nexo_av/desktop/pages/NewPurchaseInvoicePage'));
const NexoPartnersPage = lazy(() => import('@/pages/nexo_av/desktop/pages/PartnersPage'));
const NexoPartnerDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/PartnerDetailPage'));
const NexoWorkersPage = lazy(() => import('@/pages/nexo_av/desktop/pages/WorkersPage'));
const NexoWorkerDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/WorkerDetailPage'));
const NexoPurchaseOrdersPage = lazy(() => import('@/pages/nexo_av/desktop/pages/PurchaseOrdersPage'));
const NexoPurchaseOrderDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/PurchaseOrderDetailPage'));
const NexoNewPurchaseOrderPage = lazy(() => import('@/pages/nexo_av/desktop/pages/NewPurchaseOrderPage'));
const NexoPendingReimbursementsPage = lazy(() => import('@/pages/nexo_av/desktop/pages/PendingReimbursementsPage'));
const NexoFinancingPage = lazy(() => import('@/pages/nexo_av/desktop/pages/FinancingPage'));
const NexoFinancingDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/FinancingDetailPage'));
const NexoRateCardsPage = lazy(() => import('@/pages/nexo_av/desktop/pages/RateCardsPage'));
const NexoRateCardDetailPage = lazy(() => import('@/pages/nexo_av/desktop/pages/RateCardDetailPage'));
const NexoReportsPage = lazy(() => import('@/pages/nexo_av/desktop/pages/ReportsPage'));
const NexoRectificativasPage = lazy(() => import('@/pages/nexo_av/desktop/pages/RectificativasPage'));
const NexoNewInvoicePage = lazy(() => import('@/pages/nexo_av/desktop/pages/NewInvoicePage'));
const NexoEditInvoicePage = lazy(() => import('@/pages/nexo_av/desktop/pages/EditInvoicePage'));

const ResponsiveEditClientPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/EditClientRedirectPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileEditClientPage')
);
const ResponsiveQuoteDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/QuoteDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileQuoteDetailPage')
);
const ResponsiveDashboard = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/Dashboard'),
  () => import('@/pages/nexo_av/mobile/pages/MobileDashboard')
);
const ResponsiveProjectsPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/ProjectsPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileProjectsPage')
);
const ResponsiveProjectDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/ProjectDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileProjectDetailPage')
);
const ResponsiveClientDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/ClientDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileClientDetailPage')
);
const ResponsiveNewProjectPage = createResponsivePage(
  () => import('@/pages/nexo_av/mobile/pages/MobileNewProjectPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileNewProjectPage')
);
const ResponsiveNewClientPage = createResponsivePage(
  () => import('@/pages/nexo_av/mobile/pages/MobileNewClientPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileNewClientPage')
);
const ResponsiveNewQuotePage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/NewQuotePage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileNewQuotePage')
);
const ResponsiveEditQuotePage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/EditQuotePage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileEditQuotePage')
);
const ResponsiveClientsPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/ClientsPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileClientsPage')
);
const ResponsiveQuotesPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/QuotesPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileQuotesPage')
);
const ResponsiveInvoicesPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/InvoicesPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileInvoicesPage')
);
const ResponsiveNewInvoicePage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/NewInvoicePage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileNewInvoicePage')
);
const ResponsiveCatalogPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/CatalogPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileCatalogPage')
);
const ResponsiveInvoiceDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/InvoiceDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileInvoiceDetailPage')
);
const ResponsiveScannerPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/ScannerPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileScannerPage')
);
const ResponsiveSettingsPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/SettingsPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileSettingsPage')
);
const ResponsiveNotFound = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/NotFound'),
  () => import('@/pages/nexo_av/mobile/pages/MobileNotFound')
);
const ResponsivePurchaseInvoicesPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/PurchaseInvoicesPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobilePurchaseInvoicesPage')
);
const ResponsivePurchaseInvoiceDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/PurchaseInvoiceDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobilePurchaseInvoiceDetailPage')
);
const ResponsiveExpensesPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/ExpensesPageDataList'),
  () => import('@/pages/nexo_av/mobile/pages/MobileExpensesPage')
);
const ResponsiveExpenseDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/ExpenseDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileExpenseDetailPage')
);
const ResponsiveTechniciansPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/TechniciansPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileTechniciansPage')
);
const ResponsiveTechnicianDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/TechnicianDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileTechnicianDetailPage')
);
const ResponsiveSuppliersPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/SuppliersPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileSuppliersPage')
);
const ResponsiveSupplierDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/SupplierDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileSupplierDetailPage')
);
const ResponsiveScannerDetailPage = createResponsivePage(
  () => import('@/pages/nexo_av/desktop/pages/ScannerDetailPage'),
  () => import('@/pages/nexo_av/mobile/pages/MobileScannerDetailPage')
);

export const nexoRoutes = (
  <>
    <Route path="/nexo-av" element={<NexoLogin />} />
    <Route path="/nexo-av/setup-account" element={<NexoAccountSetup />} />
    <Route path="/nexo-av/:userId" element={<ResponsiveLayout />}>
      <Route path="dashboard" element={<ResponsiveDashboard />} />
      <Route path="projects" element={<ResponsiveProjectsPage />} />
      <Route path="clients" element={<ResponsiveClientsPage />} />
      <Route path="quotes" element={<ResponsiveQuotesPage />} />
      <Route path="scanner" element={<ResponsiveScannerPage />} />
      <Route path="settings" element={<ResponsiveSettingsPage />} />
      <Route path="users" element={<NexoUsersPage />} />
      <Route path="clients/new" element={<ResponsiveNewClientPage />} />
      <Route path="clients/:clientId" element={<ResponsiveClientDetailPage />} />
      <Route path="clients/:clientId/edit" element={<ResponsiveEditClientPage />} />
      <Route path="quotes/new" element={<ResponsiveNewQuotePage />} />
      <Route path="quotes/:quoteId" element={<ResponsiveQuoteDetailPage />} />
      <Route path="quotes/:quoteId/edit" element={<ResponsiveEditQuotePage />} />
      <Route path="clients/:clientId/quotes/new" element={<ResponsiveNewQuotePage />} />
      <Route path="projects/new" element={<ResponsiveNewProjectPage />} />
      <Route path="projects/:projectId" element={<ResponsiveProjectDetailPage />} />
      <Route path="settings/taxes/:taxId" element={<NexoTaxDetailPage />} />
      <Route path="audit" element={<NexoAuditPage />} />
      <Route path="audit/:eventId" element={<NexoAuditEventDetailPage />} />
      <Route path="catalog" element={<ResponsiveCatalogPage />} />
      <Route path="catalog/:productId" element={<NexoProductDetailPage />} />
      <Route path="calculator" element={<NexoCalculatorPage />} />
      <Route path="mapa" element={<NexoMapPage />} />
      <Route path="calendario" element={<ResponsiveCalendarPage />} />
      <Route path="technicians" element={<ResponsiveTechniciansPage />} />
      <Route path="technicians/:technicianId" element={<ResponsiveTechnicianDetailPage />} />
      <Route path="suppliers" element={<ResponsiveSuppliersPage />} />
      <Route path="suppliers/:supplierId" element={<ResponsiveSupplierDetailPage />} />
      <Route path="invoices" element={<ResponsiveInvoicesPage />} />
      <Route path="scanner/:documentId" element={<ResponsiveScannerDetailPage />} />
      <Route path="purchase-orders" element={<NexoPurchaseOrdersPage />} />
      <Route path="purchase-orders/new" element={<NexoNewPurchaseOrderPage />} />
      <Route path="purchase-orders/:orderId" element={<NexoPurchaseOrderDetailPage />} />
      <Route path="purchase-orders/:orderId/edit" element={<NexoNewPurchaseOrderPage />} />
      <Route path="purchase-invoices" element={<ResponsivePurchaseInvoicesPage />} />
      <Route path="purchase-invoices/new" element={<NexoNewPurchaseInvoicePage />} />
      <Route path="purchase-invoices/:invoiceId" element={<ResponsivePurchaseInvoiceDetailPage />} />
      <Route path="expenses" element={<ResponsiveExpensesPage />} />
      <Route path="expenses/new" element={<NexoNewPurchaseInvoicePage />} />
      <Route path="expenses/:invoiceId" element={<ResponsiveExpenseDetailPage />} />
      <Route path="reports" element={<NexoReportsPage />} />
      <Route path="accounting" element={<NexoAccountingPage />} />
      <Route path="accounting/pyg/:year/:month" element={<NexoMonthlyPyGDetailPage />} />
      <Route path="reimbursements" element={<NexoPendingReimbursementsPage />} />
      <Route path="developer" element={<NexoDeveloperPage />} />
      <Route path="partners" element={<NexoPartnersPage />} />
      <Route path="partners/:partnerId" element={<NexoPartnerDetailPage />} />
      <Route path="workers" element={<NexoWorkersPage />} />
      <Route path="workers/:workerId" element={<NexoWorkerDetailPage />} />
      <Route path="invoices/new" element={<ResponsiveNewInvoicePage />} />
      <Route path="invoices/:invoiceId" element={<ResponsiveInvoiceDetailPage />} />
      <Route path="invoices/:invoiceId/edit" element={<NexoEditInvoicePage />} />
      <Route path="rectificativas" element={<NexoRectificativasPage />} />
      <Route path="financing" element={<NexoFinancingPage />} />
      <Route path="financing/:operationId" element={<NexoFinancingDetailPage />} />
      <Route path="tarifas" element={<NexoRateCardsPage />} />
      <Route path="tarifas/:rateCardId" element={<NexoRateCardDetailPage />} />
      <Route path="*" element={<ResponsiveNotFound />} />
    </Route>
    <Route path="/nexo-av/dashboard" element={<NexoLogin />} />
    <Route path="/nexo-av/*" element={<ResponsiveNotFound />} />
  </>
);
