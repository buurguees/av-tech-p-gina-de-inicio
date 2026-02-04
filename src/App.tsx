import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { createResponsivePage } from "./pages/nexo_av/components/ResponsivePage";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const SharkEventsPresentation = lazy(() => import("./pages/presentations/SharkEventsPresentation"));

// NEXO AV pages - lazy loaded
const NexoLogin = lazy(() => import("./pages/nexo_av/desktop/pages/Login"));
const ResponsiveLayout = lazy(() => import("./pages/nexo_av/layouts/ResponsiveLayout"));
const NexoAccountSetup = lazy(() => import("./pages/nexo_av/desktop/pages/AccountSetup"));

// Desktop-only pages (no mobile equivalent yet)
const NexoUsersPage = lazy(() => import("./pages/nexo_av/desktop/pages/UsersPage"));
const NexoClientDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/ClientDetailPage"));
// Client Edit - Desktop & Mobile (responsive)
// Desktop redirige al detalle (usa diálogo), Mobile usa página de edición
const ResponsiveEditClientPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/EditClientRedirectPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileEditClientPage")
);
// Quote Detail - Desktop & Mobile (now responsive)
const ResponsiveQuoteDetailPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/QuoteDetailPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileQuoteDetailPage")
);
const NexoEditQuotePage = lazy(() => import("./pages/nexo_av/desktop/pages/EditQuotePage"));
const NexoNewQuotePage = lazy(() => import("./pages/nexo_av/desktop/pages/NewQuotePage"));
const NexoProjectDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/ProjectDetailPage"));
const NexoCatalogPage = lazy(() => import("./pages/nexo_av/desktop/pages/CatalogPage"));
const NexoProductDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/ProductDetailPage"));
const NexoTaxDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/TaxDetailPage"));
const NexoAuditPage = lazy(() => import("./pages/nexo_av/desktop/pages/AuditPage"));
const NexoAuditEventDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/AuditEventDetailPage"));
const NexoCalculatorPage = lazy(() => import("./pages/nexo_av/desktop/pages/CalculatorPage"));
const NexoInvoicesPage = lazy(() => import("./pages/nexo_av/desktop/pages/InvoicesPage"));
const NexoInvoiceDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/InvoiceDetailPage"));
const NexoNewInvoicePage = lazy(() => import("./pages/nexo_av/desktop/pages/NewInvoicePage"));
const NexoEditInvoicePage = lazy(() => import("./pages/nexo_av/desktop/pages/EditInvoicePage"));
const NexoMapPage = lazy(() => import("./pages/nexo_av/desktop/pages/MapPage"));
const NexoPurchaseInvoicesPage = lazy(() => import("./pages/nexo_av/desktop/pages/PurchaseInvoicesPage"));
const NexoPurchaseInvoiceDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/PurchaseInvoiceDetailPage"));
const NexoExpensesPage = lazy(() => import("./pages/nexo_av/desktop/pages/ExpensesPage"));
const NexoReportsPage = lazy(() => import("./pages/nexo_av/desktop/pages/ReportsPage"));
const NexoTechniciansPage = lazy(() => import("./pages/nexo_av/desktop/pages/TechniciansPage"));
const NexoTechnicianDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/TechnicianDetailPage"));
const NexoSuppliersPage = lazy(() => import("./pages/nexo_av/desktop/pages/SuppliersPage"));
const NexoSupplierDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/SupplierDetailPage"));
const NexoAccountingPage = lazy(() => import("./pages/nexo_av/desktop/pages/AccountingPage"));
const NexoDeveloperPage = lazy(() => import("./pages/nexo_av/desktop/pages/DeveloperPage"));
// Scanner Detail - Desktop & Mobile (responsive)
const ResponsiveScannerDetailPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/ScannerDetailPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileScannerDetailPage")
);
const NexoNewPurchaseInvoicePage = lazy(() => import("./pages/nexo_av/desktop/pages/NewPurchaseInvoicePage"));
const NexoPartnersPage = lazy(() => import("./pages/nexo_av/desktop/pages/PartnersPage"));
const NexoPartnerDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/PartnerDetailPage"));
const NexoWorkersPage = lazy(() => import("./pages/nexo_av/desktop/pages/WorkersPage"));
const NexoWorkerDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/WorkerDetailPage"));
const NexoPurchaseOrdersPage = lazy(() => import("./pages/nexo_av/desktop/pages/PurchaseOrdersPage"));
const NexoPurchaseOrderDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/PurchaseOrderDetailPage"));
const NexoNewPurchaseOrderPage = lazy(() => import("./pages/nexo_av/desktop/pages/NewPurchaseOrderPage"));

// ============================================================
// RESPONSIVE PAGES - Load different components for mobile/desktop
// ============================================================

// Dashboard - Desktop & Mobile
const ResponsiveDashboard = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/Dashboard"),
  () => import("./pages/nexo_av/mobile/pages/MobileDashboard")
);

// Projects - Desktop & Mobile
const ResponsiveProjectsPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/ProjectsPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileProjectsPage")
);

// Project Detail - Desktop & Mobile
const ResponsiveProjectDetailPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/ProjectDetailPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileProjectDetailPage")
);

// Client Detail - Desktop & Mobile
const ResponsiveClientDetailPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/ClientDetailPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileClientDetailPage")
);

// New Project - Mobile only (desktop uses dialog)
const ResponsiveNewProjectPage = createResponsivePage(
  () => import("./pages/nexo_av/mobile/pages/MobileNewProjectPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileNewProjectPage")
);

// New Client - Mobile only (desktop uses dialog)
const ResponsiveNewClientPage = createResponsivePage(
  () => import("./pages/nexo_av/mobile/pages/MobileNewClientPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileNewClientPage")
);

// New Quote - Desktop & Mobile
const ResponsiveNewQuotePage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/NewQuotePage"),
  () => import("./pages/nexo_av/mobile/pages/MobileNewQuotePage")
);

// Edit Quote - Desktop & Mobile
const ResponsiveEditQuotePage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/EditQuotePage"),
  () => import("./pages/nexo_av/mobile/pages/MobileEditQuotePage")
);

// Clients - Desktop & Mobile
const ResponsiveClientsPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/ClientsPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileClientsPage")
);

// Quotes - Desktop & Mobile
const ResponsiveQuotesPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/QuotesPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileQuotesPage")
);

// Invoices - Desktop & Mobile (Mobile es solo consulta)
const ResponsiveInvoicesPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/InvoicesPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileInvoicesPage")
);

// Invoice Detail - Desktop & Mobile (Mobile es solo consulta)
const ResponsiveInvoiceDetailPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/InvoiceDetailPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileInvoiceDetailPage")
);

// Scanner - Desktop & Mobile
const ResponsiveScannerPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/ScannerPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileScannerPage")
);

// Settings - Desktop & Mobile
const ResponsiveSettingsPage = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/SettingsPage"),
  () => import("./pages/nexo_av/mobile/pages/MobileSettingsPage")
);

// NotFound - Desktop & Mobile
const ResponsiveNotFound = createResponsivePage(
  () => import("./pages/nexo_av/desktop/pages/NotFound"),
  () => import("./pages/nexo_av/mobile/pages/MobileNotFound")
);

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />

              <Route path="/privacidad" element={<PrivacyPolicy />} />
              <Route path="/terminos" element={<TermsAndConditions />} />
              {/* Custom Presentation Routes */}
              <Route path="/sharkevents" element={<SharkEventsPresentation />} />
              {/* NEXO AV Routes */}
              <Route path="/nexo-av" element={<NexoLogin />} />
              <Route path="/nexo-av/setup-account" element={<NexoAccountSetup />} />
              
              {/* All authenticated routes use the responsive layout (auto-detects mobile/desktop) */}
              <Route path="/nexo-av/:userId" element={<ResponsiveLayout />}>
                {/* RESPONSIVE PAGES - Different components for mobile & desktop */}
                <Route path="dashboard" element={<ResponsiveDashboard />} />
                <Route path="projects" element={<ResponsiveProjectsPage />} />
                <Route path="clients" element={<ResponsiveClientsPage />} />
                <Route path="quotes" element={<ResponsiveQuotesPage />} />
                <Route path="scanner" element={<ResponsiveScannerPage />} />
                <Route path="settings" element={<ResponsiveSettingsPage />} />
                
                {/* DESKTOP-ONLY PAGES (mobile versions coming soon) */}
                <Route path="users" element={<NexoUsersPage />} />
                <Route path="clients/new" element={<ResponsiveNewClientPage />} />
                <Route path="clients/:clientId" element={<ResponsiveClientDetailPage />} />
                <Route path="clients/:clientId/edit" element={<ResponsiveEditClientPage />} />
                <Route path="quotes/new" element={<ResponsiveNewQuotePage />} />
                <Route path="quotes/:quoteId" element={<ResponsiveQuoteDetailPage />} />
                <Route path="quotes/:quoteId/edit" element={<ResponsiveEditQuotePage />} />
                <Route path="clients/:clientId/quotes/new" element={<ResponsiveNewQuotePage />} />
                <Route path="projects/new" element={<ResponsiveNewProjectPage />} />
                <Route path="projects/new" element={<ResponsiveNewProjectPage />} />
                <Route path="projects/:projectId" element={<ResponsiveProjectDetailPage />} />
                <Route path="settings/taxes/:taxId" element={<NexoTaxDetailPage />} />
                <Route path="audit" element={<NexoAuditPage />} />
                <Route path="audit/:eventId" element={<NexoAuditEventDetailPage />} />
                <Route path="catalog" element={<NexoCatalogPage />} />
                <Route path="catalog/:productId" element={<NexoProductDetailPage />} />
                <Route path="calculator" element={<NexoCalculatorPage />} />
                <Route path="mapa" element={<NexoMapPage />} />
                <Route path="technicians" element={<NexoTechniciansPage />} />
                <Route path="technicians/:technicianId" element={<NexoTechnicianDetailPage />} />
                <Route path="suppliers" element={<NexoSuppliersPage />} />
                <Route path="suppliers/:supplierId" element={<NexoSupplierDetailPage />} />
                <Route path="invoices" element={<ResponsiveInvoicesPage />} />
                <Route path="scanner/:documentId" element={<ResponsiveScannerDetailPage />} />
                <Route path="purchase-orders" element={<NexoPurchaseOrdersPage />} />
                <Route path="purchase-orders/new" element={<NexoNewPurchaseOrderPage />} />
                <Route path="purchase-orders/:orderId" element={<NexoPurchaseOrderDetailPage />} />
                <Route path="purchase-orders/:orderId/edit" element={<NexoNewPurchaseOrderPage />} />
                <Route path="purchase-invoices" element={<NexoPurchaseInvoicesPage />} />
                <Route path="purchase-invoices/new" element={<NexoNewPurchaseInvoicePage />} />
                <Route path="purchase-invoices/:invoiceId" element={<NexoPurchaseInvoiceDetailPage />} />
                <Route path="expenses" element={<NexoExpensesPage />} />
                <Route path="expenses/new" element={<NexoNewPurchaseInvoicePage />} />
                <Route path="expenses/:invoiceId" element={<NexoPurchaseInvoiceDetailPage />} />
                <Route path="reports" element={<NexoReportsPage />} />
                <Route path="accounting" element={<NexoAccountingPage />} />
                <Route path="developer" element={<NexoDeveloperPage />} />
                <Route path="partners" element={<NexoPartnersPage />} />
                <Route path="partners/:partnerId" element={<NexoPartnerDetailPage />} />
                <Route path="workers" element={<NexoWorkersPage />} />
                <Route path="workers/:workerId" element={<NexoWorkerDetailPage />} />
                <Route path="invoices/new" element={<NexoNewInvoicePage />} />
                <Route path="invoices/:invoiceId" element={<ResponsiveInvoiceDetailPage />} />
                <Route path="invoices/:invoiceId/edit" element={<NexoEditInvoicePage />} />
                <Route path="*" element={<ResponsiveNotFound />} />
              </Route>
              {/* Legacy route - redirects to login */}
              <Route path="/nexo-av/dashboard" element={<NexoLogin />} />
              <Route path="/nexo-av/*" element={<ResponsiveNotFound />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
