import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const SharkEventsPresentation = lazy(() => import("./pages/presentations/SharkEventsPresentation"));

// NEXO AV pages - lazy loaded
const NexoLogin = lazy(() => import("./pages/nexo_av/desktop/pages/Login"));
const ResponsiveLayout = lazy(() => import("./pages/nexo_av/layouts/ResponsiveLayout"));
const NexoDashboard = lazy(() => import("./pages/nexo_av/desktop/pages/Dashboard"));
const NexoUsersPage = lazy(() => import("./pages/nexo_av/desktop/pages/UsersPage"));
const NexoClientsPage = lazy(() => import("./pages/nexo_av/desktop/pages/ClientsPage"));
const NexoClientDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/ClientDetailPage"));
const NexoQuotesPage = lazy(() => import("./pages/nexo_av/desktop/pages/QuotesPage"));
const NexoQuoteDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/QuoteDetailPage"));
const NexoEditQuotePage = lazy(() => import("./pages/nexo_av/desktop/pages/EditQuotePage"));
const NexoNewQuotePage = lazy(() => import("./pages/nexo_av/desktop/pages/NewQuotePage"));
const NexoProjectsPage = lazy(() => import("./pages/nexo_av/desktop/pages/ProjectsPage"));
const NexoProjectDetailPage = lazy(() => import("./pages/nexo_av/desktop/pages/ProjectDetailPage"));
const NexoSettingsPage = lazy(() => import("./pages/nexo_av/desktop/pages/SettingsPage"));
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
const NexoNotFound = lazy(() => import("./pages/nexo_av/desktop/pages/NotFound"));
const NexoAccountSetup = lazy(() => import("./pages/nexo_av/desktop/pages/AccountSetup"));
const NexoLeadMapPage = lazy(() => import("./pages/nexo_av/desktop/pages/LeadMapPage"));
const NexoClientMapPage = lazy(() => import("./pages/nexo_av/desktop/pages/ClientMapPage"));
const NexoProjectMapPage = lazy(() => import("./pages/nexo_av/desktop/pages/ProjectMapPage"));
const NexoTechMapPage = lazy(() => import("./pages/nexo_av/desktop/pages/TechMapPage"));
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
                <Route path="dashboard" element={<NexoDashboard />} />
                <Route path="users" element={<NexoUsersPage />} />
                <Route path="clients" element={<NexoClientsPage />} />
                <Route path="clients/:clientId" element={<NexoClientDetailPage />} />
                <Route path="quotes" element={<NexoQuotesPage />} />
                <Route path="quotes/new" element={<NexoNewQuotePage />} />
                <Route path="quotes/:quoteId" element={<NexoQuoteDetailPage />} />
                <Route path="quotes/:quoteId/edit" element={<NexoEditQuotePage />} />
                <Route path="clients/:clientId/quotes/new" element={<NexoNewQuotePage />} />
                <Route path="projects" element={<NexoProjectsPage />} />
                <Route path="projects/:projectId" element={<NexoProjectDetailPage />} />
                <Route path="settings" element={<NexoSettingsPage />} />
                <Route path="settings/taxes/:taxId" element={<NexoTaxDetailPage />} />
                <Route path="audit" element={<NexoAuditPage />} />
                <Route path="audit/:eventId" element={<NexoAuditEventDetailPage />} />
                <Route path="catalog" element={<NexoCatalogPage />} />
                <Route path="catalog/:productId" element={<NexoProductDetailPage />} />
                <Route path="calculator" element={<NexoCalculatorPage />} />
                <Route path="lead-map" element={<NexoLeadMapPage />} />
                <Route path="client-map" element={<NexoClientMapPage />} />
                <Route path="project-map" element={<NexoProjectMapPage />} />
                <Route path="tech-map" element={<NexoTechMapPage />} />
                <Route path="technicians" element={<NexoTechniciansPage />} />
                <Route path="technicians/:technicianId" element={<NexoTechnicianDetailPage />} />
                <Route path="suppliers" element={<NexoSuppliersPage />} />
                <Route path="suppliers/:supplierId" element={<NexoSupplierDetailPage />} />
                <Route path="invoices" element={<NexoInvoicesPage />} />
                <Route path="purchase-invoices" element={<NexoPurchaseInvoicesPage />} />
                <Route path="purchase-invoices/:invoiceId" element={<NexoPurchaseInvoiceDetailPage />} />
                <Route path="expenses" element={<NexoExpensesPage />} />
                <Route path="expenses/:invoiceId" element={<NexoPurchaseInvoiceDetailPage />} />
                <Route path="reports" element={<NexoReportsPage />} />
                <Route path="accounting" element={<NexoAccountingPage />} />
                <Route path="developer" element={<NexoDeveloperPage />} />
                <Route path="invoices/new" element={<NexoNewInvoicePage />} />
                <Route path="invoices/:invoiceId" element={<NexoInvoiceDetailPage />} />
                <Route path="invoices/:invoiceId/edit" element={<NexoEditInvoicePage />} />
                <Route path="*" element={<NexoNotFound />} />
              </Route>
              {/* Legacy route - redirects to login */}
              <Route path="/nexo-av/dashboard" element={<NexoLogin />} />
              <Route path="/nexo-av/*" element={<NexoNotFound />} />
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
